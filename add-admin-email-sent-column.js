import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = process.env.DATABASE_URL || '';

async function runMigration() {
  const client = new Client({ 
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Add admin_email_sent column if it doesn't exist
    await client.query(`
      ALTER TABLE app_transactions 
      ADD COLUMN IF NOT EXISTS admin_email_sent BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✅ Added admin_email_sent column to app_transactions');

    // Verify column exists
    const check = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'app_transactions' AND column_name = 'admin_email_sent'
    `);
    
    if (check.rows.length > 0) {
      console.log('✅ Column verified:', check.rows[0]);
    } else {
      console.error('❌ Column not found after migration!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

runMigration().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
