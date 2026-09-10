// Check current database state
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

async function checkDatabaseState() {
  console.log('Checking current database state...');
  
  try {
    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if users table exists and has data
    try {
      const usersResult = await pool.query('SELECT COUNT(*) as count FROM users;');
      console.log(`\nUsers table has ${usersResult.rows[0].count} records`);
    } catch (error) {
      console.log('\nUsers table does not exist or is inaccessible');
    }
    
    // Check if referral_codes table exists
    try {
      const referralCodesResult = await pool.query('SELECT COUNT(*) as count FROM referral_codes;');
      console.log(`Referral codes table has ${referralCodesResult.rows[0].count} records`);
    } catch (error) {
      console.log('Referral codes table does not exist or is inaccessible');
    }
    
    // Check if functions exist
    const functionsResult = await pool.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname LIKE '%referral%'
      ORDER BY proname;
    `);
    
    console.log('\nReferral-related functions:');
    if (functionsResult.rows.length > 0) {
      functionsResult.rows.forEach(row => {
        console.log(`  - ${row.proname}`);
      });
    } else {
      console.log('  - No referral-related functions found');
    }
    
  } catch (error) {
    console.error('Error checking database state:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseState();