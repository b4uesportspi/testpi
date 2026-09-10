-- Add profile_picture column to app_users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS profile_picture TEXT;