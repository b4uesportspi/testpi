# 🚀 GitHub Actions - Feedback Email Automation Setup

## ✅ What You Get (100% FREE)

- **2,000 minutes/month** of GitHub Actions runtime
- **Unlimited workflows** and cron jobs
- **Daily automated feedback emails** at scheduled time
- **Manual trigger** option to run anytime
- **Complete logging** and failure notifications

---

## 📋 Setup Steps

### Step 1: Push to GitHub

The workflow file is already created at:
```
.github/workflows/feedback-emails.yml
```

Just commit and push!

### Step 2: Add Secrets to GitHub

Go to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DATABASE_URL` | Your Supabase connection string | Database access |
| `JWT_SECRET` | Your JWT secret | Authentication |
| `SESSION_SECRET` | Your session secret | Session management |
| `GOOGLE_AI_API_KEY` | Your Google AI key | AI chat assistant |
| `PI_SERVER_API_KEY` | Your Pi Network API key | Payment processing |
| `SMTP_HOST` | `smtp.hostinger.com` | Email server |
| `SMTP_PORT` | `587` | Email port |
| `SMTP_USER` | `info@b4uesports.com` | Email username |
| `SMTP_PASS` | Your email password | Email password |

---

## ⏰ Schedule Configuration

Current schedule: **Daily at 10:00 AM UTC**

### Change the Schedule

Edit `.github/workflows/feedback-emails.yml`:

```yaml
schedule:
  # Format: minute hour day-of-month month day-of-week
  - cron: '0 10 * * *'  # 10:00 AM UTC daily
```

### Common Schedules

| Schedule | Cron | Description |
|----------|------|-------------|
| Every day at 6 AM UTC | `0 6 * * *` | Morning |
| Every day at 10 AM UTC | `0 10 * * *` | **Current** |
| Every day at 2 PM UTC | `0 14 * * *` | Afternoon |
| Every 6 hours | `0 */6 * * *` | 4x daily |
| Every hour | `0 * * * *` | Hourly |

**Note:** GitHub Actions minimum interval is every 5 minutes.

---

## 🎯 Manual Trigger

You can manually run the workflow anytime:

1. Go to **Actions** tab in your GitHub repo
2. Click **Send Feedback Request Emails**
3. Click **Run workflow** button
4. Select environment (production/development)
5. Click **Run workflow**

---

## 📊 Monitor Workflow

### Check Status
1. Go to **Actions** tab
2. Click on workflow runs
3. View logs and status

### Email Notifications
GitHub will email you if:
- ✅ Workflow succeeds
- ❌ Workflow fails

---

## 💰 GitHub Actions Free Tier

**Hobby Plan (FREE) includes:**
- ✅ **2,000 minutes/month**
- ✅ **Unlimited workflows**
- ✅ **Unlimited cron jobs**
- ✅ **500 MB storage**
- ✅ **Private repositories**

**Your feedback email job uses ~2-3 minutes per run**
- Daily run = ~60-90 minutes/month
- **You'll use only 5% of your free allowance!**

---

## 🔧 Workflow Details

### What It Does
1. ✅ Checks out your code
2. ✅ Installs Node.js 20
3. ✅ Installs dependencies (`npm ci`)
4. ✅ Runs feedback email script
5. ✅ Logs success/failure

### Environment Variables
All required secrets are passed to the script:
- Database connection
- Email SMTP credentials
- API keys
- Production mode enabled

---

## 🎉 Advantages Over Vercel Cron

| Feature | GitHub Actions | Vercel Cron |
|---------|---------------|-------------|
| **Free minutes/jobs** | 2,000 min/month | 1 job only |
| **Unlimited workflows** | ✅ Yes | ❌ No |
| **Flexible scheduling** | ✅ Every 5 min | ✅ Daily min |
| **Manual triggers** | ✅ Yes | ⚠️ Limited |
| **Detailed logs** | ✅ Yes | ⚠️ Basic |
| **Email notifications** | ✅ Yes | ❌ No |
| **Cost** | **FREE** | FREE (limited) |

---

## 📝 Testing Before Production

### Test Manually First
1. Push workflow to GitHub
2. Go to Actions tab
3. Click "Run workflow"
4. Select "development" environment
5. Monitor logs
6. Verify emails are sent

### Check Database
```sql
-- Verify feedback emails were marked as sent
SELECT COUNT(*) 
FROM app_transactions 
WHERE metadata->>'feedback_email_sent' = 'true';
```

---

## 🚨 Troubleshooting

### Workflow Not Running
- Check if scheduled time has passed
- Verify cron syntax
- Check GitHub Actions is enabled

### Workflow Fails
- Check logs in Actions tab
- Verify all secrets are added correctly
- Test database connection
- Check email credentials

### Emails Not Sending
- Verify SMTP secrets are correct
- Check database has eligible transactions
- Review email service logs

---

## 🎯 Next Steps

1. ✅ **Commit and push** the workflow file
2. ✅ **Add all secrets** to GitHub repository
3. ✅ **Test manually** first time
4. ✅ **Monitor first run** in Actions tab
5. ✅ **Set schedule** to your preferred time
6. ✅ **Enjoy automated feedback emails!**

---

## 💡 Pro Tips

- **Start with manual trigger** to test
- **Monitor first few runs** to ensure everything works
- **Adjust schedule** based on when your users are most active
- **Check usage** in GitHub Settings → Billing
- **You have PLENTY of free minutes** (2,000/month)!

---

**GitHub Actions is the BEST choice for your automation - more power, more flexibility, 100% FREE!** 🚀⭐
