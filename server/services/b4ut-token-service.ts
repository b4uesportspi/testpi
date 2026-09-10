import { db } from '../db.js';
import * as schema from '../../shared/schema.js';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * B4U Esports Token (B4UT) Service
 * Handles all token-related operations including rewards, transactions, and conversions
 */

export interface TokenRewardResult {
  success: boolean;
  newBalance: number;
  tokensAwarded: number;
  message: string;
  error?: string;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  description?: string;
  referenceId?: string;
  createdAt: Date;
}

function mapTokenTransaction(row: typeof schema.tokenTransactions.$inferSelect): TokenTransaction {
  return {
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    type: row.type,
    description: row.description || undefined,
    referenceId: row.referenceId || undefined,
    createdAt: row.createdAt || new Date(),
  };
}

/**
 * Award tokens to a user and record the transaction
 */
export async function awardTokens(
  userId: string,
  amount: number,
  type: string,
  description?: string,
  referenceId?: string
): Promise<TokenRewardResult> {
  try {
    // Start a transaction
    await db.transaction(async (tx) => {
      // Update user's token balance
      await tx
        .update(schema.users)
        .set({
          tokens: sql`${schema.users.tokens} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      // Record the token transaction
      await tx.insert(schema.tokenTransactions).values({
        id: randomUUID(),
        userId,
        amount,
        type,
        description,
        referenceId,
        createdAt: new Date(),
      });
    });

    // Get the new balance
    const user = await db
      .select({ tokens: schema.users.tokens })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const newBalance = user[0]?.tokens || 0;

    return {
      success: true,
      newBalance,
      tokensAwarded: amount,
      message: `Successfully awarded ${amount} B4UT tokens`,
    };
  } catch (error) {
    console.error('Error awarding tokens:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to award tokens',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Burn/deduct tokens from a user
 */
export async function burnTokens(
  userId: string,
  amount: number,
  type: string,
  description?: string,
  referenceId?: string
): Promise<TokenRewardResult> {
  try {
    // Check if user has enough tokens
    const user = await db
      .select({ tokens: schema.users.tokens })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user[0] || user[0].tokens < amount) {
      return {
        success: false,
        newBalance: user[0]?.tokens || 0,
        tokensAwarded: 0,
        message: 'Insufficient token balance',
        error: 'Insufficient balance',
      };
    }

    // Start a transaction
    await db.transaction(async (tx) => {
      // Update user's token balance
      await tx
        .update(schema.users)
        .set({
          tokens: sql`${schema.users.tokens} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      // Record the token transaction (negative amount for burning)
      await tx.insert(schema.tokenTransactions).values({
        id: randomUUID(),
        userId,
        amount: -amount,
        type,
        description,
        referenceId,
        createdAt: new Date(),
      });
    });

    // Get the new balance
    const updatedUser = await db
      .select({ tokens: schema.users.tokens })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const newBalance = updatedUser[0]?.tokens || 0;

    return {
      success: true,
      newBalance,
      tokensAwarded: -amount,
      message: `Successfully burned ${amount} B4UT tokens`,
    };
  } catch (error) {
    console.error('Error burning tokens:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to burn tokens',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's current token balance
 */
export async function getTokenBalance(userId: string): Promise<number> {
  const user = await db
    .select({ tokens: schema.users.tokens })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return user[0]?.tokens || 0;
}

/**
 * Get user's token transaction history
 */
export async function getTokenTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<TokenTransaction[]> {
  const transactions = await db
    .select()
    .from(schema.tokenTransactions)
    .where(eq(schema.tokenTransactions.userId, userId))
    .orderBy(desc(schema.tokenTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  return transactions.map(mapTokenTransaction);
}

/**
 * Claim daily reward
 */
export async function claimDailyReward(userId: string): Promise<TokenRewardResult> {
  try {
    // Check if user already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingClaim = await db
      .select()
      .from(schema.dailyRewards)
      .where(
        and(
          eq(schema.dailyRewards.userId, userId),
          gte(schema.dailyRewards.claimedAt, today)
        )
      )
      .limit(1);

    if (existingClaim.length > 0) {
      return {
        success: false,
        newBalance: await getTokenBalance(userId),
        tokensAwarded: 0,
        message: 'Daily reward already claimed today',
        error: 'Already claimed',
      };
    }

    // Calculate streak and bonus
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayClaim = await db
      .select({ streakDay: schema.dailyRewards.streakDay })
      .from(schema.dailyRewards)
      .where(
        and(
          eq(schema.dailyRewards.userId, userId),
          gte(schema.dailyRewards.claimedAt, yesterday),
          lte(schema.dailyRewards.claimedAt, today)
        )
      )
      .orderBy(desc(schema.dailyRewards.claimedAt))
      .limit(1);

    let streakDay = 1;
    let bonusMultiplier = 1;

    if (yesterdayClaim.length > 0) {
      streakDay = (yesterdayClaim[0].streakDay || 0) + 1;
      if (streakDay > 7) streakDay = 7; // Cap at 7 day streak
      
      // Bonus multiplier based on streak
      if (streakDay >= 7) bonusMultiplier = 3;
      else if (streakDay >= 5) bonusMultiplier = 2;
      else if (streakDay >= 3) bonusMultiplier = 1.5;
    }

    const baseReward = 50;
    const tokensAwarded = Math.floor(baseReward * bonusMultiplier);

    // Award tokens
    const result = await awardTokens(
      userId,
      tokensAwarded,
      'daily_reward',
      `Daily login reward - Streak Day ${streakDay}`
    );

    if (result.success) {
      // Record daily reward
      await db.insert(schema.dailyRewards).values({
        id: randomUUID(),
        userId,
        tokensAwarded,
        streakDay,
        bonusMultiplier,
        claimedAt: new Date(),
      });

      // Update user's last daily claim
      await db
        .update(schema.users)
        .set({ lastDailyClaimAt: new Date() })
        .where(eq(schema.users.id, userId));
    }

    return result;
  } catch (error) {
    console.error('Error claiming daily reward:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to claim daily reward',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Award ad reward (watch ad and earn)
 */
export async function awardAdReward(
  userId: string,
  adType: string,
  adProvider: string,
  adDuration?: number,
  ipAddress?: string
): Promise<TokenRewardResult> {
  try {
    // Check cooldown (max 10 ads per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAds = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.adRewards)
      .where(
        and(
          eq(schema.adRewards.userId, userId),
          gte(schema.adRewards.watchedAt, today)
        )
      );

    const adCount = Number(todayAds[0]?.count || 0);
    if (adCount >= 10) {
      return {
        success: false,
        newBalance: await getTokenBalance(userId),
        tokensAwarded: 0,
        message: 'Daily ad reward limit reached (10 ads per day)',
        error: 'Daily limit reached',
      };
    }

    // Calculate reward based on ad type and duration
    let baseReward = 25;
    if (adType === 'video' && adDuration && adDuration >= 30) {
      baseReward = 50; // Higher reward for longer videos
    }

    // Award tokens
    const result = await awardTokens(
      userId,
      baseReward,
      'ad_reward',
      `Watched ${adType} ad from ${adProvider}`
    );

    if (result.success) {
      // Record ad reward
      await db.insert(schema.adRewards).values({
        id: randomUUID(),
        userId,
        tokensAwarded: baseReward,
        adType,
        adProvider,
        adDuration,
        watchedAt: new Date(),
        ipAddress,
      });
    }

    return result;
  } catch (error) {
    console.error('Error awarding ad reward:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to award ad reward',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Award feedback reward
 */
export async function awardFeedbackReward(
  userId: string,
  feedbackType: string,
  feedbackId?: string
): Promise<TokenRewardResult> {
  try {
    const tokensAwarded = 10; // Fixed 10 tokens for feedback

    // Award tokens
    const result = await awardTokens(
      userId,
      tokensAwarded,
      'feedback_reward',
      `Feedback submitted: ${feedbackType}`
    );

    if (result.success) {
      // Record feedback reward
      await db.insert(schema.feedbackRewards).values({
        id: randomUUID(),
        userId,
        tokensAwarded,
        feedbackType,
        feedbackId,
        awardedAt: new Date(),
      });
    }

    return result;
  } catch (error) {
    console.error('Error awarding feedback reward:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to award feedback reward',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Award achievement reward
 */
export async function awardAchievementReward(
  userId: string,
  achievementId: string,
  achievementName: string,
  achievementDescription: string,
  tokensAwarded: number,
  rarity: string = 'common'
): Promise<TokenRewardResult> {
  try {
    // Check if achievement already unlocked
    const existing = await db
      .select()
      .from(schema.achievementRewards)
      .where(
        and(
          eq(schema.achievementRewards.userId, userId),
          eq(schema.achievementRewards.achievementId, achievementId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        newBalance: await getTokenBalance(userId),
        tokensAwarded: 0,
        message: 'Achievement already unlocked',
        error: 'Already unlocked',
      };
    }

    // Award tokens
    const result = await awardTokens(
      userId,
      tokensAwarded,
      'achievement_reward',
      `Achievement unlocked: ${achievementName}`
    );

    if (result.success) {
      // Record achievement reward
      await db.insert(schema.achievementRewards).values({
        id: randomUUID(),
        userId,
        achievementId,
        achievementName,
        achievementDescription,
        tokensAwarded,
        rarity,
        unlockedAt: new Date(),
      });
    }

    return result;
  } catch (error) {
    console.error('Error awarding achievement reward:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to award achievement reward',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Award loyalty reward
 */
export async function awardLoyaltyReward(
  userId: string,
  tier: string,
  tokensAwarded: number,
  reason: string
): Promise<TokenRewardResult> {
  try {
    // Award tokens
    const result = await awardTokens(
      userId,
      tokensAwarded,
      'loyalty_reward',
      `Loyalty reward: ${reason} (${tier} tier)`
    );

    if (result.success) {
      // Record loyalty reward
      await db.insert(schema.loyaltyRewards).values({
        id: randomUUID(),
        userId,
        tier,
        tokensAwarded,
        reason,
        awardedAt: new Date(),
      });
    }

    return result;
  } catch (error) {
    console.error('Error awarding loyalty reward:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to award loyalty reward',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Award tournament token reward
 */
export async function awardTournamentTokenReward(
  userId: string,
  tournamentId: string,
  rewardType: string,
  tokensAwarded: number,
  placement?: number
): Promise<TokenRewardResult> {
  try {
    // Award tokens
    const result = await awardTokens(
      userId,
      tokensAwarded,
      'tournament_reward',
      `Tournament reward: ${rewardType}${placement ? ` - ${placement}th place` : ''}`
    );

    if (result.success) {
      // Record tournament token reward
      await db.insert(schema.tournamentTokenRewards).values({
        id: randomUUID(),
        userId,
        tournamentId,
        rewardType,
        placement,
        tokensAwarded,
        awardedAt: new Date(),
      });
    }

    return result;
  } catch (error) {
    console.error('Error awarding tournament token reward:', error);
    return {
      success: false,
      newBalance: 0,
      tokensAwarded: 0,
      message: 'Failed to award tournament token reward',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's reward summary
 */
export async function getUserRewardSummary(userId: string) {
  try {
    const [
      dailyReward,
      todayAdCount,
      achievements,
      loyaltyRewards,
      feedbackRewards,
      tournamentRewards,
    ] = await Promise.all([
      // Get today's daily reward
      db
        .select()
        .from(schema.dailyRewards)
        .where(eq(schema.dailyRewards.userId, userId))
        .orderBy(desc(schema.dailyRewards.claimedAt))
        .limit(1),

      // Get today's ad count
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.adRewards)
        .where(
          and(
            eq(schema.adRewards.userId, userId),
            gte(schema.adRewards.watchedAt, new Date(new Date().setHours(0, 0, 0, 0)))
          )
        ),

      // Get achievements
      db
        .select()
        .from(schema.achievementRewards)
        .where(eq(schema.achievementRewards.userId, userId))
        .orderBy(desc(schema.achievementRewards.unlockedAt)),

      // Get loyalty rewards
      db
        .select()
        .from(schema.loyaltyRewards)
        .where(eq(schema.loyaltyRewards.userId, userId))
        .orderBy(desc(schema.loyaltyRewards.awardedAt))
        .limit(10),

      // Get feedback rewards
      db
        .select()
        .from(schema.feedbackRewards)
        .where(eq(schema.feedbackRewards.userId, userId))
        .orderBy(desc(schema.feedbackRewards.awardedAt))
        .limit(10),

      // Get tournament rewards
      db
        .select()
        .from(schema.tournamentTokenRewards)
        .where(eq(schema.tournamentTokenRewards.userId, userId))
        .orderBy(desc(schema.tournamentTokenRewards.awardedAt))
        .limit(10),
    ]);

    const balance = await getTokenBalance(userId);

    return {
      balance,
      dailyReward: dailyReward[0] || null,
      todayAdCount: Number(todayAdCount[0]?.count || 0),
      todayAdLimit: 10,
      achievements,
      loyaltyRewards,
      feedbackRewards,
      tournamentRewards,
    };
  } catch (error) {
    console.error('Error getting user reward summary:', error);
    throw error;
  }
}
