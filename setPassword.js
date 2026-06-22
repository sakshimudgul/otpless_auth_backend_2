const { getDb, initDatabase } = require('./src/config/database');
const bcrypt = require('bcryptjs');

const EMAIL = 'sakshim8652@gmail.com';
const PLAIN_PASSWORD = 'sakshi@123'; // change if needed

async function fix() {
  await initDatabase();
  const db = getDb();

  // 1. Get user
  const userResult = await db.execute({
    sql: 'SELECT id, email, password, role, is_active FROM users WHERE email = ?',
    args: [EMAIL]
  });

  if (userResult.rows.length === 0) {
    console.log('❌ User not found. Please create via Admin panel.');
    process.exit(1);
  }

  const user = userResult.rows[0];
  console.log('✅ User found:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Active: ${user.is_active === 1 ? 'Yes' : 'No'}`);
  console.log(`   Password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NULL'}`);

  // 2. If password is NULL or comparison fails, set a new one
  let needUpdate = false;
  if (!user.password) {
    console.log('⚠️ Password is NULL – will set a new one.');
    needUpdate = true;
  } else {
    const match = await bcrypt.compare(PLAIN_PASSWORD, user.password);
    if (match) {
      console.log('✅ Password is correct! You can login.');
      process.exit(0);
    } else {
      console.log('❌ Password does NOT match the stored hash.');
      needUpdate = true;
    }
  }

  if (needUpdate) {
    const newHash = await bcrypt.hash(PLAIN_PASSWORD, 10);
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE email = ?',
      args: [newHash, EMAIL]
    });
    console.log(`✅ Password updated for ${EMAIL}. Now try login.`);
  }

  process.exit(0);
}

fix().catch(err => { console.error(err); process.exit(1); });