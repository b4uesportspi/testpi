// Test script to verify referral code generation
console.log('Testing referral code generation...');

// Test the generateReferralCode function
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'REF'; // Prefix with REF as in the database function
  for (let i = 0; i < 6; i++) { // 6 random characters to match the database function
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a few test codes
console.log('Generated referral codes:');
for (let i = 0; i < 5; i++) {
  console.log(`  ${i+1}. ${generateReferralCode()}`);
}

console.log('Test completed successfully!');