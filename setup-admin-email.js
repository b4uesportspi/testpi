import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupAdminEmail() {
  console.log('🔧 Setting up admin email records...');
  
  // Database connection configuration
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  });
  
  try {
    // Test database connection
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    
    // Check if admins table exists
    console.log('📋 Checking if admins table exists...');
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'admins'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('🔨 Creating admins table...');
        await pool.query(`
          CREATE TABLE admins (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        console.log('✅ Admins table created');
      } else {
        console.log('✅ Admins table exists');
      }
    } catch (error) {
      console.log('ℹ️ Admins table check failed (may already exist):', error.message);
    }
    
    // Add info@b4uesports.com as an active admin
    console.log('➕ Adding info@b4uesports.com as active admin...');
    try {
      await pool.query(`
        INSERT INTO admins (email, is_active) 
        VALUES ($1, $2) 
        ON CONFLICT (email) 
        DO UPDATE SET is_active = $2, updated_at = NOW();
      `, ['info@b4uesports.com', true]);
      
      console.log('✅ info@b4uesports.com added/updated as active admin');
    } catch (error) {
      console.error('❌ Failed to add admin email:', error);
      return;
    }
    
    // Verify the admin record
    console.log('🔍 Verifying admin record...');
    const adminResult = await pool.query(
      'SELECT email, is_active FROM admins WHERE email = $1',
      ['info@b4uesports.com']
    );
    
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log('✅ Admin record verified:', {
        email: admin.email,
        is_active: admin.is_active
      });
    } else {
      console.log('❌ Admin record not found');
    }
    
    // Show all active admins
    console.log('📋 Showing all active admins...');
    const activeAdminsResult = await pool.query(
      'SELECT email FROM admins WHERE is_active = true'
    );
    
    if (activeAdminsResult.rows.length > 0) {
      console.log('✅ Active admins:');
      activeAdminsResult.rows.forEach(admin => {
        console.log(`  - ${admin.email}`);
      });
    } else {
      console.log('⚠️ No active admins found');
    }
    
  } catch (error) {
    console.error('❌ Error setting up admin emails:', error);
  } finally {
    await pool.end();
  }
}

setupAdminEmail().catch(console.error);