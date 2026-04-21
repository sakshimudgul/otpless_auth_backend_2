const axios = require('axios');
require('dotenv').config();
const { User, OTP } = require('../models');
const { Op } = require('sequelize');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS via SMSJust.com API
const sendSMS = async (phoneNumber, message) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  console.log(`📤 Sending SMS to: ${cleanPhone}`);
  console.log(`💬 Message: ${message}`);
  
  // Check if SMS credentials are configured
  if (!process.env.SMS_USERNAME || !process.env.SMS_PASSWORD) {
    console.log('⚠️ SMS credentials not configured. Running in demo mode.');
    return { success: true, demo: true, message: 'Demo mode - SMS not actually sent' };
  }
  
  try {
    const params = new URLSearchParams({
      username: process.env.SMS_USERNAME,
      pass: process.env.SMS_PASSWORD,
      senderid: process.env.SMS_SENDER_ID || 'RICHSL',
      dest_mobileno: cleanPhone,
      msgtype: 'TXT',
      message: message,
      response: 'Y'
    });
    
    const url = `${process.env.SMS_API_URL}?${params.toString()}`;
    console.log(`📨 API URL: ${url.substring(0, 100)}...`);
    
    const response = await axios.get(url, { timeout: 15000 });
    const result = response.data;
    
    console.log(`📨 SMS Response: ${result}`);
    
    if (result && result.includes('Error')) {
      console.log(`❌ SMS API returned error: ${result}`);
      return { success: false, error: result };
    }
    
    if (result && result.match(/\d+-\d{4}_\d{2}_\d{2}/)) {
      console.log(`✅ SMS sent successfully! Message ID: ${result}`);
      return { success: true, messageId: result };
    }
    
    console.log(`✅ SMS request accepted`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ SMS error:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send OTP Controller - STORES IN DATABASE
const sendOtpController = async (req, res) => {
  try {
    const { phoneNumber, name = 'User' } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    console.log('=========================================');
    console.log('📱 SEND OTP REQUEST');
    console.log('Phone:', phoneNumber);
    console.log('Name:', name);
    console.log('IP:', ipAddress);
    console.log('=========================================');
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`🔑 Generated OTP: ${otpCode} for ${cleanPhone}`);
    console.log(`⏰ Expires at: ${expiresAt}`);
    
    // Find or create user in database
    let user = null;
    try {
      user = await User.findOne({ where: { phone_number: cleanPhone } });
      if (!user) {
        user = await User.create({ 
          phone_number: cleanPhone,
          name: name
        });
        console.log('✅ New user created in database:', user.id);
      } else {
        console.log('✅ Existing user found:', user.id);
      }
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
      // Continue without database - just log OTP
    }
    
    // Try to save OTP to database (optional)
    let otpRecord = null;
    try {
      // Invalidate previous OTPs
      await OTP.update(
        { is_verified: true },
        { where: { phone_number: cleanPhone, is_verified: false } }
      );
      
      // Store OTP in database
      otpRecord = await OTP.create({
        phone_number: cleanPhone,
        otp_code: otpCode,
        expires_at: expiresAt,
        user_id: user?.id || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        is_verified: false,
        attempts: 0
      });
      console.log('✅ OTP stored in database, ID:', otpRecord.id);
    } catch (dbError) {
      console.error('⚠️ Could not save OTP to database:', dbError.message);
      // Continue even if database fails
    }
    
    // Format message with template
    const message = `Dear ${name}, Your OTP is: ${otpCode}. Valid for 10 minutes. - Rich Solutions`;
    
    // Send SMS
    const smsResult = await sendSMS(cleanPhone, message);
    
    // Always return success with OTP for development
    res.json({
      success: true,
      message: smsResult.success ? 'OTP sent successfully' : 'OTP generated (SMS may be delayed)',
      otpId: otpRecord?.id || null,
      expiresAt: expiresAt,
      phoneNumber: cleanPhone,
      expiresIn: '10 minutes',
      otp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
      smsSent: smsResult.success,
      demoMode: !process.env.SMS_USERNAME
    });
    
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send OTP: ' + error.message
    });
  }
};

// Verify OTP Controller - CHECKS DATABASE
const verifyOtpController = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    
    console.log('=========================================');
    console.log('🔐 VERIFY OTP REQUEST');
    console.log('Phone:', phoneNumber);
    console.log('OTP:', otp);
    console.log('=========================================');
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and OTP are required' 
      });
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Try to find in database first
    let otpRecord = null;
    try {
      otpRecord = await OTP.findOne({
        where: {
          phone_number: cleanPhone,
          otp_code: otp,
          is_verified: false,
          expires_at: { [Op.gt]: new Date() }
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError.message);
    }
    
    if (!otpRecord) {
      // Check if OTP exists but expired
      let expiredOTP = null;
      try {
        expiredOTP = await OTP.findOne({
          where: {
            phone_number: cleanPhone,
            otp_code: otp,
            is_verified: false,
            expires_at: { [Op.lt]: new Date() }
          }
        });
      } catch (dbError) {}
      
      if (expiredOTP) {
        console.log('❌ OTP expired');
        return res.status(401).json({ 
          success: false, 
          error: 'OTP has expired. Please request a new one.' 
        });
      }
      
      console.log('❌ Invalid OTP');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid OTP. Please try again.' 
      });
    }
    
    // Check attempts
    if (otpRecord.attempts >= 3) {
      otpRecord.is_verified = true;
      await otpRecord.save();
      return res.status(401).json({ 
        success: false, 
        error: 'Too many failed attempts. Please request a new OTP.' 
      });
    }
    
    // Mark OTP as verified
    otpRecord.is_verified = true;
    await otpRecord.save();
    
    console.log('✅ OTP verified successfully');
    
    // Update user last login
    try {
      let user = await User.findOne({ where: { phone_number: cleanPhone } });
      if (user) {
        user.last_login = new Date();
        await user.save();
        console.log('✅ User last_login updated');
      }
    } catch (dbError) {
      console.error('Could not update user:', dbError.message);
    }
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      phoneNumber: cleanPhone
    });
    
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify OTP: ' + error.message
    });
  }
};

// Resend OTP Controller
const resendOtpController = async (req, res) => {
  try {
    const { phoneNumber, name = 'User' } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    // Just call send again
    req.body.name = name;
    return sendOtpController(req, res);
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to resend OTP' 
    });
  }
};

// Get OTP Status Controller
const getOtpStatusController = async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    const activeOtp = await OTP.findOne({
      where: {
        phone_number: cleanPhone,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      },
      order: [['created_at', 'DESC']]
    });
    
    if (!activeOtp) {
      return res.json({
        success: true,
        hasOtp: false,
        message: 'No active OTP found'
      });
    }
    
    const timeLeft = Math.max(0, Math.floor((activeOtp.expires_at - Date.now()) / 1000));
    
    res.json({
      success: true,
      hasOtp: true,
      otpId: activeOtp.id,
      phoneNumber: cleanPhone,
      expiresIn: `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`,
      attemptsRemaining: 3 - activeOtp.attempts
    });
    
  } catch (error) {
    console.error('Get OTP status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get OTP status' 
    });
  }
};

// Test SMS API Connection
const testSmsConnectionController = async (req, res) => {
  try {
    console.log('🧪 Testing SMS API configuration...');
    
    const configStatus = {
      username: process.env.SMS_USERNAME ? '✅ Set' : '❌ Missing',
      password: process.env.SMS_PASSWORD ? '✅ Set' : '❌ Missing',
      senderId: process.env.SMS_SENDER_ID ? '✅ Set' : '❌ Missing',
      apiUrl: process.env.SMS_API_URL ? '✅ Set' : '❌ Missing'
    };
    
    console.log('SMS Config:', configStatus);
    
    res.json({
      success: true,
      message: 'SMS API configuration check',
      config: configStatus,
      note: 'To actually send SMS, ensure all credentials are set in .env file'
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  sendOtpController,
  verifyOtpController,
  resendOtpController,
  getOtpStatusController,
  testSmsConnectionController,
  generateOTP,
  sendSMS
};