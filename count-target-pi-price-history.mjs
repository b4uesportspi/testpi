import { Client } from 'pg';

const dstConfig = {
  user: 'postgres.njjrfubudtoytvcjahjw',
  password: 'qyLg?8G&a!fYY!F',
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' },
};

async function main() {
  const client = new Client(dstConfig);
  await client.connect();
  const res = await client.query("SELECT count(*) AS cnt FROM public.pi_price_history");
  console.log('target pi_price_history count:', res.rows[0].cnt);
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
