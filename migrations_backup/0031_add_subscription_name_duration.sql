-- Add subscription name and duration fields to pi_subscriptions to store subscription metadata separately from user profile.
ALTER TABLE pi_subscriptions
ADD COLUMN IF NOT EXISTS subscription_name TEXT,
ADD COLUMN IF NOT EXISTS subscription_duration TEXT;

COMMENT ON COLUMN pi_subscriptions.subscription_name IS 'Optional brand, plan name, or label for the subscription';
COMMENT ON COLUMN pi_subscriptions.subscription_duration IS 'Optional duration label or schedule for the subscription';
