const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

// All social media packages to insert
const socialMediaPackages = [
  // YouTube Subs
  {
    game: 'YOUTUBE_SUBS',
    name: '100 YouTube Subscribers',
    inGameAmount: 100,
    usdtValue: '4.99',
    image: '/images/youtube-subs-100.png',
  },
  {
    game: 'YOUTUBE_SUBS',
    name: '500 YouTube Subscribers',
    inGameAmount: 500,
    usdtValue: '19.99',
    image: '/images/youtube-subs-500.png',
  },
  {
    game: 'YOUTUBE_SUBS',
    name: '1000 YouTube Subscribers',
    inGameAmount: 1000,
    usdtValue: '39.99',
    image: '/images/youtube-subs-1000.png',
  },
  // YouTube Watchtime
  {
    game: 'YOUTUBE_WATCHTIME',
    name: '100 Hours Watch Time',
    inGameAmount: 100,
    usdtValue: '49.99',
    image: '/images/youtube-watchtime-100.png',
  },
  {
    game: 'YOUTUBE_WATCHTIME',
    name: '200 Hours Watch Time',
    inGameAmount: 200,
    usdtValue: '99.99',
    image: '/images/youtube-watchtime-200.png',
  },
  {
    game: 'YOUTUBE_WATCHTIME',
    name: '500 Hours Watch Time',
    inGameAmount: 500,
    usdtValue: '249.99',
    image: '/images/youtube-watchtime-500.png',
  },
  // Facebook Likes
  {
    game: 'FACEBOOK',
    name: '100 Facebook Likes',
    inGameAmount: 100,
    usdtValue: '2.99',
    image: '/images/facebook-likes-100.png',
  },
  {
    game: 'FACEBOOK',
    name: '500 Facebook Likes',
    inGameAmount: 500,
    usdtValue: '12.99',
    image: '/images/facebook-likes-500.png',
  },
  {
    game: 'FACEBOOK',
    name: '1000 Facebook Likes',
    inGameAmount: 1000,
    usdtValue: '24.99',
    image: '/images/facebook-likes-1000.png',
  },
  // Instagram Followers
  {
    game: 'INSTAGRAM',
    name: '100 Instagram Followers',
    inGameAmount: 100,
    usdtValue: '3.99',
    image: '/images/instagram-followers-100.png',
  },
  {
    game: 'INSTAGRAM',
    name: '500 Instagram Followers',
    inGameAmount: 500,
    usdtValue: '14.99',
    image: '/images/instagram-followers-500.png',
  },
  {
    game: 'INSTAGRAM',
    name: '1000 Instagram Followers',
    inGameAmount: 1000,
    usdtValue: '29.99',
    image: '/images/instagram-followers-1000.png',
  },
  // Netflix Account Share (1 Month)
  {
    game: 'NETFLIX',
    name: 'Netflix Premium 1 Month',
    inGameAmount: 1,
    usdtValue: '15.99',
    image: '/images/netflix-premium-1month.png',
  },
  {
    game: 'NETFLIX',
    name: 'Netflix Premium 3 Months',
    inGameAmount: 3,
    usdtValue: '44.99',
    image: '/images/netflix-premium-3months.png',
  },
  {
    game: 'NETFLIX',
    name: 'Netflix Premium 12 Months',
    inGameAmount: 12,
    usdtValue: '159.99',
    image: '/images/netflix-premium-12months.png',
  },
  // Canva Pro (1 Month)
  {
    game: 'CANVA',
    name: 'Canva Pro 1 Month',
    inGameAmount: 1,
    usdtValue: '11.99',
    image: '/images/canva-pro-1month.png',
  },
  {
    game: 'CANVA',
    name: 'Canva Pro 3 Months',
    inGameAmount: 3,
    usdtValue: '34.99',
    image: '/images/canva-pro-3months.png',
  },
  {
    game: 'CANVA',
    name: 'Canva Pro 12 Months',
    inGameAmount: 12,
    usdtValue: '119.99',
    image: '/images/canva-pro-12months.png',
  },
];

async function insertSocialMediaPackages() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('📱 Inserting social media packages into database...\n');

    let insertCount = 0;
    let skipCount = 0;

    for (const pkg of socialMediaPackages) {
      const id = crypto.randomUUID();
      const now = new Date();
      
      // Check if package already exists
      const checkQuery = 'SELECT id FROM app_packages WHERE game = $1 AND name = $2 LIMIT 1';
      const checkResult = await pool.query(checkQuery, [pkg.game, pkg.name]);
      
      if (checkResult.rows.length > 0) {
        console.log(`⏭️  Skipped: ${pkg.game} - ${pkg.name} (already exists)`);
        skipCount++;
        continue;
      }
      
      const query = `
        INSERT INTO app_packages (id, game, name, in_game_amount, usdt_value, image, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
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
      insertCount++;
    }

    console.log(`\n📊 Summary: ${insertCount} new packages inserted, ${skipCount} already existed\n`);

    // Verify final counts
    const result = await pool.query('SELECT game, COUNT(*) as count FROM app_packages GROUP BY game ORDER BY game');
    console.log('📈 Final package counts by game:');
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

insertSocialMediaPackages().then(() => {
  console.log('\n✅ All social media packages processed!');
  process.exit(0);
});
