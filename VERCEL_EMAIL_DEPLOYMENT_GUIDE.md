# Vercel Email Deployment Guide

This guide provides step-by-step instructions to ensure emails are properly sent when users update their profiles in production on Vercel.

## Issues Identified

Users are not receiving emails when they update their profiles, even after completing all required fields (email and phone). This is likely due to SMTP setup, environment variables, or function execution in Vercel.

## Step-by-Step Solution

### 1️⃣ Verify Vercel Environment Variables

Make sure all SMTP credentials are correctly set in Vercel Dashboard → Settings → Environment Variables:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@b4uesports.com
SMTP_PASS=your_actual_password
SMTP_FROM=info@b4uesports.com
SMTP_FROM_NAME=B4U Esports
```

**Important Notes:**
- Variable names must match exactly what your code uses (`process.env.SMTP_HOST`, etc.)
- After setting them, **redeploy** the project — changes don't take effect until redeploy

### 2️⃣ Ensure "from" email matches SMTP account

Hostinger usually blocks emails from different "from" addresses. Example:

```javascript
from: '"B4U Esports" <info@b4uesports.com>'
```

The email address here must match the `SMTP_USER`.

In the current implementation, this is already handled correctly:
```typescript
const mailOptions = {
  from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
  // ... other options
};
```

### 3️⃣ Wrap sendMail in try/catch and log errors

On Vercel, unhandled errors can cause emails to silently fail. The current implementation already has proper error handling:

```typescript
try {
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Profile update email sent successfully to:', params.to);
  console.log('Message ID:', info.messageId);
  return true;
} catch (error: any) {
  console.error('❌ Hostinger SMTP profile update email error:', error);
  return false;
}
```

### 4️⃣ Check conditional logic

Make sure emails are actually being triggered. In the profile update route, emails are sent when:

```typescript
// Send profile update email notification if profile is verified
if (updatedUser.isProfileVerified && updatedUser.email) {
  // ... send email
}
```

Profile is verified when both email and phone are provided (not empty strings):
```typescript
const shouldMarkAsVerified = updatedUser.email && updatedUser.phone && 
                             updatedUser.email.trim() !== '' && updatedUser.phone.trim() !== '';
```

### 5️⃣ Test production sending

1. Deploy to Vercel with proper env variables
2. Trigger a profile update for a test user
3. Check Vercel logs — look for "Email sent" or any error messages
4. Check Spam folder just in case, though SPF/DKIM should prevent it

## Debugging in Production

To debug email issues in production, check the Vercel logs for:

1. **Environment variable warnings:**
   ```
   ⚠️  Missing SMTP environment variables: [...]
   ```

2. **SMTP transporter verification:**
   ```
   ✅ SMTP transporter is ready to send emails
   ```
   or
   ```
   ❌ SMTP transporter verification failed: [...]
   ```

3. **Email sending attempts:**
   ```
   Sending profile update email to: user@example.com
   ✅ Profile update email sent successfully to: user@example.com
   Message ID: <...>
   ```

4. **Email sending failures:**
   ```
   ❌ Hostinger SMTP profile update email error: [...]
   ```

## Testing SMTP Configuration

You can test the SMTP configuration locally by running:

```bash
npm run test:smtp-config
```

This will verify:
- All required environment variables are present
- SMTP transporter can be created
- A test email can be sent

## Common Issues and Solutions

### Issue: Emails not sent despite correct configuration
**Solution:** Check that both email and phone fields are provided and not empty strings when updating the profile.

### Issue: "From" email doesn't match SMTP user
**Solution:** Ensure `SMTP_FROM` environment variable matches `SMTP_USER`.

### Issue: Environment variables not loaded
**Solution:** Verify environment variables are set in Vercel Dashboard and redeploy the application.

### Issue: Silent failures in production
**Solution:** Check Vercel logs for error messages and ensure proper try/catch blocks are used.

## Best Practices

1. **Always redeploy** after changing environment variables in Vercel
2. **Match "from" email** with SMTP user account
3. **Use proper error handling** with detailed logging
4. **Verify profile verification logic** requires both email and phone
5. **Test in production** with actual user scenarios
6. **Monitor Vercel logs** for email sending status

## Verification Checklist

Before deploying to production:

- [ ] All SMTP environment variables are set in Vercel
- [ ] `SMTP_FROM` matches `SMTP_USER`
- [ ] Profile verification requires both email and phone
- [ ] Email sending functions have proper error handling
- [ ] Test email can be sent locally
- [ ] Application deploys successfully to Vercel

After deployment:

- [ ] Trigger a profile update with email and phone
- [ ] Check Vercel logs for email sending confirmation
- [ ] Verify email arrives in inbox (check spam folder)
- [ ] Test with multiple email providers (Gmail, Outlook, etc.)

By following this guide, you should be able to resolve the email delivery issues and ensure users receive profile update notifications in production.