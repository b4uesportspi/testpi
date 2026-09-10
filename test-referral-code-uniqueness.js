// Test referral code uniqueness
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

async function testReferralCodeUniqueness() {
  console.log('Testing referral code uniqueness...');
  
  try {
    // Create multiple test users
    const testUsers = [];
    const referralCodes = [];
    
    console.log('Creating 5 test users...');
    for (let i = 0; i < 5; i++) {
      // Create a test user
      const userResult = await pool.query(`
        INSERT INTO app_users (pi_uid, username, email, phone, country, language, wallet_address, is_active, is_profile_verified)
        VALUES ('test_pi_uid_' || EXTRACT(EPOCH FROM NOW())::text || '_' || $1, 'testuser' || $1, 'test' || $1 || '@example.com', '1234567890', 'Test Country', 'en', 'test_wallet', true, false)
        RETURNING id;
      `, [i]);
      
      const userId = userResult.rows[0].id;
      testUsers.push(userId);
      
      // Get the referral code for this user
      const referralCodeResult = await pool.query(`
        SELECT code FROM referral_codes WHERE user_id = $1;
      `, [userId]);
      
      if (referralCodeResult.rows.length > 0) {
        const code = referralCodeResult.rows[0].code;
        referralCodes.push(code);
        console.log(`  User ${i+1}: ${code}`);
      } else {
        console.log(`  User ${i+1}: No referral code generated`);
      }
    }
    
    // Check for uniqueness
    const uniqueCodes = new Set(referralCodes);
    if (uniqueCodes.size === referralCodes.length) {
      console.log('✅ All referral codes are unique');
    } else {
      console.log('❌ Duplicate referral codes found');
    }
    
    console.log(`Generated ${referralCodes.length} codes:`, referralCodes);
    
    // Clean up test users
    console.log('Cleaning up test users...');
    for (const userId of testUsers) {
      await pool.query('DELETE FROM app_users WHERE id = $1;', [userId]);
      await pool.query('DELETE FROM referral_codes WHERE user_id = $1;', [userId]);
    }
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('Error testing referral code uniqueness:', error.message);
  } finally {
    await pool.end();
  }
}

testReferralCodeUniqueness();