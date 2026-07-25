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

function deferred(label, timeoutMs = 2_000) {
  let resolve;
  let reject;
  let timeoutId;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = (value) => {
      clearTimeout(timeoutId);
      resolvePromise(value);
    };
    reject = (error) => {
      clearTimeout(timeoutId);
      rejectPromise(error);
    };
    timeoutId = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${label}`));
    }, timeoutMs);
  });
  return { promise, resolve, reject };
}

function createPostgreSqlProof(records, {
  failBegin = false,
  failRollback = false,
  onConnect,
  onQuery,
  onReadStart,
  onReadEnd,
  readRecord,
} = {}) {
  const events = [];
  let connectCount = 0;
  const pool = {
    async connect() {
      connectCount += 1;
      onConnect?.();
      const localSettings = new Map();
      const connection = {
        localSettings,
        async query(sql, values = []) {
          events.push({ sql, values: [...values] });
          await onQuery?.({ connection, localSettings, sql, values });
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
      return connection;
    },
  };
  const readRecordImplementation = readRecord ?? (async (connection, recordId) => {
    const record = records.find((candidate) => candidate.id === recordId);
    return record?.tenant === connection.localSettings.get(settingNames.tenant)
      ? record
      : null;
  });
  const adapter = createPostgreSqlAuthorizationDataAdapter({
    pool,
    requiredScope,
    settingNames,
    nowSeconds: () => 1_000,
    async readRecord(connection, recordId) {
      onReadStart?.({ connection, recordId });
      const result = await readRecordImplementation(connection, recordId);
      onReadEnd?.({ connection, recordId });
      return result;
    },
  });
  return {
    adapter,
    events,
    connectCount: () => connectCount,
  };
}

test("PostgreSQL adapter snapshots context before connect and BEGIN can observe mutations", async () => {
  const requestContext = context({
    subject: "subject-before",
    tenant: "tenant-before",
    scopes: [requiredScope, "scope:before"],
    audience: "https://before.example/mcp",
    expiresAt: 1_300,
  });
  const proof = createPostgreSqlProof([
    { id: "record-a", tenant: "tenant-before", payload: null },
  ], {
    onConnect() {
      requestContext.subject = "subject-during-connect";
      requestContext.tenant = "tenant-during-connect";
      requestContext.scopes.splice(0, requestContext.scopes.length, "scope:during-connect");
      requestContext.audience = "https://during-connect.example/mcp";
      requestContext.expiresAt = 1_400;
    },
    onQuery({ sql }) {
      if (sql === "BEGIN") {
        requestContext.subject = "subject-during-begin";
        requestContext.tenant = "tenant-during-begin";
        requestContext.scopes.push("scope:during-begin");
        requestContext.audience = "https://during-begin.example/mcp";
        requestContext.expiresAt = 1_500;
      }
    },
  });

  const result = await proof.adapter.withTransaction(requestContext, (transaction) => (
    transaction.readRecord("record-a")
  ));

  assert.deepEqual(result, {
    id: "record-a",
    tenant: "tenant-before",
    payload: null,
  });
  assert.deepEqual(
    proof.events
      .filter((event) => event.sql === "SELECT set_config($1, $2, true)")
      .map((event) => event.values),
    [
      [settingNames.subject, "subject-before"],
      [settingNames.tenant, "tenant-before"],
      [settingNames.scopes, JSON.stringify([requiredScope, "scope:before"])],
      [settingNames.audience, "https://before.example/mcp"],
      [settingNames.expiresAt, "1300"],
    ],
  );
});

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

test("PostgreSQL adapter closes retained handles before a pending commit", async () => {
  const commitStarted = deferred("COMMIT start");
  const allowCommit = deferred("COMMIT completion");
  const proof = createPostgreSqlProof([
    { id: "record-a", tenant: "tenant-a", payload: null },
  ], {
    onQuery: async ({ sql }) => {
      if (sql === "COMMIT") {
        commitStarted.resolve();
        await allowCommit.promise;
      }
    },
  });
  let retainedTransaction;

  const transactionPromise = proof.adapter.withTransaction(
    context({ expiresAt: 1_300 }),
    async (transaction) => {
      retainedTransaction = transaction;
      return "committed";
    },
  );

  await commitStarted.promise;
  await assert.rejects(
    () => retainedTransaction.readRecord("record-a"),
    /transaction is closed/u,
  );
  assert.equal(proof.events.at(-1).sql, "COMMIT");

  allowCommit.resolve();
  assert.equal(await transactionPromise, "committed");
  assert.equal(proof.events.at(-1).sql, "RELEASE");
});

test("PostgreSQL adapter waits for in-flight reads before commit and release", async () => {
  const readStarted = deferred("read start");
  const allowRead = deferred("read completion");
  let readSettled = false;
  const proof = createPostgreSqlProof([], {
    readRecord: async () => {
      await allowRead.promise;
      return { id: "record-a", tenant: "tenant-a", payload: null };
    },
    onReadStart() {
      readStarted.resolve();
    },
    onReadEnd() {
      readSettled = true;
    },
  });
  let readPromise;

  const transactionPromise = proof.adapter.withTransaction(
    context({ expiresAt: 1_300 }),
    async (transaction) => {
      readPromise = transaction.readRecord("record-a");
      await readStarted.promise;
    },
  );

  await readStarted.promise;
  await Promise.resolve();
  assert.equal(proof.events.some((event) => event.sql === "COMMIT"), false);
  assert.equal(proof.events.some((event) => event.sql === "RELEASE"), false);

  allowRead.resolve();
  assert.deepEqual(await readPromise, {
    id: "record-a",
    tenant: "tenant-a",
    payload: null,
  });
  await transactionPromise;
  assert.equal(readSettled, true);
  assert.equal(proof.events.at(-1).sql, "RELEASE");
});

test("PostgreSQL adapter waits for in-flight reads before rollback and release errors", async () => {
  const readStarted = deferred("rollback read start");
  const allowRead = deferred("rollback read completion");
  let readSettled = false;
  const proof = createPostgreSqlProof([], {
    failRollback: true,
    readRecord: async () => {
      await allowRead.promise;
      return null;
    },
    onReadStart() {
      readStarted.resolve();
    },
    onReadEnd() {
      readSettled = true;
    },
    onQuery({ sql }) {
      if (sql === "ROLLBACK") {
        assert.equal(readSettled, true);
      }
    },
  });
  const transactionPromise = proof.adapter.withTransaction(
    context({ expiresAt: 1_300 }),
    async (transaction) => {
      void transaction.readRecord("record-a");
      await readStarted.promise;
      throw new Error("operation failed");
    },
  );

  await readStarted.promise;
  await Promise.resolve();
  assert.equal(proof.events.some((event) => event.sql === "ROLLBACK"), false);
  assert.equal(proof.events.some((event) => event.sql === "RELEASE"), false);

  allowRead.resolve();
  await assert.rejects(
    () => transactionPromise,
    (error) => error instanceof AggregateError
      && error.message === "Authorization transaction and rollback failed",
  );
  assert.equal(readSettled, true);
  assert.deepEqual(proof.events.slice(-2).map((event) => event.sql), ["ROLLBACK", "RELEASE"]);
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
