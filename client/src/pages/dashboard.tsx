import { usePiNetwork } from '@/hooks/use-pi-network';
import { usePiPrice } from '@/hooks/use-pi-price';
import { usePiAds, PiAdsHook } from '@/hooks/use-pi-ads';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import ParticleBackground from '@/components/particle-background';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import BottomNav from '@/components/bottom-nav';
import AnimatedPage from '@/components/animated-page';
import ProfileModal from '@/components/profile-modal';
import PurchaseModal from '@/components/purchase-modal';
import PackageCard from '@/components/package-card';
import AdsButton from '@/components/ads-button';
import PiFileShare from '@/components/pi-file-share';
import RecentPurchasesFeed from '@/components/recent-purchases-feed';
import LanguageSelector from '@/components/language-selector';
import { useLanguage } from '@/context/LanguageContext';
import { useSound } from '@/hooks/useSound';
import SuccessModal from '@/components/success-modal';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { FilterIcon, CopyIcon, Share2Icon, Wallet, Sparkles, ShieldCheck, TrendingUp, ExternalLink, Award, ChevronDown, ChevronUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { piSDK } from '@/lib/pi-sdk';
import { piStorage } from '@/lib/pi-storage';
import type { Package, Transaction } from '@/types/pi-network';
import { GAME_LOGOS, BRAND_LOGOS } from '@/lib/constants';
import { motion } from 'framer-motion';
import { queryClient } from "@/lib/queryClient";
import { adSessionManager } from '@/lib/ad-frequency-manager';
import AnimatedCounter from '@/components/animated-counter';
import { ADMIN_PANEL_PATH } from '@/lib/admin-route';

interface FeedbackEntry {
  id: string;
  userId?: string | null;
  username: string;
  email?: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  profilePicture?: string | null;
  replies?: Array<{ id: string }>;
}

interface PubgRosterPlayer {
  email: string;
  phone: string;
  ign: string;
  uid: string;
  mugshotName?: string;
}

interface ArenaTournament {
  id: string;
  title: string;
  game: string;
  mode: string;
  teamSize?: number;
  registrationFeePi: string;
  prizePoolPi: string;
  platformFeePi?: string;
  paidEntries?: number;
  startsAt?: string;
  registrationClosesAt?: string;
  status: string;
}

interface ArenaLobby {
  id: string;
  name: string;
  mapName?: string;
  roomCode?: string;
  roomPassword?: string;
  status: string;
  createdAt?: string;
}

interface ArenaTeam {
  id: string;
  teamName?: string;
  name?: string;
  mode?: string;
  captainIgn?: string;
  captainUserId?: string | null;
  teamLeaderEmail?: string | null;
  players?: Array<{
    email?: string;
    phone?: string;
    ign?: string;
    uid?: string;
    pubgIgn?: string;
    pubgUid?: string;
    mugshotName?: string;
  }>;
  logoName?: string;
  teamLogo?: string | null;
  registration?: {
    status: string;
    paymentStatus: string;
  };
}

export default function Dashboard() {
  const { user, isAuthenticated, logout, token, refreshUser, createPayment, isLoading: isAuthLoading, authenticate } = usePiNetwork();
  const { t } = useLanguage();
  const { adNetworkSupported, showInterstitialAd }: PiAdsHook = usePiAds();
  const { toast } = useToast();
  const { data: piPrice } = usePiPrice();
  const { soundActions, initializeAudio } = useSound();

  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
    refetchInterval: false,
  });

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      refetchNotifications();
    } catch (e) { console.error(e); }
  };

  const { data: stakingData } = useQuery<{
    hasStaked: boolean;
    userStake?: {
      stakeAmount: number;
      lockupPeriodMonths: number;
      tier: string;
      loyaltyDiscountPercent: number;
      bonusTokensPerAd: number;
      stakedAt?: string;
    };
    appAppDirectoryUrl?: string;
    directoryStakingInfo?: {
      minStakeForSilver: number;
      minStakeForGold: number;
      minStakeForDiamond: number;
    };
  }>({
    queryKey: ['/api/user/staking', user?.piUID],
    queryFn: async () => {
      const activeToken = token || piStorage.getItem('pi_token');
      if (!activeToken) return null;
      const res = await fetch('/api/user/staking', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user && (!!token || !!piStorage.getItem('pi_token')),
    staleTime: 60000,
  });
  
  const [, setLocation] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // UI preferences persisted in Pi Browser-managed device storage
  const [activeSection, setActiveSectionState] = useState<string>(() =>
    piStorage.getUiPreference('active_section', 'home')
  );
  const setActiveSection = (section: string) => {
    setActiveSectionState(section);
    piStorage.setUiPreference('active_section', section);
  };

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isStakingModalOpen, setIsStakingModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [userTokens, setUserTokens] = useState(0);
  const [showLogoutBanner, setShowLogoutBanner] = useState(true);
  const hasMountedRef = useRef(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });

  useEffect(() => {
    if (emblaApi) {
      const autoplay = setInterval(() => {
        emblaApi.scrollNext();
      }, 5000); // Perfect timing every 5 seconds
      return () => clearInterval(autoplay);
    }
  }, [emblaApi]);

  const [lastTokenUpdate, setLastTokenUpdate] = useState(0);
  const [transactionFilter, setTransactionFilterState] = useState<'all' | 'completed' | 'pending' | 'failed'>(() =>
    piStorage.getUiPreference<'all' | 'completed' | 'pending' | 'failed'>('tx_filter', 'all')
  );
  const setTransactionFilter = (f: 'all' | 'completed' | 'pending' | 'failed') => {
    setTransactionFilterState(f);
    piStorage.setUiPreference('tx_filter', f);
  };

  const [transactionSort, setTransactionSort] = useState<'date' | 'amount'>('date');
  const [trackTransactionId, setTrackTransactionId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackResult, setTrackResult] = useState<Transaction | null>(null);
  const [trackError, setTrackError] = useState('');
  const [expandedTrackingTxId, setExpandedTrackingTxId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [isBalanceHidden, setIsBalanceHiddenState] = useState<boolean>(() =>
    piStorage.getUiPreference('balance_hidden', false)
  );
  const setIsBalanceHidden = (action: boolean | ((prev: boolean) => boolean)) => {
    setIsBalanceHiddenState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      piStorage.setUiPreference('balance_hidden', next);
      return next;
    });
  };

  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false);
  const [shopStage, setShopStage] = useState<'category' | 'titles' | 'packages'>('category');
  const [shopCategory, setShopCategoryState] = useState<'tokens' | 'services' | null>(() =>
    piStorage.getUiPreference<'tokens' | 'services' | null>('shop_category', null)
  );
  const setShopCategory = (cat: 'tokens' | 'services' | null) => {
    setShopCategoryState(cat);
    piStorage.setUiPreference('shop_category', cat);
  };

  const [shopSelection, setShopSelection] = useState<string>('');
  const [activeGameTab, setActiveGameTab] = useState<string>('pubg');
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [isProcessingRedemption, setIsProcessingRedemption] = useState(false);
  const [activeServiceTab, setActiveServiceTab] = useState<string>('tiktok');
  const [activeTournamentPanel, setActiveTournamentPanel] = useState<'register' | 'teams' | 'rules' | 'lobby' | 'leaderboard' | null>(null);
  const [tournamentMode, setTournamentMode] = useState<'Solo' | 'Duo' | 'Squad'>('Squad');
  const tournamentEntryFees = {
    Solo: 2,
    Duo: 4,
    Squad: 5,
  } as const;

  // Restore non-authoritative tournament form draft from device storage
  const initialTournamentDraft = piStorage.getFormDraft<{ ign?: string; uid?: string; teamName?: string }>('pubg_registration');
  const [tournamentIgn, setTournamentIgn] = useState(initialTournamentDraft?.ign || '');
  const [tournamentUid, setTournamentUid] = useState(initialTournamentDraft?.uid || '');
  const [tournamentTeamName, setTournamentTeamName] = useState(initialTournamentDraft?.teamName || '');

  // Auto-save tournament form draft to device storage to survive app switching
  useEffect(() => {
    if (tournamentIgn || tournamentUid || tournamentTeamName) {
      piStorage.setFormDraft('pubg_registration', {
        ign: tournamentIgn,
        uid: tournamentUid,
        teamName: tournamentTeamName,
      });
    }
  }, [tournamentIgn, tournamentUid, tournamentTeamName]);
  const [tournamentTeamLogoName, setTournamentTeamLogoName] = useState('');
  const [tournamentRoster, setTournamentRoster] = useState<PubgRosterPlayer[]>(
    Array.from({ length: 4 }, () => ({ email: '', phone: '', ign: '', uid: '' }))
  );
  const [tournamentRegistered, setTournamentRegistered] = useState(false);
  const [isTournamentPaymentProcessing, setIsTournamentPaymentProcessing] = useState(false);
  const [isTournamentPaymentLocked, setIsTournamentPaymentLocked] = useState(false);
  const [registeredPubgTeams, setRegisteredPubgTeams] = useState<Array<{
    id: string;
    teamName: string;
    mode: string;
    captainIgn: string;
    players: PubgRosterPlayer[];
    logoName?: string;
  }>>([]);
  const [leaderboardMatchType, setLeaderboardMatchType] = useState<'All' | 'Classic' | 'TDM'>('All');
  const [leaderboardModeFilter, setLeaderboardModeFilter] = useState<'All' | 'Solo' | 'Duo' | 'Squad'>('All');
  const [lobbyLeaderCode, setLobbyLeaderCode] = useState('');
  const [arenaLobbyData, setArenaLobbyData] = useState<{ team: { id: string; name: string; logo?: string | null }; lobbies: ArenaLobby[] } | null>(null);
  const [isArenaLobbyLoading, setIsArenaLobbyLoading] = useState(false);
  const [lobbyAccessGranted, setLobbyAccessGranted] = useState(false);
  const [completedMatchIds, setCompletedMatchIds] = useState<string[]>([]);
  const [winnerRewardClaimed, setWinnerRewardClaimed] = useState(false);

  const { data: arenaTournaments = [] } = useQuery<ArenaTournament[]>({
    queryKey: ['/api/tournaments', 'pubg-arena'],
    queryFn: async () => {
      const response = await fetch('/api/tournaments', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : data?.tournaments || [];
    },
    staleTime: 120000,
    refetchOnWindowFocus: true, // pick up new tournaments when user switches back to tab
    refetchOnMount: 'always',
    refetchInterval: false,
  });

  const checkIsRegistrationClosed = (tournament: any) => {
    if (!tournament) return true;
    const rawStatus = String(tournament.status || '').toLowerCase();
    const isCompleted = ['completed', 'cancelled', 'ended'].includes(rawStatus);
    if (isCompleted) return true;
    
    const now = Date.now();
    const startsAt = tournament.startsAt ? new Date(tournament.startsAt).getTime() : null;
    const registrationClosesAt = tournament.registrationClosesAt ? new Date(tournament.registrationClosesAt).getTime() : null;
    
    const isTimeOver = (registrationClosesAt && registrationClosesAt <= now) || (startsAt && startsAt <= now);
    const isClosedDb = ['registration_closed', 'in_progress'].includes(rawStatus);
    return isClosedDb || isTimeOver;
  };

  const openArenaStatuses = ['registration_open', 'published', 'draft', 'live', 'in_progress'];
  // Sort PUBG tournaments: newest startsAt first so a newly created tournament always takes priority
  const pubgTournaments = arenaTournaments
    .filter((tournament) => String(tournament.game || '').toLowerCase().includes('pubg'))
    .sort((a, b) => new Date(b.startsAt || 0).getTime() - new Date(a.startsAt || 0).getTime());
  // Prefer newest open tournament that has not closed yet; fall back to newest open; fall back to newest overall
  const activeArenaTournament =
    pubgTournaments.find((tournament) => openArenaStatuses.includes(String(tournament.status || '')) && !checkIsRegistrationClosed(tournament))
    || pubgTournaments.find((tournament) => openArenaStatuses.includes(String(tournament.status || '')))
    || pubgTournaments[0]
    || arenaTournaments[0];

  const isArenaRegistrationOpen = activeArenaTournament
    ? ['registration_open', 'published', 'draft'].includes(String(activeArenaTournament.status || '')) && !checkIsRegistrationClosed(activeArenaTournament)
    : false;
  const activeArenaMode = String(activeArenaTournament?.mode || 'squad').toLowerCase();
  const activeArenaModeLabel = activeArenaMode === 'solo' ? 'Solo' : activeArenaMode === 'duo' ? 'Duo' : 'Squad';
  const activeArenaTeamSize = Number(activeArenaTournament?.teamSize || (activeArenaMode === 'solo' ? 1 : activeArenaMode === 'duo' ? 2 : 4));

  const inferTeamModeLabel = (mode: any, players: PubgRosterPlayer[] = []) => {
    const normalizedMode = String(mode || '').trim().toLowerCase();
    if (['solo', 'duo', 'squad'].includes(normalizedMode)) {
      return normalizedMode.charAt(0).toUpperCase() + normalizedMode.slice(1);
    }
    const count = players.filter(Boolean).length;
    if (count === 1) return 'Solo';
    if (count === 2) return 'Duo';
    if (count >= 3) return 'Squad';
    return activeArenaModeLabel;
  };

  const tournamentEntryFee = Number(activeArenaTournament?.registrationFeePi ?? tournamentEntryFees[tournamentMode]);
  const tournamentPrizePool = Number(activeArenaTournament?.prizePoolPi ?? 500);
  const tournamentPlatformFee = Number(activeArenaTournament?.platformFeePi ?? 0);
  const activeArenaTournamentId = activeArenaTournament?.id ?? null;

  const { data: arenaTeamsData } = useQuery<any>({
    queryKey: [`/api/tournaments/${activeArenaTournamentId}/teams`, 'pubg-arena-teams', token],
    enabled: !!activeArenaTournamentId && !!token,
    queryFn: async () => {
      const response = await fetch(`/api/tournaments/${activeArenaTournamentId}/teams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) return { teams: [] };
      return response.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const arenaTeams = arenaTeamsData?.teams || [];

  const { data: arenaTournamentData, refetch: refetchArenaTournamentData } = useQuery<any>({
    queryKey: [`/api/tournaments/${activeArenaTournamentId}`, 'pubg-arena-tournament', token],
    enabled: !!activeArenaTournamentId,
    queryFn: async () => {
      const response = await fetch(`/api/tournaments/${activeArenaTournamentId}`);
      if (!response.ok) {
        return { leaderboard: [], teams: [] };
      }
      return response.json();
    },
    staleTime: 120000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: false,
  });

  useEffect(() => {
    if (activeArenaTournament?.mode) {
      setTournamentMode(activeArenaModeLabel as 'Solo' | 'Duo' | 'Squad');
    }
  }, [activeArenaTournament?.id, activeArenaModeLabel]);

  useEffect(() => {
    const mappedTeams = (arenaTeams || []).map((team: any) => {
      const players = (team.players || []).map((player: any) => ({
        email: player.email || '',
        phone: player.phone || '',
        ign: player.ign || player.pubgIgn || '',
        uid: player.uid || player.pubgUid || '',
        mugshotName: player.mugshotName,
      }));
      return {
        id: team.id,
        teamName: team.teamName || team.name || 'Registered Team',
        mode: inferTeamModeLabel(team.mode, players),
        captainIgn: team.captainIgn || players[0]?.ign || 'Team Captain',
        captainUserId: team.captainUserId || null,
        teamLeaderEmail: team.teamLeaderEmail ? String(team.teamLeaderEmail).trim().toLowerCase() : null,
        players,
        logoName: team.logoName || (typeof team.teamLogo === 'string' ? team.teamLogo : undefined),
      };
    });

    const userEmail = String(user?.email || '').trim().toLowerCase();
    const userId = String(user?.id || '').trim();
    const userUsername = String(user?.username || '').trim().toLowerCase();

    const isUserTeam = (team: typeof mappedTeams[0]): boolean => {
      // Match by team leader email metadata
      if (userEmail && team.teamLeaderEmail && userEmail === team.teamLeaderEmail) return true;
      // Match by captain user ID stored in raw API data
      const rawTeam = arenaTeams.find((t: any) => t.id === team.id);
      if (userId && rawTeam) {
        const captainId = String((rawTeam as any).captainUserId || (rawTeam as any).captain_user_id || '').trim();
        if (captainId && captainId === userId) return true;
      }
      // Match by player email (if user has email set)
      if (userEmail && team.players.some((p: any) => String(p.email || '').trim().toLowerCase() === userEmail)) return true;
      // Match by captain IGN vs username as fallback
      if (userUsername && team.captainIgn && team.captainIgn.toLowerCase() === userUsername) return true;
      return false;
    };

    const userTeams = mappedTeams.filter(isUserTeam);
    const hasCurrentUserTeam = userTeams.length > 0;

    // Restore registered teams from DB so they survive page reloads
    if (userTeams.length > 0) {
      setRegisteredPubgTeams((prev) => {
        // Merge: keep any locally-added teams that aren't in DB yet, add DB teams
        const dbIds = new Set(userTeams.map((t: any) => t.id));
        const localOnly = prev.filter((t) => !dbIds.has(t.id));
        return [...userTeams, ...localOnly];
      });

      // Pre-fill registration form with saved data so user sees their details on reload
      const savedTeam = userTeams[0];
      if (savedTeam) {
        // Team name
        if (savedTeam.teamName) {
          setTournamentTeamName(savedTeam.teamName);
        }
        // Team logo
        if (savedTeam.logoName) {
          setTournamentTeamLogoName(savedTeam.logoName);
        }
        // Roster players — get from raw API registration metadata (has real player data)
        const rawTeam = arenaTeams.find((t: any) => t.id === savedTeam.id);
        const rawReg = (rawTeam as any)?.registration;
        const savedPlayers: any[] = rawReg?.metadata?.players || rawReg?.metadata?.players || [];

        if (savedPlayers.length > 0) {
          const filledRoster = Array.from({ length: 4 }, (_, i) => {
            const p = savedPlayers[i];
            if (p) {
              return {
                email: p.email || p.pubgEmail || '',
                phone: p.phone || '',
                ign: p.ign || p.pubgIgn || '',
                uid: p.uid || p.pubgUid || '',
                mugshotName: p.mugshotName || '',
              };
            }
            // For missing squad members, pre-fill captain info in slot 0
            return { email: '', phone: '', ign: '', uid: '', mugshotName: '' };
          });
          // Slot 0 (captain): always use verified profile email/phone
          const profileEmail = String(user?.email || '').trim().toLowerCase();
          const profilePhone = String((user as any)?.phone || '').trim();
          if (profileEmail) filledRoster[0].email = profileEmail;
          if (profilePhone) filledRoster[0].phone = profilePhone;
          setTournamentRoster(filledRoster);
        } else {
          // No saved players — at minimum pre-fill captain slot from profile
          setTournamentRoster((prev) => prev.map((p, i) => {
            if (i !== 0) return p;
            const profileEmail = String(user?.email || '').trim().toLowerCase();
            const profilePhone = String((user as any)?.phone || '').trim();
            const pubgIgm = (user as any)?.gameAccounts?.pubg?.ign || '';
            const pubgUid = (user as any)?.gameAccounts?.pubg?.uid || '';
            return {
              ...p,
              email: profileEmail || p.email,
              phone: profilePhone || p.phone,
              ign: pubgIgm || p.ign,
              uid: pubgUid || p.uid,
            };
          }));
        }
      }
    } else {
      // Not yet registered — pre-fill from lastTeamRoster saved in profile, then captain slot from profile
      setTournamentRoster((prev) => {
        const lastRoster: any[] = (user as any)?.metadata?.lastTeamRoster?.players || [];
        const profileEmail = String(user?.email || '').trim().toLowerCase();
        const profilePhone = String((user as any)?.phone || '').trim();
        const pubgIgn = (user as any)?.gameAccounts?.pubg?.ign || '';
        const pubgUid = (user as any)?.gameAccounts?.pubg?.uid || '';

        return prev.map((p, i) => {
          const saved = lastRoster[i];
          if (i === 0) {
            // Captain slot: always use verified profile email/phone, IGN/UID from profile or last roster
            return {
              ...p,
              email: profileEmail || p.email,
              phone: profilePhone || p.phone,
              ign: pubgIgn || saved?.ign || p.ign,
              uid: pubgUid || saved?.uid || p.uid,
              mugshotName: saved?.mugshotName || p.mugshotName || '',
            };
          }
          // Other players: restore from last roster
          if (saved) {
            return {
              email: saved.email || '',
              phone: saved.phone || '',
              ign: saved.ign || '',
              uid: saved.uid || '',
              mugshotName: saved.mugshotName || '',
            };
          }
          return p;
        });
      });
      // Also restore team name and logo from last roster
      const lastRoster = (user as any)?.metadata?.lastTeamRoster;
      if (lastRoster?.teamName) setTournamentTeamName(lastRoster.teamName);
      if (lastRoster?.logoName) setTournamentTeamLogoName(lastRoster.logoName);
    }

    setTournamentRegistered(hasCurrentUserTeam);
    setIsTournamentPaymentLocked(hasCurrentUserTeam);
  }, [arenaTeamsData, arenaTeams, user?.email, user?.id, user?.username, activeArenaModeLabel]);

  const fetchArenaLobbyAccess = async (leaderEmail: string) => {
    if (!leaderEmail || !activeArenaTournamentId) return;
    setIsArenaLobbyLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${activeArenaTournamentId}/lobby-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamLeaderEmail: leaderEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Unable to unlock lobby');
      }
      setArenaLobbyData(data);
      setLobbyAccessGranted(true);
    } catch (error: any) {
      console.error('Auto lobby unlock failed:', error);
    } finally {
      setIsArenaLobbyLoading(false);
    }
  };

  useEffect(() => {
    const userEmail = String(user?.email || '').trim().toLowerCase();
    if (!tournamentRegistered || !userEmail || lobbyAccessGranted || isArenaLobbyLoading) {
      return;
    }

    fetchArenaLobbyAccess(userEmail);
  }, [tournamentRegistered, user?.email, lobbyAccessGranted, isArenaLobbyLoading, activeArenaTournamentId]);

  // Success modal state for behavior-driven animations
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState<{ packageName: string; tokensEarned: number } | null>(null);
  
  // Platform statistics state
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [lifetimeActiveUsers, setLifetimeActiveUsers] = useState<number | null>(null);
  const [totalPlatformTransactions, setTotalPlatformTransactions] = useState<number | null>(null);

  // Feedback state
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Daily login reward state
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);

  // Daily reward status query
  const { data: dailyRewardStatus, refetch: refetchDailyStatus } = useQuery<{
    canClaim: boolean;
    hoursLeft: number;
    nextClaimAt: string | null;
    lastClaimedAt: string | null;
    dailyRewardAmount: number;
  }>({
    queryKey: ['daily-reward-status'],
    queryFn: async () => {
      const res = await fetch('/api/token/claim/daily/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return { canClaim: true, hoursLeft: 0, nextClaimAt: null, lastClaimedAt: null, dailyRewardAmount: 10 };
      return res.json();
    },
    enabled: !!token && isAuthenticated,
    refetchInterval: false,
  });

  const handleClaimDailyReward = async () => {
    if (!token || isClaimingDaily) return;
    setIsClaimingDaily(true);
    try {
      const res = await fetch('/api/token/claim/daily', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        try {
          initializeAudio();
          soundActions.playReward();
        } catch (e) {
          console.warn('Failed to play sound:', e);
        }
        setUserTokens(data.tokens);
        await refreshUser();
        refetchDailyStatus();
        toast({
          title: 'Daily Reward Claimed',
          description: `+${data.tokensAwarded} ${data.tokenName || 'B4UT'} added to your balance`,
          variant: 'success',
        });
      } else {
        try {
          initializeAudio();
          soundActions.playCancel();
        } catch (e) {
          console.warn('Failed to play sound:', e);
        }
        toast({
          title: 'Already Claimed Today',
          description: data.message || 'Come back tomorrow for your next reward',
          variant: 'info',
        });
        refetchDailyStatus();
      }
    } catch {
      try {
        initializeAudio();
        soundActions.playError();
      } catch (e) {
        console.warn('Failed to play sound:', e);
      }
      toast({ title: 'Claim Failed', description: 'Something went wrong. Please try again later.', variant: 'destructive' });
    } finally {
      setIsClaimingDaily(false);
    }
  };

  // Redirect to landing if not authenticated (after loading is complete)
  useEffect(() => {
    if (!isAuthLoading && (!isAuthenticated || user === null || user === undefined)) {
      setLocation('/');
    }
  }, [isAuthLoading, isAuthenticated, user, setLocation]);

  // Remove the conditional render that causes blank screen
  // The redirect is handled by handleLogout function

  // Load user tokens when component mounts
  useEffect(() => {
    if (isAuthenticated && user !== null && user !== undefined && token !== null) {
      // Set tokens from user data - properly handle 0 token count
      setUserTokens(typeof user.tokens === 'number' ? user.tokens : 0);
      setLastTokenUpdate(Date.now());
    }
  }, [isAuthenticated, user, token]);

  // Fetch wallet balance when component mounts and when token changes
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!isAuthenticated || !token) return;
      // Skip fetching if user has no wallet address (no purchases yet)
      if (!user?.walletAddress) {
        setWalletBalance(null);
        return;
      }
      
      setIsFetchingBalance(true);
      try {
        console.log('Fetching wallet balance...');
        const response = await fetch('/api/user/balance', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Wallet balance response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Wallet balance response data:', data);
          // Only set wallet balance if we actually got a balance from the API
          // This prevents user tokens from being displayed as wallet balance
          if (data.balance !== null && data.balance !== undefined) {
            setWalletBalance(data.balance);
          } else {
            setWalletBalance(null);
          }
        } else if (response.status === 404) {
          // No wallet address found, which is okay
          console.log('No wallet address found for user');
          setWalletBalance(null);
        } else {
          console.error('Failed to fetch wallet balance:', response.status, response.statusText);
          setWalletBalance(null);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        setWalletBalance(null);
      } finally {
        setIsFetchingBalance(false);
      }
    };

    fetchWalletBalance();
  }, [isAuthenticated, token, user?.walletAddress]);

  // Update local token state when user data changes, but only if it's a fresh update
  useEffect(() => {
    if (user) {
      // Only update if this is a fresh user data update (not from our own token update)
      const now = Date.now();
      if (now - lastTokenUpdate > 1000) { // 1 second threshold
        setUserTokens(user.tokens || 0);
      }
    }
  }, [user, lastTokenUpdate]);

  // User-friendly interstitial ad at purchase milestones (every 5 purchases)
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const handlePurchaseMilestone = async () => {
      if (!adNetworkSupported || !isAuthenticated) {
        return;
      }

      // Avoid recording a purchase milestone when no new purchase has happened.
      if (purchaseCount === 0) {
        return;
      }

      // Record the purchase and check if milestone reached
      const isMilestone = adSessionManager.recordPurchase();
      
      if (!isMilestone) {
        return; // Not a milestone yet
      }

      // Check if we can show interstitial (respects frequency caps)
      if (!adSessionManager.canShowInterstitial()) {
        const message = adSessionManager.getAvailabilityMessage('interstitial');
        console.log('Skipping interstitial ad:', message);
        return;
      }

      // Show user-friendly notification before displaying ad
      try {
        console.log(`Purchase milestone reached! Showing interstitial ad...`);
        
        // Optional: Show a brief toast that an ad is coming
        toast({
          title: 'Milestone Reached',
          description: `${adSessionManager.getSessionStats().totalPurchases} purchases completed. Loading a quick ad...`,
          variant: 'success',
          duration: 3000,
        });

        const adResponse = await showInterstitialAd();
        
        if (adResponse.result === 'AD_CLOSED') {
          adSessionManager.recordInterstitialShown();
        }
        
        // Handle different response types with user-friendly messages
        switch (adResponse.result) {
          case 'AD_CLOSED':
            console.log('✅ Interstitial ad completed');
            break;
          case 'AD_DISPLAY_ERROR':
            toast({
              title: 'Ad Display Issue',
              description: 'The ad could not be displayed. Your milestone progress is saved.',
              variant: 'warning',
            });
            break;
          case 'AD_NETWORK_ERROR':
            toast({
              title: 'Connection Issue',
              description: 'Network error loading ad. Your milestone reward is still valid.',
              variant: 'warning',
            });
            break;
          case 'AD_NOT_AVAILABLE':
            toast({
              title: 'Ad Unavailable',
              description: 'No ads available right now. Your progress is saved.',
              variant: 'info',
            });
            break;
        }
      } catch (error) {
        console.error('Error showing interstitial ad:', error);
        // Don't show error to user - ad failure shouldn't ruin their experience
      }
    };

    handlePurchaseMilestone();
  }, [purchaseCount, adNetworkSupported, showInterstitialAd, isAuthenticated, toast]);

  // Refresh user data when referral dialog opens to ensure referral code is available
  useEffect(() => {
  if (isReferralDialogOpen && isAuthenticated && user !== null && user !== undefined && (user.referralCode === null || user.referralCode === undefined || user.referralCode === '')) {
      // Only refresh if we don't have a referral code
      refreshUser().then((updatedUser) => {
        if (updatedUser !== null && updatedUser !== undefined && (updatedUser.referralCode === null || updatedUser.referralCode === undefined || updatedUser.referralCode === '')) {
          // If still no referral code after refresh, show a message
          toast({
            title: 'Referral Code Pending',
            description: 'Your referral code is being generated. Please try again shortly.',
            variant: 'info',
          });
        }
      }).catch((error) => {
        console.error('Error refreshing user for referral code:', error);
        toast({
          title: 'Refresh Failed',
          description: 'Could not refresh profile data. Please try again.',
          variant: 'destructive',
        });
      });
    }
  }, [isReferralDialogOpen, isAuthenticated, user, refreshUser, toast]);

  // Fetch platform statistics
  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const response = await fetch('/api/analytics');
        if (response.ok) {
          const data = await response.json();
          setTotalUsers(typeof data.totalUsers === 'number' ? data.totalUsers : null);
          setLifetimeActiveUsers(typeof data.lifetimeLoggedInUsers === 'number' ? data.lifetimeLoggedInUsers : null);
          setTotalPlatformTransactions(typeof data.totalTransactions === 'number' ? data.totalTransactions : null);
        } else {
          console.error('Failed to fetch platform statistics');
        }
      } catch (error) {
        console.error('Error fetching platform statistics:', error);
      }
    };

    fetchPlatformStats();
  }, []);

  const { data: packages, isLoading: packagesLoading, error: packagesError, refetch: refetchpackages } = useQuery<Package[]>({
    queryKey: ['packages'],
    initialData: () => {
      // Stale-While-Revalidate: load immediately from Pi device storage to reduce backend load
      return piStorage.getCachedData<Package[]>('packages', 10 * 60 * 1000) || undefined;
    },
    queryFn: async () => {
      console.log('Fetching packages from /api/packages');
      const response = await fetch('/api/packages');
      if (!response.ok) {
        console.error('Failed to fetch packages:', response.status, response.statusText);
        throw new Error('Failed to fetch packages');
      }
      const data = await response.json();
      console.log('Received packages data:', data.length, 'packages');
      // Update non-critical catalog cache in device storage
      piStorage.setCachedData('packages', data, 10 * 60 * 1000);
      return data;
    },
  });

  // Feedback queries and mutations
  const { data: feedbackData, isLoading: feedbacksLoading, refetch: refetchFeedbacks } = useQuery<{ feedbacks: FeedbackEntry[] }>({
    queryKey: ['/api/feedback'],
    enabled: isAuthenticated,
  });

  const feedbacks = feedbackData?.feedbacks || [];

  const feedbackAverageRating = useMemo(() => {
    if (!feedbacks.length) return 0;
    return feedbacks.reduce((sum, item) => sum + item.rating, 0) / feedbacks.length;
  }, [feedbacks]);

  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: feedbackRating,
          comment: feedbackComment
        })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to submit feedback');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Backend awards 10 B4UT on feedback — show it clearly
      const tokensAwarded = data?.tokensAwarded ?? 10;
      toast({
        title: 'Feedback Submitted',
        description: `Thank you for your review. +${tokensAwarded} B4UT added to your balance.`,
        variant: 'success',
      });
      setFeedbackComment('');
      setFeedbackRating(0);
      setShowFeedbackForm(false);
      refetchFeedbacks();
      // Refresh token balance so the wallet shows the new amount
      refreshUser().then((freshUser) => {
        if (freshUser) setUserTokens(freshUser.tokens || 0);
      }).catch(() => {});
    },
    onError: (error) => {
      toast({
        title: 'Submission Failed',
        description: (error as Error).message || 'Could not submit feedback. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handlepackageselect = (packageData: Package) => {
    setSelectedPackage(packageData);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      console.log('Initiating purchase...');
      const response = await fetch('/api/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          amount: selectedPackage.piPrice || 0,
          currency: 'π',
        }),
      });

      console.log('Purchase response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Purchase response data:', data);
        
        // Play purchase sound
        try {
          initializeAudio();
          soundActions.playPurchase();
        } catch (e) {
          console.warn('Failed to play sound:', e);
        }

        // Set success data and show animated modal
        setPurchaseSuccessData({
          packageName: selectedPackage.name || 'Package',
          tokensEarned: selectedPackage.piPrice || 0,
        });
        setShowPurchaseSuccess(true);
        
        setPurchaseCount(purchaseCount + 1);
        setUserTokens(userTokens + (selectedPackage.piPrice || 0));
        setLastTokenUpdate(Date.now());
        setIsPurchaseModalOpen(false);
      } else {
        console.error('Failed to complete purchase:', response.status, response.statusText);
        toast({
          title: 'Purchase Failed',
          description: 'Could not complete the purchase. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error purchasing package:', error);
      toast({
        title: 'Purchase Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyReferralCode = () => {
    if (user && user.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: 'Copied to Clipboard',
        description: 'Your referral code has been copied.',
        variant: 'success',
      });
    }
  };

  const handleShareReferralCode = () => {
    if (user && user.referralCode) {
      const referralCode = user.referralCode;
      navigator.share({
        text: `Join me on Pi Network and earn tokens with my referral code: ${referralCode}`,
      }).then(() => {
        toast({
          title: 'Referral Shared',
          description: 'Your referral code has been shared successfully.',
          variant: 'success',
        });
      }).catch((error) => {
        console.error('Error sharing referral code:', error);
        toast({
          title: 'Share Failed',
          description: 'Could not share referral code. Please try again.',
          variant: 'destructive',
        });
      });
    }
  };

  // NOTE: The broken 'handleTrackTransaction' function was removed from here.
  // The correct logic is in the 'handleTrackOrder' function below.

  const persistedUserId = (() => {
    try {
      const raw = piStorage.getItem('pi_user');
      if (!raw) return undefined;
      return JSON.parse(raw)?.id as string | undefined;
    } catch {
      return undefined;
    }
  })();
  const currentUserId = user?.id || persistedUserId || 'anonymous';
  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useQuery<Transaction[]>({
    queryKey: ['transactions', currentUserId, transactionFilter, transactionSort],
    queryFn: async () => {
      console.log('Fetching transactions from /api/transactions for user:', currentUserId);
      
      // Use token from context instead of localStorage
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      // Add query parameters for filtering and sorting
      const params = new URLSearchParams();
      if (transactionFilter !== 'all') {
        params.append('status', transactionFilter);
      }
      params.append('sort', transactionSort);
      if (currentUserId && currentUserId !== 'anonymous') {
        params.append('userId', currentUserId);
      }
      
      const url = `/api/transactions?${params.toString()}`;
      
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch transactions:', response.status, response.statusText, errorData);
        throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}. ${errorData.message || ''}`);
      }
      const data = await response.json();
      console.log('Received transactions data:', data.length, 'transactions');
      console.log('Transaction data:', JSON.stringify(data, null, 2));
      return data;
    },
    enabled: !!token && !!currentUserId && currentUserId !== 'anonymous',
    retry: 2, // Retry up to 2 times on failure
    retryDelay: 1000, // Wait 1 second between retries
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  const activeTournamentSubscription = useMemo(() => {
    return transactions?.
      filter((transaction) => transaction.metadata?.type === 'subscription' && ['completed', 'approved'].includes(transaction.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null;
  }, [transactions]);

  // Remove the conditional render that causes blank screen
  // The redirect is handled by handleLogout function and useEffect

  const handleClose = () => {
    setLocation('#/');
  };

  // Helper function to normalize game names for case-insensitive comparison
  const normalizeGameName = (gameName: string) => 
    gameName?.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') || '';
  const normalizePackageName = (packageName: string) =>
    packageName?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
  const isPubgGame = (gameName: string) => {
    const normalized = normalizeGameName(gameName);
    return normalized.includes('PUBG') && !normalized.includes('KR') && !normalized.includes('SUBSCRIPTION');
  };
  const isPubgKrGame = (gameName: string) => {
    const normalized = normalizeGameName(gameName);
    return normalized.includes('PUBG') && normalized.includes('KR');
  };
  
  // Filter packages by game type with normalized comparison
  const pubgpackages = packages?.filter((pkg: Package) => isPubgGame(pkg.game)) || [];
  const pubgkrpackages = packages?.filter((pkg: Package) => isPubgKrGame(pkg.game)) || [];
  const mlbbpackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'MLBB') || [];
  const cocpackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'COC') || [];
  const robuxpackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'ROBUX') || [];
  const newstatepackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'NEWSTATE') || [];
  const freefirepackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'FREEFIRE') || [];
  
  // Social Media Boosting Services
  const tiktokCoinspackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'TIKTOK_COINS') || [];
  const tiktokFollowerspackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'TIKTOK_FOLLOWERS') || [];
  const tiktokViewspackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'TIKTOK_VIEWS') || [];
  const youtubeSubspackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'YOUTUBE_SUBS') || [];
  const youtubeWatchTimepackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'YOUTUBE_WATCHTIME') || [];
  const facebookpackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'FACEBOOK') || [];
  const instagrampackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'INSTAGRAM') || [];

  const shouldHideMonthlySubscriptionPackage = (pkg: Package) => {
    const packageText = `${pkg.name || ''} ${(pkg as any).description || ''}`.toLowerCase();
    return /\b(1 month|one month|monthly)\b/.test(packageText);
  };

  const netflixpackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'NETFLIX' && !shouldHideMonthlySubscriptionPackage(pkg)) || [];
  const canvapackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'CANVA' && !shouldHideMonthlySubscriptionPackage(pkg)) || [];
  const pubgSubscriptionpackages = packages?.filter((pkg: Package) => normalizeGameName(pkg.game) === 'PUBG_SUBSCRIPTION') || [];
  
  // Fallback COC packages in case of filtering issues
  const fallbackCocpackages = packages?.filter((pkg: Package) => 
    pkg.game?.toUpperCase().includes('COC') || 
    pkg.game?.toLowerCase().includes('clash')
  ) || [];
  
  // Use fallback if main filter returns empty but we know COC packages exist
  const displayCocpackages = cocpackages.length > 0 ? cocpackages : fallbackCocpackages;

  const shopCategoryOptions = [
    {
      key: 'tokens' as const,
      title: 'In-Game Tokens',
      description: 'Curated game currency bundles for seamless power-ups and instant progression.',
      icon: 'fas fa-gamepad',
      accent: 'from-blue-500 to-cyan-500',
    },
    {
      key: 'services' as const,
      title: 'Social Media Services',
      description: 'Professional growth packages for TikTok, YouTube, Instagram and more.',
      icon: 'fas fa-share-alt',
      accent: 'from-pink-500 to-purple-500',
    },
  ];

  const shopTitleOptions = useMemo(() => {
    if (shopCategory === 'tokens') {
      return [
        { key: 'pubg', title: 'PUBG Mobile', subtitle: 'UC packages', iconSrc: GAME_LOGOS.PUBG, count: pubgpackages.length },
        { key: 'pubgkr', title: 'PUBG Mobile KR', subtitle: 'UC packages', iconSrc: GAME_LOGOS.PUBGKR, count: pubgkrpackages.length },
        { key: 'mlbb', title: 'Mobile Legends', subtitle: 'Diamond packages', iconSrc: GAME_LOGOS.MLBB, count: mlbbpackages.length },
        { key: 'coc', title: 'Clash of Clans', subtitle: 'Gold Pass packages', iconSrc: GAME_LOGOS.COC, count: displayCocpackages.length },
        { key: 'robux', title: 'Roblox', subtitle: 'Robux packages', iconSrc: GAME_LOGOS.ROBUX, count: robuxpackages.length },
        { key: 'newstate', title: 'NEW STATE', subtitle: 'NC packages', iconSrc: GAME_LOGOS.NEWSTATE, count: newstatepackages.length },
        { key: 'freefire', title: 'FREE FIRE', subtitle: 'Diamond packages', iconSrc: GAME_LOGOS.FREEFIRE, count: freefirepackages.length },
      ];
    }

    if (shopCategory === 'services') {
      return [
        { key: 'tiktok', title: 'TikTok', subtitle: 'Coins, Followers, Views', iconClass: 'fab fa-tiktok', count: tiktokCoinspackages.length + tiktokFollowerspackages.length + tiktokViewspackages.length },
        { key: 'youtube', title: 'YouTube', subtitle: 'Subscribers & Watch Time', iconClass: 'fab fa-youtube', count: youtubeSubspackages.length + youtubeWatchTimepackages.length },
        { key: 'facebook', title: 'Facebook', subtitle: 'Likes & Followers', iconClass: 'fab fa-facebook', count: facebookpackages.length },
        { key: 'instagram', title: 'Instagram', subtitle: 'Followers & Engagement', iconClass: 'fab fa-instagram', count: instagrampackages.length },
        { key: 'subscriptions', title: 'Subscriptions', subtitle: 'Netflix, Canva & PUBG Passes', iconClass: 'fas fa-star', count: netflixpackages.length + canvapackages.length + pubgSubscriptionpackages.length },
      ];
    }

    return [];
  }, [shopCategory, pubgpackages, pubgkrpackages, mlbbpackages, displayCocpackages, robuxpackages, newstatepackages, freefirepackages, tiktokCoinspackages, tiktokFollowerspackages, tiktokViewspackages, youtubeSubspackages, youtubeWatchTimepackages, facebookpackages, instagrampackages, netflixpackages, canvapackages, pubgSubscriptionpackages]);

  const shoppackagesections = useMemo(() => {
    if (!shopCategory || !shopSelection) return [];

    if (shopCategory === 'tokens') {
      switch (shopSelection) {
        case 'pubg': return [{ title: 'PUBG Mobile packages', packages: pubgpackages }];
        case 'pubgkr': return [{ title: 'PUBG Mobile KR packages', packages: pubgkrpackages }];
        case 'mlbb': return [{ title: 'Mobile Legends packages', packages: mlbbpackages }];
        case 'coc': return [{ title: 'Clash of Clans packages', packages: displayCocpackages }];
        case 'robux': return [{ title: 'Roblox packages', packages: robuxpackages }];
        case 'newstate': return [{ title: 'NEW STATE packages', packages: newstatepackages }];
        case 'freefire': return [{ title: 'FREE FIRE packages', packages: freefirepackages }];
      }
    }

    if (shopCategory === 'services') {
      switch (shopSelection) {
        case 'tiktok':
          return [
            { title: 'TikTok Coins', packages: tiktokCoinspackages },
            { title: 'TikTok Followers', packages: tiktokFollowerspackages },
            { title: 'TikTok Views', packages: tiktokViewspackages },
          ];
        case 'youtube':
          return [
            { title: 'YouTube Subscribers', packages: youtubeSubspackages },
            { title: 'YouTube Watch Time', packages: youtubeWatchTimepackages },
          ];
        case 'facebook':
          return [{ title: 'Facebook Likes & Followers', packages: facebookpackages }];
        case 'instagram':
          return [{ title: 'Instagram Followers', packages: instagrampackages }];
        case 'subscriptions':
          return [
            { title: 'Netflix Premium', packages: netflixpackages },
            { title: 'Canva Pro Lifetime', packages: canvapackages },
            { title: 'PUBG Tournament Subscriptions', packages: pubgSubscriptionpackages },
          ];
      }
    }

    return [];
  }, [shopCategory, shopSelection, pubgpackages, pubgkrpackages, mlbbpackages, displayCocpackages, robuxpackages, newstatepackages, freefirepackages, tiktokCoinspackages, tiktokFollowerspackages, tiktokViewspackages, youtubeSubspackages, youtubeWatchTimepackages, facebookpackages, instagrampackages, netflixpackages, canvapackages, pubgSubscriptionpackages]);

  const tournamentEvents = [
    {
      id: 'pubg-squad-clash',
      title: activeArenaTournament?.title || 'PUBG Mobile Arena',
      game: 'PUBG Mobile',
      format: `${activeArenaModeLabel} (${activeArenaTeamSize} ${activeArenaTeamSize === 1 ? 'Player' : 'Players'})`,
      prize: `${tournamentPrizePool.toFixed(2)} Pi Prize Pool`,
      entry: `${tournamentEntryFee} Pi entry fee`,
      startsAt: activeArenaTournament?.startsAt ? new Date(activeArenaTournament.startsAt).toLocaleString() : 'Live now',
      startsAtRaw: activeArenaTournament?.startsAt || null,
      registrationClosesAtRaw: activeArenaTournament?.registrationClosesAt || null,
      status: activeArenaTournament?.status || 'Live',
      slots: 'Open slots',
      lobby: 'Secret room access',
      leaderboard: 'Kills, placement, MVP',
      rules: 'Mobile-only TPP battle royale with kill and placement points',
      iconSrc: GAME_LOGOS.PUBG,
      accent: 'from-cyan-500 to-blue-600',
    },
  ];

  const handleTournamentAction = (eventTitle: string, action: string) => {
    const activeGame = String(activeArenaTournament?.game || '').toLowerCase();
    const eventName = String(eventTitle || '').toLowerCase();
    if (eventName.includes('pubg') || activeGame.includes('pubg')) {
      // If tournament is in progress and user clicks {t('participate_now')}, open to leaderboard
      const isRegistrationOpen = isArenaRegistrationOpen;
      const targetPanel = (action === 'register' && !isRegistrationOpen) ? 'leaderboard' : action;
      setActiveTournamentPanel(targetPanel as 'register' | 'teams' | 'rules' | 'lobby' | 'leaderboard');
      return;
    }

    toast({
      title: "Tournament section preparing",
      description: `${eventTitle} registration is being prepared for Pi Mainnet users.`,
    });
  };

  const updateTournamentRosterPlayer = (index: number, field: keyof PubgRosterPlayer, value: string) => {
    setTournamentRoster((players) => players.map((player, playerIndex) => (
      playerIndex === index ? { ...player, [field]: value } : player
    )));
  };

  const completeTournamentRegistration = async (requiredPlayers: PubgRosterPlayer[], paymentId: string, txid: string) => {
    try {
      console.log('🎮 Starting tournament registration completion...');
      
      // Save / upsert tournament registration to database
      if (user?.id && token) {
        const registrationPayload = {
          userId: user.id,
          teamName: tournamentTeamName.trim(),
          players: requiredPlayers.map(player => ({
            email: player.email,
            phone: player.phone,
            pubgIgn: player.ign,
            pubgUid: player.uid,
            mugshotName: player.mugshotName,
          })),
          mode: tournamentMode,
          tournamentId: activeArenaTournamentId,
          paymentId,
          txid,
          registeredAt: new Date().toISOString(),
        };

        const saveResponse = await fetch('/api/tournament-registration/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(registrationPayload),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json();
          // 409 means already registered (duplicate key) — that's fine, payment completed
          if (saveResponse.status !== 409) {
            throw new Error(`Failed to save registration: ${errorData.message || saveResponse.statusText}`);
          }
          console.log('ℹ️ Registration already exists (409) — treating as success');
        } else {
          const result = await saveResponse.json();
          console.log('✅ Tournament registration saved:', result);
        }

        // Save captain's PUBG IGN/UID to profile game_accounts + full roster to metadata
        // so future tournaments pre-fill automatically
        try {
          const captain = requiredPlayers[0];
          const profileUpdate: any = {
            metadata: {
              lastTeamRoster: {
                teamName: tournamentTeamName.trim(),
                logoName: tournamentTeamLogoName || '',
                mode: tournamentMode.toLowerCase(),
                updatedAt: new Date().toISOString(),
                players: requiredPlayers.map((p, i) => ({
                  slot: i,
                  ign: p.ign,
                  uid: p.uid,
                  email: p.email,
                  phone: p.phone,
                  mugshotName: p.mugshotName || '',
                  isCaptain: i === 0,
                })),
              },
            },
          };
          // Update PUBG IGN/UID in gameAccounts from captain's details
          if (captain.ign || captain.uid) {
            profileUpdate.gameAccounts = {
              ...((user as any)?.gameAccounts || {}),
              pubg: {
                ign: captain.ign || (user as any)?.gameAccounts?.pubg?.ign || '',
                uid: captain.uid || (user as any)?.gameAccounts?.pubg?.uid || '',
              },
            };
          }
          await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(profileUpdate),
          });
          // Refresh user so future pre-fills use updated data
          if (refreshUser) await refreshUser();
          console.log('✅ Profile updated with team roster for future tournaments');
        } catch (profileErr) {
          console.warn('Non-fatal: could not save roster to profile:', profileErr);
        }
      }

      const captainEmail = requiredPlayers[0]?.email?.trim().toLowerCase();
      const registeredTeam = {
        id: `team-${Date.now()}`,
        teamName: tournamentTeamName.trim(),
        mode: tournamentMode,
        captainIgn: requiredPlayers[0].ign,
        players: requiredPlayers,
        logoName: tournamentTeamLogoName,
      };

      setRegisteredPubgTeams((teams) => [registeredTeam, ...teams]);
      setTournamentIgn(requiredPlayers[0].ign);
      setTournamentUid(requiredPlayers[0].uid);
      setTournamentRegistered(true);
      piStorage.clearFormDraft('pubg_registration');
      setIsTournamentPaymentProcessing(false);

      // Refetch team data + transactions
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${activeArenaTournamentId}/teams`, 'pubg-arena-teams'] }),
        queryClient.refetchQueries({ queryKey: [`/api/tournaments/${activeArenaTournamentId}/teams`] }),
      ]);

      // Auto-fetch lobby access for the captain so the UI unlocks immediately
      if (captainEmail && activeArenaTournamentId) {
        try {
          await fetchArenaLobbyAccess(captainEmail);
        } catch (_) {
          // Non-fatal — user can still access via Lobby tab
        }
      }

      toast({
        title: '✅ Registration Confirmed & Payment Complete',
        description: `${registeredTeam.teamName} registered in ${tournamentMode} mode. ${tournamentEntryFee} π entry paid. Go to Lobby tab to see room details.`,
      });
    } catch (error: any) {
      console.error('❌ Tournament registration completion error:', error);
      setIsTournamentPaymentProcessing(false);
      toast({
        title: "⚠️ Registration Issue",
        description: "Payment completed but registration saving failed. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleTournamentRegistrationSubmit = () => {
    const requiredPlayers = tournamentMode === 'Solo'
      ? tournamentRoster.slice(0, 1)
      : tournamentMode === 'Duo'
        ? tournamentRoster.slice(0, 2)
        : tournamentRoster.slice(0, 4);
    const hasMissingPlayerDetails = requiredPlayers.some((player) => (
      !player.email.trim() || !player.phone.trim() || !player.ign.trim() || !player.uid.trim()
    ));

    if (hasMissingPlayerDetails) {
      toast({
        title: "Player details required",
        description: tournamentMode === 'Solo'
          ? "Enter email, phone, PUBG IGN, and UID for the solo player."
          : `Enter email, phone, PUBG IGN, and UID for all ${requiredPlayers.length} required players.`,
        variant: "destructive",
      });
      return;
    }

    if (!tournamentTeamName.trim()) {
      toast({
        title: "Team name required",
        description: `Enter a team name for ${tournamentMode} registration.`,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in with Pi Network before registering.",
        variant: "destructive",
      });
      return;
    }

    if (!user.isProfileVerified) {
      toast({
        title: "Profile verification required",
        description: "Please complete and verify your profile before registering for a tournament.",
        variant: "destructive",
      });
      return;
    }

    // Captain email and phone must match profile
    const captainInForm = requiredPlayers[0];
    const profileEmail = String(user.email || '').trim().toLowerCase();
    const profilePhone = String((user as any).phone || '').trim();
    if (captainInForm.email.trim().toLowerCase() !== profileEmail) {
      toast({
        title: "Email mismatch",
        description: `Your captain email must match the email on your verified profile (${profileEmail}).`,
        variant: "destructive",
      });
      return;
    }
    if (profilePhone && captainInForm.phone.trim() !== profilePhone) {
      toast({
        title: "Phone number mismatch",
        description: "Your captain phone number must match the phone number on your verified profile.",
        variant: "destructive",
      });
      return;
    }

    if (tournamentRegistered || isTournamentPaymentLocked) {
      toast({
        title: "Already Registered",
        description: "Your PUBG entry fee has already been processed. Duplicate payments are disabled.",
      });
      return;
    }

    setIsTournamentPaymentProcessing(true);

    const paymentData = {
      amount: tournamentEntryFee,
      memo: `PUBG Mobile Tournament Entry - ${tournamentTeamName.trim()}`,
      paymentType: 'TOURNAMENT_ENTRY' as const,
      metadata: {
        type: 'tournament_entry' as const,
        userId: user.id,
        tournamentId: activeArenaTournamentId,
        tournamentType: 'pubg_mobile_entry',
        gameAccount: {
          tournament: 'PUBG Mobile Arena',
          mode: tournamentMode,
          teamName: tournamentTeamName.trim(),
          captainIgn: requiredPlayers[0].ign,
          captainUid: requiredPlayers[0].uid,
          players: requiredPlayers,
          teamLogoName: tournamentTeamLogoName,
          entryFeePi: tournamentEntryFee,
        },
      },
    };

    let paymentTimeout: NodeJS.Timeout;
    const paymentTimeoutPromise = new Promise<never>((_, reject) => {
      paymentTimeout = setTimeout(() => {
        reject(new Error('Payment processing timed out. Please check your Pi Network app and try again.'));
      }, 30000);
    });

    const paymentPromise = new Promise<void>((resolve, reject) => {
      createPayment(paymentData, {
        onReadyForServerApproval: async (paymentId: string) => {
          // Create a provisional registration row immediately so /api/payment/complete
          // can find it by paymentId and mark it paid — fixes the "stuck pending" bug.
          try {
            if (user?.id && token && activeArenaTournamentId) {
              await fetch('/api/tournament-registration/pre-register', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  userId: user.id,
                  tournamentId: activeArenaTournamentId,
                  paymentId,
                  mode: tournamentMode,
                  teamName: tournamentTeamName.trim(),
                  players: requiredPlayers.map(p => ({
                    email: p.email, phone: p.phone, pubgIgn: p.ign, pubgUid: p.uid,
                  })),
                }),
              });
            }
          } catch (e) {
            // Non-fatal — /save will create the row on completion
            console.warn('Pre-register failed (non-fatal):', e);
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          clearTimeout(paymentTimeout);
          await completeTournamentRegistration(requiredPlayers, paymentId, txid);
          await refreshUser();
          resolve();
        },
        onCancel: (paymentId: string) => {
          clearTimeout(paymentTimeout);
          setIsTournamentPaymentProcessing(false);
          toast({
            title: 'Tournament payment cancelled',
            description: 'Registration was not completed and no slot was reserved.',
            variant: 'destructive',
          });
          reject(new Error(`Payment cancelled: ${paymentId}`));
        },
        onError: (error: Error) => {
          clearTimeout(paymentTimeout);
          setIsTournamentPaymentProcessing(false);
          toast({
            title: 'Tournament payment failed',
            description: error.message,
            variant: 'destructive',
          });
          reject(error);
        },
      });
    });

    Promise.race([paymentPromise, paymentTimeoutPromise]).catch((error) => {
      setIsTournamentPaymentProcessing(false);
      toast({
        title: 'Tournament payment failed',
        description: error instanceof Error ? error.message : 'Payment could not be completed.',
        variant: 'destructive',
      });
    });
  };

  const handleLobbyCodeSubmit = async () => {
    const leaderEmail = lobbyLeaderCode.trim().toLowerCase();
    if (!leaderEmail) {
      toast({
        title: "Leader email required",
        description: "Enter the captain or team leader email used during registration.",
        variant: "destructive",
      });
      return;
    }

    setIsArenaLobbyLoading(true);
    try {
      const response = await fetch(`/api/tournaments/${activeArenaTournamentId}/lobby-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamLeaderEmail: leaderEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Unable to unlock lobby');
      }
      setArenaLobbyData(data);
      setLobbyAccessGranted(true);
      toast({
        title: "Lobby unlocked",
        description: "Room IDs and passwords are now visible for the verified team leader.",
      });
    } catch (error: any) {
      toast({
        title: "Lobby access denied",
        description: error.message || "No team found for this leader email.",
        variant: "destructive",
      });
    } finally {
      setIsArenaLobbyLoading(false);
    }
  };

  const handleMatchDone = (matchId: string) => {
    setCompletedMatchIds((matchIds) => Array.from(new Set([...matchIds, matchId])));
    toast({
      title: "Match completed",
      description: "Room ID and password have been removed for this match.",
    });
  };

  const handleRecoverCredentials = (matchId: string) => {
    setCompletedMatchIds((matchIds) => matchIds.filter((id) => id !== matchId));
    toast({
      title: "Credentials recovered",
      description: "Room ID and password are visible again for this match.",
    });
  };

  const computedPubgLeaderboard = useMemo(() => {
    const currentMatchType: 'TDM' | 'Classic' = activeArenaTournament?.title?.toLowerCase().includes('tdm') ? 'TDM' : 'Classic';
    const leaderboard = arenaTournamentData?.leaderboard || [];
    const teams = arenaTournamentData?.teams || arenaTeams;

    if (leaderboard.length > 0) {
      return leaderboard.map((entry: any) => {
        const team = teams.find((teamItem: any) => teamItem.id === entry.teamId) || {};
        const registration = team.registration || {};
        const metadata = (registration.metadata || {}) as any;
        const players = Array.isArray(metadata.players) ? metadata.players : [];
        const captainIgn = team.captainIgn || players[0]?.ign || 'Team Captain';

        return {
          teamId: entry.teamId,
          rank: entry.rank || 0,
          name: team.name || metadata.teamName || `Team ${String(entry.teamId || '').slice(0, 6)}`,
          teamLogo: team.teamLogo || null,
          mode: inferTeamModeLabel(team.mode, players),
          points: Number(entry.totalPoints || 0),
          kills: Number(entry.totalKills || 0),
          placement: Number(entry.wins || 0),
          wwcdCount: Number(entry.wwcdCount || 0),
          matchesPlayed: Number(entry.matchesPlayed || 0),
          mvp: captainIgn,
          prize: Number(entry.prizePi || 0) > 0 ? `${entry.prizePi} Pi` : 'Pending',
          matchType: currentMatchType,
        };
      });
    }

    return registeredPubgTeams.map((team, idx) => ({
      rank: idx + 1,
      name: team.teamName,
      teamLogo: null as string | null,
      mode: inferTeamModeLabel(team.mode, (team.players || []) as PubgRosterPlayer[]),
      points: 0,
      kills: 0,
      placement: 0,
      wwcdCount: 0,
      matchesPlayed: 0,
      mvp: team.captainIgn,
      prize: idx === 0 ? '120 Pi' : idx === 1 ? '80 Pi' : idx === 2 ? '50 Pi' : 'Pending',
      matchType: currentMatchType,
    }));
  }, [arenaTournamentData, arenaTeams, registeredPubgTeams, activeArenaModeLabel, activeArenaTournament?.title]);

  const filteredPubgLeaderboard = computedPubgLeaderboard.filter((entry: any) => (
    (leaderboardModeFilter === 'All' || entry.mode === leaderboardModeFilter) &&
    (leaderboardMatchType === 'All' || entry.matchType === leaderboardMatchType)
  ));

  const defaultPubgLeaderboardEntry = {
    rank: 0,
    name: 'No registered teams',
    mode: activeArenaModeLabel,
    points: 0,
    kills: 0,
    placement: 0,
    mvp: '-',
    prize: 'Pending',
    matchType: (activeArenaTournament?.title?.toLowerCase().includes('tdm') ? 'TDM' : 'Classic') as 'TDM' | 'Classic',
  };

  const topPubgLeaderboard = filteredPubgLeaderboard[0] ?? defaultPubgLeaderboardEntry;

  const handleClaimWinnerReward = () => {
    if (!tournamentRegistered || registeredPubgTeams.length === 0) {
      toast({
        title: "Not registered",
        description: "You need to register for the tournament to claim rewards.",
        variant: "destructive",
      });
      return;
    }

    const userTeamIds = registeredPubgTeams.map((t: any) => t.id);
    const userLeaderboardEntry = filteredPubgLeaderboard.find(
      (e: any) => e.teamId && userTeamIds.includes(e.teamId) && e.rank > 0 && e.rank <= 3
    );

    if (!userLeaderboardEntry) {
      toast({
        title: "Not eligible yet",
        description: "Your registered team must finish in the top 3 to claim rewards.",
        variant: "destructive",
      });
      return;
    }

    setWinnerRewardClaimed(true);
    toast({
      title: "🏆 Reward queued",
      description: `${userLeaderboardEntry.name} is ranked #${userLeaderboardEntry.rank}. ${userLeaderboardEntry.prize} payout has been marked for reward processing.`,
    });
  };

  const pubgRules = [
    `Entry fee is set by the admin for this tournament (${tournamentEntryFee} Pi currently). Payment must be completed and verified before match access is granted.`,
    `${activeArenaModeLabel} entries require ${activeArenaTeamSize} ${activeArenaTeamSize === 1 ? 'player' : 'players'} with email, phone number, PUBG IGN, and PUBG UID for verification.`,
    'Team name, captain IGN/UID, and roster details must match the enrolled PUBG squad. Any mismatches may lead to disqualification.',
    'Team logo, mugshots, and branding assets are optional but recommended for verification and event visibility.',
    'Mobile devices only. Use of emulators, cheat tools, macros, unauthorized scripts, or third-party hacks results in immediate disqualification.',
    'Classic TPP battle royale rules apply. Selected maps include Erangel, Miramar, and Sanhok, with rotating match assignments.',
    'Placement points are awarded as follows: 1st 10, 2nd 6, 3rd 5, 4th 4, 5th 3, 6th 2, 7th-8th 1, 9th-16th 0.',
    'Kill points are 1 point per confirmed kill. MVP is awarded based on kill count, placement impact, and overall consistency.',
    'Teams must check in 30 minutes before match start. Late check-ins or no-shows may result in a forfeit.',
    'Disconnections are the player’s responsibility. Matches will not pause unless the administrator confirms a server-side failure.',
    'Room ID and password access is restricted to registered captains. Sharing credentials with non-registered players is forbidden.',
    'If a match is completed, its room details are hidden automatically and cannot be reused for later matches.',
    'Tie-breakers are decided by highest single-match points, then by total kills, and finally by overall placement consistency.',
    'Prize distribution is subject to verification and may take up to 24 hours after final standings are confirmed.',
    'Fraudulent behavior, account sharing, multiple registrations, or false player details will lead to disqualification and loss of the entry fee.',
    'The tournament organizer’s decisions are final, binding, and intended to ensure fair play and a safe competitive environment.',
  ];

  const fallbackPubgMatchRooms = [
    { id: 'match-1', label: 'Match 1', map: 'Erangel', roomId: 'PUBG-2048-M1', password: 'ERANGEL5', startsIn: '18:00' },
    { id: 'match-2', label: 'Match 2', map: 'Miramar', roomId: 'PUBG-2048-M2', password: 'MIRAMAR5', startsIn: '42:00' },
    { id: 'match-3', label: 'Match 3', map: 'Sanhok', roomId: 'PUBG-2048-M3', password: 'SANHOK5', startsIn: '66:00' },
    { id: 'match-4', label: 'Match 4', map: 'Erangel', roomId: 'PUBG-2048-M4', password: 'ERANGELX', startsIn: '90:00' },
    { id: 'match-5', label: 'Match 5', map: 'Miramar', roomId: 'PUBG-2048-M5', password: 'FINALM5', startsIn: '114:00' },
  ];
  const pubgMatchRooms = arenaLobbyData?.lobbies?.length
    ? arenaLobbyData.lobbies.map((lobby, index) => ({
        id: lobby.id,
        label: lobby.name || `Match ${index + 1}`,
        map: lobby.mapName || 'Erangle',
        roomId: lobby.roomCode || 'TBA',
        password: lobby.roomPassword || 'TBA',
        startsIn: lobby.createdAt ? new Date(lobby.createdAt).toLocaleString() : 'Scheduled',
      }))
    : fallbackPubgMatchRooms;

  const handleShopCategorySelect = (category: 'tokens' | 'services') => {
    setShopCategory(category);
    setShopStage('titles');
    setShopSelection('');
  };

  const handleShopTitleSelect = (key: string) => {
    setShopSelection(key);
    setShopStage('packages');

    if (shopCategory === 'tokens') {
      setActiveGameTab(key);
    }

    if (shopCategory === 'services') {
      setActiveServiceTab(key);
    }
  };

  const selectedShopCategoryLabel = shopCategory === 'tokens' ? 'In-Game Tokens' : shopCategory === 'services' ? 'Social Media Services' : '';
  const selectedShopTitleLabel = shopTitleOptions.find((item) => item.key === shopSelection)?.title || '';

  // Debug logging
  useEffect(() => {
    console.log('=== PACKAGE FILTERING DEBUG START ===');
    console.log('All packages:', packages);
    console.log('Total packages count:', packages?.length);
    
    // Log each package with its details
    if (packages && packages.length > 0) {
      console.log('Package details:');
      packages.forEach((pkg, idx) => {
        console.log(`[${idx}] ID: ${pkg.id}, Game: "${pkg.game}", Name: ${pkg.name}, isActive: ${pkg.isActive}`);
      });
    }
    
    // Debug the normalize function
    if (packages && packages.length > 0) {
      console.log('Normalize function debug:');
      const debugGames = packages.map(pkg => ({
        original: pkg.game,
        normalized: normalizeGameName(pkg.game),
        isNull: pkg.game === null || pkg.game === undefined,
        isEmpty: pkg.game === ''
      }));
      console.log('Game normalization mapping:', debugGames);
    }
    
    // Log all filtered categories
    console.log('PUBG packages:', pubgpackages);
    console.log('PUBG KR packages:', pubgkrpackages);
    console.log('MLBB packages:', mlbbpackages);
    console.log('COC packages:', cocpackages);
    console.log('Robux packages:', robuxpackages);
    console.log('Newstate packages:', newstatepackages);
    console.log('Freefire packages:', freefirepackages);
    console.log('TikTok Coins packages:', tiktokCoinspackages);
    console.log('TikTok Followers packages:', tiktokFollowerspackages);
    console.log('TikTok Views packages:', tiktokViewspackages);
    console.log('YouTube Subs packages:', youtubeSubspackages);
    console.log('YouTube Watchtime packages:', youtubeWatchTimepackages);
    console.log('Facebook packages:', facebookpackages);
    console.log('Instagram packages:', instagrampackages);
    console.log('Netflix packages:', netflixpackages);
    console.log('Canva packages:', canvapackages);
    
    console.log('Fallback COC packages:', fallbackCocpackages);
    console.log('Display COC packages:', displayCocpackages);
    
    // Additional debugging for all game types
    if (packages) {
      // Create array of unique game types without using Set
      const gameTypes: string[] = [];
      packages.forEach(pkg => {
        if (!gameTypes.includes(pkg.game)) {
          gameTypes.push(pkg.game);
        }
      });
      console.log('All unique game types in packages:', gameTypes);
      
      // Check for isActive false packages
      const inactivepackages = packages.filter((pkg: Package) => pkg.isActive === false);
      console.log('Inactive packages:', inactivepackages);
      
      // Check for null/undefined game values
      const nullGamepackages = packages.filter((pkg: Package) => !pkg.game);
      console.log('packages with null/undefined game:', nullGamepackages);
    }
    
    console.log('=== PACKAGE FILTERING DEBUG END ===');
  }, [packages, pubgpackages, pubgkrpackages, mlbbpackages, cocpackages, fallbackCocpackages, displayCocpackages, robuxpackages, newstatepackages, freefirepackages, tiktokCoinspackages, tiktokFollowerspackages, tiktokViewspackages, youtubeSubspackages, youtubeWatchTimepackages, facebookpackages, instagrampackages, netflixpackages, canvapackages]);

  // Log transactions for debugging
  useEffect(() => {
    if (transactions) {
      console.log('All transactions:', transactions);
      console.log('Recent transactions:', transactions.slice(0, 5));
    }
  }, [transactions]);

  // Handle transaction errors
  useEffect(() => {
    if (transactionsError) {
      console.error('Transaction fetch error:', transactionsError);
      toast({
        title: "Transaction Load Error",
        description: `Failed to load transaction history: ${transactionsError.message}`,
        variant: "destructive",
      });
    }
  }, [transactionsError, toast]);

  const handlePurchaseClick = (pkg: Package) => {
    setSelectedPackage(pkg);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSuccess = () => {
    // Increment purchase count to track ad display
    setPurchaseCount(prev => prev + 1);
    
    // Close the purchase modal
    setIsPurchaseModalOpen(false);
    setSelectedPackage(null);
  };

  const handleLogout = () => {
  // 1️⃣ Clear React Query cache to ensure fresh data on next login
  queryClient.clear();
  
  // 2️⃣ Clear session from piStorage
  setShowLogoutBanner(false);
  piStorage.removeItem('pi_token');
  piStorage.removeItem('pi_user');
  piStorage.removeItem('user_profile');
  piStorage.removeItem('session_data');

  // 3️⃣ Reset auth state
  logout();

  // 4️⃣ Redirect to your landing page
  window.location.href = 'https://b4uesportstest.vercel.app';
};

  const formatWalletAddress = (address: string) => {
    if (!address) return 'Not set';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Use the total_spent value from user data instead of calculating from transactions
  // Ensure it's converted to a number for proper display
  const totalSpent = user?.totalSpent ? parseFloat(user.totalSpent.toString()) : 0;

  const successfulPurchaseStatuses = ['completed', 'approved'];
  const completedTransactions = transactions?.filter(tx => successfulPurchaseStatuses.includes(String(tx.status || '').toLowerCase())).length || 0;
  const hasPiNetworkPurchase = transactions?.some((tx: any) => successfulPurchaseStatuses.includes(String(tx.status || '').toLowerCase())) ?? false;

  // Filter and sort transactions based on UI controls
  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let result = [...transactions];
    
    // Extra safety: ensure only the authenticated user's transactions are shown
    if (user?.id) {
      result = result.filter(tx => !tx.userId || String(tx.userId) === String(user.id));
    }
    
    // Apply filter
    if (transactionFilter !== 'all') {
      result = result.filter(tx => transactionFilter === 'completed'
        ? ['completed', 'approved'].includes(tx.status)
        : tx.status === transactionFilter
      );
    }
    
    // Apply sorting
    if (transactionSort === 'date') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (transactionSort === 'amount') {
      result.sort((a, b) => parseFloat(b.piAmount) - parseFloat(a.piAmount));
    }
    
    return result;
  }, [transactions, transactionFilter, transactionSort, user?.id]);

  // Handle order tracking
  const handleTrackOrder = async () => {
    if (!trackTransactionId.trim()) {
      setTrackError('Please enter a transaction ID');
      return;
    }

    setIsTracking(true);
    setTrackError('');
    setTrackResult(null);

    try {
      // First, try to find the transaction in the existing transactions data
      const foundTransaction = transactions?.find(tx => 
        tx.paymentId === trackTransactionId || 
        tx.id === trackTransactionId ||
        tx.paymentId.includes(trackTransactionId)
      );

      if (foundTransaction) {
        setTrackResult(foundTransaction);
        return;
      }

      // If not found locally, fetch from the server
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/transactions`, { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const allTransactions: Transaction[] = await response.json();
      const transaction = allTransactions.find(tx => 
        tx.paymentId === trackTransactionId || 
        tx.id === trackTransactionId ||
        tx.paymentId.includes(trackTransactionId)
      );

      if (transaction) {
        setTrackResult(transaction);
      } else {
        setTrackError('Transaction not found. Please check the transaction ID and try again.');
      }
    } catch (error) {
      console.error('Error tracking order:', error);
      setTrackError('An error occurred while tracking your order. Please try again.');
    } finally {
      setIsTracking(false);
    }
  };

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      // Call the connect wallet endpoint
      const response = await fetch('/api/user/connect-wallet', {
        method: 'POST',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to connect wallet');
      }
      
      // Refresh user data to get updated wallet address
      await refreshUser();
      
      toast({
        title: 'Wallet Connected',
        description: 'Your authentic wallet information has been synced.',
        variant: 'success',
      });
      
      // Re-fetch balance after connecting wallet
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect wallet. Please try again.";
      
      // Provide more specific guidance based on the error message
      let description = errorMessage;
      if (errorMessage.includes('purchase') || errorMessage.includes('transaction first') || errorMessage.includes('complete at least one')) {
        description = "You need to make your first purchase before you can connect your wallet. After a successful purchase, your wallet address will be automatically extracted from the Stellar blockchain. Please make a purchase first, then try connecting your wallet again.";
      }
      
      toast({
        title: 'Connection Failed',
        description: description,
        variant: 'destructive',
      });
    }
  };

  const handleRefreshPiBalance = async () => {
    if (!user?.walletAddress) return;
    
    setIsFetchingBalance(true);
    try {
      const response = await fetch('/api/user/refresh-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: user!.walletAddress }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh Pi balance');
      }
      
      const data = await response.json();
      setWalletBalance(parseFloat(data.pi_balance));
      
      toast({
        title: 'Balance Updated',
        description: 'Your Pi balance has been refreshed.',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error refreshing Pi balance:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Could not refresh Pi balance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingBalance(false);
    }
  };

const handleRedeemTokens = async () => {
  // Check if user is authenticated
  if (!user) {
    toast({
      title: "Authentication Required",
      description: "Please log in to redeem B4U Esports Token.",
      variant: "destructive",
    });
    return;
  }

  // Check eligibility: minimum 10 Pi in purchases
  const totalSpent = user?.totalSpent ? parseFloat(user.totalSpent.toString()) : 0;
  if (totalSpent < 10) {
    toast({
      title: "Eligibility Requirement Not Met",
      description: "You must complete a minimum purchase of 10 Pi to qualify for B4U Esports Token redemption.",
      variant: "destructive",
    });
    return;
  }

  // Pi UID is the verified Pi identity used for redemption payouts.
  if (!user.piUID) {
    toast({
      title: "Pi Login Required",
      description: "Please log in with Pi Network again so your verified Pi UID can be used for redemption.",
      variant: "destructive",
    });
    return;
  }

  // Check if user has enough B4U Esports Token (1000 B4UT = 0.1 Pi)
  const tokensNeeded = 1000;
  if ((user.tokens ?? 0) < tokensNeeded) {
    const piValue = (tokensNeeded / 10000).toFixed(1); // 1000 B4UT = 0.1 Pi
    toast({
      title: "Insufficient Tokens",
      description: `You need at least ${tokensNeeded} B4U Esports Token (${piValue} Pi) to redeem.`,
      variant: "destructive",
    });
    return;
  }

  // Open redemption dialog
  setIsRedeemDialogOpen(true);
};

const handleConfirmRedemption = async () => {
  if (!user || !token) {
    toast({
      title: "Authentication Error",
      description: "Please log in again.",
      variant: "destructive",
    });
    return;
  }

  setIsProcessingRedemption(true);
  
  try {
    // Call backend API to process token redemption
    const response = await fetch('/api/user/redeem-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokensToRedeem: 1000 // 1000 B4UT = 0.1 Pi
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to process redemption');
    }

    // Refresh user data to get updated token balance
    await refreshUser();
    
    // Close dialog
    setIsRedeemDialogOpen(false);
    
    // Show success message
    toast({
      title: "Redemption Successful!",
      description: "Your B4U Esports Token was burned and a Pi treasury payout request was created.",
    });
    
  } catch (error: any) {
    console.error('Redemption error:', error);
    toast({
      title: "Redemption Failed",
      description: error.message || "Failed to process B4U Esports Token redemption. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsProcessingRedemption(false);
  }
};

  // Force refetch packages when COC tab is selected
  useEffect(() => {
    if (activeGameTab === 'coc' && packages && cocpackages.length === 0) {
      console.log('COC tab selected but no COC packages found, refetching packages...');
      refetchpackages();
    }
  }, [activeGameTab, packages, cocpackages.length, refetchpackages]);

  return (
    <AnimatedPage className="min-h-screen bg-background text-foreground safe-area-top flex flex-col h-screen overflow-hidden" data-testid="dashboard-page">
      <ParticleBackground />
      
      {/* Main dashboard content - show immediately since user is authenticated */}
      {user !== null && user !== undefined && (
        <>
      

      {/* App-like Header */}
      <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 border-b border-gray-800 sticky top-0 z-40 backdrop-blur-xl" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Avatar & Greeting */}
            <div className="flex items-center cursor-pointer" onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); try { initializeAudio(); soundActions.playTap(); } catch {} setIsProfileModalOpen(true); }}>
              <div className="w-10 h-10 rounded-full border-2 border-cyan-500 overflow-hidden mr-3 relative shadow-lg shadow-cyan-500/20">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <i className="fas fa-user text-gray-300"></i>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{new Date().getHours() < 12 ? t('good_morning') : new Date().getHours() < 18 ? t('good_afternoon') : t('good_evening')}</p>
                <h1 className="text-sm font-bold truncate max-w-[120px]">
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                    {user?.username || 'User'}
                  </span>
                </h1>
              </div>
            </div>

            {/* Wallet, Notifications & Language */}
            <div className="flex items-center gap-2">
              {/* Pi wallet balance - only show after first purchase */}
              {hasPiNetworkPurchase && (
              <div 
                className="bg-gray-800/80 border border-gray-700 rounded-full px-3 py-1.5 flex items-center shadow-inner cursor-pointer hover:bg-gray-700 transition-colors" 
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                  document.querySelector('[data-testid="recent-transactions"]')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <img src="https://b4uesports.com/wp-content/uploads/2025/10/piwalletlogob4uesports.png" alt="Pi" className="w-4 h-4 mr-1.5 drop-shadow-[0_0_5px_rgba(255,193,7,0.5)]" />
                <span className="text-xs font-bold text-green-400">
                  {walletBalance !== null ? `${walletBalance.toFixed(2)} π` : '---'}
                </span>
              </div>
              )}

              {/* Notification bell */}
              <button 
                className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gray-800/80 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors shadow-inner" 
                onClick={() => { 
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); 
                  setIsNotificationsOpen(true);
                }}
                aria-label="Notifications"
              >
                <i className="fas fa-bell text-xs"></i>
                {notifications?.some((n: any) => n.status === 'unread') && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse"></span>
                )}
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-700 mx-1" />

              {/* Language selector */}
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
      
      {/* Scrollable Container for refresh (Pull-to-refresh simulation area) */}
      <div className="flex-1 w-full overflow-y-auto overscroll-y-contain pb-20 safe-area-bottom">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          
          {/* Status Banners (Moved from Header) */}
          <div className="space-y-2">
            {!user?.isProfileVerified && (
              <div className="p-2 text-xs bg-yellow-900/30 border border-yellow-500/50 text-yellow-200 rounded-lg flex items-center">
                <i className="fas fa-exclamation-triangle mr-2 text-yellow-400"></i>
                <span>Complete your profile to unlock all features.</span>
              </div>
            )}
            
            {/* Wallet Connect Banner */}
            {hasPiNetworkPurchase && !user?.walletAddress && (
              <div className="bg-blue-900/40 border border-blue-500/50 p-4 rounded-lg flex items-center justify-between mb-6 shadow-lg shadow-blue-900/20">
                <div className="flex items-center space-x-3 text-blue-100">
                  <Wallet className="w-6 h-6 text-blue-400" />
                  <span><button onClick={handleConnectWallet} className="font-bold underline text-blue-300 ml-1">Connect wallet address</button></span>
                </div>
              </div>
            )}
            
            {typeof piPrice?.price === 'number' && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-gray-700/50 shadow-sm" data-testid="pi-price-dashboard">
                <div className="flex items-center">
                  <img src={BRAND_LOGOS.PI} alt="Pi Network" className="w-4 h-4 mr-2 rounded-full" />
                  <p className="text-xs text-gray-400">Live Pi Price</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100 mr-1.5">
                      ${piPrice.price.toFixed(3)}
                    </p>
                    <i className="fas fa-chart-line text-green-400 text-xs"></i>
                  </div>
                  <div className="w-px h-4 bg-gray-700"></div>
                  <button 
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 100, 50]);
                      logout();
                    }}
                    className="flex items-center justify-center p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                    title="Logout"
                  >
                    <i className="fas fa-sign-out-alt text-sm"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Package Shop */}
          {activeSection === 'home' && (
    <div className="lg:col-span-2 space-y-6">
      <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex">
          {/* Slide 1: Welcome to B4U Esports */}
          <div className="flex-[0_0_100%] min-w-0 pr-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#020c1b] via-[#041428] to-[#020c1b] shadow-2xl relative overflow-hidden cursor-pointer h-full min-h-[250px] sm:min-h-[270px] flex items-center"
              onClick={() => { setActiveSection('shop'); }}
            >
              {/* Background image */}
              <div className="absolute inset-0">
                <img src="https://b4uesports.com/wp-content/uploads/2025/10/pubgmoblielogob4uesports.webp" alt="" className="w-full h-full object-cover opacity-5"/>
                <div className="absolute inset-0 bg-gradient-to-r from-[#020c1b] via-[#020c1b]/80 to-transparent"/>
              </div>
              {/* Glow orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"/>
              <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-blue-500/8 rounded-full blur-3xl pointer-events-none"/>
              {/* Top accent */}
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-cyan-500/80 via-blue-400/50 to-transparent"/>
              {/* Right image */}
              <motion.div initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
                className="absolute right-0 top-0 bottom-0 w-[45%] overflow-hidden">
                <img src="https://b4uesports.com/wp-content/uploads/2025/10/pubgmoblielogob4uesports.webp" alt="" className="w-full h-full object-contain object-center opacity-20 scale-110"/>
                <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#020c1b] to-transparent"/>
              </motion.div>
              {/* Content */}
              <div className="relative z-10 px-7 py-6 max-w-[60%]">
                <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"/> B4U Esports
                </motion.span>
                <motion.h2 initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                  className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                  {t('explore_now')}<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">B4U Esports</span>
                </motion.h2>
                <motion.p initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                  className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                  Premium gaming tokens, esports tournaments & exclusive Pi Network rewards — all in one place.
                </motion.p>
                <motion.div initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-5 py-2 rounded-full font-black text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow">
                  <i className="fas fa-store text-xs"/> {t('explore_now')}
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Slide 2: News & Announcements */}
          <div className="flex-[0_0_100%] min-w-0 pr-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-[#020818] via-[#040d24] to-[#020818] shadow-2xl relative overflow-hidden cursor-pointer h-full min-h-[250px] sm:min-h-[270px] flex items-center"
              onClick={() => { setActiveSection('home'); }}
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/12 rounded-full blur-3xl pointer-events-none"/>
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"/>
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-blue-500/90 via-indigo-400/60 to-transparent"/>

              {/* Coded megaphone illustration */}
              <motion.div
                initial={{ x: 60, opacity: 0, scale: 0.85 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-[44%] flex items-center justify-center"
              >
                <div className="relative w-44 h-44">
                  {/* Megaphone body */}
                  <svg viewBox="0 0 180 160" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Outer glow ring */}
                    <circle cx="90" cy="80" r="75" fill="url(#glow1)" opacity="0.15"/>
                    {/* Megaphone cone */}
                    <path d="M30 60 L30 100 L110 130 L110 30 Z" fill="url(#megaCone)" rx="4"/>
                    {/* Megaphone handle */}
                    <rect x="8" y="62" width="26" height="36" rx="8" fill="url(#megaHandle)"/>
                    {/* Bell/mouth */}
                    <path d="M110 30 Q160 55 160 80 Q160 105 110 130 Z" fill="url(#megaBell)"/>
                    {/* Handle grip lines */}
                    <line x1="13" y1="74" x2="29" y2="74" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                    <line x1="13" y1="80" x2="29" y2="80" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                    <line x1="13" y1="86" x2="29" y2="86" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                    {/* Sound waves */}
                    <path d="M170 60 Q182 80 170 100" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9"/>
                    <path d="M163 50 Q182 80 163 110" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>
                    <path d="M155 42 Q182 80 155 118" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
                    {/* Star sparkles */}
                    <circle cx="140" cy="28" r="3" fill="#fbbf24" opacity="0.9"/>
                    <circle cx="155" cy="18" r="2" fill="#60a5fa" opacity="0.8"/>
                    <circle cx="125" cy="15" r="2.5" fill="#a78bfa" opacity="0.7"/>
                    <defs>
                      <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#3b82f6"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                      </radialGradient>
                      <linearGradient id="megaCone" x1="30" y1="65" x2="110" y2="65" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#1e40af"/>
                        <stop offset="100%" stopColor="#2563eb"/>
                      </linearGradient>
                      <linearGradient id="megaHandle" x1="8" y1="62" x2="34" y2="98" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#1d4ed8"/>
                        <stop offset="100%" stopColor="#1e3a8a"/>
                      </linearGradient>
                      <linearGradient id="megaBell" x1="110" y1="30" x2="160" y2="130" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#3b82f6"/>
                        <stop offset="100%" stopColor="#1d4ed8"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Ping animation circle */}
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-blue-400/30"
                  />
                </div>
              </motion.div>

              {/* Content */}
              <div className="relative z-10 px-7 py-6 max-w-[58%]">
                <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/35 text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"/> {t('news')}
                </motion.span>
                <motion.h2 initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                  className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                  {t('news')}<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-400">&amp; Updates</span>
                </motion.h2>
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                  className="space-y-2">
                  {[
                    { tag: 'LIVE', color: 'text-blue-300 bg-blue-500/20 border-blue-500/30', text: '⚡ PUBG Tournament is live — register your squad now.' },
                    { tag: 'NEW', color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25', text: '🚀 Instant Pi payouts for verified accounts.' },
                  ].map(({ tag, color, text }) => (
                    <div key={tag} className="flex items-start gap-2 bg-slate-900/70 rounded-xl p-2.5 border border-slate-700/50">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${color}`}>{tag}</span>
                      <p className="text-xs text-slate-300 leading-snug">{text}</p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Slide 3: Referral Program */}
          <div className="flex-[0_0_100%] min-w-0 pr-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#0d0518] via-[#130820] to-[#0d0518] shadow-2xl relative overflow-hidden cursor-pointer h-full min-h-[250px] sm:min-h-[270px] flex items-center"
              onClick={() => { setIsReferralDialogOpen(true); }}
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/12 rounded-full blur-3xl pointer-events-none"/>
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-pink-600/10 rounded-full blur-3xl pointer-events-none"/>
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500/90 via-pink-400/60 to-transparent"/>

              {/* Coded referral network illustration — 3 people with connecting lines */}
              <motion.div
                initial={{ x: 60, opacity: 0, scale: 0.85 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-[46%] flex items-center justify-center"
              >
                <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background glow circles */}
                  <circle cx="100" cy="90" r="80" fill="url(#refGlow)" opacity="0.1"/>

                  {/* Connecting lines with animated dashes */}
                  <line x1="100" y1="55" x2="50" y2="120" stroke="url(#lineGrad1)" strokeWidth="2" strokeDasharray="4 3" opacity="0.7"/>
                  <line x1="100" y1="55" x2="150" y2="120" stroke="url(#lineGrad2)" strokeWidth="2" strokeDasharray="4 3" opacity="0.7"/>
                  <line x1="50" y1="120" x2="150" y2="120" stroke="url(#lineGrad3)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4"/>

                  {/* Token badges on lines */}
                  <circle cx="75" cy="87" r="10" fill="#7c3aed" opacity="0.9"/>
                  <text x="75" y="91" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">+25</text>
                  <circle cx="125" cy="87" r="10" fill="#7c3aed" opacity="0.9"/>
                  <text x="125" y="91" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">+25</text>

                  {/* Center person (referrer) */}
                  <circle cx="100" cy="35" r="18" fill="url(#personGrad1)"/>
                  <circle cx="100" cy="27" r="8" fill="#e9d5ff"/>
                  <path d="M83 53 Q100 45 117 53" fill="#c4b5fd" opacity="0.8"/>
                  {/* Crown on top */}
                  <path d="M91 21 L95 14 L100 19 L105 14 L109 21 Z" fill="#fbbf24" opacity="0.9"/>

                  {/* Left person */}
                  <circle cx="45" cy="125" r="15" fill="url(#personGrad2)"/>
                  <circle cx="45" cy="118" r="6.5" fill="#ddd6fe"/>
                  <path d="M31 140 Q45 133 59 140" fill="#a78bfa" opacity="0.7"/>

                  {/* Right person */}
                  <circle cx="155" cy="125" r="15" fill="url(#personGrad3)"/>
                  <circle cx="155" cy="118" r="6.5" fill="#fbcfe8"/>
                  <path d="M141 140 Q155 133 169 140" fill="#f472b6" opacity="0.7"/>

                  {/* Sparkle stars */}
                  <circle cx="30" cy="60" r="2.5" fill="#fbbf24" opacity="0.8"/>
                  <circle cx="170" cy="55" r="2" fill="#60a5fa" opacity="0.8"/>
                  <circle cx="175" cy="155" r="2.5" fill="#a78bfa" opacity="0.7"/>
                  <circle cx="25" cy="155" r="2" fill="#34d399" opacity="0.8"/>

                  <defs>
                    <radialGradient id="refGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#9333ea"/>
                      <stop offset="100%" stopColor="#9333ea" stopOpacity="0"/>
                    </radialGradient>
                    <linearGradient id="personGrad1" x1="82" y1="17" x2="118" y2="53" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#9333ea"/>
                      <stop offset="100%" stopColor="#7c3aed"/>
                    </linearGradient>
                    <linearGradient id="personGrad2" x1="30" y1="110" x2="60" y2="140" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7c3aed"/>
                      <stop offset="100%" stopColor="#6d28d9"/>
                    </linearGradient>
                    <linearGradient id="personGrad3" x1="140" y1="110" x2="170" y2="140" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ec4899"/>
                      <stop offset="100%" stopColor="#be185d"/>
                    </linearGradient>
                    <linearGradient id="lineGrad1" x1="100" y1="55" x2="50" y2="120" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#9333ea"/>
                      <stop offset="100%" stopColor="#7c3aed"/>
                    </linearGradient>
                    <linearGradient id="lineGrad2" x1="100" y1="55" x2="150" y2="120" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#9333ea"/>
                      <stop offset="100%" stopColor="#ec4899"/>
                    </linearGradient>
                    <linearGradient id="lineGrad3" x1="50" y1="120" x2="150" y2="120" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7c3aed"/>
                      <stop offset="100%" stopColor="#ec4899"/>
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>

              {/* Content */}
              <div className="relative z-10 px-7 py-6 max-w-[60%]">
                <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/35 text-purple-300 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse"/> {t('earn_together')}
                </motion.span>
                <motion.h2 initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                  className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                  {t('referral_program')}
                </motion.h2>
                <motion.p initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                  className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                  {t('referral_desc')}
                </motion.p>
                <motion.div initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2 rounded-full font-black text-sm shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow">
                  <i className="fas fa-share-alt text-xs"/> {t('start_inviting')}
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Slide 4: Giveaways & Rewards */}
          <div className="flex-[0_0_100%] min-w-0 pr-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#150a00] via-[#1e1000] to-[#150a00] shadow-2xl relative overflow-hidden cursor-pointer h-full min-h-[250px] sm:min-h-[270px] flex items-center"
              onClick={() => { document.querySelector('[data-testid="giveaway-section"]')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/12 rounded-full blur-3xl pointer-events-none"/>
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"/>
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-500/90 via-yellow-400/60 to-transparent"/>

              {/* Coded gift boxes + trophy illustration */}
              <motion.div
                initial={{ x: 60, opacity: 0, scale: 0.85 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-[46%] flex items-center justify-center"
              >
                <svg viewBox="0 0 200 190" className="w-full h-full drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background glow */}
                  <circle cx="100" cy="95" r="82" fill="url(#giftGlow)" opacity="0.12"/>

                  {/* Trophy cup — center back */}
                  <path d="M82 40 L118 40 L115 75 Q100 90 85 75 Z" fill="url(#trophyBody)"/>
                  <rect x="93" y="75" width="14" height="18" fill="#d97706"/>
                  <rect x="83" y="90" width="34" height="8" rx="4" fill="#f59e0b"/>
                  {/* Trophy handles */}
                  <path d="M82 50 Q68 50 68 62 Q68 74 82 74" stroke="#fbbf24" strokeWidth="4" fill="none" strokeLinecap="round"/>
                  <path d="M118 50 Q132 50 132 62 Q132 74 118 74" stroke="#fbbf24" strokeWidth="4" fill="none" strokeLinecap="round"/>
                  {/* Trophy star */}
                  <polygon points="100,48 103,55 111,55 105,60 107,67 100,63 93,67 95,60 89,55 97,55" fill="#fde68a" opacity="0.9"/>

                  {/* Large gift box left */}
                  <rect x="20" y="110" width="52" height="52" rx="6" fill="url(#giftBox1)"/>
                  <rect x="20" y="110" width="52" height="12" rx="4" fill="#b45309"/>
                  {/* Ribbon vertical */}
                  <rect x="43" y="110" width="6" height="52" fill="#fbbf24" opacity="0.9"/>
                  {/* Ribbon horizontal */}
                  <rect x="20" y="128" width="52" height="6" fill="#fbbf24" opacity="0.9"/>
                  {/* Bow */}
                  <ellipse cx="46" cy="113" rx="8" ry="5" fill="#fbbf24" transform="rotate(-20 46 113)" opacity="0.9"/>
                  <ellipse cx="46" cy="113" rx="8" ry="5" fill="#fbbf24" transform="rotate(20 46 113)" opacity="0.9"/>
                  <circle cx="46" cy="113" r="4" fill="#d97706"/>

                  {/* Medium gift box right */}
                  <rect x="128" y="120" width="44" height="44" rx="6" fill="url(#giftBox2)"/>
                  <rect x="128" y="120" width="44" height="11" rx="4" fill="#7c3aed"/>
                  {/* Ribbon */}
                  <rect x="147" y="120" width="6" height="44" fill="#c4b5fd" opacity="0.9"/>
                  <rect x="128" y="136" width="44" height="6" fill="#c4b5fd" opacity="0.9"/>
                  {/* Bow */}
                  <ellipse cx="150" cy="122" rx="7" ry="4.5" fill="#c4b5fd" transform="rotate(-20 150 122)" opacity="0.9"/>
                  <ellipse cx="150" cy="122" rx="7" ry="4.5" fill="#c4b5fd" transform="rotate(20 150 122)" opacity="0.9"/>
                  <circle cx="150" cy="122" r="3.5" fill="#7c3aed"/>

                  {/* Small gift box top right */}
                  <rect x="143" y="85" width="32" height="32" rx="5" fill="url(#giftBox3)"/>
                  <rect x="143" y="85" width="32" height="9" rx="4" fill="#065f46"/>
                  <rect x="156" y="85" width="5" height="32" fill="#6ee7b7" opacity="0.9"/>
                  <rect x="143" y="97" width="32" height="5" fill="#6ee7b7" opacity="0.9"/>
                  <circle cx="159" cy="87" r="3" fill="#34d399"/>

                  {/* Sparkles / coins floating */}
                  <circle cx="18" cy="95" r="8" fill="#fbbf24" opacity="0.9"/>
                  <text x="18" y="98" textAnchor="middle" fontSize="7" fill="#78350f" fontWeight="bold">π</text>
                  <circle cx="175" cy="100" r="7" fill="#fbbf24" opacity="0.9"/>
                  <text x="175" y="103" textAnchor="middle" fontSize="7" fill="#78350f" fontWeight="bold">π</text>
                  <circle cx="100" cy="170" r="6" fill="#fbbf24" opacity="0.7"/>
                  <text x="100" y="173" textAnchor="middle" fontSize="6" fill="#78350f" fontWeight="bold">π</text>

                  {/* Stars */}
                  <polygon points="165,35 167,41 173,41 168,45 170,51 165,47 160,51 162,45 157,41 163,41" fill="#fbbf24" opacity="0.8"/>
                  <circle cx="30" cy="100" r="2" fill="#f472b6" opacity="0.7"/>
                  <circle cx="170" cy="75" r="2" fill="#60a5fa" opacity="0.7"/>

                  <defs>
                    <radialGradient id="giftGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b"/>
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                    </radialGradient>
                    <linearGradient id="trophyBody" x1="82" y1="40" x2="118" y2="90" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fbbf24"/>
                      <stop offset="100%" stopColor="#d97706"/>
                    </linearGradient>
                    <linearGradient id="giftBox1" x1="20" y1="110" x2="72" y2="162" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#dc2626"/>
                      <stop offset="100%" stopColor="#991b1b"/>
                    </linearGradient>
                    <linearGradient id="giftBox2" x1="128" y1="120" x2="172" y2="164" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#7c3aed"/>
                      <stop offset="100%" stopColor="#5b21b6"/>
                    </linearGradient>
                    <linearGradient id="giftBox3" x1="143" y1="85" x2="175" y2="117" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#059669"/>
                      <stop offset="100%" stopColor="#065f46"/>
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>

              {/* Content */}
              <div className="relative z-10 px-7 py-6 max-w-[60%]">
                <motion.span initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/35 text-amber-300 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"/> {t('daily_login_reward')}
                </motion.span>
                <motion.h2 initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                  className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                  {t('giveaways_rewards')}
                </motion.h2>
                <motion.p initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                  className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                  {t('giveaways_desc')}
                </motion.p>
                <motion.div initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.45 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 px-5 py-2 rounded-full font-black text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow">
                  <i className="fas fa-gem text-xs"/> {t('claim_rewards')}
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Slide 5: Tournament — Pioneer Call to Action with real player photos */}
          <div className="flex-[0_0_100%] min-w-0 pr-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#0f0a00] via-[#1a1000] to-[#0a0f1a] shadow-2xl relative overflow-hidden cursor-pointer h-full min-h-[250px] sm:min-h-[270px] flex items-center"
              onClick={() => { setActiveTournamentPanel('register'); document.querySelector('[data-testid="tournament-section"]')?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12),transparent_70%)]"/>
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500/80 via-yellow-400/60 to-transparent"/>

              {/* Single player image — slides in from right */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                className="absolute right-0 top-0 bottom-0 w-[52%] overflow-hidden"
              >
                <img
                  src="https://b4uesports.com/wp-content/uploads/2025/04/IMG-20250210-WA0003.jpg"
                  alt="Pioneer player"
                  className="w-full h-full object-cover object-center"
                  onError={e => {
                    const el = e.target as HTMLImageElement;
                    el.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80';
                  }}
                />
                {/* Fade left edge into background */}
                <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#0f0a00] to-transparent"/>
                {/* Subtle bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0f1a] to-transparent"/>
              </motion.div>

              {/* Text content */}
              <div className="relative z-20 px-6 py-8 max-w-[55%]">
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <span className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"/>
                    {t('pioneers_badge')}
                  </span>
                </motion.div>
                <motion.h2
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.35 }}
                  className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2"
                >
                  Compete.<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">Win Pi.</span>
                </motion.h2>
                <motion.p
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                  className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4"
                >
                  {t('tournament_desc')}
                </motion.p>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.65 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 px-5 py-2 rounded-full font-black text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow"
                >
                  <i className="fas fa-trophy text-xs"/>
                  {t('participate_now')}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Carousel dots indicator */}
      <div className="flex justify-center space-x-2 mt-4">
        {[0, 1, 2, 3, 4].map((_, index) => (
          <div key={index} className="w-2 h-2 rounded-full bg-slate-500/50 cursor-pointer hover:bg-cyan-400 transition-colors" onClick={() => emblaApi?.scrollTo(index)}></div>
        ))}
      </div>

      {/* Daily Login Reward Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-4 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/30 via-amber-900/20 to-orange-900/30 p-5 backdrop-blur-md relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <i className="fas fa-calendar-check text-7xl text-yellow-400"></i>
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-gift text-yellow-400 text-xl"></i>
            </div>
            <div>
              <p className="text-white font-bold text-base">{t('daily_login_reward')}</p>
              {dailyRewardStatus?.canClaim !== false ? (
                <p className="text-yellow-300 text-xs font-medium">{t('tokens_available')}</p>
              ) : (
                <p className="text-slate-400 text-xs">
                  {t('next_claim')}: <span className="text-yellow-400 font-bold">{dailyRewardStatus.hoursLeft}h</span>
                </p>
              )}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: dailyRewardStatus?.canClaim !== false ? 1.05 : 1 }}
            whileTap={{ scale: dailyRewardStatus?.canClaim !== false ? 0.95 : 1 }}
            onClick={handleClaimDailyReward}
            disabled={isClaimingDaily || dailyRewardStatus?.canClaim === false}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              dailyRewardStatus?.canClaim === false
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-600/30'
                : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:from-yellow-400 hover:to-amber-400'
            }`}
          >
            {isClaimingDaily ? (
              <><i className="fas fa-spinner fa-spin text-xs"></i> Claiming...</>
            ) : dailyRewardStatus?.canClaim === false ? (
              <><i className="fas fa-check text-xs"></i> Claimed</>
            ) : (
              <><i className="fas fa-coins text-xs"></i> Claim 10</>
            )}
          </motion.button>
        </div>
        {dailyRewardStatus?.canClaim === false && dailyRewardStatus.nextClaimAt && (
          <div className="mt-3 relative z-10">
            <div className="w-full bg-slate-700/50 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-yellow-500 to-amber-400 h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, ((24 - (dailyRewardStatus.hoursLeft || 0)) / 24) * 100))}%`
                }}
              />
            </div>
            <p className="text-slate-500 text-xs mt-1 text-right">
              Resets {new Date(dailyRewardStatus.nextClaimAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )}
  <div className={`lg:col-span-2 ${['shop', 'tournaments'].includes(activeSection) ? 'block' : 'hidden'}`}>
<div className={activeSection === 'shop' ? 'block animate-in fade-in' : 'hidden'} data-testid="package-shop">
            <h2 className="text-3xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
              <i className="fas fa-shopping-bag mr-3"></i>
              {t('shop_title')}
            </h2>
            
            <div className="space-y-6">
              {shopStage === 'category' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="grid gap-6 sm:grid-cols-2"
                >
                  {shopCategoryOptions.map((option, index) => (
                    <motion.button
                      key={option.key}
                      type="button"
                      onClick={() => handleShopCategorySelect(option.key)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ 
                        scale: 1.04,
                        boxShadow: "0 24px 60px rgba(124,58,237,0.24)"
                      }}
                      whileTap={{ scale: 0.96 }}
                      className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/95 p-8 text-center shadow-2xl backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_28px_60px_rgba(124,58,237,0.25)]"
                    >
                      <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 blur-3xl" />
                      <div className="absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-3xl" />
                      <div className={`relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r ${option.accent} text-white shadow-xl transition-all duration-300 group-hover:scale-110`}>
                        <i className={`${option.icon} text-4xl`} />
                      </div>
                      <h3 className="relative text-2xl font-extrabold text-white tracking-tight">{option.title}</h3>
                      <p className="relative mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-300">{option.description}</p>
                      <motion.div
                        className="relative mt-7 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300"
                        whileHover={{ scale: 1.05, y: -1 }}
                      >
                        <i className="fas fa-meteor mr-2" />
                        Explore Now
                      </motion.div>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {shopStage === 'titles' && shopCategory && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="max-w-3xl"
                    >
                      <p className="text-sm uppercase tracking-[0.35em] text-cyan-300 font-semibold mb-2">{selectedShopCategoryLabel}</p>
                      <h3 className="text-3xl sm:text-4xl font-extrabold text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-purple-300">{t('choose_package_path')}</h3>
                      <p className="mt-3 text-base text-slate-300 sm:text-lg max-w-2xl mx-auto">{t('shop_subtitle')}</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="flex justify-center"
                    >
                      <Button
                        variant="outline"
                        className="relative overflow-hidden bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-2 border-cyan-500/30 text-white hover:border-cyan-400 hover:text-cyan-200 font-semibold px-8 py-3 rounded-2xl shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 group"
                        onClick={() => {
                          setShopStage('category');
                          setShopCategory(null);
                          setShopSelection('');
                        }}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform duration-300" />
                          Back to {selectedShopCategoryLabel}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Button>
                    </motion.div>
                  </div>

                  <motion.div 
                    className="grid gap-6 sm:grid-cols-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    {shopTitleOptions.map((title, index) => (
                      <motion.button
                        key={title.key}
                        type="button"
                        onClick={() => handleShopTitleSelect(title.key)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                        whileHover={{ 
                          scale: 1.03,
                          boxShadow: "0 20px 40px rgba(99,102,241,0.25)"
                        }}
                        whileTap={{ scale: 0.97 }}
                        className="group relative overflow-hidden flex flex-col items-center text-center gap-5 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/95 to-slate-900/95 p-6 transition-all duration-500 hover:border-transparent hover:shadow-indigo-500/20 backdrop-blur-sm"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-fuchsia-600/5 to-sky-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        {'iconSrc' in title ? (
                          <motion.img 
                            src={title.iconSrc} 
                            alt={title.title} 
                            className="relative h-24 w-24 rounded-3xl object-contain shadow-2xl transition-shadow duration-300" 
                            whileHover={{ rotate: 3, scale: 1.02 }}
                          />
                        ) : (
                          <motion.div 
                            className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl transition-shadow duration-300"
                            whileHover={{ rotate: 8, scale: 1.05 }}
                          >
                            <i className={`${'iconClass' in title ? title.iconClass : 'fas fa-star'} text-4xl`} />
                          </motion.div>
                        )}
                        <div className="relative flex-1">
                          <h4 className="text-2xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-pink-300 transition-all duration-300">{title.title}</h4>
                          <p className="text-base text-gray-400 group-hover:text-gray-300 transition-colors duration-300 mt-1">{title.subtitle}</p>
                        </div>
                        <motion.div 
                          className="relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 border border-white/10 transition-all duration-300"
                          whileHover={{ scale: 1.05 }}
                        >
                          <span>{title.count}</span>
                          <span className="text-slate-200/80">packages</span>
                        </motion.div>
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {shopStage === 'packages' && shopCategory && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="max-w-3xl"
                    >
                      <p className="text-sm uppercase tracking-[0.35em] text-cyan-300 font-semibold mb-2">{selectedShopCategoryLabel}</p>
                      <h3 className="text-3xl sm:text-4xl font-extrabold text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-purple-300">{selectedShopTitleLabel}</h3>
                      <p className="mt-3 text-base text-slate-300 sm:text-lg max-w-2xl mx-auto">{t('shop_subtitle')}</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="flex flex-wrap justify-center gap-3"
                    >
                      <Button
                        variant="outline"
                        className="relative overflow-hidden bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-2 border-purple-500/30 text-white hover:border-purple-400 hover:text-purple-200 font-semibold px-7 py-3 rounded-2xl shadow-lg hover:shadow-purple-500/20 transition-all duration-300 group"
                        onClick={() => {
                          setShopStage('titles');
                          setShopSelection('');
                        }}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform duration-300" />
                          Back to {selectedShopCategoryLabel}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Button>
                      <Button
                        variant="outline"
                        className="relative overflow-hidden bg-gradient-to-r from-gray-800/80 to-gray-700/80 border-2 border-indigo-500/30 text-white hover:border-indigo-400 hover:text-indigo-200 font-semibold px-7 py-3 rounded-2xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 group"
                        onClick={() => {
                          setShopStage('category');
                          setShopCategory(null);
                          setShopSelection('');
                        }}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <i className="fas fa-home group-hover:scale-110 transition-transform duration-300" />
                          Change Category
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Button>
                    </motion.div>
                  </div>

                  {shopCategory === 'tokens' ? (
                    <div>
                      <Tabs value={activeGameTab} onValueChange={(value) => setActiveGameTab(value as 'pubg' | 'pubgkr' | 'mlbb' | 'coc' | 'robux' | 'newstate' | 'freefire')} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 hidden" data-testid="game-tabs">
                          <TabsTrigger value="pubg" data-testid="tab-pubg">PUBG</TabsTrigger>
                          <TabsTrigger value="pubgkr" data-testid="tab-pubgkr">PUBG KR</TabsTrigger>
                          <TabsTrigger value="mlbb" data-testid="tab-mlbb">MLBB</TabsTrigger>
                          <TabsTrigger value="coc" data-testid="tab-coc">COC</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pubg" className="mt-8">
                          <div className="grid grid-cols-2 gap-6" data-testid="pubg-packages">
                            {packagesLoading ? (
                              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full" data-testid="loading-packages">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="animate-pulse bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl h-[200px] w-full border border-gray-700/50 shadow-md"></div>
                                ))}
                              </div>
                            ) : packagesError ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="packages-error">
                                Error loading packages: {packagesError.message}. Please try again later.
                              </div>
                            ) : !packages || packages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-packages">
                                No packages available at the moment. Please try again later.
                              </div>
                            ) : pubgpackages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-pubg-packages">
                                No PUBG Mobile packages available at the moment.
                              </div>
                            ) : (
                              pubgpackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="pubgkr" className="mt-8">
                          <div className="grid grid-cols-2 gap-6" data-testid="pubgkr-packages">
                            {packagesLoading ? (
                              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full" data-testid="loading-packages">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="animate-pulse bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl h-[200px] w-full border border-gray-700/50 shadow-md"></div>
                                ))}
                              </div>
                            ) : packagesError ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="packages-error">
                                Error loading packages: {packagesError.message}. Please try again later.
                              </div>
                            ) : !packages || packages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-packages">
                                No packages available at the moment. Please try again later.
                              </div>
                            ) : pubgkrpackages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-pubgkr-packages">
                                No PUBG Mobile KR packages available at the moment.
                              </div>
                            ) : (
                              pubgkrpackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="mlbb" className="mt-8">
                          <div className="grid grid-cols-2 gap-6" data-testid="mlbb-packages">
                            {packagesLoading ? (
                              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full" data-testid="loading-packages">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="animate-pulse bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl h-[200px] w-full border border-gray-700/50 shadow-md"></div>
                                ))}
                              </div>
                            ) : packagesError ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="packages-error">
                                Error loading packages: {packagesError.message}. Please try again later.
                              </div>
                            ) : !packages || packages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-packages">
                                No packages available at the moment. Please try again later.
                              </div>
                            ) : mlbbpackages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-mlbb-packages">
                                No Mobile Legends packages available at the moment.
                              </div>
                            ) : (
                              mlbbpackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="coc" className="mt-8">
                          <div className="grid grid-cols-2 gap-6" data-testid="coc-packages">
                            {packagesLoading ? (
                              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full" data-testid="loading-packages">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="animate-pulse bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl h-[200px] w-full border border-gray-700/50 shadow-md"></div>
                                ))}
                              </div>
                            ) : packagesError ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="packages-error">
                                Error loading packages: {packagesError.message}. Please try again later.
                              </div>
                            ) : !packages || packages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-packages">
                                No packages available at the moment. Please try again later.
                              </div>
                            ) : displayCocpackages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-coc-packages">
                                No Clash of Clans packages available at the moment.
                              </div>
                            ) : (
                              displayCocpackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="robux" className="mt-8">
                          <div className="grid grid-cols-2 gap-6" data-testid="robux-packages">
                            {packagesLoading ? (
                              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full" data-testid="loading-packages">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="animate-pulse bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl h-[200px] w-full border border-gray-700/50 shadow-md"></div>
                                ))}
                              </div>
                            ) : packagesError ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="packages-error">
                                Error loading packages: {packagesError.message}. Please try again later.
                              </div>
                            ) : !packages || packages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-packages">
                                No packages available at the moment. Please try again later.
                              </div>
                            ) : robuxpackages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-robux-packages">
                                No Roblox packages available at the moment.
                              </div>
                            ) : (
                              robuxpackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="newstate" className="mt-8">
                          <div className="grid grid-cols-2 gap-6" data-testid="newstate-packages">
                            {packagesLoading ? (
                              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full" data-testid="loading-packages">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="animate-pulse bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl h-[200px] w-full border border-gray-700/50 shadow-md"></div>
                                ))}
                              </div>
                            ) : packagesError ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="packages-error">
                                Error loading packages: {packagesError.message}. Please try again later.
                              </div>
                            ) : !packages || packages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-packages">
                                No packages available at the moment. Please try again later.
                              </div>
                            ) : newstatepackages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-newstate-packages">
                                No NEW STATE packages available at the moment.
                              </div>
                            ) : (
                              newstatepackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="freefire" className="mt-8">
                          <div className="grid grid-cols-2 gap-6" data-testid="freefire-packages">
                            {packagesLoading ? (
                              <div className="col-span-2 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full" data-testid="loading-packages">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="animate-pulse bg-gradient-to-br from-gray-800 to-gray-800/50 rounded-2xl h-[200px] w-full border border-gray-700/50 shadow-md"></div>
                                ))}
                              </div>
                            ) : packagesError ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="packages-error">
                                Error loading packages: {packagesError.message}. Please try again later.
                              </div>
                            ) : !packages || packages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-packages">
                                No packages available at the moment. Please try again later.
                              </div>
                            ) : freefirepackages.length === 0 ? (
                              <div className="col-span-2 text-center text-muted-foreground" data-testid="no-freefire-packages">
                                No FREE FIRE packages available at the moment.
                              </div>
                            ) : (
                              freefirepackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : (
                    <Tabs value={activeServiceTab} onValueChange={setActiveServiceTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-5 bg-gray-900 border border-gray-700 rounded-2xl p-2">
                        <TabsTrigger value="tiktok" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-pink-500 text-pink-400 rounded-xl">
                          <i className="fab fa-tiktok text-lg"></i>
                        </TabsTrigger>
                        <TabsTrigger value="youtube" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-500 text-red-400 rounded-xl">
                          <i className="fab fa-youtube text-lg"></i>
                        </TabsTrigger>
                        <TabsTrigger value="facebook" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 text-blue-400 rounded-xl">
                          <i className="fab fa-facebook text-lg"></i>
                        </TabsTrigger>
                        <TabsTrigger value="instagram" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-rose-500 text-rose-400 rounded-xl">
                          <i className="fab fa-instagram text-lg"></i>
                        </TabsTrigger>
                        <TabsTrigger value="subscriptions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-500 text-purple-400 rounded-xl">
                          <i className="fas fa-star text-lg"></i>
                        </TabsTrigger>
                      </TabsList>

                      {/* TikTok Tab Content */}
                      <TabsContent value="tiktok" className="space-y-6 mt-6">
                        {tiktokCoinspackages.length > 0 && (
                          <div>
                            <h4 className="text-xl font-bold text-pink-400 mb-4 flex items-center"><i className="fas fa-coins mr-2"></i>TikTok Coins</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {tiktokCoinspackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {tiktokFollowerspackages.length > 0 && (
                          <div>
                            <h4 className="text-xl font-bold text-pink-400 mb-4 flex items-center"><i className="fas fa-user-friends mr-2"></i>TikTok Followers</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {tiktokFollowerspackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {tiktokViewspackages.length > 0 && (
                          <div>
                            <h4 className="text-xl font-bold text-pink-400 mb-4 flex items-center"><i className="fas fa-video mr-2"></i>TikTok Monetization Views</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {tiktokViewspackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* YouTube Tab Content */}
                      <TabsContent value="youtube" className="space-y-6 mt-6">
                        {youtubeSubspackages.length > 0 && (
                          <div>
                            <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center"><i className="fas fa-users mr-2"></i>YouTube Subscribers</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {youtubeSubspackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {youtubeWatchTimepackages.length > 0 && (
                          <div>
                            <h4 className="text-xl font-bold text-red-400 mb-4 flex items-center"><i className="fas fa-hourglass-end mr-2"></i>YouTube Watch Time</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {youtubeWatchTimepackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* Facebook Tab Content */}
                      <TabsContent value="facebook" className="space-y-6 mt-6">
                        {facebookpackages.length > 0 && (
                          <div>
                            <h4 className="text-xl font-bold text-blue-400 mb-4 flex items-center"><i className="fas fa-thumbs-up mr-2"></i>Facebook Likes & Followers</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {facebookpackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* Instagram Tab Content */}
                      <TabsContent value="instagram" className="space-y-6 mt-6">
                        {instagrampackages.length > 0 && (
                          <div>
                            <h4 className="text-xl font-bold text-rose-400 mb-4 flex items-center"><i className="fas fa-heart mr-2"></i>Instagram Followers</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {instagrampackages.map((pkg) => (
                                <PackageCard
                                  key={pkg.id}
                                  package={pkg}
                                  onPurchase={() => handlePurchaseClick(pkg)}
                                  data-testid={`package-card-${pkg.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      {/* Subscriptions Tab Content */}
                      <TabsContent value="subscriptions" className="space-y-8 mt-6">
                        {/* SEO Header Section */}
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ duration: 0.4 }}
                          className="mb-8 text-center"
                          data-section="subscription-offerings"
                          role="region"
                          aria-label="Premium Subscription Services and Entertainment packages"
                        >
                          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-3">
                            Premium Subscriptions
                          </h2>
                          <p className="text-slate-300 text-lg max-w-3xl mx-auto">
                            Unlock unlimited access to premium entertainment and productivity services. Stream, create, and enjoy with our curated subscription packages.
                          </p>
                        </motion.div>

                        {netflixpackages.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} data-service="netflix">
                            <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-red-900/20 via-red-800/10 to-transparent border border-red-500/20 p-6 shadow-lg hover:shadow-red-500/20 transition-all">
                              <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 rounded-full blur-3xl"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                  <i className="fas fa-play-circle text-red-400 text-2xl"></i>
                                  <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-300">Netflix Premium</h3>
                                </div>
                                <p className="text-sm text-slate-300 ml-11">Stream unlimited movies, TV shows, documentaries, and more in 4K resolution</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {netflixpackages.map((pkg, idx) => (
                                <motion.div key={pkg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} whileHover={{ scale: 1.05, y: -4 }} data-product="netflix-subscription">
                                  <PackageCard
                                    package={pkg}
                                    onPurchase={() => handlePurchaseClick(pkg)}
                                    data-testid={`package-card-${pkg.id}`}
                                  />
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                        {canvapackages.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} data-service="canva">
                            <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/20 via-blue-800/10 to-transparent border border-blue-500/20 p-6 shadow-lg hover:shadow-blue-500/20 transition-all">
                              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                  <i className="fas fa-palette text-blue-400 text-2xl"></i>
                                  <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">Canva Pro</h3>
                                </div>
                                <p className="text-sm text-slate-300 ml-11">Create stunning designs, graphics, presentations, and marketing materials with AI-powered tools</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {canvapackages.map((pkg, idx) => (
                                <motion.div key={pkg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} whileHover={{ scale: 1.05, y: -4 }} data-product="canva-subscription">
                                  <PackageCard
                                    package={pkg}
                                    onPurchase={() => handlePurchaseClick(pkg)}
                                    data-testid={`package-card-${pkg.id}`}
                                  />
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </motion.div>
              )}
            </div>

            </div>
            {/* Tournament Section */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`mt-12 ${activeSection === 'tournaments' ? 'block animate-in fade-in' : 'hidden'}`}
              data-testid="tournament-section"
            >
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">
                    Competitive Arena
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-cyan-300 to-fuchsia-300">
                    <i className="fas fa-trophy mr-3"></i>
                    TOURNAMENT SECTION
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                    PUBG Mobile tournament registration is live with admin-set entry fee, team roster submission, private match rooms, results, and rankings.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="relative overflow-hidden border-2 border-amber-400/40 bg-slate-900/80 px-6 py-3 font-bold text-amber-200 shadow-lg transition-all duration-300 hover:border-amber-300 hover:text-amber-100 hover:shadow-amber-500/20"
                  onClick={() => handleTournamentAction('PUBG Mobile Arena', 'register')}
                  data-testid="button-tournament-notify"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <i className="fas fa-gamepad"></i>
                    {isArenaRegistrationOpen
                      ? t('participate_now')
                      : t('view_tournament')}
                  </span>
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)]">
                {activeTournamentSubscription && (
                  <Card className="border border-emerald-400/20 bg-emerald-950/20 p-5 shadow-2xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Active Subscription</p>
                        <h3 className="mt-2 text-2xl font-extrabold text-white">{packages?.find(p => p.id === activeTournamentSubscription.packageId)?.name || 'PUBG Tournament Subscription'}</h3>
                        <p className="mt-1 text-sm text-slate-300">Keep your PUBG Arena access active and avoid duplicate entry payments.</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                        Active since {new Date(activeTournamentSubscription.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                )}

                {pubgSubscriptionpackages.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-4 rounded-3xl border border-gradient-to-r from-cyan-400/30 to-blue-400/30 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 p-4 sm:p-8 shadow-2xl hover:shadow-cyan-500/10">
                    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-900/20 via-blue-900/20 to-transparent border border-cyan-500/20 p-4 sm:p-6">
                      <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl"></div>
                      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-lg opacity-75"></div>
                            <i className="fas fa-gamepad relative text-white text-2xl"></i>
                          </div>
                          <h3 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 leading-tight">PUBG Tournament Access</h3>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 ml-0 sm:ml-11">
                          💎 Unlock unlimited tournament participation with professional-grade subscription passes. Choose weekly for flexibility or monthly for maximum savings!
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
                      {pubgSubscriptionpackages.map((pkg, idx) => {
                        const isWeekly = pkg.name?.includes('Weekly');
                        return (
                          <motion.div
                            key={pkg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.15 }}
                            whileHover={{ y: -8 }}
                            className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-5 sm:p-6 shadow-xl transition-all duration-300 ${
                              isWeekly 
                                ? 'border-cyan-400/40 from-cyan-950/60 to-slate-950/60 hover:border-cyan-400/70 hover:shadow-cyan-500/20' 
                                : 'border-emerald-400/40 from-emerald-950/60 to-slate-950/60 hover:border-emerald-400/70 hover:shadow-emerald-500/20'
                            }`}
                          >
                            {/* Animated background gradient */}
                            <div className={`absolute inset-0 ${isWeekly ? 'bg-gradient-to-br from-cyan-500/5 to-blue-500/5' : 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5'}`}></div>
                            
                            {/* Badge */}
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: idx * 0.15 + 0.1 }}
                              className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-lg ${
                                isWeekly 
                                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              }`}
                            >
                              {isWeekly ? '⚡ Weekly' : '🏆 Monthly'}
                            </motion.div>

                            <div className="relative z-10">
                              {/* Icon */}
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isWeekly ? 'bg-cyan-500/20 border border-cyan-400/30' : 'bg-emerald-500/20 border border-emerald-400/30'}`}>
                                <i className={`fas ${isWeekly ? 'fa-bolt text-cyan-400' : 'fa-crown text-emerald-400'} text-xl`}></i>
                              </div>

                              {/* Title and Description */}
                              <h4 className={`text-2xl font-extrabold ${isWeekly ? 'text-cyan-300' : 'text-emerald-300'}`}>{pkg.name || 'PUBG Subscription'}</h4>
                              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                                {isWeekly 
                                  ? '📅 Perfect for casual players. Get weekly access to all PUBG Arena tournaments with full participation rights.' 
                                  : '📅 Best value option. Subscribe monthly for continuous access to all competitive tournaments and exclusive rewards.'}
                              </p>

                              {/* Features */}
                              <ul className="mt-4 space-y-2">
                                <li className="flex items-center gap-2 text-sm text-slate-300">
                                  <i className={`fas fa-check-circle ${isWeekly ? 'text-cyan-400' : 'text-emerald-400'}`}></i>
                                  Unlimited tournament entries
                                </li>
                                <li className="flex items-center gap-2 text-sm text-slate-300">
                                  <i className={`fas fa-check-circle ${isWeekly ? 'text-cyan-400' : 'text-emerald-400'}`}></i>
                                  {isWeekly ? '7 days' : '30 days'} of full access
                                </li>
                                <li className="flex items-center gap-2 text-sm text-slate-300">
                                  <i className={`fas fa-check-circle ${isWeekly ? 'text-cyan-400' : 'text-emerald-400'}`}></i>
                                  Priority support
                                </li>
                              </ul>

                              {/* Price */}
                              <div className="mt-6 flex items-baseline gap-2">
                                <span className={`text-4xl font-black ${isWeekly ? 'text-cyan-300' : 'text-emerald-300'}`}>
                                  {pkg.piPrice?.toFixed?.(0) ?? '—'} π
                                </span>
                                <span className="text-sm text-slate-400">
                                  {isWeekly ? 'per week' : 'per month'}
                                </span>
                              </div>

                              {/* CTA Button */}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handlepackageselect(pkg)}
                                className={`mt-6 w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 shadow-lg ${
                                  isWeekly 
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/30' 
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-500/30'
                                }`}
                              >
                                <i className={`fas ${isWeekly ? 'fa-bolt mr-2' : 'fa-crown mr-2'}`}></i>
                                Subscribe Now
                              </motion.button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {tournamentEvents.map((event, index) => (
                  <motion.article
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="group relative overflow-hidden rounded-[2rem] border border-slate-700/50 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:border-cyan-400/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.2)] hover:bg-slate-800/80"
                    data-testid={`tournament-card-${event.id}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${event.accent}`} />
                    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-80" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r ${event.accent} p-2 shadow-xl`}>
                        <img src={event.iconSrc} alt={event.game} className="h-12 w-12 rounded-xl object-contain" />
                      </div>
                      {(() => {
                        const rawStatus = String(event.status || '').toLowerCase();
                        const now = Date.now();
                        const startsAt = event.startsAtRaw ? new Date(event.startsAtRaw).getTime() : null;
                        const registrationClosesAt = event.registrationClosesAtRaw ? new Date(event.registrationClosesAtRaw).getTime() : null;

                        const isTimeOver = (registrationClosesAt && registrationClosesAt <= now) || (startsAt && startsAt <= now);
                        const isCompleted = rawStatus === 'completed' || rawStatus === 'cancelled';
                        const isInProgress = rawStatus === 'in_progress' || (isTimeOver && !isCompleted);
                        const isClosed = rawStatus === 'registration_closed';
                        const isOpen = !isTimeOver && (rawStatus === 'registration_open' || rawStatus === 'published' || rawStatus === 'live');

                        const label = isInProgress ? t('match_in_progress')
                          : isCompleted ? (rawStatus === 'cancelled' ? t('cancelled') : t('completed'))
                          : isClosed ? t('registration_closed')
                          : isOpen ? t('registration_open')
                          : event.status;
                        const badgeClass = isClosed
                          ? 'border-red-400/50 bg-red-500/15 text-red-300'
                          : isInProgress
                          ? 'border-blue-400/50 bg-blue-500/15 text-blue-200'
                          : isCompleted
                          ? 'border-slate-400/40 bg-slate-500/15 text-slate-300'
                          : 'border-emerald-300/50 bg-emerald-400/15 text-emerald-200';
                        return (
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${badgeClass}`}>
                            {label}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="relative mt-5">
                      <h3 className="text-xl font-black text-white">{event.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-cyan-200">{event.game}</p>
                    </div>

                    <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900/80 p-3 text-center border border-white/5 transition-all hover:border-slate-500/50 hover:bg-slate-800">
                        <i className="fas fa-users text-xl text-slate-400 mb-2 drop-shadow-md"></i>
                        <span className="font-bold text-white uppercase tracking-wider text-[10px] text-slate-500 mb-0.5">Format</span>
                        <span className="font-bold text-white leading-tight">{event.format}</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-amber-950/30 p-3 text-center border border-amber-500/10 transition-all hover:border-amber-500/30 hover:bg-amber-900/40">
                        <i className="fas fa-trophy text-xl text-amber-400 mb-2 drop-shadow-md"></i>
                        <span className="font-bold uppercase tracking-wider text-[10px] text-amber-500 mb-0.5">Prize Pool</span>
                        <span className="font-black text-amber-300 leading-tight">{tournamentPrizePool.toFixed(2)} Pi</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-950/30 p-3 text-center border border-emerald-500/10 transition-all hover:border-emerald-500/30 hover:bg-emerald-900/40">
                        <i className="fas fa-ticket-alt text-xl text-emerald-400 mb-2 drop-shadow-md"></i>
                        <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-500 mb-0.5">Entry Fee</span>
                        <span className="font-black text-emerald-300 leading-tight">{tournamentEntryFee} Pi</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-sky-950/30 p-3 text-center border border-sky-500/10 transition-all hover:border-sky-500/30 hover:bg-sky-900/40">
                        <i className="fas fa-broadcast-tower text-xl text-sky-400 mb-2 drop-shadow-md"></i>
                        <span className="font-bold uppercase tracking-wider text-[10px] text-sky-500 mb-0.5">Starts</span>
                        <span className="font-black text-sky-300 leading-tight">{event.startsAt}</span>
                      </div>
                      
                      {event.id === 'pubg-squad-clash' && (
                        <>
                          <div className="flex flex-col items-center justify-center rounded-2xl bg-indigo-950/30 p-3 text-center border border-indigo-500/10 transition-all hover:border-indigo-500/30 hover:bg-indigo-900/40">
                            <i className="fas fa-key text-xl text-indigo-400 mb-2 drop-shadow-md"></i>
                            <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-500 mb-0.5">Lobby Access</span>
                            <span className="font-bold text-indigo-200 leading-tight">Secret Room</span>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center rounded-2xl bg-cyan-950/30 p-3 text-center border border-cyan-500/10 transition-all hover:border-cyan-500/30 hover:bg-cyan-900/40">
                            <i className="fas fa-chart-line text-xl text-cyan-400 mb-2 drop-shadow-md"></i>
                            <span className="font-bold uppercase tracking-wider text-[10px] text-cyan-500 mb-0.5">Scoring</span>
                            <span className="font-bold text-cyan-200 leading-tight">Kills & MVP</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative mt-6">
                      {(() => {
                        const rawStatus = String(event.status || '').toLowerCase();
                        const canRegister = rawStatus === 'registration_open' || rawStatus === 'published' || rawStatus === 'live';
                        if (!canRegister) {
                          return (
                            <Button
                              className={`w-full font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] ${
                                rawStatus === 'in_progress'
                                  ? 'bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700'
                                  : 'bg-slate-700/60 text-slate-400 cursor-not-allowed opacity-60'
                              }`}
                              disabled={rawStatus !== 'in_progress'}
                              onClick={rawStatus === 'in_progress' ? () => handleTournamentAction(event.title, 'leaderboard') : undefined}
                            >
                              {rawStatus === 'in_progress' ? (
                                <><i className="fas fa-gamepad mr-2"></i>{t('match_in_progress')}</>
                              ) : rawStatus === 'registration_closed' ? t('registration_closed') :
                               rawStatus === 'completed' ? t('completed') :
                               rawStatus === 'cancelled' ? t('cancelled') : 'Unavailable'}
                            </Button>
                          );
                        }
                        return (
                          <Button
                            className={`w-full bg-gradient-to-r ${event.accent} font-bold text-white shadow-lg transition-all duration-300 hover:scale-[1.02]`}
                            onClick={() => handleTournamentAction(event.title, 'register')}
                            data-testid={`button-register-${event.id}`}
                          >
                            {t('participate_now')}
                          </Button>
                        );
                      })()}
                    </div>
                  </motion.article>
                ))}
              </div>

            </motion.section>

          </div>

          {/* Sidebar */}
          <div className={`space-y-8 ${['home', 'wallet'].includes(activeSection) ? 'block animate-in fade-in slide-in-from-right-8' : 'hidden'}`} data-testid="dashboard-sidebar">
            {/* Recent Purchases Feed - Social Proof */}
            <div className={activeSection === 'home' ? 'block' : 'hidden'}><RecentPurchasesFeed /></div>

            {/* User Tokens */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card data-testid="user-tokens" className={`relative overflow-hidden bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 border-gradient-to-r from-yellow-500/30 to-amber-500/30 shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:-translate-y-2 backdrop-blur-sm ${activeSection === 'wallet' ? 'block' : 'hidden'}`} style={{ display: activeSection === 'wallet' ? 'block' : 'none' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/5 via-amber-600/5 to-orange-600/5" />
                <CardHeader className="pb-4 relative">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <motion.div 
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 flex items-center justify-center mr-4 shadow-lg"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <i className="fas fa-coins text-white text-xl"></i>
                      </motion.div>
                      <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300">
                        Your Tokens
                      </span>
                    </div>
                    <motion.div 
                      className="w-4 h-4 rounded-full bg-green-500 shadow-lg"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-center py-4">
                    <div className="relative inline-block">
                      <motion.p 
                        className="text-5xl font-black text-yellow-400 drop-shadow-2xl"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                      >
                        <AnimatedCounter 
                          targetValue={userTokens} 
                          duration={2}
                        />
                      </motion.p>
                      <motion.div 
                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center shadow-xl"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      >
                        <i className="fas fa-plus text-white text-sm font-bold"></i>
                      </motion.div>
                    </div>
                    <p className="text-base text-gray-300 mt-3 font-semibold">Tokens Available</p>
                    <div className="mt-6 space-y-3">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full relative overflow-hidden bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border-2 border-yellow-500/50 text-yellow-300 hover:text-yellow-100 hover:border-yellow-400 font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-yellow-500/30 transition-all duration-300 group"
                          onClick={() => {
                            // Scroll to ads section or trigger ads
                            const quickActionsSection = document.querySelector('[data-testid="quick-actions"]');
                            if (quickActionsSection) {
                              quickActionsSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            <i className="fas fa-plus-circle group-hover:rotate-90 transition-transform duration-300"></i>
                            Earn More Tokens
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/30 to-amber-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full relative overflow-hidden bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-2 border-purple-500/50 text-purple-300 hover:text-purple-100 hover:border-purple-400 font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-purple-500/30 transition-all duration-300 group"
                          onClick={handleRedeemTokens}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            <i className="fas fa-exchange-alt group-hover:scale-110 transition-transform duration-300"></i>
                            Redeem Tokens
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-pink-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* User Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Card data-testid="user-statistics" className={`relative overflow-hidden bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 border-gradient-to-r from-blue-500/30 to-indigo-500/30 shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:-translate-y-2 backdrop-blur-sm ${activeSection === 'wallet' ? 'block' : 'hidden'}`} style={{ display: activeSection === 'wallet' ? 'block' : 'none' }}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5" />
                <CardHeader className="pb-4 relative">
                  <CardTitle className="flex items-center">
                    <motion.div 
                      className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-4 shadow-lg"
                      whileHover={{ rotate: -10, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <i className="fas fa-chart-line text-white text-xl"></i>
                    </motion.div>
                    <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300">
                      User Statistics
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div 
                        className="bg-gradient-to-br from-gray-800/60 to-gray-700/60 rounded-2xl p-4 border-2 border-gray-600/50 hover:border-blue-500/60 transition-all duration-500 hover:shadow-lg hover:shadow-blue-500/20"
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center">
                          <motion.div 
                            className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/30 to-blue-600/30 flex items-center justify-center mr-3 border border-blue-500/50"
                            whileHover={{ rotate: 15 }}
                          >
                            <i className="fas fa-exchange-alt text-blue-400 text-base"></i>
                          </motion.div>
                          <div>
                            <p className="text-sm text-gray-400 font-medium">Total Transactions</p>
                            <p className="text-xl font-black text-white">{transactions?.length || 0}</p>
                          </div>
                        </div>
                      </motion.div>
                      <motion.div 
                        className="bg-gradient-to-br from-gray-800/60 to-gray-700/60 rounded-2xl p-4 border-2 border-gray-600/50 hover:border-green-500/60 transition-all duration-500 hover:shadow-lg hover:shadow-green-500/20"
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center">
                          <motion.div 
                            className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500/30 to-green-600/30 flex items-center justify-center mr-3 border border-green-500/50"
                            whileHover={{ rotate: 15 }}
                          >
                            <i className="fas fa-check-circle text-green-400 text-base"></i>
                          </motion.div>
                          <div>
                            <p className="text-sm text-gray-400 font-medium">Completed</p>
                            <p className="text-xl font-black text-green-400">{completedTransactions}</p>
                          </div>
                        </div>
                      </motion.div>
                      <motion.div 
                        className="bg-gradient-to-br from-gray-800/60 to-gray-700/60 rounded-2xl p-4 border-2 border-gray-600/50 hover:border-purple-500/60 transition-all duration-500 hover:shadow-lg hover:shadow-purple-500/20"
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center">
                          <motion.div 
                            className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500/30 to-purple-600/30 flex items-center justify-center mr-3 border border-purple-500/50"
                            whileHover={{ rotate: 15 }}
                          >
                            <i className="fas fa-coins text-purple-400 text-base"></i>
                          </motion.div>
                          <div>
                            <p className="text-sm text-gray-400 font-medium">Total Spent</p>
                            <p className="text-xl font-black text-purple-400">{totalSpent.toFixed(2)} π</p>
                          </div>
                        </div>
                      </motion.div>
                      {hasPiNetworkPurchase && (
                      <motion.div 
                        className="bg-gradient-to-br from-gray-800/60 to-gray-700/60 rounded-2xl p-4 border-2 border-gray-600/50 hover:border-cyan-500/60 transition-all duration-500 hover:shadow-lg hover:shadow-cyan-500/20"
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <motion.div 
                              className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 flex items-center justify-center mr-3 border border-cyan-500/50"
                              whileHover={{ rotate: 15 }}
                            >
                              <img 
                                src="https://b4uesports.com/wp-content/uploads/2025/10/piwalletlogob4uesports.png" 
                                alt="PI Wallet" 
                                className="w-7 h-7"
                              />
                            </motion.div>
                            <div>
                              <p className="text-sm text-gray-400 font-medium">{t('pi_balance')}</p>
                              <p className="text-xl font-black text-cyan-400">
                                {isBalanceHidden ? '•••••' : (walletBalance !== null ? walletBalance.toFixed(2) : 'N/A')} π
                              </p>
                            </div>
                          </div>
                          {user?.walletAddress && (
                            <motion.button 
                              onClick={handleRefreshPiBalance}
                              className="text-cyan-400 hover:text-cyan-300 transition-colors p-2 rounded-full hover:bg-cyan-500/20"
                              title="Refresh Pi Balance"
                              disabled={isFetchingBalance}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <i className={`fas fa-sync-alt text-lg ${isFetchingBalance ? 'animate-spin' : ''}`}></i>
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                      )}
                    </div>
                    
                    {/* Balance Visibility Toggle - only show after first purchase */}
                    {hasPiNetworkPurchase && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center">
                      <i className="fas fa-info-circle text-gray-500 text-sm mr-2"></i>
                      <p className="text-xs text-gray-500">
                        {walletBalance !== null 
                          ? "Balance updated from blockchain" 
                          : "Connect wallet to see actual Pi balance"}
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                      className="text-gray-500 hover:text-white transition-colors"
                      aria-label={isBalanceHidden ? "Show balance" : "Hide balance"}
                    >
                      {isBalanceHidden ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                    )}
                  
                  {/* Recent Transaction IDs */}
                  <div className="pt-3 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                      <i className="fas fa-receipt text-gray-500 mr-2"></i>
                      Recent Transaction IDs
                    </h4>
                    {filteredAndSortedTransactions && filteredAndSortedTransactions.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        {filteredAndSortedTransactions.map((tx, index) => (
                          <div key={tx.id} className="flex justify-between items-center text-xs bg-gray-800/30 rounded p-2 hover:bg-gray-800/50 transition-colors">
                            <span className="text-gray-400">#{index + 1}:</span>
                            <span className="font-mono text-gray-300 truncate ml-2" title={tx.paymentId}>{tx.paymentId.substring(0, 8)}...{tx.paymentId.substring(tx.paymentId.length - 8)}</span>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(tx.paymentId);
                                toast({
                                  title: t('copied'),
                                  description: "Payment ID copied to clipboard",
                                });
                              }}
                              className="text-blue-500 hover:text-blue-700 ml-2"
                              title="Copy full Payment ID"
                            >
                              <CopyIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">{t('no_transactions')}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* ── {t('platform_stats')} — modern glassmorphism ── */}
            <div data-testid="platform-statistics" className={`${activeSection === 'home' ? 'block' : 'hidden'}`} style={{ display: activeSection === 'home' ? 'block' : 'none' }}>
              <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 shadow-xl p-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"/>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                    <i className="fas fa-globe-americas text-purple-400 text-sm"></i>
                  </div>
                  <p className="text-sm font-black text-white">{t('platform_stats')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-3">
                    <div className="absolute top-1 right-1 h-8 w-8 bg-purple-500/10 rounded-full blur-xl"/>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t('total_users')}</p>
                    <p className="text-2xl font-black text-purple-300">{totalUsers !== null ? totalUsers.toLocaleString() : '—'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <i className="fas fa-users text-purple-500 text-[9px]"></i>
                      <span className="text-[9px] text-slate-600">{t('registered')}</span>
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-3">
                    <div className="absolute top-1 right-1 h-8 w-8 bg-blue-500/10 rounded-full blur-xl"/>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t('total_transactions')}</p>
                    <p className="text-2xl font-black text-blue-300">{totalPlatformTransactions !== null ? totalPlatformTransactions.toLocaleString() : '—'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <i className="fas fa-shopping-cart text-blue-500 text-[9px]"></i>
                      <span className="text-[9px] text-slate-600">{t('completed')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Watch Ad & Earn B4UT — premium card ── */}
            <div data-testid="quick-actions" className={`${activeSection === 'home' ? 'block' : 'hidden'}`} style={{ display: activeSection === 'home' ? 'block' : 'none' }}>
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-slate-900/95 to-slate-950 shadow-xl shadow-amber-500/5 p-4">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/8 rounded-full blur-3xl pointer-events-none"/>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none"/>
                <div className="relative flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                    <i className="fas fa-coins text-amber-300 text-base"></i>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{t('earn_b4ut')}</p>
                    <p className="text-[10px] text-amber-400/60">Watch an ad · Get rewarded instantly</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"/>
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">+10 B4UT</span>
                  </div>
                </div>
                <div className="relative grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: 'fas fa-play-circle', label: 'Watch', sub: 'Short ad', color: 'text-amber-400' },
                    { icon: 'fas fa-bolt', label: 'Instant', sub: 'No delay', color: 'text-yellow-400' },
                    { icon: 'fas fa-coins', label: '+10 B4UT', sub: 'Per view', color: 'text-amber-300' },
                  ].map(({ icon, label, sub, color }) => (
                    <div key={label} className="rounded-xl bg-slate-900/60 border border-slate-700/40 p-2 text-center">
                      <i className={`${icon} ${color} text-base mb-1 block`}></i>
                      <p className={`text-[11px] font-black ${color}`}>{label}</p>
                      <p className="text-[9px] text-slate-600">{sub}</p>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <AdsButton
                    onReward={(rewardAmount) => {
                      refreshUser().then((freshUser) => {
                        if (freshUser) {
                          setUserTokens(freshUser.tokens || 0);
                          setLastTokenUpdate(Date.now());
                          toast({ title: '🎉 B4UT Earned!', description: `+${rewardAmount} B4U Esports Token added. Total: ${freshUser.tokens || 0} B4UT` });
                        } else {
                          const n = userTokens + rewardAmount;
                          setUserTokens(n);
                          setLastTokenUpdate(Date.now());
                          toast({ title: '🎉 B4UT Earned!', description: `+${rewardAmount} B4U Esports Token added. Total: ${n} B4UT` });
                        }
                      }).catch(() => {
                        const n = userTokens + rewardAmount;
                        setUserTokens(n);
                        setLastTokenUpdate(Date.now());
                        toast({ title: '🎉 B4UT Earned!', description: `+${rewardAmount} B4U Esports Token added.` });
                      });
                    }}
                  />
                </div>
              </div>
            </div>
            {/* Pi Ecosystem Directory Staking Booster */}
            <Card data-testid="pi-staking-card" className="bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-900 border border-amber-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 flex items-center justify-center mr-3 shadow-md shadow-amber-500/20">
                      <Sparkles className="text-white h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                        Ecosystem Directory Staking
                      </span>
                      <p className="text-xs text-amber-400/80 font-normal">Support B4U Esports & Unlock VIP Pioneer Perks</p>
                    </div>
                  </CardTitle>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                    stakingData?.hasStaked 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {stakingData?.hasStaked ? `${stakingData.userStake?.tier || 'VIP'} Staker` : 'Standard Pioneer'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Stake your Pi to boost B4U Esports in the official <span className="text-amber-300 font-medium">Pi Browser Ecosystem Directory</span>. Active stakers receive exclusive in-app perks, storewide package discounts, and extra B4UT token rewards.
                </p>

                {stakingData?.hasStaked && stakingData.userStake ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-5 w-5 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-400">Store Discount</div>
                        <div className="text-sm font-bold text-amber-200">
                          {stakingData.userStake.loyaltyDiscountPercent}% Off Top-Ups
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Award className="h-5 w-5 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-400">Ad Bonus</div>
                        <div className="text-sm font-bold text-amber-200">
                          +{stakingData.userStake.bonusTokensPerAd} B4UT / Ad
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <TrendingUp className="h-4 w-4 text-amber-400" />
                      Directory Staking Tier Rewards:
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-700">
                        <div className="font-bold text-slate-200">Silver</div>
                        <div className="text-[11px] text-amber-300/90 font-mono">10+ Pi</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">2% off • +2 B4UT</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-amber-500/30">
                        <div className="font-bold text-amber-400">Gold</div>
                        <div className="text-[11px] text-amber-300/90 font-mono">50+ Pi</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">5% off • +5 B4UT</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-cyan-500/30">
                        <div className="font-bold text-cyan-300">Diamond</div>
                        <div className="text-[11px] text-amber-300/90 font-mono">200+ Pi</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">10% off • +10 B4UT</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-semibold shadow-md"
                    onClick={() => setIsStakingModalOpen(true)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {stakingData?.hasStaked ? 'View Staking Details' : 'How to Stake Pi'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 hover:bg-slate-800 text-slate-300"
                    onClick={async () => {
                      const shareTitle = "Support B4U Esports on Pi Network!";
                      const shareMsg = "Check out B4U Esports in the Pi Browser Ecosystem Directory! Stake Pi to support our app and unlock exclusive game package discounts: https://minepi.com";
                      await piSDK.openShareDialog(shareTitle, shareMsg);
                    }}
                  >
                    <Share2Icon className="mr-2 h-4 w-4 text-amber-400" />
                    Share Directory Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Staking Info Modal */}
            <Dialog open={isStakingModalOpen} onOpenChange={setIsStakingModalOpen}>
              <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-lg bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-6">
                <DialogHeader className="border-b border-slate-800 pb-3">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-300">
                    <Sparkles className="h-5 w-5 text-amber-400" />
                    Pi Ecosystem Directory Staking
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 text-sm text-slate-300">
                  <p>
                    Pi Network recently introduced <span className="text-amber-300 font-semibold">Ecosystem Directory Staking</span>, allowing Pioneers to stake Pi to support community apps.
                  </p>
                  <div className="bg-slate-800/80 rounded-lg p-3.5 border border-slate-700 space-y-2">
                    <div className="font-semibold text-white text-xs tracking-wider uppercase">How It Works:</div>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                      <li>Open <span className="text-amber-300">Pi Browser</span> and navigate to the Ecosystem App Directory.</li>
                      <li>Search for <span className="text-amber-300 font-medium">B4U Esports</span> in the directory listings.</li>
                      <li>Tap <span className="text-amber-300 font-medium">Stake Pi</span> to pledge Pi to support our ranking and growth.</li>
                      <li>Return here — our server queries the <span className="font-mono text-[11px] text-amber-200">Pi Staking API</span> to immediately grant VIP discounts and bonus tokens!</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold text-white text-xs tracking-wider uppercase">Pioneer Staking Tiers & Perks:</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700 text-center">
                        <div className="font-bold text-slate-200">Silver Tier</div>
                        <div className="text-amber-400 font-mono text-xs">10+ Pi</div>
                        <div className="text-[11px] text-slate-400 mt-1">2% off top-ups<br/>+2 B4UT per ad</div>
                      </div>
                      <div className="bg-slate-800/60 p-2.5 rounded-lg border border-amber-500/40 text-center">
                        <div className="font-bold text-amber-300">Gold Tier</div>
                        <div className="text-amber-400 font-mono text-xs">50+ Pi</div>
                        <div className="text-[11px] text-slate-400 mt-1">5% off top-ups<br/>+5 B4UT per ad</div>
                      </div>
                      <div className="bg-slate-800/60 p-2.5 rounded-lg border border-cyan-500/40 text-center">
                        <div className="font-bold text-cyan-300">Diamond Tier</div>
                        <div className="text-amber-400 font-mono text-xs">200+ Pi</div>
                        <div className="text-[11px] text-slate-400 mt-1">10% off top-ups<br/>+10 B4UT per ad</div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold"
                      onClick={() => {
                        window.open('https://minepi.com', '_blank');
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Pi Directory
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-700 text-slate-300"
                      onClick={() => setIsStakingModalOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Card className="border-slate-700 bg-slate-900/80">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">Share tournament media</p>
                  <p className="text-sm text-slate-400">Share a video clip, image, or receipt from Pi Browser.</p>
                </div>
                <PiFileShare />
              </CardContent>
            </Card>
            {/* {t('referral_program')} */}
            <Card data-testid="referral-program" className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center mr-3">
                    <i className="fas fa-user-friends text-white text-lg"></i>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-teal-400">
                    {t('referral_program')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-800/50 rounded-lg p-4">
                  <p className="text-sm text-green-300 flex items-start">
                    <i className="fas fa-gift text-green-400 mr-2 mt-1"></i>
                    <span>Invite friends to B4U Esports and earn <span className="font-bold">25 B4U Esports Token</span> for each successful referral!</span>
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Dialog open={isReferralDialogOpen} onOpenChange={setIsReferralDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
                        <Share2Icon className="mr-2 h-4 w-4" />
                        {t('generate_link')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-md bg-white rounded-xl shadow-2xl border-0">
                      <DialogHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-t-xl -m-4 mb-4">
                        <DialogTitle className="text-xl font-bold flex items-center">
                          <Share2Icon className="mr-2 h-5 w-5" />
                          Share Your {t('referral_link')}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="referral-code" className="text-sm font-medium text-gray-700">
                            Your Referral Code
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="referral-code"
                              value={user?.referralCode || (user ? 'Generating your referral code...' : 'Loading...')}
                              readOnly
                              className="flex-1 font-mono"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={async () => {
                                if (user?.referralCode) {
                                  await piSDK.copyText(user.referralCode);
                                  toast({
                                    title: t('copied'),
                                    description: "Referral code copied to clipboard",
                                  });
                                }
                              }}
                              disabled={!user?.referralCode}
                            >
                              <CopyIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            {t('referral_link')}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              value={user?.referralCode ? `${window.location.origin}?ref=${user.referralCode}` : (user ? `${t('loading')}` : t('loading'))}
                              readOnly
                              className="flex-1 font-mono text-xs"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={async () => {
                                if (user?.referralCode) {
                                  await piSDK.copyText(`${window.location.origin}?ref=${user.referralCode}`);
                                  toast({
                                    title: t('copied'),
                                    description: `${t('referral_link')} copied to clipboard`,
                                  });
                                }
                              }}
                              disabled={!user?.referralCode}
                            >
                              <CopyIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {user?.referralCode && (
                          <Button
                            type="button"
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-3 flex items-center justify-center gap-2 shadow-md"
                            onClick={async () => {
                              const shareTitle = "Join B4U Esports on Pi Network!";
                              const shareMsg = `🎮 Top up gaming packages with Pi on B4U Esports! Use my referral code: ${user.referralCode} to get 25 bonus tokens.\n\nPlay now: ${window.location.origin}?ref=${user.referralCode}`;
                              await piSDK.openShareDialog(shareTitle, shareMsg);
                            }}
                          >
                            <Share2Icon className="h-4 w-4" />
                            Share via Pi Browser (Native)
                          </Button>
                        )}
                        
                        {(!user?.referralCode) && (
                          <div className="text-sm text-muted-foreground">
                            <p className="mb-2">Generating your referral code...</p>
                            <p>If this takes too long, try refreshing your profile:</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={async () => {
                                try {
                                  await refreshUser();
                                  toast({
                                    title: "Profile Refreshed",
                                    description: "Your profile data has been updated.",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Refresh Failed",
                                    description: "Failed to refresh profile data. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Refresh Profile
                            </Button>
                          </div>
                        )}
                        
                        <div className="pt-2 text-xs text-muted-foreground">
                          <p className="mb-1"><strong>How it works:</strong></p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Share your {t('referral_link')} with friends</li>
                            <li>They sign up using your link</li>
                            <li>They complete their profile</li>
                            <li>You earn 25 B4U Esports Token for each successful referral!</li>
                          </ol>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {user?.referralCode && (
                    <Button
                      variant="outline"
                      className="border-green-600/50 hover:bg-green-950/40 text-green-300"
                      onClick={async () => {
                        const shareTitle = "Join B4U Esports on Pi Network!";
                        const shareMsg = `🎮 Top up gaming packages with Pi on B4U Esports! Use my referral code: ${user.referralCode} to get 25 bonus tokens: ${window.location.origin}?ref=${user.referralCode}`;
                        await piSDK.openShareDialog(shareTitle, shareMsg);
                      }}
                    >
                      <Share2Icon className="mr-2 h-4 w-4 text-green-400" />
                      Quick Share
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Giveaway & Rewards */}
            <Card data-testid="giveaway-card" className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center mr-3 animate-pulse">
                    <i className="fas fa-gift text-white text-lg"></i>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-400">
                    Giveaways & Rewards
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-4">
                  <div className="bg-purple-900/50 border-l-4 border-purple-500 p-4 rounded-lg">
                    <p className="text-sm text-purple-200 flex items-start">
                      <i className="fas fa-star text-purple-400 mr-2 mt-1 flex-shrink-0"></i>
                      <span>🎁 <span className="font-bold">Coming Soon!</span> Win amazing prizes and exclusive rewards!</span>
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => setLocation('/giveaway')}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <i className="fas fa-arrow-right mr-2"></i>
                    View Giveaways
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-800/50 rounded p-2 text-center">
                      <i className="fas fa-trophy text-yellow-400 mb-1 block text-lg"></i>
                      <span className="text-gray-300">Daily Prizes</span>
                    </div>
                    <div className="bg-gray-800/50 rounded p-2 text-center">
                      <i className="fas fa-star text-purple-400 mb-1 block text-lg"></i>
                      <span className="text-gray-300">Exclusive</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="feedback-card" className={`bg-gradient-to-br from-cyan-900/40 to-blue-900/40 border-2 border-cyan-500/40 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden relative ${activeSection === 'home' ? 'block' : 'hidden'}`} style={{ display: activeSection === 'home' ? 'block' : 'none' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full -mr-16 -mt-16"></div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center mr-3">
                      <i className="fas fa-comments text-white text-lg"></i>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-300">
                      {t('real_user_feedback')}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-4">
                  {/* Average Rating Display */}
                  {feedbacks.length > 0 && (
                    <div className="bg-cyan-900/40 border-l-4 border-cyan-400 p-3 rounded-lg">
                      <p className="text-sm text-cyan-100 flex items-center">
                        <i className="fas fa-star text-yellow-400 mr-2"></i>
                        <span>Average: <span className="font-bold text-yellow-300">{feedbackAverageRating.toFixed(1)}</span> ({feedbacks.length} reviews)</span>
                      </p>
                    </div>
                  )}
                  
                  {/* Feedback Form Toggle */}
                  {!showFeedbackForm ? (
                    <Button
                      onClick={() => setShowFeedbackForm(true)}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <i className="fas fa-comment-dots mr-2"></i>
                      {t('share_feedback')}
                    </Button>
                  ) : (
                    <div className="space-y-3 bg-gray-900/50 p-3 rounded-lg border border-cyan-500/20">
                      {/* Token reward hint */}
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <i className="fas fa-coins text-amber-400 text-xs"></i>
                        <p className="text-xs text-amber-300 font-medium">You'll earn <span className="font-black">+10 B4U Esports Token</span> for submitting feedback</p>
                      </div>
                      {/* Star Rating Input */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Rating</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setFeedbackRating(value)}
                              className={`text-2xl transition-all ${value <= feedbackRating ? 'text-yellow-400' : 'text-white/40'} hover:text-yellow-300`}
                            >
                              <i className="fas fa-star"></i>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment Input */}
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Comment</p>
                        <Textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Tell us what you think..."
                          rows={3}
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                        />
                      </div>

                      {/* Submit Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createFeedbackMutation.mutate()}
                          disabled={feedbackRating === 0 || feedbackComment.trim().length === 0 || createFeedbackMutation.isPending}
                          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm h-8"
                        >
                          {createFeedbackMutation.isPending ? 'Sending...' : 'Submit'}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowFeedbackForm(false);
                            setFeedbackRating(0);
                            setFeedbackComment('');
                          }}
                          variant="outline"
                          className="flex-1 border-gray-700 text-gray-300 text-sm h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Recent Feedback Display */}
                  {feedbacksLoading ? (
                    <div className="text-sm text-gray-400 text-center py-4">Loading feedback...</div>
                  ) : feedbacks.length > 0 && !showFeedbackForm ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      <p className="text-xs text-gray-500 font-semibold sticky top-0 bg-transparent backdrop-blur-md p-2 rounded z-10">{t('latest_feedback')}</p>
                      {feedbacks.slice(0, 10).map((item, index) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          key={item.id} 
                          className="bg-gray-900/80 rounded-2xl p-4 border border-gray-800/80 shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <img
                              src={item.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username || 'user'}`}
                              alt={item.username || 'Anonymous'}
                              className="w-10 h-10 rounded-full shadow-md shrink-0 bg-slate-800 object-cover"
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-100 text-sm leading-tight">{item.username}</h4>
                              <p className="text-[10px] text-gray-500">{new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="flex gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <i
                                key={value}
                                className={`fas fa-star text-[10px] ${value <= item.rating ? 'text-yellow-400' : 'text-gray-700'}`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed italic">"{item.comment || 'No comment provided.'}"</p>
                          <div className="flex justify-end mt-2 pt-2 border-t border-gray-800/50">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30"
                              onClick={() => setLocation('/feedback')}
                            >
                              <i className="fas fa-reply mr-1"></i> Edit / Reply
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                      {feedbacks.length > 10 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-cyan-400 hover:text-cyan-300 text-xs h-9 bg-gray-900/40 rounded-xl"
                          onClick={() => setLocation('/feedback')}
                        >
                          {t('show_all_reviews')}
                        </Button>
                      )}
                    </div>
                  ) : !showFeedbackForm && feedbacks.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-comment-slash text-gray-500 text-2xl"></i>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{t('no_feedback')}</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Track Your Order */}
            <Card data-testid="track-order" className={`bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${activeSection === 'wallet' ? 'block' : 'hidden'}`} style={{ display: activeSection === 'wallet' ? 'block' : 'none' }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center mr-3">
                    <i className="fas fa-search-location text-white text-lg"></i>
                  </div>
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-400">
                    Track Your Order
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="transactionId" className="block text-sm font-medium text-gray-400 mb-1">
                      Enter Transaction ID
                    </label>
                    <input
                      type="text"
                      id="transactionId"
                      placeholder="Enter your transaction ID"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                      value={trackTransactionId}
                      onChange={(e) => setTrackTransactionId(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleTrackOrder}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                    disabled={!trackTransactionId.trim() || isTracking}
                  >
                    {isTracking ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> Tracking...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search mr-2"></i> Track Order
                      </>
                    )}
                  </Button>
                  
                  {trackResult && (
                    <div className="mt-4 p-4 bg-gray-800/80 rounded-xl border border-gray-700 shadow-inner">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-amber-300 flex items-center gap-2">
                          <i className="fas fa-radar text-amber-400"></i> Live Order Tracker
                        </h4>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                          trackResult.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          trackResult.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse' :
                          trackResult.status === 'refunded' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                          'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {trackResult.status === 'completed' ? 'Delivered ✅' :
                           trackResult.status === 'pending' ? 'Processing ⏳' :
                           trackResult.status === 'refunded' ? 'Refunded 💸' : trackResult.status}
                        </span>
                      </div>

                      {/* 3-Step Live Progress Tracker */}
                      <div className="my-4 px-2">
                        <div className="flex items-center justify-between relative">
                          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-700 -translate-y-1/2 -z-0" />
                          <div
                            className={`absolute top-1/2 left-0 h-1 bg-gradient-to-r from-amber-500 to-green-500 -translate-y-1/2 transition-all duration-500 -z-0 ${
                              trackResult.status === 'completed' ? 'w-full' :
                              trackResult.status === 'pending' ? 'w-1/2' : 'w-1/4'
                            }`}
                          />
                          {/* Step 1 */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shadow">
                              ✓
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1">Created</span>
                          </div>
                          {/* Step 2 */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow ${
                              trackResult.status === 'completed' || trackResult.txid ? 'bg-green-500 text-white' : 'bg-amber-500 text-white animate-pulse'
                            }`}>
                              {trackResult.status === 'completed' || trackResult.txid ? '✓' : '2'}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1">Verified</span>
                          </div>
                          {/* Step 3 */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow ${
                              trackResult.status === 'completed' ? 'bg-green-500 text-white' :
                              trackResult.status === 'refunded' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>
                              {trackResult.status === 'completed' ? '✓' : trackResult.status === 'refunded' ? '↩' : '3'}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1">{trackResult.status === 'refunded' ? 'Refunded' : 'Delivered'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Order ID:</span>
                          <span className="font-mono text-gray-300">#{trackResult.id.slice(0, 10)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount:</span>
                          <span className="text-amber-300 font-semibold">{trackResult.piAmount} Pi</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="text-gray-300">{new Date(trackResult.createdAt).toLocaleString()}</span>
                        </div>
                        {trackResult.txid && (
                          <div className="flex justify-between items-center pt-1 border-t border-gray-800">
                            <span className="text-gray-400">Stellar Horizon TxID:</span>
                            <span className="font-mono text-emerald-400 text-[11px] truncate max-w-[140px]">{trackResult.txid}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {trackError && (
                    <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-md text-sm border border-red-800/50">
                      <i className="fas fa-exclamation-circle mr-2"></i>
                      {trackError}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card data-testid="recent-transactions" className={`bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl ${activeSection === 'wallet' ? 'block' : 'hidden'}`} style={{ display: activeSection === 'wallet' ? 'block' : 'none' }}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
                      <i className="fas fa-history text-white text-lg"></i>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-purple-400">
                      Recent Transactions {filteredAndSortedTransactions.length > 0 ? `(${filteredAndSortedTransactions.length})` : ''}
                    </span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl h-8 px-3 text-xs">
                        <FilterIcon className="mr-1 h-3 w-3" />
                        Filters
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-[425px] bg-white rounded-xl shadow-2xl border-0">
                      <DialogHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-t-xl -m-4 mb-4">
                        <DialogTitle className="text-xl font-bold flex items-center">
                          <FilterIcon className="mr-2 h-5 w-5" />
                          Transaction Filters
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-6 py-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              <FilterIcon className="mr-2 h-4 w-4 text-blue-500" />
                              Filter By Status
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setTransactionFilter('all')}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                  transactionFilter === 'all'
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                All Transactions
                              </button>
                              <button
                                onClick={() => setTransactionFilter('completed')}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                  transactionFilter === 'completed'
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Completed
                              </button>
                              <button
                                onClick={() => setTransactionFilter('pending')}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                  transactionFilter === 'pending'
                                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Pending
                              </button>
                              <button
                                onClick={() => setTransactionFilter('failed')}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                  transactionFilter === 'failed'
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Failed
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2 pt-2 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                              <FilterIcon className="mr-2 h-4 w-4 text-purple-500" />
                              Sort By
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => setTransactionSort('date')}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                  transactionSort === 'date'
                                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Date
                              </button>
                              <button
                                onClick={() => setTransactionSort('amount')}
                                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                  transactionSort === 'amount'
                                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                Amount
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-6">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setTransactionFilter('all');
                            setTransactionSort('date');
                          }}
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          Reset Filters
                        </Button>
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700">
                            Apply Filters
                          </Button>
                        </DialogTrigger>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                
                {transactionsLoading ? (
                  <div className="text-muted-foreground" data-testid="loading-transactions">Loading...</div>
                ) : filteredAndSortedTransactions.length === 0 ? (
                  <div className="text-muted-foreground" data-testid="no-transactions">No transactions found</div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {filteredAndSortedTransactions.map((transaction: Transaction, index: number) => (
                      <div 
                        key={transaction.id} 
                        className="border-b border-border pb-3 last:border-b-0"
                        data-testid={`transaction-${index}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">
                                {packages?.find(p => p.id === transaction.packageId)?.name ||
                                  (transaction.metadata?.type === 'tournament_entry'
                                    ? `Tournament Entry - ${transaction.metadata?.gameAccount?.tournament || 'PUBG'}`
                                    : transaction.metadata?.type === 'subscription' || transaction.paymentType === 'SUBSCRIPTION'
                                      ? transaction.metadata?.subscriptionName || transaction.metadata?.subscriptionDetails?.subscriptionName || 'PUBG Tournament Subscription'
                                    : transaction.paymentType === 'TOURNAMENT_ENTRY'
                                      ? 'Tournament Entry'
                                      : 'Unknown Package')}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                ['completed', 'approved'].includes(transaction.status) ? 'bg-green-100 text-green-800' : 
                                transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                transaction.status === 'failed' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {transaction.status === 'completed' ? '✅ Completed' : 
                                 transaction.status === 'approved' ? '✅ Approved' : 
                                 transaction.status === 'pending' ? '🔄 Pending' : 
                                 transaction.status === 'failed' ? '❌ Failed' : transaction.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(transaction.createdAt).toLocaleString()}
                            </p>
                            {transaction.txid && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  TXID: 
                                  <span className="font-mono" title={transaction.txid}>
                                    {transaction.txid.substring(0, 8)}...{transaction.txid.substring(transaction.txid.length - 8)}
                                  </span>
                                </span>
                                <button 
                                  onClick={() => {
                                    const txid = transaction.txid;
                                    if (txid) {
                                      navigator.clipboard.writeText(txid);
                                      toast({
                                        title: t('copied'),
                                        description: "TXID copied to clipboard",
                                      });
                                    }
                                  }}
                                  className="text-xs text-blue-500 hover:text-blue-700"
                                  title="Copy full TXID"
                                >
                                  <CopyIcon className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Payment ID: 
                                <span className="font-mono" title={transaction.paymentId}>
                                  {transaction.paymentId.substring(0, 8)}...{transaction.paymentId.substring(transaction.paymentId.length - 8)}
                                </span>
                              </span>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(transaction.paymentId);
                                  toast({
                                    title: t('copied'),
                                    description: "Payment ID copied to clipboard",
                                  });
                                }}
                                className="text-xs text-blue-500 hover:text-blue-700"
                                title="Copy full Payment ID"
                              >
                                <CopyIcon className="h-3 w-3" />
                              </button>
                            </div>
                            {/* Display reason for completed transactions */}
                            {transaction.status === 'completed' && transaction.successReason && (
                              <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                                <p className="font-medium">Completed:</p>
                                <p>{transaction.successReason}</p>
                              </div>
                            )}
                            
                            {/* Display failure reason for failed or cancelled transactions */}
                            {(transaction.status === 'failed' || transaction.status === 'cancelled') && transaction.failureReason && (
                              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                                <p className="font-medium">Reason:</p>
                                <p>{transaction.failureReason}</p>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-green-400 text-sm">
                              -{transaction.piAmount} π
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              1π = ${transaction.piPriceAtTime}
                            </p>
                          </div>
                        </div>
                        {/* Enhanced Status Change Timestamps */}
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p>Created: {new Date(transaction.createdAt).toLocaleString()}</p>
                          {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
                            <p>Updated: {new Date(transaction.updatedAt).toLocaleString()}</p>
                          )}
                        </div>

                        {/* Order Tracking & Explorer Action Row */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/60">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const isCurrentlyExpanded = expandedTrackingTxId === transaction.id;
                              setExpandedTrackingTxId(isCurrentlyExpanded ? null : transaction.id);
                              setTrackTransactionId(transaction.paymentId || transaction.id);
                              setTrackResult(transaction);
                              setTrackError('');
                            }}
                            className={`h-7 px-2.5 text-xs font-medium rounded-lg border transition-all duration-200 flex items-center gap-1.5 ${
                              expandedTrackingTxId === transaction.id
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                : 'bg-gray-800/70 text-gray-300 border-gray-700 hover:bg-gray-700/80 hover:text-white'
                            }`}
                            data-testid={`track-btn-${transaction.id}`}
                          >
                            <i className={`fas fa-radar text-xs ${expandedTrackingTxId === transaction.id ? 'text-amber-300 animate-spin' : 'text-amber-400'}`}></i>
                            <span>{expandedTrackingTxId === transaction.id ? 'Close Tracking' : 'Track Order'}</span>
                            {expandedTrackingTxId === transaction.id ? (
                              <ChevronUp className="h-3 w-3 ml-0.5 opacity-70" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-0.5 opacity-70" />
                            )}
                          </Button>

                          {transaction.txid && (
                            <a
                              href={`https://minepi.com/blockexplorer/tx/${transaction.txid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50 hover:text-emerald-300 transition-all duration-200"
                              title="View on Pi Blockchain Explorer"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Explorer</span>
                            </a>
                          )}

                          <span className="ml-auto text-[11px] text-muted-foreground font-mono">
                            ID: #{transaction.id.slice(0, 8)}
                          </span>
                        </div>

                        {/* Inline Live Order Delivery Progress Tracker */}
                        {expandedTrackingTxId === transaction.id && (
                          <div className="mt-3 p-3.5 bg-gray-950/90 rounded-xl border border-amber-500/30 shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
                              <h5 className="font-semibold text-xs text-amber-300 flex items-center gap-2">
                                <i className="fas fa-radar text-amber-400"></i>
                                Live Order Delivery Tracker
                              </h5>
                              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                transaction.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse' :
                                transaction.status === 'refunded' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {transaction.status === 'completed' ? 'Delivered ✅' :
                                 transaction.status === 'pending' ? 'Processing ⏳' :
                                 transaction.status === 'refunded' ? 'Refunded 💸' :
                                 transaction.status === 'failed' ? 'Failed ❌' : transaction.status}
                              </span>
                            </div>

                            {/* 3-Step Live Progress Tracker */}
                            <div className="my-3 px-3">
                              <div className="flex items-center justify-between relative">
                                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-800 -translate-y-1/2 -z-0" />
                                <div
                                  className={`absolute top-1/2 left-0 h-1 bg-gradient-to-r from-amber-500 to-green-500 -translate-y-1/2 transition-all duration-500 -z-0 ${
                                    transaction.status === 'completed' ? 'w-full' :
                                    transaction.status === 'pending' ? 'w-1/2' :
                                    transaction.status === 'failed' ? 'w-1/2' : 'w-1/4'
                                  }`}
                                />
                                {/* Step 1: Created */}
                                <div className="flex flex-col items-center relative z-10">
                                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                                    ✓
                                  </div>
                                  <span className="text-[10px] text-gray-300 mt-1 font-medium">Created</span>
                                </div>
                                {/* Step 2: Blockchain Verified */}
                                <div className="flex flex-col items-center relative z-10">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
                                    transaction.status === 'completed' || transaction.txid ? 'bg-green-500 text-white' :
                                    transaction.status === 'failed' ? 'bg-red-500 text-white' :
                                    'bg-amber-500 text-white animate-pulse'
                                  }`}>
                                    {transaction.status === 'completed' || transaction.txid ? '✓' :
                                     transaction.status === 'failed' ? '✕' : '2'}
                                  </div>
                                  <span className="text-[10px] text-gray-300 mt-1 font-medium">Verified</span>
                                </div>
                                {/* Step 3: Delivered */}
                                <div className="flex flex-col items-center relative z-10">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
                                    transaction.status === 'completed' ? 'bg-green-500 text-white' :
                                    transaction.status === 'refunded' ? 'bg-purple-500 text-white' :
                                    transaction.status === 'failed' ? 'bg-red-500 text-white' :
                                    'bg-gray-800 text-gray-400 border border-gray-700'
                                  }`}>
                                    {transaction.status === 'completed' ? '✓' :
                                     transaction.status === 'refunded' ? '↩' :
                                     transaction.status === 'failed' ? '✕' : '3'}
                                  </div>
                                  <span className="text-[10px] text-gray-300 mt-1 font-medium">
                                    {transaction.status === 'refunded' ? 'Refunded' :
                                     transaction.status === 'failed' ? 'Failed' : 'Delivered'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Details Breakdown */}
                            <div className="space-y-1.5 text-xs bg-gray-900/80 p-2.5 rounded-lg border border-gray-800 mt-3 font-sans">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Order Ref:</span>
                                <span className="font-mono text-gray-300 text-[11px]">#{transaction.id}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Payment ID:</span>
                                <span className="font-mono text-gray-300 text-[11px] truncate max-w-[160px]" title={transaction.paymentId}>
                                  {transaction.paymentId}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Amount:</span>
                                <span className="text-amber-300 font-semibold">{transaction.piAmount} Pi</span>
                              </div>
                              {transaction.txid && (
                                <div className="flex justify-between items-center pt-1 border-t border-gray-800/80">
                                  <span className="text-gray-400">Stellar Horizon TxID:</span>
                                  <a
                                    href={`https://minepi.com/blockexplorer/tx/${transaction.txid}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-emerald-400 text-[11px] hover:underline truncate max-w-[150px] inline-flex items-center gap-1"
                                    title="Open Pi Blockchain Explorer"
                                  >
                                    {transaction.txid.slice(0, 10)}...{transaction.txid.slice(-6)}
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                </div>
                              )}
                              {transaction.status === 'completed' && (
                                <div className="pt-1 border-t border-gray-800/80 text-[11px] text-emerald-400">
                                  <span className="font-medium">Delivery Note:</span> {transaction.successReason || "In-game assets credited successfully."}
                                </div>
                              )}
                              {(transaction.status === 'failed' || transaction.status === 'cancelled') && transaction.failureReason && (
                                <div className="pt-1 border-t border-gray-800/80 text-[11px] text-red-400">
                                  <span className="font-medium">Issue Note:</span> {transaction.failureReason}
                                </div>
                              )}
                              {transaction.status === 'pending' && (
                                <div className="pt-1 border-t border-gray-800/80 text-[11px] text-amber-300 flex items-center gap-1.5">
                                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                                  <span>Verifying payment with Pi Mainnet validators...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        completedTransactions={completedTransactions}
      />

      <Dialog open={activeTournamentPanel !== null} onOpenChange={(open) => !open && setActiveTournamentPanel(null)}>
        <DialogContent className="w-[95vw] sm:w-[92vw] h-[90dvh] sm:h-auto max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto border border-cyan-400/30 bg-slate-950 text-white shadow-2xl shadow-cyan-500/10 sm:max-w-4xl rounded-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black text-cyan-100">
              <motion.img
                src={GAME_LOGOS.PUBG}
                alt="PUBG Mobile"
                className="h-10 w-10 rounded-lg object-contain"
                animate={{ rotate: [0, 2, -2, 0], scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <span>🏆 {activeArenaTournament?.title || 'PUBG Mobile Arena'}</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTournamentPanel || 'register'} onValueChange={(value) => setActiveTournamentPanel(value as 'register' | 'teams' | 'rules' | 'lobby' | 'leaderboard')}>
            <TabsList className="grid w-full grid-cols-5 bg-slate-900">
              <TabsTrigger value="register" data-testid="tab-tournament-register">{t('register')}</TabsTrigger>
              <TabsTrigger value="teams" data-testid="tab-tournament-teams">{t('teams')}</TabsTrigger>
              <TabsTrigger value="rules" data-testid="tab-tournament-rules">{t('rules')}</TabsTrigger>
              <TabsTrigger value="lobby" data-testid="tab-tournament-lobby">{t('lobby')}</TabsTrigger>
              <TabsTrigger value="leaderboard" data-testid="tab-tournament-rankings">{t('rankings')}</TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="mt-5 space-y-5">
              {/* ── {t('match_in_progress')} — registration form hidden ── */}
              {!isArenaRegistrationOpen ? (
                <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  className="rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)] p-6 text-center space-y-3">
                  <i className="fas fa-gamepad text-amber-400 text-4xl block"></i>
                  <p className="text-xl font-black text-white tracking-wide uppercase">{t('match_in_progress')}</p>
                  <p className="text-slate-300 text-sm">{t('registration_closed_notice')}</p>
                  <div className="flex gap-3 justify-center pt-1 flex-wrap">
                    <Button className="bg-gradient-to-r from-amber-500 to-amber-700 font-bold text-white"
                      onClick={() => setActiveTournamentPanel('leaderboard')}>
                      <i className="fas fa-trophy mr-2"></i>{t('view_rankings')}
                    </Button>
                    {(tournamentRegistered || isTournamentPaymentLocked) && (
                      <Button variant="outline" className="border-cyan-500/40 text-cyan-300"
                        onClick={() => setActiveTournamentPanel('lobby')}>
                        <i className="fas fa-door-open mr-2"></i>{t('access_lobby')}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ) : (
              <>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2 sm:gap-4">
                <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center justify-center rounded-xl border border-amber-300/20 bg-gradient-to-br from-amber-400/10 to-transparent p-2 sm:p-4 text-center shadow-lg hover:shadow-amber-500/20 transition-all">
                  <p className="text-2xl sm:text-3xl">💰</p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-amber-300">Entry</p>
                  <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl font-black text-white">{tournamentEntryFee} Pi</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center justify-center rounded-xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/10 to-transparent p-2 sm:p-4 text-center shadow-lg hover:shadow-emerald-500/20 transition-all">
                  <p className="text-2xl sm:text-3xl">🎁</p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-emerald-300">Prize Pool</p>
                  <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl font-black text-white">{tournamentPrizePool.toFixed(2)} Pi</p>
                  {tournamentPlatformFee > 0 && (
                    <p className="mt-1 text-[10px] font-semibold text-emerald-200">5% fee: {tournamentPlatformFee.toFixed(2)} Pi</p>
                  )}
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center justify-center rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 to-transparent p-2 sm:p-4 text-center shadow-lg hover:shadow-cyan-500/20 transition-all">
                  <p className="text-2xl sm:text-3xl">🔒</p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-cyan-300">Access</p>
                  <p className="mt-0.5 sm:mt-1 text-sm sm:text-2xl font-black text-white">Code</p>
                </motion.div>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-1">
                {([activeArenaModeLabel] as Array<'Solo' | 'Duo' | 'Squad'>).map((mode) => {
                  const modeDetails = {
                    Solo: { icon: '👤', players: '1 Player', entry: `${activeArenaMode === 'solo' ? tournamentEntryFee : tournamentEntryFees.Solo} Pi`, prize: `${tournamentPrizePool.toFixed(2)} Pi` },
                    Duo: { icon: '👥', players: '2 Players', entry: `${activeArenaMode === 'duo' ? tournamentEntryFee : tournamentEntryFees.Duo} Pi`, prize: `${tournamentPrizePool.toFixed(2)} Pi` },
                    Squad: { icon: '👨‍👩‍👧‍👦', players: '4 Players', entry: `${activeArenaMode === 'squad' ? tournamentEntryFee : tournamentEntryFees.Squad} Pi`, prize: `${tournamentPrizePool.toFixed(2)} Pi` }
                  }[mode];
                  
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTournamentMode(mode)}
                      className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${
                        tournamentMode === mode
                          ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-cyan-900/40 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                          : 'border-slate-700 bg-slate-900/80 text-slate-400 hover:border-cyan-500/50 hover:bg-slate-800'
                      }`}
                      data-testid={`tournament-mode-${mode.toLowerCase()}`}
                    >
                      {tournamentMode === mode && (
                        <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-cyan-500/20 blur-xl" />
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl drop-shadow-md">{modeDetails.icon}</span>
                          <span className="font-black uppercase tracking-widest text-lg drop-shadow-sm">{mode}</span>
                        </div>
                        {tournamentMode === mode && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-slate-900 shadow-sm shadow-cyan-400/50">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded bg-slate-950/50 p-2 border border-white/5">
                          <span className="block text-slate-500 mb-0.5">Players</span>
                          <span className="font-bold text-slate-200">{modeDetails.players}</span>
                        </div>
                        <div className="rounded bg-slate-950/50 p-2 border border-white/5">
                          <span className="block text-slate-500 mb-0.5">Entry</span>
                          <span className="font-bold text-amber-400">{tournamentEntryFee} Pi</span>
                        </div>
                        <div className="col-span-2 rounded bg-slate-950/50 p-2 border border-white/5 flex justify-between items-center">
                          <span className="text-slate-500">Prize Pool</span>
                          <span className="font-bold text-emerald-400 text-sm">{modeDetails.prize}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pubg-tournament-team">Team Name</Label>
                  <Input
                    id="pubg-tournament-team"
                    value={tournamentTeamName}
                    onChange={(event) => setTournamentTeamName(event.target.value)}
                    placeholder="Enter team name"
                    data-testid="input-tournament-team-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pubg-tournament-logo">Team Logo (Optional)</Label>
                  <Input
                    id="pubg-tournament-logo"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setTournamentTeamLogoName(event.target.files?.[0]?.name || '')}
                    data-testid="input-tournament-team-logo"
                  />
                  {tournamentTeamLogoName && <p className="text-xs text-cyan-200">Selected: {tournamentTeamLogoName}</p>}
                </div>
              </div>

              <div className="space-y-4">
                {(tournamentMode === 'Solo' ? tournamentRoster.slice(0, 1) : tournamentMode === 'Duo' ? tournamentRoster.slice(0, 2) : tournamentRoster.slice(0, 4)).map((player, index) => (
                  <motion.div
                    key={`player-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-xl border p-4 shadow-lg shadow-black/20 ${index === 0 ? 'border-cyan-500/30 bg-slate-800' : 'border-white/10 bg-slate-900'}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-black text-cyan-100">
                        Player {index + 1}{index === 0 ? ' / Captain (You)' : ''}
                      </h4>
                      {index === 0
                        ? <span className="text-xs font-bold uppercase tracking-wide text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded">From Profile 🔒</span>
                        : <span className="text-xs font-bold uppercase tracking-wide text-amber-200">Required</span>
                      }
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        placeholder="Email"
                        value={player.email}
                        onChange={(event) => index === 0 ? undefined : updateTournamentRosterPlayer(index, 'email', event.target.value)}
                        readOnly={index === 0}
                        className={index === 0 ? 'opacity-60 cursor-not-allowed bg-slate-700' : ''}
                        data-testid={`input-player-${index + 1}-email`}
                      />
                      <Input
                        placeholder="Phone number"
                        value={player.phone}
                        onChange={(event) => index === 0 ? undefined : updateTournamentRosterPlayer(index, 'phone', event.target.value)}
                        readOnly={index === 0}
                        className={index === 0 ? 'opacity-60 cursor-not-allowed bg-slate-700' : ''}
                        data-testid={`input-player-${index + 1}-phone`}
                      />
                      <Input
                        placeholder="PUBG IGN"
                        value={player.ign}
                        onChange={(event) => index === 0 ? undefined : updateTournamentRosterPlayer(index, 'ign', event.target.value)}
                        readOnly={index === 0}
                        className={index === 0 ? 'opacity-60 cursor-not-allowed bg-slate-700' : ''}
                        data-testid={`input-player-${index + 1}-ign`}
                      />
                      <Input
                        placeholder="PUBG UID"
                        value={player.uid}
                        onChange={(event) => index === 0 ? undefined : updateTournamentRosterPlayer(index, 'uid', event.target.value.replace(/\D/g, ''))}
                        readOnly={index === 0}
                        inputMode="numeric"
                        className={index === 0 ? 'opacity-60 cursor-not-allowed bg-slate-700' : ''}
                        data-testid={`input-player-${index + 1}-uid`}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label htmlFor={`player-${index + 1}-mugshot`}>Player Mugshot (Optional)</Label>
                      <Input
                        id={`player-${index + 1}-mugshot`}
                        type="file"
                        accept="image/*"
                        onChange={(event) => updateTournamentRosterPlayer(index, 'mugshotName', event.target.files?.[0]?.name || '')}
                        data-testid={`input-player-${index + 1}-mugshot`}
                      />
                      {player.mugshotName && <p className="text-xs text-cyan-200">Selected: {player.mugshotName}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid gap-3 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100 sm:grid-cols-3">
                <div><span className="text-emerald-300">Entry:</span> {tournamentEntryFee} Pi</div>
                <div><span className="text-emerald-300">Prize Pool:</span> {tournamentPrizePool.toFixed(2)} Pi</div>
                <div><span className="text-emerald-300">Starts:</span> {activeArenaTournament?.startsAt ? new Date(activeArenaTournament.startsAt).toLocaleString() : 'Open'}</div>
              </div>

              {(tournamentRegistered || isTournamentPaymentLocked) && (
                <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-sm text-cyan-100 mb-4">
                  PUBG registration has been completed and payment is locked. No further payment is required.
                </div>
              )}

              {/* Save Squad button — shown when already registered so captain can update squad members */}
              {(tournamentRegistered || isTournamentPaymentLocked) && (
                <Button
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 font-bold text-white mb-2"
                  onClick={async () => {
                    if (!user?.id || !token || !activeArenaTournamentId) return;
                    const requiredPlayers = tournamentMode === 'Solo'
                      ? tournamentRoster.slice(0, 1)
                      : tournamentMode === 'Duo'
                        ? tournamentRoster.slice(0, 2)
                        : tournamentRoster.slice(0, 4);
                    // Validate squad members (slots 1+) have at least IGN
                    const missing = requiredPlayers.slice(1).filter(p => !p.ign.trim());
                    if (missing.length > 0) {
                      toast({ title: 'Missing player details', description: 'Please fill in PUBG IGN for all squad members.', variant: 'destructive' });
                      return;
                    }
                    try {
                      // Update registration metadata with new squad
                      const res = await fetch('/api/tournament-registration/update-squad', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                          userId: user.id,
                          tournamentId: activeArenaTournamentId,
                          teamName: tournamentTeamName.trim(),
                          players: requiredPlayers.map(p => ({
                            email: p.email, phone: p.phone,
                            pubgIgn: p.ign, pubgUid: p.uid, mugshotName: p.mugshotName,
                          })),
                          mode: tournamentMode.toLowerCase(),
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.message || 'Save failed');
                      // Also save to profile
                      await fetch('/api/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                          gameAccounts: { ...((user as any)?.gameAccounts || {}), pubg: { ign: requiredPlayers[0].ign, uid: requiredPlayers[0].uid } },
                          metadata: {
                            lastTeamRoster: {
                              teamName: tournamentTeamName.trim(),
                              logoName: tournamentTeamLogoName || '',
                              mode: tournamentMode.toLowerCase(),
                              updatedAt: new Date().toISOString(),
                              players: requiredPlayers.map((p, i) => ({ slot: i, ign: p.ign, uid: p.uid, email: p.email, phone: p.phone, mugshotName: p.mugshotName || '', isCaptain: i === 0 })),
                            },
                          },
                        }),
                      });
                      if (refreshUser) await refreshUser();
                      await queryClient.refetchQueries({ queryKey: [`/api/tournaments/${activeArenaTournamentId}/teams`] });
                      toast({ title: '✅ Squad Saved', description: 'Your squad members have been updated successfully.' });
                    } catch (e: any) {
                      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
                    }
                  }}
                >
                  <i className="fas fa-save mr-2"></i> Save Squad Members
                </Button>
              )}

              <Button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-white"
                onClick={handleTournamentRegistrationSubmit}
                disabled={
                  isTournamentPaymentProcessing ||
                  tournamentRegistered ||
                  isTournamentPaymentLocked ||
                  !user?.isProfileVerified ||
                  !isArenaRegistrationOpen
                }
                data-testid="button-submit-pubg-registration"
              >
                {isTournamentPaymentProcessing ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Processing {tournamentEntryFee} Pi Entry...
                  </>
                ) : tournamentRegistered || isTournamentPaymentLocked ? (
                  'PUBG Registration Completed'
                ) : !user?.isProfileVerified ? (
                  '🔒 Verify Profile to Register'
                ) : !isArenaRegistrationOpen ? (
                  '🔒 ' + t('registration_closed')
                ) : (
                  `Confirm PUBG Registration & Pay ${tournamentEntryFee} Pi`
                )}
              </Button>
              </>
              )}
            </TabsContent>

            <TabsContent value="teams" className="mt-5 space-y-4">
              {registeredPubgTeams.map((team, idx) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="rounded-xl border border-cyan-300/20 bg-gradient-to-r from-slate-900 to-slate-950 p-4 shadow-lg hover:shadow-cyan-500/10 transition-all"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                        <span className="text-2xl">🛡️</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white">{team.teamName}</h4>
                        <p className="text-sm text-cyan-200 font-semibold">{team.mode} | Captain: {team.captainIgn}</p>
                        {team.logoName && <p className="text-xs text-slate-400 mt-1"><i className="fas fa-image mr-1"></i>{team.logoName}</p>}
                      </div>
                    </div>
                    <span className="rounded-full border border-emerald-300/40 bg-gradient-to-r from-emerald-500/20 to-green-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-300 shadow-inner">
                      Registered ✅
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(() => {
                      // Use full player data from lastTeamRoster in profile (has all details)
                      // or fall back to the team.players from API
                      const lastRoster: any[] = (user as any)?.metadata?.lastTeamRoster?.players || [];
                      const apiPlayers = team.players || [];
                      // Merge: prefer lastRoster which has email/phone/ign/uid, fill gaps from API
                      const allPlayers = Array.from(
                        { length: Math.max(apiPlayers.length, lastRoster.length, 1) },
                        (_, i) => {
                          const lr = lastRoster[i];
                          const ap = apiPlayers[i] as any;
                          return {
                            ign: lr?.ign || ap?.ign || ap?.pubgIgn || '',
                            uid: lr?.uid || ap?.uid || ap?.pubgUid || '',
                            mugshotName: lr?.mugshotName || ap?.mugshotName || '',
                            isCaptain: i === 0,
                          };
                        }
                      ).filter(p => p.ign || p.uid);

                      return allPlayers.map((player, playerIndex) => (
                        <motion.div
                          whileHover={{ y: -2 }}
                          key={`${team.id}-${player.uid || player.ign || playerIndex}`}
                          className={`rounded-lg border p-3 text-sm shadow-sm transition-all ${player.isCaptain ? 'border-cyan-500/40 bg-cyan-950/40' : 'border-slate-800 bg-slate-900/80'}`}
                        >
                          <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${player.isCaptain ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-700/50 text-slate-300'}`}>
                              {player.isCaptain ? '©' : playerIndex + 1}
                            </span>
                            <p className="font-bold text-white truncate">{player.ign || '—'}</p>
                            {player.isCaptain && <span className="ml-auto text-[9px] font-bold text-cyan-400 uppercase">Captain</span>}
                          </div>
                          <p className="text-xs text-slate-400 font-mono">UID: {player.uid || '—'}</p>
                          {player.mugshotName && <p className="text-xs text-cyan-400 mt-1 truncate"><i className="fas fa-camera mr-1"></i>{player.mugshotName}</p>}
                        </motion.div>
                      ));
                    })()}
                  </div>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="rules" className="mt-5 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 grid grid-cols-3 gap-2 sm:gap-4"
              >
                <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center justify-center rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 to-transparent p-2 sm:p-4 text-center shadow-lg hover:shadow-cyan-500/20 transition-all">
                  <p className="text-2xl sm:text-3xl">📱</p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-black text-cyan-100 leading-tight">Mobile Only</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center justify-center rounded-xl border border-amber-300/20 bg-gradient-to-br from-amber-400/10 to-transparent p-2 sm:p-4 text-center shadow-lg hover:shadow-amber-500/20 transition-all">
                  <p className="text-2xl sm:text-3xl">🎯</p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-black text-amber-100 leading-tight">Kill & Place</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center justify-center rounded-xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/10 to-transparent p-2 sm:p-4 text-center shadow-lg hover:shadow-emerald-500/20 transition-all">
                  <p className="text-2xl sm:text-3xl">🏅</p>
                  <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-black text-emerald-100 leading-tight">MVP Bonus</p>
                </motion.div>
              </motion.div>

              {/* Point System Table */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border border-amber-300/20 bg-gradient-to-br from-amber-950/20 to-transparent p-5 shadow-lg shadow-amber-500/10"
              >
                <h3 className="mb-4 text-lg font-black text-amber-200 flex items-center gap-2">
                  <i className="fas fa-chart-bar"></i>
                  Point System & Placement Rewards
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-amber-300/20">
                        <th className="px-3 py-2 text-left font-bold text-amber-200">Placement</th>
                        <th className="px-3 py-2 text-center font-bold text-amber-200">Points</th>
                        <th className="px-3 py-2 text-center font-bold text-amber-200">Per Kill</th>
                        <th className="px-3 py-2 text-right font-bold text-amber-200">Prize</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { placement: '1st Place', points: 10, kill: 1, prize: '120 Pi' },
                        { placement: '2nd Place', points: 6, kill: 1, prize: '80 Pi' },
                        { placement: '3rd Place', points: 5, kill: 1, prize: '50 Pi' },
                        { placement: '4th Place', points: 4, kill: 1, prize: '30 Pi' },
                        { placement: '5th Place', points: 3, kill: 1, prize: '20 Pi' },
                        { placement: '6th Place', points: 2, kill: 1, prize: '15 Pi' },
                        { placement: '7th-8th', points: 1, kill: 1, prize: '10 Pi' },
                        { placement: '9th-16th', points: 0, kill: 1, prize: 'Participation' },
                      ].map((row, idx) => (
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`border-b border-amber-300/10 transition-colors ${
                            idx % 2 === 0 ? 'bg-amber-400/5' : 'bg-transparent'
                          } hover:bg-amber-400/10`}
                        >
                          <td className="px-3 py-3 font-semibold text-white">{row.placement}</td>
                          <td className="px-3 py-3 text-center font-bold text-amber-200">{row.points}</td>
                          <td className="px-3 py-3 text-center text-cyan-200">+{row.kill}</td>
                          <td className="px-3 py-3 text-right font-bold text-emerald-200">{row.prize}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Game Rules */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="mb-4 text-lg font-black text-cyan-200 flex items-center gap-2">
                  <i className="fas fa-shield-alt"></i>
                  Game Rules & Regulations
                </h3>
                <div className="space-y-3">
                  {pubgRules.map((rule, index) => (
                    <motion.div
                      key={rule}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.04 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      className="flex items-center gap-4 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 to-transparent p-4 hover:border-cyan-300/40 hover:bg-cyan-500/20 transition-all shadow-md"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-lg font-black text-cyan-300 shadow-inner">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium text-slate-200">{rule}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="lobby" className="mt-5 space-y-4">
              <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                Lobby is secret. Enter the captain or team leader email used during registration to view assigned room details.
              </div>
              {!tournamentRegistered && !isTournamentPaymentLocked && (
                <Button
                  variant="outline"
                  className="w-full border-cyan-300/40 text-cyan-100"
                  onClick={() => setActiveTournamentPanel('register')}
                  data-testid="button-lobby-register-first"
                >
                  Register To Confirm Slot
                </Button>
              )}
              {tournamentRegistered && !lobbyAccessGranted && (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={lobbyLeaderCode}
                    onChange={(event) => setLobbyLeaderCode(event.target.value)}
                    placeholder="Enter team leader email"
                    data-testid="input-lobby-leader-code"
                  />
                  <Button
                    className="bg-gradient-to-r from-emerald-500 to-cyan-600 font-bold text-white"
                    onClick={handleLobbyCodeSubmit}
                    disabled={isArenaLobbyLoading}
                    data-testid="button-unlock-lobby"
                  >
                    {isArenaLobbyLoading ? 'Checking...' : 'Unlock Lobby'}
                  </Button>
                </div>
              )}
              {lobbyAccessGranted && (
                <div className="space-y-3">
                  {arenaLobbyData?.team && (
                    <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                      Verified captain access for <span className="font-black">{arenaLobbyData.team.name}</span>.
                    </div>
                  )}
                  {pubgMatchRooms.map((room) => {
                    const isDone = completedMatchIds.includes(room.id);
                    return (
                      <div key={room.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-black text-white">{room.label} | {room.map}</h4>
                            <p className="text-sm text-slate-400">Countdown: {room.startsIn}</p>
                          </div>
                          {isDone ? (
                            <Button
                              variant="outline"
                              className="border-cyan-300/30 text-cyan-100"
                              onClick={() => handleRecoverCredentials(room.id)}
                              data-testid={`button-recover-credentials-${room.id}`}
                            >
                              Recover Credentials
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="border-red-300/30 text-red-100"
                              onClick={() => handleMatchDone(room.id)}
                              data-testid={`button-match-done-${room.id}`}
                            >
                              Mark Match Done
                            </Button>
                          )}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg bg-slate-950 p-3">
                            <p className="text-xs text-cyan-300">Room ID</p>
                            <p className="font-mono text-lg font-black text-white">{isDone ? 'Removed after match' : room.roomId}</p>
                          </div>
                          <div className="rounded-lg bg-slate-950 p-3">
                            <p className="text-xs text-cyan-300">Password</p>
                            <p className="font-mono text-lg font-black text-white">{isDone ? 'Removed after match' : room.password}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-3 space-y-3">

              {/* ══ TOURNAMENT TITLE HEADER ══ */}
              <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a1a0e] via-[#3b1f0a] to-[#1a0e05] border border-amber-800/40">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,100,20,0.18),transparent_60%)]" />
                <div className="relative px-4 pt-4 pb-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80 mb-1">{activeArenaTournament?.game || 'PUBG Mobile'}</p>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">{activeArenaTournament?.title || 'PUBG Mobile Arena'}</h3>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300/70">Grand Finals Overall Standings</p>
                </div>
              </motion.div>

              {/* ══ PODIUM — Champions / Runners-up / Top Fragger ══ */}
              {filteredPubgLeaderboard.length > 0 && (() => {
                const p1 = filteredPubgLeaderboard.find((e: any) => e.rank === 1);
                const p2 = filteredPubgLeaderboard.find((e: any) => e.rank === 2);
                const p3 = filteredPubgLeaderboard.find((e: any) => e.rank === 3);

                // Build top fragger — only from per-player playerRows data (individual kills)
                // Team-level kills are NOT used as they represent the whole team, not one player
                const playerKillTotals: Record<string, { ign: string; kills: number; teamName: string }> = {};
                const matchResultsMap = arenaTournamentData?.matchResults || {};
                const allTeams = arenaTournamentData?.teams || arenaTeams;
                Object.values(matchResultsMap).forEach((matchResults: any) => {
                  (Array.isArray(matchResults) ? matchResults : []).forEach((res: any) => {
                    const team = allTeams.find((t: any) => t.id === res.teamId);
                    const teamName = team?.name || team?.teamName || 'Unknown';
                    const playerRows: any[] = res?.metadata?.playerRows || [];
                    if (playerRows.length > 0) {
                      playerRows.forEach((p: any) => {
                        const ign = p.ign || 'Unknown';
                        if (!playerKillTotals[ign]) playerKillTotals[ign] = { ign, kills: 0, teamName };
                        playerKillTotals[ign].kills += Number(p.kills) || 0;
                      });
                    }
                    // NOTE: team-level kills (res.kills) are intentionally ignored here
                    // because they represent the whole team's combined kills, not one player.
                    // Admin must enter per-player kills in the Results card for top fragger to work.
                  });
                });
                const topPlayerFragger = Object.values(playerKillTotals).sort((a, b) => b.kills - a.kills)[0] || null;
                const topTeamFragger = [...filteredPubgLeaderboard].sort((a, b) => b.kills - a.kills)[0];

                const podiumCards = [
                  { entry: p1, label: '🏆 Champion', sub: '1st Place', border: 'border-amber-500/60', bg: 'from-amber-900/50 to-amber-950/80', badge: 'bg-amber-500/20 text-amber-300', crown: '👑' },
                  { entry: p2, label: '🥈 1st Runner-up', sub: '2nd Place', border: 'border-slate-400/40', bg: 'from-slate-700/40 to-slate-900/80', badge: 'bg-slate-500/20 text-slate-300', crown: '🥈' },
                  { entry: p3, label: '🥉 2nd Runner-up', sub: '3rd Place', border: 'border-orange-600/40', bg: 'from-orange-900/40 to-orange-950/80', badge: 'bg-orange-500/20 text-orange-300', crown: '🥉' },
                  // Top Fragger card — only shows when complete per-player data exists
                  topPlayerFragger && topPlayerFragger.kills > 0
                    ? { entry: { name: topPlayerFragger.ign, teamLogo: null, kills: topPlayerFragger.kills, points: topPlayerFragger.kills, wwcdCount: 0, rank: 0 }, label: '🔫 Top Fragger', sub: `${topPlayerFragger.kills} kills · ${topPlayerFragger.teamName}`, border: 'border-red-500/40', bg: 'from-red-900/40 to-red-950/80', badge: 'bg-red-500/20 text-red-300', crown: '💀' }
                    : { entry: null, label: '🔫 Top Fragger', sub: 'Enter per-player kills in Results to determine', border: 'border-slate-700/40', bg: 'from-slate-800/40 to-slate-900/80', badge: 'bg-slate-700/30 text-slate-400', crown: '💀' },
                ];
                return (
                  <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
                    className="grid grid-cols-2 gap-2">
                    {podiumCards.map(({ entry, label, sub, border, bg, badge, crown }) => {
                      if (!entry) {
                        // Show placeholder for Top Fragger when per-player data not yet entered
                        if (label === '🔫 Top Fragger') {
                          return (
                            <div key={label} className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${bg} p-3`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{crown}</span>
                                <div className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge}`}>Top Fragger</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-9 w-9 rounded-lg bg-slate-800/60 border border-slate-700/40 flex items-center justify-center text-lg shrink-0">❓</div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-400 leading-tight">Pending</p>
                                  <p className="text-[9px] text-slate-600 mt-0.5">{sub}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }
                      const hasLogo = typeof entry.teamLogo === 'string' && /^https?:\/\//i.test(entry.teamLogo);
                      return (
                        <div key={label} className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${bg} p-3`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{crown}</span>
                            <div className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge}`}>{label.replace(/^[^\s]+\s/,'')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasLogo
                              ? <img src={entry.teamLogo!} alt="" className="h-9 w-9 rounded-lg object-cover border border-amber-700/30 shrink-0"/>
                              : <div className="h-9 w-9 rounded-lg bg-amber-900/50 border border-amber-700/30 flex items-center justify-center text-[10px] font-black text-amber-200 shrink-0">{entry.name.slice(0,2).toUpperCase()}</div>
                            }
                            <div className="min-w-0">
                              <p className="text-[12px] font-black text-white truncate leading-tight">{entry.name.toUpperCase()}</p>
                              <p className="text-[10px] text-amber-300/60 mt-0.5">{sub}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2 text-[10px]">
                            <span className="rounded bg-black/30 px-1.5 py-0.5 text-amber-200/70"><b className="text-amber-300">{entry.points}</b> pts</span>
                            <span className="rounded bg-black/30 px-1.5 py-0.5 text-amber-200/70"><b className="text-amber-300">{entry.kills}</b> kills</span>
                            {entry.wwcdCount > 0 && <span className="rounded bg-black/30 px-1.5 py-0.5 text-amber-200/70"><b className="text-amber-300">{entry.wwcdCount}</b> 🍗</span>}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                );
              })()}

              {/* ══ STANDINGS — scrollable table ══ */}
              <div className="rounded-2xl overflow-hidden border border-amber-800/30 bg-gradient-to-b from-[#1e1008] to-[#120a04]">
                <div className="overflow-x-auto" style={{WebkitOverflowScrolling:'touch'}}>
                  <table className="w-full" style={{minWidth:'520px'}}>
                    <thead>
                      <tr className="bg-[#1a0e06] text-[9px] font-black uppercase tracking-[0.18em] text-amber-400/70 border-b border-amber-800/30">
                        <th className="px-3 py-2 text-center w-[44px]">Rank</th>
                        <th className="px-1 py-2 w-[34px]"></th>
                        <th className="px-2 py-2 text-left">Team</th>
                        <th className="px-2 py-2 text-center w-[36px]">MP</th>
                        <th className="px-2 py-2 text-center w-[36px]">Win</th>
                        <th className="px-2 py-2 text-center w-[44px]">Pts</th>
                        <th className="px-2 py-2 text-center w-[44px]">Kills</th>
                        <th className="px-2 py-2 text-center w-[46px]">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPubgLeaderboard.length === 0 ? (
                        <tr><td colSpan={8} className="py-10 text-center text-slate-500 text-sm">No standings yet. Results will appear after matches are completed.</td></tr>
                      ) : filteredPubgLeaderboard.map((entry: any, idx: number) => {
                        const isTop3 = entry.rank <= 3;
                        const rankBg = entry.rank===1?'bg-gradient-to-r from-amber-700/60 to-amber-900/30':entry.rank===2?'bg-gradient-to-r from-slate-500/40 to-slate-700/20':entry.rank===3?'bg-gradient-to-r from-orange-800/50 to-orange-900/20':idx%2===0?'bg-[#1a0e06]/80':'bg-[#150b04]/80';
                        const rc = entry.rank===1?'text-amber-300':entry.rank===2?'text-slate-300':entry.rank===3?'text-orange-400':'text-amber-200/70';
                        const tc = entry.rank===1?'text-amber-300 font-black':entry.rank===2?'text-slate-200 font-black':entry.rank===3?'text-orange-300 font-black':'text-amber-100/90 font-bold';
                        const hasLogo = typeof entry.teamLogo==='string'&&/^https?:\/\//i.test(entry.teamLogo);
                        return (
                          <tr key={`${entry.rank}-${entry.name}`}
                            className={`border-b border-amber-900/20 last:border-b-0 ${rankBg} transition-colors`}>
                            <td className={`px-3 py-2 text-center text-sm font-black ${rc}`}>{String(entry.rank).padStart(2,'0')}</td>
                            <td className="px-1 py-2">
                              <div className="flex items-center justify-center">
                                {hasLogo
                                  ? <img src={entry.teamLogo!} alt={entry.name} className="h-7 w-7 rounded-md object-cover border border-amber-700/30"/>
                                  : <div className="h-7 w-7 rounded-md bg-amber-900/60 border border-amber-700/40 flex items-center justify-center text-[9px] font-black text-amber-200">{entry.name.slice(0,2).toUpperCase()}</div>
                                }
                              </div>
                            </td>
                            <td className={`px-2 py-2 text-[13px] font-bold truncate max-w-[140px] ${isTop3?'text-white':'text-amber-100/85'}`}>{entry.name.toUpperCase()}</td>
                            <td className="px-2 py-2 text-center text-[11px] font-bold text-amber-200/50">{entry.matchesPlayed}</td>
                            <td className="px-2 py-2 text-center text-[12px] font-bold text-amber-200/80">{entry.wwcdCount>0?String(entry.wwcdCount).padStart(2,'0'):'—'}</td>
                            <td className="px-2 py-2 text-center text-[12px] font-bold text-amber-100/80">{entry.points-entry.kills}</td>
                            <td className="px-2 py-2 text-center text-[12px] font-bold text-amber-100/80">{entry.kills}</td>
                            <td className={`px-2 py-2 text-center text-[13px] ${tc}`}>{entry.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ══ CLAIM REWARD STRIP ══ */}
              {filteredPubgLeaderboard.length > 0 && (
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
                  className="rounded-2xl border border-amber-700/30 bg-gradient-to-r from-amber-900/40 to-amber-800/20 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">🏆 Current Leader</p>
                    <p className="text-sm font-black text-white truncate">{topPubgLeaderboard.name}</p>
                    <p className="text-[11px] text-amber-300/70">{topPubgLeaderboard.points} pts • {topPubgLeaderboard.kills} kills</p>
                  </div>
                  {(() => {
                    const userTeamIds = registeredPubgTeams.map((t: any) => t.id);
                    const userTop3Entry = filteredPubgLeaderboard.find(
                      (e: any) => e.teamId && userTeamIds.includes(e.teamId) && e.rank > 0 && e.rank <= 3
                    );
                    const isRegistered = tournamentRegistered && registeredPubgTeams.length > 0;

                    if (winnerRewardClaimed) {
                      return (
                        <Button size="sm" disabled
                          className="shrink-0 bg-emerald-700/50 text-emerald-300 border border-emerald-600/30 text-xs font-bold cursor-not-allowed">
                          ✓ Queued
                        </Button>
                      );
                    }
                    if (userTop3Entry) {
                      return (
                        <Button size="sm"
                          className="shrink-0 bg-gradient-to-r from-amber-500 to-amber-700 font-bold text-white text-xs shadow-lg hover:shadow-amber-500/30"
                          onClick={handleClaimWinnerReward} data-testid="button-claim-winner-reward">
                          Claim Reward
                        </Button>
                      );
                    }
                    if (!isRegistered) {
                      return (
                        <span className="shrink-0 text-[10px] text-slate-500 font-medium text-right max-w-[120px]">
                          Register to compete
                        </span>
                      );
                    }
                    return (
                      <span className="shrink-0 text-[10px] text-amber-400/50 font-medium text-right max-w-[140px]">
                        Reach the top 3 to claim rewards
                      </span>
                    );
                  })()}
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Token Redemption Dialog */}
      <Dialog open={isNotificationsOpen} onOpenChange={(open) => {
        setIsNotificationsOpen(open);
        if (!open) setSelectedNotification(null);
      }}>
        <DialogContent className="inset-0 left-0 top-0 translate-x-0 translate-y-0 w-full max-w-full h-full sm:inset-4 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:max-w-xl sm:h-auto sm:max-h-[90dvh] overflow-y-auto bg-gray-950 text-white rounded-none sm:rounded-xl shadow-2xl border border-gray-700">
          <DialogHeader className="bg-gradient-to-r from-slate-900 to-cyan-700 p-4 rounded-t-xl -m-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <i className="fas fa-bell mr-2"></i>
              Notifications
            </DialogTitle>
            <p className="text-sm text-gray-300 mt-1">
              {notifications?.length ? `${notifications.length} recent notification${notifications.length === 1 ? '' : 's'}` : 'No notifications yet.'}
            </p>
          </DialogHeader>
          <div className="space-y-4 px-4 pb-6">
            {notifications?.length ? (
              <div className="space-y-3">
                {notifications.map((notification: any) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={async () => {
                      await markNotificationRead(notification.id);
                      setSelectedNotification(notification);
                    }}
                    className={`w-full text-left rounded-2xl border px-4 py-4 transition-all duration-200 ${notification.status === 'unread' ? 'border-cyan-500 bg-slate-900/80 hover:bg-slate-800' : 'border-gray-700 bg-gray-900/70 hover:bg-gray-800'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{notification.title}</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notification.message}</p>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${notification.status === 'unread' ? 'text-cyan-300' : 'text-gray-400'}`}>
                        {notification.status || 'unread'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                      <span>{new Date(notification.createdAt).toLocaleString()}</span>
                      {notification.status === 'unread' && <span className="text-amber-300">Tap to view</span>}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/70 p-8 text-center text-sm text-gray-400">
                No notifications available.
              </div>
            )}

            {selectedNotification && (
              <div className="rounded-2xl border border-cyan-600 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedNotification.title}</p>
                    <p className="text-xs text-gray-400">{new Date(selectedNotification.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                    {selectedNotification.status || 'unread'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-200">{selectedNotification.message}</p>
                {selectedNotification.metadata && (
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-[11px] text-gray-300">{JSON.stringify(selectedNotification.metadata, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRedeemDialogOpen} onOpenChange={setIsRedeemDialogOpen}>
        <DialogContent className="!inset-0 !left-0 !top-0 !w-screen max-w-none !h-dvh max-h-dvh !translate-x-0 !translate-y-0 overflow-y-auto bg-gray-900 text-white rounded-none shadow-2xl border-0 border-gray-700 p-3 sm:!inset-4 sm:!left-1/2 sm:!top-1/2 sm:!w-full sm:max-w-md sm:!h-auto sm:max-h-[90dvh] sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-xl sm:border sm:p-6">
          <DialogHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 p-3 pr-14 sm:p-4 sm:pr-12 rounded-none sm:rounded-t-xl -m-3 sm:-m-6 mb-3 sm:mb-4 sticky top-0 z-10 sm:static">
            <DialogTitle className="text-base sm:text-xl font-bold flex items-center min-w-0">
              <i className="fas fa-exchange-alt mr-2"></i>
              <span className="truncate">Token Redemption</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Security Notice */}
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 sm:p-4">
              <div className="flex items-start">
                <i className="fas fa-shield-alt text-amber-400 text-base sm:text-lg mr-2 mt-0.5 shrink-0"></i>
                <div className="min-w-0">
                  <h3 className="font-bold text-amber-300 mb-1">🔐 Secure Redemption Process</h3>
                  <p className="text-xs sm:text-sm text-amber-200 leading-relaxed">
                    Redemption uses your verified Pi UID from Pi Network login. Wallet details are shown only as an optional snapshot.
                  </p>
                </div>
              </div>
            </div>
            
            {/* User Information */}
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                <div className="flex items-center mb-2 min-w-0">
                  <i className="fas fa-user text-blue-400 mr-2 shrink-0"></i>
                  <span className="font-medium text-gray-300 text-sm sm:text-base truncate">Username</span>
                </div>
                <p className="pl-6 text-sm sm:text-base break-words font-mono font-bold bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                  {user?.username || 'Loading...'}
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                <div className="flex items-center mb-2 min-w-0">
                  <i className="fas fa-fingerprint text-green-400 mr-2 shrink-0"></i>
                  <span className="font-medium text-gray-300 text-sm sm:text-base truncate">Verified Pi UID</span>
                </div>
                <p className="text-white font-mono pl-6 break-all text-xs sm:text-sm leading-relaxed">{user?.piUID || 'Not verified'}</p>
                {user?.walletAddress && (
                  <p className="text-[11px] text-gray-400 pl-6 mt-2 break-all leading-relaxed">
                    Wallet snapshot: {user.walletAddress}
                  </p>
                )}
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                <div className="flex items-center mb-2 min-w-0">
                  <i className="fas fa-coins text-yellow-400 mr-2 shrink-0"></i>
                  <span className="font-medium text-gray-300 text-sm sm:text-base truncate">Available B4U Esports Token</span>
                </div>
                <p className="text-white font-mono pl-6 text-sm sm:text-base">{user?.tokens || 0} B4UT</p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 border border-gray-700">
                <div className="flex items-center mb-2 min-w-0">
                  <i className="fas fa-exchange-alt text-purple-400 mr-2 shrink-0"></i>
                  <span className="font-medium text-gray-300 text-sm sm:text-base truncate">Redeemable Amount</span>
                </div>
                <p className="text-white font-mono pl-6 text-sm sm:text-base">
                  {(user?.tokens || 0) >= 1000 ? '0.1 Pi' : 'Insufficient B4UT'}
                </p>
                <p className="text-xs text-gray-400 pl-6 mt-1 leading-relaxed">
                  (1000 B4UT = 0.1 Pi minimum)
                </p>
              </div>
            </div>
            
            {/* Warning */}
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 sm:p-4">
              <div className="flex items-start">
                <i className="fas fa-exclamation-triangle text-red-400 text-base sm:text-lg mr-2 mt-0.5 shrink-0"></i>
                <div className="min-w-0">
                  <h3 className="font-bold text-red-300 mb-1">⚠️ Important Notice</h3>
                  <p className="text-xs sm:text-sm text-red-200 leading-relaxed">
                    Redemptions are tied to your authenticated Pi UID. Do not share your account or try to redeem through another user's identity.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="sticky bottom-0 -mx-3 -mb-3 bg-gray-900/95 p-3 backdrop-blur sm:static sm:m-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 min-w-0 h-11"
                onClick={() => setIsRedeemDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white min-w-0 h-11"
                onClick={handleConfirmRedemption}
                disabled={isProcessingRedemption || !user || (user.tokens || 0) < 1000 || !user.piUID}
              >
                {isProcessingRedemption ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Confirm Redemption
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {selectedPackage && (
        <PurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => {
            setIsPurchaseModalOpen(false);
            setSelectedPackage(null);
          }}
          package={selectedPackage}
        />
      )}

      {/* Purchase Success Modal - Behavior-driven animation */}
      {purchaseSuccessData && (
        <SuccessModal
          isOpen={showPurchaseSuccess}
          onClose={() => {
            setShowPurchaseSuccess(false);
            setPurchaseSuccessData(null);
          }}
          title="Purchase Successful! 🎉"
          message={`You've successfully purchased ${purchaseSuccessData.packageName}`}
          rewardAmount={purchaseSuccessData.tokensEarned}
          rewardLabel="π tokens"
          showCoinBurst={true}
        />
      )}

      </div> {/* End scrollable area */}

      <BottomNav 
        activeSection={activeSection}
        isAdmin={Boolean(user?.isAdmin)}
        onAdminClick={() => {
          try { initializeAudio(); soundActions.playTap(); } catch {}
          setLocation(ADMIN_PANEL_PATH);
        }}
        onSectionClick={(section) => {
          try { initializeAudio(); soundActions.playTap(); } catch {}
          setActiveSection(section);
          if (section === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
          if (section === 'shop') document.querySelector('[data-testid="package-shop"]')?.scrollIntoView({ behavior: 'smooth' });
          if (section === 'tournaments') document.querySelector('[data-testid="tournament-section"]')?.scrollIntoView({ behavior: 'smooth' });
          if (section === 'transactions') document.querySelector('[data-testid="recent-transactions"]')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onProfileClick={() => {
          try { initializeAudio(); soundActions.playTap(); } catch {}
          setIsProfileModalOpen(true);
        }}
        hasPiNetworkPurchase={hasPiNetworkPurchase}
      />
      </>
      )}
    </AnimatedPage>
  );
}
