// Script to check logs for a specific transaction
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkTransactionLogs(transactionId) {
  console.log(`🔍 Checking logs for transaction: ${transactionId}`);
  
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return;
  }
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Check if there are any log tables in the database
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%log%'
    `);
    
    console.log('\n📋 Log tables found in database:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check for any email log tables
    const emailLogTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%email%' OR table_name LIKE '%log%')
    `);
    
    console.log('\n📋 Email/Log tables found in database:');
    emailLogTables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Try to find any logging tables that might contain transaction information
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 All tables in database:');
    allTables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if there's a vercel_logs table or similar
    const possibleLogTables = allTables.rows
      .map(row => row.table_name)
      .filter(name => name.includes('log') || name.includes('event') || name.includes('audit'));
    
    console.log('\n📋 Potential log tables:');
    if (possibleLogTables.length > 0) {
      possibleLogTables.forEach(table => {
        console.log(`  - ${table}`);
      });
    } else {
      console.log('  No potential log tables found');
    }
    
    // Try to query common log table names
    const commonLogTables = ['vercel_logs', 'email_logs', 'transaction_logs', 'app_logs', 'logs'];
    
    for (const tableName of commonLogTables) {
      try {
        // Check if table exists
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tableName]);
        
        if (tableExists.rows[0].exists) {
          console.log(`\n🔍 Checking ${tableName} for transaction ${transactionId}...`);
          
          // Try different column names that might contain transaction info
          const columnNames = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1
          `, [tableName]);
          
          console.log(`   Columns in ${tableName}:`);
          columnNames.rows.forEach(row => {
            console.log(`     - ${row.column_name}`);
          });
          
          // Try to find logs related to this transaction
          try {
            const logResult = await pool.query(`
              SELECT * 
              FROM ${tableName}
              WHERE message LIKE $1 OR message LIKE $2
              ORDER BY created_at DESC
              LIMIT 10
            `, [`%${transactionId}%`, '%Payment Cancel endpoint%']);
            
            if (logResult.rows.length > 0) {
              console.log(`\n📋 Found ${logResult.rows.length} log entries:`);
              logResult.rows.forEach((row, index) => {
                console.log(`\n   ${index + 1}. Log Entry:`);
                Object.keys(row).forEach(key => {
                  console.log(`      ${key}: ${row[key]}`);
                });
              });
            } else {
              console.log(`\n📝 No log entries found in ${tableName} for this transaction`);
            }
          } catch (queryError) {
            console.log(`   Cannot query ${tableName}: ${queryError.message}`);
          }
        }
      } catch (error) {
        console.log(`   Error checking table ${tableName}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await pool.end();
  }
}

// Get transaction ID from command line arguments or use the one from our previous check
const transactionId = process.argv[2] || 'dc18d764-f159-447a-9d37-15efd8434d10';
checkTransactionLogs(transactionId).catch(console.error);