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
    const result = await pool.query(`
      SELECT t.id, t.payment_id, t.pi_amount, t.status, t.created_at, p.name as package_name
      FROM app_transactions t
      LEFT JOIN app_packages p ON t.package_id = p.id
      LEFT JOIN app_users u ON t.user_id = u.id
      WHERE u.username = 'rinzindo4ji'
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    
    console.log('All transactions for rinzindo4ji:\n');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. Amount: ${row.pi_amount} Pi | Status: ${row.status} | Package: ${row.package_name} | Date: ${row.created_at}`);
    });
    
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
