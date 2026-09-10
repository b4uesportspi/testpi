# 📧 Vercel Email Debugging & Monitoring Guide

This guide provides comprehensive instructions for debugging and monitoring email functionality in your Vercel production environment.

## 🛠️ Available Debugging Endpoints

### 1. Email Configuration Check
```
GET /api/check-email-config
```
Verifies all SMTP environment variables are properly set in Vercel.

### 2. Full Email Debug Test
```
GET /api/debug-email?token=YOUR_DEBUG_TOKEN
```
Runs a complete email test including SMTP connection and email sending.

### 3. Email Tracking Test
```
GET /api/test-email-tracking
```
Sends a test email using the enhanced tracking service.

### 4. Email Status Dashboard
```
GET /api/email-status
```
Shows recent email activities and logs.

## 🔧 Setup Instructions

### 1. Set Debug Token (Optional but Recommended)
Add a `DEBUG_TOKEN` environment variable in your Vercel project settings for security:
```
DEBUG_TOKEN=your-secret-token-here
```

### 2. Verify Environment Variables
Ensure these environment variables are set in Vercel:
- `SMTP_HOST` (e.g., smtp.hostinger.com)
- `SMTP_PORT` (e.g., 465 or 587)
- `SMTP_USER` (e.g., info@b4uesports.com)
- `SMTP_PASS` (your SMTP password)
- `SMTP_FROM` (e.g., info@b4uesports.com)
- `SMTP_FROM_NAME` (e.g., B4U Esports)

## 📋 Step-by-Step Debugging Process

### Step 1: Check Configuration
Visit `/api/check-email-config` to verify all environment variables are set correctly.

**What to look for:**
- ✅ All required variables present
- ✅ Correct port/secure settings
- ✅ No missing configuration

### Step 2: Test SMTP Connection
Visit `/api/debug-email?token=YOUR_DEBUG_TOKEN` to test the complete email flow.

**What to look for:**
- ✅ SMTP connection verification
- ✅ Test email sent successfully
- ✅ Message accepted by SMTP server

### Step 3: Monitor Logs in Vercel Dashboard
1. Go to your Vercel project dashboard
2. Navigate to the "Logs" tab
3. Look for structured logs with these prefixes:
   - `📧 EMAIL_ATTEMPT_*`
   - `✅ EMAIL_SENT_*`
   - `❌ EMAIL_ERROR_*`

### Step 4: Check Email Status
Visit `/api/email-status` to see recent email activities.

## 🔍 Troubleshooting Common Issues

### 1. Authentication Errors (EAUTH)
**Log pattern:**
```
EMAIL_ERROR_* {
  "error": {
    "code": "EAUTH",
    "message": "Invalid login"
  }
}
```

**Solutions:**
- Verify `SMTP_USER` and `SMTP_PASS` in Vercel environment variables
- Check if password contains special characters that need escaping
- Confirm credentials work in an email client

### 2. Connection Refused (ECONNREFUSED)
**Log pattern:**
```
EMAIL_ERROR_* {
  "error": {
    "code": "ECONNREFUSED"
  }
}
```

**Solutions:**
- Verify `SMTP_HOST` and `SMTP_PORT` are correct
- Check if the port is blocked by a firewall
- Confirm Hostinger SMTP service is operational

### 3. Connection Timeout (ETIMEDOUT)
**Log pattern:**
```
EMAIL_ERROR_* {
  "error": {
    "code": "ETIMEDOUT"
  }
}
```

**Solutions:**
- Check network connectivity from Vercel to SMTP server
- Verify Vercel region compatibility with SMTP provider
- Contact Hostinger support about connectivity issues

### 4. Emails Not Received (Delivery Issues)
If logs show emails sent successfully but users don't receive them:

**Solutions:**
- Check spam/junk folders
- Verify SPF/DKIM/DMARC DNS records
- Test with different email providers (Gmail, Outlook)
- Check Hostinger SMTP logs for delivery status

## 📊 Monitoring Best Practices

### 1. Regular Configuration Checks
- Run `/api/check-email-config` periodically
- Set up alerts for configuration issues

### 2. Log Analysis
- Monitor Vercel logs for error patterns
- Set up log alerts for email failures
- Track email success/failure rates

### 3. Test Coverage
- Use `/api/test-email-tracking` after deployments
- Test all email types (purchase, profile, admin notifications)

## 🚨 Emergency Response

If email functionality breaks in production:

1. **Immediate Check**: Visit `/api/check-email-config`
2. **Connection Test**: Visit `/api/debug-email?token=YOUR_DEBUG_TOKEN`
3. **Review Logs**: Check Vercel dashboard for error patterns
4. **Verify Credentials**: Confirm SMTP credentials in Vercel settings
5. **Contact Support**: Reach out to Hostinger for SMTP service issues

## 📈 Performance Monitoring

### Key Metrics to Track:
- Email sending success rate
- Average time to send emails
- Error frequency and types
- Delivery confirmation (if available)

### Log Patterns to Monitor:
```
# Success rate
✅ EMAIL_SENT_*

# Error rate
❌ EMAIL_ERROR_*

# Performance
Sending purchase confirmation email to: *
✅ Purchase confirmation email sent successfully to: *
```

## 🛡️ Security Considerations

1. **Protect Debug Endpoints**: Use `DEBUG_TOKEN` for `/api/debug-email`
2. **Hide Sensitive Data**: Environment variable values are not exposed in logs
3. **Limit Access**: Only authorized team members should access debug endpoints
4. **Monitor Usage**: Track access to debug endpoints in Vercel logs

## 📞 Support Resources

- **Vercel Support**: https://vercel.com/support
- **Hostinger SMTP**: Check Hostinger control panel for SMTP service status
- **DNS Records**: Verify SPF/DKIM/DMARC with your DNS provider

## 🔄 Regular Maintenance

1. **Weekly**: Check `/api/check-email-config`
2. **Monthly**: Run `/api/debug-email` to verify functionality
3. **After Deployments**: Test with `/api/test-email-tracking`
4. **Quarterly**: Review email logs for patterns and improvements