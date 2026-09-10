# 📧 B4U Esports Email Debugging Guide

This guide provides a comprehensive approach to debugging email delivery issues in the B4U Esports application. Follow these 7 steps to verify sending and pinpoint issues.

## 🔧 7-Step Debugging Process

### 1️⃣ Check If Nodemailer Actually Sent the Email

Nodemailer returns a promise with info about the sending result. Always capture and analyze this information:

```javascript
try {
  const info = await transporter.sendMail({
    from: `"B4U Esports" <${process.env.SMTP_USER}>`,
    to: "user@example.com",
    subject: "Test Email",
    text: "Hello, this is a test email.",
    html: "<p>Hello, this is a test email.</p>"
  });

  console.log("✅ Email sent!");
  console.log("Message ID:", info.messageId);
  console.log("Envelope:", info.envelope);
  console.log("Accepted:", info.accepted);
  console.log("Rejected:", info.rejected);

} catch (error) {
  console.error("❌ Email sending failed:", error.message);
}
```

**Key info to look at:**
- `info.accepted` → array of recipients that SMTP accepted
- `info.rejected` → array of recipients SMTP rejected
- `info.response` → SMTP server response (useful for debugging)

### 2️⃣ Check SMTP Connection Before Sending

Always verify the SMTP connection before attempting to send emails:

```javascript
await transporter.verify()
  .then(() => console.log("✅ SMTP connection verified"))
  .catch(err => console.error("❌ SMTP verification failed:", err.message));
```

**Common causes of verification failure:**
- Wrong password
- Wrong port
- Network blocked
- TLS issue

### 3️⃣ Check Spam / Junk Folders

Even if SMTP accepted the message, email providers may mark it as spam if:

- SPF, DKIM, DMARC aren't configured correctly
- The "from" domain is different from authenticated SMTP
- Email contains suspicious links or content

### 4️⃣ Check Hostinger / SMTP Logs

Hostinger provides mail logs in the control panel. Look for `info@b4uesports.com` and check:

- Sent status
- Bounce messages
- Rejected messages

**Common error codes:**
- `550` → recipient rejected (SPF/DKIM problem, mailbox doesn't exist)
- `421` → temporary server error (try again later)
- `535` → authentication failure

### 5️⃣ Use a Test Inbox

For debugging, use a test email account (Gmail, Outlook, ProtonMail) and check:

- If the email arrives in Inbox or Spam
- Any bounce-back or error notifications

### 6️⃣ Enable Debug Logging in Nodemailer

Enable detailed logging to see SMTP commands and responses:

```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { rejectUnauthorized: false },
  logger: true,   // enables console logs
  debug: true     // shows detailed SMTP communication
});
```

### 7️⃣ Steps to Pinpoint Issues

1. Run `transporter.verify()` → if fails, fix SMTP connection first
2. Send test email with `logger: true, debug: true` → check logs
3. Check `info.accepted` vs `info.rejected` → ensure SMTP accepted the user
4. Check your mail server logs → bounces, spam filtering, etc.
5. Test multiple email providers → Gmail, Yahoo, etc.

## 🚀 Using the Debug Script

We've created a dedicated debugging script that implements all 7 steps:

```bash
# Run the debug script
npx ts-node debug-email-delivery.ts
```

The script will:
1. Check environment variables
2. Verify SMTP connection
3. Send a test email with full debugging
4. Analyze results and provide insights

## ✅ Summary

| Result | Meaning | Next Steps |
|--------|---------|------------|
| SMTP accepted it | Nodemailer worked | Check delivery next |
| SMTP rejected it | Config/auth issue | Review credentials and settings |
| SMTP connected but email in Spam | Domain/SPF/DKIM/DMARC issues | Check DNS records |

## 🛠️ Current Configuration

Based on your `.env` file, the current SMTP configuration is:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@b4uesports.com
SMTP_FROM=info@b4uesports.com
SMTP_FROM_NAME=B4U Esports
```

This configuration uses:
- Port 587 (TLS)
- STARTTLS encryption
- Authentication with username/password

## 📞 Support

If you continue to experience issues:

1. Check the SMTP credentials in `.env`
2. Verify the password is properly quoted if it contains special characters
3. Ensure the Hostinger SMTP service is not blocked by firewall
4. Contact Hostinger support for server-side issues