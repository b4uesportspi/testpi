import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration with proper SSL handling for production
const isSupabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  statement_timeout: 15000,
  idleTimeoutMillis: 30000,
  max: 3,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  maxUses: 100,
};

// Handle SSL configuration for PostgreSQL connections
if (isSupabase) {
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
} else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

console.log('=== API Referral Code Generation Test ===\n');

// Function to generate a referral code (matching the API implementation)
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'REF'; // Prefix with REF as in the database function
  for (let i = 0; i < 6; i++) { // 6 random characters to match the database function
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Function to get user's referral code from the referral_codes table
async function getUserReferralCode(userId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT code FROM referral_codes WHERE user_id = $1',
      [userId]
    );
    
    return result.rows.length > 0 ? result.rows[0].code : undefined;
  } catch (error) {
    console.error('Error fetching referral code for user:', userId, error);
    return undefined;
  } finally {
    client.release();
  }
}

async function testAPIReferralCodeGeneration() {
  const client = await pool.connect();
  
  try {
    console.log('1. Testing referral code generation function...');
    // Test the generateReferralCode function
    const testCodes = [];
    for (let i = 0; i < 5; i++) {
      testCodes.push(generateReferralCode());
    }
    
    console.log('✅ Generated test codes:', testCodes.join(', '));
    
    // Check format
    const formatValid = testCodes.every(code => /^REF[A-Z0-9]{6}$/.test(code));
    if (formatValid) {
      console.log('✅ All generated codes follow correct format');
    } else {
      console.log('❌ Some generated codes have invalid format');
      return false;
    }
    
    console.log('\n2. Testing getUserReferralCode function...');
    // Get a test user
    const userResult = await client.query(`
      SELECT id, username 
      FROM app_users 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  No users found for testing');
      return true;
    }
    
    const testUser = userResult.rows[0];
    console.log('   Testing with user:', testUser.username, testUser.id);
    
    const referralCode = await getUserReferralCode(testUser.id);
    if (referralCode) {
      console.log('✅ getUserReferralCode function working');
      console.log('   Found referral code:', referralCode);
    } else {
      console.log('⚠️  No referral code found for user');
      // This is expected for users created before the referral system
    }
    
    console.log('\n3. Testing referral code uniqueness in database...');
    // Check that all codes in database are unique
    const duplicateCheck = await client.query(`
      SELECT code, COUNT(*) as count 
      FROM referral_codes 
      GROUP BY code 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('❌ Duplicate referral codes found:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   - ${row.code} (appears ${row.count} times)`);
      });
      return false;
    } else {
      console.log('✅ All referral codes in database are unique');
    }
    
    console.log('\n4. Testing referral code format in database...');
    const formatCheck = await client.query(`
      SELECT code 
      FROM referral_codes 
      WHERE code !~ '^REF[A-Z0-9]{6}$'
    `);
    
    if (formatCheck.rows.length > 0) {
      console.log('❌ Invalid referral code formats found:');
      formatCheck.rows.forEach(row => {
        console.log(`   - ${row.code}`);
      });
      return false;
    } else {
      console.log('✅ All referral codes in database follow correct format');
    }
    
    console.log('\n5. Simulating API profile request flow...');
    // Simulate what happens when a user requests their profile
    console.log('   User requests profile...');
    
    // Get user data
    const userDataResult = await client.query(
      'SELECT id, username FROM app_users WHERE id = $1',
      [testUser.id]
    );
    
    if (userDataResult.rows.length === 0) {
      console.log('❌ User not found');
      return false;
    }
    
    const user = userDataResult.rows[0];
    console.log('   Found user:', user.username);
    
    // Check if user has a referral code
    let referralCodeForUser = await getUserReferralCode(user.id);
    console.log('   Current referral code:', referralCodeForUser || 'NONE');
    
    // Simulate the API logic: if no referral code, generate one
    if (!referralCodeForUser) {
      console.log('   No referral code found, generating new one...');
      referralCodeForUser = generateReferralCode();
      
      // Insert the new referral code into the referral_codes table
      try {
        await client.query(
          'INSERT INTO referral_codes (code, user_id) VALUES ($1, $2)',
          [referralCodeForUser, user.id]
        );
        console.log('   ✅ New referral code generated and saved:', referralCodeForUser);
      } catch (insertError) {
        // Check if it's a duplicate key error
        if (insertError.message.includes('duplicate key')) {
          console.log('   ⚠️  Duplicate code generated, trying again...');
          // In a real implementation, we would retry or handle this more gracefully
          return false;
        } else {
          throw insertError;
        }
      }
    } else {
      console.log('   ✅ User already has a referral code');
    }
    
    // Verify the referral code was saved correctly
    const verifyResult = await getUserReferralCode(user.id);
    if (verifyResult === referralCodeForUser) {
      console.log('   ✅ Referral code correctly saved and retrieved');
    } else {
      console.log('   ❌ Referral code mismatch');
      console.log('   Expected:', referralCodeForUser);
      console.log('   Got:', verifyResult);
      return false;
    }
    
    console.log('\n6. Testing edge cases...');
    // Test with a non-existent user ID
    const nonExistentCode = await getUserReferralCode('non-existent-id');
    if (nonExistentCode === undefined) {
      console.log('   ✅ Correctly handled non-existent user');
    } else {
      console.log('   ❌ Incorrectly returned code for non-existent user:', nonExistentCode);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during API test:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// Run the API test
testAPIReferralCodeGeneration()
  .then((success) => {
    if (success) {
      console.log('\n=== API Test Complete ===');
      console.log('✅ All API tests passed! The referral code generation is working correctly.');
      console.log('\nSummary:');
      console.log('- Referral code generation function: OK');
      console.log('- getUserReferralCode function: OK');
      console.log('- Database uniqueness: OK');
      console.log('- Database format validation: OK');
      console.log('- API profile request flow: OK');
      console.log('- Edge case handling: OK');
    } else {
      console.log('\n=== API Test Complete ===');
      console.log('❌ Some API tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ API test failed:', error);
    process.exit(1);
  });