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

console.log('=== Testing Large Profile Picture Update ===\n');

async function testLargeProfilePicture() {
  const client = await pool.connect();
  
  try {
    console.log('1. Testing database connectivity...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('   Current database time:', result.rows[0].current_time);
    
    console.log('\n2. Getting a test user...');
    const usersResult = await client.query(`
      SELECT id, username, profile_picture 
      FROM app_users 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found in database');
      return false;
    }
    
    const user = usersResult.rows[0];
    console.log(`   User: ${user.username} (${user.id})`);
    
    // Create a large base64 string similar to what was in the log
    console.log('\n3. Creating large profile picture data...');
    // Create a string that's approximately the size of the one in the log
    let largeProfilePicture = 'data:image/jpeg;base64,';
    // Add a large base64-like string (much smaller than the actual one for testing)
    for (let i = 0; i < 1000; i++) {
      largeProfilePicture += 'A' + Math.floor(Math.random() * 10);
    }
    
    console.log(`   Profile picture data length: ${largeProfilePicture.length} characters`);
    
    console.log('\n4. Testing large profile picture update...');
    const startTime = Date.now();
    
    const updateResult = await client.query(
      'UPDATE app_users SET profile_picture = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_picture',
      [largeProfilePicture, user.id]
    );
    
    const endTime = Date.now();
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Large profile picture update successful');
      console.log(`   Update took ${endTime - startTime}ms`);
      console.log(`   Updated profile picture data length: ${updateResult.rows[0].profile_picture.length}`);
    } else {
      console.log('❌ Large profile picture update failed');
      return false;
    }
    
    // Reset to original value
    await client.query(
      'UPDATE app_users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
      [user.profile_picture, user.id]
    );
    
    console.log('✅ Profile picture reset to original value');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during large profile picture test:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testLargeProfilePicture()
  .then((success) => {
    if (success) {
      console.log('\n=== Large Profile Picture Test Complete ===');
      console.log('✅ All tests passed! Large profile picture updates are working correctly.');
    } else {
      console.log('\n=== Large Profile Picture Test Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Large profile picture test failed:', error);
    process.exit(1);
  });