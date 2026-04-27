const { getOne, getAll, run } = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const Admin = {
  findByEmail: async (email) => {
    return await getOne('SELECT * FROM admins WHERE email = ?', [email]);
  },

  findById: async (id) => {
    return await getOne('SELECT id, name, email, phone, is_active, created_by, last_login, created_at FROM admins WHERE id = ?', [id]);
  },

  findByPhone: async (phone) => {
    return await getOne('SELECT * FROM admins WHERE phone = ?', [phone]);
  },

  create: async (data) => {
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(data.password, 10);
    await run(
      `INSERT INTO admins (id, name, email, password, phone, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.email, hashedPassword, data.phone, data.created_by]
    );
    return await Admin.findById(id);
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];
    
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      fields.push('password = ?');
      values.push(hashedPassword);
    }
    if (data.last_login !== undefined) {
      fields.push('last_login = ?');
      values.push(data.last_login);
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    await run(`UPDATE admins SET ${fields.join(', ')} WHERE id = ?`, values);
    return await Admin.findById(id);
  },

  delete: async (id) => {
    await run('DELETE FROM admins WHERE id = ?', [id]);
    return true;
  },

  getAll: async () => {
    return await getAll('SELECT id, name, email, phone, is_active, created_by, created_at FROM admins');
  },

  getByCreator: async (creatorId) => {
    return await getAll('SELECT id, name, email, phone, is_active, created_at FROM admins WHERE created_by = ?', [creatorId]);
  },

  verifyPassword: async (admin, password) => {
    return await bcrypt.compare(password, admin.password);
  }
};

module.exports = Admin;