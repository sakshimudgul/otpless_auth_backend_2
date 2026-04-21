const { sendWhatsAppOTP, verifyWhatsAppOTP } = require('../services/whatsappService');
const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const generateToken = (userId, phoneNumber) => {
  return jwt.sign({ userId, phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
};

const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    
    const cleanPhone = phone.replace(/\D/g, '');
    const result = await sendWhatsAppOTP(cleanPhone, name || 'User');
    
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) user = await User.create({ phone_number: cleanPhone, name: name || null });
    
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: result.otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      user_id: user.id,
      delivery_method: 'whatsapp'
    });
    
    res.json({ success: result.success, message: 'WhatsApp OTP sent', demoOtp: result.otp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send WhatsApp OTP' });
  }
};

const verifyWhatsAppOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
    
    const cleanPhone = phone.replace(/\D/g, '');
    const verification = verifyWhatsAppOTP(cleanPhone, otp);
    if (!verification.success) return res.status(401).json({ error: verification.message });
    
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) user = await User.create({ phone_number: cleanPhone, name: name || 'User' });
    else if (name) user.name = name, await user.save();
    
    await OTP.update({ is_verified: true, verified_at: new Date() },
      { where: { phone_number: cleanPhone, otp_code: otp, is_verified: false } });
    
    const token = generateToken(user.id, user.phone_number);
    res.json({ success: true, message: 'WhatsApp OTP verified', token, user: { id: user.id, name: user.name, phoneNumber: user.phone_number } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify WhatsApp OTP' });
  }
};

module.exports = { sendWhatsAppOtp, verifyWhatsAppOtp };