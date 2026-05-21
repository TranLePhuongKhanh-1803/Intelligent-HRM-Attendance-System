const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createEvent,
  getAllEvents,
  getUserEvents,
  deleteEvent
} = require('../controllers/eventController');

// All authenticated users can get their specific events
router.route('/')
  .get(protect, getUserEvents)
  .post(protect, adminOnly, createEvent);

// Admin routes
router.route('/all')
  .get(protect, adminOnly, getAllEvents);

router.route('/:id')
  .delete(protect, adminOnly, deleteEvent);

module.exports = router;
