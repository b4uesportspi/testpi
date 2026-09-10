import { db } from "../db.js";
import { users, transactions, userRankings } from "../../shared/schema.js";
import { eq, sql, desc } from "drizzle-orm";
// Tier progression thresholds
const TIER_THRESHOLDS = {
  'New': 0,
  'Bronze': 100,
  'Silver': 250,
  'Gold': 500,
  'VIP': 1000
};

type TierName = keyof typeof TIER_THRESHOLDS;

interface UserRankingData {
  userId: string;
  username: string;
  rank: number;
  tier: string;
  points: number;
  purchasePoints: number;
  referralPoints: number;
  totalPoints: number;
  monthlyPurchaseCount: number;
  monthlyPurchaseValue: string | null;
  streakDays: number;
}

/**
 * Calculate tier based on total points
 */
export function calculateTier(points: number): TierName {
  if (points >= TIER_THRESHOLDS.VIP) return 'VIP';
  if (points >= TIER_THRESHOLDS.Gold) return 'Gold';
  if (points >= TIER_THRESHOLDS.Silver) return 'Silver';
  if (points >= TIER_THRESHOLDS.Bronze) return 'Bronze';
  return 'New';
}

/**
 * Calculate points from a single transaction
 */
export function calculateTransactionPoints(piAmount: number, multiplier: number = 1): number {
  // 1 Pi = 10 points base, multiplied by tier multiplier
  return Math.floor(piAmount * 10 * multiplier);
}

/**
 * Get or create user ranking
 */
export async function getOrCreateUserRanking(userId: string) {
  try {
    const [existing] = await db.select().from(userRankings).where(eq(userRankings.userId, userId)).limit(1);

    if (existing) return existing;

    // Create new ranking record
    const result = await db.insert(userRankings).values({
      userId,
      rank: 0,
      tier: 'New',
      points: 0,
      purchasePoints: 0,
      referralPoints: 0,
      totalPoints: 0,
      monthlyPurchaseCount: 0,
      monthlyPurchaseValue: '0'
    }).returning();

    return result[0];
  } catch (error) {
    console.error('Error getting or creating user ranking:', error);
    throw error;
  }
}

/**
 * Update user ranking after a purchase
 */
export async function updateRankingAfterPurchase(userId: string, piAmount: number) {
  try {
    const ranking = await getOrCreateUserRanking(userId);
    
    // Calculate points for this purchase
    const tierMultiplier = getTierMultiplier(ranking.tier);
    const purchasePoints = calculateTransactionPoints(piAmount, tierMultiplier);
    
    // Update ranking
    const newPurchasePoints = ranking.purchasePoints + purchasePoints;
    const newTotalPoints = ranking.points + purchasePoints;
    const newTier = calculateTier(newTotalPoints);

    await db.update(userRankings)
      .set({
        purchasePoints: newPurchasePoints,
        points: newTotalPoints,
        totalPoints: newTotalPoints,
        tier: newTier,
        monthlyPurchaseCount: ranking.monthlyPurchaseCount + 1,
        monthlyPurchaseValue: sql`${userRankings.monthlyPurchaseValue}::numeric + ${piAmount}`,
        lastActivityDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userRankings.userId, userId));

  } catch (error) {
    console.error('Error updating ranking after purchase:', error);
  }
}

/**
 * Add referral points to user ranking
 */
export async function addReferralPoints(userId: string, points: number) {
  try {
    const ranking = await getOrCreateUserRanking(userId);
    
    const newReferralPoints = ranking.referralPoints + points;
    const newTotalPoints = ranking.points + points;
    const newTier = calculateTier(newTotalPoints);

    await db.update(userRankings)
      .set({
        referralPoints: newReferralPoints,
        points: newTotalPoints,
        totalPoints: newTotalPoints,
        tier: newTier,
        updatedAt: new Date()
      })
      .where(eq(userRankings.userId, userId));

  } catch (error) {
    console.error('Error adding referral points:', error);
  }
}

/**
 * Get user tier multiplier for points calculation
 */
function getTierMultiplier(tier: string): number {
  const multipliers: Record<string, number> = {
    'New': 1.0,
    'Bronze': 1.1,
    'Silver': 1.25,
    'Gold': 1.5,
    'VIP': 2.0
  };
  return multipliers[tier] || 1.0;
}

/**
 * Get leaderboard (top users by rank/points)
 */
export async function getLeaderboard(limit: number = 100): Promise<UserRankingData[]> {
  try {
    const results = await db
      .select({
        userId: userRankings.userId,
        username: users.username,
        rank: userRankings.rank,
        tier: userRankings.tier,
        points: userRankings.points,
        purchasePoints: userRankings.purchasePoints,
        referralPoints: userRankings.referralPoints,
        totalPoints: userRankings.totalPoints,
        monthlyPurchaseCount: userRankings.monthlyPurchaseCount,
        monthlyPurchaseValue: userRankings.monthlyPurchaseValue,
        streakDays: userRankings.streakDays
      })
      .from(userRankings)
      .innerJoin(users, eq(userRankings.userId, users.id))
      .orderBy(sql`${userRankings.points} DESC`)
      .limit(limit);

    // Update ranks
    for (let i = 0; i < results.length; i++) {
      await db.update(userRankings)
        .set({ rank: i + 1 })
        .where(eq(userRankings.userId, results[i].userId));
      results[i].rank = i + 1;
    }

    return results;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
}

/**
 * Get user ranking and position
 */
export async function getUserRanking(userId: string): Promise<UserRankingData | null> {
  try {
    const result = await db
      .select({
        userId: userRankings.userId,
        username: users.username,
        rank: userRankings.rank,
        tier: userRankings.tier,
        points: userRankings.points,
        purchasePoints: userRankings.purchasePoints,
        referralPoints: userRankings.referralPoints,
        totalPoints: userRankings.totalPoints,
        monthlyPurchaseCount: userRankings.monthlyPurchaseCount,
        monthlyPurchaseValue: userRankings.monthlyPurchaseValue,
        streakDays: userRankings.streakDays
      })
      .from(userRankings)
      .innerJoin(users, eq(userRankings.userId, users.id))
      .where(eq(userRankings.userId, userId));

    return result[0] || null;
  } catch (error) {
    console.error('Error getting user ranking:', error);
    throw error;
  }
}

/**
 * Reset monthly counters (call once a month)
 */
export async function resetMonthlyCounters() {
  try {
    await db.update(userRankings)
      .set({
        monthlyPurchaseCount: 0,
        monthlyPurchaseValue: '0'
      });

  } catch (error) {
    console.error('Error resetting monthly counters:', error);
  }
}

/**
 * Get next tier info for a user
 */
export async function getNextTierInfo(userId: string) {
  try {
    const ranking = await getUserRanking(userId);
    if (!ranking) return null;

    const currentTierPoints = TIER_THRESHOLDS[ranking.tier as TierName];
    const tierProgression: TierName[] = ['New', 'Bronze', 'Silver', 'Gold', 'VIP'];
    const currentIndex = tierProgression.indexOf(ranking.tier as TierName);
    
    if (currentIndex >= tierProgression.length - 1) {
      return { nextTier: 'VIP', pointsNeeded: 0 }; // Already at max tier
    }

    const nextTier = tierProgression[currentIndex + 1];
    const nextTierThreshold = TIER_THRESHOLDS[nextTier];
    const pointsNeeded = Math.max(0, nextTierThreshold - ranking.points);

    return {
      currentTier: ranking.tier,
      nextTier,
      currentPoints: ranking.points,
      nextTierPoints: nextTierThreshold,
      pointsNeeded,
      percentageToNextTier: ((ranking.points - currentTierPoints) / (nextTierThreshold - currentTierPoints) * 100).toFixed(2)
    };
  } catch (error) {
    console.error('Error getting next tier info:', error);
    throw error;
  }
}
