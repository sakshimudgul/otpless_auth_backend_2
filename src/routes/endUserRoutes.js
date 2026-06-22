const express = require('express');
const { protect, endUserOnly } = require('../middleware/authMiddleware');
const endUserController = require('../controllers/endUserController');

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.post('/login', endUserController.sendEndUserOtp);
router.post('/verify', endUserController.verifyEndUserOtp);

// ==================== PROTECTED ROUTES ====================
router.get('/me', protect, endUserOnly, endUserController.getEndUserProfile);
router.get('/usage', protect, endUserOnly, endUserController.getEndUserUsage);

module.exports = router;