// Test script to check if referral codes are being fetched correctly
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

async function testReferralCodeDisplay() {
  console.log('Testing referral code display...');
  
  try {
    // Get a sample user
    const usersResult = await pool.query(`
      SELECT id, username FROM app_users 
      LIMIT 1;
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('No users found in the database');
      return;
    }
    
    const user = usersResult.rows[0];
    console.log('Testing with user:', user.username, user.id);
    
    // Check if user has a referral code in the referral_codes table
    const referralCodeResult = await pool.query(`
      SELECT code FROM referral_codes 
      WHERE user_id = $1;
    `, [user.id]);
    
    if (referralCodeResult.rows.length > 0) {
      console.log('✅ Referral code found in referral_codes table:', referralCodeResult.rows[0].code);
    } else {
      console.log('❌ No referral code found for user in referral_codes table');
      
      // Check if there's a trigger to create referral codes
      const triggerResult = await pool.query(`
        SELECT tgname 
        FROM pg_trigger 
        WHERE tgname = 'trigger_create_user_referral_code';
      `);
      
      if (triggerResult.rows.length > 0) {
        console.log('✅ Referral code trigger exists');
      } else {
        console.log('❌ Referral code trigger does not exist');
      }
    }
    
    // Test the getUserReferralCode function logic
    console.log('\nTesting getUserReferralCode function logic...');
    const testResult = await pool.query(
      'SELECT code FROM referral_codes WHERE user_id = $1',
      [user.id]
    );
    
    const referralCode = testResult.rows.length > 0 ? testResult.rows[0].code : undefined;
    console.log('Function would return:', referralCode);
    
  } catch (error) {
    console.error('Error during referral code test:', error.message);
  } finally {
    await pool.end();
  }
}

testReferralCodeDisplay();