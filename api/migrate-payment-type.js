import { execSync } from 'child_process';
import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Starting payment type migration...');
    await client.connect();

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

    await client.end();

    const schemaInfo = result.rows.map(row =>
      `${row.column_name}: ${row.data_type} (${row.is_nullable})`
    ).join('\n  ');

    console.log('✅ Migration completed successfully!');
    console.log('📋 Final schema:', schemaInfo);

    res.status(200).json({
      success: true,
      message: 'Payment type migration completed successfully!',
      schema: result.rows,
      summary: {
        package_id: 'nullable',
        payment_type: 'added with default TOKEN_PURCHASE',
        tournament_id: 'added',
        indexes: 'created for performance'
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();

    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
}