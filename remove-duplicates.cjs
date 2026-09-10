const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function removeDuplicatePackages() {
  console.log('🧹 Removing duplicate packages, keeping the best version...');

  try {
    // Get all active packages
    const result = await pool.query('SELECT * FROM app_packages WHERE is_active = true ORDER BY game, in_game_amount, usdt_value, created_at');

    console.log(`📊 Found ${result.rows.length} active packages to analyze`);

    // Group packages by game and amount+price combination
    const packageGroups = {};
    result.rows.forEach(pkg => {
      const key = `${pkg.game}|${pkg.in_game_amount}|${pkg.usdt_value}`;
      if (!packageGroups[key]) {
        packageGroups[key] = [];
      }
      packageGroups[key].push(pkg);
    });

    console.log('\n🔍 Analyzing package groups for duplicates...');

    let totalDuplicates = 0;
    const packagesToDelete = [];

    Object.keys(packageGroups).forEach(key => {
      const group = packageGroups[key];
      if (group.length > 1) {
        console.log(`\n📦 Group ${key}: ${group.length} packages`);
        group.forEach(pkg => {
          console.log(`   - ID: ${pkg.id}, Name: "${pkg.name}", Created: ${pkg.created_at}`);
        });

        // Decide which one to keep
        // Priority: 1. Name with pricing format (contains " – $"), 2. Newest created
        let keepPackage = group[0];

        for (const pkg of group) {
          if (pkg.name.includes(' – $')) {
            // Found one with pricing in name, this is preferred
            keepPackage = pkg;
            break;
          } else if (new Date(pkg.created_at) > new Date(keepPackage.created_at)) {
            // Keep the newer one if no pricing format found
            keepPackage = pkg;
          }
        }

        console.log(`   ✅ KEEPING: ID ${keepPackage.id} - "${keepPackage.name}"`);

        // Mark others for deletion
        group.forEach(pkg => {
          if (pkg.id !== keepPackage.id) {
            packagesToDelete.push(pkg);
            console.log(`   🗑️  TO DELETE: ID ${pkg.id} - "${pkg.name}"`);
          }
        });

        totalDuplicates += group.length - 1;
      }
    });

    console.log(`\n📈 Summary: Found ${totalDuplicates} duplicate packages to remove`);

    if (totalDuplicates === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    // Confirm before deletion
    console.log('\n⚠️  This will permanently delete the duplicate packages.');
    console.log('Packages to be deleted:');
    packagesToDelete.forEach(pkg => {
      console.log(`   - ${pkg.game}: "${pkg.name}" (ID: ${pkg.id})`);
    });

    // Actually delete the duplicates
    console.log('\n🗑️  Deleting duplicate packages...');
    for (const pkg of packagesToDelete) {
      await pool.query('DELETE FROM app_packages WHERE id = $1', [pkg.id]);
      console.log(`   Deleted: ${pkg.game} - "${pkg.name}" (ID: ${pkg.id})`);
    }

    console.log(`\n✅ Successfully removed ${totalDuplicates} duplicate packages!`);

    // Show final count
    const finalResult = await pool.query('SELECT COUNT(*) as count FROM app_packages WHERE is_active = true');
    console.log(`📊 Final active package count: ${finalResult.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

removeDuplicatePackages();