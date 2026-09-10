import { randomBytes, randomUUID } from "crypto";
import { pool } from "../db.js";
import { pricingService } from "./pricing.js";
import { sendMarketingOfferEmail } from "./email.js";

export const MARKETING_CAMPAIGN_TYPES = {
  inactiveUsers: "inactive_users",
  monthlyBuyers: "monthly_buyers",
} as const;

const BASE_APP_URL =
  process.env.APP_URL ||
  process.env.VERCEL_APP_URL ||
  "https://b4uesportstest.vercel.app";

const OFFER_CONFIG = {
  discountPercent: 2,
  bonusTokens: 500,
  inactiveUsersExpiryDays: 5,
  monthlyBuyersExpiryDays: 7,
};

type CampaignType =
  (typeof MARKETING_CAMPAIGN_TYPES)[keyof typeof MARKETING_CAMPAIGN_TYPES];

interface CampaignRunResult {
  campaignType: CampaignType;
  eligible: number;
  sent: number;
  failed: number;
  generatedCoupons: number;
}

interface ValidatedCouponDetails {
  couponId: string;
  code: string;
  campaignType: string;
  discountPercent: number;
  bonusTokens: number;
  expiresAt: string;
  originalPiAmount: number;
  discountedPiAmount: number;
  originalUsdAmount: number;
  discountedUsdAmount: number;
  packageId: string;
}

export class MarketingCouponError extends Error {
  code: string;
  status: number;
  expose: boolean;

  constructor(code: string, message: string, status = 400, expose = true) {
    super(message);
    this.name = "MarketingCouponError";
    this.code = code;
    this.status = status;
    this.expose = expose;
  }
}

let marketingSchemaInitPromise: Promise<void> | null = null;

async function ensureMarketingSchema(): Promise<void> {
  if (!marketingSchemaInitPromise) {
    marketingSchemaInitPromise = (async () => {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

      await pool.query(`
        ALTER TABLE app_users
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS marketing_email_sends (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES app_users(id),
          campaign_type TEXT NOT NULL,
          campaign_period TEXT,
          subject TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          open_tracking_token TEXT NOT NULL UNIQUE,
          click_tracking_token TEXT NOT NULL UNIQUE,
          coupon_id VARCHAR,
          sent_at TIMESTAMP,
          opened_at TIMESTAMP,
          first_clicked_at TIMESTAMP,
          converted_at TIMESTAMP,
          conversion_transaction_id VARCHAR REFERENCES app_transactions(id),
          open_count INTEGER NOT NULL DEFAULT 0,
          click_count INTEGER NOT NULL DEFAULT 0,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS marketing_coupons (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          code TEXT NOT NULL UNIQUE,
          user_id VARCHAR NOT NULL REFERENCES app_users(id),
          campaign_type TEXT NOT NULL,
          email_send_id VARCHAR REFERENCES marketing_email_sends(id),
          discount_percent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
          bonus_tokens INTEGER NOT NULL DEFAULT 500,
          status TEXT NOT NULL DEFAULT 'active',
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          used_by_transaction_id VARCHAR REFERENCES app_transactions(id),
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE constraint_name = 'marketing_email_sends_coupon_id_fkey'
              AND table_name = 'marketing_email_sends'
          ) THEN
            ALTER TABLE marketing_email_sends
            ADD CONSTRAINT marketing_email_sends_coupon_id_fkey
            FOREIGN KEY (coupon_id) REFERENCES marketing_coupons(id);
          END IF;
        END $$;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS marketing_email_events (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          email_send_id VARCHAR NOT NULL REFERENCES marketing_email_sends(id),
          event_type TEXT NOT NULL,
          token TEXT NOT NULL,
          target_url TEXT,
          user_agent TEXT,
          ip_address TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_marketing_email_sends_user_campaign
        ON marketing_email_sends(user_id, campaign_type, campaign_period)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_marketing_coupons_user_status
        ON marketing_coupons(user_id, status, expires_at)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_marketing_email_events_send_type
        ON marketing_email_events(email_send_id, event_type)
      `);
    })().catch((error) => {
      marketingSchemaInitPromise = null;
      throw error;
    });
  }

  await marketingSchemaInitPromise;
}

function generateTrackingToken(): string {
  return randomBytes(18).toString("hex");
}

function generateCouponCode(username: string): string {
  const prefix = username.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4) || "B4U";
  return `${prefix}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function formatExpiry(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function getCampaignContent(campaignType: CampaignType, expiresAt: Date) {
  if (campaignType === MARKETING_CAMPAIGN_TYPES.inactiveUsers) {
    return {
      subject: "We saved 500 bonus tokens for you - 2% off ends soon",
      headline: "Your comeback reward is waiting",
      preheader: "Return to B4U Esports with a one-time reward before it expires.",
      urgencyText: `Your personal reward expires ${formatExpiry(expiresAt)}. Once it expires, the code stops working.`,
      campaignLabel: "Come Back Reward",
    };
  }

  return {
    subject: "VIP thank-you: your 500 token reward + 2% off is live",
    headline: "Thanks for buying with B4U Esports",
    preheader: "Your monthly buyer reward is ready. Use it before the deadline.",
    urgencyText: `This monthly buyer reward is active until ${formatExpiry(expiresAt)} only.`,
    campaignLabel: "Monthly Buyer Reward",
  };
}

async function createEmailSend(userId: string, campaignType: CampaignType, campaignPeriod: string | null, subject: string) {
  const id = randomUUID();
  const openTrackingToken = generateTrackingToken();
  const clickTrackingToken = generateTrackingToken();

  await pool.query(
    `INSERT INTO marketing_email_sends (
      id, user_id, campaign_type, campaign_period, subject, status,
      open_tracking_token, click_tracking_token, metadata, created_at
    )
    VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, '{}'::jsonb, NOW())`,
    [id, userId, campaignType, campaignPeriod, subject, openTrackingToken, clickTrackingToken]
  );

  return { id, openTrackingToken, clickTrackingToken };
}

async function issueCouponForSend(userId: string, campaignType: CampaignType, emailSendId: string, username: string, expiresAt: Date) {
  let code = generateCouponCode(username);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await pool.query(
        `INSERT INTO marketing_coupons (
          id, code, user_id, campaign_type, email_send_id, discount_percent,
          bonus_tokens, status, expires_at, metadata, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, '{}'::jsonb, NOW())
        RETURNING id, code`,
        [
          randomUUID(),
          code,
          userId,
          campaignType,
          emailSendId,
          OFFER_CONFIG.discountPercent.toFixed(2),
          OFFER_CONFIG.bonusTokens,
          expiresAt,
        ]
      );

      await pool.query(
        `UPDATE marketing_email_sends SET coupon_id = $1 WHERE id = $2`,
        [result.rows[0].id, emailSendId]
      );

      return result.rows[0] as { id: string; code: string };
    } catch (error: any) {
      if (error?.code !== "23505") throw error;
      code = generateCouponCode(username);
    }
  }

  throw new Error("Failed to generate unique coupon code");
}

async function markEmailSendStatus(emailSendId: string, status: "sent" | "failed", metadata: Record<string, any> = {}) {
  await pool.query(
    `UPDATE marketing_email_sends
     SET status = $1,
         sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END,
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
     WHERE id = $2`,
    [status, emailSendId, JSON.stringify(metadata)]
  );
}

async function tryAcquireCampaignLock(lockKey: number): Promise<boolean> {
  const result = await pool.query(`SELECT pg_try_advisory_lock($1) AS acquired`, [lockKey]);
  return !!result.rows[0]?.acquired;
}

async function releaseCampaignLock(lockKey: number): Promise<void> {
  await pool.query(`SELECT pg_advisory_unlock($1)`, [lockKey]);
}

async function getEligibleInactiveUsers() {
  const result = await pool.query(
    `WITH ranked_users AS (
       SELECT
         u.id,
         u.username,
         u.email,
         LOWER(TRIM(u.email)) AS normalized_email,
         COALESCE(u.last_login, u.created_at) AS last_seen_at,
         ROW_NUMBER() OVER (
           PARTITION BY LOWER(TRIM(u.email))
           ORDER BY COALESCE(u.last_login, u.created_at) DESC, u.created_at DESC, u.id DESC
         ) AS email_rank
       FROM app_users u
       WHERE u.email IS NOT NULL
         AND TRIM(u.email) <> ''
         AND COALESCE(u.last_login, u.created_at) <= NOW() - INTERVAL '7 days'
     )
     SELECT ru.id, ru.username, ru.email, ru.last_seen_at
     FROM ranked_users ru
     WHERE ru.email_rank = 1
       AND NOT EXISTS (
         SELECT 1
         FROM marketing_email_sends mes
         JOIN app_users existing_user ON existing_user.id = mes.user_id
         WHERE LOWER(TRIM(existing_user.email)) = ru.normalized_email
           AND mes.campaign_type = $1
           AND mes.created_at >= NOW() - INTERVAL '7 days'
       )
     ORDER BY ru.last_seen_at ASC`,
    [MARKETING_CAMPAIGN_TYPES.inactiveUsers]
  );

  return result.rows as Array<{ id: string; username: string; email: string; last_seen_at: string }>;
}

async function getEligibleMonthlyBuyers(campaignPeriod: string, includeAllHistory = false) {
  const result = await pool.query(
    `WITH buyer_stats AS (
       SELECT
         u.id,
         u.username,
         u.email,
         LOWER(TRIM(u.email)) AS normalized_email,
         COUNT(t.id) AS completed_purchases,
         MAX(t.created_at) AS last_purchase_at,
         ROW_NUMBER() OVER (
           PARTITION BY LOWER(TRIM(u.email))
           ORDER BY COUNT(t.id) DESC, MAX(t.created_at) DESC, u.created_at DESC, u.id DESC
         ) AS email_rank
       FROM app_users u
       JOIN app_transactions t
         ON t.user_id = u.id
        AND t.status = 'completed'
        AND (
          $3::boolean = true
          OR DATE_TRUNC('month', t.created_at) = DATE_TRUNC('month', NOW())
        )
       WHERE u.email IS NOT NULL
         AND TRIM(u.email) <> ''
       GROUP BY u.id, u.username, u.email, u.created_at
     )
     SELECT bs.id, bs.username, bs.email, bs.completed_purchases
     FROM buyer_stats bs
     WHERE bs.email_rank = 1
       AND NOT EXISTS (
         SELECT 1
         FROM marketing_email_sends mes
         JOIN app_users existing_user ON existing_user.id = mes.user_id
         WHERE LOWER(TRIM(existing_user.email)) = bs.normalized_email
           AND mes.campaign_type = $1
           AND ($3::boolean = true OR mes.campaign_period = $2)
       )
     ORDER BY bs.completed_purchases DESC, bs.username ASC`,
    [MARKETING_CAMPAIGN_TYPES.monthlyBuyers, campaignPeriod, includeAllHistory]
  );

  return result.rows as Array<{ id: string; username: string; email: string; completed_purchases: string }>;
}

async function shouldRunMonthlyHistoricalBackfill(): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM marketing_email_sends
     WHERE campaign_type = $1`,
    [MARKETING_CAMPAIGN_TYPES.monthlyBuyers]
  );

  return (result.rows[0]?.count || 0) === 0;
}

async function sendCampaignEmailToUser(user: { id: string; username: string; email: string }, campaignType: CampaignType, campaignPeriod: string | null, expiresAt: Date) {
  const campaignContent = getCampaignContent(campaignType, expiresAt);
  const emailSend = await createEmailSend(user.id, campaignType, campaignPeriod, campaignContent.subject);
  const coupon = await issueCouponForSend(user.id, campaignType, emailSend.id, user.username, expiresAt);

  const landingUrl = `${BASE_APP_URL}/?coupon=${encodeURIComponent(coupon.code)}`;
  const clickUrl = `${BASE_APP_URL}/api/marketing/track/click?token=${encodeURIComponent(emailSend.clickTrackingToken)}&redirect=${encodeURIComponent(landingUrl)}`;
  const openUrl = `${BASE_APP_URL}/api/marketing/track/open?token=${encodeURIComponent(emailSend.openTrackingToken)}`;

  const sent = await sendMarketingOfferEmail({
    to: user.email,
    username: user.username,
    subject: campaignContent.subject,
    headline: campaignContent.headline,
    preheader: campaignContent.preheader,
    urgencyText: campaignContent.urgencyText,
    campaignLabel: campaignContent.campaignLabel,
    couponCode: coupon.code,
    discountPercent: OFFER_CONFIG.discountPercent,
    bonusTokens: OFFER_CONFIG.bonusTokens,
    expiresAtText: formatExpiry(expiresAt),
    ctaUrl: clickUrl,
    trackingPixelUrl: openUrl,
  });

  await markEmailSendStatus(emailSend.id, sent ? "sent" : "failed", {
    couponCode: coupon.code,
    expiresAt: expiresAt.toISOString(),
    landingUrl,
  });

  return { sent, couponCode: coupon.code };
}

export async function runInactiveUsersCampaign(): Promise<CampaignRunResult> {
  await ensureMarketingSchema();
  const lockKey = 940001;
  const acquired = await tryAcquireCampaignLock(lockKey);
  if (!acquired) {
    return {
      campaignType: MARKETING_CAMPAIGN_TYPES.inactiveUsers,
      eligible: 0,
      sent: 0,
      failed: 0,
      generatedCoupons: 0,
    };
  }

  try {
    const users = await getEligibleInactiveUsers();
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const expiresAt = new Date(Date.now() + OFFER_CONFIG.inactiveUsersExpiryDays * 24 * 60 * 60 * 1000);
        const result = await sendCampaignEmailToUser(user, MARKETING_CAMPAIGN_TYPES.inactiveUsers, null, expiresAt);
        if (result.sent) sent++;
        else failed++;
      } catch (error) {
        console.error("Inactive users campaign failed for user:", user.id, error);
        failed++;
      }
    }

    return {
      campaignType: MARKETING_CAMPAIGN_TYPES.inactiveUsers,
      eligible: users.length,
      sent,
      failed,
      generatedCoupons: sent,
    };
  } finally {
    await releaseCampaignLock(lockKey);
  }
}

export async function runMonthlyBuyersCampaign(): Promise<CampaignRunResult> {
  await ensureMarketingSchema();
  const lockKey = 940002;
  const acquired = await tryAcquireCampaignLock(lockKey);
  if (!acquired) {
    return {
      campaignType: MARKETING_CAMPAIGN_TYPES.monthlyBuyers,
      eligible: 0,
      sent: 0,
      failed: 0,
      generatedCoupons: 0,
    };
  }

  try {
    const runHistoricalBackfill = await shouldRunMonthlyHistoricalBackfill();
    const campaignPeriod = runHistoricalBackfill
      ? 'historical-catchup'
      : new Date().toISOString().slice(0, 7);
    const users = await getEligibleMonthlyBuyers(campaignPeriod, runHistoricalBackfill);
    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const expiresAt = new Date(Date.now() + OFFER_CONFIG.monthlyBuyersExpiryDays * 24 * 60 * 60 * 1000);
        const result = await sendCampaignEmailToUser(user, MARKETING_CAMPAIGN_TYPES.monthlyBuyers, campaignPeriod, expiresAt);
        if (result.sent) sent++;
        else failed++;
      } catch (error) {
        console.error("Monthly buyers campaign failed for user:", user.id, error);
        failed++;
      }
    }

    return {
      campaignType: MARKETING_CAMPAIGN_TYPES.monthlyBuyers,
      eligible: users.length,
      sent,
      failed,
      generatedCoupons: sent,
    };
  } finally {
    await releaseCampaignLock(lockKey);
  }
}

export async function validateCouponForUser(userId: string, code: string, packageId: string): Promise<ValidatedCouponDetails> {
  await ensureMarketingSchema();
  await pool.query(
    `UPDATE marketing_coupons
     SET status = 'expired'
     WHERE status = 'active' AND expires_at < NOW()`
  );

  const couponResult = await pool.query(
    `SELECT mc.id, mc.code, mc.campaign_type, mc.discount_percent, mc.bonus_tokens, mc.expires_at
     FROM marketing_coupons mc
     WHERE mc.code = $1
       AND mc.user_id = $2
       AND mc.status = 'active'
       AND mc.expires_at > NOW()
     LIMIT 1`,
    [code.trim().toUpperCase(), userId]
  );

  if (couponResult.rows.length === 0) {
    throw new MarketingCouponError("COUPON_INVALID", "Invalid or expired coupon");
  }

  const packageResult = await pool.query(
    `SELECT id, name, usdt_value FROM app_packages WHERE id = $1 LIMIT 1`,
    [packageId]
  );

  if (packageResult.rows.length === 0) {
    throw new MarketingCouponError("COUPON_VALIDATION_FAILED", "Unable to validate coupon right now");
  }

  const pkg = packageResult.rows[0];
  const currentPiPrice = await pricingService.getCurrentPiPrice();
  const originalUsdAmount = parseFloat(pkg.usdt_value);
  const discountedUsdAmount = parseFloat((originalUsdAmount * (1 - OFFER_CONFIG.discountPercent / 100)).toFixed(4));
  const originalPiAmount = pkg.name === "0.06 UC"
    ? 0.0001
    : parseFloat((originalUsdAmount / currentPiPrice).toFixed(8));
  const discountedPiAmount = pkg.name === "0.06 UC"
    ? parseFloat((0.0001 * (1 - OFFER_CONFIG.discountPercent / 100)).toFixed(8))
    : parseFloat((discountedUsdAmount / currentPiPrice).toFixed(8));

  const coupon = couponResult.rows[0];
  return {
    couponId: coupon.id,
    code: coupon.code,
    campaignType: coupon.campaign_type,
    discountPercent: parseFloat(coupon.discount_percent),
    bonusTokens: coupon.bonus_tokens,
    expiresAt: coupon.expires_at,
    originalPiAmount,
    discountedPiAmount,
    originalUsdAmount,
    discountedUsdAmount,
    packageId,
  };
}

export async function trackMarketingOpen(token: string, userAgent?: string, ipAddress?: string) {
  await ensureMarketingSchema();
  const result = await pool.query(
    `UPDATE marketing_email_sends
     SET open_count = open_count + 1,
         opened_at = COALESCE(opened_at, NOW())
     WHERE open_tracking_token = $1
     RETURNING id`,
    [token]
  );

  if (result.rows.length === 0) return false;

  await pool.query(
    `INSERT INTO marketing_email_events (id, email_send_id, event_type, token, user_agent, ip_address, created_at)
     VALUES ($1, $2, 'open', $3, $4, $5, NOW())`,
    [randomUUID(), result.rows[0].id, token, userAgent || null, ipAddress || null]
  );
  return true;
}

export async function trackMarketingClick(token: string, redirectUrl: string, userAgent?: string, ipAddress?: string) {
  await ensureMarketingSchema();
  const result = await pool.query(
    `UPDATE marketing_email_sends
     SET click_count = click_count + 1,
         first_clicked_at = COALESCE(first_clicked_at, NOW())
     WHERE click_tracking_token = $1
     RETURNING id`,
    [token]
  );

  if (result.rows.length > 0) {
    await pool.query(
      `INSERT INTO marketing_email_events (id, email_send_id, event_type, token, target_url, user_agent, ip_address, created_at)
       VALUES ($1, $2, 'click', $3, $4, $5, $6, NOW())`,
      [randomUUID(), result.rows[0].id, token, redirectUrl, userAgent || null, ipAddress || null]
    );
  }

  return redirectUrl;
}

export async function applyCouponRedemptionForTransaction(transactionId: string) {
  await ensureMarketingSchema();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const transactionResult = await client.query(
      `SELECT id, user_id, metadata, status
       FROM app_transactions
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [transactionId]
    );

    if (transactionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { applied: false, reason: "transaction_not_found" };
    }

    const transaction = transactionResult.rows[0];
    if (transaction.status !== "completed") {
      await client.query("ROLLBACK");
      return { applied: false, reason: "transaction_not_completed" };
    }

    const metadata = transaction.metadata || {};
    const couponCode = metadata.marketingCouponCode as string | undefined;
    if (!couponCode) {
      await client.query("ROLLBACK");
      return { applied: false, reason: "no_coupon" };
    }

    const couponResult = await client.query(
      `SELECT id, bonus_tokens, email_send_id, status
       FROM marketing_coupons
       WHERE code = $1
         AND user_id = $2
       LIMIT 1
       FOR UPDATE`,
      [couponCode, transaction.user_id]
    );

    if (couponResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { applied: false, reason: "coupon_not_found" };
    }

    const coupon = couponResult.rows[0];
    if (coupon.status !== "active") {
      await client.query("ROLLBACK");
      return { applied: false, reason: "coupon_not_active" };
    }

    await client.query(
      `UPDATE marketing_coupons
       SET status = 'used',
           used_at = NOW(),
           used_by_transaction_id = $1
       WHERE id = $2`,
      [transactionId, coupon.id]
    );

    await client.query(
      `UPDATE app_users
       SET tokens = COALESCE(tokens, 0) + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [coupon.bonus_tokens, transaction.user_id]
    );

    if (coupon.email_send_id) {
      await client.query(
        `UPDATE marketing_email_sends
         SET converted_at = NOW(),
             conversion_transaction_id = $1
         WHERE id = $2`,
        [transactionId, coupon.email_send_id]
      );
    }

    await client.query("COMMIT");
    return { applied: true, bonusTokens: coupon.bonus_tokens };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

