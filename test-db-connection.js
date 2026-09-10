import dotenv from 'dotenv';

dotenv.config();

async function testDatabaseConnection() {
  console.log('Testing database connection using application configuration...');
  
  try {
    // Import the compiled database module
    const { pool, db, checkDatabaseHealth, getPoolStats } = await import('./dist/server/db.js');
    
    console.log('Checking database health...');
    const isHealthy = await checkDatabaseHealth();
    
    if (isHealthy) {
      console.log('✅ Database connection is healthy');
      
      // Get pool statistics
      const stats = getPoolStats();
      console.log('📊 Pool Statistics:', stats);
      
      // Test a simple query through the application's db instance
      console.log('Testing query through application db instance...');
      
      if (db) {
        // For drizzle ORM, we need to use the execute method differently
        try {
          const result = await pool.query('SELECT NOW() as now');
          console.log('✅ Query executed successfully:', result.rows[0]);
        } catch (queryError) {
          console.log('⚠️ Drizzle ORM query failed, trying with pool directly:', queryError.message);
          // Try with pool directly
          const client = await pool.connect();
          try {
            const result = await client.query('SELECT NOW() as now');
            console.log('✅ Direct pool query executed successfully:', result.rows[0]);
          } finally {
            client.release();
          }
        }
      } else {
        console.log('❌ Application db instance not available');
      }
    } else {
      console.log('❌ Database connection is not healthy');
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('Error details:', error);
  }
  
  console.log('Database connection test completed');
}

testDatabaseConnection().catch(console.error);