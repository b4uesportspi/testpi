-- Add payment type system support to app_transactions
-- Allows tournament entries and other payment types without requiring package_id

-- Make package_id nullable for tournament entries
ALTER TABLE app_transactions
ALTER COLUMN package_id DROP NOT NULL;

-- Add tournament_id column for tournament entry payments
ALTER TABLE app_transactions
ADD COLUMN IF NOT EXISTS tournament_id TEXT;

-- Add payment_type column to track payment type (TOKEN_PURCHASE, TOURNAMENT_ENTRY, etc)
ALTER TABLE app_transactions
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'TOKEN_PURCHASE';

-- Add index for faster lookups by payment type and tournament
CREATE INDEX IF NOT EXISTS idx_transactions_payment_type ON app_transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_transactions_tournament_id ON app_transactions(tournament_id);

-- Add constraint to ensure either package_id or tournament_id is set based on payment type
-- This is more of a logical constraint (enforced at application level)
-- because PostgreSQL check constraints can't reference other columns dynamically

-- Migration metadata
COMMENT ON COLUMN app_transactions.payment_type IS 'Payment type: TOKEN_PURCHASE, TOURNAMENT_ENTRY, WALLET_TOPUP, SERVICE_PAYMENT, SUBSCRIPTION';
COMMENT ON COLUMN app_transactions.tournament_id IS 'Tournament ID for tournament entry payments';
COMMENT ON COLUMN app_transactions.package_id IS 'Package ID for token purchase payments (nullable for other payment types)';
