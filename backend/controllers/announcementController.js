const Announcement = require('../models/Announcement');

// @desc    Get active announcements for dashboard
// @route   GET /api/announcements/active
// @access  Private (All authenticated users)
const getActiveAnnouncements = async (req, res) => {
  try {
    let query = { isActive: true };
    if (req.user.role !== 'admin') {
      query.$or = [{ department: 'All' }, { department: req.user.department }];
    }
    const announcements = await Announcement.find(query)
      .populate('author', 'name role')
      .sort({ createdAt: -1 })
      .limit(5); // Only show top 5 active
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private/Admin
const getAllAnnouncements = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'manager') {
      query.department = req.user.department;
    }
    const announcements = await Announcement.find(query)
      .populate('author', 'name role')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private/Admin
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, isActive, department } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc.' });
    }

    let finalDepartment = 'All';
    if (req.user.role === 'manager') {
      finalDepartment = req.user.department;
    } else if (req.user.role === 'admin') {
      finalDepartment = department || 'All';
    }

    const announcement = await Announcement.create({
      title,
      content,
      type: type || 'info',
      isActive: isActive !== undefined ? isActive : true,
      department: finalDepartment,
      author: req.user._id,
    });

    const populated = await Announcement.findById(announcement._id).populate('author', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin
const updateAnnouncement = async (req, res) => {
  try {
    const { title, content, type, isActive, department } = req.body;
    let announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    }

    if (req.user.role === 'manager' && announcement.department !== req.user.department) {
      return res.status(403).json({ message: 'Không có quyền sửa thông báo của phòng ban khác.' });
    }

    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;
    if (type !== undefined) announcement.type = type;
    if (isActive !== undefined) announcement.isActive = isActive;
    if (req.user.role === 'admin' && department !== undefined) {
      announcement.department = department;
    }

    await announcement.save();
    
    announcement = await Announcement.findById(announcement._id).populate('author', 'name');
    res.json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    }

    if (req.user.role === 'manager' && announcement.department !== req.user.department) {
      return res.status(403).json({ message: 'Không có quyền xóa thông báo của phòng ban khác.' });
    }

    await announcement.deleteOne();
    res.json({ message: 'Đã xóa thông báo.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
};

module.exports = {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
};
