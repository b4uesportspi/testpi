#!/usr/bin/env node

// Apply payment type migration for production
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

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

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '0027_add_payment_type_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying payment type migration...');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Payment type migration applied successfully!');

    // Verify the changes
    console.log('🔍 Verifying schema changes...');
    const result = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'app_transactions'
      AND column_name IN ('package_id', 'payment_type', 'tournament_id')
      ORDER BY column_name
    `);

    console.log('📋 Updated transaction table schema:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });

    await client.end();
    console.log('🔌 Database connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyPaymentTypeMigration();</content>
<parameter name="filePath">c:\Users\HP\Downloads\testnet-main (1)\tourn\apply-payment-type-migration.js