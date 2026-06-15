const { getTursoClient } = require('../src/config/database');

async function checkSchema() {
  try {
    const client = getTursoClient();
    
    console.log('🔍 Checking database schema...\n');
    
    // Check if users table exists
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables in database:', tables.rows.map(t => t.name));
    
    // Check users table columns
    const userColumns = await client.execute('PRAGMA table_info(users)');
    console.log('\nUsers table columns:', userColumns.rows.map(c => ({ name: c.name, type: c.type })));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();