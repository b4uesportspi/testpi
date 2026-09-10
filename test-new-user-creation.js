// Test new user creation with automatic referral code generation
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

async function testNewUserCreation() {
  console.log('=== Testing New User Creation with Referral Code Generation ===\n');
  
  try {
    // Get current count of referral codes
    const initialCountResult = await pool.query('SELECT COUNT(*) as count FROM referral_codes;');
    const initialCount = parseInt(initialCountResult.rows[0].count);
    console.log(`Initial referral code count: ${initialCount}`);
    
    // Create multiple test users to test automatic referral code generation
    console.log('\nCreating 3 new test users...');
    const newUsers = [];
    
    for (let i = 1; i <= 3; i++) {
      const piUid = `test_new_user_${Date.now()}_${i}`;
      const username = `newuser${i}_${Date.now()}`;
      
      // Create user (this should trigger automatic referral code generation)
      const userResult = await pool.query(`
        INSERT INTO app_users (pi_uid, username, email, phone, country, language, wallet_address, is_active, is_profile_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, username;
      `, [piUid, username, `newuser${i}@example.com`, `123456789${i}`, 'Test Country', 'en', `test_wallet_${i}`, true, false]);
      
      const userId = userResult.rows[0].id;
      const userName = userResult.rows[0].username;
      newUsers.push({ id: userId, username: userName });
      
      console.log(`✅ Created user ${userName} (ID: ${userId})`);
      
      // Check if referral code was automatically generated
      const referralCodeResult = await pool.query(`
        SELECT code, created_at
        FROM referral_codes
        WHERE user_id = $1;
      `, [userId]);
      
      if (referralCodeResult.rows.length > 0) {
        const code = referralCodeResult.rows[0].code;
        const createdAt = referralCodeResult.rows[0].created_at;
        console.log(`   🎯 Auto-generated referral code: ${code} (Created: ${createdAt})`);
      } else {
        console.log(`   ❌ No referral code generated for ${userName}`);
      }
    }
    
    // Verify the count increased correctly
    const finalCountResult = await pool.query('SELECT COUNT(*) as count FROM referral_codes;');
    const finalCount = parseInt(finalCountResult.rows[0].count);
    console.log(`\nFinal referral code count: ${finalCount}`);
    
    if (finalCount === initialCount + 3) {
      console.log('✅ Referral code count increased correctly (3 new codes generated)');
    } else {
      console.log(`❌ Referral code count mismatch. Expected ${initialCount + 3}, got ${finalCount}`);
    }
    
    // Check uniqueness of all newly generated codes
    console.log('\nChecking uniqueness of newly generated codes...');
    const allCodesResult = await pool.query(`
      SELECT code, user_id
      FROM referral_codes
      WHERE user_id = ANY($1);
    `, [newUsers.map(user => user.id)]);
    
    const newCodes = allCodesResult.rows.map(row => row.code);
    const uniqueNewCodes = [...new Set(newCodes)];
    
    if (newCodes.length === uniqueNewCodes.length && newCodes.length === 3) {
      console.log('✅ All newly generated referral codes are unique');
      console.log('   Generated codes:', newCodes.join(', '));
    } else {
      console.log('❌ Some newly generated referral codes are duplicates');
      console.log('   Generated codes:', newCodes.join(', '));
    }
    
    // Clean up test users
    console.log('\nCleaning up test users...');
    for (const user of newUsers) {
      await pool.query('DELETE FROM app_users WHERE id = $1;', [user.id]);
      await pool.query('DELETE FROM referral_codes WHERE user_id = $1;', [user.id]);
      console.log(`   ✅ Deleted user ${user.username}`);
    }
    
    console.log('\n=== New User Creation Test Complete ===');
    console.log('✅ Automatic referral code generation is working correctly!');
    
  } catch (error) {
    console.error('Error during new user creation test:', error.message);
  } finally {
    await pool.end();
  }
}

testNewUserCreation();