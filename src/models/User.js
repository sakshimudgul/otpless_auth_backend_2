const { getOne, getAll, run } = require('../config/database');
const crypto = require('crypto');

const User = {
  findByPhone: async (phoneNumber) => {
    return await getOne('SELECT * FROM users WHERE phone_number = ?', [phoneNumber]);
  },

  findById: async (id) => {
    return await getOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  create: async (data) => {
    const id = crypto.randomUUID();
    try {
      await run(
        'INSERT INTO users (id, phone_number, name) VALUES (?, ?, ?)',
        [id, data.phone_number, data.name || null]
      );
      return await User.findById(id);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        // User already exists, fetch and return existing
        return await User.findByPhone(data.phone_number);
      }
      throw error;
    }
  },

  update: async (id, data) => {
    if (data.name) {
      await run('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data.name, id]);
    }
    if (data.last_login) {
      await run('UPDATE users SET last_login = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data.last_login, id]);
    }
    return await User.findById(id);
  },

  findAll: async () => {
    return await getAll('SELECT * FROM users ORDER BY created_at DESC');
  }
};

module.exports = User;