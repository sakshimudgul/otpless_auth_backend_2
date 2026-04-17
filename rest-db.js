const { sequelize } = require('./src/config/database');

async function resetDatabase() {
  console.log('🔄 Resetting database...');
  
  try {
    // Drop all tables
    await sequelize.drop();
    console.log('✅ Tables dropped');
    
    // Recreate tables
    await sequelize.sync({ force: true });
    console.log('✅ Tables recreated');
    
    console.log('🎉 Database reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetDatabase();