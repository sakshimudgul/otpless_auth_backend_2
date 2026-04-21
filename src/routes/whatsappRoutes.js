const express = require('express');
const { sendWhatsAppOtp, verifyWhatsAppOtp, testWhatsAppConnection } = require('../controllers/whatsappController');

const router = express.Router();

router.post('/send', sendWhatsAppOtp);
router.post('/verify', verifyWhatsAppOtp);
router.get('/test', testWhatsAppConnection);

module.exports = router;