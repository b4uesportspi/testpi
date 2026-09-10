import { db } from './dist/server/db.js';
import * as schema from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';

// Import the transaction email service
import { sendTransactionStatusEmails } from './dist/server/services/transaction-emails.js';

async function testSendCancelledEmail() {
  try {
    console.log('🔍 Testing sending email for cancelled transaction...');
    
    // Get a cancelled transaction with user and package data
    const result = await db.select({
      id: schema.transactions.id,
      paymentId: schema.transactions.paymentId,
      status: schema.transactions.status,
      failureReason: schema.transactions.failureReason,
      emailSent: schema.transactions.emailSent,
      userId: schema.transactions.userId,
      packageId: schema.transactions.packageId,
      piAmount: schema.transactions.piAmount,
      usdAmount: schema.transactions.usdAmount,
      gameAccount: schema.transactions.gameAccount,
      user_email: schema.users.email,
      user_username: schema.users.username,
      user_phone: schema.users.phone,
      package_name: schema.packages.name,
      package_game: schema.packages.game,
      package_in_game_amount: schema.packages.inGameAmount
    })
    .from(schema.transactions)
    .leftJoin(schema.users, eq(schema.transactions.userId, schema.users.id))
    .leftJoin(schema.packages, eq(schema.transactions.packageId, schema.packages.id))
    .where(eq(schema.transactions.status, 'cancelled'))
    .limit(1);
    
    if (result.length === 0) {
      console.log('✅ No cancelled transactions found to test with.');
      return;
    }
    
    const transaction = result[0];
    console.log(`\n💳 Testing with transaction ID: ${transaction.id}`);
    console.log(`   Payment ID: ${transaction.paymentId}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Failure Reason: ${transaction.failureReason}`);
    console.log(`   Email Sent: ${transaction.emailSent ? '✅ YES' : '❌ NO'}`);
    console.log(`   User Email: ${transaction.user_email || 'N/A'}`);
    console.log(`   Package Name: ${transaction.package_name || 'N/A'}`);
    
    // Check if we have the required data
    if (!transaction.user_email || !transaction.package_name) {
      console.log('❌ Missing required data for email sending');
      console.log(`   Has User Email: ${!!transaction.user_email}`);
      console.log(`   Has Package Name: ${!!transaction.package_name}`);
      return;
    }
    
    // Create a mock client for the email service
    const mockClient = {
      query: async (sql, params) => {
        if (sql.includes('admins')) {
          // Return active admins
          return await db.select({
            email: schema.admins.email
          })
          .from(schema.admins)
          .where(eq(schema.admins.isActive, true));
        }
        return { rows: [] };
      }
    };
    
    // Test sending the transaction status email
    console.log('\n📧 Sending transaction status email...');
    const emailResult = await sendTransactionStatusEmails(transaction, mockClient, 'cancelled');
    
    console.log(`\n📊 Email sending result: ${emailResult ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (emailResult) {
      console.log('\n✅ Email sent successfully! Check your inbox.');
      
      // Update the database to mark email as sent
      try {
        await db.update(schema.transactions)
          .set({ emailSent: true, updatedAt: new Date() })
          .where(eq(schema.transactions.id, transaction.id));
        console.log('✅ Database updated to mark email as sent');
      } catch (updateError) {
        console.error('❌ Failed to update database:', updateError);
      }
    } else {
      console.log('❌ Email sending failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing email sending:', error);
  }
}

// Run the function
testSendCancelledEmail().catch(console.error);