/**
 * Refund for user: rinzindo4ji
 * Item: 0.06 UC (latest transaction)
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
  console.log('🔄 Processing refund for rinzindo4ji - 0.06 UC\n');

  try {
    // Get latest transaction for rinzindo4ji
    const result = await pool.query(`
      SELECT t.id, t.pi_amount, t.status, t.payment_id, t.user_id, t.created_at,
             u.username, u.pi_uid, u.wallet_address,
             p.name as package_name, p.id as package_id
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE u.username = 'rinzindo4ji'
      ORDER BY t.created_at DESC
      LIMIT 1
    `);

    const tx = result.rows[0];

    if (!tx) {
      console.error('❌ No transaction found for rinzindo4ji');
      process.exit(1);
    }

    console.log('📦 Transaction Details:');
    console.log(`   Transaction ID: ${tx.id}`);
    console.log(`   Package: ${tx.package_name}`);
    console.log(`   Amount: ${tx.pi_amount} Pi`);
    console.log(`   User: ${tx.username} (UID: ${tx.pi_uid})`);
    console.log(`   Wallet: ${tx.wallet_address}`);
    console.log('');

    // Create refund memo
    const refundMemo = `Refund from B4U Esports for purchase of ${tx.package_name}`;
    console.log(`📝 Refund Memo: ${refundMemo}\n`);

    // Step 1: Create A2U Payment using wallet address (server transfer)
    console.log('📝 Step 1: Creating server transfer (app-to-user)...');
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

    console.log(`✅ Payment completed!`);
    console.log(`   Status: ${JSON.stringify((completeResponse.data as any).status, null, 2)}\n`);

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
        'refund',
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
    console.log(`   💰 Amount: ${tx.pi_amount} Pi`);
    console.log(`   📦 Item: ${tx.package_name}`);
    console.log(`   🔗 TXID: ${txid}`);
    console.log(`   🌐 Network: MAINNET`);
    console.log('✨'.repeat(35));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await pool.end();
  }
}

main();
