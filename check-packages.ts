import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkPackages() {
  // Database connection with SSL support for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Get all packages
    const result = await client.query(
      'SELECT id, game, name, in_game_amount, usdt_value, image, is_active, created_at FROM app_packages ORDER BY game, in_game_amount'
    );
    
    console.log('Current packages in database:');
    console.log('================================');
    
    if (result.rows.length === 0) {
      console.log('No packages found in database');
      return;
    }
    
    result.rows.forEach((pkg, index) => {
      console.log(`${index + 1}. ${pkg.game} - ${pkg.name}`);
      console.log(`   ID: ${pkg.id}`);
      console.log(`   In-game amount: ${pkg.in_game_amount}`);
      console.log(`   USDT value: $${pkg.usdt_value}`);
      console.log(`   Image: ${pkg.image}`);
      console.log(`   Active: ${pkg.is_active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${pkg.created_at}`);
      console.log('');
    });
    
    // Count packages by game
    const gameCounts: {[key: string]: number} = {};
    result.rows.forEach(pkg => {
      gameCounts[pkg.game] = (gameCounts[pkg.game] || 0) + 1;
    });
    
    console.log('Package count by game:');
    Object.entries(gameCounts).forEach(([game, count]) => {
      console.log(`  ${game}: ${count} packages`);
    });
    
  } catch (error) {
    console.error('Error checking packages:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
checkPackages();