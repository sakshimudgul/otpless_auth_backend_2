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

  // Create users table with password column
  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone_number TEXT UNIQUE,
      password TEXT,
      business_name TEXT,
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

  // Create services table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      price_per_unit DECIMAL(10,2) DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default services
  const defaultServices = [
    ['sms', 'SMS', 'SMS OTP delivery service', '0.50'],
    ['whatsapp', 'WhatsApp', 'WhatsApp OTP delivery service', '0.75'],
    ['email', 'Email', 'Email OTP delivery service', '0.30']
  ];

  for (const [name, display, desc, price] of defaultServices) {
    const exists = await database.execute({
      sql: 'SELECT * FROM services WHERE name = ?',
      args: [name]
    });
    if (exists.rows.length === 0) {
      await database.execute({
        sql: 'INSERT INTO services (id, name, display_name, description, price_per_unit) VALUES (?, ?, ?, ?, ?)',
        args: [crypto.randomUUID(), name, display, desc, price]
      });
    }
  }

  // Create user_services table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS user_services (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      credits_remaining INTEGER DEFAULT 0,
      total_credits_purchased INTEGER DEFAULT 0,
      expiry_date DATETIME,
      is_active INTEGER DEFAULT 1,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  // Create service_usage table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS service_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      end_user_id TEXT,
      credits_used INTEGER DEFAULT 1,
      usage_data JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  // Create end_users table (NO user_id - end users are independent)
  await database.execute(`
    CREATE TABLE IF NOT EXISTS end_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      email TEXT,
      is_verified INTEGER DEFAULT 0,
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