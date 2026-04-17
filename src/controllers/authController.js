const { User, OTP } = require('../models');
const { generateOTP, sendOTP, verifyOTP } = require('../services/smsService');
const { generateToken } = require('../config/jwt');
const { Op } = require('sequelize');

const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    
    console.log('📱 Send OTP request for:', phone);
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ phone_number: cleanPhone });
      console.log('✅ User created:', user.id);
    } else {
      console.log('✅ User found:', user.id);
    }
    
    // Mark old OTPs as verified
    await OTP.update(
      { is_verified: true },
      { where: { phone_number: cleanPhone, is_verified: false } }
    );
    
    // Create new OTP
    const otpRecord = await OTP.create({
      phone_number: cleanPhone,
      otp: otpCode,
      expires_at: expiresAt,
      user_id: user.id
    });
    
    console.log('✅ OTP saved to database:', otpRecord.id, 'OTP:', otpCode);
    
    // Send SMS
    await sendOTP(cleanPhone, otpCode);
    
    res.json({
      success: true,
      message: 'OTP sent',
      demoOtp: otpCode
    });
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    
    console.log('🔐 Verify OTP request for:', phone, 'OTP:', otp);
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // First check in-memory OTP
    const verification = verifyOTP(cleanPhone, otp);
    
    if (!verification.success) {
      return res.status(401).json({ error: verification.message });
    }
    
    // Check database OTP record
    const otpRecord = await OTP.findOne({
      where: {
        phone_number: cleanPhone,
        otp: otp,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
    
    console.log('📝 Database OTP record:', otpRecord ? 'Found' : 'Not found');
    
    if (!otpRecord) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    
    // Mark as verified
    otpRecord.is_verified = true;
    await otpRecord.save();
    console.log('✅ OTP marked as verified in database');
    
    // Update user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (user) {
      if (name) user.name = name;
      user.last_login = new Date();
      await user.save();
      console.log('✅ User updated:', user.id);
    }
    
    // Generate token
    const token = generateToken(user.id, user.phone_number);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phone_number
      }
    });
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

module.exports = { sendOtp, verifyOtp };