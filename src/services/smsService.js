const axios = require('axios');
require('dotenv').config();

const otpStore = new Map();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMS = async (phoneNumber, message) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  console.log(`📤 Sending SMS to: ${cleanPhone}`);
  console.log(`💬 Message: ${message}`);
  
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
    return { success: true };
  } catch (error) {
    console.error(`❌ SMS error:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendOTP = async (phoneNumber, otp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  otpStore.set(cleanPhone, {
    otp: otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  });
  
  const message = `Dear User Your OTP is : ${otp}. Rich Solutions`;
  
  console.log(`=========================================`);
  console.log(`📱 OTP: ${otp} for ${cleanPhone}`);
  console.log(`=========================================`);
  
  const smsResult = await sendSMS(cleanPhone, message);
  return { success: true, smsSent: smsResult.success };
};

const verifyOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const record = otpStore.get(cleanPhone);
  
  if (!record) {
    return { success: false, message: 'No OTP found' };
  }
  
  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    return { success: false, message: 'OTP expired' };
  }
  
  if (record.attempts >= 3) {
    otpStore.delete(cleanPhone);
    return { success: false, message: 'Too many attempts' };
  }
  
  if (record.otp !== userOtp) {
    record.attempts++;
    otpStore.set(cleanPhone, record);
    return { success: false, message: `Invalid OTP. ${3 - record.attempts} left` };
  }
  
  otpStore.delete(cleanPhone);
  return { success: true, message: 'OTP verified' };
};

module.exports = { generateOTP, sendOTP, verifyOTP };