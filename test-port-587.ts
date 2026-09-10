import * as dotenv from 'dotenv';
import { sendPurchaseConfirmationEmail } from './server/services/email.js';

// Load environment variables
dotenv.config();

console.log('Testing SMTP Configuration with Current Settings');

async function testCurrentConfiguration() {
  try {
    console.log('Sending test email using current configuration...');
    
    const result = await sendPurchaseConfirmationEmail({
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      username: 'SMTP Test',
      packageName: 'Test Package',
      piAmount: '10',
      usdAmount: '2',
      gameAccount: 'TestAccount123',
      transactionId: 'test-transaction-587',
      paymentId: 'test-payment-587',
      isTestnet: false
    });
    
    if (result) {
      console.log('✅ Test email sent successfully with current configuration');
      return true;
    } else {
      console.log('❌ Failed to send test email with current configuration');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Test failed with current configuration:', error.message);
    return false;
  }
}

// First, let's check what the current configuration is
console.log('Current SMTP Configuration:');
console.log('- Host:', process.env.SMTP_HOST || 'smtp.hostinger.com');
console.log('- Port:', process.env.SMTP_PORT || '465');
console.log('- Secure:', process.env.SMTP_SECURE || 'true');
console.log('- User:', process.env.SMTP_USER || 'info@b4uesports.com');

async function runTest() {
  console.log('=== SMTP Configuration Test ===\n');
  
  const success = await testCurrentConfiguration();
  
  console.log('\n=== Test Results Summary ===');
  console.log(`Current Configuration: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (success) {
    console.log('\n🎉 Current SMTP configuration is working!');
    console.log('Current configuration uses:');
    console.log('- Port:', process.env.SMTP_PORT || '465');
    console.log('- Secure:', process.env.SMTP_SECURE === 'true' ? 'SSL/TLS' : 'STARTTLS');
    
    // If the user wants to try port 587, they would need to update .env:
    console.log('\nTo use port 587, update your .env file with:');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
  } else {
    console.log('\n⚠️  Current SMTP configuration failed.');
    console.log('Please check your SMTP credentials and configuration.');
  }
}

// Execute test
runTest().catch(console.error);
