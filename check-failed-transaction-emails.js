import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkFailedTransactionEmails() {
  try {
    console.log('\n📧 Checking Failed Transaction Emails\n');

    // Get failed transactions with email status
    const result = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.failure_reason,
        t.email_sent,
        u.username,
        u.email,
        p.name as package_name,
        p.game,
        t.pi_amount,
        t.created_at,
        t.updated_at
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'failed' AND (t.failure_reason LIKE '%timeout%' OR t.failure_reason LIKE '%pending%')
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No failed transactions found.\n');
      await pool.end();
      return;
    }

    console.log(`📊 Found ${result.rows.length} failed transactions:\n`);

    let emailSentCount = 0;
    let emailNotSentCount = 0;

    result.rows.forEach((tx, index) => {
      const emailStatus = tx.email_sent ? '✅ SENT' : '❌ NOT SENT';
      console.log(`\n${index + 1}. ${tx.username} - ${tx.package_name} (${tx.game})`);
      console.log(`   User Email: ${tx.email}`);
      console.log(`   Transaction ID: ${tx.id}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Failure Reason: ${tx.failure_reason}`);
      console.log(`   Amount: ${tx.pi_amount} π`);
      console.log(`   Email Sent: ${emailStatus}`);
      console.log(`   Failed At: ${new Date(tx.updated_at).toLocaleString()}`);

      if (tx.email_sent) {
        emailSentCount++;
      } else {
        emailNotSentCount++;
      }
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Email Summary:');
    console.log(`   ✅ Emails Sent: ${emailSentCount}/${result.rows.length}`);
    console.log(`   ❌ Emails NOT Sent: ${emailNotSentCount}/${result.rows.length}`);
    console.log(`${'='.repeat(60)}\n`);

    // If some emails weren't sent, suggest manual sending
    if (emailNotSentCount > 0) {
      console.log('⚠️  Some failed transaction emails were not sent automatically.');
      console.log('   These users should be notified about their failed payments.\n');
    }

  } catch (error) {
    console.error('Error checking failed transaction emails:', error);
  } finally {
    await pool.end();
  }
}

checkFailedTransactionEmails();
