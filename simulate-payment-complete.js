// Simulate what happens in the payment completion endpoint
import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function simulatePaymentComplete() {
  console.log('Simulating payment completion endpoint...');
  
  let pool;
  let client;
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    client = await pool.connect();
    
    // Simulate the exact query used in the payment completion endpoint
    console.log('Executing payment completion query...');
    
    // Use a real payment ID from a completed transaction
    const testPaymentId = 'test_payment_id'; // We'll need to find a real one
    
    // First, let's find a real completed transaction to get its payment ID
    console.log('Finding a real completed transaction...');
    const realTransactionResult = await client.query(
      `SELECT t.payment_id 
       FROM app_transactions t 
       WHERE t.status = 'completed' 
       LIMIT 1`
    );
    
    let paymentIdToUse = testPaymentId;
    if (realTransactionResult.rows.length > 0) {
      paymentIdToUse = realTransactionResult.rows[0].payment_id;
      console.log('Using real payment ID:', paymentIdToUse);
    } else {
      console.log('No real completed transactions found, using test payment ID');
    }
    
    // Execute the exact query from the payment completion endpoint
    const transactionResult = await client.query(
      'SELECT t.*, u.email as user_email, u.username as user_username, u.wallet_address as user_wallet_address, u.phone as user_phone, p.name as package_name, p.game as package_game, p.in_game_amount as package_in_game_amount FROM app_transactions t JOIN app_users u ON t.user_id = u.id JOIN app_packages p ON t.package_id = p.id WHERE t.payment_id = $1',
      [paymentIdToUse]
    );
    
    console.log('Query executed, rows found:', transactionResult.rows.length);
    
    if (transactionResult.rows.length > 0) {
      const transaction = transactionResult.rows[0];
      console.log('Transaction data retrieved:');
      console.log('  ID:', transaction.id);
      console.log('  User Email:', transaction.user_email);
      console.log('  Username:', transaction.user_username);
      console.log('  Package Name:', transaction.package_name);
      console.log('  Pi Amount:', transaction.pi_amount);
      console.log('  USD Amount:', transaction.usd_amount);
      console.log('  Payment ID:', transaction.payment_id);
      console.log('  Status:', transaction.status);
      
      // Check if all required fields are present for email sending
      const hasRequiredFields = transaction.user_email && transaction.package_name;
      console.log('Has required fields for email:', hasRequiredFields);
      
      if (hasRequiredFields) {
        console.log('Simulating email sending...');
        
        // Import the email service
        const { sendTransactionEmails } = await import('./dist/server/services/email-robust.js');
        
        console.log('Calling sendTransactionEmails...');
        const emailResult = await sendTransactionEmails(transaction, client);
        console.log('Email sending result:', emailResult);
      } else {
        console.log('Skipping email sending - missing required fields');
      }
    } else {
      console.log('No transaction found with payment ID:', paymentIdToUse);
    }
    
  } catch (error) {
    console.error('Error in simulation:', error);
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  }
}

simulatePaymentComplete().then(() => {
  console.log('Simulation completed');
}).catch((error) => {
  console.error('Simulation failed:', error);
});