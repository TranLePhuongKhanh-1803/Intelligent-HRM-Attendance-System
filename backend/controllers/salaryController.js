const Salary = require('../models/Salary');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const { HOLIDAY_DATES } = require('../config/holidays');
const { createNotification } = require('./notificationController');

// Config constants
const LATE_PENALTY_PER_MINUTE = 5000;
const STANDARD_HOURS_PER_DAY = 8;
const OVERTIME_MULTIPLIERS = {
  weekday: 1.5,
  weekend: 2,
  holiday: 3,
};

// Allowance mapping by position
const ALLOWANCE_MAP = {
  'Trưởng phòng': 2000000,
  'Phó phòng': 1500000,
  'Kế toán': 1000000,
  'Nhân sự': 1000000,
  'Nhân viên': 0,
  'Thực tập sinh': 0,
};

const getMonthDateRange = (month, year) => {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatDateKey = (date) => {
  const yearNum = date.getFullYear();
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
  const dayNum = String(date.getDate()).padStart(2, '0');
  return `${yearNum}-${monthNum}-${dayNum}`;
};

const isWeekendDate = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isHolidayDateKey = (dateKey) => {
  return HOLIDAY_DATES.has(dateKey);
};

const isStandardPayrollDate = (date) => {
  return !isWeekendDate(date) && !isHolidayDateKey(formatDateKey(date));
};

const getStandardWorkDaysInRange = (monthStart, monthEnd) => {
  let count = 0;
  const cursor = new Date(monthStart);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= monthEnd) {
    if (isStandardPayrollDate(cursor)) {
      count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
};

const getOverlapPayrollDates = (startDate, endDate, monthStart, monthEnd) => {
  const overlapStart = new Date(Math.max(new Date(startDate).getTime(), monthStart.getTime()));
  const overlapEnd = new Date(Math.min(new Date(endDate).getTime(), monthEnd.getTime()));

  overlapStart.setHours(0, 0, 0, 0);
  overlapEnd.setHours(0, 0, 0, 0);

  if (overlapStart > overlapEnd) {
    return [];
  }

  const dates = [];
  const cursor = new Date(overlapStart);

  while (cursor <= overlapEnd) {
    if (isStandardPayrollDate(cursor)) {
      dates.push(formatDateKey(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const getWorkedHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const durationMs = end.getTime() - start.getTime();

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 0;
  }

  return durationMs / (1000 * 60 * 60);
};

const roundToTwoDecimals = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const getWorkdayCredit = (workedHours) => {
  if (workedHours < 4) {
    return 0; // Dưới 4 tiếng: Không tính công
  }
  if (workedHours >= 4 && workedHours < 7.5) {
    return 0.5; // Từ 4 tiếng đến dưới 7.5 tiếng: Nửa ngày
  }
  return 1; // Từ 7.5 tiếng trở lên: Đủ 1 ngày
};

const getHourlyRate = (basicSalary, standardWorkDays) => {
  if (!standardWorkDays) {
    return 0;
  }

  return basicSalary / standardWorkDays / STANDARD_HOURS_PER_DAY;
};

// Helper: calculate salary for a single user/month/year
const computeSalary = async (userId, month, year) => {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new Error('Người dùng không tồn tại hoặc đã bị vô hiệu hóa.');
  }

  // Build date range for the month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { start: monthStart, end: monthEnd } = getMonthDateRange(month, year);
  const standardWorkDays = getStandardWorkDaysInRange(monthStart, monthEnd);

  // Fetch all attendance records for this user in the month
  const records = await Attendance.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  });

  const approvedLeaves = await LeaveRequest.find({
    user: userId,
    status: 'approved',
    isPaid: true,
    startDate: { $lte: monthEnd },
    endDate: { $gte: monthStart },
  });

  let actualDays = 0;
  let lateDays = 0;
  let lateMinutes = 0;
  let totalPenaltyAmount = 0;
  let overtimeHours = 0;
  let overtimeSalary = 0;
  const attendedWorkdayDates = new Set();
  const creditedWorkdayMap = new Map();

  const basicSalary = user.basicSalary || 8000000;
  const hourlyRate = getHourlyRate(basicSalary, standardWorkDays);

  records.forEach((rec) => {
    const dateKey = rec.date;
    const recordDate = dateKey ? new Date(`${dateKey}T00:00:00`) : null;
    const isWeekendAttendance = !recordDate || isWeekendDate(recordDate);
    const isHolidayAttendance = Boolean(recordDate) && isHolidayDateKey(dateKey);
    const isStandardWorkdayAttendance = Boolean(recordDate) && !isWeekendAttendance && !isHolidayAttendance;
    const workedHours = getWorkedHours(rec.checkIn, rec.checkOut);
    const workdayCredit = isStandardWorkdayAttendance ? getWorkdayCredit(workedHours) : 0;

    if (isStandardWorkdayAttendance && workdayCredit > 0 && dateKey) {
      attendedWorkdayDates.add(dateKey);
      const existingCredit = creditedWorkdayMap.get(dateKey) || 0;
      creditedWorkdayMap.set(dateKey, Math.max(existingCredit, workdayCredit));
    }

    // Count late days and minutes
    if (isStandardWorkdayAttendance && rec.status === 'late' && workdayCredit > 0) {
      lateDays++;
      const checkInTime = new Date(rec.checkIn);
      const hour = parseInt(checkInTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }));
      const min = parseInt(checkInTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', minute: '2-digit' }));
      let diff = (hour - 9) * 60 + min;
      if (diff > 0) {
        lateMinutes += diff;
        // Phạt đi trễ theo bậc
        if (diff > 30) {
          totalPenaltyAmount += 100000;
        } else if (diff >= 16) {
          totalPenaltyAmount += 50000;
        } else if (diff >= 6) {
          totalPenaltyAmount += 20000;
        }
        // <= 5 phút không bị phạt
      }
    }

    if (isHolidayAttendance) {
      overtimeHours += workedHours;
      overtimeSalary += workedHours * hourlyRate * OVERTIME_MULTIPLIERS.holiday;
      return;
    }

    if (isWeekendAttendance) {
      overtimeHours += workedHours;
      overtimeSalary += workedHours * hourlyRate * OVERTIME_MULTIPLIERS.weekend;
      return;
    }

    const weekdayOvertimeHours = Math.max(0, workedHours - STANDARD_HOURS_PER_DAY);
    if (weekdayOvertimeHours > 0) {
      overtimeHours += weekdayOvertimeHours;
      overtimeSalary += weekdayOvertimeHours * hourlyRate * OVERTIME_MULTIPLIERS.weekday;
    }
  });

  const approvedLeaveDates = new Set();
  approvedLeaves.forEach((leave) => {
    const leaveDates = getOverlapPayrollDates(leave.startDate, leave.endDate, monthStart, monthEnd);
    leaveDates.forEach((dateKey) => {
      if (!attendedWorkdayDates.has(dateKey)) {
        approvedLeaveDates.add(dateKey);
      }
    });
  });

  actualDays = Array.from(creditedWorkdayMap.values()).reduce((sum, value) => sum + value, 0);
  actualDays += approvedLeaveDates.size;
  actualDays = roundToTwoDecimals(actualDays);
  actualDays = Math.min(actualDays, standardWorkDays);
  overtimeHours = roundToTwoDecimals(overtimeHours);
  overtimeSalary = Math.round(overtimeSalary);

  const allowance = ALLOWANCE_MAP[user.position] || 0;
  const salaryPerDay = standardWorkDays > 0 ? Math.round(basicSalary / standardWorkDays) : 0;
  const totalSalary = salaryPerDay * actualDays;
  // Áp dụng mức phạt theo bậc
  const penalty = totalPenaltyAmount;
  // Fix: Chỉ đóng bảo hiểm nếu làm từ 14 ngày trở lên trong tháng
  const taxAndInsurance = actualDays >= 14 ? Math.round(basicSalary * 0.105) : 0;

  // Check existing salary record
  let salary = await Salary.findOne({ userId, month, year });

  const bonus = salary ? salary.bonus : 0; // preserve existing bonus if re-calculating

  const finalSalary = totalSalary + allowance + overtimeSalary + bonus - penalty - taxAndInsurance;

    if (salary) {
    // Update existing
    salary.basicSalary = basicSalary;
    salary.allowance = allowance;
    salary.workDays = standardWorkDays;
    salary.actualDays = actualDays;
    salary.lateDays = lateDays;
    salary.overtimeHours = overtimeHours;
    salary.salaryPerDay = salaryPerDay;
    salary.overtimeSalary = overtimeSalary;
    salary.penalty = penalty;
    salary.bonus = bonus;
    salary.taxAndInsurance = taxAndInsurance;
    salary.totalSalary = totalSalary;
    salary.finalSalary = finalSalary;
    salary.status = 'pending'; // Reset to pending on recalculation
    await salary.save();
  } else {
    salary = await Salary.create({
      userId,
      month,
      year,
      basicSalary,
      allowance,
      workDays: standardWorkDays,
      actualDays,
      lateDays,
      overtimeHours,
      salaryPerDay,
      overtimeSalary,
      penalty,
      bonus: 0,
      taxAndInsurance,
      totalSalary,
      finalSalary,
      status: 'pending',
    });
  }

  return salary;
};

// @desc    Calculate salary for a single employee
// @route   POST /api/salary/calculate
const calculateSalary = async (req, res) => {
  try {
    const { userId, month, year } = req.body;

    if (!userId || !month || !year) {
      return res.status(400).json({ message: 'Vui lòng cung cấp userId, month và year.' });
    }

    const salary = await computeSalary(userId, month, year);
    
    const io = req.app.get('io');
    createNotification(io, {
        userId: userId,
        type: 'salary_calculated',
        title: 'Lương đã được tính',
        message: `Lương tháng ${month}/${year} của bạn đã được tính.`,
        data: { month, year }
    });

    // Populate user info for response
    const populated = await Salary.findById(salary._id).populate('userId', 'name email department position');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Calculate salary for all active employees
// @route   POST /api/salary/calculate-all
const calculateAllSalaries = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: 'Vui lòng cung cấp month và year.' });
    }

    const users = await User.find({ isActive: true, role: { $in: ['employee', 'manager'] } });
    const results = [];
    const errors = [];
    const io = req.app.get('io');

    for (const user of users) {
      try {
        const salary = await computeSalary(user._id, month, year);
        results.push(salary);
        
        createNotification(io, {
            userId: user._id,
            type: 'salary_calculated',
            title: 'Lương đã được tính',
            message: `Lương tháng ${month}/${year} của bạn đã được tính.`,
            data: { month, year }
        });
      } catch (err) {
        errors.push({ userId: user._id, name: user.name, error: err.message });
      }
    }

    const populated = await Salary.find({
      month,
      year,
      userId: { $in: results.map(r => r.userId) },
    }).populate('userId', 'name email department position role');

    res.json({
      message: `Đã tính lương cho ${results.length} nhân viên.`,
      count: results.length,
      errors,
      salaries: populated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get all salaries (Admin sees all, Manager sees department)
// @route   GET /api/salary
const getAllSalaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = {};

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    // Manager of Accounting: sees ALL salaries (like admin)
    // Other managers: filter by their department only via a join
    let salaries;

    if (req.user.role === 'manager' && req.user.department !== 'Accounting') {
      // Get department user IDs first, then filter salary by those IDs
      const departmentUsers = await User.find({ department: req.user.department }).select('_id');
      query.userId = { $in: departmentUsers.map(u => u._id) };
    }

    salaries = await Salary.find(query)
      .populate('userId', 'name email department position role basicSalary')
      .sort({ createdAt: -1 });

    // Filter out any entries where populated userId is null (deleted users)
    salaries = salaries.filter(s => s.userId);

    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get my salaries (Employee)
// @route   GET /api/salary/me
const getMySalaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    const query = { userId: req.user._id };

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const salaries = await Salary.find(query).sort({ year: -1, month: -1 });
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Update salary status (Admin only: approve/paid)
// @route   PATCH /api/salary/:id/status
const updateSalaryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi lương.' });
    }

    if (!status || !['pending', 'approved', 'paid'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }

    salary.status = status;
    await salary.save();

    const io = req.app.get('io');
    if (status === 'approved' || status === 'paid') {
        createNotification(io, {
            userId: salary.userId,
            type: status === 'approved' ? 'salary_approved' : 'salary_paid',
            title: status === 'approved' ? 'Lương đã được duyệt' : 'Đã thanh toán lương',
            message: `Lương tháng ${salary.month}/${salary.year} của bạn đã ${status === 'approved' ? 'được duyệt' : 'được thanh toán'}.`,
            data: { salaryId: salary._id }
        });
    }

    const populated = await Salary.findById(salary._id).populate('userId', 'name email department position');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Approve all pending salaries in selected month/year (Admin only)
// @route   PATCH /api/salary/approve-all
const approveAllSalaries = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: 'Vui lòng cung cấp month và year.' });
    }

    const pendingSalaries = await Salary.find({
      month: Number(month),
      year: Number(year),
      status: 'pending',
    }).select('_id userId month year');

    if (pendingSalaries.length === 0) {
      return res.json({
        message: `Không có phiếu lương chờ duyệt trong tháng ${month}/${year}.`,
        count: 0,
      });
    }

    const salaryIds = pendingSalaries.map((s) => s._id);
    await Salary.updateMany(
      { _id: { $in: salaryIds } },
      { $set: { status: 'approved' } },
    );

    const io = req.app.get('io');
    pendingSalaries.forEach((salary) => {
      createNotification(io, {
        userId: salary.userId,
        type: 'salary_approved',
        title: 'Lương đã được duyệt',
        message: `Lương tháng ${salary.month}/${salary.year} của bạn đã được duyệt.`,
        data: { salaryId: salary._id },
      });
    });

    return res.json({
      message: `Đã duyệt nhanh ${pendingSalaries.length} phiếu lương tháng ${month}/${year}.`,
      count: pendingSalaries.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Update salary bonus (Accounting Manager only)
// @route   PATCH /api/salary/:id/bonus
const updateSalaryBonus = async (req, res) => {
  try {
    const { bonus } = req.body;
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi lương.' });
    }

    if (bonus === undefined) {
      return res.status(400).json({ message: 'Vui lòng cung cấp giá trị thưởng.' });
    }

    salary.bonus = Number(bonus);
    // Recalculate finalSalary with new bonus
    salary.finalSalary = salary.totalSalary + salary.allowance + salary.overtimeSalary + salary.bonus - salary.penalty - (salary.taxAndInsurance || 0);
    await salary.save();

    const populated = await Salary.findById(salary._id).populate('userId', 'name email department position');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

module.exports = {
  calculateSalary,
  calculateAllSalaries,
  getAllSalaries,
  getMySalaries,
  updateSalaryStatus,
  approveAllSalaries,
  updateSalaryBonus,
};
