-- Add description column to packages table
ALTER TABLE packages ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a comment to indicate the purpose of this column
COMMENT ON COLUMN packages.description IS 'Description of the package for display purposes';