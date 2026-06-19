import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReadOnlyViewerModel } from "../dist/src/local-viewer/read-only-viewer-model.js";

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

// fallow-ignore-next-line code-duplication
function branchChangedFiles() {
  const probes = [
    gitFiles(["diff", "--name-only", "main...HEAD"]),
    gitFiles(["diff", "--name-only", "origin/main...HEAD"]),
    gitFiles(["diff", "--name-only"]),
    gitFiles(["diff", "--cached", "--name-only"]),
    gitFiles(["ls-files", "--others", "--exclude-standard"]),
  ];
  const successful = probes.filter((files) => files !== null);
  assert.notEqual(successful.length, 0, "Unable to inspect changed files with git");
  return successful
    .flat()
    .filter((file, index, files) => files.indexOf(file) === index)
    .sort();
}

function gitFiles(args) {
  try {
    const output = execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split("\n").filter(Boolean).sort();
  } catch {
    return null;
  }
}

function isExactPr71ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr71ApprovedChangedFiles);
}

function isExactPr72ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr72ApprovedChangedFiles);
}

function isExactPr75ApprovedChangeSet(changed) {
  return isExactChangedFileSet(changed, pr75ApprovedChangedFiles);
}

function approvedExactChangedFilesFor(changed) {
  if (isExactPr71ApprovedChangeSet(changed)) {
    return pr71ApprovedChangedFiles;
  }
  if (isExactPr72ApprovedChangeSet(changed)) {
    return pr72ApprovedChangedFiles;
  }
  if (isExactPr75ApprovedChangeSet(changed)) {
    return pr75ApprovedChangedFiles;
  }
  return null;
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
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
