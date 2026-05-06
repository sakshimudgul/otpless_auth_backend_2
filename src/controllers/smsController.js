const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const generateToken = (userId, phoneNumber) => {
  return jwt.sign({ userId, phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using SMSJust API
const sendSMS = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const message = `Dear ${name} Your OTP is : ${otp}. Rich Solutions`;
  
  console.log(`📤 Sending SMS to ${cleanPhone}`);
  console.log(`📝 OTP: ${otp}`);
  
  try {
    // Using URL parameters as per SMSJust API
    const url = `${process.env.SMS_API_URL}?username=${process.env.SMS_USERNAME}&pass=${process.env.SMS_PASSWORD}&senderid=${process.env.SMS_SENDER_ID}&dest_mobileno=${cleanPhone}&msgtype=TXT&message=${encodeURIComponent(message)}&response=Y`;
    
    console.log(`📨 API URL: ${url.substring(0, 150)}...`);
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const result = response.data;
    console.log(`📨 Response: ${result}`);
    
    // Check if SMS was sent successfully
    if (result && (result.includes('SUCCESS') || result.includes('success') || result.toLowerCase().includes('sent'))) {
      console.log(`✅ SMS sent successfully to ${cleanPhone}!`);
      return { success: true, message: 'SMS sent successfully' };
    } else {
      console.log(`⚠️ SMS response: ${result}`);
      return { success: false, message: 'SMS API returned failure' };
    }
    
  } catch (error) {
    console.error(`❌ SMS Error:`, error.message);
    return { success: false, message: error.message };
  }
};

// Send SMS OTP
const sendSmsOtp = async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`\n=========================================`);
    console.log(`📱 SMS OTP Request`);
    console.log(`   Phone: ${cleanPhone}`);
    console.log(`   OTP: ${otp}`);
    console.log(`=========================================\n`);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({ 
        phone_number: cleanPhone, 
        name: name || `User_${cleanPhone.slice(-4)}`,
        role: 'user'
      });
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
      otp_code: otp,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'sms',
      is_verified: false
    });
    
    // Send SMS
    const smsResult = await sendSMS(cleanPhone, otp, name || user.name);
    
    res.json({ 
      success: true, 
      message: smsResult.success ? 'SMS OTP sent to your mobile!' : 'OTP generated (SMS may not have been delivered)',
      demoOtp: otp
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
        phone_number: cleanPhone, 
        name: name || `User_${cleanPhone.slice(-4)}`,
        role: 'user'
      });
    } else if (name) {
      await user.update({ name });
    }
    
    await user.update({ last_login: new Date() });
    
    const token = generateToken(user.id, user.phone_number);
    
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