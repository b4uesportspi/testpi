/**
 * Debug environment variables
 */

import dotenv from 'dotenv';
import fs from 'fs';

// Check if .env.production file exists
console.log('.env.production file exists:', fs.existsSync('.env.production'));

// Load production environment variables
const result = dotenv.config({ path: '.env.production' });

console.log('Dotenv config result:', result.parsed ? 'Loaded' : 'Not loaded');
if (result.error) {
  console.error('Dotenv error:', result.error);
}

// Check specific variables
console.log('PI_SERVER_API_KEY:', process.env.PI_SERVER_API_KEY ? 'SET' : 'NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
console.log('SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');

if (process.env.PI_SERVER_API_KEY) {
  console.log('API Key length:', process.env.PI_SERVER_API_KEY.length);
  console.log('API Key starts with:', process.env.PI_SERVER_API_KEY.substring(0, 10) + '...');
}

if (process.env.JWT_SECRET) {
  console.log('JWT_SECRET length:', process.env.JWT_SECRET.length);
}

if (process.env.SESSION_SECRET) {
  console.log('SESSION_SECRET length:', process.env.SESSION_SECRET.length);
}