const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send WhatsApp OTP using YOUR TEMPLATE
const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name = 'User' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`\n=========================================`);
    console.log(`💚 WhatsApp OTP Request`);
    console.log(`   Phone: ${cleanPhone}`);
    console.log(`   OTP: ${otp}`);
    console.log(`=========================================\n`);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone,
        role: 'user'
      });
      console.log('✅ New user created:', user.id);
    }
    
    // Delete old unverified OTPs
    await OTP.destroy({
      where: {
        phone_number: cleanPhone,
        is_verified: false,
        delivery_method: 'whatsapp'
      }
    });
    
    // Save OTP to database
    await OTP.create({
      phone_number: cleanPhone,
      otp_code: otp,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'whatsapp',
      is_verified: false
    });
    
    // Send WhatsApp using YOUR TEMPLATE
    const apiKey = process.env.PINBOT_API_KEY;
    const phoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
    
    let cleanNumber = cleanPhone;
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    
    const apiUrl = `https://partnersv1.pinbot.ai/v3/${phoneNumberId}/messages`;
    
    // YOUR TEMPLATE: auth_template_001
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: parseInt(cleanNumber),
      type: "template",
      template: {
        name: "auth_template_001",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: otp }]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "payload", payload: "" }]
          }
        ]
      }
    };
    
    console.log(`📤 Sending WhatsApp via template to ${cleanNumber}`);
    console.log(`📦 Template: auth_template_001`);
    
    try {
      const response = await axios.post(apiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
        timeout: 30000
      });
      
      if (response.status === 200 || response.status === 201) {
        console.log(`✅ WhatsApp sent successfully!`);
      } else {
        console.log(`⚠️ WhatsApp response: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ WhatsApp error:`, error.message);
      if (error.response?.status === 404) {
        console.log(`⚠️ Template "auth_template_001" not found. Please create it in your dashboard.`);
      }
    }
    
    res.json({
      success: true,
      message: 'WhatsApp OTP sent',
      demoOtp: otp
    });
    
  } catch (error) {
    console.error('❌ Send WhatsApp OTP error:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp OTP: ' + error.message });
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
      user = await User.create({
        name: name || `User_${cleanPhone.slice(-4)}`,
        phone_number: cleanPhone,
        role: 'user'
      });
    } else if (name) {
      await user.update({ name });
    }
    
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