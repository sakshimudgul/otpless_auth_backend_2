const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// ==================== VERIFY TOKEN (Simple) ====================
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== PROTECT (Full Auth) ====================
const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Not authorized - No token' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    
    // Check if admin
    let admin = await db.execute({
      sql: 'SELECT * FROM admins WHERE id = ?',
      args: [decoded.id]
    });
    if (admin.rows.length > 0) {
      req.user = admin.rows[0];
      req.userType = 'admin';
      req.userId = admin.rows[0].id;
      return next();
    }
    
    // Check if business user
    let user = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [decoded.id]
    });
    if (user.rows.length > 0) {
      req.user = user.rows[0];
      req.userType = 'user';
      req.userId = user.rows[0].id;
      return next();
    }
    
    // Check if end user
    let endUser = await db.execute({
      sql: 'SELECT * FROM end_users WHERE id = ?',
      args: [decoded.id]
    });
    if (endUser.rows.length > 0) {
      req.user = endUser.rows[0];
      req.userType = 'enduser';
      req.userId = endUser.rows[0].id;
      return next();
    }
    
    return res.status(401).json({ error: 'Not authorized - User not found' });
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Not authorized - Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.userType === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

const businessUserOnly = (req, res, next) => {
  if (req.userType === 'user') {
    next();
  } else {
    res.status(403).json({ error: 'Business user access required' });
  }
};

const endUserOnly = (req, res, next) => {
  if (req.userType === 'enduser') {
    next();
  } else {
    res.status(403).json({ error: 'End user access required' });
  }
};

module.exports = { 
  verifyToken,        // ✅ Added
  protect, 
  adminOnly, 
  businessUserOnly, 
  endUserOnly 
};