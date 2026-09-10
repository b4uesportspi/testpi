import dotenv from 'dotenv';
dotenv.config();

console.log('Environment variables check:');
console.log('MARKETING_EMAIL_SECRET:', process.env.MARKETING_EMAIL_SECRET ? 'SET' : 'NOT SET');

if (process.env.MARKETING_EMAIL_SECRET) {
  console.log('Secret key length:', process.env.MARKETING_EMAIL_SECRET.length);
} else {
  console.log('⚠️  MARKETING_EMAIL_SECRET is not set!');
  console.log('This is required for the monthly marketing email cron job to work.');
}