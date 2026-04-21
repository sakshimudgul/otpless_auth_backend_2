const { User, OTP } = require('../models');
const { generateOTP, sendOTP } = require('../services/smsService');
const { generateToken } = require('../config/jwt');
const { Op } = require('sequelize');
const crypto = require('crypto');

// Generate unique request ID
const generateRequestId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Send OTP and store in database
const sendOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    const requestId = generateRequestId();
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    console.log('=========================================');
    console.log('📱 SEND OTP REQUEST');
    console.log('Request ID:', requestId);
    console.log('Phone:', phone);
    console.log('IP:', ipAddress);
    console.log('User Agent:', userAgent);
    console.log('=========================================');
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ 
        phone_number: cleanPhone,
        name: name || null,
        device_info: userAgent
      });
      console.log('✅ New user created in database:', {
        id: user.id,
        phone: user.phone_number,
        name: user.name,
        createdAt: user.createdAt
      });
    } else {
      console.log('✅ Existing user found:', {
        id: user.id,
        phone: user.phone_number,
        name: user.name,
        lastLogin: user.last_login
      });
    }
    
    // Mark all previous unverified OTPs as expired
    await OTP.update(
      { is_verified: true, verified_at: new Date() },
      { where: { phone_number: cleanPhone, is_verified: false } }
    );
    
    // Create new OTP record in database
    const otpRecord = await OTP.create({
      phone_number: cleanPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      user_id: user.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      request_id: requestId,
      is_verified: false,
      attempts: 0
    });
    
    console.log('✅ OTP stored in database:', {
      id: otpRecord.id,
      otp: otpCode,
      phone: cleanPhone,
      expiresAt: expiresAt,
      userId: user.id,
      requestId: requestId
    });
    
    // Send SMS (optional, won't block if fails)
    try {
      await sendOTP(cleanPhone, otpCode);
      console.log('✅ SMS sent successfully');
    } catch (smsError) {
      console.log('⚠️ SMS sending failed, but OTP is stored:', smsError.message);
    }
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      requestId: requestId,
      otpId: otpRecord.id,
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
      expiresIn: '10 minutes'
    });
    
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Verify OTP and update database
const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    
    console.log('=========================================');
    console.log('🔐 VERIFY OTP REQUEST');
    console.log('Phone:', phone);
    console.log('OTP:', otp);
    console.log('Name:', name);
    console.log('=========================================');
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Find valid OTP in database
    const otpRecord = await OTP.findOne({
      where: {
        phone_number: cleanPhone,
        otp_code: otp,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
    
    console.log('Database OTP record:', otpRecord ? 'FOUND' : 'NOT FOUND');
    
    if (!otpRecord) {
      // Check if OTP exists but expired
      const expiredOTP = await OTP.findOne({
        where: {
          phone_number: cleanPhone,
          otp_code: otp,
          is_verified: false,
          expires_at: { [Op.lt]: new Date() }
        }
      });
      
      if (expiredOTP) {
        console.log('❌ OTP expired');
        return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
      }
      
      console.log('❌ Invalid OTP');
      return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // Check attempts
    if (otpRecord.attempts >= 3) {
      otpRecord.is_verified = true;
      otpRecord.verified_at = new Date();
      await otpRecord.save();
      return res.status(401).json({ error: 'Too many failed attempts. Please request a new OTP.' });
    }
    
    // Mark OTP as verified
    otpRecord.is_verified = true;
    otpRecord.verified_at = new Date();
    await otpRecord.save();
    
    console.log('✅ OTP marked as verified in database:', {
      id: otpRecord.id,
      verifiedAt: otpRecord.verified_at
    });
    
    // Find and update user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (user) {
      if (name) user.name = name;
      user.last_login = new Date();
      user.login_count = (user.login_count || 0) + 1;
      await user.save();
      
      console.log('✅ User updated in database:', {
        id: user.id,
        phone: user.phone_number,
        name: user.name,
        lastLogin: user.last_login,
        loginCount: user.login_count
      });
    }
    
    // Generate JWT token
    const token = generateToken(user.id, user.phone_number);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phone_number,
        email: user.email,
        loginCount: user.login_count,
        lastLogin: user.last_login
      }
    });
    
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// Get user details with OTP history
const getUserDetails = async (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = phone.replace(/\D/g, '');
    
    const user = await User.findOne({ 
      where: { phone_number: cleanPhone },
      include: [{
        model: OTP,
        as: 'otps',
        limit: 10,
        order: [['created_at', 'DESC']]
      }]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone_number,
        name: user.name,
        email: user.email,
        isActive: user.is_active,
        lastLogin: user.last_login,
        loginCount: user.login_count,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      recentOtps: user.otps.map(otp => ({
        id: otp.id,
        isVerified: otp.is_verified,
        verifiedAt: otp.verified_at,
        expiresAt: otp.expires_at,
        createdAt: otp.created_at,
        attempts: otp.attempts
      }))
    });
    
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
};

module.exports = { sendOtp, verifyOtp, getUserDetails };