import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema.js";
import * as dotenv from "dotenv";
import { assertDatabaseUrlSupported, createPostgresPoolConfig, describePoolConfig, normalizeDatabaseUrl } from "./db-config.js";

dotenv.config();

const rawDatabaseUrl = process.env.DATABASE_URL;
if (!rawDatabaseUrl) throw new Error("FATAL: DATABASE_URL not set");
const DATABASE_URL = normalizeDatabaseUrl(rawDatabaseUrl);

let pool: Pool;
let db: ReturnType<typeof drizzle>;
let isMockDatabase = false;
const globalDb = globalThis as any;
const isVercel = Boolean(process.env.VERCEL);

if (!globalDb.pool) {
  assertDatabaseUrlSupported(DATABASE_URL, { isVercel });

  const poolConfig = createPostgresPoolConfig(DATABASE_URL, {
    max: isVercel ? 1 : 5,
    min: 0,
    idleTimeoutMillis: isVercel ? 5000 : 20000,
    connectionTimeoutMillis: isVercel ? 5000 : 15000,
    keepAliveInitialDelayMillis: isVercel ? 1000 : 10000,
    maxUses: isVercel ? 50 : 500,
    queryTimeoutMillis: 20000,
  });

  try {
    console.log("Initializing database pool with config:", describePoolConfig(DATABASE_URL, poolConfig));

    pool = new Pool(poolConfig);
    db = drizzle({ client: pool, schema });

    pool.on("connect", () => {
      console.log("Database pool connection established");
    });

    pool.on("error", (err: Error) => {
      console.error("Database pool error:", err.message);
    });

    pool.on("remove", () => {
      console.log("Database connection removed from pool");
    });

    if (!isVercel) {
      setTimeout(async () => {
        try {
          const client = await pool.connect();
          console.log("Initial database connection test successful");
          client.release();
        } catch (error: any) {
          console.error("Initial database connection test failed:", error.message);
        }
      }, 100);
    }

    globalDb.pool = pool;
    globalDb.db = db;
    globalDb.__b4uApiPool = pool;
    console.log("Database pool initialized successfully");

    void ensureTransactionColumnsExist();
    void ensureTournamentResultColumnsExist();
  } catch (error) {
    console.error("Failed to initialize database pool:", error);
    throw error;
  }
} else {
  pool = globalDb.pool;
  db = globalDb.db ?? drizzle({ client: pool, schema });
  globalDb.db = db;
  globalDb.__b4uApiPool = pool;
  console.log("Reusing existing database pool");

  void ensureTransactionColumnsExist();
  void ensureTournamentResultColumnsExist();
}

async function ensureTransactionColumnsExist(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE app_transactions
      ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'TOKEN_PURCHASE';
      ALTER TABLE app_transactions
      ADD COLUMN IF NOT EXISTS tournament_id TEXT;
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_type ON app_transactions(payment_type);
      CREATE INDEX IF NOT EXISTS idx_transactions_tournament_id ON app_transactions(tournament_id);
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'app_transactions'
            AND column_name = 'package_id'
        ) THEN
          EXECUTE 'ALTER TABLE app_transactions ALTER COLUMN package_id DROP NOT NULL';
        END IF;
      END$$;
    `);
    console.log("Verified app_transactions includes payment_type, tournament_id and nullable package_id");
  } catch (error: any) {
    console.error("Failed to verify or migrate app_transactions columns:", error.message || error);
  }
}

async function ensureTournamentResultColumnsExist(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE tournament_match_results ADD COLUMN IF NOT EXISTS wwcd boolean NOT NULL DEFAULT false;
      ALTER TABLE tournament_match_results ADD COLUMN IF NOT EXISTS placement_points integer NOT NULL DEFAULT 0;
      ALTER TABLE tournament_leaderboards ADD COLUMN IF NOT EXISTS wwcd_count integer NOT NULL DEFAULT 0;
      ALTER TABLE tournament_leaderboards ADD COLUMN IF NOT EXISTS prize_pi numeric(18,8) NOT NULL DEFAULT 0;
      ALTER TABLE tournament_leaderboards ADD COLUMN IF NOT EXISTS prize_status text NOT NULL DEFAULT 'not_awarded';
      ALTER TABLE tournament_leaderboards ADD COLUMN IF NOT EXISTS wins integer NOT NULL DEFAULT 0;
    `);
    console.log("Verified tournament match results and leaderboard schema columns exist");
  } catch (error: any) {
    console.error("Failed to verify or migrate tournament result schema columns:", error.message || error);
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.error("Database health check timed out");
      resolve(false);
    }, 5000);

    pool.query("SELECT NOW()")
      .then(() => {
        clearTimeout(timeout);
        resolve(true);
      })
      .catch((error: any) => {
        clearTimeout(timeout);
        console.error("Database health check failed:", error.message);
        resolve(false);
      });
  });
}

export function getPoolStats() {
  if (!pool) return null;
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

export { pool, db, isMockDatabase };
