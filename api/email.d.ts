export interface PurchaseConfirmationParams {
  to: string;
  username: string;
  packageName: string;
  piAmount: string;
  usdAmount: string;
  gameAccount: string;
  transactionId: string;
  paymentId: string;
  isTestnet?: boolean;
}

export interface ProfileUpdateParams {
  to: string;
  username: string;
  profileData: any;
}

export interface AdminPurchaseNotificationParams {
  adminEmail: string;
  username: string;
  userEmail: string;
  userPhone: string;
  packageName: string;
  game: string;
  inGameAmount: number;
  piAmount: string;
  usdAmount: string;
  gameAccount: string;
  transactionId: string;
  paymentId: string;
  txid: string;
}

export function sendPurchaseConfirmationEmail(params: PurchaseConfirmationParams): Promise<boolean>;
export function sendProfileUpdateEmail(params: ProfileUpdateParams): Promise<boolean>;
export function sendAdminPurchaseNotification(params: AdminPurchaseNotificationParams): Promise<boolean>;