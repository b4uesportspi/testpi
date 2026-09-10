-- Make wallet_address column nullable in users table
ALTER TABLE "app_users" ALTER COLUMN "wallet_address" DROP NOT NULL;