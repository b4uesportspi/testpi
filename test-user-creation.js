// Test user creation to see if referral code is generated
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

async function testUserCreation() {
  console.log('Testing user creation with referral code generation...');
  
  try {
    // Create a test user
    console.log('Creating test user...');
    const userResult = await pool.query(`
      INSERT INTO app_users (pi_uid, username, email, phone, country, language, wallet_address, is_active, is_profile_verified)
      VALUES ('test_pi_uid_' || EXTRACT(EPOCH FROM NOW())::text, 'testuser_referral', 'test_referral@example.com', '1234567890', 'Test Country', 'en', 'test_wallet_referral', true, false)
      RETURNING id, username;
    `);
    
    const userId = userResult.rows[0].id;
    const username = userResult.rows[0].username;
    console.log('✅ Test user created:', username, userId);
    
    // Check if a referral code was generated
    console.log('Checking for referral code...');
    const referralCodeResult = await pool.query(`
      SELECT code, created_at FROM referral_codes WHERE user_id = $1;
    `, [userId]);
    
    if (referralCodeResult.rows.length > 0) {
      console.log('✅ Referral code generated successfully:', referralCodeResult.rows[0].code);
      console.log('   Created at:', referralCodeResult.rows[0].created_at);
    } else {
      console.log('❌ No referral code generated for the new user');
      
      // Check what's in the users table
      console.log('Checking user data...');
      const userDataResult = await pool.query(`
        SELECT id, username, referred_by FROM app_users WHERE id = $1;
      `, [userId]);
      
      console.log('User data:', userDataResult.rows[0]);
    }
    
    // Clean up test user
    console.log('Cleaning up test user...');
    await pool.query('DELETE FROM app_users WHERE id = $1;', [userId]);
    await pool.query('DELETE FROM referral_codes WHERE user_id = $1;', [userId]);
    console.log('✅ Test user cleaned up');
    
  } catch (error) {
    console.error('Error during user creation test:', error.message);
  } finally {
    await pool.end();
  }
}

testUserCreation();