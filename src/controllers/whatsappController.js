const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Send WhatsApp OTP
const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone,
        role: 'user'
      });
      console.log('✅ New user created:', user.id);
    } else {
      console.log('✅ Existing user found:', user.id);
    }
    
    // Save OTP to database
    const otpRecord = await OTP.create({
      phone_number: cleanPhone,
      otp_code: otp,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'whatsapp'
    });
    
    console.log(`=========================================`);
    console.log(`📱 WhatsApp OTP: ${otp} for ${cleanPhone}`);
    console.log(`📝 OTP ID: ${otpRecord.id}`);
    console.log(`=========================================`);
    
    res.json({
      success: true,
      message: 'WhatsApp OTP sent successfully',
      demoOtp: otp
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
    
    // Mark as verified
    await otpRecord.update({
      is_verified: true,
      verified_at: new Date()
    });
    
    // Get user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone,
        role: 'user'
      });
    } else if (name) {
      await user.update({ name });
    }
    
    // Update last login
    await user.update({ last_login: new Date() });
    
    const token = generateToken(user.id, user.role);
    
    console.log(`✅ WhatsApp OTP verified for ${cleanPhone}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify WhatsApp OTP error:', error);
    res.status(500).json({ error: 'Failed to verify WhatsApp OTP' });
  }
};

module.exports = { sendWhatsAppOtp, verifyWhatsAppOtp };