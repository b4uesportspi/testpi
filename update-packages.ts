import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updatePackages() {
  // Database connection with SSL support for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // 1. Remove duplicate PUBG 60 UC packages, keeping only one
    console.log('Checking for duplicate packages...');
    
    const duplicatePackages = await client.query(
      `SELECT id, game, name, in_game_amount, usdt_value, created_at 
       FROM packages 
       WHERE name = '60 UC' AND game = 'PUBG' 
       ORDER BY created_at ASC`
    );
    
    if (duplicatePackages.rows.length > 1) {
      console.log(`Found ${duplicatePackages.rows.length} duplicate PUBG 60 UC packages. Removing extras...`);
      
      // Keep the first one (oldest), delete the rest
      const packagesToDelete = duplicatePackages.rows.slice(1);
      for (const pkg of packagesToDelete) {
        await client.query('DELETE FROM packages WHERE id = $1', [pkg.id]);
        console.log(`Deleted duplicate package: ${pkg.id}`);
      }
    }
    
    // 2. Check if we have all standard MLBB packages
    console.log('Checking MLBB packages...');
    
    const mlbbPackages = await client.query(
      'SELECT name, in_game_amount, usdt_value FROM packages WHERE game = $1 ORDER BY in_game_amount',
      ['MLBB']
    );
    
    // Standard MLBB packages (based on common offerings)
    const standardMlbbPackages = [
      { name: '56 Diamonds', inGameAmount: 56, usdtValue: '1.5000' },
      { name: '112 Diamonds', inGameAmount: 112, usdtValue: '3.0000' },
      { name: '224 Diamonds', inGameAmount: 224, usdtValue: '6.0000' },
      { name: '560 Diamonds', inGameAmount: 560, usdtValue: '15.0000' },
      { name: '1120 Diamonds', inGameAmount: 1120, usdtValue: '30.0000' },
      { name: '2240 Diamonds', inGameAmount: 2240, usdtValue: '60.0000' },
      { name: '5600 Diamonds', inGameAmount: 5600, usdtValue: '150.0000' }
    ];
    
    // Check what's missing
    const existingAmounts = mlbbPackages.rows.map(p => p.in_game_amount);
    const missingPackages = standardMlbbPackages.filter(
      pkg => !existingAmounts.includes(pkg.inGameAmount)
    );
    
    if (missingPackages.length > 0) {
      console.log(`Adding ${missingPackages.length} missing MLBB packages...`);
      
      for (const pkg of missingPackages) {
        const result = await client.query(
          `INSERT INTO packages 
           (id, game, name, in_game_amount, usdt_value, image, is_active, created_at, updated_at) 
           VALUES 
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) 
           RETURNING *`,
          [
            'MLBB',
            pkg.name,
            pkg.inGameAmount,
            pkg.usdtValue,
            'https://b4uesports.com/wp-content/uploads/2025/04/1000077486.png',
            true
          ]
        );
        console.log(`Added MLBB package: ${result.rows[0].name} (${result.rows[0].in_game_amount} Diamonds)`);
      }
    } else {
      console.log('All standard MLBB packages are present');
    }
    
    // 3. Update USDT values to ensure they're accurate
    console.log('Updating package prices to ensure accuracy...');
    
    // Standard pricing for PUBG (based on common market rates)
    const pubgPricing = [
      // { name: '0.06 UC', usdtValue: '0.0010' },
      { name: '60 UC', usdtValue: '1.5000' },
      { name: '325 UC', usdtValue: '6.5000' },
      { name: '660 UC', usdtValue: '12.0000' },
      { name: '1800 UC', usdtValue: '25.0000' },
      { name: '3850 UC', usdtValue: '49.0000' },
      { name: '8100 UC', usdtValue: '96.0000' },
      { name: '16200 UC', usdtValue: '186.0000' },
      { name: '24300 UC', usdtValue: '278.0000' },
      { name: '32400 UC', usdtValue: '369.0000' },
      { name: '40500 UC', usdtValue: '459.0000' }
    ];
    
    for (const pkg of pubgPricing) {
      await client.query(
        'UPDATE packages SET usdt_value = $1, updated_at = NOW() WHERE game = $2 AND name = $3',
        [pkg.usdtValue, 'PUBG', pkg.name]
      );
    }
    
    // Standard pricing for MLBB
    const mlbbPricing = [
      { name: '56 Diamonds', usdtValue: '1.5000' },
      { name: '112 Diamonds', usdtValue: '3.0000' },
      { name: '224 Diamonds', usdtValue: '6.0000' },
      { name: '560 Diamonds', usdtValue: '15.0000' },
      { name: '1120 Diamonds', usdtValue: '30.0000' },
      { name: '2240 Diamonds', usdtValue: '60.0000' },
      { name: '5600 Diamonds', usdtValue: '150.0000' }
    ];
    
    for (const pkg of mlbbPricing) {
      await client.query(
        'UPDATE packages SET usdt_value = $1, updated_at = NOW() WHERE game = $2 AND name = $3',
        [pkg.usdtValue, 'MLBB', pkg.name]
      );
    }
    
    // COC pricing
    await client.query(
      'UPDATE packages SET usdt_value = $1, updated_at = NOW() WHERE game = $2 AND name = $3',
      ['9.0000', 'COC', 'Gold Pass']
    );
    
    console.log('Package prices updated successfully');
    
    // 4. Final verification
    console.log('\nFinal package count:');
    const finalCount = await client.query('SELECT game, COUNT(*) as count FROM packages GROUP BY game');
    finalCount.rows.forEach(row => {
      console.log(`  ${row.game}: ${row.count} packages`);
    });
    
    console.log('\nUpdate completed successfully!');
    
  } catch (error) {
    console.error('Error updating packages:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
updatePackages();