import { sendPurchaseConfirmationEmail, sendProfileUpdateEmail, sendAdminPurchaseNotification } from './server/services/email';

async function testModernEmails() {
  console.log('Testing modern email templates...');
  
  // Test purchase confirmation email
  const purchaseResult = await sendPurchaseConfirmationEmail({
    to: 'test@example.com',
    username: 'JohnDoe',
    packageName: 'PUBG - 60 UC',
    piAmount: '0.06',
    usdAmount: '0.001',
    gameAccount: 'PUBG123456',
    transactionId: 'txn_123456789',
    paymentId: 'pay_987654321',
    isTestnet: false
  });
  
  console.log('Purchase confirmation email sent:', purchaseResult);
  
  // Test profile update email
  const profileResult = await sendProfileUpdateEmail({
    to: 'test@example.com',
    username: 'JohnDoe',
    profileData: {
      email: 'johndoe@example.com',
      phone: '+1234567890',
      country: 'United States',
      gameAccounts: {
        pubg: {
          ign: 'JohnDoeGamer',
          uid: 'PUBG123456'
        },
        mlbb: {
          userId: 'MLBB789012',
          zoneId: 'ZONE456'
        },
        coc: {
          tag: '#COC789012'
        }
      },
      referralCode: 'REF123456'
    }
  });
  
  console.log('Profile update email sent:', profileResult);
  
  // Test admin purchase notification
  const adminResult = await sendAdminPurchaseNotification({
    adminEmail: 'admin@example.com',
    username: 'JohnDoe',
    userEmail: 'johndoe@example.com',
    userPhone: '+1234567890',
    packageName: 'MLBB - 56 Diamonds',
    game: 'MLBB',
    inGameAmount: 56,
    piAmount: '3.0',
    usdAmount: '3.0',
    gameAccount: 'MLBB789012',
    transactionId: 'txn_123456789',
    paymentId: 'pay_987654321',
    txid: 'tx_123456789abcdef'
  });
  
  console.log('Admin purchase notification sent:', adminResult);
}

testModernEmails().catch(console.error);