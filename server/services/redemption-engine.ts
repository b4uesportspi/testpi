import { db } from "../db.js";
import { users, redemptionRequests, tokenTransactions, systemSettings } from "../../shared/schema.js";
import { eq, sql } from "drizzle-orm";

export class RedemptionEngine {
  private async ensureRedemptionIdentityColumns() {
    await db.execute(sql`
      ALTER TABLE redemption_requests ADD COLUMN IF NOT EXISTS pi_uid text;
      ALTER TABLE redemption_requests ALTER COLUMN wallet_address DROP NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_redemption_requests_pi_uid ON redemption_requests(pi_uid);
    `);
  }

  /**
   * Fetch a system setting by key with a fallback
   */
  async getSetting(key: string, fallback: string): Promise<string> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    return setting ? setting.value : fallback;
  }

  /**
   * Request B4UT to Pi Redemption
   */
  async requestRedemption(userId: string, b4utAmount: number) {
    if (b4utAmount <= 0) {
      throw new Error("Amount must be greater than zero.");
    }

    // 1. Verify User Balance
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || (user.tokens || 0) < b4utAmount) {
      throw new Error("Insufficient B4UT balance.");
    }

    if (!user.piUID) {
      throw new Error("Verified Pi UID is required for redemption. Please log in with Pi Network again.");
    }

    await this.ensureRedemptionIdentityColumns();

    // 2. Calculate Pi Output
    const rateStr = await this.getSetting('b4ut_to_pi_rate', '1000'); // 1000 B4UT = 1 Pi
    const rate = parseFloat(rateStr) || 1000;
    const piAmount = b4utAmount / rate;

    // 3. Create Pending Redemption Request
    const [request] = await db.insert(redemptionRequests).values({
      userId,
      b4utAmount,
      piAmount: piAmount.toString(),
      piUID: user.piUID,
      walletAddress: user.walletAddress || null,
      status: 'pending'
    }).returning();

    // 4. Burn B4UT Tokens
    await db.insert(tokenTransactions).values({
      userId,
      amount: -b4utAmount,
      type: 'redemption',
      description: `Redeemed ${b4utAmount} B4UT for ${piAmount} Pi`,
      referenceId: request.id
    });

    // 5. Update user's active tokens
    await db.update(users)
      .set({ tokens: (user.tokens || 0) - b4utAmount })
      .where(eq(users.id, userId));

    return request;
  }

  /**
   * Admin approves a redemption request
   */
  async approveRedemption(requestId: string, adminNotes: string) {
    const [updated] = await db.update(redemptionRequests)
      .set({
        status: 'approved',
        adminNotes,
        updatedAt: new Date()
      })
      .where(eq(redemptionRequests.id, requestId))
      .returning();
      
    // In a fully automated system, this is where you'd trigger 
    // the Pi SDK Server-to-User payment API from the hot wallet.
    
    return updated;
  }
  
  /**
   * Admin rejects a redemption request (Refunds B4UT)
   */
  async rejectRedemption(requestId: string, adminNotes: string) {
    const [request] = await db.select().from(redemptionRequests).where(eq(redemptionRequests.id, requestId)).limit(1);

    if (!request || request.status !== 'pending') {
      throw new Error("Invalid request or already processed.");
    }

    // 1. Mark as rejected
    const [updated] = await db.update(redemptionRequests)
      .set({
        status: 'rejected',
        adminNotes,
        updatedAt: new Date()
      })
      .where(eq(redemptionRequests.id, requestId))
      .returning();

    // 2. Refund B4UT Tokens
    await db.insert(tokenTransactions).values({
      userId: request.userId,
      amount: request.b4utAmount,
      type: 'redemption_refund',
      description: `Refund for rejected redemption request`,
      referenceId: request.id
    });

    // 3. Update user balance
    const [user] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
    
    if (user) {
      await db.update(users)
        .set({ tokens: (user.tokens || 0) + request.b4utAmount })
        .where(eq(users.id, request.userId));
    }

    return updated;
  }
}

export const redemptionEngine = new RedemptionEngine();
