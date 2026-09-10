const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function removeDollarSignsSpecific() {
  try {
    console.log('💰 Removing $ symbols from specific services...');
    const services = ['YOUTUBE_SUBS', 'FACEBOOK', 'INSTAGRAM', 'NETFLIX', 'CANVA'];
    const result = await pool.query(
      "UPDATE app_packages SET name = REPLACE(name, '$', '') WHERE game = ANY($1) AND is_active = true AND name LIKE '%$%' RETURNING id, game, name",
      [services]
    );

    console.log('🧾 Updated packages:', result.rows.length);
    result.rows.forEach(row => console.log(`  - ${row.game}: ${row.name}`));

    console.log('\n✅ Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

removeDollarSignsSpecific();