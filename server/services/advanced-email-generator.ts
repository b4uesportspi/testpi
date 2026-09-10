/**
 * Advanced Email Generation System for B4U Esports
 * 
 * Creates high-converting, fully personalized emails using:
 * - Behavioral psychology triggers
 * - Dynamic content personalization
 * - Gamification elements
 * - Smart recommendations
 * - VIP/loyalty progression
 */

import { GameCategory } from '../../shared/schema.js';

// ============================================
// TYPES & INTERFACES
// ============================================

export type UserTier = 'New' | 'Bronze' | 'Silver' | 'Gold' | 'VIP';
export type PlatformType = 'Game' | 'Social Media' | 'Subscription';
export type UserBehavior = 'active' | 'inactive' | 'abandoned';

export interface EmailGenerationInput {
  // User Info
  userName: string;
  userEmail: string;
  userTier: UserTier;
  
  // Purchase Data
  productName: string;
  productCategory: GameCategory;
  platformType: PlatformType;
  purchaseCount: number;
  lastPurchaseDate?: Date;
  
  // Monthly Stats
  monthlyPurchases: number;
  totalSpent?: string;
  
  // Behavioral Data
  viewedProduct?: string;
  abandonedPurchase: boolean;
  daysSinceLastPurchase?: number;
  
  // Context
  isWeekend?: boolean;
  isNight?: boolean;
}

export interface GeneratedEmail {
  subjectLine: string;
  headerTitle: string;
  suggestedImageStyle: string;
  emailBody: string;
  ctaText: string;
  psychologicalTriggers: string[];
}

// ============================================
// PLATFORM-SPECIFIC CONFIGURATIONS
// ============================================

const PLATFORM_CONFIG = {
  // Gaming Platforms
  PUBG: {
    platformType: 'Game' as PlatformType,
    theme: 'dark-battleground',
    keywords: ['power', 'domination', 'victory', 'upgrade'],
    heroStyle: 'Dark battleground with weapons and action effects',
    valueProposition: 'Dominate the battlefield with premium upgrades',
    emoji: '🎮'
  },
  PUBGKR: {
    platformType: 'Game' as PlatformType,
    theme: 'dark-battleground',
    keywords: ['power', 'domination', 'victory', 'upgrade'],
    heroStyle: 'Dark battleground with Korean-style graphics',
    valueProposition: 'Rule the KR server with exclusive items',
    emoji: '🎮'
  },
  MLBB: {
    platformType: 'Game' as PlatformType,
    theme: 'battle-arena',
    keywords: ['heroes', 'skins', 'legendary', 'epic'],
    heroStyle: 'Hero skins in battle arena with glowing effects',
    valueProposition: 'Unlock legendary heroes and epic skins',
    emoji: '⚔️'
  },
  COC: {
    platformType: 'Game' as PlatformType,
    theme: 'village-building',
    keywords: ['village', 'gold pass', 'clan', 'troops'],
    heroStyle: 'Village base with Gold Pass and troops',
    valueProposition: 'Build an unstoppable village and clan',
    emoji: '🏰'
  },
  ROBUX: {
    platformType: 'Game' as PlatformType,
    theme: 'bright-blocky',
    keywords: ['create', 'build', 'adventure', 'fun'],
    heroStyle: 'Bright, block-style Roblox visuals with avatars',
    valueProposition: 'Create unlimited adventures in Roblox',
    emoji: '🧱'
  },
  NEWSTATE: {
    platformType: 'Game' as PlatformType,
    theme: 'futuristic-battle',
    keywords: ['future', 'tactical', 'survival', 'combat'],
    heroStyle: 'Futuristic battleground with advanced weapons',
    valueProposition: 'Experience next-gen tactical combat',
    emoji: '🔫'
  },
  FREEFIRE: {
    platformType: 'Game' as PlatformType,
    theme: 'character-action',
    keywords: ['character', 'diamonds', 'elite', 'battle'],
    heroStyle: 'Character with glowing diamonds and action effects',
    valueProposition: 'Become an elite warrior with exclusive items',
    emoji: '💎'
  },
  
  // Social Media Platforms
  TIKTOK: {
    platformType: 'Social Media' as PlatformType,
    theme: 'growth-charts',
    keywords: ['followers', 'viral', 'influence', 'growth'],
    heroStyle: 'Growth charts with followers count and viral metrics',
    valueProposition: 'Boost your influence and go viral',
    emoji: '📈'
  },
  YOUTUBE: {
    platformType: 'Social Media' as PlatformType,
    theme: 'creator-growth',
    keywords: ['subscribers', 'watchtime', 'monetize', 'creator'],
    heroStyle: 'YouTube play button with subscriber growth graph',
    valueProposition: 'Grow your channel and unlock monetization',
    emoji: '▶️'
  },
  FACEBOOK: {
    platformType: 'Social Media' as PlatformType,
    theme: 'social-reach',
    keywords: ['reach', 'engagement', 'community', 'likes'],
    heroStyle: 'Facebook engagement metrics and community growth',
    valueProposition: 'Expand your reach and build community',
    emoji: '👥'
  },
  INSTAGRAM: {
    platformType: 'Social Media' as PlatformType,
    theme: 'visual-growth',
    keywords: ['followers', 'aesthetic', 'influence', 'stories'],
    heroStyle: 'Instagram aesthetic with follower growth visualization',
    valueProposition: 'Elevate your Instagram presence and influence',
    emoji: '📸'
  },
  
  // Subscription Platforms
  NETFLIX: {
    platformType: 'Subscription' as PlatformType,
    theme: 'cinematic',
    keywords: ['entertainment', 'movies', 'series', 'premium'],
    heroStyle: 'Cinematic entertainment with movie/series collage',
    valueProposition: 'Unlimited entertainment at your fingertips',
    emoji: '🎬'
  },
  CANVA: {
    platformType: 'Subscription' as PlatformType,
    theme: 'creative-design',
    keywords: ['design', 'create', 'professional', 'templates'],
    heroStyle: 'Creative design workspace with professional templates',
    valueProposition: 'Create stunning designs like a pro',
    emoji: '🎨'
  }
};

// ============================================
// PSYCHOLOGICAL TRIGGER TEMPLATES
// ============================================

const URGENCY_TEMPLATES = [
  "⏰ Limited-time offer — Don't miss out!",
  "🔥 This offer expires soon",
  "⚡ Act now before it's gone",
  "🎯 Time-sensitive opportunity"
];

const REWARD_TEMPLATES = {
  New: [
    "🎁 Welcome Bonus: Complete your next purchase within 24 hours for a surprise reward!",
    "🌟 First-timer Special: Unlock exclusive benefits with your next top-up",
    "💎 New User Perk: Get bonus rewards on your second purchase"
  ],
  Bronze: [
    "🎁 Loyalty Reward: Your next purchase unlocks special bonuses",
    "⭐ Bronze Member Perk: Exclusive rewards waiting for you",
    "🏆 Keep climbing! Next purchase brings bigger rewards"
  ],
  Silver: [
    "💎 Silver Exclusive: Premium rewards activated for your next purchase",
    "🎯 Elite Bonus: Special perks reserved for Silver members",
    "🚀 Level Up: One more purchase to reach Gold tier!"
  ],
  Gold: [
    "👑 Gold VIP: Priority service + exclusive bonuses unlocked",
    "💫 Premium Treatment: Your Gold status guarantees extra rewards",
    "🏅 Elite Access: VIP perks activated for immediate use"
  ],
  VIP: [
    "👑 VIP Exclusive: Ultra-premium rewards just for you",
    "💎 Diamond Status: Maximum benefits + priority support",
    "🌟 Legend Tier: You're among our most valued customers"
  ]
};

const SOCIAL_PROOF_TEMPLATES = [
  "🔥 Trending Now: One of the most purchased this week",
  "🏆 Top Choice: Thousands of players upgraded today",
  "⭐ Popular Pick: Join 10,000+ satisfied customers",
  "🚀 Fast Growing: This package is flying off the shelves"
];

const PROGRESS_TEMPLATES = [
  "📊 You've made {count} purchases this month — impressive!",
  "🎯 You're among our most active users this month",
  "🏅 Consistency pays off: Your dedication shows!",
  "💪 Building momentum: Keep the streak going!"
];

const CURIOSITY_TEMPLATES = [
  "🎁 A hidden reward is waiting for you — unlock it with your next purchase",
  "🔐 Secret bonus revealed after your next transaction",
  "✨ Something special awaits — complete your purchase to discover",
  "🎲 Mystery reward activated — claim it now!"
];

const EXCLUSIVITY_TEMPLATES = [
  "👤 Reserved exclusively for {tier} members",
  "🔒 Members-only access: This benefit is locked to your tier",
  "💫 Elite Circle: Only select users receive this offer",
  "🎖️ Tier-Locked Perk: Upgrade to unlock even more"
];

// ============================================
// BEHAVIORAL MESSAGE GENERATORS
// ============================================

function generateBehavioralMessage(behavior: UserBehavior, userName: string): string {
  switch (behavior) {
    case 'abandoned':
      return `You left something behind 👀\n\nHey ${userName}, we noticed you didn't complete your purchase. Your upgrade is still waiting!`;
    
    case 'inactive':
      return `We miss you, ${userName}! 💙\n\nIt's been a while — here's something special to welcome you back.`;
    
    case 'active':
      return `Keep your momentum going, ${userName}! 🚀\n\nYour consistency is paying off. Let's level up together!`;
    
    default:
      return `Great to see you, ${userName}! 🎮`;
  }
}

// ============================================
// SUBJECT LINE GENERATOR
// ============================================

function generateSubjectLine(input: EmailGenerationInput): string {
  const config = PLATFORM_CONFIG[input.productCategory];
  const { userName, userTier, abandonedPurchase, monthlyPurchases } = input;
  
  // Abandoned cart - highest priority
  if (abandonedPurchase) {
    return `👀 ${userName}, your ${config.emoji} upgrade is waiting!`;
  }
  
  // High activity users
  if (monthlyPurchases >= 5) {
    return `🏆 ${userName}, you're crushing it! Exclusive rewards inside`;
  }
  
  // VIP users
  if (userTier === 'VIP' || userTier === 'Gold') {
    return `👑 ${userName}, your VIP perks are ready!`;
  }
  
  // New users
  if (userTier === 'New') {
    return `🎁 Welcome to B4U Esports! Your first bonus awaits`;
  }
  
  // Weekend special
  if (input.isWeekend) {
    return `🔥 Weekend Special: Boost your ${config.keywords[0]} now!`;
  }
  
  // Default personalized
  return `${config.emoji} ${userName}, level up your ${input.productName} today!`;
}

// ============================================
// HEADER TITLE GENERATOR
// ============================================

function generateHeaderTitle(input: EmailGenerationInput): string {
  const config = PLATFORM_CONFIG[input.productCategory];
  const { userName, userTier, monthlyPurchases } = input;
  
  // Personalized based on tier and activity
  if (userTier === 'VIP') {
    return `VIP Excellence, ${userName}`;
  }
  
  if (monthlyPurchases >= 3) {
    return `Consistent Champion, ${userName}`;
  }
  
  if (input.abandonedPurchase) {
    return `Complete Your Journey, ${userName}`;
  }
  
  return `Level Up Your Game, ${userName}`;
}

// ============================================
// CORE MESSAGE GENERATOR
// ============================================

function generateCoreMessage(input: EmailGenerationInput): string {
  const config = PLATFORM_CONFIG[input.productCategory];
  const { userName, productName, platformType } = input;
  
  let message = '';
  
  // Platform-specific value proposition
  if (platformType === 'Game') {
    message = `Enhance your gaming experience with **${productName}**. ${config.valueProposition}.`;
  } else if (platformType === 'Social Media') {
    message = `Amplify your social presence with **${productName}**. ${config.valueProposition}.`;
  } else {
    message = `Unlock premium entertainment with **${productName}**. ${config.valueProposition}.`;
  }
  
  return message;
}

// ============================================
// SMART RECOMMENDATIONS
// ============================================

function generateRecommendations(category: GameCategory): string[] {
  const recommendations: Record<GameCategory, string[]> = {
    PUBG: ['660 UC Pack', 'Elite Pass Bundle', 'UC + Royale Pass Combo'],
    PUBGKR: ['KR Exclusive UC', 'Season Pass KR', 'Premium Crate Bundle'],
    MLBB: ['Diamond Pack', 'Starlight Member', 'Skin Bundle'],
    COC: ['Gold Pass', 'Gem Pack', 'Builder Bundle'],
    ROBUX: ['800 Robux', 'Premium Membership', 'Creator Pack'],
    NEWSTATE: ['NC Pack', 'Battle Pass', 'Starter Bundle'],
    FREEFIRE: ['Diamond Pack', 'Elite Pass', 'Character Bundle'],
    TIKTOK: ['Followers Boost', 'Views Package', 'Engagement Combo'],
    YOUTUBE: ['Subscriber Pack', 'Watchtime Boost', 'Creator Bundle'],
    FACEBOOK: ['Page Likes', 'Post Engagement', 'Reach Booster'],
    INSTAGRAM: ['Follower Growth', 'Story Views', 'Engagement Pack'],
    NETFLIX: ['Premium Plan', 'Family Sharing', 'Annual Subscription'],
    CANVA: ['Pro Plan', 'Team License', 'Template Bundle']
  };
  
  return recommendations[category] || ['Popular Package', 'Best Value Deal', 'Premium Upgrade'];
}

// ============================================
// MAIN EMAIL GENERATION FUNCTION
// ============================================

export function generatePersonalizedEmail(input: EmailGenerationInput): GeneratedEmail {
  const config = PLATFORM_CONFIG[input.productCategory];
  
  // Determine user behavior
  let behavior: UserBehavior = 'active';
  if (input.abandonedPurchase) {
    behavior = 'abandoned';
  } else if (input.daysSinceLastPurchase && input.daysSinceLastPurchase > 7) {
    behavior = 'inactive';
  }
  
  // Generate components
  const subjectLine = generateSubjectLine(input);
  const headerTitle = generateHeaderTitle(input);
  const behavioralMessage = generateBehavioralMessage(behavior, input.userName);
  const coreMessage = generateCoreMessage(input);
  const recommendations = generateRecommendations(input.productCategory);
  
  // Select psychological triggers (at least 4)
  const triggers = [
    'urgency',
    'reward',
    'social_proof',
    'progress'
  ];
  
  if (input.userTier === 'VIP' || input.userTier === 'Gold') {
    triggers.push('exclusivity');
  }
  
  if (input.abandonedPurchase || input.viewedProduct) {
    triggers.push('curiosity');
  }
  
  // Build email body
  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .hero { width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #666; }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; padding: 20px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #667eea; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-item { text-align: center; }
    .stat-number { font-size: 28px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    .recommendations { list-style: none; padding: 0; }
    .recommendations li { padding: 10px; margin: 8px 0; background: white; border-radius: 6px; border: 1px solid #e0e0e0; }
    .cta-button { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; margin: 20px 0; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
    .trust-badges { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 8px; }
    .badge { text-align: center; font-size: 12px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
    .emoji { font-size: 20px; }
    strong { color: #667eea; }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">B4U ESPORTS</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">${headerTitle}</p>
  </div>
  
  <!-- HERO IMAGE -->
  <div class="hero">
    🖼️ ${config.heroStyle}
  </div>
  
  <!-- CONTENT -->
  <div class="content">
    <!-- BEHAVIORAL TRIGGER -->
    <div class="section">
      <p style="margin: 0; font-size: 16px; white-space: pre-line;">${behavioralMessage}</p>
    </div>
    
    <!-- CORE MESSAGE -->
    <div class="section">
      <p style="margin: 0; font-size: 15px;">${coreMessage}</p>
    </div>
    
    <!-- PERSONAL STATS -->
    <div class="section">
      <h3 style="margin: 0 0 15px 0; color: #667eea;">📊 Your Progress</h3>
      <div class="stats">
        <div class="stat-item">
          <div class="stat-number">${input.monthlyPurchases}</div>
          <div class="stat-label">Purchases This Month</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${input.userTier}</div>
          <div class="stat-label">Member Tier</div>
        </div>
      </div>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
        ${PROGRESS_TEMPLATES[Math.floor(Math.random() * PROGRESS_TEMPLATES.length)].replace('{count}', String(input.monthlyPurchases))}
      </p>
    </div>
    
    <!-- SOCIAL PROOF -->
    <div class="section">
      <p style="margin: 0; font-size: 14px;">
        ${SOCIAL_PROOF_TEMPLATES[Math.floor(Math.random() * SOCIAL_PROOF_TEMPLATES.length)]}
      </p>
    </div>
    
    <!-- REWARDS -->
    <div class="section">
      <h3 style="margin: 0 0 10px 0; color: #667eea;">🎁 Your Exclusive Reward</h3>
      <p style="margin: 0; font-size: 14px;">
        ${REWARD_TEMPLATES[input.userTier][Math.floor(Math.random() * REWARD_TEMPLATES[input.userTier].length)]}
      </p>
    </div>
    
    <!-- SMART RECOMMENDATIONS -->
    <div class="section">
      <h3 style="margin: 0 0 15px 0; color: #667eea;">🎯 Recommended for You</h3>
      <ul class="recommendations">
        ${recommendations.map(rec => `<li>${config.emoji} ${rec}</li>`).join('')}
      </ul>
    </div>
    
    <!-- HIDDEN REWARD -->
    <div class="section">
      <p style="margin: 0; font-size: 14px; font-style: italic;">
        ${CURIOSITY_TEMPLATES[Math.floor(Math.random() * CURIOSITY_TEMPLATES.length)]}
      </p>
    </div>
    
    <!-- URGENCY -->
    <div class="section" style="background: #fff3cd; border-left-color: #ffc107;">
      <p style="margin: 0; font-size: 14px; font-weight: bold; color: #856404;">
        ${URGENCY_TEMPLATES[Math.floor(Math.random() * URGENCY_TEMPLATES.length)]}
      </p>
    </div>
    
    <!-- TRUST BLOCK -->
    <div class="trust-badges">
      <div class="badge">
        <div style="font-size: 24px;">🔒</div>
        <div>Secure Payment</div>
      </div>
      <div class="badge">
        <div style="font-size: 24px;">⚡</div>
        <div>Instant Delivery</div>
      </div>
      <div class="badge">
        <div style="font-size: 24px;">⭐</div>
        <div>Trusted by 10K+</div>
      </div>
    </div>
    
    <!-- CTA -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" class="cta-button">
        ${input.abandonedPurchase ? 'Complete Your Purchase' : 
          input.platformType === 'Game' ? 'Top Up Again Now' :
          input.platformType === 'Social Media' ? 'Boost Your Account' :
          'Continue Your Progress'}
      </a>
    </div>
    
    <!-- COMMUNITY HOOK -->
    <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        🌟 Join thousands of players growing with B4U Esports
      </p>
    </div>
  </div>
  
  <!-- FOOTER -->
  <div class="footer">
    <p>© 2026 B4U Esports. All rights reserved.</p>
    <p>You're receiving this because you're a valued member of our community.</p>
  </div>
</body>
</html>
  `.trim();
  
  // Determine CTA text
  let ctaText = 'Take Action Now';
  if (input.abandonedPurchase) {
    ctaText = 'Complete Your Purchase';
  } else if (input.platformType === 'Game') {
    ctaText = 'Top Up Again Now';
  } else if (input.platformType === 'Social Media') {
    ctaText = 'Boost Your Account';
  } else {
    ctaText = 'Continue Your Progress';
  }
  
  return {
    subjectLine,
    headerTitle,
    suggestedImageStyle: config.heroStyle,
    emailBody,
    ctaText,
    psychologicalTriggers: triggers
  };
}

// ============================================
// EXPORT FOR USE IN EMAIL SERVICE
// ============================================

export default generatePersonalizedEmail;
