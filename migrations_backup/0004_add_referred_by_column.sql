-- Add referred_by column to users table
ALTER TABLE "app_users" ADD COLUMN "referred_by" text;