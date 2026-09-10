const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
});

async function updateTiktokViews() {
  try {
    console.log('🔄 Updating TikTok Views packages...');

    // Define the packages that should exist for TikTok Monetization Views
    const requiredPackages = [
      { amount: 5000, price: 10.00, name: '5,000 Views – 10.00' },
      { amount: 10000, price: 20.00, name: '10,000 Views – 20.00' },
      { amount: 20000, price: 40.00, name: '20,000 Views – 40.00' },
      { amount: 50000, price: 100.00, name: '50,000 Views – 100.00' },
      { amount: 100000, price: 200.00, name: '100,000 Views – 200.00' }
    ];

    const packageImage = 'https://b4uesports.com/wp-content/uploads/2025/04/1000077314.png';

    // First, deactivate packages that are not in the required list
    console.log('\n🗑️  Removing unwanted packages...');
    const amountsToKeep = requiredPackages.map(p => p.amount);
    const deleteResult = await pool.query('UPDATE app_packages SET is_active = false WHERE game = $1 AND in_game_amount != ALL($2)', ['TIKTOK_VIEWS', amountsToKeep]);
    console.log('Deactivated ' + deleteResult.rowCount + ' unwanted packages');

    // Now update/ensure all required packages exist with correct data
    console.log('\n✅ Ensuring all required packages exist with correct data...');
    let updatedCount = 0;

    for (const pkg of requiredPackages) {
      // Check if package exists
      const existing = await pool.query('SELECT id FROM app_packages WHERE game = $1 AND in_game_amount = $2 AND is_active = true', ['TIKTOK_VIEWS', pkg.amount]);

      if (existing.rows.length > 0) {
        // Update existing package
        await pool.query('UPDATE app_packages SET name = $1, usdt_value = $2, image = $3 WHERE id = $4',
          [pkg.name, pkg.price, packageImage, existing.rows[0].id]);
        console.log('Updated: ' + pkg.name);
      } else {
        // Insert new package
        await pool.query('INSERT INTO app_packages (game, name, in_game_amount, usdt_value, image, is_active) VALUES ($1, $2, $3, $4, $5, true)',
          ['TIKTOK_VIEWS', pkg.name, pkg.amount, pkg.price, packageImage]);
        console.log('Created: ' + pkg.name);
      }
      updatedCount++;
    }

    console.log('\n📋 Final TikTok Views packages:');
    const finalResult = await pool.query('SELECT name, in_game_amount, usdt_value, image FROM app_packages WHERE game = $1 AND is_active = true ORDER BY in_game_amount', ['TIKTOK_VIEWS']);
    finalResult.rows.forEach(row => {
      console.log('  - ' + row.name + ' (' + row.in_game_amount + ' views, ' + row.usdt_value + ' USD)');
    });

    console.log('\n✅ Successfully updated TikTok Views packages');
    console.log('📊 Total active packages: ' + finalResult.rows.length);
    console.log('🖼️  All packages use image: ' + packageImage);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

updateTiktokViews();