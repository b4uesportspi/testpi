// Check referral codes data
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

async function checkReferralCodesData() {
  console.log('Checking referral codes data...');
  
  try {
    // Count total referral codes
    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM referral_codes;
    `);
    
    console.log('Total referral codes in database:', countResult.rows[0].count);
    
    // Get sample referral codes
    const sampleResult = await pool.query(`
      SELECT code, user_id, created_at 
      FROM referral_codes 
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    if (sampleResult.rows.length > 0) {
      console.log('\nSample referral codes:');
      sampleResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Code: ${row.code}, User ID: ${row.user_id}, Created: ${row.created_at}`);
      });
    } else {
      console.log('\nNo referral codes found in database');
    }
    
    // Check users without referral codes
    const usersWithoutCodesResult = await pool.query(`
      SELECT id, username, created_at 
      FROM app_users 
      WHERE id NOT IN (SELECT user_id FROM referral_codes)
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    if (usersWithoutCodesResult.rows.length > 0) {
      console.log('\nUsers without referral codes:');
      usersWithoutCodesResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Username: ${row.username}, ID: ${row.id}, Created: ${row.created_at}`);
      });
    } else {
      console.log('\nAll users have referral codes');
    }
    
    // Check the trigger function
    console.log('\nChecking trigger function...');
    const functionResult = await pool.query(`
      SELECT proname, provolatile, prorettype
      FROM pg_proc 
      WHERE proname = 'create_user_referral_code';
    `);
    
    if (functionResult.rows.length > 0) {
      console.log('✅ Trigger function exists');
      console.log('Function details:', functionResult.rows[0]);
    } else {
      console.log('❌ Trigger function does not exist');
    }
    
  } catch (error) {
    console.error('Error checking referral codes data:', error.message);
  } finally {
    await pool.end();
  }
}

checkReferralCodesData();