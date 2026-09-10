// Check if trigger is attached to app_users table
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

async function checkTriggerAttachment() {
  console.log('Checking trigger attachment...');
  
  try {
    // Check triggers on app_users table
    const triggersResult = await pool.query(`
      SELECT 
        tg.tgname as trigger_name,
        tbl.relname as table_name,
        p.proname as function_name
      FROM pg_trigger tg
      JOIN pg_class tbl ON tg.tgrelid = tbl.oid
      JOIN pg_proc p ON tg.tgfoid = p.oid
      WHERE tbl.relname = 'app_users';
    `);
    
    if (triggersResult.rows.length > 0) {
      console.log('Triggers on app_users table:');
      triggersResult.rows.forEach(row => {
        console.log(`  - ${row.trigger_name} -> ${row.function_name}`);
      });
    } else {
      console.log('No triggers found on app_users table');
    }
    
    // Check specifically for our referral code trigger
    const specificTriggerResult = await pool.query(`
      SELECT 
        tg.tgname as trigger_name,
        tbl.relname as table_name,
        p.proname as function_name,
        tg.tgtype as trigger_type
      FROM pg_trigger tg
      JOIN pg_class tbl ON tg.tgrelid = tbl.oid
      JOIN pg_proc p ON tg.tgfoid = p.oid
      WHERE tg.tgname = 'trigger_create_user_referral_code';
    `);
    
    if (specificTriggerResult.rows.length > 0) {
      console.log('\nReferral code trigger details:');
      specificTriggerResult.rows.forEach(row => {
        console.log(`  Name: ${row.trigger_name}`);
        console.log(`  Table: ${row.table_name}`);
        console.log(`  Function: ${row.function_name}`);
        console.log(`  Type: ${row.trigger_type}`);
      });
    } else {
      console.log('\nReferral code trigger not found');
    }
    
    // Test the trigger function directly
    console.log('\nTesting trigger function directly...');
    try {
      const testResult = await pool.query(`
        SELECT create_user_referral_code() as result;
      `);
      console.log('Trigger function test result:', testResult.rows[0]);
    } catch (error) {
      console.log('Trigger function test failed:', error.message);
    }
    
    // Test the generate_referral_code function
    console.log('\nTesting generate_referral_code function...');
    try {
      const testResult = await pool.query(`
        SELECT generate_referral_code() as code;
      `);
      console.log('Generated referral code:', testResult.rows[0].code);
    } catch (error) {
      console.log('Generate referral code function failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking trigger attachment:', error.message);
  } finally {
    await pool.end();
  }
}

checkTriggerAttachment();