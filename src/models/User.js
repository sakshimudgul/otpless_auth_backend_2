const { getOne, getAll, run } = require('../config/database');
const crypto = require('crypto');

const User = {
  findById: async (id) => {
    try {
      return await getOne('SELECT * FROM users WHERE id = ?', [id]);
    } catch (error) {
      console.error('User.findById error:', error);
      return null;
    }
  },
  
  findByPhone: async (phoneNumber) => {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      return await getOne('SELECT * FROM users WHERE phone_number = ?', [cleanPhone]);
    } catch (error) {
      console.error('User.findByPhone error:', error);
      return null;
    }
  },
  
  getAll: async () => {
    try {
      return await getAll('SELECT * FROM users ORDER BY created_at DESC');
    } catch (error) {
      console.error('User.getAll error:', error);
      return [];
    }
  },
  
  getCount: async () => {
    try {
      const result = await getOne('SELECT COUNT(*) as count FROM users');
      return result?.count || 0;
    } catch (error) {
      return 0;
    }
  },
  
  create: async (userData) => {
    try {
      const id = crypto.randomUUID();
      await run(
        `INSERT INTO users (id, name, phone_number, email, role, is_active, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          userData.name, 
          userData.phone_number, 
          userData.email || null, 
          userData.role || 'user', 
          userData.is_active !== undefined ? userData.is_active : 1,
          userData.created_by || null
        ]
      );
      return await User.findById(id);
    } catch (error) {
      console.error('User.create error:', error);
      throw error;
    }
  },
  
  update: async (id, updates) => {
    try {
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
      if (updates.last_login_method !== undefined) {
        fields.push('last_login_method = ?');
        values.push(updates.last_login_method);
      }
      
      if (fields.length === 0) return await User.findById(id);
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      return await User.findById(id);
    } catch (error) {
      console.error('User.update error:', error);
      throw error;
    }
  },
  
  incrementLoginCount: async (id, ip, method) => {
    try {
      await run(
        `UPDATE users SET 
          login_count = login_count + 1, 
          last_login = CURRENT_TIMESTAMP, 
          last_login_ip = ?,
          last_login_method = ?
         WHERE id = ?`,
        [ip, method, id]
      );
      return await User.findById(id);
    } catch (error) {
      console.error('User.incrementLoginCount error:', error);
      return null;
    }
  },
  
  delete: async (id) => {
    try {
      await run('DELETE FROM users WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('User.delete error:', error);
      return false;
    }
  },
};

module.exports = User;