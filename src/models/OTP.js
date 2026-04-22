const { getOne, getAll, run } = require('../config/database');
const crypto = require('crypto');

const OTP = {
  create: async (data) => {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO otps (id, phone_number, otp_code, expires_at, user_id, delivery_method) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.phone_number, data.otp_code, data.expires_at, data.user_id, data.delivery_method]
    );
    return await OTP.findById(id);
  },

  findById: async (id) => {
    return await getOne('SELECT * FROM otps WHERE id = ?', [id]);
  },

  findOne: async (where) => {
    if (where.phone_number && where.otp_code && where.is_verified !== undefined) {
      return await getOne(
        `SELECT * FROM otps WHERE phone_number = ? AND otp_code = ? AND is_verified = ? AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1`,
        [where.phone_number, where.otp_code, where.is_verified]
      );
    }
    return null;
  },

  update: async (where, data) => {
    if (where.phone_number && where.otp_code) {
      await run(
        'UPDATE otps SET is_verified = ?, verified_at = CURRENT_TIMESTAMP WHERE phone_number = ? AND otp_code = ? AND is_verified = 0',
        [data.is_verified, where.phone_number, where.otp_code]
      );
    }
  },

  invalidateAll: async (phoneNumber) => {
    await run(
      'UPDATE otps SET is_verified = 1 WHERE phone_number = ? AND is_verified = 0',
      [phoneNumber]
    );
  }
};

module.exports = OTP;