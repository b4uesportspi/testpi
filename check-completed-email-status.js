// Script to check email status for recently completed purchases
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkCompletedEmailStatus() {
  console.log('🔍 Checking email status for recently completed purchases...');
  
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
    // Query for recently completed transactions with email status
    const completedTransactions = await pool.query(`
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
      WHERE t.status = 'completed'
      ORDER BY t.created_at DESC
      LIMIT 20
    `);
    
    if (completedTransactions.rows.length === 0) {
      console.log('✅ No completed transactions found in the database');
      return;
    }
    
    console.log(`\n📋 Email status for ${completedTransactions.rows.length} recently completed purchases:`);
    console.log('====================================================================================');
    
    let emailSentCount = 0;
    let emailNotSentCount = 0;
    
    completedTransactions.rows.forEach((transaction, index) => {
      const emailStatus = transaction.email_sent ? '✅ SENT' : '📧 NOT SENT';
      if (transaction.email_sent) {
        emailSentCount++;
      } else {
        emailNotSentCount++;
      }
      
      console.log(`\n${index + 1}. Transaction ID: ${transaction.id}`);
      console.log(`   User: ${transaction.user_name} (${transaction.user_email})`);
      console.log(`   Package: ${transaction.package_name} (${transaction.package_game})`);
      console.log(`   Amount: ${transaction.pi_amount} π (${transaction.usd_amount} USD)`);
      console.log(`   Completed At: ${new Date(transaction.updated_at).toLocaleString()}`);
      console.log(`   Email Status: ${emailStatus}`);
      console.log(`   Payment ID: ${transaction.payment_id}`);
      console.log('   ---');
    });
    
    // Summary statistics
    console.log('\n📊 Email Status Summary:');
    console.log(`   Total completed transactions: ${completedTransactions.rows.length}`);
    console.log(`   Emails sent: ${emailSentCount}`);
    console.log(`   Emails NOT sent: ${emailNotSentCount}`);
    console.log(`   Email delivery rate: ${((emailSentCount / completedTransactions.rows.length) * 100).toFixed(1)}%`);
    
    if (emailNotSentCount > 0) {
      console.log('\n⚠️  Some completed transactions did not have emails sent to users.');
      console.log('   This could be due to:');
      console.log('   - Email sending issues');
      console.log('   - Missing user email addresses');
      console.log('   - System errors during completion process');
    }
    
  } catch (error) {
    console.error('❌ Error querying completed transactions:', error.message);
  } finally {
    await pool.end();
  }
}

checkCompletedEmailStatus().catch(console.error);