import { Pool } from "pg";
import dotenv from "dotenv";
import { createPostgresPoolConfig, describePoolConfig } from "./db-config.js";

dotenv.config();

console.log("Testing database connection...");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set in environment variables");
  console.error("Please set DATABASE_URL in your .env file to use a real database");
  process.exit(1);
}

const databaseUrl = DATABASE_URL;

async function testConnection() {
  let pool: Pool | null = null;

  try {
    console.log("Attempting to connect to database...");

    const poolConfig = createPostgresPoolConfig(databaseUrl, {
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAliveInitialDelayMillis: 10000,
    });

    console.log("Database pool config:", JSON.stringify(describePoolConfig(databaseUrl, poolConfig), null, 2));

    pool = new Pool(poolConfig);

    const result = await pool.query("SELECT version()");
    console.log("Database connection successful!");
    console.log("Database version:", result.rows[0].version);

    const testResult = await pool.query("SELECT 1 as test");
    console.log("Simple query test successful:", testResult.rows[0]);

    const nowResult = await pool.query("SELECT NOW()");
    console.log("Connection OK:", nowResult.rows[0]);

    await pool.end();
    console.log("Database test completed successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    if (pool) {
      try {
        await pool.end();
      } catch (endError) {
        console.error("Error closing database connection:", endError);
      }
    }
    process.exit(1);
  }
}

testConnection();
