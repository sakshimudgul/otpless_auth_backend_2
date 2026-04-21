const express = require('express');
const { sendSmsOtp, verifySmsOtp } = require('../controllers/smsController');
const { sendWhatsAppOtp, verifyWhatsAppOtp } = require('../controllers/whatsappController');

const router = express.Router();

// SMS routes
router.post('/send-sms-otp', sendSmsOtp);
router.post('/verify-sms-otp', verifySmsOtp);

// WhatsApp routes
router.post('/send-whatsapp-otp', sendWhatsAppOtp);
router.post('/verify-whatsapp-otp', verifyWhatsAppOtp);

module.exports = router;