import 'dotenv/config';
import fs from 'fs';
import pkg from 'pg';

const envPath = '.env.production';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function buildConnectionString(baseUrl, databaseName) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

const { Client } = pkg;
const candidates = ['postgres', 'postgresql'];
const baseUrl = process.env.DATABASE_URL;
let client;
let connected = false;

for (const candidate of candidates) {
  try {
    client = new Client({
      connectionString: buildConnectionString(baseUrl, candidate),
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    connected = true;
    console.log(`CONNECTED_TO:${candidate}`);
    break;
  } catch (error) {
    console.log(`FAILED_TO_CONNECT:${candidate}:${error.message}`);
    if (client) {
      try { await client.end(); } catch {}
    }
  }
}

if (!connected || !client) {
  throw new Error('Unable to connect to the database with any candidate database name.');
}

const target = await client.query(
  `SELECT id, username, wallet_address, wallet_verified_at, wallet_verified_payment_id, wallet_verified_txid
   FROM app_users
   WHERE lower(username) LIKE $1 OR lower(email) LIKE $2 OR lower(username) LIKE $3
   ORDER BY id`,
  ['%sita%', '%sita%', '%gurung%']
);

console.log(JSON.stringify(target.rows, null, 2));

if (target.rows.length > 0) {
  for (const row of target.rows) {
    await client.query(
      `UPDATE app_users
       SET wallet_address = NULL,
           wallet_verified_at = NULL,
           wallet_verified_payment_id = NULL,
           wallet_verified_txid = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [row.id]
    );
  }

  const updated = await client.query(
    `SELECT id, username, wallet_address, wallet_verified_at, wallet_verified_payment_id, wallet_verified_txid
     FROM app_users
     WHERE id = $1`,
    [target.rows[0].id]
  );

  console.log('UPDATED', JSON.stringify(updated.rows[0], null, 2));
} else {
  console.log('NO_MATCH');
}

await client.end();
