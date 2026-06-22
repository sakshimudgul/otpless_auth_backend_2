const { getDb } = require('../config/database');
const crypto = require('crypto');

const OTP = {
  findById: async (id) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM otps WHERE id = ?',
        args: [id]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('OTP.findById error:', error);
      return null;
    }
  },
  
  create: async (otpData) => {
    try {
      const id = crypto.randomUUID();
      const db = getDb();
      await db.execute({
        sql: `INSERT INTO otps (id, phone_number, email, otp_code, expires_at, user_id, delivery_method) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          otpData.phone_number || null,
          otpData.email || null,
          otpData.otp_code,
          otpData.expires_at,
          otpData.user_id || null,
          otpData.delivery_method || 'sms'
        ]
      });
      return await OTP.findById(id);
    } catch (error) {
      console.error('OTP.create error:', error);
      throw error;
    }
  },
  
  findValidOTP: async (phoneNumber, otpCode) => {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const db = getDb();
      const result = await db.execute({
        sql: `SELECT * FROM otps 
              WHERE phone_number = ? 
              AND otp_code = ? 
              AND is_verified = 0 
              AND expires_at > CURRENT_TIMESTAMP`,
        args: [cleanPhone, otpCode]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('OTP.findValidOTP error:', error);
      return null;
    }
  },
  
  findValidEmailOTP: async (email, otpCode) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: `SELECT * FROM otps 
              WHERE email = ? 
              AND otp_code = ? 
              AND is_verified = 0 
              AND expires_at > CURRENT_TIMESTAMP`,
        args: [email, otpCode]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('OTP.findValidEmailOTP error:', error);
      return null;
    }
  },
  
  markVerified: async (id) => {
    try {
      const db = getDb();
      await db.execute({
        sql: `UPDATE otps SET is_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [id]
      });
      return true;
    } catch (error) {
      console.error('OTP.markVerified error:', error);
      return false;
    }
  },
  
  deleteExpiredForPhone: async (phoneNumber) => {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const db = getDb();
      await db.execute({
        sql: 'DELETE FROM otps WHERE phone_number = ? AND (is_verified = 1 OR expires_at < CURRENT_TIMESTAMP)',
        args: [cleanPhone]
      });
      return true;
    } catch (error) {
      console.error('OTP.deleteExpiredForPhone error:', error);
      return false;
    }
  },
};

module.exports = OTP;