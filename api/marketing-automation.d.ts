export interface CampaignRunResult {
  campaignType: string;
  eligible: number;
  sent: number;
  failed: number;
  generatedCoupons: number;
}

export interface ValidatedCouponDetails {
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

export function runInactiveUsersCampaign(): Promise<CampaignRunResult>;
export function runMonthlyBuyersCampaign(): Promise<CampaignRunResult>;
export function validateCouponForUser(
  userId: string,
  code: string,
  packageId: string
): Promise<ValidatedCouponDetails>;
export function trackMarketingOpen(
  token: string,
  userAgent?: string,
  ipAddress?: string
): Promise<boolean>;
export function trackMarketingClick(
  token: string,
  redirectUrl: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string>;
export function applyCouponRedemptionForTransaction(
  transactionId: string
): Promise<{ applied: boolean; reason?: string; bonusTokens?: number }>;
