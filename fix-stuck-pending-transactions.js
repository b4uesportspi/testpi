/**
 * Immediate fix script for stuck pending transactions (JavaScript version)
 * This script marks OLD pending transactions as failed (since they've been pending for days/weeks)
 * 
 * Usage: node fix-stuck-pending-transactions.js
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixStuckPendingTransactions() {
  try {
    console.log('🔄 Starting fix for stuck pending transactions...\n');

    // Get all pending transactions
    const result = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.pi_amount,
        u.username,
        u.email,
        p.name as package_name,
        p.game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'pending'
      ORDER BY t.created_at DESC
    `);

    const pendingTransactions = result.rows;

    if (pendingTransactions.length === 0) {
      console.log('✅ No pending transactions found!');
      await pool.end();
      return;
    }

    console.log(`📊 Found ${pendingTransactions.length} pending transactions:\n`);

    let fixedCount = 0;

    for (const transaction of pendingTransactions) {
      const createdTime = new Date(transaction.created_at).getTime();
      const currentTime = Date.now();
      const timeDiffHours = (currentTime - createdTime) / (1000 * 60 * 60);
      const timeDiffDays = timeDiffHours / 24;

      console.log(`\n📋 Transaction: ${transaction.id}`);
      console.log(`   User: ${transaction.username} (${transaction.email})`);
      console.log(`   Package: ${transaction.package_name} (${transaction.game})`);
      console.log(`   Amount: ${transaction.pi_amount} π`);
      console.log(`   Created: ${transaction.created_at} (${timeDiffDays.toFixed(1)} days ago)`);
      console.log(`   Status: ${transaction.status}`);

      // Mark as failed since they're old
      if (timeDiffHours > 0.5) {
        console.log(`   → ACTION: Marking as FAILED (pending for ${timeDiffDays.toFixed(1)} days)`);
        
        const failureReason = timeDiffDays > 2 
          ? `Payment stuck in pending state for ${Math.round(timeDiffDays)} days - marked as failed`
          : 'Payment not approved within 30 minutes - transaction timeout';

        await pool.query(
          `UPDATE app_transactions 
           SET status = 'failed', 
               failure_reason = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [failureReason, transaction.id]
        );
        
        console.log(`   ✅ Updated to FAILED`);
        fixedCount++;
      } else {
        console.log(`   → SKIP: Transaction is recent, keeping as PENDING`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Fixed ${fixedCount} stuck pending transactions`);
    console.log(`${'='.repeat(60)}\n`);

    await pool.end();

  } catch (error) {
    console.error('Error fixing stuck pending transactions:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the fix
fixStuckPendingTransactions().catch(error => {
  console.error('Failed to fix stuck pending transactions:', error);
  process.exit(1);
});
