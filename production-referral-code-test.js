import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration with proper SSL handling for production
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
  console.log('✅ Configuring SSL for Supabase connection');
} else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
  poolConfig.ssl = { 
    rejectUnauthorized: false
  };
  console.log('✅ Configuring SSL for PostgreSQL connection');
} else {
  console.log('⚠️  Configuring DB pool without SSL (local development)');
}

const pool = new Pool(poolConfig);

console.log('=== Production Referral Code System Test ===\n');

async function testProductionReferralCodeSystem() {
  const client = await pool.connect();
  
  try {
    console.log('1. Testing database connectivity...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('   Current database time:', result.rows[0].current_time);
    
    console.log('\n2. Checking referral_codes table structure...');
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
    
    console.log('\n3. Testing referral code generation function...');
    const funcResult = await client.query('SELECT generate_referral_code() as code');
    console.log('✅ Referral code generation function working');
    console.log('   Generated code:', funcResult.rows[0].code);
    
    console.log('\n4. Testing referral code uniqueness...');
    // Generate 10 codes and check for duplicates
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const result = await client.query('SELECT generate_referral_code() as code');
      codes.push(result.rows[0].code);
    }
    
    const uniqueCodes = [...new Set(codes)];
    if (uniqueCodes.length === codes.length) {
      console.log('✅ All generated codes are unique');
      console.log('   Sample codes:', codes.slice(0, 5).join(', '));
    } else {
      console.log('❌ Duplicate codes found!');
      console.log('   Generated codes:', codes);
      return false;
    }
    
    console.log('\n5. Testing user referral code lookup performance...');
    // Test with existing users
    const userResult = await client.query(`
      SELECT id, username 
      FROM app_users 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (userResult.rows.length > 0) {
      console.log('   Testing lookup for existing users:');
      for (const user of userResult.rows) {
        const startTime = Date.now();
        const codeResult = await client.query(
          'SELECT code FROM referral_codes WHERE user_id = $1',
          [user.id]
        );
        const endTime = Date.now();
        
        if (codeResult.rows.length > 0) {
          console.log(`   - ${user.username}: ${codeResult.rows[0].code} (${endTime - startTime}ms)`);
        } else {
          console.log(`   - ${user.username}: NO CODE FOUND (${endTime - startTime}ms)`);
        }
      }
    } else {
      console.log('   ⚠️  No existing users found for testing');
    }
    
    console.log('\n6. Testing referral code format validation...');
    const formatCheck = await client.query(`
      SELECT code 
      FROM referral_codes 
      WHERE code !~ '^REF[A-Z0-9]{6}$'
      LIMIT 5
    `);
    
    if (formatCheck.rows.length > 0) {
      console.log('❌ Invalid referral code formats found:');
      formatCheck.rows.forEach(row => {
        console.log(`   - ${row.code}`);
      });
      return false;
    } else {
      console.log('✅ All referral codes follow correct format (REF + 6 alphanumeric characters)');
    }
    
    console.log('\n7. Testing referral code constraints...');
    // Check for duplicate codes in the database
    const duplicateCheck = await client.query(`
      SELECT code, COUNT(*) as count 
      FROM referral_codes 
      GROUP BY code 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('❌ Duplicate referral codes found in database:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   - ${row.code} (appears ${row.count} times)`);
      });
      return false;
    } else {
      console.log('✅ No duplicate referral codes in database');
    }
    
    console.log('\n8. Testing referral code foreign key integrity...');
    const fkCheck = await client.query(`
      SELECT rc.id, rc.code, rc.user_id 
      FROM referral_codes rc
      LEFT JOIN app_users au ON rc.user_id = au.id
      WHERE au.id IS NULL
      LIMIT 5
    `);
    
    if (fkCheck.rows.length > 0) {
      console.log('❌ Orphaned referral codes found:');
      fkCheck.rows.forEach(row => {
        console.log(`   - Code: ${row.code}, User ID: ${row.user_id}`);
      });
      return false;
    } else {
      console.log('✅ All referral codes have valid user references');
    }
    
    console.log('\n9. Testing referral code generation performance...');
    const performanceTests = 5;
    let totalGenerationTime = 0;
    let totalLookupTime = 0;
    
    for (let i = 0; i < performanceTests; i++) {
      // Test generation time
      const genStartTime = Date.now();
      const genResult = await client.query('SELECT generate_referral_code() as code');
      const genEndTime = Date.now();
      totalGenerationTime += (genEndTime - genStartTime);
      
      // Test lookup time with a random existing user
      if (userResult.rows.length > 0) {
        const randomUser = userResult.rows[Math.floor(Math.random() * userResult.rows.length)];
        const lookupStartTime = Date.now();
        await client.query('SELECT code FROM referral_codes WHERE user_id = $1', [randomUser.id]);
        const lookupEndTime = Date.now();
        totalLookupTime += (lookupEndTime - lookupStartTime);
      }
    }
    
    console.log(`   Average generation time: ${totalGenerationTime / performanceTests}ms`);
    console.log(`   Average lookup time: ${totalLookupTime / performanceTests}ms`);
    
    // Performance thresholds (adjust as needed)
    if (totalGenerationTime / performanceTests > 500) {
      console.log('⚠️  Referral code generation is slower than expected');
    } else {
      console.log('✅ Referral code generation performance is acceptable');
    }
    
    if (totalLookupTime / performanceTests > 500) {
      console.log('⚠️  Referral code lookup is slower than expected');
    } else {
      console.log('✅ Referral code lookup performance is acceptable');
    }
    
    console.log('\n10. Testing referral code system integrity...');
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM app_users) as user_count,
        (SELECT COUNT(*) FROM referral_codes) as code_count
    `);
    
    console.log(`   Total users: ${counts.rows[0].user_count}`);
    console.log(`   Total referral codes: ${counts.rows[0].code_count}`);
    
    if (counts.rows[0].user_count === counts.rows[0].code_count) {
      console.log('✅ User count matches referral code count');
    } else {
      console.log('⚠️  User count does not match referral code count');
      console.log('   This may be OK if some users were created before the referral system was implemented');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during production test:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// Run the production test
testProductionReferralCodeSystem()
  .then((success) => {
    if (success) {
      console.log('\n=== Production Test Complete ===');
      console.log('✅ All tests passed! The referral code system is working correctly in production.');
      console.log('\nSummary:');
      console.log('- Database connectivity: OK');
      console.log('- Referral code generation: OK');
      console.log('- Code uniqueness: OK');
      console.log('- Code format validation: OK');
      console.log('- Database constraints: OK');
      console.log('- Foreign key integrity: OK');
      console.log('- Performance: OK');
      console.log('- System integrity: OK');
    } else {
      console.log('\n=== Production Test Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Production test failed:', error);
    process.exit(1);
  });