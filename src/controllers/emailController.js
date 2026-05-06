const { User, OTP } = require('../models');
const { generateOTP, sendEmailOTP } = require('../services/emailService');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

// Send Email OTP
const sendEmailOtp = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }
    
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Find or create user - FIX: Use phone_number field
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        phone_number: null  // ✅ FIXED: Use 'phone_number' instead of 'phone'
      });
    }
    
    // FIX: Delete old OTPs instead of updating (cleaner approach)
    await OTP.destroy({
      where: { 
        email: email, 
        is_verified: false,
        delivery_method: 'email'
      }
    });
    
    // Save OTP to database - FIX: Use phone_number field or add email to OTP model
    const otpRecord = await OTP.create({
      phone_number: user.phone_number || `email_${Date.now()}`, // Workaround
      email: email,  // Add this field to OTP model
      otp_code: otpCode,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'email',
      is_verified: false
    });
    
    // Send email
    const emailSent = await sendEmailOTP(email, otpCode, name || user.name);
    
    console.log(`📧 Email OTP sent to ${email}: ${otpCode}`);
    console.log(`📧 Email sent successfully: ${emailSent}`);
    
    res.json({
      success: true,
      message: emailSent ? 'Email OTP sent successfully' : 'OTP generated but email sending failed',
      otpId: otpRecord.id,
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });
  } catch (error) {
    console.error('Send Email OTP error:', error);
    res.status(500).json({ error: 'Failed to send email OTP: ' + error.message });
  }
};

// Verify Email OTP and Login
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp, name } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }
    
    const otpRecord = await OTP.findOne({
      where: {
        email: email,
        otp_code: otp,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
    
    if (!otpRecord) {
      const anyOTP = await OTP.findOne({
        where: { email, otp_code: otp }
      });
      if (anyOTP && new Date(anyOTP.expires_at) < new Date()) {
        return res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
      }
      return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // Mark OTP as verified
    await otpRecord.update({ is_verified: true });
    
    // Get or create user
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        phone_number: null
      });
    } else if (name) {
      await user.update({ name });
    }
    
    await user.update({ last_login: new Date() });
    
    const token = generateAccessToken(user.id, 'user');
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Verify Email OTP error:', error);
    res.status(500).json({ error: 'Failed to verify email OTP' });
  }
};

module.exports = { sendEmailOtp, verifyEmailOtp };