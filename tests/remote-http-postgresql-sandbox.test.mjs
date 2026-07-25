import assert from "node:assert/strict";
import test from "node:test";

import {
  createRemoteMcpHttpServer,
} from "../dist/src/mcp/remote-http-server.js";
import {
  loadRemoteMcpRuntimeConfig,
} from "../dist/src/mcp/remote-http-config.js";
import {
  createPostgreSqlSandboxAuthorizationDataAdapter,
  POSTGRESQL_SANDBOX_READ_RECORD_SQL,
  POSTGRESQL_SANDBOX_ROLE_CONTRACT,
  POSTGRESQL_SANDBOX_ROLE_VALIDATION_SQL,
  POSTGRESQL_SANDBOX_SCHEMA,
  POSTGRESQL_SANDBOX_SETTING_NAMES,
  POSTGRESQL_SANDBOX_TABLE,
  POSTGRESQL_SANDBOX_TEARDOWN_SQL,
  createPostgreSqlSandboxSchemaSql,
} from "../dist/src/mcp/remote-http-postgresql-sandbox.js";
import {
  createPostgreSqlPoolFromEnvironment,
} from "../dist/src/mcp/remote-http-postgresql-pool.js";

const requiredScope = "norma:structured-analyze";

test("PostgreSQL sandbox fixture is isolated, reversible, and least-privileged", () => {
  const schema = createPostgreSqlSandboxSchemaSql();
  assert.match(schema, /ENABLE ROW LEVEL SECURITY/u);
  assert.match(schema, /FORCE ROW LEVEL SECURITY/u);
  assert.match(schema, /NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT/u);
  assert.match(schema, /REVOKE ALL ON/u);
  assert.match(schema, /GRANT SELECT ON/u);
  assert.doesNotMatch(schema, /service_role|supabase_service_key/u);
  assert.match(POSTGRESQL_SANDBOX_TEARDOWN_SQL, /DROP TABLE IF EXISTS/u);
  assert.match(POSTGRESQL_SANDBOX_TEARDOWN_SQL, /DROP SCHEMA IF EXISTS/u);
  assert.match(POSTGRESQL_SANDBOX_ROLE_VALIDATION_SQL, /FROM pg_roles/u);
  assert.equal(POSTGRESQL_SANDBOX_ROLE_CONTRACT.forbidden.includes("BYPASSRLS"), true);
  assert.equal(POSTGRESQL_SANDBOX_ROLE_CONTRACT.forbidden.includes("SUPERUSER"), true);
  assert.throws(() => createPostgreSqlSandboxSchemaSql("role with spaces"), /role name is invalid/u);
});

test("PostgreSQL sandbox adapter applies exact context settings and schema-specific reads", async () => {
  const records = [
    { id: "record-a", tenant: "tenant-a", subject: "subject-a", payload: { value: "A" } },
    { id: "record-b", tenant: "tenant-b", subject: "subject-b", payload: { value: "B" } },
  ];
  const proof = createFakePool(records);
  const adapter = createPostgreSqlSandboxAuthorizationDataAdapter({
    pool: proof.pool,
    requiredScope,
    settingNames: POSTGRESQL_SANDBOX_SETTING_NAMES,
    nowSeconds: () => 1_000,
  });

  const sameTenant = await adapter.withTransaction(context("subject-a", "tenant-a"), (transaction) => (
    transaction.readRecord("record-a")
  ));
  assert.deepEqual(sameTenant, {
    id: "record-a",
    tenant: "tenant-a",
    payload: { value: "A" },
  });

  const crossTenant = await adapter.withTransaction(context("subject-b", "tenant-b"), (transaction) => (
    transaction.readRecord("record-a")
  ));
  assert.equal(crossTenant, null);
  assert.equal(proof.events.some((event) => event.sql.includes("SELECT id, tenant, payload")), true);
  assert.equal(proof.events.some((event) => event.values.includes("record-a")), true);
  assert.equal(proof.events.some((event) => event.sql.includes("rawToken")), false);
  assert.equal(proof.events.some((event) => event.sql.includes("authorization")), false);
  assert.equal(proof.events.filter((event) => event.sql === "COMMIT").length, 2);
});

test("PostgreSQL sandbox adapter fails closed for missing context and malformed rows", async () => {
  const proof = createFakePool([]);
  const adapter = createPostgreSqlSandboxAuthorizationDataAdapter({
    pool: proof.pool,
    requiredScope,
    settingNames: POSTGRESQL_SANDBOX_SETTING_NAMES,
    nowSeconds: () => 1_000,
  });
  await assert.rejects(
    () => adapter.withTransaction(undefined, async () => null),
    /Authenticated request context is required/u,
  );
  assert.equal(proof.connectCount, 0);

  const malformed = createFakePool([{ id: "record-a", tenant: "tenant-a" }]);
  const malformedAdapter = createPostgreSqlSandboxAuthorizationDataAdapter({
    pool: malformed.pool,
    requiredScope,
    settingNames: POSTGRESQL_SANDBOX_SETTING_NAMES,
    nowSeconds: () => 1_000,
  });
  await assert.rejects(
    () => malformedAdapter.withTransaction(context("subject-a", "tenant-a"), (transaction) => (
      transaction.readRecord("record-a")
    )),
    /invalid row/u,
  );

  const malformedPayload = createFakePool([{ id: "record-a", tenant: "tenant-a", payload: undefined }]);
  const malformedPayloadAdapter = createPostgreSqlSandboxAuthorizationDataAdapter({
    pool: malformedPayload.pool,
    requiredScope,
    settingNames: POSTGRESQL_SANDBOX_SETTING_NAMES,
    nowSeconds: () => 1_000,
  });
  await assert.rejects(
    () => malformedPayloadAdapter.withTransaction(context("subject-a", "tenant-a"), (transaction) => (
      transaction.readRecord("record-a")
    )),
    /payload is not valid JSON/u,
  );

  const unsafeRole = createFakePool([], {
    current_user: "admin",
    rolsuper: false,
    rolbypassrls: true,
    rolcreatedb: false,
    rolcreaterole: false,
    rolinherit: false,
  });
  const unsafeRoleAdapter = createPostgreSqlSandboxAuthorizationDataAdapter({
    pool: unsafeRole.pool,
    requiredScope,
    settingNames: POSTGRESQL_SANDBOX_SETTING_NAMES,
    nowSeconds: () => 1_000,
  });
  await assert.rejects(
    () => unsafeRoleAdapter.withTransaction(context("subject-a", "tenant-a"), (transaction) => (
      transaction.readRecord("record-a")
    )),
    /least-privilege contract/u,
  );
});

test("PostgreSQL mode is opt-in and fails closed without a supplied pool", () => {
  const environment = {
    NODE_ENV: "test",
    NORMA_MCP_PUBLIC_URL: "http://127.0.0.1:3000/",
    NORMA_MCP_AUTH_ISSUER: "http://127.0.0.1:4000/",
    NORMA_MCP_AUTH_AUDIENCE: "http://127.0.0.1:3000/mcp",
    NORMA_MCP_AUDIT_HASH_KEY: "0123456789abcdef0123456789abcdef",
  };
  assert.equal(loadRemoteMcpRuntimeConfig(environment).authorizationDataMode, "disabled");

  const configured = loadRemoteMcpRuntimeConfig({
    ...environment,
    NORMA_MCP_AUTH_TENANT_CLAIM: "tenant_id",
    NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
  });
  assert.equal(configured.authorizationDataMode, "postgresql");
  assert.throws(
    () => createRemoteMcpHttpServer(configured),
    /requires an injected PostgreSQL pool/u,
  );
  assert.throws(
    () => createRemoteMcpHttpServer(configured, {
      authorizationDataAdapter: { withTransaction: async () => null },
    }),
    /requires an injected PostgreSQL pool/u,
  );
  assert.throws(
    () => loadRemoteMcpRuntimeConfig({
      ...environment,
      NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
    }),
    /requires NORMA_MCP_AUTH_TENANT_CLAIM/u,
  );
  assert.throws(
    () => loadRemoteMcpRuntimeConfig({
      ...environment,
      NORMA_MCP_AUTHZ_DATA_MODE: "provider-specific",
    }),
    /must be disabled or postgresql/u,
  );
});

test("PostgreSQL runtime pool is disabled by default and enforces disposable connection config", async () => {
  assert.equal(createPostgreSqlPoolFromEnvironment({}), undefined);
  assert.throws(
    () => createPostgreSqlPoolFromEnvironment({ NORMA_MCP_AUTHZ_DATA_MODE: "postgresql" }),
    /NORMA_MCP_AUTHZ_DATABASE_URL is required/u,
  );
  assert.throws(
    () => createPostgreSqlPoolFromEnvironment({
      NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
      NORMA_MCP_AUTHZ_DATABASE_URL: "https://example.invalid/database",
    }),
    /must be a PostgreSQL connection URL/u,
  );
  assert.throws(
    () => createPostgreSqlPoolFromEnvironment({
      NODE_ENV: "production",
      NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
      NORMA_MCP_AUTHZ_DATABASE_URL: "postgresql://sandbox_user:local-test@db.example.invalid/sandbox",
      NORMA_MCP_POSTGRES_SSL: "disable",
    }),
    /must be require outside isolated tests/u,
  );
  assert.throws(
    () => createPostgreSqlPoolFromEnvironment({
      NODE_ENV: "production",
      NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
      NORMA_MCP_AUTHZ_DATABASE_URL: "postgresql://sandbox_user:local-test@db.example.invalid/sandbox?sslmode=disable",
    }),
    /must not disable TLS/u,
  );

  const pool = createPostgreSqlPoolFromEnvironment({
    NODE_ENV: "test",
    NORMA_MCP_AUTHZ_DATA_MODE: "postgresql",
    NORMA_MCP_AUTHZ_DATABASE_URL: "postgresql://sandbox_user:local-test@127.0.0.1:5432/sandbox",
    NORMA_MCP_POSTGRES_SSL: "disable",
  });
  assert.ok(pool);
  await pool.end();
});

function context(subject, tenant) {
  return {
    subject,
    tenant,
    scopes: [requiredScope],
    audience: "http://127.0.0.1:3000/mcp",
    expiresAt: 1_300,
  };
}

function createFakePool(records, role = {
  current_user: "norma_sandbox_user",
  rolsuper: false,
  rolbypassrls: false,
  rolcreatedb: false,
  rolcreaterole: false,
  rolinherit: false,
}) {
  const events = [];
  let connectCount = 0;
  const pool = {
    async connect() {
      connectCount += 1;
      const settings = new Map();
      const connection = {
        async query(sql, values = []) {
          events.push({ sql, values: [...values] });
          if (sql === "BEGIN") return;
          if (sql === POSTGRESQL_SANDBOX_ROLE_VALIDATION_SQL) {
            return { rows: [role] };
          }
          if (sql === "SELECT set_config($1, $2, true)") {
            settings.set(values[0], values[1]);
            return;
          }
          if (sql === POSTGRESQL_SANDBOX_READ_RECORD_SQL) {
            const record = records.find((candidate) => (
              candidate.id === values[0]
              && candidate.tenant === settings.get(POSTGRESQL_SANDBOX_SETTING_NAMES.tenant)
              && (!Object.hasOwn(candidate, "subject")
                || candidate.subject === settings.get(POSTGRESQL_SANDBOX_SETTING_NAMES.subject))
            ));
            return { rows: record === undefined ? [] : [{ ...record }] };
          }
          if (sql === "COMMIT" || sql === "ROLLBACK") {
            settings.clear();
          }
        },
        release(error) {
          events.push({ sql: "RELEASE", values: error === undefined ? [] : [error.message] });
          settings.clear();
        },
      };
      return connection;
    },
  };
  return {
    pool,
    events,
    get connectCount() {
      return connectCount;
    },
  };
}
