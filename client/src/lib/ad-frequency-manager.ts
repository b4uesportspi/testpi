/**
 * Ad Frequency Management Configuration
 * 
 * This module provides intelligent ad frequency capping to ensure
 * users are not overwhelmed with ads while maintaining revenue potential.
 * 
 * Best Practices from Pi Network Documentation:
 * - Display ads at natural transition points
 * - Don't interrupt critical user flows
 * - Provide value exchange (rewards for watched ads)
 * - Respect user7user experience over aggressive monetization
 */

import { piStorage } from './pi-storage';

export interface AdFrequencyConfig {
  // Minimum time between interstitial ads (in milliseconds)
  minInterstitialInterval: number;
  
  // Minimum time between rewarded ads (in milliseconds)
  minRewardedInterval: number;
  
  // Maximum interstitial ads per session
  maxInterstitialsPerSession: number;
  
  // Maximum rewarded ads per session
  maxRewardedAdsPerSession: number;
  
  // Purchase count threshold for milestone ads
  purchaseMilestoneInterval: number;
  
  // Session duration in hours before reset
  sessionResetHours: number;
}

// User-friendly configuration - prioritizes experience over aggressive ads
export const USER_FRIENDLY_AD_CONFIG: AdFrequencyConfig = {
  minInterstitialInterval: 10 * 60 * 1000, // 10 minutes between interstitials
  minRewardedInterval: 2 * 60 * 1000,      // 2 minutes between rewarded ads
  maxInterstitialsPerSession: 5,            // Max 5 interstitial ads per session
  maxRewardedAdsPerSession: 20,             // Rewarded ads are opt-in, so higher limit
  purchaseMilestoneInterval: 5,             // Show ad every 5 purchases (not 3)
  sessionResetHours: 24,                    // Reset counters after 24 hours
};

// Aggressive configuration (for reference - NOT RECOMMENDED)
export const AGGRESSIVE_AD_CONFIG: AdFrequencyConfig = {
  minInterstitialInterval: 3 * 60 * 1000,   // 3 minutes
  minRewardedInterval: 1 * 60 * 1000,       // 1 minute
  maxInterstitialsPerSession: 15,
  maxRewardedAdsPerSession: 50,
  purchaseMilestoneInterval: 3,
  sessionResetHours: 12,
};

/**
 * Ad Session Manager
 * Tracks ad views and enforces frequency caps
 */
class AdSessionManager {
  private config: AdFrequencyConfig;
  private sessionStart: number;
  private lastInterstitialShow: number;
  private lastRewardedShow: number;
  private interstitialCount: number;
  private rewardedCount: number;
  private totalPurchases: number;
  private readonly STORAGE_KEY = 'b4u_esports_ad_session';

  constructor(config: AdFrequencyConfig = USER_FRIENDLY_AD_CONFIG) {
    this.config = config;
    this.sessionStart = Date.now();
    this.lastInterstitialShow = 0;
    this.lastRewardedShow = 0;
    this.interstitialCount = 0;
    this.rewardedCount = 0;
    this.totalPurchases = 0;
    
    // Load existing session from localStorage
    this.loadSession();
  }

  /**
   * Load session data from localStorage
   */
  private loadSession(): void {
    try {
      const saved = piStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const now = Date.now();
        
        // Check if session has expired (24 hours)
        if (now - data.sessionStart < this.config.sessionResetHours * 60 * 60 * 1000) {
          this.sessionStart = data.sessionStart;
          this.lastInterstitialShow = data.lastInterstitialShow || 0;
          this.lastRewardedShow = data.lastRewardedShow || 0;
          this.interstitialCount = data.interstitialCount || 0;
          this.rewardedCount = data.rewardedCount || 0;
          this.totalPurchases = data.totalPurchases || 0;
          
          console.log('[AdSession] Loaded existing session:', {
            interstitials: this.interstitialCount,
            rewarded: this.rewardedCount,
            purchases: this.totalPurchases
          });
        } else {
          console.log('[AdSession] Session expired, starting fresh');
          this.resetSession();
        }
      }
    } catch (error) {
      console.error('[AdSession] Error loading session:', error);
    }
  }

  /**
   * Save session data to localStorage
   */
  private saveSession(): void {
    try {
      const data = {
        sessionStart: this.sessionStart,
        lastInterstitialShow: this.lastInterstitialShow,
        lastRewardedShow: this.lastRewardedShow,
        interstitialCount: this.interstitialCount,
        rewardedCount: this.rewardedCount,
        totalPurchases: this.totalPurchases,
      };
      piStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[AdSession] Error saving session:', error);
    }
  }

  /**
   * Reset all session counters
   */
  resetSession(): void {
    this.sessionStart = Date.now();
    this.lastInterstitialShow = 0;
    this.lastRewardedShow = 0;
    this.interstitialCount = 0;
    this.rewardedCount = 0;
    this.totalPurchases = 0;
    this.saveSession();
    console.log('[AdSession] Session reset');
  }

  /**
   * Check if interstitial ad can be shown
   */
  canShowInterstitial(): boolean {
    const now = Date.now();
    
    // Check session limit
    if (this.interstitialCount >= this.config.maxInterstitialsPerSession) {
      console.log('[AdSession] Interstitial limit reached for this session');
      return false;
    }
    
    // Check time since last ad
    const timeSinceLast = now - this.lastInterstitialShow;
    if (timeSinceLast < this.config.minInterstitialInterval) {
      const remaining = Math.ceil((this.config.minInterstitialInterval - timeSinceLast) / 60000);
      console.log(`[AdSession] Too soon for interstitial. Wait ${remaining} more minutes`);
      return false;
    }
    
    return true;
  }

  /**
   * Record that an interstitial ad was shown
   */
  recordInterstitialShown(): void {
    this.lastInterstitialShow = Date.now();
    this.interstitialCount++;
    this.saveSession();
    console.log(`[AdSession] Interstitial #${this.interstitialCount} shown`);
  }

  /**
   * Check if rewarded ad can be shown
   */
  canShowRewarded(): boolean {
    const now = Date.now();
    
    // Check session limit
    if (this.rewardedCount >= this.config.maxRewardedAdsPerSession) {
      console.log('[AdSession] Rewarded ad limit reached for this session');
      return false;
    }
    
    // Check time since last ad
    const timeSinceLast = now - this.lastRewardedShow;
    if (timeSinceLast < this.config.minRewardedInterval) {
      const remaining = Math.ceil((this.config.minRewardedInterval - timeSinceLast) / 60000);
      console.log(`[AdSession] Too soon for rewarded ad. Wait ${remaining} more minutes`);
      return false;
    }
    
    return true;
  }

  /**
   * Record that a rewarded ad was shown
   */
  recordRewardedShown(): void {
    this.lastRewardedShow = Date.now();
    this.rewardedCount++;
    this.saveSession();
    console.log(`[AdSession] Rewarded ad #${this.rewardedCount} shown`);
  }

  /**
   * Record a purchase and check if milestone reached
   */
  recordPurchase(): boolean {
    this.totalPurchases++;
    this.saveSession();
    
    // Check if we've hit a milestone
    const isMilestone = this.totalPurchases % this.config.purchaseMilestoneInterval === 0;
    
    if (isMilestone) {
      console.log(`[AdSession] Purchase milestone reached: ${this.totalPurchases} purchases`);
    }
    
    return isMilestone;
  }

  /**
   * Get current session stats
   */
  getSessionStats() {
    const now = Date.now();
    const sessionDurationHours = (now - this.sessionStart) / (1000 * 60 * 60);
    
    return {
      sessionDuration: `${sessionDurationHours.toFixed(2)} hours`,
      interstitialAds: `${this.interstitialCount}/${this.config.maxInterstitialsPerSession}`,
      rewardedAds: `${this.rewardedCount}/${this.config.maxRewardedAdsPerSession}`,
      totalPurchases: this.totalPurchases,
      nextMilestoneAt: Math.ceil((this.totalPurchases + 1) / this.config.purchaseMilestoneInterval) * this.config.purchaseMilestoneInterval,
    };
  }

  /**
   * Get time until next interstitial allowed
   */
  getTimeUntilNextInterstitial(): number {
    const now = Date.now();
    const elapsed = now - this.lastInterstitialShow;
    const remaining = this.config.minInterstitialInterval - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Get time until next rewarded ad allowed
   */
  getTimeUntilNextRewarded(): number {
    const now = Date.now();
    const elapsed = now - this.lastRewardedShow;
    const remaining = this.config.minRewardedInterval - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Get friendly message about ad availability
   */
  getAvailabilityMessage(type: 'interstitial' | 'rewarded'): string {
    if (type === 'interstitial') {
      if (!this.canShowInterstitial()) {
        const minutes = Math.ceil(this.getTimeUntilNextInterstitial() / 60000);
        if (minutes > 0) {
          return `Next ad available in ${minutes} minutes`;
        }
        return 'Ad limit reached for today';
      }
      return 'Ad available';
    }
    
    if (type === 'rewarded' && !this.canShowRewarded()) {
      const minutes = Math.ceil((this.config.minRewardedInterval - (Date.now() - this.lastRewardedShow)) / 60000);
      if (minutes > 0) {
        return `Next reward ad available in ${minutes} minutes`;
      }
      return 'Reward ad limit reached for today';
    }
    
    return 'Reward ad available';
  }
}

// Export singleton instance
export const adSessionManager = new AdSessionManager(USER_FRIENDLY_AD_CONFIG);

// Also export class for testing/custom instances
export { AdSessionManager };
