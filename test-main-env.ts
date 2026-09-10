/**
 * Test script to verify environment variables are loaded in the main API file
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

// Test that required environment variables are present
console.log('Testing environment variables in main API file...');

const requiredEnvVars = [
  'PI_SERVER_API_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'SMTP_USER',
  'SMTP_PASS'
];

let allPresent = true;

for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: SET`);
    if (envVar === 'PI_SERVER_API_KEY') {
      console.log(`   Length: ${process.env[envVar]!.length}`);
      console.log(`   Preview: ${process.env[envVar]!.substring(0, 10)}...`);
    }
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
    allPresent = false;
  }
}

if (allPresent) {
  console.log('\n✅ All required environment variables are present');
} else {
  console.log('\n❌ Some required environment variables are missing');
}

console.log('\nTest completed.');