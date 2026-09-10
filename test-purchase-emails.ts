import dotenv from 'dotenv';
import { sendPurchaseConfirmationEmail, sendAdminPurchaseNotification } from './server/services/email.ts';

// Load environment variables
dotenv.config();

async function testPurchaseEmails() {
  console.log('Testing purchase email functionality...');
  
  // Check if EmailJS is configured
  const requiredVars = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY'];
  let allConfigured = true;
  
  for (const envVar of requiredVars) {
    const value = process.env[envVar];
    if (!value || value.includes('your_') || value.includes('placeholder')) {
      console.error(`❌ ${envVar} is not properly configured`);
      console.log(`   Current value: ${value || 'NOT SET'}`);
      allConfigured = false;
    } else {
      console.log(`✅ ${envVar} is set`);
    }
  }
  
  if (!allConfigured) {
    console.log('\n❌ EmailJS is not properly configured');
    console.log('Please update your .env file with actual EmailJS credentials');
    return;
  }
  
  console.log('\n✅ EmailJS configuration is complete');
  
  // Test sending a purchase confirmation email to user
  try {
    console.log('\nSending test purchase confirmation email to user...');
    
    const userResult = await sendPurchaseConfirmationEmail({
      to: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'Test User',
      packageName: '60 UC',
      piAmount: '100',
      usdAmount: '20',
      gameAccount: 'TestAccount (123456)',
      transactionId: 'test-transaction-id',
      paymentId: 'test-payment-id',
      isTestnet: false
    });
    
    if (userResult) {
      console.log('✅ Purchase confirmation email sent successfully to user!');
    } else {
      console.log('❌ Failed to send purchase confirmation email to user');
    }
  } catch (error) {
    console.error('Error sending purchase confirmation email to user:', error);
    console.log('❌ Failed to send purchase confirmation email to user');
  }
  
  // Test sending a purchase notification email to admin
  try {
    console.log('\nSending test purchase notification email to admin...');
    
    const adminResult = await sendAdminPurchaseNotification({
      adminEmail: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'Test User',
      userEmail: 'testuser@example.com',
      userPhone: '+1234567890',
      packageName: '60 UC',
      game: 'PUBG',
      inGameAmount: 60,
      piAmount: '100',
      usdAmount: '20',
      gameAccount: 'TestAccount (123456)',
      transactionId: 'test-transaction-id',
      paymentId: 'test-payment-id',
      txid: 'test-txid'
    });
    
    if (adminResult) {
      console.log('✅ Purchase notification email sent successfully to admin!');
    } else {
      console.log('❌ Failed to send purchase notification email to admin');
    }
  } catch (error) {
    console.error('Error sending purchase notification email to admin:', error);
    console.log('❌ Failed to send purchase notification email to admin');
  }
  
  console.log('\nTest completed. Check your email to verify receipt.');
}

testPurchaseEmails();