// Check users table structure
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

async function checkUsersTable() {
  console.log('Checking users table structure...');
  
  try {
    // Check columns in app_users table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'app_users'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in app_users table:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}, ${row.is_nullable})`);
    });
    
    // Check if referred_by column exists
    const referredByResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'app_users' AND column_name = 'referred_by';
    `);
    
    if (referredByResult.rows.length > 0) {
      console.log('✅ referred_by column exists in app_users table');
    } else {
      console.log('❌ referred_by column does not exist in app_users table');
    }
    
    // Check if referral_code column exists
    const referralCodeResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'app_users' AND column_name = 'referral_code';
    `);
    
    if (referralCodeResult.rows.length > 0) {
      console.log('✅ referral_code column exists in app_users table');
    } else {
      console.log('❌ referral_code column does not exist in app_users table');
    }
    
  } catch (error) {
    console.error('Error checking users table:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();