const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { RefreshToken } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_secret_key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Generate Access Token (short-lived)
const generateAccessToken = (userId, userType, additionalData = {}) => {
  return jwt.sign(
    { 
      id: userId, 
      type: userType,
      ...additionalData,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = async (userId, userType, ipAddress = null, userAgent = null) => {
  // Generate a unique token string
  const tokenString = crypto.randomBytes(64).toString('hex');
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
  
  // Store in database
  const refreshToken = await RefreshToken.create({
    id: crypto.randomUUID(),
    token: tokenString,
    user_id: userId,
    user_type: userType,
    expires_at: expiresAt,
    is_revoked: false,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
  
  return {
    token: tokenString,
    expiresAt: expiresAt,
    id: refreshToken.id,
  };
};

// Verify Access Token
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded, error: null };
  } catch (error) {
    return { valid: false, decoded: null, error: error.message };
  }
};

// Verify Refresh Token
const verifyRefreshToken = async (token, ipAddress = null) => {
  try {
    // Find token in database
    const refreshToken = await RefreshToken.findOne({
      where: {
        token: token,
        is_revoked: false,
        expires_at: { [Op.gt]: new Date() },
      },
    });
    
    if (!refreshToken) {
      return { valid: false, message: 'Invalid or expired refresh token' };
    }
    
    return { 
      valid: true, 
      refreshToken,
      userId: refreshToken.user_id,
      userType: refreshToken.user_type,
    };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

// Revoke Refresh Token (Logout)
const revokeRefreshToken = async (token) => {
  try {
    const refreshToken = await RefreshToken.findOne({ where: { token } });
    if (refreshToken) {
      await refreshToken.update({
        is_revoked: true,
        revoked_at: new Date(),
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Revoke refresh token error:', error);
    return false;
  }
};

// Revoke all user refresh tokens (Logout from all devices)
const revokeAllUserTokens = async (userId) => {
  try {
    await RefreshToken.update(
      { 
        is_revoked: true, 
        revoked_at: new Date() 
      },
      { where: { user_id: userId, is_revoked: false } }
    );
    return true;
  } catch (error) {
    console.error('Revoke all user tokens error:', error);
    return false;
  }
};

// Clean up expired tokens
const cleanupExpiredTokens = async () => {
  try {
    const result = await RefreshToken.destroy({
      where: {
        expires_at: { [Op.lt]: new Date() },
      },
    });
    console.log(`Cleaned up ${result} expired refresh tokens`);
    return result;
  } catch (error) {
    console.error('Cleanup expired tokens error:', error);
    return 0;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};