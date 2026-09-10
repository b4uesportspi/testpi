const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(`
      SELECT 
        u.email,
        u.display_name,
        t.id,
        t.status,
        t.pi_amount,
        t.usd_amount,
        t.created_at,
        p.name as package_name
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE DATE(t.created_at) = CURRENT_DATE
      ORDER BY t.created_at DESC;
    `);
    
    console.log('\n=== PURCHASES TODAY ===\n');
    if (result.rows.length === 0) {
      console.log('No purchases today');
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.email} (${row.display_name})`);
        console.log(`   Package: ${row.package_name}`);
        console.log(`   Amount: $${row.usd_amount} USD / ${row.pi_amount} π`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Time: ${new Date(row.created_at).toLocaleString()}`);
        console.log('');
      });
      console.log(`Total: ${result.rows.length} purchase(s)`);
    }
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
