const { getDb, initDatabase } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  await initDatabase();
  const db = getDb();
  
  const email = 'admin@otpless.com';
  const newPassword = 'Admin@123';
  const hashed = await bcrypt.hash(newPassword, 10);
  
  await db.execute({
    sql: 'UPDATE admins SET password = ? WHERE email = ?',
    args: [hashed, email]
  });
  
  console.log(`✅ Password for ${email} reset to: ${newPassword}`);
  process.exit(0);
}
resetAdminPassword().catch(err => { console.error(err); process.exit(1); });