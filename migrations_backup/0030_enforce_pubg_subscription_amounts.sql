-- Ensure PUBG tournament subscriptions keep fixed Pi amounts.
-- Weekly subscriptions are 20 Pi and monthly subscriptions are 30 Pi.

ALTER TABLE pi_subscriptions
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_phone TEXT,
ADD COLUMN IF NOT EXISTS user_game_ign TEXT,
ADD COLUMN IF NOT EXISTS user_game_uid TEXT,
ADD COLUMN IF NOT EXISTS user_team_name TEXT,
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS amount_pi NUMERIC(18, 8);

COMMENT ON COLUMN pi_subscriptions.user_name IS 'Subscriber name for tournament account details';
COMMENT ON COLUMN pi_subscriptions.user_email IS 'Subscriber email for tournament account details';
COMMENT ON COLUMN pi_subscriptions.user_phone IS 'Subscriber contact number for tournament account details';
COMMENT ON COLUMN pi_subscriptions.user_game_ign IS 'PUBG in-game name for tournament subscription access';
COMMENT ON COLUMN pi_subscriptions.user_game_uid IS 'PUBG UID for tournament subscription access';
COMMENT ON COLUMN pi_subscriptions.user_team_name IS 'Team name for tournament subscription access';
COMMENT ON COLUMN pi_subscriptions.subscription_type IS 'Subscription type: weekly costs 20 Pi, monthly costs 30 Pi';
COMMENT ON COLUMN pi_subscriptions.amount_pi IS 'Fixed subscription amount paid in Pi';

ALTER TABLE pi_subscriptions
DROP CONSTRAINT IF EXISTS pi_subscriptions_fixed_pubg_amount_check;

ALTER TABLE pi_subscriptions
ADD CONSTRAINT pi_subscriptions_fixed_pubg_amount_check
CHECK (
  subscription_type NOT IN ('weekly', 'monthly')
  OR (subscription_type = 'weekly' AND amount_pi = 20)
  OR (subscription_type = 'monthly' AND amount_pi = 30)
) NOT VALID;
