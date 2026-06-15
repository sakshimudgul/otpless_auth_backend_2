const { getDb } = require('../config/database');
const crypto = require('crypto');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM users ORDER BY created_at DESC'
    });
    
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Get user by ID
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

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const db = getDb();
    
    const totalUsers = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM users'
    });
    
    const activeUsers = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM users WHERE is_active = 1'
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers.rows[0]?.count || 0,
        activeUsers: activeUsers.rows[0]?.count || 0,
        inactiveUsers: (totalUsers.rows[0]?.count || 0) - (activeUsers.rows[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const { name, phone, email, password, is_active } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const db = getDb();
    
    // Check if user exists
    const existingUser = await db.execute({
      sql: 'SELECT * FROM users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this phone number' });
    }
    
    // Check email if provided
    if (email) {
      const existingEmail = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ?',
        args: [email]
      });
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }
    }
    
    // Create new user
    const userId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO users (id, name, phone_number, email, role, is_active) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [userId, name, cleanPhone, email || null, 'user', is_active !== undefined ? is_active : 1]
    });
    
    // Get the created user
    const newUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId]
    });
    
    res.json({ 
      success: true, 
      message: 'User created successfully',
      user: newUser.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, is_active } = req.body;
    const db = getDb();
    
    // Check if user exists
    const existingUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    
    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      updates.push('phone_number = ?');
      values.push(cleanPhone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args: values
    });
    
    // Get updated user
    const updatedUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // Check if user exists
    const existingUser = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id]
    });
    
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete OTPs first (foreign key constraint)
    await db.execute({
      sql: 'DELETE FROM otps WHERE user_id = ?',
      args: [id]
    });
    
    // Delete user
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
};