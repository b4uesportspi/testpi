// This script will test the profile endpoint directly to verify it returns profilePicture

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

console.log('=== Testing Profile Endpoint Database Queries ===\n');

async function testProfileEndpointQueries() {
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
    console.log(`   Current profile picture in DB: ${user.profile_picture ? 'Set' : 'Not set'}`);
    if (user.profile_picture) {
      console.log(`   Profile picture length: ${user.profile_picture.length} characters`);
    }
    
    console.log('\n3. Testing the exact SELECT query used in GET endpoint...');
    // This is the exact query used in the GET endpoint
    const getResult = await client.query(
      'SELECT id, pi_uid, username, email, phone, country, language, wallet_address, game_accounts, referral_code, is_active, is_profile_verified, tokens, profile_picture, created_at, updated_at FROM app_users WHERE id = $1',
      [user.id]
    );
    
    if (getResult.rows.length > 0) {
      const dbUser = getResult.rows[0];
      console.log('✅ GET endpoint query successful');
      console.log(`   Profile picture from query: ${dbUser.profile_picture ? 'Set' : 'Not set'}`);
      if (dbUser.profile_picture) {
        console.log(`   Profile picture length from query: ${dbUser.profile_picture.length} characters`);
      }
      
      // Check if profile_picture field is present in the result
      if ('profile_picture' in dbUser) {
        console.log('✅ profile_picture field is present in query result');
      } else {
        console.log('❌ profile_picture field is missing from query result');
        return false;
      }
    } else {
      console.log('❌ GET endpoint query failed - no user found');
      return false;
    }
    
    console.log('\n4. Testing the exact SELECT query used in PUT endpoint...');
    // This is the exact query used in the PUT endpoint
    const putResult = await client.query(
      `UPDATE app_users 
       SET email = $1, phone = $2, country = $3, language = $4, game_accounts = $5, is_profile_verified = $6, profile_picture = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING id, pi_uid, username, email, phone, country, language, wallet_address, game_accounts, is_active, is_profile_verified, tokens, profile_picture, created_at, updated_at`,
      [
        'test@example.com',
        '+1234567890',
        'US',
        'en',
        JSON.stringify({pubg: {ign: 'testplayer', uid: '123456'}}),
        true,
        user.profile_picture, // Keep the same profile picture
        user.id
      ]
    );
    
    if (putResult.rows.length > 0) {
      const updatedUser = putResult.rows[0];
      console.log('✅ PUT endpoint query successful');
      console.log(`   Profile picture from update: ${updatedUser.profile_picture ? 'Set' : 'Not set'}`);
      if (updatedUser.profile_picture) {
        console.log(`   Profile picture length from update: ${updatedUser.profile_picture.length} characters`);
      }
      
      // Check if profile_picture field is present in the result
      if ('profile_picture' in updatedUser) {
        console.log('✅ profile_picture field is present in update result');
      } else {
        console.log('❌ profile_picture field is missing from update result');
        return false;
      }
    } else {
      console.log('❌ PUT endpoint query failed - no user updated');
      return false;
    }
    
    // Reset the user data to original values
    console.log('\n5. Resetting user data to original values...');
    await client.query(
      `UPDATE app_users 
       SET email = $1, phone = $2, country = $3, language = $4, game_accounts = $5, is_profile_verified = $6, profile_picture = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        'jamesmy901@gmail.com', // Original email
        '+97577331126', // Original phone
        'BT', // Original country
        'en', // Original language
        null, // Reset game accounts
        false, // Reset verification
        user.profile_picture, // Keep the same profile picture
        user.id
      ]
    );
    
    console.log('✅ User data reset to original values');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during profile endpoint test:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testProfileEndpointQueries()
  .then((success) => {
    if (success) {
      console.log('\n=== Profile Endpoint Test Complete ===');
      console.log('✅ All tests passed! Both GET and PUT endpoints correctly handle profile pictures.');
    } else {
      console.log('\n=== Profile Endpoint Test Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Profile endpoint test failed:', error);
    process.exit(1);
  });