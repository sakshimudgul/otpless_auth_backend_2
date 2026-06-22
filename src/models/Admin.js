const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const Admin = {
  findById: async (id) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM admins WHERE id = ?',
        args: [id]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('Admin.findById error:', error);
      return null;
    }
  },
  
  findByEmail: async (email) => {
    try {
      const db = getDb();
      const result = await db.execute({
        sql: 'SELECT * FROM admins WHERE email = ?',
        args: [email]
      });
      return result.rows[0] || null;
    } catch (error) {
      console.error('Admin.findByEmail error:', error);
      return null;
    }
  },
  
  create: async (adminData) => {
    try {
      const id = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      const db = getDb();
      
      await db.execute({
        sql: `INSERT INTO admins (id, name, email, password, phone, role, is_active) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, adminData.name, adminData.email, hashedPassword, adminData.phone || null, 'admin', 1]
      });
      return await Admin.findById(id);
    } catch (error) {
      console.error('Admin.create error:', error);
      return null;
    }
  },
  
  updateLogin: async (id, ip) => {
    try {
      const db = getDb();
      await db.execute({
        sql: `UPDATE admins SET 
              login_count = login_count + 1, 
              last_login = CURRENT_TIMESTAMP, 
              last_login_ip = ?
             WHERE id = ?`,
        args: [ip, id]
      });
      return await Admin.findById(id);
    } catch (error) {
      console.error('Admin.updateLogin error:', error);
      return null;
    }
  },
  
  verifyPassword: async (admin, password) => {
    try {
      return await bcrypt.compare(password, admin.password);
    } catch (error) {
      console.error('Admin.verifyPassword error:', error);
      return false;
    }
  },
};

module.exports = Admin;