-- Run this SQL directly in your database to deactivate the 0.06 UC package
-- This will immediately hide it from the shop

UPDATE packages 
SET isActive = false, updated_at = NOW() 
WHERE name = '0.06 UC' AND game = 'PUBG';

-- Verify the change
SELECT id, name, game, isActive, updated_at 
FROM packages 
WHERE name = '0.06 UC' AND game = 'PUBG';
