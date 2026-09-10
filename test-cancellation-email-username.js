import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function testCancellationEmailUsername() {
  console.log('🔍 Testing cancellation email username handling...');
  
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
    // Get a sample cancelled transaction with email sent
    console.log('Getting a sample cancelled transaction with email sent...');
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
      WHERE t.status = 'cancelled' AND t.email_sent = true
      ORDER BY t.created_at DESC
      LIMIT 3
    `);
    
    if (cancelledTransactions.rows.length === 0) {
      console.log('✅ No cancelled transactions with emails sent found in the database');
      return;
    }
    
    console.log(`\n📊 Found ${cancelledTransactions.rows.length} cancelled transactions with emails sent:`);
    
    // Check for username in email sent transactions
    let missingUsernameInEmailCount = 0;
    let validUsernameInEmailCount = 0;
    
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
        console.log(`   ❌ WARNING: User has no username but email was sent!`);
        missingUsernameInEmailCount++;
      } else {
        console.log(`   ✅ Username present in email sent transaction: ${transaction.user_username}`);
        validUsernameInEmailCount++;
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('----------------------------------------');
    console.log(`Total cancelled transactions with emails sent: ${cancelledTransactions.rows.length}`);
    console.log(`Transactions with valid username: ${validUsernameInEmailCount}`);
    console.log(`Transactions missing username: ${missingUsernameInEmailCount}`);
    
    if (missingUsernameInEmailCount === 0) {
      console.log('\n✅ SUCCESS: All cancelled transactions with emails sent have usernames!');
    } else {
      console.log(`\n⚠️  WARNING: ${missingUsernameInEmailCount} transactions with emails sent are missing usernames`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testCancellationEmailUsername().catch(console.error);