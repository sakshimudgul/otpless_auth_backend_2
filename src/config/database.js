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
    console.log('✅ SQLite Database connected');
    await sequelize.sync({ force: true }); // Use force: true to recreate tables
    console.log('✅ Database tables created');
  } catch (error) {
    console.error('❌ DB Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };