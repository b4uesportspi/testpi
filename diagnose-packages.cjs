const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

async function diagnosePackages() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔍 Starting package diagnosis...\n');

    // Get all packages
    const result = await pool.query('SELECT * FROM app_packages ORDER BY game, usdt_value');
    const allPackages = result.rows;
    
    console.log('📊 Total packages in database:', allPackages.length);
    console.log('');

    // Get all game types
    const gameTypes = new Set();
    allPackages.forEach(pkg => {
      if (pkg.game) {
        gameTypes.add(pkg.game);
      }
    });
    const sortedGameTypes = Array.from(gameTypes).sort();
    console.log('🎮 All game types:', sortedGameTypes);
    console.log('');

    // Count packages by game type
    console.log('📈 Package count by game type:');
    sortedGameTypes.forEach(game => {
      const count = allPackages.filter(p => p.game === game).length;
      const activeCount = allPackages.filter(p => p.game === game && p.is_active === true).length;
      const inactiveCount = allPackages.filter(p => p.game === game && p.is_active === false).length;
      console.log(`  ${game}: ${count} total (${activeCount} active, ${inactiveCount} inactive)`);
    });
    console.log('');

    // Check TikTok packages specifically
    console.log('🎵 TikTok Packages Detail:');
    const tiktokPackages = allPackages.filter(p => p.game && p.game.includes('TIKTOK'));
    console.log(`  Total TikTok packages: ${tiktokPackages.length}`);
    tiktokPackages.forEach(pkg => {
      console.log(`    - ID: ${pkg.id}`);
      console.log(`      Name: ${pkg.name}`);
      console.log(`      Game: "${pkg.game}" (type: ${typeof pkg.game}, length: ${pkg.game ? pkg.game.length : 'null'})`);
      console.log(`      Active: ${pkg.is_active}`);
      console.log(`      USD Value: ${pkg.usdt_value}`);
      console.log('');
    });

    // Check for null/undefined game values
    const nullGamePackages = allPackages.filter(p => !p.game);
    console.log('⚠️  Packages with null/undefined game:', nullGamePackages.length);
    if (nullGamePackages.length > 0) {
      nullGamePackages.forEach(pkg => {
        console.log(`  - ${pkg.id}: ${pkg.name}`);
      });
    }
    console.log('');

    // Check isActive status
    const activePackages = allPackages.filter(p => p.is_active === true);
    const inactivePackages = allPackages.filter(p => p.is_active === false);
    console.log('✅ Active packages:', activePackages.length);
    console.log('❌ Inactive packages:', inactivePackages.length);
    console.log('');

    // TikTok Coins specifically
    const tiktokCoins = allPackages.filter(p => p.game === 'TIKTOK_COINS');
    const tiktokCoinsActive = allPackages.filter(p => p.game === 'TIKTOK_COINS' && p.is_active === true);
    console.log('🎯 TIKTOK_COINS specifically:');
    console.log(`  Total: ${tiktokCoins.length}`);
    console.log(`  Active: ${tiktokCoinsActive.length}`);
    console.log(`  Inactive: ${tiktokCoins.length - tiktokCoinsActive.length}`);
    if (tiktokCoins.length > 0) {
      console.log('  Details:');
      tiktokCoins.forEach(pkg => {
        console.log(`    - ${pkg.name} (${pkg.usdt_value} USDT) - Active: ${pkg.is_active}`);
      });
    } else {
      console.log('  ❌ NO TIKTOK_COINS FOUND!');
    }

    console.log('\n✨ Diagnosis complete!');
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

diagnosePackages().then(() => {
  process.exit(0);
});
