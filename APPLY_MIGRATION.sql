-- Production Database Migration for Purchase Rewards System
-- Run this on your production database to enable purchase reward tracking

-- Step 1: Add column to track total successful purchases
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "successful_purchases_count" INTEGER DEFAULT 0;

-- Step 2: Add column to track last milestone reached (5, 10, 15, 20)
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "last_reward_milestone" INTEGER;

-- Step 3: Create table to log all purchase rewards issued
CREATE TABLE IF NOT EXISTS "purchase_rewards" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
    "milestone" INTEGER NOT NULL,
    "tokens_awarded" INTEGER NOT NULL,
    "calculation_details" text NOT NULL,
    "transaction_id" varchar REFERENCES "app_transactions"("id"),
    "created_at" timestamp DEFAULT now()
);

-- Step 4: Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_user_id" ON "purchase_rewards"("user_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_milestone" ON "purchase_rewards"("milestone");

-- Step 5: Verify the migration
SELECT 'Migration completed successfully!' as status;

-- Check new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'app_users' 
AND column_name IN ('successful_purchases_count', 'last_reward_milestone');

-- Check new table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'purchase_rewards';
