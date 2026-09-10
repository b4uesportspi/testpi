#!/usr/bin/env node
// Send purchase confirmation email to admin

async function sendAdminPurchaseConfirmation() {
  const { sendPurchaseConfirmationEmail } = await import('./server/services/email.js');

  console.log('Sending purchase confirmation email to admin...\n');

  const adminEmail = await sendPurchaseConfirmationEmail({
    to: 'info@b4uesports.com',
    username: 'Admin Test',
    packageName: 'Netflix Subscription – 3.00',
    piAmount: '22.20',
    usdAmount: '3.00',
    gameAccount: 'admin@b4uesports.com',
    transactionId: 'ADMIN-TEST-TXN-' + Date.now(),
    paymentId: 'ADMIN-PAYMENT-' + Date.now(),
    game: 'NETFLIX'
  });

  console.log('\n✅ Admin purchase confirmation email sent.');
  process.exit(adminEmail ? 0 : 1);
}

sendAdminPurchaseConfirmation().catch(err => {
  console.error('❌ Error sending admin email:', err.message);
  process.exit(1);
});
