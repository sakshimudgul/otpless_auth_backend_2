const { sendSMSOTP, verifySMSOTP } = require('../services/smsService');
const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const generateToken = (userId, phoneNumber) => {
  return jwt.sign({ userId, phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
};

const sendSmsOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    
    const cleanPhone = phone.replace(/\D/g, '');
    const result = await sendSMSOTP(cleanPhone, name || 'User');
    
    // FIX: Use Sequelize's findOne instead of findByPhone
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ 
        phone_number: cleanPhone, 
        name: name || null,
        role: 'user'
      });
    }
    
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: result.otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      user_id: user.id,
      delivery_method: 'sms'
    });
    
    res.json({ success: true, message: 'SMS OTP sent', demoOtp: result.otp });
  } catch (error) {
    console.error('Send SMS OTP error:', error);
    res.status(500).json({ error: 'Failed to send SMS OTP' });
  }
};

const verifySmsOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
    
    const cleanPhone = phone.replace(/\D/g, '');
    const verification = verifySMSOTP(cleanPhone, otp);
    if (!verification.success) return res.status(401).json({ error: verification.message });
    
    // FIX: Use Sequelize's findOne instead of findByPhone
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ 
        phone_number: cleanPhone, 
        name: name || 'User',
        role: 'user'
      });
    } else if (name) {
      await user.update({ name });
    }
    
    await user.update({ last_login: new Date() });
    
    const token = generateToken(user.id, user.phone_number);
    res.json({ 
      success: true, 
      message: 'SMS OTP verified', 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        phoneNumber: user.phone_number 
      } 
    });
  } catch (error) {
    console.error('Verify SMS OTP error:', error);
    res.status(500).json({ error: 'Failed to verify SMS OTP' });
  }
};

module.exports = { sendSmsOtp, verifySmsOtp };