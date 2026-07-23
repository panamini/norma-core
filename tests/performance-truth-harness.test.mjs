import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import {
  handleMcpJsonRpcMessage,
  handleMcpJsonRpcRequest,
} from "../dist/src/mcp/stdio-protocol.js";
import {
  createRemoteMcpHttpServer,
} from "../dist/src/mcp/remote-http-server.js";
import { RemoteMcpAdmissionController } from "../dist/src/mcp/remote-http-limits.js";
import {
  ACTIVE_BENCHMARK_EXECUTION_BUDGET,
  assertMatchingPerformanceTruthIdentity,
  assertPrivacySafePerformanceTruthLedgerRow,
  createEmptyPerformanceTruthLedger,
  PERFORMANCE_TRUTH_HARNESS_VERSION,
  runPerformanceTruthCase,
} from "../dist/src/performance-truth-harness.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const commitSha = "93096299523d3ad376f7650b32fa4a5d3a98389b";
const analyzeToolName = "norma.analyzeStructuredCompositionV1";
const protocolVersion = "2025-11-25";
const fixtureIdentities = Object.freeze({
  "alignment-basic": "sha256:5bc4528ffc9f31fdc2782e5733f4f869b45e8ae3b0566936d639a70ae428aadc",
  "boundary-case": "sha256:a856d5d1821739b0a6341c0ebeff4b1c2623dfa9d0b0faba6530c4c95c71c868",
});

test("PR257 defines a zero-execution privacy-safe ledger contract", () => {
  assert.equal(PERFORMANCE_TRUTH_HARNESS_VERSION, "norma.performance-truth-harness@1");
  assert.deepEqual(ACTIVE_BENCHMARK_EXECUTION_BUDGET, {
    total: 10,
    pr257: 0,
    remainingAfterPr257: 10,
  });
  assert.deepEqual(createEmptyPerformanceTruthLedger(), []);
});

test("PR257 measures direct Core on the existing simple fixture without changing identity", async () => {
  const input = await readScenario("alignment-basic");
  const expected = core.analyzeStructuredCompositionV1(structuredClone(input));
  const expectedIdentity = resultIdentity(expected);
  assert.equal(expectedIdentity, fixtureIdentities["alignment-basic"]);
  const measured = await runPerformanceTruthCase({
    runNumber: 1,
    scenario: "core-direct-simple",
    phase: "provider-free-fixture-inspection",
    commitSha,
    clock: deterministicClock(),
    expectedResultIdentity: expectedIdentity,
    execute: async ({ measureStage, measureRequest }) => {
      const result = await measureRequest(() => measureStage(
        "core_ms",
        () => core.analyzeStructuredCompositionV1(structuredClone(input)),
      ));
      await measureStage("serialization_ms", () => core.serializeCanonicalJson(result));
      return {
        result,
        resultIdentity: resultIdentity(result),
        notes: "direct Core simple fixture; no active benchmark",
      };
    },
  });

  assert.deepEqual(measured.result, expected);
  assert.equal(measured.row.core_ms, 1);
  assert.equal(measured.row.request_total_ms, 3);
  assert.equal(measured.row.serialization_ms, 1);
  assert.equal(measured.row.auth_ms, null);
  assert.equal(measured.row.widget_first_useful_paint_ms, null);
  assert.equal(measured.row.end_to_end_ms, measured.row.request_total_ms);
  assertPrivacySafePerformanceTruthLedgerRow(measured.row);
});

test("PR257 measures the existing valid boundary fixture without changing identity", async () => {
  const input = await readScenario("boundary-case");
  const expected = core.analyzeStructuredCompositionV1(structuredClone(input));
  const expectedIdentity = resultIdentity(expected);
  assert.equal(expectedIdentity, fixtureIdentities["boundary-case"]);
  const measured = await runPerformanceTruthCase({
    runNumber: 2,
    scenario: "core-direct-boundary",
    phase: "provider-free-fixture-inspection",
    commitSha,
    clock: deterministicClock(),
    expectedResultIdentity: expectedIdentity,
    execute: async ({ measureStage, measureRequest }) => {
      const result = await measureRequest(() => measureStage(
        "core_ms",
        () => core.analyzeStructuredCompositionV1(structuredClone(input)),
      ));
      await measureStage("serialization_ms", () => core.serializeCanonicalJson(result));
      return {
        result,
        resultIdentity: resultIdentity(result),
        notes: "direct Core boundary fixture; no active benchmark",
      };
    },
  });

  assert.equal(measured.result.status, "valid");
  assert.equal(measured.result.decision.status, "tie");
  assert.equal(measured.row.result_identity, expectedIdentity);
  assertPrivacySafePerformanceTruthLedgerRow(measured.row);
});

test("PR257 measures the real local STDIO entry point and preserves Core output", async () => {
  const input = await readScenario("alignment-basic");
  const direct = core.analyzeStructuredCompositionV1(structuredClone(input));
  const expectedIdentity = resultIdentity(direct);
  const request = analyzeRequest(input, "stdio-simple");
  const rawRequest = JSON.stringify(request);
  const measured = await runPerformanceTruthCase({
    runNumber: 3,
    scenario: "mcp-stdio-simple",
    phase: "provider-free-fixture-inspection",
    commitSha,
    clock: deterministicClock(),
    expectedResultIdentity: expectedIdentity,
    execute: async ({ measureStage, measureRequest }) => {
      await measureStage("request_parse_ms", () => JSON.parse(rawRequest));
      const response = await measureRequest(() => measureStage(
        "mcp_dispatch_ms",
        () => JSON.parse(handleMcpJsonRpcMessage(rawRequest)),
      ));
      const result = response.result.structuredContent.result;
      await measureStage("serialization_ms", () => core.serializeCanonicalJson(result));
      assertMatchingPerformanceTruthIdentity(expectedIdentity, resultIdentity(result));
      return {
        result,
        resultIdentity: resultIdentity(result),
        notes: "local STDIO parser and dispatch; no active benchmark",
      };
    },
  });

  assert.deepEqual(measured.result, direct);
  assert.equal(measured.row.request_parse_ms, 1);
  assert.equal(measured.row.mcp_dispatch_ms, 1);
  assert.equal(measured.row.transport_ms, null);
  assertPrivacySafePerformanceTruthLedgerRow(measured.row);
});

test("PR257 measures authenticated Streamable HTTP with a deterministic local verifier", async (t) => {
  const input = await readScenario("alignment-basic");
  const direct = core.analyzeStructuredCompositionV1(structuredClone(input));
  const expectedIdentity = resultIdentity(direct);
  const logs = [];
  const admission = new RemoteMcpAdmissionController(() => 1_000);
  const server = createRemoteMcpHttpServer(runtimeConfig(), {
    verifyAccessToken: deterministicVerifier,
    admissionController: admission,
    log: (event) => logs.push(event),
  });
  await listen(server);
  t.after(() => close(server));
  const port = server.address().port;
  const initialize = await mcpRequest(port, initializeRequest());
  assert.equal(initialize.status, 200);

  const request = analyzeRequest(input, "http-simple");
  const measured = await runPerformanceTruthCase({
    runNumber: 4,
    scenario: "mcp-streamable-http-authenticated-simple",
    phase: "provider-free-fixture-inspection",
    commitSha,
    clock: deterministicClock(),
    expectedResultIdentity: expectedIdentity,
    execute: async ({ measureStage, measureRequest }) => {
      await measureStage("request_parse_ms", () => JSON.parse(JSON.stringify(request)));
      await measureStage("auth_verify_ms", () => deterministicVerifier("deterministic-local-token"));
      await measureStage("admission_ms", () => {
        const result = admission.enterAuthenticatedAttempt("pseudonymous-test-subject");
        assert.equal(result.allowed, true);
        result.release();
        return result;
      });
      const localDispatch = await measureStage(
        "mcp_dispatch_ms",
        () => handleMcpJsonRpcRequest(request),
      );
      assertMatchingPerformanceTruthIdentity(
        expectedIdentity,
        resultIdentity(localDispatch.result.structuredContent.result),
      );
      await measureStage("serialization_ms", () => core.serializeCanonicalJson(localDispatch.result.structuredContent));
      const remote = await measureStage(
        "transport_ms",
        () => measureRequest(() => mcpRequest(port, request)),
      );
      assert.equal(remote.status, 200);
      const result = remote.json.result.structuredContent.result;
      assertMatchingPerformanceTruthIdentity(expectedIdentity, resultIdentity(result));
      return {
        result,
        resultIdentity: resultIdentity(result),
        notes: "authenticated Streamable HTTP with deterministic local verifier; no active benchmark",
      };
    },
  });

  assert.deepEqual(measured.result, direct);
  assert.equal(measured.row.auth_ms, measured.row.auth_verify_ms);
  assert.equal(measured.row.transport_ms, 3);
  assert.equal(measured.row.end_to_end_ms, measured.row.request_total_ms);
  assert.ok(logs.some((event) => event.outcome === "allow"));
  assert.equal(JSON.stringify(logs).includes("deterministic-local-token"), false);
  assertPrivacySafePerformanceTruthLedgerRow(measured.row);
});

test("PR257 refuses incompatible clocks and cross-analysis identity mixing", async () => {
  await assert.rejects(
    () => runPerformanceTruthCase({
      runNumber: 5,
      scenario: "core-direct-simple",
      phase: "clock-contract",
      commitSha,
      clock: {
        monotonicNow: (() => {
          const values = [10, 9];
          return () => values.shift() ?? 9;
        })(),
        utcNow: () => "2026-07-24T00:00:00.000Z",
      },
      execute: async ({ measureRequest }) => {
        await measureRequest(() => "never");
        return { result: "never", resultIdentity: "sha256:" + "0".repeat(64) };
      },
    }),
    /non-decreasing monotonic/u,
  );

  assert.throws(
    () => assertMatchingPerformanceTruthIdentity(
      "sha256:" + "0".repeat(64),
      "sha256:" + "1".repeat(64),
    ),
    /identity mismatch/u,
  );
});

test("PR257 leaves admission capacity releasable after deterministic measurement", async () => {
  const controller = new RemoteMcpAdmissionController(() => 1_000);
  const first = controller.enterAuthenticatedAttempt("subject-a");
  const second = controller.enterAuthenticatedAttempt("subject-a");
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.deepEqual(controller.enterAuthenticatedAttempt("subject-a"), {
    allowed: false,
    code: "subject_concurrency",
  });
  first.release();
  second.release();
  assert.deepEqual(controller.snapshot(), {
    authenticatedAttempts: 2,
    unauthorizedAttempts: 0,
    subjectEntries: 1,
  });
});

async function readScenario(name) {
  return JSON.parse(await readFile(join(repoRoot, "examples", "structured-analyze", "scenarios", `${name}.json`), "utf8"));
}

function resultIdentity(result) {
  assert.equal(result.status, "valid");
  const identity = `sha256:${createHash("sha256")
    .update(core.serializeCanonicalJson(result))
    .digest("hex")}`;
  assert.match(identity, /^sha256:[0-9a-f]{64}$/u);
  return identity;
}

function analyzeRequest(input, id) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: analyzeToolName,
      arguments: { input },
    },
  };
}

function initializeRequest() {
  return {
    jsonrpc: "2.0",
    id: "initialize",
    method: "initialize",
    params: {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "pr257-harness", version: "1.0.0" },
    },
  };
}

function runtimeConfig() {
  return {
    port: 3000,
    nodeEnv: "test",
    publicUrl: new URL("http://127.0.0.1/"),
    resourceUrl: new URL("http://127.0.0.1/mcp"),
    issuer: new URL("https://tenant.example/"),
    audience: "https://norma.example/api",
    auditHashKey: "pr257-test-audit-key",
    allowedOrigins: new Set(),
  };
}

async function deterministicVerifier(token) {
  if (token !== "deterministic-local-token") throw new Error("invalid test token");
  return {
    rawToken: "deterministic-local-token",
    subjectId: "pseudonymous-test-subject",
    scopes: ["norma:structured-analyze"],
    clientId: "pr257-test-client",
    expiresAt: 2_000,
  };
}

function authorizedHeaders() {
  return {
    host: "127.0.0.1",
    authorization: "Bearer deterministic-local-token",
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
}

function mcpRequest(port, body) {
  return request(port, {
    method: "POST",
    path: "/mcp",
    headers: {
      ...authorizedHeaders(),
      ...(body.method === "initialize" ? {} : { "mcp-protocol-version": protocolVersion }),
    },
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
      headers: {
        ...options.headers,
        ...(options.body === undefined ? {} : { "content-length": Buffer.byteLength(options.body) }),
      },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = text === "" ? null : JSON.parse(text);
        } catch {
          json = null;
        }
        resolve({
          status: response.statusCode,
          headers: response.headers,
          json,
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
  return new Promise((resolve) => server.close(() => resolve()));
}

function deterministicClock() {
  let next = 1_000;
  return {
    monotonicNow() {
      const value = next;
      next += 1;
      return value;
    },
    utcNow() {
      return "2026-07-24T00:00:00.000Z";
    },
  };
}
