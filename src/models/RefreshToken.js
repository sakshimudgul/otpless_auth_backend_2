const { getOne, run } = require('../config/database');
const crypto = require('crypto');

const RefreshToken = {
  // Create refresh token record
  create: async (userId, token, expiresAt) => {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
      [id, userId, token, expiresAt]
    );
    return id;
  },

  // Find valid refresh token
  findByToken: async (token) => {
    return await getOne(
      `SELECT * FROM refresh_tokens 
       WHERE token = ? AND revoked = 0 AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
  },

  // Revoke single token (logout)
  revoke: async (token) => {
    await run(`UPDATE refresh_tokens SET revoked = 1 WHERE token = ?`, [token]);
  },

  // Revoke all user tokens (logout from all devices)
  revokeAllUserTokens: async (userId) => {
    await run(`UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`, [userId]);
  },

  // Clean up expired tokens
  cleanup: async () => {
    await run(`DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP OR revoked = 1`);
  }
};

module.exports = RefreshToken;