-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
BEGIN
    RETURN 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create referral code when user is created
CREATE OR REPLACE FUNCTION create_user_referral_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN := true;
    attempts INTEGER := 0;
BEGIN
    -- Try to generate a unique code (max 10 attempts)
    WHILE code_exists AND attempts < 10 LOOP
        new_code := generate_referral_code();
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
        attempts := attempts + 1;
    END LOOP;
    
    -- If we couldn't generate a unique code after 10 attempts, raise an error
    IF code_exists THEN
        RAISE EXCEPTION 'Unable to generate unique referral code after 10 attempts';
    END IF;
    
    -- Insert the new referral code
    -- Handle the case where referred_by might not exist in the NEW record
    INSERT INTO referral_codes (code, user_id, referred_by)
    VALUES (new_code, NEW.id, NEW.referred_by);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create referral code when user is created
-- Fix: Use the correct table name "app_users" instead of "users"
DROP TRIGGER IF EXISTS trigger_create_user_referral_code ON app_users;
CREATE TRIGGER trigger_create_user_referral_code
    AFTER INSERT ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_referral_code();