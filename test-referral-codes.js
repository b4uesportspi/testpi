// Test script to verify referral codes are working properly
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

async function testReferralCodes() {
  console.log('Testing referral codes implementation...');
  
  try {
    // Check if referral_codes table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'referral_codes'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ referral_codes table does not exist');
      return;
    }
    console.log('✅ referral_codes table exists');
    
    // Check if the functions exist
    const functionCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'generate_referral_code'
      );
    `);
    
    if (!functionCheck.rows[0].exists) {
      console.log('❌ generate_referral_code function does not exist');
    } else {
      console.log('✅ generate_referral_code function exists');
    }
    
    // Check if the trigger exists
    const triggerCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_create_user_referral_code'
      );
    `);
    
    if (!triggerCheck.rows[0].exists) {
      console.log('❌ trigger_create_user_referral_code trigger does not exist');
    } else {
      console.log('✅ trigger_create_user_referral_code trigger exists');
    }
    
    // Check if we can generate a referral code
    try {
      const codeResult = await pool.query('SELECT generate_referral_code() as code;');
      console.log('✅ Referral code generation works:', codeResult.rows[0].code);
    } catch (error) {
      console.log('❌ Referral code generation failed:', error.message);
    }
    
    // Check existing referral codes
    try {
      const codesResult = await pool.query('SELECT * FROM referral_codes LIMIT 5;');
      console.log(`✅ Found ${codesResult.rows.length} referral codes in the database`);
      
      if (codesResult.rows.length > 0) {
        console.log('Sample referral codes:');
        codesResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. Code: ${row.code}, User ID: ${row.user_id}`);
        });
      }
    } catch (error) {
      console.log('❌ Failed to query referral codes:', error.message);
    }
    
    console.log('\n🎉 Referral codes system check completed!');
    
  } catch (error) {
    console.error('Error during referral codes test:', error.message);
  } finally {
    await pool.end();
  }
}

testReferralCodes();