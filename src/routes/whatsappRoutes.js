const express = require('express');
const { sendWhatsAppOtp, verifyWhatsAppOtp } = require('../controllers/whatsappController');

const router = express.Router();

router.post('/send', sendWhatsAppOtp);
router.post('/verify', verifyWhatsAppOtp);

module.exports = router;