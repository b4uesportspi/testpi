import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
console.log('📦 Loaded environment from .env');

import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = process.env.DATABASE_URL || '';

if (!CONNECTION_STRING) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

async function resendAdminNotifications() {
  const client = new Client({ 
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Get admin emails from DB
    const adminResult = await client.query(
      'SELECT email FROM app_admins WHERE is_active = true AND email IS NOT NULL'
    );
    let adminEmails = adminResult.rows
      .map(r => String(r.email || '').trim().toLowerCase())
      .filter(e => e.length > 0);

    // Add fallback admin emails
    const fallbacks = [process.env.ADMIN_EMAIL, process.env.SMTP_FROM, process.env.SMTP_USER, 'info@b4uesports.com']
      .filter(Boolean)
      .map(e => String(e).trim().toLowerCase())
      .filter(e => e.length > 0);

    adminEmails = Array.from(new Set([...adminEmails, ...fallbacks]));

    console.log('📧 Admin emails:', adminEmails);

    if (adminEmails.length === 0) {
      console.error('❌ No admin emails configured. Aborting.');
      return;
    }

    // 2. Get completed transactions where admin email has NOT been sent yet
    const completedResult = await client.query(
      `SELECT 
        t.id, 
        t.payment_id,
        t.txid,
        t.pi_amount,
        t.usd_amount,
        t.game_account,
        t.admin_email_sent,
        t.created_at,
        u.email AS user_email, 
        u.username AS user_username, 
        u.phone AS user_phone,
        COALESCE(p.name, 'Unknown Package') AS package_name,
        COALESCE(p.game, 'Unknown') AS package_game,
        COALESCE(p.in_game_amount::text, '0') AS package_in_game_amount
      FROM app_transactions t 
      LEFT JOIN app_users u ON u.id = t.user_id
      LEFT JOIN app_packages p ON p.id = t.package_id
      WHERE t.status = 'completed'
        AND (t.admin_email_sent = false OR t.admin_email_sent IS NULL)
      ORDER BY t.created_at DESC`
    );

    const transactions = completedResult.rows;
    console.log(`\n📊 Found ${transactions.length} completed transactions with admin_email_sent = false\n`);

    // Also show how many already sent
    const alreadySentResult = await client.query(
      `SELECT COUNT(*) as cnt FROM app_transactions WHERE status = 'completed' AND admin_email_sent = true`
    );
    console.log(`ℹ️  ${alreadySentResult.rows[0].cnt} transactions already have admin_email_sent = true\n`);

    if (transactions.length === 0) {
      console.log('No completed transactions found.');
      return;
    }

    // 3. Load email service
    const emailModule = await import('./server/services/email.js');
    const { sendAdminPurchaseNotification } = emailModule;

    let totalSent = 0;
    let totalFailed = 0;

    for (const txn of transactions) {
      // Parse game account
      let gameAccountString = 'Not provided';
      if (txn.game_account) {
        try {
          const ga = typeof txn.game_account === 'string' 
            ? JSON.parse(txn.game_account) 
            : txn.game_account;
          
          if (ga.uid && ga.ign) gameAccountString = `UID: ${ga.uid}, IGN: ${ga.ign}`;
          else if (ga.ign) gameAccountString = ga.ign;
          else if (ga.link) gameAccountString = ga.link;
          else if (ga.playerId) gameAccountString = `Player ID: ${ga.playerId}`;
          else if (ga.userId && ga.zoneId) gameAccountString = `User ID: ${ga.userId}, Zone ID: ${ga.zoneId}`;
          else if (ga.email) gameAccountString = ga.email;
          else gameAccountString = JSON.stringify(ga);
        } catch (e) {
          gameAccountString = String(txn.game_account);
        }
      }

      let txnSentCount = 0;
      for (const adminEmail of adminEmails) {
        try {
          console.log(`📧 Sending admin notification for txn ${txn.id} (${txn.package_name}) to ${adminEmail}...`);
          
          const result = await sendAdminPurchaseNotification({
            adminEmail,
            username: txn.user_username || 'Unknown User',
            userEmail: txn.user_email || 'Unknown',
            userPhone: txn.user_phone || 'Not provided',
            packageName: txn.package_name,
            game: txn.package_game,
            inGameAmount: Number(txn.package_in_game_amount) || 0,
            piAmount: txn.pi_amount || '0',
            usdAmount: txn.usd_amount || '0',
            gameAccount: gameAccountString,
            transactionId: txn.id,
            paymentId: txn.payment_id || '',
            txid: txn.txid || ''
          });

          if (result) {
            totalSent++;
            txnSentCount++;
            console.log(`  ✅ Sent to ${adminEmail}`);
          } else {
            totalFailed++;
            console.log(`  ❌ Failed for ${adminEmail}`);
          }
        } catch (error) {
          totalFailed++;
          console.error(`  ❌ Error for ${adminEmail}:`, error.message || error);
        }
      }

      // Mark admin_email_sent = true if at least one admin email was sent
      if (txnSentCount > 0) {
        try {
          await client.query(
            'UPDATE app_transactions SET admin_email_sent = true, updated_at = NOW() WHERE id = $1',
            [txn.id]
          );
          console.log(`  ✅ Marked admin_email_sent = true for txn ${txn.id}`);
        } catch (updateErr) {
          console.error(`  ❌ Failed to mark admin_email_sent for txn ${txn.id}:`, updateErr.message || updateErr);
        }
      }

      // Small delay to avoid SMTP rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n========================================');
    console.log('📊 SUMMARY:');
    console.log(`   Completed transactions: ${transactions.length}`);
    console.log(`   Admin emails sent:      ${totalSent}`);
    console.log(`   Admin emails failed:    ${totalFailed}`);
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

resendAdminNotifications().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
