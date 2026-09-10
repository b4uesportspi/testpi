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

async function testApiEndpoints() {
  console.log('=== Testing API Endpoints for Referral Codes ===\n');
  
  try {
    // Get a sample user with their referral code
    console.log('Testing profile endpoint logic...');
    const userResult = await pool.query(`
      SELECT id, username, email, referred_by
      FROM app_users
      LIMIT 1;
    `);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`User: ${user.username} (ID: ${user.id})`);
      console.log(`Referred by: ${user.referred_by || 'None'}`);
      
      // Test the referral code fetching
      const referralCode = await getUserReferralCode(user.id);
      console.log(`Referral code: ${referralCode || 'None'}`);
      
      if (referralCode) {
        console.log('✅ Profile endpoint would return referral code correctly');
      } else {
        console.log('❌ Profile endpoint would not return referral code');
      }
    } else {
      console.log('❌ No users found');
    }
    
    // Test with multiple users to ensure each gets a unique code
    console.log('\nTesting uniqueness across multiple users...');
    const multipleUsersResult = await pool.query(`
      SELECT id, username
      FROM app_users
      LIMIT 5;
    `);
    
    const userCodes = [];
    for (const user of multipleUsersResult.rows) {
      const code = await getUserReferralCode(user.id);
      userCodes.push({ username: user.username, code: code });
    }
    
    console.log('User referral codes:');
    userCodes.forEach((userCode, index) => {
      console.log(`  ${index + 1}. ${userCode.username}: ${userCode.code}`);
    });
    
    // Check for duplicates
    const codes = userCodes.map(uc => uc.code).filter(code => code !== undefined);
    const uniqueCodes = [...new Set(codes)];
    
    if (codes.length === uniqueCodes.length) {
      console.log('✅ All users have unique referral codes');
    } else {
      console.log('❌ Some users have duplicate referral codes');
    }
    
    // Test referral stats function logic
    console.log('\nTesting referral stats function logic...');
    if (userCodes.length > 0 && userCodes[0].code) {
      const firstUserCode = userCodes[0].code;
      
      const referredUsersResult = await pool.query(`
        SELECT username, created_at
        FROM app_users
        WHERE referred_by = $1
        LIMIT 5;
      `, [firstUserCode]);
      
      console.log(`Users referred by ${firstUserCode}:`);
      if (referredUsersResult.rows.length > 0) {
        referredUsersResult.rows.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.username} (Created: ${user.created_at})`);
        });
      } else {
        console.log('  No users referred by this code (which is normal)');
      }
    }
    
    console.log('\n=== API Endpoint Tests Complete ===');
    
  } catch (error) {
    console.error('Error during API endpoint tests:', error.message);
  } finally {
    await pool.end();
  }
}

testApiEndpoints();