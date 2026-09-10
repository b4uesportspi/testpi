import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function addLastLoginColumn() {
  if (!db) {
    console.log('Database not initialized');
    process.exit(1);
  }

  try {
    console.log('Adding last_login column to app_users table...');
    
    // Add the last_login column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE app_users 
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
    `);
    
    console.log('Column added successfully');
    
    // Add a comment to explain the purpose
    await db.execute(sql`
      COMMENT ON COLUMN app_users.last_login IS 'Timestamp of user''s last successful login';
    `);
    
    console.log('Comment added successfully');
    
    // Verify the column was added
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'app_users' AND column_name = 'last_login';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ last_login column verified in app_users table');
      console.log('Column details:', result.rows[0]);
    } else {
      console.log('❌ last_login column not found');
    }
    
  } catch (error) {
    console.error('Error adding last_login column:', error);
  }
}

addLastLoginColumn();