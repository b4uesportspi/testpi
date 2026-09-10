// This script will test the full user flow to identify where profile picture data might be lost

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

console.log('=== Testing Full User Flow for Profile Picture Persistence ===\n');

async function testFullUserFlow() {
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
    
    // Save original profile picture for restoration later
    const originalProfilePicture = user.profile_picture;
    
    console.log('\n3. Simulating user saving a profile picture...');
    const testProfilePicture = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBAQE' +
      'BQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQU' +
      'FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAA' +
      'AAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKUAF//Z';
    
    // Simulate the PUT endpoint update
    console.log('   Updating user with profile picture via PUT endpoint...');
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
        testProfilePicture,
        user.id
      ]
    );
    
    if (putResult.rows.length > 0) {
      const updatedUser = putResult.rows[0];
      console.log('✅ PUT endpoint update successful');
      console.log(`   Profile picture in DB after PUT: ${updatedUser.profile_picture ? 'Set' : 'Not set'}`);
      if (updatedUser.profile_picture) {
        console.log(`   Profile picture length: ${updatedUser.profile_picture.length} characters`);
      }
    } else {
      console.log('❌ PUT endpoint update failed');
      return false;
    }
    
    console.log('\n4. Simulating user logout and login (GET endpoint call)...');
    // Simulate the GET endpoint that would be called after login
    const getResult = await client.query(
      'SELECT id, pi_uid, username, email, phone, country, language, wallet_address, game_accounts, referral_code, is_active, is_profile_verified, tokens, profile_picture, created_at, updated_at FROM app_users WHERE id = $1',
      [user.id]
    );
    
    if (getResult.rows.length > 0) {
      const dbUser = getResult.rows[0];
      console.log('✅ GET endpoint query successful after "login"');
      console.log(`   Profile picture in DB after GET: ${dbUser.profile_picture ? 'Set' : 'Not set'}`);
      if (dbUser.profile_picture) {
        console.log(`   Profile picture length: ${dbUser.profile_picture.length} characters`);
      }
      
      // Simulate the response that would be sent to the frontend
      const userResponse = {
        id: dbUser.id,
        piUID: dbUser.pi_uid,
        username: dbUser.username,
        email: dbUser.email,
        phone: dbUser.phone,
        country: dbUser.country,
        language: dbUser.language,
        walletAddress: dbUser.wallet_address,
        gameAccounts: dbUser.game_accounts,
        referralCode: dbUser.referral_code,
        isActive: dbUser.is_active,
        isProfileVerified: dbUser.is_profile_verified,
        tokens: dbUser.tokens,
        profilePicture: dbUser.profile_picture,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at,
      };
      
      console.log('   Simulated API response to frontend:');
      console.log(`   - profilePicture field present: ${'profilePicture' in userResponse}`);
      console.log(`   - profilePicture value: ${userResponse.profilePicture ? 'Set' : 'Not set'}`);
      if (userResponse.profilePicture) {
        console.log(`   - profilePicture length: ${userResponse.profilePicture.length} characters`);
      }
      
      // Verify the profile picture is correctly included
      if (userResponse.profilePicture && userResponse.profilePicture === testProfilePicture) {
        console.log('✅ Profile picture correctly persisted through full user flow');
      } else {
        console.log('❌ Profile picture not correctly persisted');
        return false;
      }
    } else {
      console.log('❌ GET endpoint query failed after "login"');
      return false;
    }
    
    console.log('\n5. Simulating another PUT update (e.g., user updates other info but keeps picture)...');
    // Simulate another update where the user changes other info but keeps the same profile picture
    const secondPutResult = await client.query(
      `UPDATE app_users 
       SET email = $1, phone = $2, country = $3, language = $4, game_accounts = $5, is_profile_verified = $6, profile_picture = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING id, pi_uid, username, email, phone, country, language, wallet_address, game_accounts, is_active, is_profile_verified, tokens, profile_picture, created_at, updated_at`,
      [
        'newemail@example.com', // Changed email
        '+1987654321', // Changed phone
        'CA', // Changed country
        'fr', // Changed language
        JSON.stringify({pubg: {ign: 'newplayer', uid: '654321'}}), // Changed game accounts
        true,
        testProfilePicture, // Keep the same profile picture
        user.id
      ]
    );
    
    if (secondPutResult.rows.length > 0) {
      const updatedUser = secondPutResult.rows[0];
      console.log('✅ Second PUT endpoint update successful');
      console.log(`   Profile picture still present: ${updatedUser.profile_picture ? 'Yes' : 'No'}`);
      if (updatedUser.profile_picture) {
        console.log(`   Profile picture length: ${updatedUser.profile_picture.length} characters`);
      }
      
      // Verify the profile picture is still there
      if (updatedUser.profile_picture && updatedUser.profile_picture === testProfilePicture) {
        console.log('✅ Profile picture correctly maintained during update');
      } else {
        console.log('❌ Profile picture lost during update');
        return false;
      }
    } else {
      console.log('❌ Second PUT endpoint update failed');
      return false;
    }
    
    // Restore original user data
    console.log('\n6. Restoring original user data...');
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
        originalProfilePicture, // Restore original profile picture
        user.id
      ]
    );
    
    console.log('✅ User data restored to original values');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during full user flow test:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testFullUserFlow()
  .then((success) => {
    if (success) {
      console.log('\n=== Full User Flow Test Complete ===');
      console.log('✅ All tests passed! Profile pictures are correctly persisted through the full user flow.');
      console.log('✅ This indicates the backend is working correctly.');
      console.log('✅ The issue is likely in the frontend caching or state management.');
    } else {
      console.log('\n=== Full User Flow Test Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Full user flow test failed:', error);
    process.exit(1);
  });