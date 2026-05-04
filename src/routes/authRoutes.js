const express = require('express');
const { adminLogin, sendUserOtp, verifyUserOtp, getMe, logout } = require('../controllers/authController');
const { sendSmsOtp, verifySmsOtp } = require('../controllers/smsController');  // ADD THIS
const { getAllUsers, createUser, deleteUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/admin-login', adminLogin);
router.post('/send-otp', sendSmsOtp);  // CHANGE THIS - use sendSmsOtp instead
router.post('/verify-otp', verifySmsOtp);  // CHANGE THIS - use verifySmsOtp instead

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Admin only routes
router.get('/admin/users', protect, adminOnly, getAllUsers);
router.post('/admin/users', protect, adminOnly, createUser);
router.delete('/admin/users/:id', protect, adminOnly, deleteUser);

module.exports = router;