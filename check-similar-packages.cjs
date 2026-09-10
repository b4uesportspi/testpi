const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function checkSimilarPackages() {
  console.log('🔍 Checking for packages with similar names...');

  try {
    const result = await pool.query('SELECT * FROM app_packages WHERE is_active = true ORDER BY game, name');

    console.log(`📊 Found ${result.rows.length} active packages`);

    // Group by game
    const gameGroups = {};
    result.rows.forEach(pkg => {
      if (!gameGroups[pkg.game]) {
        gameGroups[pkg.game] = [];
      }
      gameGroups[pkg.game].push(pkg);
    });

    console.log('\n🎮 Packages by game:');
    Object.keys(gameGroups).forEach(game => {
      console.log(`\n${game}: ${gameGroups[game].length} packages`);
      gameGroups[game].forEach(pkg => {
        console.log(`  - ${pkg.name} (${pkg.in_game_amount}, $${pkg.usdt_value})`);
      });
    });

    // Check for potential duplicates (same name within same game)
    console.log('\n🔍 Checking for exact name duplicates within games:');
    let hasDuplicates = false;

    Object.keys(gameGroups).forEach(game => {
      const nameCount = {};
      gameGroups[game].forEach(pkg => {
        if (!nameCount[pkg.name]) {
          nameCount[pkg.name] = [];
        }
        nameCount[pkg.name].push(pkg);
      });

      Object.keys(nameCount).forEach(name => {
        if (nameCount[name].length > 1) {
          hasDuplicates = true;
          console.log(`❌ DUPLICATE in ${game}: "${name}" appears ${nameCount[name].length} times`);
          nameCount[name].forEach(pkg => {
            console.log(`   - ID: ${pkg.id}, Amount: ${pkg.in_game_amount}, Price: $${pkg.usdt_value}`);
          });
        }
      });
    });

    if (!hasDuplicates) {
      console.log('✅ No exact name duplicates found within games');
    }

    // Check for similar names (case-insensitive)
    console.log('\n🔍 Checking for similar names (case-insensitive):');
    Object.keys(gameGroups).forEach(game => {
      const names = gameGroups[game].map(pkg => pkg.name.toLowerCase());
      const uniqueNames = [...new Set(names)];

      if (names.length !== uniqueNames.length) {
        console.log(`⚠️  Potential case differences in ${game}:`);
        const nameGroups = {};
        gameGroups[game].forEach(pkg => {
          const lowerName = pkg.name.toLowerCase();
          if (!nameGroups[lowerName]) {
            nameGroups[lowerName] = [];
          }
          nameGroups[lowerName].push(pkg);
        });

        Object.keys(nameGroups).forEach(lowerName => {
          if (nameGroups[lowerName].length > 1) {
            console.log(`   "${lowerName}" variations:`);
            nameGroups[lowerName].forEach(pkg => {
              console.log(`     - "${pkg.name}" (ID: ${pkg.id})`);
            });
          }
        });
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSimilarPackages();