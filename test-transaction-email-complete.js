// Test script to verify complete transaction email flow
import { sendTransactionEmails } from './dist/server/services/email-robust.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testTransactionEmailComplete() {
  console.log('🔍 Testing complete transaction email flow...');
  
  // Use DATABASE_URL if available
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  // Create a mock transaction object
  const mockTransaction = {
    id: 'test-transaction-id-complete',
    user_email: 'test@example.com',
    user_username: 'Test User',
    package_name: 'Test Package - 60 UC',
    pi_amount: '10.00000000',
    usd_amount: '1.2500',
    game_account: { game: 'PUBG', ign: 'TestPlayer123' },
    payment_id: 'test-payment-id-complete',
    txid: 'test-txid-complete',
    user_phone: '+1234567890',
    package_game: 'PUBG',
    package_in_game_amount: 60
  };
  
  try {
    console.log('📧 Sending transaction emails...');
    const result = await sendTransactionEmails(mockTransaction, pool);
    
    if (result) {
      console.log('✅ Transaction emails sent successfully');
    } else {
      console.log('❌ Failed to send transaction emails');
    }
    
  } catch (error) {
    console.error('❌ Error in transaction email test:', error);
  } finally {
    await pool.end();
  }
}

testTransactionEmailComplete().catch(console.error);