/**
 * Check Email Status Script
 * 
 * Shows which transactions have/haven't received emails
 * 
 * Usage: node check-email-status.cjs
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

async function checkEmailStatus() {
  console.log('🔍 Checking email status for all transactions...\n');
  
  try {
    // Get summary statistics
    const stats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as total,
        SUM(CASE WHEN email_sent = true THEN 1 ELSE 0 END) as emails_sent,
        SUM(CASE WHEN email_sent = false OR email_sent IS NULL THEN 1 ELSE 0 END) as emails_missing
      FROM app_transactions
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('📊 EMAIL STATUS SUMMARY');
    console.log('========================================');
    console.log('Status\t\tTotal\tSent\tMissing');
    console.log('----------------------------------------');
    
    let grandTotal = 0;
    let grandSent = 0;
    let grandMissing = 0;
    
    stats.rows.forEach(row => {
      const status = row.status.padEnd(12);
      const total = String(row.total).padStart(5);
      const sent = String(row.emails_sent || 0).padStart(5);
      const missing = String(row.emails_missing || 0).padStart(7);
      console.log(`${status}\t${total}\t${sent}\t${missing}`);
      
      grandTotal += parseInt(row.total);
      grandSent += parseInt(row.emails_sent || 0);
      grandMissing += parseInt(row.emails_missing || 0);
    });
    
    console.log('----------------------------------------');
    console.log(`TOTAL\t\t${grandTotal}\t${grandSent}\t${grandMissing}`);
    console.log('========================================\n');
    
    // Show recent transactions without emails
    if (grandMissing > 0) {
      console.log('📧 RECENT TRANSACTIONS WITHOUT EMAILS (Last 10):\n');
      
      const recent = await pool.query(`
        SELECT 
          t.id,
          u.username,
          u.email,
          p.name as package_name,
          p.game as package_game,
          t.pi_amount,
          t.status,
          t.created_at,
          t.email_sent
        FROM app_transactions t
        LEFT JOIN app_users u ON t.user_id = u.id
        LEFT JOIN app_packages p ON t.package_id = p.id
        WHERE (t.email_sent = false OR t.email_sent IS NULL)
          AND u.email IS NOT NULL
        ORDER BY t.created_at DESC
        LIMIT 10
      `);
      
      recent.rows.forEach((tx, i) => {
        console.log(`${i + 1}. ${tx.username} (${tx.email})`);
        console.log(`   Package: ${tx.package_name} (${tx.package_game})`);
        console.log(`   Status: ${tx.status} | Amount: ${tx.pi_amount} Pi`);
        console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
      
      console.log(`💡 Run 'node backfill-emails.cjs' to send emails to all ${grandMissing} missing transactions\n`);
    } else {
      console.log('✅ All transactions have been sent emails!\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('👋 Database connection closed');
  }
}

checkEmailStatus().catch(console.error);
