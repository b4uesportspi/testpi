import { db } from './dist/server/db.js';
import * as schema from './dist/shared/schema.js';
import { eq } from 'drizzle-orm';

// Import the transaction sync service
import { syncTransactionStatuses } from './dist/api/services/transaction-sync.js';

async function testTransactionSync() {
  try {
    console.log('🔍 Testing transaction sync service...');
    
    // Get a cancelled transaction to test with
    const cancelledTransactions = await db.select({
      id: schema.transactions.id,
      paymentId: schema.transactions.paymentId,
      status: schema.transactions.status,
      failureReason: schema.transactions.failureReason,
      emailSent: schema.transactions.emailSent,
      userId: schema.transactions.userId,
      packageId: schema.transactions.packageId,
      piAmount: schema.transactions.piAmount,
      usdAmount: schema.transactions.usdAmount,
      gameAccount: schema.transactions.gameAccount
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.status, 'cancelled'))
    .limit(1);
    
    if (cancelledTransactions.length === 0) {
      console.log('✅ No cancelled transactions found to test with.');
      return;
    }
    
    const transaction = cancelledTransactions[0];
    console.log(`\n💳 Testing with transaction ID: ${transaction.id}`);
    console.log(`   Payment ID: ${transaction.paymentId}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Email Sent: ${transaction.emailSent ? '✅ YES' : '❌ NO'}`);
    
    // Run the transaction sync service
    console.log('\n🔄 Running transaction sync service...');
    const result = await syncTransactionStatuses();
    
    console.log('\n📊 Sync service result:', result);
    
    // Check if the email was sent
    const updatedTransaction = await db.select({
      emailSent: schema.transactions.emailSent
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.id, transaction.id));
    
    if (updatedTransaction.length > 0) {
      console.log(`\n📧 Email sent status after sync: ${updatedTransaction[0].emailSent ? '✅ YES' : '❌ NO'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing transaction sync:', error);
  }
}

// Run the function
testTransactionSync().catch(console.error);