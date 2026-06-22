const { getDb } = require('../config/database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// ==================== SEND END USER OTP ====================
const sendEndUserOtp = async (req, res) => {
  try {
    const { phone, name = 'User' } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const db = getDb();
    
    let endUser = await db.execute({
      sql: 'SELECT * FROM end_users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    
    let endUserId;
    if (endUser.rows.length === 0) {
      endUserId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO end_users (id, name, phone_number, is_verified) 
              VALUES (?, ?, ?, ?)`,
        args: [endUserId, name || `User_${cleanPhone.slice(-4)}`, cleanPhone, 0]
      });
      console.log(`✅ New end user created: ${cleanPhone}`);
    } else {
      endUserId = endUser.rows[0].id;
      if (name && name !== 'User') {
        await db.execute({
          sql: 'UPDATE end_users SET name = ? WHERE id = ?',
          args: [name, endUserId]
        });
      }
    }
    
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    
    await db.execute({
      sql: 'DELETE FROM otps WHERE phone_number = ? AND is_verified = 0',
      args: [cleanPhone]
    });
    
    await db.execute({
      sql: 'INSERT INTO otps (id, phone_number, otp_code, expires_at, user_id, delivery_method) VALUES (?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), cleanPhone, otpCode, expiresAt, endUserId, 'enduser']
    });
    
    console.log(`📱 EndUser OTP for ${cleanPhone}: ${otpCode}`);
    
    res.json({ 
      success: true, 
      message: 'OTP sent to your phone',
      demoOtp: process.env.NODE_ENV === 'development' ? otpCode : undefined
    });
  } catch (error) {
    console.error('Send end user OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP: ' + error.message });
  }
};

// ==================== VERIFY END USER OTP ====================
const verifyEndUserOtp = async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const db = getDb();
    
    const otpResult = await db.execute({
      sql: 'SELECT * FROM otps WHERE phone_number = ? AND otp_code = ? AND is_verified = 0 AND expires_at > CURRENT_TIMESTAMP',
      args: [cleanPhone, otp]
    });
    
    if (otpResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    
    await db.execute({
      sql: 'UPDATE otps SET is_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [otpResult.rows[0].id]
    });
    
    let endUser = await db.execute({
      sql: 'SELECT * FROM end_users WHERE phone_number = ?',
      args: [cleanPhone]
    });
    
    let endUserId;
    if (endUser.rows.length === 0) {
      endUserId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO end_users (id, name, phone_number, is_verified) 
              VALUES (?, ?, ?, ?)`,
        args: [endUserId, name || `User_${cleanPhone.slice(-4)}`, cleanPhone, 1]
      });
    } else {
      endUserId = endUser.rows[0].id;
      await db.execute({
        sql: 'UPDATE end_users SET is_verified = 1 WHERE id = ?',
        args: [endUserId]
      });
      if (name && name !== 'User') {
        await db.execute({
          sql: 'UPDATE end_users SET name = ? WHERE id = ?',
          args: [name, endUserId]
        });
      }
    }
    
    const updatedEndUser = await db.execute({
      sql: 'SELECT id, name, phone_number, email FROM end_users WHERE id = ?',
      args: [endUserId]
    });
    
    const token = jwt.sign({ id: endUserId, role: 'enduser' }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      token,
      user: {
        id: updatedEndUser.rows[0].id,
        name: updatedEndUser.rows[0].name,
        phone: updatedEndUser.rows[0].phone_number,
        email: updatedEndUser.rows[0].email || null,
        role: 'enduser'
      }
    });
  } catch (error) {
    console.error('Verify end user OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP: ' + error.message });
  }
};

// ==================== GET END USER PROFILE ====================
const getEndUserProfile = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT id, name, phone_number, email, is_verified, created_at FROM end_users WHERE id = ?',
      args: [userId]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'End user not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Get end user profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// ==================== GET END USER USAGE ====================
const getEndUserUsage = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const db = getDb();
    
    const usage = await db.execute({
      sql: `
        SELECT 
          su.id,
          su.credits_used,
          su.usage_data,
          su.created_at,
          s.display_name as service_name
        FROM service_usage su
        LEFT JOIN services s ON su.service_id = s.id
        WHERE su.end_user_id = ?
        ORDER BY su.created_at DESC
        LIMIT 50
      `,
      args: [userId]
    });
    
    res.json({ success: true, usage: usage.rows });
  } catch (error) {
    console.error('Get end user usage error:', error);
    res.json({ success: true, usage: [] });
  }
};

// ==================== GET ALL END USERS (For Business) ====================
const getEndUsers = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT * FROM end_users ORDER BY created_at DESC'
    });
    res.json({ success: true, endUsers: result.rows });
  } catch (error) {
    console.error('Get end users error:', error);
    res.status(500).json({ error: 'Failed to get end users' });
  }
};

// ==================== UPDATE END USER ====================
const updateEndUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone_number, email, is_verified } = req.body;
    const db = getDb();
    
    const existing = await db.execute({
      sql: 'SELECT * FROM end_users WHERE id = ?',
      args: [id]
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'End user not found' });
    }
    
    const updates = [];
    const values = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone_number) { 
      const cleanPhone = phone_number.replace(/\D/g, '');
      updates.push('phone_number = ?'); 
      values.push(cleanPhone); 
    }
    if (email !== undefined) { updates.push('email = ?'); values.push(email); }
    if (is_verified !== undefined) { updates.push('is_verified = ?'); values.push(is_verified ? 1 : 0); }
    
    if (updates.length === 0) {
      return res.json({ success: true, message: 'No changes made' });
    }
    
    values.push(id);
    await db.execute({
      sql: `UPDATE end_users SET ${updates.join(', ')} WHERE id = ?`,
      args: values
    });
    
    const updatedEndUser = await db.execute({
      sql: 'SELECT * FROM end_users WHERE id = ?',
      args: [id]
    });
    res.json({ success: true, endUser: updatedEndUser.rows[0] });
  } catch (error) {
    console.error('Update end user error:', error);
    res.status(500).json({ error: 'Failed to update end user' });
  }
};

// ==================== DELETE END USER ====================
const deleteEndUser = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    await db.execute({
      sql: 'DELETE FROM end_users WHERE id = ?',
      args: [id]
    });
    res.json({ success: true, message: 'End user deleted successfully' });
  } catch (error) {
    console.error('Delete end user error:', error);
    res.status(500).json({ error: 'Failed to delete end user' });
  }
};

// ==================== EXPORTS ====================
module.exports = {
  // OTP Functions
  sendEndUserOtp,
  verifyEndUserOtp,
  getEndUserProfile,
  getEndUserUsage,
  // Business User Functions
  getEndUsers,
  updateEndUser,
  deleteEndUser
};