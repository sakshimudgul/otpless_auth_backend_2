const axios = require('axios');
require('dotenv').config();

/**
 * Send WhatsApp OTP using auth_template_001 template
 * @param {string} phoneNumber - Phone number (with or without country code)
 * @param {string} otpCode - OTP code to send
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendWhatsAppOTP = async (phoneNumber, otpCode) => {
  try {
    // Get credentials from environment variables
    const apiKey = process.env.PINBOT_API_KEY;
    const phoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
    
    // Validate credentials
    if (!apiKey) {
      console.error('❌ PINBOT_API_KEY not found in environment variables');
      return { success: false, error: 'WhatsApp API key missing' };
    }
    
    if (!phoneNumberId) {
      console.error('❌ PINBOT_PHONE_NUMBER_ID not found in environment variables');
      return { success: false, error: 'WhatsApp phone number ID missing' };
    }
    
    // Format phone number (add 91 country code for India if needed)
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    const toNumber = parseInt(cleanNumber);
    
    // Build API URL
    const apiUrl = `https://partnersv1.pinbot.ai/v3/${phoneNumberId}/messages`;
    
    // YOUR TEMPLATE: auth_template_001
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toNumber,
      type: "template",
      template: {
        name: "auth_template_001",
        language: {
          code: "en"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otpCode
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
    
    // Log request details
    console.log(`=========================================`);
    console.log(`💚 SENDING WHATSAPP OTP`);
    console.log(`📱 To: ${cleanNumber}`);
    console.log(`🔑 OTP: ${otpCode}`);
    console.log(`📝 Template: auth_template_001`);
    console.log(`📡 API URL: ${apiUrl}`);
    console.log(`📨 Request Body:`, JSON.stringify(requestBody, null, 2));
    console.log(`=========================================`);
    
    // Make API call
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      timeout: 30000
    });
    
    // Handle successful response
    if (response.status === 200 || response.status === 201) {
      const messageId = response.data?.messages?.[0]?.id;
      console.log(`✅ WhatsApp OTP sent successfully! Message ID: ${messageId}`);
      return { success: true, messageId };
    } else {
      console.log(`⚠️ Unexpected response status: ${response.status}`);
      return { success: false, error: `Unexpected status: ${response.status}` };
    }
    
  } catch (error) {
    console.error(`❌ WhatsApp API Error:`, error.message);
    
    // Handle API error response
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
      
      // Provide helpful error messages
      if (error.response.status === 400) {
        const errorMsg = error.response.data?.error?.message || '';
        if (errorMsg.includes('template')) {
          return { 
            success: false, 
            error: 'Template "auth_template_001" not found or not approved. Please create and approve this template in your Pinbot dashboard.' 
          };
        } else if (errorMsg.includes('parameter')) {
          return { 
            success: false, 
            error: 'Invalid parameter. Check phone number format.' 
          };
        }
      } else if (error.response.status === 401) {
        return { 
          success: false, 
          error: 'Invalid API key. Please check your PINBOT_API_KEY.' 
        };
      } else if (error.response.status === 404) {
        return { 
          success: false, 
          error: 'Phone number ID not found. Please check your PINBOT_PHONE_NUMBER_ID.' 
        };
      } else if (error.response.status === 429) {
        return { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.' 
        };
      }
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp OTP as text message (fallback when template fails)
 * @param {string} phoneNumber - Phone number
 * @param {string} otpCode - OTP code
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendWhatsAppTextMessage = async (phoneNumber, otpCode) => {
  try {
    const apiKey = process.env.PINBOT_API_KEY;
    const phoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
    
    if (!apiKey || !phoneNumberId) {
      return { success: false, error: 'WhatsApp credentials missing' };
    }
    
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    const toNumber = parseInt(cleanNumber);
    const apiUrl = `https://partnersv1.pinbot.ai/v3/${phoneNumberId}/messages`;
    
    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toNumber,
      type: "text",
      text: {
        body: `Your OTP verification code is: ${otpCode}. Valid for 10 minutes.\n\nDo not share this code with anyone. - OTPless Auth`
      }
    };
    
    console.log(`💚 Sending WhatsApp text message (fallback) to ${cleanNumber}`);
    
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      timeout: 30000
    });
    
    if (response.status === 200 || response.status === 201) {
      const messageId = response.data?.messages?.[0]?.id;
      console.log(`✅ WhatsApp text message sent! Message ID: ${messageId}`);
      return { success: true, messageId };
    }
    
    return { success: false, error: 'WhatsApp text message failed' };
    
  } catch (error) {
    console.error(`❌ WhatsApp text message error:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp OTP with automatic fallback (template first, then text)
 * @param {string} phoneNumber - Phone number
 * @param {string} otpCode - OTP code
 * @returns {Promise<{success: boolean, messageId?: string, method?: string, error?: string}>}
 */
const sendWhatsAppOTPWithFallback = async (phoneNumber, otpCode) => {
  console.log(`\n💚 Starting WhatsApp OTP send process...`);
  
  // First try with template
  const templateResult = await sendWhatsAppOTP(phoneNumber, otpCode);
  
  if (templateResult.success) {
    return { ...templateResult, method: 'template' };
  }
  
  // If template fails, try text message fallback
  console.log(`⚠️ Template failed: ${templateResult.error}`);
  console.log(`🔄 Trying text message fallback...`);
  
  const textResult = await sendWhatsAppTextMessage(phoneNumber, otpCode);
  
  if (textResult.success) {
    return { ...textResult, method: 'text' };
  }
  
  return { success: false, error: 'Both template and text message failed', method: 'none' };
};

module.exports = {
  sendWhatsAppOTP,
  sendWhatsAppTextMessage,
  sendWhatsAppOTPWithFallback
};