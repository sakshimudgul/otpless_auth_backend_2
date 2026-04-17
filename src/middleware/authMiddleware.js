const { verifyToken } = require('../config/jwt');

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized' });
  }
};

module.exports = { protect };