import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkCompletedTransactions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Checking completed transactions...');

    // Query for completed transactions
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
        u.email as user_email,
        u.username as user_name,
        u.phone as user_phone,
        p.name as package_name,
        p.game as package_game,
        t.game_account
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'completed'
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('✅ No completed transactions found.');
      return;
    }

    console.log(`\n📊 Found ${result.rows.length} completed transactions:`);
    console.log('=' .repeat(80));

    result.rows.forEach((transaction, index) => {
      console.log(`${index + 1}. User: ${transaction.user_name} (${transaction.user_email})`);
      console.log(`   Phone: ${transaction.user_phone || 'N/A'}`);
      console.log(`   Package: ${transaction.package_name} (${transaction.package_game})`);
      console.log(`   Transaction ID: ${transaction.id}`);
      console.log(`   Payment ID: ${transaction.payment_id}`);
      console.log(`   Pi Amount: ${transaction.pi_amount}`);
      console.log(`   USD Amount: ${transaction.usd_amount}`);
      console.log(`   TXID: ${transaction.txid || 'N/A'}`);
      console.log(`   Game Account: ${JSON.stringify(transaction.game_account)}`);
      console.log(`   Completed At: ${transaction.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking completed transactions:', error);
  } finally {
    await pool.end();
  }
}

checkCompletedTransactions();