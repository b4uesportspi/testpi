// Check if triggers are properly set up
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

async function checkTriggers() {
  console.log('Checking triggers...');
  
  try {
    // Check triggers on app_users table
    const triggersResult = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'app_users'
      ORDER BY trigger_name;
    `);
    
    console.log('Triggers on app_users table:');
    if (triggersResult.rows.length > 0) {
      triggersResult.rows.forEach(row => {
        console.log(`  - ${row.trigger_name} (${row.event_manipulation}): ${row.action_statement}`);
      });
    } else {
      console.log('  - No triggers found on app_users table');
    }
    
    // Check if the specific referral code trigger exists
    const referralTriggerResult = await pool.query(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgname = 'trigger_create_user_referral_code';
    `);
    
    if (referralTriggerResult.rows.length > 0) {
      console.log('✅ Referral code trigger exists');
    } else {
      console.log('❌ Referral code trigger does not exist');
    }
    
    // Test creating a user to see if the trigger works
    console.log('\nTesting user creation with referral code generation...');
    try {
      // Create a test user
      const userResult = await pool.query(`
        INSERT INTO app_users (pi_uid, username, email, phone, country, language, wallet_address, is_active, is_profile_verified)
        VALUES ('test_pi_uid_' || EXTRACT(EPOCH FROM NOW())::text, 'testuser', 'test@example.com', '1234567890', 'Test Country', 'en', 'test_wallet', true, false)
        RETURNING id;
      `);
      
      const userId = userResult.rows[0].id;
      console.log('✅ Test user created with ID:', userId);
      
      // Check if a referral code was generated
      const referralCodeResult = await pool.query(`
        SELECT code FROM referral_codes WHERE user_id = $1;
      `, [userId]);
      
      if (referralCodeResult.rows.length > 0) {
        console.log('✅ Referral code generated:', referralCodeResult.rows[0].code);
      } else {
        console.log('❌ No referral code generated for the new user');
      }
      
      // Clean up test user
      await pool.query('DELETE FROM app_users WHERE id = $1;', [userId]);
      await pool.query('DELETE FROM referral_codes WHERE user_id = $1;', [userId]);
      
    } catch (error) {
      console.log('❌ Failed to test user creation:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking triggers:', error.message);
  } finally {
    await pool.end();
  }
}

checkTriggers();