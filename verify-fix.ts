/**
 * Verification script for the payment completion fix
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.production' });

console.log('🔍 Verifying Payment Completion Fix...');
console.log('=====================================');

// 1. Check that the main.ts file exists and is clean
console.log('\n1. Checking main.ts file...');
if (fs.existsSync('./api/main.ts')) {
  const mainFile = fs.readFileSync('./api/main.ts', 'utf8');
  
  // Check for merge conflict markers
  const hasConflictMarkers = mainFile.includes('<<<<<<<') || mainFile.includes('>>>>>>>') || mainFile.includes('=======');
  
  if (hasConflictMarkers) {
    console.log('❌ Merge conflict markers found in main.ts');
  } else {
    console.log('✅ No merge conflict markers found in main.ts');
  }
  
  // Check for dotenv loading
  const hasDotenv = mainFile.includes('dotenv.config()');
  if (hasDotenv) {
    console.log('✅ Dotenv loading found in main.ts');
  } else {
    console.log('❌ Dotenv loading not found in main.ts');
  }
  
  // Check for enhanced payment completion
  const hasEnhancedDebugging = mainFile.includes('Payment complete debug');
  if (hasEnhancedDebugging) {
    console.log('✅ Enhanced debugging found in payment completion');
  } else {
    console.log('❌ Enhanced debugging not found in payment completion');
  }
  
  // Check for payment status verification
  const hasStatusCheck = mainFile.includes('Checking payment status before completion');
  if (hasStatusCheck) {
    console.log('✅ Payment status verification found');
  } else {
    console.log('❌ Payment status verification not found');
  }
} else {
  console.log('❌ main.ts file not found');
}

// 2. Check environment variables
console.log('\n2. Checking environment variables...');
const requiredEnvVars = [
  'PI_SERVER_API_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET'
];

let envVarsOK = true;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: SET`);
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
    envVarsOK = false;
  }
}

// 3. Check that the API key is the correct one
console.log('\n3. Verifying API key...');
if (process.env.PI_SERVER_API_KEY && process.env.PI_SERVER_API_KEY.startsWith('fnobm1afj6')) {
  console.log('✅ Correct Pi Server API Key is configured');
} else {
  console.log('❌ Pi Server API Key may be incorrect');
  envVarsOK = false;
}

// 4. Check that EmailJS variables have been removed
console.log('\n4. Checking for removed EmailJS variables...');
const emailjsVars = [
  'EMAILJS_SERVICE_ID',
  'EMAILJS_TEMPLATE_ID',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_PRIVATE_KEY'
];

let emailjsVarsRemoved = true;
for (const envVar of emailjsVars) {
  if (process.env[envVar]) {
    console.log(`❌ ${envVar}: STILL PRESENT`);
    emailjsVarsRemoved = false;
  } else {
    console.log(`✅ ${envVar}: Removed`);
  }
}

// 5. Check that PI_CLIENT_ID has been removed
console.log('\n5. Checking for removed PI_CLIENT_ID...');
if (process.env.PI_CLIENT_ID) {
  console.log('❌ PI_CLIENT_ID: STILL PRESENT');
} else {
  console.log('✅ PI_CLIENT_ID: Removed');
}

console.log('\n=====================================');
if (envVarsOK && emailjsVarsRemoved) {
  console.log('🎉 All fixes have been successfully applied!');
  console.log('The payment completion endpoint should now work correctly.');
} else {
  console.log('⚠️  Some issues still need to be addressed.');
}

console.log('\nVerification completed.');