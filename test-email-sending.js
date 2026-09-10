import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function testEmailSending() {
  console.log('Testing email sending...');
  
  let pool;
  let client;
  
  try {
    // Test database connection and query structure
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    client = await pool.connect();
    
    // Get a real transaction to test with
    console.log('Getting a real transaction...');
    const transactionResult = await client.query(
      `SELECT t.*, u.email as user_email, u.username as user_username, u.wallet_address as user_wallet_address, u.phone as user_phone, p.name as package_name, p.game as package_game, p.in_game_amount as package_in_game_amount 
       FROM app_transactions t 
       JOIN app_users u ON t.user_id = u.id 
       JOIN app_packages p ON t.package_id = p.id 
       WHERE t.status = 'completed' 
       LIMIT 1`
    );
    
    if (transactionResult.rows.length > 0) {
      const transaction = transactionResult.rows[0];
      console.log('Found transaction:', {
        id: transaction.id,
        user_email: transaction.user_email,
        user_username: transaction.user_username,
        package_name: transaction.package_name,
        pi_amount: transaction.pi_amount,
        usd_amount: transaction.usd_amount,
        payment_id: transaction.payment_id
      });
      
      // Test the email sending function
      console.log('Testing email sending with this transaction...');
      
      // Import the email service
      const { sendTransactionEmails } = await import('./dist/server/services/email-robust.js');
      
      // Try to send emails
      const result = await sendTransactionEmails(transaction, client);
      console.log('Email sending result:', result);
    } else {
      console.log('No completed transactions found');
    }
    
  } catch (error) {
    console.error('Error testing email sending:', error);
  } finally {
    // Clean up connections
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  }
}

testEmailSending().then(() => {
  console.log('Email test completed');
}).catch((error) => {
  console.error('Email test failed:', error);
});