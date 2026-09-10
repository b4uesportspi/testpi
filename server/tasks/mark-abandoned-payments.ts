import { pool } from "../db.js";
import dotenv from "dotenv";
import { sendPaymentFailureNotification } from "../services/email.js";

dotenv.config();

/**
 * Mark Abandoned Pending Payments as Failed
 *
 * This job handles two cases:
 * 1. Any pending payment older than the abandonment threshold is marked failed.
 * 2. Any previously marked abandoned payment with email_sent = false gets its
 *    failure email retried automatically.
 *
 * Runs every 15 minutes via GitHub Actions (not Vercel cron).
 */

const ABANDON_AFTER_MINUTES = 5;
const FAILURE_REASON = "Payment not completed within 5 minutes. This can happen when the user leaves the Pi flow, funds are insufficient, or the network interrupted the purchase.";

type AbandonedPaymentRow = {
  transaction_id: string;
  user_id: string;
  payment_id: string;
  created_at: string;
  pi_amount: string;
  package_name: string | null;
  game: string | null;
  username: string | null;
  email: string | null;
  status: string;
  email_sent: boolean;
  failure_reason: string | null;
};

async function markAbandonedPayments() {
  console.log("Starting abandoned payment detection...\n");

  const client = await pool.connect();

  try {
    const abandonCutoffTime = new Date(Date.now() - ABANDON_AFTER_MINUTES * 60 * 1000);

    console.log(`Abandon threshold: ${ABANDON_AFTER_MINUTES} minutes`);
    console.log(`Marking all pending payments created on or before ${abandonCutoffTime.toISOString()}`);
    console.log("Retrying abandoned-payment emails for failed rows with email_sent = false\n");

    const query = `
      SELECT
        t.id AS transaction_id,
        t.user_id,
        t.payment_id,
        t.created_at,
        t.pi_amount,
        p.name AS package_name,
        p.game,
        u.username,
        u.email,
        t.status,
        t.email_sent,
        t.failure_reason
      FROM app_transactions t
      LEFT JOIN app_packages p ON t.package_id = p.id
      LEFT JOIN app_users u ON t.user_id = u.id
      WHERE (
        t.status = 'pending'
        AND t.created_at <= $1
      ) OR (
        t.status = 'failed'
        AND t.failure_reason = $2
        AND t.email_sent = false
      )
      ORDER BY t.created_at ASC
    `;

    const result = await client.query<AbandonedPaymentRow>(query, [abandonCutoffTime, FAILURE_REASON]);
    const candidates = result.rows;

    if (candidates.length === 0) {
      console.log("No abandoned payments or email retries found.");
      console.log("Process completed.\n");
      return;
    }

    console.log(`Found ${candidates.length} abandoned payment candidate(s):\n`);

    let markedCount = 0;
    let emailedCount = 0;

    for (const payment of candidates) {
      const createdTime = new Date(payment.created_at).getTime();
      const minutesPending = (Date.now() - createdTime) / (1000 * 60);

      console.log(`Transaction #${payment.transaction_id}`);
      console.log(`  Status: ${payment.status}`);
      console.log(`  User: ${payment.username || "Unknown"} (${payment.email || "No email"})`);
      console.log(`  Package: ${payment.package_name || "Unknown"} (${payment.game || "Unknown"})`);
      console.log(`  Amount: ${payment.pi_amount} Pi`);
      console.log(`  Age: ${minutesPending.toFixed(0)} minutes`);

      try {
        if (payment.status === "pending") {
          const updateQuery = `
            UPDATE app_transactions
            SET status = 'failed',
                failure_reason = $2,
                updated_at = NOW()
            WHERE id = $1 AND status = 'pending'
          `;

          const updateResult = await client.query(updateQuery, [payment.transaction_id, FAILURE_REASON]);

          if (updateResult.rowCount && updateResult.rowCount > 0) {
            markedCount++;
            console.log("  Marked as FAILED");
          } else {
            console.log("  Skipped status update because the row is no longer pending");
          }
        } else {
          console.log("  Already marked as failed previously; retrying unsent email");
        }

        if (!payment.email) {
          console.error("  Cannot send failure notification because the user email is missing");
          continue;
        }

        const emailSent = await sendPaymentFailureNotification({
          to: payment.email,
          username: payment.username || "Customer",
          packageName: payment.package_name || "Purchase",
          piAmount: payment.pi_amount.toString(),
          failureReason: FAILURE_REASON,
          transactionId: payment.transaction_id.toString(),
          paymentId: payment.payment_id,
          isCancelled: false,
          game: payment.game || undefined
        });

        if (emailSent) {
          await client.query(
            `
              UPDATE app_transactions
              SET email_sent = true,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [payment.transaction_id]
          );

          emailedCount++;
          console.log(`  Failure notification email sent to ${payment.email}\n`);
        } else {
          console.error(`  Failure notification email was not sent to ${payment.email}\n`);
        }
      } catch (error) {
        console.error(`  Error processing transaction ${payment.transaction_id}:`, error);
      }
    }

    console.log(`${"=".repeat(60)}`);
    console.log(`Successfully marked ${markedCount} abandoned payments as failed`);
    console.log(`Successfully sent ${emailedCount} abandoned payment email(s)`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (error) {
    console.error("Error in abandoned payment detection:", error);
    throw error;
  } finally {
    await client.release();
  }
}

markAbandonedPayments()
  .then(() => {
    console.log("Abandoned payment marking completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to mark abandoned payments:", error);
    process.exit(1);
  });
