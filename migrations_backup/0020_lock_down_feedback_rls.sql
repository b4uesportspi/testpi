CREATE TABLE IF NOT EXISTS app_feedback (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR,
  username VARCHAR NOT NULL,
  email VARCHAR,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_feedback
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS app_feedback_replies (
  id VARCHAR PRIMARY KEY,
  feedback_id VARCHAR NOT NULL REFERENCES app_feedback(id) ON DELETE CASCADE,
  user_id VARCHAR,
  username VARCHAR NOT NULL,
  email VARCHAR,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view feedback" ON app_feedback;
DROP POLICY IF EXISTS "Anyone can submit feedback" ON app_feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON app_feedback;
DROP POLICY IF EXISTS "Anyone can view feedback replies" ON app_feedback_replies;
DROP POLICY IF EXISTS "Anyone can submit feedback replies" ON app_feedback_replies;
DROP POLICY IF EXISTS "Users can update own feedback replies" ON app_feedback_replies;

REVOKE ALL ON TABLE app_feedback FROM anon;
REVOKE ALL ON TABLE app_feedback FROM authenticated;
REVOKE ALL ON TABLE app_feedback FROM PUBLIC;
REVOKE ALL ON TABLE app_feedback_replies FROM anon;
REVOKE ALL ON TABLE app_feedback_replies FROM authenticated;
REVOKE ALL ON TABLE app_feedback_replies FROM PUBLIC;
REVOKE ALL ON TABLE chat_messages FROM anon;
REVOKE ALL ON TABLE chat_messages FROM authenticated;
REVOKE ALL ON TABLE chat_messages FROM PUBLIC;
REVOKE ALL ON TABLE marketing_email_sends FROM anon;
REVOKE ALL ON TABLE marketing_email_sends FROM authenticated;
REVOKE ALL ON TABLE marketing_email_sends FROM PUBLIC;
REVOKE ALL ON TABLE marketing_coupons FROM anon;
REVOKE ALL ON TABLE marketing_coupons FROM authenticated;
REVOKE ALL ON TABLE marketing_coupons FROM PUBLIC;
REVOKE ALL ON TABLE marketing_email_events FROM anon;
REVOKE ALL ON TABLE marketing_email_events FROM authenticated;
REVOKE ALL ON TABLE marketing_email_events FROM PUBLIC;

GRANT ALL ON TABLE app_feedback TO service_role;
GRANT ALL ON TABLE app_feedback_replies TO service_role;
GRANT ALL ON TABLE chat_messages TO service_role;
GRANT ALL ON TABLE marketing_email_sends TO service_role;
GRANT ALL ON TABLE marketing_coupons TO service_role;
GRANT ALL ON TABLE marketing_email_events TO service_role;
