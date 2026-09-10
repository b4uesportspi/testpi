// Simple script to test the current domain configuration
console.log('Current domain:', window.location.origin);
console.log('Expected domain for Pi Browser:', 'https://b4uesportstest.vercel.app');

if (window.location.origin === 'https://b4uesportstest.vercel.app') {
  console.log('✅ Domain is correctly configured for Pi Browser');
} else {
  console.log('❌ Domain mismatch! Pi Browser requires exact domain match');
  console.log('Please ensure your app is deployed to https://b4uesportstest.vercel.app');
}
