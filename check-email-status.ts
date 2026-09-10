import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function checkEmailStatus() {
  console.log('Checking email status of recent transactions...');
  
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in environment variables');
    process.exit(1);
  }
  
  // Create a pool with SSL configuration for Supabase
  const isSupabase = DATABASE_URL.includes('supabase');
  const poolConfig: any = { 
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 15000,
    statement_timeout: 15000,
    idleTimeoutMillis: 30000,
    max: 3,
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
  
  // Handle SSL configuration - Use proper SSL settings
  if (isSupabase || DATABASE_URL.includes('sslmode=require')) {
    // For production, we should use proper certificate validation
    // But for Vercel serverless, we might need to bypass temporarily
    poolConfig.ssl = { 
      rejectUnauthorized: false // Temporary bypass for certificate verification in development
    };
    
    console.log('SSL configuration applied for database connection');
  }
  
  const pool = new Pool(poolConfig);
  
  try {
    // Test connection
    const result = await pool.query('SELECT version()');
    console.log('✅ Database connection successful!');
    
    // Get recent transactions with email status
    const query = `
      SELECT 
        t.id,
        t.status,
        t.email_sent,
        t.created_at,
        u.username,
        u.email,
        p.name as package_name
      FROM app_transactions t
      LEFT JOIN app_users u ON t.user_id = u.id
      LEFT JOIN app_packages p ON t.package_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `;
    
    const transactionsResult = await pool.query(query);
    
    if (transactionsResult.rows.length === 0) {
      console.log('No transactions found in the database.');
      return;
    }
    
    console.log('\nRecent Transactions:');
    console.log('====================');
    
    for (const transaction of transactionsResult.rows) {
      console.log(`\nTransaction ID: ${transaction.id}`);
      console.log(`  Status: ${transaction.status}`);
      console.log(`  Email Sent: ${transaction.email_sent ? '✅ Yes' : '❌ No'}`);
      console.log(`  User: ${transaction.username} (${transaction.email})`);
      console.log(`  Package: ${transaction.package_name}`);
      console.log(`  Date: ${transaction.created_at}`);
    }
    
    // Count email status
    const emailStatusQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN email_sent = true THEN 1 END) as sent,
        COUNT(CASE WHEN email_sent = false THEN 1 END) as not_sent
      FROM app_transactions
      WHERE status = 'completed'
    `;
    
    const emailStatusResult = await pool.query(emailStatusQuery);
    const stats = emailStatusResult.rows[0];
    
    console.log('\nEmail Status Summary:');
    console.log('=====================');
    console.log(`Total completed transactions: ${stats.total}`);
    console.log(`Emails sent: ${stats.sent}`);
    console.log(`Emails not sent: ${stats.not_sent}`);
    
  } catch (error) {
    console.error('Error checking email status:', error);
    console.error('This might be due to SSL certificate issues. Check your database connection settings.');
  } finally {
    await pool.end();
  }
}

checkEmailStatus();