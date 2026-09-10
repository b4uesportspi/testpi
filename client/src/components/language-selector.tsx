import { useState, useRef, useEffect } from 'react';
import { Check, Search, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/lib/constants';

export default function LanguageSelector() {
  const { language, setLanguage, languageLoading, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-800/80 border border-gray-700 hover:bg-gray-700 transition-colors"
        aria-label={t('language_selector_title')}
        aria-expanded={open}
      >
        <span className="text-sm leading-none">{currentLang.flag}</span>
        <span className="text-[10px] font-bold text-white uppercase hidden sm:inline">{language}</span>
        <ChevronDown className={`h-2.5 w-2.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            /* 
              On mobile: fixed full-width with safe margins.
              On sm+: absolute anchored to the button.
            */
            className={[
              // shared
              'z-[9999] rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden',
              // mobile: fixed, full width with gutters
              'fixed left-3 right-3 top-auto',
              // sm+: absolute, anchored right below trigger, fixed width
              'sm:fixed sm:left-auto sm:right-4 sm:w-64',
            ].join(' ')}
            style={{ top: (() => {
              if (!containerRef.current) return '4rem';
              const rect = containerRef.current.getBoundingClientRect();
              return `${rect.bottom + 8}px`;
            })() }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-sm font-black text-white tracking-wide">
                {t('language_selector_title')}
              </p>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2">
                <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('search')}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                />
              </div>
            </div>

            {/* Language list */}
            <div
              className="overflow-y-auto py-1"
              style={{ maxHeight: 'min(260px, 50vh)' }}
            >
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">{t('no_results')}</p>
              ) : filtered.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setOpen(false); setSearch(''); }}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                    'hover:bg-slate-800 active:bg-slate-700 transition-colors',
                    language === lang.code ? 'bg-cyan-500/10' : '',
                  ].join(' ')}
                >
                  {/* Flag */}
                  <span className="text-lg leading-none shrink-0 w-6 text-center">{lang.flag}</span>

                  {/* Names */}
                  <div className="flex-1 min-w-0">
                    <p className={[
                      'text-sm font-semibold leading-snug truncate',
                      language === lang.code ? 'text-cyan-300' : 'text-white',
                    ].join(' ')}>
                      {lang.name}
                    </p>
                    <p className="text-xs text-slate-500 leading-snug truncate">
                      {lang.nativeName}
                    </p>
                  </div>

                  {/* Status icon — fixed width so it never overlaps text */}
                  <span className="shrink-0 w-5 flex items-center justify-center">
                    {languageLoading[lang.code] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    ) : language === lang.code ? (
                      <Check className="h-3.5 w-3.5 text-cyan-400" />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
