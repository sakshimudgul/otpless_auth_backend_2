const express = require('express');
const { adminLogin, sendUserOtp, verifyUserOtp, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/admin-login', adminLogin);
router.post('/send-otp', sendUserOtp);        // This is the endpoint your frontend calls
router.post('/verify-otp', verifyUserOtp);    // This is the endpoint your frontend calls

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;