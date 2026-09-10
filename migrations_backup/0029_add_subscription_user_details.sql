-- Add user details columns to pi_subscriptions table for tournament subscriptions
ALTER TABLE pi_subscriptions
ADD COLUMN IF NOT EXISTS user_name TEXT, -- Full name
ADD COLUMN IF NOT EXISTS user_email TEXT, -- Email
ADD COLUMN IF NOT EXISTS user_phone TEXT, -- Contact number  
ADD COLUMN IF NOT EXISTS user_game_ign TEXT, -- Game IGN (e.g., PUBG IGN)
ADD COLUMN IF NOT EXISTS user_game_uid TEXT, -- Game UID (e.g., PUBG UID)
ADD COLUMN IF NOT EXISTS user_team_name TEXT, -- Team name for tournament subscriptions
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50), -- weekly, monthly, lifetime
ADD COLUMN IF NOT EXISTS amount_pi NUMERIC(18, 8); -- Amount paid in Pi for this subscription

-- Make package_id nullable for subscriptions that don't have a package
ALTER TABLE pi_subscriptions
ALTER COLUMN package_id DROP NOT NULL;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pi_subscriptions_user_email ON pi_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_pi_subscriptions_game_ign ON pi_subscriptions(user_game_ign);
CREATE INDEX IF NOT EXISTS idx_pi_subscriptions_team_name ON pi_subscriptions(user_team_name);
CREATE INDEX IF NOT EXISTS idx_pi_subscriptions_subscription_type ON pi_subscriptions(subscription_type);

-- Add migration comment
COMMENT ON COLUMN pi_subscriptions.user_name IS 'Full name of the subscriber';
COMMENT ON COLUMN pi_subscriptions.user_email IS 'Email of the subscriber';
COMMENT ON COLUMN pi_subscriptions.user_phone IS 'Contact number of the subscriber';
COMMENT ON COLUMN pi_subscriptions.user_game_ign IS 'Game IGN for tournament access (e.g., PUBG IGN)';
COMMENT ON COLUMN pi_subscriptions.user_game_uid IS 'Game UID for tournament access (e.g., PUBG UID)';
COMMENT ON COLUMN pi_subscriptions.user_team_name IS 'Team name for tournament subscriptions';
COMMENT ON COLUMN pi_subscriptions.subscription_type IS 'Type of subscription: weekly (20 Pi), monthly (30 Pi), or lifetime';
COMMENT ON COLUMN pi_subscriptions.amount_pi IS 'Amount paid in Pi for this subscription';
COMMENT ON COLUMN pi_subscriptions.package_id IS 'Package ID (nullable - can be null for custom subscriptions)';
