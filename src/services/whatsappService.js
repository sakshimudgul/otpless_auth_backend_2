const axios = require('axios');
require('dotenv').config();

// Send WhatsApp message via Pinbot API
const sendWhatsAppOTP = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  console.log(`=========================================`);
  console.log(`💚 Attempting to send WhatsApp OTP to ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log(`=========================================`);
  
  // Check if WhatsApp API is configured
  if (!process.env.PINBOT_API_KEY) {
    console.log('⚠️ PINBOT_API_KEY not configured. OTP will only be logged.');
    return { success: false, error: 'WhatsApp not configured' };
  }
  
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const pinbotApiUrl = process.env.PINBOT_API_URL || 'https://partnersv1.pinbot.ai/v3';
  
  try {
    const url = `${pinbotApiUrl}/${pinbotPhoneNumberId}/messages`;
    
    // Use text message (more reliable than template)
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: {
        body: `🔐 Your OTP code is: ${otp}\n\nThis code is valid for 10 minutes.\n\nDo not share this code with anyone.\n\n- OTPless Auth`
      }
    };
    
    console.log(`📤 Sending WhatsApp via Pinbot...`);
    console.log(`📨 URL: ${url}`);
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': pinbotApiKey
      },
      timeout: 30000
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp message sent successfully!`);
      console.log(`📨 Response:`, response.data);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    }
    
    console.log(`⚠️ WhatsApp API returned status ${response.status}`);
    return { success: false, error: `Status ${response.status}` };
    
  } catch (error) {
    console.error(`❌ WhatsApp API error:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
};

module.exports = { sendWhatsAppOTP };