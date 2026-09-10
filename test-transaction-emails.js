import { sendTransactionStatusEmails } from './dist/server/services/transaction-emails.js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTransactionEmails() {
  console.log('🔍 Testing transaction email functionality...');
  
  // Create a mock transaction object for testing
  const mockTransaction = {
    id: 'test-transaction-id',
    user_email: process.env.TEST_USER_EMAIL || 'test@example.com',
    package_name: 'Test Package',
    user_username: 'Test User',
    pi_amount: 10,
    usd_amount: 1.25,
    game_account: { game: 'PUBG', ign: 'TestPlayer123' },
    payment_id: 'test-payment-id',
    txid: 'test-txid',
    user_phone: '+1234567890',
    package_game: 'PUBG',
    package_in_game_amount: '60 UC'
  };
  
  // Create a mock client object
  const mockClient = {
    query: async (sql, params) => {
      console.log('Mock query executed:', sql, params);
      
      // Mock response for admins query
      if (sql.includes('SELECT email FROM admins')) {
        return {
          rows: [
            { email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com' }
          ],
          rowCount: 1
        };
      }
      
      // Mock response for transaction update
      if (sql.includes('UPDATE app_transactions')) {
        return {
          rowCount: 1
        };
      }
      
      return {
        rows: [],
        rowCount: 0
      };
    }
  };
  
  try {
    console.log('📧 Sending test transaction emails...');
    const result = await sendTransactionStatusEmails(mockTransaction, mockClient, 'completed');
    
    if (result) {
      console.log('✅ Transaction emails sent successfully');
    } else {
      console.log('❌ Failed to send transaction emails');
    }
  } catch (error) {
    console.error('❌ Error in transaction email test:', error);
  }
}

testTransactionEmails().catch(console.error);