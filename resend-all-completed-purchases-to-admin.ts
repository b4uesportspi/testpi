import dotenv from 'dotenv';
import { Client } from 'pg';

const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: envPath });
console.log(`📦 Loaded environment from ${envPath}`);

const { sendAdminPurchaseNotificationWithRetry } = await import('./server/services/email-robust.ts');
const { VercelLogger } = await import('./server/services/vercel-logger.ts');

const CONNECTION_STRING = process.env.CONNECTION_STRING || process.env.DATABASE_URL || '';

if (!CONNECTION_STRING) {
  console.error('❌ CONNECTION_STRING or DATABASE_URL environment variable not set');
  process.exit(1);
}

async function resendAllCompletedPurchasesToAdmin() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const adminResult = await client.query(
      'SELECT email FROM app_admins WHERE is_active = true AND email IS NOT NULL'
    );
    const adminEmails = adminResult.rows
      .map((row: any) => String(row.email).trim())
      .filter((email: string) => email.length > 0);

    const fallbackAdminEmails = [process.env.ADMIN_EMAIL, process.env.SMTP_FROM, process.env.SMTP_USER]
      .filter(Boolean)
      .map((email) => String(email).trim())
      .filter((email) => email.length > 0);

    const uniqueAdminEmails = Array.from(new Set([...adminEmails, ...fallbackAdminEmails]));

    console.log('📧 Admin emails configured for resending:', { uniqueAdminEmails });

    if (uniqueAdminEmails.length === 0) {
      console.warn('⚠️ No admin emails configured. Aborting resend.');
      return;
    }

    const completedResult = await client.query(
      `SELECT
        t.id,
        u.email AS user_email,
        u.username AS user_username,
        u.phone AS user_phone,
        t.payment_id,
        t.txid,
        t.pi_amount,
        t.usd_amount,
        COALESCE(p.name, 'Unknown Package') AS package_name,
        COALESCE(p.game, 'Unknown') AS package_game,
        COALESCE(p.in_game_amount::text, 'Not provided') AS package_in_game_amount,
        u.game_accounts AS user_game_accounts,
        u.social_accounts AS user_social_accounts
      FROM app_transactions t
      LEFT JOIN app_users u ON u.id = t.user_id
      LEFT JOIN app_packages p ON p.id = t.package_id
      WHERE t.status = 'completed'
        AND t.email_sent = false
      ORDER BY t.created_at DESC
      LIMIT 250`
    );

    const transactions = completedResult.rows;
    console.log(`📧 Found ${transactions.length} completed transactions with pending admin notifications from the database\n`);

    if (transactions.length === 0) {
      console.log('No completed transactions pending email notifications found');
      await client.end();
      return;
    }

    let totalAdminEmails = 0;
    let sentAdminEmails = 0;
    let failedAdminEmails = 0;

    for (const txn of transactions) {
      try {
        console.log(`📧 Sending admin notifications for transaction: ${txn.id}`);

        const gameAccounts = typeof txn.user_game_accounts === 'string'
          ? JSON.parse(txn.user_game_accounts || '{}')
          : txn.user_game_accounts;

        const gameAccountString = gameAccounts && Object.keys(gameAccounts).length > 0
          ? Object.entries(gameAccounts)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ')
          : 'Not provided';

        for (const adminEmail of uniqueAdminEmails) {
          totalAdminEmails++;

          try {
            const result = await sendAdminPurchaseNotificationWithRetry({
              adminEmail,
              username: txn.user_username || 'Unknown User',
              userEmail: txn.user_email || 'Unknown',
              userPhone: txn.user_phone || 'Not provided',
              packageName: txn.package_name,
              game: txn.package_game,
              inGameAmount: Number(txn.package_in_game_amount) || 0,
              piAmount: txn.pi_amount,
              usdAmount: txn.usd_amount,
              gameAccount: gameAccountString,
              transactionId: txn.id,
              paymentId: txn.payment_id,
              txid: txn.txid || ''
            });

            if (result.success) {
              sentAdminEmails++;
              console.log(`✅ Admin notification sent for ${txn.id} to ${adminEmail}`);
            } else {
              failedAdminEmails++;
              console.log(`❌ Admin notification failed for ${txn.id} to ${adminEmail}: ${result.error || 'unknown error'}`);
            }
          } catch (error) {
            failedAdminEmails++;
            console.error(`❌ Error sending admin notification for ${txn.id} to ${adminEmail}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing transaction ${txn.id}:`, error);
      }
    }

    console.log('\n📊 RESEND SUMMARY:');
    console.log(`   Total transactions processed: ${transactions.length}`);
    console.log(`   Total admin emails attempted: ${totalAdminEmails}`);
    console.log(`✅ Successfully sent admin emails: ${sentAdminEmails}`);
    console.log(`❌ Failed admin emails: ${failedAdminEmails}`);

    VercelLogger.logEmailEvent('BULK_RESEND_COMPLETED_PURCHASES', {
      totalTransactions: transactions.length,
      totalAdminEmails,
      sentAdminEmails,
      failedAdminEmails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    VercelLogger.logEmailEvent('BULK_RESEND_DATABASE_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the resend
resendAllCompletedPurchasesToAdmin().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
