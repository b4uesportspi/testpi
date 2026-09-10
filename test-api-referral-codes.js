// Test API endpoints for referral codes
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

// Simulate the getUserReferralCode function from the API
async function getUserReferralCode(userId) {
  try {
    const result = await pool.query(
      'SELECT code FROM referral_codes WHERE user_id = $1',
      [userId]
    );
    
    return result.rows.length > 0 ? result.rows[0].code : undefined;
  } catch (error) {
    console.error('Error fetching referral code for user:', userId, error);
    return undefined;
  }
}

// Simulate the getUserByReferralCode function from the API
async function getUserByReferralCode(referralCode) {
  try {
    const result = await pool.query(`
      SELECT u.* 
      FROM referral_codes r
      JOIN app_users u ON r.user_id = u.id
      WHERE r.code = $1
    `, [referralCode]);
    
    return result.rows.length > 0 ? result.rows[0] : undefined;
  } catch (error) {
    console.error('Error fetching user by referral code:', referralCode, error);
    return undefined;
  }
}

async function testApiReferralCodes() {
  console.log('=== Testing API Referral Code Functions ===\n');
  
  try {
    // Create a test user
    console.log('Creating test user...');
    const userResult = await pool.query(`
      INSERT INTO app_users (pi_uid, username, email, phone, country, language, wallet_address, is_active, is_profile_verified)
      VALUES ('api_test_' || EXTRACT(EPOCH FROM NOW())::text, 'api_test_user', 'api_test@example.com', '1234567890', 'Test Country', 'en', 'test_wallet', true, false)
      RETURNING id;
    `);
    
    const userId = userResult.rows[0].id;
    console.log('✅ Test user created with ID:', userId);
    
    // Get the referral code using the API function
    console.log('\nTesting getUserReferralCode API function...');
    const referralCode = await getUserReferralCode(userId);
    
    if (referralCode) {
      console.log('✅ getUserReferralCode works correctly:', referralCode);
    } else {
      console.log('❌ getUserReferralCode failed');
    }
    
    // Test getUserByReferralCode API function
    console.log('\nTesting getUserByReferralCode API function...');
    const userByCode = await getUserByReferralCode(referralCode);
    
    if (userByCode && userByCode.id === userId) {
      console.log('✅ getUserByReferralCode works correctly');
      console.log('   Found user:', userByCode.username);
    } else {
      console.log('❌ getUserByReferralCode failed');
    }
    
    // Test with invalid referral code
    console.log('\nTesting getUserByReferralCode with invalid code...');
    const invalidUser = await getUserByReferralCode('INVALID_CODE');
    
    if (!invalidUser) {
      console.log('✅ Correctly handled invalid referral code');
    } else {
      console.log('❌ Failed to handle invalid referral code');
    }
    
    console.log('\n=== API Tests Completed ===');
    
    // Clean up
    console.log('\nCleaning up test data...');
    await pool.query('DELETE FROM app_users WHERE id = $1;', [userId]);
    await pool.query('DELETE FROM referral_codes WHERE user_id = $1;', [userId]);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('Error during API referral code tests:', error.message);
  } finally {
    await pool.end();
  }
}

testApiReferralCodes();