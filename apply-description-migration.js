import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyDescriptionMigration() {
  // Database connection with SSL support for Supabase
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '002_add_description_to_packages.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration to add description column to packages table...');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('The description column has been added to the packages table.');
    
    // Test if the column works
    const testResult = await client.query(
      'SELECT id, name, description, game, in_game_amount, usdt_value, image, is_active FROM packages WHERE is_active = true ORDER BY game, usdt_value ASC LIMIT 1'
    );
    
    console.log('✅ Description column is accessible and working correctly');
    console.log('Sample package with description:');
    console.log(testResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the function
applyDescriptionMigration();