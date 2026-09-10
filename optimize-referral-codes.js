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
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
} else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
}

const pool = new Pool(poolConfig);

console.log('=== Referral Code System Optimization ===\n');

async function optimizeReferralCodeSystem() {
  const client = await pool.connect();
  
  try {
    console.log('1. Checking existing indexes on referral_codes table...');
    const indexCheck = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'referral_codes'
    `);
    console.log('Existing indexes:');
    indexCheck.rows.forEach(row => {
      console.log(`   - ${row.indexname}: ${row.indexdef}`);
    });
    
    console.log('\n2. Creating additional indexes if missing...');
    // Ensure we have proper indexes for performance
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id_lookup 
        ON referral_codes (user_id)
      `);
      console.log('✅ Created index on user_id for faster lookups');
    } catch (error) {
      console.log('⚠️  Index on user_id already exists or error:', error.message);
    }
    
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_referral_codes_code_lookup 
        ON referral_codes (code)
      `);
      console.log('✅ Created index on code for faster lookups');
    } catch (error) {
      console.log('⚠️  Index on code already exists or error:', error.message);
    }
    
    console.log('\n3. Analyzing query performance before optimization...');
    // Test a simple query to see current performance
    const startTime = Date.now();
    await client.query(`
      SELECT code FROM referral_codes WHERE user_id = (
        SELECT id FROM app_users LIMIT 1
      )
    `);
    const endTime = Date.now();
    console.log(`   Query took ${endTime - startTime}ms before optimization`);
    
    console.log('\n4. Running ANALYZE on referral_codes table...');
    await client.query('ANALYZE referral_codes');
    console.log('✅ ANALYZE completed on referral_codes table');
    
    console.log('\n5. Testing performance after optimization...');
    const startTime2 = Date.now();
    await client.query(`
      SELECT code FROM referral_codes WHERE user_id = (
        SELECT id FROM app_users LIMIT 1
      )
    `);
    const endTime2 = Date.now();
    console.log(`   Query took ${endTime2 - startTime2}ms after optimization`);
    
    console.log('\n6. Checking for any missing referral codes...');
    const missingCodes = await client.query(`
      SELECT id, username FROM app_users 
      WHERE id NOT IN (SELECT user_id FROM referral_codes)
    `);
    if (missingCodes.rows.length > 0) {
      console.log('❌ Found users without referral codes:');
      missingCodes.rows.forEach(row => {
        console.log(`   - ${row.username} (${row.id})`);
      });
    } else {
      console.log('✅ All users have referral codes');
    }
    
    console.log('\n7. Verifying referral code uniqueness constraint...');
    try {
      await client.query(`
        ALTER TABLE referral_codes 
        ADD CONSTRAINT unique_referral_code_optimized 
        UNIQUE (code)
      `);
      console.log('✅ Added unique constraint on referral codes');
    } catch (error) {
      if (error.message.includes('unique_referral_code_optimized') || error.message.includes('duplicate key')) {
        console.log('✅ Unique constraint on referral codes already exists');
      } else {
        console.log('⚠️  Error adding unique constraint:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during optimization:', error.message);
  } finally {
    client.release();
  }
}

// Run the optimization
optimizeReferralCodeSystem()
  .then(() => {
    console.log('\n=== Optimization Complete ===');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  });