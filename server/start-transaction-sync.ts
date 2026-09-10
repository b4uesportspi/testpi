import dotenv from 'dotenv';
import { syncTransactionStatuses, startPeriodicSync } from '../api/services/transaction-sync.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for starting the transaction sync service
 */
async function main() {
  console.log('🚀 Starting Transaction Sync Service...');
  
  // Run initial sync
  try {
    console.log('🔄 Running initial transaction sync...');
    const result = await syncTransactionStatuses();
    console.log(`✅ Initial sync completed. Updated ${result.updatedCount} out of ${result.totalChecked} transactions.`);
  } catch (error) {
    console.error('❌ Initial sync failed:', error);
  }
  
  // Start periodic sync (every 10 minutes by default)
  const intervalMinutes = parseInt(process.env.TRANSACTION_SYNC_INTERVAL_MINUTES || '10', 10);
  startPeriodicSync(intervalMinutes);
  
  console.log(`⏰ Periodic sync started. Will run every ${intervalMinutes} minutes.`);
  console.log('💡 Press Ctrl+C to stop the service.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start the service
main().catch((error) => {
  console.error('💥 Unhandled error in transaction sync service:', error);
  process.exit(1);
});