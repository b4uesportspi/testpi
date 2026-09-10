import fs from "fs";
import path from "path";

type PoolConfigOptions = {
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeoutMillis?: number;
  queryTimeoutMillis?: number;
  keepAliveInitialDelayMillis?: number;
  maxUses?: number;
};

export function sanitizeDatabaseUrl(databaseUrl: string): string {
  return databaseUrl.replace(/:[^:@/]+@/, ":***@");
}

function encodeDatabaseComponent(value: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

export function normalizeDatabaseUrl(databaseUrl: string): string {
  const trimmed = databaseUrl.trim();
  if (!trimmed) return trimmed;

  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (!schemeMatch) return trimmed;

  const scheme = schemeMatch[1];
  const rest = trimmed.slice(schemeMatch[0].length);
  const atSignIndex = rest.lastIndexOf("@");
  if (atSignIndex === -1) {
    return trimmed;
  }

  const userInfo = rest.slice(0, atSignIndex);
  const hostAndSuffix = rest.slice(atSignIndex + 1);
  const authorityEnd = hostAndSuffix.search(/[/?#]/);
  const host = authorityEnd === -1 ? hostAndSuffix : hostAndSuffix.slice(0, authorityEnd);
  const suffix = authorityEnd === -1 ? "" : hostAndSuffix.slice(authorityEnd);

  if (!userInfo || !host) {
    return trimmed;
  }

  const separatorIndex = userInfo.indexOf(":");
  const username = separatorIndex >= 0 ? userInfo.slice(0, separatorIndex) : userInfo;
  const password = separatorIndex >= 0 ? userInfo.slice(separatorIndex + 1) : "";
  const normalizedUsername = encodeDatabaseComponent(username);
  const normalizedPassword = password ? `:${encodeDatabaseComponent(password)}` : "";

  return `${scheme}://${normalizedUsername}${normalizedPassword}@${host}${suffix}`;
}

export function isSupabaseDatabase(databaseUrl: string): boolean {
  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl);
  return normalizedDatabaseUrl.includes("supabase");
}

export function isSupabaseDirectConnection(databaseUrl: string): boolean {
  try {
    const url = new URL(normalizeDatabaseUrl(databaseUrl));
    return url.hostname.startsWith("db.") && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function isSupabasePoolerConnection(databaseUrl: string): boolean {
  try {
    const url = new URL(normalizeDatabaseUrl(databaseUrl));
    return url.hostname.endsWith(".pooler.supabase.com");
  } catch {
    return false;
  }
}

export function assertDatabaseUrlSupported(databaseUrl: string, options: { isVercel?: boolean } = {}) {
  if (options.isVercel && isSupabaseDirectConnection(databaseUrl)) {
    throw new Error(
      "Unsupported DATABASE_URL for Vercel: Supabase direct database URLs are IPv6-only by default. " +
        "Use the Supabase pooler connection string for serverless deployments, preferably transaction mode on port 6543."
    );
  }
}

function readSupabaseCa(): string | undefined {
  const certPath = path.join(process.cwd(), "certs", "supabase-ca.crt");
  if (!fs.existsSync(certPath)) {
    return undefined;
  }

  return fs.readFileSync(certPath, "utf8");
}

export function createPostgresPoolConfig(databaseUrl: string, options: PoolConfigOptions = {}) {
  const normalizedDatabaseUrl = normalizeDatabaseUrl(databaseUrl);
  const poolConfig: any = {
    connectionString: normalizedDatabaseUrl,
    max: options.max ?? 3,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30000,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 15000,
    allowExitOnIdle: true,
    keepAlive: true,
    keepAliveInitialDelayMillis: options.keepAliveInitialDelayMillis ?? 10000,
  };

  if (options.min !== undefined) poolConfig.min = options.min;
  if (options.maxUses !== undefined) poolConfig.maxUses = options.maxUses;
  if (options.statementTimeoutMillis !== undefined) poolConfig.statement_timeout = options.statementTimeoutMillis;
  if (options.queryTimeoutMillis !== undefined) poolConfig.query_timeout = options.queryTimeoutMillis;

  const needsSsl = isSupabaseDatabase(normalizedDatabaseUrl) || normalizedDatabaseUrl.includes("sslmode=require");
  if (needsSsl) {
    const ca = readSupabaseCa();
    poolConfig.ssl = ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false };
  }

  return poolConfig;
}

export function describePoolConfig(databaseUrl: string, poolConfig: any) {
  return {
    connectionString: sanitizeDatabaseUrl(databaseUrl),
    isSupabase: isSupabaseDatabase(databaseUrl),
    isSupabaseDirectConnection: isSupabaseDirectConnection(databaseUrl),
    isSupabasePoolerConnection: isSupabasePoolerConnection(databaseUrl),
    hasSSL: Boolean(poolConfig.ssl),
    verifiesCertificate: Boolean(poolConfig.ssl?.rejectUnauthorized),
    maxConnections: poolConfig.max,
    connectionTimeout: poolConfig.connectionTimeoutMillis,
  };
}
