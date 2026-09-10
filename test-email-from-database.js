import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function testEmailFromDatabase() {
  console.log('Testing email sending from database...');
  
  let pool;
  let client;
  
  try {
    // Create a new pool connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    client = await pool.connect();
    
    // Get a recent completed transaction with user and package info
    console.log('Fetching a completed transaction...');
    const transactionResult = await client.query(`
      SELECT t.*, 
             u.email as user_email, 
             u.username as user_username, 
             u.phone as user_phone,
             p.name as package_name,
             p.game as package_game,
             p.in_game_amount as package_in_game_amount
      FROM app_transactions t 
      JOIN app_users u ON t.user_id = u.id 
      JOIN app_packages p ON t.package_id = p.id 
      WHERE t.status = 'completed' 
      ORDER BY t.created_at DESC 
      LIMIT 1
    `);
    
    if (transactionResult.rows.length === 0) {
      console.log('No completed transactions found in database');
      return;
    }
    
    const transaction = transactionResult.rows[0];
    console.log('Found transaction:', {
      id: transaction.id,
      user_email: transaction.user_email,
      user_username: transaction.user_username,
      package_name: transaction.package_name,
      pi_amount: transaction.pi_amount,
      payment_id: transaction.payment_id
    });
    
    // Test sending email using the robust email service
    console.log('Testing email sending...');
    
    // Import the robust email service
    const { sendTransactionEmails } = await import('./dist/server/services/email-robust.js');
    
    // Send emails
    const emailResult = await sendTransactionEmails(transaction, client);
    console.log('Email sending result:', emailResult);
    
    if (emailResult) {
      console.log('✅ Emails sent successfully!');
    } else {
      console.log('❌ Failed to send emails');
    }
    
  } catch (error) {
    console.error('Error testing email from database:', error);
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

testEmailFromDatabase().then(() => {
  console.log('Email test completed');
}).catch((error) => {
  console.error('Email test failed:', error);
});