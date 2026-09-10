import { sendAdminPurchaseNotificationWithRetry } from './dist/server/services/email-robust.js';

async function testAdminEmail() {
  console.log('🔍 Testing admin email sending...');
  
  try {
    // Test sending email directly to info@b4uesports.com
    const result = await sendAdminPurchaseNotificationWithRetry({
      adminEmail: 'info@b4uesports.com',
      username: 'Test User',
      userEmail: 'test@example.com',
      userPhone: '+1234567890',
      packageName: 'Test Package',
      game: 'PUBG',
      inGameAmount: 60,
      piAmount: '10',
      usdAmount: '1.25',
      gameAccount: 'TestPlayer123',
      transactionId: 'test-transaction-id',
      paymentId: 'test-payment-id',
      txid: 'test-txid'
    });
    
    if (result.success) {
      console.log('✅ Admin email sent successfully');
    } else {
      console.log('❌ Failed to send admin email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending admin email:', error);
  }
}

testAdminEmail().catch(console.error);