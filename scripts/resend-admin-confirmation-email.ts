import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

/**
 * Resend admin purchase confirmation for the most recent completed Netflix purchase.
 * - Supports ADMIN_EMAIL_OVERRIDE to force a specific admin recipient.
 * - Uses the robust admin retry wrapper exported from email-robust.
 */
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    // Find the most recent completed transaction for Netflix subscriptions
    const result = await client.query(
      `SELECT t.*, u.email as user_email, u.username as user_username, u.phone as user_phone,
              p.name as package_name, p.game as package_game, p.in_game_amount as package_in_game_amount
       FROM app_transactions t
       JOIN app_users u ON t.user_id = u.id
       JOIN app_packages p ON t.package_id = p.id
       WHERE t.status = 'completed'
         AND (p.game ILIKE '%netflix%' OR p.name ILIKE '%netflix%')
       ORDER BY t.created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('No completed Netflix transaction found.');
      return;
    }

    const transaction = result.rows[0];
    console.log('Found completed Netflix transaction:', {
      id: transaction.id,
      user_email: transaction.user_email,
      user_username: transaction.user_username,
      package_name: transaction.package_name,
      pi_amount: transaction.pi_amount,
      payment_id: transaction.payment_id,
    });

    // Load robust admin sender
    const emailRobust = await import('../server/services/email-robust.ts');

    // Build admin recipient list: DB active admins + env fallbacks
    let admins: any[] = [];
    try {
      const adminsResult = await client.query(
        'SELECT email FROM app_admins WHERE is_active = true AND email IS NOT NULL'
      );
      admins = adminsResult.rows;
    } catch (e) {
      console.warn('Could not query app_admins table, will fallback to env admins', e instanceof Error ? e.message : e);
    }

    const envAdmins = [process.env.ADMIN_EMAIL, process.env.SMTP_USER, process.env.SMTP_FROM]
      .filter(Boolean)
      .map(e => String(e).trim());

    const adminEmails = Array.from(new Set([
      ...admins.map((a: any) => String(a.email || '').trim()).filter(Boolean),
      ...envAdmins
    ]));

    // Allow forced override for testing
    if (process.env.ADMIN_EMAIL_OVERRIDE) {
      adminEmails.length = 0;
      adminEmails.push(process.env.ADMIN_EMAIL_OVERRIDE.trim());
      console.log('ADMIN_EMAIL_OVERRIDE in use:', process.env.ADMIN_EMAIL_OVERRIDE);
    }

    if (adminEmails.length === 0) {
      console.warn('No admin email addresses resolved; aborting admin resend. Suggest setting ADMIN_EMAIL or ADMIN_EMAIL_OVERRIDE in env.');
      return;
    }

    console.log('Will attempt to send admin notification to:', adminEmails);

    let sent = 0;
    let failed = 0;

    for (const adminEmail of adminEmails) {
      try {
        const res = await emailRobust.sendAdminPurchaseNotificationWithRetry({
          adminEmail,
          username: transaction.user_username,
          userEmail: transaction.user_email,
          userPhone: transaction.user_phone || 'Not provided',
          packageName: transaction.package_name,
          game: transaction.package_game,
          inGameAmount: transaction.package_in_game_amount,
          piAmount: transaction.pi_amount,
          usdAmount: transaction.usd_amount,
          gameAccount: transaction.game_account || 'Not provided',
          transactionId: transaction.id,
          paymentId: transaction.payment_id,
          txid: transaction.txid
        });

        if (res.success) {
          sent++;
          console.log(`✅ Admin notification sent to ${adminEmail}`);
        } else {
          failed++;
          console.error(`❌ Admin notification FAILED for ${adminEmail}:`, res.error);
        }
      } catch (err) {
        failed++;
        console.error(`❌ Exception sending admin notification to ${adminEmail}:`, err);
      }
    }

    console.log(`Admin send summary: sent=${sent} failed=${failed} total=${adminEmails.length}`);
  } catch (error) {
    console.error('Error resending admin confirmation email:', error);
  } finally {
    try { client.release(); } catch {};
    try { await pool.end(); } catch {};
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});