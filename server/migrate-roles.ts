import { pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function migrateRoles() {
  console.log("🚀 Migrating roles and chat tables...\n");

  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully!\n");

    // 1. Add role_id to app_users
    console.log("📋 Adding role_id to app_users...");
    await client.query(`
      ALTER TABLE app_users 
      ADD COLUMN IF NOT EXISTS role_id VARCHAR
    `);
    console.log("✅ Added role_id to app_users!\n");

    // 2. Create app_roles table
    console.log("📋 Creating app_roles table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_roles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(20) NOT NULL,
        permissions JSONB DEFAULT '[]'::jsonb,
        priority INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Created app_roles table!\n");

    // 3. Create app_rooms table
    console.log("📋 Creating app_rooms table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_rooms (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'general',
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Created app_rooms table!\n");

    // 4. Create app_messages table
    console.log("📋 Creating app_messages table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Created app_messages table!\n");

    console.log("\n✅ Database migration completed successfully!");
    
    // Seed default roles just in case
    await client.query(`
      INSERT INTO app_roles (name, color, priority) 
      VALUES 
        ('Admin', '#9333ea', 1),
        ('Leader', '#fbbf24', 2),
        ('Member', '#94a3b8', 99)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log("✅ Default roles seeded!\n");

    client.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateRoles();
