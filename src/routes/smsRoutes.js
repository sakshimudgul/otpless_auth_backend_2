const express = require('express');
const {
  sendOtpController,
  verifyOtpController,
  resendOtpController,
  getOtpStatusController,
  testSmsConnectionController
} = require('../controllers/smsController');

const router = express.Router();

// SMS OTP Routes
router.post('/send', sendOtpController);
router.post('/verify', verifyOtpController);
router.post('/resend', resendOtpController);
router.get('/status/:phoneNumber', getOtpStatusController);
router.post('/test-connection', testSmsConnectionController);

module.exports = router;