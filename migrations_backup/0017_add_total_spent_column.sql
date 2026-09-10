-- Migration to add total_spent column to app_users table
-- This will store the total amount spent by each user in Pi tokens

-- Add the total_spent column to app_users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10, 8) DEFAULT 0.00000000;

-- Add a comment to describe the column
COMMENT ON COLUMN app_users.total_spent IS 'Total amount spent by the user in Pi tokens';

-- Create a function to update total_spent when a transaction is completed
CREATE OR REPLACE FUNCTION update_user_total_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if transaction is completed
    IF NEW.status = 'completed' THEN
        -- Update the user's total spent
        UPDATE app_users 
        SET total_spent = (
            SELECT COALESCE(SUM(pi_amount), 0)
            FROM app_transactions 
            WHERE user_id = NEW.user_id 
            AND status = 'completed'
        )
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update total_spent when transactions are inserted or updated
DROP TRIGGER IF EXISTS update_user_total_spent_trigger ON app_transactions;
CREATE TRIGGER update_user_total_spent_trigger
    AFTER INSERT OR UPDATE ON app_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_total_spent();

-- Initialize total_spent values for existing users
UPDATE app_users 
SET total_spent = (
    SELECT COALESCE(SUM(pi_amount), 0)
    FROM app_transactions 
    WHERE app_transactions.user_id = app_users.id 
    AND app_transactions.status = 'completed'
)
WHERE EXISTS (
    SELECT 1 
    FROM app_transactions 
    WHERE app_transactions.user_id = app_users.id 
    AND app_transactions.status = 'completed'
);

-- Also set total_spent to 0 for users who have no completed transactions
UPDATE app_users 
SET total_spent = 0.00000000
WHERE total_spent IS NULL;