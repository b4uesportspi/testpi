import { syncTransactionStatuses } from './dist/api/services/transaction-sync.js';
import dotenv from 'dotenv';

dotenv.config();

async function manualTransactionSync() {
  console.log('🔄 Manually running transaction sync...');
  
  try {
    const result = await syncTransactionStatuses();
    console.log(`✅ Sync completed. Updated ${result.updatedCount} out of ${result.totalChecked} transactions.`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

manualTransactionSync();