-- Add metadata column to app_users table for marketing email tracking
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN app_users.metadata IS 'JSON metadata for user preferences, email tracking, and other user-specific data';

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_app_users_metadata ON app_users USING GIN (metadata);