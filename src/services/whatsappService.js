const axios = require('axios');
const { User, OTP } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

class WhatsAppService {
  async sendOTP(phoneNumber, name = 'User') {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Find or create user
    let user = await User.findOne({ where: { phone_number: cleanPhone } });
    if (!user) {
      user = await User.create({
        name: name,
        phone_number: cleanPhone,
        role: 'user'
      });
      console.log('✅ New user created:', user.id);
    } else {
      console.log('✅ Existing user found:', user.id);
    }
    
    // Save OTP to database
    const otpRecord = await OTP.create({
      phone_number: cleanPhone,
      otp_code: otp,
      expires_at: expiresAt,
      user_id: user.id,
      delivery_method: 'whatsapp'
    });
    
    console.log(`=========================================`);
    console.log(`📱 WhatsApp OTP: ${otp} for ${cleanPhone}`);
    console.log(`📝 OTP ID: ${otpRecord.id}`);
    console.log(`=========================================`);
    
    return {
      success: true,
      otp: otp,
      otpId: otpRecord.id,
      userId: user.id
    };
  }

  async verifyOTP(phoneNumber, otpCode) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    const otpRecord = await OTP.findOne({
      where: {
        phone_number: cleanPhone,
        otp_code: otpCode,
        is_verified: false,
        expires_at: { [Op.gt]: new Date() }
      }
    });
    
    if (!otpRecord) {
      return { success: false, message: 'Invalid or expired OTP' };
    }
    
    // Mark as verified
    await otpRecord.update({
      is_verified: true,
      verified_at: new Date()
    });
    
    // Get user
    const user = await User.findByPk(otpRecord.user_id);
    await user.update({ last_login: new Date() });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone_number, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`✅ WhatsApp OTP verified for ${cleanPhone}`);
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        role: user.role
      }
    };
  }
}

module.exports = WhatsAppService;