const { createClient } = require('@libsql/client');
require('dotenv').config();

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl) {
  console.error('❌ TURSO_DATABASE_URL is not defined');
  process.exit(1);
}

// Create Turso client
const db = createClient({
  url: databaseUrl,
  authToken: authToken,
});

// Initialize database tables
const initDatabase = async () => {
  try {
    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        phone_number TEXT UNIQUE NOT NULL,
        name TEXT,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create otps table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS otps (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        phone_number TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        verified_at DATETIME,
        expires_at DATETIME NOT NULL,
        user_id TEXT,
        delivery_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('✅ Turso database tables ready');
  } catch (error) {
    console.error('❌ Database init error:', error.message);
    throw error;
  }
};

// Database helper functions
const query = async (sql, params = []) => {
  try {
    return await db.execute(sql, params);
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

const getOne = async (sql, params = []) => {
  const result = await db.execute(sql, params);
  return result.rows[0] || null;
};

const getAll = async (sql, params = []) => {
  const result = await db.execute(sql, params);
  return result.rows;
};

const run = async (sql, params = []) => {
  return await db.execute(sql, params);
};

const connectDB = async () => {
  try {
    await initDatabase();
    console.log('✅ Turso database connected');
  } catch (error) {
    console.error('❌ Turso connection error:', error.message);
    process.exit(1);
  }
};

module.exports = { db, query, getOne, getAll, run, connectDB };