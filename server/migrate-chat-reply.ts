import { pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

async function migrateChatReply() {
  console.log("🚀 Migrating app_messages to add reply_to_id...\n");

  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully!\n");

    await client.query(`
      ALTER TABLE app_messages 
      ADD COLUMN IF NOT EXISTS reply_to_id VARCHAR(255);
    `);
    
    console.log("\n✅ Database migration completed successfully!");
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateChatReply();
