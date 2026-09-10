/**
 * Backfill Email Script
 * 
 * Sends purchase confirmation emails for all past transactions
 * that were completed but didn't receive emails.
 * 
 * Usage: node backfill-emails.cjs
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

async function backfillEmails() {
  console.log('🚀 Starting email backfill process...\n');
  
  try {
    // Get all completed transactions where email was NOT sent
    const transactions = await pool.query(`
      SELECT 
        t.id,
        t.user_id,
        t.package_id,
        t.pi_amount,
        t.usd_amount,
        t.game_account,
        t.payment_id,
        t.txid,
        t.created_at,
        u.email as user_email,
        u.username as user_username,
        u.game_accounts as user_game_accounts,
        u.social_accounts as user_social_accounts,
        p.name as package_name,
        p.game as package_game,
        p.in_game_amount as package_in_game_amount
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'completed'
        AND (t.email_sent = false OR t.email_sent IS NULL)
        AND u.email IS NOT NULL
      ORDER BY t.created_at DESC
    `);
    
    console.log(`📊 Found ${transactions.rows.length} transactions without emails\n`);
    
    if (transactions.rows.length === 0) {
      console.log('✅ All transactions have been sent emails already!');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each transaction
    for (let i = 0; i < transactions.rows.length; i++) {
      const tx = transactions.rows[i];
      
      console.log(`[${i + 1}/${transactions.rows.length}] Processing transaction: ${tx.id}`);
      console.log(`  User: ${tx.user_username} (${tx.user_email})`);
      console.log(`  Package: ${tx.package_name} (${tx.package_game})`);
      console.log(`  Amount: ${tx.pi_amount} Pi ($${tx.usd_amount})`);
      
      try {
        // Import the email service dynamically
        const { sendPurchaseConfirmationEmail } = await import('./server/services/email.js');
        
        // Convert gameAccount to string if it's an object
        const gameAccountString = typeof tx.game_account === 'string' 
          ? tx.game_account 
          : JSON.stringify(tx.game_account);
        
        // Send email
        const result = await sendPurchaseConfirmationEmail({
          to: tx.user_email,
          username: tx.user_username,
          packageName: tx.package_name,
          piAmount: tx.pi_amount,
          usdAmount: tx.usd_amount,
          gameAccount: gameAccountString,
          transactionId: tx.id,
          paymentId: tx.payment_id,
          isTestnet: false,
          game: tx.package_game,
          gameAccounts: tx.user_game_accounts,
          socialAccounts: tx.user_social_accounts
        });
        
        if (result) {
          // Mark email as sent in database
          await pool.query(
            'UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1',
            [tx.id]
          );
          
          console.log(`  ✅ Email sent successfully\n`);
          successCount++;
        } else {
          console.log(`  ❌ Email sending failed\n`);
          failCount++;
        }
        
        // Add delay to avoid rate limiting (100ms between emails)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        failCount++;
      }
    }
    
    console.log('\n========================================');
    console.log('📧 BACKFILL SUMMARY');
    console.log('========================================');
    console.log(`Total Transactions: ${transactions.rows.length}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('👋 Database connection closed');
  }
}

// Run the backfill
backfillEmails().catch(console.error);
