const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// ==================== DASHBOARD STATS ====================
router.get('/stats', adminController.getAdminStats);

// ==================== BUSINESS USER MANAGEMENT ====================
router.get('/business-users', adminController.getBusinessUsers);
router.post('/business-users', adminController.createBusinessUser);
router.delete('/business-users/:id', adminController.deleteBusinessUser);

// ==================== END USER MANAGEMENT (READ-ONLY + UPDATE/DELETE) ====================
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);

// ==================== USER STATS ====================
router.get('/users/stats', adminController.getUserStats);

module.exports = router;