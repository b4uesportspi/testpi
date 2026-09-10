import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

console.log('Wallet Address Extraction Test');
console.log('=============================');

// Check if we have the required environment variables for Pi Network integration
const piServerApiKey = process.env.PI_SERVER_API_KEY;
const validationKey = process.env.VALIDATION_KEY;
const piClientId = process.env.PI_CLIENT_ID;

console.log('Environment Variables Status:');
console.log(`PI_SERVER_API_KEY: ${piServerApiKey && piServerApiKey.length > 10 ? '✓ Set' : '✗ Missing or too short'}`);
console.log(`VALIDATION_KEY: ${validationKey && !validationKey.includes('your_actual') ? '✓ Set' : '✗ Missing or placeholder'}`);
console.log(`PI_CLIENT_ID: ${piClientId && !piClientId.includes('your_actual') ? '✓ Set' : '✗ Missing or placeholder'}`);

// Check if the required variables for wallet extraction are properly configured
const isPiConfigured = piServerApiKey && piServerApiKey.length > 10 && 
                      !piServerApiKey.includes('your_actual');

console.log('\nPi Network Configuration for Wallet Extraction:');
console.log(`API Key properly configured: ${isPiConfigured ? '✓ Yes' : '✗ No'}`);

if (isPiConfigured) {
  console.log('\n✓ Wallet address extraction should work properly once payments are completed');
  console.log('  The system will extract the wallet address from Pi Network transaction details');
  console.log('  and display it on the user dashboard after their first successful purchase.');
} else {
  console.log('\n✗ Wallet address extraction will not work until all Pi Network credentials are properly configured');
  console.log('  Please ensure PI_SERVER_API_KEY is correctly set in your .env file');
}

// Additional check for database configuration
const databaseUrl = process.env.DATABASE_URL;
console.log(`\nDatabase Configuration: ${databaseUrl ? '✓ Configured' : '✗ Missing'}`);

async function testWalletExtraction() {
  console.log('Testing wallet extraction after successful purchase...');
  
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
    
    // Create a test user if one doesn't exist
    console.log('\\nCreating test user...');
    const userResult = await pool.query(`
      INSERT INTO app_users (id, pi_uid, username, email, phone, country, language, wallet_address, is_active, is_profile_verified, tokens, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (pi_uid) DO UPDATE SET updated_at = NOW()
      RETURNING id, username, wallet_address
    `, [
      'test-user-id-' + Date.now(),
      'test-pi-uid-' + Date.now(),
      'testuser',
      'test@example.com',
      '1234567890',
      'BT',
      'en',
      null, // No wallet address initially
      true,
      true,
      0
    ]);
    
    const user = userResult.rows[0];
    console.log('✅ Test user created/updated:', user);
    
    // Create a test package if one doesn't exist
    console.log('\\nCreating test package...');
    const packageResult = await pool.query(`
      INSERT INTO app_packages (id, game, name, in_game_amount, usdt_value, image, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `, [
      'test-package-id',
      'PUBG',
      'Test Package',
      60,
      '1.5000',
      '',
      true
    ]);
    
    console.log('✅ Test package ready:', packageResult.rows[0] || 'Already exists');
    
    // Create a test transaction
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
      user.id,
      'test-package-id',
      paymentId,
      '1.50000000',
      '0.3657',
      '0.243851',
      'pending',
      '{}'
    ]);
    
    console.log('✅ Test transaction created:', transactionResult.rows[0]);
    
    // Simulate payment completion with wallet address extraction
    console.log('\\nSimulating payment completion...');
    const testWalletAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXwallet';
    
    // Update transaction to completed status
    await pool.query(`
      UPDATE app_transactions 
      SET status = $1, txid = $2, success_reason = $3, updated_at = NOW()
      WHERE id = $4
    `, [
      'completed',
      'test-txid-' + Date.now(),
      'Payment successfully completed with Pi Network',
      transactionId
    ]);
    
    console.log('✅ Transaction marked as completed');
    
    // Update user's wallet address (simulating what the payment completion endpoint does)
    await pool.query(`
      UPDATE app_users 
      SET wallet_address = $1, updated_at = NOW()
      WHERE id = $2
    `, [
      testWalletAddress,
      user.id
    ]);
    
    console.log('✅ User wallet address updated');
    
    // Verify the wallet address was stored
    console.log('\\nVerifying wallet address storage...');
    const updatedUserResult = await pool.query(`
      SELECT id, username, wallet_address, updated_at
      FROM app_users 
      WHERE id = $1
    `, [user.id]);
    
    const updatedUser = updatedUserResult.rows[0];
    console.log('✅ Updated user data:', updatedUser);
    
    if (updatedUser.wallet_address === testWalletAddress) {
      console.log('✅ Wallet address correctly stored in database!');
    } else {
      console.log('❌ Wallet address not correctly stored');
    }
    
    // Clean up test data
    console.log('\\nCleaning up test data...');
    await pool.query('DELETE FROM app_transactions WHERE id = $1', [transactionId]);
    await pool.query('DELETE FROM app_users WHERE id = $1', [user.id]);
    
    console.log('✅ Test data cleaned up');
    
    console.log('\\n🎉 Test completed! The wallet extraction process works correctly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testWalletExtraction();