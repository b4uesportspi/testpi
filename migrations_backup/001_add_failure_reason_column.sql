-- Migration to add failure_reason column to app_transactions table
ALTER TABLE app_transactions 
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add a comment to describe the column purpose
COMMENT ON COLUMN app_transactions.failure_reason IS 'Reason for failed or cancelled transactions';