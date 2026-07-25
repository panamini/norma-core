import {
  createPostgreSqlAuthorizationDataAdapter,
} from "./remote-http-authorization-data.js";
import type {
  AuthorizationDataAdapter,
  AuthorizationDataRecord,
  PostgreSqlAuthorizationConnection,
  PostgreSqlAuthorizationDataAdapterOptions,
  PostgreSqlAuthorizationPool,
  PostgreSqlAuthorizationSettingNames,
} from "./remote-http-authorization-data.js";

export const POSTGRESQL_SANDBOX_SCHEMA = "norma_sandbox";
export const POSTGRESQL_SANDBOX_TABLE = "authorized_records";

export const POSTGRESQL_SANDBOX_SETTING_NAMES: PostgreSqlAuthorizationSettingNames = Object.freeze({
  subject: "norma.auth_subject",
  tenant: "norma.auth_tenant",
  scopes: "norma.auth_scopes",
  audience: "norma.auth_audience",
  expiresAt: "norma.auth_expires_at",
});

export const POSTGRESQL_SANDBOX_READ_RECORD_SQL = `
SELECT id, tenant, payload
FROM ${POSTGRESQL_SANDBOX_SCHEMA}.${POSTGRESQL_SANDBOX_TABLE}
WHERE id = $1
  AND tenant = current_setting('norma.auth_tenant', true)
  AND subject = current_setting('norma.auth_subject', true)
LIMIT 1
`.trim();

export const POSTGRESQL_SANDBOX_ROLE_CONTRACT = Object.freeze({
  required: Object.freeze([
    "connect to the sandbox database",
    "USAGE on schema norma_sandbox",
    "SELECT on norma_sandbox.authorized_records",
    "NOBYPASSRLS",
    "not SUPERUSER",
  ]),
  forbidden: Object.freeze([
    "SUPERUSER",
    "BYPASSRLS",
    "CREATE ROLE",
    "CREATE DATABASE",
    "service_role",
    "supabase_service_key",
  ]),
});

export interface PostgreSqlQueryResult {
  readonly rows?: readonly unknown[];
}

export interface PostgreSqlSandboxAuthorizationAdapterOptions
  extends Omit<PostgreSqlAuthorizationDataAdapterOptions, "readRecord"> {
  readonly pool: PostgreSqlAuthorizationPool;
}

export function createPostgreSqlSandboxAuthorizationDataAdapter(
  options: PostgreSqlSandboxAuthorizationAdapterOptions,
): AuthorizationDataAdapter {
  return createPostgreSqlAuthorizationDataAdapter({
    ...options,
    readRecord: readSandboxRecord,
  });
}

export function createPostgreSqlSandboxSchemaSql(
  roleName = "norma_sandbox_user",
): string {
  const role = quoteIdentifier(roleName);
  return [
    `ALTER ROLE ${role} NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;`,
    `CREATE SCHEMA ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)};`,
    `CREATE TABLE ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)}.${quoteIdentifier(POSTGRESQL_SANDBOX_TABLE)} (`
      + "id text PRIMARY KEY, "
      + "tenant text NOT NULL, "
      + "subject text NOT NULL, "
      + "payload jsonb NOT NULL"
      + ");",
    `ALTER TABLE ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)}.${quoteIdentifier(POSTGRESQL_SANDBOX_TABLE)} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)}.${quoteIdentifier(POSTGRESQL_SANDBOX_TABLE)} FORCE ROW LEVEL SECURITY;`,
    `CREATE POLICY norma_sandbox_tenant_subject_policy ON ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)}.${quoteIdentifier(POSTGRESQL_SANDBOX_TABLE)}`
      + " USING ("
      + "tenant = current_setting('norma.auth_tenant', true)"
      + " AND subject = current_setting('norma.auth_subject', true)"
      + " AND current_setting('norma.auth_audience', true) IS NOT NULL"
      + " AND current_setting('norma.auth_expires_at', true)::bigint > extract(epoch FROM clock_timestamp())::bigint"
      + " AND current_setting('norma.auth_scopes', true)::jsonb @> '[\"norma:structured-analyze\"]'::jsonb"
      + ");",
    `REVOKE ALL ON ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)}.${quoteIdentifier(POSTGRESQL_SANDBOX_TABLE)} FROM PUBLIC;`,
    `REVOKE ALL ON SCHEMA ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)} FROM PUBLIC;`,
    `GRANT USAGE ON SCHEMA ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)} TO ${role};`,
    `GRANT SELECT ON ${quoteIdentifier(POSTGRESQL_SANDBOX_SCHEMA)}.${quoteIdentifier(POSTGRESQL_SANDBOX_TABLE)} TO ${role};`,
  ].join("\n");
}

export const POSTGRESQL_SANDBOX_TEARDOWN_SQL = [
  `DROP TABLE IF EXISTS ${POSTGRESQL_SANDBOX_SCHEMA}.${POSTGRESQL_SANDBOX_TABLE};`,
  `DROP SCHEMA IF EXISTS ${POSTGRESQL_SANDBOX_SCHEMA};`,
].join("\n");

async function readSandboxRecord(
  connection: PostgreSqlAuthorizationConnection,
  recordId: string,
): Promise<AuthorizationDataRecord | null> {
  const result = await connection.query(POSTGRESQL_SANDBOX_READ_RECORD_SQL, [recordId]) as PostgreSqlQueryResult;
  if (!Array.isArray(result.rows)) {
    throw new Error("PostgreSQL sandbox record query returned an invalid result");
  }
  if (result.rows.length === 0) {
    return null;
  }
  if (result.rows.length !== 1) {
    throw new Error("PostgreSQL sandbox record query returned duplicate rows");
  }
  const row = result.rows[0];
  if (!isRecord(row) || !isNonEmptyString(row.id) || !isNonEmptyString(row.tenant)
    || !Object.hasOwn(row, "payload")) {
    throw new Error("PostgreSQL sandbox record query returned an invalid row");
  }
  return Object.freeze({
    id: row.id,
    tenant: row.tenant,
    payload: row.payload,
  });
}

function quoteIdentifier(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/u.test(value)) {
    throw new Error("PostgreSQL sandbox role name is invalid");
  }
  return `"${value}"`;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
