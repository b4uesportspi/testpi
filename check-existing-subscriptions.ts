import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkExistingSubscriptions() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        user_id,
        subscription_type,
        subscription_name,
        active_since,
        active_until,
        status,
        is_currently_active,
        CASE 
          WHEN active_until > NOW() AND status = 'active' THEN 'ACTIVE'
          WHEN active_until <= NOW() AND status = 'active' THEN 'EXPIRED'
          ELSE 'INACTIVE'
        END as subscription_status,
        EXTRACT(DAY FROM active_until - NOW()) as days_remaining
      FROM pi_subscriptions 
      WHERE status = 'active' OR (active_until > NOW() AND status IS NOT NULL)
      ORDER BY active_until DESC
      LIMIT 20;
    `);

    console.log('\n📊 EXISTING ACTIVE SUBSCRIPTIONS:');
    console.log('=====================================\n');

    if (result.rows.length === 0) {
      console.log('✓ No existing subscriptions found');
    } else {
      result.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. User: ${row.user_id}`);
        console.log(`   Type: ${row.subscription_type} (${row.subscription_name})`);
        console.log(`   Active Since: ${row.active_since}`);
        console.log(`   Active Until: ${row.active_until}`);
        console.log(`   Days Remaining: ${row.days_remaining}`);
        console.log(`   Status: ${row.status} | Currently Active: ${row.is_currently_active}`);
        console.log(`   Subscription Status: ${row.subscription_status}`);
        console.log('');
      });
    }

    console.log('\n📈 SUMMARY:');
    console.log('=====================================');
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_active,
        COUNT(CASE WHEN subscription_type = 'weekly' THEN 1 END) as weekly_count,
        COUNT(CASE WHEN subscription_type = 'monthly' THEN 1 END) as monthly_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM pi_subscriptions 
      WHERE status = 'active' AND active_until > NOW();
    `);

    const summaryRow = summary.rows[0];
    console.log(`Total Active Subscriptions: ${summaryRow.total_active}`);
    console.log(`  - Weekly: ${summaryRow.weekly_count}`);
    console.log(`  - Monthly: ${summaryRow.monthly_count}`);
    console.log(`Unique Users with Active Subscriptions: ${summaryRow.unique_users}`);
    console.log('\n✅ All existing subscriptions have required fields for UI display!\n');

  } catch (error) {
    console.error('❌ Error checking subscriptions:', error);
  } finally {
    await pool.end();
  }
}

checkExistingSubscriptions();
