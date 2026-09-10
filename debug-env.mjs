#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env file
const envPath = path.resolve('./.env');
console.log('Reading .env from:', envPath);
console.log('File exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Loaded env vars:', result.parsed ? Object.keys(result.parsed).length : 0);
}

// Check SMTP_PASS
const smtpPass = process.env.SMTP_PASS;
console.log('\nSMTP_PASS value:');
console.log('  String:', smtpPass);
console.log('  Length:', smtpPass ? smtpPass.length : 0);
console.log('  Char codes:', smtpPass ? Array.from(smtpPass).map(c => c.charCodeAt(0)).join(',') : 'N/A');
console.log('  Hex:', smtpPass ? Buffer.from(smtpPass).toString('hex') : 'N/A');

// Also check other SMTP vars
console.log('\nAll SMTP vars:');
console.log('  SMTP_HOST:', process.env.SMTP_HOST);
console.log('  SMTP_PORT:', process.env.SMTP_PORT);
console.log('  SMTP_USER:', process.env.SMTP_USER);
console.log('  SMTP_FROM:', process.env.SMTP_FROM);
