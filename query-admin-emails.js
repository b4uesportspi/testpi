// Simple database query script to check admin emails
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function queryAdminEmails() {
  console.log('🔍 Querying admin email records...');
  
  // Use DATABASE_URL if available, otherwise construct from individual variables
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DATABASE}`;
  
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check if admins table exists
    console.log('📋 Checking for admins table...');
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admins'
    `);
    
    if (tableResult.rows.length === 0) {
      console.log('❌ Admins table does not exist');
      return;
    }
    
    console.log('✅ Admins table exists');
    
    // Query all admins
    console.log('📧 Fetching all admin records...');
    const allAdmins = await client.query('SELECT * FROM admins ORDER BY id');
    console.log('📋 All admin records:');
    console.log(JSON.stringify(allAdmins.rows, null, 2));
    
    // Query active admins
    console.log('📧 Fetching active admin records...');
    const activeAdmins = await client.query(
      'SELECT id, email, is_active FROM admins WHERE is_active = true ORDER BY id'
    );
    console.log('📋 Active admin records:');
    console.log(JSON.stringify(activeAdmins.rows, null, 2));
    
    if (activeAdmins.rows.length === 0) {
      console.log('⚠️ No active admin records found');
    } else {
      console.log(`✅ Found ${activeAdmins.rows.length} active admin record(s)`);
    }
    
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await client.end();
  }
}

queryAdminEmails().catch(console.error);