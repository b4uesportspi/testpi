import dotenv from "dotenv";
dotenv.config();

import { sendPurchaseConfirmationEmail, sendAdminPurchaseNotification } from './server/services/email.js';

console.log('Testing Email Data Issues');
console.log('========================');

async function testEmailsWithProblematicData() {
  console.log('Testing emails with different types of game account data...\n');
  
  // Test 1: String game account (should work fine)
  try {
    console.log('1. Testing with string game account...');
    const result1 = await sendPurchaseConfirmationEmail({
      to: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'John Doe',
      packageName: 'PUBG - 60 UC',
      piAmount: '0.06',
      usdAmount: '0.001',
      gameAccount: 'PUBG123456789',
      transactionId: 'txn_string_account',
      paymentId: 'pay_string_account',
      isTestnet: false
    });
    
    console.log('String game account result:', result1 ? '✅ SUCCESS' : '❌ FAILED');
  } catch (error) {
    console.error('String game account error:', error);
  }
  
  console.log('\n--------------------------\n');
  
  // Test 2: Object game account (might cause formatting issues)
  try {
    console.log('2. Testing with object game account...');
    const result2 = await sendPurchaseConfirmationEmail({
      to: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'Jane Smith',
      packageName: 'MLBB - 56 Diamonds',
      piAmount: '0.05',
      usdAmount: '0.0008',
      gameAccount: JSON.stringify({ userId: 'MLBB123456', zoneId: 'ZONE789' }),
      transactionId: 'txn_object_account',
      paymentId: 'pay_object_account',
      isTestnet: false
    });
    
    console.log('Object game account result:', result2 ? '✅ SUCCESS' : '❌ FAILED');
  } catch (error) {
    console.error('Object game account error:', error);
  }
  
  console.log('\n--------------------------\n');
  
  // Test 3: Empty or missing data
  try {
    console.log('3. Testing with minimal data...');
    const result3 = await sendPurchaseConfirmationEmail({
      to: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'Minimal User',
      packageName: 'Test Package',
      piAmount: '0.01',
      usdAmount: '0.0002',
      gameAccount: '',
      transactionId: 'txn_minimal',
      paymentId: 'pay_minimal',
      isTestnet: false
    });
    
    console.log('Minimal data result:', result3 ? '✅ SUCCESS' : '❌ FAILED');
  } catch (error) {
    console.error('Minimal data error:', error);
  }
  
  console.log('\n--------------------------\n');
  
  // Test 4: Admin notification with comprehensive data
  try {
    console.log('4. Testing admin notification with comprehensive data...');
    const result4 = await sendAdminPurchaseNotification({
      adminEmail: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      username: 'Complete User',
      userEmail: 'complete@example.com',
      userPhone: '+9876543210',
      packageName: 'Complete Package - 100 Items',
      game: 'PUBG',
      inGameAmount: 100,
      piAmount: '0.10',
      usdAmount: '0.002',
      gameAccount: 'COMPLETE123456789',
      transactionId: 'txn_complete',
      paymentId: 'pay_complete',
      txid: 'tx_complete_1234567890'
    });
    
    console.log('Admin notification result:', result4 ? '✅ SUCCESS' : '❌ FAILED');
  } catch (error) {
    console.error('Admin notification error:', error);
  }
  
  console.log('\n=== Test Completed ===');
  console.log('Check your email to see how different data types are displayed.');
  console.log('Pay special attention to:');
  console.log('- How JSON stringified objects appear in emails');
  console.log('- Whether empty fields are handled properly');
  console.log('- Whether all information is visible and readable');
}

// Execute test
testEmailsWithProblematicData().catch(console.error);