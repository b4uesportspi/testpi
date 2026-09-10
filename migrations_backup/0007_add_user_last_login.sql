-- Add last_login column to users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN app_users.last_login IS 'Timestamp of user''s last successful login';