const express = require('express');
const { sendSmsOtp, verifySmsOtp } = require('../controllers/smsController');

const router = express.Router();

router.post('/send', sendSmsOtp);
router.post('/verify', verifySmsOtp);

module.exports = router;