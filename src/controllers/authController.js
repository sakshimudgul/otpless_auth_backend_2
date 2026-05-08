const { Admin, User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const axios = require('axios'); // IMPORTANT: Add this

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Generate Access Token
const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// ==================== ADMIN LOGIN ====================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('=== Admin Login ===');
    console.log('Email:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const admin = await Admin.findOne({ where: { email } });
    
    if (!admin) {
      console.log('Admin not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('Admin found, verifying password...');
    
    const isValid = await bcrypt.compare(password, admin.password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    await admin.update({ last_login: new Date() });
    
    const token = generateAccessToken(admin.id, 'admin');
    
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

// ==================== SEND SMS OTP (WORKING) ====================
const sendUserOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`\n=========================================`);
    console.log(`📱 Sending OTP to ${cleanPhone}`);
    console.log(`🔑 OTP: ${otpCode}`);
    console.log(`=========================================\n`);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone
      });
    }
    
    // Delete old unverified OTPs
    await OTP.destroy({
      where: {
        phone_number: cleanPhone,
        is_verified: false
      }
    });
    
    // Save OTP to database
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'sms',
      is_verified: false
    });
    
    // ========== ACTUALLY SEND THE SMS USING YOUR API ==========
    const message = `Dear ${name || user.name} Your OTP is : ${otpCode}. Rich Solutions`;
    const smsUrl = `https://www.smsjust.com/sms/user/urlsms.php?username=${process.env.SMS_USERNAME}&pass=${process.env.SMS_PASSWORD}&senderid=${process.env.SMS_SENDER_ID}&dest_mobileno=${cleanPhone}&msgtype=TXT&message=${encodeURIComponent(message)}&response=Y`;
    
    console.log(`📤 Sending via SMSJust...`);
    console.log(`📝 Message: ${message}`);
    
    const smsResponse = await axios.get(smsUrl, { timeout: 30000 });
    const smsResult = smsResponse.data;
    console.log(`📨 SMS Response: ${smsResult}`);
    
    if (smsResult && smsResult.includes('-')) {
      console.log(`✅ SMS sent successfully! Message ID: ${smsResult}`);
    } else {
      console.log(`⚠️ SMS response: ${smsResult}`);
    }
    // =========================================================
    
    res.json({
      success: true,
      message: 'SMS OTP sent to your mobile',
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });
    
  } catch (error) {
    console.error('Send SMS OTP error:', error);
    res.status(500).json({ error: 'Failed to send SMS OTP: ' + error.message });
  }
};

// ==================== VERIFY SMS OTP ====================
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
    
    await otpRecord.update({ is_verified: true });
    
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone
      });
    } else if (name) {
      await user.update({ name });
    }
    
    await user.update({ last_login: new Date() });
    
    const token = generateAccessToken(user.id, 'user');
    
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Verify SMS OTP error:', error);
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
  // No authentication needed - just return success
  // The frontend will clear the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};
// ==================== GET CURRENT USER ====================
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role === 'admin') {
      const admin = await Admin.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      return res.json({ success: true, user: admin, role: 'admin' });
    } else {
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      return res.json({ success: true, user, role: 'user' });
    }
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