import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('🔄 Running metadata column migration...');

    // Read the SQL file
    const sql = fs.readFileSync('add-metadata-column.sql', 'utf8');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Metadata column added successfully!');

    // Verify the column exists
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'app_users' AND column_name = 'metadata'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Metadata column verified in database');
    } else {
      console.log('❌ Metadata column not found after migration');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();