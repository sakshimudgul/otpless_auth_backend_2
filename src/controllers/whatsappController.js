const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Send WhatsApp message using Pinbot API with your exact format
const sendWhatsAppMessage = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  console.log(`📤 Sending WhatsApp to: ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const pinbotApiUrl = process.env.PINBOT_API_URL || 'https://partnersv1.pinbot.ai/v3';
  
  if (!pinbotApiKey) {
    console.log(`❌ PINBOT_API_KEY not found`);
    return false;
  }
  
  try {
    // Using the exact format from your curl
    const url = `${pinbotApiUrl}/${pinbotPhoneNumberId}/messages`;
    
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: parseInt(cleanPhone), // Send as number, not string
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
    
    console.log(`📨 Sending to Pinbot: ${url}`);
    console.log(`📨 Request Body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': pinbotApiKey
      },
      timeout: 30000
    });
    
    console.log(`📨 Pinbot Response Status: ${response.status}`);
    console.log(`📨 Pinbot Response Data:`, response.data);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp sent successfully via Pinbot!`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ WhatsApp error:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
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
    
    // Send WhatsApp message using template
    const whatsappSent = await sendWhatsAppMessage(cleanPhone, otp, name || user.name || 'User');
    
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
    console.log(`📨 WhatsApp Sent: ${whatsappSent ? '✅ Yes' : '❌ No'}`);
    console.log(`=========================================`);
    
    res.json({
      success: true,
      message: whatsappSent ? 'WhatsApp OTP sent successfully' : 'WhatsApp OTP generated (sending may have failed)',
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