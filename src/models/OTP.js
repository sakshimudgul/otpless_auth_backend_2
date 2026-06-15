const { getOne, run } = require('../config/database');
const crypto = require('crypto');

const OTP = {
  create: async (otpData) => {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO otps (id, phone_number, email, otp_code, expires_at, user_id, delivery_method, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        otpData.phone_number || null,
        otpData.email || null,
        otpData.otp_code,
        otpData.expires_at,
        otpData.user_id || null,
        otpData.delivery_method || 'sms',
        otpData.ip_address || null,
        otpData.user_agent || null
      ]
    );
    return await OTP.findById(id);
  },
  
  findById: async (id) => {
    return await getOne('SELECT * FROM otps WHERE id = ?', [id]);
  },
  
  findValidOTP: async (phoneNumber, otpCode) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return await getOne(
      `SELECT * FROM otps 
       WHERE phone_number = ? 
       AND otp_code = ? 
       AND is_verified = 0 
       AND expires_at > CURRENT_TIMESTAMP`,
      [cleanPhone, otpCode]
    );
  },
  
  findValidEmailOTP: async (email, otpCode) => {
    return await getOne(
      `SELECT * FROM otps 
       WHERE email = ? 
       AND otp_code = ? 
       AND is_verified = 0 
       AND expires_at > CURRENT_TIMESTAMP`,
      [email, otpCode]
    );
  },
  
  markVerified: async (id) => {
    await run(`UPDATE otps SET is_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    return true;
  },
  
  deleteExpiredForPhone: async (phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    await run('DELETE FROM otps WHERE phone_number = ? AND (is_verified = 1 OR expires_at < CURRENT_TIMESTAMP)', [cleanPhone]);
    return true;
  },
};

module.exports = OTP;