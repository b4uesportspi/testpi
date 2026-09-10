import axios from 'axios';
import dotenv from 'dotenv';
// @ts-ignore — pi-backend has no type declarations
import PiNetworkPkg from 'pi-backend';
// pi-backend exports as CJS — handle both default and named export
const PiNetwork = (PiNetworkPkg as any).default || PiNetworkPkg;

dotenv.config();

const PI_API_BASE = 'https://api.minepi.com';
const SERVER_API_KEY = process.env.PI_SERVER_API_KEY || 'your_pi_server_api_key_here';
const WALLET_PRIVATE_SEED = process.env.WALLET_PRIVATE_SEED || '';
const isSandboxMode = process.env.PI_SANDBOX_MODE === 'true';

// Official pi-backend SDK instance — used for A2U payments (requires WALLET_PRIVATE_SEED)
let piBackendClient: any = null;
function getPiBackendClient() {
  if (!piBackendClient && SERVER_API_KEY && WALLET_PRIVATE_SEED) {
    try {
      piBackendClient = new PiNetwork(SERVER_API_KEY, WALLET_PRIVATE_SEED);
      console.log('✅ pi-backend SDK client initialized (A2U payments ready)');
    } catch (e: any) {
      console.error('❌ Failed to init pi-backend SDK:', e.message);
    }
  }
  return piBackendClient;
}

export interface PiUser {
  uid: string;
  username: string;
  roles: string[];
  wallet_address?: string; // Wallet address from Pi Network
}

export interface PaymentArgs {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  uid: string;  // Pi Network user UID
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

export interface AppStakingData {
  effective_stake: number;
  base_stake: number;
  boost_multiplier: number;
  staked_at: string | null;
  app_id?: string;
  user_uid?: string;
}

export interface InAppNotificationItem {
  title: string;
  body: string;
  user_uid: string;
  subroute: string;
}

export interface InAppNotificationResponse {
  success: boolean;
  delivered_notifications?: Array<{
    id: string;
    title: string;
    body: string;
    user_uid: string;
    subroute: string;
    seen_at: string | null;
    dismissed_at: string | null;
  }>;
  error?: string;
}

export class PiNetworkService {
  private apiKey: string;

  constructor() {
    this.apiKey = SERVER_API_KEY!;
    console.log('🔑 Pi Network Service initialized');
    console.log('🔑 API Key loaded:', this.apiKey ? 'YES (' + this.apiKey.substring(0, 10) + '...)' : 'NO');
    console.log('🔑 Sandbox mode:', isSandboxMode ? 'ENABLED (sandbox behavior)' : 'DISABLED (mainnet mode)');
  }

  async verifyAccessToken(accessToken: string): Promise<PiUser | null> {
    try {
      const response = await axios.get(`${PI_API_BASE}/v2/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Pi Network token verification failed:', error);
      return null;
    }
  }

  // Fetch user's wallet address using access token with wallet_address scope
  async getUserWalletAddress(accessToken: string): Promise<string | null> {
    try {
      const response = await axios.get(`${PI_API_BASE}/v2/me/wallet_address`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (response.data && response.data.address) {
        console.log('✅ Wallet address fetched from Pi Network:', response.data.address);
        return response.data.address;
      }
      
      return null;
    } catch (error: any) {
      console.error('Failed to fetch wallet address:', error.message);
      if (error.response?.data) {
        console.error('Error details:', JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }

  async approvePayment(paymentId: string): Promise<boolean> {
    try {
      console.log('🔄 Approving payment with Pi Network API...');
      console.log('📡 Payment ID:', paymentId);
      console.log('🔑 Using API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...');
      console.log('🌐 Using REAL Pi Network API for payment approval');

      const response = await axios.post(
        `${PI_API_BASE}/v2/payments/${paymentId}/approve`,
        {},
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Payment approval successful:', response.data);
      return true;
    } catch (error: any) {
      console.error('❌ Payment approval failed:', error.message);
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('❌ Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('❌ No response received:', error.request);
      } else {
        console.error('❌ Request setup error:', error.message);
      }
      return false;
    }
  }

  async completePayment(paymentId: string, txid: string): Promise<boolean> {
    try {
      console.log('🌐 Using REAL Pi Network API for payment completion');

      await axios.post(
        `${PI_API_BASE}/v2/payments/${paymentId}/complete`,
        { txid },
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (error) {
      console.error('Payment completion failed:', error);
      return false;
    }
  }

  async getPayment(paymentId: string): Promise<PaymentDTO | null> {
    try {
      console.log('🌐 Using REAL Pi Network API for getPayment');

      const response = await axios.get(`${PI_API_BASE}/v2/payments/${paymentId}`, {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
      });

      // Validate that response data exists and is an object
      if (!response.data || typeof response.data !== 'object') {
        console.error('Get payment failed: Invalid response data', response.data);
        return null;
      }

      return response.data;
    } catch (error: any) {
      console.error('Get payment failed:', error.response?.data || error.message);
      // Return null instead of throwing to allow graceful handling
      return null;
    }
  }

  // Step 1: Create A2U Payment using official pi-backend SDK
  async createA2UPayment(paymentArgs: PaymentArgs): Promise<string | null> {
    console.log('createA2UPayment called with:', JSON.stringify(paymentArgs, null, 2));
    const client = getPiBackendClient();
    if (!client) {
      console.error('❌ pi-backend SDK not initialized — check WALLET_PRIVATE_SEED env var');
      return null;
    }
    try {
      const paymentData = {
        amount: paymentArgs.amount,
        memo: paymentArgs.memo,
        metadata: paymentArgs.metadata,
        uid: paymentArgs.uid,
      };
      const paymentId = await client.createPayment(paymentData);
      console.log('✅ A2U payment created, paymentId:', paymentId);
      return paymentId;
    } catch (error: any) {
      console.error('❌ A2U createPayment failed:', error.message);
      if (error.response?.data) console.error('Pi API error:', JSON.stringify(error.response.data));
      return null;
    }
  }

  // Step 2: Submit A2U Payment to Pi Blockchain (signs with WALLET_PRIVATE_SEED)
  async submitPaymentToBlockchain(paymentId: string): Promise<string | null> {
    console.log('submitPaymentToBlockchain paymentId:', paymentId);
    const client = getPiBackendClient();
    if (!client) {
      console.error('❌ pi-backend SDK not initialized');
      return null;
    }
    try {
      const txid = await client.submitPayment(paymentId);
      console.log('✅ A2U payment submitted to blockchain, txid:', txid);
      return txid;
    } catch (error: any) {
      console.error('❌ submitPayment failed:', error.message);
      if (error.response?.data) console.error('Pi API error:', JSON.stringify(error.response.data));
      return null;
    }
  }

  // Step 3: Complete A2U Payment in Pi Server
  async completePaymentInServer(paymentId: string, txid: string): Promise<any | null> {
    console.log('completePaymentInServer paymentId:', paymentId, 'txid:', txid);
    const client = getPiBackendClient();
    if (!client) {
      console.error('❌ pi-backend SDK not initialized');
      return null;
    }
    try {
      const completedPayment = await client.completePayment(paymentId, txid);
      console.log('✅ A2U payment completed:', JSON.stringify(completedPayment?.status));
      return completedPayment;
    } catch (error: any) {
      console.error('❌ completePayment failed:', error.message);
      if (error.response?.data) console.error('Pi API error:', JSON.stringify(error.response.data));
      return null;
    }
  }

  // Full A2U Payment Flow (All 3 Steps) — official pi-backend SDK
  async processFullA2UPayment(paymentArgs: PaymentArgs): Promise<{paymentId: string, txid: string, payment: any} | null> {
    console.log('processFullA2UPayment:', JSON.stringify({ amount: paymentArgs.amount, uid: paymentArgs.uid, memo: paymentArgs.memo }));
    const client = getPiBackendClient();
    if (!client) {
      console.error('❌ pi-backend client not available — WALLET_PRIVATE_SEED may be invalid or missing');
      return null;
    }
    try {
      // Step 0: Check for ALL incomplete payments and resolve them first
      // Per Pi SDK docs: getIncompleteServerPayments returns 0 or 1 payment,
      // but we loop to handle edge cases with multiple stuck payments
      try {
        let incomplete = await client.getIncompleteServerPayments();
        while (incomplete && incomplete.length > 0) {
          const inc = incomplete[0];
          console.log('⚠️ Found incomplete payment:', inc.identifier, '— resolving before proceeding...');
          try {
            if (inc.transaction?.txid) {
              // Already submitted to blockchain — just complete it
              await client.completePayment(inc.identifier, inc.transaction.txid);
              console.log('✅ Completed leftover payment:', inc.identifier);
            } else {
              // Not submitted — cancel it to unblock new payments
              await client.cancelPayment(inc.identifier);
              console.log('✅ Cancelled leftover payment:', inc.identifier);
            }
          } catch (resolveErr: any) {
            console.error('Failed to resolve incomplete payment:', inc.identifier, resolveErr.message);
            break; // Don't loop forever if resolution keeps failing
          }
          // Re-check for more incomplete payments
          incomplete = await client.getIncompleteServerPayments();
        }
      } catch (incErr: any) {
        console.warn('Could not check incomplete payments:', incErr.message);
      }

      // Step 1: Create payment
      const paymentId = await this.createA2UPayment(paymentArgs);
      if (!paymentId) { console.error('Failed at step 1: createPayment'); return null; }

      // Step 2: Submit to blockchain
      const txid = await this.submitPaymentToBlockchain(paymentId);
      if (!txid) { console.error('Failed at step 2: submitPayment'); return null; }

      // Step 3: Complete payment
      const completedPayment = await this.completePaymentInServer(paymentId, txid);
      if (!completedPayment) { console.error('Failed at step 3: completePayment'); return null; }

      console.log('✅ Full A2U payment completed — txid:', txid);
      return { paymentId, txid, payment: completedPayment };
    } catch (error: any) {
      console.error('❌ Full A2U payment process failed:', error.message);
      if (error.response?.data) console.error('Pi API error detail:', JSON.stringify(error.response.data));
      return null;
    }
  }

  // Enhanced Server Transfer (For Refunds/Payouts) - Uses full A2U flow
  async createEnhancedServerTransfer(
    userId: string,
    amount: number,
    memo: string,
    metadata?: Record<string, any>
  ): Promise<{paymentId: string, txid: string, payment: any} | null> {
    console.log('createEnhancedServerTransfer called with:', { userId, amount, memo, metadata });

    try {
      // Prepare payment args for A2U transfer
      const paymentArgs: PaymentArgs = {
        amount,
        memo,
        uid: userId,
        metadata: {
          type: 'server-transfer',
          ...metadata
        }
      };

      console.log('Creating server transfer with paymentArgs:', JSON.stringify(paymentArgs, null, 2));

      // Use the full A2U payment flow
      const result = await this.processFullA2UPayment(paymentArgs);

      if (result) {
        console.log('✅ Server transfer completed successfully');
        console.log('   Payment ID:', result.paymentId);
        console.log('   Transaction ID:', result.txid);
      } else {
        console.error('❌ Server transfer failed');
      }

      return result;
    } catch (error: any) {
      console.error('❌ Server transfer failed:', error.message);
      return null;
    }
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      await axios.post(
        `${PI_API_BASE}/v2/payments/${paymentId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (error) {
      console.error('Payment cancellation failed:', error);
      return false;
    }
  }

  async verifyAdStatus(adId: string): Promise<AdDTO | null> {
    try {
      const response = await axios.get(`${PI_API_BASE}/v2/ads_network/status/${adId}`, {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Ad verification failed:', error);
      return null;
    }
  }

  async isAdRewardGranted(adId: string): Promise<boolean> {
    try {
      const ad = await this.verifyAdStatus(adId);
      if (!ad) {
        console.error('Ad not found or verification failed');
        return false;
      }
      
      // According to Pi Platform documentation, we should only reward users
      // if mediator_ack_status for given ad is "granted"
      return ad.mediator_ack_status === 'granted';
    } catch (error) {
      console.error('Ad reward verification failed:', error);
      return false;
    }
  }

  // New method to fetch only the native Pi balance from Stellar Horizon API
  async getPiBalance(walletAddress: string): Promise<string> {
    try {
      // Pi Network uses the Stellar Horizon API for balance fetching
      // Mainnet endpoint for Pi Network
      const HORIZON_API_BASE = 'https://api.mainnet.minepi.com';
      
      const response = await axios.get(`${HORIZON_API_BASE}/accounts/${walletAddress}`);
      const accountData = response.data;
      
      // Extract native balance only (Pi)
      const piBalance =
        accountData.balances.find((b: any) => b.asset_type === "native")?.balance || "0";
      
      return piBalance;
    } catch (error: any) {
      console.error("Error fetching Pi balance:", error.message);
      return "0";
    }
  }

  // Ecosystem Directory Staking Data API (September 2026 Developer Capability)
  // Queries the effective stake a Pioneer has committed to B4U Esports in the Ecosystem Directory
  async getUserAppStaking(userUid: string): Promise<AppStakingData | null> {
    try {
      console.log('Fetching Ecosystem Directory staking data for Pioneer:', userUid);
      const response = await axios.get(`${PI_API_BASE}/v2/staking/app/users/${userUid}`, {
        headers: {
          'Authorization': `Key ${this.apiKey}`,
        },
        timeout: 5000,
      });

      if (response.data) {
        console.log('✅ Ecosystem Directory Staking data fetched:', response.data);
        return response.data;
      }
      return null;
    } catch (error: any) {
      // 404 or 403 when user has not staked or app awaiting whitelisting
      if (error.response?.status === 404) {
        console.log(`Pioneer ${userUid} has no active Ecosystem Directory stake for this app`);
      } else {
        console.warn('Ecosystem Directory staking check note:', error.response?.data?.message || error.message);
      }
      return null;
    }
  }

  // In-App Notifications API (Platform API v2)
  // Sends push notifications to the Pioneer's Pi App Notification Center
  async sendInAppNotification(notification: InAppNotificationItem): Promise<boolean> {
    try {
      if (!notification.user_uid || !notification.title || !notification.body) {
        console.warn('In-app notification skipped: Missing required notification fields');
        return false;
      }

      // Ensure subroute starts with /
      const subroute = notification.subroute?.startsWith('/') ? notification.subroute : `/${notification.subroute || 'dashboard'}`;

      console.log('📬 Sending Pi In-App Notification to Pioneer:', notification.user_uid, notification.title);
      const response = await axios.post<InAppNotificationResponse>(
        `${PI_API_BASE}/v2/in_app_notifications/notify`,
        {
          notifications: [
            {
              title: notification.title,
              body: notification.body,
              user_uid: notification.user_uid,
              subroute,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      if (response.status === 201 && response.data?.success) {
        console.log('✅ In-App Notification delivered via Pi Network:', response.data.delivered_notifications);
        return true;
      }
      return false;
    } catch (error: any) {
      console.warn('⚠️ Pi In-App Notification note:', error.response?.data?.error || error.message);
      return false;
    }
  }
}

export const piNetworkService = new PiNetworkService();
