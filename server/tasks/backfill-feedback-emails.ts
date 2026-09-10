import { pool } from "../db.js";
import { sendFeedbackRequestEmail } from "../services/email.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * One-time Backfill Script: Send Feedback Emails to ALL Successful Purchases
 * 
 * This script sends feedback request emails to ALL users who have completed
 * purchases until now, regardless of when they purchased.
 * 
 * Use this ONCE to catch up all past purchases.
 * After this, use the regular daily cron job for new purchases.
 */

async function backfillFeedbackEmails() {
  console.log("🚀 Starting feedback email backfill for ALL successful purchases...\n");

  const client = await pool.connect();

  try {
    // Find ALL successful transactions that haven't received feedback email
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
        AND (t.metadata->>'feedback_email_sent') IS DISTINCT FROM 'true'
        AND u.email IS NOT NULL
        AND u.email != ''
      ORDER BY t.created_at ASC
    `;

    console.log("🔍 Searching for ALL eligible transactions...");
    const result = await client.query(query);

    console.log(`📊 Found ${result.rows.length} eligible transactions\n`);

    if (result.rows.length === 0) {
      console.log("✅ No feedback requests to send. All users have been emailed or no eligible transactions.");
      return;
    }

    // Show summary by date
    console.log("📅 Transaction Date Range:");
    const oldestDate = new Date(result.rows[0].purchase_date).toLocaleDateString();
    const newestDate = new Date(result.rows[result.rows.length - 1].purchase_date).toLocaleDateString();
    console.log(`   From: ${oldestDate}`);
    console.log(`   To: ${newestDate}\n`);

    // Confirmation prompt
    console.log("⚠️  WARNING: This will send emails to ALL " + result.rows.length + " users!");
    console.log("   Make sure you want to proceed...\n");
    
    // Auto-proceed after 3 seconds (for automation)
    console.log("   Proceeding in 3 seconds... (Press Ctrl+C to cancel)");
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log("\n🚀 Starting email process...\n");

    // Send feedback emails
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const transaction = result.rows[i];
      
      try {
        const progress = `[${i + 1}/${result.rows.length}]`;
        console.log(`${progress} 📧 Processing: ${transaction.username} (${transaction.email})`);
        console.log(`         Game: ${transaction.game_name} - ${transaction.package_name}`);
        console.log(`         Purchase Date: ${new Date(transaction.purchase_date).toLocaleString()}`);

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
          console.log(`         ✅ Email sent and marked\n`);
          successCount++;
        } else {
          console.log(`         ❌ Email failed\n`);
          failCount++;
        }

        // Add delay to avoid overwhelming email server (2 seconds between emails)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Show progress every 10 emails
        if ((i + 1) % 10 === 0) {
          console.log(`\n📊 Progress: ${i + 1}/${result.rows.length} processed\n`);
        }
      } catch (error: any) {
        console.error(`         ❌ Error processing transaction ${transaction.transaction_id}:`, error.message);
        failCount++;
      }
    }

    // Final Summary
    console.log("\n" + "═".repeat(70));
    console.log("📊 FEEDBACK EMAIL BACKFILL SUMMARY");
    console.log("═".repeat(70));
    console.log(`   Total Transactions Found: ${result.rows.length}`);
    console.log(`   ✅ Emails Sent Successfully: ${successCount}`);
    console.log(`   ❌ Emails Failed: ${failCount}`);
    console.log(`   ⏭️  Emails Skipped: ${skipCount}`);
    console.log(`   Success Rate: ${((successCount / result.rows.length) * 100).toFixed(1)}%`);
    console.log("═".repeat(70));

    if (successCount > 0) {
      console.log(`\n🎉 Successfully sent ${successCount} feedback request emails!`);
      console.log("📧 Users will start receiving emails shortly.\n");
    }

  } catch (error: any) {
    console.error("❌ Feedback email backfill failed:", error.message);
    console.error("Error details:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
backfillFeedbackEmails()
  .then(() => {
    console.log("\n✅ Feedback email backfill completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Backfill process failed:", error);
    process.exit(1);
  });
