const express = require('express');
const router = express.Router();
const {
  createLeaveRequest,
  getMyLeaves,
  getDepartmentLeaves,
  updateLeaveStatus,
  getAllLeaves,
} = require('../controllers/leaveController');
const { protect, adminOnly, adminOrManager } = require('../middleware/authMiddleware');

// User routes
router.route('/my')
  .post(protect, createLeaveRequest)
  .get(protect, getMyLeaves);

// Manager routes
router.route('/department')
  .get(protect, adminOrManager, getDepartmentLeaves);

router.route('/:id/status')
  .put(protect, adminOrManager, updateLeaveStatus);

// Admin routes
router.route('/')
  .get(protect, adminOnly, getAllLeaves);

module.exports = router;
