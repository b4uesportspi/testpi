const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function checkDetailedDuplicates() {
  try {
    console.log('🔍 Checking for detailed duplicates (same game, name, amount, price)...\n');

    // Get all packages with full details
    const result = await pool.query('SELECT id, game, name, in_game_amount, usdt_value, image, created_at FROM app_packages ORDER BY game, name, created_at');

    console.log('📊 All packages with details:');
    const seen = new Map();
    let duplicates = [];

    result.rows.forEach(row => {
      const key = `${row.game}|${row.name}|${row.in_game_amount}|${row.usdt_value}`;

      if (seen.has(key)) {
        console.log(`  ❌ DUPLICATE: ${row.game} - ${row.name} (ID: ${row.id.substring(0,8)}...) - Created: ${row.created_at}`);
        duplicates.push(row.id);
      } else {
        console.log(`  ✅ UNIQUE: ${row.game} - ${row.name} (ID: ${row.id.substring(0,8)}...) - Created: ${row.created_at}`);
        seen.set(key, row.id);
      }
    });

    console.log(`\n📈 Found ${duplicates.length} duplicate packages to remove`);

    if (duplicates.length > 0) {
      console.log('🗑️  Removing duplicates...');
      for (const id of duplicates) {
        await pool.query('DELETE FROM app_packages WHERE id = $1', [id]);
        console.log(`  Deleted package ID: ${id}`);
      }

      const finalResult = await pool.query('SELECT COUNT(*) as count FROM app_packages');
      console.log(`✅ Final package count: ${finalResult.rows[0].count}`);
    } else {
      console.log('✅ No duplicates found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDetailedDuplicates();