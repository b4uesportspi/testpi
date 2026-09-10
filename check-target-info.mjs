import { Client } from 'pg';

const cfg = {
  user: 'postgres.njjrfubudtoytvcjahjw',
  password: 'qyLg?8G&a!fYY!F',
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false, servername: 'aws-0-ap-southeast-1.pooler.supabase.com' },
};

async function main(){
  const c = new Client(cfg);
  await c.connect();
  const userRes = await c.query('SELECT current_user as user');
  const schemas = await c.query("SELECT schema_name FROM information_schema.schemata ORDER BY schema_name");
  const hasPublic = schemas.rows.some(r=>r.schema_name==='public');
  console.log('current_user:', userRes.rows[0].user);
  console.log('public schema exists:', hasPublic);
  console.log('schemas count:', schemas.rows.length);
  await c.end();
}

main().catch(e=>{ console.error(e); process.exit(1); });
