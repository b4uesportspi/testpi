# 🧪 AI Chat Assistant - Testing Guide

## ✅ Prerequisites

- [x] Database table created
- [x] Google AI API key in `.env`
- [x] Server running on http://localhost:5001

---

## 🚀 How to Test

### 1. Open the App
- Click the preview button or go to: http://localhost:5001
- Look for the **chat icon** (bottom-left corner) - blue/purple circle with message icon

### 2. Open Chat Window
- Click the chat icon
- Chat window should open with welcome message
- You should see: *"Hello! I'm your B4U Esports AI assistant..."*

### 3. Test Messages

#### Test 1: Basic Greeting
```
Type: Hello!
Expected: Friendly greeting with offer to help
Response time: 1-2 seconds
```

#### Test 2: Purchase Query
```
Type: How to buy PUBG UC?
Expected: Step-by-step guide for purchasing PUBG UC
Should mention: Pi coins, payment screenshot, verification
```

#### Test 3: Payment Issue
```
Type: I paid but didnt recieve my tokens
Expected: Asks to wait, confirm payment, suggest contact support
Note: Tests typo tolerance ("didnt" instead of "didn't")
```

#### Test 4: Payment Failure
```
Type: Payment failed what to do?
Expected: Explains possible reasons, guides on retry
```

#### Test 5: Heavy Typo Test
```
Type: i wanna by mlbb diamonds
Expected: Understands intent despite typos
Should respond about MLBB diamonds purchase
```

#### Test 6: Order Status
```
Type: Where is my order?
Expected: Asks for order details, explains delivery time
```

#### Test 7: Support Request
```
Type: How to contact support?
Expected: Provides email (info@b4uesports.com) and WhatsApp info
```

---

## 🔍 What to Verify

### ✅ UI/UX Checks
- [ ] Chat icon visible in bottom-left
- [ ] Chat window opens smoothly with animation
- [ ] Welcome message appears
- [ ] Input field is focused when chat opens
- [ ] Messages scroll automatically
- [ ] Loading spinner shows while AI thinks
- [ ] Timestamps display correctly
- [ ] Close button works

### ✅ Functionality Checks
- [ ] User messages appear immediately (right side)
- [ ] AI responses appear after 1-2 seconds (left side)
- [ ] Loading state shows "AI is thinking..."
- [ ] Can send multiple messages
- [ ] Conversation context maintained
- [ ] Handles typos and slang
- [ ] Professional and helpful responses

### ✅ Database Checks
After sending messages, run:
```bash
npm run db:check-chat
```

Should show:
- [ ] Messages saved to database
- [ ] Both user and assistant messages stored
- [ ] Intent detected for each message
- [ ] Session ID tracked
- [ ] Timestamps recorded

---

## 🐛 Troubleshooting

### Chat Icon Not Showing
**Fix:** Check browser console for errors
```bash
# Open browser DevTools (F12)
# Look for errors in Console tab
```

### "AI service not configured" Error
**Fix:** Verify `.env` has:
```env
GOOGLE_AI_API_KEY=AIzaSyA-PWbOzhRXJc5sl8C4iKr3DEFRnGtOtjM
```
Then restart server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### No Response from AI
**Check:**
1. Internet connection (needs API access)
2. Google AI API key is valid
3. Server console for errors
4. Browser console for network errors

### Messages Not Saving to Database
**Check:**
1. Database connection in server logs
2. `chat_messages` table exists
3. Run: `npm run db:check-chat`

### Slow Responses (>5 seconds)
**Possible causes:**
- Slow internet connection
- Google API rate limiting
- Server performance issues

---

## 📊 Testing Database

### View All Messages
```bash
npm run db:check-chat
```

### Manual SQL Query
```sql
SELECT 
  role,
  content,
  intent,
  created_at
FROM chat_messages
ORDER BY created_at DESC
LIMIT 20;
```

### Count by Intent
```sql
SELECT intent, COUNT(*) as count
FROM chat_messages
WHERE intent IS NOT NULL
GROUP BY intent
ORDER BY count DESC;
```

---

## ✅ Test Checklist

### Basic Functionality
- [ ] Chat opens and closes
- [ ] Can type and send messages
- [ ] AI responds to greetings
- [ ] AI answers purchase questions
- [ ] AI handles payment issues
- [ ] AI provides support info

### AI Intelligence
- [ ] Understands typos ("didnt", "wanna", "by")
- [ ] Handles broken sentences
- [ ] Context-aware responses
- [ ] Professional tone
- [ ] Accurate information

### Performance
- [ ] Response time < 3 seconds
- [ ] Smooth animations
- [ ] No UI freezing
- [ ] Messages load instantly

### Database
- [ ] Messages saved correctly
- [ ] Intent detection working
- [ ] Session tracking works
- [ ] Timestamps accurate

---

## 🎯 Expected AI Behaviors

### When User Asks About Purchases:
✅ Explains Pi coin payment  
✅ Mentions screenshot upload  
✅ Notes verification process  
✅ Gives delivery timeframe  

### When User Reports Issues:
✅ Asks to wait a few minutes  
✅ Confirms payment status  
✅ Suggests contacting support  
✅ Never gives false info  

### When User Makes Typos:
✅ Understands correctly  
✅ Never mentions the typo  
✅ Responds appropriately  
✅ Professional tone  

---

## 📈 Success Metrics

Your AI chat is working if:
- ✅ Responds to 90%+ of queries
- ✅ Average response time < 2 seconds
- ✅ Messages saved to database
- ✅ Handles typos naturally
- ✅ Provides accurate info
- ✅ Professional and helpful

---

## 🚨 Common Test Scenarios

### Scenario 1: New User Purchase
```
User: "How do I buy 60 UC?"
AI: Should explain full process with Pi payment
```

### Scenario 2: Payment Problem
```
User: "I sent pi but no tokens"
AI: Should ask to wait, verify, suggest support
```

### Scenario 3: Typo Heavy
```
User: "wher iz mi ordr?"
AI: Should understand "where is my order?"
```

### Scenario 4: Multiple Questions
```
User: "How much is UC? And how to pay?"
AI: Should answer both questions
```

---

## 🎉 Success!

If all tests pass, your AI chat assistant is ready for production!

**Next Step:** Deploy to production 🚀
