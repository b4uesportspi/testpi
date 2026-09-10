import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { DatabaseStorage } from './dist/server/storage.js';

async function testEmailIssue() {
  console.log('Testing email issue...');
  
  try {
    // Test database connection and query structure
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    const client = await pool.connect();
    
    // Test the exact query used in the payment completion endpoint
    console.log('Testing transaction query...');
    const transactionResult = await client.query(
      'SELECT t.*, u.email as user_email, u.username as user_username, u.wallet_address as user_wallet_address, u.phone as user_phone, p.name as package_name, p.game as package_game, p.in_game_amount as package_in_game_amount FROM app_transactions t JOIN app_users u ON t.user_id = u.id JOIN app_packages p ON t.package_id = p.id WHERE t.payment_id = $1 LIMIT 1',
      ['test_payment_id'] // Use a test payment ID
    );
    
    console.log('Query result structure:');
    if (transactionResult.rows.length > 0) {
      const transaction = transactionResult.rows[0];
      console.log('Transaction fields:', Object.keys(transaction));
      console.log('Sample data:');
      console.log('  id:', transaction.id);
      console.log('  user_email:', transaction.user_email);
      console.log('  user_username:', transaction.user_username);
      console.log('  package_name:', transaction.package_name);
      console.log('  pi_amount:', transaction.pi_amount);
      console.log('  usd_amount:', transaction.usd_amount);
      console.log('  payment_id:', transaction.payment_id);
    } else {
      console.log('No transaction found with test payment ID');
      
      // Try to get any transaction to see the structure
      console.log('Getting any transaction...');
      const anyTransactionResult = await client.query(
        'SELECT t.*, u.email as user_email, u.username as user_username, u.wallet_address as user_wallet_address, u.phone as user_phone, p.name as package_name, p.game as package_game, p.in_game_amount as package_in_game_amount FROM app_transactions t JOIN app_users u ON t.user_id = u.id JOIN app_packages p ON t.package_id = p.id LIMIT 1'
      );
      
      if (anyTransactionResult.rows.length > 0) {
        const transaction = anyTransactionResult.rows[0];
        console.log('Any transaction fields:', Object.keys(transaction));
        console.log('Sample data:');
        console.log('  id:', transaction.id);
        console.log('  user_email:', transaction.user_email);
        console.log('  user_username:', transaction.user_username);
        console.log('  package_name:', transaction.package_name);
        console.log('  pi_amount:', transaction.pi_amount);
        console.log('  usd_amount:', transaction.usd_amount);
        console.log('  payment_id:', transaction.payment_id);
      } else {
        console.log('No transactions found in database');
      }
    }
    
    client.release();
    await pool.end();
    
    // Test the storage service method
    console.log('\nTesting storage service method...');
    const storage = new DatabaseStorage();
    
    // Try to get a transaction (we'll need a real transaction ID)
    console.log('Testing getTransactionWithUserAndPackage method...');
    // We would need a real transaction ID to test this properly
    
  } catch (error) {
    console.error('Error testing email issue:', error);
  }
}

testEmailIssue().then(() => {
  console.log('Test completed');
}).catch((error) => {
  console.error('Test failed:', error);
});