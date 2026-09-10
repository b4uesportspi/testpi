// Backfill referral codes for existing users
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function backfillReferralCodes() {
  console.log('Backfilling referral codes for existing users...');
  
  try {
    // Find users without referral codes
    const usersWithoutCodesResult = await pool.query(`
      SELECT id, username, referred_by 
      FROM app_users 
      WHERE id NOT IN (SELECT user_id FROM referral_codes)
      ORDER BY created_at ASC;
    `);
    
    console.log(`Found ${usersWithoutCodesResult.rows.length} users without referral codes`);
    
    if (usersWithoutCodesResult.rows.length === 0) {
      console.log('All users already have referral codes');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Generate referral codes for each user
    for (const user of usersWithoutCodesResult.rows) {
      try {
        // Generate a unique referral code
        let newCode;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
          const codeResult = await pool.query('SELECT generate_referral_code() as code;');
          newCode = codeResult.rows[0].code;
          
          // Check if code already exists
          const existsResult = await pool.query(
            'SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = $1) as exists;',
            [newCode]
          );
          
          isUnique = !existsResult.rows[0].exists;
          attempts++;
        }
        
        if (!isUnique) {
          throw new Error('Unable to generate unique referral code after 10 attempts');
        }
        
        // Insert the referral code
        await pool.query(`
          INSERT INTO referral_codes (code, user_id, referred_by)
          VALUES ($1, $2, $3);
        `, [newCode, user.id, user.referred_by || null]);
        
        console.log(`✅ Generated referral code ${newCode} for user ${user.username}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to generate referral code for user ${user.username}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nBackfill complete: ${successCount} successful, ${errorCount} errors`);
    
  } catch (error) {
    console.error('Error during referral code backfill:', error.message);
  } finally {
    await pool.end();
  }
}

backfillReferralCodes();