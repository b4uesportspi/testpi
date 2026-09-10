import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as dotenv from 'dotenv';
import { DatabaseStorage } from '../server/storage.js';
import { sendPaymentFailureNotification } from '../server/services/email.js';
import { piNetworkService } from '../server/services/pi-network.js';

// Load environment variables
dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for security
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Check for authorization header to secure the endpoint
  const authHeader = req.headers.authorization;
  const secretHeader = req.headers['x-secret-key'];
  const cronToken = process.env.CRON_AUTH_TOKEN;
  const marketingSecret = process.env.MARKETING_EMAIL_SECRET;
  const hasValidBearer = !!cronToken && authHeader === `Bearer ${cronToken}`;
  const hasValidSecret = !!secretHeader && (secretHeader === cronToken || secretHeader === marketingSecret);

  if (!hasValidBearer && !hasValidSecret) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    console.log('Cron Sync Transaction Statuses: Starting transaction status sync');
    
    // Only proceed if we have a real Pi Server API Key
    const PI_SERVER_API_KEY = process.env.PI_SERVER_API_KEY || process.env.PI_API_KEY || 'your_pi_server_api_key_here';
    const isPiServerConfigured = () => PI_SERVER_API_KEY && PI_SERVER_API_KEY !== 'your_pi_server_api_key_here' && PI_SERVER_API_KEY !== 'your_pi_api_key_here';
    
    if (!isPiServerConfigured()) {
      console.log('Cron Sync Transaction Statuses: Pi Server API Key not configured');
      return res.status(400).json({ message: "Pi Server API Key not configured" });
    }

    // Initialize storage service
    const storage = new DatabaseStorage();

    // Get all pending transactions from database
    const pendingTransactions = await storage.getPendingTransactions();
    console.log('Cron Sync Transaction Statuses: Found', pendingTransactions.length, 'pending transactions');
    
    let updatedCount = 0;
    
    // Check each pending transaction with Pi Network
    for (const transaction of pendingTransactions) {
      try {
        console.log('Cron Sync Transaction Statuses: Checking status for transaction', transaction.id, transaction.paymentId);
        
        // Mark stale pending payments as failed after 5 minutes so abandoned or interrupted Pi flows do not remain stuck forever.
        if (!transaction.createdAt) {
          console.log('Cron Sync Transaction Statuses: Skipping transaction with missing createdAt', transaction.id);
          continue;
        }

        const createdTime = new Date(transaction.createdAt).getTime();
        const currentTime = Date.now();
        const timeDiffMinutes = (currentTime - createdTime) / (1000 * 60);

        if (timeDiffMinutes >= 5) {
          console.log('Cron Sync Transaction Statuses: Payment abandoned - pending for', Math.round(timeDiffMinutes), 'minutes');

          const updateData = {
            status: 'failed',
            failureReason: 'Payment was not completed within 5 minutes. This can happen when the user leaves the Pi flow, funds are insufficient, or the network interrupted the purchase.',
            updatedAt: new Date()
          };

          await storage.updateTransaction(transaction.id, updateData);
          updatedCount++;

          // Send abandoned payment notification email
          try {
            const fullTransaction = await storage.getTransactionWithUserAndPackage(transaction.id);
            if (fullTransaction && fullTransaction.user_email && fullTransaction.package_name) {
              console.log('Cron Sync Transaction Statuses: Sending abandoned payment notification to:', fullTransaction.user_email);
              await sendPaymentFailureNotification({
                to: fullTransaction.user_email,
                username: fullTransaction.user_username,
                packageName: fullTransaction.package_name,
                piAmount: fullTransaction.pi_amount,
                failureReason: 'Your payment was not completed within 5 minutes and has been cancelled. Please try again if you wish to proceed.',
                transactionId: fullTransaction.id,
                paymentId: fullTransaction.payment_id,
                isCancelled: true,
                game: fullTransaction.package_game,
                gameAccounts: fullTransaction.user_game_accounts,
                socialAccounts: fullTransaction.user_social_accounts
              });
            }
          } catch (emailError) {
            console.error('Cron Sync Transaction Statuses: Error sending abandoned payment email:', emailError);
            // Continue anyway - transaction was already marked as failed
          }

          continue;
        }
        
        // Get payment details from Pi Network
        const paymentDetails = await piNetworkService.getPayment(transaction.paymentId);
        
        if (!paymentDetails) {
          console.log('Cron Sync Transaction Statuses: Could not fetch payment details for', transaction.paymentId);
          continue;
        }
        
        console.log('Cron Sync Transaction Statuses: Payment details for', transaction.paymentId, paymentDetails.status);
        
        // Determine the correct status based on Pi Network response
        let newStatus = transaction.status; // Default to current status
        let failureReason = null; // Default to no reason
        
        if (paymentDetails.status.cancelled || paymentDetails.status.user_cancelled) {
          newStatus = 'cancelled';
          if (paymentDetails.status.cancelled) {
            failureReason = 'Payment cancelled by system';
          } else if (paymentDetails.status.user_cancelled) {
            failureReason = 'Payment cancelled by user';
          }
        } else if (paymentDetails.status.developer_completed) {
          newStatus = 'completed';
        } else if (!paymentDetails.status.developer_approved) {
          const createdTime = new Date(transaction.createdAt || new Date()).getTime();
          const currentTime = Date.now();
          const timeDiffMinutes = (currentTime - createdTime) / (1000 * 60);

          if (timeDiffMinutes >= 5) {
            newStatus = 'failed';
            failureReason = 'Payment was not completed within 5 minutes. This can happen when the user leaves the Pi flow, funds are insufficient, or the network interrupted the purchase.';
            console.log('Cron Sync Transaction Statuses: Transaction has been pending for too long; marking as failed:', transaction.id, { timeDiffMinutes });
          } else {
            console.log('Cron Sync Transaction Statuses: Payment still pending on Pi Network, will check again later');
          }
        }
        
        // Update database if status has changed
        if (newStatus !== transaction.status) {
          console.log('Cron Sync Transaction Statuses: Updating transaction', transaction.id, 'from', transaction.status, 'to', newStatus);
          
          const updateData: any = { status: newStatus, updatedAt: new Date() };
          
          // If completed, also update txid
          if (newStatus === 'completed' && paymentDetails.transaction?.txid) {
            updateData.txid = paymentDetails.transaction.txid;
          }
          
          // If failed or cancelled, also update failure reason
          if ((newStatus === 'failed' || newStatus === 'cancelled') && failureReason) {
            updateData.failureReason = failureReason;
          }
          
          await storage.updateTransaction(transaction.id, updateData);
          updatedCount++;
          
          console.log('Cron Sync Transaction Statuses: Transaction', transaction.id, 'updated to', newStatus);
          
          // Send failure notification email to user if transaction is failed or cancelled
          if ((newStatus === 'failed' || newStatus === 'cancelled') && failureReason) {
            try {
              // Get full transaction details with user and package info
              const fullTransaction = await storage.getTransactionWithUserAndPackage(transaction.id);
              if (fullTransaction && fullTransaction.user_email && fullTransaction.package_name) {
                console.log('Cron Sync Transaction Statuses: Attempting to send payment failure notification email to user:', fullTransaction.user_email);
                const emailResult = await sendPaymentFailureNotification({
                  to: fullTransaction.user_email,
                  username: fullTransaction.user_username,
                  packageName: fullTransaction.package_name,
                  piAmount: fullTransaction.pi_amount,
                  failureReason: failureReason,
                  transactionId: fullTransaction.id,
                  paymentId: fullTransaction.payment_id,
                  isCancelled: newStatus === 'cancelled',
                  game: fullTransaction.package_game,
                  gameAccounts: fullTransaction.user_game_accounts,
                  socialAccounts: fullTransaction.user_social_accounts
                });
                
                if (emailResult) {
                  console.log('Cron Sync Transaction Statuses: Payment failure notification email sent successfully to user:', fullTransaction.user_email);
                } else {
                  console.log('Cron Sync Transaction Statuses: Failed to send payment failure notification email to user:', fullTransaction.user_email);
                }
              } else {
                console.log('Cron Sync Transaction Statuses: Skipping failure notification email - missing user email or package name');
              }
            } catch (emailError) {
              console.error('Cron Sync Transaction Statuses: Payment failure notification email sending failed:', emailError);
            }
          }
        } else {
          console.log('Cron Sync Transaction Statuses: Transaction', transaction.id, 'status unchanged');
        }
      } catch (error) {
        console.error('Cron Sync Transaction Statuses: Error checking transaction', transaction.id, error);
        // Continue with next transaction
      }
    }
    
    console.log('Cron Sync Transaction Statuses: Sync completed, updated', updatedCount, 'transactions');
    return res.status(200).json({ 
      message: "Transaction status sync completed",
      updatedCount,
      totalChecked: pendingTransactions.length
    });
  } catch (error) {
    console.error('Cron Sync Transaction Statuses: Sync error:', error);
    return res.status(500).json({ 
      message: "Failed to sync transaction statuses",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
