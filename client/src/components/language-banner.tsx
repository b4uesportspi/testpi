import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/button';

export default function LanguageBanner() {
  const { showLanguageBanner, detectedLang, acceptSuggestion, dismissBanner, t } = useLanguage();

  return (
    <AnimatePresence>
      {showLanguageBanner && detectedLang && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-4 pt-3"
        >
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-cyan-500/10 px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">
                {detectedLang.flag} {t('detected_language')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('switch_to_language')} {detectedLang.nativeName} ({detectedLang.name})
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 px-3 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={acceptSuggestion}
              >
                {t('switch')}
              </Button>
              <button
                onClick={dismissBanner}
                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
