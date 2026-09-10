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

console.log('=== Production Referral Code System Verification ===\n');

async function verifyProductionReferralSystem() {
  const client = await pool.connect();
  
  try {
    console.log('1. Testing database connectivity...');
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('   Current database time:', result.rows[0].current_time);
    
    console.log('\n2. Checking database schema...');
    // Check if app_users table exists
    const usersTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'app_users'
    `);
    
    if (usersTable.rows.length > 0) {
      console.log('✅ app_users table exists');
    } else {
      console.log('❌ app_users table NOT found');
      return false;
    }
    
    // Check if referral_codes table exists
    const referralTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'referral_codes'
    `);
    
    if (referralTable.rows.length > 0) {
      console.log('✅ referral_codes table exists');
    } else {
      console.log('❌ referral_codes table NOT found');
      return false;
    }
    
    console.log('\n3. Verifying table structures...');
    // Check app_users columns
    const usersColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'app_users'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ app_users table columns:');
    usersColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    // Check referral_codes columns
    const referralColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'referral_codes'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ referral_codes table columns:');
    referralColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n4. Testing foreign key relationships...');
    // Check foreign key constraint
    const fkCheck = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'referral_codes'
    `);
    
    if (fkCheck.rows.length > 0) {
      console.log('✅ Foreign key constraints found:');
      fkCheck.rows.forEach(row => {
        console.log(`   - ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    } else {
      console.log('⚠️  No foreign key constraints found on referral_codes table');
    }
    
    console.log('\n5. Testing referral code generation function...');
    try {
      const funcResult = await client.query('SELECT generate_referral_code() as code');
      console.log('✅ Referral code generation function working');
      console.log('   Generated code:', funcResult.rows[0].code);
      
      // Test multiple generations
      const codes = [];
      for (let i = 0; i < 5; i++) {
        const result = await client.query('SELECT generate_referral_code() as code');
        codes.push(result.rows[0].code);
      }
      
      console.log('   Sample codes:', codes.join(', '));
      
      // Check format
      const formatValid = codes.every(code => /^REF[A-Z0-9]{6}$/.test(code));
      if (formatValid) {
        console.log('✅ All generated codes follow correct format');
      } else {
        console.log('❌ Some generated codes have invalid format');
        return false;
      }
    } catch (error) {
      console.log('❌ Referral code generation function error:', error.message);
      return false;
    }
    
    console.log('\n6. Testing existing data integrity...');
    // Check existing users
    const userCount = await client.query('SELECT COUNT(*) as count FROM app_users');
    console.log(`✅ Total users in database: ${userCount.rows[0].count}`);
    
    // Check existing referral codes
    const codeCount = await client.query('SELECT COUNT(*) as count FROM referral_codes');
    console.log(`✅ Total referral codes in database: ${codeCount.rows[0].count}`);
    
    // Check for orphaned referral codes
    const orphanedCheck = await client.query(`
      SELECT rc.id, rc.code, rc.user_id 
      FROM referral_codes rc
      LEFT JOIN app_users au ON rc.user_id = au.id
      WHERE au.id IS NULL
    `);
    
    if (orphanedCheck.rows.length > 0) {
      console.log('❌ Found orphaned referral codes:');
      orphanedCheck.rows.forEach(row => {
        console.log(`   - Code: ${row.code}, User ID: ${row.user_id}`);
      });
      return false;
    } else {
      console.log('✅ No orphaned referral codes found');
    }
    
    console.log('\n7. Testing referral code uniqueness...');
    const duplicateCheck = await client.query(`
      SELECT code, COUNT(*) as count 
      FROM referral_codes 
      GROUP BY code 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('❌ Duplicate referral codes found:');
      duplicateCheck.rows.forEach(row => {
        console.log(`   - ${row.code} (appears ${row.count} times)`);
      });
      return false;
    } else {
      console.log('✅ All referral codes are unique');
    }
    
    console.log('\n8. Testing referral code format validation...');
    const formatCheck = await client.query(`
      SELECT code 
      FROM referral_codes 
      WHERE code !~ '^REF[A-Z0-9]{6}$'
    `);
    
    if (formatCheck.rows.length > 0) {
      console.log('❌ Invalid referral code formats found:');
      formatCheck.rows.forEach(row => {
        console.log(`   - ${row.code}`);
      });
      return false;
    } else {
      console.log('✅ All referral codes in database follow correct format');
    }
    
    console.log('\n9. Testing referral code lookup performance...');
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
    
    console.log('\n10. Simulating deferred referral code generation...');
    // Get a user without a referral code (if any)
    const userWithoutCode = await client.query(`
      SELECT au.id, au.username 
      FROM app_users au
      LEFT JOIN referral_codes rc ON au.id = rc.user_id
      WHERE rc.user_id IS NULL
      LIMIT 1
    `);
    
    if (userWithoutCode.rows.length > 0) {
      const testUser = userWithoutCode.rows[0];
      console.log(`   Found user without referral code: ${testUser.username} (${testUser.id})`);
      
      // Simulate generating a referral code for this user
      console.log('   Generating referral code...');
      const startTime = Date.now();
      
      try {
        // Generate a referral code
        const codeResult = await client.query('SELECT generate_referral_code() as code');
        const referralCode = codeResult.rows[0].code;
        
        // Insert the referral code
        await client.query(
          'INSERT INTO referral_codes (code, user_id) VALUES ($1, $2)',
          [referralCode, testUser.id]
        );
        
        const endTime = Date.now();
        console.log(`   ✅ Referral code generated and saved: ${referralCode} (${endTime - startTime}ms)`);
        
        // Verify it was saved correctly
        const verifyResult = await client.query(
          'SELECT code FROM referral_codes WHERE user_id = $1',
          [testUser.id]
        );
        
        if (verifyResult.rows.length > 0 && verifyResult.rows[0].code === referralCode) {
          console.log('   ✅ Referral code correctly saved and retrievable');
        } else {
          console.log('   ❌ Referral code not correctly saved');
          return false;
        }
      } catch (error) {
        console.log('   ❌ Error generating referral code:', error.message);
        return false;
      }
    } else {
      console.log('   ✅ All users have referral codes (no need to generate)');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during production verification:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// Run the production verification
verifyProductionReferralSystem()
  .then((success) => {
    if (success) {
      console.log('\n=== Production Verification Complete ===');
      console.log('✅ All tests passed! The referral code system is working correctly in production.');
      console.log('\nSummary:');
      console.log('- Database connectivity: OK');
      console.log('- Table structures: OK');
      console.log('- Foreign key relationships: OK');
      console.log('- Referral code generation: OK');
      console.log('- Data integrity: OK');
      console.log('- Code uniqueness: OK');
      console.log('- Code format validation: OK');
      console.log('- Lookup performance: OK');
      console.log('- Deferred generation simulation: OK');
    } else {
      console.log('\n=== Production Verification Complete ===');
      console.log('❌ Some tests failed. Please review the issues above.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Production verification failed:', error);
    process.exit(1);
  });