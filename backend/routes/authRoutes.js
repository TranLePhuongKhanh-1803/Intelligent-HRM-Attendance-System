const express = require('express');
const { login, register, getMe, updateMyFace, deleteMyFace, updateMe } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, adminOnly, register);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/me/face', protect, updateMyFace);
router.delete('/me/face', protect, deleteMyFace);

module.exports = router;
