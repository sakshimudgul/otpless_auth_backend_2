const { sequelize, User, OTP } = require('./src/models');

async function checkDatabase() {
  console.log('=========================================');
  console.log('Checking Database Contents');
  console.log('=========================================\n');
  
  try {
    // Check users
    const users = await User.findAll();
    console.log(`📊 Users in database: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ID: ${user.id}, Phone: ${user.phone_number}, Name: ${user.name || 'Not set'}`);
    });
    
    console.log('\n-----------------------------------------\n');
    
    // Check OTPs
    const otps = await OTP.findAll({
      order: [['created_at', 'DESC']],
      limit: 10
    });
    console.log(`📊 Recent OTPs (last 10): ${otps.length}`);
    otps.forEach(otp => {
      console.log(`   - Phone: ${otp.phone_number}, OTP: ${otp.otp}, Verified: ${otp.is_verified}, Expires: ${otp.expires_at}`);
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();