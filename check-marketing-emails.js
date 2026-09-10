import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMarketingEmails() {
  try {
    const result = await pool.query(`
      SELECT
        username,
        email,
        created_at,
        metadata->>'last_marketing_email_sent' as last_marketing_sent,
        metadata->>'last_monthly_email_sent' as last_monthly_sent,
        metadata->>'monthly_email_count' as monthly_count
      FROM app_users
      WHERE metadata IS NOT NULL
        AND (metadata ? 'last_marketing_email_sent' OR metadata ? 'last_monthly_email_sent')
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('Users who have received marketing emails:');
    console.log('==========================================');
    result.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.username} (${user.email})`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Marketing: ${user.last_marketing_sent || 'Never'}`);
      console.log(`   Last Monthly: ${user.last_monthly_sent || 'Never'}`);
      console.log(`   Monthly Count: ${user.monthly_count || '0'}`);
      console.log('');
    });

    // Check total users
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM app_users WHERE email IS NOT NULL AND email != \'\'');
    console.log(`Total users with emails: ${totalResult.rows[0].total}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMarketingEmails();