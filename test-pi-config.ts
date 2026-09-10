#!/usr/bin/env tsx
// Test script to verify Pi Network configuration
import dotenv from 'dotenv';

dotenv.config();

console.log('=== Pi Network Configuration Test ===');
console.log('Environment Variables Status:');
console.log('- PI_SERVER_API_KEY:', process.env.PI_SERVER_API_KEY ? 'SET' : 'NOT SET');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

if (process.env.PI_SERVER_API_KEY && process.env.PI_SERVER_API_KEY !== 'your_pi_server_api_key_here') {
  console.log('✅ PI_SERVER_API_KEY is properly configured');
} else {
  console.log('❌ PI_SERVER_API_KEY is NOT properly configured');
  console.log('   Please set a valid Pi Network server API key');
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'fallback-secret' && process.env.JWT_SECRET.length >= 32) {
  console.log('✅ JWT_SECRET is properly configured');
} else {
  console.log('❌ JWT_SECRET is NOT properly configured');
  console.log('   Please set a secure JWT secret (at least 32 characters)');
}

if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL is set');
} else {
  console.log('❌ DATABASE_URL is NOT set');
  console.log('   Please set your Supabase database connection string');
}

console.log('=== Configuration Test Complete ===');