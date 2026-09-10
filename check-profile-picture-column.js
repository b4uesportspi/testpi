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

console.log('=== Checking Profile Picture Column ===\n');

async function checkProfilePictureColumn() {
  const client = await pool.connect();
  
  try {
    console.log('1. Testing database connectivity...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('   Current database time:', result.rows[0].current_time);
    
    console.log('\n2. Checking if profile_picture column exists in app_users table...');
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'app_users' AND column_name = 'profile_picture'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ profile_picture column exists in app_users table');
      console.log('   Column details:', columnCheck.rows[0]);
    } else {
      console.log('❌ profile_picture column NOT found in app_users table');
      return false;
    }
    
    console.log('\n3. Testing profile picture functionality with a sample user...');
    // Get a test user
    const usersResult = await client.query(`
      SELECT id, username, profile_picture 
      FROM app_users 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (usersResult.rows.length > 0) {
      const user = usersResult.rows[0];
      console.log(`   User: ${user.username} (${user.id})`);
      console.log(`   Current profile picture: ${user.profile_picture ? 'Set' : 'Not set'}`);
      
      // Test updating profile picture
      console.log('\n4. Testing profile picture update...');
      const testPictureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      const updateResult = await client.query(
        'UPDATE app_users SET profile_picture = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_picture',
        [testPictureData, user.id]
      );
      
      if (updateResult.rows.length > 0) {
        console.log('✅ Profile picture update successful');
        console.log('   Updated profile picture data length:', updateResult.rows[0].profile_picture?.length || 0);
      } else {
        console.log('❌ Profile picture update failed');
        return false;
      }
      
      // Reset to original value
      await client.query(
        'UPDATE app_users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
        [user.profile_picture, user.id]
      );
      
      console.log('✅ Profile picture reset to original value');
    } else {
      console.log('⚠️  No users found in database for testing');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during profile picture check:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// Run the profile picture check
checkProfilePictureColumn()
  .then((success) => {
    if (success) {
      console.log('\n=== Profile Picture Check Complete ===');
      console.log('✅ All tests passed! The profile picture functionality is working correctly.');
    } else {
      console.log('\n=== Profile Picture Check Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Profile picture check failed:', error);
    process.exit(1);
  });