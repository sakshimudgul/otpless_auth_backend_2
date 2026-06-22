const { getDb } = require('../config/database');
const crypto = require('crypto');

const User = {
  findById: async (id) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [id]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('User.findById error:', error);
      return null;
    }
  },

  findByPhone: async (phoneNumber) => {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE phone_number = ?',
        args: [cleanPhone]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('User.findByPhone error:', error);
      return null;
    }
  },

  findByEmail: async (email) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('User.findByEmail error:', error);
      return null;
    }
  },

  getAll: async () => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM users ORDER BY created_at DESC'
      });
      return result.rows || [];
    } catch (error) {
      console.error('User.getAll error:', error);
      return [];
    }
  },

  getCount: async () => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM users'
      });
      return result.rows[0]?.count || 0;
    } catch (error) {
      return 0;
    }
  },

  create: async (userData) => {
    try {
      const id = crypto.randomUUID();
      const db = getDb();
      await db.execute({
        sql: `INSERT INTO users (id, name, phone_number, email, password, role, is_active) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          userData.name,
          userData.phone_number,
          userData.email || null,
          userData.password || null,   // <-- password stored (already hashed)
          userData.role || 'user',
          userData.is_active !== undefined ? userData.is_active : 1
        ]
      });
      return await User.findById(id);
    } catch (error) {
      console.error('User.create error:', error);
      throw error;
    }
  },

  update: async (id, updates) => {
    try {
      const db = getDb();
      const fields = [];
      const values = [];

      if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      if (updates.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.is_active ? 1 : 0);
      }
      if (updates.last_login !== undefined) {
        fields.push('last_login = ?');
        values.push(updates.last_login);
      }
      if (updates.last_login_ip !== undefined) {
        fields.push('last_login_ip = ?');
        values.push(updates.last_login_ip);
      }
      if (updates.login_count !== undefined) {
        fields.push('login_count = ?');
        values.push(updates.login_count);
      }
      if (updates.business_name !== undefined) {
        fields.push('business_name = ?');
        values.push(updates.business_name);
      }
      if (updates.password !== undefined) {
        fields.push('password = ?');
        values.push(updates.password);
      }

      if (fields.length === 0) return await User.findById(id);

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      await db.execute({
        sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        args: values
      });
      return await User.findById(id);
    } catch (error) {
      console.error('User.update error:', error);
      throw error;
    }
  },

  incrementLoginCount: async (id, ip, method) => {
    try {
      const db = getDb();
      await db.execute({
        sql: `UPDATE users SET 
              login_count = login_count + 1, 
              last_login = CURRENT_TIMESTAMP, 
              last_login_ip = ?,
              last_login_method = ?
             WHERE id = ?`,
        args: [ip, method, id]
      });
      return await User.findById(id);
    } catch (error) {
      console.error('User.incrementLoginCount error:', error);
      return null;
    }
  },

  delete: async (id) => {
    try {
      const db = getDb();
      await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [id]
      });
      return true;
    } catch (error) {
      console.error('User.delete error:', error);
      return false;
    }
  },
};

module.exports = User;