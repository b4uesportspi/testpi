import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ============================================
// CENTRALIZED GAME CATEGORY SYSTEM
// ============================================

/**
 * Normalized game categories - single source of truth
 * Used for email logos, UI display, and business logic
 */
export type GameOnlyCategory =
  | "PUBG"
  | "PUBGKR"
  | "MLBB"
  | "COC"
  | "ROBUX"
  | "NEWSTATE"
  | "FREEFIRE";

export type SocialCategory =
  | "TIKTOK"
  | "YOUTUBE"
  | "FACEBOOK"
  | "INSTAGRAM";

export type SubscriptionCategory =
  | "NETFLIX"
  | "CANVA";

/**
 * Unified platform category for packages and email/logo mapping.
 * This covers games, social media services, and content/subscription brands.
 */
export type GameCategory = GameOnlyCategory | SocialCategory | SubscriptionCategory;

/**
 * Package subtypes for games with multiple product types
 */
export type PackageSubtype = 
  | "COINS"        // TikTok Coins, etc.
  | "FOLLOWERS"    // TikTok/Instagram Followers
  | "VIEWS"        // TikTok/YouTube Views
  | "SUBS"         // YouTube Subscribers
  | "WATCHTIME"    // YouTube Watchtime
  | "STANDARD";    // Default (PUBG UC, MLBB Diamonds, etc.)

/**
 * Centralized game image mapping - single source of truth
 * All email templates and UI components should use this
 */
export const GAME_IMAGES: Record<GameCategory, string> = {
  PUBG: "https://b4uesports.com/wp-content/uploads/2025/10/pubgmoblielogob4uesports.webp",
  PUBGKR: "https://b4uesports.com/wp-content/uploads/2025/11/pubgkruc.png",
  MLBB: "https://b4uesports.com/wp-content/uploads/2025/10/mlbb-lgog.jpg",
  COC: "https://b4uesports.com/wp-content/uploads/2025/10/logo.985ee45d-removebg-preview.png",
  ROBUX: "https://b4uesports.com/wp-content/uploads/2025/12/1000019410-1.png",
  NEWSTATE: "https://b4uesports.com/wp-content/uploads/2025/12/1000020478-1.jpg",
  FREEFIRE: "https://b4uesports.com/wp-content/uploads/2025/12/1000020480.jpg",
  TIKTOK: "https://b4uesports.com/wp-content/uploads/2026/04/tiktokfollowers-removebg-preview.png",
  YOUTUBE: "https://b4uesports.com/wp-content/uploads/2025/04/1000077305.png",
  FACEBOOK: "https://b4uesports.com/wp-content/uploads/2026/04/facebooklogo.png",
  INSTAGRAM: "https://b4uesports.com/wp-content/uploads/2026/03/instagram-logo.jpg",
  NETFLIX: "https://b4uesports.com/wp-content/uploads/2026/04/netflix-logo-150x150-removebg-preview.png",
  CANVA: "https://b4uesports.com/wp-content/uploads/2026/04/canvanobackground-removebg-preview.png"
};

/**
 * Normalize database game values to standard categories
 * Handles legacy values and variations
 */
export function normalizeGameCategory(game: string): GameCategory {
  const normalized = game.toUpperCase().trim();
  
  // Direct matches
  if (normalized in GAME_IMAGES) {
    return normalized as GameCategory;
  }
  
  // Handle compound names (e.g., "TIKTOK_COINS" -> "TIKTOK")
  if (normalized.startsWith("TIKTOK")) return "TIKTOK";
  if (normalized.startsWith("YOUTUBE")) return "YOUTUBE";
  if (normalized.startsWith("FACEBOOK")) return "FACEBOOK";
  if (normalized.startsWith("INSTAGRAM")) return "INSTAGRAM";
  if (normalized.startsWith("NETFLIX")) return "NETFLIX";
  if (normalized.startsWith("CANVA")) return "CANVA";
  if (normalized === "PUBG KR" || normalized === "PUBG_KR") return "PUBGKR";
  if (normalized === "NEW STATE" || normalized === "NEW_STATE") return "NEWSTATE";
  if (normalized === "FREE FIRE" || normalized === "FREE_FIRE") return "FREEFIRE";
  
  // Fallback to PUBG if unknown (maintains backward compatibility)
  console.warn(`⚠️ Unknown game category: "${game}", defaulting to PUBG`);
  return "PUBG";
}

/**
 * Get image URL for a game category
 * Uses centralized mapping - no duplication
 */
export function getGameImage(game: string): string {
  const category = normalizeGameCategory(game);
  const imageUrl = GAME_IMAGES[category];
  
  // Debug logging for troubleshooting
  console.log('🎮 Email logo selection:', {
    originalGame: game,
    normalizedCategory: category,
    imageUrl: imageUrl,
    timestamp: new Date().toISOString()
  });
  
  return imageUrl;
}

export const users = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  piUID: text("pi_uid").notNull().unique(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  country: text("country").notNull().default("Bhutan"),
  language: text("language").notNull().default("en"),
  walletAddress: text("wallet_address"), // Make this nullable since wallet may not be connected yet
  walletVerifiedAt: timestamp("wallet_verified_at"),
  walletVerifiedPaymentId: text("wallet_verified_payment_id"),
  walletVerifiedTxid: text("wallet_verified_txid"),
  piBalance: text("pi_balance").default("0"), // Only for Pi native balance
  gameAccounts: jsonb("game_accounts").$type<{
    pubg?: { ign: string; uid: string };
    pubgkr?: { ign: string; uid: string };
    mlbb?: { userId: string; zoneId: string };
    coc?: { email: string };
    robux?: { email: string; whatsapp: string };
    newstate?: { email: string; whatsapp: string };
    freefire?: { playerId: string };
  }>(),
  socialAccounts: jsonb("social_accounts").$type<{
    tiktok?: { username?: string; email?: string; password?: string; link?: string; description?: string };
    youtube?: { channelUrl?: string; link?: string; email?: string; password?: string };
    facebook?: { profileUrl?: string; link?: string };
    instagram?: { username?: string; link?: string };
    netflix?: { email?: string; whatsapp?: string };
    canva?: { email?: string; whatsapp?: string };
  }>(),
  referralCode: text("referral_code"),
  referredBy: text("referred_by"), // New column to track who referred this user
  passphrase: text("passphrase"), // hashed passphrase for payment confirmation
  isActive: boolean("is_active").notNull().default(true),
  isProfileVerified: boolean("is_profile_verified").notNull().default(false),
  tokens: integer("tokens").notNull().default(0), // Add tokens field
  successfulPurchasesCount: integer("successful_purchases_count").default(0), // Track completed purchases (nullable for backward compatibility)
  lastRewardMilestone: integer("last_reward_milestone"), // Last milestone reached (5, 10, 15, 20)
  profilePicture: text("profile_picture"), // Profile picture URL
  totalSpent: decimal("total_spent", { precision: 18, scale: 8 }).default("0.00000000"), // Total amount spent in Pi tokens
  lastLogin: timestamp("last_login"), // Track when user last logged in
  lastDailyClaimAt: timestamp("last_daily_claim_at"), // Track when user last claimed daily login reward
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  roleId: varchar("role_id"), // References app_roles.id
});

export const packages = pgTable("app_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  game: text("game").notNull(), // Package platform/service category: game, social media, or subscription
  name: text("name").notNull(), // e.g., "660 UC", "571 Diamonds", "Gold Pass"
  inGameAmount: integer("in_game_amount").notNull(),
  usdtValue: decimal("usdt_value", { precision: 10, scale: 4 }).notNull(),
  image: text("image").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("app_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageId: varchar("package_id").references(() => packages.id), // Nullable for tournament entries
  paymentId: text("payment_id").notNull().unique(), // Pi Network payment ID
  txid: text("txid"), // blockchain transaction ID
  piAmount: decimal("pi_amount", { precision: 18, scale: 8 }).notNull(),
  usdAmount: decimal("usd_amount", { precision: 10, scale: 4 }).notNull(),
  piPriceAtTime: decimal("pi_price_at_time", { precision: 10, scale: 4 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, completed, failed, cancelled
  failureReason: text("failure_reason"), // Reason for failed or cancelled transactions
  successReason: text("success_reason"), // Reason for completed transactions
  gameAccount: jsonb("game_account").$type<{
    ign?: string;
    uid?: string;
    userId?: string;
    zoneId?: string;
    email?: string;
  }>().notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  emailSent: boolean("email_sent").notNull().default(false),
  adminEmailSent: boolean("admin_email_sent").notNull().default(false),
  // Payment type system fields
  paymentType: text("payment_type").default("TOKEN_PURCHASE"), // TOKEN_PURCHASE, TOURNAMENT_ENTRY, WALLET_TOPUP, SERVICE_PAYMENT, SUBSCRIPTION
  tournamentId: text("tournament_id"), // For tournament entries
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admins = pgTable("app_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // hashed password
  email: text("email").notNull(),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const piPriceHistory = pgTable("pi_price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  price: decimal("price", { precision: 10, scale: 4 }).notNull(),
  source: text("source").notNull().default("coingecko"),
  timestamp: timestamp("timestamp").defaultNow(),
});

  export const adminPurchaseLogs = pgTable("admin_purchase_logs", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    transactionId: varchar("transaction_id").notNull().references(() => transactions.id),
    userId: varchar("user_id").notNull().references(() => users.id),
    username: text("username").notNull(),
    userEmail: text("user_email").notNull(),
    packageName: text("package_name").notNull(),
    game: text("game").notNull(),
    piAmount: decimal("pi_amount", { precision: 18, scale: 8 }).notNull(),
    usdAmount: decimal("usd_amount", { precision: 10, scale: 4 }).notNull(),
    gameAccount: text("game_account"),
    paymentId: text("payment_id").notNull(),
    status: text("status").notNull().default("completed"),
    createdAt: timestamp("created_at").defaultNow(),
  });
export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  referredBy: text("referred_by"), // referral code of the user who referred this user
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add the new referral_rewards table
export const referralRewards = pgTable("referral_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id),
  tokensAwarded: integer("tokens_awarded").default(0),
  rewardStatus: text("reward_status").default("pending"), // 'pending', 'awarded'
  createdAt: timestamp("created_at").defaultNow(),
  awardedAt: timestamp("awarded_at"),
});

// Purchase rewards table for tracking milestone-based token rewards
export const purchaseRewards = pgTable("purchase_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  milestone: integer("milestone").notNull(), // 5, 10, 15, 20, or 21+
  tokensAwarded: integer("tokens_awarded").notNull(),
  calculationDetails: text("calculation_details").notNull(),
  transactionId: varchar("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leaderboard and ranking table
export const userRankings = pgTable("user_rankings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  rank: integer("rank").notNull().default(0), // Position on leaderboard (1, 2, 3, etc.)
  tier: text("tier").notNull().default("New"), // New, Bronze, Silver, Gold, VIP
  points: integer("points").notNull().default(0), // Total points from purchases, referrals, etc.
  purchasePoints: integer("purchase_points").notNull().default(0), // Points from purchases
  referralPoints: integer("referral_points").notNull().default(0), // Points from referrals
  streakDays: integer("streak_days").notNull().default(0), // Consecutive days active
  lastActivityDate: timestamp("last_activity_date"),
  monthlyPurchaseCount: integer("monthly_purchase_count").notNull().default(0), // Purchases this month
  monthlyPurchaseValue: decimal("monthly_purchase_value", { precision: 18, scale: 8 }).default("0"), // Total spent this month
  totalPoints: integer("total_points").notNull().default(0), // All-time points
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketingEmailSends = pgTable("marketing_email_sends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  campaignType: text("campaign_type").notNull(), // inactive_users / monthly_buyers
  campaignPeriod: text("campaign_period"), // e.g. 2026-04 or inactivity-2026-04-25
  subject: text("subject").notNull(),
  status: text("status").notNull().default("pending"), // pending / sent / failed / skipped
  openTrackingToken: text("open_tracking_token").notNull().unique(),
  clickTrackingToken: text("click_tracking_token").notNull().unique(),
  couponId: varchar("coupon_id"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  firstClickedAt: timestamp("first_clicked_at"),
  convertedAt: timestamp("converted_at"),
  conversionTransactionId: varchar("conversion_transaction_id").references(() => transactions.id),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketingCoupons = pgTable("marketing_coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  campaignType: text("campaign_type").notNull(),
  emailSendId: varchar("email_send_id").references(() => marketingEmailSends.id),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("2.00"),
  bonusTokens: integer("bonus_tokens").notNull().default(500),
  status: text("status").notNull().default("active"), // active / used / expired / cancelled
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  usedByTransactionId: varchar("used_by_transaction_id").references(() => transactions.id),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketingEmailEvents = pgTable("marketing_email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailSendId: varchar("email_send_id").notNull().references(() => marketingEmailSends.id),
  eventType: text("event_type").notNull(), // open / click
  token: text("token").notNull(),
  targetUrl: text("target_url"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament ecosystem tables
export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  game: text("game").notNull(),
  mode: text("mode").notNull(), // solo / duo / squad
  format: text("format").notNull().default("elimination"), // elimination / round_robin / swiss
  skillLevel: text("skill_level").notNull().default("open"), // beginner / intermediate / advanced / pro / open
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  status: text("status").notNull().default("draft"), // draft / published / registration_open / in_progress / completed / cancelled
  visibility: text("visibility").notNull().default("public"), // public / private / invite_only
  maxParticipants: integer("max_participants").notNull(),
  minParticipants: integer("min_participants").notNull().default(2),
  teamSize: integer("team_size").notNull().default(1),
  registrationFeePi: decimal("registration_fee_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  prizePoolPi: decimal("prize_pool_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  currency: text("currency").notNull().default("PI"),
  rules: text("rules"),
  region: text("region").notNull().default("global"),
  platform: text("platform").notNull().default("mobile"),
  roomSettings: jsonb("room_settings").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  streamSettings: jsonb("stream_settings").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  registrationOpensAt: timestamp("registration_opens_at"),
  registrationClosesAt: timestamp("registration_closes_at"),
  checkInOpensAt: timestamp("check_in_opens_at"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  statusIdx: index("idx_tournaments_status").on(table.status),
  gameIdx: index("idx_tournaments_game").on(table.game),
  startsAtIdx: index("idx_tournaments_starts_at").on(table.startsAt),
}));

export const tournamentPrizeDistributions = pgTable("tournament_prize_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  rank: integer("rank").notNull(),
  prizePi: decimal("prize_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  prizePercent: decimal("prize_percent", { precision: 6, scale: 3 }),
  bonusTokens: integer("bonus_tokens").notNull().default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tournamentRankIdx: uniqueIndex("idx_tournament_prizes_tournament_rank").on(table.tournamentId, table.rank),
}));

export const tournamentTeams = pgTable("tournament_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  name: text("name").notNull(),
  captainUserId: varchar("captain_user_id").notNull().references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("forming"), // forming / complete / checked_in / disqualified
  seed: integer("seed"),
  averageElo: integer("average_elo").notNull().default(1000),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tournamentIdx: index("idx_tournament_teams_tournament").on(table.tournamentId),
  captainIdx: index("idx_tournament_teams_captain").on(table.captainUserId),
}));

export const tournamentTeamMembers = pgTable("tournament_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => tournamentTeams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("member"), // captain / member / substitute
  status: text("status").notNull().default("active"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  teamUserIdx: uniqueIndex("idx_tournament_team_members_team_user").on(table.teamId, table.userId),
  userIdx: index("idx_tournament_team_members_user").on(table.userId),
}));

export const tournamentRegistrations = pgTable("tournament_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  status: text("status").notNull().default("pending_payment"), // pending_payment / registered / waitlisted / cancelled / refunded / disqualified
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid / paid / refunded / waived
  paymentId: text("payment_id"),
  transactionId: varchar("transaction_id").references(() => transactions.id),
  paidAmountPi: decimal("paid_amount_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  registeredAt: timestamp("registered_at").defaultNow(),
  cancelledAt: timestamp("cancelled_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  tournamentUserIdx: uniqueIndex("idx_tournament_registrations_tournament_user").on(table.tournamentId, table.userId),
  statusIdx: index("idx_tournament_registrations_status").on(table.status),
  teamIdx: index("idx_tournament_registrations_team").on(table.teamId),
}));

export const tournamentPayments = pgTable("tournament_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  registrationId: varchar("registration_id").references(() => tournamentRegistrations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  paymentId: text("payment_id").notNull().unique(),
  txid: text("txid"),
  amountPi: decimal("amount_pi", { precision: 18, scale: 8 }).notNull(),
  status: text("status").notNull().default("pending"), // pending / approved / completed / failed / cancelled / refunded
  purpose: text("purpose").notNull().default("registration_fee"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tournamentIdx: index("idx_tournament_payments_tournament").on(table.tournamentId),
  userIdx: index("idx_tournament_payments_user").on(table.userId),
}));

export const tournamentRefunds = pgTable("tournament_refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().references(() => tournamentPayments.id),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  amountPi: decimal("amount_pi", { precision: 18, scale: 8 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending / completed / failed
  processedAt: timestamp("processed_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentCheckIns = pgTable("tournament_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  status: text("status").notNull().default("checked_in"),
  checkedInAt: timestamp("checked_in_at").defaultNow(),
  deviceInfo: jsonb("device_info").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  tournamentUserIdx: uniqueIndex("idx_tournament_check_ins_tournament_user").on(table.tournamentId, table.userId),
}));

export const tournamentLobbies = pgTable("tournament_lobbies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  matchId: varchar("match_id"),
  name: text("name").notNull(),
  mapName: text("map_name"),
  roomCode: text("room_code"),
  roomPassword: text("room_password"),
  status: text("status").notNull().default("waiting"), // waiting / open / locked / completed
  capacity: integer("capacity").notNull().default(100),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tournamentIdx: index("idx_tournament_lobbies_tournament").on(table.tournamentId),
}));

export const tournamentMatches = pgTable("tournament_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  lobbyId: varchar("lobby_id").references(() => tournamentLobbies.id),
  round: integer("round").notNull().default(1),
  matchNumber: integer("match_number").notNull().default(1),
  status: text("status").notNull().default("scheduled"), // scheduled / live / completed / disputed / cancelled
  roomCode: text("room_code"),
  roomPassword: text("room_password"),
  mapName: text("map_name"),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  streamUrl: text("stream_url"),
  vodUrl: text("vod_url"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tournamentRoundIdx: index("idx_tournament_matches_tournament_round").on(table.tournamentId, table.round),
  statusIdx: index("idx_tournament_matches_status").on(table.status),
}));

export const tournamentMatchParticipants = pgTable("tournament_match_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => tournamentMatches.id),
  registrationId: varchar("registration_id").references(() => tournamentRegistrations.id),
  userId: varchar("user_id").references(() => users.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  slotNumber: integer("slot_number"),
  status: text("status").notNull().default("scheduled"), // scheduled / ready / playing / eliminated / advanced
  joinedAt: timestamp("joined_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  matchIdx: index("idx_tournament_match_participants_match").on(table.matchId),
  userIdx: index("idx_tournament_match_participants_user").on(table.userId),
  teamIdx: index("idx_tournament_match_participants_team").on(table.teamId),
}));

export const tournamentMatchResults = pgTable("tournament_match_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => tournamentMatches.id),
  participantId: varchar("participant_id").references(() => tournamentMatchParticipants.id),
  userId: varchar("user_id").references(() => users.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  placement: integer("placement"),
  kills: integer("kills").notNull().default(0),
  wwcd: integer("wwcd").notNull().default(0),
  placementPoints: integer("placement_points").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  deaths: integer("deaths").notNull().default(0),
  damage: integer("damage").notNull().default(0),
  score: integer("score").notNull().default(0),
  prizePi: decimal("prize_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  pointsAwarded: integer("points_awarded").notNull().default(0),
  evidenceUrl: text("evidence_url"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  matchIdx: index("idx_tournament_match_results_match").on(table.matchId),
  userIdx: index("idx_tournament_match_results_user").on(table.userId),
  teamIdx: index("idx_tournament_match_results_team").on(table.teamId),
}));

export const tournamentLeaderboards = pgTable("tournament_leaderboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  userId: varchar("user_id").references(() => users.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  rank: integer("rank").notNull(),
  totalPoints: integer("total_points").notNull().default(0),
  totalKills: integer("total_kills").notNull().default(0),
  matchesPlayed: integer("matches_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  wwcdCount: integer("wwcd_count").notNull().default(0),
  prizePi: decimal("prize_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  prizeStatus: text("prize_status").notNull().default("not_awarded"), // not_awarded / pending / paid
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tournamentRankIdx: uniqueIndex("idx_tournament_leaderboards_tournament_rank").on(table.tournamentId, table.rank),
  userIdx: index("idx_tournament_leaderboards_user").on(table.userId),
  teamIdx: index("idx_tournament_leaderboards_team").on(table.teamId),
}));

export const globalRankings = pgTable("global_rankings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  elo: integer("elo").notNull().default(1000),
  rank: integer("rank").notNull().default(0),
  tier: text("tier").notNull().default("Bronze"),
  tournamentsPlayed: integer("tournaments_played").notNull().default(0),
  tournamentWins: integer("tournament_wins").notNull().default(0),
  topThreeFinishes: integer("top_three_finishes").notNull().default(0),
  totalPrizePi: decimal("total_prize_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  totalKills: integer("total_kills").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  lastTournamentAt: timestamp("last_tournament_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eloIdx: index("idx_global_rankings_elo").on(table.elo),
  rankIdx: index("idx_global_rankings_rank").on(table.rank),
}));

export const tournamentStreams = pgTable("tournament_streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  matchId: varchar("match_id").references(() => tournamentMatches.id),
  platform: text("platform").notNull(), // youtube / twitch / facebook / discord
  streamUrl: text("stream_url").notNull(),
  embedUrl: text("embed_url"),
  status: text("status").notNull().default("scheduled"),
  startsAt: timestamp("starts_at"),
  endedAt: timestamp("ended_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentMedia = pgTable("tournament_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  matchId: varchar("match_id").references(() => tournamentMatches.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  mediaType: text("media_type").notNull(), // highlight / recording / screenshot / thumbnail
  title: text("title").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
});

// `tournament_chat_messages` table removed — chat feature disabled

export const tournamentNotifications = pgTable("tournament_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").references(() => tournaments.id),
  userId: varchar("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info / reminder / match_ready / prize / payment
  status: text("status").notNull().default("unread"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_tournament_notifications_user").on(table.userId),
  tournamentIdx: index("idx_tournament_notifications_tournament").on(table.tournamentId),
}));

export const tournamentInvites = pgTable("tournament_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  invitedUserId: varchar("invited_user_id").references(() => users.id),
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id),
  inviteCode: text("invite_code").notNull(),
  status: text("status").notNull().default("pending"), // pending / accepted / declined / expired
  expiresAt: timestamp("expires_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  codeIdx: index("idx_tournament_invites_code").on(table.inviteCode),
  invitedUserIdx: index("idx_tournament_invites_invited_user").on(table.invitedUserId),
}));

export const tournamentAnalytics = pgTable("tournament_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  totalRegistrations: integer("total_registrations").notNull().default(0),
  paidRegistrations: integer("paid_registrations").notNull().default(0),
  checkedInParticipants: integer("checked_in_participants").notNull().default(0),
  totalMatches: integer("total_matches").notNull().default(0),
  completedMatches: integer("completed_matches").notNull().default(0),
  totalPrizePaidPi: decimal("total_prize_paid_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  totalFeesCollectedPi: decimal("total_fees_collected_pi", { precision: 18, scale: 8 }).notNull().default("0"),
  averageViewers: integer("average_viewers").notNull().default(0),
  peakViewers: integer("peak_viewers").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tournamentIdx: uniqueIndex("idx_tournament_analytics_tournament").on(table.tournamentId),
}));

export const tournamentRosterPlayers = pgTable("tournament_roster_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  teamId: varchar("team_id").notNull().references(() => tournamentTeams.id),
  slotNumber: integer("slot_number").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  pubgIgn: text("pubg_ign").notNull(),
  pubgUid: text("pubg_uid").notNull(),
  mugshotUrl: text("mugshot_url"),
  isCaptain: boolean("is_captain").notNull().default(false),
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  teamSlotIdx: uniqueIndex("idx_tournament_roster_players_team_slot").on(table.teamId, table.slotNumber),
  pubgUidIdx: index("idx_tournament_roster_players_pubg_uid").on(table.pubgUid),
}));

export const tournamentMatchRooms = pgTable("tournament_match_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  matchId: varchar("match_id").references(() => tournamentMatches.id),
  matchNumber: integer("match_number").notNull(),
  mapName: text("map_name").notNull(),
  roomId: text("room_id"),
  roomPassword: text("room_password"),
  leaderCode: text("leader_code").notNull(),
  status: text("status").notNull().default("secret"), // secret / revealed / completed / removed
  revealAt: timestamp("reveal_at"),
  startsAt: timestamp("starts_at"),
  completedAt: timestamp("completed_at"),
  credentialsRemovedAt: timestamp("credentials_removed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tournamentMatchNumberIdx: uniqueIndex("idx_tournament_match_rooms_tournament_number").on(table.tournamentId, table.matchNumber),
  leaderCodeIdx: index("idx_tournament_match_rooms_leader_code").on(table.leaderCode),
}));

export const tournamentRoomAccessLogs = pgTable("tournament_room_access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => tournamentMatchRooms.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  userId: varchar("user_id").references(() => users.id),
  leaderCodeUsed: text("leader_code_used").notNull(),
  accessStatus: text("access_status").notNull().default("granted"), // granted / denied
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  roomIdx: index("idx_tournament_room_access_logs_room").on(table.roomId),
}));

export const tournamentScoringRules = pgTable("tournament_scoring_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  placement: integer("placement").notNull(),
  placementPoints: integer("placement_points").notNull().default(0),
  killPoints: integer("kill_points").notNull().default(1),
  mvpBonusPoints: integer("mvp_bonus_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tournamentPlacementIdx: uniqueIndex("idx_tournament_scoring_rules_tournament_placement").on(table.tournamentId, table.placement),
}));

export const tournamentMvpAwards = pgTable("tournament_mvp_awards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  matchId: varchar("match_id").references(() => tournamentMatches.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  playerRosterId: varchar("player_roster_id").references(() => tournamentRosterPlayers.id),
  awardReason: text("award_reason").notNull(),
  kills: integer("kills").notNull().default(0),
  placement: integer("placement"),
  bonusPoints: integer("bonus_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentHistory = pgTable("tournament_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  eventType: text("event_type").notNull(), // registration / match_scheduled / room_revealed / match_completed / result_posted / prize_paid
  title: text("title").notNull(),
  description: text("description").notNull(),
  actorUserId: varchar("actor_user_id").references(() => users.id),
  teamId: varchar("team_id").references(() => tournamentTeams.id),
  matchId: varchar("match_id").references(() => tournamentMatches.id),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tournamentIdx: index("idx_tournament_history_tournament").on(table.tournamentId),
}));

// PiRC2 Subscription Tables
export const piSubscriptions = pgTable("pi_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  packageId: varchar("package_id").references(() => packages.id), // Optional - can be null for custom subscriptions
  subId: text("sub_id").notNull().unique(), // Soroban subscription ID or backend generated
  autoRenew: boolean("auto_renew").notNull().default(true),
  status: text("status").notNull().default("active"), // active, cancelled, expired, failing
  expiresAt: timestamp("expires_at").notNull(),
  lastProcessedAt: timestamp("last_processed_at"),
  // User Details for Tournament/Subscription
  userName: text("user_name"), // Full name
  userEmail: text("user_email"), // Email
  userPhone: text("user_phone"), // Contact number
  userGameIgn: text("user_game_ign"), // Game IGN (e.g., PUBG IGN)
  userGameUid: text("user_game_uid"), // Game UID (e.g., PUBG UID)
  userTeamName: text("user_team_name"), // Team name for tournament subscriptions
  subscriptionType: text("subscription_type"), // weekly, monthly, lifetime
  subscriptionName: text("subscription_name"),
  subscriptionDuration: text("subscription_duration"),
  amountPi: decimal("amount_pi", { precision: 18, scale: 8 }), // Amount paid in Pi for this subscription
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  messages: many(messages),
  transactions: many(transactions),
  marketingEmailSends: many(marketingEmailSends),
  marketingCoupons: many(marketingCoupons),
  tournamentRegistrations: many(tournamentRegistrations),
  tournamentTeamsCaptained: many(tournamentTeams),
  tournamentTeamMemberships: many(tournamentTeamMembers),
  tournamentCheckIns: many(tournamentCheckIns),
  tournamentNotifications: many(tournamentNotifications),
  piSubscriptions: many(piSubscriptions),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  package: one(packages, {
    fields: [transactions.packageId],
    references: [packages.id],
  }),
}));

export const marketingEmailSendsRelations = relations(marketingEmailSends, ({ one, many }) => ({
  user: one(users, {
    fields: [marketingEmailSends.userId],
    references: [users.id],
  }),
  coupon: one(marketingCoupons, {
    fields: [marketingEmailSends.couponId],
    references: [marketingCoupons.id],
  }),
  conversionTransaction: one(transactions, {
    fields: [marketingEmailSends.conversionTransactionId],
    references: [transactions.id],
  }),
  events: many(marketingEmailEvents),
}));

export const marketingCouponsRelations = relations(marketingCoupons, ({ one }) => ({
  user: one(users, {
    fields: [marketingCoupons.userId],
    references: [users.id],
  }),
  emailSend: one(marketingEmailSends, {
    fields: [marketingCoupons.emailSendId],
    references: [marketingEmailSends.id],
  }),
  usedByTransaction: one(transactions, {
    fields: [marketingCoupons.usedByTransactionId],
    references: [transactions.id],
  }),
}));

export const marketingEmailEventsRelations = relations(marketingEmailEvents, ({ one }) => ({
  emailSend: one(marketingEmailSends, {
    fields: [marketingEmailEvents.emailSendId],
    references: [marketingEmailSends.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  creator: one(users, {
    fields: [tournaments.createdBy],
    references: [users.id],
  }),
  prizeDistributions: many(tournamentPrizeDistributions),
  teams: many(tournamentTeams),
  registrations: many(tournamentRegistrations),
  payments: many(tournamentPayments),
  checkIns: many(tournamentCheckIns),
  lobbies: many(tournamentLobbies),
  matches: many(tournamentMatches),
  leaderboard: many(tournamentLeaderboards),
  streams: many(tournamentStreams),
  media: many(tournamentMedia),
  // chatMessages removed — tournament chat feature disabled
  notifications: many(tournamentNotifications),
  rosterPlayers: many(tournamentRosterPlayers),
  matchRooms: many(tournamentMatchRooms),
  scoringRules: many(tournamentScoringRules),
  mvpAwards: many(tournamentMvpAwards),
  history: many(tournamentHistory),
}));

export const tournamentPrizeDistributionsRelations = relations(tournamentPrizeDistributions, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentPrizeDistributions.tournamentId],
    references: [tournaments.id],
  }),
}));

export const tournamentTeamsRelations = relations(tournamentTeams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentTeams.tournamentId],
    references: [tournaments.id],
  }),
  captain: one(users, {
    fields: [tournamentTeams.captainUserId],
    references: [users.id],
  }),
  members: many(tournamentTeamMembers),
  registrations: many(tournamentRegistrations),
  rosterPlayers: many(tournamentRosterPlayers),
}));

export const tournamentTeamMembersRelations = relations(tournamentTeamMembers, ({ one }) => ({
  team: one(tournamentTeams, {
    fields: [tournamentTeamMembers.teamId],
    references: [tournamentTeams.id],
  }),
  user: one(users, {
    fields: [tournamentTeamMembers.userId],
    references: [users.id],
  }),
}));

export const tournamentRegistrationsRelations = relations(tournamentRegistrations, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentRegistrations.tournamentId],
    references: [tournaments.id],
  }),
  user: one(users, {
    fields: [tournamentRegistrations.userId],
    references: [users.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentRegistrations.teamId],
    references: [tournamentTeams.id],
  }),
  transaction: one(transactions, {
    fields: [tournamentRegistrations.transactionId],
    references: [transactions.id],
  }),
}));

export const tournamentPaymentsRelations = relations(tournamentPayments, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentPayments.tournamentId],
    references: [tournaments.id],
  }),
  registration: one(tournamentRegistrations, {
    fields: [tournamentPayments.registrationId],
    references: [tournamentRegistrations.id],
  }),
  user: one(users, {
    fields: [tournamentPayments.userId],
    references: [users.id],
  }),
  refunds: many(tournamentRefunds),
}));

export const tournamentRefundsRelations = relations(tournamentRefunds, ({ one }) => ({
  payment: one(tournamentPayments, {
    fields: [tournamentRefunds.paymentId],
    references: [tournamentPayments.id],
  }),
  tournament: one(tournaments, {
    fields: [tournamentRefunds.tournamentId],
    references: [tournaments.id],
  }),
  user: one(users, {
    fields: [tournamentRefunds.userId],
    references: [users.id],
  }),
}));

export const tournamentCheckInsRelations = relations(tournamentCheckIns, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentCheckIns.tournamentId],
    references: [tournaments.id],
  }),
  user: one(users, {
    fields: [tournamentCheckIns.userId],
    references: [users.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentCheckIns.teamId],
    references: [tournamentTeams.id],
  }),
}));

export const tournamentLobbiesRelations = relations(tournamentLobbies, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentLobbies.tournamentId],
    references: [tournaments.id],
  }),
  matches: many(tournamentMatches),
}));

export const tournamentMatchesRelations = relations(tournamentMatches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentMatches.tournamentId],
    references: [tournaments.id],
  }),
  lobby: one(tournamentLobbies, {
    fields: [tournamentMatches.lobbyId],
    references: [tournamentLobbies.id],
  }),
  participants: many(tournamentMatchParticipants),
  results: many(tournamentMatchResults),
}));

export const tournamentMatchParticipantsRelations = relations(tournamentMatchParticipants, ({ one, many }) => ({
  match: one(tournamentMatches, {
    fields: [tournamentMatchParticipants.matchId],
    references: [tournamentMatches.id],
  }),
  registration: one(tournamentRegistrations, {
    fields: [tournamentMatchParticipants.registrationId],
    references: [tournamentRegistrations.id],
  }),
  user: one(users, {
    fields: [tournamentMatchParticipants.userId],
    references: [users.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentMatchParticipants.teamId],
    references: [tournamentTeams.id],
  }),
  results: many(tournamentMatchResults),
}));

export const tournamentMatchResultsRelations = relations(tournamentMatchResults, ({ one }) => ({
  match: one(tournamentMatches, {
    fields: [tournamentMatchResults.matchId],
    references: [tournamentMatches.id],
  }),
  participant: one(tournamentMatchParticipants, {
    fields: [tournamentMatchResults.participantId],
    references: [tournamentMatchParticipants.id],
  }),
  user: one(users, {
    fields: [tournamentMatchResults.userId],
    references: [users.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentMatchResults.teamId],
    references: [tournamentTeams.id],
  }),
}));

export const tournamentLeaderboardsRelations = relations(tournamentLeaderboards, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentLeaderboards.tournamentId],
    references: [tournaments.id],
  }),
  user: one(users, {
    fields: [tournamentLeaderboards.userId],
    references: [users.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentLeaderboards.teamId],
    references: [tournamentTeams.id],
  }),
}));

export const globalRankingsRelations = relations(globalRankings, ({ one }) => ({
  user: one(users, {
    fields: [globalRankings.userId],
    references: [users.id],
  }),
}));

export const tournamentNotificationsRelations = relations(tournamentNotifications, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentNotifications.tournamentId],
    references: [tournaments.id],
  }),
  user: one(users, {
    fields: [tournamentNotifications.userId],
    references: [users.id],
  }),
}));

export const tournamentRosterPlayersRelations = relations(tournamentRosterPlayers, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentRosterPlayers.tournamentId],
    references: [tournaments.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentRosterPlayers.teamId],
    references: [tournamentTeams.id],
  }),
}));

export const tournamentMatchRoomsRelations = relations(tournamentMatchRooms, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentMatchRooms.tournamentId],
    references: [tournaments.id],
  }),
  match: one(tournamentMatches, {
    fields: [tournamentMatchRooms.matchId],
    references: [tournamentMatches.id],
  }),
  accessLogs: many(tournamentRoomAccessLogs),
}));

export const tournamentRoomAccessLogsRelations = relations(tournamentRoomAccessLogs, ({ one }) => ({
  room: one(tournamentMatchRooms, {
    fields: [tournamentRoomAccessLogs.roomId],
    references: [tournamentMatchRooms.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentRoomAccessLogs.teamId],
    references: [tournamentTeams.id],
  }),
  user: one(users, {
    fields: [tournamentRoomAccessLogs.userId],
    references: [users.id],
  }),
}));

export const tournamentScoringRulesRelations = relations(tournamentScoringRules, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentScoringRules.tournamentId],
    references: [tournaments.id],
  }),
}));

export const tournamentMvpAwardsRelations = relations(tournamentMvpAwards, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentMvpAwards.tournamentId],
    references: [tournaments.id],
  }),
  match: one(tournamentMatches, {
    fields: [tournamentMvpAwards.matchId],
    references: [tournamentMatches.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentMvpAwards.teamId],
    references: [tournamentTeams.id],
  }),
  player: one(tournamentRosterPlayers, {
    fields: [tournamentMvpAwards.playerRosterId],
    references: [tournamentRosterPlayers.id],
  }),
}));

export const tournamentHistoryRelations = relations(tournamentHistory, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [tournamentHistory.tournamentId],
    references: [tournaments.id],
  }),
  actor: one(users, {
    fields: [tournamentHistory.actorUserId],
    references: [users.id],
  }),
  team: one(tournamentTeams, {
    fields: [tournamentHistory.teamId],
    references: [tournamentTeams.id],
  }),
  match: one(tournamentMatches, {
    fields: [tournamentHistory.matchId],
    references: [tournamentMatches.id],
  }),
}));

export const referralCodesRelations = relations(referralCodes, ({ one }) => ({
  user: one(users, {
    fields: [referralCodes.userId],
    references: [users.id],
  }),
}));

// Add relations for referralRewards
export const referralRewardsRelations = relations(referralRewards, ({ one }) => ({
  referrer: one(users, {
    fields: [referralRewards.referrerId],
    references: [users.id],
  }),
  referredUser: one(users, {
    fields: [referralRewards.referredUserId],
    references: [users.id],
  }),
}));

// Add relations for purchaseRewards
export const purchaseRewardsRelations = relations(purchaseRewards, ({ one }) => ({
  user: one(users, {
    fields: [purchaseRewards.userId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [purchaseRewards.transactionId],
    references: [transactions.id],
  }),
}));

// Add relations for userRankings
export const userRankingsRelations = relations(userRankings, ({ one }) => ({
  user: one(users, {
    fields: [userRankings.userId],
    references: [users.id],
  }),
}));

// `chat_messages` table removed — chat feature disabled

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true as const,
  createdAt: true as const,
  lastLogin: true as const,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTournamentPrizeDistributionSchema = createInsertSchema(tournamentPrizeDistributions).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertTournamentTeamSchema = createInsertSchema(tournamentTeams).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTournamentTeamMemberSchema = createInsertSchema(tournamentTeamMembers).omit({
  id: true as const,
  joinedAt: true as const,
});

export const insertTournamentRegistrationSchema = createInsertSchema(tournamentRegistrations).omit({
  id: true as const,
  registeredAt: true as const,
  cancelledAt: true as const,
});

export const insertTournamentPaymentSchema = createInsertSchema(tournamentPayments).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTournamentRefundSchema = createInsertSchema(tournamentRefunds).omit({
  id: true as const,
  createdAt: true as const,
  processedAt: true as const,
});

export const insertTournamentCheckInSchema = createInsertSchema(tournamentCheckIns).omit({
  id: true as const,
  checkedInAt: true as const,
});

export const insertTournamentLobbySchema = createInsertSchema(tournamentLobbies).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTournamentMatchSchema = createInsertSchema(tournamentMatches).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTournamentMatchParticipantSchema = createInsertSchema(tournamentMatchParticipants).omit({
  id: true as const,
});

export const insertTournamentMatchResultSchema = createInsertSchema(tournamentMatchResults).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertTournamentLeaderboardSchema = createInsertSchema(tournamentLeaderboards).omit({
  id: true as const,
  updatedAt: true as const,
});

export const insertGlobalRankingSchema = createInsertSchema(globalRankings).omit({
  id: true as const,
  updatedAt: true as const,
});

export const insertTournamentStreamSchema = createInsertSchema(tournamentStreams).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertTournamentMediaSchema = createInsertSchema(tournamentMedia).omit({
  id: true as const,
  createdAt: true as const,
});

// Tournament chat schema removed — chat feature disabled

export const insertTournamentNotificationSchema = createInsertSchema(tournamentNotifications).omit({
  id: true as const,
  readAt: true as const,
  createdAt: true as const,
});

export const insertTournamentInviteSchema = createInsertSchema(tournamentInvites).omit({
  id: true as const,
  respondedAt: true as const,
  createdAt: true as const,
});

export const insertTournamentAnalyticsSchema = createInsertSchema(tournamentAnalytics).omit({
  id: true as const,
  updatedAt: true as const,
});

export const insertTournamentRosterPlayerSchema = createInsertSchema(tournamentRosterPlayers).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertTournamentMatchRoomSchema = createInsertSchema(tournamentMatchRooms).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertTournamentRoomAccessLogSchema = createInsertSchema(tournamentRoomAccessLogs).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertTournamentScoringRuleSchema = createInsertSchema(tournamentScoringRules).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertTournamentMvpAwardSchema = createInsertSchema(tournamentMvpAwards).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertTournamentHistorySchema = createInsertSchema(tournamentHistory).omit({
  id: true as const,
  createdAt: true as const,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type PiPriceHistory = typeof piPriceHistory.$inferSelect;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralReward = typeof referralRewards.$inferSelect;
export type InsertReferralReward = z.infer<typeof insertReferralRewardSchema>;
export type PurchaseReward = typeof purchaseRewards.$inferSelect;
export type InsertPurchaseReward = z.infer<typeof insertPurchaseRewardSchema>;
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type TournamentPrizeDistribution = typeof tournamentPrizeDistributions.$inferSelect;
export type InsertTournamentPrizeDistribution = z.infer<typeof insertTournamentPrizeDistributionSchema>;
export type TournamentTeam = typeof tournamentTeams.$inferSelect;
export type InsertTournamentTeam = z.infer<typeof insertTournamentTeamSchema>;
export type TournamentTeamMember = typeof tournamentTeamMembers.$inferSelect;
export type InsertTournamentTeamMember = z.infer<typeof insertTournamentTeamMemberSchema>;
export type TournamentRegistration = typeof tournamentRegistrations.$inferSelect;
export type InsertTournamentRegistration = z.infer<typeof insertTournamentRegistrationSchema>;
export type TournamentPayment = typeof tournamentPayments.$inferSelect;
export type InsertTournamentPayment = z.infer<typeof insertTournamentPaymentSchema>;
export type TournamentRefund = typeof tournamentRefunds.$inferSelect;
export type InsertTournamentRefund = z.infer<typeof insertTournamentRefundSchema>;
export type TournamentCheckIn = typeof tournamentCheckIns.$inferSelect;
export type InsertTournamentCheckIn = z.infer<typeof insertTournamentCheckInSchema>;
export type TournamentLobby = typeof tournamentLobbies.$inferSelect;
export type InsertTournamentLobby = z.infer<typeof insertTournamentLobbySchema>;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type InsertTournamentMatch = z.infer<typeof insertTournamentMatchSchema>;
export type TournamentMatchParticipant = typeof tournamentMatchParticipants.$inferSelect;
export type InsertTournamentMatchParticipant = z.infer<typeof insertTournamentMatchParticipantSchema>;
export type TournamentMatchResult = typeof tournamentMatchResults.$inferSelect;
export type InsertTournamentMatchResult = z.infer<typeof insertTournamentMatchResultSchema>;
export type TournamentLeaderboard = typeof tournamentLeaderboards.$inferSelect;
export type InsertTournamentLeaderboard = z.infer<typeof insertTournamentLeaderboardSchema>;
export type GlobalRanking = typeof globalRankings.$inferSelect;
export type InsertGlobalRanking = z.infer<typeof insertGlobalRankingSchema>;
export type TournamentStream = typeof tournamentStreams.$inferSelect;
export type InsertTournamentStream = z.infer<typeof insertTournamentStreamSchema>;
export type TournamentMedia = typeof tournamentMedia.$inferSelect;
export type InsertTournamentMedia = z.infer<typeof insertTournamentMediaSchema>;
// Tournament chat types removed — chat feature disabled
export type TournamentNotification = typeof tournamentNotifications.$inferSelect;
export type InsertTournamentNotification = z.infer<typeof insertTournamentNotificationSchema>;
export type TournamentInvite = typeof tournamentInvites.$inferSelect;
export type InsertTournamentInvite = z.infer<typeof insertTournamentInviteSchema>;
export type TournamentAnalytics = typeof tournamentAnalytics.$inferSelect;
export type InsertTournamentAnalytics = z.infer<typeof insertTournamentAnalyticsSchema>;
export type TournamentRosterPlayer = typeof tournamentRosterPlayers.$inferSelect;
export type InsertTournamentRosterPlayer = z.infer<typeof insertTournamentRosterPlayerSchema>;
export type TournamentMatchRoom = typeof tournamentMatchRooms.$inferSelect;
export type InsertTournamentMatchRoom = z.infer<typeof insertTournamentMatchRoomSchema>;
export type TournamentRoomAccessLog = typeof tournamentRoomAccessLogs.$inferSelect;
export type InsertTournamentRoomAccessLog = z.infer<typeof insertTournamentRoomAccessLogSchema>;
export type TournamentScoringRule = typeof tournamentScoringRules.$inferSelect;
export type InsertTournamentScoringRule = z.infer<typeof insertTournamentScoringRuleSchema>;
export type TournamentMvpAward = typeof tournamentMvpAwards.$inferSelect;
export type InsertTournamentMvpAward = z.infer<typeof insertTournamentMvpAwardSchema>;
export type TournamentHistory = typeof tournamentHistory.$inferSelect;
export type InsertTournamentHistory = z.infer<typeof insertTournamentHistorySchema>;

export const insertPiSubscriptionSchema = createInsertSchema(piSubscriptions).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export type PiSubscription = typeof piSubscriptions.$inferSelect;
export type InsertPiSubscription = z.infer<typeof insertPiSubscriptionSchema>;
export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true as const,
  createdAt: true as const,
  updatedAt: true as const,
});

export const insertReferralRewardSchema = createInsertSchema(referralRewards).omit({
  id: true as const,
  createdAt: true as const,
  awardedAt: true as const,
});

export const insertPurchaseRewardSchema = createInsertSchema(purchaseRewards).omit({
  id: true as const,
  createdAt: true as const,
});

// `insertChatMessageSchema` removed — chat feature disabled

export const insertMarketingEmailSendSchema = createInsertSchema(marketingEmailSends).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertMarketingCouponSchema = createInsertSchema(marketingCoupons).omit({
  id: true as const,
  createdAt: true as const,
});

export const insertMarketingEmailEventSchema = createInsertSchema(marketingEmailEvents).omit({
  id: true as const,
  createdAt: true as const,
});

// Types
// Chat message types removed — chat feature disabled
export type MarketingEmailSend = typeof marketingEmailSends.$inferSelect;
export type InsertMarketingEmailSend = z.infer<typeof insertMarketingEmailSendSchema>;
export type MarketingCoupon = typeof marketingCoupons.$inferSelect;
export type InsertMarketingCoupon = z.infer<typeof insertMarketingCouponSchema>;
export type MarketingEmailEvent = typeof marketingEmailEvents.$inferSelect;
export type InsertMarketingEmailEvent = z.infer<typeof insertMarketingEmailEventSchema>;


export const appNotifications = pgTable("app_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // purchase, tournament, system, etc.
  status: text("status").notNull().default("unread"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("idx_app_notifications_user").on(table.userId),
}));

export const appNotificationsRelations = relations(appNotifications, ({ one }) => ({
  user: one(users, {
    fields: [appNotifications.userId],
    references: [users.id],
  }),
}));

export const insertAppNotificationSchema = createInsertSchema(appNotifications).omit({
  id: true,
  readAt: true,
  createdAt: true,
});
export type AppNotification = typeof appNotifications.$inferSelect;
export type InsertAppNotification = z.infer<typeof insertAppNotificationSchema>;

// ============================================
// B4UT REWARD ECOSYSTEM & TREASURY SYSTEM
// ============================================

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(), // e.g., 'b4ut_pi_exchange_rate'
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tokenTransactions = pgTable("token_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // positive for earned/minted, negative for burned/spent
  type: varchar("type", { length: 50 }).notNull(), // 'purchase_reward', 'cashback', 'redemption', 'referral', 'admin_adjustment'
  description: text("description"),
  referenceId: varchar("reference_id"), // links to transaction_id or redemption_id
  createdAt: timestamp("created_at").defaultNow(),
});

export const redemptionRequests = pgTable("redemption_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  b4utAmount: integer("b4ut_amount").notNull(),
  piAmount: decimal("pi_amount", { precision: 10, scale: 4 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'approved', 'rejected', 'completed'
  piUID: text("pi_uid"), // Verified Pi account UID used for official A2U payouts
  walletAddress: text("wallet_address"), // Legacy/optional wallet snapshot for admin visibility
  txid: text("txid"), // Pi network transaction hash on completion
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const treasuryLogs = pgTable("treasury_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletType: varchar("wallet_type", { length: 50 }).notNull(), // 'main', 'hot', 'reward', 'tournament'
  action: varchar("action", { length: 50 }).notNull(), // 'deposit', 'withdrawal', 'payout'
  amount: decimal("amount", { precision: 10, scale: 4 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 4 }).notNull(),
  txid: text("txid"),
  referenceId: varchar("reference_id"), // links to redemption_request id or tournament id
  createdAt: timestamp("created_at").defaultNow(),
});

export const fraudFlags = pgTable("fraud_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  severity: varchar("severity", { length: 20 }).notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  status: varchar("status", { length: 20 }).notNull().default('open'), // 'open', 'investigating', 'resolved', 'false_positive'
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const withdrawalLimits = pgTable("withdrawal_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tier: varchar("tier", { length: 50 }).notNull().default('standard'), // 'standard', 'vip', 'suspicious'
  dailyLimitB4ut: integer("daily_limit_b4ut").notNull().default(5000),
  monthlyLimitB4ut: integer("monthly_limit_b4ut").notNull().default(50000),
  cooldownHours: integer("cooldown_hours").notNull().default(24),
  requiresManualApprovalAbove: integer("requires_manual_approval_above").notNull().default(1000),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// B4U ESPORTS TOKEN (B4UT) REWARD SYSTEM
// ============================================

// Daily rewards table
export const dailyRewards = pgTable("daily_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokensAwarded: integer("tokens_awarded").notNull().default(50),
  streakDay: integer("streak_day").notNull().default(1), // Day 1, 2, 3, etc.
  bonusMultiplier: integer("bonus_multiplier").notNull().default(1), // 1x, 2x, 3x for streaks
  claimedAt: timestamp("claimed_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  userIdDateIdx: index("idx_daily_rewards_user_date").on(table.userId, table.claimedAt),
}));

// Ad rewards table (watch ad and earn)
export const adRewards = pgTable("ad_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokensAwarded: integer("tokens_awarded").notNull().default(25),
  adType: text("ad_type").notNull(), // video, banner, interstitial
  adProvider: text("ad_provider").notNull(), // google, unity, custom
  adDuration: integer("ad_duration"), // Duration in seconds for video ads
  watchedAt: timestamp("watched_at").defaultNow(),
  ipAddress: text("ip_address"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  userIdDateIdx: index("idx_ad_rewards_user_date").on(table.userId, table.watchedAt),
}));

// Achievement rewards table
export const achievementRewards = pgTable("achievement_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  achievementName: text("achievement_name").notNull(),
  achievementDescription: text("achievement_description"),
  tokensAwarded: integer("tokens_awarded").notNull(),
  rarity: text("rarity").notNull().default("common"), // common, rare, epic, legendary
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  userIdAchievementIdx: uniqueIndex("idx_achievement_rewards_user_achievement").on(table.userId, table.achievementId),
}));

// Loyalty rewards table
export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tier: text("tier").notNull(), // bronze, silver, gold, platinum, diamond
  tokensAwarded: integer("tokens_awarded").notNull(),
  reason: text("reason").notNull(), // monthly_bonus, tier_upgrade, special_event
  awardedAt: timestamp("awarded_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  userIdDateIdx: index("idx_loyalty_rewards_user_date").on(table.userId, table.awardedAt),
}));

// Feedback rewards table
export const feedbackRewards = pgTable("feedback_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokensAwarded: integer("tokens_awarded").notNull().default(10),
  feedbackType: text("feedback_type").notNull(), // bug_report, feature_request, general_feedback, rating
  feedbackId: text("feedback_id"), // Reference to feedback submission
  awardedAt: timestamp("awarded_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  userIdDateIdx: index("idx_feedback_rewards_user_date").on(table.userId, table.awardedAt),
}));

// Tournament token rewards table
export const tournamentTokenRewards = pgTable("tournament_token_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tournamentId: varchar("tournament_id").notNull().references(() => tournaments.id),
  rewardType: text("reward_type").notNull(), // participation, placement, mvp, kill_bonus
  placement: integer("placement"), // 1st, 2nd, 3rd, etc.
  tokensAwarded: integer("tokens_awarded").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
}, (table) => ({
  tournamentUserIdx: index("idx_tournament_token_rewards_tournament_user").on(table.tournamentId, table.userId),
}));

// Achievements definition table
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  achievementId: text("achievement_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon"),
  tokensReward: integer("tokens_reward").notNull(),
  rarity: text("rarity").notNull().default("common"),
  category: text("category").notNull(), // purchases, referrals, tournaments, social, login
  requirement: jsonb("requirement").$type<Record<string, any>>().notNull(), // e.g., { purchases: 10 }
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  achievementIdIdx: index("idx_achievements_id").on(table.achievementId),
  categoryIdx: index("idx_achievements_category").on(table.category),
}));

// Pi Treasury wallet configuration for automatic conversion
export const piTreasuryWallet = pgTable("pi_treasury_wallet", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  walletType: text("wallet_type").notNull().default("mainnet"), // mainnet, testnet
  privateKeyEncrypted: text("private_key_encrypted"), // Encrypted private key
  balance: decimal("balance", { precision: 18, scale: 8 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Token conversion rate configuration
export const tokenConversionRates = pgTable("token_conversion_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  b4utToPiRate: decimal("b4ut_to_pi_rate", { precision: 18, scale: 8 }).notNull().default("0.001"), // 1000 B4UT = 1 Pi
  minimumRedemption: integer("minimum_redemption").notNull().default(100), // Minimum B4UT to redeem
  maximumRedemption: integer("maximum_redemption").notNull().default(10000), // Maximum B4UT per redemption
  isActive: boolean("is_active").notNull().default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
export const tokenTransactionsRelations = relations(tokenTransactions, ({ one }) => ({
  user: one(users, {
    fields: [tokenTransactions.userId],
    references: [users.id],
  }),
}));

export const redemptionRequestsRelations = relations(redemptionRequests, ({ one }) => ({
  user: one(users, {
    fields: [redemptionRequests.userId],
    references: [users.id],
  }),
}));

export const fraudFlagsRelations = relations(fraudFlags, ({ one }) => ({
  user: one(users, {
    fields: [fraudFlags.userId],
    references: [users.id],
  }),
}));

export const insertSystemSettingSchema = createInsertSchema(systemSettings);
export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions);
export const insertRedemptionRequestSchema = createInsertSchema(redemptionRequests);
export const insertTreasuryLogSchema = createInsertSchema(treasuryLogs);
export const insertFraudFlagSchema = createInsertSchema(fraudFlags);
export const insertWithdrawalLimitSchema = createInsertSchema(withdrawalLimits);
export const insertDailyRewardSchema = createInsertSchema(dailyRewards);
export const insertAdRewardSchema = createInsertSchema(adRewards);
export const insertAchievementRewardSchema = createInsertSchema(achievementRewards);
export const insertLoyaltyRewardSchema = createInsertSchema(loyaltyRewards);
export const insertFeedbackRewardSchema = createInsertSchema(feedbackRewards);
export const insertTournamentTokenRewardSchema = createInsertSchema(tournamentTokenRewards);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertPiTreasuryWalletSchema = createInsertSchema(piTreasuryWallet);
export const insertTokenConversionRateSchema = createInsertSchema(tokenConversionRates);

export type SystemSetting = typeof systemSettings.$inferSelect;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type RedemptionRequest = typeof redemptionRequests.$inferSelect;
export type TreasuryLog = typeof treasuryLogs.$inferSelect;
export type FraudFlag = typeof fraudFlags.$inferSelect;
export type WithdrawalLimit = typeof withdrawalLimits.$inferSelect;
export type DailyReward = typeof dailyRewards.$inferSelect;
export type AdReward = typeof adRewards.$inferSelect;
export type AchievementReward = typeof achievementRewards.$inferSelect;
export type LoyaltyReward = typeof loyaltyRewards.$inferSelect;
export type FeedbackReward = typeof feedbackRewards.$inferSelect;
export type TournamentTokenReward = typeof tournamentTokenRewards.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type PiTreasuryWallet = typeof piTreasuryWallet.$inferSelect;
export type TokenConversionRate = typeof tokenConversionRates.$inferSelect;

// ============================================
// REAL-TIME CHAT & ROLES SYSTEM
// ============================================

export const roles = pgTable("app_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(), // e.g., 'Owner', 'Admin', 'Leader'
  color: varchar("color", { length: 20 }).notNull(), // e.g., '#FFD700'
  permissions: jsonb("permissions").$type<string[]>().default(sql`'[]'::jsonb`),
  priority: integer("priority").notNull().default(0), // Lower is higher priority (0 = Owner)
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("app_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default('general'), // e.g., 'general', 'tournament', 'clan'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("app_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(), // References app_rooms.id
  userId: varchar("user_id").notNull(), // References app_users.id
  replyToId: varchar("reply_to_id"), // References app_messages.id
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relationships
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [messages.roomId],
    references: [rooms.id],
  }),
}));

// Export schemas
export const insertRoleSchema = createInsertSchema(roles);
export const insertRoomSchema = createInsertSchema(rooms);
export const insertMessageSchema = createInsertSchema(messages);

export type Role = typeof roles.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Message = typeof messages.$inferSelect;
