const { sendWhatsAppOTP } = require('../services/whatsappService');
const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const generateToken = (userId, phoneNumber) => {
  return jwt.sign({ userId, phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
};

// Send WhatsApp OTP
const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const result = await sendWhatsAppOTP(cleanPhone, name || 'User');
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'WhatsApp OTP failed: ' + (result.error || 'Unknown error'),
        whatsapp_config: {
          has_token: !!process.env.WHATSAPP_ACCESS_TOKEN,
          token_length: process.env.WHATSAPP_ACCESS_TOKEN?.length || 0,
          phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
        }
      });
    }
    
    // Save to database
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ phone_number: cleanPhone, name: name || null });
    }
    
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: result.otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      user_id: user.id,
      delivery_method: 'whatsapp',
      whatsapp_message_id: result.messageId
    });
    
    res.json({
      success: true,
      message: `WhatsApp OTP sent to ${cleanPhone}`,
      demoOtp: process.env.NODE_ENV === 'development' ? result.otp : undefined
    });
  } catch (error) {
    console.error('Send WhatsApp OTP error:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp OTP' });
  }
};

// Verify WhatsApp OTP
const verifyWhatsAppOtp = async (req, res) => {
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
      user = await User.create({ phone_number: cleanPhone, name: name || 'User' });
    } else if (name) {
      await user.update({ name });
    }
    
    await user.update({ last_login: new Date() });
    
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
    console.error('Verify WhatsApp OTP error:', error);
    res.status(500).json({ error: 'Failed to verify WhatsApp OTP' });
  }
};

// Test WhatsApp connection
const testWhatsAppConnection = async (req, res) => {
  const testPhone = '919595902003';
  const result = await sendWhatsAppOTP(testPhone, 'Test User');
  
  res.json({
    success: result.success,
    message: result.success ? 'WhatsApp is working!' : 'WhatsApp test failed',
    error: result.error,
    config: {
      has_token: !!process.env.WHATSAPP_ACCESS_TOKEN,
      token_length: process.env.WHATSAPP_ACCESS_TOKEN?.length || 0,
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
    }
  });
};

module.exports = { sendWhatsAppOtp, verifyWhatsAppOtp, testWhatsAppConnection };