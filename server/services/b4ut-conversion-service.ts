import { db } from '../db.js';
import * as schema from '../../shared/schema.js';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * B4U Esports Token (B4UT) to Pi Automatic Conversion Service
 * Handles automatic conversion of B4UT tokens to real Pi through treasury wallet
 */

export interface ConversionResult {
  success: boolean;
  piAmount?: number;
  txid?: string;
  message: string;
  error?: string;
}

export interface RedemptionRequest {
  id: string;
  userId: string;
  b4utAmount: number;
  piAmount: number;
  status: string;
  piUID?: string;
  walletAddress?: string | null;
  txid?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

function mapRedemptionRequest(row: typeof schema.redemptionRequests.$inferSelect): RedemptionRequest {
  return {
    id: row.id,
    userId: row.userId,
    b4utAmount: row.b4utAmount,
    piAmount: Number(row.piAmount),
    status: row.status,
    piUID: row.piUID || undefined,
    walletAddress: row.walletAddress,
    txid: row.txid || undefined,
    adminNotes: row.adminNotes || undefined,
    createdAt: row.createdAt || new Date(),
    updatedAt: row.updatedAt || new Date(),
  };
}

/**
 * Get current conversion rate
 */
export async function getConversionRate(): Promise<{ rate: number; minimum: number; maximum: number }> {
  try {
    const rate = await db
      .select()
      .from(schema.tokenConversionRates)
      .where(eq(schema.tokenConversionRates.isActive, true))
      .orderBy(desc(schema.tokenConversionRates.effectiveFrom))
      .limit(1);

    if (rate.length === 0) {
      // Return default rate if none exists
      return { rate: 0.001, minimum: 100, maximum: 10000 }; // 1000 B4UT = 1 Pi
    }

    return {
      rate: Number(rate[0].b4utToPiRate),
      minimum: rate[0].minimumRedemption,
      maximum: rate[0].maximumRedemption,
    };
  } catch (error) {
    console.error('Error getting conversion rate:', error);
    return { rate: 0.001, minimum: 100, maximum: 10000 };
  }
}

/**
 * Calculate Pi amount from B4UT amount
 */
export async function calculatePiAmount(b4utAmount: number): Promise<{ piAmount: number; rate: number }> {
  const { rate } = await getConversionRate();
  const piAmount = b4utAmount * rate;
  return { piAmount, rate };
}

/**
 * Create redemption request
 */
export async function createRedemptionRequest(
  userId: string,
  b4utAmount: number,
  walletAddress?: string | null
): Promise<ConversionResult> {
  try {
    // Validate amount
    const { minimum, maximum } = await getConversionRate();
    if (b4utAmount < minimum) {
      return {
        success: false,
        message: `Minimum redemption amount is ${minimum} B4UT`,
        error: 'Amount too low',
      };
    }
    if (b4utAmount > maximum) {
      return {
        success: false,
        message: `Maximum redemption amount is ${maximum} B4UT`,
        error: 'Amount too high',
      };
    }

    // Calculate Pi amount
    const { piAmount } = await calculatePiAmount(b4utAmount);
    const [user] = await db
      .select({ piUID: schema.users.piUID, walletAddress: schema.users.walletAddress })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user?.piUID) {
      return {
        success: false,
        message: 'Verified Pi UID is required for redemption',
        error: 'Missing Pi UID',
      };
    }

    // Create redemption request
    const requestId = randomUUID();
    await db.insert(schema.redemptionRequests).values({
      id: requestId,
      userId,
      b4utAmount,
      piAmount: piAmount.toString(),
      status: 'pending',
      piUID: user.piUID,
      walletAddress: walletAddress || user.walletAddress || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Trigger automatic processing
    processRedemptionRequest(requestId).catch(console.error);

    return {
      success: true,
      piAmount,
      message: `Redemption request created successfully. ${b4utAmount} B4UT = ${piAmount.toFixed(4)} Pi`,
    };
  } catch (error) {
    console.error('Error creating redemption request:', error);
    return {
      success: false,
      message: 'Failed to create redemption request',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process redemption request automatically
 */
export async function processRedemptionRequest(requestId: string): Promise<ConversionResult> {
  try {
    // Get redemption request
    const request = await db
      .select()
      .from(schema.redemptionRequests)
      .where(eq(schema.redemptionRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      return {
        success: false,
        message: 'Redemption request not found',
        error: 'Not found',
      };
    }

    const redemption = request[0];

    // Check if already processed
    if (redemption.status !== 'pending') {
      return {
        success: false,
        message: `Redemption request already ${redemption.status}`,
        error: 'Already processed',
      };
    }

    // Get user's token balance
    const user = await db
      .select({ tokens: schema.users.tokens, piUID: schema.users.piUID })
      .from(schema.users)
      .where(eq(schema.users.id, redemption.userId))
      .limit(1);

    if (user.length === 0) {
      return {
        success: false,
        message: 'User not found',
        error: 'User not found',
      };
    }

    if (user[0].tokens < redemption.b4utAmount) {
      // Update request status to rejected
      await db
        .update(schema.redemptionRequests)
        .set({
          status: 'rejected',
          adminNotes: 'Insufficient token balance',
          updatedAt: new Date(),
        })
        .where(eq(schema.redemptionRequests.id, requestId));

      return {
        success: false,
        message: 'Insufficient token balance',
        error: 'Insufficient balance',
      };
    }

    // Get active treasury wallet
    const treasuryWallet = await db
      .select()
      .from(schema.piTreasuryWallet)
      .where(eq(schema.piTreasuryWallet.isActive, true))
      .limit(1);

    if (treasuryWallet.length === 0) {
      return {
        success: false,
        message: 'No active treasury wallet configured',
        error: 'No treasury wallet',
      };
    }

    // Burn B4UT tokens
    const { burnTokens } = await import('./b4ut-token-service.js');
    const burnResult = await burnTokens(
      redemption.userId,
      redemption.b4utAmount,
      'redemption',
      `Redemption request: ${requestId}`,
      requestId
    );

    if (!burnResult.success) {
      return {
        success: false,
        message: 'Failed to burn B4UT tokens',
        error: burnResult.error,
      };
    }

    // Send Pi from treasury wallet
    const piResult = await sendPiFromTreasury(
      treasuryWallet[0].walletAddress,
      user[0].piUID,
      Number(redemption.piAmount),
      requestId
    );

    if (!piResult.success) {
      // Refund tokens if Pi transfer fails
      await (await import('./b4ut-token-service.js')).awardTokens(
        redemption.userId,
        redemption.b4utAmount,
        'redemption_refund',
        `Refund for failed redemption: ${requestId}`,
        requestId
      );

      return {
        success: false,
        message: 'Failed to transfer Pi. Tokens refunded.',
        error: piResult.error,
      };
    }

    // Update redemption request status
    await db
      .update(schema.redemptionRequests)
      .set({
        status: 'completed',
        txid: piResult.txid,
        updatedAt: new Date(),
      })
      .where(eq(schema.redemptionRequests.id, requestId));

    // Log treasury transaction
    await db.insert(schema.treasuryLogs).values({
      id: randomUUID(),
      walletType: 'main',
      action: 'withdrawal',
      amount: redemption.piAmount,
      balanceAfter: '0', // Would need to fetch actual balance
      txid: piResult.txid,
      referenceId: requestId,
      createdAt: new Date(),
    });

    return {
      success: true,
      piAmount: Number(redemption.piAmount),
      txid: piResult.txid,
      message: `Successfully converted ${redemption.b4utAmount} B4UT to ${redemption.piAmount} Pi`,
    };
  } catch (error) {
    console.error('Error processing redemption request:', error);
    return {
      success: false,
      message: 'Failed to process redemption request',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send Pi from treasury wallet using Pi Network SDK (A2U 3-step flow)
 * Per Pi docs: createPayment → submitPayment → completePayment
 */
async function sendPiFromTreasury(
  fromAddress: string,
  recipientUID: string,
  amount: number,
  referenceId: string
): Promise<{ success: boolean; txid?: string; error?: string }> {
  try {
    // Use the official pi-backend SDK via PiNetworkService
    const { piNetworkService } = await import('./pi-network.js');
    
    const result = await piNetworkService.processFullA2UPayment({
      amount,
      memo: `B4UT redemption ${referenceId}`,
      metadata: {
        reference_id: referenceId,
        purpose: 'B4UT token redemption',
        treasury_wallet_address: fromAddress,
      },
      uid: recipientUID,
    });

    if (result && result.txid) {
      return { success: true, txid: result.txid };
    }

    return {
      success: false,
      error: 'A2U payment failed — no txid returned',
    };
  } catch (error) {
    console.error('Error sending Pi from treasury:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's redemption history
 */
export async function getRedemptionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<RedemptionRequest[]> {
  const redemptions = await db
    .select()
    .from(schema.redemptionRequests)
    .where(eq(schema.redemptionRequests.userId, userId))
    .orderBy(desc(schema.redemptionRequests.createdAt))
    .limit(limit)
    .offset(offset);

  return redemptions.map(mapRedemptionRequest);
}

/**
 * Get redemption request by ID
 */
export async function getRedemptionRequest(requestId: string): Promise<RedemptionRequest | null> {
  const request = await db
    .select()
    .from(schema.redemptionRequests)
    .where(eq(schema.redemptionRequests.id, requestId))
    .limit(1);

  return request[0] ? mapRedemptionRequest(request[0]) : null;
}

/**
 * Check if user can redeem (within limits)
 */
export async function canRedeem(userId: string, amount: number): Promise<{ canRedeem: boolean; reason?: string }> {
  try {
    // Check daily/weekly limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const [todayRedemptions, weekRedemptions] = await Promise.all([
      db
        .select({ total: sql<number>`sum(b4ut_amount)` })
        .from(schema.redemptionRequests)
        .where(
          and(
            eq(schema.redemptionRequests.userId, userId),
            eq(schema.redemptionRequests.status, 'completed'),
            gte(schema.redemptionRequests.createdAt, today)
          )
        ),
      db
        .select({ total: sql<number>`sum(b4ut_amount)` })
        .from(schema.redemptionRequests)
        .where(
          and(
            eq(schema.redemptionRequests.userId, userId),
            eq(schema.redemptionRequests.status, 'completed'),
            gte(schema.redemptionRequests.createdAt, thisWeek)
          )
        ),
    ]);

    const todayTotal = Number(todayRedemptions[0]?.total || 0);
    const weekTotal = Number(weekRedemptions[0]?.total || 0);

    // Get user's tier limits
    const user = await db
      .select({ totalSpent: schema.users.totalSpent })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    const totalSpent = Number(user[0]?.totalSpent || 0);
    let dailyLimit = 5000;
    let weeklyLimit = 20000;

    // VIP users get higher limits
    if (totalSpent >= 100) {
      dailyLimit = 10000;
      weeklyLimit = 50000;
    }

    if (todayTotal + amount > dailyLimit) {
      return {
        canRedeem: false,
        reason: `Daily limit exceeded. You can redeem up to ${dailyLimit - todayTotal} more B4UT today.`,
      };
    }

    if (weekTotal + amount > weeklyLimit) {
      return {
        canRedeem: false,
        reason: `Weekly limit exceeded. You can redeem up to ${weeklyLimit - weekTotal} more B4UT this week.`,
      };
    }

    return { canRedeem: true };
  } catch (error) {
    console.error('Error checking redemption limits:', error);
    return { canRedeem: false, reason: 'Error checking limits' };
  }
}
