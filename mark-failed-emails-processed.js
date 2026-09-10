import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function markFailedEmailsAsProcessed() {
  try {
    console.log('\n📋 Marking Failed Transaction Emails as Processed\n');

    // Get failed transactions with no email sent and valid emails
    const result = await pool.query(`
      SELECT 
        t.id,
        u.username,
        u.email,
        p.name as package_name
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'failed' 
        AND t.email_sent = false
        AND u.email IS NOT NULL
        AND u.email != ''
        AND (t.failure_reason LIKE '%timeout%' OR t.failure_reason LIKE '%pending%')
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('✅ All failed transactions already processed!\n');
      await pool.end();
      return;
    }

    console.log(`📊 Marking ${result.rows.length} transactions as email processed:\n`);

    let updated = 0;

    for (const tx of result.rows) {
      try {
        // Mark email as sent in database
        await pool.query(
          `UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1`,
          [tx.id]
        );
        
        console.log(`✅ ${tx.username} - ${tx.package_name}`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${tx.id}:`, error.message);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Marked ${updated} transactions as email processed`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('⚠️  NOTE: Email sending failed due to missing SMTP credentials.');
    console.log('   These users need to be manually notified.');
    console.log('\n   To automatically send emails in the future:');
    console.log('   1. Configure SMTP_USER and SMTP_PASSWORD in .env');
    console.log('   2. Set SMTP_HOST and SMTP_PORT');
    console.log('   3. Restart the transaction sync service\n');

  } catch (error) {
    console.error('Error marking emails as processed:', error);
  } finally {
    await pool.end();
  }
}

markFailedEmailsAsProcessed();
