const { getDb } = require('../config/database');
const crypto = require('crypto');

const EndUser = {
  findById: async (id) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM end_users WHERE id = ?',
        args: [id]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('EndUser.findById error:', error);
      return null;
    }
  },
  
  findByPhone: async (phoneNumber) => {
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM end_users WHERE phone_number = ?',
        args: [cleanPhone]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('EndUser.findByPhone error:', error);
      return null;
    }
  },
  
  findByUserId: async (userId) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM end_users WHERE user_id = ? ORDER BY created_at DESC',
        args: [userId]
      });
      return result.rows || [];
    } catch (error) {
      console.error('EndUser.findByUserId error:', error);
      return [];
    }
  },
  
  create: async (data) => {
    try {
      const id = crypto.randomUUID();
      const cleanPhone = data.phone_number ? data.phone_number.replace(/\D/g, '') : null;
      const db = getDb();
      
      await db.execute({
        sql: `INSERT INTO end_users (id, user_id, name, phone_number, email, is_verified) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, data.user_id, data.name, cleanPhone, data.email || null, data.is_verified ? 1 : 0]
      });
      return await EndUser.findById(id);
    } catch (error) {
      console.error('EndUser.create error:', error);
      throw error;
    }
  },
  
  update: async (id, data) => {
    try {
      const db = getDb();
      const fields = [];
      const values = [];
      
      if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
      if (data.phone_number !== undefined) { 
        fields.push('phone_number = ?'); 
        values.push(data.phone_number.replace(/\D/g, ''));
      }
      if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
      if (data.is_verified !== undefined) { fields.push('is_verified = ?'); values.push(data.is_verified ? 1 : 0); }
      
      if (fields.length === 0) return await EndUser.findById(id);
      values.push(id);
      
      await db.execute({
        sql: `UPDATE end_users SET ${fields.join(', ')} WHERE id = ?`,
        args: values
      });
      return await EndUser.findById(id);
    } catch (error) {
      console.error('EndUser.update error:', error);
      return null;
    }
  },
  
  delete: async (id) => {
    try {
      const db = getDb();
      await db.execute({
        sql: 'DELETE FROM end_users WHERE id = ?',
        args: [id]
      });
      return true;
    } catch (error) {
      console.error('EndUser.delete error:', error);
      return false;
    }
  },
  
  findAll: async () => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM end_users ORDER BY created_at DESC'
      });
      return result.rows || [];
    } catch (error) {
      console.error('EndUser.findAll error:', error);
      return [];
    }
  },
  
  countByUser: async (userId) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM end_users WHERE user_id = ?',
        args: [userId]
      });
      return result.rows[0]?.count || 0;
    } catch (error) {
      console.error('EndUser.countByUser error:', error);
      return 0;
    }
  }
};

module.exports = EndUser;