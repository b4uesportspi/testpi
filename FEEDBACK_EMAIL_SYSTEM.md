# 📧 Automated Feedback Request Email System

## Overview

Automatically sends feedback request emails to users **24 hours after successful purchase**. The email includes a "Leave Us a Review" button that redirects to the feedback section in the dashboard.

---

## ✨ Features

✅ **Automated** - Runs daily without manual intervention  
✅ **Smart Timing** - Sends exactly 24 hours after purchase  
✅ **Duplicate Prevention** - Tracks which users received emails  
✅ **Professional Design** - Beautiful email template matching B4U branding  
✅ **Direct Feedback Link** - One-click redirect to feedback section  
✅ **Purchase Details** - Shows game, package, and transaction info  
✅ **Error Handling** - Graceful failure with logging  
✅ **Analytics** - Tracks success rates and delivery stats  

---

## 🎯 How It Works

### 1. User Makes Purchase
```
User buys PUBG 660 UC → Transaction status: "completed"
```

### 2. 24 Hours Later
```
Cron job runs → Finds eligible transactions from exactly 24h ago
```

### 3. Email Sent
```
Beautiful feedback request email → Delivered to user's inbox
```

### 4. User Clicks Button
```
"Leave Us a Review" button → Redirects to /dashboard#feedback
```

### 5. User Leaves Feedback
```
Rating + Comment → Saved to database → Visible in feedback section
```

---

## 📧 Email Template Features

### Header Section
- B4U Esports logo
- "We Value Your Feedback! ⭐" heading
- Professional gradient background

### Greeting
- Personalized with username
- Mentions specific purchase (game + package)

### Purchase Details Box
- ✅ Game name
- ✅ Package name  
- ✅ Purchase date
- ✅ Transaction ID

### Call-to-Action Button
- **Large, prominent "⭐ Leave Us a Review" button**
- Gradient blue-purple design
- Redirects to `/dashboard#feedback`
- Mobile responsive

### Benefits Section
- Why feedback matters
- Helps improve services
- Helps other gamers
- Earn tokens
- Impact future features

### Support Section
- Email: info@b4uesports.com
- WhatsApp link
- Available 24/7

### Footer
- B4U Esports branding
- Quick links (Website, Feedback, Contact)
- Copyright notice

---

## 🚀 Usage

### Manual Test (Development)

Run the feedback email script manually:

```bash
npm run feedback:emails
```

This will:
1. Find transactions from 24 hours ago
2. Send feedback request emails
3. Mark transactions as emailed
4. Show success/failure summary

### Production Deployment

```bash
npm run feedback:emails:prod
```

---

## ⏰ Automated Scheduling

### Option 1: Vercel Cron Jobs (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/feedback-emails",
      "schedule": "0 10 * * *"
    }
  ]
}
```

This runs daily at 10:00 AM UTC.

### Option 2: GitHub Actions

Create `.github/workflows/feedback-emails.yml`:

```yaml
name: Send Feedback Emails

on:
  schedule:
    - cron: '0 10 * * *'  # Daily at 10 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  send-feedback-emails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run feedback:emails:prod
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SMTP_HOST: ${{ secrets.SMTP_HOST }}
          SMTP_PORT: ${{ secrets.SMTP_PORT }}
          SMTP_USER: ${{ secrets.SMTP_USER }}
          SMTP_PASS: ${{ secrets.SMTP_PASS }}
          SMTP_FROM: ${{ secrets.SMTP_FROM }}
          SMTP_FROM_NAME: ${{ secrets.SMTP_FROM_NAME }}
          APP_URL: ${{ secrets.APP_URL }}
```

### Option 3: Server Cron Job

On your server, add to crontab:

```bash
crontab -e

# Add this line (runs daily at 10 AM)
0 10 * * * cd /path/to/b4uesports && npm run feedback:emails:prod >> /var/log/feedback-emails.log 2>&1
```

---

## 🔍 How Transactions Are Selected

The system finds transactions that meet ALL criteria:

✅ Status is `completed` or `approved`  
✅ Created between 24-25 hours ago  
✅ `metadata.feedback_email_sent` is NOT `true`  
✅ User has valid email address  
✅ Email is not empty  

### SQL Query Used

```sql
SELECT 
  t.id as transaction_id,
  t.user_id,
  p.game as game_name,
  p.name as package_name,
  u.username,
  u.email,
  t.created_at as purchase_date
FROM app_transactions t
JOIN app_packages p ON t.package_id = p.id
JOIN app_users u ON t.user_id = u.id
WHERE t.status IN ('completed', 'approved')
  AND t.created_at >= $1  -- 25 hours ago
  AND t.created_at <= $2  -- 24 hours ago
  AND (t.metadata->>'feedback_email_sent') IS DISTINCT FROM 'true'
  AND u.email IS NOT NULL
  AND u.email != ''
```

---

## 📊 Tracking & Analytics

### Metadata Tracking

After sending, the transaction is updated:

```json
{
  "feedback_email_sent": true,
  "feedback_email_sent_at": "2026-04-22T10:00:00Z"
}
```

This prevents duplicate emails.

### Console Output

```
🚀 Starting feedback request email process...

📅 Time window:
   From: 2026-04-20T09:00:00.000Z
   To: 2026-04-20T10:00:00.000Z

🔍 Searching for eligible transactions...
📊 Found 5 eligible transactions

📧 Processing: PlayerOne (player@email.com)
   Game: PUBG - 660 UC
   Purchase Date: 4/20/2026, 9:15:00 AM
   ✅ Email sent and marked

════════════════════════════════════════════════════════
📊 FEEDBACK EMAIL SUMMARY
════════════════════════════════════════════════════════
   Total Transactions: 5
   ✅ Emails Sent: 5
   ❌ Emails Failed: 0
   Success Rate: 100.0%
════════════════════════════════════════════════════════

✅ Feedback request process completed!
```

---

## 🧪 Testing

### Test 1: Manual Run

```bash
# Run the script
npm run feedback:emails

# Check output for success/errors
```

### Test 2: Check Database

```sql
-- See which transactions have received feedback emails
SELECT 
  id,
  user_id,
  status,
  metadata->>'feedback_email_sent' as email_sent,
  created_at
FROM app_transactions
WHERE metadata->>'feedback_email_sent' = 'true'
ORDER BY created_at DESC
LIMIT 10;
```

### Test 3: Verify Email Delivery

Check your email inbox for the feedback request email. Verify:
- ✅ Correct subject line
- ✅ Personalized greeting
- ✅ Purchase details accurate
- ✅ "Leave Us a Review" button works
- ✅ Button redirects to `/dashboard#feedback`
- ✅ Mobile responsive

### Test 4: Feedback Redirect

1. Click "Leave Us a Review" button in email
2. Should redirect to: `https://yoursite.com/dashboard#feedback`
3. Feedback section should be visible
4. Can submit rating and comment

---

## 🎨 Email Customization

### Change Colors

Edit `server/services/email.ts` → `sendFeedbackRequestEmail` function:

```typescript
// Header gradient
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);

// CTA button gradient
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
```

### Change Button Text

```typescript
// Find and replace
⭐ Leave Us a Review
```

### Change Redirect URL

```typescript
const feedbackURL = `${process.env.APP_URL || 'https://b4uesportstest.vercel.app'}/dashboard#feedback`;
```

---

## 🔧 Configuration

### Environment Variables

Required in `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=info@b4uesports.com
SMTP_PASS=your-password
SMTP_FROM=info@b4uesports.com
SMTP_FROM_NAME=B4U Esports

# App URL
APP_URL=https://b4uesportstest.vercel.app

# Database
DATABASE_URL=postgresql://...
```

---

## 📈 Monitoring

### Check Email Logs

```bash
# Search for feedback email logs
grep "FEEDBACK_REQUEST" /var/log/app.log
```

### Database Queries

```sql
-- Count feedback emails sent today
SELECT COUNT(*) 
FROM app_transactions 
WHERE metadata->>'feedback_email_sent' = 'true'
  AND DATE(created_at) = CURRENT_DATE;

-- Success rate
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN metadata->>'feedback_email_sent' = 'true' THEN 1 END) as emails_sent
FROM app_transactions 
WHERE status IN ('completed', 'approved')
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## 🐛 Troubleshooting

### No Emails Sent

**Check:**
1. Transactions exist from 24h ago
2. Transactions have `completed` or `approved` status
3. Users have valid email addresses
4. `metadata.feedback_email_sent` is not already `true`

**Debug:**
```bash
# Run with verbose logging
npm run feedback:emails 2>&1 | tee feedback-debug.log
```

### Emails Going to Spam

**Fix:**
1. Verify SMTP credentials
2. Check SPF/DKIM records
3. Use proper from address
4. Avoid spam trigger words

### Button Not Working

**Check:**
1. APP_URL is correct in `.env`
2. Feedback route exists at `/dashboard#feedback`
3. Email HTML is properly formatted

### Duplicate Emails

**Should not happen**, but if it does:
```sql
-- Reset all feedback email flags
UPDATE app_transactions 
SET metadata = metadata - 'feedback_email_sent';
```

---

## 📝 Implementation Details

### Files Modified/Created

1. **`server/services/email.ts`**
   - Added `sendFeedbackRequestEmail()` function
   - Beautiful HTML email template
   - Error handling and logging

2. **`server/tasks/send-feedback-emails.ts`**
   - Cron job script
   - Finds eligible transactions
   - Sends emails
   - Updates metadata

3. **`package.json`**
   - Added `feedback:emails` script
   - Added `feedback:emails:prod` script

### Email Function Signature

```typescript
interface FeedbackRequestParams {
  to: string;              // User email
  username: string;        // User's name
  gameName: string;        // e.g., "PUBG"
  packageName: string;     // e.g., "660 UC"
  purchaseDate: string;    // ISO date string
  transactionId: string;   // Transaction ID
}

export async function sendFeedbackRequestEmail(
  params: FeedbackRequestParams
): Promise<boolean>
```

---

## 🎯 Best Practices

### ✅ DO:
- Run daily at consistent time
- Monitor success rates
- Test email template regularly
- Keep email content concise
- Use clear call-to-action
- Track delivery metrics

### ❌ DON'T:
- Send multiple emails per purchase
- Send to failed/cancelled transactions
- Use generic subject lines
- Make email too long
- Forget to test mobile view

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Test email template locally
- [ ] Verify SMTP credentials
- [ ] Set APP_URL correctly
- [ ] Configure cron job/scheduler
- [ ] Test feedback redirect URL
- [ ] Monitor first few runs
- [ ] Set up error alerts
- [ ] Document in team wiki

---

## 📚 Related Documentation

- [Email Service](file:///c:/Users/HP/Desktop/esports/server/services/email.ts)
- [Feedback Page](file:///c:/Users/HP/Desktop/esports/client/src/pages/feedback.tsx)
- [Dashboard Feedback Section](file:///c:/Users/HP/Desktop/esports/client/src/pages/dashboard.tsx)

---

## 🎉 Success Metrics

Track these metrics to measure success:

1. **Email Delivery Rate** - Target: >95%
2. **Open Rate** - Target: >40%
3. **Click-Through Rate** - Target: >15%
4. **Feedback Submission Rate** - Target: >10%
5. **Average Rating** - Target: >4.0/5.0

---

**Your automated feedback system is ready! Users will now receive professional feedback requests 24 hours after purchase.** 🎊

