-- Migration: Add admin_purchase_logs table for real-time purchase tracking
-- This table logs all completed purchases so admins can see them instantly

CREATE TABLE IF NOT EXISTS admin_purchase_logs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id varchar NOT NULL REFERENCES app_transactions(id),
  user_id varchar NOT NULL REFERENCES app_users(id),
  username text NOT NULL,
  user_email text NOT NULL,
  package_name text NOT NULL,
  game text NOT NULL,
  pi_amount decimal(18, 8) NOT NULL,
  usd_amount decimal(10, 4) NOT NULL,
  game_account text,
  payment_id text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp DEFAULT NOW()
);

-- Create index for faster admin dashboard queries
CREATE INDEX IF NOT EXISTS admin_purchase_logs_created_at_idx ON admin_purchase_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_purchase_logs_status_idx ON admin_purchase_logs(status);
