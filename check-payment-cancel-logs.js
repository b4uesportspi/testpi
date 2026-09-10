// Script to check VercelLogger entries for payment cancellation
import dotenv from 'dotenv';

dotenv.config();

// Simple log checker that mimics what we might see in Vercel logs
async function checkPaymentCancelLogs(transactionId) {
  console.log(`🔍 Checking for VercelLogger entries for cancelled transaction: ${transactionId}`);
  
  // Since we don't have direct access to Vercel logs in this environment,
  // let's check if we can find any log files or simulate what we'd look for
  
  console.log('\n📋 Looking for these log patterns:');
  console.log('==================================');
  console.log('1. "Payment Cancel endpoint: Cancelling payment"');
  console.log('2. "Payment Cancel endpoint: Transaction updated to cancelled in database"');
  console.log('3. "Payment Cancel endpoint: Attempting to send payment cancellation notification email"');
  console.log('4. "Payment Cancel endpoint: Payment cancellation notification email sent successfully"');
  console.log('5. "Payment Cancel endpoint: Failed to send payment cancellation notification email"');
  console.log('6. "Payment Cancel endpoint: Payment cancellation notification email sending failed"');
  console.log('7. Any "📧 PAYMENT_FAILURE_NOTIFICATION" entries');
  console.log('8. Any "❌" error entries');
  
  console.log('\n🔍 In a Vercel environment, you would check:');
  console.log('===========================================');
  console.log('1. Vercel Dashboard -> Logs tab');
  console.log('2. Filter for function logs related to the payment cancel endpoint');
  console.log('3. Look for the transaction ID:', transactionId);
  console.log('4. Check for any error messages or failed email attempts');
  
  console.log('\n📋 Based on the code analysis, the expected flow is:');
  console.log('====================================================');
  console.log('1. Payment cancellation request received');
  console.log('2. Transaction status updated to "cancelled" in database');
  console.log('3. Check if user_email and package_name exist');
  console.log('4. If both exist, attempt to send cancellation email');
  console.log('5. Log success or failure of email sending');
  console.log('6. Update email_sent field in database if successful');
  
  console.log('\n⚠️  Possible reasons why email was not sent:');
  console.log('===========================================');
  console.log('1. Exception occurred during email sending (logged as error)');
  console.log('2. SMTP configuration issues');
  console.log('3. Network connectivity problems');
  console.log('4. Email service rate limiting');
  console.log('5. The email sending code path was not reached due to an early error');
  console.log('6. Database update for email_sent field failed');
  
  console.log('\n🔧 To troubleshoot further:');
  console.log('==========================');
  console.log('1. Check Vercel logs for the exact timestamp of the cancellation');
  console.log('2. Look for any "❌" error entries around that time');
  console.log('3. Check if the "email_sent" field was properly updated in the database');
  console.log('4. Verify SMTP configuration is correct');
  console.log('5. Test email sending with a simple script to verify connectivity');
}

// Get transaction ID from command line arguments or use the one from our previous check
const transactionId = process.argv[2] || 'dc18d764-f159-447a-9d37-15efd8434d10';
checkPaymentCancelLogs(transactionId).catch(console.error);