-- Add unique constraint and index for referral codes
-- Add unique constraint to referral_code column
ALTER TABLE users 
ADD CONSTRAINT unique_referral_code UNIQUE (referral_code);

-- Create index for better performance when querying by referral code
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);