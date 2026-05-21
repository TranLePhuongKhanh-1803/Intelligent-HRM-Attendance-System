const express = require('express');
const router = express.Router();
const {
  getAttendanceTrend,
  getDepartmentStats,
  getMethodStats,
  getSalaryStats,
  getOverviewStats,
  getEmotionStats,
  getTopLateEmployees,
} = require('../controllers/statsController');
const { protect, adminOrManager } = require('../middleware/authMiddleware');

router.use(protect, adminOrManager);

router.get('/overview', getOverviewStats);
router.get('/attendance-trend', getAttendanceTrend);
router.get('/department', getDepartmentStats);
router.get('/method', getMethodStats);
router.get('/salary', getSalaryStats);
router.get('/emotion', getEmotionStats);
router.get('/top-late', getTopLateEmployees);

module.exports = router;
