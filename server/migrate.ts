// PostgreSQL migration script
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import dotenv from 'dotenv';

dotenv.config();

// Handle SSL certificate issues properly

console.log('Running PostgreSQL migrations...');

// Use PostgreSQL for migrations
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/esports_pi_market";

async function runMigrations() {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  
  try {
    // Use the connection string directly to preserve the pooler URL format for Supabase
    let poolConfig: any = { connectionString: DATABASE_URL };
    
    // Handle SSL configuration for PostgreSQL connections - Production settings
    if (DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('supabase')) {
      // Handle Supabase self-signed certificate issue
      const isSupabase = DATABASE_URL.includes('supabase');
      poolConfig = { 
        connectionString: DATABASE_URL, 
        ssl: { 
          rejectUnauthorized: isSupabase ? false : true // For Supabase, temporarily disable SSL validation due to self-signed certificate issue
        } 
      };
    }
    
    // Add better timeouts for Vercel serverless environment
    poolConfig.connectionTimeoutMillis = 15000; // 15 seconds
    poolConfig.statement_timeout = 15000; // 15 seconds
    poolConfig.idleTimeoutMillis = 30000; // 30 seconds
    poolConfig.max = 3; // Reduced maximum number of clients for serverless
    poolConfig.allowExitOnIdle = true; // Allow process to exit when idle
    poolConfig.keepAlive = true; // Enable keep-alive connections
    poolConfig.keepAliveInitialDelayMillis = 10000; // 10 seconds
    
    pool = new Pool(poolConfig);
    db = drizzle({ client: pool, schema });
    
    console.log('Database connection established for migrations');
    
    // Test the connection with retry logic
    try {
      await pool.query('SELECT 1');
      console.log('Database connection test successful');
    } catch (testError: any) {
      console.warn('Database connection test failed, but continuing:', testError.message);
      // Don't exit here, let the actual migration queries fail if there's a real issue
    }
    
    // Run migrations
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations completed successfully');
    
    await pool.end();
    console.log('Migration process completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();