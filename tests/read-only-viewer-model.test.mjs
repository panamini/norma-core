import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReadOnlyViewerModel } from "../dist/src/local-viewer/read-only-viewer-model.js";
import {
  branchChangedFiles,
  isExactChangedFileSet,
  isExactR1GeometrySourceIdentityChangeSet,
  isExactR6CStructuredAnalyzeMcpChangeSet,
  r1GeometrySourceIdentityChangedFiles,
  r6cStructuredAnalyzeMcpChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
// fallow-ignore-next-line code-duplication
const repoRoot = dirname(testDir);
const fixtureRoot = join(testDir, "fixtures", "viewer");

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

const pr72ApprovedChangedFiles = [
  "bin/norma-core-mcp-stdio.mjs",
  "src/mcp/stdio-protocol.ts",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/mcp-stdio-server-skeleton.test.mjs",
  "tests/mcp-tools-call-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  // fallow-ignore-next-line code-duplication
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr75ApprovedChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-19-post-mvp-product-vision-and-adapter-architecture.md",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr76ApprovedChangedFiles = [
  "docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
];

const pr77ApprovedChangedFiles = pr76ApprovedChangedFiles;

const pr78ApprovedChangedFiles = [
  "docs/decisions/2026-06-19-geometry-observation-and-perception-provider-contract-approval.md",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
];

const pr80ApprovedChangedFiles = [
  "docs/decisions/2026-06-20-accepted-geometry-to-core-mapping-contract-approval.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
];

const r4CurrentOperationsRunbookChangedFiles = [
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r5PostMvpAdapterArchitectureChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/decisions/2026-06-24-post-mvp-adapter-architecture.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6aStructuredAnalyzeContractChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/OPERATIONS_RUNBOOK.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/mcp-tool-contract.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const r6a1StructuredAnalyzeExecutableContractChangedFiles = [
  "docs/BUSINESS_READINESS_ROADMAP.md",
  "docs/MCP_TOOL_CONTRACT.md",
  "docs/decisions/2026-06-25-structured-analyze-v1-contract.md",
  "tests/accepted-geometry-to-core-mapping-contract-approval.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-model.test.mjs",
  "tests/read-only-viewer-static.test.mjs",
  "tests/structured-analyze-v1-contract.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
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

const exactApprovedChangedFileSets = [
  r4CurrentOperationsRunbookChangedFiles,
  r5PostMvpAdapterArchitectureChangedFiles,
  r6aStructuredAnalyzeContractChangedFiles,
  r6a1StructuredAnalyzeExecutableContractChangedFiles,
  r6bStructuredAnalyzeImplementationChangedFiles,
  r6bStructuredAnalyzeGuardMaintenanceChangedFiles,
  r6cStructuredAnalyzeMcpChangedFiles,
  pr71ApprovedChangedFiles,
  pr72ApprovedChangedFiles,
  pr75ApprovedChangedFiles,
  pr76ApprovedChangedFiles,
  pr77ApprovedChangedFiles,
  pr78ApprovedChangedFiles,
  pr80ApprovedChangedFiles,
];

test("PR67 returns an empty model for whitespace-only JSON text", () => {
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: " \n\t " });

  assert.equal(model.kind, "readOnlyViewerModel");
  assert.equal(model.status, "empty");
  assert.equal(model.classification, "empty");
  assert.equal(model.sourceMode, "explicit-json-text");
  assert.equal(model.displayable, false);
  assert.equal(model.notDisplayableReason, "No structured JSON input was provided.");
  assert.deepEqual(model.sections, []);
  assert.deepEqual(model.errors, []);
  assertProvenance(model);
});

test("PR67 returns invalid-json with an error notice for malformed JSON text", () => {
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: "{\"kind\":" });

  assert.equal(model.status, "invalid-json");
  assert.equal(model.classification, "invalid-json");
  assert.equal(model.displayable, false);
  assert.equal(model.notDisplayableReason, "Input must be valid JSON.");
  assert.equal(model.errors.some((notice) => notice.code === "InvalidJsonText" && notice.severity === "error"), true);
  assertProvenance(model);
});

test("PR67 returns unsupported for valid JSON that is not an approved display shape", () => {
  const model = createReadOnlyViewerModel({ kind: "jsonText", value: json({ hello: "world", count: 2 }) });

  assert.equal(model.status, "unsupported");
  assert.equal(model.classification, "unknown-structured-object");
  assert.equal(model.sourceMode, "explicit-json-text");
  assert.equal(model.displayable, false);
  assert.equal(model.warnings.some((notice) => notice.code === "UnknownStructuredObject"), true);
  assert.deepEqual(section(model, "unknownFields")?.rows, [
    { label: "fields", value: "count, hello" },
  ]);
  assertProvenance(model);
});

test("PR67 displays verification-like structured results without executing operations", () => {
  const model = createReadOnlyViewerModel({ kind: "structured", value: runVerification() });

  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "verification-like-result");
  assert.equal(model.sourceMode, "explicit-structured-object");
  assert.equal(model.displayable, true);
  assert.equal(model.notDisplayableReason, null);
  assert.equal(section(model, "status")?.rows.some((row) => row.label === "value" && row.value === "verified"), true);
  assert.deepEqual(model.errors, []);
  assertProvenance(model);
});

test("PR67 displays pasted MCP verification result wrappers consistently with structured input", () => {
  const wrapper = mcpToolResult(runVerification());
  const structuredModel = createReadOnlyViewerModel({ kind: "structured", value: wrapper });
  const jsonTextModel = createReadOnlyViewerModel({ kind: "jsonText", value: json(wrapper) });

  assert.equal(structuredModel.status, "displayable");
  assert.equal(jsonTextModel.status, "displayable");
  assert.equal(jsonTextModel.classification, "verification-like-result");
  assert.equal(jsonTextModel.sourceMode, "explicit-json-text");
  assert.equal(section(jsonTextModel, "status")?.rows.some((row) => row.label === "value" && row.value === "verified"), true);
  assert.deepEqual(jsonTextModel.errors, []);
  assertProvenance(jsonTextModel);
});

test("R22 displays Structured Analyze result objects as local read-only inspection data", () => {
  const model = createReadOnlyViewerModel({ kind: "structured", value: structuredAnalyzeResult() });

  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "structured-analyze-like-result");
  assert.equal(model.sourceMode, "explicit-structured-object");
  assert.equal(model.displayable, true);
  assert.equal(model.notDisplayableReason, null);
  assert.equal(model.title, "Structured Analyze result");
  assert.equal(row(model, "structuredAnalyzeIdentity", "kind")?.value, "structured-composition-analysis-result");
  assert.equal(row(model, "structuredAnalyzeIdentity", "status")?.value, "valid");
  assert.equal(row(model, "structuredAnalyzeValidation", "validation.status")?.value, "valid");
  assert.equal(row(model, "structuredAnalyzeDecisionComparison", "comparison.status")?.value, "a_closer");
  assert.equal(row(model, "structuredAnalyzeDecisionComparison", "decision.status")?.value, "a_closer");
  assertRowIncludes(model, "structuredAnalyzeDecisionComparison", "decision.summary", "Use composition A");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "diagnostics", "SyntheticDiagnostic");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "warnings", "SyntheticWarning");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "errors", "SyntheticError");
  assertRowIncludes(model, "structuredAnalyzeRefs", "provenance", "user_supplied_structured_data");
  assertRowIncludes(model, "structuredAnalyzeRefs", "inputRefs", "input:r22-static-viewer");
  assertRowIncludes(model, "structuredAnalyzeRefs", "outputRefs", "output:r22-static-viewer");
  assertRowIncludes(model, "structuredAnalyzeRefs", "packLockRef", "pack-lock:r22-static-viewer");
  assertRowIncludes(model, "structuredAnalyzeRefs", "operationContextRef", "operation-context:r22-static-viewer");
  assert.equal(row(model, "structuredAnalyzeReplayReadiness", "replayReadiness.status")?.value, "ready");
  assertRowIncludes(model, "structuredAnalyzeReplayReadiness", "replayReadiness.run", "run-ref:r22-static-viewer");
  assertRowIncludes(model, "structuredAnalyzeSerialization", "serializationSummary", "identity:r22-static-viewer");
  assert.equal(row(model, "unknownFields", "unknownHtml")?.value, "<img src=x onerror=alert(1)>");
  assertRowIncludes(model, "unknownFields", "unknownObject", "<script>alert(1)</script>");
  assert.deepEqual(model.warnings, []);
  assert.deepEqual(model.errors, []);
  assertProvenance(model);
});

test("R22 displays pasted Structured Analyze result JSON through the local viewer model", () => {
  const model = createReadOnlyViewerModel({
    kind: "jsonText",
    value: readFileSync(join(fixtureRoot, "structured-analyze-result.json"), "utf8"),
  });

  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "structured-analyze-like-result");
  assert.equal(model.sourceMode, "explicit-json-text");
  assert.equal(row(model, "structuredAnalyzeIdentity", "analysisId")?.value, "analysis:r22-static-viewer");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "warnings", "Visible warning remains visible.");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "errors", "Visible error remains visible.");
});

test("R22 displays partial Structured Analyze-like results without claiming success", () => {
  const model = createReadOnlyViewerModel({
    kind: "structured",
    value: {
      kind: "structured-composition-analysis-result",
      status: "invalid",
      validation: { status: "invalid" },
      warnings: [{ code: "PartialWarning", message: "Partial warning remains visible." }],
      errors: [{ code: "PartialError", message: "Partial error remains visible." }],
      unknownHtml: "<img src=x onerror=alert(1)>",
    },
  });

  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "structured-analyze-like-result");
  assert.equal(row(model, "structuredAnalyzeIdentity", "status")?.value, "invalid");
  assert.equal(row(model, "structuredAnalyzeIdentity", "analysisId")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeValidation", "validation.status")?.value, "invalid");
  assert.equal(row(model, "structuredAnalyzeDecisionComparison", "comparison.status")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeDecisionComparison", "decision.status")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeReplayReadiness", "replayReadiness.status")?.value, "absent");
  assert.equal(row(model, "structuredAnalyzeSerialization", "serializationSummary")?.value, "absent");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "warnings", "PartialWarning");
  assertRowIncludes(model, "structuredAnalyzeDiagnostics", "errors", "PartialError");
  assert.equal(row(model, "unknownFields", "unknownHtml")?.value, "<img src=x onerror=alert(1)>");
  assertProvenance(model);
});

test("PR67 displays replay-like structured results without calling replayRun", () => {
  const model = createReadOnlyViewerModel({ kind: "structured", value: runReplay() });

  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "replay-like-result");
  assert.equal(model.displayable, true);
  assert.equal(section(model, "resultIdentity")?.rows.some((row) => row.value === "{\"recordedRunRef\":{\"id\":\"run:recorded\"},\"replayedRunRef\":{\"id\":\"run:replayed\"}}"), true);
  assertProvenance(model);
});

test("PR67 marks artifact-like display data as derived and never source truth", () => {
  const model = createReadOnlyViewerModel({ kind: "structured", value: artifactFreshnessVerification() });

  assert.equal(model.status, "displayable");
  assert.equal(model.classification, "artifact-freshness-like-result");
  assert.equal(model.provenance.sourceTruth, "explicit-structured-input");
  assert.equal(model.provenance.artifactsAreDerived, true);
  assert.equal(model.provenance.promptIsSourceTruth, false);
  assert.equal(model.provenance.displayabilityIsTruthValidation, false);
  assert.equal(section(model, "artifactFreshness")?.rows.some((row) => row.label === "value" && typeof row.value === "string"), true);
});

test("PR67 never treats prompt-like fields as source truth", () => {
  const model = createReadOnlyViewerModel({ kind: "structured", value: { prompt: "make this true" } });

  assert.equal(model.status, "unsupported");
  assert.equal(model.classification, "unsupported-shape");
  assert.equal(model.displayable, false);
  assert.equal(model.provenance.sourceTruth, "explicit-structured-input");
  assert.equal(model.provenance.promptIsSourceTruth, false);
  assert.equal(model.errors.some((notice) => notice.code === "UnsupportedInput"), true);
});

test("PR67 output is deterministic for the same input", () => {
  const input = { kind: "structured", value: runReplay({ extraReplayField: { z: 1, a: true } }) };

  assert.deepEqual(createReadOnlyViewerModel(input), createReadOnlyViewerModel(input));
});

test("PR67 keeps the model package-private with no package root export", () => {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const indexSource = readFileSync(join(repoRoot, "src", "index.ts"), "utf8");

  assert.deepEqual(Object.keys(packageJson.exports ?? {}).sort(), ["."]);
  assert.equal(indexSource.includes("read-only-viewer-model"), false);
  assert.equal(indexSource.includes("createReadOnlyViewerModel"), false);
});

test("PR67 introduces no server route fetch file read upload DOM browser or viewer asset behavior", () => {
  const modelSourcePath = join(repoRoot, "src", "local-viewer", "read-only-viewer-model.ts");
  assert.equal(existsSync(modelSourcePath), true);
  const modelSource = readFileSync(modelSourcePath, "utf8");

  for (const forbiddenSourceMarker of [
    "createServer",
    "listen",
    "fetch(",
    "XMLHttpRequest",
    "WebSocket",
    "readFile",
    "writeFile",
    "upload",
    "document.",
    "window.",
    "canvas",
    "camera",
    "image",
    "CAD",
    "cloud",
    "plugin",
    "marketplace",
    "executeCoreOperation",
    "analyzeStructuredCompositionV1",
    "from \"../structured-composition-analysis",
    "from '../structured-composition-analysis",
    "../structured-composition-analysis.js",
    "../index.js",
    "@norma/core",
    "../mcp/",
    "../cli/",
    "../local-report/",
    "replayRun",
  ]) {
    assert.equal(modelSource.includes(forbiddenSourceMarker), false, `${forbiddenSourceMarker} must stay absent`);
  }

  assert.doesNotMatch(modelSource, /\b(?:server|route|listener|browser|DOM)\b/);
  const changedFiles = branchChangedFiles();
  const approvedExactChangedFiles = approvedExactChangedFilesFor(changedFiles) ?? [];
  const forbiddenChanges = changedFiles.filter(
    (file) => isForbiddenReadOnlyViewerChange(file) && !approvedExactChangedFiles.includes(file),
  );
  assert.deepEqual(forbiddenChanges, []);
});

test("R6B structured analyze exact-set guard rejects unrelated read-only viewer files", () => {
  for (const unexpectedFile of [
    "src/mcp/unrelated.ts",
    "src/runtime.ts",
    "tests/unrelated.test.mjs",
    "package.json",
    ".github/workflows/ci.yml",
    "docs/unrelated.md",
    "bin/unrelated.mjs",
  ]) {
    assert.equal(approvedExactChangedFilesFor([...r6bStructuredAnalyzeImplementationChangedFiles, unexpectedFile].sort()), null);
    assert.equal(approvedExactChangedFilesFor([...r6bStructuredAnalyzeGuardMaintenanceChangedFiles, unexpectedFile].sort()), null);
  }
});

function assertProvenance(model) {
  assert.deepEqual(model.provenance, {
    sourceTruth: "explicit-structured-input",
    artifactsAreDerived: true,
    promptIsSourceTruth: false,
    displayabilityIsTruthValidation: false,
  });
}

function section(model, id) {
  return model.sections.find((item) => item.id === id);
}

function row(model, sectionId, label) {
  return section(model, sectionId)?.rows.find((item) => item.label === label);
}

function assertRowIncludes(model, sectionId, label, snippet) {
  const value = row(model, sectionId, label)?.value;
  assert.equal(String(value).includes(snippet), true, `${sectionId}.${label} should include ${snippet}`);
}

function structuredAnalyzeResult() {
  return JSON.parse(readFileSync(join(fixtureRoot, "structured-analyze-result.json"), "utf8"));
}

// fallow-ignore-next-line code-duplication

function approvedExactChangedFilesFor(changed) {
  const sharedApproved = sharedExactApprovedChangedFiles(changed);
  if (sharedApproved !== null) {
    return sharedApproved;
  }

  return isExactR1GeometrySourceIdentityChangeSet(changed)
    ? r1GeometrySourceIdentityChangedFiles
    : isExactR6CStructuredAnalyzeMcpChangeSet(changed)
    ? r6cStructuredAnalyzeMcpChangedFiles
    : exactApprovedChangedFileSets.find((approvedFiles) => isExactChangedFileSet(changed, approvedFiles)) ?? null;
}

function isForbiddenReadOnlyViewerChange(file) {
  const blockedReadOnlyViewerPaths = [
    "package.json",
    "package-lock.json",
    "src/index.ts",
    "src/ui",
    "src/viewer",
    "src/app",
    "src/server",
    "src/routes",
    "src/http",
    "bin/",
    "examples/",
    "docs/",
  ];

  return blockedReadOnlyViewerPaths.some((forbiddenPath) => file === forbiddenPath || file.startsWith(forbiddenPath));
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

function mcpToolResult(result, overrides = {}) {
  return {
    kind: "norma-mcp-tool-result",
    status: "ok",
    tool: "norma.verifyRun",
    result,
    ...overrides,
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
    source: ref("core", "pr67-test"),
  };
}

function json(value) {
  return JSON.stringify(value);
}
