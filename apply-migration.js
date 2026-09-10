#!/usr/bin/env node

// Apply database migration
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '0017_add_total_spent_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration:', migrationPath);
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('Migration applied successfully');
    
    // Test the new column
    console.log('Testing new total_spent column...');
    const testResult = await client.query(`
      SELECT id, username, total_spent 
      FROM app_users 
      WHERE total_spent > 0 
      LIMIT 5
    `);
    
    console.log('Users with spending:');
    testResult.rows.forEach(row => {
      console.log(`  ${row.username}: ${row.total_spent} π`);
    });
    
    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Migration failed:', error);
    await client.end();
    process.exit(1);
  }
}

applyMigration();