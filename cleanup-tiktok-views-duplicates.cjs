const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function cleanupTiktokViewsDuplicates() {
  try {
    console.log('🧹 Cleaning up duplicate TikTok Views packages...');

    // Get all active TikTok Views packages
    const packages = await pool.query('SELECT id, name, in_game_amount, usdt_value FROM app_packages WHERE game = $1 AND is_active = true ORDER BY in_game_amount, id', ['TIKTOK_VIEWS']);

    console.log('Current packages:');
    packages.rows.forEach(row => {
      console.log('  - ID: ' + row.id + ', ' + row.name + ' (' + row.in_game_amount + ' views)');
    });

    // Group by amount and keep only the first one for each amount
    const seen = new Set();
    const duplicates = [];

    for (const pkg of packages.rows) {
      if (seen.has(pkg.in_game_amount)) {
        duplicates.push(pkg.id);
      } else {
        seen.add(pkg.in_game_amount);
      }
    }

    if (duplicates.length > 0) {
      console.log('\n🗑️  Removing duplicate packages with IDs: ' + duplicates.join(', '));
      await pool.query('UPDATE app_packages SET is_active = false WHERE id = ANY($1)', [duplicates]);
      console.log('Removed ' + duplicates.length + ' duplicate packages');
    } else {
      console.log('\n✅ No duplicates found');
    }

    // Show final result
    console.log('\n📋 Final TikTok Views packages after cleanup:');
    const finalResult = await pool.query('SELECT name, in_game_amount, usdt_value FROM app_packages WHERE game = $1 AND is_active = true ORDER BY in_game_amount', ['TIKTOK_VIEWS']);
    finalResult.rows.forEach(row => {
      console.log('  - ' + row.name + ' (' + row.in_game_amount + ' views, ' + row.usdt_value + ' USD)');
    });

    console.log('\n✅ Cleanup complete. Total active packages: ' + finalResult.rows.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

cleanupTiktokViewsDuplicates();