import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL + '?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // 60 UC = 8.28 Pi, so 1 UC ≈ 0.138 Pi
    // 0.06 UC ≈ 0.0083 Pi
    // Looking for very small transactions
    
    const result = await pool.query(`
      SELECT t.id, t.payment_id, t.pi_amount, t.usd_amount, t.status, t.created_at, p.name as package_name
      FROM app_transactions t
      LEFT JOIN app_packages p ON t.package_id = p.id
      LEFT JOIN app_users u ON t.user_id = u.id
      WHERE u.username = 'rinzindo4ji'
      AND t.pi_amount < 0.15
      ORDER BY t.created_at DESC
    `);
    
    console.log('Small transactions for rinzindo4ji:\n');
    if (result.rows.length === 0) {
      console.log('No small transactions found');
      console.log('\nSearching for all transactions with pi_amount...\n');
      
      const allResult = await pool.query(`
        SELECT t.id, t.payment_id, t.pi_amount, t.usd_amount, t.status, t.created_at, p.name as package_name
        FROM app_transactions t
        LEFT JOIN app_packages p ON t.package_id = p.id
        LEFT JOIN app_users u ON t.user_id = u.id
        WHERE u.username = 'rinzindo4ji'
        ORDER BY t.pi_amount ASC
        LIMIT 15
      `);
      
      allResult.rows.forEach((row, i) => {
        console.log(`${i+1}. Amount: ${row.pi_amount} Pi | USD: ${row.usd_amount} | Status: ${row.status} | Package: ${row.package_name}`);
      });
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i+1}. Amount: ${row.pi_amount} Pi | USD: ${row.usd_amount} | Status: ${row.status} | Package: ${row.package_name}`);
      });
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
