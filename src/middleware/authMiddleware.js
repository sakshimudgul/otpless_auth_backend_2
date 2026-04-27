const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { protect, adminOnly };