const { sequelize, User, OTP } = require('./src/models');

async function viewNeonDatabase() {
  console.log('\n=========================================');
  console.log('📊 NEON POSTGRESQL DATABASE CONTENTS');
  console.log('=========================================\n');
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Connected to Neon PostgreSQL\n');
    
    // Get all users
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`👥 USERS IN DATABASE (${users.length}):`);
    console.log('='.repeat(80));
    users.forEach(user => {
      console.log(`\n📱 User ID: ${user.id}`);
      console.log(`   Phone: ${user.phone_number}`);
      console.log(`   Name: ${user.name || 'Not set'}`);
      console.log(`   Email: ${user.email || 'Not set'}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      console.log(`   Login Count: ${user.login_count || 0}`);
      console.log(`   Last Login: ${user.last_login || 'Never'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Updated: ${user.updatedAt}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`🔑 OTPS IN DATABASE (${await OTP.count()}):`);
    console.log('='.repeat(80));
    
    const otps = await OTP.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['name', 'phone_number'] }]
    });
    
    otps.forEach(otp => {
      console.log(`\n🔐 OTP ID: ${otp.id}`);
      console.log(`   Phone: ${otp.phone_number}`);
      console.log(`   OTP Code: ${otp.otp_code}`);
      console.log(`   Verified: ${otp.is_verified ? '✅ Yes' : '❌ No'}`);
      if (otp.verified_at) {
        console.log(`   Verified At: ${otp.verified_at}`);
      }
      console.log(`   Attempts: ${otp.attempts}/3`);
      console.log(`   Expires: ${otp.expires_at}`);
      console.log(`   Created: ${otp.createdAt}`);
      console.log(`   IP: ${otp.ip_address || 'N/A'}`);
      if (otp.user) {
        console.log(`   User: ${otp.user.name || 'No name'} (${otp.user.phone_number})`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Data successfully retrieved from Neon PostgreSQL');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error viewing Neon database:', error.message);
  }
}

viewNeonDatabase();