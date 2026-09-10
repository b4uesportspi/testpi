import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection using DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTransactionStatuses() {
  try {
    console.log('🔍 Checking transaction statuses...');
    
    // Query for all transactions with their statuses
    const allTransactions = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.pi_amount,
        t.usd_amount,
        t.failure_reason,
        t.success_reason,
        t.email_sent,
        u.email as user_email,
        u.username as user_name,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 30
    `);

    if (allTransactions.rows.length === 0) {
      console.log('✅ No transactions found.');
      return;
    }

    console.log(`\n📊 Found ${allTransactions.rows.length} recent transactions:`);
    console.log('=' .repeat(60));
    
    // Count statuses
    const statusCounts = {};
    
    allTransactions.rows.forEach((transaction, index) => {
      // Count statuses
      statusCounts[transaction.status] = (statusCounts[transaction.status] || 0) + 1;
      
      console.log(`\n${index + 1}. Transaction ID: ${transaction.id}`);
      console.log(`   Payment ID: ${transaction.payment_id}`);
      console.log(`   User: ${transaction.user_name} (${transaction.user_email})`);
      console.log(`   Package: ${transaction.package_name} (${transaction.package_game})`);
      console.log(`   Amount: $${transaction.usd_amount} (${transaction.pi_amount} π)`);
      console.log(`   Status: ${transaction.status}`);
      console.log(`   Created: ${new Date(transaction.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(transaction.updated_at).toLocaleString()}`);
      
      if (transaction.failure_reason) {
        console.log(`   Failure Reason: ${transaction.failure_reason}`);
      }
      
      if (transaction.success_reason) {
        console.log(`   Success Reason: ${transaction.success_reason}`);
      }
      
      console.log(`   Email Sent: ${transaction.email_sent ? 'Yes' : 'No'}`);
      console.log('   ---');
    });

    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 Status Summary:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`   ${status}: ${count}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking transaction statuses:', error.message);
  } finally {
    await pool.end();
  }
}

checkTransactionStatuses();