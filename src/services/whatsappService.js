const axios = require('axios');
require('dotenv').config();

const whatsappOtpStore = new Map();

const generateWhatsAppOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send WhatsApp template message
const sendWhatsAppTemplate = async (phoneNumber, otp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const apiKey = process.env.PINBOT_API_KEY;
  const phoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  const apiUrl = process.env.PINBOT_API_URL;
  
  try {
    const url = `${apiUrl}/${phoneNumberId}/messages`;
    
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: parseInt(cleanPhone),
      type: "template",
      template: {
        name: "auth_template_001",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: otp }]
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "payload", payload: "" }]
          }
        ]
      }
    };
    
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      timeout: 30000
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp OTP sent to ${cleanPhone}`);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    }
    
    return { success: false };
  } catch (error) {
    console.error('❌ WhatsApp Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Send OTP via WhatsApp
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
  
  console.log(`📱 WhatsApp OTP: ${otp} for ${cleanPhone}`);
  
  const result = await sendWhatsAppTemplate(cleanPhone, otp);
  
  if (result.success) {
    return { success: true, otp: otp, messageId: result.messageId };
  } else {
    return { success: true, otp: otp, demo: true };
  }
};

// Verify OTP
const verifyWhatsAppOTP = (phoneNumber, userOtp) => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const record = whatsappOtpStore.get(cleanPhone);
  
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
  return { success: true, message: 'WhatsApp OTP verified successfully', name: record.name };
};

module.exports = { generateWhatsAppOTP, sendWhatsAppOTP, verifyWhatsAppOTP };