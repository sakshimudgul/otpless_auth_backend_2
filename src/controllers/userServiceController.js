const UserService = require('../models/User');
const Service = require('../models/Service');
const { getDb } = require('../config/database');

// Get user's purchased services
const getUserServices = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const services = await UserService.findByUser(userId);
    res.json({ success: true, services });
  } catch (error) {
    console.error('Get user services error:', error);
    res.status(500).json({ error: 'Failed to get user services' });
  }
};

// Purchase service credits
const purchaseService = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { service_id, credits } = req.body;
    
    if (!service_id || !credits || credits <= 0) {
      return res.status(400).json({ error: 'Service ID and positive credits are required' });
    }
    
    // Check if service exists
    const service = await Service.findById(service_id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Find or create user service record
    let userService = await UserService.findByUserAndService(userId, service_id);
    if (!userService) {
      userService = await UserService.create({
        user_id: userId,
        service_id: service_id,
        credits: credits
      });
    } else {
      await UserService.addCredits(userService.id, credits);
      userService = await UserService.findById(userService.id);
    }
    
    res.json({ 
      success: true, 
      message: `Added ${credits} credits for ${service.display_name}`,
      userService 
    });
  } catch (error) {
    console.error('Purchase service error:', error);
    res.status(500).json({ error: 'Failed to purchase service: ' + error.message });
  }
};

// Check credits for a service
const checkCredits = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { service_id } = req.params;
    
    const userService = await UserService.findByUserAndService(userId, service_id);
    res.json({ 
      success: true, 
      credits: userService?.credits_remaining || 0,
      service_id
    });
  } catch (error) {
    console.error('Check credits error:', error);
    res.status(500).json({ error: 'Failed to check credits' });
  }
};

// Get service usage history
const getUsageHistory = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const db = getDb();
    
    const usage = await db.execute({
      sql: `
        SELECT su.*, s.display_name, eu.name as end_user_name
        FROM service_usage su
        JOIN services s ON su.service_id = s.id
        LEFT JOIN end_users eu ON su.end_user_id = eu.id
        WHERE su.user_id = ?
        ORDER BY su.created_at DESC
        LIMIT 50
      `,
      args: [userId]
    });
    
    res.json({ success: true, usage: usage.rows });
  } catch (error) {
    console.error('Get usage history error:', error);
    res.status(500).json({ error: 'Failed to get usage history' });
  }
};

module.exports = {
  getUserServices,
  purchaseService,
  checkCredits,
  getUsageHistory
};