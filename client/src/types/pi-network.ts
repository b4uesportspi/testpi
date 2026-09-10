export interface PiUser {
  uid: string;
  username: string;
  roles: string[];
}

export type PaymentType = 'TOKEN_PURCHASE' | 'TOURNAMENT_ENTRY' | 'WALLET_TOPUP' | 'SERVICE_PAYMENT' | 'SUBSCRIPTION';

export interface SubscriptionDetails {
  userName: string;
  userEmail: string;
  userPhone: string;
  contactNumber?: string;
  userGameIgn: string;
  userGameUid: string;
  userTeamName?: string;
  subscriptionType: 'weekly' | 'monthly' | string;
  subscriptionDuration?: string;
  subscriptionName?: string;
}

export interface PaymentData {
  amount: number;
  memo: string;
  paymentType?: PaymentType;
  metadata: {
    type: 'backend' | 'tournament_entry' | 'subscription';
    userId: string;
    packageId?: string;
    tournamentId?: string;
    gameAccount?: Record<string, any>;
    subscriptionDetails?: SubscriptionDetails;
    [key: string]: any;
  };
}

export interface PaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PaymentDTO) => void;
}

export interface PaymentDTO {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  from_address: string;
  to_address: string;
  direction: 'user_to_app' | 'app_to_user';
  created_at: string;
  network: 'Pi Network';
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | {
    txid: string;
    verified: boolean;
    _link: string;
  };
}

export interface PiPrice {
  price: number;
  lastUpdated: string;
}

export interface Package {
  id: string;
  game: string; // Package platform/service category, e.g. game or social media/subscription category
  name: string;
  inGameAmount: number;
  usdtValue: string;
  image: string;
  isActive: boolean;
  piPrice?: number;
  currentPiPrice?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  walletAddress: string;
  piBalance?: string;
  gameAccounts?: {
    pubg?: { ign: string; uid: string };
    pubgkr?: { ign: string; uid: string };
    mlbb?: { userId: string; zoneId: string };
    coc?: { email: string };
    robux?: { email?: string; whatsapp?: string; username?: string };
    newstate?: { email?: string; whatsapp?: string; characterId?: string };
    freefire?: { playerId: string };
    tiktok?: { username: string };
    youtube?: { channelUrl: string };
    facebook?: { profileUrl: string };
    instagram?: { username: string };
    netflix?: { email: string; whatsapp: string };
    canva?: { email: string; whatsapp: string };
  };
  socialAccounts?: {
    tiktok?: { username?: string; email?: string; password?: string; link?: string; description?: string };
    youtube?: { channelUrl?: string; link?: string; email?: string; password?: string };
    facebook?: { profileUrl?: string; link: string };
    instagram?: { username?: string; link: string };
    netflix?: { email: string; whatsapp: string };
    canva?: { email: string; whatsapp: string };
  };
  referralCode?: string;
  isProfileVerified?: boolean;
  tokens?: number;
  profilePicture?: string;
  piUID?: string;
  isAdmin?: boolean;
  totalSpent?: string | number; // Add totalSpent field
}

export interface Transaction {
  id: string;
  userId: string;
  packageId: string;
  paymentId: string;
  txid?: string;
  piAmount: string;
  usdAmount: string;
  piPriceAtTime: string;
  status: string;
  failureReason?: string; // Reason for failed or cancelled transactions
  successReason?: string; // Reason for completed transactions
  paymentType?: PaymentType;
  gameAccount: Record<string, string>;
  metadata?: Record<string, any>;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}
