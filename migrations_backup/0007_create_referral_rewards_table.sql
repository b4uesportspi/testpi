-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id VARCHAR NOT NULL,
    referred_user_id VARCHAR NOT NULL,
    tokens_awarded INTEGER DEFAULT 0,
    reward_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'awarded'
    created_at TIMESTAMP DEFAULT NOW(),
    awarded_at TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_referral_rewards_referrer 
        FOREIGN KEY (referrer_id) 
        REFERENCES app_users(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_referral_rewards_referred_user 
        FOREIGN KEY (referred_user_id) 
        REFERENCES app_users(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint to prevent multiple referrals from the same user
    CONSTRAINT unique_user_referral UNIQUE (referred_user_id),
    
    -- Indexes for better performance
    CONSTRAINT unique_referral_reward UNIQUE (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred_user_id ON referral_rewards(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_reward_status ON referral_rewards(reward_status);