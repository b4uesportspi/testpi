import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function testTransactions() {
  console.log('Testing transactions database connection...');
  
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
    console.log('Current time:', result.rows[0].now);
    
    // Get recent transactions
    console.log('\\nFetching recent transactions...');
    const transactionsResult = await pool.query(`
      SELECT 
        id, 
        payment_id, 
        status, 
        pi_amount, 
        created_at, 
        updated_at,
        success_reason,
        failure_reason
      FROM app_transactions 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`\\n✅ Found ${transactionsResult.rows.length} recent transactions:`);
    transactionsResult.rows.forEach((tx, index) => {
      console.log(`\\n${index + 1}. Transaction ID: ${tx.id}`);
      console.log(`   Payment ID: ${tx.payment_id}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Amount: ${tx.pi_amount} π`);
      console.log(`   Created: ${tx.created_at}`);
      console.log(`   Updated: ${tx.updated_at}`);
      if (tx.success_reason) {
        console.log(`   Success Reason: ${tx.success_reason}`);
      }
      if (tx.failure_reason) {
        console.log(`   Failure Reason: ${tx.failure_reason}`);
      }
    });
    
    // Check if success_reason column exists
    console.log('\\n\\nChecking if success_reason column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'app_transactions' AND column_name = 'success_reason'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ success_reason column exists');
    } else {
      console.log('❌ success_reason column does not exist');
    }
    
    // Check if failure_reason column exists
    console.log('\\nChecking if failure_reason column exists...');
    const failureColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'app_transactions' AND column_name = 'failure_reason'
    `);
    
    if (failureColumnCheck.rows.length > 0) {
      console.log('✅ failure_reason column exists');
    } else {
      console.log('❌ failure_reason column does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testTransactions();