import { db } from "../db.js";
import { eq, sql } from "drizzle-orm";
import * as schema from "../../shared/schema.js";
import type { User, Transaction, PurchaseReward } from "../../shared/schema.js";
import { randomUUID } from "crypto";

/**
 * Purchase Reward Service
 * 
 * Manages token rewards based on successful purchase milestones:
 * - 5 purchases = 1000 tokens
 * - 10 purchases = 3000 tokens
 * - 15 purchases = 7000 tokens
 * - 20 purchases = 20000 tokens (one-time)
 * - 21+ purchases = 20000 + (3% of 15000 = 450) tokens per purchase
 */
export class PurchaseRewardService {
  
  // Milestone reward configuration
  private static readonly MILESTONE_REWARDS = {
    1: 500,
    5: 1000,
    10: 3000,
    15: 7000,
    20: 20000,
  };

  // Post-20 reward base amount
  private static readonly POST_20_BASE_REWARD = 20000;
  
  // Post-20 bonus calculation: 3% of 15000
  private static readonly POST_20_BONUS = Math.floor(15000 * 0.03); // 450 tokens

  /**
   * Calculate reward tokens for a given purchase count
   */
  public static calculateReward(purchaseCount: number): { tokens: number; milestone: number; details: string } {
    // Check for milestone rewards (only once per milestone)
    if (purchaseCount === 1) {
      return {
        tokens: this.MILESTONE_REWARDS[1],
        milestone: 1,
        details: 'First successful purchase bonus!'
      };
    }

    if (purchaseCount === 5) {
      return {
        tokens: this.MILESTONE_REWARDS[5],
        milestone: 5,
        details: 'Reached 5 successful purchases milestone'
      };
    }
    
    if (purchaseCount === 10) {
      return {
        tokens: this.MILESTONE_REWARDS[10],
        milestone: 10,
        details: 'Reached 10 successful purchases milestone'
      };
    }
    
    if (purchaseCount === 15) {
      return {
        tokens: this.MILESTONE_REWARDS[15],
        milestone: 15,
        details: 'Reached 15 successful purchases milestone'
      };
    }
    
    if (purchaseCount === 20) {
      return {
        tokens: this.MILESTONE_REWARDS[20],
        milestone: 20,
        details: 'Reached 20 successful purchases milestone'
      };
    }
    
    // Post-20 purchases: 20000 + 450 tokens per purchase
    if (purchaseCount > 20) {
      const totalTokens = this.POST_20_BASE_REWARD + this.POST_20_BONUS;
      return {
        tokens: totalTokens,
        milestone: purchaseCount,
        details: `Post-20 milestone: ${this.POST_20_BASE_REWARD} base + ${this.POST_20_BONUS} bonus (3% of 15000)`
      };
    }
    
    // No reward for less than 1 purchase or non-milestone numbers below 20
    return {
      tokens: 0,
      milestone: 0,
      details: 'No reward eligible for this purchase count'
    };
  }

  /**
   * Process a completed purchase and award tokens if milestone is reached
   */
  public static async processCompletedPurchase(
    userId: string,
    transactionId: string
  ): Promise<{ success: boolean; tokensAwarded?: number; milestone?: number; message: string }> {
    try {
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Get user's current purchase count
      const userResult = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      
      if (userResult.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = userResult[0];
      
      // Increment successful purchases count
      const newPurchaseCount = (user.successfulPurchasesCount || 0) + 1;
      
      await db
        .update(schema.users)
        .set({
          successfulPurchasesCount: newPurchaseCount,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, userId));

      console.log(`User ${userId} now has ${newPurchaseCount} successful purchases`);

      // Check if user already claimed reward for this milestone
      const lastMilestone = user.lastRewardMilestone || 0;
      
      // For post-20, we always give reward, so don't check previous milestone
      const shouldCheckDuplicate = newPurchaseCount <= 20;
      
      if (shouldCheckDuplicate && lastMilestone >= newPurchaseCount) {
        console.log(`User ${userId} already claimed reward for milestone ${lastMilestone}`);
        return { 
          success: true, 
          message: `Purchase count updated to ${newPurchaseCount}, but milestone reward already claimed`,
          tokensAwarded: 0
        };
      }

      // Calculate reward
      const reward = this.calculateReward(newPurchaseCount);
      
      if (reward.tokens === 0) {
        return { 
          success: true, 
          message: `Purchase count updated to ${newPurchaseCount}, no reward at this level`,
          tokensAwarded: 0
        };
      }

      // Award tokens
      await this.awardTokens(userId, reward.tokens, reward.milestone, reward.details, transactionId);
      
      // Update user's last reward milestone
      if (newPurchaseCount <= 20) {
        await db
          .update(schema.users)
          .set({
            lastRewardMilestone: newPurchaseCount,
            updatedAt: new Date()
          })
          .where(eq(schema.users.id, userId));
      }

      console.log(`Awarded ${reward.tokens} tokens to user ${userId} for milestone ${reward.milestone}`);
      
      return {
        success: true,
        tokensAwarded: reward.tokens,
        milestone: reward.milestone,
        message: `Congratulations! You earned ${reward.tokens} tokens for reaching ${newPurchaseCount} successful purchases!`
      };

    } catch (error) {
      console.error('Error processing purchase reward:', error);
      return {
        success: false,
        message: `Failed to process purchase reward: ${(error as Error).message}`
      };
    }
  }

  /**
   * Award tokens to a user and log the reward
   */
  private static async awardTokens(
    userId: string,
    amount: number,
    milestone: number,
    details: string,
    transactionId?: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Add tokens to user account
    await db
      .update(schema.users)
      .set({
        tokens: sql`${schema.users.tokens} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, userId));

    // Create reward record
    const rewardId = randomUUID();
    await db.insert(schema.purchaseRewards).values({
      id: rewardId,
      userId,
      milestone,
      tokensAwarded: amount,
      calculationDetails: details,
      transactionId: transactionId || null,
      createdAt: new Date()
    });
    await db.insert(schema.tokenTransactions).values({
      userId,
      amount,
      type: 'purchase_bonus',
      description: `Purchase bonus: ${amount} B4U Esports Token`,
      referenceId: transactionId || rewardId,
    });

    console.log(`Created purchase reward record ${rewardId} for user ${userId}: ${amount} tokens`);
  }

  /**
   * Get all rewards for a specific user
   */
  public static async getUserRewards(userId: string): Promise<PurchaseReward[]> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const rewards = await db
      .select()
      .from(schema.purchaseRewards)
      .where(eq(schema.purchaseRewards.userId, userId))
      .orderBy(schema.purchaseRewards.createdAt);

    return rewards;
  }

  /**
   * Get total rewards issued across all users
   */
  public static async getTotalRewardsIssued(): Promise<{ totalUsers: number; totalTokens: number; totalRewards: number }> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Count unique users who received rewards
    const userCountResult = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${schema.purchaseRewards.userId})`
      })
      .from(schema.purchaseRewards);

    // Sum total tokens awarded
    const tokenSumResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.purchaseRewards.tokensAwarded}), 0)`
      })
      .from(schema.purchaseRewards);

    // Count total reward records
    const rewardCountResult = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(schema.purchaseRewards);

    return {
      totalUsers: userCountResult[0]?.count || 0,
      totalTokens: tokenSumResult[0]?.total || 0,
      totalRewards: rewardCountResult[0]?.count || 0
    };
  }

  /**
   * Manually recalculate and award rewards for existing users
   * This is useful for backfilling rewards for users who already met milestones
   */
  public static async backfillRewardsForUser(userId: string): Promise<{
    success: boolean;
    message: string;
    tokensAwarded: number;
    newMilestone: number | null;
  }> {
    try {
      if (!db) {
        throw new Error('Database not initialized');
      }

      // Get user's completed transactions
      const completedTransactions = await db
        .select()
        .from(schema.transactions)
        .where(
          eq(schema.transactions.userId, userId)
        );

      // Filter only completed/successful transactions
      const successfulPurchases = completedTransactions.filter(
        (t: any) => t.status === 'completed' || t.status === 'successful'
      );

      const purchaseCount = successfulPurchases.length;

      if (purchaseCount === 0) {
        return {
          success: true,
          message: 'No successful purchases found',
          tokensAwarded: 0,
          newMilestone: null
        };
      }

      // Get user's current state
      const userResult = await db.select().from(schema.users).where(eq(schema.users.id, userId));
      
      if (userResult.length === 0) {
        return {
          success: false,
          message: 'User not found',
          tokensAwarded: 0,
          newMilestone: null
        };
      }

      const user = userResult[0];
      const currentMilestone = user.lastRewardMilestone || 0;
      let totalTokensToAward = 0;
      let highestMilestone = currentMilestone;

      // Calculate rewards for each milestone reached
      const milestones = [1, 5, 10, 15, 20];
      
      for (const milestone of milestones) {
        if (purchaseCount >= milestone && milestone > currentMilestone) {
          const reward = this.calculateReward(milestone);
          totalTokensToAward += reward.tokens;
          highestMilestone = milestone;
        }
      }

      // Calculate post-20 rewards
      if (purchaseCount > 20) {
        const post20Count = purchaseCount - 20;
        const post20RewardPerPurchase = this.POST_20_BASE_REWARD + this.POST_20_BONUS;
        const post20Total = post20Count * post20RewardPerPurchase;
        
        // Check if we've already awarded some post-20 rewards
        const existingPost20Rewards = await db
          .select()
          .from(schema.purchaseRewards)
          .where(
            eq(schema.purchaseRewards.userId, userId)
          );

        const alreadyAwarded = existingPost20Rewards.filter((r: any) => r.milestone > 20).length;
        const remainingPost20 = post20Count - alreadyAwarded;

        if (remainingPost20 > 0) {
          totalTokensToAward += remainingPost20 * post20RewardPerPurchase;
        }
      }

      if (totalTokensToAward === 0) {
        return {
          success: true,
          message: `User has ${purchaseCount} successful purchases, but all milestone rewards already claimed`,
          tokensAwarded: 0,
          newMilestone: highestMilestone > 0 ? highestMilestone : null
        };
      }

      // Award tokens
      await db
        .update(schema.users)
        .set({
          tokens: sql`${schema.users.tokens} + ${totalTokensToAward}`,
          successfulPurchasesCount: purchaseCount,
          lastRewardMilestone: highestMilestone > 20 ? 20 : highestMilestone,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, userId));

      // Create reward record
      const rewardId = randomUUID();
      await db.insert(schema.purchaseRewards).values({
        id: rewardId,
        userId,
        milestone: highestMilestone,
        tokensAwarded: totalTokensToAward,
        calculationDetails: `Backfilled reward for ${purchaseCount} total successful purchases`,
        transactionId: null,
        createdAt: new Date()
      });

      return {
        success: true,
        message: `Backfilled ${totalTokensToAward} tokens for ${purchaseCount} successful purchases`,
        tokensAwarded: totalTokensToAward,
        newMilestone: highestMilestone > 0 ? highestMilestone : null
      };

    } catch (error) {
      console.error('Error backfilling rewards:', error);
      return {
        success: false,
        message: `Failed to backfill rewards: ${(error as Error).message}`,
        tokensAwarded: 0,
        newMilestone: null
      };
    }
  }
}

export const purchaseRewardService = new PurchaseRewardService();
