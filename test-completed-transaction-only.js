// Test script to specifically verify admin emails are only sent for completed transactions
import { sendTransactionEmails } from './dist/server/services/email-robust.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testCompletedTransactionOnly() {
  console.log('🔍 Testing admin email behavior for completed vs non-completed transactions...');
  
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
    id: 'test-completed-only',
    user_email: 'test@example.com',
    user_username: 'Test User',
    package_name: 'Test Package - 60 UC',
    pi_amount: '10.00000000',
    usd_amount: '1.2500',
    game_account: { game: 'PUBG', ign: 'TestPlayer123' },
    payment_id: 'test-payment-completed-only',
    txid: 'test-txid-completed-only',
    user_phone: '+1234567890',
    package_game: 'PUBG',
    package_in_game_amount: 60
  };
  
  try {
    // Test completed transaction (should send admin emails)
    console.log('\n=== TESTING COMPLETED TRANSACTION ===');
    console.log('Expected: User email sent + Admin emails sent');
    const completedResult = await sendTransactionEmails(mockTransaction, pool, 'completed');
    console.log('✅ Completed transaction result:', completedResult);
    
    // Add a delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test failed transaction (should NOT send admin emails)
    console.log('\n=== TESTING FAILED TRANSACTION ===');
    console.log('Expected: User email sent + Admin emails SKIPPED');
    const failedResult = await sendTransactionEmails(mockTransaction, pool, 'failed');
    console.log('✅ Failed transaction result:', failedResult);
    
    // Add a delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test cancelled transaction (should NOT send admin emails)
    console.log('\n=== TESTING CANCELLED TRANSACTION ===');
    console.log('Expected: User email sent + Admin emails SKIPPED');
    const cancelledResult = await sendTransactionEmails(mockTransaction, pool, 'cancelled');
    console.log('✅ Cancelled transaction result:', cancelledResult);
    
    console.log('\n=== SUMMARY ===');
    console.log('✅ Test completed. Check logs above to verify behavior.');
    
  } catch (error) {
    console.error('❌ Error in completed transaction only test:', error);
  } finally {
    await pool.end();
  }
}

testCompletedTransactionOnly().catch(console.error);