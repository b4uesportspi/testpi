const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

// ============================================================================
// GAMING PACKAGES (In-Game Tokens)
// ============================================================================

const gamingPackages = [
  // ROBUX
  {
    game: 'ROBUX',
    name: '40 Robux',
    inGameAmount: 40,
    usdtValue: '1.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },
  {
    game: 'ROBUX',
    name: '80 Robux',
    inGameAmount: 80,
    usdtValue: '1.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },
  {
    game: 'ROBUX',
    name: '400 Robux',
    inGameAmount: 400,
    usdtValue: '5.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },
  {
    game: 'ROBUX',
    name: '800 Robux',
    inGameAmount: 800,
    usdtValue: '10.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },
  {
    game: 'ROBUX',
    name: '1700 Robux',
    inGameAmount: 1700,
    usdtValue: '20.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },
  {
    game: 'ROBUX',
    name: '4500 Robux',
    inGameAmount: 4500,
    usdtValue: '51.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },
  {
    game: 'ROBUX',
    name: '10000 Robux',
    inGameAmount: 10000,
    usdtValue: '101.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },
  {
    game: 'ROBUX',
    name: '22500 Robux',
    inGameAmount: 22500,
    usdtValue: '201.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png',
  },

  // NEW STATE (NC - New Cash)
  {
    game: 'NEWSTATE',
    name: '300 NC',
    inGameAmount: 300,
    usdtValue: '1.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
  },
  {
    game: 'NEWSTATE',
    name: '1580 NC',
    inGameAmount: 1580,
    usdtValue: '5.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
  },
  {
    game: 'NEWSTATE',
    name: '3850 NC',
    inGameAmount: 3850,
    usdtValue: '12.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
  },
  {
    game: 'NEWSTATE',
    name: '10230 NC',
    inGameAmount: 10230,
    usdtValue: '32.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
  },
  {
    game: 'NEWSTATE',
    name: '16800 NC',
    inGameAmount: 16800,
    usdtValue: '51.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
  },
  {
    game: 'NEWSTATE',
    name: '35000 NC',
    inGameAmount: 35000,
    usdtValue: '101.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg',
  },

  // FREE FIRE (Diamonds)
  {
    game: 'FREEFIRE',
    name: '110 Diamond',
    inGameAmount: 110,
    usdtValue: '2.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000048821.png',
  },
  {
    game: 'FREEFIRE',
    name: '210 Diamond',
    inGameAmount: 210,
    usdtValue: '3.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000048821.png',
  },
  {
    game: 'FREEFIRE',
    name: '530 Diamond',
    inGameAmount: 530,
    usdtValue: '6.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000048821.png',
  },
  {
    game: 'FREEFIRE',
    name: '1080 Diamond',
    inGameAmount: 1080,
    usdtValue: '11.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000048821.png',
  },
  {
    game: 'FREEFIRE',
    name: '2200 Diamond',
    inGameAmount: 2200,
    usdtValue: '22.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000048821.png',
  },
  {
    game: 'FREEFIRE',
    name: '5600 Diamond',
    inGameAmount: 5600,
    usdtValue: '55.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000048821.png',
  },
];

// ============================================================================
// SOCIAL MEDIA PACKAGES (Boosting Services)
// ============================================================================

const socialMediaPackages = [
  // TIKTOK COINS
  {
    game: 'TIKTOK_COINS',
    name: '70 Coins – $1.50',
    inGameAmount: 70,
    usdtValue: '1.50',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '350 Coins – $4.50',
    inGameAmount: 350,
    usdtValue: '4.50',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '700 Coins – $10.00',
    inGameAmount: 700,
    usdtValue: '10.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '1,400 Coins – $18.50',
    inGameAmount: 1400,
    usdtValue: '18.50',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '2,000 Coins – $26.00',
    inGameAmount: 2000,
    usdtValue: '26.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '3,500 Coins – $45.00',
    inGameAmount: 3500,
    usdtValue: '45.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '5,000 Coins – $64.00',
    inGameAmount: 5000,
    usdtValue: '64.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '7,000 Coins – $88.50',
    inGameAmount: 7000,
    usdtValue: '88.50',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },
  {
    game: 'TIKTOK_COINS',
    name: '17,500 Coins – $220.00',
    inGameAmount: 17500,
    usdtValue: '220.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/tiktok-coin.jpg',
  },

  // TIKTOK FOLLOWERS
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '100 Followers – $2.00',
    inGameAmount: 100,
    usdtValue: '2.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '1,000 Followers – $4.00',
    inGameAmount: 1000,
    usdtValue: '4.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '1,500 Followers – $5.50',
    inGameAmount: 1500,
    usdtValue: '5.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '2,000 Followers – $6.50',
    inGameAmount: 2000,
    usdtValue: '6.50',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '5,000 Followers – $14.00',
    inGameAmount: 5000,
    usdtValue: '14.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '10,000 Followers – $25.00',
    inGameAmount: 10000,
    usdtValue: '25.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '50,000 Followers – $130.00',
    inGameAmount: 50000,
    usdtValue: '130.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },
  {
    game: 'TIKTOK_FOLLOWERS',
    name: '100,000 Followers – $250.00',
    inGameAmount: 100000,
    usdtValue: '250.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000034677.png',
  },

  // TIKTOK VIEWS (Monetization Views)
  {
    game: 'TIKTOK_VIEWS',
    name: '5,000 Views – $10.00',
    inGameAmount: 5000,
    usdtValue: '10.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
  },
  {
    game: 'TIKTOK_VIEWS',
    name: '10,000 Views – $20.00',
    inGameAmount: 10000,
    usdtValue: '20.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
  },
  {
    game: 'TIKTOK_VIEWS',
    name: '20,000 Views – $40.00',
    inGameAmount: 20000,
    usdtValue: '40.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
  },
  {
    game: 'TIKTOK_VIEWS',
    name: '50,000 Views – $100.00',
    inGameAmount: 50000,
    usdtValue: '100.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
  },
  {
    game: 'TIKTOK_VIEWS',
    name: '100,000 Views – $200.00',
    inGameAmount: 100000,
    usdtValue: '200.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png',
  },

  // YOUTUBE SUBSCRIBERS
  {
    game: 'YOUTUBE_SUBS',
    name: '100 Subscribers – $4.00',
    inGameAmount: 100,
    usdtValue: '4.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
  },
  {
    game: 'YOUTUBE_SUBS',
    name: '500 Subscribers – $15.00',
    inGameAmount: 500,
    usdtValue: '15.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
  },
  {
    game: 'YOUTUBE_SUBS',
    name: '1,000 Subscribers – $30.00',
    inGameAmount: 1000,
    usdtValue: '30.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
  },
  {
    game: 'YOUTUBE_SUBS',
    name: '5,000 Subscribers – $135.00',
    inGameAmount: 5000,
    usdtValue: '135.00',
    image: 'https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png',
  },

  // YOUTUBE WATCH TIME
  {
    game: 'YOUTUBE_WATCHTIME',
    name: '500 WT – $10.00',
    inGameAmount: 500,
    usdtValue: '10.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg',
  },
  {
    game: 'YOUTUBE_WATCHTIME',
    name: '1,000 WT – $18.00',
    inGameAmount: 1000,
    usdtValue: '18.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg',
  },
  {
    game: 'YOUTUBE_WATCHTIME',
    name: '2,000 WT – $30.00',
    inGameAmount: 2000,
    usdtValue: '30.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg',
  },
  {
    game: 'YOUTUBE_WATCHTIME',
    name: '4,000 WT – $60.00',
    inGameAmount: 4000,
    usdtValue: '60.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/youtube-wt.jpg',
  },

  // FACEBOOK LIKES & FOLLOWERS
  {
    game: 'FACEBOOK',
    name: '500 FB+Likes – $4.00',
    inGameAmount: 500,
    usdtValue: '4.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-followers.jpg',
  },
  {
    game: 'FACEBOOK',
    name: '1,000 FB+Likes – $8.00',
    inGameAmount: 1000,
    usdtValue: '8.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-followers.jpg',
  },
  {
    game: 'FACEBOOK',
    name: '1,500 FB+Likes – $10.00',
    inGameAmount: 1500,
    usdtValue: '10.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/facebook-followers.jpg',
  },

  // INSTAGRAM FOLLOWERS
  {
    game: 'INSTAGRAM',
    name: '100 Followers – $4.00',
    inGameAmount: 100,
    usdtValue: '4.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },
  {
    game: 'INSTAGRAM',
    name: '300 Followers – $5.00',
    inGameAmount: 300,
    usdtValue: '5.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },
  {
    game: 'INSTAGRAM',
    name: '500 Followers – $6.00',
    inGameAmount: 500,
    usdtValue: '6.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },
  {
    game: 'INSTAGRAM',
    name: '1,000 Followers – $7.00',
    inGameAmount: 1000,
    usdtValue: '7.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },
  {
    game: 'INSTAGRAM',
    name: '1,500 Followers – $8.00',
    inGameAmount: 1500,
    usdtValue: '8.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },
  {
    game: 'INSTAGRAM',
    name: '2,000 Followers – $10.00',
    inGameAmount: 2000,
    usdtValue: '10.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },
  {
    game: 'INSTAGRAM',
    name: '5,000 Followers – $15.00',
    inGameAmount: 5000,
    usdtValue: '15.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },
  {
    game: 'INSTAGRAM',
    name: '10,000 Followers – $20.00',
    inGameAmount: 10000,
    usdtValue: '20.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/instagram-followers.jpg',
  },

  // NETFLIX
  {
    game: 'NETFLIX',
    name: 'Netflix 4K Ultra HD - 1 Month – $3.00',
    inGameAmount: 1,
    usdtValue: '3.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/netflix-logo.png',
  },

  // CANVA PRO
  {
    game: 'CANVA',
    name: 'Canva Pro Lifetime – $3.00',
    inGameAmount: 1,
    usdtValue: '3.00',
    image: 'https://b4uesports.com/wp-content/uploads/2026/03/canva.jpg',
  },
];

async function insertAllPackages() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🎮 Preparing to insert all gaming and social media packages...\n');

    let insertCount = 0;
    let skipCount = 0;

    // Insert Gaming Packages
    console.log('📦 Inserting Gaming Packages...');
    for (const pkg of gamingPackages) {
      const id = crypto.randomUUID();
      const now = new Date();

      // Check if package already exists
      const checkQuery = 'SELECT id FROM app_packages WHERE game = $1 AND name = $2 LIMIT 1';
      const checkResult = await pool.query(checkQuery, [pkg.game, pkg.name]);

      if (checkResult.rows.length > 0) {
        console.log(`  ⏭️  ${pkg.game} - ${pkg.name} (already exists)`);
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

      console.log(`  ✅ ${pkg.game} - ${pkg.name}`);
      insertCount++;
    }

    console.log(`\n📱 Inserting Social Media Packages...\n`);
    for (const pkg of socialMediaPackages) {
      const id = crypto.randomUUID();
      const now = new Date();

      // Check if package already exists
      const checkQuery = 'SELECT id FROM app_packages WHERE game = $1 AND name = $2 LIMIT 1';
      const checkResult = await pool.query(checkQuery, [pkg.game, pkg.name]);

      if (checkResult.rows.length > 0) {
        console.log(`  ⏭️  ${pkg.game} - ${pkg.name} (already exists)`);
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

      console.log(`  ✅ ${pkg.game} - ${pkg.name}`);
      insertCount++;
    }

    console.log(`\n📊 Summary: ${insertCount} new packages inserted, ${skipCount} already existed\n`);

    // Verify final counts
    const result = await pool.query('SELECT game, COUNT(*) as count FROM app_packages GROUP BY game ORDER BY game');
    console.log('📈 Final package counts by game:');
    result.rows.forEach(row => {
      console.log(`  ${row.game}: ${row.count}`);
    });

    const totalResult = await pool.query('SELECT COUNT(*) as count FROM app_packages');
    console.log(`\n✅ TOTAL PACKAGES: ${totalResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error inserting packages:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

insertAllPackages().then(() => {
  console.log('\n🎉 All packages inserted successfully!');
  process.exit(0);
});
