// Script to test the email service directly
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testDirectEmailService() {
  console.log('🔍 Testing direct email service call...');
  
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
    
    // Test the email service directly
    console.log('\n📧 Testing direct email service call...');
    
    try {
      // Import the email service directly
      const emailModule = await import('./dist/server/services/email.js');
      
      console.log('✅ Email service imported successfully');
      console.log('📋 Available functions:', Object.keys(emailModule));
      
      // Check if sendPaymentFailureNotification is available
      if (typeof emailModule.sendPaymentFailureNotification === 'function') {
        console.log('✅ sendPaymentFailureNotification function is available');
        
        // Try to send the email
        console.log('📤 Sending cancellation email directly...');
        const emailResult = await emailModule.sendPaymentFailureNotification({
          to: transaction.user_email,
          username: transaction.user_username,
          packageName: transaction.package_name,
          piAmount: transaction.pi_amount,
          failureReason: transaction.failure_reason || 'Payment cancelled by user',
          transactionId: transaction.id,
          paymentId: transaction.payment_id,
          isCancelled: true
        });
        
        console.log('📧 Email sending result:', emailResult ? '✅ SUCCESS' : '❌ FAILED');
      } else {
        console.log('❌ sendPaymentFailureNotification function is NOT available');
        console.log('Available functions:', Object.keys(emailModule));
      }
      
    } catch (importError) {
      console.log('❌ Failed to import email service:', importError.message);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await pool.end();
  }
}

testDirectEmailService().catch(console.error);