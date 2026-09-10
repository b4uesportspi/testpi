-- Migration: Lock down sensitive tables from anonymous access
-- Date: 2026-05-02
-- Description: Revoke anonymous access from sensitive tables to prevent data exposure

-- Revoke all anonymous access from sensitive tables
REVOKE ALL ON TABLE users FROM anon;
REVOKE ALL ON TABLE app_users FROM anon;
REVOKE ALL ON TABLE transactions FROM anon;
REVOKE ALL ON TABLE app_transactions FROM anon;
REVOKE ALL ON TABLE referral_codes FROM anon;
REVOKE ALL ON TABLE purchase_rewards FROM anon;
REVOKE ALL ON TABLE referral_rewards FROM anon;
REVOKE ALL ON TABLE security_audit_log FROM anon;
REVOKE ALL ON TABLE app_admins FROM anon;
REVOKE ALL ON TABLE admins FROM anon;
REVOKE ALL ON TABLE chat_messages FROM anon;
REVOKE ALL ON TABLE marketing_email_sends FROM anon;
REVOKE ALL ON TABLE marketing_email_events FROM anon;
REVOKE ALL ON TABLE marketing_coupons FROM anon;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_coupons ENABLE ROW LEVEL SECURITY;

-- Drop any policies that allow anonymous access to sensitive tables
DROP POLICY IF EXISTS "Anyone can view users" ON users;
DROP POLICY IF EXISTS "Anyone can view app_users" ON app_users;
DROP POLICY IF EXISTS "Anyone can view transactions" ON transactions;
DROP POLICY IF EXISTS "Anyone can view app_transactions" ON app_transactions;
DROP POLICY IF EXISTS "Anyone can view referral_codes" ON referral_codes;
DROP POLICY IF EXISTS "Anyone can view purchase_rewards" ON purchase_rewards;
DROP POLICY IF EXISTS "Anyone can view referral_rewards" ON referral_rewards;
DROP POLICY IF EXISTS "Anyone can view security_audit_log" ON security_audit_log;
DROP POLICY IF EXISTS "Anyone can view app_admins" ON app_admins;
DROP POLICY IF EXISTS "Anyone can view admins" ON admins;
DROP POLICY IF EXISTS "Anyone can view chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can view marketing_email_sends" ON marketing_email_sends;
DROP POLICY IF EXISTS "Anyone can view marketing_email_events" ON marketing_email_events;
DROP POLICY IF EXISTS "Anyone can view marketing_coupons" ON marketing_coupons;