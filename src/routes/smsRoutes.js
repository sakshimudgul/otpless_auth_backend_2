const express = require('express');
const { sendSmsOtp, verifySmsOtp } = require('../controllers/smsController');

const router = express.Router();

// Send SMS OTP
router.post('/send', sendSmsOtp);

// Verify SMS OTP
router.post('/verify', verifySmsOtp);

module.exports = router;