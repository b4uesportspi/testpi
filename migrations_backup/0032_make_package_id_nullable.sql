-- Migration: allow tournament-only transactions without a package reference
-- This makes app_transactions.package_id nullable so TOURNAMENT_ENTRY payments can be created

ALTER TABLE app_transactions
  ALTER COLUMN package_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_package_id ON app_transactions(package_id);
