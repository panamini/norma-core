import assert from "node:assert/strict";
import test from "node:test";

import {
  createPostgreSqlRevocationSchemaSql,
  createPostgreSqlRevocationTeardownSql,
  PostgreSqlRemoteMcpRevocationRegistry,
} from "../dist/src/mcp/remote-http-postgresql-revocation.js";

const subjectId = "a".repeat(64);
const clientId = "b".repeat(64);
const audience = "c".repeat(64);

test("PostgreSQL registry uses parameterized hashed values and fails closed on malformed rows", async () => {
  const calls = [];
  const registry = new PostgreSqlRemoteMcpRevocationRegistry(pool(async (sql, values) => {
    calls.push({ sql, values });
    return sql.includes("FROM pg_roles")
      ? leastPrivilegeRole()
      : { rows: [{ revoked_at: "100" }] };
  }));
  assert.equal(await registry.isRevoked({ subjectId, clientId, audience, issuedAt: 100 }), true);
  assert.equal(calls[1].values[0], subjectId);
  assert.equal(calls[1].values[1], clientId);
  assert.equal(calls[1].values[2], audience);

  const malformed = new PostgreSqlRemoteMcpRevocationRegistry(pool(async (sql) => (
    sql.includes("FROM pg_roles") ? leastPrivilegeRole() : {}
  )));
  await assert.rejects(() => malformed.isRevoked({ subjectId, clientId, audience, issuedAt: 1 }));
});

test("PostgreSQL registry rejects privileged roles and invalid inputs before lookup", async () => {
  const privileged = new PostgreSqlRemoteMcpRevocationRegistry(pool(async () => ({
    rows: [{
      ...leastPrivilegeRole().rows[0],
      rolsuper: true,
    }],
  })));
  await assert.rejects(
    () => privileged.isRevoked({ subjectId, clientId, audience, issuedAt: 1 }),
    /least-privilege/u,
  );

  let connected = false;
  const invalid = new PostgreSqlRemoteMcpRevocationRegistry({
    async connect() {
      connected = true;
      throw new Error("must not connect");
    },
  });
  await assert.rejects(
    () => invalid.isRevoked({ subjectId: "raw-subject", clientId, audience, issuedAt: 1 }),
    /Invalid revocation lookup/u,
  );
  assert.equal(connected, false);
});

test("PostgreSQL registry upsert is monotonic and wildcard values are normalized", async () => {
  const calls = [];
  const registry = new PostgreSqlRemoteMcpRevocationRegistry(pool(async (sql, values) => {
    calls.push({ sql, values });
    return { rows: [] };
  }));
  await registry.record({ subjectId, revokedAt: 101 });
  assert.equal(calls[0].values[1], "");
  assert.equal(calls[0].values[2], "");
  assert.match(calls[0].sql, /GREATEST/u);
});

test("sandbox schema is least privilege and has reversible teardown", () => {
  const sql = createPostgreSqlRevocationSchemaSql();
  assert.match(sql, /NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT/u);
  assert.match(sql, /REVOKE ALL/u);
  assert.match(sql, /GRANT SELECT ON/u);
  assert.doesNotMatch(sql, /GRANT SELECT, INSERT, UPDATE/u);
  assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE|DELETE)/u);
  assert.match(createPostgreSqlRevocationTeardownSql(), /^DROP TABLE IF EXISTS/u);
  assert.throws(() => createPostgreSqlRevocationSchemaSql("bad role"));
});

function pool(query) {
  return {
    async connect() {
      return { query, release() {} };
    },
  };
}

function leastPrivilegeRole() {
  return {
    rows: [{
      current_user: "norma_sandbox_user",
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolinherit: false,
    }],
  };
}
