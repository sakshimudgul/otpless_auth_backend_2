const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  otp_code: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  request_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'otps',
  underscored: false,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = OTP;