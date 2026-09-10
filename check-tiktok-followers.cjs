const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function checkTiktokFollowers() {
  try {
    const result = await pool.query('SELECT id, name, in_game_amount, usdt_value, image FROM app_packages WHERE game = \'TIKTOK_FOLLOWERS\' AND is_active = true ORDER BY in_game_amount');
    console.log('Current TikTok Followers packages:');
    result.rows.forEach(row => {
      console.log('  - ' + row.name + ' (' + row.in_game_amount + ' followers, ' + row.usdt_value + ' USD) - Image: ' + row.image);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTiktokFollowers();