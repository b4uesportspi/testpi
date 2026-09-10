-- Fix tournament_match_results: convert wwcd from boolean to integer
-- and add missing prize_pi column.
-- This migration is idempotent and safe to run multiple times.

-- 1. Convert wwcd boolean → integer if the column is still boolean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tournament_match_results'
      AND column_name = 'wwcd'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE tournament_match_results
      ALTER COLUMN wwcd TYPE integer
      USING (CASE WHEN wwcd THEN 1 ELSE 0 END);
    ALTER TABLE tournament_match_results
      ALTER COLUMN wwcd SET DEFAULT 0;
    RAISE NOTICE 'Converted tournament_match_results.wwcd from boolean to integer';
  ELSE
    RAISE NOTICE 'tournament_match_results.wwcd is already integer — skipping';
  END IF;
END $$;

-- 2. Add prize_pi column if missing
ALTER TABLE tournament_match_results
  ADD COLUMN IF NOT EXISTS prize_pi numeric(18,8) NOT NULL DEFAULT 0;

-- 3. Ensure placement_points column exists
ALTER TABLE tournament_match_results
  ADD COLUMN IF NOT EXISTS placement_points integer NOT NULL DEFAULT 0;

-- 4. Ensure points_awarded column exists
ALTER TABLE tournament_match_results
  ADD COLUMN IF NOT EXISTS points_awarded integer NOT NULL DEFAULT 0;

-- 5. Add wins column to tournament_leaderboards if missing
ALTER TABLE tournament_leaderboards
  ADD COLUMN IF NOT EXISTS wins integer NOT NULL DEFAULT 0;

-- 6. Add wwcd_count column to tournament_leaderboards if missing
ALTER TABLE tournament_leaderboards
  ADD COLUMN IF NOT EXISTS wwcd_count integer NOT NULL DEFAULT 0;

-- 7. Add prize_pi and prize_status to tournament_leaderboards if missing
ALTER TABLE tournament_leaderboards
  ADD COLUMN IF NOT EXISTS prize_pi numeric(18,8) NOT NULL DEFAULT 0;
ALTER TABLE tournament_leaderboards
  ADD COLUMN IF NOT EXISTS prize_status text NOT NULL DEFAULT 'not_awarded';

-- 8. Add map_name to tournament_lobbies if missing
ALTER TABLE tournament_lobbies
  ADD COLUMN IF NOT EXISTS map_name text;

-- 9. Add map_name to tournament_matches if missing
ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS map_name text;
