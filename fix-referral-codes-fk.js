// Fix foreign key constraint on referral_codes table
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixForeignKeyConstraint() {
  console.log('Fixing foreign key constraint on referral_codes table...');
  
  try {
    // Check if the current foreign key constraint exists
    const fkCheck = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'referral_codes' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'fk_referral_codes_user';
    `);
    
    if (fkCheck.rows.length > 0) {
      console.log('Dropping existing foreign key constraint...');
      await pool.query(`
        ALTER TABLE referral_codes 
        DROP CONSTRAINT fk_referral_codes_user;
      `);
    }
    
    // Add the correct foreign key constraint
    console.log('Adding correct foreign key constraint...');
    await pool.query(`
      ALTER TABLE referral_codes 
      ADD CONSTRAINT fk_referral_codes_user 
        FOREIGN KEY (user_id) 
        REFERENCES app_users(id) 
        ON DELETE CASCADE;
    `);
    
    console.log('✅ Foreign key constraint fixed successfully');
    
  } catch (error) {
    console.error('Error fixing foreign key constraint:', error.message);
  } finally {
    await pool.end();
  }
}

fixForeignKeyConstraint();