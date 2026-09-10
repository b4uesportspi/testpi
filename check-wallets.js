import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = process.env.DATABASE_URL || '';

async function checkWallets() {
  const client = new Client({ 
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Get all users with a wallet address set
    const walletUsers = await client.query(
      `SELECT id, username, email, wallet_address, created_at, updated_at
       FROM app_users 
       WHERE wallet_address IS NOT NULL AND wallet_address != ''
       ORDER BY updated_at DESC`
    );

    console.log(`\n=== USERS WITH WALLET ADDRESS: ${walletUsers.rows.length} ===\n`);
    
    // Count unique wallet addresses
    const walletCounts = {};
    for (const row of walletUsers.rows) {
      const addr = row.wallet_address;
      walletCounts[addr] = (walletCounts[addr] || 0) + 1;
    }

    console.log('=== WALLET ADDRESS FREQUENCY ===');
    for (const [addr, count] of Object.entries(walletCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${addr.substring(0, 20)}... => ${count} user(s)${count > 1 ? ' ⚠️ SHARED!' : ''}`);
    }

    // 2. Show each user with their wallet
    console.log('\n=== USER DETAILS ===\n');
    for (const row of walletUsers.rows) {
      console.log(`User: ${row.username} (${row.email})`);
      console.log(`  Wallet: ${row.wallet_address}`);
      console.log(`  Updated: ${row.updated_at}`);
      console.log('');
    }

    // 3. Check today's users who logged in (updated_at is recent)
    const today = new Date().toISOString().split('T')[0];
    const todayUsers = await client.query(
      `SELECT id, username, email, wallet_address, updated_at
       FROM app_users 
       WHERE DATE(updated_at) = $1
       ORDER BY updated_at DESC`,
      [today]
    );
    console.log(`\n=== USERS UPDATED TODAY (${today}): ${todayUsers.rows.length} ===\n`);
    for (const row of todayUsers.rows) {
      console.log(`  ${row.username} (${row.email}) - wallet: ${row.wallet_address || 'NONE'}`);
    }

    // 4. Check transactions completed today
    const todayTxns = await client.query(
      `SELECT t.id, t.payment_id, t.txid, t.status, t.created_at, 
              u.username, u.email, u.wallet_address as user_wallet
       FROM app_transactions t
       JOIN app_users u ON t.user_id = u.id
       WHERE DATE(t.created_at) = $1 AND t.status = 'completed'
       ORDER BY t.created_at DESC`,
      [today]
    );
    console.log(`\n=== COMPLETED TRANSACTIONS TODAY: ${todayTxns.rows.length} ===\n`);
    for (const row of todayTxns.rows) {
      console.log(`  ${row.username} - txid: ${row.txid || 'N/A'} - payment_id: ${row.payment_id}`);
      console.log(`    User wallet in DB: ${row.user_wallet || 'NONE'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkWallets();
