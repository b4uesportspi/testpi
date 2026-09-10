-- Complete tournament database system for B4U Esports.
-- Uses existing app_users/app_transactions for Pi Network auth and payment linkage.

CREATE TABLE IF NOT EXISTS tournaments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  game text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('solo', 'duo', 'squad')),
  format text NOT NULL DEFAULT 'elimination',
  skill_level text NOT NULL DEFAULT 'open',
  min_age integer,
  max_age integer,
  status text NOT NULL DEFAULT 'draft',
  visibility text NOT NULL DEFAULT 'public',
  max_participants integer NOT NULL,
  min_participants integer NOT NULL DEFAULT 2,
  team_size integer NOT NULL DEFAULT 1,
  registration_fee_pi numeric(18,8) NOT NULL DEFAULT 0,
  prize_pool_pi numeric(18,8) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PI',
  rules text,
  region text NOT NULL DEFAULT 'global',
  platform text NOT NULL DEFAULT 'mobile',
  room_settings jsonb DEFAULT '{}'::jsonb,
  stream_settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  registration_opens_at timestamp,
  registration_closes_at timestamp,
  check_in_opens_at timestamp,
  starts_at timestamp NOT NULL,
  ends_at timestamp,
  created_by varchar REFERENCES app_users(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_prize_distributions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  prize_pi numeric(18,8) NOT NULL DEFAULT 0,
  prize_percent numeric(6,3),
  bonus_tokens integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamp DEFAULT now(),
  UNIQUE (tournament_id, rank)
);

CREATE TABLE IF NOT EXISTS tournament_teams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  captain_user_id varchar NOT NULL REFERENCES app_users(id),
  invite_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'forming',
  seed integer,
  average_elo integer NOT NULL DEFAULT 1000,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_team_members (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES app_users(id),
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamp DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES app_users(id),
  team_id varchar REFERENCES tournament_teams(id),
  status text NOT NULL DEFAULT 'pending_payment',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_id text,
  transaction_id varchar REFERENCES app_transactions(id),
  paid_amount_pi numeric(18,8) NOT NULL DEFAULT 0,
  registered_at timestamp DEFAULT now(),
  cancelled_at timestamp,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_payments (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  registration_id varchar REFERENCES tournament_registrations(id),
  user_id varchar NOT NULL REFERENCES app_users(id),
  payment_id text NOT NULL UNIQUE,
  txid text,
  amount_pi numeric(18,8) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  purpose text NOT NULL DEFAULT 'registration_fee',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_refunds (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id varchar NOT NULL REFERENCES tournament_payments(id),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES app_users(id),
  amount_pi numeric(18,8) NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  processed_at timestamp,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_check_ins (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES app_users(id),
  team_id varchar REFERENCES tournament_teams(id),
  status text NOT NULL DEFAULT 'checked_in',
  checked_in_at timestamp DEFAULT now(),
  device_info jsonb DEFAULT '{}'::jsonb,
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_lobbies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id varchar,
  name text NOT NULL,
  room_code text,
  room_password text,
  status text NOT NULL DEFAULT 'waiting',
  capacity integer NOT NULL DEFAULT 100,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  lobby_id varchar REFERENCES tournament_lobbies(id),
  round integer NOT NULL DEFAULT 1,
  match_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled',
  room_code text,
  room_password text,
  map_name text,
  scheduled_at timestamp,
  started_at timestamp,
  completed_at timestamp,
  stream_url text,
  vod_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_match_participants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id varchar NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  registration_id varchar REFERENCES tournament_registrations(id),
  user_id varchar REFERENCES app_users(id),
  team_id varchar REFERENCES tournament_teams(id),
  slot_number integer,
  status text NOT NULL DEFAULT 'scheduled',
  joined_at timestamp,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS tournament_match_results (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id varchar NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  participant_id varchar REFERENCES tournament_match_participants(id),
  user_id varchar REFERENCES app_users(id),
  team_id varchar REFERENCES tournament_teams(id),
  placement integer,
  kills integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  deaths integer NOT NULL DEFAULT 0,
  damage integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  points_awarded integer NOT NULL DEFAULT 0,
  evidence_url text,
  verified_by varchar REFERENCES app_users(id),
  verified_at timestamp,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_leaderboards (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id varchar REFERENCES app_users(id),
  team_id varchar REFERENCES tournament_teams(id),
  rank integer NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  total_kills integer NOT NULL DEFAULT 0,
  matches_played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  prize_pi numeric(18,8) NOT NULL DEFAULT 0,
  prize_status text NOT NULL DEFAULT 'not_awarded',
  updated_at timestamp DEFAULT now(),
  UNIQUE (tournament_id, rank)
);

CREATE TABLE IF NOT EXISTS global_rankings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL UNIQUE REFERENCES app_users(id),
  elo integer NOT NULL DEFAULT 1000,
  rank integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'Bronze',
  tournaments_played integer NOT NULL DEFAULT 0,
  tournament_wins integer NOT NULL DEFAULT 0,
  top_three_finishes integer NOT NULL DEFAULT 0,
  total_prize_pi numeric(18,8) NOT NULL DEFAULT 0,
  total_kills integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  last_tournament_at timestamp,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_streams (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id varchar REFERENCES tournament_matches(id),
  platform text NOT NULL,
  stream_url text NOT NULL,
  embed_url text,
  status text NOT NULL DEFAULT 'scheduled',
  starts_at timestamp,
  ended_at timestamp,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_media (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id varchar REFERENCES tournament_matches(id),
  uploaded_by varchar REFERENCES app_users(id),
  media_type text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  duration_seconds integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

-- tournament_chat_messages removed — chat feature disabled

CREATE TABLE IF NOT EXISTS tournament_notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id varchar REFERENCES app_users(id),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  status text NOT NULL DEFAULT 'unread',
  metadata jsonb DEFAULT '{}'::jsonb,
  read_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_invites (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id varchar REFERENCES tournament_teams(id),
  invited_user_id varchar REFERENCES app_users(id),
  invited_by_user_id varchar NOT NULL REFERENCES app_users(id),
  invite_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamp,
  responded_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_analytics (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL UNIQUE REFERENCES tournaments(id) ON DELETE CASCADE,
  total_registrations integer NOT NULL DEFAULT 0,
  paid_registrations integer NOT NULL DEFAULT 0,
  checked_in_participants integer NOT NULL DEFAULT 0,
  total_matches integer NOT NULL DEFAULT 0,
  completed_matches integer NOT NULL DEFAULT 0,
  total_prize_paid_pi numeric(18,8) NOT NULL DEFAULT 0,
  total_fees_collected_pi numeric(18,8) NOT NULL DEFAULT 0,
  average_viewers integer NOT NULL DEFAULT 0,
  peak_viewers integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON tournaments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_status ON tournament_registrations(status);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_user ON tournament_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_round ON tournament_matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_tournament_match_results_match ON tournament_match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_notifications_user ON tournament_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_global_rankings_elo ON global_rankings(elo);

INSERT INTO tournaments (
  id, title, slug, description, game, mode, format, skill_level, status, visibility,
  max_participants, min_participants, team_size, registration_fee_pi, prize_pool_pi,
  rules, region, platform, registration_opens_at, registration_closes_at, check_in_opens_at,
  starts_at, metadata
) VALUES
  (
    'sample-solo-freefire-open', 'Free Fire Solo Pi Cup', 'free-fire-solo-pi-cup',
    'Solo battle royale tournament for Pi Network players.', 'FREEFIRE', 'solo', 'elimination',
    'open', 'registration_open', 'public', 100, 16, 1, 0.25000000, 15.00000000,
    'Players must check in 30 minutes before match time. Screenshots are required for disputes.',
    'asia', 'mobile', now(), now() + interval '7 days', now() + interval '6 days 23 hours',
    now() + interval '8 days', '{"sample": true}'::jsonb
  ),
  (
    'sample-duo-pubg-swiss', 'PUBG Mobile Duo Swiss Clash', 'pubg-mobile-duo-swiss-clash',
    'Duo tournament with Swiss rounds and points leaderboard.', 'PUBG', 'duo', 'swiss',
    'intermediate', 'registration_open', 'public', 64, 16, 2, 0.50000000, 30.00000000,
    'Both duo members must be registered and checked in before lobby assignment.',
    'global', 'mobile', now(), now() + interval '10 days', now() + interval '9 days 23 hours',
    now() + interval '11 days', '{"sample": true}'::jsonb
  ),
  (
    'sample-squad-mlbb-round-robin', 'MLBB Squad Champions League', 'mlbb-squad-champions-league',
    'Squad round robin tournament with streamed finals.', 'MLBB', 'squad', 'round_robin',
    'advanced', 'registration_open', 'public', 80, 20, 5, 1.00000000, 75.00000000,
    'Teams must maintain a full squad roster. Finals are streamed and recorded.',
    'global', 'mobile', now() + interval '1 day', now() + interval '14 days',
    now() + interval '13 days 23 hours', now() + interval '15 days', '{"sample": true}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tournament_prize_distributions (tournament_id, rank, prize_pi, prize_percent, bonus_tokens, description)
VALUES
  ('sample-solo-freefire-open', 1, 8.00000000, 53.333, 500, 'Champion prize'),
  ('sample-solo-freefire-open', 2, 4.00000000, 26.667, 250, 'Runner-up prize'),
  ('sample-solo-freefire-open', 3, 3.00000000, 20.000, 100, 'Third place prize'),
  ('sample-duo-pubg-swiss', 1, 16.00000000, 53.333, 1000, 'Champion duo prize'),
  ('sample-duo-pubg-swiss', 2, 8.00000000, 26.667, 500, 'Runner-up duo prize'),
  ('sample-duo-pubg-swiss', 3, 6.00000000, 20.000, 250, 'Third place duo prize'),
  ('sample-squad-mlbb-round-robin', 1, 40.00000000, 53.333, 2500, 'Champion squad prize'),
  ('sample-squad-mlbb-round-robin', 2, 20.00000000, 26.667, 1250, 'Runner-up squad prize'),
  ('sample-squad-mlbb-round-robin', 3, 15.00000000, 20.000, 750, 'Third place squad prize')
ON CONFLICT (tournament_id, rank) DO NOTHING;

INSERT INTO tournament_notifications (tournament_id, title, message, type, metadata)
VALUES
  ('sample-solo-freefire-open', 'Free Fire Solo Pi Cup registration is open', 'Register and check in before the lobby opens.', 'info', '{"sample": true}'::jsonb),
  ('sample-duo-pubg-swiss', 'PUBG Mobile Duo Swiss Clash registration is open', 'Build your duo team, enter the lobby, and track Swiss round rankings.', 'info', '{"sample": true}'::jsonb),
  ('sample-squad-mlbb-round-robin', 'MLBB Squad Champions League registration is open', 'Build your squad and register before the streamed finals.', 'info', '{"sample": true}'::jsonb);

INSERT INTO tournament_payments (tournament_id, user_id, payment_id, amount_pi, status, purpose, metadata)
SELECT t.id, u.id, 'sample-tournament-payment-' || t.id, t.registration_fee_pi, 'completed', 'registration_fee', '{"sample": true}'::jsonb
FROM tournaments t
CROSS JOIN LATERAL (SELECT id FROM app_users ORDER BY created_at LIMIT 1) u
WHERE t.id IN ('sample-solo-freefire-open', 'sample-duo-pubg-swiss', 'sample-squad-mlbb-round-robin')
ON CONFLICT (payment_id) DO NOTHING;
