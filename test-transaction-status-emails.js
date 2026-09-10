// Test script to verify transaction email behavior for different statuses
import { sendTransactionStatusEmails } from './dist/server/services/transaction-emails.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testTransactionStatusEmails() {
  console.log('🔍 Testing transaction email behavior for different statuses...');
  
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
    id: 'test-transaction-status-emails',
    user_email: 'test@example.com',
    user_username: 'Test User',
    package_name: 'Test Package - 60 UC',
    pi_amount: '10.00000000',
    usd_amount: '1.2500',
    game_account: { game: 'PUBG', ign: 'TestPlayer123' },
    payment_id: 'test-payment-id-status',
    txid: 'test-txid-status',
    user_phone: '+1234567890',
    package_game: 'PUBG',
    package_in_game_amount: 60
  };
  
  try {
    // Test completed transaction (should send admin emails)
    console.log('\n--- Testing COMPLETED transaction ---');
    const completedResult = await sendTransactionStatusEmails(mockTransaction, pool, 'completed');
    console.log('✅ Completed transaction result:', completedResult);
    
    // Test failed transaction (should NOT send admin emails)
    console.log('\n--- Testing FAILED transaction ---');
    const failedResult = await sendTransactionStatusEmails(mockTransaction, pool, 'failed');
    console.log('✅ Failed transaction result:', failedResult);
    
    // Test cancelled transaction (should NOT send admin emails)
    console.log('\n--- Testing CANCELLED transaction ---');
    const cancelledResult = await sendTransactionStatusEmails(mockTransaction, pool, 'cancelled');
    console.log('✅ Cancelled transaction result:', cancelledResult);
    
  } catch (error) {
    console.error('❌ Error in transaction status email test:', error);
  } finally {
    await pool.end();
  }
}

testTransactionStatusEmails().catch(console.error);