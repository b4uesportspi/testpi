import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addCocPackages() {
  // Database connection with SSL support for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Check if COC packages already exist
    const existingCocPackages = await client.query(
      'SELECT * FROM packages WHERE game = $1',
      ['COC']
    );
    
    if (existingCocPackages.rows.length > 0) {
      console.log('COC packages already exist in the database');
      return;
    }
    
    // Create COC package
    const cocPackage = {
      game: 'COC',
      name: 'Gold Pass',
      inGameAmount: 1,
      usdtValue: '9.0000',
      image: '',
      isActive: true,
    };
    
    const result = await client.query(
      'INSERT INTO packages (id, game, name, in_game_amount, usdt_value, image, is_active, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
      [cocPackage.game, cocPackage.name, cocPackage.inGameAmount, cocPackage.usdtValue, cocPackage.image, cocPackage.isActive]
    );
    
    console.log('COC package created successfully:', result.rows[0]);
    
    // Verify the package was created
    const verifyResult = await client.query(
      'SELECT * FROM packages WHERE game = $1',
      ['COC']
    );
    
    console.log('COC packages in database:', verifyResult.rows);
    
  } catch (error) {
    console.error('Error adding COC packages:', error);
  } finally {
    await pool.end();
  }
}

// Run the function
addCocPackages();