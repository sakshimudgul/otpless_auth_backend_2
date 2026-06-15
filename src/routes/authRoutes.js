const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Token verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.userRole === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// ==================== PUBLIC ROUTES ====================
// Admin
router.post('/admin-login', authController.adminLogin);
router.post('/logout', authController.logout);

// SMS OTP
router.post('/send-otp', authController.sendUserOtp);
router.post('/verify-otp', authController.verifyUserOtp);

// WhatsApp OTP
router.post('/send-whatsapp', authController.sendWhatsAppOtp);
router.post('/verify-whatsapp', authController.verifyWhatsAppOtp);

// Email OTP
router.post('/send-email', authController.sendEmailOtp);
router.post('/verify-email', authController.verifyEmailOtp);

// ==================== PROTECTED ROUTES ====================
router.get('/me', verifyToken, authController.getMe);

// ==================== ADMIN ONLY ROUTES ====================
router.get('/admin/users', verifyToken, adminOnly, adminController.getAllUsers);
router.get('/admin/users/stats', verifyToken, adminOnly, adminController.getUserStats);
router.get('/admin/users/:id', verifyToken, adminOnly, adminController.getUserById);
router.post('/admin/users', verifyToken, adminOnly, adminController.createUser);
router.put('/admin/users/:id', verifyToken, adminOnly, adminController.updateUser);
router.delete('/admin/users/:id', verifyToken, adminOnly, adminController.deleteUser);

module.exports = router;