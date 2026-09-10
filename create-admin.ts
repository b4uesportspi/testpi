import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { db } from './server/db.js';
import * as schema from './shared/schema.js';
import { eq } from "drizzle-orm";

// Load environment variables
dotenv.config();

async function createAdmin() {
  console.log('Creating admin account...');
  
  try {
    if (!db) {
      console.log('Database not initialized');
      return;
    }
    
    const adminData = {
      username: 'admin',
      password: await bcrypt.hash('admin123', 10), // Hash the password
      email: process.env.ADMIN_EMAIL || 'info@b4uesports.com',
      role: 'admin',
      isActive: true,
    };
    
    // Check if admin already exists
    const existingAdmins = await db.select().from(schema.admins).where(eq(schema.admins.username, 'admin'));
    if (existingAdmins.length > 0) {
      console.log('Admin already exists');
      return;
    }
    
    // Create new admin
    // @ts-ignore - Drizzle ORM types are complex with JSON fields
    const [newAdmin] = await db.insert(schema.admins).values(adminData).returning();
    console.log('Admin created successfully:', newAdmin);
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();