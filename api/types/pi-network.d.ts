// Direct declaration for exact path that Vercel is looking for
declare module '../dist/server/services/pi-network.js' {
  export class PiNetwork {
    constructor();
    getIncompletePayments(): Promise<any[]>;
    getPaymentDetails(paymentId: string): Promise<any>;
    completePayment(paymentId: string, txid: string): Promise<any>;
    cancelPayment(paymentId: string): Promise<any>;
  }
  
  export function getPiBalance(address: string): Promise<string>;
  export function validatePiAddress(address: string): Promise<boolean>;

  export interface PiUser {
    uid: string;
    username: string;
    roles: string[];
  }

  export interface PaymentData {
    amount: number;
    memo: string;
    metadata: {
      type: 'backend';
      userId: string;
      packageId: string;
      gameAccount: Record<string, string>;
      [key: string]: any;
    };
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

  export interface AdDTO {
    identifier: string;
    type: 'rewarded' | 'interstitial';
    mediator_ack_status: 'granted' | 'revoked' | 'failed' | null;
    mediator_granted_at: string | null;
    mediator_revoked_at: string | null;
  }

  export class PiNetworkService {
    constructor();
    
    verifyAccessToken(accessToken: string): Promise<PiUser | null>;
    approvePayment(paymentId: string): Promise<boolean>;
    completePayment(paymentId: string, txid: string): Promise<boolean>;
    getPayment(paymentId: string): Promise<PaymentDTO | null>;
    cancelPayment(paymentId: string): Promise<boolean>;
    verifyAdStatus(adId: string): Promise<AdDTO | null>;
    isAdRewardGranted(adId: string): Promise<boolean>;
    getPiBalance(walletAddress: string): Promise<string>;
  }

  export const piNetworkService: PiNetworkService;
}

declare module '../server/services/pi-network.js' {
  export class PiNetwork {
    constructor();
    getIncompletePayments(): Promise<any[]>;
    getPaymentDetails(paymentId: string): Promise<any>;
    completePayment(paymentId: string, txid: string): Promise<any>;
    cancelPayment(paymentId: string): Promise<any>;
  }
  
  export function getPiBalance(address: string): Promise<string>;
  export function validatePiAddress(address: string): Promise<boolean>;

  export interface PiUser {
    uid: string;
    username: string;
    roles: string[];
  }

  export interface PaymentData {
    amount: number;
    memo: string;
    metadata: {
      type: 'backend';
      userId: string;
      packageId: string;
      gameAccount: Record<string, string>;
      [key: string]: any;
    };
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

  export interface AdDTO {
    identifier: string;
    type: 'rewarded' | 'interstitial';
    mediator_ack_status: 'granted' | 'revoked' | 'failed' | null;
    mediator_granted_at: string | null;
    mediator_revoked_at: string | null;
  }

  export class PiNetworkService {
    constructor();
    
    verifyAccessToken(accessToken: string): Promise<PiUser | null>;
    approvePayment(paymentId: string): Promise<boolean>;
    completePayment(paymentId: string, txid: string): Promise<boolean>;
    getPayment(paymentId: string): Promise<PaymentDTO | null>;
    cancelPayment(paymentId: string): Promise<boolean>;
    verifyAdStatus(adId: string): Promise<AdDTO | null>;
    isAdRewardGranted(adId: string): Promise<boolean>;
    getPiBalance(walletAddress: string): Promise<string>;
  }

  export const piNetworkService: PiNetworkService;
}
