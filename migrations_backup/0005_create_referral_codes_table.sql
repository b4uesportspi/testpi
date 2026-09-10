-- Create a separate table for referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    user_id VARCHAR NOT NULL,
    referred_by TEXT, -- referral code of the user who referred this user
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_referral_codes_user 
        FOREIGN KEY (user_id) 
        REFERENCES app_users(id) 
        ON DELETE CASCADE,
    
    -- Indexes for better performance
    CONSTRAINT unique_referral_code UNIQUE (code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_referred_by ON referral_codes(referred_by);