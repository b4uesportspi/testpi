import { pool } from "../db.js";
import { sendFeedbackRequestEmail } from "../services/email.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Automated Feedback Request Email System
 * 
 * This script finds all successful purchases from exactly 24 hours ago
 * and sends feedback request emails to those users.
 * 
 * Run this daily via cron job or scheduled task.
 */

async function sendFeedbackRequests() {
  console.log("🚀 Starting feedback request email process...\n");

  const client = await pool.connect();

  try {
    // Calculate the time window: exactly 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    console.log("📅 Time window:");
    console.log(`   From: ${twentyFiveHoursAgo.toISOString()}`);
    console.log(`   To: ${twentyFourHoursAgo.toISOString()}\n`);

    // Find all successful transactions from 24 hours ago
    // that haven't received a feedback request email yet
    const query = `
      SELECT 
        t.id as transaction_id,
        t.user_id,
        t.game_account,
        t.created_at as purchase_date,
        p.game as game_name,
        p.name as package_name,
        p.in_game_amount,
        u.username,
        u.email,
        u.pi_uid
      FROM app_transactions t
      JOIN app_packages p ON t.package_id = p.id
      JOIN app_users u ON t.user_id = u.id
      WHERE t.status IN ('completed', 'approved')
        AND t.created_at >= $1
        AND t.created_at <= $2
        AND (t.metadata->>'feedback_email_sent') IS DISTINCT FROM 'true'
        AND u.email IS NOT NULL
        AND u.email != ''
      ORDER BY t.created_at ASC
    `;

    console.log("🔍 Searching for eligible transactions...");
    const result = await client.query(query, [twentyFiveHoursAgo, twentyFourHoursAgo]);

    console.log(`📊 Found ${result.rows.length} eligible transactions\n`);

    if (result.rows.length === 0) {
      console.log("✅ No feedback requests to send. Exiting.");
      return;
    }

    // Send feedback emails
    let successCount = 0;
    let failCount = 0;

    for (const transaction of result.rows) {
      try {
        console.log(`📧 Processing: ${transaction.username} (${transaction.email})`);
        console.log(`   Game: ${transaction.game_name} - ${transaction.package_name}`);
        console.log(`   Purchase Date: ${new Date(transaction.purchase_date).toLocaleString()}`);

        // Send feedback request email
        const emailSent = await sendFeedbackRequestEmail({
          to: transaction.email,
          username: transaction.username,
          gameName: transaction.game_name,
          packageName: transaction.package_name,
          purchaseDate: transaction.purchase_date,
          transactionId: transaction.transaction_id
        });

        if (emailSent) {
          // Mark transaction as feedback email sent
          await client.query(
            `UPDATE app_transactions 
             SET metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{feedback_email_sent}',
               'true'
             )
             WHERE id = $1`,
            [transaction.transaction_id]
          );
          console.log(`   ✅ Email sent and marked\n`);
          successCount++;
        } else {
          console.log(`   ❌ Email failed\n`);
          failCount++;
        }

        // Add small delay to avoid overwhelming email server
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`   ❌ Error processing transaction ${transaction.transaction_id}:`, error.message);
        failCount++;
      }
    }

    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("📊 FEEDBACK EMAIL SUMMARY");
    console.log("═".repeat(60));
    console.log(`   Total Transactions: ${result.rows.length}`);
    console.log(`   ✅ Emails Sent: ${successCount}`);
    console.log(`   ❌ Emails Failed: ${failCount}`);
    console.log(`   Success Rate: ${((successCount / result.rows.length) * 100).toFixed(1)}%`);
    console.log("═".repeat(60));

  } catch (error: any) {
    console.error("❌ Feedback request process failed:", error.message);
    console.error("Error details:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
sendFeedbackRequests()
  .then(() => {
    console.log("\n✅ Feedback request process completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Process failed:", error);
    process.exit(1);
  });
