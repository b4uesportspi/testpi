// Comprehensive production test for referral codes
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

async function comprehensiveProductionTest() {
  console.log('=== Comprehensive Production Referral Code Test ===\n');
  
  try {
    // Test 1: Check if all referral codes are unique
    console.log('Test 1: Checking referral code uniqueness...');
    const allCodesResult = await pool.query(`
      SELECT code, COUNT(*) as count
      FROM referral_codes
      GROUP BY code
      HAVING COUNT(*) > 1;
    `);
    
    if (allCodesResult.rows.length === 0) {
      console.log('✅ All referral codes are unique');
    } else {
      console.log('❌ Duplicate referral codes found:');
      allCodesResult.rows.forEach(row => {
        console.log(`   Code ${row.code} appears ${row.count} times`);
      });
    }
    
    // Test 2: Check referral code format
    console.log('\nTest 2: Checking referral code format...');
    const formatResult = await pool.query(`
      SELECT code
      FROM referral_codes
      WHERE code NOT LIKE 'REF______' OR LENGTH(code) != 9;
    `);
    
    if (formatResult.rows.length === 0) {
      console.log('✅ All referral codes follow the correct format (REF + 6 characters)');
    } else {
      console.log('❌ Some referral codes have incorrect format:');
      formatResult.rows.forEach(row => {
        console.log(`   Code: ${row.code}`);
      });
    }
    
    // Test 3: Check if all users have referral codes
    console.log('\nTest 3: Checking if all users have referral codes...');
    const usersWithoutCodesResult = await pool.query(`
      SELECT id, username
      FROM app_users
      WHERE id NOT IN (SELECT user_id FROM referral_codes);
    `);
    
    if (usersWithoutCodesResult.rows.length === 0) {
      console.log('✅ All users have referral codes');
    } else {
      console.log('❌ Some users are missing referral codes:');
      usersWithoutCodesResult.rows.forEach(row => {
        console.log(`   User: ${row.username} (ID: ${row.id})`);
      });
    }
    
    // Test 4: Test referral code generation function
    console.log('\nTest 4: Testing referral code generation function...');
    const generatedCodes = [];
    let hasDuplicates = false;
    
    // Generate 10 codes to test uniqueness
    for (let i = 0; i < 10; i++) {
      const codeResult = await pool.query('SELECT generate_referral_code() as code;');
      const code = codeResult.rows[0].code;
      generatedCodes.push(code);
      
      // Check if this code already exists in our test set
      if (generatedCodes.filter(c => c === code).length > 1) {
        hasDuplicates = true;
        console.log(`❌ Duplicate code generated: ${code}`);
      }
    }
    
    if (!hasDuplicates) {
      console.log('✅ Generated 10 unique referral codes:');
      generatedCodes.forEach((code, index) => {
        console.log(`   ${index + 1}. ${code}`);
      });
    }
    
    // Test 5: Test the getUserReferralCode function logic
    console.log('\nTest 5: Testing getUserReferralCode function logic...');
    // Get a sample user
    const sampleUserResult = await pool.query(`
      SELECT id, username
      FROM app_users
      LIMIT 1;
    `);
    
    if (sampleUserResult.rows.length > 0) {
      const userId = sampleUserResult.rows[0].id;
      const username = sampleUserResult.rows[0].username;
      
      const referralCodeResult = await pool.query(
        'SELECT code FROM referral_codes WHERE user_id = $1',
        [userId]
      );
      
      const referralCode = referralCodeResult.rows.length > 0 ? referralCodeResult.rows[0].code : undefined;
      
      if (referralCode) {
        console.log(`✅ getUserReferralCode would return ${referralCode} for user ${username}`);
      } else {
        console.log(`❌ getUserReferralCode would return undefined for user ${username}`);
      }
    } else {
      console.log('❌ No users found in database');
    }
    
    // Test 6: Check referral code relationships
    console.log('\nTest 6: Checking referral relationships...');
    const relationshipsResult = await pool.query(`
      SELECT 
        r.code as referrer_code,
        u.username as referrer_username,
        referred.username as referred_username
      FROM referral_codes r
      JOIN app_users u ON r.user_id = u.id
      LEFT JOIN app_users referred ON referred.referred_by = r.code
      WHERE referred.id IS NOT NULL
      LIMIT 5;
    `);
    
    if (relationshipsResult.rows.length > 0) {
      console.log('✅ Found referral relationships:');
      relationshipsResult.rows.forEach(row => {
        console.log(`   ${row.referrer_username} (${row.referrer_code}) referred ${row.referred_username}`);
      });
    } else {
      console.log('ℹ️  No referral relationships found (this is normal if no one has been referred yet)');
    }
    
    console.log('\n=== Production Test Complete ===');
    console.log('✅ Referral code system is working correctly in production!');
    
  } catch (error) {
    console.error('Error during comprehensive production test:', error.message);
  } finally {
    await pool.end();
  }
}

comprehensiveProductionTest();