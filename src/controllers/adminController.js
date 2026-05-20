const { User, OTP, Admin } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Get all users with login tracking
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: 'user' },
      attributes: { 
        exclude: ['password']
      },
      order: [['createdAt', 'DESC']]
    });
    
    // Get last verification method for each user
    const usersWithDetails = await Promise.all(users.map(async (user) => {
      const lastOTP = await OTP.findOne({
        where: { user_id: user.id, is_verified: true },
        order: [['createdAt', 'DESC']],
        attributes: ['delivery_method', 'verified_at']
      });
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        is_active: user.is_active,
        createdAt: user.createdAt,
        last_login: user.last_login,
        last_login_ip: user.last_login_ip,
        login_count: user.login_count || 0,
        last_login_method: user.last_login_method || lastOTP?.delivery_method || null,
        last_verification_time: lastOTP?.verified_at || null,
        last_verification_method: lastOTP?.delivery_method || null
      };
    }));
    
    res.json({ success: true, users: usersWithDetails });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users: ' + error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: OTP,
        as: 'otps',
        required: false,
        limit: 10,
        order: [['createdAt', 'DESC']]
      }]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { role: 'user' } });
    const activeUsers = await User.count({ where: { role: 'user', is_active: true } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.count({
      where: {
        role: 'user',
        createdAt: { [Op.gte]: today }
      }
    });
    
    const totalVerifications = await OTP.count({ where: { is_verified: true } });
    
    // Get verification counts by method
    const smsCount = await OTP.count({ where: { is_verified: true, delivery_method: 'sms' } });
    const whatsappCount = await OTP.count({ where: { is_verified: true, delivery_method: 'whatsapp' } });
    const emailCount = await OTP.count({ where: { is_verified: true, delivery_method: 'email' } });
    
    const verificationsByMethod = [
      { delivery_method: 'sms', count: smsCount },
      { delivery_method: 'whatsapp', count: whatsappCount },
      { delivery_method: 'email', count: emailCount }
    ].filter(m => m.count > 0);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        newUsersToday,
        totalVerifications,
        verificationsByMethod
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// Get login statistics
const getLoginStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const [totalUsers, todayLogins, weeklyLogins, monthlyLogins, totalLogins] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      User.count({ where: { role: 'user', last_login: { [Op.gte]: today } } }),
      User.count({ where: { role: 'user', last_login: { [Op.gte]: weekAgo } } }),
      User.count({ where: { role: 'user', last_login: { [Op.gte]: monthAgo } } }),
      User.sum('login_count', { where: { role: 'user' } })
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        todayLogins,
        weeklyLogins,
        monthlyLogins,
        totalLogins: totalLogins || 0,
        averageLoginsPerUser: totalLogins ? (totalLogins / totalUsers).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Get login stats error:', error);
    res.status(500).json({ error: 'Failed to get login stats' });
  }
};

// Create user
const createUser = async (req, res) => {
  try {
    const { name, phone, email, password, is_active } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if user exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { phone_number: cleanPhone },
          { email: email || null }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this phone or email' });
    }
    
    // Create user
    const user = await User.create({
      id: crypto.randomUUID(),
      name,
      phone_number: cleanPhone,
      email: email || null,
      password: password || null,
      role: 'user',
      is_active: is_active !== undefined ? is_active : true,
      created_by: req.user.id
    });
    
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, is_active } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (name) user.name = name;
    if (email !== undefined) user.email = email;
    if (is_active !== undefined) user.is_active = is_active;
    
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const phoneExists = await User.findOne({
        where: { phone_number: cleanPhone, id: { [Op.ne]: id } }
      });
      if (phoneExists) {
        return res.status(400).json({ error: 'Phone number already in use' });
      }
      user.phone_number = cleanPhone;
    }
    
    await user.save();
    
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user: ' + error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete associated OTPs first
    await OTP.destroy({ where: { user_id: id } });
    await user.destroy();
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserStats,
  getLoginStats,
  createUser,
  updateUser,
  deleteUser
};