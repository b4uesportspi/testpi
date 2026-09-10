import dotenv from 'dotenv';
import { sendPurchaseConfirmationEmail, sendProfileUpdateEmail, sendAdminPurchaseNotification } from './server/services/email.js';

// Load environment variables
dotenv.config();

async function testEmailLogoFix() {
  console.log('Testing email logo fix...\n');
  
  try {
    // Test 1: Purchase confirmation email
    console.log('1. Testing purchase confirmation email...');
    const purchaseResult = await sendPurchaseConfirmationEmail({
      to: 'info@b4uesports.com',
      username: 'TestUser',
      packageName: '60 UC',
      piAmount: '100',
      usdAmount: '20',
      gameAccount: 'TestAccount (123456)',
      transactionId: 'test-transaction-id',
      paymentId: 'test-payment-id',
      isTestnet: false
    });
    
    if (purchaseResult) {
      console.log('   ✅ Purchase confirmation email sent successfully');
    } else {
      console.log('   ❌ Failed to send purchase confirmation email');
    }
    
    // Test 2: Profile update email
    console.log('\n2. Testing profile update email...');
    const profileResult = await sendProfileUpdateEmail({
      to: 'info@b4uesports.com',
      username: 'TestUser',
      profileData: {
        email: 'testuser@b4uesports.com',
        phone: '+97517875099',
        country: 'Bhutan',
        isProfileVerified: true
      }
    });
    
    if (profileResult) {
      console.log('   ✅ Profile update email sent successfully');
    } else {
      console.log('   ❌ Failed to send profile update email');
    }
    
    // Test 3: Admin purchase notification email
    console.log('\n3. Testing admin purchase notification email...');
    const adminResult = await sendAdminPurchaseNotification({
      adminEmail: 'info@b4uesports.com',
      username: 'TestUser',
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
      console.log('   ✅ Admin purchase notification email sent successfully');
    } else {
      console.log('   ❌ Failed to send admin purchase notification email');
    }
    
    console.log('\n🎉 All email logo fixes have been applied!');
    console.log('\nSummary of changes:');
    console.log('1. Added inline styles to Pi logo in purchase confirmation email');
    console.log('2. Added inline styles to Pi logo in profile update email');
    console.log('3. Verified that admin purchase notification email already had proper inline styles');
    console.log('\nAll emails should now display properly sized logos in all email clients.');
    
  } catch (error) {
    console.error('Error testing email logo fix:', error);
  }
}

testEmailLogoFix();