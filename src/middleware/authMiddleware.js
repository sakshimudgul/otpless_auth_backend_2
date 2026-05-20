const jwt = require('jsonwebtoken');
const { Admin, User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Not authorized - No token' });
    }
    
    console.log('Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Check Admin first
    let user = await Admin.findByPk(decoded.id);
    let userType = 'admin';
    
    if (!user) {
      user = await User.findByPk(decoded.id);
      userType = 'user';
    }
    
    if (!user) {
      console.log('User not found for id:', decoded.id);
      return res.status(401).json({ error: 'Not authorized - User not found' });
    }
    
    console.log(`User found in ${userType} table:`, user.email || user.phone_number);
    
    req.user = user;
    req.userType = userType;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Not authorized - ' + error.message });
  }
};

const adminOnly = (req, res, next) => {
  console.log('Checking admin access...');
  console.log('User type:', req.userType);
  
  if (req.userType === 'admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin access denied');
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = { protect, adminOnly };