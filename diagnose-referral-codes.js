import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration with proper SSL handling
const isSupabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000,
  statement_timeout: 15000,
  idleTimeoutMillis: 30000,
  max: 3,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  maxUses: 100,
};

// Handle SSL configuration for PostgreSQL connections
if (isSupabase) {
  // For Supabase, use rejectUnauthorized: false for Vercel compatibility
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
  console.log('Configuring SSL for Supabase connection with certificate bypass for Vercel API');
} else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  // For other PostgreSQL connections with SSL
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
  console.log('Configuring SSL for PostgreSQL connection with certificate bypass for Vercel API');
} else {
  console.log('Configuring DB pool without SSL (local development)');
}

const pool = new Pool(poolConfig);

console.log('=== Referral Code System Diagnosis ===\n');

async function diagnoseReferralCodeSystem() {
  const client = await pool.connect();
  
  try {
    console.log('1. Checking referral_codes table structure...');
    const tableCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'referral_codes' 
      ORDER BY ordinal_position
    `);
    console.log('✅ referral_codes table columns:');
    tableCheck.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type}, ${row.is_nullable})`);
    });
    
    console.log('\n2. Checking referral code generation function...');
    const funcCheck = await client.query(`
      SELECT proname, provolatile, prosrc 
      FROM pg_proc 
      WHERE proname = 'generate_referral_code'
    `);
    if (funcCheck.rows.length > 0) {
      console.log('✅ generate_referral_code function exists');
      console.log('   Function source:', funcCheck.rows[0].prosrc.trim());
    } else {
      console.log('❌ generate_referral_code function NOT found');
    }
    
    console.log('\n3. Checking referral code trigger...');
    const triggerCheck = await client.query(`
      SELECT tgname, tgtype, tgenabled 
      FROM pg_trigger 
      WHERE tgname = 'trigger_create_user_referral_code'
    `);
    if (triggerCheck.rows.length > 0) {
      console.log('✅ trigger_create_user_referral_code exists');
      console.log('   Trigger status:', triggerCheck.rows[0].tgenabled);
    } else {
      console.log('❌ trigger_create_user_referral_code NOT found');
    }
    
    console.log('\n4. Checking for duplicate referral codes...');
    const duplicateCheck = await client.query(`
      SELECT code, COUNT(*) as count 
      FROM referral_codes 
      GROUP BY code 
      HAVING COUNT(*) > 1
    `);
    if (duplicateCheck.rows.length > 0) {
      console.log('❌ Found duplicate referral codes:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   - ${row.code} (appears ${row.count} times)`);
      });
    } else {
      console.log('✅ No duplicate referral codes found');
    }
    
    console.log('\n5. Checking total referral codes and users...');
    const countCheck = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM referral_codes) as referral_code_count,
        (SELECT COUNT(*) FROM app_users) as user_count
    `);
    console.log(`   Total users: ${countCheck.rows[0].user_count}`);
    console.log(`   Total referral codes: ${countCheck.rows[0].referral_code_count}`);
    
    console.log('\n6. Checking recent referral code generation performance...');
    const recentUsers = await client.query(`
      SELECT id, username, created_at 
      FROM app_users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('   Recent users:');
    for (const user of recentUsers.rows) {
      const startTime = Date.now();
      const codeResult = await client.query(`
        SELECT code 
        FROM referral_codes 
        WHERE user_id = $1
      `, [user.id]);
      const endTime = Date.now();
      
      console.log(`   - ${user.username} (${user.id}): ${codeResult.rows[0]?.code || 'NO CODE'} (lookup took ${endTime - startTime}ms)`);
    }
    
    console.log('\n7. Testing referral code generation function directly...');
    const startTime = Date.now();
    const testResult = await client.query('SELECT generate_referral_code() as code');
    const endTime = Date.now();
    console.log(`   Generated code: ${testResult.rows[0].code} (took ${endTime - startTime}ms)`);
    
    console.log('\n8. Checking for any errors in recent logs...');
    // This would require checking application logs, which we can't do directly
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  } finally {
    client.release();
  }
}

// Run the diagnosis
diagnoseReferralCodeSystem()
  .then(() => {
    console.log('\n=== Diagnosis Complete ===');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  });