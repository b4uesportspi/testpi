import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testPiPriceCalculation() {
  // Database connection with SSL support for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Get all active packages
    const result = await client.query(
      'SELECT id, name, game, in_game_amount, usdt_value, image, is_active, created_at, updated_at FROM packages WHERE is_active = true ORDER BY game, usdt_value ASC'
    );
    
    console.log('Packages fetched from database:');
    console.log('================================');
    
    if (result.rows.length === 0) {
      console.log('No packages found in database');
      return;
    }
    
    // Get current Pi price
    let piPrice = 0.035; // Default value
    try {
      const piPriceResult = await client.query('SELECT price FROM pi_price_history ORDER BY timestamp DESC LIMIT 1');
      if (piPriceResult.rows.length > 0) {
        piPrice = parseFloat(piPriceResult.rows[0].price);
      }
    } catch (priceError) {
      console.log('Could not fetch Pi price from database, using default');
    }
    
    console.log(`Current Pi price: $${piPrice}`);
    
    // Calculate pi_price for each package and display
    result.rows.forEach((pkg, index) => {
      const usdtValue = parseFloat(pkg.usdt_value);
      const calculatedPiPrice = usdtValue / piPrice;
      
      console.log(`${index + 1}. ${pkg.game} - ${pkg.name}`);
      console.log(`   USDT value: $${pkg.usdt_value}`);
      console.log(`   Pi price: ${calculatedPiPrice.toFixed(4)} π`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error testing Pi price calculation:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
testPiPriceCalculation();