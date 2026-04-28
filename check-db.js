const { sequelize, User, OTP } = require('./src/models');

async function checkDatabase() {
  console.log('\n=========================================');
  console.log('📊 DATABASE CONTENTS');
  console.log('=========================================\n');
  
  try {
    // Check Users table
    const users = await User.findAll();
    console.log(`👥 USERS TABLE (${users.length} records):`);
    users.forEach(user => {
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Phone: ${user.phone_number}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Last Login: ${user.last_login || 'Never'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('   ---');
    });
    
    console.log('\n-----------------------------------------\n');
    
    // Check OTPs table
    const otps = await OTP.findAll({
      order: [['createdAt', 'DESC']]
    });
    console.log(`🔑 OTPS TABLE (${otps.length} records):`);
    otps.forEach(otp => {
      console.log(`   ID: ${otp.id}`);
      console.log(`   Phone: ${otp.phone_number}`);
      console.log(`   OTP: ${otp.otp_code}`);
      console.log(`   Verified: ${otp.is_verified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Verified At: ${otp.verified_at || 'Not yet'}`);
      console.log(`   Method: ${otp.delivery_method}`);
      console.log(`   Expires: ${otp.expires_at}`);
      console.log(`   Created: ${otp.createdAt}`);
      console.log('   ---');
    });
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();