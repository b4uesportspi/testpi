// Script to investigate why a specific cancelled transaction didn't send an email
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function investigateUnsentEmail(transactionId) {
  console.log(`🔍 Investigating why email was not sent for transaction: ${transactionId}`);
  
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
  
  try {
    // Query for the specific transaction
    const transactionResult = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.pi_amount,
        t.usd_amount,
        t.failure_reason,
        t.email_sent,
        u.email as user_email,
        u.username as user_name,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.id = $1
    `, [transactionId]);
    
    if (transactionResult.rows.length === 0) {
      console.log(`❌ Transaction with ID ${transactionId} not found`);
      return;
    }
    
    const transaction = transactionResult.rows[0];
    
    console.log('\n📋 Transaction Details:');
    console.log('=====================');
    console.log(`ID: ${transaction.id}`);
    console.log(`Payment ID: ${transaction.payment_id}`);
    console.log(`Status: ${transaction.status}`);
    console.log(`Created At: ${new Date(transaction.created_at).toLocaleString()}`);
    console.log(`Updated At: ${new Date(transaction.updated_at).toLocaleString()}`);
    console.log(`Amount: ${transaction.pi_amount} π (${transaction.usd_amount} USD)`);
    console.log(`Failure Reason: ${transaction.failure_reason}`);
    console.log(`Email Sent: ${transaction.email_sent ? '✅ YES' : '❌ NO'}`);
    console.log(`User Email: ${transaction.user_email}`);
    console.log(`User Name: ${transaction.user_name}`);
    console.log(`Package: ${transaction.package_name} (${transaction.package_game})`);
    
    // Check if required data is present for email sending
    console.log('\n🔍 Email Requirement Check:');
    console.log('==========================');
    
    if (!transaction.user_email) {
      console.log('❌ MISSING: User email address');
    } else {
      console.log('✅ User email address present');
    }
    
    if (!transaction.package_name) {
      console.log('❌ MISSING: Package name');
    } else {
      console.log('✅ Package name present');
    }
    
    if (!transaction.user_name) {
      console.log('❌ MISSING: User name');
    } else {
      console.log('✅ User name present');
    }
    
    // Check if all required data is present
    const canSendEmail = transaction.user_email && transaction.package_name && transaction.user_name;
    console.log(`\n📊 Can Send Email: ${canSendEmail ? '✅ YES' : '❌ NO'}`);
    
    if (!canSendEmail) {
      console.log('⚠️  Email cannot be sent because required data is missing');
      return;
    }
    
    // If all data is present but email wasn't sent, there might have been an error
    console.log('\n🔍 Possible Reasons for Unsent Email:');
    console.log('====================================');
    console.log('1. Error during email sending process');
    console.log('2. SMTP server issues');
    console.log('3. Network connectivity problems');
    console.log('4. Email service configuration issues');
    console.log('5. Rate limiting by email provider');
    
  } catch (error) {
    console.error('❌ Error querying transaction:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Get transaction ID from command line arguments or use the one from our previous check
const transactionId = process.argv[2] || 'dc18d764-f159-447a-9d37-15efd8434d10';
investigateUnsentEmail(transactionId).catch(console.error);