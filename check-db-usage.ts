import dotenv from 'dotenv';
import { db, isMockDatabase } from './server/db.js';

// Load environment variables
dotenv.config();

console.log('Database Usage Check:');
console.log('====================');

if (isMockDatabase) {
  console.log('❌ Application is using MOCK database');
  console.log('This means data will NOT be persisted!');
} else {
  console.log('✅ Application is using REAL PostgreSQL database');
  console.log('Data will be properly stored and retrieved');
}

console.log('\nEnvironment Variables:');
console.log('=====================');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NETWORK:', process.env.NETWORK || 'NOT SET');

if (process.env.DATABASE_URL && process.env.NETWORK === 'MAINNET') {
  console.log('\n🎉 Your application is properly configured for MAINNET!');
  console.log('   - Using real PostgreSQL database');
  console.log('   - NETWORK set to MAINNET');
} else {
  console.log('\n⚠️  Configuration issues detected');
}