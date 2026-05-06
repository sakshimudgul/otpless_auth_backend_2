const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

const getOne = async (query, params = []) => {
  try {
    const [result] = await sequelize.query(query, {
      replacements: params,
      type: Sequelize.QueryTypes.SELECT
    });
    return result;
  } catch (error) {
    console.error('getOne error:', error);
    return null;
  }
};

const getAll = async (query, params = []) => {
  try {
    const results = await sequelize.query(query, {
      replacements: params,
      type: Sequelize.QueryTypes.SELECT
    });
    return results;
  } catch (error) {
    console.error('getAll error:', error);
    return [];
  }
};

const run = async (query, params = []) => {
  try {
    const [result] = await sequelize.query(query, {
      replacements: params,
      type: Sequelize.QueryTypes.UPDATE
    });
    return result;
  } catch (error) {
    console.error('run error:', error);
    return null;
  }
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Disable foreign key constraints for SQLite
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    // Sync database
    await sequelize.sync({ force: true });
    console.log('✅ Database synced');
    
    // Create default admin
    const Admin = require('../models/Admin');
    const bcrypt = require('bcryptjs');
    
    const adminExists = await Admin.findOne({ where: { email: 'admin@otpless.com' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await Admin.create({
        id: require('crypto').randomUUID(),
        name: 'Super Admin',
        email: 'admin@otpless.com',
        password: hashedPassword,
        phone: '1234567890',
        role: 'admin',
        is_active: true
      });
      console.log('✅ Default admin created: admin@otpless.com / Admin@123');
    } else {
      console.log('✅ Admin already exists');
    }
    
    // Re-enable foreign key constraints (optional)
    // await sequelize.query('PRAGMA foreign_keys = ON;');
    
  } catch (error) {
    console.error('❌ DB Error:', error.message);
    // Don't exit process, just log the error
    console.log('⚠️ Continuing despite database error...');
  }
};

module.exports = { sequelize, connectDB, getOne, getAll, run };