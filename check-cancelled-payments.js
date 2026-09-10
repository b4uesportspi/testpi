import { db } from './dist/server/db.js';
import * as schema from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';

async function checkCancelledPayments() {
  try {
    console.log('🔍 Checking cancelled payments...');
    
    // Get all cancelled transactions
    const cancelledTransactions = await db.select({
      id: schema.transactions.id,
      paymentId: schema.transactions.paymentId,
      status: schema.transactions.status,
      failureReason: schema.transactions.failureReason,
      emailSent: schema.transactions.emailSent,
      createdAt: schema.transactions.createdAt,
      updatedAt: schema.transactions.updatedAt,
      user: {
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        phone: schema.users.phone
      },
      package: {
        id: schema.packages.id,
        name: schema.packages.name,
        game: schema.packages.game,
        inGameAmount: schema.packages.inGameAmount,
        usdtValue: schema.packages.usdtValue
      }
    })
    .from(schema.transactions)
    .leftJoin(schema.users, eq(schema.transactions.userId, schema.users.id))
    .leftJoin(schema.packages, eq(schema.transactions.packageId, schema.packages.id))
    .where(eq(schema.transactions.status, 'cancelled'))
    .orderBy(schema.transactions.createdAt);
    
    console.log(`\n📊 Found ${cancelledTransactions.length} cancelled transactions:`);
    
    if (cancelledTransactions.length === 0) {
      console.log('✅ No cancelled transactions found.');
      return;
    }
    
    // Display summary
    console.log('\n📋 Cancelled Transactions Summary:');
    console.log('----------------------------------------');
    
    // Check for email issues
    let missingEmailCount = 0;
    let invalidEmailCount = 0;
    
    for (const transaction of cancelledTransactions) {
      console.log(`\n💳 Transaction ID: ${transaction.id}`);
      console.log(`   Payment ID: ${transaction.paymentId}`);
      console.log(`   Status: ${transaction.status}`);
      console.log(`   Failure Reason: ${transaction.failureReason || 'N/A'}`);
      console.log(`   Email Sent: ${transaction.emailSent ? '✅ YES' : '❌ NO'}`);
      console.log(`   Created: ${transaction.createdAt}`);
      console.log(`   Updated: ${transaction.updatedAt}`);
      
      if (transaction.user) {
        console.log(`   User: ${transaction.user.username} (${transaction.user.email})`);
        
        // Check for email issues
        if (!transaction.user.email) {
          console.log(`   ❌ WARNING: User has no email address!`);
          missingEmailCount++;
        } else if (!transaction.user.email.includes('@') || !transaction.user.email.includes('.')) {
          console.log(`   ❌ WARNING: User email appears invalid: ${transaction.user.email}`);
          invalidEmailCount++;
        }
      } else {
        console.log(`   ❌ User: Not found`);
        missingEmailCount++;
      }
      
      if (transaction.package) {
        console.log(`   Package: ${transaction.package.name} (${transaction.package.game})`);
      } else {
        console.log(`   Package: Not found`);
      }
    }
    
    // Count statistics
    const emailSentCount = cancelledTransactions.filter(t => t.emailSent).length;
    const emailNotSentCount = cancelledTransactions.filter(t => !t.emailSent).length;
    
    console.log('\n📈 Statistics:');
    console.log(`   Total Cancelled: ${cancelledTransactions.length}`);
    console.log(`   Emails Sent: ${emailSentCount}`);
    console.log(`   Emails Not Sent: ${emailNotSentCount}`);
    console.log(`   Email Success Rate: ${((emailSentCount / cancelledTransactions.length) * 100).toFixed(2)}%`);
    
    if (missingEmailCount > 0 || invalidEmailCount > 0) {
      console.log(`\n⚠️  Email Address Issues:`);
      console.log(`   Missing Email Addresses: ${missingEmailCount}`);
      console.log(`   Invalid Email Addresses: ${invalidEmailCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking cancelled payments:', error);
  }
}

// Run the function
checkCancelledPayments().catch(console.error);