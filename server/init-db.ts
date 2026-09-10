// Database initialization script
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('Initializing database tables...');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/esports_pi_market";

async function initDatabase() {
  let pool: Pool | null = null;
  
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, skipping database initialization');
      process.exit(0);
      return;
    }
    
    // Handle SSL configuration for PostgreSQL - Production settings
    let poolConfig: any = { connectionString: DATABASE_URL };
    
    // For PostgreSQL connections, especially Supabase, handle SSL properly for production
    if (DATABASE_URL.includes('supabase') || DATABASE_URL.includes('sslmode=require')) {
      poolConfig = { 
        connectionString: DATABASE_URL, 
        ssl: { 
          rejectUnauthorized: false // For Vercel serverless, temporary bypass certificate verification
        } 
      };
      
      console.log('Configuring SSL for Supabase connection with certificate bypass for Vercel');
    }
    
    // Add better timeouts for Vercel serverless environment
    poolConfig.connectionTimeoutMillis = 15000; // 15 seconds
    poolConfig.statement_timeout = 15000; // 15 seconds
    poolConfig.idleTimeoutMillis = 30000; // 30 seconds
    poolConfig.max = 3; // Reduced maximum number of clients for serverless
    poolConfig.allowExitOnIdle = true; // Allow process to exit when idle
    poolConfig.keepAlive = true; // Enable keep-alive connections
    poolConfig.keepAliveInitialDelayMillis = 10000; // 10 seconds
    
    console.log('Database pool config for init:', JSON.stringify(poolConfig, null, 2));
    
    pool = new Pool(poolConfig);
    
    console.log('Database connection established for initialization');
    
    // Test the connection with a more comprehensive test
    try {
      const result = await pool.query('SELECT version()');
      console.log('Database connection test successful:', result.rows[0].version);
    } catch (testError: any) {
      console.warn('Database connection test failed, but continuing:', testError.message);
    }
    
    // Create tables if they don't exist
    console.log('Creating tables...');
    
    // Users table - Use uuid_generate_v4() instead of gen_random_uuid() for better compatibility
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
        pi_uid TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'Bhutan',
        language TEXT NOT NULL DEFAULT 'en',
        wallet_address TEXT NOT NULL,
        game_accounts JSONB,
        social_accounts JSONB,
        referral_code TEXT UNIQUE,  -- Add UNIQUE constraint
        referred_by TEXT, -- New column to track who referred this user
        passphrase TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_profile_verified BOOLEAN NOT NULL DEFAULT false,
        tokens INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Packages table - Use uuid_generate_v4() instead of gen_random_uuid() for better compatibility
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS packages (
        id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
        game TEXT NOT NULL,
        name TEXT NOT NULL,
        in_game_amount INTEGER NOT NULL,
        usdt_value DECIMAL(10,4) NOT NULL,
        image TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Transactions table - Use uuid_generate_v4() instead of gen_random_uuid() for better compatibility
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR NOT NULL,
        package_id VARCHAR NOT NULL,
        payment_id TEXT NOT NULL UNIQUE,
        txid TEXT,
        pi_amount DECIMAL(18,8) NOT NULL,
        usd_amount DECIMAL(10,4) NOT NULL,
        pi_price_at_time DECIMAL(10,4) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        game_account JSONB NOT NULL,
        metadata JSONB,
        email_sent BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Admins table - Use uuid_generate_v4() instead of gen_random_uuid() for better compatibility
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Pi price history table - Use uuid_generate_v4() instead of gen_random_uuid() for better compatibility
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS pi_price_history (
        id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
        price DECIMAL(10,4) NOT NULL,
        source TEXT NOT NULL DEFAULT 'coingecko',
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Referral codes table - Separate table for referral codes
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE TABLE IF NOT EXISTS referral_codes (
        id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
        code TEXT NOT NULL UNIQUE,
        user_id VARCHAR NOT NULL,
        referred_by TEXT, -- referral code of the user who referred this user
        is_used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- Foreign key constraints
        CONSTRAINT fk_referral_codes_user 
          FOREIGN KEY (user_id) 
          REFERENCES app_users(id) 
          ON DELETE CASCADE
      )
    `);
    
    console.log('All tables created successfully');
    
    // Add some indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_pi_uid ON users(pi_uid);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      -- Indexes for referral codes table
      CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
      CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
      CREATE INDEX IF NOT EXISTS idx_referral_codes_referred_by ON referral_codes(referred_by);
    `);
    
    console.log('Indexes created successfully');
    
    // Create function to generate referral codes
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_referral_code()
      RETURNS TEXT AS $$
      BEGIN
          RETURN 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create function to automatically create referral code when user is created
    await pool.query(`
      CREATE OR REPLACE FUNCTION create_user_referral_code()
      RETURNS TRIGGER AS $$
      DECLARE
          new_code TEXT;
          code_exists BOOLEAN := true;
          attempts INTEGER := 0;
      BEGIN
          -- Try to generate a unique code (max 10 attempts)
          WHILE code_exists AND attempts < 10 LOOP
              new_code := generate_referral_code();
              -- Check if code already exists
              SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = new_code) INTO code_exists;
              attempts := attempts + 1;
          END LOOP;
          
          -- If we couldn't generate a unique code after 10 attempts, raise an error
          IF code_exists THEN
              RAISE EXCEPTION 'Unable to generate unique referral code after 10 attempts';
          END IF;
          
          -- Insert the new referral code
          INSERT INTO referral_codes (code, user_id, referred_by)
          VALUES (new_code, NEW.id, NEW.referred_by);
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create trigger to automatically create referral code when user is created
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_create_user_referral_code ON app_users;
      CREATE TRIGGER trigger_create_user_referral_code
          AFTER INSERT ON app_users
          FOR EACH ROW
          EXECUTE FUNCTION create_user_referral_code();
    `);
    
    console.log('Referral code functions and trigger created successfully');
    
    // Insert a default admin user if none exists
    const adminResult = await pool.query(`SELECT COUNT(*) FROM admins`);
    const adminCount = parseInt(adminResult.rows[0].count);
    
    if (adminCount === 0) {
      console.log('Creating default admin user...');
      // Note: In a real application, you should hash the password
      const adminEmail = process.env.ADMIN_EMAIL || 'info@b4uesports.com';
      // Use a more secure default password hash
      const defaultPasswordHash = '$2b$10$abcdefghijklmnopqrstuv.wxyz'; // This should be replaced with a proper hash
      await pool.query(`
        INSERT INTO admins (username, password, email, role)
        VALUES ('admin', '${defaultPasswordHash}', '${adminEmail}', 'admin')
      `);
      console.log('Default admin user created with email:', adminEmail);
      console.log('WARNING: Default admin password needs to be changed!');
    }
    
    await pool.end();
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    if (pool) {
      try {
        await pool.end();
      } catch (endError) {
        console.error('Error closing database connection:', endError);
      }
    }
    process.exit(1); // Exit with error code
  } finally {
    process.exit(0);
  }
}

initDatabase();