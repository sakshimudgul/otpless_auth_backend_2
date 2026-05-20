const { sequelize } = require('../config/database');
const Admin = require('./Admin');
const User = require('./User');
const OTP = require('./OTP');

// Setup associations
const models = { Admin, User, OTP };

Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

// Admin associations
Admin.hasMany(User, { foreignKey: 'created_by', as: 'users' });
User.belongsTo(Admin, { foreignKey: 'created_by', as: 'creator' });

// User associations
User.hasMany(OTP, { foreignKey: 'user_id', as: 'otps' });
OTP.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  Admin,
  User,
  OTP,
};