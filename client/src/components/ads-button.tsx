import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePiAds } from '@/hooks/use-pi-ads';
import { usePiNetwork } from '@/hooks/use-pi-network';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Play, CheckCircle, AlertCircle, Info, Clock, Sparkles } from 'lucide-react';
import { adSessionManager } from '@/lib/ad-frequency-manager';
import RewardReveal from '@/components/reward-reveal';

interface AdsButtonProps {
  onReward?: (rewardAmount: number) => void;
  className?: string;
}

// Define the type for ad response
interface AdResponse {
  result: string;
  adId?: string;
}

export default function AdsButton({ onReward, className = '' }: AdsButtonProps) {
  const { adNetworkSupported, showRewardedAd } = usePiAds();
  const { token, refreshUser, user } = usePiNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasWatchedAd, setHasWatchedAd] = useState(false);
  const [showRewardReveal, setShowRewardReveal] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number>(() =>
    adSessionManager.getTimeUntilNextRewarded()
  );
  const [isCelebrating, setIsCelebrating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = adSessionManager.getTimeUntilNextRewarded();
      setCooldownRemainingMs(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleWatchAd = async () => {
    // Check if ad network is supported
    if (!adNetworkSupported) {
      toast({
        title: "📱 Ads Not Supported",
        description: "Your Pi Browser version doesn't support ads. Please update to the latest version from the app store.",
        variant: "default",
        duration: 6000,
      });
      return;
    }

    // Check frequency cap
    if (!adSessionManager.canShowRewarded()) {
      const message = adSessionManager.getAvailabilityMessage('rewarded');
      toast({
        title: "⏰ Reward Ad Limit Reached",
        description: `${message}. You've earned great rewards today - come back later for more!`,
        variant: "default",
        duration: 5000,
      });
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      const adResponse: AdResponse = await showRewardedAd();
      
      switch (adResponse.result) {
        case 'AD_REWARDED':
          // User watched the full ad and should be rewarded after verification.
          const adId = adResponse.adId;
          const rewardAmount = 10; // 10 B4U Esports Token

          try {
            if (!token) {
              throw new Error('User not authenticated. Please log in again.');
            }

            if (!adId) {
              throw new Error('Reward verification data is missing. Please try again.');
            }

            // Call API in background only after we have a verifiable ad id.
            const requestBody = {
              amount: rewardAmount,
              adId,
            };
            console.log('Verifying ad reward with adId:', adId);

            const response = await fetch('/api/user/tokens/add', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || `Failed to add tokens to account. Server responded with status ${response.status}`);
            }

            const data = await response.json();
            console.log('Tokens added successfully:', data);
            setRewardAmount(rewardAmount);
            setShowRewardReveal(true);
            setHasWatchedAd(true);
            setIsCelebrating(true);
            adSessionManager.recordRewardedShown();
            setCooldownRemainingMs(adSessionManager.getTimeUntilNextRewarded());
            setTimeout(() => setIsCelebrating(false), 6000);

            // Refresh user data in background
            const freshUser = await refreshUser();
            if (onReward && freshUser) {
              onReward((freshUser.tokens || 0) - (user?.tokens || 0));
            }
          } catch (error) {
            console.error('Error adding tokens:', error);
            const message = error instanceof Error
              ? error.message
              : 'We could not verify your ad reward right now. Please try again.';

            toast({
              title: "Reward Verification Failed",
              description: message,
              variant: "destructive",
              duration: 6000,
            });
          }
          break;
          
        case 'AD_CLOSED':
          // Record that ad was shown even if closed early
          toast({
            title: "Ad Closed Early",
            description: "You closed the ad before completion. No reward given, but you can try again!",
            variant: "default",
          });
          break;
          
        case 'AD_DISPLAY_ERROR':
          toast({
            title: "Ad Display Issue",
            description: "We couldn't display the ad right now. This happens sometimes - please try again in a few minutes.",
            variant: "default",
          });
          break;
          
        case 'AD_NETWORK_ERROR':
          toast({
            title: "Connection Issue",
            description: "Network problems prevented the ad from loading. Please check your internet connection and try again.",
            variant: "default",
          });
          break;
          
        case 'AD_NOT_AVAILABLE':
          toast({
            title: "Ads Temporarily Unavailable",
            description: "No rewarded ads available at the moment. They refresh regularly, so please check back soon!",
            variant: "default",
          });
          break;
          
        case 'ADS_NOT_SUPPORTED':
          toast({
            title: "📱 Update Required",
            description: "Your Pi Browser version doesn't support rewarded ads. Please update to the latest version to enjoy this feature.",
            variant: "default",
            duration: 6000,
          });
          break;
          
        case 'USER_UNAUTHENTICATED':
          toast({
            title: "Login Required",
            description: "Please log in to your account to watch rewarded ads and earn B4U Esports Token.",
            variant: "default",
          });
          break;
          
        default:
          toast({
            title: "Unexpected Result",
            description: `Received unexpected ad result: ${(adResponse as any).result}. Please try again.`,
            variant: "destructive",
          });
          break;
      }
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isCoolingDown = cooldownRemainingMs > 0;

  return (
    <motion.div
      className={`w-full ${className} ${isCelebrating ? 'ring-2 ring-yellow-400/80 rounded-xl shadow-[0_0_30px_rgba(234,179,8,0.45)]' : ''}`}
      whileHover={{ scale: isCoolingDown || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: isCoolingDown || isLoading ? 1 : 0.98 }}
    >
      <Button
        onClick={handleWatchAd}
        disabled={isLoading || !adNetworkSupported || isCoolingDown}
        className={`w-full py-6 font-bold rounded-xl shadow-lg transition-all duration-300 ${
          isCelebrating
            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_25px_rgba(234,179,8,0.7)]'
            : isCoolingDown
            ? 'bg-slate-800/90 border border-slate-700/80 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white hover:shadow-purple-500/25'
        }`}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Loading Ad...
          </>
        ) : isCelebrating ? (
          <>
            <Sparkles className="mr-2 h-5 w-5 animate-spin text-yellow-950" />
            🎉 +{rewardAmount} B4UT Claimed!
          </>
        ) : isCoolingDown ? (
          <>
            <Clock className="mr-2 h-5 w-5 animate-pulse text-amber-400" />
            Next Ad Ready in {formatCountdown(cooldownRemainingMs)}
          </>
        ) : hasWatchedAd ? (
          <>
            <CheckCircle className="mr-2 h-5 w-5 text-emerald-400" />
            Watch Another Ad (+10 B4UT)
          </>
        ) : (
          <>
            <Gift className="mr-2 h-5 w-5 text-yellow-300 animate-bounce" />
            Watch Ad & Earn 10 B4UT
          </>
        )}
      </Button>
      
      {isCelebrating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-2.5 p-2 bg-yellow-500/15 border border-yellow-500/40 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-yellow-300 shadow-sm"
        >
          <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
          <span>🎉 +10 B4UT tokens deposited to your wallet! Cooldown active.</span>
        </motion.div>
      )}

      {!isCelebrating && isCoolingDown && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center gap-2 text-xs text-amber-300/90 font-medium"
        >
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>Reward ad cooldown — next reward in <strong className="text-amber-300">{formatCountdown(cooldownRemainingMs)}</strong></span>
        </motion.div>
      )}

      {!isCelebrating && !isCoolingDown && hasWatchedAd && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-center text-sm text-green-400 font-medium"
        >
          <CheckCircle className="inline mr-1 h-4 w-4" />
          Ready to watch and earn your next reward!
        </motion.div>
      )}
      
      {!adNetworkSupported && (
        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2 text-xs text-yellow-300">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-1">Update Your Pi Browser</p>
            <p className="text-yellow-200/80">Ads aren't supported in your current version. Please update Pi Browser to earn B4U Esports Token through rewarded ads.</p>
          </div>
        </div>
      )}

      {/* Reward Reveal Animation - Loot-box style dopamine loop */}
      <RewardReveal
        isVisible={showRewardReveal}
        rewardAmount={rewardAmount}
        rewardLabel="B4UT"
        suspenseDelay={1500}
        onComplete={() => setShowRewardReveal(false)}
      />
    </motion.div>
  );
}
