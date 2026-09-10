import dotenv from 'dotenv';
import { Pool } from 'pg';
import { sendPaymentFailureNotification } from './dist/server/services/email.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function sendFailedTransactionEmails() {
  try {
    console.log('\n📧 Sending Failed Transaction Notification Emails\n');

    // Get failed transactions with no email sent
    const result = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.failure_reason,
        u.username,
        u.email,
        p.name as package_name,
        p.game,
        t.pi_amount,
        t.usd_amount,
        t.created_at,
        t.updated_at
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'failed' 
        AND t.email_sent = false
        AND (t.failure_reason LIKE '%timeout%' OR t.failure_reason LIKE '%pending%')
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('✅ All failed transaction emails have already been sent!\n');
      await pool.end();
      return;
    }

    console.log(`📊 Found ${result.rows.length} users to notify about failed payments:\n`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const tx of result.rows) {
      // Skip if no email
      if (!tx.email) {
        console.log(`\n⏭️  SKIP: ${tx.username} - No email address on file`);
        continue;
      }

      try {
        console.log(`\n📧 Sending to: ${tx.username} (${tx.email})`);
        console.log(`   Transaction: ${tx.id}`);
        console.log(`   Package: ${tx.package_name}`);
        console.log(`   Amount: ${tx.pi_amount} π (${tx.usd_amount})`);
        console.log(`   Reason: ${tx.failure_reason}`);

        const emailResult = await sendPaymentFailureNotification({
          to: tx.email,
          username: tx.username,
          packageName: tx.package_name,
          piAmount: tx.pi_amount,
          failureReason: tx.failure_reason,
          transactionId: tx.id,
          paymentId: tx.payment_id,
          isCancelled: false,
          game: tx.game,
          gameAccounts: {},
          socialAccounts: {}
        });

        if (emailResult) {
          await pool.query(
            `UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1`,
            [tx.id]
          );
          
          console.log(`   ✅ Email sent successfully`);
          emailsSent++;
        } else {
          console.log(`   ❌ Email send failed`);
          emailsFailed++;
        }
      } catch (error) {
        console.error(`   ❌ Error sending email:`, error.message);
        emailsFailed++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Email Summary:');
    console.log(`   ✅ Successfully Sent: ${emailsSent}`);
    console.log(`   ❌ Failed to Send: ${emailsFailed}`);
    console.log(`   ⏭️  Skipped (No Email): ${result.rows.length - emailsSent - emailsFailed}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('Error sending failed transaction emails:', error);
  } finally {
    await pool.end();
  }
}

sendFailedTransactionEmails();
