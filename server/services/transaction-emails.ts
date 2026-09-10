import { VercelLogger } from './vercel-logger.js';
import { getTransporter } from './email.js';

/**
 * Send emails for all transaction statuses (completed, failed, cancelled)
 * This service ensures emails are sent regardless of transaction status
 */
export async function sendTransactionStatusEmails(transaction: any, client: any, status: string) {
  // Log the entire transaction object for debugging
  console.log('📧 Transaction email processing started', { 
    transactionId: transaction.id, 
    status,
    transactionData: {
      id: transaction.id,
      user_email: transaction.user_email,
      package_name: transaction.package_name,
      user_username: transaction.user_username,
      pi_amount: transaction.pi_amount,
      usd_amount: transaction.usd_amount,
      game_account: transaction.game_account,
      payment_id: transaction.payment_id,
      txid: transaction.txid
    }
  });
  
  // Validate required fields before proceeding
  if (!transaction.user_email || !transaction.package_name) {
    console.warn('⚠️ Missing required transaction data for email', {
      transactionId: transaction.id,
      hasUserEmail: !!transaction.user_email,
      hasPackageName: !!transaction.package_name
    });
    
    VercelLogger.logEmailEvent('EMAIL_SENDING_SKIPPED', {
      reason: 'Missing required data',
      hasUserEmail: !!transaction.user_email,
      hasPackageName: !!transaction.package_name,
      transactionId: transaction.id,
      status
    });
    
    return false;
  }
  
  try {
    // Verify SMTP connection before sending any emails
    const transporter = getTransporter();
    try {
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully!");
    } catch (err) {
      console.error("❌ SMTP verification failed:", err);
      VercelLogger.logEmailEvent('SMTP_VERIFICATION_FAILED', {
        transactionId: transaction.id,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
    
    // Load the robust email service
    const { sendPurchaseConfirmationEmailWithRetry, sendAdminPurchaseNotificationWithRetry } = await import('./email-robust.js');
    
    console.log('📧 Sending transaction emails with robust service', { 
      transactionId: transaction.id, 
      status 
    });
    
    // Import the updated sendTransactionEmails function with status parameter
    const { sendTransactionEmails } = await import('./email-robust.js');
    
    // Send emails using the updated function that only sends admin emails for completed transactions
    const emailResult = await sendTransactionEmails(transaction, client, status);
    
    console.log('✅ Transaction status emails processed', { 
      transactionId: transaction.id, 
      status,
      success: emailResult
    });
    
    VercelLogger.logEmailEvent('TRANSACTION_STATUS_EMAILS_SENT', {
      transactionId: transaction.id,
      status,
      success: emailResult
    });
    
    return emailResult;
    
  } catch (error) {
    console.error('❌ Error sending transaction status emails:', error);
    
    VercelLogger.logEmailEvent('TRANSACTION_STATUS_EMAILS_ERROR', {
      transactionId: transaction.id,
      status,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return false;
  }
}
