import React, { useState, useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Zap, Trophy, Users, Calendar, Clock, Shield, AlertCircle } from 'lucide-react';
import { usePiNetwork } from '@/hooks/use-pi-network';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionDetails } from '@/types/pi-network';

interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'weekly' | 'monthly';
  priceInPi: number;
  priceInUsd: string;
  duration: string;
  features: string[];
  color: string;
  accentColor: string;
  icon: React.ReactNode;
  popularity: 'popular' | 'standard';
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'pubg-weekly',
    name: 'PUBG Weekly Pass',
    type: 'weekly',
    priceInPi: 20,
    priceInUsd: '10.00',
    duration: '7 Days',
    features: [
      '🎮 Access to all PUBG Arena tournaments',
      '⚡ Instant tournament matching',
      '🏆 Weekly leaderboard ranking',
      '📊 Real-time stats tracking',
      '🎯 Exclusive arena access',
      '💎 Weekly rewards and bonuses',
      '🔔 Priority tournament notifications',
    ],
    color: 'from-cyan-500 to-blue-600',
    accentColor: 'cyan',
    icon: <Calendar className="w-8 h-8" />,
    popularity: 'standard',
  },
  {
    id: 'pubg-monthly',
    name: 'PUBG Monthly Pass',
    type: 'monthly',
    priceInPi: 30,
    priceInUsd: '15.00',
    duration: '30 Days',
    features: [
      '🎮 Unlimited PUBG Arena tournament access',
      '⚡ Instant tournament matching',
      '🏆 Monthly leaderboard dominance',
      '📊 Advanced stats analytics',
      '🎯 Premium arena features',
      '💎 Monthly exclusive rewards',
      '🔔 VIP tournament invitations',
      '👑 Exclusive monthly challenges',
    ],
    color: 'from-purple-500 to-pink-600',
    accentColor: 'purple',
    icon: <Trophy className="w-8 h-8" />,
    popularity: 'popular',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12,
    },
  },
};

const featureVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 100,
    },
  }),
};

export default function Subscriptions() {
  const { user, token, createPayment, isAuthenticated } = usePiNetwork();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [recentlySubscribedPlan, setRecentlySubscribedPlan] = useState<'weekly' | 'monthly' | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails>({
    userName: '',
    userEmail: '',
    userPhone: '',
    userGameIgn: '',
    userGameUid: '',
    userTeamName: '',
    subscriptionType: 'weekly',
    subscriptionName: '',
  });

  // Date parsing safety utilities
  const parseDateSafe = (dateVal: any) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
    
    if (typeof dateVal === 'string') {
      const isoStr = dateVal.replace(' ', 'T');
      const d2 = new Date(isoStr);
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  };

  const formatDateSafe = (dateVal: any) => {
    const d = parseDateSafe(dateVal);
    return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  };

  // Fetch user's active subscriptions
  const { data: subscriptionsData, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['user-subscriptions', token],
    queryFn: async () => {
      const response = await fetch('/api/user/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      return response.json();
    },
    enabled: !!token && !!isAuthenticated,
    refetchInterval: false,
  });

  const activeSubscriptions = useMemo(() => {
    return subscriptionsData?.subscriptions?.filter((s: any) => {
      const parsedUntil = parseDateSafe(s.activeUntil);
      const isActive = s.isCurrentlyActive || 
        (s.status === 'active' && parsedUntil && parsedUntil.getTime() > Date.now());
      return isActive;
    }) || [];
  }, [subscriptionsData]);

  // Log subscription status on load and when data changes
  React.useEffect(() => {
    if (subscriptionsData?.subscriptions) {
      console.log('📊 Subscription Data Loaded:', {
        totalSubscriptions: subscriptionsData.subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        active: activeSubscriptions.map((s: any) => ({
          type: s.subscriptionType,
          name: s.subscriptionName,
          expiresAt: s.activeUntil,
          isCurrentlyActive: s.isCurrentlyActive,
        })),
      });
    }
  }, [subscriptionsData, activeSubscriptions]);

  // Check if a plan type is already active
  const isPlanActive = (planType: 'weekly' | 'monthly') => {
    // Check if recently subscribed to this plan (immediate UI feedback for new subscriptions)
    if (recentlySubscribedPlan === planType) {
      console.log(`✓ Plan ${planType} is active (recently subscribed)`);
      return true;
    }
    
    // Check if subscription is confirmed in API data (for existing subscriptions)
    const hasExistingSubscription = activeSubscriptions.some((s: any) => {
      const matchesType = s.subscriptionType?.toLowerCase() === planType.toLowerCase();
      if (matchesType) {
        console.log(`✓ Plan ${planType} is active (existing subscription):`, {
          type: s.subscriptionType,
          name: s.subscriptionName,
          activeUntil: s.activeUntil,
          isCurrentlyActive: s.isCurrentlyActive,
        });
      }
      return matchesType;
    });
    
    return hasExistingSubscription;
  };

  const getActiveSubscription = (planType: 'weekly' | 'monthly') => {
    return activeSubscriptions.find((s: any) => s.subscriptionType?.toLowerCase() === planType.toLowerCase());
  };

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const response = await fetch('/api/packages');
      return response.json();
    },
  });

  const pubgSubscriptionPackages = useMemo(() => {
    return packages?.filter((pkg: any) => pkg.game === 'PUBG_SUBSCRIPTION') || [];
  }, [packages]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in with Pi Network to subscribe.',
        variant: 'warning',
      });
      return;
    }

    const requiredFields: Array<[keyof SubscriptionDetails, string]> = [
      ['userName', 'subscriber name'],
      ['userEmail', 'subscriber email'],
      ['userPhone', 'subscriber contact number'],
      ['userGameIgn', 'PUBG in-game name'],
      ['userGameUid', 'PUBG UID'],
    ];

    const missingField = requiredFields.find(([field]) => !String(subscriptionDetails[field] || '').trim());
    if (missingField) {
      toast({
        title: 'Details Required',
        description: `Please enter the ${missingField[1]}.`,
        variant: 'warning',
      });
      return;
    }

    setProcessingPlan(plan.id);

    try {
      const subscriptionPackage = pubgSubscriptionPackages.find(
        (pkg: any) => pkg.name.includes(plan.type === 'weekly' ? 'Weekly' : 'Monthly')
      );

      if (!subscriptionPackage) {
        toast({
          title: 'Package Not Found',
          description: 'Please refresh the app and try again.',
          variant: 'destructive',
        });
        setProcessingPlan(null);
        return;
      }

      const piAmount = plan.priceInPi;

      const paymentData = {
        amount: piAmount,
        memo: `PUBG ${plan.type === 'weekly' ? 'Weekly' : 'Monthly'} Tournament Pass - PUBG_SUBSCRIPTION`,
        paymentType: 'SUBSCRIPTION' as const,
        metadata: {
          type: 'subscription' as const,
          userId: user.id,
          packageId: subscriptionPackage.id,
          subscriptionDetails: {
            ...subscriptionDetails,
            subscriptionType: plan.type,
            subscriptionDuration: plan.duration,
            subscriptionName: plan.name,
          },
          subscriptionType: plan.type,
          subscriptionDuration: plan.duration,
          subscriptionName: plan.name,
        },
      };

      createPayment(paymentData, {
        onReadyForServerApproval: (paymentId: string) => {
          toast({
            title: 'Payment Approved',
            description: 'Complete the payment in your Pi Wallet.',
            variant: 'info',
          });
        },
        onReadyForServerCompletion: (_paymentId: string, txid: string) => {
          // Immediately show subscription as active (optimistic update)
          setRecentlySubscribedPlan(plan.type);
          
          toast({
            title: 'Subscription Activated',
            description: `Your ${plan.name} is now active.`,
            variant: 'success',
          });
          
          setProcessingPlan(null);
          
          // Refetch to confirm with backend
          refetchSubscriptions().then(() => {
            // Clear local state after API confirms - now using API as source of truth
            setTimeout(() => {
              setRecentlySubscribedPlan(null);
            }, 500);
          });
        },
        onCancel: () => {
          toast({
            title: 'Subscription Cancelled',
            description: 'No subscription was activated.',
            variant: 'info',
          });
          setProcessingPlan(null);
        },
        onError: (error: Error) => {
          toast({
            title: 'Payment Failed',
            description: error.message || 'Subscription payment could not be processed.',
            variant: 'destructive',
          });
          setProcessingPlan(null);
        },
      });
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Subscription Error',
        description: error instanceof Error ? error.message : 'Could not start subscription.',
        variant: 'destructive',
      });
      setProcessingPlan(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>PUBG Tournament Subscriptions | B4U Esports - Unlock Exclusive Arena Access</title>
        <meta
          name="description"
          content="Subscribe to PUBG Weekly (20 Pi) or Monthly (30 Pi) passes for exclusive tournament access, real-time stats, and weekly rewards on B4U Esports."
        />
        <meta
          name="keywords"
          content="PUBG subscriptions, tournament pass, weekly pass, monthly pass, Pi network, gaming subscriptions, esports"
        />
        <meta name="og:title" content="PUBG Tournament Subscriptions - B4U Esports" />
        <meta
          name="og:description"
          content="Get exclusive PUBG Arena tournament access with weekly or monthly subscription passes powered by Pi Network."
        />
        <meta name="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PUBG Tournament Subscriptions" />
        <meta
          name="twitter:description"
          content="Subscribe to PUBG tournaments with Pi Network. Weekly (20 Pi) or Monthly (30 Pi) passes."
        />
      </Helmet>

      <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
            animate={{
              y: [0, 50, 0],
              x: [0, 30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{
              y: [0, -50, 0],
              x: [0, -30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header Section */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-flex items-center justify-center mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 px-4 py-2 text-sm font-bold">
                🎮 PUBG Tournament Subscriptions
              </Badge>
            </motion.div>

            <h1 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-6">
              Unlock Exclusive Tournament Access
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Choose your subscription to get instant access to PUBG Arena tournaments, real-time stats tracking, weekly rewards, and
              exclusive gaming benefits. Powered by Pi Network.
            </p>

            <motion.div
              className="mt-8 flex items-center justify-center gap-8 flex-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 text-slate-300">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span>Instant Activation</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Millions of Players</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Trophy className="w-5 h-5 text-purple-400" />
                <span>Weekly Tournaments</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="max-w-3xl mx-auto mb-12 rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Tournament Account Details</h2>
              <p className="mt-1 text-sm text-slate-300">
                These account details are used only for PUBG tournament subscription access and do not overwrite your profile.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="subscription-user-name" className="text-slate-200">Subscriber name</Label>
                <Input
                  id="subscription-user-name"
                  value={subscriptionDetails.userName}
                  onChange={(event) => setSubscriptionDetails((details) => ({ ...details, userName: event.target.value }))}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subscription-user-email" className="text-slate-200">Subscriber email</Label>
                <Input
                  id="subscription-user-email"
                  value={subscriptionDetails.userEmail}
                  onChange={(event) => setSubscriptionDetails((details) => ({ ...details, userEmail: event.target.value }))}
                  placeholder="Email for tournament updates"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subscription-user-phone" className="text-slate-200">Contact number</Label>
                <Input
                  id="subscription-user-phone"
                  value={subscriptionDetails.userPhone}
                  onChange={(event) => setSubscriptionDetails((details) => ({ ...details, userPhone: event.target.value }))}
                  placeholder="Contact or WhatsApp number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subscription-team-name" className="text-slate-200">Team name</Label>
                <Input
                  id="subscription-team-name"
                  value={subscriptionDetails.userTeamName || ''}
                  onChange={(event) => setSubscriptionDetails((details) => ({ ...details, userTeamName: event.target.value }))}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subscription-game-ign" className="text-slate-200">PUBG in-game name</Label>
                <Input
                  id="subscription-game-ign"
                  value={subscriptionDetails.userGameIgn}
                  onChange={(event) => setSubscriptionDetails((details) => ({ ...details, userGameIgn: event.target.value }))}
                  placeholder="Your PUBG IGN"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subscription-game-uid" className="text-slate-200">PUBG UID</Label>
                <Input
                  id="subscription-game-uid"
                  value={subscriptionDetails.userGameUid}
                  onChange={(event) => setSubscriptionDetails((details) => ({ ...details, userGameUid: event.target.value.replace(/\D/g, '') }))}
                  placeholder="Numeric PUBG UID"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="mt-1 font-mono"
                />
              </div>
            </div>
          </motion.div>

          {/* Active Subscriptions Banner */}
          {activeSubscriptions.length > 0 && (
            <motion.div
              className="max-w-3xl mx-auto mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 backdrop-blur-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-emerald-300">Your Active Subscriptions</h3>
                </div>
                <div className="space-y-3">
                  {activeSubscriptions.map((sub: any) => (
                    <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-900/50 border border-emerald-500/10 p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <p className="font-semibold text-white text-sm">{sub.subscriptionName || `PUBG ${sub.subscriptionType} Pass`}</p>
                          <p className="text-xs text-slate-400">{sub.amountPi} π paid</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Active since: <span className="text-white font-medium">{formatDateSafe(sub.activeSince)}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Expires: <span className="text-white font-medium">{formatDateSafe(sub.activeUntil)}</span></span>
                        </div>
                        {sub.remainingDuration && (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]">
                            {sub.remainingDuration.days}d {sub.remainingDuration.hours}h left
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Pricing Cards */}
          <motion.div
            className="grid md:grid-cols-2 gap-8 mb-16"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {subscriptionPlans.map((plan, index) => {
              const planIsActive = isPlanActive(plan.type);
              const activeSub = getActiveSubscription(plan.type);
              return (
              <motion.div key={plan.id} variants={itemVariants}>
                <motion.div
                  className="relative h-full"
                  whileHover={planIsActive ? {} : { y: -8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {planIsActive ? (
                    <motion.div
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Badge className="bg-emerald-500/90 text-white border-0 px-4 py-1 font-bold text-sm shadow-lg shadow-emerald-500/30">
                        ✓ ACTIVE
                      </Badge>
                    </motion.div>
                  ) : plan.popularity === 'popular' ? (
                    <motion.div
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1 font-bold text-sm">
                        ⭐ MOST POPULAR
                      </Badge>
                    </motion.div>
                  ) : null}

                  <Card
                    className={`relative overflow-hidden h-full border-2 bg-gradient-to-br ${
                      planIsActive
                        ? 'border-emerald-500/40 shadow-2xl shadow-emerald-500/10'
                        : plan.popularity === 'popular'
                          ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20'
                          : 'border-cyan-500/30 hover:border-cyan-500/50'
                    } backdrop-blur-xl transition-all duration-300`}
                  >
                    {/* Gradient Background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${plan.color} ${planIsActive ? 'opacity-5' : 'opacity-10'} pointer-events-none`}
                    />

                    <CardHeader className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <motion.div
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center text-white ${planIsActive ? 'opacity-60' : ''}`}
                          animate={planIsActive ? {} : { rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          {planIsActive ? <Shield className="w-6 h-6" /> : plan.icon}
                        </motion.div>
                        {plan.popularity === 'popular' && !planIsActive && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-2xl"
                          >
                            🔥
                          </motion.div>
                        )}
                      </div>

                      <CardTitle className={`text-2xl font-bold mb-2 ${planIsActive ? 'text-emerald-300' : 'text-white'}`}>{plan.name}</CardTitle>
                      <CardDescription className="text-slate-300">{plan.duration} of tournament access</CardDescription>

                      {/* Active subscription dates */}
                      {planIsActive && activeSub && (
                        <div className="mt-4 space-y-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/20 p-3">
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-slate-400">Active since:</span>
                            <span className="text-white font-medium">{formatDateSafe(activeSub.activeSince)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-slate-400">Valid until:</span>
                            <span className="text-white font-medium">{formatDateSafe(activeSub.activeUntil)}</span>
                          </div>
                          {activeSub.remainingDuration && (
                            <div className="flex items-center gap-2 text-xs">
                              <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-slate-400">Remaining:</span>
                              <span className="text-emerald-300 font-medium">{activeSub.remainingDuration.days} days, {activeSub.remainingDuration.hours} hours</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Price */}
                      {!planIsActive && (
                        <div className="mt-6 space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{plan.priceInPi}</span>
                            <span className="text-lg font-semibold text-cyan-400">π</span>
                            <span className="text-sm text-slate-400">/ {plan.type}</span>
                          </div>
                          <p className="text-sm text-slate-400">≈ ${plan.priceInUsd} USD</p>
                        </div>
                      )}
                    </CardHeader>

                    {/* Features List */}
                    <div className="relative z-10 px-6 pb-6">
                      <div className="space-y-3 mb-8">
                        {plan.features.map((feature, idx) => (
                          <motion.div
                            key={idx}
                            className="flex items-start gap-3"
                            custom={idx}
                            variants={featureVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <motion.div
                              animate={planIsActive ? {} : { scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.5, delay: idx * 0.1 }}
                            >
                              <Check className={`w-5 h-5 ${planIsActive ? 'text-emerald-400' : `text-${plan.accentColor}-400`} flex-shrink-0 mt-0.5`} />
                            </motion.div>
                            <span className={`text-sm ${planIsActive ? 'text-slate-400' : 'text-slate-300'}`}>{feature}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Subscribe Button / Active Status */}
                      {planIsActive ? (
                        <>
                          <div className="w-full h-12 font-bold text-base rounded-lg flex items-center justify-center gap-2 bg-emerald-900/30 border border-emerald-500/30 text-emerald-300">
                            <Shield className="w-4 h-4" />
                            Currently Active
                          </div>
                          <p className="text-xs text-slate-400 text-center mt-3">
                            This subscription is active. Renew after it expires.
                          </p>
                        </>
                      ) : (
                        <>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full"
                          >
                            <Button
                              className={`w-full h-12 font-bold text-base rounded-lg transition-all duration-300 relative overflow-hidden group ${
                                plan.popularity === 'popular'
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:shadow-purple-500/50'
                                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/50'
                              }`}
                              onClick={() => handleSubscribe(plan)}
                              disabled={processingPlan === plan.id || !user}
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                {processingPlan === plan.id ? (
                                  <>
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                                      ⏳
                                    </motion.div>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-4 h-4" />
                                    Subscribe Now
                                  </>
                                )}
                              </span>
                            </Button>
                          </motion.div>

                          {!user && (
                            <p className="text-xs text-slate-400 text-center mt-3">
                              Please log in with Pi Network to subscribe
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
              );
            })}
          </motion.div>

          {/* Features Highlights */}
          <motion.div
            className="grid md:grid-cols-4 gap-6 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {[
              {
                icon: '🎮',
                title: 'Tournament Access',
                description: 'Join exclusive PUBG Arena matches',
              },
              {
                icon: '📊',
                title: 'Stats Tracking',
                description: 'Real-time performance analytics',
              },
              {
                icon: '🏆',
                title: 'Leaderboards',
                description: 'Compete for weekly rankings',
              },
              {
                icon: '💎',
                title: 'Weekly Rewards',
                description: 'Earn exclusive bonuses',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, scale: 1.02 }}
                className="p-6 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            className="max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>

            <div className="space-y-4">
              {[
                {
                  q: 'How do I activate my subscription?',
                  a: 'After payment completion, your subscription is instantly activated. You can immediately access PUBG Arena tournaments.',
                },
                {
                  q: 'Can I switch between Weekly and Monthly plans?',
                  a: 'Yes! You can upgrade or downgrade at any time. The change takes effect in your next billing cycle.',
                },
                {
                  q: 'What payment methods are accepted?',
                  a: 'We accept Pi Network cryptocurrency. Simply use your Pi Wallet to complete payments.',
                },
                {
                  q: 'Is my data secure?',
                  a: 'Absolutely. All transactions are secured with blockchain technology and encrypted end-to-end.',
                },
              ].map((faq, idx) => (
                <motion.div
                  key={idx}
                  className="p-5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all"
                  whileHover={{ x: 4 }}
                >
                  <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-sm text-white">
                      {idx + 1}
                    </span>
                    {faq.q}
                  </h3>
                  <p className="text-slate-300 ml-8 text-sm">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            className="max-w-2xl mx-auto text-center p-8 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Compete?</h2>
            <p className="text-slate-300 mb-6">
              Join thousands of PUBG players in our exclusive tournaments. Subscribe now and start earning rewards.
            </p>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl"
            >
              ⬇️
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
