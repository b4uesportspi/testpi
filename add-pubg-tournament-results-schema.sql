-- Add PUBG tournament result and leaderboard schema

CREATE TABLE IF NOT EXISTS tournament_match_results (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id varchar NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  participant_id varchar REFERENCES tournament_match_participants(id),
  user_id varchar REFERENCES app_users(id),
  team_id varchar REFERENCES tournament_teams(id),
  placement integer,
  kills integer NOT NULL DEFAULT 0,
  wwcd boolean NOT NULL DEFAULT false,
  placement_points integer NOT NULL DEFAULT 0,
  points_awarded integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_match_results_match ON tournament_match_results(match_id);

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
  wwcd_count integer NOT NULL DEFAULT 0,
  prize_pi decimal(18,8) NOT NULL DEFAULT 0,
  prize_status text NOT NULL DEFAULT 'not_awarded',
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_leaderboards_tournament ON tournament_leaderboards(tournament_id);

CREATE TABLE IF NOT EXISTS tournament_scoring_rules (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  placement integer NOT NULL,
  placement_points integer NOT NULL DEFAULT 0,
  kill_points integer NOT NULL DEFAULT 1,
  mvp_bonus_points integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
);
