/**
 * Refund for user: rinzindo4ji
 * Item: Only ONE 0.06 UC transaction (completed status)
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL + '?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const PI_API_BASE = 'https://api.minepi.com';
const PI_SERVER_API_KEY = process.env.PI_SERVER_API_KEY;

async function main() {
  console.log('🔄 Processing refund for rinzindo4ji - ONE 0.06 UC transaction\n');

  try {
    // Get ONE completed 0.06 UC transaction for rinzindo4ji
    const result = await pool.query(`
      SELECT t.id, t.pi_amount, t.status, t.payment_id, t.user_id, t.created_at,
             u.username, u.pi_uid, u.wallet_address,
             p.name as package_name, p.id as package_id
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE u.username = 'rinzindo4ji'
      AND t.status = 'completed'
      AND p.name = '0.06 UC'
      ORDER BY t.created_at DESC
      LIMIT 1
    `);

    const tx = result.rows[0];

    if (!tx) {
      console.error('❌ No completed 0.06 UC transaction found for rinzindo4ji');
      process.exit(1);
    }

    console.log('📦 Transaction Details:');
    console.log(`   Transaction ID: ${tx.id}`);
    console.log(`   Package: ${tx.package_name}`);
    console.log(`   Amount: ${tx.pi_amount} Pi (0.06 UC)`);
    console.log(`   User: ${tx.username} (UID: ${tx.pi_uid})`);
    console.log(`   Wallet: ${tx.wallet_address}`);
    console.log(`   Status: ${tx.status}`);
    console.log('');

    // Create refund memo
    const refundMemo = `Refund from B4U Esports for purchase of ${tx.package_name}`;
    console.log(`📝 Refund Memo: ${refundMemo}\n`);

    // Attempt Step 1: Create A2U Payment using wallet address (server transfer)
    console.log('📝 Step 1: Attempting to create server transfer (app-to-user)...');
    try {
      const createResponse = await axios.post(
        `${PI_API_BASE}/v2/payments`,
        {
          amount: tx.pi_amount,
          memo: refundMemo,
          direction: 'app_to_user',
          to_address: tx.wallet_address,
          metadata: {
            type: 'refund',
            original_transaction_id: tx.id,
            original_payment_id: tx.payment_id,
            username: tx.username,
            package_name: tx.package_name,
            network: 'mainnet'
          }
        },
        {
          headers: {
            'Authorization': `Key ${PI_SERVER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const paymentId = (createResponse.data as any).identifier;
      console.log(`✅ Payment created: ${paymentId}\n`);

      // Step 2: Submit to blockchain
      console.log('📤 Step 2: Submitting to Pi Blockchain...');
      const submitResponse = await axios.post(
        `${PI_API_BASE}/v2/payments/${paymentId}/submit`,
        {},
        {
          headers: {
            'Authorization': `Key ${PI_SERVER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const txid = (submitResponse.data as any).transaction?.txid;
      console.log(`✅ Payment submitted: ${txid}\n`);

      // Step 3: Complete payment
      console.log('✅ Step 3: Completing payment...');
      const completeResponse = await axios.post(
        `${PI_API_BASE}/v2/payments/${paymentId}/complete`,
        { txid },
        {
          headers: {
            'Authorization': `Key ${PI_SERVER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Payment completed!\n`);
      
      // Display status details
      const status = (completeResponse.data as any).status;
      if (status) {
        console.log('📊 Payment Status:');
        console.log(`   ✓ Developer Approved: ${status.developer_approved ? '✅ Yes' : '❌ No'}`);
        console.log(`   ✓ Transaction Verified: ${status.transaction_verified ? '✅ Yes' : '❌ No'}`);
        console.log(`   ✓ Developer Completed: ${status.developer_completed ? '✅ Yes' : '❌ No'}`);
        console.log(`   ✓ Cancelled: ${status.cancelled ? '🚫 Yes' : '✅ No'}`);
        console.log(`   ✓ User Cancelled: ${status.user_cancelled ? '🚫 Yes' : '✅ No'}\n`);
      }

      // Record in database
      console.log('💾 Recording refund in database...');
      const refundTxnId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await pool.query(
        `INSERT INTO app_transactions 
         (id, user_id, package_id, payment_id, txid, pi_amount, usd_amount, 
          pi_price_at_time, status, game_account, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          refundTxnId,
          tx.user_id,
          tx.package_id,
          paymentId,
          txid,
          tx.pi_amount,
          0,
          0,
          'completed',
          JSON.stringify({}),
          JSON.stringify({
            type: 'refund',
            original_transaction_id: tx.id,
            original_payment_id: tx.payment_id,
            original_package_id: tx.package_id,
            original_package_name: tx.package_name,
            pi_payment_id: paymentId,
            refund_memo: refundMemo,
            refunded_at: new Date().toISOString(),
            network: 'mainnet'
          })
        ]
      );

      console.log('✅ Refund recorded in database\n');

      // Update original transaction
      await pool.query(
        `UPDATE app_transactions SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [tx.id]
      );

      console.log('✨'.repeat(35));
      console.log('🎉 REFUND SUCCESSFUL!');
      console.log(`   👤 User: ${tx.username}`);
      console.log(`   💰 Amount: ${tx.pi_amount} Pi (0.06 UC)`);
      console.log(`   📦 Item: ${tx.package_name}`);
      console.log(`   🔗 TXID: ${txid}`);
      console.log(`   🌐 Network: MAINNET`);
      console.log('✨'.repeat(35));

    } catch (apiError: any) {
      const errorMessage = apiError.response?.data?.error_message || apiError.response?.data?.error || apiError.message;
      const errorCode = apiError.response?.data?.error;
      
      console.log(`\n⚠️  Pi Network API Error`);
      console.log(`   Code: ${errorCode || 'UNKNOWN'}`);
      console.log(`   Message: ${errorMessage}\n`);
      console.log('📝 Registering refund in database (marking as refunded)...\n');

      // Even if API fails, record the refund intent in the database
      const refundTxnId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await pool.query(
        `INSERT INTO app_transactions 
         (id, user_id, package_id, payment_id, txid, pi_amount, usd_amount, 
          pi_price_at_time, status, game_account, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          refundTxnId,
          tx.user_id,
          tx.package_id,
          tx.payment_id + '_manual',
          null,
          tx.pi_amount,
          0,
          0,
          'refunded_manual',
          JSON.stringify({}),
          JSON.stringify({
            type: 'refund',
            manual_refund: true,
            original_transaction_id: tx.id,
            original_payment_id: tx.payment_id,
            original_package_id: tx.package_id,
            original_package_name: tx.package_name,
            refund_memo: refundMemo,
            refunded_at: new Date().toISOString(),
            reason: 'Pi API feature not available',
            api_error: apiError.response?.data?.error || apiError.message,
            network: 'mainnet'
          })
        ]
      );

      // Update original transaction
      await pool.query(
        `UPDATE app_transactions SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [tx.id]
      );

      console.log('✨'.repeat(35));
      console.log('⏳ REFUND REGISTERED (Manual Processing Required)');
      console.log(`   👤 User: ${tx.username}`);
      console.log(`   💰 Amount: ${tx.pi_amount} Pi (0.06 UC)`);
      console.log(`   📦 Item: ${tx.package_name}`);
      console.log(`   ⚠️  Note: Pi Network API not available`);
      console.log(`   💬 You may need to process this manually via Pi Admin Dashboard`);
      console.log('✨'.repeat(35));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
