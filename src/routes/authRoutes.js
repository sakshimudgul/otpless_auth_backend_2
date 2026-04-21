const express = require('express');
const { sendOtp, verifyOtp, getUserDetails } = require('../controllers/authController');

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/user/:phone', getUserDetails);

module.exports = router;