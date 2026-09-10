# 📧 Vercel Email Monitoring Guide

This guide explains how to monitor email sending and troubleshoot issues in your Vercel production environment.

## 🛠️ Monitoring Tools

### 1. Email Tracking Service (`monitor-emails.ts`)
Enhanced email functions that provide detailed logging for Vercel runtime logs:
- Tracks email attempts, successes, and failures
- Provides structured logging with timestamps
- Captures error details for troubleshooting

### 2. Test Endpoint (`/api/test-email-tracking`)
Endpoint to verify email tracking is working:
```
GET /api/test-email-tracking
```

### 3. Status Endpoint (`/api/email-status`)
Endpoint to view recent email activities:
```
GET /api/email-status
```

## 📋 How to Monitor Emails in Vercel

### 1. **Vercel Dashboard Logs**
1. Go to your Vercel project dashboard
2. Navigate to the "Logs" tab
3. Filter by time range or search for:
   - `📧` (email emoji)
   - `✅` (success emoji)
   - `❌` (error emoji)
   - `EMAIL_SENT`
   - `EMAIL_ERROR`
   - `Sending purchase`
   - `SMTP`

### 2. **Structured Log Format**
All email events are logged in a structured format:
```
📧 [2023-10-22T10:30:45.123Z] EMAIL_ATTEMPT_PURCHASE_CONFIRMATION {
  "recipient": "user@example.com",
  "timestamp": "2023-10-22T10:30:45.123Z"
}
```

### 3. **Error Tracking**
Email errors are logged with full details:
```
📧 [2023-10-22T10:30:46.456Z] EMAIL_ERROR_PURCHASE_CONFIRMATION {
  "recipient": "user@example.com",
  "error": {
    "message": "Authentication failed",
    "code": "EAUTH"
  },
  "timestamp": "2023-10-22T10:30:46.456Z"
}
```

## 🔍 Troubleshooting Common Issues

### 1. **Emails Not Showing in Logs**
- Check if the email functions are being called
- Verify the monitoring service is imported correctly
- Ensure Vercel environment variables are set

### 2. **Authentication Errors**
Look for logs with:
```
EMAIL_ERROR_* {
  "error": {
    "code": "EAUTH"
  }
}
```
Solution: Check SMTP credentials in Vercel environment variables

### 3. **Connection Issues**
Look for logs with:
```
EMAIL_ERROR_* {
  "error": {
    "code": "ECONNREFUSED"
  }
}
```
Solution: Verify SMTP host and port settings

### 4. **Delivery Issues**
If emails show as sent but users don't receive them:
- Check spam/junk folders
- Verify SPF/DKIM/DMARC DNS records
- Test with different email providers

## 🧪 Testing Email Monitoring

### 1. **Manual Test**
Visit your test endpoint:
```
GET https://your-domain.vercel.app/api/test-email-tracking
```

### 2. **Check Results**
View the status endpoint:
```
GET https://your-domain.vercel.app/api/email-status
```

## 📊 Log Examples

### Successful Email
```
📧 [2023-10-22T10:30:47.789Z] EMAIL_SENT_PURCHASE_CONFIRMATION {
  "recipient": "user@example.com",
  "messageId": "<123456789@example.com>",
  "timestamp": "2023-10-22T10:30:47.789Z"
}
```

### Failed Email
```
📧 [2023-10-22T10:30:48.012Z] EMAIL_ERROR_PROFILE_UPDATE {
  "recipient": "user@example.com",
  "error": {
    "message": "Invalid login: 535 5.7.8 Authentication failed",
    "code": "EAUTH",
    "stack": "Error: Invalid login..."
  },
  "timestamp": "2023-10-22T10:30:48.012Z"
}
```

## 🚨 Emergency Troubleshooting

If emails stop working:

1. **Check Vercel Logs** for error patterns
2. **Test with endpoint**: `/api/test-email-tracking`
3. **Verify environment variables** in Vercel dashboard
4. **Check Hostinger SMTP status**
5. **Review recent deployments** for breaking changes

## 📞 Support

For persistent issues:
1. Check Vercel logs for specific error codes
2. Verify SMTP credentials haven't changed
3. Contact Hostinger support for SMTP service issues
4. Review DNS records for email deliverability