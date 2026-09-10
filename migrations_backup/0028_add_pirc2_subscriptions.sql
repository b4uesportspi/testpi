CREATE TABLE IF NOT EXISTS "pi_subscriptions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
  "package_id" varchar NOT NULL REFERENCES "app_packages"("id") ON DELETE CASCADE,
  "sub_id" text NOT NULL UNIQUE,
  "auto_renew" boolean NOT NULL DEFAULT true,
  "status" text NOT NULL DEFAULT 'active',
  "expires_at" timestamp NOT NULL,
  "last_processed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_pi_subscriptions_user_id ON pi_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pi_subscriptions_status ON pi_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_pi_subscriptions_sub_id ON pi_subscriptions(sub_id);
