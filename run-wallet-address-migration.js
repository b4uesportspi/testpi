import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function runWalletAddressMigration() {
  console.log('Running wallet address migration...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    
    // Run the migration to make wallet_address nullable
    console.log('\\nMaking wallet_address column nullable...');
    await pool.query(`
      ALTER TABLE "app_users" ALTER COLUMN "wallet_address" DROP NOT NULL
    `);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the change
    console.log('\\nVerifying the change...');
    const columnCheck = await pool.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'app_users' AND column_name = 'wallet_address'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ wallet_address column status:', columnCheck.rows[0]);
    } else {
      console.log('❌ Could not verify column status');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the migration
runWalletAddressMigration();