import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function showFixedTransactions() {
  try {
    console.log('\n📋 Transactions That Were Fixed (Previous Pending Status)\n');

    const result = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.failure_reason,
        u.username,
        u.email,
        p.name as package_name,
        p.game,
        t.pi_amount,
        t.created_at,
        t.updated_at,
        EXTRACT(DAY FROM (NOW() - t.created_at)) as days_pending
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.failure_reason LIKE '%timeout%' OR t.failure_reason LIKE '%pending%'
      ORDER BY t.created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('No previously-pending transactions found.\n');
      await pool.end();
      return;
    }

    console.log(`Total Fixed: ${result.rows.length}\n`);

    result.rows.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.username} - ${tx.package_name} (${tx.game})`);
      console.log(`   ID: ${tx.id}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Reason: ${tx.failure_reason}`);
      console.log(`   Amount: ${tx.pi_amount} π`);
      console.log(`   Was Pending For: ${Math.round(tx.days_pending)} days`);
      console.log(`   Created: ${new Date(tx.created_at).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(tx.updated_at).toLocaleDateString()}`);
      console.log('');
    });

    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Successfully fixed ${result.rows.length} stuck pending transactions\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

showFixedTransactions();
