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

/**
 * Shared, additive sandbox registry. The database role needs only SELECT and
 * INSERT/UPDATE on this table; schema creation is an operator-only action.
 */
export const REMOTE_MCP_REVOCATION_TABLE = "norma_sandbox.remote_mcp_revocations";

const LOOKUP_SQL = `
  SELECT revoked_at
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
    const connection = await this.pool.connect();
    try {
      const result = await connection.query(LOOKUP_SQL, [
        lookup.subjectId,
        lookup.clientId,
        lookup.audience,
      ]) as PostgreSqlQueryResult;
      const row = result.rows?.[0];
      if (!isRecord(row) || !isUnixSecond(row.revoked_at)) {
        if (row === undefined) return false;
        throw new Error("Malformed PostgreSQL revocation lookup result");
      }
      return lookup.issuedAt <= row.revoked_at;
    } finally {
      connection.release();
    }
  }

  async record(event: RemoteMcpRevocationEvent): Promise<void> {
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

/** SQL is intentionally operator-applied and disposable in the sandbox. */
export function createPostgreSqlRevocationSchemaSql(roleName = "norma_mcp_runtime"): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(roleName)) {
    throw new Error("role name is invalid");
  }
  return [
    "CREATE SCHEMA IF NOT EXISTS norma_sandbox;",
    `CREATE TABLE IF NOT EXISTS ${REMOTE_MCP_REVOCATION_TABLE} (`,
    "  subject_id char(64) NOT NULL CHECK (subject_id ~ '^[a-f0-9]{64}$'),",
    "  client_id text NOT NULL DEFAULT '',",
    "  audience text NOT NULL DEFAULT '',",
    "  revoked_at bigint NOT NULL CHECK (revoked_at >= 0),",
    "  PRIMARY KEY (subject_id, client_id, audience)",
    ");",
    `GRANT USAGE ON SCHEMA norma_sandbox TO ${roleName};`,
    `GRANT SELECT, INSERT, UPDATE ON ${REMOTE_MCP_REVOCATION_TABLE} TO ${roleName};`,
  ].join("\n");
}

export function createPostgreSqlRevocationTeardownSql(): string {
  return `DROP TABLE IF EXISTS ${REMOTE_MCP_REVOCATION_TABLE};`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnixSecond(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
