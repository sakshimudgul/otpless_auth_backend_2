const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (userId, phoneNumber) => {
  return jwt.sign(
    { userId, phoneNumber },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };