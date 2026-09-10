-- Prisma-compatible PostgreSQL schema for the B4U Esports token ecosystem

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE pi_direction AS ENUM ('IN', 'OUT');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');
CREATE TYPE token_transaction_type AS ENUM ('ISSUE', 'REWARD', 'TRANSFER', 'REDEEM', 'BURN', 'FEE', 'ADJUSTMENT');
CREATE TYPE treasury_event AS ENUM ('ISSUANCE', 'RESERVE', 'BURN', 'CLAIM', 'FEE', 'MANUAL_ADJUSTMENT');
CREATE TYPE redemption_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED');
CREATE TYPE reward_event_type AS ENUM ('DAILY_BONUS', 'REFERRAL', 'PURCHASE', 'TOURNAMENT', 'MILESTONE', 'OTHER');
CREATE TYPE referral_status AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');
CREATE TYPE reward_status AS ENUM ('PENDING', 'AWARDED', 'FAILED');
CREATE TYPE fraud_category AS ENUM ('WITHDRAWAL', 'REFERRAL', 'AUTHENTICATION', 'PAYMENT', 'TOURNAMENT', 'OTHER');
CREATE TYPE notification_category AS ENUM ('SYSTEM', 'REWARD', 'SECURITY', 'ADMIN');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid TEXT UNIQUE,
  username TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  wallet_address TEXT,
  referral_code TEXT UNIQUE,
  referred_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_profile_verified BOOLEAN NOT NULL DEFAULT FALSE,
  tokens INTEGER NOT NULL DEFAULT 0,
  bonus_tokens INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  country TEXT NOT NULL DEFAULT 'Bhutan',
  language TEXT NOT NULL DEFAULT 'en',
  wallet_id UUID UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  network TEXT NOT NULL DEFAULT 'PI',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  earned INTEGER NOT NULL DEFAULT 0,
  spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pi_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  direction pi_direction NOT NULL,
  status transaction_status NOT NULL DEFAULT 'PENDING',
  reference TEXT UNIQUE NOT NULL,
  note TEXT,
  confirmed_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type token_transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  external_ref TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE treasury_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event treasury_event NOT NULL,
  amount INTEGER NOT NULL,
  reference TEXT UNIQUE,
  details JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE redemption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  tokens_requested INTEGER NOT NULL,
  pi_amount DOUBLE PRECISION NOT NULL,
  fee_amount DOUBLE PRECISION NOT NULL,
  status redemption_status NOT NULL DEFAULT 'PENDING',
  reviewed_by TEXT,
  review_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type reward_event_type NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'SYSTEM',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  bonus_amount INTEGER NOT NULL DEFAULT 0,
  status referral_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE purchase_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status reward_status NOT NULL DEFAULT 'PENDING',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_at TIMESTAMPTZ
);

CREATE TABLE fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category fraud_category NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  evidence JSONB,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE tournament_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status reward_status NOT NULL DEFAULT 'PENDING',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_at TIMESTAMPTZ
);

CREATE TABLE withdrawal_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_max INTEGER NOT NULL DEFAULT 20000,
  weekly_max INTEGER NOT NULL DEFAULT 50000,
  monthly_max INTEGER NOT NULL DEFAULT 150000,
  used_today INTEGER NOT NULL DEFAULT 0,
  used_this_week INTEGER NOT NULL DEFAULT 0,
  used_this_month INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category notification_category NOT NULL DEFAULT 'SYSTEM',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pi_transactions_user_id ON pi_transactions(user_id);
CREATE INDEX idx_pi_transactions_wallet_address ON pi_transactions(wallet_address);
CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(type);
CREATE INDEX idx_redemption_requests_status ON redemption_requests(status);
CREATE INDEX idx_reward_history_user_id ON reward_history(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
