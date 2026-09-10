/**
 * Advanced Email Generator - Usage Examples & Integration Guide
 * 
 * This demonstrates how to use the advanced email generation system
 * to create hyper-personalized, high-converting emails.
 */

import { generatePersonalizedEmail, EmailGenerationInput } from './advanced-email-generator.js';

// ============================================
// EXAMPLE 1: TikTok Coins Purchase (Active User)
// ============================================

const tiktokExample: EmailGenerationInput = {
  userName: "Tshering",
  userEmail: "tshering@example.com",
  userTier: "Silver",
  
  productName: "70 TikTok Coins",
  productCategory: "TIKTOK",
  platformType: "Social Media",
  purchaseCount: 3,
  lastPurchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  
  monthlyPurchases: 4,
  totalSpent: "15.50",
  
  viewedProduct: "150 TikTok Coins",
  abandonedPurchase: false,
  daysSinceLastPurchase: 2,
  
  isWeekend: true,
  isNight: false
};

console.log("=== TIKTOK COINS EMAIL ===");
const tiktokEmail = generatePersonalizedEmail(tiktokExample);
console.log("Subject:", tiktokEmail.subjectLine);
console.log("Header:", tiktokEmail.headerTitle);
console.log("CTA:", tiktokEmail.ctaText);
console.log("Triggers:", tiktokEmail.psychologicalTriggers);
console.log("\n");

// ============================================
// EXAMPLE 2: PUBG UC (Abandoned Cart)
// ============================================

const pubgExample: EmailGenerationInput = {
  userName: "Karma",
  userEmail: "karma@example.com",
  userTier: "Gold",
  
  productName: "660 UC Pack",
  productCategory: "PUBG",
  platformType: "Game",
  purchaseCount: 8,
  lastPurchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
  
  monthlyPurchases: 8,
  totalSpent: "45.00",
  
  viewedProduct: "1800 UC Pack",
  abandonedPurchase: true,
  daysSinceLastPurchase: 1,
  
  isWeekend: false,
  isNight: true
};

console.log("=== PUBG ABANDONED CART EMAIL ===");
const pubgEmail = generatePersonalizedEmail(pubgExample);
console.log("Subject:", pubgEmail.subjectLine);
console.log("Header:", pubgEmail.headerTitle);
console.log("CTA:", pubgEmail.ctaText);
console.log("Triggers:", pubgEmail.psychologicalTriggers);
console.log("\n");

// ============================================
// EXAMPLE 3: Netflix Subscription (VIP User)
// ============================================

const netflixExample: EmailGenerationInput = {
  userName: "Sonam",
  userEmail: "sonam@example.com",
  userTier: "VIP",
  
  productName: "Netflix Premium Plan",
  productCategory: "NETFLIX",
  platformType: "Subscription",
  purchaseCount: 12,
  lastPurchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  
  monthlyPurchases: 1,
  totalSpent: "120.00",
  
  viewedProduct: undefined,
  abandonedPurchase: false,
  daysSinceLastPurchase: 30,
  
  isWeekend: false,
  isNight: false
};

console.log("=== NETFLIX VIP EMAIL ===");
const netflixEmail = generatePersonalizedEmail(netflixExample);
console.log("Subject:", netflixEmail.subjectLine);
console.log("Header:", netflixEmail.headerTitle);
console.log("CTA:", netflixEmail.ctaText);
console.log("Triggers:", netflixEmail.psychologicalTriggers);
console.log("\n");

// ============================================
// EXAMPLE 4: New User - MLBB Diamonds
// ============================================

const mlbbExample: EmailGenerationInput = {
  userName: "Dorji",
  userEmail: "dorji@example.com",
  userTier: "New",
  
  productName: "100 Diamonds",
  productCategory: "MLBB",
  platformType: "Game",
  purchaseCount: 1,
  lastPurchaseDate: new Date(), // Today
  
  monthlyPurchases: 1,
  totalSpent: "2.50",
  
  viewedProduct: "500 Diamonds",
  abandonedPurchase: false,
  daysSinceLastPurchase: 0,
  
  isWeekend: true,
  isNight: false
};

console.log("=== MLBB NEW USER EMAIL ===");
const mlbbEmail = generatePersonalizedEmail(mlbbExample);
console.log("Subject:", mlbbEmail.subjectLine);
console.log("Header:", mlbbEmail.headerTitle);
console.log("CTA:", mlbbEmail.ctaText);
console.log("Triggers:", mlbbEmail.psychologicalTriggers);
console.log("\n");

// ============================================
// INTEGRATION WITH EXISTING EMAIL SERVICE
// ============================================

/**
 * To integrate with your existing email service:
 * 
 * 1. Import the generator:
 *    import { generatePersonalizedEmail } from './advanced-email-generator.js';
 * 
 * 2. Prepare input data from transaction/user:
 *    const emailInput: EmailGenerationInput = {
 *      userName: user.username,
 *      userEmail: user.email,
 *      userTier: determineUserTier(user),
 *      productName: pkg.name,
 *      productCategory: normalizeGameCategory(pkg.game),
 *      platformType: getPlatformType(pkg.game),
 *      purchaseCount: getUserPurchaseCount(user.id),
 *      monthlyPurchases: getMonthlyPurchases(user.id),
 *      abandonedPurchase: checkIfAbandoned(transaction),
 *      // ... other fields
 *    };
 * 
 * 3. Generate email:
 *    const generatedEmail = generatePersonalizedEmail(emailInput);
 * 
 * 4. Send using Nodemailer:
 *    await transporter.sendMail({
 *      to: user.email,
 *      subject: generatedEmail.subjectLine,
 *      html: generatedEmail.emailBody
 *    });
 */

// ============================================
// HELPER FUNCTIONS (To be implemented)
// ============================================

function determineUserTier(user: any): 'New' | 'Bronze' | 'Silver' | 'Gold' | 'VIP' {
  // Implement based on your tier logic
  // Example: Based on total purchases or spend
  if (!user.totalSpent || parseFloat(user.totalSpent) < 10) return 'New';
  if (parseFloat(user.totalSpent) < 50) return 'Bronze';
  if (parseFloat(user.totalSpent) < 100) return 'Silver';
  if (parseFloat(user.totalSpent) < 500) return 'Gold';
  return 'VIP';
}

function getPlatformType(gameCategory: string): 'Game' | 'Social Media' | 'Subscription' {
  const gamingCategories = ['PUBG', 'PUBGKR', 'MLBB', 'COC', 'ROBUX', 'NEWSTATE', 'FREEFIRE'];
  const socialCategories = ['TIKTOK', 'YOUTUBE', 'FACEBOOK', 'INSTAGRAM'];
  const subscriptionCategories = ['NETFLIX', 'CANVA'];
  
  if (gamingCategories.includes(gameCategory)) return 'Game';
  if (socialCategories.includes(gameCategory)) return 'Social Media';
  if (subscriptionCategories.includes(gameCategory)) return 'Subscription';
  
  return 'Game'; // Default
}

function getUserPurchaseCount(userId: string): number {
  // Query database for total purchases
  return 0; // Placeholder
}

function getMonthlyPurchases(userId: string): number {
  // Query database for purchases this month
  return 0; // Placeholder
}

function checkIfAbandoned(transaction: any): boolean {
  // Check if transaction was abandoned
  return transaction.status === 'pending' && 
         (Date.now() - new Date(transaction.createdAt).getTime()) > 30 * 60 * 1000; // 30 minutes
}

console.log("✅ Advanced Email Generator loaded successfully!");
console.log("📧 Run this file to see example outputs");
