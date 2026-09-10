// Script to test the robust email service for cancelled transactions
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testRobustEmailService() {
  console.log('🔍 Testing robust email service for cancelled transactions...');
  
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
    // Get the test transaction we created
    const transactionResult = await pool.query(`
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
        u.phone as user_phone,
        p.name as package_name,
        p.game as package_game,
        p.in_game_amount as package_in_game_amount
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.payment_id LIKE 'test_payment_id_%'
      ORDER BY t.created_at DESC
      LIMIT 1
    `);
    
    if (transactionResult.rows.length === 0) {
      console.log('❌ No test transaction found');
      return;
    }
    
    const transaction = transactionResult.rows[0];
    console.log('📋 Found test transaction:');
    console.log('   ID:', transaction.id);
    console.log('   Payment ID:', transaction.payment_id);
    console.log('   Status:', transaction.status);
    console.log('   User Email:', transaction.user_email);
    console.log('   Username:', transaction.user_username);
    console.log('   Package:', transaction.package_name);
    console.log('   Email Sent:', transaction.email_sent);
    
    // Test the robust email service
    console.log('\n📧 Testing robust email service...');
    
    try {
      // Import the robust email service
      const { sendTransactionStatusEmails } = await import('./dist/server/services/transaction-emails.js');
      
      console.log('✅ Robust email service imported successfully');
      
      // Get a client from the pool for database operations
      const client = await pool.connect();
      
      try {
        console.log('📤 Sending cancellation email using robust service...');
        const emailResult = await sendTransactionStatusEmails(transaction, client, 'cancelled');
        
        console.log('📧 Email sending result:', emailResult ? '✅ SUCCESS' : '❌ FAILED');
        
        // Check if the database was updated
        const updatedTransaction = await pool.query(
          'SELECT email_sent FROM app_transactions WHERE id = $1',
          [transaction.id]
        );
        
        if (updatedTransaction.rows.length > 0) {
          const isEmailSent = updatedTransaction.rows[0].email_sent;
          console.log('📊 Database email_sent status:', isEmailSent ? '✅ UPDATED' : '❌ NOT UPDATED');
        } else {
          console.log('❌ Could not check database update status');
        }
        
      } finally {
        client.release();
      }
      
    } catch (importError) {
      console.log('❌ Failed to import robust email service:', importError.message);
      console.log('   This might be because the dist folder does not exist or the module is not compiled');
      console.log('   Try running "npm run build" first');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testRobustEmailService().catch(console.error);