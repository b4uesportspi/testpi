const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

async function cleanupPackages() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🧹 Cleaning up duplicate Canva and Netflix packages...\n');

    // Get all Netflix packages
    const netflixResult = await pool.query(
      "SELECT id, name, created_at FROM app_packages WHERE game = 'NETFLIX' ORDER BY created_at"
    );
    console.log(`📺 Found ${netflixResult.rows.length} Netflix packages:`);
    netflixResult.rows.forEach((pkg, i) => {
      console.log(`  ${i + 1}. ${pkg.name} (ID: ${pkg.id.substring(0, 8)}...)`);
    });

    // Get all Canva packages
    const canvaResult = await pool.query(
      "SELECT id, name, created_at FROM app_packages WHERE game = 'CANVA' ORDER BY created_at"
    );
    console.log(`\n🎨 Found ${canvaResult.rows.length} Canva packages:`);
    canvaResult.rows.forEach((pkg, i) => {
      console.log(`  ${i + 1}. ${pkg.name} (ID: ${pkg.id.substring(0, 8)}...)`);
    });

    // Keep the first (oldest) Netflix package, delete the rest
    if (netflixResult.rows.length > 1) {
      const idsToDelete = netflixResult.rows.slice(1).map(pkg => pkg.id);
      console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate Netflix packages...`);
      
      for (const id of idsToDelete) {
        await pool.query('DELETE FROM app_packages WHERE id = $1', [id]);
      }
      console.log(`✅ Deleted ${idsToDelete.length} Netflix packages`);
    }

    // Keep the first (oldest) Canva package, delete the rest
    if (canvaResult.rows.length > 1) {
      const idsToDelete = canvaResult.rows.slice(1).map(pkg => pkg.id);
      console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate Canva packages...`);
      
      for (const id of idsToDelete) {
        await pool.query('DELETE FROM app_packages WHERE id = $1', [id]);
      }
      console.log(`✅ Deleted ${idsToDelete.length} Canva packages`);
    }

    // Verify final counts
    const finalResult = await pool.query('SELECT game, COUNT(*) as count FROM app_packages GROUP BY game ORDER BY game');
    console.log('\n📊 Final package counts by game:');
    finalResult.rows.forEach(row => {
      console.log(`  ${row.game}: ${row.count}`);
    });

    const totalResult = await pool.query('SELECT COUNT(*) as count FROM app_packages');
    console.log(`\n✅ TOTAL PACKAGES: ${totalResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupPackages().then(() => {
  console.log('\n🎉 Cleanup completed successfully!');
  process.exit(0);
});
