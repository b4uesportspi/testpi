import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTransactionCounts() {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM app_transactions
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log('\n📊 Transaction Status Summary (All Transactions):\n');
    
    let total = 0;
    result.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
      total += row.count;
    });

    console.log(`   ${'='.repeat(30)}`);
    console.log(`   TOTAL: ${total}\n`);

    // Also check for pending transactions specifically
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as pending_count FROM app_transactions WHERE status = 'pending'
    `);

    console.log(`✅ Pending transactions remaining: ${pendingResult.rows[0].pending_count}\n`);

  } catch (error) {
    console.error('Error checking transaction counts:', error);
  } finally {
    await pool.end();
  }
}

checkTransactionCounts();
