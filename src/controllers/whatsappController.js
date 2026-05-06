const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send WhatsApp message using Pinbot API
const sendWhatsAppMessage = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  console.log(`📤 Sending WhatsApp to: ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const pinbotApiUrl = process.env.PINBOT_API_URL || 'https://partnersv1.pinbot.ai/v3';
  
  if (!pinbotApiKey) {
    console.log(`❌ PINBOT_API_KEY not found in .env`);
    return false;
  }
  
  try {
    const url = `${pinbotApiUrl}/${pinbotPhoneNumberId}/messages`;
    
    // Using template format as per your curl command
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: parseInt(cleanPhone),
      type: "template",
      template: {
        name: "auth_template_001",
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "payload",
                payload: ""
              }
            ]
          }
        ]
      }
    };
    
    console.log(`📨 Sending to Pinbot API...`);
    console.log(`📨 Request Body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': pinbotApiKey
      },
      timeout: 30000
    });
    
    console.log(`📨 Response Status: ${response.status}`);
    console.log(`📨 Response Data:`, response.data);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp message sent successfully!`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ WhatsApp API Error:`);
    console.error(`   Message: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
};

// Alternative: Send text message (if template doesn't work)
const sendWhatsAppTextMessage = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const pinbotApiUrl = process.env.PINBOT_API_URL || 'https://partnersv1.pinbot.ai/v3';
  
  try {
    const url = `${pinbotApiUrl}/${pinbotPhoneNumberId}/messages`;
    
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: {
        body: `🔐 *Your OTP Code*\n\nHello ${name},\n\nYour One-Time Password (OTP) is: *${otp}*\n\nThis code is valid for 10 minutes.\n\nDo not share this code with anyone.\n\n- OTPless Auth`
      }
    };
    
    console.log(`📨 Sending WhatsApp text message...`);
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': pinbotApiKey
      },
      timeout: 30000
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp text message sent!`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ WhatsApp text message error:`, error.message);
    return false;
  }
};

// Send WhatsApp OTP
const sendWhatsAppOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
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
    
    // Try to send WhatsApp message using template first
    let whatsappSent = await sendWhatsAppMessage(cleanPhone, otp, name || user.name);
    
    // If template fails, try text message
    if (!whatsappSent) {
      console.log(`⚠️ Template failed, trying text message...`);
      whatsappSent = await sendWhatsAppTextMessage(cleanPhone, otp, name || user.name);
    }
    
    console.log(`\n=========================================`);
    console.log(`📱 WhatsApp OTP: ${otp}`);
    console.log(`📨 WhatsApp Sent: ${whatsappSent ? '✅ YES' : '❌ NO'}`);
    console.log(`=========================================\n`);
    
    res.json({
      success: true,
      message: whatsappSent ? 'WhatsApp OTP sent to your mobile!' : 'WhatsApp OTP generated (check console for OTP)',
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