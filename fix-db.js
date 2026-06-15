const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

async function fixDatabase() {
  console.log('=========================================');
  console.log('🔧 FIXING DATABASE SCHEMA');
  console.log('=========================================\n');
  
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    // Check current columns
    console.log('📋 Checking current table structure...');
    const columns = await client.execute("PRAGMA table_info(users)");
    console.log('Current columns:', columns.rows.map(c => c.name));
    
    // Drop and recreate users table
    console.log('\n📦 Recreating users table...');
    await client.execute('DROP TABLE IF EXISTS users');
    
    await client.execute(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone_number TEXT UNIQUE NOT NULL,
        password TEXT,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        last_login DATETIME,
        login_count INTEGER DEFAULT 0,
        last_login_method TEXT,
        last_login_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table recreated with phone_number column');
    
    // Recreate admins table
    console.log('\n📦 Recreating admins table...');
    await client.execute('DROP TABLE IF EXISTS admins');
    
    await client.execute(`
      CREATE TABLE admins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'admin',
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        last_login DATETIME,
        login_count INTEGER DEFAULT 0,
        last_login_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admins table recreated');
    
    // Recreate otps table
    console.log('\n📦 Recreating otps table...');
    await client.execute('DROP TABLE IF EXISTS otps');
    
    await client.execute(`
      CREATE TABLE otps (
        id TEXT PRIMARY KEY,
        phone_number TEXT,
        email TEXT,
        otp_code TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        expires_at DATETIME NOT NULL,
        verified_at DATETIME,
        user_id TEXT,
        delivery_method TEXT DEFAULT 'sms',
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Otps table recreated');
    
    // Create default admin
    console.log('\n👑 Creating default admin...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const adminId = crypto.randomUUID();
    
    await client.execute({
      sql: `INSERT INTO admins (id, name, email, password, phone, role, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [adminId, 'Super Admin', 'admin@otpless.com', hashedPassword, '9876543210', 'admin', 1],
    });
    console.log('✅ Default admin created');
    
    // Verify
    console.log('\n📊 Verifying new columns...');
    const newColumns = await client.execute("PRAGMA table_info(users)");
    console.log('New columns:', newColumns.rows.map(c => c.name));
    
    if (newColumns.rows.some(c => c.name === 'phone_number')) {
      console.log('\n✅ SUCCESS! phone_number column exists now.');
    } else {
      console.log('\n❌ phone_number column still missing!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDatabase();