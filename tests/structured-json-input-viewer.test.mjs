import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  STRUCTURED_JSON_INPUT_VIEWER_LIMITS,
  parseStructuredJsonInput,
} from "../dist/src/structured-json-input-viewer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const requiredSectionKeys = [
  "status",
  "diagnostics",
  "warnings",
  "errors",
  "mismatchDetails",
  "provenance",
  "sourceRefs",
  "outputRefs",
  "artifactFreshness",
  "operationContext",
  "packLocks",
  "tolerancePolicy",
  "serializationVersion",
  "operationVersion",
  "resultIdentity",
  "unknownFields",
];

const approvedMcpTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];

test("PR58 rejects malformed JSON and non-object JSON", () => {
  assertRejected("{", "MalformedJson");
  for (const input of ["null", "true", "1", "\"text\"", "[]"]) {
    assertRejected(input, "InvalidJsonObject");
  }
});

test("PR58 enforces PR53 body depth array and string limits", () => {
  assert.deepEqual(STRUCTURED_JSON_INPUT_VIEWER_LIMITS, {
    maxBodyBytes: 65_536,
    maxJsonDepth: 32,
    maxArrayLength: 1_024,
    maxStringLength: 16_384,
  });

  assertRejected(`{"value":"${"x".repeat(65_536)}"}`, "BodyTooLarge");
  assertRejected(json(makeDeepObject(33)), "JsonDepthLimitExceeded");
  assertRejected(json({ value: new Array(1_025).fill(0) }), "JsonArrayLimitExceeded");
  assertRejected(json({ value: "x".repeat(16_385) }), "JsonStringLimitExceeded");
});

test("PR58 accepts only the full current CoreResult shape as core-result", () => {
  const accepted = assertAccepted(coreResult({ extraResultField: { inspectable: true } }), "core-result");
  assert.equal(accepted.unknownFields.includes("extraResultField"), true);
  assert.deepEqual(accepted.inspectableUnknowns[0], {
    sourcePath: ["extraResultField"],
    value: { inspectable: true },
  });

  const partial = parse({ ...omit(coreResult(), "output") });
  assert.equal(partial.status, "rejected");
  assert.notEqual(partial.detectedEnvelopeKind, "core-result");
});

test("PR58 accepts current verified Norma result and wrapper envelopes", () => {
  assertAccepted({ kind: "run", id: "run:test" }, "run");
  assertAccepted({ kind: "run-verification", status: "verified" }, "run-verification");
  assertAccepted(
    { kind: "artifact-freshness-verification", status: "current" },
    "artifact-freshness-verification",
  );
  assertAccepted({ kind: "run-replay", status: "replayed" }, "run-replay");
  assertAccepted({ kind: "mvp-demo-result", status: "ok" }, "mvp-demo-result");
  assertAccepted({ statusCode: 200, body: { kind: "norma-api-response", status: "ok" } }, "api-response");
  assertAccepted(
    { statusCode: 400, body: { kind: "norma-api-error", status: "rejected", error: { code: "Bad" } } },
    "api-error",
  );
  assertAccepted({ kind: "norma-core-cli-result", command: "version", status: "ok" }, "cli-result");
  assertAccepted({ kind: "norma-core-cli-error", command: "verify-run", status: "error" }, "cli-error");
  assertAccepted(mcpToolResult("norma.getVersion"), "mcp-tool-result");
  assertAccepted(
    {
      jsonrpc: "2.0",
      id: "accepted",
      result: { structuredContent: mcpToolResult("norma.replayMvpDemo") },
    },
    "mcp-tool-result",
  );
});

test("PR58 applies strict completed MCP JSON-RPC response rules", () => {
  assertRejected(jsonRpcRequest("tools/list"), "JsonRpcRequestRejected");
  assertRejected({ jsonrpc: "2.0", method: "tools/list" }, "JsonRpcNotificationRejected");
  assertRejected(
    { jsonrpc: "2.0", id: "error", error: { code: -32603, message: "Internal error" } },
    "JsonRpcErrorRejected",
  );
  assertRejected(jsonRpcRequest("tools/call", { name: "norma.getVersion", arguments: {} }), "ArbitraryToolCallRejected");
  assertRejected(mcpToolResult("norma.unknown"), "UnsupportedMcpTool");
  assertRejected(mcpToolResult("norma.replayRun"), "NormaReplayRunRejected");

  for (const extraKey of ["method", "params", "error"]) {
    assertRejected(
      {
        jsonrpc: "2.0",
        id: "bad-response",
        result: { structuredContent: mcpToolResult("norma.getVersion") },
        [extraKey]: extraKey === "method" ? "tools/list" : {},
      },
      extraKey === "error" ? "JsonRpcErrorRejected" : "GenericJsonRpcEnvelopeRejected",
    );
  }

  for (const tool of approvedMcpTools) {
    assertAccepted(
      { jsonrpc: "2.0", id: tool, result: { structuredContent: mcpToolResult(tool) } },
      "mcp-tool-result",
    );
  }
});

test("PR58 rejects unsupported source-truth and execution-shaped inputs", () => {
  const rejectedInputs = [
    { prompt: "make a Norma result" },
    { artifact: { kind: "artifact" } },
    { sourceTruth: true },
    { replay: { arbitrary: true } },
    { path: "/replay-run" },
    { tool: "norma.replayRun" },
    { path: "/replay-mvp-demo", run: {} },
    { camera: true },
    { image: "frame.png" },
    { vision: true },
    { cad: true },
    { plugin: true },
    { marketplace: true },
    { url: "https://example.invalid/result.json" },
    { filePath: "/tmp/result.json" },
    { writeFile: "/tmp/out.json" },
    { mutation: true },
    { createSourceTruth: true },
  ];

  for (const input of rejectedInputs) {
    assertRejected(input, "UnsupportedInput");
  }
});

test("PR58 visible sections are stable complete and keep critical diagnostics visible", () => {
  const warning = diagnostic("CriticalWarningNotSuppressible", "critical");
  const error = diagnostic("MissingProvenance", "error");
  const model = assertAccepted(coreResult({ warnings: [warning], errors: [error] }), "core-result");

  assert.deepEqual(model.visibleSections.map((section) => section.key), requiredSectionKeys);
  for (const visibleSection of model.visibleSections) {
    assert.equal(typeof visibleSection.label, "string");
    assert.equal(typeof visibleSection.present, "boolean");
    assert.equal(Array.isArray(visibleSection.sourcePath), true);
    assert.equal(Object.hasOwn(visibleSection, "value"), true);
  }
  assert.deepEqual(section(model, "warnings").value, [warning]);
  assert.deepEqual(section(model, "errors").value, [error]);

  const sparse = assertAccepted(mcpToolResult("norma.getVersion"), "mcp-tool-result");
  for (const key of requiredSectionKeys) {
    assert.equal(section(sparse, key).key, key);
  }
  assert.equal(section(sparse, "warnings").present, false);
  assert.equal(section(sparse, "warnings").value, null);
});

test("PR58 keeps package root exports unchanged and adds no forbidden surfaces", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const indexSource = readFileSync(join(repoRoot, "src", "index.ts"), "utf8");

  assert.deepEqual(Object.keys(packageJson.exports ?? {}).sort(), ["."]);
  assert.equal(indexSource.includes("structured-json-input-viewer"), false);
  assert.equal(indexSource.includes("parseStructuredJsonInput"), false);

  for (const forbiddenPath of [
    "src/ui",
    "src/viewer",
    "src/app",
    "src/server",
    "src/routes",
    "src/http",
    "bin/norma-core-server.mjs",
    "bin/norma-core-api.mjs",
    "Dockerfile",
    "docker-compose.yml",
    "vercel.json",
    "wrangler.toml",
  ]) {
    assert.equal(existsSync(join(repoRoot, forbiddenPath)), false, `${forbiddenPath} must remain absent`);
  }

  const changedFiles = gitChangedFiles();
  if (changedFiles.some((file) => file.includes("structured-json-input-viewer"))) {
    assert.deepEqual(changedFiles, [
      "src/structured-json-input-viewer.ts",
      "tests/structured-json-input-viewer.test.mjs",
    ]);
  }
});

function parse(input) {
  return parseStructuredJsonInput(typeof input === "string" ? input : json(input));
}

function assertAccepted(input, detectedEnvelopeKind) {
  const model = parse(input);
  assert.equal(model.kind, "structured-json-input-display-model");
  assert.equal(model.status, "accepted");
  assert.equal(model.detectedEnvelopeKind, detectedEnvelopeKind);
  assert.deepEqual(model.rejectionReasons, []);
  assert.deepEqual(model.limits.maxBodyBytes, STRUCTURED_JSON_INPUT_VIEWER_LIMITS.maxBodyBytes);
  return model;
}

function assertRejected(input, code) {
  const model = parse(input);
  assert.equal(model.kind, "structured-json-input-display-model");
  assert.equal(model.status, "rejected");
  assert.equal(model.detectedEnvelopeKind, "unknown");
  assert.equal(model.rejectionReasons.some((reason) => reason.code === code), true, `${code} should reject input`);
  return model;
}

function section(model, key) {
  const visibleSection = model.visibleSections.find((item) => item.key === key);
  assert.notEqual(visibleSection, undefined, `${key} section should exist`);
  return visibleSection;
}

function coreResult(overrides = {}) {
  return {
    status: "ok",
    warnings: [],
    errors: [],
    provenance: null,
    outputRefs: [],
    runRef: null,
    packLockRef: null,
    operationContextRef: null,
    output: null,
    ...overrides,
  };
}

function diagnostic(code, severity) {
  return {
    code,
    severity,
    message: `${code} remains visible.`,
    targetRef: null,
    source: { kind: "core", ref: "pr58-test" },
    blocking: severity === "error",
    provenance: null,
  };
}

function mcpToolResult(tool) {
  return {
    kind: "norma-mcp-tool-result",
    tool,
    status: "ok",
  };
}

function jsonRpcRequest(method, params = {}) {
  return {
    jsonrpc: "2.0",
    id: "request",
    method,
    params,
  };
}

function makeDeepObject(depth) {
  let value = {};
  for (let index = 0; index < depth; index += 1) {
    value = { child: value };
  }
  return value;
}

function omit(value, key) {
  const clone = { ...value };
  delete clone[key];
  return clone;
}

function json(value) {
  return JSON.stringify(value);
}

function gitChangedFiles() {
  try {
    return execFileSync("git", ["diff", "--name-only", "main...HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}
