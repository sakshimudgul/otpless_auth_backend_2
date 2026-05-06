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
    allowNull: true,
  },
  email: {  // ✅ ADD THIS FIELD
    type: DataTypes.STRING,
    allowNull: true,
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
  delivery_method: {
    type: DataTypes.STRING,
    defaultValue: 'sms',
  },
}, {
  timestamps: true,
  tableName: 'otps',
});

module.exports = OTP;