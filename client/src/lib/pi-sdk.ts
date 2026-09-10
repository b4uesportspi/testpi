declare global {
  interface Window {
    Pi: {
      init: (config: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[], 
        onIncompletePaymentFound?: (payment: any) => void
      ) => Promise<{ accessToken: string; user: { uid: string; username: string } }>;
      createPayment: (
        paymentData: {
          amount: number;
          memo: string;
          metadata: Record<string, any>;
        },
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => void;
          onReadyForServerCompletion: (paymentId: string, txid: string) => void;
          onCancel: (paymentId: string) => void;
          onError: (error: Error, payment?: any) => void;
        }
      ) => void;
      openShareDialog: (title: string, message: string) => void;
      shareFile?: (file: File) => Promise<void> | void;
      copyText?: (text: string) => Promise<void> | void;
      openConversation?: (conversationId: string) => Promise<void> | void;
      requestPermission?: (permissionName: string) => Promise<boolean>;
      nativeFeaturesList: () => Promise<string[]>;
      openUrlInSystemBrowser: (url: string) => Promise<void>;
      Ads: {
        showAd: (adType: "interstitial" | "rewarded") => Promise<
          | {
              type: "interstitial";
              result: "AD_CLOSED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE";
            }
          | {
              type: "rewarded";
              result: "AD_REWARDED" | "AD_CLOSED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE" | "ADS_NOT_SUPPORTED" | "USER_UNAUTHENTICATED";
              adId?: string;
            }
        >;
        requestAd: (adType: "interstitial" | "rewarded") => Promise<{
          type: "interstitial" | "rewarded";
          result: "AD_LOADED" | "AD_FAILED_TO_LOAD" | "AD_NOT_AVAILABLE" | "ADS_NOT_SUPPORTED";
        }>;
        isAdReady: (adType: "interstitial" | "rewarded") => Promise<{
          type: "interstitial" | "rewarded";
          ready: boolean;
        }>;
      };
    };
  }
}

export class PiSDK {
  private static instance: PiSDK;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  static getInstance(): PiSDK {
    if (!PiSDK.instance) {
      PiSDK.instance = new PiSDK();
    }
    return PiSDK.instance;
  }

  // Enhanced init method with retry logic and SDK loading verification
  async init(sandbox: boolean = false): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return Promise.resolve();
    }

    // If initialization is already in progress, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Ensure Pi SDK is loaded in the browser
    try {
      await this.loadPiSDKScript();
    } catch (loadError) {
      console.error('Failed to load Pi SDK script:', loadError);
      throw new Error('Failed to load Pi SDK. Please refresh the page and try again.');
    }

    // Create a new initialization promise
    this.initializationPromise = this.initializeWithRetry(sandbox);
    return this.initializationPromise;
  }

  // Load Pi SDK script if not already loaded
  private async loadPiSDKScript(): Promise<void> {
    // Check if Pi SDK is already available
    if (typeof window !== 'undefined' && window.Pi) {
      return Promise.resolve();
    }

    // If running in browser and Pi SDK is not loaded, wait for it
    if (typeof window !== 'undefined') {
      return new Promise((resolve, reject) => {
        // Check if script is already being loaded
        const existingScript = document.querySelector('script[src="https://sdk.minepi.com/pi-sdk.js"]');
        if (existingScript) {
          // Script is already in the DOM, wait for it to load
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Pi SDK script')));
          return;
        }

        // If not, we might have an issue with the SDK loading
        // In this case, we should reject immediately as the script should be in index.html
        reject(new Error('Pi SDK script not found in document'));
      });
    }
  }

  private async initializeWithRetry(sandbox: boolean, maxRetries: number = 5): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to initialize Pi SDK (attempt ${attempt}/${maxRetries})`);
        
        // Check if Pi SDK is available
        if (typeof window !== 'undefined' && window.Pi) {
          console.log('Pi SDK found, initializing with version 2.0, sandbox:', sandbox);
          
          // According to Pi SDK documentation, only pass sandbox: true for sandbox mode
          // For production, don't pass the sandbox parameter at all
          if (sandbox) {
            window.Pi.init({ 
              version: "2.0", 
              sandbox: true
            });
          } else {
            window.Pi.init({ 
              version: "2.0"
            });
          }
          
          this.initialized = true;
          console.log('Pi SDK initialized successfully');
          return;
        } else {
          // If this is not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            console.warn(`Pi SDK not available yet (attempt ${attempt}/${maxRetries}), retrying in 1000ms...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error(`Pi SDK initialization failed (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
    
    // If we get here, all attempts failed
    console.error('Pi SDK not loaded - window.Pi is not available after all retries');
    throw new Error('Pi SDK not loaded - window.Pi is not available. Please refresh the page and ensure you are using the Pi Browser.');
  }

  async authenticate(
    scopes: string[] = ['username', 'payments', 'wallet_address', 'in_app_notifications'],
    onIncompletePaymentFound?: (payment: any) => void
  ): Promise<{ accessToken: string; user: { uid: string; username: string } } | null> {
    // Ensure SDK is initialized before authenticating
    if (!this.initialized || !window.Pi) {
      console.error('Pi SDK not initialized before calling authenticate');
      throw new Error('Pi SDK not initialized. Please refresh the page and try again.');
    }

    try {
      console.log('Calling Pi.authenticate with scopes:', scopes);
      const authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
      console.log('Pi.authenticate successful, result:', authResult);
      return authResult;
    } catch (error) {
      console.error('Pi authentication failed:', error);
      // Handle different types of errors
      if (error instanceof Error) {
        // Re-throw the error with more context
        throw new Error(`Pi authentication failed: ${error.message}`);
      } else {
        throw new Error('Pi authentication failed: Unknown error occurred');
      }
    }
  }

  createPayment(
    paymentData: {
      amount: number;
      memo: string;
      metadata: Record<string, any>;
    },
    callbacks: {
      onReadyForServerApproval: (paymentId: string) => void;
      onReadyForServerCompletion: (paymentId: string, txid: string) => void;
      onCancel: (paymentId: string) => void;
      onError: (error: Error, payment?: any) => void;
    }
  ): void {
    // Ensure SDK is initialized before creating payment
    if (!this.initialized || !window.Pi) {
      const error = new Error('Pi SDK not initialized');
      console.error('Pi SDK not initialized before calling createPayment');
      callbacks.onError(error);
      return;
    }

    window.Pi.createPayment(paymentData, callbacks);
  }

  async shareFile(file: File): Promise<void> {
    if (!file) {
      throw new Error('Select a file to share.');
    }

    if (this.initialized && window.Pi?.shareFile) {
      await window.Pi.shareFile(file);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: file.name });
      return;
    }

    throw new Error('File sharing is not supported in this browser. Open B4U Esports in Pi Browser and try again.');
  }

  async openShareDialog(title: string, message: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.Pi?.openShareDialog) {
      try {
        window.Pi.openShareDialog(title, message);
        return true;
      } catch (err) {
        console.warn('window.Pi.openShareDialog failed, falling back to navigator.share', err);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: message });
        return true;
      } catch (err) {
        console.warn('navigator.share failed, falling back to copyText', err);
      }
    }

    return this.copyText(message);
  }

  async copyText(text: string): Promise<boolean> {
    if (typeof window !== 'undefined' && window.Pi?.copyText) {
      try {
        await window.Pi.copyText(text);
        return true;
      } catch (err) {
        console.warn('window.Pi.copyText failed, falling back to navigator.clipboard', err);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed', err);
      }
    }

    // Fallback: document.execCommand('copy')
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }

  async openConversation(conversationId: string): Promise<void> {
    if (typeof window !== 'undefined' && window.Pi?.openConversation) {
      await window.Pi.openConversation(conversationId);
    }
  }

  async getNativeFeatures(): Promise<string[]> {
    if (typeof window !== 'undefined' && window.Pi?.nativeFeaturesList) {
      try {
        return await window.Pi.nativeFeaturesList();
      } catch {
        return [];
      }
    }
    return [];
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const piSDK = PiSDK.getInstance();