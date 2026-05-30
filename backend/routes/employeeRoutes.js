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
router.post('/', adminOnly, createEmployee);
router.put('/:id', adminOnly, updateEmployee);
router.delete('/:id', adminOnly, deleteEmployee);
router.put('/:id/face', adminOnly, updateFaceEmbedding);
router.delete('/:id/face', adminOnly, deleteFaceEmbedding);

module.exports = router;
