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

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync({ force: true });
    console.log('✅ Database synced');
  } catch (error) {
    console.error('❌ DB Error:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };