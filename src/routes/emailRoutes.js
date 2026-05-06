const express = require('express');
const { sendEmailOtp, verifyEmailOtp } = require('../controllers/emailController');

const router = express.Router();

router.post('/send', sendEmailOtp);
router.post('/verify', verifyEmailOtp);

module.exports = router;