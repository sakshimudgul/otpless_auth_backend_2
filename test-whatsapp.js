const axios = require('axios');
require('dotenv').config();

async function testWhatsApp() {
  console.log('=========================================');
  console.log('🔧 TESTING WHATSAPP SERVICE');
  console.log('=========================================\n');
  
  const phone = '919595902003';
  const otp = '123456';
  const apiKey = process.env.PINBOT_API_KEY || '039b3d8d-29c5-11f1-894a-02c8a5e042bd';
  const phoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID || '247403775131941';
  
  const cleanNumber = phone.replace(/\D/g, '');
  const formattedNumber = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
  const toNumber = parseInt(formattedNumber);
  const apiUrl = `https://partnersv1.pinbot.ai/v3/${phoneNumberId}/messages`;

  // Try with template first
  console.log('📤 Trying TEMPLATE method...');
  const templateBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toNumber,
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
  
  try {
    const response = await axios.post(apiUrl, templateBody, {
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      timeout: 30000
    });
    
    console.log('✅ TEMPLATE SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n📱 Check your WhatsApp now!');
    return;
  } catch (error) {
    console.log('❌ TEMPLATE FAILED:', error.response?.status);
    if (error.response?.data) {
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Try text message as fallback
    console.log('\n📤 Trying TEXT MESSAGE fallback...');
    const textBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toNumber,
      type: "text",
      text: { 
        body: `Your OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.` 
      }
    };
    
    try {
      const textResponse = await axios.post(apiUrl, textBody, {
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
        timeout: 30000
      });
      
      console.log('✅ TEXT MESSAGE SUCCESS!');
      console.log('Status:', textResponse.status);
      console.log('Response:', JSON.stringify(textResponse.data, null, 2));
      console.log('\n📱 Check your WhatsApp now!');
    } catch (textError) {
      console.log('❌ TEXT MESSAGE FAILED:', textError.response?.status);
      if (textError.response?.data) {
        console.log('Error:', JSON.stringify(textError.response.data, null, 2));
      }
    }
  }
}

testWhatsApp();