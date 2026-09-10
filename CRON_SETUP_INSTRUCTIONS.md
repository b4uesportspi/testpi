# Cron Job Setup Instructions

**✅ UPDATED**: All cron jobs now run via GitHub Actions. No Vercel cron configuration needed.

## Required GitHub Repository Secrets

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### 1. `CRON_AUTH_TOKEN`
- **Value**: Your `CRON_AUTH_TOKEN` from `.env` file
- **Used for**: Transaction status synchronization endpoint

### 2. `MARKETING_EMAIL_SECRET`
- **Value**: Your `MARKETING_EMAIL_SECRET` from `.env` file
- **Used for**: Weekly and monthly marketing email endpoints

### 3. `VERCEL_APP_URL`
- **Value**: Your deployed Vercel app URL (e.g., `https://b4uesportstest.vercel.app`)
- **Used for**: All cron job API calls

## Required Environment Variables (Vercel)

Add the following environment variables to your Vercel project settings:

```bash
# Security token for cron endpoint (required)
CRON_AUTH_TOKEN=your_secure_random_token_here

# Marketing email secret (required)
MARKETING_EMAIL_SECRET=your_marketing_secret_here

# Pi Network API Key (should already be set)
PI_SERVER_API_KEY=your_actual_pi_server_api_key_here
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to the "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. Add the variables above
6. Make sure to set them for the "Production" environment
7. Redeploy your application

## Generate Secure Tokens

You can generate secure tokens using Node.js:

```bash
# Generate CRON_AUTH_TOKEN
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate MARKETING_EMAIL_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online UUID generator.

## Testing the Setup

After deployment, you can manually test the cron endpoints:

```bash
# Set your deployment URL and token
export DEPLOYMENT_URL=https://your-app.vercel.app
export CRON_AUTH_TOKEN=your_token_here

# Run the manual sync script
npm run sync:transactions
```

## Manual Testing via GitHub Actions

You can also trigger the cron jobs manually:

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Click **Cron Jobs** workflow
4. Click **Run workflow** button
5. Select which jobs to run (or run all)

## Monitoring

**GitHub Actions Monitoring:**
1. Go to your GitHub repository
2. Click the **Actions** tab
3. Click on the **Cron Jobs** workflow
4. Check the run history and logs
5. Each job shows detailed logs for API calls

**Vercel Function Logs:**
1. Go to your Vercel dashboard
2. Select your project
3. Go to the "Logs" tab
4. Look for requests to `/api/sync-transactions`, `/api/weekly-marketing`, `/api/monthly-marketing`

The cron job should run every 10 minutes and log its activity.

## Troubleshooting

If the cron job is not working:

1. Check that `CRON_AUTH_TOKEN` is set correctly
2. Verify the cron schedule in `vercel.json`
3. Check Vercel logs for errors
4. Test the endpoint manually with the test script
5. Ensure your Pi Network API key is valid
