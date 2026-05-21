const Event = require('../models/Event');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
  try {
    const { title, description, date, target } = req.body;

    if (!title || !description || !date) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đủ tiêu đề, mô tả và ngày.' });
    }

    const event = await Event.create({
      title,
      description,
      date,
      target: target || 'All',
      createdBy: req.user._id,
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
  }
};

// @desc    Get all events (for Admin/Management view)
// @route   GET /api/events/all
// @access  Private/Admin
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name')
      .sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
  }
};

// @desc    Get user-specific events
// @route   GET /api/events
// @access  Private
const getUserEvents = async (req, res) => {
  try {
    // Return events targeting 'All' OR user's specific department
    const userTarget = req.user.department;
    
    // If admin is viewing standard calendar, should they see everything?
    // User requested "Admin tạo lịch -> user thấy". 
    // If it's an admin looking at standard /calendar, let's just show All and their department.
    // Or if Admin, show all.
    let filter = {
      $or: [{ target: 'All' }, { target: userTarget }]
    };

    if (req.user.role === 'admin') {
      filter = {}; // Admin sees all events on standard view
    }

    const events = await Event.find(filter)
      .populate('createdBy', 'name')
      .sort({ date: 1 });
      
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Không tìm thấy sự kiện' });
    }
    await event.deleteOne();
    res.json({ message: 'Đã xóa sự kiện' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ: ' + error.message });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getUserEvents,
  deleteEvent
};
