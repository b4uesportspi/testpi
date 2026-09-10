const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function removeDollarSigns() {
  try {
    console.log('💰 Removing $ symbols from all package names...');

    // Get all active packages
    const packages = await pool.query('SELECT id, name, game FROM app_packages WHERE is_active = true AND name LIKE \'%$%\' ORDER BY game, name');

    console.log('\n📋 Packages with $ symbols:');
    packages.rows.forEach(row => {
      console.log('  - ' + row.game + ': ' + row.name);
    });

    console.log('\n🔄 Updating package names...');
    let updatedCount = 0;

    for (const pkg of packages.rows) {
      const newName = pkg.name.replace(/\$/g, ''); // Remove all $ symbols
      await pool.query('UPDATE app_packages SET name = $1 WHERE id = $2', [newName, pkg.id]);
      console.log('Updated: "' + pkg.name + '" → "' + newName + '"');
      updatedCount++;
    }

    console.log('\n✅ Successfully updated ' + updatedCount + ' package names');
    console.log('💰 All $ symbols removed from package names');

    // Show a sample of updated packages
    console.log('\n📋 Sample of updated packages:');
    const sampleResult = await pool.query('SELECT game, name FROM app_packages WHERE is_active = true ORDER BY game, name LIMIT 10');
    sampleResult.rows.forEach(row => {
      console.log('  - ' + row.game + ': ' + row.name);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

removeDollarSigns();