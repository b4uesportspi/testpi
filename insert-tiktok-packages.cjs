const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

// TikTok packages to insert
const tiktokPackages = [
  {
    game: 'TIKTOK_COINS',
    name: '100 TikTok Coins',
    inGameAmount: 100,
    usdtValue: '0.99',
    image: '/images/tiktok-coins-100.png',
  },
  {
    game: 'TIKTOK_COINS',
    name: '500 TikTok Coins',
    inGameAmount: 500,
    usdtValue: '4.99',
    image: '/images/tiktok-coins-500.png',
  },
  {
    game: 'TIKTOK_COINS',
    name: '1000 TikTok Coins',
    inGameAmount: 1000,
    usdtValue: '9.99',
    image: '/images/tiktok-coins-1000.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '100 TikTok Followers',
    inGameAmount: 100,
    usdtValue: '4.99',
    image: '/images/tiktok-followers-100.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '500 TikTok Followers',
    inGameAmount: 500,
    usdtValue: '19.99',
    image: '/images/tiktok-followers-500.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '1000 TikTok Followers',
    inGameAmount: 1000,
    usdtValue: '39.99',
    image: '/images/tiktok-followers-1000.png',
  },
  {
    game: 'TIKTOK_VIEWS',
    name: '1000 TikTok Views',
    inGameAmount: 1000,
    usdtValue: '0.99',
    image: '/images/tiktok-views-1000.png',
  },
  {
    game: 'TIKTOK_VIEWS',
    name: '5000 TikTok Views',
    inGameAmount: 5000,
    usdtValue: '4.99',
    image: '/images/tiktok-views-5000.png',
  },
  {
    game: 'TIKTOK_VIEWS',
    name: '10000 TikTok Views',
    inGameAmount: 10000,
    usdtValue: '9.99',
    image: '/images/tiktok-views-10000.png',
  },
];

async function insertTikTokPackages() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🎵 Inserting TikTok packages into database...\n');

    for (const pkg of tiktokPackages) {
      const id = crypto.randomUUID();
      const now = new Date();
      
      const query = `
        INSERT INTO app_packages (id, game, name, in_game_amount, usdt_value, image, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
        ON CONFLICT DO NOTHING
      `;
      
      await pool.query(query, [
        id,
        pkg.game,
        pkg.name,
        pkg.inGameAmount,
        pkg.usdtValue,
        pkg.image,
        now,
        now,
      ]);
      
      console.log(`✅ Inserted: ${pkg.game} - ${pkg.name} ($${pkg.usdtValue})`);
    }

    console.log('\n✨ TikTok packages inserted successfully!\n');

    // Verify insertion
    const result = await pool.query('SELECT game, COUNT(*) as count FROM app_packages GROUP BY game ORDER BY game');
    console.log('📊 Package counts by game:');
    result.rows.forEach(row => {
      console.log(`  ${row.game}: ${row.count}`);
    });

  } catch (error) {
    console.error('❌ Error inserting packages:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

insertTikTokPackages().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
});
