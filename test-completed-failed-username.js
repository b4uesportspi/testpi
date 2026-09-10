import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function testCompletedFailedUsername() {
  console.log('🔍 Testing completed and failed transaction username handling...');
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Test 1: Check completed transactions
    console.log('\n=== COMPLETED TRANSACTIONS ===');
    const completedTransactions = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.pi_amount,
        t.usd_amount,
        t.email_sent,
        u.email as user_email,
        u.username as user_username,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'completed'
      ORDER BY t.created_at DESC
      LIMIT 3
    `);
    
    if (completedTransactions.rows.length === 0) {
      console.log('✅ No completed transactions found in the database');
    } else {
      console.log(`\n📊 Found ${completedTransactions.rows.length} completed transactions:`);
      
      let missingUsernameCount = 0;
      let validUsernameCount = 0;
      
      for (const transaction of completedTransactions.rows) {
        console.log(`\n💳 Transaction ID: ${transaction.id}`);
        console.log(`   Payment ID: ${transaction.payment_id}`);
        console.log(`   Status: ${transaction.status}`);
        console.log(`   Email Sent: ${transaction.email_sent ? '✅ YES' : '❌ NO'}`);
        console.log(`   Created: ${transaction.created_at}`);
        console.log(`   Updated: ${transaction.updated_at}`);
        console.log(`   User: ${transaction.user_username || 'N/A'} (${transaction.user_email || 'N/A'})`);
        console.log(`   Package: ${transaction.package_name} (${transaction.package_game})`);
        
        if (!transaction.user_username) {
          console.log(`   ❌ WARNING: User has no username!`);
          missingUsernameCount++;
        } else {
          console.log(`   ✅ Username present: ${transaction.user_username}`);
          validUsernameCount++;
        }
      }
      
      console.log(`\n📋 Completed transactions summary:`);
      console.log(`   Total: ${completedTransactions.rows.length}`);
      console.log(`   With username: ${validUsernameCount}`);
      console.log(`   Missing username: ${missingUsernameCount}`);
    }
    
    // Test 2: Check failed transactions
    console.log('\n=== FAILED TRANSACTIONS ===');
    const failedTransactions = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.pi_amount,
        t.usd_amount,
        t.failure_reason,
        t.email_sent,
        u.email as user_email,
        u.username as user_username,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'failed'
      ORDER BY t.created_at DESC
      LIMIT 3
    `);
    
    if (failedTransactions.rows.length === 0) {
      console.log('✅ No failed transactions found in the database');
    } else {
      console.log(`\n📊 Found ${failedTransactions.rows.length} failed transactions:`);
      
      let missingUsernameCount = 0;
      let validUsernameCount = 0;
      
      for (const transaction of failedTransactions.rows) {
        console.log(`\n💳 Transaction ID: ${transaction.id}`);
        console.log(`   Payment ID: ${transaction.payment_id}`);
        console.log(`   Status: ${transaction.status}`);
        console.log(`   Failure Reason: ${transaction.failure_reason || 'N/A'}`);
        console.log(`   Email Sent: ${transaction.email_sent ? '✅ YES' : '❌ NO'}`);
        console.log(`   Created: ${transaction.created_at}`);
        console.log(`   Updated: ${transaction.updated_at}`);
        console.log(`   User: ${transaction.user_username || 'N/A'} (${transaction.user_email || 'N/A'})`);
        console.log(`   Package: ${transaction.package_name} (${transaction.package_game})`);
        
        if (!transaction.user_username) {
          console.log(`   ❌ WARNING: User has no username!`);
          missingUsernameCount++;
        } else {
          console.log(`   ✅ Username present: ${transaction.user_username}`);
          validUsernameCount++;
        }
      }
      
      console.log(`\n📋 Failed transactions summary:`);
      console.log(`   Total: ${failedTransactions.rows.length}`);
      console.log(`   With username: ${validUsernameCount}`);
      console.log(`   Missing username: ${missingUsernameCount}`);
    }
    
    // Test 3: Check cancelled transactions (to confirm our fix)
    console.log('\n=== CANCELLED TRANSACTIONS ===');
    const cancelledTransactions = await pool.query(`
      SELECT 
        t.id,
        t.payment_id,
        t.status,
        t.created_at,
        t.updated_at,
        t.pi_amount,
        t.usd_amount,
        t.failure_reason,
        t.email_sent,
        u.email as user_email,
        u.username as user_username,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'cancelled'
      ORDER BY t.created_at DESC
      LIMIT 3
    `);
    
    if (cancelledTransactions.rows.length === 0) {
      console.log('✅ No cancelled transactions found in the database');
    } else {
      console.log(`\n📊 Found ${cancelledTransactions.rows.length} cancelled transactions:`);
      
      let missingUsernameCount = 0;
      let validUsernameCount = 0;
      
      for (const transaction of cancelledTransactions.rows) {
        console.log(`\n💳 Transaction ID: ${transaction.id}`);
        console.log(`   Payment ID: ${transaction.payment_id}`);
        console.log(`   Status: ${transaction.status}`);
        console.log(`   Failure Reason: ${transaction.failure_reason || 'N/A'}`);
        console.log(`   Email Sent: ${transaction.email_sent ? '✅ YES' : '❌ NO'}`);
        console.log(`   Created: ${transaction.created_at}`);
        console.log(`   Updated: ${transaction.updated_at}`);
        console.log(`   User: ${transaction.user_username || 'N/A'} (${transaction.user_email || 'N/A'})`);
        console.log(`   Package: ${transaction.package_name} (${transaction.package_game})`);
        
        if (!transaction.user_username) {
          console.log(`   ❌ WARNING: User has no username!`);
          missingUsernameCount++;
        } else {
          console.log(`   ✅ Username present: ${transaction.user_username}`);
          validUsernameCount++;
        }
      }
      
      console.log(`\n📋 Cancelled transactions summary:`);
      console.log(`   Total: ${cancelledTransactions.rows.length}`);
      console.log(`   With username: ${validUsernameCount}`);
      console.log(`   Missing username: ${missingUsernameCount}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testCompletedFailedUsername().catch(console.error);