const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Enable SSL for Supabase
});

async function checkRLS() {
  try {
    await client.connect();

    // Check RLS status for all tables
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('RLS Status for tables:');
    result.rows.forEach(row => {
      console.log(`${row.tablename}: RLS ${row.rls_enabled ? 'ENABLED' : 'DISABLED'}`);
    });

    // Check policies
    const policiesResult = await client.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    console.log('\nRLS Policies:');
    if (policiesResult.rows.length === 0) {
      console.log('No RLS policies found!');
    } else {
      policiesResult.rows.forEach(policy => {
        console.log(`${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
      });
    }

  } catch (error) {
    console.error('Error checking RLS:', error);
  } finally {
    await client.end();
  }
}

async function lockDownSensitiveTables() {
  try {
    await client.connect();

    console.log('Locking down sensitive tables...');

    // Revoke anonymous access from sensitive tables
    const sensitiveTables = [
      'users', 'app_users', 'transactions', 'app_transactions',
      'referral_codes', 'purchase_rewards', 'referral_rewards',
      'security_audit_log', 'app_admins', 'admins',
      'marketing_email_sends', 'marketing_email_events', 'marketing_coupons'
    ];

    for (const table of sensitiveTables) {
      await client.query(`REVOKE ALL ON TABLE ${table} FROM anon;`);
      console.log(`Revoked anon access from ${table}`);
    }

    // Ensure RLS is enabled
    for (const table of sensitiveTables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      console.log(`Ensured RLS enabled on ${table}`);
    }

    // Drop any anonymous policies on sensitive tables
    for (const table of sensitiveTables) {
      await client.query(`DROP POLICY IF EXISTS "Anyone can view ${table}" ON ${table};`);
      console.log(`Dropped any anonymous policies on ${table}`);
    }

    console.log('Sensitive tables locked down successfully.');

  } catch (error) {
    console.error('Error locking down tables:', error);
  } finally {
    await client.end();
  }
}

// Run the lockdown
lockDownSensitiveTables();