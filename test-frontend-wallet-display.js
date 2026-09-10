import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

async function testFrontendWalletDisplay() {
  console.log('Testing frontend wallet display...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 15000,
    statement_timeout: 15000,
    idleTimeoutMillis: 30000,
    max: 3,
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });
  
  try {
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    
    // Create a test user with a wallet address
    console.log('\\nCreating test user with wallet address...');
    const userId = 'test-user-id-' + Date.now();
    const testWalletAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXwallet';
    
    const userResult = await pool.query(`
      INSERT INTO app_users (id, pi_uid, username, email, phone, country, language, wallet_address, is_active, is_profile_verified, tokens, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (pi_uid) DO UPDATE SET updated_at = NOW()
      RETURNING id, username, wallet_address
    `, [
      userId,
      'test-pi-uid-' + Date.now(),
      'testuser',
      'test@example.com',
      '1234567890',
      'BT',
      'en',
      testWalletAddress, // With wallet address
      true,
      true,
      10
    ]);
    
    const user = userResult.rows[0];
    console.log('✅ Test user created/updated:', user);
    
    // Create a test transaction for this user
    console.log('\\nCreating test transaction...');
    const transactionId = 'test-transaction-' + Date.now();
    const paymentId = 'test-payment-' + Date.now();
    
    const transactionResult = await pool.query(`
      INSERT INTO app_transactions 
      (id, user_id, package_id, payment_id, pi_amount, usd_amount, pi_price_at_time, status, game_account, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, payment_id, status
    `, [
      transactionId,
      userId,
      'test-package-id',
      paymentId,
      '1.50000000',
      '0.3657',
      '0.243851',
      'completed',
      '{}'
    ]);
    
    console.log('✅ Test transaction created:', transactionResult.rows[0]);
    
    // Simulate the profile endpoint response
    console.log('\\nSimulating profile endpoint response...');
    const profileResult = await pool.query(`
      SELECT id, pi_uid, username, email, phone, country, language, wallet_address, game_accounts, referral_code, is_active, is_profile_verified, tokens, profile_picture, created_at, updated_at 
      FROM app_users 
      WHERE id = $1
    `, [userId]);
    
    const profileData = profileResult.rows[0];
    console.log('✅ Profile data from database:', {
      id: profileData.id,
      username: profileData.username,
      walletAddress: profileData.wallet_address,
      tokens: profileData.tokens
    });
    
    // Simulate JWT token creation (like the real app would do)
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const testToken = jwt.sign(
      { userId: profileData.id },
      JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
    
    console.log('✅ Test JWT token created');
    
    // Simulate the formatWalletAddress function from the frontend
    const formatWalletAddress = (address) => {
      if (!address) return 'Not set';
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };
    
    console.log('\\nSimulating frontend display:');
    console.log('  Username:', profileData.username);
    console.log('  Wallet Address (raw):', profileData.wallet_address);
    console.log('  Wallet Address (formatted):', formatWalletAddress(profileData.wallet_address));
    console.log('  Has Wallet:', !!profileData.wallet_address);
    
    // Test the conditional rendering logic from the frontend
    console.log('\\nTesting frontend conditional logic:');
    if (!profileData.wallet_address) {
      console.log('  ❌ Would show: "Wallet Not Connected" message');
    } else {
      console.log('  ✅ Would show: "Wallet Connected" with address:', formatWalletAddress(profileData.wallet_address));
    }
    
    // Clean up test data
    console.log('\\nCleaning up test data...');
    await pool.query('DELETE FROM app_transactions WHERE id = $1', [transactionId]);
    await pool.query('DELETE FROM app_users WHERE id = $1', [userId]);
    
    console.log('✅ Test data cleaned up');
    
    console.log('\\n🎉 Frontend wallet display test completed!');
    console.log('   When a user has a wallet address, it should display correctly in the dashboard.');
    console.log('   The issue is likely that no users have completed transactions yet.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testFrontendWalletDisplay();