// Import dotenv FIRST, just like in server/index.ts
import dotenv from "dotenv";
dotenv.config();

import { sendPurchaseConfirmationEmail } from './server/services/email.js';

console.log('Environment Variables Debug Test');
console.log('================================');

console.log('SMTP Environment Variables:');
console.log('- SMTP_HOST:', process.env.SMTP_HOST);
console.log('- SMTP_PORT:', process.env.SMTP_PORT);
console.log('- SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('- SMTP_USER:', process.env.SMTP_USER);
console.log('- SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
console.log('- SMTP_FROM:', process.env.SMTP_FROM);

console.log('\nAll Environment Variables:');
Object.keys(process.env).filter(key => key.startsWith('SMTP')).forEach(key => {
  console.log(`- ${key}:`, process.env[key]);
});

console.log('\n=== Testing Email Service ===');

async function testEmailService() {
  try {
    console.log('Sending test email...');
    const result = await sendPurchaseConfirmationEmail({
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      username: 'Debug Test',
      packageName: 'Debug Package',
      piAmount: '10',
      usdAmount: '2',
      gameAccount: 'DebugAccount123',
      transactionId: 'debug-transaction',
      paymentId: 'debug-payment',
      isTestnet: false
    });
    
    if (result) {
      console.log('✅ Email sent successfully');
      return true;
    } else {
      console.log('❌ Failed to send email');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Email test failed:', error.message);
    return false;
  }
}

// Execute test
testEmailService().then(success => {
  console.log('\n=== Test Result ===');
  console.log(success ? '✅ SUCCESS' : '❌ FAILED');
}).catch(console.error);