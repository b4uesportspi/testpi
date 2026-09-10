/**
 * Manual sync script for pending transactions
 * This script checks all pending transactions against Pi Network and updates their status
 * 
 * Usage: npx ts-node sync-pending-transactions.ts
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

interface Transaction {
  id: string;
  payment_id: string;
  user_id: string;
  status: string;
  created_at: Date;
  pi_amount: string;
}

interface PiPaymentStatus {
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction?: {
    txid: string;
  };
}

async function getPendingTransactions(): Promise<Transaction[]> {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        payment_id, 
        user_id,
        status, 
        created_at, 
        pi_amount
      FROM app_transactions
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('Error fetching pending transactions:', error);
    throw error;
  }
}

async function getPaymentFromPiNetwork(paymentId: string): Promise<PiPaymentStatus | null> {
  const piServerApiKey = process.env.PI_SERVER_API_KEY || process.env.PI_API_KEY;
  
  if (!piServerApiKey || piServerApiKey === 'your_pi_server_api_key_here') {
    console.warn('⚠️  Pi Server API Key not configured. Skipping Pi Network check for', paymentId);
    return null;
  }

  try {
    const response = await fetch(`https://api.mainnet.pi/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${piServerApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch payment ${paymentId} from Pi Network. Status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching payment ${paymentId} from Pi Network:`, error);
    return null;
  }
}

async function updateTransactionStatus(
  transactionId: string,
  newStatus: string,
  failureReason?: string,
  txid?: string
): Promise<void> {
  try {
    const updates: string[] = [];
    const values: any[] = [newStatus, new Date(), transactionId];

    updates.push('status = $1', 'updated_at = $2');

    if (failureReason) {
      updates.push(`failure_reason = $${values.length + 1}`);
      values.push(failureReason);
    }

    if (txid) {
      updates.push(`txid = $${values.length + 1}`);
      values.push(txid);
    }

    const query = `
      UPDATE app_transactions
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
    `;
    values.push(transactionId);

    await pool.query(query, values);
    console.log(`✅ Updated transaction ${transactionId} to status: ${newStatus}`);
  } catch (error) {
    console.error(`Error updating transaction ${transactionId}:`, error);
  }
}

async function syncPendingTransactions(): Promise<void> {
  console.log('🔄 Starting pending transaction sync...\n');

  try {
    const pendingTransactions = await getPendingTransactions();
    
    if (pendingTransactions.length === 0) {
      console.log('✅ No pending transactions found. All transactions are properly synced!');
      return;
    }

    console.log(`📊 Found ${pendingTransactions.length} pending transactions\n`);

    let syncedCount = 0;
    let failedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let noChangeCount = 0;

    for (const transaction of pendingTransactions) {
      try {
        const createdTime = new Date(transaction.created_at).getTime();
        const currentTime = Date.now();
        const timeDiffHours = (currentTime - createdTime) / (1000 * 60 * 60);
        const timeDiffDays = timeDiffHours / 24;

        console.log(`\n📋 Processing transaction: ${transaction.id}`);
        console.log(`   Payment ID: ${transaction.payment_id}`);
        console.log(`   User ID: ${transaction.user_id}`);
        console.log(`   Created: ${transaction.created_at}`);
        console.log(`   Age: ${timeDiffDays.toFixed(2)} days (${timeDiffHours.toFixed(1)} hours)`);
        console.log(`   Amount: ${transaction.pi_amount} π`);

        // Get payment status from Pi Network
        const paymentDetails = await getPaymentFromPiNetwork(transaction.payment_id);

        if (!paymentDetails) {
          // If we can't get details from Pi Network and it's old, mark as failed
          if (timeDiffHours > 48) {
            console.log(`   ⚠️  Could not verify with Pi Network and transaction is old (${timeDiffDays.toFixed(1)} days)`);
            console.log(`   → Marking as FAILED`);
            await updateTransactionStatus(
              transaction.id,
              'failed',
              'Unable to verify payment status with Pi Network - transaction timeout'
            );
            failedCount++;
            syncedCount++;
          } else {
            console.log(`   ⏳ Could not verify with Pi Network, but transaction is recent. Keeping as PENDING.`);
            noChangeCount++;
          }
          continue;
        }

        const status = paymentDetails.status;

        // Determine new status
        if (status.cancelled || status.user_cancelled) {
          console.log(`   → Status in Pi Network: CANCELLED`);
          await updateTransactionStatus(
            transaction.id,
            'cancelled',
            status.user_cancelled ? 'Cancelled by user' : 'Cancelled by system'
          );
          cancelledCount++;
          syncedCount++;
        } else if (status.developer_completed && paymentDetails.transaction?.txid) {
          console.log(`   → Status in Pi Network: COMPLETED`);
          console.log(`   → TXID: ${paymentDetails.transaction.txid}`);
          await updateTransactionStatus(
            transaction.id,
            'completed',
            undefined,
            paymentDetails.transaction.txid
          );
          completedCount++;
          syncedCount++;
        } else if (!status.developer_approved) {
          // Payment not yet approved in Pi Network
          if (timeDiffHours > 48) {
            console.log(`   → Status in Pi Network: NOT APPROVED (pending for ${timeDiffDays.toFixed(1)} days)`);
            console.log(`   → Marking as FAILED (timeout)`);
            await updateTransactionStatus(
              transaction.id,
              'failed',
              'Payment not approved within 48 hours - transaction timeout'
            );
            failedCount++;
            syncedCount++;
          } else if (timeDiffHours > 0.5) {
            console.log(`   → Status in Pi Network: NOT APPROVED (pending for ${timeDiffHours.toFixed(1)} hours)`);
            console.log(`   → Marking as FAILED (stuck transaction)`);
            await updateTransactionStatus(
              transaction.id,
              'failed',
              'Payment stuck in pending state - not approved within 30 minutes'
            );
            failedCount++;
            syncedCount++;
          } else {
            console.log(`   → Status in Pi Network: NOT APPROVED (recent transaction, keeping PENDING)`);
            noChangeCount++;
          }
        } else {
          console.log(`   → Status in Pi Network: APPROVED (waiting for completion)`);
          noChangeCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing transaction ${transaction.id}:`, error);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Sync Summary:');
    console.log(`   ✅ Synced: ${syncedCount}/${pendingTransactions.length}`);
    console.log(`      • Completed: ${completedCount}`);
    console.log(`      • Cancelled: ${cancelledCount}`);
    console.log(`      • Failed/Timeout: ${failedCount}`);
    console.log(`   ⏳ No change (still pending): ${noChangeCount}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('Fatal error during sync:', error);
  } finally {
    await pool.end();
  }
}

// Run the sync
syncPendingTransactions().catch(error => {
  console.error('Failed to sync pending transactions:', error);
  process.exit(1);
});
