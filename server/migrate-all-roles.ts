import { pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function migrateRoles() {
  console.log("🚀 Migrating all roles...\n");

  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully!\n");

    const roles = [
      { name: 'Owner', color: '#ef4444', priority: 0 },
      { name: 'Admin', color: '#9333ea', priority: 1 },
      { name: 'Moderator', color: '#3b82f6', priority: 2 },
      { name: 'Leader', color: '#fbbf24', priority: 3 },
      { name: 'Verified Player', color: '#06b6d4', priority: 4 },
      { name: 'Member', color: '#94a3b8', priority: 99 }
    ];

    for (const role of roles) {
      await client.query(`
        INSERT INTO app_roles (name, color, priority) 
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE 
        SET color = $2, priority = $3;
      `, [role.name, role.color, role.priority]);
      console.log(`✅ Upserted role: ${role.name}`);
    }

    console.log("\n✅ Database migration completed successfully!");
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateRoles();
