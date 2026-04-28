const axios = require('axios');
require('dotenv').config();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS via SMSJust API
const sendSMS = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const message = `Dear ${name}, Your OTP is: ${otp}. Valid for 10 minutes. - Rich Solutions`;
  
  console.log(`=========================================`);
  console.log(`📤 Sending SMS to: ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`💬 Message: ${message}`);
  console.log(`=========================================`);
  
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
    console.log(`📨 API URL: ${url.substring(0, 150)}...`);
    
    const response = await axios.get(url, { timeout: 15000 });
    const result = response.data;
    
    console.log(`📨 SMS Response: ${result}`);
    
    if (result && !result.includes('Error')) {
      console.log(`✅ SMS sent successfully to ${cleanPhone}!`);
      return true;
    }
    
    console.log(`⚠️ SMS response: ${result}`);
    return true;
  } catch (error) {
    console.error(`❌ SMS error:`, error.message);
    if (error.response) {
      console.error(`Response:`, error.response.data);
    }
    return false;
  }
};

// Send WhatsApp via Pinbot API (Not Meta/Facebook)
const sendWhatsApp = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const message = `🔐 OTP Verification\n\nDear ${name},\n\nYour OTP is: ${otp}\n\nValid for 10 minutes\n\n- Rich Solutions`;
  
  console.log(`=========================================`);
  console.log(`📤 Sending WhatsApp via Pinbot to: ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`💬 Message: ${message}`);
  console.log(`=========================================`);
  
  // Get Pinbot credentials from .env
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const pinbotApiUrl = process.env.PINBOT_API_URL || 'https://partnersv1.pinbot.ai/v3';
  
  if (!pinbotApiKey) {
    console.log(`❌ PINBOT_API_KEY not found in .env file`);
    console.log(`💡 Please add PINBOT_API_KEY to your .env file`);
    return false;
  }
  
  if (!pinbotPhoneNumberId) {
    console.log(`❌ PINBOT_PHONE_NUMBER_ID not found in .env file`);
    console.log(`💡 Please add PINBOT_PHONE_NUMBER_ID to your .env file`);
    return false;
  }
  
  try {
    // Pinbot API endpoint (NOT Facebook/Meta)
    const url = `${pinbotApiUrl}/${pinbotPhoneNumberId}/messages`;
    
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { body: message }
    };
    
    console.log(`📨 Pinbot URL: ${url}`);
    console.log(`📨 Sending to Pinbot...`);
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': pinbotApiKey  // Pinbot uses 'apikey' header, not 'Authorization'
      },
      timeout: 15000
    });
    
    console.log(`📨 Pinbot Response Status: ${response.status}`);
    console.log(`📨 Pinbot Response Data:`, response.data);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp OTP sent successfully via Pinbot to ${cleanPhone}!`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ WhatsApp/Pinbot error:`);
    console.error(`   Message: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    return false;
  }
};

module.exports = { generateOTP, sendSMS, sendWhatsApp };