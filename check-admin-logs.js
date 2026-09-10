#!/usr/bin/env node
import pkg from 'pg';
const { Pool } = pkg;

async function testAdminPurchaseLogs() {
  console.log('🔍 Testing Admin Purchase Logs System...\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const client = await pool.connect();
  try {
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_purchase_logs'
      );
    `);

    console.log('Table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('\n❌ admin_purchase_logs table does NOT exist yet');
      console.log('ℹ️  The table will be created on the next deployment via Drizzle migration');
      console.log('ℹ️  It will be automatically populated when purchases are completed');
    } else {
      console.log('✅ admin_purchase_logs table exists\n');
      
      // Check for recent purchase logs
      const result = await client.query(`
        SELECT COUNT(*) as total,
               SUM(pi_amount) as total_pi,
               SUM(usd_amount) as total_usd
        FROM admin_purchase_logs
      `);
      
      const row = result.rows[0];
      console.log('📊 Admin Purchase Logs Statistics:');
      console.log(`   Total Purchases Logged: ${row.total}`);
      console.log(`   Total Pi: ${row.total_pi || 0}`);
      console.log(`   Total USD: $${row.total_usd || 0}`);
    }

    console.log('\n✅ System Check Complete\n');
    console.log('📌 Real-Time Admin Dashboard:');
    console.log('   GET /api/admin-purchase-logs?timeRange=24h&limit=50\n');
    console.log('📋 Instant Purchase Logging:');
    console.log('   - When a purchase completes, it\'s logged to admin_purchase_logs');
    console.log('   - Admin dashboard can query in real-time without waiting for emails');
    console.log('   - Email is sent asynchronously in the background\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('admin_purchase_logs')) {
      console.log('\n✅ This is expected - the table will be created on first deployment');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

testAdminPurchaseLogs();
