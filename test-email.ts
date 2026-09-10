import dotenv from 'dotenv';
import { sendPurchaseConfirmationEmail } from './server/services/email.ts';

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('Testing email functionality with Hostinger SMTP...');
  
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Hostinger SMTP is not properly configured. Please check your environment variables.');
    return;
  }
  
  console.log('Hostinger SMTP configuration found:');
  console.log('- SMTP Host:', process.env.SMTP_HOST);
  console.log('- SMTP Port:', process.env.SMTP_PORT || '465');
  console.log('- SMTP User:', process.env.SMTP_USER);
  console.log('- SMTP Password:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
  
  // Test sending a purchase confirmation email
  try {
    console.log('Sending test email...');
    
    const result = await sendPurchaseConfirmationEmail({
      to: process.env.SMTP_USER || 'info@b4uesports.com',
      username: 'Test User',
      packageName: '60 UC',
      piAmount: '100',
      usdAmount: '20',
      gameAccount: 'TestAccount (123456)',
      transactionId: 'test-transaction-id',
      paymentId: 'test-payment-id',
      isTestnet: false
    });
    
    if (result) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Failed to send email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    console.log('❌ Failed to send email');
  }
}

testEmail();