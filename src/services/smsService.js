const axios = require('axios');
require('dotenv').config();

// Generate random 6-digit OTP
const generateSMSOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS using SMSJust API with your template
const sendSMS = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // YOUR TEMPLATE: "Dear {#var#} Your OTP is : {#var#}. Rich Solutions"
  // First {#var#} = name, Second {#var#} = OTP
  const finalMessage = `Dear ${name} Your OTP is : ${otp}. Rich Solutions`;

  // Build the API URL with your credentials and template ID
  const url = `https://www.smsjust.com/sms/user/urlsms.php?username=${process.env.SMS_USERNAME}&pass=${process.env.SMS_PASSWORD}&senderid=${process.env.SMS_SENDER_ID}&dest_mobileno=${cleanPhone}&msgtype=TXT&message=${encodeURIComponent(finalMessage)}&response=Y&templateid=1507161980488820530`;

  console.log(`=========================================`);
  console.log(`📤 Sending SMS via SMSJust`);
  console.log(`📱 To: ${cleanPhone}`);
  console.log(`📝 Template ID: 1507161980488820530`);
  console.log(`📝 Template: Dear {#var#} Your OTP is : {#var#}. Rich Solutions`);
  console.log(`👤 Name: ${name}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`📨 Final Message: ${finalMessage}`);
  console.log(`=========================================`);

  try {
    const response = await axios.get(url, { timeout: 30000 });
    const result = response.data;
    console.log(`📨 SMS Response: ${result}`);

    // Success response contains a Message ID (e.g., "5647471647-2026_05_08")
    if (result && (result.includes('-') || result.toLowerCase().includes('delivrd'))) {
      console.log(`✅ SMS sent successfully! Message ID: ${result}`);
      return { success: true, messageId: result, otp: otp };
    } else if (result && result.toLowerCase().includes('balance')) {
      console.log(`⚠️ Insufficient balance!`);
      return { success: false, error: 'Insufficient balance', otp: otp };
    } else if (result && result.toLowerCase().includes('senderid')) {
      console.log(`⚠️ Sender ID not approved!`);
      return { success: false, error: 'Sender ID not approved', otp: otp };
    } else {
      console.log(`⚠️ SMS sending failed. Response: ${result}`);
      return { success: false, error: result, otp: otp };
    }
  } catch (error) {
    console.error(`❌ SMS API Error:`, error.message);
    return { success: false, error: error.message, otp: otp };
  }
};

// Send SMS OTP (Main function called by controller)
const sendSMSOTP = async (phoneNumber, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const otp = generateSMSOTP();
  
  console.log(`\n🎯 Sending OTP using your template:`);
  console.log(`   Template ID: 1507161980488820530`);
  console.log(`   Template: "Dear {#var#} Your OTP is : {#var#}. Rich Solutions"`);
  console.log(`   With: name="${name}", otp="${otp}"`);
  
  const result = await sendSMS(cleanPhone, otp, name);
  
  return {
    success: result.success,
    otp: result.otp,
    messageId: result.messageId,
    error: result.error
  };
};

// In-memory store for verification (fallback)
const smsOtpStore = new Map();

const verifySMSOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
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