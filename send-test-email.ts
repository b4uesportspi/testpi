import { sendPurchaseConfirmationEmail } from './server/services/email';

async function sendTestEmail() {
  console.log('Sending test email with provided logos...');
  
  // Send a test purchase confirmation email
  const result = await sendPurchaseConfirmationEmail({
    to: 'info@b4uesports.com',
    username: 'TestUser',
    packageName: 'PUBG - 60 UC',
    piAmount: '0.06',
    usdAmount: '0.001',
    gameAccount: 'PUBG123456',
    transactionId: 'txn_1234567890',
    paymentId: 'pay_0987654321',
    isTestnet: false
  });
  
  if (result) {
    console.log('Test email sent successfully!');
  } else {
    console.log('Failed to send test email.');
  }
}

sendTestEmail().catch(console.error);