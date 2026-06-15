const { getOne, getAll, run, query } = require('../config/database');
const crypto = require('crypto');

const TursoUser = {
  // Find user by phone number
  findByPhone: async (phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return await getOne('SELECT * FROM users WHERE phone_number = ?', [cleanPhone]);
  },
  
  // Find user by email
  findByEmail: async (email) => {
    return await getOne('SELECT * FROM users WHERE email = ?', [email]);
  },
  
  // Find user by ID
  findById: async (id) => {
    return await getOne('SELECT * FROM users WHERE id = ?', [id]);
  },
  
  // Create new user
  create: async (userData) => {
    const id = crypto.randomUUID();
    await run(
      `INSERT INTO users (id, name, phone_number, email, role, is_active, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userData.name, userData.phone_number, userData.email || null, 'user', 1, userData.created_by || null]
    );
    return await TursoUser.findById(id);
  },
  
  // Update user
  update: async (id, updates) => {
    const fields = [];
    const values = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.last_login) {
      fields.push('last_login = ?');
      values.push(updates.last_login);
    }
    if (updates.last_login_ip) {
      fields.push('last_login_ip = ?');
      values.push(updates.last_login_ip);
    }
    if (updates.login_count !== undefined) {
      fields.push('login_count = ?');
      values.push(updates.login_count);
    }
    if (updates.last_login_method) {
      fields.push('last_login_method = ?');
      values.push(updates.last_login_method);
    }
    
    if (fields.length === 0) return await TursoUser.findById(id);
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return await TursoUser.findById(id);
  },
  
  // Get all users
  getAll: async () => {
    return await getAll('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC', ['user']);
  },
  
  // Get user stats
  getStats: async () => {
    const total = await getOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['user']);
    const active = await getOne('SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1', ['user']);
    return { totalUsers: total?.count || 0, activeUsers: active?.count || 0 };
  },
};

module.exports = TursoUser;