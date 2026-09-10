import { sendPurchaseConfirmationEmail, sendAdminPurchaseNotification, getTransporter, sendPaymentFailureNotification } from './email.js';
import { VercelLogger } from './vercel-logger.js';

// Email sending result interface
interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

/**
 * Delay function for retry mechanism
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send purchase confirmation email with retry mechanism
 */
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
        
        VercelLogger.logEmailEvent('PURCHASE_CONFIRMATION_SENT', {
          recipient: params.to,
          transactionId: params.transactionId,
          attempt,
          success: true
        });
        
        return { success: true };
      } else {
        console.log(`❌ Purchase confirmation email failed - Attempt ${attempt}/${maxRetries}`, {
          recipient: params.to,
          transactionId: params.transactionId
        });
        
        VercelLogger.logEmailEvent('PURCHASE_CONFIRMATION_FAILED', {
          recipient: params.to,
          transactionId: params.transactionId,
          attempt,
          error: 'Email service returned false'
        });
      }
    } catch (error: any) {
      console.error(`❌ Purchase confirmation email error - Attempt ${attempt}/${maxRetries}:`, {
        recipient: params.to,
        transactionId: params.transactionId,
        error: error.message,
        stack: error.stack
      });
      
      VercelLogger.logEmailEvent('PURCHASE_CONFIRMATION_ERROR', {
        recipient: params.to,
        transactionId: params.transactionId,
        attempt,
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
  
  VercelLogger.logEmailEvent('PURCHASE_CONFIRMATION_ALL_ATTEMPTS_FAILED', {
    recipient: params.to,
    transactionId: params.transactionId,
    maxRetries
  });

  return { 
    success: false, 
    error: `Failed to send email after ${maxRetries} attempts` 
  };
}

/**
 * Send admin purchase notification email with retry mechanism
 */
export async function sendAdminPurchaseNotificationWithRetry(
  params: any,
  maxRetries: number = MAX_RETRIES
): Promise<EmailSendResult> {
  console.log('📧 Attempting to send admin purchase notification email with retry mechanism', {
    recipient: params.adminEmail,
    transactionId: params.transactionId,
    maxRetries
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Sending admin purchase notification email - Attempt ${attempt}/${maxRetries}`, {
        recipient: params.adminEmail,
        transactionId: params.transactionId
      });

      const result = await sendAdminPurchaseNotification(params);
      
      if (result) {
        console.log('✅ Admin purchase notification email sent successfully', {
          recipient: params.adminEmail,
          transactionId: params.transactionId,
          attempt
        });
        
        VercelLogger.logEmailEvent('ADMIN_PURCHASE_NOTIFICATION_SENT', {
          recipient: params.adminEmail,
          transactionId: params.transactionId,
          attempt,
          success: true
        });
        
        return { success: true };
      } else {
        console.log(`❌ Admin purchase notification email failed - Attempt ${attempt}/${maxRetries}`, {
          recipient: params.adminEmail,
          transactionId: params.transactionId
        });
        
        VercelLogger.logEmailEvent('ADMIN_PURCHASE_NOTIFICATION_FAILED', {
          recipient: params.adminEmail,
          transactionId: params.transactionId,
          attempt,
          error: 'Email service returned false'
        });
      }
    } catch (error: any) {
      console.error(`❌ Admin purchase notification email error - Attempt ${attempt}/${maxRetries}:`, {
        recipient: params.adminEmail,
        transactionId: params.transactionId,
        error: error.message,
        stack: error.stack
      });
      
      VercelLogger.logEmailEvent('ADMIN_PURCHASE_NOTIFICATION_ERROR', {
        recipient: params.adminEmail,
        transactionId: params.transactionId,
        attempt,
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

  console.log('❌ All attempts to send admin purchase notification email failed', {
    recipient: params.adminEmail,
    transactionId: params.transactionId,
    maxRetries
  });
  
  VercelLogger.logEmailEvent('ADMIN_PURCHASE_NOTIFICATION_ALL_ATTEMPTS_FAILED', {
    recipient: params.adminEmail,
    transactionId: params.transactionId,
    maxRetries
  });

  return { 
    success: false, 
    error: `Failed to send email after ${maxRetries} attempts` 
  };
}

/**
 * Send all transaction emails (user confirmation + admin notifications) with robust error handling
 */
export function getDefaultAdminEmails(): string[] {
  const DEFAULT_ADMIN = 'info@b4uesports.com';
  const candidates = [process.env.ADMIN_EMAIL, process.env.SMTP_USER, process.env.SMTP_FROM, DEFAULT_ADMIN];
  return Array.from(new Set(candidates
    .filter(Boolean)
    .map(email => String(email).trim().toLowerCase())
    .filter(email => email.length > 0)
  ));
}

async function getAdminEmailsFromDb(client: any): Promise<string[]> {
  try {
    const result = await client.query(
      'SELECT email FROM app_admins WHERE is_active = true AND email IS NOT NULL'
    );

    return Array.from(new Set(result.rows
      .map((row: any) => String(row.email || '').trim().toLowerCase())
      .filter((email: string) => email.length > 0)
    ));
  } catch (error: any) {
    console.error('❌ Failed to load admin emails from database:', error);
    VercelLogger.logEmailEvent('LOAD_ADMIN_EMAILS_FAILED', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

export async function sendTransactionEmails(
  transaction: any,
  client: any,
  status?: string // Add status parameter
): Promise<boolean> {
  const normalizedStatus = (status || transaction?.status || '').toString().trim().toLowerCase();

  console.log('📧 Sending all transaction emails', {
    transactionId: transaction.id,
    userEmail: transaction.user_email,
    packageName: transaction.package_name,
    status: normalizedStatus || 'unknown'
  });

  try {
    // Check if we have the required user data
    if (!transaction.user_email) {
      console.log('❌ Skipping email sending - missing required data', {
        hasUserEmail: !!transaction.user_email,
        transactionId: transaction.id
      });
      
      VercelLogger.logEmailEvent('EMAIL_SENDING_SKIPPED', {
        reason: 'Missing required data',
        hasUserEmail: !!transaction.user_email,
        transactionId: transaction.id
      });
      
      return false;
    }

    const packageName = transaction.package_name || 'Unknown Package';
    const packageGame = transaction.package_game || 'Unknown';

    // Extract game account information
    let gameAccountString = 'Not provided';
    if (transaction.game_account) {
      try {
        const gameAccount = typeof transaction.game_account === 'string' 
          ? JSON.parse(transaction.game_account) 
          : transaction.game_account;
        
        if (gameAccount.uid && gameAccount.ign) {
          gameAccountString = `UID: ${gameAccount.uid}, IGN: ${gameAccount.ign}`;
        } else if (gameAccount.ign) {
          gameAccountString = gameAccount.ign;
        } else if (gameAccount.link) {
          // Handle TikTok, YouTube, Facebook, Instagram links
          gameAccountString = gameAccount.link;
        } else if (gameAccount.playerId) {
          // Handle Free Fire Player ID
          gameAccountString = `Player ID: ${gameAccount.playerId}`;
        } else if (gameAccount.email && gameAccount.whatsapp) {
          // Handle services that need email + WhatsApp (Netflix, Canva, ROBUX, NEWSTATE, PUBGKR)
          gameAccountString = `${gameAccount.email}`;
        } else if (gameAccount.email) {
          // Handle COC and other email-based services
          gameAccountString = gameAccount.email;
        } else if (gameAccount.userId && gameAccount.zoneId) {
          // Handle MLBB
          gameAccountString = `User ID: ${gameAccount.userId}, Zone ID: ${gameAccount.zoneId}`;
        } else {
          gameAccountString = JSON.stringify(gameAccount);
        }
      } catch (parseError) {
        gameAccountString = String(transaction.game_account);
      }
    }

    console.log('📧 Attempting to send appropriate email to user based on transaction status', {
      recipient: transaction.user_email,
      transactionId: transaction.id,
      status: status
    });

    // Verify SMTP connection before sending any emails
    const transporter = getTransporter();
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully!");
    } catch (err) {
      console.error("❌ SMTP verification failed (but will still attempt to send emails):", err);
      VercelLogger.logEmailEvent('SMTP_VERIFICATION_FAILED', {
        transactionId: transaction.id,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      // Do NOT return/throw here - some SMTP servers reject verify() but accept sendMail()
    }

    // Send appropriate email based on transaction status
    let userResult: { success: boolean };
    if (normalizedStatus === 'completed') {
      // For completed transactions, send purchase confirmation
      userResult = await sendPurchaseConfirmationEmailWithRetry({
        to: transaction.user_email,
        username: transaction.user_username,
        packageName,
        piAmount: transaction.pi_amount,
        usdAmount: transaction.usd_amount,
        gameAccount: gameAccountString,
        transactionId: transaction.id,
        paymentId: transaction.payment_id,
        isTestnet: false,
        gameAccounts: transaction.user_game_accounts,
        socialAccounts: transaction.user_social_accounts,
        game: packageGame // Pass game type for correct logo
      });
    } else if (normalizedStatus === 'failed' || normalizedStatus === 'cancelled') {
      // For failed or cancelled transactions, send payment failure notification
      userResult = {
        success: await sendPaymentFailureNotification({
          to: transaction.user_email,
          username: transaction.user_username,
          packageName,
          piAmount: transaction.pi_amount,
          failureReason: transaction.failure_reason || (status === 'cancelled' ? 'Payment cancelled' : 'Payment failed'),
          transactionId: transaction.id,
          paymentId: transaction.payment_id,
          isCancelled: status === 'cancelled',
          gameAccounts: transaction.user_game_accounts,
          socialAccounts: transaction.user_social_accounts,
          game: packageGame // Pass game type for correct logo
        })
      };
    } else {
      // For unknown status, fallback to purchase confirmation
      console.log('⚠️ Unknown transaction status, sending purchase confirmation as fallback', {
        status: status,
        transactionId: transaction.id
      });
      
      userResult = await sendPurchaseConfirmationEmailWithRetry({
        to: transaction.user_email,
        username: transaction.user_username,
        packageName,
        piAmount: transaction.pi_amount,
        usdAmount: transaction.usd_amount,
        gameAccount: gameAccountString,
        transactionId: transaction.id,
        paymentId: transaction.payment_id,
        isTestnet: false,
        gameAccounts: transaction.user_game_accounts,
        socialAccounts: transaction.user_social_accounts,
        game: packageGame // Pass game type for correct logo
      });
    }

    if (!userResult.success) {
      console.log(`❌ Failed to send ${status || 'transaction'} email to user`, {
        recipient: transaction.user_email,
        transactionId: transaction.id,
        status: status
      });
      
      VercelLogger.logEmailEvent('USER_EMAIL_SENDING_FAILED', {
        recipient: transaction.user_email,
        transactionId: transaction.id,
        status: status,
        error: 'Email service returned false'
      });
      
      // Don't fail the entire process if user email fails, but log it
    } else {
      const statusDisplay = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Transaction';
      console.log(`✅ ${statusDisplay} email sent successfully to user`, {
        recipient: transaction.user_email,
        transactionId: transaction.id
      });
    }

    // Admin notifications are now handled via BCC on user purchase confirmation email by default
    // and also sent directly to admin inboxes for real-time confirmation.
    if (normalizedStatus === 'completed') {
      const dbAdminEmails = await getAdminEmailsFromDb(client);
      const adminEmails = dbAdminEmails.length > 0 ? dbAdminEmails : getDefaultAdminEmails();

      console.log('📧 Admin notifications will be sent using database admin emails or environment fallbacks', {
        transactionId: transaction.id,
        adminEmails
      });
      
      VercelLogger.logEmailEvent('ADMIN_NOTIFIED_VIA_BCC_OR_DB', {
        transactionId: transaction.id,
        userEmail: transaction.user_email,
        adminEmails,
        source: dbAdminEmails.length > 0 ? 'database' : 'fallback'
      });

      if (adminEmails.length > 0) {
        const adminNotificationResults = await Promise.all(adminEmails.map(async (adminEmail) => {
          try {
            const result = await sendAdminPurchaseNotificationWithRetry({
              adminEmail,
              username: transaction.user_username,
              userEmail: transaction.user_email,
              userPhone: transaction.user_phone || 'Not provided',
              packageName,
              game: packageGame,
              inGameAmount: transaction.package_in_game_amount,
              piAmount: transaction.pi_amount,
              usdAmount: transaction.usd_amount,
              gameAccount: gameAccountString,
              transactionId: transaction.id,
              paymentId: transaction.payment_id,
              txid: transaction.txid
            });

            return { adminEmail, success: result.success };
          } catch (error: any) {
            console.error('❌ Direct admin notification error for', adminEmail, error?.message || error);
            return { adminEmail, success: false, error: error?.message || String(error) };
          }
        }));

        const adminSuccessCount = adminNotificationResults.filter(result => result.success).length;
        console.log(`📧 Direct admin notifications sent to ${adminSuccessCount}/${adminEmails.length} admin emails`, {
          transactionId: transaction.id,
          adminEmails
        });

        VercelLogger.logEmailEvent('DIRECT_ADMIN_NOTIFICATION_RESULT', {
          transactionId: transaction.id,
          adminSuccessCount,
          totalAdminEmails: adminEmails.length
        });

        // Mark admin_email_sent = true if at least one admin email was sent successfully
        if (adminSuccessCount > 0) {
          try {
            await client.query(
              'UPDATE app_transactions SET admin_email_sent = true, updated_at = NOW() WHERE id = $1',
              [transaction.id]
            );
            console.log('✅ Transaction updated: admin_email_sent = true', { transactionId: transaction.id });
          } catch (updateErr) {
            console.error('❌ Failed to update admin_email_sent flag:', updateErr);
          }
        }
      } else {
        console.log('⚠️ No admin emails configured for direct admin notifications', {
          transactionId: transaction.id
        });
      }
    } else {
      console.log('📧 Skipping admin notification emails for non-completed transaction', {
        status: status,
        transactionId: transaction.id
      });
      
      VercelLogger.logEmailEvent('ADMIN_EMAIL_SKIPPED', {
        reason: 'Non-completed transaction',
        status: status,
        transactionId: transaction.id
      });
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
        
        VercelLogger.logEmailEvent('TRANSACTION_EMAIL_STATUS_UPDATED', {
          transactionId: transaction.id,
          emailSent: true
        });
        
        return true;
      } catch (updateError) {
        console.error('❌ Failed to update transaction email status', updateError);
        
        VercelLogger.logEmailEvent('TRANSACTION_EMAIL_STATUS_UPDATE_FAILED', {
          transactionId: transaction.id,
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
        
        // Don't fail the transaction if we can't update the email status
        return userResult.success; // Return true if user email was sent, even if we couldn't update DB
      }
    } else {
      console.log('📧 Not updating transaction email status - user email was not sent successfully', {
        transactionId: transaction.id
      });
      
      return false;
    }
    
  } catch (emailError) {
    console.error('❌ Transaction email sending failed', emailError);
    
    VercelLogger.logEmailEvent('TRANSACTION_EMAIL_SENDING_FAILED', {
      transactionId: transaction.id,
      error: emailError instanceof Error ? emailError.message : 'Unknown error'
    });
    
    return false;
  }
}

/**
 * Send purchase reward notification email
 * TODO: Implement dedicated reward email template
 */
export async function sendPurchaseRewardEmail(params: {
  to: string;
  username: string;
  tokensAwarded: number;
  milestone: number;
  totalPurchases: number;
  transactionId: string;
}): Promise<boolean> {
  try {
    console.log('🎁 Purchase reward notification (email implementation pending):', {
      recipient: params.to,
      tokensAwarded: params.tokensAwarded,
      milestone: params.milestone,
      username: params.username
    });
    
    // TODO: Implement proper reward email with custom template
    // For now, just log the notification
    VercelLogger.logEmailEvent('PURCHASE_REWARD_PENDING', {
      recipient: params.to,
      tokensAwarded: params.tokensAwarded,
      milestone: params.milestone,
      transactionId: params.transactionId
    });
    
    return true; // Return true to indicate processing succeeded (email will be implemented later)
  } catch (error: any) {
    console.error('❌ Purchase reward email error:', error.message);
    VercelLogger.logEmailEvent('PURCHASE_REWARD_ERROR', {
      recipient: params.to,
      tokensAwarded: params.tokensAwarded,
      milestone: params.milestone,
      transactionId: params.transactionId,
      error: error.message
    });
    return false;
  }
}
