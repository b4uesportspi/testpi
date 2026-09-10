import axios from 'axios';

// Check if we're running in a Vercel environment
const isVercel = process.env.VERCEL === '1';

// Only run the sync task if we're not in a Vercel environment
// (Vercel doesn't support long-running processes)
if (!isVercel) {
  // Run the sync task every 10 minutes
  const syncInterval = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  const syncTransactionStatuses = async () => {
    try {
      console.log('Transaction Sync Task: Starting sync...');
      
      // Call the sync endpoint
      const response = await axios.post('http://localhost:3000/api/sync-transactions', {}, {
        timeout: 30000 // 30 second timeout
      });
      
      console.log('Transaction Sync Task: Sync completed', response.data);
    } catch (error) {
      console.error('Transaction Sync Task: Sync failed', error);
    }
  };
  
  // Start the sync task
  setInterval(syncTransactionStatuses, syncInterval);
  
  // Run immediately on startup
  setTimeout(syncTransactionStatuses, 5000); // Wait 5 seconds for server to start
  
  console.log(`Transaction Sync Task: Started (runs every ${syncInterval / 1000 / 60} minutes)`);
}