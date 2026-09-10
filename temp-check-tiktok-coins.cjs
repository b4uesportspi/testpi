const { Pool } = require('pg');
require('dotenv').config();

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  const result = await pool.query("SELECT id, name FROM app_packages WHERE game='TIKTOK_COINS' AND is_active=true AND name LIKE '%$%' ");
  console.log('found', result.rows.length);
  console.dir(result.rows);
  await pool.end();
})();