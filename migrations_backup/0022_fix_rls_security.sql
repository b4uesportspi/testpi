-- ============================================================
-- Migration: 0022_fix_rls_security.sql
-- Date: 2026-05-02
-- Description: Enable Row Level Security on ALL public tables
--              and lock down sensitive columns from anonymous
--              API access. Resolves Supabase security alerts:
--                - rls_disabled_in_public
--                - sensitive_columns_exposed
-- ============================================================
-- HOW TO APPLY:
--   Paste this entire file into the Supabase SQL Editor and
--   click "Run". No data will be deleted or altered.
-- ============================================================


-- ============================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================================
-- This blocks all access by default. Access is then granted
-- back selectively via policies below.

ALTER TABLE app_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_packages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pi_price_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_rewards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rankings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_sends   ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_coupons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_events  ENABLE ROW LEVEL SECURITY;

-- Conditionally enable on tables that may or may not exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback') THEN
    EXECUTE 'ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback_replies') THEN
    EXECUTE 'ALTER TABLE app_feedback_replies ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;


-- ============================================================
-- STEP 2: REVOKE PUBLIC / ANON ACCESS FROM SENSITIVE TABLES
-- ============================================================
-- The `anon` role is used by the Supabase JS client when no
-- user is logged in. Stripping its access from sensitive
-- tables closes the "sensitive_columns_exposed" alert.

REVOKE ALL ON TABLE app_users              FROM anon, PUBLIC;
REVOKE ALL ON TABLE app_admins             FROM anon, PUBLIC;
REVOKE ALL ON TABLE app_transactions       FROM anon, PUBLIC;
REVOKE ALL ON TABLE referral_codes         FROM anon, PUBLIC;
REVOKE ALL ON TABLE referral_rewards       FROM anon, PUBLIC;
REVOKE ALL ON TABLE purchase_rewards       FROM anon, PUBLIC;
REVOKE ALL ON TABLE user_rankings          FROM anon, PUBLIC;
REVOKE ALL ON TABLE chat_messages          FROM anon, PUBLIC;
REVOKE ALL ON TABLE marketing_email_sends  FROM anon, PUBLIC;
REVOKE ALL ON TABLE marketing_coupons      FROM anon, PUBLIC;
REVOKE ALL ON TABLE marketing_email_events FROM anon, PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback') THEN
    EXECUTE 'REVOKE ALL ON TABLE app_feedback FROM anon, PUBLIC';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback_replies') THEN
    EXECUTE 'REVOKE ALL ON TABLE app_feedback_replies FROM anon, PUBLIC';
  END IF;
END$$;

-- Packages and price history are non-sensitive — anon can read them
-- (needed for the public storefront to display products & Pi prices)
REVOKE INSERT, UPDATE, DELETE ON TABLE app_packages      FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE pi_price_history  FROM anon, PUBLIC;


-- ============================================================
-- STEP 3: ENSURE service_role RETAINS FULL ACCESS
-- ============================================================
-- Your backend API uses the service_role key and bypasses RLS
-- by default in Supabase, but explicit grants are good practice.

GRANT ALL ON TABLE app_users               TO service_role;
GRANT ALL ON TABLE app_admins              TO service_role;
GRANT ALL ON TABLE app_packages            TO service_role;
GRANT ALL ON TABLE app_transactions        TO service_role;
GRANT ALL ON TABLE pi_price_history        TO service_role;
GRANT ALL ON TABLE referral_codes          TO service_role;
GRANT ALL ON TABLE referral_rewards        TO service_role;
GRANT ALL ON TABLE purchase_rewards        TO service_role;
GRANT ALL ON TABLE user_rankings           TO service_role;
GRANT ALL ON TABLE chat_messages           TO service_role;
GRANT ALL ON TABLE marketing_email_sends   TO service_role;
GRANT ALL ON TABLE marketing_coupons       TO service_role;
GRANT ALL ON TABLE marketing_email_events  TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback') THEN
    EXECUTE 'GRANT ALL ON TABLE app_feedback TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback_replies') THEN
    EXECUTE 'GRANT ALL ON TABLE app_feedback_replies TO service_role';
  END IF;
END$$;


-- ============================================================
-- STEP 4: DROP ANY LEGACY OPEN POLICIES
-- ============================================================
-- Old policies that allowed anyone to read sensitive data.

DROP POLICY IF EXISTS "Anyone can view users"               ON app_users;
DROP POLICY IF EXISTS "Anyone can view app_users"           ON app_users;
DROP POLICY IF EXISTS "Public read access"                  ON app_users;

DROP POLICY IF EXISTS "Anyone can view transactions"        ON app_transactions;
DROP POLICY IF EXISTS "Anyone can view app_transactions"    ON app_transactions;

DROP POLICY IF EXISTS "Anyone can view referral_codes"      ON referral_codes;
DROP POLICY IF EXISTS "Anyone can view purchase_rewards"    ON purchase_rewards;
DROP POLICY IF EXISTS "Anyone can view referral_rewards"    ON referral_rewards;
DROP POLICY IF EXISTS "Anyone can view app_admins"          ON app_admins;
DROP POLICY IF EXISTS "Anyone can view admins"              ON app_admins;
DROP POLICY IF EXISTS "Anyone can view chat_messages"       ON chat_messages;
DROP POLICY IF EXISTS "Anyone can view marketing_email_sends" ON marketing_email_sends;
DROP POLICY IF EXISTS "Anyone can view marketing_email_events" ON marketing_email_events;
DROP POLICY IF EXISTS "Anyone can view marketing_coupons"   ON marketing_coupons;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view feedback" ON app_feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can submit feedback" ON app_feedback';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own feedback" ON app_feedback';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback_replies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view feedback replies" ON app_feedback_replies';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can submit feedback replies" ON app_feedback_replies';
  END IF;
END$$;


-- ============================================================
-- STEP 5: CREATE SECURE RLS POLICIES
-- ============================================================
-- Your app uses a custom auth system (Pi Network), not Supabase
-- Auth. All DB writes go through your backend service_role key,
-- which bypasses RLS. The policies below are therefore mainly
-- a safety net — they ensure even if a request somehow reaches
-- Supabase directly, it can only touch the right rows.
--
-- NOTE: Since you don't use Supabase Auth (auth.uid()), we
-- lock the public-facing roles to SELECT-only on non-sensitive
-- tables, and deny everything on sensitive ones.


-- ── app_packages (public read is fine — it's your storefront) ──
DROP POLICY IF EXISTS "Public can read active packages" ON app_packages;
CREATE POLICY "Public can read active packages"
  ON app_packages
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Only service_role can write packages (handled via backend)
DROP POLICY IF EXISTS "Service role manages packages" ON app_packages;
CREATE POLICY "Service role manages packages"
  ON app_packages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── pi_price_history (public read is fine — no PII) ──
DROP POLICY IF EXISTS "Public can read price history" ON pi_price_history;
CREATE POLICY "Public can read price history"
  ON pi_price_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages price history" ON pi_price_history;
CREATE POLICY "Service role manages price history"
  ON pi_price_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── app_users (sensitive — passphrase, email, phone, wallet) ──
-- No anon access. Backend (service_role) handles all reads/writes.
DROP POLICY IF EXISTS "Service role manages users" ON app_users;
CREATE POLICY "Service role manages users"
  ON app_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── app_admins (highly sensitive — hashed passwords) ──
DROP POLICY IF EXISTS "Service role manages admins" ON app_admins;
CREATE POLICY "Service role manages admins"
  ON app_admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── app_transactions ──
DROP POLICY IF EXISTS "Service role manages transactions" ON app_transactions;
CREATE POLICY "Service role manages transactions"
  ON app_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read only their own app_transactions" ON app_transactions;
CREATE POLICY "Users can read only their own app_transactions"
  ON app_transactions
  FOR SELECT
  TO authenticated
  USING (
    user_id = COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json->>'user_id'
  );

DROP POLICY IF EXISTS "Admins can read all app_transactions" ON app_transactions;
CREATE POLICY "Admins can read all app_transactions"
  ON app_transactions
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json->>'isAdmin' = 'true'
    OR COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json->>'role' = 'admin'
  );

-- ── referral_codes ──
DROP POLICY IF EXISTS "Service role manages referral codes" ON referral_codes;
CREATE POLICY "Service role manages referral codes"
  ON referral_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── referral_rewards ──
DROP POLICY IF EXISTS "Service role manages referral rewards" ON referral_rewards;
CREATE POLICY "Service role manages referral rewards"
  ON referral_rewards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── purchase_rewards ──
DROP POLICY IF EXISTS "Service role manages purchase rewards" ON purchase_rewards;
CREATE POLICY "Service role manages purchase rewards"
  ON purchase_rewards
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── user_rankings ──
DROP POLICY IF EXISTS "Service role manages user rankings" ON user_rankings;
CREATE POLICY "Service role manages user rankings"
  ON user_rankings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── chat_messages ──
DROP POLICY IF EXISTS "Service role manages chat messages" ON chat_messages;
CREATE POLICY "Service role manages chat messages"
  ON chat_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── marketing_email_sends ──
DROP POLICY IF EXISTS "Service role manages marketing email sends" ON marketing_email_sends;
CREATE POLICY "Service role manages marketing email sends"
  ON marketing_email_sends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── marketing_coupons ──
DROP POLICY IF EXISTS "Service role manages marketing coupons" ON marketing_coupons;
CREATE POLICY "Service role manages marketing coupons"
  ON marketing_coupons
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── marketing_email_events ──
DROP POLICY IF EXISTS "Service role manages marketing email events" ON marketing_email_events;
CREATE POLICY "Service role manages marketing email events"
  ON marketing_email_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ── app_feedback / app_feedback_replies (conditional) ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback') THEN
    EXECUTE '
      DROP POLICY IF EXISTS "Service role manages feedback" ON app_feedback;
      CREATE POLICY "Service role manages feedback"
        ON app_feedback FOR ALL TO service_role
        USING (true) WITH CHECK (true)
    ';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_feedback_replies') THEN
    EXECUTE '
      DROP POLICY IF EXISTS "Service role manages feedback replies" ON app_feedback_replies;
      CREATE POLICY "Service role manages feedback replies"
        ON app_feedback_replies FOR ALL TO service_role
        USING (true) WITH CHECK (true)
    ';
  END IF;
END$$;


-- ============================================================
-- STEP 6: VERIFICATION QUERY
-- ============================================================
-- Run this after applying to confirm all tables are secured.
-- Every row should show relrowsecurity = true.

SELECT
  c.relname          AS table_name,
  c.relrowsecurity   AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname LIKE 'app_%'
   OR c.relname IN (
     'referral_codes','referral_rewards','purchase_rewards',
     'user_rankings','pi_price_history','chat_messages',
     'marketing_email_sends','marketing_coupons','marketing_email_events'
   )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;
