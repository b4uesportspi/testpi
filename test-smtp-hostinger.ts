#!/usr/bin/env node

/**
 * SMTP Configuration Test with Special Characters
 * Tests the Hostinger SMTP connection with the actual credentials
 * Usage: npm run test:smtp-hostinger
 */

import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

console.log('\n🧪 SMTP Configuration Test - Hostinger');
console.log('=' .repeat(60));

// Get SMTP config from environment
const config = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
  fromName: process.env.SMTP_FROM_NAME,
};

console.log('\n📋 Configuration Summary:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  User: ${config.user}`);
console.log(`  From: ${config.fromName} <${config.from}>`);
console.log(`  Password: ${config.pass ? '✅ SET' : '❌ NOT SET'}`);
console.log(`  Password Length: ${(config.pass || '').length} characters`);

// Show password analysis
if (config.pass) {
  const specialChars = {
    '/': config.pass.includes('/'),
    '*': config.pass.includes('*'),
    '#': config.pass.includes('#'),
    '$': config.pass.includes('$'),
    '(': config.pass.includes('('),
    ')': config.pass.includes(')'),
    '@': config.pass.includes('@'),
    '-': config.pass.includes('-'),
    '_': config.pass.includes('_'),
  };
  
  const hasSpecialChars = Object.values(specialChars).some(v => v);
  console.log(`  Contains Special Characters: ${hasSpecialChars ? '✅ YES' : '❌ NO'}`);
  
  if (hasSpecialChars) {
    console.log('  Special Characters Found:');
    Object.entries(specialChars).forEach(([char, found]) => {
      if (found) console.log(`    • ${char}`);
    });
  }
}

// Validate configuration
console.log('\n✔️  Configuration Validation:');
const isValid = config.host && config.port && config.user && config.pass && config.from;

if (!isValid) {
  console.log('❌ Missing required SMTP configuration:');
  if (!config.host) console.log('  • SMTP_HOST');
  if (!config.port) console.log('  • SMTP_PORT');
  if (!config.user) console.log('  • SMTP_USER');
  if (!config.pass) console.log('  • SMTP_PASS');
  if (!config.from) console.log('  • SMTP_FROM');
  process.exit(1);
}

console.log('✅ All required fields are set');

// Create transporter
const port = config.port;
const isSecure = port === 465;

console.log('\n🔐 Transport Configuration:');
console.log(`  Security Mode: ${isSecure ? 'STARTTLS (port 465)' : 'TLS (port 587)'}`);
console.log(`  Require TLS: ${!isSecure ? 'YES' : 'NO'}`);
console.log(`  Reject Unauthorized: NO (self-signed certs allowed)`);

const transporter = nodemailer.createTransport({
  host: config.host,
  port: port,
  secure: isSecure,
  requireTLS: !isSecure,
  auth: {
    user: config.user,
    pass: config.pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Test connection
console.log('\n🔗 Testing SMTP Connection...');

transporter.verify((error, success) => {
  if (error) {
    console.log('\n❌ SMTP Connection Failed!');
    console.log('Error Message:', error.message);
    
    if (error.response) {
      console.log('SMTP Response:', error.response);
    }
    
    if ((error as any).code) {
      console.log('Error Code:', (error as any).code);
    }
    
    console.log('\n🔍 Troubleshooting Steps:');
    console.log('1. Verify SMTP_USER is correct');
    console.log('2. Verify SMTP_PASS contains the exact password');
    console.log('3. Check that password is wrapped in SINGLE quotes in .env');
    console.log('4. Verify SMTP access is enabled in Hostinger dashboard');
    console.log('5. Check that port 587 is accessible (not blocked by firewall)');
    
    console.log('\n📝 Your Credentials:');
    console.log(`   User: ${config.user}`);
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log('\n⚠️  Password format: Use single quotes in .env');
    console.log(`   SMTP_PASS='your-password-here'`);
    
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!');
    console.log('\nTransporter Ready:');
    console.log(`  Server: ${config.host}:${config.port}`);
    console.log(`  User: ${config.user}`);
    console.log(`  From: ${config.fromName} <${config.from}>`);
    
    console.log('\n✅ Email service is ready to send emails!');
    process.exit(0);
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n⏱️  Connection test timed out (30 seconds)');
  process.exit(1);
}, 30000);
