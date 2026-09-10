import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkAdminEmails() {
  console.log('🔍 Checking admin email records...');
  
  // Database connection configuration
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });
  
  try {
    // Check all admins
    console.log('📧 Fetching all admin records...');
    const allAdminsResult = await pool.query('SELECT * FROM admins');
    console.log('📋 All admin records:', allAdminsResult.rows);
    
    // Check active admins
    console.log('📧 Fetching active admin records...');
    const activeAdminsResult = await pool.query(
      'SELECT email FROM admins WHERE is_active = true AND email IS NOT NULL'
    );
    console.log('📋 Active admin records:', activeAdminsResult.rows);
    
    if (activeAdminsResult.rows.length === 0) {
      console.log('⚠️ No active admin records found. Creating one for info@b4uesports.com...');
      
      // Check if info@b4uesports.com already exists
      const existingAdmin = await pool.query(
        'SELECT id FROM admins WHERE email = $1',
        ['info@b4uesports.com']
      );
      
      if (existingAdmin.rows.length > 0) {
        // Update existing record to be active
        console.log('🔄 Updating existing admin record to active...');
        await pool.query(
          'UPDATE admins SET is_active = true WHERE email = $1',
          ['info@b4uesports.com']
        );
        console.log('✅ Updated existing admin record to active');
      } else {
        // Insert new admin record
        console.log('➕ Inserting new admin record...');
        await pool.query(
          'INSERT INTO admins (email, is_active) VALUES ($1, $2)',
          ['info@b4uesports.com', true]
        );
        console.log('✅ Inserted new admin record');
      }
      
      // Verify the insertion/update
      const updatedAdminsResult = await pool.query(
        'SELECT email FROM admins WHERE is_active = true AND email IS NOT NULL'
      );
      console.log('📋 Updated active admin records:', updatedAdminsResult.rows);
    } else {
      console.log('✅ Found active admin records');
    }
  } catch (error) {
    console.error('❌ Error checking admin emails:', error);
  } finally {
    await pool.end();
  }
}

checkAdminEmails().catch(console.error);