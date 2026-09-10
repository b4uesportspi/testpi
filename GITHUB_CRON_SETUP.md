# GitHub Actions Cron Jobs Setup

**✅ CONSOLIDATED SETUP**: All cron jobs now run via GitHub Actions only. Vercel cron has been removed to work within free tier limits.

## Current Cron Schedule

| Task | Frequency | Status |
|------|-----------|--------|
| Transaction Sync | Every 10 minutes | ✅ Active |
| Weekly Marketing | Thursdays 21:40 UTC | ✅ Active |
| Monthly Marketing | 1st of month 10:00 UTC | ✅ Active |
| Feedback Emails | Daily 10:00 UTC | ✅ Active |

## Required GitHub Repository Secrets

You need to add these secrets to your GitHub repository settings:

### 1. `CRON_AUTH_TOKEN`
- **Value**: Your `CRON_AUTH_TOKEN` from `.env` file
- **Used for**: Transaction status synchronization endpoint

### 2. `MARKETING_EMAIL_SECRET`
- **Value**: Your `MARKETING_EMAIL_SECRET` from `.env` file
- **Used for**: Weekly and monthly marketing email endpoints

### 3. `VERCEL_APP_URL`
- **Value**: Your deployed Vercel app URL (e.g., `https://b4uesportstest.vercel.app`)
- **Used for**: All cron job API calls

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions** in the left sidebar
4. Click **New repository secret**
5. Add each secret with the names and values above

## Cron Schedules

The workflow runs on these schedules (UTC timezone):

- **Transaction Sync**: Every 10 minutes (`*/10 * * * *`)
- **Weekly Marketing**: Thursdays at 21:40 (`40 21 * * 4`)
- **Monthly Marketing**: 1st of each month at 10:00 (`0 10 1 * *`)

## Manual Testing

You can manually trigger the workflow to test it:

1. Go to the **Actions** tab in your GitHub repository
2. Click **Cron Jobs** workflow
3. Click **Run workflow** button
4. The workflow will run all three jobs

## Monitoring

- Check the **Actions** tab to see workflow runs and their status
- Each job will show logs for the API calls
- Failed runs will be marked as such and can be retried

## Migration Complete ✅

- ✅ GitHub Actions cron jobs are active and running
- ✅ Vercel cron configuration removed (`vercel-cron.json` deleted)
- ✅ All cron functionality consolidated to GitHub Actions
- ✅ Works within Vercel free tier limits (no cron restrictions)

## Cost Savings

- **Vercel Cron Jobs**: Paid service (costs money)
- **GitHub Actions**: Free for public repos, or included in GitHub Pro/Free tiers for private repos
