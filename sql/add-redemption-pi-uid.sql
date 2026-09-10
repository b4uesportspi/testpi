ALTER TABLE redemption_requests ADD COLUMN IF NOT EXISTS pi_uid text;
ALTER TABLE redemption_requests ALTER COLUMN wallet_address DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_redemption_requests_pi_uid ON redemption_requests(pi_uid);
