const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Force sync to recreate all tables (use only in development)
    await sequelize.sync({ force: true });
    console.log('✅ Database synced - tables recreated');
    
    // Create default admin
    const Admin = require('../models/Admin');
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    
    const adminExists = await Admin.findOne({ where: { email: 'admin@otpless.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await Admin.create({
        id: crypto.randomUUID(),
        name: 'Administrator',
        email: 'admin@otpless.com',
        password: hashedPassword,
        phone: '1234567890',
        role: 'admin',
        is_active: true
      });
      console.log('✅ Default admin created: admin@otpless.com / Admin@123');
    }
    
  } catch (error) {
    console.error('❌ DB Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };