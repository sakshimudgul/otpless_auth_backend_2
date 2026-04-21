const { sendWhatsAppOTP, testWhatsAppConnection, sendViaInfobynitin } = require('./src/services/whatsappService');
require('dotenv').config();

async function testWhatsApp() {
  console.log('\n=========================================');
  console.log('🧪 TESTING WHATSAPP INTEGRATION');
  console.log('=========================================\n');
  
  // Test Infobynitin API directly
  console.log('1. Testing Infobynitin API connection...');
  const testResult = await testWhatsAppConnection();
  
  console.log('\n-----------------------------------------\n');
  
  // Test sending OTP
  console.log('2. Testing OTP sending...');
  const testPhone = '919595902003';
  const testOtp = '123456';
  const testName = 'Sakshi';
  
  console.log(`Sending test OTP to ${testPhone}...`);
  const result = await sendWhatsAppOTP(testPhone, testOtp, testName);
  
  console.log('\n📊 Result:');
  console.log(`   Success: ${result.success}`);
  console.log(`   Demo Mode: ${result.demo || false}`);
  if (result.messageId) {
    console.log(`   Message ID: ${result.messageId}`);
  }
  if (result.provider) {
    console.log(`   Provider: ${result.provider}`);
  }
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
}

testWhatsApp();