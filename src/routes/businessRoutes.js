const express = require('express');
const { protect, businessUserOnly } = require('../middleware/authMiddleware');
const endUserController = require('../controllers/endUserController');
const userServiceController = require('../controllers/userServiceController');
const serviceController = require('../controllers/serviceController');

const router = express.Router();

router.use(protect);
router.use(businessUserOnly);

// END USER MANAGEMENT
router.get('/end-users', endUserController.getEndUsers);
router.put('/end-users/:id', endUserController.updateEndUser);
router.delete('/end-users/:id', endUserController.deleteEndUser);

// SERVICE MANAGEMENT
router.get('/services', userServiceController.getUserServices);
router.get('/available-services', serviceController.getActiveServices);
router.post('/services/purchase', userServiceController.purchaseService);
router.get('/services/:service_id/credits', userServiceController.checkCredits);

// USAGE
router.get('/usage', userServiceController.getUsageHistory);

// DASHBOARD STATS
router.get('/stats', async (req, res) => {
  try {
    const db = require('../config/database').getDb();
    const userId = req.userId;

    const [endUsers, services, usage] = await Promise.all([
      db.execute({ sql: 'SELECT COUNT(*) as count FROM end_users', args: [] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM user_services WHERE user_id = ? AND is_active = 1', args: [userId] }),
      db.execute({ sql: 'SELECT SUM(credits_remaining) as total FROM user_services WHERE user_id = ? AND is_active = 1', args: [userId] })
    ]);

    res.json({
      success: true,
      stats: {
        totalEndUsers: endUsers.rows[0]?.count || 0,
        activeServices: services.rows[0]?.count || 0,
        totalCredits: usage.rows[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get business stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;