// Script to find recently cancelled purchases from the database
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function findRecentlyCancelledPurchases() {
  console.log('🔍 Searching for recently cancelled purchases...');
  
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
    // Query for recently cancelled transactions with user information
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
        u.email as user_email,
        u.username as user_name,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'cancelled'
      ORDER BY t.created_at DESC
      LIMIT 20
    `);
    
    if (cancelledTransactions.rows.length === 0) {
      console.log('✅ No cancelled transactions found in the database');
      return;
    }
    
    console.log(`\n📋 Found ${cancelledTransactions.rows.length} recently cancelled purchases:`);
    console.log('====================================================');
    
    cancelledTransactions.rows.forEach((transaction, index) => {
      console.log(`\n${index + 1}. Transaction ID: ${transaction.id}`);
      console.log(`   User: ${transaction.user_name} (${transaction.user_email})`);
      console.log(`   Package: ${transaction.package_name} (${transaction.package_game})`);
      console.log(`   Amount: ${transaction.pi_amount} π (${transaction.usd_amount} USD)`);
      console.log(`   Cancelled At: ${new Date(transaction.updated_at).toLocaleString()}`);
      console.log(`   Payment ID: ${transaction.payment_id}`);
      if (transaction.failure_reason) {
        console.log(`   Reason: ${transaction.failure_reason}`);
      }
      console.log('   ---');
    });
    
    // Summary statistics
    console.log('\n📊 Summary:');
    console.log(`   Total cancelled transactions found: ${cancelledTransactions.rows.length}`);
    
    // Group by package
    const packageStats = {};
    cancelledTransactions.rows.forEach(transaction => {
      const packageKey = `${transaction.package_game} - ${transaction.package_name}`;
      packageStats[packageKey] = (packageStats[packageKey] || 0) + 1;
    });
    
    console.log('\n   By Package:');
    Object.entries(packageStats).forEach(([pkg, count]) => {
      console.log(`   - ${pkg}: ${count} cancellations`);
    });
    
  } catch (error) {
    console.error('❌ Error querying cancelled transactions:', error.message);
    
    // Try a simpler query if the join fails
    try {
      console.log('\n🔄 Trying simpler query without joins...');
      const simpleQuery = await pool.query(`
        SELECT 
          id,
          payment_id,
          status,
          created_at,
          updated_at,
          pi_amount,
          usd_amount,
          failure_reason
        FROM app_transactions 
        WHERE status = 'cancelled'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      if (simpleQuery.rows.length > 0) {
        console.log(`\n📋 Found ${simpleQuery.rows.length} recently cancelled transactions (simple view):`);
        simpleQuery.rows.forEach((transaction, index) => {
          console.log(`\n${index + 1}. ID: ${transaction.id}`);
          console.log(`   Amount: ${transaction.pi_amount} π (${transaction.usd_amount} USD)`);
          console.log(`   Cancelled At: ${new Date(transaction.updated_at).toLocaleString()}`);
          console.log(`   Payment ID: ${transaction.payment_id}`);
          if (transaction.failure_reason) {
            console.log(`   Reason: ${transaction.failure_reason}`);
          }
        });
      } else {
        console.log('✅ No cancelled transactions found with simple query either');
      }
    } catch (simpleError) {
      console.error('❌ Simple query also failed:', simpleError.message);
    }
  } finally {
    await pool.end();
  }
}

findRecentlyCancelledPurchases().catch(console.error);