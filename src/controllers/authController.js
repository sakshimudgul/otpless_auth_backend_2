const { Admin, User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Generate Access Token
const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Get client IP address
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.socket?.remoteAddress || 
         req.connection?.remoteAddress ||
         'unknown';
};

// ==================== ADMIN LOGIN ====================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIp(req);
    
    console.log('=== Admin Login ===');
    console.log('Email:', email);
    console.log('IP:', ipAddress);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const admin = await Admin.findOne({ where: { email } });
    
    if (!admin) {
      console.log('Admin not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, admin.password);
    
    if (!isValid) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update admin login tracking
    await admin.update({ 
      last_login: new Date(),
      login_count: (admin.login_count || 0) + 1,
      last_login_ip: ipAddress
    });
    
    const token = generateAccessToken(admin.id, 'admin');
    
    console.log('Login successful');
    
    res.json({
      success: true,
      token: token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

// ==================== SEND OTP ====================
const sendUserOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone
      });
    }
    
    // Delete old unverified OTPs
    await OTP.destroy({
      where: { phone_number: cleanPhone, is_verified: false }
    });
    
    // Save new OTP
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'sms',
      is_verified: false
    });
    
    console.log(`📱 SMS OTP for ${cleanPhone}: ${otpCode}`);
    
    res.json({
      success: true,
      message: 'SMS OTP sent',
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// ==================== VERIFY OTP ====================
const verifyUserOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    const ipAddress = getClientIp(req);
    
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
    
    // Mark OTP as verified
    await otpRecord.update({ 
      is_verified: true,
      verified_at: new Date(),
      ip_address: ipAddress
    });
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone
      });
    } else if (name) {
      await user.update({ name });
    }
    
    // Update user login tracking
    await user.update({ 
      last_login: new Date(),
      last_login_ip: ipAddress,
      login_count: (user.login_count || 0) + 1,
      last_login_method: otpRecord.delivery_method || 'sms'
    });
    
    const token = generateAccessToken(user.id, 'user');
    
    console.log(`✅ User ${user.name} logged in via ${otpRecord.delivery_method}`);
    
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        email: user.email,
        role: 'user',
        login_count: user.login_count,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// ==================== REFRESH TOKEN ====================
const refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const newToken = generateAccessToken(decoded.id, decoded.role);
    
    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ==================== LOGOUT ====================
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// ==================== GET CURRENT USER ====================
const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || user.phone_number,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Export all functions
module.exports = {
  adminLogin,
  sendUserOtp,
  verifyUserOtp,
  refreshToken,
  logout,
  getMe
};