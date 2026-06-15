const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

let db = null;

const getDb = () => {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    console.log('✅ Database connected');
  }
  return db;
};

const initDatabase = async () => {
  const database = getDb();
  
  // Create users table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone_number TEXT UNIQUE,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      login_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create admins table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'admin',
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      login_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create otps table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS otps (
      id TEXT PRIMARY KEY,
      phone_number TEXT,
      email TEXT,
      otp_code TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME,
      user_id TEXT,
      delivery_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create default admin
  const adminExists = await database.execute({
    sql: 'SELECT * FROM admins WHERE email = ?',
    args: ['admin@otpless.com']
  });
  
  if (adminExists.rows.length === 0) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    await database.execute({
      sql: `INSERT INTO admins (id, name, email, password, phone, role, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), 'Super Admin', 'admin@otpless.com', hashedPassword, '9876543210', 'admin', 1]
    });
    console.log('✅ Default admin created: admin@otpless.com / Admin@123');
  }
  
  console.log('✅ Database ready');
};

module.exports = { getDb, initDatabase };