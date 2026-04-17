const { sequelize } = require('../config/database');
const User = require('./User');
const OTP = require('./OTP');

// Simple associations without foreign key constraints
User.hasMany(OTP, { foreignKey: 'user_id', constraints: false });
OTP.belongsTo(User, { foreignKey: 'user_id', constraints: false });

module.exports = { sequelize, User, OTP };