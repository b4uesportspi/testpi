-- Store selected PUBG map names for admin-created match lobbies.

ALTER TABLE tournament_lobbies
  ADD COLUMN IF NOT EXISTS map_name text;

ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS map_name text;

