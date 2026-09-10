-- URGENT: Fix missing columns in app_users table
-- This migration adds the successful_purchases_count and last_reward_milestone columns
-- These columns are referenced in the application code but missing from the database

-- Add column to track total successful purchases
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "successful_purchases_count" INTEGER NOT NULL DEFAULT 0;

-- Add column to track last milestone reached (5, 10, 15, 20)
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "last_reward_milestone" INTEGER DEFAULT NULL;

-- Create table to log all purchase rewards issued (if not already created)
CREATE TABLE IF NOT EXISTS "purchase_rewards" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
    "milestone" INTEGER NOT NULL,
    "tokens_awarded" INTEGER NOT NULL,
    "calculation_details" text NOT NULL,
    "transaction_id" varchar REFERENCES "app_transactions"("id"),
    "created_at" timestamp DEFAULT now()
);

-- Add indexes if not already created
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_user_id" ON "purchase_rewards"("user_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_milestone" ON "purchase_rewards"("milestone");

-- Verify the columns were created successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'app_users' 
AND column_name IN ('successful_purchases_count', 'last_reward_milestone')
ORDER BY column_name;
