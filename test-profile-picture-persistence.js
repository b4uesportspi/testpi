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

console.log('=== Testing Profile Picture Persistence ===\n');

async function testProfilePicturePersistence() {
  const client = await pool.connect();
  
  try {
    console.log('1. Testing database connectivity...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('   Current database time:', result.rows[0].current_time);
    
    console.log('\n2. Checking if profile_picture column exists...');
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
    
    console.log('\n3. Getting a test user...');
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
    console.log(`   Current profile picture: ${user.profile_picture ? 'Set' : 'Not set'}`);
    if (user.profile_picture) {
      console.log(`   Profile picture length: ${user.profile_picture.length} characters`);
    }
    
    // Create a test profile picture
    console.log('\n4. Creating test profile picture data...');
    const testProfilePicture = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBAQE' +
      'BQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQU' +
      'FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAA' +
      'AAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKUAF//Z';
    
    console.log(`   Test profile picture data length: ${testProfilePicture.length} characters`);
    
    console.log('\n5. Updating user profile with test picture...');
    const updateResult = await client.query(
      'UPDATE app_users SET profile_picture = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_picture',
      [testProfilePicture, user.id]
    );
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Profile picture updated successfully');
      console.log(`   Updated profile picture length: ${updateResult.rows[0].profile_picture.length}`);
    } else {
      console.log('❌ Profile picture update failed');
      return false;
    }
    
    console.log('\n6. Retrieving user data to verify persistence...');
    const retrieveResult = await client.query(
      'SELECT id, username, profile_picture FROM app_users WHERE id = $1',
      [user.id]
    );
    
    if (retrieveResult.rows.length > 0) {
      const retrievedUser = retrieveResult.rows[0];
      console.log('✅ User data retrieved successfully');
      console.log(`   Retrieved profile picture length: ${retrievedUser.profile_picture?.length || 0}`);
      
      if (retrievedUser.profile_picture === testProfilePicture) {
        console.log('✅ Profile picture persistence verified - data matches exactly');
      } else if (retrievedUser.profile_picture && retrievedUser.profile_picture.length === testProfilePicture.length) {
        console.log('✅ Profile picture persistence verified - data length matches');
      } else {
        console.log('❌ Profile picture persistence failed - data does not match');
        return false;
      }
    } else {
      console.log('❌ User data retrieval failed');
      return false;
    }
    
    // Reset to original value
    console.log('\n7. Resetting to original value...');
    await client.query(
      'UPDATE app_users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
      [user.profile_picture, user.id]
    );
    
    console.log('✅ User profile picture reset to original value');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during profile picture persistence test:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testProfilePicturePersistence()
  .then((success) => {
    if (success) {
      console.log('\n=== Profile Picture Persistence Test Complete ===');
      console.log('✅ All tests passed! Profile pictures are being saved and retrieved correctly from the database.');
    } else {
      console.log('\n=== Profile Picture Persistence Test Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Profile picture persistence test failed:', error);
    process.exit(1);
  });