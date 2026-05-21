const express = require('express');
const {
  calculateSalary,
  calculateAllSalaries,
  getAllSalaries,
  getMySalaries,
  updateSalaryStatus,
  approveAllSalaries,
  updateSalaryBonus,
} = require('../controllers/salaryController');
const { protect, adminOnly, adminOrManager, hasPermission, adminOrAccounting } = require('../middleware/authMiddleware');

const router = express.Router();

// Accounting Manager: calculate salaries & edit bonus
router.post('/calculate', protect, hasPermission('manage_salary'), calculateSalary);
router.post('/calculate-all', protect, hasPermission('manage_salary'), calculateAllSalaries);
router.patch('/:id/bonus', protect, hasPermission('manage_salary'), updateSalaryBonus);

// Admin: approve/change status only
router.patch('/approve-all', protect, adminOnly, approveAllSalaries);
router.patch('/:id/status', protect, adminOnly, updateSalaryStatus);

// View: Admin and Accounting sees all
router.get('/', protect, adminOrAccounting, getAllSalaries);
router.get('/me', protect, getMySalaries);

module.exports = router;
