const { sequelize } = require('../config/database');
const Admin = require('./Admin');
const User = require('./User');
const OTP = require('./OTP');
const RefreshToken = require('./RefreshToken');

// Define associations carefully - COMMENT OUT problematic ones first
// User associations
User.hasMany(OTP, { foreignKey: 'user_id' });
OTP.belongsTo(User, { foreignKey: 'user_id' });

// Admin associations - COMMENT THESE OUT temporarily
// Admin.hasMany(User, { foreignKey: 'created_by' });
// User.belongsTo(Admin, { foreignKey: 'created_by' });

// Admin self-association - COMMENT OUT
// Admin.hasMany(Admin, { foreignKey: 'created_by', as: 'subAdmins' });
// Admin.belongsTo(Admin, { foreignKey: 'created_by', as: 'creator' });

module.exports = { 
  sequelize,
  Admin, 
  User, 
  OTP, 
  RefreshToken 
};