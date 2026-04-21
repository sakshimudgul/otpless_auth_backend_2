const { sequelize } = require('../config/database');
const User = require('./User');
const OTP = require('./OTP');

// Define associations
User.hasMany(OTP, { foreignKey: 'user_id', as: 'otps' });
OTP.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { sequelize, User, OTP };