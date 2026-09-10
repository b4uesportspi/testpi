import { storage } from "../storage.js";

/**
 * Fetch all user emails from the database
 * @returns Promise<string[]> Array of user email addresses
 */
export async function getAllUserEmails(): Promise<string[]> {
  try {
    const emails = await storage.getAllUserEmails();
    console.log(`Fetched ${emails.length} user emails from database`);
    return emails;
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return [];
  }
}

/**
 * Fetch all admin emails from the database
 * @returns Promise<string[]> Array of admin email addresses
 */
export async function getAllAdminEmails(): Promise<string[]> {
  try {
    const emails = await storage.getAllAdminEmails();
    console.log(`Fetched ${emails.length} admin emails from database`);
    return emails;
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Fetch both user and admin emails
 * @returns Promise<{userEmails: string[], adminEmails: string[]}> Object containing both email arrays
 */
export async function getAllEmails(): Promise<{userEmails: string[], adminEmails: string[]}> {
  try {
    const [userEmails, adminEmails] = await Promise.all([
      getAllUserEmails(),
      getAllAdminEmails()
    ]);
    
    return { userEmails, adminEmails };
  } catch (error) {
    console.error('Error fetching all emails:', error);
    return { userEmails: [], adminEmails: [] };
  }
}

/**
 * Example usage of the email fetching functions
 */
export async function sendBulkEmails(): Promise<void> {
  try {
    // Fetch all emails
    const { userEmails, adminEmails } = await getAllEmails();
    
    console.log('User emails:', userEmails);
    console.log('Admin emails:', adminEmails);
    
    // Example: Send notifications to users
    // for (const email of userEmails) {
    //   await sendPurchaseConfirmationEmail({
    //     to: email,
    //     username: 'User',
    //     packageName: 'Sample Package',
    //     piAmount: '10',
    //     usdAmount: '10',
    //     gameAccount: 'Sample Account',
    //     transactionId: 'sample-transaction-id',
    //     paymentId: 'sample-payment-id'
    //   });
    // }
    
    // Example: Send notifications to admins
    // for (const email of adminEmails) {
    //   await sendAdminPurchaseNotification({
    //     adminEmail: email,
    //     username: 'User',
    //     userEmail: 'user@example.com',
    //     userPhone: '+1234567890',
    //     packageName: 'Sample Package',
    //     game: 'PUBG',
    //     inGameAmount: 100,
    //     piAmount: '10',
    //     usdAmount: '10',
    //     gameAccount: 'Sample Account',
    //     transactionId: 'sample-transaction-id',
    //     paymentId: 'sample-payment-id',
    //     txid: 'sample-txid'
    //   });
    // }
  } catch (error) {
    console.error('Error in bulk email sending:', error);
  }
}