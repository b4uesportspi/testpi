-- Lock down sensitive tables by revoking anonymous/public access and enabling RLS.
-- Keep public read-only tables accessible through explicit policies.

-- Revoke all anonymous/public access from sensitive or restricted tables
REVOKE ALL ON TABLE IF EXISTS users FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_users FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS transactions FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_transactions FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS referral_codes FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS purchase_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS referral_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS security_audit_log FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_admins FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS admins FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS marketing_email_sends FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS marketing_email_events FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS marketing_coupons FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS user_rankings FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournaments FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_prize_distributions FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_teams FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_team_members FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_registrations FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_payments FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_refunds FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_check_ins FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_lobbies FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_matches FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_match_participants FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_match_results FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_leaderboards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS global_rankings FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_streams FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_media FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_notifications FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_invites FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_analytics FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_roster_players FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_match_rooms FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_room_access_logs FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_scoring_rules FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_mvp_awards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_history FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS pi_subscriptions FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS pi_transactions FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS referrals FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS reward_balances FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS reward_history FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS wallets FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS admin_logs FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS notifications FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_notifications FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS system_settings FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS token_transactions FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS redemption_requests FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS treasury_logs FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS fraud_flags FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS withdrawal_limits FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS daily_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS ad_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS achievement_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS loyalty_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS feedback_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS tournament_token_rewards FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS achievements FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS pi_treasury_wallet FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS token_conversion_rates FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_roles FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_rooms FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_messages FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS app_packages FROM anon, PUBLIC;
REVOKE ALL ON TABLE IF EXISTS pi_price_history FROM anon, PUBLIC;

-- Enable RLS on all current tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketing_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketing_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketing_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_prize_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS global_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_roster_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_match_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_room_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_mvp_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pi_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pi_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reward_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS treasury_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdrawal_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ad_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievement_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournament_token_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pi_treasury_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS token_conversion_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pi_price_history ENABLE ROW LEVEL SECURITY;

-- Drop legacy public-access policies on sensitive tables
DROP POLICY IF EXISTS "Anyone can view users" ON users;
DROP POLICY IF EXISTS "Anyone can view app_users" ON app_users;
DROP POLICY IF EXISTS "Anyone can view transactions" ON transactions;
DROP POLICY IF EXISTS "Anyone can view app_transactions" ON app_transactions;
DROP POLICY IF EXISTS "Anyone can view referral_codes" ON referral_codes;
DROP POLICY IF EXISTS "Anyone can view purchase_rewards" ON purchase_rewards;
DROP POLICY IF EXISTS "Anyone can view referral_rewards" ON referral_rewards;
DROP POLICY IF EXISTS "Anyone can view security_audit_log" ON security_audit_log;
DROP POLICY IF EXISTS "Anyone can view app_admins" ON app_admins;
DROP POLICY IF EXISTS "Anyone can view admins" ON admins;
DROP POLICY IF EXISTS "Anyone can view marketing_email_sends" ON marketing_email_sends;
DROP POLICY IF EXISTS "Anyone can view marketing_email_events" ON marketing_email_events;
DROP POLICY IF EXISTS "Anyone can view marketing_email_coupons" ON marketing_email_coupons;
DROP POLICY IF EXISTS "Anyone can view user_rankings" ON user_rankings;
DROP POLICY IF EXISTS "Anyone can view tournaments" ON tournaments;
DROP POLICY IF EXISTS "Anyone can view tournament_teams" ON tournament_teams;
DROP POLICY IF EXISTS "Anyone can view tournament_team_members" ON tournament_team_members;
DROP POLICY IF EXISTS "Anyone can view tournament_registrations" ON tournament_registrations;
DROP POLICY IF EXISTS "Anyone can view tournament_payments" ON tournament_payments;
DROP POLICY IF EXISTS "Anyone can view tournament_refunds" ON tournament_refunds;
DROP POLICY IF EXISTS "Anyone can view tournament_check_ins" ON tournament_check_ins;
DROP POLICY IF EXISTS "Anyone can view tournament_lobbies" ON tournament_lobbies;
DROP POLICY IF EXISTS "Anyone can view tournament_matches" ON tournament_matches;
DROP POLICY IF EXISTS "Anyone can view tournament_match_participants" ON tournament_match_participants;
DROP POLICY IF EXISTS "Anyone can view tournament_match_results" ON tournament_match_results;
DROP POLICY IF EXISTS "Anyone can view tournament_leaderboards" ON tournament_leaderboards;
DROP POLICY IF EXISTS "Anyone can view global_rankings" ON global_rankings;
DROP POLICY IF EXISTS "Anyone can view tournament_streams" ON tournament_streams;
DROP POLICY IF EXISTS "Anyone can view tournament_media" ON tournament_media;
DROP POLICY IF EXISTS "Anyone can view tournament_notifications" ON tournament_notifications;
DROP POLICY IF EXISTS "Anyone can view tournament_invites" ON tournament_invites;
DROP POLICY IF EXISTS "Anyone can view tournament_analytics" ON tournament_analytics;
DROP POLICY IF EXISTS "Anyone can view tournament_roster_players" ON tournament_roster_players;
DROP POLICY IF EXISTS "Anyone can view tournament_match_rooms" ON tournament_match_rooms;
DROP POLICY IF EXISTS "Anyone can view tournament_room_access_logs" ON tournament_room_access_logs;
DROP POLICY IF EXISTS "Anyone can view tournament_scoring_rules" ON tournament_scoring_rules;
DROP POLICY IF EXISTS "Anyone can view tournament_mvp_awards" ON tournament_mvp_awards;
DROP POLICY IF EXISTS "Anyone can view tournament_history" ON tournament_history;
DROP POLICY IF EXISTS "Anyone can view pi_subscriptions" ON pi_subscriptions;
DROP POLICY IF EXISTS "Anyone can view pi_transactions" ON pi_transactions;
DROP POLICY IF EXISTS "Anyone can view referrals" ON referrals;
DROP POLICY IF EXISTS "Anyone can view reward_balances" ON reward_balances;
DROP POLICY IF EXISTS "Anyone can view reward_history" ON reward_history;
DROP POLICY IF EXISTS "Anyone can view wallets" ON wallets;
DROP POLICY IF EXISTS "Anyone can view admin_logs" ON admin_logs;
DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can view app_notifications" ON app_notifications;
DROP POLICY IF EXISTS "Anyone can view system_settings" ON system_settings;
DROP POLICY IF EXISTS "Anyone can view token_transactions" ON token_transactions;
DROP POLICY IF EXISTS "Anyone can view redemption_requests" ON redemption_requests;
DROP POLICY IF EXISTS "Anyone can view treasury_logs" ON treasury_logs;
DROP POLICY IF EXISTS "Anyone can view fraud_flags" ON fraud_flags;
DROP POLICY IF EXISTS "Anyone can view withdrawal_limits" ON withdrawal_limits;
DROP POLICY IF EXISTS "Anyone can view daily_rewards" ON daily_rewards;
DROP POLICY IF EXISTS "Anyone can view ad_rewards" ON ad_rewards;
DROP POLICY IF EXISTS "Anyone can view achievement_rewards" ON achievement_rewards;
DROP POLICY IF EXISTS "Anyone can view loyalty_rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Anyone can view feedback_rewards" ON feedback_rewards;
DROP POLICY IF EXISTS "Anyone can view tournament_token_rewards" ON tournament_token_rewards;
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
DROP POLICY IF EXISTS "Anyone can view pi_treasury_wallet" ON pi_treasury_wallet;
DROP POLICY IF EXISTS "Anyone can view token_conversion_rates" ON token_conversion_rates;
DROP POLICY IF EXISTS "Anyone can view app_roles" ON app_roles;
DROP POLICY IF EXISTS "Anyone can view app_rooms" ON app_rooms;
DROP POLICY IF EXISTS "Anyone can view app_messages" ON app_messages;
DROP POLICY IF EXISTS "Anyone can view app_packages" ON app_packages;
DROP POLICY IF EXISTS "Anyone can view pi_price_history" ON pi_price_history;

-- Explicit public read-only policies
DROP POLICY IF EXISTS "Public can select app_packages" ON app_packages;
CREATE POLICY "Public can select app_packages" ON app_packages FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can select pi_price_history" ON pi_price_history;
CREATE POLICY "Public can select pi_price_history" ON pi_price_history FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can select tournaments" ON tournaments;
CREATE POLICY "Public can select tournaments" ON tournaments FOR SELECT TO anon USING (true);

-- Wallet transaction privacy: normal users can see only their own rows; admins can still access all rows.
DROP POLICY IF EXISTS "Users can read only their own app_transactions" ON app_transactions;
CREATE POLICY "Users can read only their own app_transactions"
  ON app_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json->>'user_id'
  );

DROP POLICY IF EXISTS "Admins can read all app_transactions" ON app_transactions;
CREATE POLICY "Admins can read all app_transactions"
  ON app_transactions
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json->>'isAdmin' = 'true'
    OR COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json->>'role' = 'admin'
  );

-- Keep service-role as the authoritative write path for all app_transactions.
DROP POLICY IF EXISTS "Service role manages app_transactions" ON app_transactions;
CREATE POLICY "Service role manages app_transactions"
  ON app_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON app_packages TO anon;
GRANT SELECT ON pi_price_history TO anon;
GRANT SELECT ON tournaments TO anon;
