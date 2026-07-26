#!/usr/bin/env node

import { createPostgreSqlPoolFromEnvironment } from "../dist/src/mcp/remote-http-postgresql-pool.js";
import { PostgreSqlRemoteMcpRevocationRegistry } from "../dist/src/mcp/remote-http-postgresql-revocation.js";

const event = parseEvent(process.argv.slice(2));
const pool = createPostgreSqlPoolFromEnvironment({
  ...process.env,
  NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
});
if (pool === undefined) throw new Error("PostgreSQL pool is required");

try {
  await new PostgreSqlRemoteMcpRevocationRegistry(pool).record(event);
  process.stdout.write(JSON.stringify({ event: "remote_mcp_revocation_recorded" }) + "\n");
} finally {
  await pool.end();
}

function parseEvent(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (typeof key !== "string" || typeof value !== "string" || !key.startsWith("--") || values.has(key)) {
      throw new Error("Invalid revocation arguments");
    }
    values.set(key, value);
  }
  const subjectId = values.get("--subject-id");
  const revokedAt = Number(values.get("--revoked-at"));
  if (values.size < 2 || values.size > 4 || !/^[a-f0-9]{64}$/u.test(subjectId ?? "")
    || !Number.isSafeInteger(revokedAt) || revokedAt < 0) {
    throw new Error("Invalid sanitized revocation event");
  }
  const clientId = values.get("--client-scope-id");
  const audience = values.get("--audience-scope-id");
  if ((clientId !== undefined && !/^[a-f0-9]{64}$/u.test(clientId))
    || (audience !== undefined && !/^[a-f0-9]{64}$/u.test(audience))) {
    throw new Error("Invalid sanitized revocation scope");
  }
  return { subjectId, ...(clientId === undefined ? {} : { clientId }), ...(audience === undefined ? {} : { audience }), revokedAt };
}
