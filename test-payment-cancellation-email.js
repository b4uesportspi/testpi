// Script to test payment cancellation email sending
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testPaymentCancellationEmail() {
  console.log('🔍 Testing payment cancellation email functionality...');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Check if test user already exists
    let testUserResult = await pool.query(`
      SELECT id FROM app_users WHERE email = 'jamesmy901@gmail.com' LIMIT 1
    `);
    
    let userId;
    if (testUserResult.rows.length > 0) {
      userId = testUserResult.rows[0].id;
      console.log('✅ Using existing test user with ID:', userId);
    } else {
      // Create a test user
      console.log('📝 Creating test user...');
      testUserResult = await pool.query(`
        INSERT INTO app_users (username, email, phone, created_at, updated_at)
        VALUES ('testuser', 'jamesmy901@gmail.com', '+1234567890', NOW(), NOW())
        RETURNING id
      `);
      userId = testUserResult.rows[0].id;
      console.log('✅ Test user created with ID:', userId);
    }
    
    // Check if test package already exists
    let testPackageResult = await pool.query(`
      SELECT id FROM app_packages WHERE name = '0.06 UC' LIMIT 1
    `);
    
    let packageId;
    if (testPackageResult.rows.length > 0) {
      packageId = testPackageResult.rows[0].id;
      console.log('✅ Using existing test package with ID:', packageId);
    } else {
      // Create a test package
      console.log('📝 Creating test package...');
      testPackageResult = await pool.query(`
        INSERT INTO app_packages (name, game, price_usd, price_pi, in_game_amount, created_at, updated_at)
        VALUES ('0.06 UC', 'PUBG', 0.01, 0.0001, '0.06 UC', NOW(), NOW())
        RETURNING id
      `);
      packageId = testPackageResult.rows[0].id;
      console.log('✅ Test package created with ID:', packageId);
    }
    
    // Create a test transaction that simulates a cancelled payment
    console.log('📝 Creating test transaction...');
    const testTransactionResult = await pool.query(`
      INSERT INTO app_transactions (
        user_id, package_id, payment_id, status, pi_amount, usd_amount, pi_price_at_time,
        failure_reason, email_sent, game_account, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING id, payment_id
    `, [
      userId,
      packageId,
      'test_payment_id_' + Date.now(),
      'cancelled',
      '0.00010000',
      '0.01',
      '0.01', // pi_price_at_time
      'Payment cancelled by user',
      false,
      '{}', // game_account as empty JSON
    ]);
    
    const transaction = testTransactionResult.rows[0];
    console.log('✅ Test transaction created with ID:', transaction.id);
    
    // Now test if we can retrieve the transaction with all necessary data
    const transactionWithDetails = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.pi_amount,
        t.usd_amount,
        t.failure_reason,
        t.email_sent,
        u.email as user_email,
        u.username as user_username,
        p.name as package_name,
        p.game as package_game,
        p.in_game_amount as package_in_game_amount
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.id = $1
    `, [transaction.id]);
    
    if (transactionWithDetails.rows.length === 0) {
      console.log('❌ Could not retrieve test transaction with details');
      return;
    }
    
    const transactionData = transactionWithDetails.rows[0];
    console.log('📋 Transaction data for email sending:');
    console.log('   ID:', transactionData.id);
    console.log('   Payment ID:', transactionData.payment_id);
    console.log('   Status:', transactionData.status);
    console.log('   User Email:', transactionData.user_email);
    console.log('   Username:', transactionData.user_username);
    console.log('   Package:', transactionData.package_name);
    console.log('   Email Sent:', transactionData.email_sent);
    
    console.log('\n✅ Test setup completed successfully!');
    console.log('📝 To test the actual email sending, you would need to:');
    console.log('   1. Make a POST request to /api/payment/cancel with the payment ID');
    console.log('   2. Or manually call the sendTransactionStatusEmails function');
    console.log('   3. The robust email service should now properly update the database');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testPaymentCancellationEmail().catch(console.error);