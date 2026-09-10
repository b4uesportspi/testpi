import { sendPurchaseConfirmationEmail } from './server/services/email.ts';

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
