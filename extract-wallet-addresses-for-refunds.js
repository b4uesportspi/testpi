import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function extractWalletAddressesForRefunds() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔍 Extracting wallet addresses for users with completed purchases...\n');

    // Query to get all unique users who have completed transactions with their wallet addresses
    const result = await pool.query(`
      SELECT DISTINCT ON (u.id)
        u.id as user_id,
        u.username,
        u.email,
        u.wallet_address,
        u.phone,
        COUNT(t.id) as total_purchases,
        SUM(t.pi_amount) as total_pi_spent,
        SUM(t.usd_amount) as total_usd_spent,
        MAX(t.created_at) as last_purchase_date
      FROM app_users u
      INNER JOIN app_transactions t ON u.id = t.user_id
      WHERE t.status = 'completed'
        AND u.wallet_address IS NOT NULL
        AND u.wallet_address != ''
      GROUP BY u.id, u.username, u.email, u.wallet_address, u.phone
      ORDER BY u.id, last_purchase_date DESC
    `);

    if (result.rows.length === 0) {
      console.log('✅ No users with completed purchases and wallet addresses found.');
      return;
    }

    console.log(`📊 Found ${result.rows.length} users with completed purchases and wallet addresses:\n`);
    console.log('='.repeat(100));

    // Prepare data for export
    const exportData = [];

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.username}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Wallet Address: ${user.wallet_address}`);
      console.log(`   Total Purchases: ${user.total_purchases}`);
      console.log(`   Total PI Spent: ${user.total_pi_spent} PI`);
      console.log(`   Total USD Spent: $${user.total_usd_spent}`);
      console.log(`   Last Purchase: ${user.last_purchase_date}`);
      console.log('');

      // Add to export data
      exportData.push({
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        wallet_address: user.wallet_address,
        total_purchases: parseInt(user.total_purchases),
        total_pi_spent: parseFloat(user.total_pi_spent),
        total_usd_spent: parseFloat(user.total_usd_spent),
        last_purchase_date: user.last_purchase_date
      });
    });

    // Export to CSV
    const csvHeaders = ['User ID', 'Username', 'Email', 'Phone', 'Wallet Address', 'Total Purchases', 'Total PI Spent', 'Total USD Spent', 'Last Purchase Date'];
    const csvRows = [csvHeaders.join(',')];

    exportData.forEach(user => {
      const row = [
        user.user_id,
        `"${user.username}"`,
        `"${user.email || ''}"`,
        `"${user.phone || ''}"`,
        user.wallet_address,
        user.total_purchases,
        user.total_pi_spent,
        user.total_usd_spent,
        `"${user.last_purchase_date}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const fileName = `wallet_addresses_for_refunds_${new Date().toISOString().split('T')[0]}.csv`;
    
    fs.writeFileSync(fileName, csvContent);
    console.log('='.repeat(100));
    console.log(`\n✅ Exported ${exportData.length} wallet addresses to: ${fileName}`);
    console.log('\n📋 Summary:');
    console.log(`   Total users eligible for refund: ${exportData.length}`);
    
    const totalPI = exportData.reduce((sum, user) => sum + user.total_pi_spent, 0);
    const totalUSD = exportData.reduce((sum, user) => sum + user.total_usd_spent, 0);
    console.log(`   Total PI to refund: ${totalPI.toFixed(6)} PI`);
    console.log(`   Total USD equivalent: $${totalUSD.toFixed(2)}`);

    // Also export as JSON for programmatic access
    const jsonContent = JSON.stringify(exportData, null, 2);
    const jsonFileName = `wallet_addresses_for_refunds_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(jsonFileName, jsonContent);
    console.log(`\n✅ Also exported as JSON: ${jsonFileName}`);

    // Print wallet addresses only (for easy copying)
    console.log('\n' + '='.repeat(100));
    console.log('📝 Wallet Addresses Only (for refund processing):');
    console.log('='.repeat(100));
    exportData.forEach((user, index) => {
      console.log(`${index + 1}. ${user.wallet_address} (${user.username} - ${user.total_pi_spent} PI)`);
    });

  } catch (error) {
    console.error('❌ Error extracting wallet addresses:', error);
  } finally {
    await pool.end();
  }
}

extractWalletAddressesForRefunds();
