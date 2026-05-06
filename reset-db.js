const { sequelize } = require('./src/config/database');
const { Admin, User, OTP, RefreshToken } = require('./src/models');

async function resetDatabase() {
  console.log('🔄 Resetting database...');
  
  try {
    // Drop all tables
    await sequelize.drop();
    console.log('✅ Tables dropped');
    
    // Recreate tables
    await sequelize.sync({ force: true });
    console.log('✅ Tables recreated');
    
    // Create default admin
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    await Admin.create({
      name: 'Admin User',
      email: 'admin@otpless.com',
      password: hashedPassword,
      phone: '0000000000',
      is_active: true
    });
    
    console.log('✅ Default admin created: admin@otpless.com / Admin@123');
    console.log('🎉 Database reset complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetDatabase();