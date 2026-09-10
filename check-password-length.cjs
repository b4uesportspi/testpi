// Check the actual password length from environment variables
require('dotenv').config();

console.log('SMTP Password Analysis:');
console.log('- Raw password value:', process.env.SMTP_PASS);
console.log('- Password length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 'NOT SET');

// Check if password contains special characters that might cause issues
if (process.env.SMTP_PASS) {
  console.log('\nPassword Details:');
  console.log('- Contains special characters:', /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(process.env.SMTP_PASS));
  console.log('- Contains spaces:', process.env.SMTP_PASS.includes(' '));
  console.log('- Starts with quote:', process.env.SMTP_PASS.startsWith('"'));
  console.log('- Ends with quote:', process.env.SMTP_PASS.endsWith('"'));
  
  // Show masked password
  const masked = '*'.repeat(Math.min(process.env.SMTP_PASS.length, 15)) + (process.env.SMTP_PASS.length > 15 ? '...' : '');
  console.log('- Masked password:', masked);
}