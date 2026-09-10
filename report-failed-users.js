import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function generateFailedUsersReport() {
  try {
    console.log('\n📋 FAILED TRANSACTION USERS REPORT\n');
    console.log('=' .repeat(80));

    // Get failed transactions that need email notifications
    const result = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.failure_reason,
        u.username,
        u.email,
        p.name as package_name,
        p.game,
        t.pi_amount,
        t.usd_amount,
        t.created_at,
        t.updated_at,
        EXTRACT(DAY FROM (NOW() - t.created_at)) as days_since_failed
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'failed' 
        AND t.email_sent = false
        AND (t.failure_reason LIKE '%timeout%' OR t.failure_reason LIKE '%pending%')
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('\n✅ All failed users have been notified!\n');
      await pool.end();
      return;
    }

    console.log(`\n📊 ${result.rows.length} Users Need Notification\n`);

    let validEmails = 0;
    let missingEmails = 0;

    console.log('USERNAME\t\tEMAIL\t\t\t\tPACKAGE\t\tAMOUNT\tDAYS PENDING');
    console.log('-' .repeat(80));

    result.rows.forEach(tx => {
      if (tx.email) {
        validEmails++;
        const username = (tx.username || 'Unknown').padEnd(16);
        const email = (tx.email || '').padEnd(30);
        const pkg = (tx.package_name || 'Unknown').padEnd(16);
        const amount = `${parseFloat(tx.pi_amount).toFixed(2)}π`.padEnd(6);
        const days = Math.round(tx.days_since_failed);
        
        console.log(`${username}${email}${pkg}${amount}${days}`);
      } else {
        missingEmails++;
        console.log(`${(tx.username || 'Unknown').padEnd(16)}NO EMAIL - Cannot notify`);
      }
    });

    console.log('-' .repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Users with valid emails: ${validEmails}`);
    console.log(`   ❌ Users without emails: ${missingEmails}`);
    console.log(`   📧 Total pending notifications: ${validEmails}`);
    
    console.log(`\n📧 Emails to Send:`);
    result.rows.filter(tx => tx.email).forEach(tx => {
      console.log(`   • ${tx.email}`);
    });

    console.log(`\n⚠️  Next Steps:`);
    console.log(`   1. Configure SMTP in .env file:`);
    console.log(`      - SMTP_HOST=smtp.hostinger.com`);
    console.log(`      - SMTP_PORT=587`);
    console.log(`      - SMTP_USER=your_email@b4uesports.com`);
    console.log(`      - SMTP_PASSWORD=your_password`);
    console.log(`   2. Run: node send-failed-emails.js`);
    console.log(`   3. Users will receive payment failure notifications\n`);

  } catch (error) {
    console.error('Error generating report:', error);
  } finally {
    await pool.end();
  }
}

generateFailedUsersReport();
