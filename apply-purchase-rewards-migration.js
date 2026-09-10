#!/usr/bin/env node
/**
 * Emergency Migration: Apply missing purchase rewards tracking columns
 * 
 * This script applies the 0008_add_purchase_rewards_tracking migration
 * which adds successful_purchases_count and last_reward_milestone columns to app_users
 * 
 * Usage: node apply-purchase-rewards-migration.js
 * 
 * Ensure DATABASE_URL environment variable is set before running
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'migrations', '0008_add_purchase_rewards_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📋 Executing migration: Add purchase rewards tracking columns...');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration executed successfully');

    // Verify the columns exist
    const verificationQuery = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'app_users' 
      AND column_name IN ('successful_purchases_count', 'last_reward_milestone')
      ORDER BY column_name;
    `;

    const result = await client.query(verificationQuery);
    
    if (result.rows.length === 2) {
      console.log('✅ Verification successful - columns created:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.warn('⚠️  Warning: Expected 2 columns, found', result.rows.length);
      console.log('Columns found:', result.rows);
    }

    client.release();
    console.log('✅ Migration completed successfully!');
    console.log('📝 Next steps: Restart your application server to use the new columns');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
