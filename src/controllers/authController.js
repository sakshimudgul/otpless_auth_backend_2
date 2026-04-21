const { generateSMSOTP, sendSMSOTP, verifySMSOTP } = require('../services/smsService');
const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const generateToken = (userId, phoneNumber) => {
  return jwt.sign(
    { userId, phoneNumber },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const sendSmsOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otpCode = generateSMSOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ phone_number: cleanPhone, name: name || null });
    }
    
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: otpCode,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'sms'
    });
    
    await sendSMSOTP(cleanPhone, otpCode, name || 'User');
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      demoOtp: otpCode
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

const verifySmsOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }
    
    const verification = verifySMSOTP(phone, otp);
    
    if (!verification.success) {
      return res.status(401).json({ error: verification.message });
    }
    
    // Find or create user
    const cleanPhone = phone.replace(/\D/g, '');
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ 
        phone_number: cleanPhone, 
        name: name || 'User'
      });
    } else if (name) {
      user.name = name;
      await user.save();
    }
    
    // IMPORTANT: Generate and return token
    const token = generateToken(user.id, user.phone_number);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      token: token,  // <-- THIS IS WHAT YOUR FRONTEND NEEDS
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phone_number
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

module.exports = { sendSmsOtp, verifySmsOtp };