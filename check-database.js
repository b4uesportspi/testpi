import pkg from 'pg';
const { Client } = pkg;

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ Error: No DATABASE_URL found');
  process.exit(1);
}

async function checkTable() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected!\n');

    // Check table structure
    console.log('📋 Packages table columns:');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'packages'
      ORDER BY ordinal_position
    `);

    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(15)} | ${row.is_nullable}`);
    });

    // Check 0.06 UC package
    console.log('\n🔍 0.06 UC Package:');
    const pkgResult = await client.query(`
      SELECT * FROM packages WHERE name = '0.06 UC' AND game = 'PUBG'
    `);

    if (pkgResult.rows.length > 0) {
      console.log(JSON.stringify(pkgResult.rows[0], null, 2));
    } else {
      console.log('Package not found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
