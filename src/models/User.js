const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

// ADD THIS METHOD - Find user by phone number
User.findByPhone = async function(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  return await this.findOne({ where: { phone_number: cleanPhone } });
};

// ADD THIS METHOD - Find user by ID
User.findById = async function(id) {
  return await this.findByPk(id);
};

// ADD THIS METHOD - Update user
User.updateUser = async function(id, data) {
  const user = await this.findByPk(id);
  if (!user) return null;
  
  if (data.name) user.name = data.name;
  if (data.last_login) user.last_login = data.last_login;
  
  await user.save();
  return user;
};

// Instance method for password validation
User.prototype.validatePassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

// Hash password before save
User.beforeCreate = async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
};

User.beforeUpdate = async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
};

module.exports = User;