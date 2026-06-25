import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseStructuredJsonInput } from "../dist/src/structured-json-input-viewer.js";
import {
  VERIFICATION_REPLAY_RESULT_VIEWER_SECTION_KEYS,
  createVerificationReplayResultDisplayModel,
} from "../dist/src/verification-replay-result-viewer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const pr71ApprovedChangedFiles = [
  "src/index.ts",
  "src/measurements.ts",
  "tests/core-skeleton.test.mjs",
  "tests/measurements.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
];

const r6bStructuredAnalyzeImplementationChangedFiles = [
  "src/index.ts",
  "src/structured-composition-analysis.ts",
  "tests/package-consumption.test.mjs",
  "tests/structured-composition-analysis.test.mjs",
];

const r6bStructuredAnalyzeGuardMaintenanceChangedFiles = [
  ...r6bStructuredAnalyzeImplementationChangedFiles,
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-json-input-viewer-prototype-approval.test.mjs",
  "tests/structured-json-input-viewer.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
  "tests/verification-replay-result-viewer.test.mjs",
].sort();

const r6bStructuredAnalyzeBaselineProbeChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  ...r6bStructuredAnalyzeGuardMaintenanceChangedFiles,
  "tests/mcp-tool-contract.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
].sort();

const requiredSectionKeys = [
  "status",
  "diagnostics",
  "warnings",
  "errors",
  "mismatches",
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

test("PR61 accepts direct verification replay result envelopes", () => {
  assert.deepEqual(VERIFICATION_REPLAY_RESULT_VIEWER_SECTION_KEYS, requiredSectionKeys);

  for (const [input, resultKind] of [
    [runVerification(), "run-verification"],
    [runReplay(), "run-replay"],
    [artifactFreshnessVerification(), "artifact-freshness-verification"],
    [mvpDemoResult(), "mvp-demo-result"],
  ]) {
    const model = assertDisplayable(input, resultKind);
    assert.deepEqual(model.sections.map((section) => section.key), requiredSectionKeys);
    assert.equal(section(model, "status").present, true);
    assert.equal(section(model, "resultIdentity").present, true);
  }
});

test("PR61 accepts existing accepted structured JSON display models", () => {
  const structuredModel = parseStructuredJsonInput(json(runVerification({
    extraVerificationField: { inspectable: true },
  })));

  const model = assertDisplayable(structuredModel, "run-verification");
  assert.equal(model.sourceEnvelopeKind, "structured-json-input-display-model");
  assert.equal(model.unknownFields.includes("extraVerificationField"), true);
  assert.deepEqual(model.inspectableUnknowns[0], {
    sourcePath: ["extraVerificationField"],
    value: { inspectable: true },
  });
  assert.deepEqual(section(model, "warnings").value, []);
  assert.deepEqual(section(model, "errors").value, []);
});

test("PR61 rejects malformed accepted structured JSON display models", () => {
  const acceptedModel = parseStructuredJsonInput(json(runReplay()));
  const warningsSection = acceptedModel.visibleSections.find((visibleSection) => visibleSection.key === "warnings");
  assert.notEqual(warningsSection, undefined);

  assertRejected({
    ...acceptedModel,
    visibleSections: [],
  }, "MalformedDisplayModel");

  assertRejected({
    ...acceptedModel,
    visibleSections: acceptedModel.visibleSections.map((visibleSection) => (
      visibleSection.key === "warnings"
        ? { ...visibleSection, sourcePath: "warnings" }
        : visibleSection
    )),
  }, "MalformedDisplayModel");

  assertRejected({
    ...acceptedModel,
    visibleSections: [...acceptedModel.visibleSections, warningsSection],
  }, "MalformedDisplayModel");

  assertRejected({
    ...acceptedModel,
    unknownFields: "extraReplayField",
  }, "MalformedDisplayModel");

  assertRejected({
    ...acceptedModel,
    inspectableUnknowns: [{ sourcePath: "extraReplayField", value: true }],
  }, "MalformedDisplayModel");

  assertRejected({
    ...acceptedModel,
    inspectableUnknowns: [{ sourcePath: ["extraReplayField"] }],
  }, "MalformedDisplayModel");
});

test("PR61 keeps hidden structured JSON sections inert", () => {
  const warning = diagnostic("HiddenWarning", "warning");
  const acceptedModel = parseStructuredJsonInput(json(runReplay({ warnings: [warning] })));
  const hiddenWarnings = acceptedModel.visibleSections.map((visibleSection) => (
    visibleSection.key === "warnings"
      ? { ...visibleSection, present: false, value: ["hidden"], sourcePath: ["warnings"] }
      : visibleSection
  ));

  const model = assertDisplayable({
    ...acceptedModel,
    visibleSections: hiddenWarnings,
  }, "run-replay");

  assert.equal(section(model, "warnings").present, false);
  assert.equal(section(model, "warnings").value, null);
  assert.deepEqual(section(model, "warnings").sourcePath, []);
});

test("PR61 accepts approved wrappers only when they carry displayable results", () => {
  assertDisplayable(apiResponse(runReplay()), "run-replay");
  assertDisplayable(cliResult(artifactFreshnessVerification()), "artifact-freshness-verification");
  assertDisplayable({ kind: "norma-mcp-tool-result", status: "ok", tool: "norma.verifyRun", result: runVerification() }, "run-verification");

  assertRejected(apiResponse({ ok: true }), "UnsupportedResultKind");
  assertRejected(cliResult({ kind: "run" }), "UnsupportedResultKind");
});

test("PR61 rejects wrappers with unsupported tools or non-ok producer statuses", () => {
  assertRejected(apiResponse(runReplay(), { status: "error" }), "MalformedWrapperEnvelope");
  assertRejected(cliResult(runReplay(), { status: "error" }), "MalformedWrapperEnvelope");
  assertRejected(mcpToolResult(runVerification(), { tool: "norma.unknown" }), "MalformedWrapperEnvelope");
  assertRejected(mcpToolResult(runVerification(), { status: "error" }), "MalformedWrapperEnvelope");
});

test("PR61 rejects malformed result and wrapper envelopes", () => {
  assertRejected({ kind: "run-verification" }, "MalformedResultEnvelope");
  assertRejected({ kind: "run-replay", status: "replayed" }, "MalformedResultEnvelope");
  assertRejected({ kind: "artifact-freshness-verification", status: "current" }, "MalformedResultEnvelope");
  assertRejected({ kind: "mvp-demo-result", warnings: [], errors: [] }, "MalformedResultEnvelope");

  assertRejected({ body: { kind: "norma-api-response", status: "ok", result: runReplay() } }, "MalformedWrapperEnvelope");
  assertRejected({ kind: "norma-core-cli-result", status: "ok", result: runReplay() }, "MalformedWrapperEnvelope");
  assertRejected({ kind: "norma-mcp-tool-result", status: "ok", result: runReplay() }, "MalformedWrapperEnvelope");
});

test("PR61 keeps verification replay visibility explicit", () => {
  const warning = diagnostic("CriticalWarningNotSuppressible", "critical");
  const error = diagnostic("MissingProvenance", "error");
  const mismatch = { code: "OutputRefsMismatch", message: "Recorded output refs differ.", targetRef: "outputRefs" };
  const freshness = artifactFreshnessVerification({ status: "stale", warnings: [warning] });
  const input = runReplay({
    status: "mismatch",
    warnings: [warning],
    errors: [error],
    mismatches: [mismatch],
    artifactFreshness: [freshness],
    tolerancePolicy: { kind: "tolerance-policy", id: "visible-tolerance-policy" },
    extraReplayField: { inspectable: true },
  });

  const model = assertDisplayable(input, "run-replay");

  assert.deepEqual(section(model, "warnings").value, [warning]);
  assert.deepEqual(section(model, "errors").value, [error]);
  assert.deepEqual(section(model, "mismatches").value, [mismatch]);
  assert.deepEqual(section(model, "artifactFreshness").value, [freshness]);
  assert.deepEqual(section(model, "tolerancePolicy").value, { kind: "tolerance-policy", id: "visible-tolerance-policy" });
  assert.equal(model.unknownFields.includes("extraReplayField"), true);
  assert.deepEqual(section(model, "unknownFields").value, ["extraReplayField"]);
});

test("PR61 preserves both recorded and replayed refs", () => {
  const input = runReplay();
  const model = assertDisplayable(input, "run-replay");

  assert.deepEqual(section(model, "outputRefs").value, {
    recordedOutputRefs: input.recordedOutputRefs,
    replayedOutputRefs: input.replayedOutputRefs,
  });
  assert.deepEqual(section(model, "resultIdentity").value, {
    recordedRunRef: input.recordedRunRef,
    replayedRunRef: input.replayedRunRef,
  });
});

test("PR61 does not synthesize diagnostics when diagnostics are absent", () => {
  const input = runReplay({
    warnings: [diagnostic("VisibleWarning", "warning")],
    errors: [diagnostic("VisibleError", "error")],
    mismatches: [{ code: "VisibleMismatch", message: "Mismatch remains visible." }],
  });
  const model = assertDisplayable(input, "run-replay");

  assert.equal(section(model, "diagnostics").present, false);
  assert.equal(section(model, "warnings").present, true);
  assert.equal(section(model, "errors").present, true);
  assert.equal(section(model, "mismatches").present, true);
});

test("PR61 rejects unsupported display models source truth and execution shaped inputs", () => {
  const rejectedStructuredModel = parseStructuredJsonInput(json({ prompt: "make a Norma result" }));

  assertRejected(rejectedStructuredModel, "RejectedStructuredJsonInput");
  assertRejected({ kind: "structured-json-input-display-model", status: "accepted" }, "MalformedDisplayModel");
  assertRejected(coreResult(), "UnsupportedResultKind");
  assertRejected({ jsonrpc: "2.0", id: "request", method: "tools/call", params: {} }, "GenericJsonRpcInputRejected");

  for (const input of [
    { prompt: "make a Norma result" },
    { artifact: { kind: "artifact" } },
    { sourceTruth: true },
    { replay: { arbitrary: true } },
    { path: "/replay-run" },
    { replayRunPath: "/replay-run" },
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
    { runtimeExecution: true },
    { createSourceTruth: true },
  ]) {
    assertRejected(input, "UnsupportedInput");
  }
});

test("PR61 keeps helper package-private and avoids forbidden surfaces", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const indexSource = readFileSync(join(repoRoot, "src", "index.ts"), "utf8");
  const helperSource = readFileSync(join(repoRoot, "src", "verification-replay-result-viewer.ts"), "utf8");

  assert.deepEqual(Object.keys(packageJson.exports ?? {}).sort(), ["."]);
  assert.equal(indexSource.includes("verification-replay-result-viewer"), false);
  assert.equal(indexSource.includes("createVerificationReplayResultDisplayModel"), false);

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

  for (const forbiddenSourceMarker of [
    "createServer",
    "listen",
    "server_url",
    "WebSocket",
    "XMLHttpRequest",
    "networkFetch",
    "fetch(",
    "readFile",
    "writeFile",
    "child_process",
    "process.env",
    "exec(",
    "spawn(",
  ]) {
    assert.equal(helperSource.includes(forbiddenSourceMarker), false, `${forbiddenSourceMarker} must stay absent`);
  }
  assert.doesNotMatch(helperSource, /\b(?:route|server|browser|DOM)\b/);

  const changedFiles = gitChangedFiles();
  if (changedFiles.some((file) => file.includes("verification-replay-result-viewer"))) {
    if (
      !isExactPr71ApprovedChangeSet(changedFiles) &&
      !isExactR6BStructuredAnalyzeImplementationChangeSet(changedFiles) &&
      !isExactR6BStructuredAnalyzeGuardMaintenanceChangeSet(changedFiles) &&
      !isExactR6BStructuredAnalyzeBaselineProbeChangeSet(changedFiles)
    ) {
      assert.deepEqual(changedFiles.filter(isForbiddenVerificationReplayViewerChange), []);
    }
  }
});

test("R6B structured analyze guard rejects unrelated future verification viewer files", () => {
  for (const unexpectedFile of [
    "src/mcp/unrelated.ts",
    "src/runtime.ts",
    "tests/unrelated.test.mjs",
    "package.json",
    ".github/workflows/ci.yml",
    "docs/unrelated.md",
    "bin/unrelated.mjs",
  ]) {
    assert.equal(isExactChangedFileSet([...r6bStructuredAnalyzeImplementationChangedFiles, unexpectedFile].sort(), r6bStructuredAnalyzeImplementationChangedFiles), false);
    assert.equal(isExactChangedFileSet([...r6bStructuredAnalyzeGuardMaintenanceChangedFiles, unexpectedFile].sort(), r6bStructuredAnalyzeGuardMaintenanceChangedFiles), false);
    assert.equal(isExactChangedFileSet([...r6bStructuredAnalyzeBaselineProbeChangedFiles, unexpectedFile].sort(), r6bStructuredAnalyzeBaselineProbeChangedFiles), false);
  }
});

function assertDisplayable(input, resultKind) {
  const model = createVerificationReplayResultDisplayModel(input);
  assert.equal(model.kind, "verification-replay-result-display-model");
  assert.equal(model.status, "displayable");
  assert.equal(model.resultKind, resultKind);
  assert.deepEqual(model.rejectionReasons, []);
  return model;
}

function assertRejected(input, code) {
  const model = createVerificationReplayResultDisplayModel(input);
  assert.equal(model.kind, "verification-replay-result-display-model");
  assert.equal(model.status, "rejected");
  assert.equal(model.resultKind, "unknown");
  assert.equal(model.rejectionReasons.some((reason) => reason.code === code), true, `${code} should reject input`);
  return model;
}

function section(model, key) {
  const visibleSection = model.sections.find((item) => item.key === key);
  assert.notEqual(visibleSection, undefined, `${key} section should exist`);
  return visibleSection;
}

function apiResponse(result, overrides = {}) {
  return {
    statusCode: 200,
    body: {
      kind: "norma-api-response",
      status: "ok",
      request: { method: "POST", path: "/verify-run" },
      result,
      ...overrides,
    },
  };
}

function cliResult(result, overrides = {}) {
  return {
    kind: "norma-core-cli-result",
    command: "norma verify-run",
    status: "ok",
    coreVersion: "0.1.0-test",
    exitCode: 0,
    result,
    ...overrides,
  };
}

function mcpToolResult(result, overrides = {}) {
  return {
    kind: "norma-mcp-tool-result",
    status: "ok",
    tool: "norma.verifyRun",
    result,
    ...overrides,
  };
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
    source: { kind: "core", ref: "pr61-test" },
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

function provenance() {
  return {
    operationName: "core.mvp-demo.run",
    operationVersion: "0.1.0-test",
    inputRefs: [ref("mvp-demo-input", "mvp-demo:structured-input")],
    source: ref("core", "pr61-test"),
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

function runEnvelope() {
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
    outputRefs: { kind: "output-refs", refs: [ref("core-result", "core-result:test")] },
    replayReadinessStatus: "ready",
    warnings: [],
    errors: [],
    provenance: provenance(),
  };
}

function gitChangedFiles() {
  const probes = [
    gitChangedFilesFor(["diff", "--name-only", "main...HEAD"]),
    gitChangedFilesFor(["diff", "--name-only", "origin/main...HEAD"]),
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
      .split("\n")
      .filter(Boolean);
  } catch {
    return null;
  }
}

// fallow-ignore-next-line code-duplication
function isExactPr71ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr71ApprovedChangedFiles);
}

function isExactR6BStructuredAnalyzeImplementationChangeSet(changed) {
  return isExactChangedFileSet(changed, r6bStructuredAnalyzeImplementationChangedFiles);
}

function isExactR6BStructuredAnalyzeGuardMaintenanceChangeSet(changed) {
  return isExactChangedFileSet(changed, r6bStructuredAnalyzeGuardMaintenanceChangedFiles);
}

function isExactR6BStructuredAnalyzeBaselineProbeChangeSet(changed) {
  return isExactChangedFileSet(changed, r6bStructuredAnalyzeBaselineProbeChangedFiles);
}

function isExactChangedFileSet(changed, approvedFiles) {
  return (
    changed.length === approvedFiles.length &&
    approvedFiles.every((file) => changed.includes(file))
  );
}

function isForbiddenVerificationReplayViewerChange(file) {
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

function json(value) {
  return JSON.stringify(value);
}
