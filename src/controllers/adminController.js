const { getDb } = require('../config/database');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// ==================== GET ALL USERS (End Users) ====================
const getAllUsers = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC',
      args: ['user']
    });
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// ==================== GET BUSINESS USERS ====================
const getBusinessUsers = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE role = ? ORDER BY created_at DESC',
      args: ['user']
    });
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Get business users error:', error);
    res.status(500).json({ error: 'Failed to get business users' });
  }
};

// ==================== GET USER BY ID ====================
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// ==================== GET USER STATS ====================
const getUserStats = async (req, res) => {
  try {
    const db = getDb();
    const totalUsers = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM users WHERE role = ?',
      args: ['user']
    });
    const activeUsers = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1',
      args: ['user']
    });
    const totalEndUsers = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM end_users'
    });
    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers.rows[0]?.count || 0,
        activeUsers: activeUsers.rows[0]?.count || 0,
        inactiveUsers: (totalUsers.rows[0]?.count || 0) - (activeUsers.rows[0]?.count || 0),
        totalEndUsers: totalEndUsers.rows[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ==================== CREATE BUSINESS USER (Admin Only - Hashes Password) ====================
const createBusinessUser = async (req, res) => {
  try {
    if (req.userType !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create business users' });
    }

    const { name, email, phone, password, business_name, is_active } = req.body;
    console.log('📥 Creating business user:', { name, email, phone, business_name });
    console.log('🔑 Password received:', password ? 'YES' : 'NO');

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;
    const db = getDb();

    // Check duplicates
    const existingEmail = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    if (cleanPhone) {
      const existingPhone = await db.execute({
        sql: 'SELECT * FROM users WHERE phone_number = ?',
        args: [cleanPhone]
      });
      if (existingPhone.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists with this phone number' });
      }
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔑 Hashed password stored:', hashedPassword.substring(0, 20) + '...');

    await db.execute({
      sql: `INSERT INTO users (id, name, email, phone_number, password, business_name, role, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        name,
        email,
        cleanPhone || null,
        hashedPassword,
        business_name || null,
        'user',
        is_active !== undefined ? is_active : 1
      ]
    });

    const newUser = await db.execute({
      sql: 'SELECT id, name, email, phone_number, business_name, role, is_active FROM users WHERE id = ?',
      args: [userId]
    });

    res.json({ success: true, message: 'Business user created successfully', user: newUser.rows[0] });
  } catch (error) {
    console.error('Create business user error:', error);
    res.status(500).json({ error: 'Failed to create business user: ' + error.message });
  }
};

// ==================== UPDATE USER ====================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, is_active, business_name, password } = req.body;
    const db = getDb();
    
    const existingUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const values = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone) { 
      const cleanPhone = phone.replace(/\D/g, '');
      updates.push('phone_number = ?'); 
      values.push(cleanPhone); 
    }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (business_name !== undefined) { updates.push('business_name = ?'); values.push(business_name); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashed);
    }
    
    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }
    
    values.push(id);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args: values
    });
    
    const updatedUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    res.json({ success: true, message: 'User updated successfully', user: updatedUser.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// ==================== DELETE USER ====================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const existingUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    await db.execute({ sql: 'DELETE FROM otps WHERE user_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM user_services WHERE user_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM end_users WHERE user_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// ==================== DELETE BUSINESS USER ====================
const deleteBusinessUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const existingUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ? AND role = ?',
      args: [id, 'user']
    });
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Business user not found' });
    }
    await db.execute({ sql: 'DELETE FROM user_services WHERE user_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM end_users WHERE user_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
    res.json({ success: true, message: 'Business user deleted successfully' });
  } catch (error) {
    console.error('Delete business user error:', error);
    res.status(500).json({ error: 'Failed to delete business user' });
  }
};

// ==================== GET ADMIN STATS ====================
const getAdminStats = async (req, res) => {
  try {
    const db = getDb();
    const [totalUsers, totalEndUsers, totalServices, totalUsage, activeBusinessUsers] = await Promise.all([
      db.execute({ sql: 'SELECT COUNT(*) as count FROM users WHERE role = ?', args: ['user'] }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM end_users' }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM services' }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM service_usage' }),
      db.execute({ sql: 'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1', args: ['user'] })
    ]);
    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers.rows[0]?.count || 0,
        totalEndUsers: totalEndUsers.rows[0]?.count || 0,
        totalServices: totalServices.rows[0]?.count || 0,
        totalUsage: totalUsage.rows[0]?.count || 0,
        activeBusinessUsers: activeBusinessUsers.rows[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ==================== TOGGLE USER STATUS ====================
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const existingUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const currentStatus = existingUser.rows[0].is_active;
    const newStatus = currentStatus === 1 ? 0 : 1;
    await db.execute({
      sql: 'UPDATE users SET is_active = ? WHERE id = ?',
      args: [newStatus, id]
    });
    const updatedUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    res.json({
      success: true,
      message: `User ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser.rows[0]
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
};

// ==================== EXPORTS ====================
module.exports = {
  getAllUsers,
  getBusinessUsers,
  getUserById,
  getUserStats,
  createBusinessUser,    // ✅ Business User – WITH hashed password
  updateUser,
  deleteUser,
  deleteBusinessUser,
  getAdminStats,
  toggleUserStatus
};