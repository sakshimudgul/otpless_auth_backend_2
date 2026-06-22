const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');

// Admin only middleware (local version)
const adminOnly = (req, res, next) => {
  if (req.userRole === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// ==================== PUBLIC ROUTES ====================
router.post('/admin/login', authController.adminLogin);
router.post('/user/login', authController.businessUserLogin);
router.post('/enduser/login', authController.sendEndUserOtp);
router.post('/enduser/verify', authController.verifyEndUserOtp);
router.post('/send-otp', authController.sendUserOtp);
router.post('/verify-otp', authController.verifyUserOtp);
router.post('/send-whatsapp', authController.sendWhatsAppOtp);
router.post('/verify-whatsapp', authController.verifyWhatsAppOtp);
router.post('/send-email', authController.sendEmailOtp);
router.post('/verify-email', authController.verifyEmailOtp);
router.post('/logout', authController.logout);

// ==================== PROTECTED ROUTES ====================
router.get('/me', verifyToken, authController.getMe);

// ==================== ADMIN ONLY ROUTES ====================
router.get('/admin/users', verifyToken, adminOnly, adminController.getAllUsers);
router.get('/admin/users/stats', verifyToken, adminOnly, adminController.getUserStats);
router.get('/admin/users/:id', verifyToken, adminOnly, adminController.getUserById);
router.put('/admin/users/:id', verifyToken, adminOnly, adminController.updateUser);
router.delete('/admin/users/:id', verifyToken, adminOnly, adminController.deleteUser);
router.put('/admin/users/:id/toggle-status', verifyToken, adminOnly, adminController.toggleUserStatus);

router.get('/admin/business-users', verifyToken, adminOnly, adminController.getBusinessUsers);
router.post('/admin/business-users', verifyToken, adminOnly, adminController.createBusinessUser);
router.delete('/admin/business-users/:id', verifyToken, adminOnly, adminController.deleteBusinessUser);

router.get('/admin/stats', verifyToken, adminOnly, adminController.getAdminStats);

module.exports = router;