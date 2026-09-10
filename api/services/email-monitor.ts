/**
 * Email monitoring service that automatically checks for and sends missing emails.
 * This service implements the "Regular Checks" recommendation to prevent email sending issues.
 */

import { Pool } from 'pg';
import { sendPurchaseConfirmationEmail, sendAdminPurchaseNotification } from '../../server/services/email.js';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

/**
 * Delay function for retry mechanism
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send email with retry mechanism
 */
async function sendEmailWithRetry(
  sendFunction: Function,
  params: any,
  maxRetries: number = MAX_RETRIES
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Sending email - Attempt ${attempt}/${maxRetries}`);
      const result = await sendFunction(params);
      
      if (result) {
        console.log('✅ Email sent successfully');
        return true;
      } else {
        console.log(`❌ Email sending failed - Attempt ${attempt}/${maxRetries}`);
      }
    } catch (error: any) {
      console.error(`❌ Email sending error - Attempt ${attempt}/${maxRetries}:`, error.message);
      
      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * RETRY_DELAY_BASE; // Exponential backoff
        console.log(`⏳ Waiting ${delayMs}ms before retrying...`);
        await delay(delayMs);
      }
    }
  }
  
  console.log('❌ All attempts to send email failed');
  return false;
}

/**
 * Check for and fix email sending issues
 */
export async function checkAndFixEmailIssues(pool: any) {
  console.log('🔍 Service: Checking for email sending issues...');
  
  try {
    // Get completed transactions that haven't had emails sent and were updated more than 5 minutes ago
    const result = await pool.query(`
      SELECT 
        t.*,
        u.email as user_email,
        u.username as user_username,
        u.phone as user_phone,
        p.name as package_name,
        p.game as package_game,
        p.in_game_amount as package_in_game_amount
      FROM app_transactions t
      JOIN app_users u ON t.user_id = u.id
      JOIN app_packages p ON t.package_id = p.id
      WHERE t.status = 'completed' 
      AND t.email_sent = false
      AND t.updated_at < NOW() - INTERVAL '5 minutes'
      ORDER BY t.created_at DESC
      LIMIT 50
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ No completed transactions without emails found');
      return { success: true, emailsSent: 0, emailsFailed: 0 };
    }
    
    console.log(`📧 Found ${result.rows.length} completed transactions without emails sent`);
    
    let emailsSent = 0;
    let emailsFailed = 0;
    
    for (const transaction of result.rows) {
      console.log(`\n📧 Processing transaction: ${transaction.id.substring(0, 8)}...`);
      
      try {
        // Check if we have the required data
        if (!transaction.user_email || !transaction.package_name) {
          console.log('❌ Skipping email sending - missing required data', {
            hasUserEmail: !!transaction.user_email,
            hasPackageName: !!transaction.package_name
          });
          emailsFailed++;
          continue;
        }
        
        // Convert gameAccount object to string for email
        const gameAccountString = typeof transaction.game_account === 'string' 
          ? transaction.game_account 
          : JSON.stringify(transaction.game_account);
        
        // Send email to user with retry mechanism
        console.log(`📧 Sending purchase confirmation to: ${transaction.user_email}`);
        const userEmailResult = await sendEmailWithRetry(sendPurchaseConfirmationEmail, {
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
        
        if (userEmailResult) {
          console.log('✅ Purchase confirmation email sent successfully to user:', transaction.user_email);
          
          // Send email to admins with retry mechanism
          try {
            console.log('📧 Sending admin notification emails...');
            
            // Get all active admins
            const adminsResult = await pool.query(
              'SELECT email FROM admins WHERE is_active = true AND email IS NOT NULL'
            );
            
            const admins = adminsResult.rows;
            let adminEmailsSent = 0;
            let adminEmailsFailed = 0;
            
            for (const admin of admins) {
              if (admin.email) {
                try {
                  const adminEmailResult = await sendEmailWithRetry(sendAdminPurchaseNotification, {
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
                  
                  if (adminEmailResult) {
                    adminEmailsSent++;
                    console.log('✅ Purchase notification email sent successfully to admin:', admin.email);
                  } else {
                    adminEmailsFailed++;
                    console.log('❌ Failed to send purchase notification email to admin:', admin.email);
                  }
                } catch (adminEmailError) {
                  adminEmailsFailed++;
                  console.error('❌ Failed to send email to admin:', admin.email, adminEmailError);
                }
              }
            }
            
            console.log(`📧 Admin email sending summary: ${adminEmailsSent} sent, ${adminEmailsFailed} failed out of ${admins.length} admins`);
          } catch (adminEmailError) {
            console.error('❌ Admin notification email sending failed:', adminEmailError);
          }
          
          // Update transaction to mark email as sent
          await pool.query(
            'UPDATE app_transactions SET email_sent = true, updated_at = NOW() WHERE id = $1',
            [transaction.id]
          );
          
          console.log('✅ Transaction updated to mark email as sent');
          emailsSent++;
        } else {
          console.log('❌ Failed to send purchase confirmation email to user:', transaction.user_email);
          emailsFailed++;
        }
      } catch (error) {
        console.error('❌ Error processing transaction:', transaction.id, error);
        emailsFailed++;
      }
    }
    
    console.log(`\n📧 Service email sending summary:`);
    console.log(`   Successfully sent emails: ${emailsSent}`);
    console.log(`   Failed to send emails: ${emailsFailed}`);
    console.log(`   Total transactions processed: ${result.rows.length}`);
    
    return { success: true, emailsSent, emailsFailed, totalProcessed: result.rows.length };
    
  } catch (error) {
    console.error('❌ Service email checking failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}