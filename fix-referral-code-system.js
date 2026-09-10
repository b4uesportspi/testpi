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

console.log('=== Referral Code System Fix ===\n');

async function fixReferralCodeSystem() {
  const client = await pool.connect();
  
  try {
    console.log('1. Checking current state of referral code functions...');
    
    // Check if the generate_referral_code function exists and is correct
    const funcCheck = await client.query(`
      SELECT proname, prosrc 
      FROM pg_proc 
      WHERE proname = 'generate_referral_code'
    `);
    
    if (funcCheck.rows.length > 0) {
      console.log('✅ generate_referral_code function exists');
      console.log('   Current function source:', funcCheck.rows[0].prosrc.trim());
      
      // Check if we need to update the function for better performance
      const currentSource = funcCheck.rows[0].prosrc;
      if (!currentSource.includes('UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6))')) {
        console.log('   Updating function for better performance...');
        await client.query(`
          CREATE OR REPLACE FUNCTION generate_referral_code()
          RETURNS TEXT AS $$
          BEGIN
              RETURN 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
          END;
          $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Updated generate_referral_code function');
      }
    } else {
      console.log('❌ generate_referral_code function NOT found, creating it...');
      await client.query(`
        CREATE OR REPLACE FUNCTION generate_referral_code()
        RETURNS TEXT AS $$
        BEGIN
            RETURN 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
        END;
        $$ LANGUAGE plpgsql;
      `);
      console.log('✅ Created generate_referral_code function');
    }
    
    console.log('\n2. Checking and fixing referral code trigger...');
    
    // Check if the trigger exists
    const triggerCheck = await client.query(`
      SELECT tgname, tgenabled 
      FROM pg_trigger 
      WHERE tgname = 'trigger_create_user_referral_code'
    `);
    
    if (triggerCheck.rows.length > 0) {
      console.log('✅ trigger_create_user_referral_code exists');
      console.log('   Current trigger status:', triggerCheck.rows[0].tgenabled);
    } else {
      console.log('❌ trigger_create_user_referral_code NOT found, creating it...');
      await client.query(`
        CREATE OR REPLACE FUNCTION create_user_referral_code()
        RETURNS TRIGGER AS $$
        DECLARE
            new_code TEXT;
            code_exists BOOLEAN := true;
            attempts INTEGER := 0;
        BEGIN
            -- Try to generate a unique code (max 5 attempts for better performance)
            WHILE code_exists AND attempts < 5 LOOP
                new_code := generate_referral_code();
                -- Check if code already exists
                SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
                attempts := attempts + 1;
            END LOOP;
            
            -- If we couldn't generate a unique code after 5 attempts, raise an error
            IF code_exists THEN
                RAISE EXCEPTION 'Unable to generate unique referral code after 5 attempts';
            END IF;
            
            -- Insert the new referral code
            INSERT INTO referral_codes (code, user_id, referred_by)
            VALUES (new_code, NEW.id, NEW.referred_by);
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS trigger_create_user_referral_code ON app_users;
        CREATE TRIGGER trigger_create_user_referral_code
            AFTER INSERT ON app_users
            FOR EACH ROW
            EXECUTE FUNCTION create_user_referral_code();
      `);
      console.log('✅ Created trigger_create_user_referral_code');
    }
    
    console.log('\n3. Optimizing referral_codes table structure...');
    
    // Ensure we have proper indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id_perf 
      ON referral_codes (user_id);
      
      CREATE INDEX IF NOT EXISTS idx_referral_codes_code_perf 
      ON referral_codes (code);
    `);
    console.log('✅ Created performance indexes');
    
    console.log('\n4. Testing referral code generation performance...');
    
    // Test the function multiple times to get an average
    let totalTime = 0;
    const testCount = 5;
    
    for (let i = 0; i < testCount; i++) {
      const startTime = Date.now();
      const result = await client.query('SELECT generate_referral_code() as code');
      const endTime = Date.now();
      totalTime += (endTime - startTime);
      console.log(`   Test ${i+1}: ${result.rows[0].code} (${endTime - startTime}ms)`);
    }
    
    console.log(`   Average generation time: ${totalTime / testCount}ms`);
    
    console.log('\n5. Testing referral code lookup performance...');
    
    // Test lookup performance
    const userResult = await client.query('SELECT id FROM app_users LIMIT 1');
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      let lookupTotalTime = 0;
      
      for (let i = 0; i < testCount; i++) {
        const startTime = Date.now();
        await client.query('SELECT code FROM referral_codes WHERE user_id = $1', [userId]);
        const endTime = Date.now();
        lookupTotalTime += (endTime - startTime);
      }
      
      console.log(`   Average lookup time: ${lookupTotalTime / testCount}ms`);
    }
    
    console.log('\n6. Checking for any orphaned referral codes...');
    
    const orphanedCheck = await client.query(`
      SELECT rc.id, rc.code, rc.user_id 
      FROM referral_codes rc
      LEFT JOIN app_users au ON rc.user_id = au.id
      WHERE au.id IS NULL
    `);
    
    if (orphanedCheck.rows.length > 0) {
      console.log(`❌ Found ${orphanedCheck.rows.length} orphaned referral codes, cleaning up...`);
      await client.query(`
        DELETE FROM referral_codes 
        WHERE id IN (
          SELECT rc.id
          FROM referral_codes rc
          LEFT JOIN app_users au ON rc.user_id = au.id
          WHERE au.id IS NULL
        )
      `);
      console.log('✅ Cleaned up orphaned referral codes');
    } else {
      console.log('✅ No orphaned referral codes found');
    }
    
    console.log('\n7. Running VACUUM and ANALYZE for better performance...');
    await client.query('VACUUM ANALYZE referral_codes');
    await client.query('ANALYZE app_users');
    console.log('✅ Database maintenance completed');
    
  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the fix
fixReferralCodeSystem()
  .then(() => {
    console.log('\n=== Referral Code System Fix Complete ===');
    console.log('The referral code system should now be working correctly with improved performance.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });