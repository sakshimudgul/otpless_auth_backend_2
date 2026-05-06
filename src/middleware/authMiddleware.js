const jwt = require('jsonwebtoken');
const { User, Admin } = require('../models');

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
    
    console.log('Token received:', token.substring(0, 50) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // First try to find in Admin table
    let user = await Admin.findByPk(decoded.id);
    let userType = 'admin';
    
    // If not found in Admin, try User table
    if (!user) {
      user = await User.findByPk(decoded.id);
      userType = 'user';
    }
    
    if (!user) {
      console.log('User not found for id:', decoded.id);
      return res.status(401).json({ error: 'Not authorized - User not found' });
    }
    
    console.log(`User found in ${userType} table:`, {
      id: user.id,
      email: user.email || user.phone_number,
      role: decoded.role
    });
    
    // Attach user to request object
    req.user = user;
    req.userType = userType;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ error: 'Not authorized - ' + error.message });
  }
};

const adminOnly = (req, res, next) => {
  console.log('Checking admin access...');
  console.log('User type:', req.userType);
  console.log('User role from token:', req.user?.role);
  
  // Check if user is from Admin table or has role 'admin'
  if (req.userType === 'admin' || req.user?.role === 'admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin access denied');
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = { protect, adminOnly };