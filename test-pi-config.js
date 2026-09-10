import dotenv from 'dotenv';
dotenv.config();

console.log('Pi Network Configuration Check:');
console.log('================================');

// Check if all required Pi Network environment variables are set
const requiredEnvVars = [
  'PI_SERVER_API_KEY',
  'VALIDATION_KEY', 
  'PI_CLIENT_ID'
];

let allConfigured = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const isConfigured = value && !value.includes(`your_actual_${envVar.toLowerCase()}`) && value.length > 10;
  
  console.log(`${envVar}: ${isConfigured ? '✓ Configured' : '✗ Not configured properly'}`);
  if (!isConfigured) {
    console.log(`  Current value: ${value || 'Not set'}`);
    allConfigured = false;
  }
});

console.log('\nOverall Status:', allConfigured ? '✓ All Pi Network configurations are properly set' : '✗ Some Pi Network configurations are missing or incorrect');

if (!allConfigured) {
  console.log('\nPlease update the following environment variables in your .env file:');
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    const isConfigured = value && !value.includes(`your_actual_${envVar.toLowerCase()}`) && value.length > 10;
    if (!isConfigured) {
      console.log(`  - ${envVar}`);
    }
  });
}