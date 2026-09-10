import dotenv from 'dotenv';
import { sendPurchaseConfirmationEmail } from './server/services/email.js';

// Load environment variables
dotenv.config();

/**
 * Simple test script to send an email to jamesmy901@gmail.com
 */
async function testEmail() {
  console.log('📧 Sending test email to jamesmy901@gmail.com...');
  
  try {
    const result = await sendPurchaseConfirmationEmail({
      to: 'jamesmy901@gmail.com',
      username: 'James',
      packageName: 'Test Package',
      piAmount: '10.50',
      usdAmount: '2.50',
      gameAccount: 'Test Game Account',
      transactionId: 'test-transaction-id',
      paymentId: 'test-payment-id',
      isTestnet: false
    });
    
    if (result) {
      console.log('✅ Email sent successfully to jamesmy901@gmail.com');
    } else {
      console.log('❌ Failed to send email to jamesmy901@gmail.com');
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    process.exit(1);
  }
}

// Run the test
testEmail().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});