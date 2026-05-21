const express = require('express');
const {
  checkIn,
  checkOut,
  getAttendance,
  getMyAttendance,
  getTodayAttendance,
  exportAttendance,
  updateAttendance,
} = require('../controllers/attendanceController');
const { protect, adminOnly, adminOrManager } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/my', getMyAttendance);
router.get('/today', adminOrManager, getTodayAttendance);
router.get('/export', adminOrManager, exportAttendance);
router.get('/', adminOrManager, getAttendance);
router.put('/:id', adminOrManager, updateAttendance);

module.exports = router;
