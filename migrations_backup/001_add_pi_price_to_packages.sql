-- Add pi_price column to packages table
ALTER TABLE packages ADD COLUMN IF NOT EXISTS pi_price DECIMAL(10,4);

-- Add a comment to indicate this column is calculated dynamically
COMMENT ON COLUMN packages.pi_price IS 'Calculated dynamically based on usdt_value and current Pi price';