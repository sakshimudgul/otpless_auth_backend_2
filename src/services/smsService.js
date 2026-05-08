const axios = require('axios');
require('dotenv').config();

// Generate 6-digit OTP
const generateSMSOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using SMSJust API - WORKING VERSION
const sendSMS = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Your exact template
  const message = `Dear ${name} Your OTP is : ${otp}. Rich Solutions`;
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // Build URL with proper parameters
  const url = `https://www.smsjust.com/sms/user/urlsms.php?username=richcamp&pass=Intel@2025&senderid=RICHSL&dest_mobileno=${cleanPhone}&msgtype=TXT&message=${encodedMessage}&response=Y`;
  
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║           📱 SENDING SMS OTP                    ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║ To:      ${cleanPhone}`);
  console.log(`║ Name:    ${name}`);
  console.log(`║ OTP:     ${otp}`);
  console.log(`║ Message: ${message}`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const result = response.data;
    console.log(`📨 Response: ${result}`);
    
    // Check for success (Message ID format: numbers-numbers)
    if (result && /^\d+-\d{4}_\d{2}_\d{2}$/.test(result.trim())) {
      console.log(`✅ SMS SENT SUCCESSFULLY!`);
      console.log(`📨 Message ID: ${result}`);
      return { 
        success: true, 
        messageId: result, 
        otp: otp,
        delivered: true 
      };
    }
    
    // Check for error messages
    if (result && result.toLowerCase().includes('balance')) {
      console.log(`❌ ERROR: Insufficient balance`);
      return { success: false, error: 'INSUFFICIENT_BALANCE', otp: otp };
    }
    
    if (result && result.toLowerCase().includes('senderid')) {
      console.log(`❌ ERROR: Sender ID not approved`);
      return { success: false, error: 'SENDER_ID_NOT_APPROVED', otp: otp };
    }
    
    // Unknown response
    console.log(`⚠️ Unknown response: ${result}`);
    return { success: false, error: result, otp: otp };
    
  } catch (error) {
    console.error(`❌ NETWORK ERROR: ${error.message}`);
    return { success: false, error: error.message, otp: otp };
  }
};

// Main function to send OTP
const sendSMSOTP = async (phoneNumber, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Validate phone number
  if (!cleanPhone || cleanPhone.length < 10) {
    console.log(`❌ Invalid phone number: ${cleanPhone}`);
    return { success: false, error: 'INVALID_PHONE', otp: null };
  }
  
  const otp = generateSMSOTP();
  const result = await sendSMS(cleanPhone, otp, name);
  
  // Store OTP for verification (in production, use database)
  if (result.success) {
    smsOtpStore.set(cleanPhone, {
      otp: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });
  }
  
  return result;
};

// In-memory store (use database in production)
const smsOtpStore = new Map();

// Verify OTP
const verifySMSOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const record = smsOtpStore.get(cleanPhone);
  
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
  
  // Success - delete OTP
  smsOtpStore.delete(cleanPhone);
  return { success: true, message: 'OTP verified successfully' };
};

module.exports = { generateSMSOTP, sendSMSOTP, verifySMSOTP };