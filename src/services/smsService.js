// src/services/smsService.js
const axios = require('axios');
require('dotenv').config();

// Generate random OTP
const generateSMSOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using SMSJust API with Template
const sendSMS = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // IMPORTANT: Replace the placeholders in the template with actual values
  // Your template "Dear {#var#} Your OTP is : {#var#}." expects two variables.
  // The API parameter "message" should contain the final text.
  const finalMessage = `Dear ${name} Your OTP is : ${otp}. Rich Solutions`;

  console.log(`📤 Sending SMS to ${cleanPhone}`);
  console.log(`📝 Final Message: ${finalMessage}`);

  // Build the URL as per your API key format
  // Using your provided structure: ?username=...&pass=...&senderid=...&dest_mobileno=...&msgtype=TXT&message=...&response=Y
  const url = `${process.env.SMS_API_URL}?username=${process.env.SMS_USERNAME}&pass=${process.env.SMS_PASSWORD}&senderid=${process.env.SMS_SENDER_ID}&dest_mobileno=${cleanPhone}&msgtype=TXT&message=${encodeURIComponent(finalMessage)}&response=Y`;

  try {
    const response = await axios.get(url, { timeout: 30000 });
    const result = response.data;
    console.log(`📨 SMS Response: ${result}`);

    // Check for success indicators (Message ID or DELIVERED status)
    if (result && (result.includes('-') || result.toLowerCase().includes('delivrd'))) {
      console.log(`✅ SMS sent successfully! Message ID: ${result}`);
      return { success: true, messageId: result };
    } else {
      console.log(`⚠️ SMS sending failed. Response: ${result}`);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error(`❌ SMS API Error:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send SMS OTP (Main function called by controller)
const sendSMSOTP = async (phoneNumber, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const otp = generateSMSOTP();
  
  console.log(`=========================================`);
  console.log(`📱 Sending SMS OTP to ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`👤 Name: ${name}`);
  console.log(`=========================================`);
  
  // Call the function that uses your template
  const result = await sendSMS(cleanPhone, otp, name);
  
  // IMPORTANT: Return the OTP along with the result so it can be saved to the database
  return {
    success: result.success,
    otp: otp,
    messageId: result.messageId,
    error: result.error
  };
};

// In-memory store for verification (if you're using it, otherwise rely on DB)
const smsOtpStore = new Map();

const verifySMSOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  // Note: It's better to verify from your database (OTP model) than from memory.
  // This is a fallback.
  const record = smsOtpStore.get(cleanPhone);
  
  if (!record) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }
  
  if (Date.now() > record.expiresAt) {
    smsOtpStore.delete(cleanPhone);
    return { success: false, message: 'OTP has expired.' };
  }
  
  if (record.otp !== userOtp) {
    return { success: false, message: 'Invalid OTP.' };
  }
  
  smsOtpStore.delete(cleanPhone);
  return { success: true, message: 'OTP verified' };
};

module.exports = { generateSMSOTP, sendSMSOTP, verifySMSOTP };