import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
console.log('📦 Loaded environment from .env');

import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = process.env.DATABASE_URL || '';
const ADMIN_WALLET = (process.env.OWNER_PI_WALLET_ADDRESS || 'GBGHA73VUPUEJBH76RDMJVWGJNZNRVGJLFLFUV2OO6DPIRFO5DS2NOER').trim();
const HORIZON_API = 'https://api.mainnet.minepi.com';

if (!CONNECTION_STRING) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

// Small delay between API requests to avoid rate limiting
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function fetchWalletFromStellar(txid) {
  try {
    const response = await fetch(`${HORIZON_API}/transactions/${txid}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) {
      console.warn(`  ⚠️ Stellar Horizon returned ${response.status} for txid ${txid}`);
      return null;
    }
    const data = await response.json();
    // source_account is the wallet that SENT the Pi (the user)
    if (data.source_account) {
      return data.source_account;
    }
    // Fallback: check operations
    if (data._embedded?.records) {
      for (const op of data._embedded.records) {
        if (op.source_account && op.type === 'payment') {
          return op.source_account;
        }
      }
    }
    return null;
  } catch (err) {
    console.error(`  ❌ Stellar API error for txid ${txid}:`, err.message);
    return null;
  }
}

async function fixWalletAddresses() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');
    console.log(`\n🔍 Looking for users with admin wallet: ${ADMIN_WALLET.substring(0, 12)}...\n`);

    // 1. Find all users who have the admin/app wallet address
    const affectedUsersResult = await client.query(
      `SELECT id, username, email, pi_uid, wallet_address 
       FROM app_users 
       WHERE wallet_address = $1
       ORDER BY created_at DESC`,
      [ADMIN_WALLET]
    );

    const affectedUsers = affectedUsersResult.rows;
    console.log(`📊 Found ${affectedUsers.length} users with admin wallet address\n`);

    if (affectedUsers.length === 0) {
      console.log('✅ No users affected. Nothing to fix.');
      return;
    }

    // Print affected users
    console.log('Affected users:');
    for (const u of affectedUsers) {
      console.log(`  - ${u.username || 'unknown'} (${u.email || 'no email'}) - ID: ${u.id}`);
    }
    console.log('');

    // 2. For each affected user, try to find their real wallet from their transactions
    let fixedCount = 0;
    let resetToNullCount = 0;
    let failedCount = 0;

    for (const user of affectedUsers) {
      console.log(`\n🔄 Processing user: ${user.username || user.id}...`);

      // Get their completed transactions with txid
      const txResult = await client.query(
        `SELECT id, txid, payment_id, pi_amount, created_at 
         FROM app_transactions 
         WHERE user_id = $1 AND status = 'completed' AND txid IS NOT NULL AND txid != ''
         ORDER BY created_at DESC`,
        [user.id]
      );

      const transactions = txResult.rows;

      if (transactions.length === 0) {
        console.log(`  ⚠️ No completed transactions with txid found. Resetting wallet to NULL.`);
        await client.query(
          'UPDATE app_users SET wallet_address = NULL, updated_at = NOW() WHERE id = $1',
          [user.id]
        );
        resetToNullCount++;
        continue;
      }

      // Try each transaction until we find a valid wallet
      let realWallet = null;
      for (const tx of transactions) {
        if (!tx.txid || tx.txid.length < 10) continue;

        console.log(`  🔍 Trying txid: ${tx.txid.substring(0, 16)}...`);
        realWallet = await fetchWalletFromStellar(tx.txid);

        if (realWallet && realWallet !== ADMIN_WALLET) {
          console.log(`  ✅ Found real wallet: ${realWallet.substring(0, 16)}...`);
          break;
        } else if (realWallet === ADMIN_WALLET) {
          console.log(`  ⚠️ Stellar returned admin wallet for this txid, trying next...`);
          realWallet = null;
        }

        await sleep(500); // Rate limit
      }

      if (realWallet && realWallet !== ADMIN_WALLET) {
        // Update to the correct wallet
        await client.query(
          'UPDATE app_users SET wallet_address = $1, updated_at = NOW() WHERE id = $2',
          [realWallet, user.id]
        );
        console.log(`  ✅ Updated wallet to: ${realWallet.substring(0, 16)}...`);
        fixedCount++;
      } else {
        // Could not find real wallet - reset to NULL
        console.log(`  ⚠️ Could not determine real wallet. Resetting to NULL.`);
        await client.query(
          'UPDATE app_users SET wallet_address = NULL, updated_at = NOW() WHERE id = $1',
          [user.id]
        );
        resetToNullCount++;
      }

      await sleep(300); // Rate limit between users
    }

    // 3. Summary
    console.log('\n========================================');
    console.log('📊 SUMMARY:');
    console.log(`   Total affected users:    ${affectedUsers.length}`);
    console.log(`   Fixed with real wallet: ${fixedCount}`);
    console.log(`   Reset to NULL:           ${resetToNullCount}`);
    console.log(`   Failed:                  ${failedCount}`);
    console.log('========================================');

    // 4. Also check for any OTHER users who might have wrong wallet (not just admin wallet)
    console.log('\n🔍 Checking for duplicate wallet addresses across all users...');
    const dupResult = await client.query(
      `SELECT wallet_address, COUNT(*) as cnt 
       FROM app_users 
       WHERE wallet_address IS NOT NULL AND wallet_address != ''
       GROUP BY wallet_address 
       HAVING COUNT(*) > 1
       ORDER BY cnt DESC`
    );

    if (dupResult.rows.length > 0) {
      console.log('⚠️ Duplicate wallet addresses found:');
      for (const row of dupResult.rows) {
        console.log(`  - ${row.wallet_address.substring(0, 16)}... used by ${row.cnt} users`);
      }
    } else {
      console.log('✅ No duplicate wallet addresses found.');
    }

    // 5. Show current state of all wallet addresses
    console.log('\n📊 Current wallet address distribution:');
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(wallet_address) as with_wallet,
        COUNT(*) - COUNT(wallet_address) as without_wallet
       FROM app_users`
    );
    const stats = statsResult.rows[0];
    console.log(`   Total users: ${stats.total_users}`);
    console.log(`   With wallet: ${stats.with_wallet}`);
    console.log(`   Without wallet: ${stats.without_wallet}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

fixWalletAddresses().catch(console.error);
