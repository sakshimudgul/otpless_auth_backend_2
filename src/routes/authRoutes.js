const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// ==================== PUBLIC ROUTES (No authentication required) ====================

// Admin login
router.post('/admin-login', authController.adminLogin);

// User OTP routes
router.post('/send-otp', authController.sendUserOtp);
router.post('/verify-otp', authController.verifyUserOtp);

// Token refresh and logout
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// ==================== PROTECTED ROUTES (Authentication required) ====================

// Get current user info
router.get('/me', protect, authController.getMe);

// ==================== ADMIN ONLY ROUTES (Admin authentication required) ====================

// User management routes
router.get('/admin/users', protect, adminOnly, adminController.getAllUsers);
router.get('/admin/users/stats', protect, adminOnly, adminController.getUserStats);
router.get('/admin/users/:id', protect, adminOnly, adminController.getUserById);
router.post('/admin/users', protect, adminOnly, adminController.createUser);
router.put('/admin/users/:id', protect, adminOnly, adminController.updateUser);
router.delete('/admin/users/:id', protect, adminOnly, adminController.deleteUser);

// Login statistics routes
router.get('/admin/login-stats', protect, adminOnly, adminController.getLoginStats);

// ==================== TEST ROUTE ====================
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;