import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Link } from "wouter";
import { useSound } from "@/hooks/useSound";
import { Coins, Zap, Trophy, History, ArrowUpRight, ShieldCheck, Users, BarChart3, Package, Settings, WalletCards, Sparkles, Flame, Gift } from "lucide-react";
import { usePiNetwork } from "@/hooks/use-pi-network";
import { ADMIN_PANEL_PATH } from "@/lib/admin-route";

interface BalanceResponse {
  tokenName?: string;
  tokenSymbol?: string;
  conversionRate?: number;
  balance: {
    total: number;
    locked: number;
    earned: number;
    spent: number;
  };
  recentRewards: Array<{ id: string; eventType: string; amount: number; source: string; createdAt: string }>;
  rewardSources?: Array<{ key: string; title: string; value: string; description?: string }>;
}

export default function TokenWallet() {
  const [balance, setBalance] = useState<BalanceResponse["balance"] | null>(null);
  const [recentRewards, setRecentRewards] = useState<BalanceResponse["recentRewards"]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("B4U Esports Token");
  const [tokenSymbol, setTokenSymbol] = useState("B4UT");
  const [conversionRate, setConversionRate] = useState(10000);
  const [rewardSources, setRewardSources] = useState<NonNullable<BalanceResponse["rewardSources"]>>([]);
  const [rewardBurst, setRewardBurst] = useState<{ label: string; amount: number } | null>(null);
  const { user } = usePiNetwork();
  const { soundActions, initializeAudio } = useSound();

  const playRewardSound = () => {
    try {
      initializeAudio();
      soundActions.playReward();
    } catch {
      // Audio is best-effort and may be blocked until user interaction.
    }
  };

  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await apiRequest("GET", "/api/token/balance");
        const data = await response.json();
        setBalance(data.balance);
        setRecentRewards(data.recentRewards ?? []);
        setTokenName(data.tokenName || "B4U Esports Token");
        setTokenSymbol(data.tokenSymbol || "B4UT");
        setConversionRate(Number(data.conversionRate || 10000));
        setRewardSources(data.rewardSources || []);
      } catch (error: any) {
        setBalance({ total: 12500, locked: 1000, earned: 15000, spent: 2500 });
        setRecentRewards([
          { id: '1', eventType: 'purchase_reward', amount: 100, source: 'Cashback', createdAt: new Date().toISOString() },
          { id: '2', eventType: 'daily_login', amount: 10, source: 'Daily Reward', createdAt: new Date(Date.now() - 86400000).toISOString() }
        ]);
        setRewardSources([
          { key: "daily_reward", title: "Daily Reward Token", value: "+10 B4U Esports Token" },
          { key: "feedback_reward", title: "Feedback Reward", value: "+10 B4U Esports Token" },
          { key: "watch_ad", title: "Watch Ad and Earn Token", value: "+10 B4U Esports Token" },
          { key: "purchase_bonus", title: "Purchase Bonus Token", value: "Purchase milestone bonuses" },
        ]);
        setMessage(error.message || "Using demo data.");
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
  }, []);

  useEffect(() => {
    const latestReward = recentRewards.find((entry) => entry.amount > 0);
    if (!latestReward) return;
    setRewardBurst({ label: latestReward.source, amount: latestReward.amount });
    playRewardSound();
    const timer = window.setTimeout(() => setRewardBurst(null), 2800);
    return () => window.clearTimeout(timer);
  }, [recentRewards]);

  const piEstimate = useMemo(() => ((balance?.total || 0) / conversionRate).toFixed(4), [balance?.total, conversionRate]);
  const floatingRewards = rewardSources.slice(0, 7);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const adminQuickLinks = [
    { href: ADMIN_PANEL_PATH, icon: BarChart3, label: 'Analytics', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10 border-blue-500/30' },
    { href: ADMIN_PANEL_PATH, icon: Users, label: 'Users', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10 border-purple-500/30' },
    { href: ADMIN_PANEL_PATH, icon: Package, label: 'Packages', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10 border-amber-500/30' },
    { href: ADMIN_PANEL_PATH, icon: Settings, label: 'Settings', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  ];

  return (
    <div className="min-h-screen bg-[#050816] p-4 sm:p-6 text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_32%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:42px_42px]" />

      <AnimatePresence>
        {rewardBurst && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed left-1/2 top-5 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-emerald-300/40 bg-emerald-950/90 p-4 text-center shadow-[0_0_40px_rgba(16,185,129,0.45)] backdrop-blur-xl"
          >
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow-lg">
              <Coins className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">Reward Added</p>
            <p className="mt-1 text-xl font-black text-white">+{rewardBurst.amount} {tokenSymbol}</p>
            <p className="text-sm text-emerald-100">{rewardBurst.label}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {[...Array(18)].map((_, index) => (
        <motion.span
          key={index}
          className="pointer-events-none absolute z-0 flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-xs font-black text-amber-200"
          initial={{ x: `${(index * 17) % 100}vw`, y: "110vh", opacity: 0 }}
          animate={{ y: "-10vh", opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 10 + (index % 6), repeat: Infinity, delay: index * 0.45, ease: "linear" }}
        >
          B
        </motion.span>
      ))}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto space-y-8 relative z-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-cyan-300 via-white to-amber-300 bg-clip-text text-transparent">
              {tokenName}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300 font-medium">
              Earn from daily rewards, referrals, purchases, ads, tournaments, achievements, loyalty drops, and feedback.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/redeem">
              <span className="flex items-center gap-2 cursor-pointer rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                Redeem <ArrowUpRight className="w-5 h-5" />
              </span>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants as any} className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-900/60 p-5 sm:p-8 shadow-[0_0_60px_rgba(34,211,238,0.15)] backdrop-blur-2xl">
          <div className="absolute right-6 top-6 hidden rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-amber-200 sm:block">
            Live Balance
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-cyan-200">
                <WalletCards className="h-7 w-7" />
                <span className="text-sm font-bold uppercase tracking-[0.25em]">Futuristic Wallet</span>
              </div>
              <motion.p
                key={balance?.total}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="mt-5 text-5xl font-black tracking-tight sm:text-7xl"
              >
                {loading ? "---" : balance?.total.toLocaleString()}
                <span className="ml-3 text-2xl text-amber-300 sm:text-3xl">{tokenSymbol}</span>
              </motion.p>
              <p className="mt-3 text-sm text-slate-300">
                Estimated redemption value: <span className="font-black text-white">{piEstimate} Pi</span>. {tokenSymbol} is burned before the treasury payout request is created.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <Sparkles className="mb-3 h-5 w-5 text-emerald-300" />
                <p className="text-xs uppercase tracking-widest text-emerald-200">Earned</p>
                <p className="mt-1 text-2xl font-black">{balance?.earned.toLocaleString() ?? "---"}</p>
              </div>
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
                <Flame className="mb-3 h-5 w-5 text-rose-300" />
                <p className="text-xs uppercase tracking-widest text-rose-200">Burned</p>
                <p className="mt-1 text-2xl font-black">{balance?.spent.toLocaleString() ?? "---"}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Balance Cards */}
        <motion.div variants={itemVariants as any} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <Coins className="w-6 h-6" />
              <h3 className="font-semibold uppercase tracking-wider text-sm">Total {tokenSymbol}</h3>
            </div>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-black text-white"
            >
              {balance?.total.toLocaleString() ?? '---'}
            </motion.p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 text-purple-400 mb-4">
              <Zap className="w-6 h-6" />
              <h3 className="font-semibold uppercase tracking-wider text-sm">Earned</h3>
            </div>
            <p className="text-3xl font-bold text-slate-200">{balance?.earned.toLocaleString() ?? '---'}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 relative overflow-hidden group">
            <div className="flex items-center gap-3 text-emerald-400 mb-4">
              <Trophy className="w-6 h-6" />
              <h3 className="font-semibold uppercase tracking-wider text-sm">Spent</h3>
            </div>
            <p className="text-3xl font-bold text-slate-200">{balance?.spent.toLocaleString() ?? '---'}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 relative overflow-hidden group">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <History className="w-6 h-6" />
              <h3 className="font-semibold uppercase tracking-wider text-sm">Locked</h3>
            </div>
            <p className="text-3xl font-bold text-slate-200">{balance?.locked.toLocaleString() ?? '---'}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants as any} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {floatingRewards.map((reward, index) => (
            <motion.div
              key={reward.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: [0, -6, 0] }}
              transition={{ opacity: { delay: index * 0.06 }, y: { duration: 3.5, repeat: Infinity, delay: index * 0.2 } }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-xl backdrop-blur-xl"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200">
                <Gift className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-white">{reward.title}</p>
              <p className="mt-1 text-sm font-bold text-amber-200">{reward.value}</p>
              {reward.description && <p className="mt-2 text-xs leading-relaxed text-slate-400">{reward.description}</p>}
            </motion.div>
          ))}
        </motion.div>

        {/* ── ACCESS ADMIN BUTTON (owner only) ── */}
        {user?.isAdmin && (
          <motion.div variants={itemVariants as any}>
            <Link href={ADMIN_PANEL_PATH}>
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-3 w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-6 py-4 text-white font-bold text-lg transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)]"
              >
                <ShieldCheck className="w-6 h-6" />
                Access Admin Dashboard
                <ArrowUpRight className="w-6 h-6 ml-auto" />
              </motion.span>
            </Link>
          </motion.div>
        )}

        {/* ── ADMIN CONTROL CENTER (owner only) ── */}
        {user?.isAdmin && (
          <motion.div
            variants={itemVariants as any}
            className="rounded-3xl border border-red-500/25 bg-gradient-to-br from-red-950/60 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl p-6 md:p-8 relative overflow-hidden"
          >
            {/* Glow accent */}
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-red-600/10 blur-2xl pointer-events-none" />

            {/* Title row */}
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Admin Control Center</h2>
                  <p className="text-xs text-red-400/80 font-medium">Owner access · rinzindo4ji</p>
                </div>
              </div>
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                LIVE
              </span>
            </div>

            {/* Quick-access grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 relative z-10">
              {adminQuickLinks.map(({ href, icon: Icon, label, color, bg }) => (
                <Link key={label} href={href}>
                  <motion.span
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex flex-col items-center gap-2 cursor-pointer rounded-2xl border ${bg} p-4 transition-all hover:brightness-125`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{label}</span>
                  </motion.span>
                </Link>
              ))}
            </div>

            {/* Open full dashboard CTA */}
            <Link href={ADMIN_PANEL_PATH}>
              <motion.span
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="relative z-10 flex items-center justify-center gap-2 cursor-pointer w-full rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 px-6 py-3.5 text-white font-bold text-sm transition-all shadow-[0_0_24px_rgba(239,68,68,0.3)]"
              >
                <ShieldCheck className="w-4 h-4" />
                Open Full Admin Dashboard
                <ArrowUpRight className="w-4 h-4 ml-auto" />
              </motion.span>
            </Link>
          </motion.div>
        )}

        {/* Recent Transactions */}
        <motion.div variants={itemVariants as any} className="rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-purple-400" />
              Transaction Ledger
            </h2>
          </div>

          <div className="space-y-4">
            {recentRewards.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Coins className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No token history found.</p>
              </div>
            ) : (
              recentRewards.map((entry, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${entry.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {entry.amount > 0 ? <ArrowUpRight className="w-5 h-5" /> : <History className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">{entry.source}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{entry.eventType.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-lg ${entry.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount} {tokenSymbol}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Toast Notification */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="fixed bottom-6 right-6 max-w-sm rounded-2xl border border-purple-500/30 bg-slate-900/90 backdrop-blur-xl p-4 shadow-2xl z-50 flex gap-3 items-start"
            >
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">{message}</p>
              </div>
              <button onClick={() => setMessage(null)} className="text-slate-500 hover:text-white">&times;</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
