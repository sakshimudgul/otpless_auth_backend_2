const express = require('express');
const { 
  adminLogin, 
  sendUserOtp, 
  verifyUserOtp, 
  refreshToken, 
  logout, 
  getMe 
} = require('../controllers/authController');
const { getAllUsers, createUser, deleteUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ============ PUBLIC ROUTES (No authentication required) ============
router.post('/admin-login', adminLogin);
router.post('/send-otp', sendUserOtp);
router.post('/verify-otp', verifyUserOtp);
router.post('/refresh', refreshToken);
router.post('/logout', logout);  // ← PUBLIC route

// ============ PROTECTED ROUTES (Authentication required) ============
router.get('/me', protect, getMe);

// ============ ADMIN ONLY ROUTES ============
router.get('/admin/users', protect, adminOnly, getAllUsers);
router.post('/admin/users', protect, adminOnly, createUser);
router.delete('/admin/users/:id', protect, adminOnly, deleteUser);

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working', timestamp: new Date() });
});

module.exports = router;