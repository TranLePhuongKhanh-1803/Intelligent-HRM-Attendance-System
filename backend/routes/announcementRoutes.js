const express = require('express');
const {
  getActiveAnnouncements,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect, adminOrManager } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All routes require login

// Public for all authenticated
router.get('/active', getActiveAnnouncements);

// Protected routes (Admin/Manager)
router.get('/', adminOrManager, getAllAnnouncements);
router.post('/', adminOrManager, createAnnouncement);
router.put('/:id', adminOrManager, updateAnnouncement);
router.delete('/:id', adminOrManager, deleteAnnouncement);

module.exports = router;
