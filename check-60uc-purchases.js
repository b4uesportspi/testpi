import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function check60UCPurchases() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Checking all purchases of 60 UC...');

    // Query for all transactions of 60 UC package
    const result = await pool.query(`
      SELECT
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.pi_amount,
        t.usd_amount,
        t.txid,
        t.failure_reason,
        t.success_reason,
        u.email as user_email,
        u.username as user_name,
        u.phone as user_phone,
        p.name as package_name,
        p.game as package_game,
        t.game_account
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.package_id = '31e8311f-51f5-4c61-888d-d5f28f008dba'
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('✅ No purchases of 60 UC found.');
      return;
    }

    console.log(`\n📊 Found ${result.rows.length} 60 UC purchases:`);
    console.log('=' .repeat(80));

    result.rows.forEach((transaction, index) => {
      console.log(`${index + 1}. User: ${transaction.user_name} (${transaction.user_email})`);
      console.log(`   Phone: ${transaction.user_phone || 'N/A'}`);
      console.log(`   Transaction ID: ${transaction.id}`);
      console.log(`   Payment ID: ${transaction.payment_id}`);
      console.log(`   Status: ${transaction.status}`);
      console.log(`   Pi Amount: ${transaction.pi_amount}`);
      console.log(`   USD Amount: ${transaction.usd_amount}`);
      console.log(`   TXID: ${transaction.txid || 'N/A'}`);
      console.log(`   Failure Reason: ${transaction.failure_reason || 'N/A'}`);
      console.log(`   Success Reason: ${transaction.success_reason || 'N/A'}`);
      console.log(`   Game Account: ${JSON.stringify(transaction.game_account)}`);
      console.log(`   Created At: ${transaction.created_at}`);
      console.log('');
    });

    // Count by status
    const statusCounts = {};
    result.rows.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    console.log('Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error checking 60 UC purchases:', error);
  } finally {
    await pool.end();
  }
}

check60UCPurchases();