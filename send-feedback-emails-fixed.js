import * as dotenv from 'dotenv';
dotenv.config();

import { db } from './server/db.js';
import { users, transactions, packages } from './shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { sendFeedbackRequestEmail } from './server/services/email.js';

async function sendFeedbackEmailsToAllSuccessfulPurchasers() {
  console.log('?? Starting feedback email campaign for all successful purchasers...');

  try {
    // Get all users who have at least one completed transaction
    const usersWithCompletedPurchases = await db
      .select({
        userId: users.id,
        username: users.username,
        email: users.email,
        transactionId: transactions.id,
        packageName: packages.name,
        game: packages.game,
        purchaseDate: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .innerJoin(packages, eq(transactions.packageId, packages.id))
      .where(eq(transactions.status, 'completed'))
      .orderBy(desc(transactions.createdAt));

    console.log(?? Found \ completed transactions);

    // Group by user to avoid sending multiple emails to the same user
    const userMap = new Map();

    for (const transaction of usersWithCompletedPurchases) {
      if (!userMap.has(transaction.userId)) {
        userMap.set(transaction.userId, transaction);
      }
    }

    const uniqueUsers = Array.from(userMap.values());
    console.log(?? Found \ unique users with completed purchases);

    let successCount = 0;
    let failureCount = 0;

    // Send feedback email to each user
    for (const user of uniqueUsers) {
      try {
        console.log(?? Sending feedback email to \ (\));

        const success = await sendFeedbackRequestEmail({
          to: user.email,
          username: user.username,
          gameName: user.game,
          packageName: user.packageName,
          purchaseDate: user.purchaseDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
          transactionId: user.transactionId,
        });

        if (success) {
          successCount++;
          console.log(? Successfully sent feedback email to \);
        } else {
          failureCount++;
          console.log(? Failed to send feedback email to \);
        }

        // Add a small delay to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(? Error sending feedback email to \:, error);
        failureCount++;
      }
    }

    console.log('?? Feedback email campaign completed!');
    console.log(?? Results: \ successful, \ failed);

  } catch (error) {
    console.error('? Error in feedback email campaign:', error);
    process.exit(1);
  }
}

// Run the script
sendFeedbackEmailsToAllSuccessfulPurchasers()
  .then(() => {
    console.log('? Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('? Script failed:', error);
    process.exit(1);
  });
