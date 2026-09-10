ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS marketing_email_sends (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES app_users(id),
  campaign_type TEXT NOT NULL,
  campaign_period TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  open_tracking_token TEXT NOT NULL UNIQUE,
  click_tracking_token TEXT NOT NULL UNIQUE,
  coupon_id VARCHAR,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  first_clicked_at TIMESTAMP,
  converted_at TIMESTAMP,
  conversion_transaction_id VARCHAR REFERENCES app_transactions(id),
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_coupons (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  user_id VARCHAR NOT NULL REFERENCES app_users(id),
  campaign_type TEXT NOT NULL,
  email_send_id VARCHAR REFERENCES marketing_email_sends(id),
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
  bonus_tokens INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_by_transaction_id VARCHAR REFERENCES app_transactions(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'marketing_email_sends_coupon_id_fkey'
      AND table_name = 'marketing_email_sends'
  ) THEN
    ALTER TABLE marketing_email_sends
    ADD CONSTRAINT marketing_email_sends_coupon_id_fkey
    FOREIGN KEY (coupon_id) REFERENCES marketing_coupons(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketing_email_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id VARCHAR NOT NULL REFERENCES marketing_email_sends(id),
  event_type TEXT NOT NULL,
  token TEXT NOT NULL,
  target_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_sends_user_campaign
ON marketing_email_sends(user_id, campaign_type, campaign_period);

CREATE INDEX IF NOT EXISTS idx_marketing_coupons_user_status
ON marketing_coupons(user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_marketing_email_events_send_type
ON marketing_email_events(email_send_id, event_type);

ALTER TABLE marketing_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE marketing_email_sends FROM anon;
REVOKE ALL ON TABLE marketing_email_sends FROM authenticated;
REVOKE ALL ON TABLE marketing_email_sends FROM PUBLIC;
REVOKE ALL ON TABLE marketing_coupons FROM anon;
REVOKE ALL ON TABLE marketing_coupons FROM authenticated;
REVOKE ALL ON TABLE marketing_coupons FROM PUBLIC;
REVOKE ALL ON TABLE marketing_email_events FROM anon;
REVOKE ALL ON TABLE marketing_email_events FROM authenticated;
REVOKE ALL ON TABLE marketing_email_events FROM PUBLIC;

GRANT ALL ON TABLE marketing_email_sends TO service_role;
GRANT ALL ON TABLE marketing_coupons TO service_role;
GRANT ALL ON TABLE marketing_email_events TO service_role;
