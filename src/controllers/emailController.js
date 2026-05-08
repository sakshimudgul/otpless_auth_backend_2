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
    
    console.log(`\n=========================================`);
    console.log(`📧 Sending Email OTP`);
    console.log(`   To: ${email}`);
    console.log(`   Name: ${name || 'User'}`);
    console.log(`   OTP: ${otpCode}`);
    console.log(`=========================================\n`);
    
    // Find or create user
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        phone_number: null
      });
    }
    
    // Delete old unverified OTPs
    await OTP.destroy({
      where: {
        email: email,
        is_verified: false,
        delivery_method: 'email'
      }
    });
    
    // Save OTP to database
    await OTP.create({
      email: email,
      otp_code: otpCode,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'email',
      is_verified: false
    });
    
    // Send email using template
    const emailSent = await sendEmailOTP(email, otpCode, name || user.name);
    
    if (emailSent) {
      console.log(`✅ Email OTP sent successfully to ${email}`);
    } else {
      console.log(`⚠️ Failed to send email OTP to ${email}`);
    }
    
    res.json({
      success: true,
      message: emailSent ? 'Email OTP sent successfully' : 'OTP generated but email sending failed',
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });
    
  } catch (error) {
    console.error('Send Email OTP error:', error);
    res.status(500).json({ error: 'Failed to send email OTP: ' + error.message });
  }
};

// Verify Email OTP
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
      const expiredOTP = await OTP.findOne({
        where: {
          email: email,
          otp_code: otp,
          expires_at: { [Op.lte]: new Date() }
        }
      });
      
      if (expiredOTP) {
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