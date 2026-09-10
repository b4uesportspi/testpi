-- PUBG tournament operations: roster details, secret rooms, scoring, MVPs, and history.

ALTER TABLE tournament_teams
  ADD COLUMN IF NOT EXISTS logo_url text;

CREATE TABLE IF NOT EXISTS tournament_roster_players (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id varchar NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  pubg_ign text NOT NULL,
  pubg_uid text NOT NULL,
  mugshot_url text,
  is_captain boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  UNIQUE (team_id, slot_number)
);

CREATE TABLE IF NOT EXISTS tournament_match_rooms (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id varchar REFERENCES tournament_matches(id) ON DELETE SET NULL,
  match_number integer NOT NULL,
  map_name text NOT NULL,
  room_id text,
  room_password text,
  leader_code text NOT NULL,
  status text NOT NULL DEFAULT 'secret',
  reveal_at timestamp,
  starts_at timestamp,
  completed_at timestamp,
  credentials_removed_at timestamp,
  created_by varchar REFERENCES app_users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE (tournament_id, match_number)
);

CREATE TABLE IF NOT EXISTS tournament_room_access_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id varchar NOT NULL REFERENCES tournament_match_rooms(id) ON DELETE CASCADE,
  team_id varchar REFERENCES tournament_teams(id) ON DELETE SET NULL,
  user_id varchar REFERENCES app_users(id) ON DELETE SET NULL,
  leader_code_used text NOT NULL,
  access_status text NOT NULL DEFAULT 'granted',
  ip_address text,
  user_agent text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_scoring_rules (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  placement integer NOT NULL,
  placement_points integer NOT NULL DEFAULT 0,
  kill_points integer NOT NULL DEFAULT 1,
  mvp_bonus_points integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now(),
  UNIQUE (tournament_id, placement)
);

CREATE TABLE IF NOT EXISTS tournament_mvp_awards (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id varchar REFERENCES tournament_matches(id) ON DELETE SET NULL,
  team_id varchar REFERENCES tournament_teams(id) ON DELETE SET NULL,
  player_roster_id varchar REFERENCES tournament_roster_players(id) ON DELETE SET NULL,
  award_reason text NOT NULL,
  kills integer NOT NULL DEFAULT 0,
  placement integer,
  bonus_points integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  actor_user_id varchar REFERENCES app_users(id) ON DELETE SET NULL,
  team_id varchar REFERENCES tournament_teams(id) ON DELETE SET NULL,
  match_id varchar REFERENCES tournament_matches(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_roster_players_pubg_uid ON tournament_roster_players(pubg_uid);
CREATE INDEX IF NOT EXISTS idx_tournament_match_rooms_leader_code ON tournament_match_rooms(leader_code);
CREATE INDEX IF NOT EXISTS idx_tournament_room_access_logs_room ON tournament_room_access_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_tournament_history_tournament ON tournament_history(tournament_id);

UPDATE tournaments
SET
  title = 'PUBG Mobile Arena',
  mode = 'squad',
  format = 'battle_royale_tpp',
  registration_fee_pi = 5.00000000,
  prize_pool_pi = 500.00000000,
  rules = 'Mobile only. No emulators. TPP battle royale. Placement points: 1st 10, 2nd 6, 3rd 5, 4th 4, 5th 3, 6th 2, 7th-8th 1, 9th-16th 0. Kills: 1 point each. Admin sends secret leader code for Match 1-5 rooms. Credentials are removed when each match is completed.'
WHERE id = 'sample-duo-pubg-swiss';

INSERT INTO tournament_scoring_rules (tournament_id, placement, placement_points, kill_points, mvp_bonus_points)
VALUES
  ('sample-duo-pubg-swiss', 1, 10, 1, 3),
  ('sample-duo-pubg-swiss', 2, 6, 1, 3),
  ('sample-duo-pubg-swiss', 3, 5, 1, 3),
  ('sample-duo-pubg-swiss', 4, 4, 1, 3),
  ('sample-duo-pubg-swiss', 5, 3, 1, 3),
  ('sample-duo-pubg-swiss', 6, 2, 1, 3),
  ('sample-duo-pubg-swiss', 7, 1, 1, 3),
  ('sample-duo-pubg-swiss', 8, 1, 1, 3),
  ('sample-duo-pubg-swiss', 9, 0, 1, 3),
  ('sample-duo-pubg-swiss', 16, 0, 1, 3)
ON CONFLICT (tournament_id, placement) DO UPDATE
SET placement_points = EXCLUDED.placement_points,
    kill_points = EXCLUDED.kill_points,
    mvp_bonus_points = EXCLUDED.mvp_bonus_points;

INSERT INTO tournament_match_rooms (tournament_id, match_number, map_name, room_id, room_password, leader_code, status, starts_at)
VALUES
  ('sample-duo-pubg-swiss', 1, 'Erangel', 'PUBG-2048-M1', 'ERANGEL5', 'B4U-LEADER', 'secret', now() + interval '30 minutes'),
  ('sample-duo-pubg-swiss', 2, 'Miramar', 'PUBG-2048-M2', 'MIRAMAR5', 'B4U-LEADER', 'secret', now() + interval '60 minutes'),
  ('sample-duo-pubg-swiss', 3, 'Sanhok', 'PUBG-2048-M3', 'SANHOK5', 'B4U-LEADER', 'secret', now() + interval '90 minutes'),
  ('sample-duo-pubg-swiss', 4, 'Erangel', 'PUBG-2048-M4', 'ERANGELX', 'B4U-LEADER', 'secret', now() + interval '120 minutes'),
  ('sample-duo-pubg-swiss', 5, 'Miramar', 'PUBG-2048-M5', 'FINALM5', 'B4U-LEADER', 'secret', now() + interval '150 minutes')
ON CONFLICT (tournament_id, match_number) DO UPDATE
SET map_name = EXCLUDED.map_name,
    room_id = EXCLUDED.room_id,
    room_password = EXCLUDED.room_password,
    leader_code = EXCLUDED.leader_code,
    status = EXCLUDED.status,
    starts_at = EXCLUDED.starts_at,
    updated_at = now();
