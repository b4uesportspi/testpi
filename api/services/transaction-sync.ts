import dotenv from 'dotenv';
import { DatabaseStorage } from '../../server/storage.js';
import { piNetworkService } from '../../server/services/pi-network.js';
import { sendTransactionStatusEmails } from '../../server/services/transaction-emails.js';

// Load environment variables
dotenv.config();

/**
 * Sync transaction statuses with Pi Network
 * This function checks pending transactions and updates their status based on Pi Network response
 * It also sends email notifications for failed or cancelled transactions
 */
export async function syncTransactionStatuses(): Promise<{ updatedCount: number; totalChecked: number }> {
  console.log('Transaction Sync Service: Starting transaction status sync');
  
  // Only proceed if we have a real Pi Server API Key
  const PI_SERVER_API_KEY = process.env.PI_SERVER_API_KEY || process.env.PI_API_KEY || 'your_pi_server_api_key_here';
  const isPiServerConfigured = () => PI_SERVER_API_KEY && PI_SERVER_API_KEY !== 'your_pi_server_api_key_here' && PI_SERVER_API_KEY !== 'your_pi_api_key_here';
  
  if (!isPiServerConfigured()) {
    console.log('Transaction Sync Service: Pi Server API Key not configured');
    throw new Error("Pi Server API Key not configured");
  }

  // Initialize storage service
  const storage = new DatabaseStorage();

  // Get all pending transactions from database
  const pendingTransactions = await storage.getPendingTransactions();
  console.log('Transaction Sync Service: Found', pendingTransactions.length, 'pending transactions');
  
  let updatedCount = 0;
  
  // Check each pending transaction with Pi Network
  for (const transaction of pendingTransactions) {
    try {
      console.log('Transaction Sync Service: Checking status for transaction', transaction.id, transaction.paymentId);
      
      // Get payment details from Pi Network
      const paymentDetails = await piNetworkService.getPayment(transaction.paymentId);
      
      if (!paymentDetails) {
        console.log('Transaction Sync Service: Could not fetch payment details for', transaction.paymentId);
        continue;
      }
      
      console.log('Transaction Sync Service: Payment details for', transaction.paymentId, paymentDetails.status);
      
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
        // A payment can remain pending when the user exits the Pi flow, the funds are insufficient,
        // or the network interrupts the request. Treat stale pending transactions as failed after 5 minutes
        // so user notifications and support flows do not leave them stuck in a perpetual pending state.
        const createdTime = new Date(transaction.createdAt || new Date()).getTime();
        const currentTime = Date.now();
        const timeDiffMinutes = (currentTime - createdTime) / (1000 * 60);

        if (timeDiffMinutes >= 5) {
          newStatus = 'failed';
          failureReason = 'Payment was not completed within 5 minutes. This can happen when the user leaves the Pi flow, funds are insufficient, or the network interrupted the purchase.';
        }
      }
      
      // Update database if status has changed
      if (newStatus !== transaction.status) {
        console.log('Transaction Sync Service: Updating transaction', transaction.id, 'from', transaction.status, 'to', newStatus);
        
        const updateData: any = { status: newStatus, updatedAt: new Date() };
        
        // If completed, also update txid and success reason
        if (newStatus === 'completed' && paymentDetails.transaction?.txid) {
          updateData.txid = paymentDetails.transaction.txid;
          updateData.successReason = 'Payment successfully completed and verified with Pi Network';
        }
        
        // If failed or cancelled, also update failure reason
        if ((newStatus === 'failed' || newStatus === 'cancelled') && failureReason) {
          updateData.failureReason = failureReason;
        }
        
        await storage.updateTransaction(transaction.id, updateData);
        updatedCount++;
        
        console.log('Transaction Sync Service: Transaction', transaction.id, 'updated to', newStatus);
        
        // Send transaction status emails for all statuses (failed, cancelled, completed)
        if ((newStatus === 'failed' || newStatus === 'cancelled' || newStatus === 'completed') && 
            (failureReason || newStatus === 'completed')) {
          try {
            // Get full transaction details with user and package info
            const fullTransaction = await storage.getTransactionWithUserAndPackage(transaction.id);
            if (fullTransaction) {
              console.log('Transaction Sync Service: Attempting to send transaction status emails for:', newStatus);
              
              // Send emails using the unified transaction email service
              // Pass null as the client since the email service will handle its own database connections
              const emailResult = await sendTransactionStatusEmails(fullTransaction, null, newStatus);
              
              if (emailResult) {
                console.log('Transaction Sync Service: Transaction status emails sent successfully for:', newStatus);
                // Update the email_sent flag in the database
                await storage.updateTransaction(transaction.id, { emailSent: true });
                console.log('Transaction Sync Service: Marked email as sent for transaction', transaction.id);
              } else {
                console.log('Transaction Sync Service: Failed to send transaction status emails for:', newStatus);
              }
            } else {
              console.log('Transaction Sync Service: Skipping transaction status emails - could not get transaction details');
            }
          } catch (emailError) {
            console.error('Transaction Sync Service: Transaction status email sending failed:', emailError);
          }
        }
      } else {
        console.log('Transaction Sync Service: Transaction', transaction.id, 'status unchanged');
      }
    } catch (error) {
      console.error('Transaction Sync Service: Error checking transaction', transaction.id, error);
      // Continue with next transaction
    }
  }
  
  console.log('Transaction Sync Service: Sync completed, updated', updatedCount, 'transactions');
  return { 
    updatedCount,
    totalChecked: pendingTransactions.length
  };
}

/**
 * Run transaction sync periodically
 * This function can be called to start a periodic sync process
 */
export async function startPeriodicSync(intervalMinutes: number = 10): Promise<void> {
  console.log(`Transaction Sync Service: Starting periodic sync every ${intervalMinutes} minutes`);
  
  // Run sync immediately
  try {
    await syncTransactionStatuses();
  } catch (error) {
    console.error('Transaction Sync Service: Initial sync failed:', error);
  }
  
  // Set up periodic sync
  setInterval(async () => {
    try {
      await syncTransactionStatuses();
    } catch (error) {
      console.error('Transaction Sync Service: Periodic sync failed:', error);
    }
  }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
}
