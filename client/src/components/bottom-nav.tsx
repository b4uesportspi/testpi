import { motion } from 'framer-motion';
import { Home, ShoppingCart, ShieldCheck, Trophy, Wallet, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface BottomNavProps {
  onProfileClick: () => void;
  onAdminClick?: () => void;
  isAdmin?: boolean;
  activeSection?: string;
  onSectionClick?: (section: string) => void;
  hasPiNetworkPurchase?: boolean;
}

export default function BottomNav({ onProfileClick, onAdminClick, isAdmin = false, activeSection, onSectionClick, hasPiNetworkPurchase = false }: BottomNavProps) {
  const { t } = useLanguage();

  const handleNavClick = (section: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    if (onSectionClick) onSectionClick(section);
  };

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/70 backdrop-blur-xl border-t border-white/5 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]"
      data-testid="bottom-nav"
    >
      <div className="flex justify-around items-center px-2 py-2 safe-area-bottom">
        {isAdmin && (
          <button
            onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); onAdminClick?.(); }}
            className="absolute right-4 -top-14 flex items-center gap-2 rounded-full border border-red-400/40 bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-red-500/30"
            aria-label="Open admin dashboard"
            data-testid="mobile-admin-access"
          >
            <ShieldCheck className="w-4 h-4" />
            Admin
          </button>
        )}

        <button
          onClick={() => handleNavClick('home')}
          className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${activeSection === 'home' || !activeSection ? 'text-cyan-400 scale-110' : 'text-muted-foreground hover:text-cyan-200'}`}
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-full ${activeSection === 'home' || !activeSection ? 'bg-blue-500/20' : 'bg-transparent'}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold mt-1">{t('home')}</span>
        </button>

        <button
          onClick={() => handleNavClick('shop')}
          className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${activeSection === 'shop' ? 'text-purple-400 scale-110' : 'text-muted-foreground hover:text-purple-200'}`}
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-full ${activeSection === 'shop' ? 'bg-purple-500/20' : 'bg-transparent'}`}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold mt-1">{t('shop')}</span>
        </button>

        <div className="relative -top-5">
          <button
            onClick={() => handleNavClick('tournaments')}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 transform hover:scale-105 transition-all duration-300 border-[3px] border-slate-950"
          >
            <Trophy className="w-5 h-5" />
          </button>
        </div>

        {hasPiNetworkPurchase && (
          <button
            onClick={() => handleNavClick('wallet')}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 ${activeSection === 'wallet' ? 'text-emerald-400 scale-110' : 'text-muted-foreground hover:text-emerald-200'}`}
          >
            <div className={`flex items-center justify-center w-9 h-9 rounded-full ${activeSection === 'wallet' ? 'bg-emerald-500/20' : 'bg-transparent'}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold mt-1">{t('wallet')}</span>
          </button>
        )}

        <button
          onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); onProfileClick(); }}
          className="flex flex-col items-center p-2 rounded-xl transition-all duration-300 text-muted-foreground hover:text-blue-400"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold mt-1">{t('profile')}</span>
        </button>
      </div>
    </motion.div>
  );
}
