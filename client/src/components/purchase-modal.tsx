import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { usePiNetwork } from '@/hooks/use-pi-network';
import { usePiAds, PiAdsHook } from '@/hooks/use-pi-ads';
import { GAME_LOGOS } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';
import type { Package } from '@/types/pi-network';
import bcrypt from 'bcryptjs';
import { adSessionManager } from '@/lib/ad-frequency-manager';

const isPiSandboxMode = String(import.meta.env.VITE_PI_SANDBOX_MODE ?? 'false').toLowerCase() === 'true';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  package: Package;
}

export default function PurchaseModal({ isOpen, onClose, package: selectedPackage }: PurchaseModalProps) {
  const queryClient = useQueryClient();
  const { user, createPayment } = usePiNetwork();
  const { adNetworkSupported, showInterstitialAd, showRewardedAd }: PiAdsHook = usePiAds();
  const { toast } = useToast();
  const [step, setStep] = useState<'confirm' | 'auth'>('confirm');
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editableGameAccount, setEditableGameAccount] = useState<any>({});
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<null | {
    code: string;
    discountPercent: number;
    bonusTokens: number;
    discountedPiAmount: number;
    originalPiAmount: number;
    expiresAt: string;
  }>(null);
  const originalPiPriceRef = useRef<number | undefined>(selectedPackage?.piPrice);

  const gameLogoUrl = selectedPackage?.image
    || (selectedPackage?.game === 'PUBG' ? GAME_LOGOS.PUBG
    : selectedPackage?.game === 'PUBG_SUBSCRIPTION' ? GAME_LOGOS.PUBG
    : selectedPackage?.game === 'PUBGKR' ? GAME_LOGOS.PUBGKR
    : selectedPackage?.game === 'COC' ? GAME_LOGOS.COC
    : selectedPackage?.game === 'MLBB' ? GAME_LOGOS.MLBB
    : selectedPackage?.game === 'ROBUX' ? GAME_LOGOS.ROBUX
    : selectedPackage?.game === 'NEWSTATE' ? GAME_LOGOS.NEWSTATE
    : selectedPackage?.game === 'FREEFIRE' ? GAME_LOGOS.FREEFIRE
    : selectedPackage?.game === 'TIKTOK_COINS' ? GAME_LOGOS.TIKTOK_COINS
    : selectedPackage?.game === 'TIKTOK_FOLLOWERS' ? GAME_LOGOS.TIKTOK_FOLLOWERS
    : selectedPackage?.game === 'TIKTOK_VIEWS' ? GAME_LOGOS.TIKTOK_VIEWS
    : selectedPackage?.game === 'INSTAGRAM' ? GAME_LOGOS.INSTAGRAM
    : selectedPackage?.game === 'FACEBOOK' ? GAME_LOGOS.FACEBOOK
    : selectedPackage?.game === 'NETFLIX' ? GAME_LOGOS.NETFLIX
    : selectedPackage?.game === 'YOUTUBE_SUBS' ? GAME_LOGOS.YOUTUBE_SUBS
    : selectedPackage?.game === 'YOUTUBE_WATCHTIME' ? GAME_LOGOS.YOUTUBE_WATCHTIME
    : GAME_LOGOS.MLBB);
  const gameName = selectedPackage?.game ? selectedPackage.game : 'Package';
  const isSubscriptionPackage = selectedPackage?.game === 'PUBG_SUBSCRIPTION';
  const fixedSubscriptionPiAmount = isSubscriptionPackage
    ? selectedPackage?.name?.toLowerCase().includes('monthly') ? 30 : 20
    : undefined;
  const packageTitle = selectedPackage?.name?.replace(/\$/g, '').replace(/\s*–\s*[\d.,]+$/, '').trim() || '';
  const effectivePiPrice = fixedSubscriptionPiAmount ?? appliedCoupon?.discountedPiAmount ?? selectedPackage?.piPrice ?? 0;
  const packageDisplayPrice = effectivePiPrice ? (effectivePiPrice < 0.1 ? `${effectivePiPrice.toFixed(4)} π` : `${effectivePiPrice.toFixed(1)} π`) : 'Price unavailable';
  const finalPiAmount = effectivePiPrice;

  if (!selectedPackage) {
    return null;
  }

  // Remove pre-purchase interstitial ad - it was hurting conversion rates
  // Instead, we'll show a REWARDED ad AFTER successful purchase (optional for user)
  // This is more user-friendly and aligns with better UX practices

  useEffect(() => {
    if (user && isOpen) {
      console.log('Purchase Modal: Initializing with user data for package:', selectedPackage?.game);
      console.log('User socialAccounts:', user.socialAccounts);
      console.log('User gameAccounts:', user.gameAccounts);
      
      if (selectedPackage?.game === 'PUBG_SUBSCRIPTION') {
        const subscriptionType = selectedPackage.name?.toLowerCase().includes('monthly') ? 'monthly' : 'weekly';
        setEditableGameAccount({
          userName: '',
          userEmail: '',
          userPhone: '',
          userGameIgn: '',
          userGameUid: '',
          userTeamName: '',
          subscriptionType,
          subscriptionName: selectedPackage.name || 'PUBG Tournament Pass',
        });
      } else if (selectedPackage?.game?.includes('TIKTOK')) {
        if (user.socialAccounts?.tiktok && (user.socialAccounts.tiktok.email || user.socialAccounts.tiktok.link)) {
          console.log('Auto-filling TikTok account from profile:', user.socialAccounts.tiktok);
          setEditableGameAccount(user.socialAccounts.tiktok);
        } else {
          console.log('No TikTok data in profile, initializing empty fields');
          setEditableGameAccount(
            selectedPackage.game === 'TIKTOK_COINS'
              ? { email: '', password: '', description: '' }
              : { link: '', description: '' }
          );
        }
      } else if (selectedPackage?.game?.includes('YOUTUBE')) {
        if (user.socialAccounts?.youtube && (user.socialAccounts.youtube.link || user.socialAccounts.youtube.email)) {
          console.log('Auto-filling YouTube account from profile:', user.socialAccounts.youtube);
          setEditableGameAccount(user.socialAccounts.youtube);
        } else {
          console.log('No YouTube data in profile, initializing empty fields');
          setEditableGameAccount(
            selectedPackage.game === 'YOUTUBE_SUBS'
              ? { link: '' }
              : { email: '', password: '' }
          );
        }
      } else if (selectedPackage?.game === 'FACEBOOK') {
        if (user.socialAccounts?.facebook && user.socialAccounts.facebook.link) {
          console.log('Auto-filling Facebook account from profile:', user.socialAccounts.facebook);
          setEditableGameAccount(user.socialAccounts.facebook);
        } else {
          console.log('No Facebook data in profile, initializing empty fields');
          setEditableGameAccount({ link: '' });
        }
      } else if (selectedPackage?.game === 'INSTAGRAM') {
        if (user.socialAccounts?.instagram && user.socialAccounts.instagram.link) {
          console.log('Auto-filling Instagram account from profile:', user.socialAccounts.instagram);
          setEditableGameAccount(user.socialAccounts.instagram);
        } else {
          console.log('No Instagram data in profile, initializing empty fields');
          setEditableGameAccount({ link: '' });
        }
      } else if (selectedPackage?.game === 'NETFLIX') {
        if (user.socialAccounts?.netflix && (user.socialAccounts.netflix.email || user.socialAccounts.netflix.whatsapp)) {
          console.log('Auto-filling Netflix account from profile:', user.socialAccounts.netflix);
          setEditableGameAccount(user.socialAccounts.netflix);
        } else {
          console.log('No Netflix data in profile, initializing empty fields');
          setEditableGameAccount({ email: '', whatsapp: '' });
        }
      } else if (selectedPackage?.game === 'CANVA') {
        if (user.socialAccounts?.canva && (user.socialAccounts.canva.email || user.socialAccounts.canva.whatsapp)) {
          console.log('Auto-filling Canva account from profile:', user.socialAccounts.canva);
          setEditableGameAccount(user.socialAccounts.canva);
        } else {
          console.log('No Canva data in profile, initializing empty fields');
          setEditableGameAccount({ email: '', whatsapp: '' });
        }
      } else if (selectedPackage?.game === 'PUBG' && user.gameAccounts?.pubg) {
        console.log('Auto-filling PUBG account from profile');
        setEditableGameAccount(user.gameAccounts.pubg);
      } else if (selectedPackage?.game === 'PUBGKR' && user.gameAccounts?.pubgkr) {
        console.log('Auto-filling PUBG KR account from profile');
        setEditableGameAccount(user.gameAccounts.pubgkr);
      } else if (selectedPackage?.game === 'MLBB' && user.gameAccounts?.mlbb) {
        console.log('Auto-filling MLBB account from profile');
        setEditableGameAccount(user.gameAccounts.mlbb);
      } else if (selectedPackage?.game === 'COC' && user.gameAccounts?.coc) {
        console.log('Auto-filling COC account from profile');
        setEditableGameAccount(user.gameAccounts.coc);
      } else if (selectedPackage?.game === 'ROBUX' && user.gameAccounts?.robux) {
        console.log('Auto-filling ROBUX account from profile');
        setEditableGameAccount(user.gameAccounts.robux);
      } else if (selectedPackage?.game === 'NEWSTATE' && user.gameAccounts?.newstate) {
        console.log('Auto-filling NEWSTATE account from profile');
        setEditableGameAccount(user.gameAccounts.newstate);
      } else if (selectedPackage?.game === 'FREEFIRE' && user.gameAccounts?.freefire) {
        console.log('Auto-filling FREEFIRE account from profile');
        setEditableGameAccount(user.gameAccounts.freefire);
      } else {
        // Initialize with empty values for games without saved data
        console.log('No saved account data found, initializing with empty fields');
        setEditableGameAccount(
          selectedPackage?.game === 'PUBG'
            ? { ign: '', uid: '' } 
            : selectedPackage?.game === 'PUBGKR'
              ? { ign: '', uid: '' }
              : selectedPackage?.game === 'ROBUX'
                ? { email: '', whatsapp: '' }
                : selectedPackage?.game === 'NEWSTATE'
                  ? { email: '', whatsapp: '' }
                  : selectedPackage?.game === 'FREEFIRE'
                    ? { playerId: '' }
                    : selectedPackage?.game === 'COC' 
                      ? { email: '' } 
                      : { userId: '', zoneId: '' }
        );
      }
    }
  }, [user, selectedPackage?.game, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const queryCoupon = new URLSearchParams(window.location.search).get('coupon');
    if (queryCoupon) {
      setCouponCode(queryCoupon.toUpperCase());
    }
  }, [isOpen]);

  useEffect(() => {
    setAppliedCoupon(null);
    originalPiPriceRef.current = selectedPackage?.piPrice;
  }, [selectedPackage?.id]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedPackage?.id) return;

    setIsApplyingCoupon(true);
    try {
      const response = await apiRequest('POST', '/api/marketing/coupon/validate', {
        code: couponCode.trim().toUpperCase(),
        packageId: selectedPackage.id,
      });
      const data = await response.json();
      setAppliedCoupon({
        code: data.data.code,
        discountPercent: data.data.discountPercent,
        bonusTokens: data.data.bonusTokens,
        discountedPiAmount: data.data.discountedPiAmount,
        originalPiAmount: data.data.originalPiAmount,
        expiresAt: data.data.expiresAt,
      });
      setCouponCode(data.data.code);
      toast({
        title: 'Coupon applied',
        description: `Unlocked ${data.data.discountPercent}% off and ${data.data.bonusTokens} bonus tokens.`,
      });
    } catch (error) {
      setAppliedCoupon(null);
      toast({
        title: 'Coupon invalid',
        description: error instanceof Error ? error.message : 'Unable to apply coupon.',
        variant: 'destructive',
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);

    try {
      // Validate that we have a user
      if (!user) {
        throw new Error("User not authenticated. Please log in again.");
      }

      // Check if user profile is verified before allowing payment
      if (!user.isProfileVerified) {
        toast({
          title: "Profile Not Verified",
          description: "Please complete your profile verification before making a purchase.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Validate account details before proceeding
      let validationError = '';
      if (selectedPackage?.game === 'PUBG_SUBSCRIPTION') {
        if (!editableGameAccount.userName || editableGameAccount.userName.trim() === '') {
          validationError = "Please enter the subscriber name.";
        } else if (!editableGameAccount.userEmail || editableGameAccount.userEmail.trim() === '') {
          validationError = "Please enter the subscriber email.";
        } else if (!editableGameAccount.userPhone || editableGameAccount.userPhone.trim() === '') {
          validationError = "Please enter the subscriber contact number.";
        } else if (!editableGameAccount.userGameIgn || editableGameAccount.userGameIgn.trim() === '') {
          validationError = "Please enter the PUBG in-game name for this subscription.";
        } else if (!editableGameAccount.userGameUid || editableGameAccount.userGameUid.trim() === '') {
          validationError = "Please enter the PUBG UID for this subscription.";
        } else if (!editableGameAccount.userTeamName || editableGameAccount.userTeamName.trim() === '') {
          validationError = "Please enter your team name for this subscription.";
        }
      } else if (selectedPackage?.game?.includes('TIKTOK')) {
        if (selectedPackage.game === 'TIKTOK_COINS') {
          // Validation for TikTok Coins purchases (email and password required)
          if (!editableGameAccount.email || editableGameAccount.email.trim() === '') {
            validationError = "Please enter your TikTok email.";
          } else if (!editableGameAccount.password || editableGameAccount.password.trim() === '') {
            validationError = "Please enter your TikTok password.";
          }
        } else {
          // Validation for TikTok followers/views (link required)
          if (!editableGameAccount.link || editableGameAccount.link.trim() === '') {
            const accountType = selectedPackage.game === 'TIKTOK_FOLLOWERS' ? 'TikTok Profile' : 'TikTok Account';
            validationError = `Please enter your ${accountType} URL.`;
          }
        }
      } else if (selectedPackage?.game === 'YOUTUBE_SUBS') {
        // Validation for YouTube Subscribers (link required)
        if (!editableGameAccount.link || editableGameAccount.link.trim() === '') {
          validationError = "Please enter your YouTube channel link.";
        }
      } else if (selectedPackage?.game === 'YOUTUBE_WATCHTIME') {
        // Validation for YouTube Watch Time (email and password required)
        if (!editableGameAccount.email || editableGameAccount.email.trim() === '') {
          validationError = "Please enter your YouTube email.";
        } else if (!editableGameAccount.password || editableGameAccount.password.trim() === '') {
          validationError = "Please enter your YouTube password.";
        }
      } else if (selectedPackage?.game === 'FACEBOOK') {
        // Validation for Facebook purchases (link required)
        if (!editableGameAccount.link || editableGameAccount.link.trim() === '') {
          validationError = "Please enter your Facebook profile/page link.";
        }
      } else if (selectedPackage?.game === 'INSTAGRAM') {
        // Validation for Instagram purchases (link required)
        if (!editableGameAccount.link || editableGameAccount.link.trim() === '') {
          validationError = "Please enter your Instagram profile link.";
        }
      } else if (selectedPackage?.game === 'NETFLIX') {
        // Validation for Netflix purchases (email and WhatsApp required)
        if (!editableGameAccount.email || editableGameAccount.email.trim() === '') {
          validationError = "Please enter your email address.";
        } else if (!editableGameAccount.whatsapp || editableGameAccount.whatsapp.trim() === '') {
          validationError = "Please enter your WhatsApp number.";
        }
      } else if (selectedPackage?.game === 'CANVA') {
        // Validation for Canva purchases (email and WhatsApp required)
        if (!editableGameAccount.email || editableGameAccount.email.trim() === '') {
          validationError = "Please enter your email address.";
        } else if (!editableGameAccount.whatsapp || editableGameAccount.whatsapp.trim() === '') {
          validationError = "Please enter your WhatsApp number.";
        }
      } else if (selectedPackage?.game === 'PUBG') {
        if (!editableGameAccount.ign || !editableGameAccount.uid) {
          validationError = "Please enter both your PUBG In-Game Name and Player UID.";
        } else if (editableGameAccount.ign.trim() === '' || editableGameAccount.uid.trim() === '') {
          validationError = "Please enter both your PUBG In-Game Name and Player UID.";
        }
      } else if (selectedPackage?.game === 'PUBGKR') {
        // Validation for PUBG KR specific fields (email and WhatsApp only)
        if (!editableGameAccount.email || editableGameAccount.email.trim() === '') {
          validationError = "Please enter your email address.";
        } else if (!editableGameAccount.whatsapp || editableGameAccount.whatsapp.trim() === '') {
          validationError = "Please enter your WhatsApp number.";
        }
      } else if (selectedPackage?.game === 'ROBUX') {
        // Validation for Robux purchases (email and WhatsApp required)
        if (!editableGameAccount.email || editableGameAccount.email.trim() === '') {
          validationError = "Please enter your Roblox account email.";
        } else if (!editableGameAccount.whatsapp || editableGameAccount.whatsapp.trim() === '') {
          validationError = "Please enter your WhatsApp number.";
        }
      } else if (selectedPackage?.game === 'NEWSTATE') {
        // Validation for New State purchases (NC email and WhatsApp required)
        if (!editableGameAccount.email || editableGameAccount.email.trim() === '') {
          validationError = "Please enter your NC email.";
        } else if (!editableGameAccount.whatsapp || editableGameAccount.whatsapp.trim() === '') {
          validationError = "Please enter your WhatsApp number.";
        }
      } else if (selectedPackage?.game === 'FREEFIRE') {
        // Validation for Free Fire purchases (Player ID required)
        if (!editableGameAccount.playerId || editableGameAccount.playerId.trim() === '') {
          validationError = "Please enter your Free Fire Player ID.";
        }
      } else if (selectedPackage?.game === 'COC') {
        if (!editableGameAccount.email) {
          validationError = "Please enter your email connected to Supercell.";
        } else if (editableGameAccount.email.trim() === '') {
          validationError = "Please enter your email connected to Supercell.";
        }
      } else if (selectedPackage?.game === 'MLBB') {
        if (!editableGameAccount.userId || !editableGameAccount.zoneId) {
          validationError = "Please enter both your MLBB User ID and Zone ID.";
        } else if (editableGameAccount.userId.trim() === '' || editableGameAccount.zoneId.trim() === '') {
          validationError = "Please enter both your MLBB User ID and Zone ID.";
        }
      }

      // If validation failed, show error and stop processing
      if (validationError) {
        toast({
          title: "Validation Error",
          description: validationError,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Create payment with Pi Network
      const paymentData = {
        amount: finalPiAmount,
        memo: `${selectedPackage?.name} - ${gameName}`,
        paymentType: isSubscriptionPackage ? 'SUBSCRIPTION' as const : 'TOKEN_PURCHASE' as const,
        metadata: {
          type: isSubscriptionPackage ? 'subscription' as const : 'backend' as const,
          userId: user.id,
          packageId: selectedPackage?.id,
          ...(isSubscriptionPackage
            ? { subscriptionDetails: editableGameAccount }
            : { gameAccount: editableGameAccount, couponCode: appliedCoupon?.code }),
          // Removed passphrase requirement
        },
      };

      // Add a timeout mechanism for payment processing
      let paymentTimeout: NodeJS.Timeout;
      const paymentTimeoutPromise = new Promise((_, reject) => {
        paymentTimeout = setTimeout(() => {
          reject(new Error("Payment processing timed out. Please check your Pi Network app and try again."));
        }, 30000); // 30 second timeout
      });

      // Create a promise for the payment process
      const paymentPromise = new Promise<void>((resolve, reject) => {
        createPayment(paymentData, {
          onReadyForServerApproval: (paymentId: string) => {
            toast({
              title: "Payment Approved",
              description: `Payment ${paymentId} approved by server`,
            });
          },
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            clearTimeout(paymentTimeout);
            toast({
              title: "Payment Completed",
              description: `✅ Payment confirmed! Transaction ID: ${txid}`,
            });
            
            // Refresh transactions and user data after successful payment
            await queryClient.invalidateQueries({ queryKey: ['transactions'] });
            await queryClient.invalidateQueries({ queryKey: ['user'] });
            await queryClient.refetchQueries({ queryKey: ['transactions'] });
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Record purchase for milestone tracking (dashboard will handle interstitial)
            // Don't show ads here - let dashboard handle it at milestones
            
            // Offer optional rewarded ad for bonus tokens (user-friendly approach)
            if (adNetworkSupported) {
              const canShowRewarded = adSessionManager.canShowRewarded();
              
              if (canShowRewarded) {
                // Show a friendly toast offering a reward ad
                toast({
                  title: "🎉 Purchase Successful!",
                  description: "Want to earn bonus tokens? Watch a quick rewarded ad!",
                  duration: 5000,
                });
              } else {
                const message = adSessionManager.getAvailabilityMessage('rewarded');
                toast({
                  title: "🎉 Purchase Complete!",
                  description: `${message}. Come back later for reward ads!`,
                  duration: 4000,
                });
              }
            }
            
            onClose();
            setStep('confirm');
            setPassphrase('');
            setIsProcessing(false);
            resolve();
          },
          onCancel: (paymentId: string) => {
            clearTimeout(paymentTimeout);
            toast({
              title: "Payment Cancelled",
              description: "❌ Payment canceled. No Pi deducted.",
              variant: "destructive",
            });
            setIsProcessing(false);
            reject(new Error("Payment cancelled"));
          },
          onError: (error: Error) => {
            clearTimeout(paymentTimeout);
            console.error('Payment error:', error);
            // Check if it's a scope-related error
            let errorMessage = error.message;
            if (errorMessage.includes('scope') || errorMessage.includes('payment') || errorMessage.includes('auth')) {
              errorMessage += " Please log out and log back in to refresh your permissions.";
            }
            
            toast({
              title: "Payment Failed",
              description: `⚠️ Payment failed: ${errorMessage}. Please try again or contact support.`,
              variant: "destructive",
            });
            setIsProcessing(false);
            reject(error);
          },
        });
      });

      // Race the payment promise against the timeout
      await Promise.race([paymentPromise, paymentTimeoutPromise]);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      // Only show error toast if it's not a timeout that was already handled
      if (!error.message.includes("timed out")) {
        // Improve error messaging for scope-related issues
        let errorMessage = error.message;
        if (errorMessage.includes('scope') || errorMessage.includes('payment') || errorMessage.includes('auth') || errorMessage.includes('permissions')) {
          errorMessage = "Payment permissions missing. Please log out and log back in to refresh your permissions, making sure to grant all requested permissions including payments.";
        }
        
        toast({
          title: "Payment Error",
          description: `⚠️ ${errorMessage}`,
          variant: "destructive",
        });
      }
      setIsProcessing(false);
    }
  };

  const handleGameAccountChange = (field: string, value: string) => {
    // For UID, userId, zoneId, and playerId, only allow numeric values
    if (field === 'uid' || field === 'userId' || field === 'zoneId' || field === 'playerId') {
      // Allow only digits
      value = value.replace(/\D/g, '');
    }
    
    setEditableGameAccount((prev: { [key: string]: string }) => ({
      ...prev,
      [field]: value
    }));
  };

  const formatGameAccount = () => {
    if (selectedPackage?.game?.includes('TIKTOK')) {
      if (selectedPackage.game === 'TIKTOK_COINS') {
        const email = editableGameAccount.email || 'Not set';
        return email;
      } else {
        const link = editableGameAccount.link || 'Not set';
        return link;
      }
    } else if (selectedPackage?.game === 'YOUTUBE_SUBS') {
      const link = editableGameAccount.link || 'Not set';
      return link;
    } else if (selectedPackage?.game === 'YOUTUBE_WATCHTIME') {
      const email = editableGameAccount.email || 'Not set';
      return email;
    } else if (selectedPackage?.game === 'FACEBOOK') {
      const link = editableGameAccount.link || 'Not set';
      return link;
    } else if (selectedPackage?.game === 'INSTAGRAM') {
      const link = editableGameAccount.link || 'Not set';
      return link;
    } else if (selectedPackage?.game === 'NETFLIX') {
      const email = editableGameAccount.email || 'Not set';
      const whatsapp = editableGameAccount.whatsapp || 'Not set';
      return `${email} (${whatsapp})`;
    } else if (selectedPackage?.game === 'CANVA') {
      const email = editableGameAccount.email || 'Not set';
      const whatsapp = editableGameAccount.whatsapp || 'Not set';
      return `${email} (${whatsapp})`;
    } else if (selectedPackage?.game === 'PUBG') {
      const ign = editableGameAccount.ign || 'Not set';
      const uid = editableGameAccount.uid || 'Not set';
      return `${ign} (${uid})`;
    } else if (selectedPackage?.game === 'PUBGKR') {
      const email = editableGameAccount.email || 'Not set';
      const whatsapp = editableGameAccount.whatsapp || 'Not set';
      return `${email} (${whatsapp})`;
    } else if (selectedPackage?.game === 'ROBUX') {
      const email = editableGameAccount.email || 'Not set';
      const whatsapp = editableGameAccount.whatsapp || 'Not set';
      return `${email} (${whatsapp})`;
    } else if (selectedPackage?.game === 'NEWSTATE') {
      const email = editableGameAccount.email || 'Not set';
      const whatsapp = editableGameAccount.whatsapp || 'Not set';
      return `${email} (${whatsapp})`;
    } else if (selectedPackage?.game === 'FREEFIRE') {
      const playerId = editableGameAccount.playerId || 'Not set';
      return playerId;
    } else {
      const userId = editableGameAccount.userId || 'Not set';
      const zoneId = editableGameAccount.zoneId || 'Not set';
      return `${userId}:${zoneId}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="w-full h-[100dvh] max-w-none !rounded-none p-4 sm:p-6 sm:h-auto sm:max-w-md sm:!rounded-lg sm:max-h-[90vh] overflow-y-auto border-0 sm:border"
        data-testid="purchase-modal"
        aria-describedby="purchase-modal-description"
      >
        <div id="purchase-modal-description" className="sr-only">
          Confirm your purchase details and authorize payment for the selected package.
        </div>
        
        {/* Continue Payment Section with Border */}
        <div className="border-2 border-dashed border-yellow-500 p-4 rounded-lg">
          <DialogHeader>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-gamepad text-2xl text-primary-foreground"></i>
              </div>
              <DialogTitle className="text-2xl mb-2">Continue Payment</DialogTitle>
              <p className="text-muted-foreground">Review and verify your purchase details</p>
            </div>
          </DialogHeader>

          <div className="space-y-4 mb-6">
            {!isSubscriptionPackage && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Discount Code</span>
                    {appliedCoupon && !isSubscriptionPackage && (
                      <span className="text-xs text-green-400 font-semibold">
                        {appliedCoupon.discountPercent}% off + {appliedCoupon.bonusTokens} tokens
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter your reward code"
                      data-testid="coupon-code-input"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      data-testid="apply-coupon-button"
                    >
                      {isApplyingCoupon ? 'Applying...' : 'Apply'}
                    </Button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-xs text-green-300">
                      Code {appliedCoupon.code} applied. Expires {new Date(appliedCoupon.expiresAt).toLocaleString()}.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <img src={gameLogoUrl} alt={gameName} className="w-12 h-12 mr-3" />
                  <div>
                    <p className="font-semibold" data-testid="package-name">{packageTitle || selectedPackage?.name}</p>
                    <p className="text-sm text-muted-foreground">{gameName}</p>
                    <p className="text-xs text-green-400 font-semibold">{packageDisplayPrice}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-filled Data Notification */}
            {!isSubscriptionPackage && (user?.gameAccounts || user?.socialAccounts) && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start">
                  <i className="fas fa-info-circle text-blue-400 mt-0.5 mr-2"></i>
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium">Profile data auto-filled!</p>
                    <p className="text-blue-200/80 text-xs mt-1">
                      We've automatically filled in your account details from your profile. 
                      You can edit them if needed before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Card>
              <CardContent className="p-4">
                <Label className="text-sm font-medium">
                  {selectedPackage?.game === 'PUBG_SUBSCRIPTION' ? 'Account Details' :
                   selectedPackage?.game === 'TIKTOK_FOLLOWERS' ? 'TikTok Profile' :
                   selectedPackage?.game === 'TIKTOK_VIEWS' ? 'TikTok Account' :
                   selectedPackage?.game === 'TIKTOK_COINS' ? 'TikTok Account' :
                   selectedPackage?.game?.includes('YOUTUBE') ? 'YouTube Account' :
                   selectedPackage?.game === 'FACEBOOK' ? 'Facebook Account' :
                   selectedPackage?.game === 'INSTAGRAM' ? 'Instagram Account' :
                   selectedPackage?.game === 'NETFLIX' ? 'Netflix Account' :
                   selectedPackage?.game === 'CANVA' ? 'Canva Account' :
                   'Game Account'}
                </Label>
                {selectedPackage?.game === 'PUBG_SUBSCRIPTION' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="subscription-user-name"
                      placeholder="Subscriber full name"
                      value={editableGameAccount.userName || ''}
                      onChange={(e) => handleGameAccountChange('userName', e.target.value)}
                      data-testid="subscription-user-name"
                    />
                    <Input
                      id="subscription-user-email"
                      placeholder="Subscriber email"
                      value={editableGameAccount.userEmail || ''}
                      onChange={(e) => handleGameAccountChange('userEmail', e.target.value)}
                      data-testid="subscription-user-email"
                    />
                    <Input
                      id="subscription-user-phone"
                      placeholder="Subscriber contact number"
                      value={editableGameAccount.userPhone || ''}
                      onChange={(e) => handleGameAccountChange('userPhone', e.target.value)}
                      data-testid="subscription-user-phone"
                    />
                    <Input
                      id="subscription-pubg-ign"
                      placeholder="PUBG in-game name for tournament access"
                      value={editableGameAccount.userGameIgn || ''}
                      onChange={(e) => handleGameAccountChange('userGameIgn', e.target.value)}
                      data-testid="subscription-pubg-ign"
                    />
                    <Input
                      id="subscription-pubg-uid"
                      placeholder="PUBG UID for tournament access"
                      value={editableGameAccount.userGameUid || ''}
                      onChange={(e) => handleGameAccountChange('userGameUid', e.target.value.replace(/\D/g, ''))}
                      className="font-mono"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      data-testid="subscription-pubg-uid"
                    />
                    <Input
                      id="subscription-team-name"
                      placeholder="Team name (optional)"
                      value={editableGameAccount.userTeamName || ''}
                      onChange={(e) => handleGameAccountChange('userTeamName', e.target.value)}
                      data-testid="subscription-team-name"
                    />
                    <p className="text-xs text-cyan-300 mt-1">
                      These account details are stored for tournament subscription access only. They do not overwrite your profile details.
                    </p>
                  </div>
                ) : selectedPackage?.game?.includes('TIKTOK') ? (
                  selectedPackage.game === 'TIKTOK_COINS' ? (
                    <div className="space-y-2 mt-2">
                      <Input
                        id="purchase-tiktok-email"
                        placeholder="Enter your TikTok email"
                        value={editableGameAccount.email || ''}
                        onChange={(e) => handleGameAccountChange('email', e.target.value)}
                        data-testid="purchase-tiktok-email"
                      />
                      <Input
                        id="purchase-tiktok-password"
                        type="password"
                        placeholder="Enter your TikTok password"
                        value={editableGameAccount.password || ''}
                        onChange={(e) => handleGameAccountChange('password', e.target.value)}
                        data-testid="purchase-tiktok-password"
                      />
                      <Input
                        id="purchase-tiktok-description"
                        placeholder="Enter description (optional)"
                        value={editableGameAccount.description || ''}
                        onChange={(e) => handleGameAccountChange('description', e.target.value)}
                        data-testid="purchase-tiktok-description"
                      />
                      <p className="text-xs text-amber-400 mt-1">
                        <i className="fas fa-info-circle mr-1"></i>
                        Enter your TikTok account credentials for coin delivery.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <Input
                        id="purchase-tiktok-link"
                        placeholder={selectedPackage.game === 'TIKTOK_FOLLOWERS' ? 
                          "Enter your TikTok profile URL (e.g., https://www.tiktok.com/@yourprofile)" :
                          "Enter your TikTok profile URL (e.g., https://www.tiktok.com/@yourprofile)"}
                        value={editableGameAccount.link || ''}
                        onChange={(e) => handleGameAccountChange('link', e.target.value)}
                        data-testid="purchase-tiktok-link"
                      />
                      <p className="text-xs text-amber-400 mt-1">
                        <i className="fas fa-info-circle mr-1"></i>
                        {selectedPackage.game === 'TIKTOK_FOLLOWERS' ? 
                          "Enter your complete TikTok profile URL where you want the followers delivered." :
                          "Enter your complete TikTok profile URL where you want the views delivered."}
                      </p>
                    </div>
                  )
                ) : selectedPackage?.game === 'YOUTUBE_SUBS' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-youtube-link"
                      placeholder="Enter your YouTube channel link"
                      value={editableGameAccount.link || ''}
                      onChange={(e) => handleGameAccountChange('link', e.target.value)}
                      data-testid="purchase-youtube-link"
                    />
                  </div>
                ) : selectedPackage?.game === 'YOUTUBE_WATCHTIME' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-youtube-email"
                      placeholder="Enter your YouTube email"
                      value={editableGameAccount.email || ''}
                      onChange={(e) => handleGameAccountChange('email', e.target.value)}
                      data-testid="purchase-youtube-email"
                    />
                    <Input
                      id="purchase-youtube-password"
                      type="password"
                      placeholder="Enter your YouTube password"
                      value={editableGameAccount.password || ''}
                      onChange={(e) => handleGameAccountChange('password', e.target.value)}
                      data-testid="purchase-youtube-password"
                    />
                    <p className="text-xs text-amber-300 mt-1 space-y-1">
                      <span>We Need Channel Viewer Access For Completing Order</span>
                      <span>✅ Quantity: 1000 = 1000 Hours</span>
                      <span>✅ Start Time: 0 - 24 Hours</span>
                      <span>✅ Speed: 3500 - 4000 Hours/Day</span>
                      <span>✅ 30,000+ Free Organic Views 😍</span>
                      <span>✅ Lifetime Guarantee</span>
                      <span>✅ In Link Section Paste Channel Link</span>
                      <span>✅ Example: https://youtube.com/@xyz</span>
                      <span>Paste your WhatsApp number</span>
                      <span>Required: Your channel must have 6 to 9 Minutes duration at least 10 videos.</span>
                    </p>
                  </div>
                ) : selectedPackage?.game === 'FACEBOOK' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-facebook-link"
                      placeholder="Enter your Facebook profile/page link"
                      value={editableGameAccount.link || ''}
                      onChange={(e) => handleGameAccountChange('link', e.target.value)}
                      data-testid="purchase-facebook-link"
                    />
                    <p className="text-xs text-amber-400 mt-1">
                      <i className="fas fa-info-circle mr-1"></i>
                      Enter the full URL of your Facebook profile or page (e.g., https://www.facebook.com/yourprofile)
                    </p>
                  </div>
                ) : selectedPackage?.game === 'INSTAGRAM' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-instagram-link"
                      placeholder="Enter your Instagram profile link"
                      value={editableGameAccount.link || ''}
                      onChange={(e) => handleGameAccountChange('link', e.target.value)}
                      data-testid="purchase-instagram-link"
                    />
                    <p className="text-xs text-amber-300 mt-1 space-y-1">
                      <span>📌Start Time: Instant</span>
                      <span>📌Speed: 20K – 50K per day</span>
                      <span>📌Drop Rate: No Drop</span>
                      <span>📌Refill: Yes, Always Instant</span>
                      <span>📌Cancel Option: Available</span>
                      <span>📌Link Required: Public Profile Link</span>
                      <span>📌Followers Quality: High-quality, real-looking profiles with 10–20 posts</span>
                      <span>� Important Notice: Disable "Flag for Review" Before Ordering</span>
                      <span>[Upto Lifetime Guranteed] [Flag Must OFF]</span>
                      <span>To ensure smooth delivery and avoid issues, please turn off the “Flag for Review” option in your account settings:</span>
                      <span>📌How to Disable:</span>
                      <span>Go to Settings and Activity</span>
                      <span>Select Follow and Invite Friends</span>
                      <span>Turn OFF Flag for Review</span>
                      <span>�🚫 Note:</span>
                      <span>No refund or refill will be provided if "Flag for Review" is turned ON.</span>
                      <span>Please make sure to use a public profile link, not a private one.</span>
                    </p>
                  </div>
                ) : selectedPackage?.game === 'NETFLIX' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-netflix-email"
                      placeholder="Enter your email"
                      value={editableGameAccount.email || ''}
                      onChange={(e) => handleGameAccountChange('email', e.target.value)}
                      data-testid="purchase-netflix-email"
                    />
                    <Input
                      id="purchase-netflix-whatsapp"
                      placeholder="Enter your WhatsApp number"
                      value={editableGameAccount.whatsapp || ''}
                      onChange={(e) => handleGameAccountChange('whatsapp', e.target.value)}
                      data-testid="purchase-netflix-whatsapp"
                    />
                    <p className="text-xs text-amber-300 mt-1 space-y-1">
                      <span>🎬 Netflix 4K Ultra HD – 1 Month Access</span>
                      <span>✅ 100% Secure – Only You Will Have Access</span>
                      <span>🛡️ 30-Day Guarantee</span>
                      <span>📲 Please enter your WhatsApp number in the link section for delivery</span>
                      <span>🔐 Personal login, no sharing</span>
                    </p>
                  </div>
                ) : selectedPackage?.game === 'CANVA' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-canva-email"
                      placeholder="Enter your email"
                      value={editableGameAccount.email || ''}
                      onChange={(e) => handleGameAccountChange('email', e.target.value)}
                      data-testid="purchase-canva-email"
                    />
                    <Input
                      id="purchase-canva-whatsapp"
                      placeholder="Enter your WhatsApp number"
                      value={editableGameAccount.whatsapp || ''}
                      onChange={(e) => handleGameAccountChange('whatsapp', e.target.value)}
                      data-testid="purchase-canva-whatsapp"
                    />
                    <p className="text-xs text-amber-300 mt-1 space-y-1">
                      <span>🔴 Note:-</span>
                      <span>After Order Status Showing Completed,</span>
                      <span>You will receive an invitation from Canva.</span>
                      <span>Go to your Gmail and accept the invitation to activate Canva Pro membership on your email 😊😍</span>
                    </p>
                  </div>
                ) : selectedPackage?.game === 'PUBG' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-pubg-ign"
                      placeholder="Enter your PUBG In-Game Name"
                      value={editableGameAccount.ign || ''}
                      onChange={(e) => handleGameAccountChange('ign', e.target.value)}
                      data-testid="purchase-pubg-ign"
                    />
                    <Input
                      id="purchase-pubg-uid"
                      placeholder="Enter your PUBG Player UID"
                      value={editableGameAccount.uid || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        handleGameAccountChange('uid', value);
                      }}
                      className="font-mono"
                      data-testid="purchase-pubg-uid"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                ) : selectedPackage?.game === 'PUBGKR' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-pubgkr-email"
                      placeholder="Enter your email"
                      value={editableGameAccount.email || ''}
                      onChange={(e) => handleGameAccountChange('email', e.target.value)}
                      data-testid="purchase-pubgkr-email"
                    />
                    <Input
                      id="purchase-pubgkr-whatsapp"
                      placeholder="Enter your WhatsApp number"
                      value={editableGameAccount.whatsapp || ''}
                      onChange={(e) => handleGameAccountChange('whatsapp', e.target.value)}
                      data-testid="purchase-pubgkr-whatsapp"
                    />
                  </div>
                ) : selectedPackage?.game === 'ROBUX' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-robux-email"
                      placeholder="Enter your Roblox account email"
                      value={editableGameAccount.email || ''}
                      onChange={(e) => handleGameAccountChange('email', e.target.value)}
                      data-testid="purchase-robux-email"
                    />
                    <Input
                      id="purchase-robux-whatsapp"
                      placeholder="Enter your WhatsApp number"
                      value={editableGameAccount.whatsapp || ''}
                      onChange={(e) => handleGameAccountChange('whatsapp', e.target.value)}
                      data-testid="purchase-robux-whatsapp"
                    />
                  </div>
                ) : selectedPackage?.game === 'NEWSTATE' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-newstate-email"
                      placeholder="Enter your NC email"
                      value={editableGameAccount.email || ''}
                      onChange={(e) => handleGameAccountChange('email', e.target.value)}
                      data-testid="purchase-newstate-email"
                    />
                    <Input
                      id="purchase-newstate-whatsapp"
                      placeholder="Enter your WhatsApp number"
                      value={editableGameAccount.whatsapp || ''}
                      onChange={(e) => handleGameAccountChange('whatsapp', e.target.value)}
                      data-testid="purchase-newstate-whatsapp"
                    />
                  </div>
                ) : selectedPackage?.game === 'FREEFIRE' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-freefire-player-id"
                      placeholder="Enter your Free Fire Player ID"
                      value={editableGameAccount.playerId || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        handleGameAccountChange('playerId', value);
                      }}
                      className="font-mono"
                      data-testid="purchase-freefire-player-id"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                ) : selectedPackage?.game === 'COC' ? (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-coc-email"
                      placeholder="Enter your email connected to Supercell"
                      value={editableGameAccount.email || ''}
                      onChange={(e) => handleGameAccountChange('email', e.target.value)}
                      data-testid="purchase-coc-email"
                    />
                    <p className="text-xs text-amber-400 mt-1">
                      <i className="fas fa-exclamation-triangle mr-1"></i>
                      Your email must be connected to Supercell
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 mt-2">
                    <Input
                      id="purchase-mlbb-user-id"
                      placeholder="Enter your MLBB User ID"
                      value={editableGameAccount.userId || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        handleGameAccountChange('userId', value);
                      }}
                      className="font-mono"
                      data-testid="purchase-mlbb-user-id"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <Input
                      id="purchase-mlbb-zone-id"
                      placeholder="Enter your MLBB Zone ID"
                      value={editableGameAccount.zoneId || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        handleGameAccountChange('zoneId', value);
                      }}
                      className="font-mono"
                      data-testid="purchase-mlbb-zone-id"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </div>
                )}
                <p className="text-xs text-amber-400 mt-2">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Please verify your {selectedPackage?.game?.includes('TIKTOK') ? 'TikTok profile URL' :
                                       selectedPackage?.game?.includes('YOUTUBE') ? 'YouTube' :
                                       selectedPackage?.game === 'FACEBOOK' ? 'Facebook' :
                                       selectedPackage?.game === 'INSTAGRAM' ? 'Instagram' :
                                       selectedPackage?.game === 'NETFLIX' ? 'Netflix' :
                                       selectedPackage?.game === 'CANVA' ? 'Canva' :
                                       'game'} {selectedPackage?.game === 'TIKTOK_COINS' ? 'account credentials are' : 'account details are'} correct. Incorrect information may result in failed delivery.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Cost</span>
                  <div className="text-right">
                    {appliedCoupon && (
                      <p className="text-xs text-slate-400 line-through">
                        {appliedCoupon.originalPiAmount < 0.1 ? `${appliedCoupon.originalPiAmount.toFixed(4)} Ï€` : `${appliedCoupon.originalPiAmount.toFixed(1)} Ï€`}
                      </p>
                    )}
                    <p className="font-mono text-green-400 text-xl font-bold" data-testid="total-cost">
                      {finalPiAmount < 0.1 ? `${finalPiAmount.toFixed(4)} π` : `${finalPiAmount.toFixed(1)} π`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Highlighted notice for users to double-check their details */}
          <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <i className="fas fa-exclamation-triangle text-red-400 text-xl mr-2 mt-0.5"></i>
              <div>
                <h3 className="font-bold text-red-300 mb-1">Please Double-Check Your Details</h3>
                <p className="text-sm text-red-200">
                  Verify all information above is correct before proceeding. 
                  Incorrect {selectedPackage?.game?.includes('TIKTOK') ? 'TikTok' :
                             selectedPackage?.game?.includes('YOUTUBE') ? 'YouTube' :
                             selectedPackage?.game === 'FACEBOOK' ? 'Facebook' :
                             selectedPackage?.game === 'INSTAGRAM' ? 'Instagram' :
                             selectedPackage?.game === 'NETFLIX' ? 'Netflix' :
                             selectedPackage?.game === 'CANVA' ? 'Canva' :
                             'game'} {selectedPackage?.game === 'TIKTOK_COINS' ? 'account credentials' : 'account details'} may result in failed delivery of your purchase.
                </p>
              </div>
            </div>
          </div>

          {/* Profile verification notice */}
          {!user?.isProfileVerified && (
            <div className="bg-amber-500/20 border-2 border-amber-500 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <i className="fas fa-user-lock text-amber-400 text-xl mr-2 mt-0.5"></i>
                <div>
                  <h3 className="font-bold text-amber-300 mb-1">Profile Verification Required</h3>
                  <p className="text-sm text-amber-200">
                    Your profile must be verified before you can make a purchase. Please complete your profile verification in the dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className={`${isPiSandboxMode ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'} border rounded-lg p-4 mb-6`}>
            <p className={`text-sm ${isPiSandboxMode ? 'text-green-300' : 'text-red-200'}`}>
              <i className="fas fa-info-circle mr-2"></i>
              {isPiSandboxMode ? (
                <>Pi Testnet Mode: Test Pi will be used. No real Pi will be deducted from your mainnet wallet.</>
              ) : (
                <>Mainnet Mode: Real Pi will be deducted from your mainnet wallet for this transaction.</>
              )}
            </p>
          </div>
        </div>

        <div className="flex space-x-4 mt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            data-testid="cancel-purchase"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProcessPayment} 
            className="flex-1"
            data-testid="confirm-purchase"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Processing...
              </>
            ) : (
              <>
                <img 
                  src="https://b4uesports.com/wp-content/uploads/2025/10/piwalletlogob4uesports.png" 
                  alt="PI Wallet" 
                  className="mr-2 w-6 h-6"
                />
                Continue Payment
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
