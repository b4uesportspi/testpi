#!/usr/bin/env node
// Test admin purchase logging system

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testAdminPurchaseLogs() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testing Admin Purchase Logs System...\n');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_purchase_logs'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table does not exist. Running migration...');
      
      // Create the table
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin_purchase_logs (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          transaction_id varchar NOT NULL REFERENCES app_transactions(id),
          user_id varchar NOT NULL REFERENCES app_users(id),
          username text NOT NULL,
          user_email text NOT NULL,
          package_name text NOT NULL,
          game text NOT NULL,
          pi_amount decimal(18, 8) NOT NULL,
          usd_amount decimal(10, 4) NOT NULL,
          game_account text,
          payment_id text NOT NULL,
          status text NOT NULL DEFAULT 'completed',
          created_at timestamp DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS admin_purchase_logs_created_at_idx ON admin_purchase_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS admin_purchase_logs_status_idx ON admin_purchase_logs(status);
      `);
      console.log('✅ Table created successfully\n');
    } else {
      console.log('✅ Table exists\n');
    }

    // Check for recent purchase logs
    const recentLogs = await client.query(`
      SELECT 
        id,
        username,
        package_name,
        game,
        pi_amount,
        usd_amount,
        created_at
      FROM admin_purchase_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`📊 Recent Purchase Logs (Last 10):`);
    console.log(`Total records: ${recentLogs.rows.length}\n`);

    if (recentLogs.rows.length > 0) {
      recentLogs.rows.forEach((row: any, index: number) => {
        console.log(`${index + 1}. ${row.username} - ${row.package_name} (${row.game})`);
        console.log(`   Amount: ${row.pi_amount} π = $${row.usd_amount}`);
        console.log(`   Time: ${new Date(row.created_at).toLocaleString()}\n`);
      });

      // Calculate summary
      const summary = await client.query(`
        SELECT 
          COUNT(*) as total_purchases,
          SUM(pi_amount) as total_pi,
          SUM(usd_amount) as total_usd,
          COUNT(DISTINCT user_id) as unique_users
        FROM admin_purchase_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      const stats = summary.rows[0];
      console.log(`📈 Last 24 Hours Summary:`);
      console.log(`   Total Purchases: ${stats.total_purchases}`);
      console.log(`   Total Pi: ${stats.total_pi}`);
      console.log(`   Total USD: $${stats.total_usd}`);
      console.log(`   Unique Users: ${stats.unique_users}\n`);
    } else {
      console.log('No purchase logs yet. Logs will appear when purchases are completed.\n');
    }

    console.log('✅ Admin Purchase Logs System is ready!');
    console.log('\n📌 API Endpoint: GET /api/admin-purchase-logs?timeRange=24h&limit=50');
    console.log('   Query Parameters:');
    console.log('   - timeRange: 1h, 24h, 7d, 30d, all (default: 24h)');
    console.log('   - limit: number of results (default: 50, max: 200)');

  } finally {
    client.release();
    await pool.end();
  }
}

testAdminPurchaseLogs().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
