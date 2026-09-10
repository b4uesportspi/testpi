// Translation key type — all flat keys used via useLanguage().t()
// The actual translations live in /public/locales/{lang}/translation.json
// and are loaded by i18next at runtime.

export type TranslationKey =
  // nav
  | 'home' | 'shop' | 'tournaments' | 'wallet' | 'profile'
  // greeting
  | 'good_morning' | 'good_afternoon' | 'good_evening'
  // tournament
  | 'participate_now' | 'match_in_progress' | 'view_tournament'
  | 'register' | 'teams' | 'rules' | 'lobby' | 'rankings'
  | 'registration_closed' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled'
  | 'matches_underway' | 'view_rankings' | 'access_lobby' | 'registered'
  | 'match_in_progress_notice' | 'registration_closed_notice'
  | 'entry_fee' | 'prize_pool' | 'starts' | 'mode'
  | 'champion' | 'runner_up' | 'top_fragger' | 'pending'
  | 'squad' | 'duo' | 'solo' | 'team_name' | 'team_logo' | 'player' | 'captain'
  | 'pubg_ign' | 'pubg_uid' | 'email' | 'phone' | 'registration_completed'
  | 'pay_entry' | 'match_number' | 'map' | 'room_code' | 'password'
  | 'individual_standings' | 'kills' | 'placement' | 'damage' | 'survival_time' | 'total'
  | 'no_standings' | 'current_leader' | 'reach_1_to_claim' | 'register_to_claim'
  // platform
  | 'platform_stats' | 'total_users' | 'total_transactions'
  | 'live' | 'join_customers' | 'recent_purchases'
  // earn
  | 'earn_b4ut' | 'watch_ad' | 'instant' | 'per_view'
  | 'daily_login_reward' | 'tokens_available' | 'claimed' | 'next_claim'
  | 'earn_tokens' | 'token_balance' | 'redeem' | 'daily_reward' | 'watch_earn'
  // shop
  | 'buy_tokens' | 'services' | 'select_game' | 'select_package' | 'purchase' | 'price'
  | 'in_game_amount' | 'add_to_cart' | 'checkout' | 'payment_method'
  | 'shop_title' | 'choose_package_path' | 'shop_subtitle'
  // wallet
  | 'pi_balance' | 'connect_wallet' | 'transaction_history' | 'no_transactions'
  | 'transaction_id' | 'amount' | 'status' | 'date' | 'type'
  // profile
  | 'username' | 'verified_pi_uid' | 'country' | 'language' | 'update_profile'
  | 'game_accounts' | 'social_accounts' | 'logout' | 'settings'
  // feedback
  | 'real_user_feedback' | 'share_feedback' | 'rating' | 'comment'
  | 'no_feedback' | 'be_first' | 'latest_feedback'
  | 'show_all_reviews' | 'feedback_submitted' | 'tokens_earned'
  // referral
  | 'referral_program' | 'start_inviting' | 'generate_link' | 'referral_link'
  | 'referral_desc' | 'earn_together'
  // carousel / sections
  | 'explore_now' | 'news' | 'giveaways_rewards' | 'claim_rewards'
  | 'carousel_desc_welcome' | 'giveaways_desc'
  | 'pioneers_badge' | 'compete' | 'win_pi' | 'tournament_desc'
  // common
  | 'loading' | 'save' | 'edit' | 'delete' | 'confirm' | 'submit' | 'cancel'
  | 'search' | 'close' | 'back' | 'next' | 'previous' | 'see_all' | 'view_all'
  | 'error' | 'success' | 'warning' | 'info' | 'retry' | 'refresh'
  | 'no_data' | 'coming_soon' | 'beta' | 'new' | 'free' | 'paid'
  | 'copy' | 'share' | 'copied'
  // language UI
  | 'language_selector_title' | 'language_selector_search'
  | 'detected_language' | 'switch' | 'switch_to_language' | 'no_results'
  // footer
  | 'pi_network' | 'powered_by' | 'version';
