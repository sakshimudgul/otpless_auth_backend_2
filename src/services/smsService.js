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

// Send WhatsApp message
const sendWhatsApp = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const message = `🔐 OTP Verification\n\nDear ${name},\n\nYour OTP is: ${otp}\n\nValid for 10 minutes\n\n- Rich Solutions`;
  
  console.log(`=========================================`);
  console.log(`📤 Sending WhatsApp to: ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`💬 Message: ${message}`);
  console.log(`=========================================`);
  
  try {
    const apiKey = process.env.WHATSAPP_API_KEY;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!apiKey) {
      console.log(`⚠️ WhatsApp API key not configured, using demo mode`);
      return true;
    }
    
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { body: message }
    };
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 15000
    });
    
    console.log(`📨 WhatsApp Response:`, response.data);
    
    if (response.data && response.data.messages) {
      console.log(`✅ WhatsApp sent successfully to ${cleanPhone}!`);
      return true;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ WhatsApp error:`, error.message);
    if (error.response) {
      console.error(`Response:`, error.response.data);
    }
    return false;
  }
};

module.exports = { generateOTP, sendSMS, sendWhatsApp };