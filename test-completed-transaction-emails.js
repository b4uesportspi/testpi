import dotenv from 'dotenv';
dotenv.config();

async function testCompletedTransactionEmails() {
  console.log('Testing completed transaction emails...');
  
  try {
    // Import the robust email service
    const { sendPurchaseConfirmationEmailWithRetry, sendAdminPurchaseNotificationWithRetry } = await import('./dist/server/services/email-robust.js');
    
    // Test data
    const transactionData = {
      user_email: process.env.SMTP_FROM || 'info@b4uesports.com',
      user_username: 'Test User',
      package_name: 'PUBG - 100 UC',
      pi_amount: '0.00100000',
      usd_amount: '0.0100',
      game_account: '{"ign":"testplayer123","uid":"987654321"}',
      id: 'test-transaction-id-123',
      payment_id: 'test-payment-id-123',
      txid: 'test-txid-123',
      package_game: 'PUBG',
      package_in_game_amount: 100,
      user_phone: '+1234567890'
    };
    
    // 1️⃣ Send email to user
    console.log('Sending purchase confirmation email to user...');
    if (transactionData.user_email) {
      const userResult = await sendPurchaseConfirmationEmailWithRetry({
        to: transactionData.user_email,
        username: transactionData.user_username,
        packageName: transactionData.package_name,
        piAmount: transactionData.pi_amount.toString(),
        usdAmount: transactionData.usd_amount.toString(),
        gameAccount: JSON.stringify(transactionData.game_account),
        transactionId: transactionData.id,
        paymentId: transactionData.payment_id,
        isTestnet: false
      });
      console.log('User email result:', userResult);
    }
    
    // 2️⃣ Send email to admin
    console.log('Sending admin purchase notification email...');
    const adminResult = await sendAdminPurchaseNotificationWithRetry({
      adminEmail: process.env.SMTP_FROM || 'info@b4uesports.com',
      username: transactionData.user_username,
      userEmail: transactionData.user_email,
      userPhone: transactionData.user_phone || 'Not provided',
      packageName: transactionData.package_name,
      game: transactionData.package_game,
      inGameAmount: transactionData.package_in_game_amount,
      piAmount: transactionData.pi_amount.toString(),
      usdAmount: transactionData.usd_amount.toString(),
      gameAccount: JSON.stringify(transactionData.game_account),
      transactionId: transactionData.id,
      paymentId: transactionData.payment_id,
      txid: transactionData.txid || ''
    });
    console.log('Admin email result:', adminResult);
    
    console.log('✅ Completed transaction email test finished');
    
  } catch (error) {
    console.error('❌ Error testing completed transaction emails:', error);
  }
}

testCompletedTransactionEmails().then(() => {
  console.log('Completed transaction email test completed');
}).catch((error) => {
  console.error('Completed transaction email test failed:', error);
});