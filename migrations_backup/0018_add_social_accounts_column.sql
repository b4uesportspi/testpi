-- Migration to add social_accounts column to app_users table
-- This will store social media and subscription account information

-- Add the social_accounts column to app_users table
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS social_accounts JSONB;

-- Add a comment to describe the column
COMMENT ON COLUMN app_users.social_accounts IS 'JSON object containing social media and subscription account information (TikTok, YouTube, Facebook, Instagram, Netflix, Canva)';