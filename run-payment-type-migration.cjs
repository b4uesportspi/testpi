#!/usr/bin/env node

// Apply payment type migration for production
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function applyPaymentTypeMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Step 1: Make package_id nullable
    console.log('📝 Step 1: Making package_id nullable...');
    await client.query(`
      ALTER TABLE app_transactions
      ALTER COLUMN package_id DROP NOT NULL;
    `);
    console.log('✅ package_id is now nullable');

    // Step 2: Add payment_type column
    console.log('📝 Step 2: Adding payment_type column...');
    await client.query(`
      ALTER TABLE app_transactions
      ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'TOKEN_PURCHASE';
    `);
    console.log('✅ payment_type column added');

    // Step 3: Add tournament_id column
    console.log('📝 Step 3: Adding tournament_id column...');
    await client.query(`
      ALTER TABLE app_transactions
      ADD COLUMN IF NOT EXISTS tournament_id TEXT;
    `);
    console.log('✅ tournament_id column added');

    // Step 4: Add indexes
    console.log('📝 Step 4: Adding performance indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_type ON app_transactions(payment_type);
      CREATE INDEX IF NOT EXISTS idx_transactions_tournament_id ON app_transactions(tournament_id);
    `);
    console.log('✅ Indexes added');

    // Step 5: Verify the schema
    console.log('🔍 Verifying schema changes...');
    const result = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'app_transactions'
      AND column_name IN ('package_id', 'payment_type', 'tournament_id')
      ORDER BY column_name
    `);

    console.log('✅ Migration completed successfully!');
    console.log('📋 Final schema:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });

    await client.end();

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyPaymentTypeMigration();