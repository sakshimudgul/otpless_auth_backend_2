const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Generate Access Token (short-lived)
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (userId, role) => {
  return jwt.sign(
    { userId, role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

// Verify Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Decode Token (without verification)
const decodeToken = (token) => {
  return jwt.decode(token);
};

// Set Access Token Cookie
const setAccessTokenCookie = (res, token) => {
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });
};

// Set Refresh Token Cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

// Clear Tokens
const clearTokens = (res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearTokens,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};