/**
 * Production Database Update Script
 * This will connect to your Vercel PostgreSQL database and deactivate the 0.06 UC package
 * 
 * BEFORE RUNNING: You need to install pg (PostgreSQL client)
 * Run: npm install pg
 */

import pkg from 'pg';
const { Client } = pkg;

// Get DATABASE_URL from environment variables
// On Vercel, this is typically set as POSTGRES_URL or DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ Error: No DATABASE_URL found in environment variables');
  console.log('\n💡 Please set your DATABASE_URL environment variable:');
  console.log('   export DATABASE_URL="postgresql://user:password@host:port/database"');
  console.log('\n   Or create a .env file with:');
  console.log('   DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

async function deactivateTestPackage() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Required for most cloud PostgreSQL providers
    }
  });

  try {
    console.log('🔌 Connecting to production database...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Check current status first
    console.log('📊 Checking current 0.06 UC package status...');
    const checkQuery = `
      SELECT id, name, game, is_active, usdt_value
      FROM packages
      WHERE name = '0.06 UC' AND game = 'PUBG'
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ 0.06 UC package not found in database!');
      return;
    }

    const currentStatus = checkResult.rows[0];
    console.log(`\nCurrent Status:`);
    console.log(`   Package ID: ${currentStatus.id}`);
    console.log(`   Name: ${currentStatus.name}`);
    console.log(`   Game: ${currentStatus.game}`);
    console.log(`   is_active: ${currentStatus.is_active ? '✅ TRUE (VISIBLE)' : '❌ FALSE (HIDDEN)'}`);
    console.log(`   USDT Value: ${currentStatus.usdt_value}\n`);

    if (!currentStatus.is_active) {
      console.log('✅ Package is already deactivated! No changes needed.\n');
      return;
    }

    // Update the package
    console.log('🔄 Deactivating 0.06 UC package...\n');
    const updateQuery = `
      UPDATE packages
      SET is_active = false, updated_at = NOW()
      WHERE name = '0.06 UC' AND game = 'PUBG'
      RETURNING id, name, is_active, updated_at
    `;

    const updateResult = await client.query(updateQuery);
    const updated = updateResult.rows[0];

    console.log('✅ SUCCESS! Package deactivated!\n');
    console.log('Updated Details:');
    console.log(`   Package ID: ${updated.id}`);
    console.log(`   Name: ${updated.name}`);
    console.log(`   New Status: ${updated.isActive ? '✅ ACTIVE' : '❌ HIDDEN'}`);
    console.log(`   Updated At: ${updated.updatedAt}\n`);

    // Verify the change
    console.log('🔍 Verifying the update...');
    const verifyResult = await client.query(checkQuery);
    const verified = verifyResult.rows[0];
    
    if (!verified.isActive) {
      console.log('✅ Verification successful! Package is now HIDDEN.\n');
      console.log('='.repeat(80));
      console.log('🎉 DEPLOYMENT COMPLETE!');
      console.log('='.repeat(80));
      console.log('\nThe 0.06 UC package will disappear from your website within seconds.');
      console.log('No server restart required - the change is immediate!\n');
      console.log('Visit: https://b4uesportstest.vercel.app/api/packages');
      console.log('You should see "isActive": false for the 0.06 UC package.\n');
    } else {
      console.error('❌ Verification failed! Package is still active.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    
    if (error.message.includes('DATABASE_URL')) {
      console.log('\n💡 Make sure your DATABASE_URL environment variable is set correctly.');
    } else if (error.message.includes('connection')) {
      console.log('\n💡 Check your database connection details and network access.');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the update
deactivateTestPackage();

