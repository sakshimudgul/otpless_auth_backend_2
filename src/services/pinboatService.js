const axios = require('axios');
require('dotenv').config();

class PinbotService {
  constructor() {
    this.apiKey = process.env.PINBOT_API_KEY;
    this.phoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
    this.templateName = process.env.PINBOT_TEMPLATE_NAME || 'auth_template_001';
    this.apiUrl = 'https://partnersv1.pinbot.ai/v3';
    this.otpStore = new Map();
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP using Pinbot template
  async sendOTPUsingTemplate(phoneNumber, otp) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    console.log(`📱 [Pinbot] Sending WhatsApp OTP to: ${cleanPhone}`);
    console.log(`🔑 OTP: ${otp}`);
    
    if (!this.apiKey) {
      console.log('❌ Pinbot API key not configured');
      return { success: false, error: 'API key missing' };
    }

    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      const requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "template",
        template: {
          name: this.templateName,
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
            }
          ]
        }
      };
      
      console.log('📨 Sending to Pinbot:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        timeout: 30000
      });
      
      console.log('📨 Pinbot Response:', response.data);
      
      if (response.data && (response.data.messages || response.data.message_id)) {
        console.log(`✅ WhatsApp OTP sent successfully!`);
        return { 
          success: true, 
          messageId: response.data.messages?.[0]?.id || response.data.message_id
        };
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Pinbot API Error:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      }
      return { success: false, error: error.message };
    }
  }

  // Send OTP via WhatsApp
  async sendOTP(phoneNumber, name = 'User') {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const otp = this.generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    
    this.otpStore.set(cleanPhone, {
      otp: otp,
      expiresAt: expiresAt,
      attempts: 0,
      name: name
    });
    
    console.log(`=========================================`);
    console.log(`📱 WhatsApp OTP: ${otp} for ${cleanPhone}`);
    console.log(`⏰ Valid for 10 minutes`);
    console.log(`=========================================`);
    
    const result = await this.sendOTPUsingTemplate(cleanPhone, otp);
    
    return {
      success: result.success,
      otp: otp,
      messageId: result.messageId
    };
  }

  // Verify OTP
  verifyOTP(phoneNumber, userOtp) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const record = this.otpStore.get(cleanPhone);
    
    console.log(`🔐 Verifying WhatsApp OTP for ${cleanPhone}`);
    console.log(`   Expected: ${record?.otp}`);
    console.log(`   Received: ${userOtp}`);
    
    if (!record) {
      return { success: false, message: 'No OTP found. Please request a new one.' };
    }
    
    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(cleanPhone);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }
    
    if (record.attempts >= 3) {
      this.otpStore.delete(cleanPhone);
      return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
    }
    
    if (record.otp !== userOtp) {
      record.attempts++;
      this.otpStore.set(cleanPhone, record);
      return { success: false, message: `Invalid OTP. ${3 - record.attempts} attempts remaining.` };
    }
    
    this.otpStore.delete(cleanPhone);
    console.log(`✅ WhatsApp OTP verified successfully!`);
    return { success: true, message: 'WhatsApp OTP verified successfully', name: record.name };
  }

  // Test connection
  async testConnection() {
    console.log('🧪 Testing Pinbot API Connection...');
    console.log(`Phone Number ID: ${this.phoneNumberId}`);
    console.log(`API Key: ${this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'Not set'}`);
    console.log(`Template Name: ${this.templateName}`);
    
    if (!this.apiKey) {
      console.log('❌ Pinbot API key not configured');
      return { success: false, error: 'API key missing' };
    }
    
    return { success: true, message: 'Pinbot service initialized' };
  }
}

module.exports = PinbotService;