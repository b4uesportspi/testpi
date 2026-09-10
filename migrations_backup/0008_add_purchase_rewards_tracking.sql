-- Migration to add purchase reward tracking fields to users table
-- This adds columns to track successful purchase count and rewards claimed

-- Add column to track total successful purchases
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "successful_purchases_count" INTEGER NOT NULL DEFAULT 0;

-- Add column to track last milestone reached (5, 10, 15, 20)
ALTER TABLE "app_users" 
ADD COLUMN IF NOT EXISTS "last_reward_milestone" INTEGER DEFAULT NULL;

-- Create table to log all purchase rewards issued
CREATE TABLE IF NOT EXISTS "purchase_rewards" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" varchar NOT NULL REFERENCES "app_users"("id") ON DELETE CASCADE,
    "milestone" INTEGER NOT NULL, -- 5, 10, 15, 20, or 21+ for post-20 rewards
    "tokens_awarded" INTEGER NOT NULL,
    "calculation_details" text NOT NULL, -- Details of how tokens were calculated
    "transaction_id" varchar REFERENCES "app_transactions"("id"), -- Related transaction
    "created_at" timestamp DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_user_id" ON "purchase_rewards"("user_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_rewards_milestone" ON "purchase_rewards"("milestone");

-- Add comment to describe the table
COMMENT ON TABLE "purchase_rewards" IS 'Tracks all token rewards issued for purchase milestones';
COMMENT ON COLUMN "purchase_rewards"."milestone" IS 'Purchase milestone reached (5, 10, 15, 20, or 21+ for ongoing)';
COMMENT ON COLUMN "purchase_rewards"."calculation_details" IS 'Human-readable explanation of reward calculation';
