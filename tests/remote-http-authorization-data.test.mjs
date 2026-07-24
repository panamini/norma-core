import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthorizationDataAccessDeniedError,
  createInMemoryRlsDataAdapter,
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
