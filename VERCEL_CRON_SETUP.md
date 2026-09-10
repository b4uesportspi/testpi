# Setting up Vercel Cron Jobs for Transaction Sync

## Issue
The application is not sending email notifications for failed or cancelled payments in production because the sync transaction statuses task is not running on Vercel.

## Root Cause
Vercel is a serverless platform that doesn't support long-running processes like `setInterval`. The existing sync task in [server/tasks/sync-transactions.ts](file://c:\b4uesports\server\tasks\sync-transactions.ts) only runs in non-Vercel environments.

## Solution
Create a dedicated Vercel Function that can be used as a cron job target.

## Implementation

### 1. Dedicated Cron Endpoint
A new endpoint has been created at `/api/cron/sync-transactions` in [api/cron/sync-transactions.ts](file://c:\b4uesports\api\cron\sync-transactions.ts).

### 2. Security
The endpoint is secured with an authorization header. Set the `CRON_AUTH_TOKEN` environment variable in Vercel:

```bash
CRON_AUTH_TOKEN=your_secure_token_here
```

### 3. Vercel Cron Configuration
To set up the cron job, add the following to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "*/10 * * * *" 
    }
  ]
}
```

This will run the sync task every 10 minutes.

### 4. Manual Testing
You can manually trigger the sync by making a POST request:

```bash
curl -X POST https://your-domain.vercel.app/api/cron/sync-transactions \
  -H "Authorization: Bearer your_secure_token_here" \
  -H "Content-Type: application/json"
```

## How It Works
1. Every 10 minutes, Vercel triggers the cron job
2. The cron function fetches all pending transactions from the database
3. For each transaction, it checks the status with Pi Network
4. If a transaction is failed or cancelled, it:
   - Updates the database with the correct status
   - Sends email notifications to users
   - Logs the activity for debugging

## Benefits
- Users receive immediate notifications for failed or cancelled payments
- Admins can track transaction statuses accurately
- System maintains data consistency with Pi Network
- No manual intervention required