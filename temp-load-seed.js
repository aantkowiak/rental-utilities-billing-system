const { readFileSync } = require('fs');
const { Client } = require('pg');

async function loadSeed() {
  const client = new Client({
    connectionString: 'postgresql://postgres:5arRO6dn4mCLGeBb@db.kifzdxjtwfbevqrnzmgb.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const sql = readFileSync('./supabase/seed.sql', 'utf8');
    console.log('Executing seed.sql...');
    
    await client.query(sql);
    console.log('Seed data loaded successfully!');

    // Verify data
    const result = await client.query('SELECT COUNT(*) FROM properties');
    console.log(`Properties count: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

loadSeed();


