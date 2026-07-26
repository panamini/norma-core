import type {
  PostgreSqlAuthorizationConnection,
  PostgreSqlAuthorizationPool,
} from "./remote-http-authorization-data.js";
import type {
  RemoteMcpRevocationEvent,
  RemoteMcpRevocationLookup,
  RemoteMcpRevocationRegistry,
  RemoteMcpRevocationWriter,
} from "./remote-http-revocation.js";
import {
  assertValidRemoteMcpRevocationEvent,
  assertValidRemoteMcpRevocationLookup,
} from "./remote-http-revocation.js";

/**
 * Shared, additive sandbox registry. The runtime role receives SELECT only;
 * schema creation and writes remain operator-only actions.
 */
export const REMOTE_MCP_REVOCATION_TABLE = "norma_sandbox.remote_mcp_revocations";

const ROLE_VALIDATION_SQL = `
  SELECT
    current_user,
    rolsuper,
    rolbypassrls,
    rolcreatedb,
    rolcreaterole,
    rolinherit,
    has_schema_privilege(current_user, 'norma_sandbox', 'USAGE') AS schema_usage,
    has_table_privilege(current_user, '${REMOTE_MCP_REVOCATION_TABLE}', 'SELECT') AS table_select,
    has_table_privilege(current_user, '${REMOTE_MCP_REVOCATION_TABLE}', 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') AS table_write,
    COALESCE((
      SELECT c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'norma_sandbox'
        AND c.relname = 'remote_mcp_revocations'
    ), false) AS rls_enabled,
    COALESCE((
      SELECT c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'norma_sandbox'
        AND c.relname = 'remote_mcp_revocations'
    ), false) AS rls_forced,
    EXISTS (
      SELECT 1
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'norma_sandbox'
        AND c.relname = 'remote_mcp_revocations'
        AND p.polname = 'norma_mcp_revocation_read_policy'
        AND p.polcmd = 'r'
        AND p.polpermissive
        AND pg_get_expr(p.polqual, p.polrelid) = 'true'
        AND p.polwithcheck IS NULL
        AND (0 = ANY(p.polroles) OR pg_roles.oid = ANY(p.polroles))
    ) AS read_policy_safe,
    NOT EXISTS (
      SELECT 1
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'norma_sandbox'
        AND c.relname = 'remote_mcp_revocations'
        AND p.polcmd IN ('r', '*')
        AND NOT p.polpermissive
    ) AS no_restrictive_read_policy,
    EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'norma_sandbox'
        AND tablename = 'remote_mcp_revocations'
        AND tableowner = current_user
    ) AS table_owner
  FROM pg_roles
  WHERE rolname = current_user`;

const LOOKUP_SQL = `
  SELECT revoked_at::text AS revoked_at
  FROM ${REMOTE_MCP_REVOCATION_TABLE}
  WHERE subject_id = $1
    AND (client_id = '' OR client_id = $2)
    AND (audience = '' OR audience = $3)
  ORDER BY revoked_at DESC
  LIMIT 1`;

const UPSERT_SQL = `
  INSERT INTO ${REMOTE_MCP_REVOCATION_TABLE}
    (subject_id, client_id, audience, revoked_at)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (subject_id, client_id, audience)
  DO UPDATE SET revoked_at = GREATEST(
    ${REMOTE_MCP_REVOCATION_TABLE}.revoked_at,
    EXCLUDED.revoked_at
  )`;

export interface PostgreSqlQueryResult {
  readonly rows?: readonly unknown[];
}

export class PostgreSqlRemoteMcpRevocationRegistry
  implements RemoteMcpRevocationRegistry, RemoteMcpRevocationWriter {
  constructor(private readonly pool: PostgreSqlAuthorizationPool) {}

  async isRevoked(lookup: RemoteMcpRevocationLookup): Promise<boolean> {
    assertValidRemoteMcpRevocationLookup(lookup);
    const connection = await this.pool.connect();
    try {
      await assertLeastPrivilegeRuntimeRole(connection);
      const result = await connection.query(LOOKUP_SQL, [
        lookup.subjectId,
        lookup.clientId,
        lookup.audience,
      ]) as PostgreSqlQueryResult;
      if (!Array.isArray(result.rows)) {
        throw new Error("Malformed PostgreSQL revocation lookup result");
      }
      if (result.rows.length === 0) {
        return false;
      }
      if (result.rows.length !== 1) {
        throw new Error("Malformed PostgreSQL revocation lookup result");
      }
      const row = result.rows[0];
      if (!isRecord(row) || !isUnixSecondText(row.revoked_at)) {
        throw new Error("Malformed PostgreSQL revocation lookup result");
      }
      return lookup.issuedAt <= Number(row.revoked_at);
    } finally {
      connection.release();
    }
  }

  async record(event: RemoteMcpRevocationEvent): Promise<void> {
    assertValidRemoteMcpRevocationEvent(event);
    const connection = await this.pool.connect();
    try {
      await connection.query(UPSERT_SQL, [
        event.subjectId,
        event.clientId ?? "",
        event.audience ?? "",
        event.revokedAt,
      ]);
    } finally {
      connection.release();
    }
  }
}

/**
 * SQL is intentionally operator-applied and disposable in the sandbox.
 * roleName is constrained to a simple PostgreSQL identifier before interpolation.
 */
export function createPostgreSqlRevocationSchemaSql(roleName = "norma_sandbox_user"): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(roleName)) {
    throw new Error("role name is invalid");
  }
  const quotedRoleName = `"${roleName}"`;
  return [
    "DO $$",
    "DECLARE role_record record;",
    "BEGIN",
    `  SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole, rolinherit INTO role_record FROM pg_roles WHERE rolname = '${roleName}';`,
    "  IF NOT FOUND OR role_record.rolsuper OR role_record.rolbypassrls OR role_record.rolcreatedb OR role_record.rolcreaterole OR role_record.rolinherit THEN",
    "    RAISE EXCEPTION 'PostgreSQL revocation role must be a dedicated NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT role';",
    "  END IF;",
    "END $$;",
    "CREATE SCHEMA IF NOT EXISTS norma_sandbox;",
    `CREATE TABLE IF NOT EXISTS ${REMOTE_MCP_REVOCATION_TABLE} (`,
    "  subject_id char(64) NOT NULL CHECK (subject_id ~ '^[a-f0-9]{64}$'),",
    "  client_id text NOT NULL DEFAULT '',",
    "  audience text NOT NULL DEFAULT '',",
    "  revoked_at bigint NOT NULL CHECK (revoked_at >= 0),",
    "  PRIMARY KEY (subject_id, client_id, audience)",
    ");",
    `ALTER TABLE ${REMOTE_MCP_REVOCATION_TABLE} DROP CONSTRAINT IF EXISTS norma_mcp_revocations_client_id_hash_check;`,
    `ALTER TABLE ${REMOTE_MCP_REVOCATION_TABLE} ADD CONSTRAINT norma_mcp_revocations_client_id_hash_check CHECK (client_id = '' OR client_id ~ '^[a-f0-9]{64}$');`,
    `ALTER TABLE ${REMOTE_MCP_REVOCATION_TABLE} DROP CONSTRAINT IF EXISTS norma_mcp_revocations_audience_hash_check;`,
    `ALTER TABLE ${REMOTE_MCP_REVOCATION_TABLE} ADD CONSTRAINT norma_mcp_revocations_audience_hash_check CHECK (audience = '' OR audience ~ '^[a-f0-9]{64}$');`,
    `ALTER TABLE ${REMOTE_MCP_REVOCATION_TABLE} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${REMOTE_MCP_REVOCATION_TABLE} FORCE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS norma_mcp_revocation_read_policy ON ${REMOTE_MCP_REVOCATION_TABLE};`,
    `CREATE POLICY norma_mcp_revocation_read_policy ON ${REMOTE_MCP_REVOCATION_TABLE} FOR SELECT TO ${quotedRoleName} USING (true);`,
    `REVOKE ALL ON ${REMOTE_MCP_REVOCATION_TABLE} FROM PUBLIC;`,
    `GRANT USAGE ON SCHEMA norma_sandbox TO ${quotedRoleName};`,
    `GRANT SELECT ON ${REMOTE_MCP_REVOCATION_TABLE} TO ${quotedRoleName};`,
  ].join("\n");
}

export function createPostgreSqlRevocationTeardownSql(): string {
  return `DROP TABLE IF EXISTS ${REMOTE_MCP_REVOCATION_TABLE};`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function assertLeastPrivilegeRuntimeRole(
  connection: PostgreSqlAuthorizationConnection,
): Promise<void> {
  const result = await connection.query(ROLE_VALIDATION_SQL) as PostgreSqlQueryResult;
  if (!Array.isArray(result.rows) || result.rows.length !== 1) {
    throw new Error("PostgreSQL revocation role validation returned an invalid result");
  }
  const row = result.rows[0];
  if (!isRecord(row)
    || typeof row.current_user !== "string"
    || row.current_user.trim() === ""
    || typeof row.rolsuper !== "boolean"
    || typeof row.rolbypassrls !== "boolean"
    || typeof row.rolcreatedb !== "boolean"
    || typeof row.rolcreaterole !== "boolean"
    || typeof row.rolinherit !== "boolean"
    || row.schema_usage !== true
    || row.table_select !== true
    || row.table_write !== false
    || row.rls_enabled !== true
    || row.rls_forced !== true
    || row.read_policy_safe !== true
    || row.no_restrictive_read_policy !== true
    || row.table_owner !== false
    || row.rolsuper
    || row.rolbypassrls
    || row.rolcreatedb
    || row.rolcreaterole
    || row.rolinherit
    || /^(?:service_role|supabase_service_key)$/u.test(row.current_user)) {
    throw new Error("PostgreSQL revocation pool role violates the least-privilege contract");
  }
}

function isUnixSecondText(value: unknown): value is string {
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    return false;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0;
}
