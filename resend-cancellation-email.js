// Script to manually resend cancellation email for a specific transaction
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function resendCancellationEmail(transactionId) {
  console.log(`🔄 Attempting to resend cancellation email for transaction: ${transactionId}`);
  
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
    // Query for the specific transaction
    const transactionResult = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.pi_amount,
        t.usd_amount,
        t.failure_reason,
        t.email_sent,
        u.email as user_email,
        u.username as user_name,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.id = $1
    `, [transactionId]);
    
    if (transactionResult.rows.length === 0) {
      console.log(`❌ Transaction with ID ${transactionId} not found`);
      return;
    }
    
    const transaction = transactionResult.rows[0];
    
    console.log('\n📋 Transaction Details:');
    console.log('=====================');
    console.log(`ID: ${transaction.id}`);
    console.log(`Payment ID: ${transaction.payment_id}`);
    console.log(`Status: ${transaction.status}`);
    console.log(`Created At: ${new Date(transaction.created_at).toLocaleString()}`);
    console.log(`Updated At: ${new Date(transaction.updated_at).toLocaleString()}`);
    console.log(`Amount: ${transaction.pi_amount} π (${transaction.usd_amount} USD)`);
    console.log(`Failure Reason: ${transaction.failure_reason}`);
    console.log(`Email Sent: ${transaction.email_sent ? '✅ YES' : '❌ NO'}`);
    console.log(`User Email: ${transaction.user_email}`);
    console.log(`User Name: ${transaction.user_name}`);
    console.log(`Package: ${transaction.package_name} (${transaction.package_game})`);
    
    // Check if email has already been sent
    if (transaction.email_sent) {
      console.log('\n⚠️  Email has already been sent for this transaction');
      return;
    }
    
    // Check if required data is present
    if (!transaction.user_email || !transaction.package_name || !transaction.user_name) {
      console.log('\n❌ Missing required data to send email');
      console.log(`   User Email: ${transaction.user_email ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Package Name: ${transaction.package_name ? '✅ Present' : '❌ Missing'}`);
      console.log(`   User Name: ${transaction.user_name ? '✅ Present' : '❌ Missing'}`);
      return;
    }
    
    // All data is present, let's attempt to send the email
    console.log('\n📧 Attempting to send cancellation email...');
    
    // Import the email service
    try {
      // We need to dynamically import the email service
      const emailModulePath = './dist/server/services/email.js';
      console.log(`   Loading email service from: ${emailModulePath}`);
      
      // Since we're in Node.js, we need to use dynamic import
      const emailModule = await import(emailModulePath);
      const { sendPaymentFailureNotification } = emailModule;
      
      if (!sendPaymentFailureNotification) {
        console.log('❌ sendPaymentFailureNotification function not found in email module');
        return;
      }
      
      console.log('✅ Email service loaded successfully');
      
      // Prepare email parameters
      const emailParams = {
        to: transaction.user_email,
        username: transaction.user_name,
        packageName: transaction.package_name,
        piAmount: transaction.pi_amount,
        failureReason: transaction.failure_reason || 'Payment cancelled by user',
        transactionId: transaction.id,
        paymentId: transaction.payment_id,
        isCancelled: true
      };
      
      console.log('\n📧 Email Parameters:');
      console.log('====================');
      Object.keys(emailParams).forEach(key => {
        console.log(`   ${key}: ${emailParams[key]}`);
      });
      
      // Attempt to send the email
      console.log('\n📤 Sending email...');
      const emailResult = await sendPaymentFailureNotification(emailParams);
      
      if (emailResult) {
        console.log('✅ Email sent successfully!');
        
        // Update the database to mark email as sent
        try {
          await pool.query(
            'UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1',
            [transactionId]
          );
          console.log('✅ Database updated to mark email as sent');
        } catch (dbError) {
          console.log('❌ Failed to update database:', dbError.message);
        }
      } else {
        console.log('❌ Failed to send email');
      }
      
    } catch (importError) {
      console.log('❌ Failed to load email service:', importError.message);
      console.log('   This might be because the dist folder does not exist or the module is not compiled');
      console.log('   Try running "npm run build" first');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Get transaction ID from command line arguments or use the one from our previous check
const transactionId = process.argv[2] || 'dc18d764-f159-447a-9d37-15efd8434d10';
resendCancellationEmail(transactionId).catch(console.error);