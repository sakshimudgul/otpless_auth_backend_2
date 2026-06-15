const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendEmailOtp = async (req, res) => {
  try {
    const { email, name = 'User' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log(`📧 Email OTP for ${email}: ${otp}`);
    
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        role: 'user'
      });
    }
    
    await OTP.destroy({
      where: { email, is_verified: false, delivery_method: 'email' }
    });
    
    await OTP.create({
      email: email,
      otp_code: otp,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'email',
      is_verified: false
    });
    
    res.json({ success: true, message: 'Email OTP sent', demoOtp: otp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    
    await otpRecord.update({ is_verified: true });
    
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        role: 'user'
      });
    }
    
    await user.update({ last_login: new Date() });
    
    const token = generateToken(user.id, 'user');
    
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { sendEmailOtp, verifyEmailOtp };