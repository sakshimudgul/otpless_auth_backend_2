const { db } = require('./src/config/database');

async function migrate() {
  console.log('🔄 Running database migration...');
  
  try {
    // Add role column to users table
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
      console.log('✅ role column added');
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log('⚠️ role column already exists');
      } else {
        throw e;
      }
    }
    
    // Add last_otp_sent column to users table
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN last_otp_sent DATETIME`);
      console.log('✅ last_otp_sent column added');
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log('⚠️ last_otp_sent column already exists');
      } else {
        throw e;
      }
    }
    
    // Add verified_at column to otps table
    try {
      await db.execute(`ALTER TABLE otps ADD COLUMN verified_at DATETIME`);
      console.log('✅ verified_at column added');
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log('⚠️ verified_at column already exists');
      } else {
        throw e;
      }
    }
    
    // Update existing users to have default role if null
    await db.execute(`UPDATE users SET role = 'user' WHERE role IS NULL`);
    console.log('✅ Updated existing users with default role');
    
    // Create refresh_tokens table if not exists
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          revoked INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ refresh_tokens table created');
    } catch (e) {
      console.log('⚠️ refresh_tokens table may already exist');
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

migrate();