const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

const getBusinessDays = (start, end) => {
  let count = 0;
  let curDate = new Date(start);
  curDate.setHours(0,0,0,0);
  const endDate = new Date(end);
  endDate.setHours(0,0,0,0);
  
  if (curDate > endDate) return 0;
  
  while (curDate <= endDate) {
    const day = curDate.getDay();
    if (day !== 0 && day !== 6) count++;
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

// @desc    Create a new leave request
// @route   POST /api/leaves
// @access  Private
const createLeaveRequest = async (req, res) => {
  try {
    const { startDate, endDate, reason, leaveType } = req.body;
    
    if (!startDate || !endDate || !reason || !leaveType) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    const days = getBusinessDays(startDate, endDate);
    if (days <= 0) {
      return res.status(400).json({ message: 'Thời gian nghỉ không hợp lệ (hoặc rơi toàn bộ vào cuối tuần).' });
    }

    // #5: Validate leave quota
    const leaveQuota = req.user.leaveQuota || 15;
    const approvedLeaves = await LeaveRequest.find({ user: req.user._id, status: 'approved' });
    const usedDays = approvedLeaves.reduce((acc, l) => acc + l.days, 0);
    const pendingLeaves = await LeaveRequest.find({ user: req.user._id, status: 'pending' });
    const pendingDays = pendingLeaves.reduce((acc, l) => acc + l.days, 0);

    if (usedDays + pendingDays + days > leaveQuota) {
      const remaining = leaveQuota - usedDays - pendingDays;
      return res.status(400).json({ 
        message: `Bạn chỉ còn ${Math.max(0, remaining)} ngày phép khả dụng (đã dùng: ${usedDays}, đang chờ: ${pendingDays}).` 
      });
    }

    // #6: Check overlapping dates
    const overlap = await LeaveRequest.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ 
        message: 'Bạn đã có đơn nghỉ phép trùng khoảng thời gian này (đang chờ hoặc đã duyệt).' 
      });
    }

    const leave = await LeaveRequest.create({
      user: req.user._id,
      department: req.user.department,
      leaveType,
      isPaid: req.body.isPaid !== undefined ? req.body.isPaid : true,
      days,
      startDate,
      endDate,
      reason,
      status: 'pending'
    });

    // Notify managers in the department or Admin
    const managers = await User.find({ 
      $or: [
        { role: 'manager', department: req.user.department },
        { role: 'admin' }
      ]
    });
    
    const io = req.app.get('io');
    managers.forEach(manager => {
      createNotification(io, {
        userId: manager._id,
        type: 'new_leave_request',
        title: 'Đơn nghỉ phép mới',
        message: `${req.user.name} đã gửi đơn xin nghỉ phép ${days} ngày.`,
        data: { leaveId: leave._id }
      });
    });

    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get current user's leave requests
// @route   GET /api/leaves/my
// @access  Private
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ user: req.user._id })
      .populate('approver', 'name')
      .sort({ createdAt: -1 });

    const used = leaves.filter(l => l.status === 'approved').reduce((acc, curr) => acc + curr.days, 0);
    const pending = leaves.filter(l => l.status === 'pending').length;
    const leaveQuota = req.user.leaveQuota || 15;

    res.json({
      leaves,
      stats: {
        total: leaveQuota,
        used,
        remaining: leaveQuota - used,
        pending
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get leave requests for manager's department
// @route   GET /api/leaves/department
// @access  Manager
const getDepartmentLeaves = async (req, res) => {
  try {
    // Manager can only see leaves from their own department
    const leaves = await LeaveRequest.find({ department: req.user.department })
      .populate('user', 'name email position')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Approve or reject a leave request
// @route   PUT /api/leaves/:id/status
// @access  Manager
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('user', 'department');
    
    if (!leave) {
      return res.status(404).json({ message: 'Không tìm thấy đơn xin nghỉ phép' });
    }

    // Manager can only approve leaves of their own department
    if (req.user.role === 'manager' && leave.user.department !== req.user.department) {
       return res.status(403).json({ message: 'Không có quyền duyệt cho nhân viên phòng khác' });
    }

    leave.status = status;
    leave.approver = req.user._id;
    if (comment) {
      leave.comment = comment;
    }

    await leave.save();
    const io = req.app.get('io');
    createNotification(io, {
      userId: leave.user._id,
      type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
      title: status === 'approved' ? 'Đơn nghỉ phép được duyệt' : 'Đơn nghỉ phép bị từ chối',
      message: `Đơn xin nghỉ phép của bạn từ ${new Date(leave.startDate).toLocaleDateString('vi-VN')} đã bị ${status === 'approved' ? 'chấp nhận' : 'từ chối'}.`,
      data: { leaveId: leave._id }
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get all leave requests
// @route   GET /api/leaves
// @access  Admin
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find()
      .populate('user', 'name department position')
      .populate('approver', 'name')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

module.exports = {
  createLeaveRequest,
  getMyLeaves,
  getDepartmentLeaves,
  updateLeaveStatus,
  getAllLeaves,
};
