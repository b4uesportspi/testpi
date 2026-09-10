// Test script to verify admin email fetching
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testAdminFetch() {
  console.log('🔍 Testing admin email fetching...');
  
  // Use DATABASE_URL if available
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Test the correct query
    console.log('📧 Fetching active admin emails from app_admins table...');
    const adminsResult = await pool.query(
      'SELECT email FROM app_admins WHERE is_active = true AND email IS NOT NULL'
    );
    
    console.log('📋 Admin emails found:', adminsResult.rows);
    
    if (adminsResult.rows.length > 0) {
      console.log('✅ Successfully fetched admin emails');
      adminsResult.rows.forEach(admin => {
        console.log(`  - ${admin.email}`);
      });
    } else {
      console.log('⚠️ No active admin emails found');
    }
    
  } catch (error) {
    console.error('❌ Error fetching admin emails:', error.message);
  } finally {
    await pool.end();
  }
}

testAdminFetch().catch(console.error);