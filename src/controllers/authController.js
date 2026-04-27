const { User, OTP } = require('../models');
const { generateOTP, sendSMS, sendWhatsApp } = require('../services/smsService');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

// ==================== ADMIN LOGIN ====================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const admin = await User.findOne({ where: { email, role: 'admin' } });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!admin.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }
    
    const isValid = await admin.validatePassword(password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    await admin.update({ last_login: new Date() });
    
    const token = generateToken(admin.id, admin.role);
    
    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

// ==================== CREATE USER (Admin Only) ====================
const createUser = async (req, res) => {
  try {
    console.log('Create user request received:', req.body);
    console.log('User from token:', req.userId, req.userRole);
    
    const { name, phone, email } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    console.log('Cleaned phone:', cleanPhone);
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { phone_number: cleanPhone } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this phone already exists' });
    }
    
    // Create new user
    const user = await User.create({
      name,
      phone_number: cleanPhone,
      email: email || null,
      role: 'user',
      is_active: true
    });
    
    console.log('User created successfully:', user.id);
    
    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
};

// ==================== GET ALL USERS (Admin Only) ====================
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { role: 'user' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    console.log(`Found ${users.length} users`);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// ==================== USER OTP LOGIN ====================
const sendUserOtp = async (req, res) => {
  try {
    const { phone, method = 'sms' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    const user = await User.findOne({ where: { phone_number: cleanPhone, role: 'user' } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please contact admin.' });
    }
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
    }
    
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await OTP.update(
      { is_verified: true },
      { where: { phone_number: cleanPhone, is_verified: false } }
    );
    
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      user_id: user.id
    });
    
    if (method === 'sms') {
      await sendSMS(cleanPhone, otpCode, user.name);
    } else {
      await sendWhatsApp(cleanPhone, otpCode, user.name);
    }
    
    res.json({
      success: true,
      message: `OTP sent via ${method.toUpperCase()}`,
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP: ' + error.message });
  }
};

const verifyUserOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    const otpRecord = await OTP.findOne({
      where: {
        phone_number: cleanPhone,
        otp_code: otp,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
    
    if (!otpRecord) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    
    await otpRecord.update({ is_verified: true });
    
    const user = await User.findOne({ where: { phone_number: cleanPhone } });
    await user.update({ last_login: new Date() });
    
    const token = generateToken(user.id, user.role);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

const logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

module.exports = { 
  adminLogin, 
  createUser, 
  getAllUsers,
  sendUserOtp, 
  verifyUserOtp, 
  getMe, 
  logout 
};