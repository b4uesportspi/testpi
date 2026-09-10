/**
 * Marketing Email Backfill Script
 * 
 * Sends personalized marketing emails to all users who haven't received them
 * Includes behavioral triggers based on user activity
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Import email service
const { sendPersonalizedMarketingEmail } = require('./dist/server/services/email.js');

async function sendMarketingEmails() {
  console.log('🚀 Starting marketing email backfill...\n');
  
  try {
    // Get all users with their purchase history
    const users = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.created_at as user_created_at,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as total_purchases,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed' AND t.created_at >= NOW() - INTERVAL '30 days') as monthly_purchases,
        MAX(t.created_at) FILTER (WHERE t.status = 'completed') as last_purchase_date,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'cancelled') as abandoned_purchases,
        STRING_AGG(DISTINCT p.game, ', ') FILTER (WHERE t.status = 'completed') as purchased_games
      FROM app_users u
      LEFT JOIN app_transactions t ON u.id = t.user_id
      LEFT JOIN app_packages p ON t.package_id = p.id
      WHERE u.email IS NOT NULL
        AND u.email != ''
      GROUP BY u.id, u.username, u.email, u.created_at
      ORDER BY u.created_at ASC
    `);
    
    console.log(`📊 Found ${users.rows.length} users with valid emails\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < users.rows.length; i++) {
      const user = users.rows[i];
      
      console.log(`[${i + 1}/${users.rows.length}] Processing: ${user.username} (${user.email})`);
      
      // Determine user behavior
      const totalPurchases = parseInt(user.total_purchases) || 0;
      const monthlyPurchases = parseInt(user.monthly_purchases) || 0;
      const abandonedPurchases = parseInt(user.abandoned_purchases) || 0;
      const lastPurchaseDate = user.last_purchase_date ? new Date(user.last_purchase_date) : null;
      const daysSinceLastPurchase = lastPurchaseDate 
        ? Math.floor((Date.now() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      // Determine product category to promote
      let productCategory = 'PUBG'; // Default
      if (user.purchased_games) {
        const games = user.purchased_games.split(', ');
        // Promote a game they've purchased before
        productCategory = games[Math.floor(Math.random() * games.length)];
      }
      
      // Determine platform type
      let platformType = 'gaming';
      if (productCategory.includes('TIKTOK') || productCategory.includes('INSTAGRAM') || 
          productCategory.includes('FACEBOOK') || productCategory.includes('YOUTUBE')) {
        platformType = 'social';
      } else if (productCategory.includes('NETFLIX') || productCategory.includes('CANVA')) {
        platformType = 'subscription';
      }
      
      // Check if this is an abandoned cart scenario
      const abandonedPurchase = abandonedPurchases > 0 && totalPurchases === 0 ? 'Yes' : 'No';
      
      console.log(`   Purchases: ${totalPurchases} total, ${monthlyPurchases} this month`);
      console.log(`   Last Purchase: ${daysSinceLastPurchase ? `${daysSinceLastPurchase} days ago` : 'Never'}`);
      console.log(`   Abandoned: ${abandonedPurchases}`);
      console.log(`   Promoting: ${productCategory} (${platformType})`);
      
      try {
        // Determine product name to promote
        let productName = '60 UC';
        if (productCategory === 'PUBG') productName = '60 UC';
        else if (productCategory === 'MLBB') productName = '571 Diamonds';
        else if (productCategory === 'TIKTOK_COINS') productName = '70 Coins';
        else if (productCategory === 'INSTAGRAM') productName = '1,000 Followers';
        else if (productCategory === 'FACEBOOK') productName = '500 Likes + Followers';
        else if (productCategory === 'YOUTUBE_SUBS') productName = '100 Subscribers';
        else if (productCategory === 'NETFLIX') productName = 'Netflix Premium';
        else if (productCategory === 'CANVA') productName = 'Canva Pro';
        
        // Send personalized marketing email
        const result = await sendPersonalizedMarketingEmail({
          to: user.email,
          user_name: user.username,
          user_email: user.email,
          user_id: user.id,
          product_name: productName,
          product_category: productCategory,
          platform_type: platformType,
          purchase_count: totalPurchases,
          last_purchase_date: lastPurchaseDate ? lastPurchaseDate.toISOString() : new Date().toISOString(),
          user_tier: getUserTier(totalPurchases),
          viewed_product: productName,
          abandoned_purchase: abandonedPurchase,
          monthly_purchases: monthlyPurchases,
          total_spent: 0, // Could calculate from transactions if needed
          user_rank: undefined,
          next_tier: getNextTier(totalPurchases)
        });
        
        if (result) {
          console.log(`   ✅ Marketing email sent successfully\n`);
          successCount++;
          
          // Update user record to track marketing email sent
          await pool.query(
            `UPDATE app_users 
             SET updated_at = NOW(),
                 metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_marketing_email_sent', NOW())
             WHERE id = $1`,
            [user.id]
          );
        } else {
          console.log(`   ❌ Failed to send marketing email\n`);
          failCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error sending email:`, error.message);
        failCount++;
      }
      
      // Rate limiting - wait 200ms between emails to avoid throttling
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n========================================');
    console.log('📊 MARKETING EMAIL BACKFILL SUMMARY');
    console.log('========================================');
    console.log(`Total Users Processed: ${users.rows.length}`);
    console.log(`✅ Successfully Sent: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log('========================================\n');
    
    if (successCount > 0) {
      console.log(`💡 ${successCount} users have now received personalized marketing emails!`);
      console.log('💡 Check your email logs to verify delivery\n');
    }
    
  } catch (error) {
    console.error('❌ Fatal error in marketing email backfill:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('👋 Database connection closed');
  }
}

// Helper function to determine user tier
function getUserTier(totalPurchases) {
  if (totalPurchases === 0) return 'New';
  if (totalPurchases <= 5) return 'Bronze';
  if (totalPurchases <= 15) return 'Silver';
  if (totalPurchases <= 30) return 'Gold';
  return 'VIP';
}

// Helper function to determine next tier
function getNextTier(totalPurchases) {
  if (totalPurchases === 0) return 'Bronze';
  if (totalPurchases <= 5) return 'Silver';
  if (totalPurchases <= 15) return 'Gold';
  if (totalPurchases <= 30) return 'VIP';
  return null; // Already VIP
}

// Helper function to check if it's weekend
function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

// Helper function to check if it's night (8 PM - 6 AM)
function isNight() {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

// Run the script
sendMarketingEmails().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
