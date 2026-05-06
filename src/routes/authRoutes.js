const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public routes
router.post('/admin-login', authController.adminLogin);
router.post('/send-otp', authController.sendUserOtp);
router.post('/verify-otp', authController.verifyUserOtp);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);

// Admin only routes
router.get('/admin/users', protect, adminOnly, adminController.getAllUsers);
router.post('/admin/users', protect, adminOnly, adminController.createUser);
router.delete('/admin/users/:id', protect, adminOnly, adminController.deleteUser);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working', timestamp: new Date() });
});

module.exports = router;