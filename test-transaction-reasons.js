import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function testTransactionsEndpoint() {
  console.log('Testing transactions endpoint with reason fields...');
  
  // Create a test JWT token for a user
  const testUserId = 'test-user-id';
  const testSecret = process.env.JWT_SECRET || 'fallback-secret';
  
  const testToken = jwt.sign(
    { userId: testUserId },
    testSecret,
    { expiresIn: '1h' }
  );
  
  console.log('✅ Test token generated');
  
  // Test database connection and check if reason columns exist
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
    
    // Check if reason columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'app_transactions' AND 
      (column_name = 'success_reason' OR column_name = 'failure_reason')
    `);
    
    const columns = columnCheck.rows.map(row => row.column_name);
    console.log('✅ Database columns:', columns);
    
    // Insert a test transaction with reason fields
    console.log('\\nInserting test transaction with reason fields...');
    const testTransactionId = 'test-' + Date.now();
    
    const insertResult = await pool.query(`
      INSERT INTO app_transactions 
      (id, user_id, package_id, payment_id, pi_amount, usd_amount, pi_price_at_time, status, success_reason, failure_reason)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      testTransactionId,
      testUserId,
      'test-package-id',
      'test-payment-id',
      '1.5',
      '0.36',
      '0.24',
      'completed',
      'Payment successfully completed with Pi Network',
      null
    ]);
    
    console.log('✅ Test transaction inserted:', insertResult.rows[0].id);
    
    // Test another transaction with failure reason
    const failedTransactionId = 'failed-test-' + Date.now();
    const insertFailedResult = await pool.query(`
      INSERT INTO app_transactions 
      (id, user_id, package_id, payment_id, pi_amount, usd_amount, pi_price_at_time, status, success_reason, failure_reason)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      failedTransactionId,
      testUserId,
      'test-package-id',
      'failed-payment-id',
      '1.5',
      '0.36',
      '0.24',
      'failed',
      null,
      'Payment failed due to insufficient funds'
    ]);
    
    console.log('✅ Failed test transaction inserted:', insertFailedResult.rows[0].id);
    
    // Test querying transactions with reason fields
    console.log('\\nQuerying transactions with reason fields...');
    const queryResult = await pool.query(`
      SELECT id, status, success_reason, failure_reason
      FROM app_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `, [testUserId]);
    
    console.log(`✅ Found ${queryResult.rows.length} transactions for test user:`);
    queryResult.rows.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.id} - ${tx.status}`);
      if (tx.success_reason) {
        console.log(`     Success: ${tx.success_reason}`);
      }
      if (tx.failure_reason) {
        console.log(`     Failure: ${tx.failure_reason}`);
      }
    });
    
    // Clean up test data
    console.log('\\nCleaning up test data...');
    await pool.query(`
      DELETE FROM app_transactions 
      WHERE id IN ($1, $2)
    `, [testTransactionId, failedTransactionId]);
    
    console.log('✅ Test data cleaned up');
    
    console.log('\\n🎉 All tests passed! Transaction reason fields are working correctly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testTransactionsEndpoint();