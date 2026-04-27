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
    field: 'phone_number',
  },
  otp_code: {
    type: DataTypes.STRING(6),
    allowNull: false,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'otps',
});

module.exports = OTP;