# Email Logging Verification Guide

This guide explains how to verify that email logging is working correctly in your Vercel production environment.

## Overview

We've implemented comprehensive logging for email operations using our custom `VercelLogger` utility. This guide will help you verify that logs are appearing correctly in the Vercel dashboard.

## Expected Log Messages

When a profile update occurs with email verification (both email and phone provided), you should see these log messages in Vercel:

1. `👤 PROFILE_UPDATE_ATTEMPT` - Profile update initiated
2. `📧 PROFILE_UPDATE_EMAIL_ATTEMPT` - Email sending attempt started
3. Either:
   - `📧 PROFILE_UPDATE_EMAIL_SENT` - Email sent successfully
   - `❌ PROFILE_UPDATE_EMAIL_FAILED` - Email sending failed

## Debug Logs Added

We've also added direct console logs to help with debugging:

1. `DEBUG: About to send profile update email for user: [userId]` - Appears just before email sending
2. `DEBUG: Profile update email sent successfully to: [email]` - Appears on successful send
3. `DEBUG: Profile update email failed for: [email] Error: [message]` - Appears on failure

## How to Test in Production

### Method 1: Trigger a Real Profile Update

1. Log in to your application
2. Go to the profile update page
3. Make sure to provide both email and phone number (required for verification)
4. Submit the form
5. Check Vercel logs for the expected messages

### Method 2: Use the Test Endpoint

We've created a test endpoint to verify email functionality:

```bash
curl -X POST https://your-app.vercel.app/api/test/profile-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser"
  }'
```

This will trigger a profile update email and show the result.

### Method 3: Use the Monitoring Endpoint

Check if the logging system is working:

```bash
curl https://your-app.vercel.app/api/monitoring/email-health
```

## What to Look For in Vercel Logs

### In the Vercel Dashboard:

1. Go to your project in the Vercel dashboard
2. Click on the "Logs" tab
3. Filter by deployment or function if needed
4. Look for logs with these prefixes:
   - `📝` for general events
   - `📧` for email events
   - `👤` for profile events
   - `❌` for errors
   - `⚠️` for warnings

### Expected Log Flow:

```
📝 PROFILE_UPDATE_ATTEMPT { userId: "...", updateFields: [...] }
📧 PROFILE_UPDATE_EMAIL_ATTEMPT { userId: "...", recipient: "..." }
📧 PROFILE_UPDATE_EMAIL_SENT { userId: "...", recipient: "..." }
📝 PROFILE_UPDATE_SUCCESS { userId: "..." }
```

Or in case of failure:

```
📝 PROFILE_UPDATE_ATTEMPT { userId: "...", updateFields: [...] }
📧 PROFILE_UPDATE_EMAIL_ATTEMPT { userId: "...", recipient: "..." }
❌ PROFILE_UPDATE_EMAIL_FAILED { error: "...", userId: "...", recipient: "..." }
```

## Troubleshooting

### If You Don't See Any Logs:

1. Check if the profile update endpoint is being called at all
2. Look for the debug message: `DEBUG: About to send profile update email for user: [userId]`
3. If you don't see this, the code path isn't being reached

### If You See the Debug Log But Not Email Logs:

1. Check if `VercelLogger` is imported correctly
2. Verify that the import path is correct: `./services/vercel-logger.js`
3. Check if there are any errors in the function

### If You See Attempt But Not Success/Failure:

1. The email function may be hanging or not returning properly
2. Check if all async operations are properly awaited
3. Look for timeout errors in Vercel

### If You See Failure Logs:

1. Check the error message for clues
2. Verify SMTP configuration in environment variables
3. Check if the email service is working

## Environment Variables to Check

Make sure these environment variables are set correctly in Vercel:

- `SMTP_HOST` - SMTP server address
- `SMTP_PORT` - SMTP port (587 for TLS, 465 for SSL)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - From email address

## Files Modified

1. `server/routes.ts` - Added debug logs and test endpoints
2. `server/services/email.ts` - Enhanced logging in email functions
3. `server/services/vercel-logger.ts` - Core logging utility (unchanged)
4. Test files for verification

## Next Steps

1. Deploy the updated code to production
2. Trigger a profile update with email verification
3. Monitor Vercel logs for the expected messages
4. Use the test endpoints to verify functionality
5. Report any issues with specific log messages

## Contact

If you continue to have issues with email logging, please provide:
1. The specific log messages you do see
2. The log messages you expect but don't see
3. Any error messages in the logs
4. Steps to reproduce the issue