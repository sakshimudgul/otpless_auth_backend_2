const sendWhatsAppMessage = async (phoneNumber, otp, name = 'User') => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // REMOVE the TEST_MODE check
  // Always try to send real WhatsApp
  
  const pinbotApiKey = process.env.PINBOT_API_KEY;
  const pinbotPhoneNumberId = process.env.PINBOT_PHONE_NUMBER_ID;
  
  if (!pinbotApiKey) {
    console.log(`❌ PINBOT_API_KEY not found`);
    return false;
  }
  
  try {
    const url = `https://partnersv1.pinbot.ai/v3/${pinbotPhoneNumberId}/messages`;
    
    const response = await axios.post(url, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "text",
      text: { body: `Your OTP is: ${otp}` }
    }, {
      headers: { 'Content-Type': 'application/json', 'apikey': pinbotApiKey }
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log(`✅ WhatsApp sent successfully!`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ WhatsApp error:`, error.message);
    return false;
  }
};