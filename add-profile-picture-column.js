import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration
const isSupabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  statement_timeout: 15000,
  idleTimeoutMillis: 30000,
  max: 3,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  maxUses: 100,
};

// Handle SSL configuration for PostgreSQL connections
if (isSupabase) {
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

async function addProfilePictureColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Adding profile_picture column to app_users table...');
    
    await client.query(`
      ALTER TABLE app_users 
      ADD COLUMN IF NOT EXISTS profile_picture TEXT
    `);
    
    console.log('✅ Profile picture column added successfully');
    
    // Verify the column was added
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'app_users' AND column_name = 'profile_picture'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Column verification successful');
      console.log('   Column details:', columnCheck.rows[0]);
    } else {
      console.log('❌ Column verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error adding profile picture column:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addProfilePictureColumn();