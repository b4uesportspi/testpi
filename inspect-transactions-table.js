// Script to inspect the app_transactions table structure
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function inspectTransactionsTable() {
  console.log('🔍 Inspecting app_transactions table structure...');
  
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
    // Get column information
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'app_transactions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 app_transactions table columns:');
    console.log('=====================================');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error inspecting table:', error.message);
  } finally {
    await pool.end();
  }
}

inspectTransactionsTable().catch(console.error);