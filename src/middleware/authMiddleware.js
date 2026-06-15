const jwt = require('jsonwebtoken');
const { Admin, User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const protect = async (req, res, next) => {
  try {
    let token;
    
    // Try to get token from Authorization header first (backward compatible)
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // If no token in header, try to get from cookie
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Not authorized - No token' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    let user = await Admin.findById(decoded.id);
    let userType = 'admin';
    
    if (!user) {
      user = await User.findById(decoded.id);
      userType = 'user';
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Not authorized - User not found' });
    }
    
    req.user = user;
    req.userType = userType;
    next();
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

module.exports = { protect, adminOnly };