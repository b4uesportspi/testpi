import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { piSDK } from '@/lib/pi-sdk';
import { piStorage } from '@/lib/pi-storage';
import { apiRequest } from '@/lib/queryClient';
import { delay } from '@/lib/utils';
import type { User, PaymentData, PaymentCallbacks } from '@/types/pi-network';

interface PiNetworkContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  authenticate: () => Promise<void>;
  logout: () => void;
  createPayment: (paymentData: PaymentData, callbacks: PaymentCallbacks) => void;
  updateUser: (userData: Partial<User>) => void;
  token: string | null;
  refreshUser: () => Promise<User | null>; // Fix the return type
}

const PiNetworkContext = createContext<PiNetworkContextType | undefined>(undefined);
const isPiSandboxMode = String(import.meta.env.VITE_PI_SANDBOX_MODE ?? 'false').toLowerCase() === 'true';

interface PiNetworkProviderProps {
  children: ReactNode;
}

export function PiNetworkProvider({ children }: PiNetworkProviderProps) {
  // Restore synchronously from piStorage for immediate UX rendering
  const storedUserRaw = piStorage.getItem('pi_user');
  const storedTokenRaw = piStorage.getItem('pi_token');
  const initialUser: User | null = (() => {
    try {
      if (!storedUserRaw) return null;
      const parsed = JSON.parse(storedUserRaw);
      // Security invariant: Never trust client-cached isAdmin until server verifies
      return { ...parsed, isAdmin: false };
    } catch {
      return null;
    }
  })();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!initialUser && !!storedTokenRaw);
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(storedTokenRaw);

  useEffect(() => {
    const initializePiNetwork = async () => {
      try {
        try {
          await piSDK.init(isPiSandboxMode);
          console.log('Pi SDK initialized successfully in PiNetworkProvider', {
            sandbox: isPiSandboxMode,
          });
        } catch (error) {
          console.error('Failed to initialize Pi SDK:', error);
        }

        // Add global error handlers for debugging
        window.addEventListener("error", (e) => console.log("Global Error:", e.error));
        window.addEventListener("unhandledrejection", (e) => console.log("Unhandled:", e.reason));
        
        // Log origin for debugging
        console.log('Current window origin:', window.origin);
        console.log('Expected origin for Pi Browser:', 'https://b4uesportstest.vercel.app');
        
        // Check if we're on the correct domain for Pi Browser
        if (window.origin !== 'https://b4uesportstest.vercel.app') {
          console.warn('Warning: Current origin does not match expected Pi Browser origin. This may cause authentication issues.');
        }

        // ── Restore session from piStorage if token exists ──
        const storedToken = piStorage.getItem('pi_token');
        const storedUser  = piStorage.getItem('pi_user');
        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);

            // Silently re-validate with backend to get fresh isAdmin + profile
            const profileRes = await fetch('/api/profile', {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            if (profileRes.ok) {
              const freshProfile = await profileRes.json();
              const merged = {
                ...freshProfile,
                // Security invariant: Admin permission is 100% authoritative from server response
                isAdmin: Boolean(freshProfile.isAdmin),
                piUID:   freshProfile.piUID || parsedUser.piUID,
              };
              setUser(merged);
              piStorage.setItem('pi_user', JSON.stringify(merged));
            } else {
              // Token expired — clear session
              setIsAuthenticated(false);
              setUser(null);
              setToken(null);
              piStorage.removeItem('pi_token');
              piStorage.removeItem('pi_user');
            }
          } catch {
            // ignore — already restored synchronously above
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializePiNetwork();
  }, []);

  const authenticate = async () => {
    setIsLoading(true);
    try {
      console.log('Starting Pi authentication process...');
      
      // Ensure Pi SDK is initialized before authenticating
      try {
        // Add a small delay to ensure SDK is fully loaded
        await delay(500);
        await piSDK.init(isPiSandboxMode); // Environment-aware sandbox initialization
      } catch (initError) {
        console.error('Failed to initialize Pi SDK before authentication:', initError);
        throw new Error('Failed to initialize Pi SDK. Please refresh the page and try again.');
      }
      
      // Verify SDK is initialized
      if (!piSDK.isInitialized()) {
        console.error('Pi SDK is not initialized after init call');
        throw new Error('Pi SDK failed to initialize. Please refresh the page and ensure you are using the Pi Browser.');
      }
      
      // Define the onIncompletePaymentFound callback
      const onIncompletePaymentFound = async (payment: any) => {
        console.log('Incomplete payment found:', payment);
        try {
          // Notify the backend about the incomplete payment
          await apiRequest('POST', '/api/payment/incomplete', {
            paymentId: payment.identifier,
          });
          console.log('Incomplete payment reported to backend');
        } catch (error) {
          console.error('Failed to report incomplete payment:', error);
        }
      };

      console.log('Calling Pi SDK authenticate...');
      
      // Check for referral code in URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref');
      
      // 🆕 Include wallet_address and in_app_notifications scopes per latest Pi Network developer capabilities
      const authResult = await piSDK.authenticate(
        ['username', 'payments', 'wallet_address', 'in_app_notifications'], 
        onIncompletePaymentFound
      );
      console.log('Pi SDK authenticate result:', authResult);
      
      if (!authResult) {
        console.error('Authentication failed - User cancelled or Pi SDK not available');
        throw new Error('Authentication failed - User cancelled or Pi SDK not available. Please ensure you grant all requested permissions including payments and wallet address.');
      }

      console.log('Sending access token to backend for verification...');
      // Send access token to backend for verification
      const response = await apiRequest('POST', '/api/auth/pi', {
        accessToken: authResult.accessToken,
        // Include referral code if present
        referralCode: referralCode || undefined
      });
      
      console.log('Backend response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Authentication failed with status:', response.status, 'error:', errorData);
        throw new Error(errorData.message || `Authentication failed with status ${response.status}`);
      }
      
      const authData = await response.json();
      console.log('Authentication successful, received auth data:', authData);
      
      // Save the token to piStorage immediately after successful authentication
      // This ensures it's available for subsequent API calls
      const authUser = {
        ...authData.user,
        isAdmin: Boolean(authData.user?.isAdmin),
        piUID: authData.user?.piUID,
      };
      setUser(authUser);
      setToken(authData.token);
      setIsAuthenticated(true);
      
      // Save to piStorage (safe for Pi Browser webviews)
      piStorage.setItem('pi_token', authData.token);
      piStorage.setItem('pi_user', JSON.stringify(authUser));
      
      // Fetch fresh profile data from the server
      console.log('Fetching fresh profile data...');
      const profileResponse = await apiRequest('GET', '/api/profile');
      if (profileResponse.ok) {
        const freshProfile = await profileResponse.json();
        console.log('Received fresh profile data:', freshProfile);
        const mergedProfile = {
          ...freshProfile,
          isAdmin: authUser.isAdmin,
          piUID: authUser.piUID,
        };
        setUser(mergedProfile);
        piStorage.setItem('pi_user', JSON.stringify(mergedProfile));
        console.log('Authentication completed successfully with fresh profile data');
      } else {
        console.warn('Failed to fetch fresh profile data, using auth data only');
        console.log('Authentication completed successfully');
      }
      
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Provide better error messaging for different types of issues
      let errorMessage = (error as Error).message;
      
      // Handle scope/permission related issues
      if (errorMessage.includes('scope') || errorMessage.includes('payment') || errorMessage.includes('auth') || errorMessage.includes('permissions') || errorMessage.includes('wallet')) {
        errorMessage = "Permissions missing. Please ensure you grant all requested permissions including payments and wallet address when authenticating.";
      }
      // Handle server errors
      else if (errorMessage.includes('server error')) {
        errorMessage = "Login failed: Server error. Please try again later.";
      }
      // Handle B4U Esports says messages
      else if (errorMessage.includes('B4U Esports says:')) {
        errorMessage = errorMessage.replace('B4U Esports says:', '').trim();
      }
      
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      // Clear any potentially invalid data from piStorage
      piStorage.removeItem('pi_token');
      piStorage.removeItem('pi_user');
      
      // Re-throw the error with improved messaging
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    piStorage.removeItem('pi_token');
    piStorage.removeItem('pi_user');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...userData,
      };
      setUser(updatedUser);
      piStorage.setItem('pi_user', JSON.stringify(updatedUser));
    }
  };

  // Add a function to refresh user data from the backend
  const refreshUser = async () => {
    if (!isAuthenticated) return null;
    
    try {
      const response = await apiRequest('GET', '/api/profile');
      
      if (response.ok) {
        const freshUser = await response.json();
        console.log('Fresh user data received:', freshUser);
        const mergedUser = {
          ...freshUser,
          // Security invariant: Admin status must be strictly authoritative from backend
          isAdmin: Boolean(freshUser.isAdmin),
          piUID: user?.piUID || freshUser.piUID,
        };
        setUser(mergedUser);
        piStorage.setItem('pi_user', JSON.stringify(mergedUser));
        return mergedUser; // Return the fresh user data
      } else {
        console.error('Failed to refresh user data, status:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
    return null;
  };

  const createPayment = async (paymentData: PaymentData, callbacks: PaymentCallbacks) => {
    if (!isAuthenticated || !user) {
      const error = new Error('User not authenticated. Please log in again.');
      console.error('Payment creation failed:', error.message);
      callbacks.onError(error);
      return;
    }

    // Ensure Pi SDK is initialized before creating payment
    try {
      await piSDK.init(isPiSandboxMode); // Make sure SDK is initialized with correct environment mode
    } catch (initError) {
      console.error('Failed to initialize Pi SDK before creating payment:', initError);
      const error = new Error('Failed to initialize Pi SDK. Please refresh the page and try again.');
      callbacks.onError(error);
      return;
    }

    // Check if Pi SDK is properly initialized
    if (!piSDK.isInitialized()) {
      const error = new Error('Pi SDK not initialized. Please refresh the page.');
      console.error('Payment creation failed:', error.message);
      callbacks.onError(error);
      return;
    }

    // Add user context to metadata with proper payment context for Pi Network
    const enhancedPaymentData = {
      ...paymentData,
      metadata: {
        // Preserve existing metadata if it exists
        ...(paymentData.metadata || {}),
        type: paymentData.metadata?.type || 'backend' as const, // Preserve original type (like 'tournament_entry')
        userId: user.id,
        // Add payment context information that Pi Network requires for validation
        appId: 'b4uesports',
        productId: paymentData.metadata?.packageId || '',
        couponCode: paymentData.metadata?.couponCode,
        // Include context for tracking
        context: `${paymentData.memo || 'Payment'} - User: ${user.id}`,
        timestamp: new Date().toISOString()
      },
    };

    // Store payment data on the server for mock implementation
    const storePaymentData = async (paymentId: string) => {
      console.log('Storing payment data for paymentId:', paymentId);
      console.log('Enhanced payment data:', enhancedPaymentData);
      
      // Get current Pi price for storing with transaction
      let currentPiPrice = 0.21; // Default fallback
      try {
        const priceResponse = await apiRequest('GET', '/api/pi-price');
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          currentPiPrice = priceData.price;
          console.log('Current Pi price:', currentPiPrice);
        } else {
          console.warn('Failed to fetch current Pi price, using default. Status:', priceResponse.status);
        }
      } catch (priceError) {
        console.error('Failed to fetch current Pi price:', priceError);
      }
      
      // Prepare payment data for backend with proper payment type
      const paymentType = enhancedPaymentData.paymentType || 'TOKEN_PURCHASE';
      
      const paymentDataForBackend: any = {
        userId: user.id,
        paymentType,
        type: enhancedPaymentData.metadata.type || (paymentType === 'TOURNAMENT_ENTRY' ? 'tournament_entry' : 'backend'),
        piAmount: enhancedPaymentData.amount,
        usdAmount: (enhancedPaymentData.amount * currentPiPrice).toFixed(2),
        piPriceAtTime: currentPiPrice,
        gameAccount: paymentType === 'SUBSCRIPTION' ? undefined : enhancedPaymentData.metadata.gameAccount,
        subscriptionDetails: enhancedPaymentData.metadata.subscriptionDetails,
        memo: enhancedPaymentData.memo,
        couponCode: enhancedPaymentData.metadata.couponCode || null,
      };
      
      // Add payment-type-specific fields
      if (paymentType === 'TOKEN_PURCHASE') {
        paymentDataForBackend.packageId = enhancedPaymentData.metadata.productId || enhancedPaymentData.metadata.packageId || '';
      } else if (paymentType === 'TOURNAMENT_ENTRY') {
        paymentDataForBackend.tournamentId = enhancedPaymentData.metadata.tournamentId;
      } else if (paymentType === 'SUBSCRIPTION') {
        paymentDataForBackend.packageId = enhancedPaymentData.metadata.packageId || enhancedPaymentData.metadata.productId || null;
      }
      
      console.log('Payment data being sent to backend:', paymentDataForBackend);
      
      // Send properly structured data to backend
      const response = await apiRequest('POST', '/api/payment/create', { 
        paymentId,
        paymentData: paymentDataForBackend
      });
      
      console.log('Payment creation response status:', response.status);
      
      // Check if the payment creation was successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Payment creation failed with error data:', errorData);
        throw new Error(`Payment creation failed: ${errorData.message || response.statusText}`);
      }
      
      // Return the response data
      const responseData = await response.json();
      console.log('Payment creation successful, response data:', responseData);
      return responseData;
    };

    // Enhanced callbacks with API calls and better error handling
    const enhancedCallbacks = {
      onReadyForServerApproval: async (paymentId: string) => {
        try {
          console.log('Payment ready for server approval:', paymentId);
          
          // Store payment data in database first
          const storeResult = await storePaymentData(paymentId);
          console.log('Payment data stored in database:', storeResult);
          
          // Call backend to approve payment with Pi Network
          console.log('Calling backend to approve payment with Pi Network');
          const response = await apiRequest('POST', '/api/payment/approve', { paymentId });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Approval failed with status ${response.status}`);
          }
          
          const approvalData = await response.json();
          console.log('Payment approved with backend:', approvalData);
          
          // Call the original callback to continue the Pi Network flow
          console.log('Calling original onReadyForServerApproval callback');
          callbacks.onReadyForServerApproval(paymentId);
          console.log('Completed onReadyForServerApproval callback');
        } catch (error) {
          console.error('Payment approval failed:', error);
          callbacks.onError(error as Error);
        }
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        try {
          console.log('Payment ready for server completion:', paymentId, txid);
          const response = await apiRequest('POST', '/api/payment/complete', { paymentId, txid });
          
          console.log('Payment completion response status:', response.status);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Payment completion failed with error data:', errorData);
            throw new Error(errorData.message || `Completion failed with status ${response.status}`);
          }
          
          const responseData = await response.json();
          console.log('Payment completion successful, response data:', responseData);
          
          // Call the original callback
          callbacks.onReadyForServerCompletion(paymentId, txid);
        } catch (error) {
          console.error('Payment completion failed:', error);
          callbacks.onError(error as Error);
        }
      },
      onCancel: async (paymentId: string) => {
        try {
          console.log('Payment cancelled:', paymentId);
          
          // Call backend to update transaction status to cancelled
          const response = await apiRequest('POST', '/api/payment/cancel', { paymentId });
          
          if (!response.ok) {
            console.error('Failed to update payment status to cancelled');
          } else {
            console.log('Payment status updated to cancelled successfully');
          }
          
          // Call the original callback
          callbacks.onCancel(paymentId);
        } catch (error) {
          console.error('Error handling payment cancellation:', error);
          callbacks.onCancel(paymentId);
        }
      },
      onError: (error: Error, payment?: any) => {
        console.error('Payment error:', error, payment);
        
        // Log additional details about the error
        if (error && typeof error === 'object') {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error as any)
          });
        }
        
        // Check if it's a scope-related error and provide better messaging
        let errorMessage = error.message;
        if (errorMessage.includes('scope') || errorMessage.includes('payment') || errorMessage.includes('auth') || errorMessage.includes('permissions')) {
          errorMessage = "Payment permissions missing. Please log out and log back in to refresh your permissions, making sure to grant all requested permissions including payments.";
        }
        // Handle B4U Esports says messages
        else if (errorMessage.includes('B4U Esports says:')) {
          errorMessage = errorMessage.replace('B4U Esports says:', '').trim();
        }
        
        callbacks.onError(new Error(errorMessage), payment);
      },
    };

    try {
      console.log('Creating payment with Pi SDK:', enhancedPaymentData);
      const result = piSDK.createPayment(enhancedPaymentData, enhancedCallbacks);
      console.log('Payment creation initiated with result:', result);
    } catch (error) {
      console.error('Failed to create payment:', error);
      
      // Check if it's a scope-related error and provide better messaging
      let errorMessage = (error as Error).message;
      if (errorMessage.includes('scope') || errorMessage.includes('payment') || errorMessage.includes('auth') || errorMessage.includes('permissions')) {
        errorMessage = "Payment permissions missing. Please log out and log back in to refresh your permissions, making sure to grant all requested permissions including payments.";
      }
      // Handle B4U Esports says messages
      else if (errorMessage.includes('B4U Esports says:')) {
        errorMessage = errorMessage.replace('B4U Esports says:', '').trim();
      }
      
      callbacks.onError(new Error(errorMessage));
    }
  };

  return (
    <PiNetworkContext.Provider value={{
      isAuthenticated,
      user,
      isLoading,
      authenticate,
      logout,
      createPayment,
      updateUser,
      token,
      refreshUser, // Add refreshUser to the context
    }}>
      {children}
    </PiNetworkContext.Provider>
  );
}

export function usePiNetwork() {
  const context = useContext(PiNetworkContext);
  if (context === undefined) {
    throw new Error('usePiNetwork must be used within a PiNetworkProvider');
  }
  return context;
}
