import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGES } from '@/lib/constants';
import i18n from '@/lib/i18n';
import type { TranslationKey } from '@/lib/translations';
import { piStorage } from '@/lib/pi-storage';

// ---------------------------------------------------------------------------
// Flat translation-key  →  i18next dot-path mapping
// Every key used anywhere in the app via useLanguage().t() maps here.
// ---------------------------------------------------------------------------
const KEY_MAP: Record<TranslationKey, string> = {
  // nav
  home: 'nav.home',
  shop: 'nav.shop',
  tournaments: 'nav.tournaments',
  wallet: 'nav.wallet',
  profile: 'nav.profile',

  // greeting
  good_morning: 'greeting.morning',
  good_afternoon: 'greeting.afternoon',
  good_evening: 'greeting.evening',

  // common
  loading: 'common.loading',
  save: 'common.save',
  cancel: 'common.cancel',
  submit: 'common.submit',
  edit: 'common.edit',
  delete: 'common.delete',
  confirm: 'common.confirm',
  close: 'common.close',
  back: 'common.back',
  next: 'common.next',
  search: 'common.search',
  copy: 'common.copy',
  copied: 'common.copied',
  share: 'common.share',
  refresh: 'common.refresh',
  retry: 'common.retry',
  error: 'common.error',
  success: 'common.success',
  pending: 'common.pending',
  completed: 'common.completed',
  cancelled: 'common.cancelled',
  status: 'common.status',
  amount: 'common.amount',
  date: 'common.date',
  no_data: 'common.no_data',
  coming_soon: 'common.coming_soon',
  previous: 'common.previous',
  see_all: 'common.see_all',
  view_all: 'common.view_all',
  warning: 'common.warning',
  info: 'common.info',
  beta: 'common.beta',
  new: 'common.new',
  free: 'common.free',
  paid: 'common.paid',

  // tournament
  participate_now: 'tournament.participate_now',
  match_in_progress: 'tournament.match_in_progress',
  view_tournament: 'tournament.view_tournament',
  register: 'tournament.register',
  teams: 'tournament.teams',
  rules: 'tournament.rules',
  lobby: 'tournament.lobby',
  rankings: 'tournament.rankings',
  registration_closed: 'tournament.registration_closed',
  registration_open: 'tournament.registration_open',
  in_progress: 'tournament.in_progress',
  registered: 'platform.registered',
  matches_underway: 'tournament.matches_underway',
  view_rankings: 'tournament.view_rankings',
  access_lobby: 'tournament.access_lobby',
  match_in_progress_notice: 'tournament.match_in_progress_notice',
  registration_closed_notice: 'tournament.registration_closed_notice',
  entry_fee: 'tournament.entry_fee',
  prize_pool: 'tournament.prize_pool',
  starts: 'tournament.starts',
  mode: 'tournament.mode',
  squad: 'tournament.squad',
  duo: 'tournament.duo',
  solo: 'tournament.solo',
  team_name: 'tournament.team_name',
  team_logo: 'tournament.team_logo',
  player: 'tournament.player',
  captain: 'tournament.captain',
  pubg_ign: 'tournament.pubg_ign',
  pubg_uid: 'tournament.pubg_uid',
  email: 'profile.email',
  phone: 'profile.phone',
  registration_completed: 'tournament.registration_completed',
  pay_entry: 'tournament.pay_entry',
  match_number: 'tournament.match_number',
  map: 'tournament.map',
  room_code: 'tournament.room_code',
  password: 'tournament.password',
  individual_standings: 'tournament.individual_standings',
  kills: 'tournament.kills',
  placement: 'tournament.placement',
  damage: 'tournament.damage',
  survival_time: 'tournament.survival_time',
  total: 'tournament.total',
  no_standings: 'tournament.no_standings',
  current_leader: 'tournament.current_leader',
  reach_1_to_claim: 'tournament.reach_1_to_claim',
  register_to_claim: 'tournament.register_to_claim',
  champion: 'tournament.champion',
  runner_up: 'tournament.runner_up',
  top_fragger: 'tournament.top_fragger',

  // platform
  platform_stats: 'platform.stats',
  total_users: 'platform.total_users',
  total_transactions: 'platform.total_transactions',
  live: 'platform.live',
  join_customers: 'platform.join_customers',
  recent_purchases: 'platform.recent_purchases',

  // earn
  earn_b4ut: 'earn.b4ut',
  watch_ad: 'earn.watch_ad',
  instant: 'earn.instant',
  per_view: 'earn.per_view',
  daily_login_reward: 'earn.daily_reward',
  tokens_available: 'earn.tokens_available',
  claimed: 'earn.claimed',
  next_claim: 'earn.next_claim',
  earn_tokens: 'earn.earn_tokens',
  token_balance: 'earn.token_balance',
  redeem: 'earn.redeem',
  daily_reward: 'earn.daily_reward',
  watch_earn: 'earn.watch_earn',

  // shop
  buy_tokens: 'shop.buy_tokens',
  services: 'shop.services',
  select_game: 'shop.select_game',
  select_package: 'shop.select_package',
  purchase: 'shop.purchase',
  price: 'shop.price',
  in_game_amount: 'shop.in_game_amount',
  add_to_cart: 'shop.add_to_cart',
  checkout: 'shop.checkout',
  payment_method: 'shop.payment_method',

  // wallet
  pi_balance: 'wallet.pi_balance',
  connect_wallet: 'wallet.connect_wallet',
  transaction_history: 'wallet.transaction_history',
  no_transactions: 'wallet.no_transactions',
  transaction_id: 'wallet.transaction_id',
  type: 'wallet.type',

  // profile
  username: 'profile.username',
  verified_pi_uid: 'profile.verified_pi_uid',
  country: 'profile.country',
  language: 'profile.language',
  update_profile: 'profile.update_profile',
  game_accounts: 'profile.game_accounts',
  social_accounts: 'profile.social_accounts',
  logout: 'profile.logout',
  settings: 'profile.settings',

  // feedback
  real_user_feedback: 'feedback.title',
  share_feedback: 'feedback.share',
  rating: 'feedback.rating',
  comment: 'feedback.comment',
  no_feedback: 'feedback.no_feedback',
  be_first: 'feedback.be_first',
  latest_feedback: 'feedback.latest',
  show_all_reviews: 'feedback.show_all',
  feedback_submitted: 'feedback.submitted',
  tokens_earned: 'feedback.tokens_earned',

  // referral
  referral_program: 'referral.program',
  start_inviting: 'referral.start_inviting',
  generate_link: 'referral.generate_link',
  referral_link: 'referral.link',

  // carousel / sections
  explore_now: 'carousel.explore_now',
  news: 'carousel.news',
  giveaways_rewards: 'carousel.giveaways',
  claim_rewards: 'carousel.claim_rewards',
  carousel_desc_welcome: 'carousel.desc_welcome',
  giveaways_desc: 'carousel.giveaways_desc',
  pioneers_badge: 'carousel.pioneers_badge',
  compete: 'carousel.compete',
  win_pi: 'carousel.win_pi',
  tournament_desc: 'carousel.tournament_desc',

  // referral extras
  referral_desc: 'referral.desc',
  earn_together: 'referral.earn_together',

  // shop extras
  shop_title: 'shop.title',
  choose_package_path: 'shop.choose_path',
  shop_subtitle: 'shop.subtitle',

  // language UI
  language_selector_title: 'language.selector_title',
  language_selector_search: 'language.search',
  detected_language: 'language.detected',
  switch: 'language.switch',
  switch_to_language: 'language.switch_to',
  no_results: 'language.no_results',

  // footer
  pi_network: 'footer.pi_network',
  powered_by: 'footer.powered_by',
  version: 'footer.version',
};

// ---------------------------------------------------------------------------
// Browser language detection
// ---------------------------------------------------------------------------
const BROWSER_LANG_MAP: Record<string, string> = {
  en: 'en', dz: 'dz', hi: 'hi', bn: 'bn', ne: 'ne',
  id: 'id', tl: 'tl', fil: 'tl', zh: 'zh', 'zh-cn': 'zh', 'zh-tw': 'zh',
  ja: 'ja', ko: 'ko', de: 'de', fr: 'fr', es: 'es', pt: 'pt',
  ar: 'ar', ru: 'ru', tr: 'tr', vi: 'vi', th: 'th', ms: 'ms',
  ur: 'ur', fa: 'fa', it: 'it', nl: 'nl', pl: 'pl', uk: 'uk',
  sv: 'sv', no: 'no', da: 'da', fi: 'fi', ro: 'ro', hu: 'hu',
  cs: 'cs', el: 'el', he: 'he', sw: 'sw', am: 'am', my: 'my',
  km: 'km', si: 'si', ta: 'ta', te: 'te', ml: 'ml', mn: 'mn', kk: 'kk',
};

function detectBrowserLanguage(): string | null {
  const langs = navigator.languages || [navigator.language];
  for (const l of langs) {
    const code = l.toLowerCase().split('-')[0];
    const full = l.toLowerCase();
    if (BROWSER_LANG_MAP[full]) return BROWSER_LANG_MAP[full];
    if (BROWSER_LANG_MAP[code]) return BROWSER_LANG_MAP[code];
  }
  return null;
}

// Languages with a locale JSON file already shipped
const JSON_SUPPORTED = new Set(['en', 'zh', 'ja', 'ko', 'de', 'hi', 'bn', 'ne', 'id', 'tl', 'fr', 'es', 'pt', 'ar', 'ru']);

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => void;
  detectedLanguage: string | null;
  showLanguageBanner: boolean;
  dismissBanner: () => void;
  acceptSuggestion: () => void;
  currentLang: typeof LANGUAGES[0] | undefined;
  detectedLang: typeof LANGUAGES[0] | undefined;
  t: (key: TranslationKey) => string;
  languageLoading: Record<string, boolean>;
  languageErrors: Record<string, string | null>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  detectedLanguage: null,
  showLanguageBanner: false,
  dismissBanner: () => {},
  acceptSuggestion: () => {},
  currentLang: LANGUAGES[0],
  detectedLang: undefined,
  t: (key) => key,
  languageLoading: {},
  languageErrors: {},
});

const STORAGE_KEY = 'b4u_language';
const BANNER_DISMISSED_KEY = 'b4u_lang_banner_dismissed';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    const stored = piStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    if (i18n.language && i18n.language !== 'en') {
      const code = i18n.language.split('-')[0];
      if (code) return code;
    }
    try {
      const storedUser = piStorage.getItem('pi_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u?.language && u.language !== 'en') return u.language;
      }
    } catch {}
    return 'en';
  });

  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [showLanguageBanner, setShowLanguageBanner] = useState(false);
  const [languageLoading, setLanguageLoading] = useState<Record<string, boolean>>({});
  const [languageErrors, setLanguageErrors] = useState<Record<string, string | null>>({});

  // Detect browser language on mount
  useEffect(() => {
    const detected = detectBrowserLanguage();
    if (!detected || detected === 'en') return;
    setDetectedLanguage(detected);
    const stored = piStorage.getItem(STORAGE_KEY);
    const dismissed = piStorage.getItem(BANNER_DISMISSED_KEY);
    if (!stored && !dismissed && detected !== language) {
      setTimeout(() => setShowLanguageBanner(true), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply RTL / lang attribute whenever language changes
  useEffect(() => {
    const rtl = ['ar', 'he', 'fa', 'ur'];
    document.documentElement.dir = rtl.includes(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // For languages without a JSON file, call the Ollama endpoint so i18next
  // can use the generated strings via addResourceBundle.
  const loadOllamaLanguage = useCallback(async (code: string) => {
    if (JSON_SUPPORTED.has(code) || languageLoading[code]) return;

    // Check if already loaded into i18next
    if (i18n.hasResourceBundle(code, 'translation')) return;

    // Try device storage cache first
    try {
      const cached = piStorage.getItem(`b4u_i18n_${code}`);
      if (cached) {
        i18n.addResourceBundle(code, 'translation', JSON.parse(cached), true, true);
        return;
      }
    } catch {}

    setLanguageLoading(prev => ({ ...prev, [code]: true }));
    setLanguageErrors(prev => ({ ...prev, [code]: null }));

    try {
      const res = await fetch('/api/translation/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLang: code }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Build a nested JSON bundle matching our JSON structure from flat keys
      const flat: Record<string, string> = data.translations || {};
      const bundle: Record<string, Record<string, string>> = {};
      Object.entries(KEY_MAP).forEach(([flatKey, dotPath]) => {
        const val = flat[flatKey as TranslationKey];
        if (!val) return;
        const [ns, ...rest] = dotPath.split('.');
        if (!bundle[ns]) bundle[ns] = {};
        bundle[ns][rest.join('.')] = val;
      });

      i18n.addResourceBundle(code, 'translation', bundle, true, true);
      try {
        piStorage.setItem(`b4u_i18n_${code}`, JSON.stringify(bundle));
      } catch {}
    } catch (err: any) {
      const msg = err?.message || 'Translation generation failed';
      setLanguageErrors(prev => ({ ...prev, [code]: msg }));
      console.error('Ollama translation failed for', code, msg);
    } finally {
      setLanguageLoading(prev => ({ ...prev, [code]: false }));
    }
  }, [languageLoading]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    piStorage.setItem(STORAGE_KEY, code);
    setShowLanguageBanner(false);

    // Sync i18next — this triggers re-renders in every useTranslation consumer
    i18n.changeLanguage(code);

    const rtl = ['ar', 'he', 'fa', 'ur'];
    document.documentElement.dir = rtl.includes(code) ? 'rtl' : 'ltr';
    document.documentElement.lang = code;

    // Persist to profile silently
    const token = piStorage.getItem('pi_token');
    if (token) {
      fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language: code }),
      }).catch(() => {});
    }

    if (!JSON_SUPPORTED.has(code)) {
      loadOllamaLanguage(code);
    }
  }, [loadOllamaLanguage]);

  // Load Ollama bundle if current language has no JSON file
  useEffect(() => {
    if (!JSON_SUPPORTED.has(language)) {
      loadOllamaLanguage(language);
    }
  }, [language, loadOllamaLanguage]);

  const dismissBanner = useCallback(() => {
    setShowLanguageBanner(false);
    piStorage.setItem(BANNER_DISMISSED_KEY, '1');
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (detectedLanguage) setLanguage(detectedLanguage);
    setShowLanguageBanner(false);
  }, [detectedLanguage, setLanguage]);

  // t() — resolves a flat TranslationKey via i18next using the dot-path mapping
  const tFn = useCallback((key: TranslationKey): string => {
    const dotPath = KEY_MAP[key];
    if (!dotPath) return key;
    const result = i18n.t(dotPath);
    // i18next returns the key itself when missing — fall back to English
    if (!result || result === dotPath) {
      return i18n.t(dotPath, { lng: 'en' }) || key;
    }
    return result;
  }, []);  // i18n.t is stable; language changes are handled by i18n.changeLanguage

  const currentLang = LANGUAGES.find(l => l.code === language);
  const detectedLang = detectedLanguage ? LANGUAGES.find(l => l.code === detectedLanguage) : undefined;

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      detectedLanguage,
      showLanguageBanner,
      dismissBanner,
      acceptSuggestion,
      currentLang,
      detectedLang,
      t: tFn,
      languageLoading,
      languageErrors,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
