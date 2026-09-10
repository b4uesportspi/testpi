import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDescriptionColumn() {
  // Database connection with SSL support for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Test if description column exists by running a query that includes it
    const result = await client.query(
      'SELECT id, name, description, game, in_game_amount, usdt_value, image, is_active FROM packages WHERE is_active = true ORDER BY game, usdt_value ASC LIMIT 1'
    );
    
    console.log('✅ Description column exists and is accessible');
    console.log('Sample package with description:');
    console.log(result.rows[0]);
    
    // Test inserting a package with description
    const insertResult = await client.query(
      `INSERT INTO packages (id, game, name, description, in_game_amount, usdt_value, image, is_active, created_at, updated_at) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING id, name, description`,
      ['TEST', 'Test Package', 'This is a test package description', 100, '1.99', '', true]
    );
    
    console.log('✅ Successfully inserted package with description:');
    console.log(insertResult.rows[0]);
    
    // Clean up - delete the test package
    await client.query('DELETE FROM packages WHERE id = $1', [insertResult.rows[0].id]);
    console.log('✅ Cleaned up test package');
    
  } catch (error) {
    console.error('❌ Error testing description column:', error.message);
    
    // Check if it's specifically a column error
    if (error.message.includes('description')) {
      console.log('The description column may not exist yet. Please run the migration.');
    }
  } finally {
    await pool.end();
  }
}

// Run the function
testDescriptionColumn();