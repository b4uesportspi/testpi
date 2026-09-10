const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAllTables() {
  try {
    await client.connect();

    // Check ALL tables in public schema
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('ALL Tables in public schema:');
    result.rows.forEach(row => {
      console.log(`${row.tablename}: RLS ${row.rls_enabled ? 'ENABLED' : 'DISABLED'}`);
    });

    // Check for tables without RLS
    const noRLSTables = result.rows.filter(row => !row.rowsecurity);
    if (noRLSTables.length > 0) {
      console.log('\n🚨 TABLES WITHOUT RLS ENABLED:');
      noRLSTables.forEach(row => {
        console.log(`❌ ${row.tablename}`);
      });
    } else {
      console.log('\n✅ All tables have RLS enabled!');
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await client.end();
  }
}

checkAllTables();
