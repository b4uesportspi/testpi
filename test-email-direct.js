import dotenv from 'dotenv';
dotenv.config();

async function testEmailDirect() {
  console.log('Testing email service directly...');
  
  try {
    // Import the robust email service
    const { sendPurchaseConfirmationEmailWithRetry } = await import('./dist/server/services/email-robust.js');
    
    // Test with sample data
    const testParams = {
      to: process.env.SMTP_FROM || 'info@b4uesports.com',
      username: 'Test User',
      packageName: 'Test Package - 100 UC',
      piAmount: '0.00100000',
      usdAmount: '0.0100',
      gameAccount: '{"ign":"testuser123","uid":"123456789"}',
      transactionId: 'test-transaction-id',
      paymentId: 'test-payment-id',
      isTestnet: false
    };
    
    console.log('Sending test email with params:', testParams);
    
    const result = await sendPurchaseConfirmationEmailWithRetry(testParams);
    console.log('Email sending result:', result);
    
    if (result && result.success) {
      console.log('✅ Test email sent successfully!');
    } else {
      console.log('❌ Failed to send test email');
      console.log('Error details:', result ? result.error : 'Unknown error');
    }
    
  } catch (error) {
    console.error('Error testing email service:', error);
  }
}

testEmailDirect().then(() => {
  console.log('Direct email test completed');
}).catch((error) => {
  console.error('Direct email test failed:', error);
});