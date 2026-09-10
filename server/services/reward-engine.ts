import { db } from "../db.js";
import { users, tokenTransactions, systemSettings } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

export class RewardEngine {
  /**
   * Fetch a system setting by key with a fallback
   */
  async getSetting(key: string, fallback: string): Promise<string> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    return setting ? setting.value : fallback;
  }

  /**
   * Distribute B4UT tokens for a user
   */
  async grantTokens(userId: string, amount: number, type: string, description: string, referenceId?: string) {
    if (amount <= 0) return;

    // 1. Insert into immutable ledger
    await db.insert(tokenTransactions).values({
      userId,
      amount,
      type,
      description,
      referenceId
    });

    // 2. Fetch current user to update cache
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (user) {
      // 3. Update active token balance
      await db.update(users)
        .set({ tokens: (user.tokens || 0) + amount })
        .where(eq(users.id, userId));
    }
  }

  /**
   * Process a purchase reward
   * Example: 5 Pi = 100 B4UT
   */
  async processPurchaseReward(userId: string, piSpent: number, txid: string) {
    const rateStr = await this.getSetting('pi_to_b4ut_reward_rate', '20'); // 1 Pi spent = 20 B4UT (5 Pi = 100)
    const rate = parseFloat(rateStr) || 20;
    const rewardTokens = Math.floor(piSpent * rate);

    if (rewardTokens > 0) {
      await this.grantTokens(
        userId,
        rewardTokens,
        'purchase_reward',
        `Cashback reward for purchase`,
        txid
      );
    }
  }

  /**
   * Daily login reward logic
   */
  async claimDailyLogin(userId: string) {
    const rewardStr = await this.getSetting('daily_login_b4ut', '10');
    const reward = parseInt(rewardStr, 10) || 10;
    
    // In a full implementation, you'd check last_login timestamp here to prevent spam
    
    await this.grantTokens(
      userId,
      reward,
      'daily_login',
      'Daily Login Reward'
    );
    
    return reward;
  }
}

export const rewardEngine = new RewardEngine();
