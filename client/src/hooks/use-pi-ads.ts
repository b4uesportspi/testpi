import { useState, useEffect } from 'react';
import { piSDK } from '@/lib/pi-sdk';

type AdType = "interstitial" | "rewarded";

type ShowAdResponse =
  | {
      type: "interstitial";
      result: "AD_CLOSED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE";
    }
  | {
      type: "rewarded";
      result: "AD_REWARDED" | "AD_CLOSED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE" | "ADS_NOT_SUPPORTED" | "USER_UNAUTHENTICATED";
      adId?: string;
    };

type IsAdReadyResponse = {
  type: "interstitial" | "rewarded";
  ready: boolean;
};

type RequestAdResponse = {
  type: "interstitial" | "rewarded";
  result: "AD_LOADED" | "AD_FAILED_TO_LOAD" | "AD_NOT_AVAILABLE" | "ADS_NOT_SUPPORTED";
};

type OpenUrlError = "Failed to open URL" | "No minimal requirements" | "Unexpected error";

export interface PiAdsHook {
  adNetworkSupported: boolean;
  isAdReady: (adType: AdType) => Promise<IsAdReadyResponse>;
  showAd: (adType: AdType) => Promise<ShowAdResponse>;
  requestAd: (adType: AdType) => Promise<RequestAdResponse>;
  showInterstitialAd: () => Promise<ShowAdResponse>;
  showRewardedAd: () => Promise<ShowAdResponse>;
  openUrlInSystemBrowser: (url: string) => Promise<void>;
}

export function usePiAds(): PiAdsHook {
  const [adNetworkSupported, setAdNetworkSupported] = useState(false);

  useEffect(() => {
    const checkAdNetworkSupport = async () => {
      try {
        await piSDK.init(false);
        if (!window.Pi) return;

        // Check if ad_network is supported
        const nativeFeatures = await window.Pi.nativeFeaturesList();
        const isSupported = nativeFeatures.includes('ad_network');
        setAdNetworkSupported(isSupported);
        
        console.log('Ad network support:', isSupported);
      } catch (error) {
        console.error('Error checking ad network support:', error);
        setAdNetworkSupported(false);
      }
    };

    void checkAdNetworkSupport();
  }, []);

  const isAdReady = async (adType: AdType): Promise<IsAdReadyResponse> => {
    try {
      if (!piSDK.isInitialized() || !window.Pi || !window.Pi.Ads) {
        return { type: adType, ready: false };
      }
      
      const response = await window.Pi.Ads.isAdReady(adType);
      return response;
    } catch (error) {
      console.error(`Error checking if ${adType} ad is ready:`, error);
      return { type: adType, ready: false };
    }
  };

  const showAd = async (adType: AdType): Promise<ShowAdResponse> => {
    try {
      if (!piSDK.isInitialized() || !window.Pi || !window.Pi.Ads) {
        if (adType === "interstitial") {
          return { type: "interstitial", result: "AD_NOT_AVAILABLE" };
        } else {
          return { type: "rewarded", result: "ADS_NOT_SUPPORTED" };
        }
      }
      
      const response = await window.Pi.Ads.showAd(adType);
      return response;
    } catch (error) {
      console.error(`Error showing ${adType} ad:`, error);
      // Return a consistent error response
      if (adType === "interstitial") {
        return { type: "interstitial", result: "AD_NOT_AVAILABLE" };
      } else {
        return { type: "rewarded", result: "ADS_NOT_SUPPORTED" };
      }
    }
  };

  const requestAd = async (adType: AdType): Promise<RequestAdResponse> => {
    try {
      if (!piSDK.isInitialized() || !window.Pi || !window.Pi.Ads) {
        return { type: adType, result: "AD_NOT_AVAILABLE" };
      }
      
      const response = await window.Pi.Ads.requestAd(adType);
      return response;
    } catch (error) {
      console.error(`Error requesting ${adType} ad:`, error);
      // Return a consistent error response
      return { type: adType, result: "AD_NOT_AVAILABLE" };
    }
  };

  const openUrlInSystemBrowser = async (url: string): Promise<void> => {
    try {
      if (!piSDK.isInitialized() || !window.Pi || !window.Pi.openUrlInSystemBrowser) {
        throw new Error("Pi SDK not initialized or openUrlInSystemBrowser not supported");
      }
      
      await window.Pi.openUrlInSystemBrowser(url);
    } catch (error) {
      console.error(`Error opening URL in system browser:`, error);
      throw error;
    }
  };

  // Advanced usage pattern for interstitial ads
  const showInterstitialAd = async (): Promise<ShowAdResponse> => {
    try {
      if (!adNetworkSupported) {
        return { type: "interstitial", result: "AD_NOT_AVAILABLE" };
      }

      // Check if ad is ready first
      const isAdReadyResponse = await isAdReady('interstitial');
      
      if (isAdReadyResponse.ready === true) {
        return await showAd('interstitial');
      }
      
      // If not ready, try to request a new ad
      const requestAdResponse = await requestAd('interstitial');
      
      if (requestAdResponse.result !== 'AD_LOADED') {
        // Map request result to showAd result
        let result: "AD_CLOSED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE" = "AD_NOT_AVAILABLE";
        if (requestAdResponse.result === "AD_FAILED_TO_LOAD") {
          result = "AD_DISPLAY_ERROR";
        } else if (requestAdResponse.result === "AD_NOT_AVAILABLE") {
          result = "AD_NOT_AVAILABLE";
        }
        return { type: "interstitial", result };
      }
      
      // Show the ad after successfully requesting it
      return await showAd('interstitial');
    } catch (error) {
      console.error('Error in showInterstitialAd:', error);
      return { type: "interstitial", result: "AD_NOT_AVAILABLE" };
    }
  };

  // Advanced usage pattern for rewarded ads
  const showRewardedAd = async (): Promise<ShowAdResponse> => {
    try {
      if (!adNetworkSupported) {
        return { type: "rewarded", result: "ADS_NOT_SUPPORTED" };
      }

      // Check if ad is ready first
      const isAdReadyResponse = await isAdReady('rewarded');

      if (isAdReadyResponse.ready === false) {
        // If not ready, request a new ad
        const requestAdResponse = await requestAd('rewarded');

        // Per Pi docs: if requestAd returns ADS_NOT_SUPPORTED, show update modal
        if (requestAdResponse.result === 'ADS_NOT_SUPPORTED') {
          return { type: "rewarded" as const, result: "ADS_NOT_SUPPORTED" as const };
        }

        if (requestAdResponse.result !== 'AD_LOADED') {
          return { type: "rewarded" as const, result: "AD_NOT_AVAILABLE" as const };
        }
      }

      // Show the rewarded ad
      return await showAd('rewarded');
    } catch (error) {
      console.error('Error in showRewardedAd:', error);
      return { type: "rewarded", result: "ADS_NOT_SUPPORTED" };
    }
  };

  return {
    adNetworkSupported,
    isAdReady,
    showAd,
    requestAd,
    showInterstitialAd,
    showRewardedAd,
    openUrlInSystemBrowser,
  };
}