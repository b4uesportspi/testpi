/**
 * Email Logo Diagnostic Script
 * 
 * Checks which logos were sent in emails and identifies any issues
 * with cancelled/failed transactions
 * 
 * Usage: node check-email-logos.cjs
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined
});

async function checkEmailLogos() {
  console.log('🔍 Checking email logo delivery...\n');
  
  try {
    // Get all transactions with their package game types
    const transactions = await pool.query(`
      SELECT 
        t.id,
        t.status,
        t.email_sent,
        t.created_at,
        u.username,
        u.email,
        p.name as package_name,
        p.game as package_game,
        t.pi_amount
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 50
    `);
    
    console.log('📊 RECENT TRANSACTIONS (Last 50)');
    console.log('=================================================================================');
    console.log('Status\t\tEmail Sent\tUser\t\t\tPackage\t\t\tGame Type\t\tLogo URL');
    console.log('---------------------------------------------------------------------------------');
    
    // Centralized game image mapping (copied from shared/schema.ts)
    const GAME_IMAGES = {
      PUBG: "pubgmoblielogob4uesports.webp",
      PUBGKR: "pubgkruc.png",
      MLBB: "mlbb-lgog.jpg",
      COC: "logo.985ee45d-removebg-preview.png",
      ROBUX: "1000019410-1.png",
      NEWSTATE: "1000020478-1.jpg",
      FREEFIRE: "1000020480.jpg",
      TIKTOK: "tiktokfollowers-removebg-preview.png",
      YOUTUBE: "1000077305.png",
      FACEBOOK: "facebooklogo.png",
      INSTAGRAM: "instagram-logo.jpg",
      NETFLIX: "netflix-logo-150x150-removebg-preview.png",
      CANVA: "canvanobackground-removebg-preview.png"
    };
    
    function getLogoFilename(gameType) {
      if (!gameType) return 'N/A';
      
      // Normalize game type
      const normalized = gameType.toUpperCase().trim();
      
      // Direct match
      if (GAME_IMAGES[normalized]) {
        return GAME_IMAGES[normalized];
      }
      
      // Handle compound names
      if (normalized.startsWith('TIKTOK')) return GAME_IMAGES.TIKTOK;
      if (normalized.startsWith('YOUTUBE')) return GAME_IMAGES.YOUTUBE;
      if (normalized === 'PUBG KR' || normalized === 'PUBG_KR') return GAME_IMAGES.PUBGKR;
      if (normalized === 'NEW STATE' || normalized === 'NEW_STATE') return GAME_IMAGES.NEWSTATE;
      if (normalized === 'FREE FIRE' || normalized === 'FREE_FIRE') return GAME_IMAGES.FREEFIRE;
      
      return 'UNKNOWN (defaults to PUBG)';
    }
    
    transactions.rows.forEach(tx => {
      const status = tx.status.padEnd(12);
      const emailSent = (tx.email_sent ? '✅ Yes' : '❌ No').padEnd(12);
      const user = (tx.username || 'N/A').padEnd(24);
      const pkg = (tx.package_name || 'N/A').substring(0, 20).padEnd(20);
      const game = (tx.package_game || 'N/A').padEnd(20);
      const logoUrl = getLogoFilename(tx.package_game);
      
      console.log(`${status}\t${emailSent}\t${user}\t${pkg}\t${game}\t${logoUrl}`);
    });
    
    console.log('=================================================================================\n');
    
    // Check specifically for completed transactions with emails
    console.log('✅ COMPLETED TRANSACTIONS WITH EMAILS');
    console.log('=================================================================================');
    
    const completedTransactions = await pool.query(`
      SELECT 
        t.id,
        t.status,
        t.email_sent,
        t.created_at,
        u.username,
        u.email,
        p.name as package_name,
        p.game as package_game,
        t.pi_amount
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'completed'
        AND t.email_sent = true
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    
    if (completedTransactions.rows.length === 0) {
      console.log('No completed transactions with emails found\n');
    } else {
      console.log(`Found ${completedTransactions.rows.length} completed transactions with emails:\n`);
      
      completedTransactions.rows.forEach((tx, i) => {
        console.log(`${i + 1}. Transaction ID: ${tx.id}`);
        console.log(`   Status: ${tx.status.toUpperCase()}`);
        console.log(`   Email Sent: ✅ Yes`);
        console.log(`   User: ${tx.username} (${tx.email})`);
        console.log(`   Package: ${tx.package_name}`);
        console.log(`   Game Type: ${tx.package_game}`);
        
        // Show which logo was used
        const logoFilename = getLogoFilename(tx.package_game);
        if (logoFilename !== 'N/A' && !logoFilename.includes('UNKNOWN')) {
          console.log(`   Logo Used in Email: ${logoFilename} ✅`);
        } else {
          console.log(`   Logo: ${logoFilename}`);
        }
        
        console.log(`   Amount: ${tx.pi_amount} Pi`);
        console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    console.log('=================================================================================\n');
    
    // Check specifically for cancelled/failed transactions
    console.log('🚫 CANCELLED/FAILED TRANSACTIONS');
    console.log('=================================================================================');
    
    const failedTransactions = await pool.query(`
      SELECT 
        t.id,
        t.status,
        t.email_sent,
        t.failure_reason,
        t.created_at,
        u.username,
        u.email,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE t.status IN ('failed', 'cancelled')
      ORDER BY t.created_at DESC
    `);
    
    if (failedTransactions.rows.length === 0) {
      console.log('✅ No cancelled or failed transactions found\n');
    } else {
      console.log(`Found ${failedTransactions.rows.length} cancelled/failed transactions:\n`);
      
      failedTransactions.rows.forEach((tx, i) => {
        console.log(`${i + 1}. Transaction ID: ${tx.id}`);
        console.log(`   Status: ${tx.status.toUpperCase()}`);
        console.log(`   Email Sent: ${tx.email_sent ? '✅ Yes' : '❌ No'}`);
        console.log(`   User: ${tx.username} (${tx.email})`);
        console.log(`   Package: ${tx.package_name}`);
        console.log(`   Game Type: ${tx.package_game}`);
        
        // Show which logo would be used
        const logoFilename = getLogoFilename(tx.package_game);
        if (logoFilename !== 'N/A' && !logoFilename.includes('UNKNOWN')) {
          console.log(`   Logo That Would Be Used: ${logoFilename}`);
        } else {
          console.log(`   Logo: ${logoFilename}`);
        }
        
        console.log(`   Failure Reason: ${tx.failure_reason || 'N/A'}`);
        console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    console.log('=================================================================================\n');
    
    // Summary by game type
    console.log('📈 EMAIL DELIVERY BY GAME TYPE');
    console.log('=================================================================================');
    
    const gameStats = await pool.query(`
      SELECT 
        p.game as game_type,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN t.email_sent = true THEN 1 ELSE 0 END) as emails_sent,
        SUM(CASE WHEN t.email_sent = false OR t.email_sent IS NULL THEN 1 ELSE 0 END) as emails_missing,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status IN ('failed', 'cancelled') THEN 1 ELSE 0 END) as failed_cancelled
      FROM app_transactions t
      LEFT JOIN app_packages p ON t.package_id = p.id
      GROUP BY p.game
      ORDER BY total_transactions DESC
    `);
    
    console.log('Game Type\t\tTotal\tSent\tMissing\tCompleted\tFailed/Cancelled');
    console.log('---------------------------------------------------------------------------------');
    
    gameStats.rows.forEach(stat => {
      const gameType = (stat.game_type || 'UNKNOWN').padEnd(16);
      const total = String(stat.total_transactions).padStart(5);
      const sent = String(stat.emails_sent || 0).padStart(5);
      const missing = String(stat.emails_missing || 0).padStart(7);
      const completed = String(stat.completed || 0).padStart(9);
      const failed = String(stat.failed_cancelled || 0).padStart(14);
      
      console.log(`${gameType}\t${total}\t${sent}\t${missing}\t${completed}\t${failed}`);
    });
    
    console.log('=================================================================================\n');
    
    // Check for transactions with unknown/missing game types
    console.log('⚠️  TRANSACTIONS WITH MISSING GAME TYPES');
    console.log('=================================================================================');
    
    const missingGameTypes = await pool.query(`
      SELECT 
        t.id,
        t.status,
        u.username,
        p.name as package_name,
        p.game as package_game
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE p.game IS NULL OR p.game = ''
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    
    if (missingGameTypes.rows.length === 0) {
      console.log('✅ All transactions have valid game types\n');
    } else {
      console.log(`Found ${missingGameTypes.rows.length} transactions with missing game types:\n`);
      
      missingGameTypes.rows.forEach((tx, i) => {
        console.log(`${i + 1}. Transaction: ${tx.id}`);
        console.log(`   User: ${tx.username}`);
        console.log(`   Package: ${tx.package_name}`);
        console.log(`   Game Type: ${tx.package_game || 'MISSING'} ❌`);
        console.log('');
      });
    }
    
    console.log('=================================================================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('👋 Database connection closed');
  }
}

checkEmailLogos().catch(console.error);
