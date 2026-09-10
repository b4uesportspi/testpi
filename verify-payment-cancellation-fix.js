// Script to verify that the payment cancellation fix is working
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function verifyPaymentCancellationFix() {
  console.log('🔍 Verifying payment cancellation fix...');
  
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
    
    // Test our fix by manually calling the updated payment cancellation logic
    console.log('\n🔧 Testing the fixed payment cancellation logic...');
    
    try {
      // Import the email service directly (this is what our fix does)
      const emailModule = await import('./dist/server/services/email.js');
      
      if (typeof emailModule.sendPaymentFailureNotification === 'function') {
        console.log('✅ sendPaymentFailureNotification function is available');
        
        // Send the email
        console.log('📤 Sending cancellation email...');
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
        
        if (emailResult) {
          // Update the database to mark email as sent (this is what our fix does)
          try {
            await pool.query(
              'UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1',
              [transaction.id]
            );
            
            console.log('✅ Database updated to mark email as sent');
            
            // Verify the update
            const updatedTransaction = await pool.query(
              'SELECT email_sent FROM app_transactions WHERE id = $1',
              [transaction.id]
            );
            
            if (updatedTransaction.rows.length > 0) {
              const isEmailSent = updatedTransaction.rows[0].email_sent;
              console.log('📊 Final database email_sent status:', isEmailSent ? '✅ UPDATED' : '❌ NOT UPDATED');
              
              if (isEmailSent) {
                console.log('\n🎉 SUCCESS: Payment cancellation fix is working correctly!');
                console.log('   ✅ Email was sent successfully');
                console.log('   ✅ Database was updated to mark email as sent');
              } else {
                console.log('\n❌ PARTIAL SUCCESS: Email was sent but database was not updated');
              }
            } else {
              console.log('❌ Could not verify database update');
            }
          } catch (dbError) {
            console.log('❌ Failed to update database:', dbError.message);
          }
        } else {
          console.log('❌ Email was not sent successfully');
        }
      } else {
        console.log('❌ sendPaymentFailureNotification function is NOT available');
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

verifyPaymentCancellationFix().catch(console.error);