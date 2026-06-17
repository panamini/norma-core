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
  assertAccepted(runEnvelope(), "run");
  assertAccepted(runVerification(), "run-verification");
  assertAccepted(artifactFreshnessVerification(), "artifact-freshness-verification");
  assertAccepted(runReplay(), "run-replay");
  assertAccepted(mvpDemoResult(), "mvp-demo-result");
  assertAccepted(apiResponse(), "api-response");
  assertAccepted(apiError(), "api-error");
  assertAccepted(cliResult(), "cli-result");
  assertAccepted(cliError(), "cli-error");
  assertAccepted({ ...mcpToolResult("norma.getVersion"), result: { version: "0.0.0-test" } }, "mcp-tool-result");
  assertAccepted(jsonRpcToolResponse(mcpToolResult("norma.replayMvpDemo")), "mcp-tool-result");
});

test("PR58 rejects incomplete known envelope candidates", () => {
  const incompleteInputs = [
    { kind: "run" },
    { kind: "run-verification", status: "verified" },
    { kind: "artifact-freshness-verification", status: "current" },
    { kind: "run-replay", status: "replayed" },
    { kind: "mvp-demo-result", status: "ok" },
    { statusCode: 200, body: { kind: "norma-api-response", status: "ok" } },
    { statusCode: 400, body: { kind: "norma-api-error", status: "rejected", error: { code: "Bad" } } },
    { kind: "norma-core-cli-result", command: "version", status: "ok" },
    { kind: "norma-core-cli-error", command: "verify-run", status: "error" },
    { kind: "norma-mcp-tool-result", tool: "norma.getVersion" },
  ];

  for (const input of incompleteInputs) {
    assertRejected(input, "UnknownEnvelope");
  }
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
  assertRejected({ jsonrpc: "2.0", result: { content: [], structuredContent: mcpToolResult("norma.getVersion"), isError: false } }, "GenericJsonRpcEnvelopeRejected");
  assertRejected({ jsonrpc: "2.0", id: "missing-content", result: { structuredContent: mcpToolResult("norma.getVersion"), isError: false } }, "GenericJsonRpcEnvelopeRejected");
  assertRejected({ jsonrpc: "2.0", id: "error-result", result: { content: [], structuredContent: mcpToolResult("norma.getVersion"), isError: true } }, "GenericJsonRpcEnvelopeRejected");

  for (const extraKey of ["method", "params", "error"]) {
    assertRejected(
      {
        jsonrpc: "2.0",
        id: "bad-response",
        result: {
          content: [{ type: "text", text: json(mcpToolResult("norma.getVersion")) }],
          structuredContent: mcpToolResult("norma.getVersion"),
          isError: false,
        },
        [extraKey]: extraKey === "method" ? "tools/list" : {},
      },
      extraKey === "error" ? "JsonRpcErrorRejected" : "GenericJsonRpcEnvelopeRejected",
    );
  }

  for (const tool of approvedMcpTools) {
    assertAccepted(jsonRpcToolResponse(mcpToolResult(tool), tool), "mcp-tool-result");
  }
});

test("PR58 rejects unsupported source-truth and execution-shaped inputs", () => {
  const rejectedInputs = [
    { prompt: "make a Norma result" },
    { artifact: { kind: "artifact" } },
    { sourceTruth: true },
    { replay: { arbitrary: true } },
    { path: "/replay-run" },
    { replayRunPath: "/replay-run" },
    { kind: "run", tool: "norma.replayRun" },
    { kind: "run-verification", replay: { arbitrary: true } },
    { kind: "mvp-demo-result", urlRetrieval: "example.invalid/result.json" },
    { tool: "norma.replayRun" },
    { path: "/replay-mvp-demo", run: {} },
    { camera: true },
    { image: "frame.png" },
    { vision: true },
    { cad: true },
    { plugin: true },
    { marketplace: true },
    { url: "https://example.invalid/result.json" },
    { urlRetrieval: "example.invalid/result.json" },
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
    assert.deepEqual(changedFiles.filter(isForbiddenStructuredJsonViewerChange), []);
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

function ref(kind = "run", value = `${kind}:test`) {
  return { kind, ref: value };
}

function idRef(value) {
  return { id: value };
}

function outputRefs(refs = [ref("core-result", "core-result:test")]) {
  return { kind: "output-refs", refs };
}

function provenance() {
  return {
    operationName: "core.mvp-demo.run",
    operationVersion: "0.1.0-test",
    inputRefs: [ref("mvp-demo-input", "mvp-demo:structured-input")],
    source: ref("core", "pr58-test"),
  };
}

function runEnvelope(overrides = {}) {
  return {
    kind: "run",
    id: "run:test",
    runRef: idRef("run:test"),
    coreVersion: "0.1.0-test",
    operationName: "core.mvp-demo.run",
    operationVersion: "0.1.0-test",
    input: null,
    inputRefs: [ref("mvp-demo-input", "mvp-demo:structured-input")],
    packLockRef: idRef("pack-lock:test"),
    operationContextRef: idRef("operation-context:test"),
    outputRefs: outputRefs(),
    replayReadinessStatus: "replay_ready",
    warnings: [],
    errors: [],
    provenance: provenance(),
    metadata: {},
    ...overrides,
  };
}

function runVerification(overrides = {}) {
  return {
    kind: "run-verification",
    status: "verified",
    mode: "audit_only",
    runRef: idRef("run:test"),
    operationName: "core.mvp-demo.run",
    operationVersion: "0.1.0-test",
    packLockRef: idRef("pack-lock:test"),
    operationContextRef: idRef("operation-context:test"),
    sourceRefs: [ref("mvp-demo-input", "mvp-demo:structured-input")],
    missingSourceRefs: [],
    outputRefs: [ref("core-result", "core-result:test")],
    mismatchCodes: [],
    warnings: [],
    errors: [],
    provenance: provenance(),
    replaySummary: {
      replayAttempted: false,
      replayRequired: false,
      replayEligible: "not_requested",
      replayStatus: null,
      replayDiagnostics: [],
      replayMismatches: [],
      replayOutputRefs: [],
      recordedOutputRefs: [ref("core-result", "core-result:test")],
      sourceRefsUsed: [ref("mvp-demo-input", "mvp-demo:structured-input")],
    },
    serializationSummary: {
      serializationVersion: "stable-json-v1",
      canonicalOrdering: true,
    },
    ...overrides,
  };
}

function artifactFreshnessVerification(overrides = {}) {
  return {
    kind: "artifact-freshness-verification",
    status: "current",
    artifactRef: ref("artifact", "artifact:test"),
    sourceRefs: [ref("mvp-demo-input", "mvp-demo:structured-input")],
    missingSourceRefs: [],
    staleSourceRefs: [],
    outputRefs: [ref("artifact", "artifact:test")],
    warnings: [],
    errors: [],
    provenance: provenance(),
    serializationSummary: {
      serializationVersion: "stable-json-v1",
      canonicalOrdering: true,
    },
    ...overrides,
  };
}

function runReplay(overrides = {}) {
  return {
    kind: "run-replay",
    status: "replayed",
    replayAttempted: true,
    replayRequired: true,
    operationName: "core.mvp-demo.run",
    operationVersion: "0.1.0-test",
    recordedRunRef: idRef("run:recorded"),
    replayedRunRef: idRef("run:replayed"),
    packLockRef: idRef("pack-lock:test"),
    operationContextRef: idRef("operation-context:test"),
    recordedOutputRefs: [ref("core-result", "core-result:recorded")],
    replayedOutputRefs: [ref("core-result", "core-result:replayed")],
    sourceRefsUsed: [ref("mvp-demo-input", "mvp-demo:structured-input")],
    mismatches: [],
    verification: runVerification(),
    warnings: [],
    errors: [],
    provenance: provenance(),
    serializationSummary: {
      serializationVersion: "stable-json-v1",
      canonicalOrdering: true,
    },
    ...overrides,
  };
}

function mvpDemoResult(overrides = {}) {
  return {
    kind: "mvp-demo-result",
    inputSummary: {},
    constructionResult: coreResult(),
    measurementAResult: coreResult(),
    measurementBResult: coreResult(),
    evaluationAResult: coreResult(),
    evaluationBResult: coreResult(),
    comparisonResult: coreResult(),
    explanationResult: {},
    artifactResults: {},
    visualArtifactResult: coreResult(),
    runEnvelope: runEnvelope(),
    demoReport: {},
    negativeCaseResults: [],
    warnings: [],
    errors: [],
    outputRefs: [ref("core-result", "core-result:test")],
    packLock: {},
    packLockRef: idRef("pack-lock:test"),
    operationContext: {},
    operationContextRef: idRef("operation-context:test"),
    ...overrides,
  };
}

function apiResponse(overrides = {}) {
  return {
    statusCode: 200,
    body: {
      kind: "norma-api-response",
      status: "ok",
      request: { method: "GET", path: "/version", route: "GET /version", localOnly: true },
      result: { ok: true },
      ...overrides,
    },
  };
}

function apiError(overrides = {}) {
  return {
    statusCode: 400,
    body: {
      kind: "norma-api-error",
      status: "rejected",
      request: { method: "POST", path: "/verify-run", route: "POST /verify-run", localOnly: true },
      error: { code: "Bad", message: "Bad request." },
      ...overrides,
    },
  };
}

function cliResult(overrides = {}) {
  return {
    kind: "norma-core-cli-result",
    command: "version",
    status: "ok",
    coreVersion: "0.1.0-test",
    exitCode: 0,
    result: { ok: true },
    ...overrides,
  };
}

function cliError(overrides = {}) {
  return {
    kind: "norma-core-cli-error",
    command: "verify-run",
    status: "error",
    coreVersion: "0.1.0-test",
    exitCode: 1,
    error: { code: "Bad", message: "Bad request." },
    ...overrides,
  };
}

function mcpToolResult(tool) {
  return {
    kind: "norma-mcp-tool-result",
    tool,
    status: "ok",
    result: { ok: true },
  };
}

function jsonRpcToolResponse(structuredContent, id = "accepted") {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: json(structuredContent) }],
      structuredContent,
      isError: false,
    },
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

function isForbiddenStructuredJsonViewerChange(file) {
  return [
    "package.json",
    "package-lock.json",
    "src/index.ts",
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
  ].some((forbiddenPath) => file === forbiddenPath || file.startsWith(`${forbiddenPath}/`));
}

function gitChangedFiles() {
  const baselineProbes = [
    gitChangedFilesFor(["diff", "--name-only", "main...HEAD"]),
    gitChangedFilesFor(["diff", "--name-only", "origin/main...HEAD"]),
    gitChangedFilesFor(["diff", "--name-only", "master...HEAD"]),
    gitChangedFilesFor(["diff", "--name-only", "origin/master...HEAD"]),
  ];
  const successfulBaseline = baselineProbes.filter((files) => files !== null);
  assert.notEqual(
    successfulBaseline.length,
    0,
    "Unable to inspect branch changed files with git",
  );
  const probes = [
    ...successfulBaseline,
    gitChangedFilesFor(["diff", "--name-only"]),
    gitChangedFilesFor(["diff", "--cached", "--name-only"]),
    gitChangedFilesFor(["ls-files", "--others", "--exclude-standard"]),
  ];
  const successful = probes.filter((files) => files !== null);
  assert.notEqual(successful.length, 0, "Unable to inspect changed files with git");
  return successful
    .flat()
    .filter((file, index, files) => files.indexOf(file) === index)
    .sort();
}

function gitChangedFilesFor(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return null;
  }
}
