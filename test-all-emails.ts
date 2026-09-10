import dotenv from 'dotenv';
dotenv.config();

import { sendPurchaseConfirmationEmail, sendProfileUpdateEmail, sendAdminPurchaseNotification } from './server/services/email.js';

console.log('📧 Testing All Email Functions in B4U Esports');
console.log('==========================================\n');

async function testAllEmails() {
  const testEmail = process.env.SMTP_USER || 'info@b4uesports.com';
  
  console.log('1️⃣ Testing Purchase Confirmation Email...');
  try {
    const purchaseResult = await sendPurchaseConfirmationEmail({
      to: testEmail,
      username: 'Test User',
      packageName: 'PUBG - 1000 UC Package',
      piAmount: '10.5',
      usdAmount: '2.50',
      gameAccount: 'PUBG123456',
      transactionId: 'txn_1234567890',
      paymentId: 'pay_0987654321'
    });
    
    console.log(purchaseResult ? '✅ Purchase confirmation email sent successfully' : '❌ Purchase confirmation email failed');
  } catch (error) {
    console.error('❌ Purchase confirmation email error:', error);
  }
  
  console.log('\n2️⃣ Testing Profile Update Email...');
  try {
    const profileResult = await sendProfileUpdateEmail({
      to: testEmail,
      username: 'Test User',
      profileData: {
        email: 'test@example.com',
        phone: '+1234567890',
        country: 'United States',
        gameAccounts: {
          pubg: {
            ign: 'TestPlayer',
            uid: 'PUBG123456'
          },
          mlbb: {
            userId: 'MLBB789012',
            zoneId: 'ZONE345678'
          }
        },
        referralCode: 'REF123456'
      }
    });
    
    console.log(profileResult ? '✅ Profile update email sent successfully' : '❌ Profile update email failed');
  } catch (error) {
    console.error('❌ Profile update email error:', error);
  }
  
  console.log('\n3️⃣ Testing Admin Purchase Notification...');
  try {
    const adminResult = await sendAdminPurchaseNotification({
      adminEmail: testEmail,
      username: 'Test User',
      userEmail: 'customer@example.com',
      userPhone: '+1234567890',
      packageName: 'MLBB - 2000 Diamonds',
      game: 'MLBB',
      inGameAmount: 2000,
      piAmount: '15.75',
      usdAmount: '3.75',
      gameAccount: 'MLBB789012:ZONE345678',
      transactionId: 'txn_1234567891',
      paymentId: 'pay_0987654322',
      txid: 'tx_1234567890abcdef'
    });
    
    console.log(adminResult ? '✅ Admin purchase notification sent successfully' : '❌ Admin purchase notification failed');
  } catch (error) {
    console.error('❌ Admin purchase notification error:', error);
  }
  
  console.log('\n✅ All email tests completed!');
}

// Run the tests
testAllEmails().catch(console.error);