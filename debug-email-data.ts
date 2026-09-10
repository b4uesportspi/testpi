// Test to debug what data is being passed to email functions
import dotenv from "dotenv";
dotenv.config();

console.log('Debugging Email Data Flow');
console.log('========================');

// Simulate the data processing that happens in routes.ts
function simulateGameDataProcessing() {
  console.log('\n1. Simulating game account data processing...\n');
  
  // Example game account data that might come from different sources
  const gameAccountExamples = [
    'PUBG123456789',
    { ign: 'PlayerName', uid: 'PUBG123456789' },
    { userId: 'MLBB123456', zoneId: 'ZONE789' },
    { tag: '#COC123456' }
  ];
  
  gameAccountExamples.forEach((gameAccount, index) => {
    console.log(`Example ${index + 1}:`);
    console.log('  Original:', typeof gameAccount === 'string' ? `"${gameAccount}"` : JSON.stringify(gameAccount, null, 2));
    
    // This is the processing that happens in routes.ts
    const gameAccountString = typeof gameAccount === 'string' 
      ? gameAccount 
      : JSON.stringify(gameAccount);
      
    console.log('  Processed:', `"${gameAccountString}"`);
    console.log('  Type:', typeof gameAccountString);
    console.log();
  });
}

// Test what the email templates would render with different data
function testEmailTemplateRendering() {
  console.log('\n2. Testing email template rendering...\n');
  
  // Simulate the parameters that would be passed to sendPurchaseConfirmationEmail
  const testParams = {
    to: 'user@example.com',
    username: 'John Doe',
    packageName: 'PUBG - 60 UC',
    piAmount: '0.06',
    usdAmount: '0.001',
    gameAccount: 'PUBG123456789',
    transactionId: 'txn_9876543210abcdef',
    paymentId: 'pay_1234567890abcdef',
    isTestnet: false
  };
  
  console.log('Purchase Confirmation Email Parameters:');
  Object.entries(testParams).forEach(([key, value]) => {
    console.log(`  ${key}:`, typeof value === 'string' ? `"${value}"` : value);
  });
  
  console.log('\nAdmin Purchase Notification Parameters:');
  const adminParams = {
    adminEmail: 'admin@b4uesports.com',
    username: 'John Doe',
    userEmail: 'user@example.com',
    userPhone: '+1234567890',
    packageName: 'PUBG - 60 UC',
    game: 'PUBG',
    inGameAmount: 60,
    piAmount: '0.06',
    usdAmount: '0.001',
    gameAccount: 'PUBG123456789',
    transactionId: 'txn_9876543210abcdef',
    paymentId: 'pay_1234567890abcdef',
    txid: 'tx_abcdef1234567890'
  };
  
  Object.entries(adminParams).forEach(([key, value]) => {
    console.log(`  ${key}:`, typeof value === 'string' ? `"${value}"` : value);
  });
}

// Run the tests
simulateGameDataProcessing();
testEmailTemplateRendering();

console.log('\n=== Debug Information Complete ===');
console.log('If emails are missing information, check:');
console.log('1. That all required data fields are being passed to the email functions');
console.log('2. That gameAccount data is properly formatted (not JSON objects)');
console.log('3. That environment variables are correctly set');
console.log('4. That the email templates are correctly interpolating the data');