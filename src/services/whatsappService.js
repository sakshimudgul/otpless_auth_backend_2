const axios = require('axios');
require('dotenv').config();

const generateWhatsAppOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const formatWhatsAppMessage = (otp, name = 'User') => {
  return `🔐 *OTP Verification*\n\nDear *${name}*,\n\nYour OTP for verification is:\n*${otp}*\n\n⏰ Valid for 10 minutes\n\n- Rich Solutions`;
};

// Send WhatsApp message using Meta Cloud API
const sendWhatsAppMessage = async (phoneNumber, message) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  console.log(`📱 Sending WhatsApp to: ${cleanPhone}`);
  
  // Check if access token is valid (Meta tokens are long strings, not UUIDs)
  if (!accessToken || accessToken.length < 50) {
    console.log(`❌ Invalid WhatsApp access token. Please get a valid Meta token.`);
    console.log(`💡 Get token from: https://developers.facebook.com/apps/`);
    return { success: false, error: 'Invalid WhatsApp token' };
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log(`✅ WhatsApp sent successfully!`);
    console.log(`📨 Message ID:`, response.data?.messages?.[0]?.id);
    return { success: true, messageId: response.data?.messages?.[0]?.id };
  } catch (error) {
    console.error(`❌ WhatsApp error:`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error:`, error.response.data?.error?.message || error.response.data);
      
      if (error.response.status === 401) {
        console.error(`   💡 Your access token is invalid or expired.`);
        console.error(`   💡 Get a new token from Meta Business Suite.`);
      } else if (error.response.status === 403) {
        console.error(`   💡 Your WhatsApp Business account is not active.`);
      } else if (error.response.status === 404) {
        console.error(`   💡 Phone number ID is incorrect.`);
      }
    } else {
      console.error(`   ${error.message}`);
    }
    return { success: false, error: error.message };
  }
};

// Send OTP via WhatsApp
const sendWhatsAppOTP = async (phoneNumber, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const otp = generateWhatsAppOTP();
  
  const message = formatWhatsAppMessage(otp, name);
  
  console.log(`=========================================`);
  console.log(`📱 WhatsApp OTP: ${otp} for ${cleanPhone}`);
  console.log(`=========================================`);
  
  const result = await sendWhatsAppMessage(cleanPhone, message);
  
  return {
    success: result.success,
    otp: otp,
    messageId: result.messageId,
    error: result.error
  };
};

module.exports = { generateWhatsAppOTP, sendWhatsAppOTP, formatWhatsAppMessage };