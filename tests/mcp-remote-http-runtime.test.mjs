import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleMcpJsonRpcRequest } from "../dist/src/mcp/stdio-protocol.js";
import {
  createRemoteMcpHttpServer,
  validateRemoteMcpJsonLimits,
  withRemoteMcpAdmissionDeadline,
  withRemoteMcpDeadline,
  RemoteMcpRequestTimeoutError,
} from "../dist/src/mcp/remote-http-server.js";
import { RemoteMcpAdmissionController } from "../dist/src/mcp/remote-http-limits.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const analyzeToolName = "norma.analyzeStructuredCompositionV1";
const protocol = "2025-11-25";

test("PR137 runs one authenticated stateless Streamable HTTP tool with local parity", async (t) => {
  const logs = [];
  const config = runtimeConfig();
  const server = createRemoteMcpHttpServer(config, {
    verifyAccessToken: deterministicVerifier,
    log: (event) => logs.push(event),
  });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  const health = await request(port, { method: "GET", path: "/healthz" });
  assert.equal(health.status, 200);
  assert.deepEqual(health.json, {
    status: "ok",
    service: "norma-core-remote-mcp",
    version: "0.1.0-pr137",
  });
  assert.deepEqual((await request(port, { method: "GET", path: "/readyz" })).json, health.json);

  const metadata = await request(port, {
    method: "GET",
    path: "/.well-known/oauth-protected-resource/mcp",
  });
  assert.equal(metadata.status, 200);
  assert.deepEqual(metadata.json, {
    resource: "http://127.0.0.1/mcp",
    authorization_servers: ["https://tenant.example/"],
    scopes_supported: ["norma:structured-analyze"],
    bearer_methods_supported: ["header"],
  });

  const missingAuth = await mcpRequest(port, initializeRequest(protocol), { authorization: undefined });
  assert.equal(missingAuth.status, 401);
  assert.match(missingAuth.headers["www-authenticate"], /^Bearer resource_metadata=/u);

  const initialized = await mcpRequest(port, initializeRequest(protocol));
  assert.equal(initialized.status, 200);
  assert.equal(initialized.json.result.protocolVersion, protocol);
  assert.equal(initialized.headers["mcp-session-id"], undefined);

  const list = await mcpRequest(port, {
    jsonrpc: "2.0",
    id: "list",
    method: "tools/list",
    params: {},
  });
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.result.tools.map((tool) => tool.name), [analyzeToolName]);
  assert.deepEqual(list.json.result.tools[0].annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true,
  });

  const input = JSON.parse(await readFile(
    join(repoRoot, "examples", "structured-analyze", "scenarios", "alignment-basic.json"),
    "utf8",
  ));
  const callBody = {
    jsonrpc: "2.0",
    id: "analyze",
    method: "tools/call",
    params: { name: analyzeToolName, arguments: { input } },
  };
  const remote = await mcpRequest(port, callBody);
  const local = handleMcpJsonRpcRequest(callBody);
  assert.equal(remote.status, 200);
  assert.deepEqual(remote.json.result.structuredContent, local.result.structuredContent);
  assert.equal(remote.json.result.content[0].text, local.result.content[0].text);
  assert.equal(JSON.stringify(remote.json.result.structuredContent), JSON.stringify(local.result.structuredContent));
  assert.deepEqual(JSON.parse(remote.json.result.content[0].text), remote.json.result.structuredContent);
  assert.equal(remote.headers["mcp-session-id"], undefined);

  assert.ok(logs.some((event) => event.outcome === "allow" && event.protocolVersion === protocol));
  const serializedLogs = JSON.stringify(logs);
  assert.equal(serializedLogs.includes("valid-subject-a"), false);
  assert.equal(serializedLogs.includes(input.analysisId), false);
  assert.equal(serializedLogs.includes("auth0|subject-a"), false);
});

test("PR137 rejects methods protocols hosts origins media types and every unapproved capability", async (t) => {
  const config = { ...runtimeConfig(), allowedOrigins: new Set(["https://chatgpt.com"]) };
  const server = createRemoteMcpHttpServer(config, { verifyAccessToken: deterministicVerifier, log: () => {} });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;

  for (const method of ["GET", "DELETE"]) {
    const response = await request(port, { method, path: "/mcp" });
    assert.equal(response.status, 405);
    assert.equal(response.headers.allow, "POST");
  }

  assert.equal((await mcpRequest(port, initializeRequest("2025-03-26"))).status, 400);
  assert.equal((await mcpRequest(port, initializeRequest("2024-11-05"))).status, 400);
  assert.equal((await mcpRequest(port, initializeRequest("2025-06-18"))).json.result.protocolVersion, "2025-06-18");

  const listWithoutProtocol = await request(port, {
    method: "POST",
    path: "/mcp",
    headers: authorizedHeaders(),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  assert.equal(listWithoutProtocol.status, 400);

  assert.equal((await mcpRequest(port, { jsonrpc: "2.0", id: 1, method: "resources/list", params: {} })).json.error.code, -32601);
  assert.equal((await mcpRequest(port, { jsonrpc: "2.0", id: 1, method: "prompts/list", params: {} })).json.error.code, -32601);
  assert.equal((await mcpRequest(port, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "norma.getVersion", arguments: {} },
  })).json.error.code, -32602);

  const wrongHost = await mcpRequest(port, initializeRequest(protocol), { host: "attacker.invalid" });
  assert.equal(wrongHost.status, 400);
  assert.equal(wrongHost.json.error.code, "host_rejected");
  const wrongForwardedHost = await mcpRequest(port, initializeRequest(protocol), {
    "x-forwarded-host": "attacker.invalid",
  });
  assert.equal(wrongForwardedHost.status, 400);
  const wrongOrigin = await mcpRequest(port, initializeRequest(protocol), { origin: "https://attacker.invalid" });
  assert.equal(wrongOrigin.status, 403);
  const allowedOrigin = await mcpRequest(port, initializeRequest(protocol), { origin: "https://chatgpt.com" });
  assert.equal(allowedOrigin.status, 200);
  const absentOrigin = await mcpRequest(port, initializeRequest(protocol));
  assert.equal(absentOrigin.status, 200);

  const wrongMedia = await request(port, {
    method: "POST",
    path: "/mcp",
    headers: { ...authorizedHeaders(), "mcp-protocol-version": protocol, "content-type": "text/plain" },
    body: "{}",
  });
  assert.equal(wrongMedia.status, 415);
  assert.equal(wrongMedia.json.error.code, "unsupported_media_type");

  const batch = await mcpRequest(port, [initializeRequest(protocol)]);
  assert.equal(batch.status, 400);
  assert.equal(batch.json.error.code, "protocol_rejected");
});

test("PR137 keeps anonymous and authenticated admission buckets independent", () => {
  let now = 1_000_000;
  const controller = new RemoteMcpAdmissionController(() => now);
  for (let index = 0; index < 600; index += 1) {
    assert.equal(controller.recordUnauthorizedAttempt(), true);
  }
  assert.equal(controller.recordUnauthorizedAttempt(), false);
  assert.deepEqual(controller.snapshot(), {
    authenticatedAttempts: 0,
    unauthorizedAttempts: 600,
    subjectEntries: 0,
  });

  const first = controller.enterAuthenticatedAttempt("subject-a");
  const second = controller.enterAuthenticatedAttempt("subject-a");
  const third = controller.enterAuthenticatedAttempt("subject-a");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.deepEqual(third, { allowed: false, code: "subject_concurrency" });
  first.release();
  second.release();

  for (let index = 0; index < 117; index += 1) {
    const admission = controller.enterAuthenticatedAttempt(`subject-${index + 10}`);
    assert.equal(admission.allowed, true);
    admission.release();
  }
  assert.deepEqual(controller.enterAuthenticatedAttempt("subject-over-global"), {
    allowed: false,
    code: "authenticated_capacity",
  });

  now += 60_001;
  const afterWindow = controller.enterAuthenticatedAttempt("subject-after-window");
  assert.equal(afterWindow.allowed, true);
  afterWindow.release();

  const rateController = new RemoteMcpAdmissionController(() => now);
  for (let index = 0; index < 30; index += 1) {
    const admission = rateController.enterAuthenticatedAttempt("rate-subject");
    assert.equal(admission.allowed, true);
    admission.release();
  }
  assert.deepEqual(rateController.enterAuthenticatedAttempt("rate-subject"), {
    allowed: false,
    code: "subject_rate",
  });

  const cleanupController = new RemoteMcpAdmissionController(() => now);
  const oldSubject = cleanupController.enterAuthenticatedAttempt("old-subject");
  assert.equal(oldSubject.allowed, true);
  oldSubject.release();
  now += 3_600_001;
  const currentSubject = cleanupController.enterAuthenticatedAttempt("current-subject");
  assert.equal(currentSubject.allowed, true);
  currentSubject.release();
  assert.equal(cleanupController.snapshot().subjectEntries, 1);
});

test("PR137 enforces depth string aggregate-array and timeout limits", async () => {
  let deep = { leaf: true };
  for (let index = 0; index < 65; index += 1) deep = { nested: deep };
  assert.equal(validateRemoteMcpJsonLimits(deep), "json_depth_exceeded");
  assert.equal(validateRemoteMcpJsonLimits({ value: "x".repeat(65_537) }), "json_string_exceeded");
  assert.equal(validateRemoteMcpJsonLimits({ values: Array.from({ length: 4_097 }, () => 0) }), "json_array_elements_exceeded");
  assert.equal(validateRemoteMcpJsonLimits({ values: Array.from({ length: 4_096 }, () => 0) }), null);

  await assert.rejects(
    () => withRemoteMcpDeadline(new Promise(() => {}), 5),
    RemoteMcpRequestTimeoutError,
  );
  assert.equal(await withRemoteMcpDeadline(Promise.resolve("ok"), 100), "ok");

  let settleTimedOutTask;
  let releases = 0;
  let cancellations = 0;
  const timedOutTask = new Promise((resolve) => {
    settleTimedOutTask = resolve;
  });
  await assert.rejects(
    () => withRemoteMcpAdmissionDeadline(
      timedOutTask,
      5,
      () => { releases += 1; },
      () => { cancellations += 1; },
    ),
    RemoteMcpRequestTimeoutError,
  );
  assert.equal(cancellations, 1);
  assert.equal(releases, 0, "the concurrency slot must remain held while timed-out work is unsettled");
  settleTimedOutTask("settled");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(releases, 1);

  let successfulReleases = 0;
  assert.equal(await withRemoteMcpAdmissionDeadline(
    Promise.resolve("completed"),
    100,
    () => { successfulReleases += 1; },
    () => assert.fail("completed work must not be cancelled"),
  ), "completed");
  assert.equal(successfulReleases, 1);
});

function runtimeConfig() {
  return {
    port: 3000,
    nodeEnv: "test",
    publicUrl: new URL("http://127.0.0.1/"),
    resourceUrl: new URL("http://127.0.0.1/mcp"),
    issuer: new URL("https://tenant.example/"),
    audience: "https://norma.example/api",
    auditHashKey: "test-only-audit-key-that-is-at-least-32-characters",
    allowedOrigins: new Set(),
  };
}

async function deterministicVerifier(token) {
  if (!token.startsWith("valid-")) throw new Error("invalid token");
  return {
    rawToken: token,
    subjectId: `pseudonymous-${token.slice("valid-".length)}`,
    scopes: ["norma:structured-analyze"],
    clientId: "test-client",
    expiresAt: Math.floor(Date.now() / 1000) + 300,
  };
}

function initializeRequest(version) {
  return {
    jsonrpc: "2.0",
    id: "initialize",
    method: "initialize",
    params: {
      protocolVersion: version,
      capabilities: {},
      clientInfo: { name: "pr137-test", version: "1.0.0" },
    },
  };
}

function authorizedHeaders() {
  return {
    host: "127.0.0.1",
    authorization: "Bearer valid-subject-a",
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
}

function mcpRequest(port, body, overrides = {}) {
  const headers = { ...authorizedHeaders(), ...overrides };
  if (overrides.authorization === undefined && Object.hasOwn(overrides, "authorization")) {
    delete headers.authorization;
  }
  if (!Array.isArray(body) && body.method !== "initialize") {
    headers["mcp-protocol-version"] = protocol;
  }
  return request(port, {
    method: "POST",
    path: "/mcp",
    headers,
    body: JSON.stringify(body),
  });
}

function request(port, options) {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1",
      port,
      method: options.method,
      path: options.path,
      headers: { host: "127.0.0.1", ...(options.headers ?? {}) },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: response.statusCode,
          headers: response.headers,
          text,
          json: text === "" ? null : JSON.parse(text),
        });
      });
    });
    request.on("error", reject);
    if (options.body !== undefined) request.write(options.body);
    request.end();
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
