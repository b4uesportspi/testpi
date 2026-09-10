// Check referral_codes table structure
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

async function checkReferralCodesTable() {
  console.log('Checking referral_codes table structure...');
  
  try {
    // Check columns in referral_codes table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'referral_codes'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columns in referral_codes table:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}, ${row.is_nullable})`);
    });
    
    // Check foreign key constraints
    const fkResult = await pool.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'referral_codes' AND tc.constraint_type = 'FOREIGN KEY';
    `);
    
    console.log('\nForeign key constraints on referral_codes table:');
    fkResult.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
    });
    
  } catch (error) {
    console.error('Error checking referral_codes table:', error.message);
  } finally {
    await pool.end();
  }
}

checkReferralCodesTable();