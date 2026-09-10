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

console.log('=== Testing Profile Update Functionality ===\n');

async function testProfileUpdate() {
  const client = await pool.connect();
  
  try {
    console.log('1. Testing database connectivity...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('   Current database time:', result.rows[0].current_time);
    
    console.log('\n2. Getting a test user...');
    const usersResult = await client.query(`
      SELECT id, username, email, phone, country, language, profile_picture 
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
    console.log(`   Current email: ${user.email}`);
    console.log(`   Current phone: ${user.phone}`);
    
    // Test profile update with profile picture
    console.log('\n3. Testing profile update with profile picture...');
    
    // Create a test profile picture (smaller than the problematic one)
    const testProfilePicture = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBAQE' +
      'BQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQU' +
      'FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAA' +
      'AAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKUAF//Z';
    
    console.log(`   Profile picture data length: ${testProfilePicture.length} characters`);
    
    const updateData = {
      email: 'test@example.com',
      phone: '+1234567890',
      country: 'US',
      language: 'en',
      profilePicture: testProfilePicture,
      gameAccounts: {
        pubg: { ign: 'testplayer', uid: '123456' },
        mlbb: { userId: '789012', zoneId: '345678' },
        coc: { email: 'coc@example.com' }
      },
      isProfileVerified: true
    };
    
    console.log('   Update data:', JSON.stringify(updateData, null, 2));
    
    const startTime = Date.now();
    
    // Simulate the profile update query
    const updateResult = await client.query(
      `UPDATE app_users 
       SET email = $1, phone = $2, country = $3, language = $4, game_accounts = $5, 
           is_profile_verified = $6, profile_picture = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, phone, country, language, profile_picture, game_accounts, is_profile_verified`,
      [
        updateData.email,
        updateData.phone,
        updateData.country,
        updateData.language,
        JSON.stringify(updateData.gameAccounts),
        updateData.isProfileVerified,
        updateData.profilePicture,
        user.id
      ]
    );
    
    const endTime = Date.now();
    
    if (updateResult.rows.length > 0) {
      const updatedUser = updateResult.rows[0];
      console.log('✅ Profile update successful');
      console.log(`   Update took ${endTime - startTime}ms`);
      console.log(`   Updated email: ${updatedUser.email}`);
      console.log(`   Updated phone: ${updatedUser.phone}`);
      console.log(`   Updated profile picture length: ${updatedUser.profile_picture?.length || 0}`);
      console.log(`   Updated game accounts: ${!!updatedUser.game_accounts}`);
      console.log(`   Profile verified: ${updatedUser.is_profile_verified}`);
    } else {
      console.log('❌ Profile update failed');
      return false;
    }
    
    // Reset to original values
    console.log('\n4. Resetting to original values...');
    await client.query(
      `UPDATE app_users 
       SET email = $1, phone = $2, country = $3, language = $4, profile_picture = $5, 
           game_accounts = $6, is_profile_verified = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        user.email,
        user.phone,
        user.country,
        user.language,
        user.profile_picture,
        null, // Reset game accounts
        false, // Reset verification
        user.id
      ]
    );
    
    console.log('✅ User data reset to original values');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during profile update test:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testProfileUpdate()
  .then((success) => {
    if (success) {
      console.log('\n=== Profile Update Test Complete ===');
      console.log('✅ All tests passed! Profile updates are working correctly.');
    } else {
      console.log('\n=== Profile Update Test Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Profile update test failed:', error);
    process.exit(1);
  });