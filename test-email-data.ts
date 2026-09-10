import dotenv from "dotenv";
dotenv.config();

import { sendPurchaseConfirmationEmail, sendAdminPurchaseNotification } from './server/services/email.js';

console.log('Testing Email Data Content');
console.log('==========================');

async function testEmailData() {
  console.log('Sending test emails with comprehensive data...\n');
  
  // Test purchase confirmation email with comprehensive data
  try {
    console.log('1. Testing Purchase Confirmation Email...');
    const purchaseResult = await sendPurchaseConfirmationEmail({
      to: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'John Doe',
      packageName: 'PUBG - 60 UC',
      piAmount: '0.06',
      usdAmount: '0.001',
      gameAccount: 'PUBG123456789',
      transactionId: 'txn_9876543210abcdef',
      paymentId: 'pay_1234567890abcdef',
      isTestnet: false
    });
    
    console.log('Purchase confirmation email result:', purchaseResult ? '✅ SUCCESS' : '❌ FAILED');
  } catch (error) {
    console.error('Purchase confirmation email error:', error);
  }
  
  console.log('\n--------------------------\n');
  
  // Test admin purchase notification with comprehensive data
  try {
    console.log('2. Testing Admin Purchase Notification Email...');
    const adminResult = await sendAdminPurchaseNotification({
      adminEmail: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'John Doe',
      userEmail: 'johndoe@example.com',
      userPhone: '+1234567890',
      packageName: 'PUBG - 60 UC',
      game: 'PUBG',
      inGameAmount: 60,
      piAmount: '0.06',
      usdAmount: '0.001',
      gameAccount: 'PUBG123456789',
      transactionId: 'txn_9876543210abcdef',
      paymentId: 'pay_1234567890abcdef',
      txid: 'tx_abcdef1234567890'
    });
    
    console.log('Admin purchase notification email result:', adminResult ? '✅ SUCCESS' : '❌ FAILED');
  } catch (error) {
    console.error('Admin purchase notification email error:', error);
  }
  
  console.log('\n=== Test Completed ===');
  console.log('Check your email to verify that all information is displayed correctly.');
}

// Execute test
testEmailData().catch(console.error);