const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await User.findOne({ where: { email, role: 'admin' } });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    res.status(500).json({ error: 'Login failed' });
  }
};

// Send OTP
const sendUserOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone,
        role: 'user'
      });
      console.log('✅ User saved to database:', user.id);
    }
    
    // Save OTP
    const otpRecord = await OTP.create({
      phone_number: cleanPhone,
      otp_code: otp,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'sms'
    });
    console.log('✅ OTP saved to database:', otpRecord.id);
    console.log(`📱 OTP: ${otp} for ${cleanPhone}`);
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      demoOtp: otp
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Verify OTP
const verifyUserOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    
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
    
    await otpRecord.update({
      is_verified: true,
      verified_at: new Date()
    });
    console.log('✅ OTP marked as verified in database');
    
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone,
        role: 'user'
      });
    }
    
    await user.update({ last_login: new Date() });
    console.log('✅ User last_login updated');
    
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
  res.json({ success: true, message: 'Logged out' });
};

module.exports = { adminLogin, sendUserOtp, verifyUserOtp, getMe, logout };