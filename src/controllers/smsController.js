const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sendSMSOTP } = require('../services/smsService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const generateToken = (userId, phoneNumber) => {
  return jwt.sign({ userId, phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
};

// Send SMS OTP
const sendSmsOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    
    console.log(`\n📱 New SMS OTP Request`);
    console.log(`   Phone: ${cleanPhone}`);
    console.log(`   Name: ${name || 'User'}`);
    
    // Send SMS
    const smsResult = await sendSMSOTP(cleanPhone, name || 'User');
    
    if (!smsResult.success) {
      // Handle specific errors
      if (smsResult.error === 'INSUFFICIENT_BALANCE') {
        return res.status(507).json({ error: 'SMS service temporarily unavailable. Please try again later.' });
      }
      if (smsResult.error === 'SENDER_ID_NOT_APPROVED') {
        return res.status(500).json({ error: 'SMS service configuration error. Contact support.' });
      }
      return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
    
    // Save to database
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        phone_number: cleanPhone,
        name: name || `User_${cleanPhone.slice(-4)}`,
        role: 'user'
      });
    }
    
    // Save OTP record
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: smsResult.otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      user_id: user.id,
      delivery_method: 'sms',
      is_verified: false
    });
    
    console.log(`✅ OTP sent successfully to ${cleanPhone}`);
    
    res.json({
      success: true,
      message: 'OTP sent successfully to your mobile number',
      demoOtp: process.env.NODE_ENV === 'development' ? smsResult.otp : undefined
    });
    
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify SMS OTP
const verifySmsOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Find OTP in database
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
    
    // Mark as verified
    await otpRecord.update({ is_verified: true });
    
    // Get or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        phone_number: cleanPhone,
        name: name || `User_${cleanPhone.slice(-4)}`,
        role: 'user'
      });
    }
    
    // Update last login
    await user.update({ last_login: new Date() });
    
    // Generate token
    const token = generateToken(user.id, user.phone_number);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phone_number,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

module.exports = { sendSmsOtp, verifySmsOtp };