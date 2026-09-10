-- Add tokens column to users table
ALTER TABLE "users" ADD COLUMN "tokens" INTEGER NOT NULL DEFAULT 0;