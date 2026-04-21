const axios = require('axios');
require('dotenv').config();

const whatsappOtpStore = new Map();

const generateWhatsAppOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendWhatsApp = async (phoneNumber, otp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const apiKey = process.env.PINBOT_API_KEY;
  const phoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const templateName = process.env.PINBOT_TEMPLATE_NAME || 'auth_template_001';
  
  console.log(`📤 [WhatsApp] Sending to: ${cleanPhone}`);
  console.log(`🔑 OTP: ${otp}`);
  
  if (!apiKey) {
    console.log(`❌ WhatsApp API key not configured`);
    return { success: false, error: 'API key missing' };
  }

  try {
    const url = `https://partnersv1.pinbot.ai/v3/${phoneNumberId}/messages`;
    
    // Exact request body format from your curl
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: parseInt(cleanPhone), // Send as number, not string
      type: "template",
      template: {
        name: templateName,
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "payload",
                payload: ""
              }
            ]
          }
        ]
      }
    };
    
    console.log('📨 [WhatsApp] Request:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      timeout: 30000
    });
    
    console.log('📨 [WhatsApp] Response:', response.data);
    
    if (response.data && (response.data.messages || response.data.message_id)) {
      console.log(`✅ WhatsApp OTP sent successfully to ${cleanPhone}!`);
      return { 
        success: true, 
        messageId: response.data.messages?.[0]?.id || response.data.message_id
      };
    }
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp OTP sent successfully (status ${response.status})!`);
      return { success: true };
    }
    
    return { success: false, error: 'Unknown response' };
    
  } catch (error) {
    console.error('❌ [WhatsApp] Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
};

const sendWhatsAppOTP = async (phoneNumber, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const otp = generateWhatsAppOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  whatsappOtpStore.set(cleanPhone, {
    otp: otp,
    expiresAt: expiresAt,
    attempts: 0,
    name: name
  });
  
  console.log(`=========================================`);
  console.log(`📱 [WhatsApp OTP] ${otp} for ${cleanPhone}`);
  console.log(`=========================================`);
  
  const result = await sendWhatsApp(cleanPhone, otp);
  
  return {
    success: result.success,
    otp: otp,
    messageId: result.messageId,
    error: result.error
  };
};

const verifyWhatsAppOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const record = whatsappOtpStore.get(cleanPhone);
  
  console.log(`🔐 [WhatsApp] Verifying OTP for ${cleanPhone}`);
  console.log(`   Expected: ${record?.otp}`);
  console.log(`   Received: ${userOtp}`);
  
  if (!record) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }
  
  if (Date.now() > record.expiresAt) {
    whatsappOtpStore.delete(cleanPhone);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (record.attempts >= 3) {
    whatsappOtpStore.delete(cleanPhone);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  if (record.otp !== userOtp) {
    record.attempts++;
    whatsappOtpStore.set(cleanPhone, record);
    return { success: false, message: `Invalid OTP. ${3 - record.attempts} attempts remaining.` };
  }
  
  whatsappOtpStore.delete(cleanPhone);
  console.log(`✅ [WhatsApp] OTP verified successfully!`);
  return { success: true, message: 'WhatsApp OTP verified successfully', name: record.name };
};

// Test function to verify API connection
const testWhatsAppConnection = async () => {
  console.log('🧪 [WhatsApp] Testing API connection...');
  const testPhone = '918412005368';
  const testOtp = '000000';
  const result = await sendWhatsApp(testPhone, testOtp);
  return result;
};

module.exports = { 
  generateWhatsAppOTP, 
  sendWhatsAppOTP, 
  verifyWhatsAppOTP,
  testWhatsAppConnection
};