// Script to set up the database with our custom tables
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('Setting up database with custom tables...');

// Use PostgreSQL for migrations
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/esports_pi_market";

async function setupDatabase() {
  let pool: Pool;
  
  try {
    // Use the connection string directly to preserve the pooler URL format for Supabase
    let poolConfig: any = { connectionString: DATABASE_URL };
    
    // Handle SSL configuration for PostgreSQL connections - Production settings
    if (DATABASE_URL.includes('sslmode=require') || DATABASE_URL.includes('supabase')) {
      poolConfig = { 
        connectionString: DATABASE_URL, 
        ssl: { 
          rejectUnauthorized: true // Production: validate SSL certificate
        } 
      };
    }
    
    // Handle SSL configuration for PostgreSQL connections - Vercel serverless settings
    if (DATABASE_URL.includes('vercel')) {
      poolConfig = { 
        connectionString: DATABASE_URL, 
        ssl: { 
          rejectUnauthorized: false // For Vercel serverless, temporary bypass certificate verification
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
    
    console.log('Database connection established');
    
    // Test the connection with better error handling
    try {
      await pool.query('SELECT 1');
      console.log('Database connection test successful');
    } catch (testError: any) {
      console.warn('Database connection test failed, but continuing:', testError.message);
    }
    
    // Drop existing conflicting tables if they exist
    console.log('Dropping existing tables if they exist...');
    await pool.query('DROP TABLE IF EXISTS transactions, packages, users, admins, pi_price_history CASCADE');
    console.log('Existing tables dropped');
    
    // Create our new tables
    console.log('Creating new tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        pi_uid text NOT NULL UNIQUE,
        username text NOT NULL,
        email text NOT NULL,
        phone text NOT NULL,
        country text DEFAULT 'Bhutan' NOT NULL,
        language text DEFAULT 'en' NOT NULL,
        wallet_address text NOT NULL,
        game_accounts jsonb,
        social_accounts jsonb,
        referral_code text,
        passphrase text,
        is_active boolean DEFAULT true NOT NULL,
        is_profile_verified boolean DEFAULT false NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    
    // Create packages table
    await pool.query(`
      CREATE TABLE packages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        game text NOT NULL,
        name text NOT NULL,
        in_game_amount integer NOT NULL,
        usdt_value numeric(10, 4) NOT NULL,
        image text NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    
    // Create admins table
    await pool.query(`
      CREATE TABLE admins (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        password text NOT NULL,
        email text NOT NULL,
        role text DEFAULT 'admin' NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        last_login timestamp,
        created_at timestamp DEFAULT now()
      )
    `);
    
    // Create pi_price_history table
    await pool.query(`
      CREATE TABLE pi_price_history (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        price numeric(10, 4) NOT NULL,
        source text DEFAULT 'coingecko' NOT NULL,
        timestamp timestamp DEFAULT now()
      )
    `);
    
    // Create transactions table
    await pool.query(`
      CREATE TABLE transactions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id),
        package_id varchar REFERENCES packages(id),
        payment_id text NOT NULL UNIQUE,
        txid text,
        pi_amount numeric(18, 8) NOT NULL,
        usd_amount numeric(10, 4) NOT NULL,
        pi_price_at_time numeric(10, 4) NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        game_account jsonb NOT NULL,
        metadata jsonb,
        payment_type text NOT NULL DEFAULT 'TOKEN_PURCHASE',
        tournament_id text,
        email_sent boolean DEFAULT false NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    
    console.log('All tables created successfully');
    
    await pool.end();
    console.log('Database setup completed');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

setupDatabase();