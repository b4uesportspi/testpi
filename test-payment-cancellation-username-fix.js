import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function testPaymentCancellationUsernameFix() {
  console.log('🔍 Testing payment cancellation username fix...');
  
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
    // Get a sample cancelled transaction to test
    console.log('Getting a sample cancelled transaction...');
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
      LIMIT 5
    `);
    
    if (cancelledTransactions.rows.length === 0) {
      console.log('✅ No cancelled transactions found in the database');
      return;
    }
    
    console.log(`\n📊 Found ${cancelledTransactions.rows.length} cancelled transactions:`);
    
    // Check for username issues
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
    
    console.log('\n📋 Summary:');
    console.log('----------------------------------------');
    console.log(`Total cancelled transactions: ${cancelledTransactions.rows.length}`);
    console.log(`Transactions with valid username: ${validUsernameCount}`);
    console.log(`Transactions missing username: ${missingUsernameCount}`);
    
    if (missingUsernameCount === 0) {
      console.log('\n✅ SUCCESS: All cancelled transactions have usernames!');
    } else {
      console.log(`\n⚠️  WARNING: ${missingUsernameCount} transactions are missing usernames`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testPaymentCancellationUsernameFix().catch(console.error);