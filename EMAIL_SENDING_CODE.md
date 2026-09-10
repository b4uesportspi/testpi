# Email Sending Code Implementation

## Overview
This document contains the actual code that sends emails in your application. The system uses a layered approach with retry mechanisms and robust error handling.

## Core Email Sending Function

The main function that orchestrates email sending is in `server/services/email-robust.ts`:

```typescript
export async function sendTransactionEmails(
  transaction: any,
  client: any
): Promise<boolean> {
  console.log('📧 Sending all transaction emails', {
    transactionId: transaction.id,
    userEmail: transaction.user_email,
    packageName: transaction.package_name
  });

  try {
    // Check if we have the required data
    if (!transaction.user_email || !transaction.package_name) {
      console.log('❌ Skipping email sending - missing required data', {
        hasUserEmail: !!transaction.user_email,
        hasPackageName: !!transaction.package_name,
        transactionId: transaction.id
      });
      
      VercelLogger.logEmailEvent('EMAIL_SENDING_SKIPPED', {
        reason: 'Missing required data',
        hasUserEmail: !!transaction.user_email,
        hasPackageName: !!transaction.package_name,
        transactionId: transaction.id
      });
      
      return false;
    }

    // Convert gameAccount object to string for email
    const gameAccountString = typeof transaction.game_account === 'string' 
      ? transaction.game_account 
      : JSON.stringify(transaction.game_account);

    // Send email to user with retry mechanism
    console.log('📧 Sending purchase confirmation email to user', {
      recipient: transaction.user_email,
      transactionId: transaction.id
    });

    const userResult = await sendPurchaseConfirmationEmailWithRetry({
      to: transaction.user_email,
      username: transaction.user_username,
      packageName: transaction.package_name,
      piAmount: transaction.pi_amount,
      usdAmount: transaction.usd_amount,
      gameAccount: gameAccountString,
      transactionId: transaction.id,
      paymentId: transaction.payment_id,
      isTestnet: false
    });

    // Send email to admins with retry mechanism
    try {
      console.log('📧 Sending admin purchase notification emails');
      
      // Get all active admins
      const adminsResult = await client.query(
        'SELECT email FROM admins WHERE is_active = true AND email IS NOT NULL'
      );
      
      const admins = adminsResult.rows;
      let adminEmailsSent = 0;
      let adminEmailsFailed = 0;
      
      for (const admin of admins) {
        if (admin.email) {
          const adminResult = await sendAdminPurchaseNotificationWithRetry({
            adminEmail: admin.email,
            username: transaction.user_username,
            userEmail: transaction.user_email,
            userPhone: transaction.user_phone || 'Not provided',
            packageName: transaction.package_name,
            game: transaction.package_game,
            inGameAmount: transaction.package_in_game_amount,
            piAmount: transaction.pi_amount,
            usdAmount: transaction.usd_amount,
            gameAccount: gameAccountString,
            transactionId: transaction.id,
            paymentId: transaction.payment_id,
            txid: transaction.txid
          });
          
          if (adminResult.success) {
            adminEmailsSent++;
          } else {
            adminEmailsFailed++;
          }
        }
      }
      
      console.log(`📧 Admin email sending summary: ${adminEmailsSent} sent, ${adminEmailsFailed} failed out of ${admins.length} admins`);
    } catch (adminEmailError) {
      console.error('❌ Admin notification email sending failed', adminEmailError);
      // Don't fail the transaction if admin email fails
    }

    // Update transaction to mark email as sent (only if user email was sent successfully)
    if (userResult.success) {
      try {
        await client.query(
          'UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1',
          [transaction.id]
        );
        
        console.log('✅ Transaction updated to mark email as sent', {
          transactionId: transaction.id
        });
        
        return true;
      } catch (updateError) {
        // Don't fail the transaction if we can't update the email status
        return userResult.success;
      }
    } else {
      console.log('📧 Not updating transaction email status - user email was not sent successfully', {
        transactionId: transaction.id
      });
      
      return false;
    }
    
  } catch (emailError) {
    console.error('❌ Transaction email sending failed', emailError);
    return false;
  }
}
```

## Email Transport Configuration

The actual email sending is handled by Nodemailer in `server/services/email.ts`:

```typescript
// Create a function to initialize transporter when needed
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }
  
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const isSecure = port === 465; // true for SSL, false for TLS

  console.log('📧 Creating transporter with config:', { 
    host: process.env.SMTP_HOST || 'smtp.hostinger.com', 
    port, 
    isSecure,
    user: process.env.SMTP_USER ? 'SET' : 'NOT SET',
    pass: process.env.SMTP_PASS ? 'SET' : 'NOT SET'
  });

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    secure: isSecure,
    requireTLS: !isSecure, // Enforce TLS if using port 587
    auth: {
      user: process.env.SMTP_USER || 'info@b4uesports.com',
      pass: process.env.SMTP_PASS || 'your-password-here'
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: true,
    debug: true
  });
  
  return transporter;
}
```

## Actual Email Sending Function

The core email sending function in `server/services/email.ts`:

```typescript
export async function sendPurchaseConfirmationEmail(params: PurchaseConfirmationParams): Promise<boolean> {
  console.log("📨 Email send function triggered");
  
  // HTML email template (truncated for brevity)
  const emailHTML = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Confirmation - B4U Esports</title>
    </head>
    <body>
      <!-- Email template content -->
      <!-- Includes transaction details, user info, package info, etc. -->
    </body>
    </html>`;

  try {
    // Define email options
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'B4U Esports'}" <${process.env.SMTP_FROM || 'info@b4uesports.com'}>`,
      to: params.to,
      subject: `Purchase Confirmation - ${params.packageName} - B4U Esports`,
      html: emailHTML,
      headers: {
        'X-Mailer': 'Node.js/Nodemailer',
        'X-Priority': '3',
        'MIME-Version': '1.0',
        'Reply-To': process.env.SMTP_FROM || 'info@b4uesports.com'
      }
    };

    // Get transporter and send email
    const transporter = getTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent to:", params.to);
    return true;
  } catch (error: any) {
    console.error("❌ Email send failed:", error);
    return false;
  }
}
```

## Retry Mechanism

The retry mechanism with exponential backoff in `server/services/email-robust.ts`:

```typescript
// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

export async function sendPurchaseConfirmationEmailWithRetry(
  params: any,
  maxRetries: number = MAX_RETRIES
): Promise<EmailSendResult> {
  console.log('📧 Attempting to send purchase confirmation email with retry mechanism', {
    recipient: params.to,
    transactionId: params.transactionId,
    maxRetries
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Sending purchase confirmation email - Attempt ${attempt}/${maxRetries}`, {
        recipient: params.to,
        transactionId: params.transactionId
      });

      const result = await sendPurchaseConfirmationEmail(params);
      
      if (result) {
        console.log('✅ Purchase confirmation email sent successfully', {
          recipient: params.to,
          transactionId: params.transactionId,
          attempt
        });
        return { success: true };
      } else {
        console.log(`❌ Purchase confirmation email failed - Attempt ${attempt}/${maxRetries}`, {
          recipient: params.to,
          transactionId: params.transactionId
        });
      }
    } catch (error: any) {
      console.error(`❌ Purchase confirmation email error - Attempt ${attempt}/${maxRetries}:`, {
        recipient: params.to,
        transactionId: params.transactionId,
        error: error.message
      });

      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * RETRY_DELAY_BASE; // Exponential backoff
        console.log(`⏳ Waiting ${delayMs}ms before retrying...`);
        await delay(delayMs);
      }
    }
  }

  console.log('❌ All attempts to send purchase confirmation email failed', {
    recipient: params.to,
    transactionId: params.transactionId,
    maxRetries
  });

  return { 
    success: false, 
    error: `Failed to send email after ${maxRetries} attempts` 
  };
}
```

## How It Works

1. **Transaction Processing**: When a transaction status changes, the system calls `sendTransactionStatusEmails()`
2. **Data Validation**: Checks that required data (user email, package name) is present
3. **User Email**: Sends purchase confirmation to the user with retry mechanism
4. **Admin Email**: Sends notification to all active admins with retry mechanism
5. **Database Update**: Updates the transaction record to mark email as sent
6. **Error Handling**: Comprehensive error handling with logging and retry mechanisms

## Key Features

- **Retry Mechanism**: Up to 3 attempts with exponential backoff
- **Robust Error Handling**: Comprehensive error catching and logging
- **Database Integration**: Updates transaction status after successful email sending
- **Admin Notifications**: Sends emails to all active admins for completed transactions
- **User Notifications**: Sends confirmation emails to users for all transaction statuses
- **Logging**: Detailed logging for monitoring and debugging