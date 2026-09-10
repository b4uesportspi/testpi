# Quick Setup Guide - AI Chat Assistant

## 🚀 Getting Started in 5 Minutes

### Step 1: Get Google AI Studio API Key (100% FREE)

1. Go to https://aistudio.google.com/
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key
5. Copy the key (no credit card needed!)

### Step 2: Add API Key to Environment

Open your `.env` file and add:

```env
GOOGLE_AI_API_KEY=your-google-ai-key-here
```

### Step 3: Create Database Table

Run this SQL command in your PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES app_users(id),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  intent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
```

**Option 1: Using psql**
```bash
psql -U your_username -d your_database -f server/add-chat-table.sql
```

**Option 2: Using pgAdmin**
1. Open pgAdmin
2. Connect to your database
3. Open Query Tool
4. Copy and paste the SQL above
5. Execute

**Option 3: Using Supabase Dashboard**
1. Go to your Supabase project
2. Click "SQL Editor"
3. Paste the SQL
4. Click "Run"

### Step 4: Start the Application

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Step 5: Test the Chat

1. Open http://localhost:5173
2. Click the chat icon (bottom-left corner)
3. Type: "Hello, how do I buy PUBG UC?"
4. The AI should respond intelligently!

## ✅ Verification Checklist

- [ ] OpenRouter API key added to `.env`
- [ ] `chat_messages` table created in database
- [ ] Backend server running without errors
- [ ] Frontend running and accessible
- [ ] Chat window opens when clicking icon
- [ ] AI responds to messages
- [ ] Messages saved to database (check with SQL query)

## 🧪 Test Queries

Try these to verify everything works:

1. **Purchase Query**: "How to buy mlbb diamonds?"
2. **Payment Issue**: "I paid but didnt get my tokens"
3. **Order Status**: "Where is my order?"
4. **Support**: "How to contact support?"
5. **Typo Test**: "i wanna by pubg uc" (should understand)

## 🔍 Verify Database Storage

Run this SQL to see saved messages:

```sql
SELECT 
  id,
  user_id,
  session_id,
  role,
  LEFT(content, 50) as message_preview,
  intent,
  created_at
FROM chat_messages
ORDER BY created_at DESC
LIMIT 10;
```

## ⚠️ Troubleshooting

### "AI service not configured" error
**Solution**: Make sure `GOOGLE_AI_API_KEY` is in your `.env` file and restart the server.

### Table doesn't exist error
**Solution**: Run the SQL from Step 3 to create the `chat_messages` table.

### Chat not appearing
**Solution**: 
1. Check browser console for errors
2. Verify `chatbot-ai.tsx` is imported in `App.tsx`
3. Clear browser cache

### AI responses are slow
**Solution**: This is normal. OpenRouter API typically responds in 1-3 seconds.

### Messages not saving
**Solution**:
1. Check server logs for database errors
2. Verify database connection is working
3. Check that `chat_messages` table exists

## 📊 Monitor Usage

Google AI Studio is **100% FREE** with generous limits!

Monitor your usage at: https://aistudio.google.com/usage

Typical usage:
- 100 conversations/day: FREE
- 500 conversations/day: FREE
- No credit card required

## 🎉 Success!

If everything works, you should see:
- ✅ AI-powered chat window
- ✅ Intelligent responses to user queries
- ✅ Conversation history saved to database
- ✅ Session tracking for context
- ✅ Loading animations while AI thinks

## 📚 Next Steps

1. Read full documentation: `AI_CHAT_ASSISTANT.md`
2. Monitor chat analytics in database
3. Customize system prompt if needed
4. Consider adding rate limiting
5. Set up admin dashboard for chat monitoring

## 🆘 Need Help?

Check the full documentation:
- `AI_CHAT_ASSISTANT.md` - Complete technical documentation
- `server/services/ai-chat.ts` - AI service implementation
- `client/src/components/chatbot-ai.tsx` - Frontend component
- `server/routes.ts` - API endpoints (search for "AI CHAT ASSISTANT")

---

**Enjoy your new AI-powered chat assistant! 🤖✨**
