-- Add chat_messages table for AI chat assistant
-- This migration ensures the chat history table exists and is secured.

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES app_users(id),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  intent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE chat_messages FROM anon;
REVOKE ALL ON TABLE chat_messages FROM authenticated;
REVOKE ALL ON TABLE chat_messages FROM PUBLIC;

GRANT ALL ON TABLE chat_messages TO service_role;
