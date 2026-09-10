import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function cleanupPackages() {
  // Database connection with SSL support for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    console.log('Starting package cleanup...');
    
    // 1. Remove duplicate PUBG 60 UC packages, keeping only the oldest one
    console.log('Checking for duplicate PUBG 60 UC packages...');
    
    const duplicatePackages = await client.query(
      `SELECT id, created_at 
       FROM app_packages 
       WHERE name = '60 UC' AND game = 'PUBG' 
       ORDER BY created_at ASC`
    );
    
    if (duplicatePackages.rows.length > 1) {
      console.log(`Found ${duplicatePackages.rows.length} duplicate PUBG 60 UC packages. Removing extras...`);
      
      // Keep the first one (oldest), delete the rest
      const packagesToDelete = duplicatePackages.rows.slice(1);
      for (const pkg of packagesToDelete) {
        await client.query('DELETE FROM app_packages WHERE id = $1', [pkg.id]);
        console.log(`  Deleted duplicate package: ${pkg.id}`);
      }
    } else {
      console.log('No duplicate PUBG 60 UC packages found');
    }
    
    // 2. Verify and correct MLBB package pricing
    console.log('Verifying MLBB package pricing...');
    
    const mlbbPackages = await client.query(
      'SELECT id, name, in_game_amount, usdt_value FROM app_packages WHERE game = $1 ORDER BY in_game_amount',
      ['MLBB']
    );
    
    // Correct pricing for MLBB packages
    const correctMlbbPricing: {[key: number]: string} = {
      56: '1.5000',    // 56 Diamonds
      278: '6.0000',   // 278 Diamonds
      571: '11.0000',  // 571 Diamonds
      1783: '33.0000', // 1783 Diamonds
      3005: '52.0000', // 3005 Diamonds
      6012: '99.0000', // 6012 Diamonds
      12000: '200.0000' // 12000 Diamonds
    };
    
    for (const pkg of mlbbPackages.rows) {
      const correctPrice = correctMlbbPricing[pkg.in_game_amount];
      if (correctPrice && pkg.usdt_value !== correctPrice) {
        await client.query(
          'UPDATE app_packages SET usdt_value = $1, updated_at = NOW() WHERE id = $2',
          [correctPrice, pkg.id]
        );
        console.log(`  Updated ${pkg.name}: $${pkg.usdt_value} -> $${correctPrice}`);
      }
    }
    
    // 3. Verify and correct PUBG package pricing
    console.log('Verifying PUBG package pricing...');
    
    const pubgPackages = await client.query(
      'SELECT id, name, usdt_value FROM app_packages WHERE game = $1 ORDER BY in_game_amount',
      ['PUBG']
    );
    
    // Correct pricing for PUBG packages
    const correctPubgPricing: {[key: string]: string} = {
      '0.06 UC': '0.0010',
      '60 UC': '1.5000',
      '325 UC': '6.5000',
      '660 UC': '12.0000',
      '1800 UC': '25.0000',
      '3850 UC': '49.0000',
      '8100 UC': '96.0000',
      '16200 UC': '186.0000',
      '24300 UC': '278.0000',
      '32400 UC': '369.0000',
      '40500 UC': '459.0000'
    };
    
    for (const pkg of pubgPackages.rows) {
      const correctPrice = correctPubgPricing[pkg.name];
      if (correctPrice && pkg.usdt_value !== correctPrice) {
        await client.query(
          'UPDATE app_packages SET usdt_value = $1, updated_at = NOW() WHERE id = $2',
          [correctPrice, pkg.id]
        );
        console.log(`  Updated ${pkg.name}: $${pkg.usdt_value} -> $${correctPrice}`);
      }
    }
    
    // 4. Verify COC package pricing
    console.log('Verifying COC package pricing...');
    
    const cocPackage = await client.query(
      'SELECT id, usdt_value FROM app_packages WHERE game = $1 AND name = $2',
      ['COC', 'Gold Pass']
    );
    
    if (cocPackage.rows.length > 0) {
      const pkg = cocPackage.rows[0];
      const correctPrice = '9.0000';
      if (pkg.usdt_value !== correctPrice) {
        await client.query(
          'UPDATE app_packages SET usdt_value = $1, updated_at = NOW() WHERE id = $2',
          [correctPrice, pkg.id]
        );
        console.log(`  Updated COC Gold Pass: $${pkg.usdt_value} -> $${correctPrice}`);
      }
    }
    
    // 5. Final verification
    console.log('\nFinal package verification:');
    const finalPackages = await client.query(
      `SELECT game, COUNT(*) as count, 
              STRING_AGG(name || ' ($' || usdt_value || ')', ', ') as packages
       FROM app_packages 
       GROUP BY game 
       ORDER BY game`
    );
    
    finalPackages.rows.forEach(row => {
      console.log(`  ${row.game}: ${row.count} packages`);
      console.log(`    ${row.packages}`);
    });
    
    console.log('\nPackage cleanup and pricing verification completed successfully!');
    
  } catch (error) {
    console.error('Error during package cleanup:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
cleanupPackages();