import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Zap, ShoppingBag } from 'lucide-react';
import { usePiNetwork } from '@/hooks/use-pi-network';
import { useLanguage } from '@/context/LanguageContext';

interface Purchase {
  id: string;
  displayName: string;
  packageName: string;
  platform: string;
  piAmount: string;
  createdAt: string;
  timeAgo: string;
}

interface RecentPurchasesData {
  success: boolean;
  recentPurchases: Purchase[];
  totalCount: number;
}

const PLATFORM_EMOJI: Record<string, string> = {
  PUBG: '🎮', PUBGKR: '🎮', MLBB: '⚔️', COC: '👑',
  ROBUX: '🎲', NEWSTATE: '🔫', FREEFIRE: '🔥',
  TIKTOK: '📱', YOUTUBE: '📹', FACEBOOK: '💙',
  INSTAGRAM: '📸', NETFLIX: '🎬', CANVA: '✨',
};

const PLATFORM_GRADIENT: Record<string, string> = {
  PUBG: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/20',
  MLBB: 'from-purple-500/20 to-violet-500/10 border-purple-500/20',
  COC: 'from-blue-500/20 to-cyan-500/10 border-blue-500/20',
  ROBUX: 'from-red-500/20 to-rose-500/10 border-red-500/20',
  TIKTOK: 'from-slate-500/20 to-slate-600/10 border-slate-500/20',
  YOUTUBE: 'from-red-600/20 to-red-500/10 border-red-600/20',
  NETFLIX: 'from-red-700/20 to-red-600/10 border-red-700/20',
  CANVA: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/20',
};

export default function RecentPurchasesFeed() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery<RecentPurchasesData>({
    queryKey: ['recent-purchases'],
    queryFn: async () => {
      const r = await fetch('/api/recent-purchases?limit=8');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    refetchInterval: 600000,
    staleTime: 540000,
  });

  const purchases = data?.recentPurchases || [];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 shadow-xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none"/>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"/>

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3.5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-green-400"/>
          </div>
          <div>
            <p className="text-sm font-black text-white">{t('recent_purchases')}</p>
            {data?.totalCount ? (
              <p className="text-[10px] text-slate-500">{data.totalCount.toLocaleString()}+ {t('join_customers')}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"/>
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">{t('live')}</span>
        </div>
      </div>

      {/* Feed */}
      <div className="px-3 py-3 space-y-2">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-800/40 animate-pulse"/>
          ))
        ) : purchases.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingBag className="h-8 w-8 text-slate-700 mx-auto mb-2"/>
            <p className="text-slate-500 text-sm">{t('no_transactions')}</p>
            <p className="text-slate-600 text-xs mt-0.5">{t('be_first')}</p>
          </div>
        ) : (
          <AnimatePresence>
            {purchases.map((p, i) => {
              const grad = PLATFORM_GRADIENT[p.platform.toUpperCase()] || 'from-slate-700/20 to-slate-800/10 border-slate-700/20';
              const emoji = PLATFORM_EMOJI[p.platform.toUpperCase()] || '🎁';
              return (
                <motion.div key={p.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 rounded-xl border bg-gradient-to-r ${grad} px-3 py-2.5 hover:brightness-110 transition-all`}>
                  <span className="text-xl shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{p.packageName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{p.platform}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-green-400 font-mono">{parseFloat(p.piAmount).toFixed(2)}π</p>
                    <p className="text-[9px] text-slate-600">{p.timeAgo}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {purchases.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-800/60 flex items-center justify-center gap-1.5">
          <Zap className="h-3 w-3 text-amber-400/60"/>
          <p className="text-[10px] text-slate-500">{t('join_customers')} {t('participate_now')}!</p>
        </div>
      )}
    </div>
  );
}
