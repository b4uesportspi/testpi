import dotenv from 'dotenv';
import { db } from './server/db.js';
import { sql } from "drizzle-orm";

// Load environment variables
dotenv.config();

async function checkDatabaseSchema() {
  console.log('Checking database schema...');
  
  try {
    if (!db) {
      console.log('Database not initialized');
      return;
    }
    
    // Check if users table exists and its structure
    console.log('Checking users table structure...');
    const usersTableInfo = await db.execute(
      sql`SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position;`
    );
    
    console.log('Users table columns:');
    usersTableInfo.rows.forEach((row: any) => {
      console.log(`- ${row.column_name} (${row.data_type}, ${row.is_nullable})`);
    });
    
    // Check if packages table exists and its structure
    console.log('\nChecking packages table structure...');
    const packagesTableInfo = await db.execute(
      sql`SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'packages' 
          ORDER BY ordinal_position;`
    );
    
    console.log('Packages table columns:');
    packagesTableInfo.rows.forEach((row: any) => {
      console.log(`- ${row.column_name} (${row.data_type}, ${row.is_nullable})`);
    });
    
    // Check if transactions table exists and its structure
    console.log('\nChecking transactions table structure...');
    const transactionsTableInfo = await db.execute(
      sql`SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'transactions' 
          ORDER BY ordinal_position;`
    );
    
    console.log('Transactions table columns:');
    transactionsTableInfo.rows.forEach((row: any) => {
      console.log(`- ${row.column_name} (${row.data_type}, ${row.is_nullable})`);
    });
    
    // Check if admins table exists and its structure
    console.log('\nChecking admins table structure...');
    const adminsTableInfo = await db.execute(
      sql`SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'admins' 
          ORDER BY ordinal_position;`
    );
    
    console.log('Admins table columns:');
    adminsTableInfo.rows.forEach((row: any) => {
      console.log(`- ${row.column_name} (${row.data_type}, ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error checking database schema:', error);
  }
}

checkDatabaseSchema();