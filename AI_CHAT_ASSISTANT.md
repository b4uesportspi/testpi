# B4U Esports AI Chat Assistant

## Overview
This document describes the implementation of the new AI-powered chat assistant for B4U Esports, using **Google AI Studio with Gemini Flash** - a completely FREE and powerful AI system.

## Features
- **AI-Powered Responses**: Uses Google AI Studio with Gemini Flash for intelligent, context-aware responses (FREE!)
- **Database Integration**: All conversations are stored in PostgreSQL for analytics and user support
- **Session Management**: Tracks conversation sessions for better context
- **Fallback System**: Graceful fallback when AI service is unavailable
- **24/7 Support**: Always available to help users with their queries
- **Smart Intent Recognition**: Automatically detects user intent (payment, purchase, order status, support, etc.)
- **Typo & Slang Tolerance**: AI naturally handles spelling mistakes, typos, and informal language

## Architecture

### Components

1. **Frontend Component** (`client/src/components/chatbot-ai.tsx`)
   - Modern React component with Framer Motion animations
   - Real-time message sending and receiving
   - Session-based conversation tracking
   - Loading states and error handling

2. **Backend API Routes** (`server/routes.ts`)
   - `POST /api/chat/message` - Send message and get AI response
   - `GET /api/chat/session/:sessionId` - Get session chat history
   - `GET /api/chat/user/:userId` - Get user's complete chat history

3. **AI Service** (`server/services/ai-chat.ts`)
   - OpenRouter API integration
   - System prompt configuration
   - Intent extraction
   - Fallback response generation

4. **Database Schema** (`shared/schema.ts`)
   - `chat_messages` table for storing all conversations
   - Tracks user ID, session ID, role, content, intent, and metadata

5. **Storage Layer** (`server/storage.ts`)
   - `saveChatMessage()` - Save individual messages
   - `getChatMessagesBySession()` - Retrieve session history
   - `getUserChatHistory()` - Retrieve user's complete history

## Setup Instructions

### 1. Get Google AI Studio API Key (FREE)

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or go to API Keys section
4. Create a new API key
5. Copy the API key (no credit card required!)

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
```

### 3. Database Migration

The new `chat_messages` table needs to be created. Run:

```bash
cd server
npm run migrate
```

Or if you're using Drizzle directly:

```bash
npx drizzle-kit push
```

### 4. Start the Application

```bash
# Start backend
cd server
npm run dev

# Start frontend (in another terminal)
cd client
npm run dev
```

## API Endpoints

### Send Message
```http
POST /api/chat/message
Content-Type: application/json

{
  "message": "How do I buy PUBG UC?",
  "sessionId": "unique-session-id",
  "userId": "user-id-optional"
}
```

**Response:**
```json
{
  "success": true,
  "userMessage": {
    "id": "msg-id-1",
    "content": "How do I buy PUBG UC?",
    "timestamp": "2026-04-21T10:00:00Z"
  },
  "assistantMessage": {
    "id": "msg-id-2",
    "content": "To purchase PUBG UC...",
    "intent": "purchase",
    "timestamp": "2026-04-21T10:00:02Z"
  }
}
```

### Get Session History
```http
GET /api/chat/session/:sessionId?limit=50
```

### Get User History
```http
GET /api/chat/user/:userId?limit=100
```

## AI System Prompt

The AI assistant is configured with a comprehensive system prompt that includes:

- **Role Definition**: Official B4U Esports AI assistant
- **Core Responsibilities**: Help with tokens, payments, orders, and support
- **Payment Instructions**: Clear guidelines on Pi coin payments and verification
- **Error Handling**: How to handle failed transactions and delays
- **Supported Games & Services**: Complete list of offerings
- **Contact Information**: Email and WhatsApp support details
- **Tone**: Professional, friendly, and helpful

## Key Behaviors

### Payment Flow Guidance
1. Users must send Pi coins to complete purchases
2. Users must upload payment screenshots for verification
3. Orders process after verification
4. Delivery takes a few minutes

### Handling Issues

**User didn't receive tokens:**
- Ask them to wait a few minutes
- Confirm payment was completed
- Suggest contacting support with proof

**Payment failure:**
- Explain possible reasons (network delay, incorrect steps)
- Guide on how to retry properly

### Language Understanding
- Automatically understands typos and spelling mistakes
- Interprets slang and broken sentences
- Never mentions or corrects user's spelling errors
- Assumes unclear messages relate to payments/tokens/orders

## Database Schema

```sql
CREATE TABLE chat_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES app_users(id),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  intent TEXT,  -- Detected intent
  metadata JSONB,  -- Additional context
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Model Configuration

- **Provider**: Google AI Studio
- **Model**: Gemini 2.0 Flash
- **API**: generativelanguage.googleapis.com
- **Max Tokens**: 500
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Top K**: 40
- **Top P**: 0.95

## Cost Management

**Google AI Studio is COMPLETELY FREE!**

- Free tier includes hundreds of requests per day
- No credit card required
- Perfect for production use
- Monitor usage at: https://aistudio.google.com/usage

Typical usage:
- 100 conversations/day: FREE
- 500 conversations/day: FREE
- 1000+ conversations/day: Still free with generous limits

## Fallback System

When the AI service is unavailable or API key is not configured, the system uses a fallback response:

```
🤖 I'm currently experiencing high traffic. Please try again in a moment.

For immediate assistance:
📧 Email: info@b4uesports.com
💬 WhatsApp: Use the link in our website footer

How can I help you today?
```

## Security Considerations

1. **API Key Protection**: OpenRouter API key is stored server-side only
2. **User Privacy**: Chat history is linked to user ID (nullable for guests)
3. **Session Tracking**: Anonymous sessions use UUID
4. **No Sensitive Data**: AI doesn't have access to passwords or payment details
5. **Rate Limiting**: Consider implementing rate limiting to prevent abuse

## Testing

### Manual Testing
1. Open the application
2. Click the chat icon (bottom-left corner)
3. Test various queries:
   - "How to buy pubg uc?"
   - "I didnt recieve my tokens"
   - "Payment failed what to do?"
   - "How much is 60 uc?"
   - "contact suport"

### Expected Behaviors
- AI understands typos and responds correctly
- Responses are helpful and accurate
- Conversations are saved to database
- Loading state shows while AI is thinking
- Fallback appears if AI service is down

## Monitoring & Analytics

Query chat data for insights:

```sql
-- Most common intents
SELECT intent, COUNT(*) as count
FROM chat_messages
WHERE intent IS NOT NULL
GROUP BY intent
ORDER BY count DESC;

-- Daily chat volume
SELECT DATE(created_at) as date, COUNT(*) as messages
FROM chat_messages
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Average session length
SELECT COUNT(*) / COUNT(DISTINCT session_id) as avg_messages_per_session
FROM chat_messages;
```

## Future Enhancements

- [ ] Add multi-language support
- [ ] Implement conversation summarization
- [ ] Add admin dashboard for chat analytics
- [ ] Enable human agent handoff
- [ ] Add voice input support
- [ ] Implement proactive messaging
- [ ] Add sentiment analysis tracking
- [ ] Create chat-based order tracking
- [ ] Add payment screenshot upload in chat

## Troubleshooting

### "AI service not configured" error
- Check that `GOOGLE_AI_API_KEY` is set in `.env`
- Restart the server after adding the key

### Messages not saving to database
- Ensure database migration has been run
- Check database connection in server logs

### AI responses are slow
- Check Google AI Studio API status
- Gemini Flash is typically very fast (1-2 seconds)
- Implement caching for common questions

### High API costs
- Google AI Studio is FREE!
- Monitor usage at Google AI Studio dashboard
- Implement rate limiting if needed
- Add caching for frequent queries

## Support

For issues with the AI chat system:
- Check server logs for error messages
- Verify Google AI API key is valid
- Test API connectivity manually
- Review database connection status

## Migration from Old Chatbot

The old rule-based chatbot (`chatbot.tsx`) has been replaced with `chatbot-ai.tsx`. The old file is still available for reference but is no longer used.

Key differences:
- **Old**: Rule-based pattern matching with predefined responses
- **New**: AI-powered with dynamic, context-aware responses
- **Old**: No database storage
- **New**: Full conversation history in database
- **Old**: Limited to predefined patterns
- **New**: Understands natural language and handles any query

## License

This implementation is part of the B4U Esports platform.
