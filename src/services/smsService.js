const axios = require('axios');
require('dotenv').config();

// In-memory OTP storage (for verification)
const smsOtpStore = new Map();

const generateSMSOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS via SMSJust API
const sendSMS = async (phoneNumber, message) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  try {
    const params = new URLSearchParams({
      username: process.env.SMS_USERNAME,
      pass: process.env.SMS_PASSWORD,
      senderid: process.env.SMS_SENDER_ID,
      dest_mobileno: cleanPhone,
      msgtype: 'TXT',
      message: message,
      response: 'Y'
    });
    
    const url = `${process.env.SMS_API_URL}?${params.toString()}`;
    const response = await axios.get(url, { timeout: 15000 });
    const result = response.data;
    
    console.log(`📨 SMS Response: ${result}`);
    
    if (result && result.match(/\d+-\d{4}_\d{2}_\d{2}/)) {
      return { success: true, messageId: result };
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ SMS error:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send SMS OTP - Called by smsController
const sendSMSOTP = async (phoneNumber, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const otp = generateSMSOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  // Store OTP in memory for verification
  smsOtpStore.set(cleanPhone, {
    otp: otp,
    expiresAt: expiresAt,
    attempts: 0,
    name: name
  });
  
  const message = `Dear ${name} Your OTP is: ${otp}. Rich Solutions`;
  
  console.log(`=========================================`);
  console.log(`📱 SMS OTP: ${otp} for ${cleanPhone}`);
  console.log(`=========================================`);
  
  const result = await sendSMS(cleanPhone, message);
  
  return {
    success: result.success,
    otp: otp,
    messageId: result.messageId
  };
};

// Verify SMS OTP - Called by smsController
const verifySMSOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const record = smsOtpStore.get(cleanPhone);
  
  console.log(`🔐 Verifying SMS OTP for ${cleanPhone}`);
  console.log(`   Expected: ${record?.otp}`);
  console.log(`   Received: ${userOtp}`);
  
  if (!record) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }
  
  if (Date.now() > record.expiresAt) {
    smsOtpStore.delete(cleanPhone);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (record.attempts >= 3) {
    smsOtpStore.delete(cleanPhone);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  if (record.otp !== userOtp) {
    record.attempts++;
    smsOtpStore.set(cleanPhone, record);
    return { success: false, message: `Invalid OTP. ${3 - record.attempts} attempts remaining.` };
  }
  
  smsOtpStore.delete(cleanPhone);
  console.log(`✅ SMS OTP verified successfully!`);
  return { success: true, message: 'OTP verified successfully', name: record.name };
};

module.exports = { generateSMSOTP, sendSMSOTP, verifySMSOTP };