import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthorizationDataAccessDeniedError,
  createInMemoryRlsDataAdapter,
  createPostgreSqlAuthorizationDataAdapter,
} from "../dist/src/mcp/remote-http-authorization-data.js";

const requiredScope = "norma:structured-analyze";

function context(overrides = {}) {
  return {
    subject: "provider-subject-a",
    tenant: "tenant-a",
    scopes: [requiredScope],
    audience: "https://mcp.example/mcp",
    expiresAt: Math.floor(Date.now() / 1_000) + 300,
    ...overrides,
  };
}

test("PR266 allows same-tenant reads and denies cross-tenant reads", async () => {
  const adapter = createInMemoryRlsDataAdapter([
    { id: "record-a", tenant: "tenant-a", payload: { value: "A" } },
    { id: "record-b", tenant: "tenant-b", payload: { value: "B" } },
  ], requiredScope);

  const sameTenant = await adapter.withTransaction(context(), (transaction) => transaction.readRecord("record-a"));
  assert.deepEqual(sameTenant, {
    id: "record-a",
    tenant: "tenant-a",
    payload: { value: "A" },
  });

  const crossTenant = await adapter.withTransaction(
    context({ subject: "provider-subject-b", tenant: "tenant-b" }),
    (transaction) => transaction.readRecord("record-a"),
  );
  assert.equal(crossTenant, null);
});

test("PR266 fails closed for missing or invalid context and resets transaction state", async () => {
  const adapter = createInMemoryRlsDataAdapter([
    { id: "record-a", tenant: "tenant-a", payload: { value: "A" } },
  ], requiredScope);

  for (const invalidContext of [
    undefined,
    context({ tenant: "" }),
    context({ scopes: [] }),
    context({ expiresAt: 0 }),
    { ...context(), rawToken: "Bearer secret-must-not-cross-boundary" },
  ]) {
    await assert.rejects(
      () => adapter.withTransaction(invalidContext, async () => null),
      AuthorizationDataAccessDeniedError,
    );
  }

  let closedTransaction;
  await adapter.withTransaction(context(), async (transaction) => {
    closedTransaction = transaction;
    assert.ok(await transaction.readRecord("record-a"));
  });
  await assert.rejects(
    () => closedTransaction.readRecord("record-a"),
    /transaction is closed/u,
  );

  const nextTenant = await adapter.withTransaction(
    context({ tenant: "tenant-b" }),
    (transaction) => transaction.readRecord("record-a"),
  );
  assert.equal(nextTenant, null);
});

test("PR266 context shape contains no bearer token or secret field", () => {
  const serialized = JSON.stringify(context());
  assert.doesNotMatch(serialized, /rawToken|bearer|secret|authorization/iu);
});

const settingNames = Object.freeze({
  subject: "norma.auth_subject",
  tenant: "norma.auth_tenant",
  scopes: "norma.auth_scopes",
  audience: "norma.auth_audience",
  expiresAt: "norma.auth_expires_at",
});

function createPostgreSqlProof(records, { failBegin = false, failRollback = false } = {}) {
  const events = [];
  let connectCount = 0;
  const pool = {
    async connect() {
      connectCount += 1;
      const localSettings = new Map();
      return {
        localSettings,
        async query(sql, values = []) {
          events.push({ sql, values: [...values] });
          if (sql === "BEGIN" && failBegin) {
            throw new Error("begin unavailable");
          } else if (sql === "SELECT set_config($1, $2, true)") {
            localSettings.set(values[0], values[1]);
          } else if (sql === "COMMIT") {
            localSettings.clear();
          } else if (sql === "ROLLBACK") {
            if (failRollback) {
              throw new Error("rollback unavailable");
            }
            localSettings.clear();
          }
        },
        release(error) {
          events.push({
            sql: "RELEASE",
            values: error === undefined ? [] : [error.message],
          });
          localSettings.clear();
        },
      };
    },
  };
  const adapter = createPostgreSqlAuthorizationDataAdapter({
    pool,
    requiredScope,
    settingNames,
    nowSeconds: () => 1_000,
    async readRecord(connection, recordId) {
      const record = records.find((candidate) => candidate.id === recordId);
      return record?.tenant === connection.localSettings.get(settingNames.tenant)
        ? record
        : null;
    },
  });
  return {
    adapter,
    events,
    connectCount: () => connectCount,
  };
}

test("PostgreSQL adapter applies transaction-local context and preserves RLS denial", async () => {
  const proof = createPostgreSqlProof([
    { id: "record-a", tenant: "tenant-a", payload: { value: "A" } },
    { id: "record-b", tenant: "tenant-b", payload: { value: "B" } },
  ]);

  const sameTenant = await proof.adapter.withTransaction(
    context({ expiresAt: 1_300 }),
    (transaction) => transaction.readRecord("record-a"),
  );
  assert.deepEqual(sameTenant, {
    id: "record-a",
    tenant: "tenant-a",
    payload: { value: "A" },
  });

  const crossTenant = await proof.adapter.withTransaction(
    context({ tenant: "tenant-b", expiresAt: 1_300 }),
    (transaction) => transaction.readRecord("record-a"),
  );
  assert.equal(crossTenant, null);
  assert.equal(proof.connectCount(), 2);

  const sql = proof.events.map((event) => event.sql);
  assert.deepEqual(sql.slice(0, 8), [
    "BEGIN",
    ...Array(5).fill("SELECT set_config($1, $2, true)"),
    "COMMIT",
    "RELEASE",
  ]);
  for (const event of proof.events.filter(
    (candidate) => candidate.sql === "SELECT set_config($1, $2, true)",
  )) {
    assert.equal(event.values.length, 2);
    assert.ok(Object.values(settingNames).includes(event.values[0]));
  }
  assert.equal(
    proof.events.some((event) => event.sql.includes("tenant-a")),
    false,
  );
});

test("PostgreSQL adapter fails closed before acquiring a connection", async () => {
  const proof = createPostgreSqlProof([]);
  for (const invalidContext of [
    undefined,
    context({ tenant: "", expiresAt: 1_300 }),
    context({ scopes: [], expiresAt: 1_300 }),
    { ...context({ expiresAt: 1_300 }), rawToken: "Bearer private-token" },
  ]) {
    await assert.rejects(
      () => proof.adapter.withTransaction(invalidContext, async () => null),
      AuthorizationDataAccessDeniedError,
    );
  }
  assert.equal(proof.connectCount(), 0);
  assert.deepEqual(proof.events, []);
});

test("PostgreSQL adapter commits or rolls back, closes, and releases the connection", async () => {
  const proof = createPostgreSqlProof([
    { id: "record-a", tenant: "tenant-a", payload: null },
  ]);
  let committedTransaction;
  await proof.adapter.withTransaction(context({ expiresAt: 1_300 }), async (transaction) => {
    committedTransaction = transaction;
    assert.ok(await transaction.readRecord("record-a"));
  });
  await assert.rejects(
    () => committedTransaction.readRecord("record-a"),
    /transaction is closed/u,
  );

  await assert.rejects(
    () => proof.adapter.withTransaction(context({ expiresAt: 1_300 }), async () => {
      throw new Error("operation failed");
    }),
    /operation failed/u,
  );
  assert.deepEqual(
    proof.events.filter((event) => ["COMMIT", "ROLLBACK", "RELEASE"].includes(event.sql))
      .map((event) => event.sql),
    ["COMMIT", "RELEASE", "ROLLBACK", "RELEASE"],
  );
  assert.deepEqual(
    proof.events.filter((event) => event.sql === "RELEASE").map((event) => event.values),
    [[], []],
  );
});

test("PostgreSQL adapter evicts a connection when rollback cannot reset it", async () => {
  const proof = createPostgreSqlProof([], { failRollback: true });
  await assert.rejects(
    () => proof.adapter.withTransaction(context({ expiresAt: 1_300 }), async () => {
      throw new Error("operation failed");
    }),
    (error) => error instanceof AggregateError
      && error.message === "Authorization transaction and rollback failed",
  );
  assert.deepEqual(proof.events.at(-1), {
    sql: "RELEASE",
    values: ["rollback unavailable"],
  });

  const beginFailure = createPostgreSqlProof([], { failBegin: true });
  await assert.rejects(
    () => beginFailure.adapter.withTransaction(
      context({ expiresAt: 1_300 }),
      async () => null,
    ),
    /begin unavailable/u,
  );
  assert.deepEqual(beginFailure.events, [
    { sql: "BEGIN", values: [] },
    { sql: "RELEASE", values: ["begin unavailable"] },
  ]);
});

test("PostgreSQL adapter rejects ambiguous setting contracts", () => {
  const proof = createPostgreSqlProof([]);
  assert.ok(proof.adapter);
  for (const invalidSettingNames of [
    { ...settingNames, tenant: settingNames.subject },
    { ...settingNames, tenant: "tenant" },
    { ...settingNames, unexpected: "norma.unexpected" },
  ]) {
    assert.throws(
      () => createPostgreSqlAuthorizationDataAdapter({
        pool: { async connect() { throw new Error("must not connect"); } },
        requiredScope,
        settingNames: invalidSettingNames,
        async readRecord() { return null; },
      }),
      /setting names are invalid/u,
    );
  }
});
