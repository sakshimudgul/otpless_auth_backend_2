const axios = require('axios');
require('dotenv').config();

const smsOtpStore = new Map();

const generateSMSOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMS = async (phoneNumber, message) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  console.log(`📤 [SMS] Sending to: ${cleanPhone}`);
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
    
    console.log(`📨 [SMS] Response: ${result}`);
    
    if (result && !result.includes('Error')) {
      console.log(`✅ SMS sent successfully to ${cleanPhone}!`);
      return { success: true, messageId: result };
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ SMS error:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendSMSOTP = async (phoneNumber, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const otp = generateSMSOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  smsOtpStore.set(cleanPhone, {
    otp: otp,
    expiresAt: expiresAt,
    attempts: 0,
    name: name
  });
  
  const message = `Dear ${name}, Your OTP is: ${otp}. Valid for 10 minutes. - Rich Solutions`;
  
  console.log(`=========================================`);
  console.log(`📱 [SMS OTP] ${otp} for ${cleanPhone}`);
  console.log(`=========================================`);
  
  const result = await sendSMS(cleanPhone, message);
  
  return {
    success: result.success,
    otp: otp,
    messageId: result.messageId
  };
};

const verifySMSOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const record = smsOtpStore.get(cleanPhone);
  
  if (!record) return { success: false, message: 'No OTP found' };
  if (Date.now() > record.expiresAt) return { success: false, message: 'OTP expired' };
  if (record.attempts >= 3) return { success: false, message: 'Too many attempts' };
  if (record.otp !== userOtp) {
    record.attempts++;
    smsOtpStore.set(cleanPhone, record);
    return { success: false, message: `Invalid OTP. ${3 - record.attempts} left` };
  }
  
  smsOtpStore.delete(cleanPhone);
  return { success: true, message: 'OTP verified', name: record.name };
};

module.exports = { generateSMSOTP, sendSMSOTP, verifySMSOTP };