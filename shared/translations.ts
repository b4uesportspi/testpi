export type TranslationKey =
  | 'home' | 'shop' | 'tournaments' | 'wallet' | 'profile'
  | 'participate_now' | 'match_in_progress' | 'view_tournament'
  | 'register' | 'teams' | 'rules' | 'lobby' | 'rankings'
  | 'registration_closed' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled'
  | 'matches_underway' | 'view_rankings' | 'access_lobby'
  | 'platform_stats' | 'total_users' | 'total_transactions' | 'registered'
  | 'language_selector_title' | 'language_selector_search' | 'detected_language' | 'switch' | 'switch_to_language' | 'no_results'
  | 'earn_b4ut' | 'watch_ad' | 'instant' | 'per_view'
  | 'recent_purchases' | 'live' | 'join_customers'
  | 'real_user_feedback' | 'share_feedback' | 'submit' | 'cancel'
  | 'good_morning' | 'good_afternoon' | 'good_evening'
  | 'loading' | 'save' | 'edit' | 'delete' | 'confirm'
  | 'entry_fee' | 'prize_pool' | 'starts' | 'mode'
  | 'champion' | 'runner_up' | 'top_fragger' | 'pending'
  | 'match_in_progress_notice' | 'registration_closed_notice'
  | 'explore_now' | 'news' | 'referral_program' | 'giveaways_rewards' | 'claim_rewards'
  | 'start_inviting' | 'daily_login_reward' | 'tokens_available' | 'claimed' | 'next_claim'
  | 'buy_tokens' | 'services' | 'select_game' | 'select_package' | 'purchase' | 'price'
  | 'in_game_amount' | 'add_to_cart' | 'checkout' | 'payment_method'
  | 'pi_balance' | 'connect_wallet' | 'transaction_history' | 'no_transactions'
  | 'transaction_id' | 'amount' | 'status' | 'date' | 'type'
  | 'squad' | 'duo' | 'solo' | 'team_name' | 'team_logo' | 'player' | 'captain'
  | 'pubg_ign' | 'pubg_uid' | 'email' | 'phone' | 'registration_completed'
  | 'pay_entry' | 'match_number' | 'map' | 'room_code' | 'password'
  | 'individual_standings' | 'kills' | 'placement' | 'damage' | 'survival_time' | 'total'
  | 'no_standings' | 'current_leader' | 'reach_1_to_claim' | 'register_to_claim'
  | 'username' | 'verified_pi_uid' | 'country' | 'language' | 'update_profile'
  | 'game_accounts' | 'social_accounts' | 'logout' | 'settings'
  | 'rating' | 'comment' | 'no_feedback' | 'be_first' | 'latest_feedback'
  | 'show_all_reviews' | 'feedback_submitted' | 'tokens_earned'
  | 'search' | 'close' | 'back' | 'next' | 'previous' | 'see_all' | 'view_all'
  | 'error' | 'success' | 'warning' | 'info' | 'retry' | 'refresh'
  | 'no_data' | 'coming_soon' | 'beta' | 'new' | 'free' | 'paid'
  | 'copy' | 'share' | 'copied' | 'generate_link' | 'referral_link'
  | 'earn_tokens' | 'token_balance' | 'redeem' | 'daily_reward' | 'watch_earn'
  | 'pi_network' | 'powered_by' | 'version';

export type Translations = Partial<Record<TranslationKey, string>>;
type LangMap = Record<string, Translations>;

const en: Translations = {
  home: 'Home', shop: 'Shop', tournaments: 'Tournaments', wallet: 'Wallet', profile: 'Profile',
  participate_now: 'Participate Now', match_in_progress: 'Match In Progress', view_tournament: 'View Tournament',
  register: 'Register', teams: 'Teams', rules: 'Rules', lobby: 'Lobby', rankings: 'Rankings',
  registration_closed: 'Registration Closed', registration_open: 'Registration Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', registered: 'registered',
  matches_underway: 'Matches are currently underway.', view_rankings: 'View Rankings', access_lobby: 'Access Lobby',
  platform_stats: 'Platform Stats', total_users: 'Total Users', total_transactions: 'Transactions',
  language_selector_title: 'Language', language_selector_search: 'Search language...', detected_language: 'We detected your language', switch: 'Switch', switch_to_language: 'Switch to', no_results: 'No results',
  earn_b4ut: 'Earn B4UT Tokens', watch_ad: 'Watch', instant: 'Instant', per_view: 'Per view',
  recent_purchases: 'Recent Purchases', live: 'Live', join_customers: 'happy customers',
  real_user_feedback: 'Real User Feedback', share_feedback: 'Share Feedback & Earn +10 B4UT',
  submit: 'Submit', cancel: 'Cancel',
  good_morning: 'Good Morning', good_afternoon: 'Good Afternoon', good_evening: 'Good Evening',
  loading: 'Loading...', save: 'Save', edit: 'Edit', delete: 'Delete', confirm: 'Confirm',
  entry_fee: 'Entry', prize_pool: 'Prize', starts: 'Starts', mode: 'Mode',
  champion: 'Champion', runner_up: 'Runner-up', top_fragger: 'Top Fragger', pending: 'Pending',
  match_in_progress_notice: 'Tournament registration has closed. Matches are currently underway.',
  registration_closed_notice: 'Registration is closed. Use the tabs above to view Teams, Lobby, and Rankings.',
  explore_now: 'Explore Now', news: 'News & Announcements', referral_program: 'Referral Program',
  giveaways_rewards: 'Giveaways & Rewards', claim_rewards: 'Claim Rewards', start_inviting: 'Start Inviting',
  daily_login_reward: 'Daily Login Reward', tokens_available: 'tokens available now!', claimed: 'Claimed', next_claim: 'Next claim',
  buy_tokens: 'Buy Tokens', services: 'Services', select_game: 'Select Game', select_package: 'Select Package',
  purchase: 'Purchase', price: 'Price', in_game_amount: 'In-Game Amount', add_to_cart: 'Add to Cart',
  checkout: 'Checkout', payment_method: 'Payment Method',
  pi_balance: 'Pi Balance', connect_wallet: 'Connect Wallet', transaction_history: 'Transaction History',
  no_transactions: 'No transactions yet.', transaction_id: 'Transaction ID', amount: 'Amount',
  status: 'Status', date: 'Date', type: 'Type',
  squad: 'Squad', duo: 'Duo', solo: 'Solo', team_name: 'Team Name', team_logo: 'Team Logo',
  player: 'Player', captain: 'Captain', pubg_ign: 'PUBG IGN', pubg_uid: 'PUBG UID',
  email: 'Email', phone: 'Phone', registration_completed: 'Registration Completed',
  pay_entry: 'Confirm & Pay Entry', match_number: 'Match', map: 'Map', room_code: 'Room Code', password: 'Password',
  individual_standings: 'Individual Standings', kills: 'Kills', placement: 'Placement',
  damage: 'Damage', survival_time: 'Survival', total: 'Total',
  no_standings: 'No standings yet. Results will appear after matches are completed.',
  current_leader: 'Current Leader', reach_1_to_claim: 'Reach #1 to claim', register_to_claim: 'Register to claim',
  username: 'Username', verified_pi_uid: 'Verified Pi UID', country: 'Country', language: 'Language',
  update_profile: 'Update Profile', game_accounts: 'Game Accounts', social_accounts: 'Social Accounts',
  logout: 'Logout', settings: 'Settings',
  rating: 'Rating', comment: 'Comment', no_feedback: 'No feedback yet. Be the first!',
  be_first: 'Be the first!', latest_feedback: 'Latest Feedback', show_all_reviews: 'Show all reviews',
  feedback_submitted: 'Feedback submitted!', tokens_earned: 'tokens earned',
  search: 'Search', close: 'Close', back: 'Back', next: 'Next', previous: 'Previous',
  see_all: 'See All', view_all: 'View All', error: 'Error', success: 'Success',
  warning: 'Warning', info: 'Info', retry: 'Retry', refresh: 'Refresh',
  no_data: 'No data available', coming_soon: 'Coming Soon', beta: 'Beta', new: 'New', free: 'Free', paid: 'Paid',
  copy: 'Copy', share: 'Share', copied: 'Copied!', generate_link: 'Generate Referral Link', referral_link: 'Referral Link',
  earn_tokens: 'Earn Tokens', token_balance: 'Token Balance', redeem: 'Redeem',
  daily_reward: 'Daily Reward', watch_earn: 'Watch & Earn',
  pi_network: 'Pi Network', powered_by: 'Powered by', version: 'Version',
};

const zh: Translations = {
  home: '首页', shop: '商店', tournaments: '锦标赛', wallet: '钱包', profile: '个人资料',
  participate_now: '立即参与', match_in_progress: '比赛进行中', view_tournament: '查看赛事',
  register: '注册', teams: '队伍', rules: '规则', lobby: '大厅', rankings: '排名',
  registration_closed: '报名已关闭', registration_open: '报名开放', in_progress: '进行中', completed: '已完成', cancelled: '已取消', registered: '已注册', matches_underway: '比赛正在进行中。',
  view_rankings: '查看排名', access_lobby: '进入大厅',
  platform_stats: '平台统计', total_users: '总用户', total_transactions: '交易总数',
  switch_to_language: '切换到 {language}？',
  earn_b4ut: '赚取B4UT代币', watch_ad: '观看', instant: '即时', per_view: '每次观看',
  recent_purchases: '最近购买', live: '直播', join_customers: '位满意客户',
  real_user_feedback: '真实用户反馈', share_feedback: '分享反馈并获得+10 B4UT',
  language_selector_title: '更改语言', language_selector_search: '搜索语言...', detected_language: '我们检测到你的语言', switch: '切换', no_results: '无结果',
  submit: '提交', cancel: '取消',
  good_morning: '早上好', good_afternoon: '下午好', good_evening: '晚上好',
  loading: '加载中...', save: '保存', edit: '编辑', delete: '删除', confirm: '确认',
  entry_fee: '报名费', prize_pool: '奖池', starts: '开始', mode: '模式',
  champion: '冠军', runner_up: '亚军', top_fragger: '最佳击杀', pending: '待定',
  match_in_progress_notice: '锦标赛报名已关闭，比赛正在进行中。',
  registration_closed_notice: '报名已关闭。请使用上方标签查看队伍、大厅和排名。',
};

const ja: Translations = {
  home: 'ホーム', shop: 'ショップ', tournaments: 'トーナメント', wallet: 'ウォレット', profile: 'プロフィール',
  participate_now: '今すぐ参加', match_in_progress: '試合進行中', view_tournament: 'トーナメントを見る',
  register: '登録', teams: 'チーム', rules: 'ルール', lobby: 'ロビー', rankings: 'ランキング',
  registration_closed: '登録終了', registration_open: '登録受付中', in_progress: '進行中', completed: '完了', cancelled: 'キャンセル', registered: '登録済み', matches_underway: '試合が進行中です。',
  view_rankings: 'ランキングを見る', access_lobby: 'ロビーにアクセス',
  platform_stats: 'プラットフォーム統計', total_users: '総ユーザー数', total_transactions: '取引数',
  switch_to_language: '{language} に切り替えますか？',
  earn_b4ut: 'B4UTトークンを獲得', watch_ad: '視聴', instant: '即時', per_view: '1回あたり',
  recent_purchases: '最近の購入', live: 'ライブ', join_customers: '人の満足したお客様',
  real_user_feedback: 'ユーザーレビュー', share_feedback: 'フィードバックを共有して+10 B4UTを獲得',
  language_selector_title: '言語を変更', language_selector_search: '言語を検索...', detected_language: '言語を検出しました', switch: '切り替え', no_results: '結果がありません',
  submit: '送信', cancel: 'キャンセル',
  good_morning: 'おはようございます', good_afternoon: 'こんにちは', good_evening: 'こんばんは',
  loading: '読み込み中...', save: '保存', edit: '編集', delete: '削除', confirm: '確認',
  entry_fee: '参加費', prize_pool: '賞金', starts: '開始', mode: 'モード',
  champion: 'チャンピオン', runner_up: '準優勝', top_fragger: 'トップフラッガー', pending: '保留中',
  match_in_progress_notice: 'トーナメントの登録は終了しました。試合が進行中です。',
  registration_closed_notice: '登録は終了しました。上のタブでチーム、ロビー、ランキングを確認してください。',
};

const ko: Translations = {
  home: '홈', shop: '상점', tournaments: '토너먼트', wallet: '지갑', profile: '프로필',
  participate_now: '지금 참가', match_in_progress: '경기 진행 중', view_tournament: '토너먼트 보기',
  register: '등록', teams: '팀', rules: '규칙', lobby: '로비', rankings: '순위',
  registration_closed: '등록 마감', registration_open: '등록 오픈', in_progress: '진행 중', completed: '완료됨', cancelled: '취소됨', registered: '등록됨', matches_underway: '경기가 진행 중입니다.',
  view_rankings: '순위 보기', access_lobby: '로비 접속',
  platform_stats: '플랫폼 통계', total_users: '총 사용자', total_transactions: '거래 수',
  switch_to_language: '{language}로 전환하시겠습니까?',
  earn_b4ut: 'B4UT 토큰 획득', watch_ad: '시청', instant: '즉시', per_view: '회당',
  recent_purchases: '최근 구매', live: '라이브', join_customers: '명의 만족한 고객',
  real_user_feedback: '실제 사용자 피드백', share_feedback: '피드백 공유하고 +10 B4UT 획득',
  language_selector_title: '언어 변경', language_selector_search: '언어 검색...', detected_language: '언어를 감지했습니다', switch: '전환', no_results: '결과 없음',
  submit: '제출', cancel: '취소',
  good_morning: '좋은 아침', good_afternoon: '안녕하세요', good_evening: '좋은 저녁',
  loading: '로딩 중...', save: '저장', edit: '편집', delete: '삭제', confirm: '확인',
  entry_fee: '참가비', prize_pool: '상금', starts: '시작', mode: '모드',
  champion: '챔피언', runner_up: '준우승', top_fragger: '최다 킬', pending: '대기 중',
  match_in_progress_notice: '토너먼트 등록이 마감되었습니다. 경기가 진행 중입니다.',
  registration_closed_notice: '등록이 마감되었습니다. 위 탭에서 팀, 로비, 순위를 확인하세요.',
};

const de: Translations = {
  home: 'Startseite', shop: 'Shop', tournaments: 'Turniere', wallet: 'Wallet', profile: 'Profil',
  participate_now: 'Jetzt teilnehmen', match_in_progress: 'Spiel läuft', view_tournament: 'Turnier ansehen',
  register: 'Registrieren', teams: 'Teams', rules: 'Regeln', lobby: 'Lobby', rankings: 'Rangliste',
  registration_closed: 'Anmeldung geschlossen', matches_underway: 'Spiele laufen gerade.',
  view_rankings: 'Rangliste ansehen', access_lobby: 'Lobby betreten',
  platform_stats: 'Plattform-Statistiken', total_users: 'Gesamtnutzer', total_transactions: 'Transaktionen',
  earn_b4ut: 'B4UT-Token verdienen', watch_ad: 'Ansehen', instant: 'Sofort', per_view: 'Pro Ansicht',
  recent_purchases: 'Letzte Käufe', live: 'Live', join_customers: 'zufriedene Kunden',
  real_user_feedback: 'Echtes Nutzerfeedback', share_feedback: 'Feedback teilen & +10 B4UT verdienen',
  language_selector_title: 'Sprache ändern', language_selector_search: 'Sprache suchen...', detected_language: 'Wir haben deine Sprache erkannt', switch: 'Wechseln', no_results: 'Keine Ergebnisse',
  submit: 'Absenden', cancel: 'Abbrechen',
  good_morning: 'Guten Morgen', good_afternoon: 'Guten Tag', good_evening: 'Guten Abend',
  loading: 'Laden...', save: 'Speichern', edit: 'Bearbeiten', delete: 'Löschen', confirm: 'Bestätigen',
  entry_fee: 'Eintritt', prize_pool: 'Preisgeld', starts: 'Beginnt', mode: 'Modus',
  champion: 'Champion', runner_up: 'Vizemeister', top_fragger: 'Top-Fragger', pending: 'Ausstehend',
  match_in_progress_notice: 'Die Turnierregistrierung ist geschlossen. Spiele laufen.',
  registration_closed_notice: 'Registrierung geschlossen. Nutze die Tabs für Teams, Lobby und Rangliste.',
};

const hi: Translations = {
  home: 'होम', shop: 'दुकान', tournaments: 'टूर्नामेंट', wallet: 'वॉलेट', profile: 'प्रोफ़ाइल',
  participate_now: 'अभी भाग लें', match_in_progress: 'मैच जारी है', view_tournament: 'टूर्नामेंट देखें',
  register: 'पंजीकरण', teams: 'टीमें', rules: 'नियम', lobby: 'लॉबी', rankings: 'रैंकिंग',
  registration_closed: 'पंजीकरण बंद', registration_open: 'नामांकन खुला', in_progress: 'चालू है', completed: 'पूर्ण', cancelled: 'रद्द', registered: 'पंजीकृत', matches_underway: 'मैच चल रहे हैं।',
  view_rankings: 'रैंकिंग देखें', access_lobby: 'लॉबी एक्सेस करें',
  platform_stats: 'प्लेटफ़ॉर्म आँकड़े', total_users: 'कुल उपयोगकर्ता', total_transactions: 'लेनदेन',
  switch_to_language: '{language} पर स्विच करें?',
  earn_b4ut: 'B4UT टोकन कमाएं', watch_ad: 'देखें', instant: 'तुरंत', per_view: 'प्रति दृश्य',
  recent_purchases: 'हाल की खरीदारी', live: 'लाइव', join_customers: 'संतुष्ट ग्राहक',
  real_user_feedback: 'वास्तविक उपयोगकर्ता प्रतिक्रिया', share_feedback: 'फ़ीडबैक दें और +10 B4UT पाएं',
  language_selector_title: 'भाषा बदलें', language_selector_search: 'भाषा खोजें...', detected_language: 'हमने आपकी भाषा पहचानी है', switch: 'बदलें', no_results: 'कोई परिणाम नहीं',
  submit: 'जमा करें', cancel: 'रद्द करें',
  good_morning: 'सुप्रभात', good_afternoon: 'नमस्ते', good_evening: 'शुभ संध्या',
  loading: 'लोड हो रहा है...', save: 'सहेजें', edit: 'संपादित करें', delete: 'हटाएं', confirm: 'पुष्टि करें',
  entry_fee: 'प्रवेश शुल्क', prize_pool: 'पुरस्कार', starts: 'शुरू', mode: 'मोड',
  champion: 'चैंपियन', runner_up: 'उपविजेता', top_fragger: 'टॉप फ्रैगर', pending: 'लंबित',
  match_in_progress_notice: 'टूर्नामेंट पंजीकरण बंद हो गया है। मैच चल रहे हैं।',
  registration_closed_notice: 'पंजीकरण बंद है। टीम, लबी और रैंकिंग देखने के लिए टैब का उपयोग करें।',
};

const bn: Translations = {
  home: 'হোম', shop: 'দোকান', tournaments: 'টুর্নামেন্ট', wallet: 'ওয়ালেট', profile: 'প্রোফাইল',
  participate_now: 'এখনই অংশগ্রহণ করুন', match_in_progress: 'ম্যাচ চলছে', view_tournament: 'টুর্নামেন্ট দেখুন',
  register: 'নিবন্ধন', teams: 'দল', rules: 'নিয়ম', lobby: 'লবি', rankings: 'র‍্যাংকিং',
  registration_closed: 'নিবন্ধন বন্ধ', registration_open: 'নিবন্ধন খোলা', in_progress: 'চলমান', completed: 'সম্পন্ন', cancelled: 'বাতিল', registered: 'নিবন্ধিত', matches_underway: 'ম্যাচ চলছে।',
  view_rankings: 'র‍্যাংকিং দেখুন', access_lobby: 'লবি অ্যাক্সেস করুন',
  platform_stats: 'প্ল্যাটফর্ম পরিসংখ্যান', total_users: 'মোট ব্যবহারকারী', total_transactions: 'লেনদেন',
  switch_to_language: '{language} এ স্যুইচ করতে চান?',
  earn_b4ut: 'B4UT টোকেন উপার্জন করুন', watch_ad: 'দেখুন', instant: 'তাৎক্ষণিক', per_view: 'প্রতি দর্শন',
  recent_purchases: 'সাম্প্রতিক কেনাকাটা', live: 'লাইভ', join_customers: 'সন্তুষ্ট গ্রাহক',
  real_user_feedback: 'বাস্তব ব্যবহারকারীর মতামত', share_feedback: 'মতামত শেয়ার করুন ও +10 B4UT পান',
  language_selector_title: 'ভাষা পরিবর্তন করুন', language_selector_search: 'ভাষা সন্ধান করুন...', detected_language: 'আমরা আপনার ভাষা সনাক্ত করেছি', switch: 'পরিবর্তন করুন', no_results: 'কোন ফলাফল নেই',
  submit: 'জমা দিন', cancel: 'বাতিল',
  good_morning: 'শুভ সকাল', good_afternoon: 'শুভ দুপুর', good_evening: 'শুভ সন্ধ্যা',
  loading: 'লোড হচ্ছে...', save: 'সংরক্ষণ', edit: 'সম্পাদনা', delete: 'মুছুন', confirm: 'নিশ্চিত করুন',
  entry_fee: 'প্রবেশ ফি', prize_pool: 'পুরস্কার', starts: 'শুরু', mode: 'মোড',
  champion: 'চ্যাম্পিয়ন', runner_up: 'রানার-আপ', top_fragger: 'টপ ফ্র্যাগার', pending: 'অপেক্ষমাণ',
  match_in_progress_notice: 'টুর্নামেন্ট নিবন্ধন বন্ধ হয়েছে। ম্যাচ চলছে।',
  registration_closed_notice: 'নিবন্ধন বন্ধ। দল, লবি এবং র‍্যাংকিং দেখতে ট্যাব ব্যবহার করুন।',
};

const ne: Translations = {
  home: 'गृह', shop: 'पसल', tournaments: 'टूर्नामेन्ट', wallet: 'वालेट', profile: 'प्रोफाइल',
  participate_now: 'अहिले सहभागी हुनुहोस्', match_in_progress: 'खेल जारी छ', view_tournament: 'टूर्नामेन्ट हेर्नुहोस्',
  register: 'दर्ता', teams: 'टोलीहरू', rules: 'नियमहरू', lobby: 'लबी', rankings: 'र्याङ्किङ',
  registration_closed: 'दर्ता बन्द', registration_open: 'दर्ता खुल्यो', in_progress: 'चालू छ', completed: 'सम्पन्न', cancelled: 'रद्द', registered: 'दर्ता गरिएको', matches_underway: 'खेलहरू जारी छन्।',
  view_rankings: 'र्याङ्किङ हेर्नुहोस्', access_lobby: 'लबी पहुँच गर्नुहोस्',
  platform_stats: 'प्लेटफर्म तथ्याङ्क', total_users: 'कुल प्रयोगकर्ता', total_transactions: 'कारोबार',
  switch_to_language: '{language} मा स्विच गर्ने?',
  earn_b4ut: 'B4UT टोकन कमाउनुहोस्', watch_ad: 'हेर्नुहोस्', instant: 'तत्काल', per_view: 'प्रति दृश्य',
  recent_purchases: 'हालका खरिदहरू', live: 'लाइभ', join_customers: 'सन्तुष्ट ग्राहकहरू',
  real_user_feedback: 'वास्तविक प्रयोगकर्ता प्रतिक्रिया', share_feedback: 'प्रतिक्रिया दिनुहोस् र +10 B4UT पाउनुहोस्',
  language_selector_title: 'भाषा परिवर्तन गर्नुहोस्', language_selector_search: 'भाषा खोज्नुहोस्...', detected_language: 'हामीले तपाईंको भाषा पत्ता लगायौं', switch: 'स्विच', no_results: 'परिणाम छैन',
  submit: 'पेश गर्नुहोस्', cancel: 'रद्द गर्नुहोस्',
  good_morning: 'शुभ प्रभात', good_afternoon: 'नमस्ते', good_evening: 'शुभ साँझ',
  loading: 'लोड हुँदैछ...', save: 'सुरक्षित गर्नुहोस्', edit: 'सम्पादन', delete: 'मेटाउनुहोस्', confirm: 'पुष्टि गर्नुहोस्',
  entry_fee: 'प्रवेश शुल्क', prize_pool: 'पुरस्कार', starts: 'सुरु', mode: 'मोड',
  champion: 'च्याम्पियन', runner_up: 'उपविजेता', top_fragger: 'टप फ्र्यागर', pending: 'बाँकी',
  match_in_progress_notice: 'टूर्नामेन्ट दर्ता बन्द भयो। खेलहरू जारी छन्।',
  registration_closed_notice: 'दर्ता बन्द छ। टोली, लबी र र्याङ्किङ हेर्न ट्याब प्रयोग गर्नुहोस्।',
};

const id: Translations = {
  home: 'Beranda', shop: 'Toko', tournaments: 'Turnamen', wallet: 'Dompet', profile: 'Profil',
  participate_now: 'Ikuti Sekarang', match_in_progress: 'Pertandingan Berlangsung', view_tournament: 'Lihat Turnamen',
  register: 'Daftar', teams: 'Tim', rules: 'Aturan', lobby: 'Lobi', rankings: 'Peringkat',
  registration_closed: 'Pendaftaran Ditutup', registration_open: 'Pendaftaran Dibuka', in_progress: 'Sedang Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan', registered: 'Terdaftar', matches_underway: 'Pertandingan sedang berlangsung.',
  view_rankings: 'Lihat Peringkat', access_lobby: 'Akses Lobi',
  platform_stats: 'Statistik Platform', total_users: 'Total Pengguna', total_transactions: 'Transaksi',
  switch_to_language: 'Beralih ke {language}?',
  earn_b4ut: 'Dapatkan Token B4UT', watch_ad: 'Tonton', instant: 'Instan', per_view: 'Per tayangan',
  recent_purchases: 'Pembelian Terbaru', live: 'Langsung', join_customers: 'pelanggan puas',
  real_user_feedback: 'Ulasan Pengguna Nyata', share_feedback: 'Bagikan Ulasan & Dapatkan +10 B4UT',
  language_selector_title: 'Ubah bahasa', language_selector_search: 'Cari bahasa...', detected_language: 'Kami mendeteksi bahasa Anda', switch: 'Ubah', no_results: 'Tidak ada hasil',
  submit: 'Kirim', cancel: 'Batal',
  good_morning: 'Selamat Pagi', good_afternoon: 'Selamat Siang', good_evening: 'Selamat Malam',
  loading: 'Memuat...', save: 'Simpan', edit: 'Edit', delete: 'Hapus', confirm: 'Konfirmasi',
  entry_fee: 'Biaya Masuk', prize_pool: 'Hadiah', starts: 'Mulai', mode: 'Mode',
  champion: 'Juara', runner_up: 'Runner-up', top_fragger: 'Top Fragger', pending: 'Tertunda',
  match_in_progress_notice: 'Pendaftaran turnamen telah ditutup. Pertandingan sedang berlangsung.',
  registration_closed_notice: 'Pendaftaran ditutup. Gunakan tab di atas untuk melihat Tim, Lobi, dan Peringkat.',
};

const tl: Translations = {
  home: 'Tahanan', shop: 'Tindahan', tournaments: 'Mga Torneo', wallet: 'Pitaka', profile: 'Profile',
  participate_now: 'Sumali Na', match_in_progress: 'Laro ay Nagpapatuloy', view_tournament: 'Tingnan ang Torneo',
  register: 'Mag-rehistro', teams: 'Mga Koponan', rules: 'Mga Patakaran', lobby: 'Lobby', rankings: 'Ranggo',
  registration_closed: 'Sarado ang Pagpaparehistro', registration_open: 'Bukas na ang Pagpaparehistro', in_progress: 'Patuloy ang Laro', completed: 'Nakumpleto', cancelled: 'Kinansela', registered: 'Nirehistro', matches_underway: 'Nagaganap ang mga laro.',
  view_rankings: 'Tingnan ang Ranggo', access_lobby: 'I-access ang Lobby',
  platform_stats: 'Istatistika ng Platform', total_users: 'Kabuuang Gumagamit', total_transactions: 'Mga Transaksyon',
  switch_to_language: 'Lumipat sa {language}?',
  earn_b4ut: 'Kumita ng B4UT Tokens', watch_ad: 'Manood', instant: 'Agad', per_view: 'Bawat panonood',
  recent_purchases: 'Mga Kamakailang Pagbili', live: 'Live', join_customers: 'nasisiyahang mga customer',
  real_user_feedback: 'Tunay na Feedback ng Gumagamit', share_feedback: 'Ibahagi ang Feedback at Kumita ng +10 B4UT',
  submit: 'Isumite', cancel: 'Kanselahin',
  good_morning: 'Magandang Umaga', good_afternoon: 'Magandang Tanghali', good_evening: 'Magandang Gabi',
  loading: 'Naglo-load...', save: 'I-save', edit: 'I-edit', delete: 'Burahin', confirm: 'Kumpirmahin',
  entry_fee: 'Bayad sa Pagpasok', prize_pool: 'Premyo', starts: 'Magsisimula', mode: 'Mode',
  champion: 'Kampeon', runner_up: 'Runner-up', top_fragger: 'Top Fragger', pending: 'Nakabinbin',
  match_in_progress_notice: 'Sarado na ang pagpaparehistro sa torneo. Nagaganap ang mga laro.',
  registration_closed_notice: 'Sarado ang pagpaparehistro. Gamitin ang mga tab para sa Koponan, Lobby, at Ranggo.',
};

export const TRANSLATIONS: LangMap = {
  en, zh, ja, ko, de, hi, bn, ne, id, tl,
};
