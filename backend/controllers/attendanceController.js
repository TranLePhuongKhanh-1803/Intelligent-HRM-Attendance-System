const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { verifyUserFace } = require('../utils/faceUtils');

const getDeepFaceErrorMessage = (err, fallbackMessage) => {
  return err.response?.data?.detail || err.response?.data?.message || fallbackMessage;
};

// Helper: Get today's date string in Vietnam timezone (YYYY-MM-DD)
const getVNDateString = (date = new Date()) => {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
};

// Helper: Get current hour in Vietnam timezone
const getVNHour = (date = new Date()) => {
  return parseInt(date.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }));
};

// @desc    Check-in via face recognition
// @route   POST /api/attendance/check-in
const checkIn = async (req, res) => {
  try {
    const { method, image } = req.body;
    let analyzeData = {};

    const today = getVNDateString();

    if (method === 'face') {
      // Face recognition check-in via DeepFace
      if (!image) {
        return res.status(400).json({ message: 'Dữ liệu khuôn mặt không hợp lệ.' });
      }

      // Get the authenticated user with face embedding
      const user = await User.findById(req.user._id);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa.' });
      }
      if (!user.faceEmbedding || user.faceEmbedding.length === 0) {
        return res.status(400).json({ message: 'Bạn chưa đăng ký khuôn mặt. Vui lòng đăng ký trước khi chấm công.' });
      }

      // Extract face vector from the image via DeepFace
      let faceVector;
      const axios = require('axios');
      try {
        const response = await axios.post('http://127.0.0.1:8000/represent', {
          image_base64: image,
          analyze: true
        });
        faceVector = response.data.embedding;

        if (response.data.emotion) analyzeData.emotion = response.data.emotion;
        if (response.data.age) analyzeData.age = response.data.age;
        if (response.data.gender) analyzeData.gender = response.data.gender;
      } catch (err) {
        console.error("[DeepFace CheckIn] Error:", err.response?.data || err.message);
        return res.status(400).json({
          message: getDeepFaceErrorMessage(err, 'Không nhận diện được khuôn mặt. Vui lòng đảm bảo ánh sáng đủ và nhìn thẳng vào camera.')
        });
      }

      // 1:1 verification — compare only against the logged-in user's face
      const result = verifyUserFace(faceVector, user);
      if (!result.verified) {
        return res.status(400).json({ message: 'Khuôn mặt không khớp với tài khoản của bạn. Vui lòng thử lại.' });
      }

      console.log(`[CheckIn] Face verified: ${user.name} (distance: ${result.distance.toFixed(4)})`);

      // Check if already checked in today
      const existingAttendance = await Attendance.findOne({ userId: user._id, date: today });
      if (existingAttendance) {
        return res.status(400).json({
          message: 'Bạn đã chấm công hôm nay.',
          attendance: existingAttendance,
        });
      }

      // Determine status based on check-in time
      const now = new Date();
      const vnHour = getVNHour(now);
      const status = vnHour >= 9 ? 'late' : 'present';

      const attendance = await Attendance.create({
        userId: user._id,
        date: today,
        checkIn: now,
        method: 'face',
        status,
        ...analyzeData
      });

      const populatedAttendance = await Attendance.findById(attendance._id).populate('userId', 'name email department position avatar');

      // Emit Socket.IO event
      const io = req.app.get('io');
      if (io) {
        io.emit('attendance:new', {
          type: 'check-in',
          attendance: populatedAttendance,
        });
      }

      return res.status(201).json({
        message: `Chấm công thành công cho ${user.name}`,
        attendance: populatedAttendance,
      });
    } else {
      return res.status(400).json({ message: 'Phương thức chấm công không hợp lệ. Hệ thống chỉ hỗ trợ nhận diện khuôn mặt.' });
    }

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bạn đã chấm công hôm nay.' });
    }
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Check-out
// @route   POST /api/attendance/check-out
const checkOut = async (req, res) => {
  try {
    const { method, image } = req.body;

    const today = getVNDateString();

    if (method === 'face') {
      if (!image) {
        return res.status(400).json({ message: 'Dữ liệu khuôn mặt không hợp lệ.' });
      }

      // Get the authenticated user with face embedding
      const user = await User.findById(req.user._id);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa.' });
      }
      if (!user.faceEmbedding || user.faceEmbedding.length === 0) {
        return res.status(400).json({ message: 'Bạn chưa đăng ký khuôn mặt.' });
      }

      // Extract face vector from the image via DeepFace
      let faceVector;
      const axios = require('axios');
      try {
        const response = await axios.post('http://127.0.0.1:8000/represent', {
          image_base64: image
        });
        faceVector = response.data.embedding;
      } catch (err) {
        console.error("[DeepFace CheckOut] Error:", err.response?.data || err.message);
        return res.status(400).json({
          message: getDeepFaceErrorMessage(err, 'Không nhận diện được khuôn mặt. Vui lòng đảm bảo ánh sáng đủ và nhìn thẳng vào camera.')
        });
      }

      // 1:1 verification — compare only against the logged-in user's face
      const result = verifyUserFace(faceVector, user);
      if (!result.verified) {
        return res.status(400).json({ message: 'Khuôn mặt không khớp với tài khoản của bạn. Vui lòng thử lại.' });
      }

      console.log(`[CheckOut] Face verified: ${user.name} (distance: ${result.distance.toFixed(4)})`);

      const attendance = await Attendance.findOne({ userId: user._id, date: today });
      if (!attendance) {
        return res.status(404).json({ message: 'Chưa có bản ghi chấm công hôm nay.' });
      }

      if (attendance.checkOut) {
        return res.status(400).json({ message: 'Đã check-out rồi.' });
      }

      attendance.checkOut = new Date();
      await attendance.save();

      const populatedAttendance = await Attendance.findById(attendance._id).populate('userId', 'name email department position avatar');

      const io = req.app.get('io');
      if (io) {
        io.emit('attendance:new', {
          type: 'check-out',
          attendance: populatedAttendance,
        });
      }

      return res.json({
        message: `Check-out thành công cho ${user.name}`,
        attendance: populatedAttendance,
      });
    } else {
      return res.status(400).json({ message: 'Phương thức không hợp lệ. Hệ thống chỉ hỗ trợ nhận diện khuôn mặt.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
const getAttendance = async (req, res) => {
  try {
    const { startDate, endDate, userId, method, page = 1, limit = 20 } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    if (userId) query.userId = userId;
    if (method) query.method = method;

    // Manager constraints
    if (req.user && req.user.role === 'manager') {
      const departmentUsers = await User.find({ department: req.user.department }).select('_id');
      const departmentUserIds = departmentUsers.map(u => u._id);

      // If a specific userId was requested, make sure it belongs to the department
      if (query.userId) {
        if (!departmentUserIds.some(id => id.toString() === query.userId.toString())) {
          return res.status(403).json({ message: 'Không có quyền truy cập dữ liệu của nhân viên này.' });
        }
      } else {
        query.userId = { $in: departmentUserIds };
      }
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('userId', 'name email department position avatar')
      .sort({ date: -1, checkIn: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      records,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get current user's attendance
// @route   GET /api/attendance/my
const getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user._id };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      records,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get today's attendance
// @route   GET /api/attendance/today
const getTodayAttendance = async (req, res) => {
  try {
    const today = getVNDateString();
    // Count all non-admin roles (employees + managers)
    let userQuery = { role: { $in: ['employee', 'manager'] }, isActive: true };
    const attendanceQuery = { date: today };

    if (req.user && req.user.role === 'manager') {
      userQuery.department = req.user.department;
      const departmentUsers = await User.find(userQuery).select('_id');
      const departmentUserIds = departmentUsers.map(u => u._id);
      attendanceQuery.userId = { $in: departmentUserIds };
    }

    const records = await Attendance.find(attendanceQuery)
      .populate('userId', 'name email department position avatar')
      .sort({ checkIn: -1 });

    const totalEmployees = await User.countDocuments(userQuery);
    const presentCount = records.length;
    const lateCount = records.filter(r => r.status === 'late').length;

    res.json({
      records,
      stats: {
        totalEmployees,
        presentCount,
        lateCount,
        absentCount: totalEmployees - presentCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Export attendance as CSV
// @route   GET /api/attendance/export
const exportAttendance = async (req, res) => {
  try {
    const { startDate, endDate, method } = req.query;
    const query = {};

    if (method) query.method = method;
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Manager constraints
    if (req.user && req.user.role === 'manager') {
      const departmentUsers = await User.find({ department: req.user.department }).select('_id');
      query.userId = { $in: departmentUsers.map(u => u._id) };
    }

    const records = await Attendance.find(query)
      .populate('userId', 'name email department')
      .sort({ date: -1 });

    let csv = 'Tên,Email,Phòng ban,Ngày,Giờ vào,Giờ ra,Phương thức,Trạng thái\n';
    records.forEach(r => {
      csv += `"${r.userId?.name || ''}","${r.userId?.email || ''}","${r.userId?.department || ''}","${r.date}","${r.checkIn ? new Date(r.checkIn).toLocaleTimeString('vi-VN') : ''}","${r.checkOut ? new Date(r.checkOut).toLocaleTimeString('vi-VN') : ''}","${r.method}","${r.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
    res.send('\uFEFF' + csv); // BOM for UTF-8
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Admin manually update attendance record
// @route   PUT /api/attendance/:id
const updateAttendance = async (req, res) => {
  try {
    const { checkIn, checkOut, status, note } = req.body;
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công.' });
    }

    // Manager constraints
    if (req.user && req.user.role === 'manager') {
      const targetUser = await User.findById(attendance.userId);
      if (targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'Không có quyền truy cập dữ liệu của nhân viên này.' });
      }
    }

    if (checkIn !== undefined) attendance.checkIn = checkIn ? new Date(checkIn) : null;
    if (checkOut !== undefined) attendance.checkOut = checkOut ? new Date(checkOut) : null;
    if (status !== undefined) attendance.status = status;
    // (Optional) if note is needed, we should add it to schema, but for now we might not have a note field. 
    // We can just rely on the updated checkOut.

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id).populate('userId', 'name email department position avatar');
    res.json({
      message: 'Cập nhật chấm công thành công',
      attendance: populatedAttendance
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

module.exports = {
  checkIn,
  checkOut,
  getAttendance,
  getMyAttendance,
  getTodayAttendance,
  exportAttendance,
  updateAttendance,
};
