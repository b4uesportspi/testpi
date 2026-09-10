#!/usr/bin/env node
// Direct Node.js test for purchase confirmation email with admin BCC

async function testBCCEmail() {
  console.log('Current working directory:', process.cwd());
  console.log('SMTP_PASS from process.env:', process.env.SMTP_PASS);
  console.log('SMTP_PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'NOT SET');
  
  const { sendPurchaseConfirmationEmail } = await import('./server/services/email.js');

  console.log('Testing BCC implementation for purchase confirmation...\n');

  const testEmail = await sendPurchaseConfirmationEmail({
    to: 'test@example.com',
    username: 'TestUser',
    packageName: 'Netflix Subscription – 3.00',
    piAmount: '22.20',
    usdAmount: '3.00',
    gameAccount: 'test@email.com',
    transactionId: '5c8dd72a-b004-4003-aa26-fe8b253e1752',
    paymentId: 'TEST-PAYMENT-ID',
    game: 'NETFLIX'
  });

  console.log('\n✅ Test completed. Check logs above for BCC configuration.');
  process.exit(testEmail ? 0 : 1);
}

testBCCEmail().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
