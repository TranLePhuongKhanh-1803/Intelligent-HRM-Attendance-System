const express = require('express');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateFaceEmbedding,
  deleteFaceEmbedding,
} = require('../controllers/employeeController');
const { protect, adminOnly, adminOrManager } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', getEmployees);
router.get('/:id', getEmployee);
router.post('/', adminOrManager, createEmployee);
router.put('/:id', adminOrManager, updateEmployee);
router.delete('/:id', adminOrManager, deleteEmployee);
router.put('/:id/face', adminOrManager, updateFaceEmbedding);
router.delete('/:id/face', adminOrManager, deleteFaceEmbedding);

module.exports = router;
