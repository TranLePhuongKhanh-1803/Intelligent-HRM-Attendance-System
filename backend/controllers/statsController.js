const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Salary = require('../models/Salary');
const LeaveRequest = require('../models/LeaveRequest');

// Helper: Get VN date string
const getVNDateString = (date = new Date()) => {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
};

// Helper: Get base user query constraints (e.g. for a Manager)
const getUserConstraints = async (user) => {
  const userQuery = { role: { $in: ['employee', 'manager'] }, isActive: true };
  let departmentUserIds = null;
  
  if (user && user.role === 'manager') {
    userQuery.department = user.department;
    const departmentUsers = await User.find({ department: user.department }).select('_id');
    departmentUserIds = departmentUsers.map(u => u._id);
  }
  
  return { userQuery, departmentUserIds };
};

// @desc    Get attendance trend (last 30 days)
// @route   GET /api/stats/attendance-trend
const getAttendanceTrend = async (req, res) => {
  try {
    const { departmentUserIds } = await getUserConstraints(req.user);
    const baseQuery = departmentUserIds ? { userId: { $in: departmentUserIds } } : {};

    const days = 30;
    const result = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = getVNDateString(d);
      
      const total = await Attendance.countDocuments({ ...baseQuery, date: dateStr });
      const late = await Attendance.countDocuments({ ...baseQuery, date: dateStr, status: 'late' });
      const onTime = total - late;

      // Short label: DD/MM
      const parts = dateStr.split('-');
      const label = `${parts[2]}/${parts[1]}`;

      result.push({ date: dateStr, label, total, onTime, late });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get department statistics
// @route   GET /api/stats/department
const getDepartmentStats = async (req, res) => {
  try {
    const today = getVNDateString();
    
    // For manager: only show their own department, skip comparing with others
    const isManager = req.user && req.user.role === 'manager' && req.user.department !== 'Accounting';
    const departments = isManager ? [req.user.department] : ['IT', 'HR', 'Accounting'];
    
    const result = [];

    for (const dept of departments) {
      const totalEmployees = await User.countDocuments({ 
        department: dept, 
        role: { $in: ['employee', 'manager'] }, 
        isActive: true 
      });
      
      const userIds = (await User.find({ department: dept, isActive: true }).select('_id')).map(u => u._id);
      
      const checkedIn = await Attendance.countDocuments({ date: today, userId: { $in: userIds } });
      const late = await Attendance.countDocuments({ date: today, userId: { $in: userIds }, status: 'late' });
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = getVNDateString(thirtyDaysAgo);
      
      const monthlyTotal = await Attendance.countDocuments({ 
        userId: { $in: userIds }, 
        date: { $gte: fromDate, $lte: today } 
      });

      result.push({
        department: dept,
        totalEmployees,
        checkedIn,
        absent: totalEmployees - checkedIn,
        late,
        monthlyAttendance: monthlyTotal,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get check-in method distribution
// @route   GET /api/stats/method
const getMethodStats = async (req, res) => {
  try {
    const { departmentUserIds } = await getUserConstraints(req.user);
    const baseQuery = departmentUserIds ? { userId: { $in: departmentUserIds } } : {};

    const face = await Attendance.countDocuments({ ...baseQuery, method: 'face' });
    const qr = await Attendance.countDocuments({ ...baseQuery, method: 'qr' });
    
    res.json([
      { name: 'Face Recognition', value: face, color: '#3b82f6' },
      { name: 'QR Code', value: qr, color: '#10b981' },
    ]);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get salary overview (last 6 months)
// @route   GET /api/stats/salary
const getSalaryStats = async (req, res) => {
  try {
    const { departmentUserIds } = await getUserConstraints(req.user);
    const baseQuery = departmentUserIds ? { userId: { $in: departmentUserIds } } : {};

    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      const salaries = await Salary.find({ ...baseQuery, month, year });
      
      const totalFund = salaries.reduce((sum, s) => sum + (s.finalSalary || 0), 0);
      const totalBonus = salaries.reduce((sum, s) => sum + (s.bonus || 0), 0);
      const totalPenalty = salaries.reduce((sum, s) => sum + (s.penalty || 0), 0);
      const count = salaries.length;

      result.push({
        label: `T${month}/${year}`,
        month,
        year,
        totalFund,
        totalBonus,
        totalPenalty,
        employeeCount: count,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get overview summary
// @route   GET /api/stats/overview
const getOverviewStats = async (req, res) => {
  try {
    const today = getVNDateString();
    const { userQuery, departmentUserIds } = await getUserConstraints(req.user);
    
    // Core query for Attendance and Leaves
    const attendanceQuery = departmentUserIds ? { date: today, userId: { $in: departmentUserIds } } : { date: today };
    const leaveQuery = departmentUserIds ? { status: 'pending', user: { $in: departmentUserIds } } : { status: 'pending' };
    const salaryQuery = departmentUserIds ? { userId: { $in: departmentUserIds } } : {};
    
    const totalEmployees = await User.countDocuments(userQuery);
    const todayCheckedIn = await Attendance.countDocuments(attendanceQuery);
    const todayLate = await Attendance.countDocuments({ ...attendanceQuery, status: 'late' });
    const pendingLeaves = await LeaveRequest.countDocuments(leaveQuery);

    // This month salary
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthlySalaries = await Salary.find({ ...salaryQuery, month: currentMonth, year: currentYear });
    const totalSalaryFund = monthlySalaries.reduce((sum, s) => sum + (s.finalSalary || 0), 0);
    
    // Face registrations
    const faceQuery = { ...userQuery, faceEmbedding: { $exists: true, $ne: [] } };
    const faceRegistered = await User.countDocuments(faceQuery);

    res.json({
      totalEmployees,
      todayCheckedIn,
      todayAbsent: totalEmployees - todayCheckedIn,
      todayLate,
      todayOnTime: todayCheckedIn - todayLate,
      pendingLeaves,
      totalSalaryFund,
      faceRegistered,
      faceNotRegistered: totalEmployees - faceRegistered,
      attendanceRate: totalEmployees > 0 ? Math.round((todayCheckedIn / totalEmployees) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

module.exports = {
  getAttendanceTrend,
  getDepartmentStats,
  getMethodStats,
  getSalaryStats,
  getOverviewStats,
};
