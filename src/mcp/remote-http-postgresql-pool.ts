import { Pool } from "pg";

import type { PostgreSqlAuthorizationPool } from "./remote-http-authorization-data.js";

export const POSTGRESQL_DATABASE_URL_ENV = "NORMA_MCP_AUTHZ_DATABASE_URL";
export const POSTGRESQL_SSL_ENV = "NORMA_MCP_POSTGRES_SSL";
export const POSTGRESQL_CA_ENV = "NORMA_MCP_POSTGRES_CA";

const DEFAULT_POOL_MAX = 4;
const CONNECTION_TIMEOUT_MS = 10_000;
const IDLE_TIMEOUT_MS = 30_000;

export function createPostgreSqlPoolFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): PostgreSqlAuthorizationPool & { end(): Promise<void> } | undefined {
  if (environment.NORMA_MCP_AUTHZ_DATA_MODE !== "postgresql") {
    return undefined;
  }

  const connectionString = required(environment[POSTGRESQL_DATABASE_URL_ENV], POSTGRESQL_DATABASE_URL_ENV);
  const parsed = parseConnectionString(connectionString);
  const sslMode = environment[POSTGRESQL_SSL_ENV] ?? "require";
  if (sslMode !== "require" && !(environment.NODE_ENV === "test" && sslMode === "disable")) {
    throw new Error(`${POSTGRESQL_SSL_ENV} must be require outside isolated tests`);
  }
  const ca = environment[POSTGRESQL_CA_ENV];
  if (ca !== undefined && ca.trim() === "") {
    throw new Error(`${POSTGRESQL_CA_ENV} must not be empty when supplied`);
  }

  const pool = new Pool({
    connectionString: parsed,
    max: DEFAULT_POOL_MAX,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    allowExitOnIdle: false,
    ssl: sslMode === "require"
      ? {
        ...(ca === undefined ? {} : { ca }),
        rejectUnauthorized: true,
      }
      : false,
  });
  pool.on("error", () => {
    console.error(JSON.stringify({ event: "postgresql_pool_error" }));
  });
  return pool;
}

function parseConnectionString(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${POSTGRESQL_DATABASE_URL_ENV} must be a PostgreSQL connection URL`);
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(`${POSTGRESQL_DATABASE_URL_ENV} must be a PostgreSQL connection URL`);
  }
  if (parsed.hostname === "" || parsed.username === "" || parsed.password === "") {
    throw new Error(`${POSTGRESQL_DATABASE_URL_ENV} must include a PostgreSQL host and credentials`);
  }
  const embeddedSslMode = parsed.searchParams.get("sslmode");
  if (embeddedSslMode !== null && embeddedSslMode !== "require") {
    throw new Error(`${POSTGRESQL_DATABASE_URL_ENV} must not disable TLS`);
  }
  if (embeddedSslMode === "require") {
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  }
  return value;
}

function required(value: string | undefined, name: string): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required when PostgreSQL authorization mode is enabled`);
  }
  return value;
}
