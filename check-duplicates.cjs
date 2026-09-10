const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for duplicate packages...\n');

    // Get all packages grouped by game and name
    const result = await pool.query('SELECT game, name, COUNT(*) as count FROM app_packages GROUP BY game, name ORDER BY game, name');

    console.log('📊 Package counts by game and name:');
    let totalDuplicates = 0;

    result.rows.forEach(row => {
      if (row.count > 1) {
        console.log(`  ❌ ${row.game} - ${row.name}: ${row.count} duplicates`);
        totalDuplicates += row.count - 1;
      } else {
        console.log(`  ✅ ${row.game} - ${row.name}: ${row.count}`);
      }
    });

    console.log(`\n📈 Total duplicate packages to remove: ${totalDuplicates}`);

    // Get total count
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM app_packages');
    console.log(`📈 Total packages in database: ${totalResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDuplicates();