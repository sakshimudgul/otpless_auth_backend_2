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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`\n=========================================`);
    console.log(`📱 SMS OTP Request Received`);
    console.log(`   Phone: ${cleanPhone}`);
    console.log(`   Name: ${name || 'User'}`);
    console.log(`   Template ID: 1507161980488820530`);
    console.log(`=========================================\n`);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ 
        phone_number: cleanPhone, 
        name: name || `User_${cleanPhone.slice(-4)}`,
        role: 'user'
      });
      console.log(`✅ New user created: ${user.id}`);
    } else {
      console.log(`✅ Existing user found: ${user.id}`);
    }
    
    // Send SMS using YOUR template
    const smsResult = await sendSMSOTP(cleanPhone, name || user.name);
    
    if (!smsResult.success) {
      console.log(`⚠️ SMS sending failed: ${smsResult.error}`);
      // Still create OTP record for testing purposes
    }
    
    // Delete old unverified OTPs
    await OTP.destroy({
      where: {
        phone_number: cleanPhone,
        is_verified: false,
        delivery_method: 'sms'
      }
    });
    
    // Save OTP to database
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: smsResult.otp,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'sms',
      is_verified: false
    });
    
    console.log(`✅ OTP saved to database`);
    console.log(`✅ SMS sent using template: "Dear ${name || user.name} Your OTP is : ${smsResult.otp}. Rich Solutions"`);
    if (smsResult.messageId) {
      console.log(`📨 Message ID: ${smsResult.messageId}`);
    }
    
    res.json({ 
      success: true, 
      message: smsResult.success ? 'SMS OTP sent successfully! Please check your phone.' : 'OTP generated (SMS may be delayed)',
      demoOtp: process.env.NODE_ENV === 'development' ? smsResult.otp : undefined
    });
    
  } catch (error) {
    console.error('❌ Send SMS OTP error:', error);
    res.status(500).json({ error: 'Failed to send SMS OTP: ' + error.message });
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
    console.log(`🔐 Verifying SMS OTP for ${cleanPhone}`);
    console.log(`   Provided OTP: ${otp}`);
    
    // Find valid OTP in database
    const otpRecord = await OTP.findOne({
      where: {
        phone_number: cleanPhone,
        otp_code: otp,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
    
    if (!otpRecord) {
      const expiredOTP = await OTP.findOne({
        where: {
          phone_number: cleanPhone,
          otp_code: otp,
          expires_at: { [Op.lte]: new Date() }
        }
      });
      
      if (expiredOTP) {
        return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
      }
      return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // Mark OTP as verified
    await otpRecord.update({ is_verified: true });
    console.log(`✅ OTP verified in database`);
    
    // Get or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ 
        phone_number: cleanPhone, 
        name: name || `User_${cleanPhone.slice(-4)}`,
        role: 'user'
      });
    } else if (name) {
      await user.update({ name });
    }
    
    // Update last login
    await user.update({ last_login: new Date() });
    
    // Generate JWT token
    const token = generateToken(user.id, user.phone_number);
    
    console.log(`✅ SMS OTP verification complete!`);
    
    res.json({ 
      success: true, 
      message: 'SMS OTP verified successfully', 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        phoneNumber: user.phone_number,
        role: user.role
      } 
    });
    
  } catch (error) {
    console.error('❌ Verify SMS OTP error:', error);
    res.status(500).json({ error: 'Failed to verify SMS OTP' });
  }
};

module.exports = { sendSmsOtp, verifySmsOtp };