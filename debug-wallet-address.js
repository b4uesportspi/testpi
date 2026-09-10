import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function debugWalletAddress() {
  console.log('Debugging wallet address issue...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 15000,
    statement_timeout: 15000,
    idleTimeoutMillis: 30000,
    max: 3,
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });
  
  try {
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!');
    
    // Check if wallet_address column exists
    console.log('\\nChecking if wallet_address column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'app_users' AND column_name = 'wallet_address'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ wallet_address column exists:', columnCheck.rows[0]);
    } else {
      console.log('❌ wallet_address column does not exist');
      return;
    }
    
    // Check for users with wallet addresses
    console.log('\\nChecking for users with wallet addresses...');
    const usersWithWallet = await pool.query(`
      SELECT id, username, wallet_address, created_at, updated_at
      FROM app_users 
      WHERE wallet_address IS NOT NULL 
      LIMIT 5
    `);
    
    console.log(`Found ${usersWithWallet.rows.length} users with wallet addresses:`);
    usersWithWallet.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} - ${user.wallet_address}`);
    });
    
    // Check for completed transactions
    console.log('\\nChecking for completed transactions...');
    const completedTransactions = await pool.query(`
      SELECT t.id, t.payment_id, t.status, t.txid, t.created_at,
             u.username, u.wallet_address as user_wallet
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      WHERE t.status = 'completed'
      ORDER BY t.created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${completedTransactions.rows.length} completed transactions:`);
    completedTransactions.rows.forEach((tx, index) => {
      console.log(`  ${index + 1}. Payment: ${tx.payment_id}`);
      console.log(`     User: ${tx.username}`);
      console.log(`     TXID: ${tx.txid}`);
      console.log(`     User Wallet: ${tx.user_wallet}`);
      console.log(`     Created: ${tx.created_at}`);
      console.log('');
    });
    
    // Check for transactions with txid but no user wallet
    console.log('\\nChecking for completed transactions with txid but no user wallet...');
    const transactionsWithoutUserWallet = await pool.query(`
      SELECT t.id, t.payment_id, t.txid, t.created_at,
             u.username, u.wallet_address as user_wallet, u.id as user_id
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      WHERE t.status = 'completed' 
      AND t.txid IS NOT NULL
      AND (u.wallet_address IS NULL OR u.wallet_address = '')
      ORDER BY t.created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${transactionsWithoutUserWallet.rows.length} transactions where user wallet is missing:`);
    transactionsWithoutUserWallet.rows.forEach((tx, index) => {
      console.log(`  ${index + 1}. Payment: ${tx.payment_id}`);
      console.log(`     User: ${tx.username} (${tx.user_id})`);
      console.log(`     TXID: ${tx.txid}`);
      console.log(`     User Wallet: ${tx.user_wallet || 'NULL'}`);
      console.log(`     Created: ${tx.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the debug
debugWalletAddress();