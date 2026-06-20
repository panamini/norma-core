import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createReadOnlyViewerModel } from "../dist/src/local-viewer/read-only-viewer-model.js";
import { modelToStaticViewTree } from "../viewer/read-only-result-viewer.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const fixtureRoot = join(testDir, "fixtures", "viewer");

const fixturePaths = {
  verification: "run-verification.json",
  replayMismatch: "run-replay-mismatch.json",
  staleArtifact: "artifact-freshness-stale.json",
  unsupportedPrompt: "unsupported-prompt-input.json",
};

const expectedChangedFiles = [
  "tests/fixtures/viewer/artifact-freshness-stale.json",
  "tests/fixtures/viewer/run-replay-mismatch.json",
  "tests/fixtures/viewer/run-verification.json",
  "tests/fixtures/viewer/unsupported-prompt-input.json",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/read-only-viewer-demo-readiness.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

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

const pr73ApprovedChangedFiles = [
  ".github/workflows/ci.yml",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  // fallow-ignore-next-line code-duplication
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
];

const pr74ApprovedChangedFiles = [
  "README.md",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
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

const pr79ApprovedChangedFiles = [
  "src/geometry-observation.ts",
  "src/node-crypto.d.ts",
  "tests/fixtures/geometry-observation/valid-accepted-geometry-v1.json",
  "tests/fixtures/geometry-observation/valid-observation-v1.json",
  "tests/geometry-observation-validator.test.mjs",
  "tests/geometry-observation-perception-provider-contract-approval.test.mjs",
  "tests/post-mvp-product-vision-approval.test.mjs",
  "tests/read-only-viewer-fixtures.test.mjs",
  "tests/beta-pilot-readiness-approval.test.mjs",
  "tests/onboarding-examples-approval.test.mjs",
  "tests/privacy-security-support-approval.test.mjs",
  "tests/verification-replay-result-viewer-prototype-approval.test.mjs",
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

const exactApprovedChangedFileSets = [
  pr71ApprovedChangedFiles,
  pr72ApprovedChangedFiles,
  pr73ApprovedChangedFiles,
  pr74ApprovedChangedFiles,
  pr75ApprovedChangedFiles,
  pr76ApprovedChangedFiles,
  pr77ApprovedChangedFiles,
  pr78ApprovedChangedFiles,
  pr79ApprovedChangedFiles,
  pr80ApprovedChangedFiles,
];

test("PR69 fixtures are valid deterministic JSON", () => {
  for (const name of Object.values(fixturePaths)) {
    const path = fixturePath(name);
    assert.equal(existsSync(path), true, `${name} must exist`);

    const first = readFileSync(path, "utf8");
    const second = readFileSync(path, "utf8");
    assert.equal(first, second);

    const parsed = JSON.parse(first);
    assert.equal(isJsonObject(parsed), true);
    assert.deepEqual(parsed, JSON.parse(JSON.stringify(parsed)));
  }
});

test("PR69 verification fixture renders through the full local pipeline", () => {
  const fixture = loadFixture(fixturePaths.verification);
  const { jsonTextModel, structuredModel, jsonTextTree, structuredTree } = assertPipeline(fixture, {
    classification: "verification-like-result",
    status: "displayable",
    displayable: true,
  });

  assert.equal(rowValue(section(jsonTextModel, "status"), "value"), "verified");
  assert.equal(treeText(jsonTextTree).includes("SyntheticVerificationWarning"), true);
  assert.equal(treeText(structuredTree).includes("SyntheticVerificationWarning"), true);
  assertSemanticEquivalence(jsonTextModel, structuredModel);
  assertSemanticTreeEquivalence(jsonTextTree, structuredTree);
});

test("PR69 replay mismatch fixture remains inert and visible", () => {
  const fixture = loadFixture(fixturePaths.replayMismatch);
  const { jsonTextModel, structuredModel, jsonTextTree, structuredTree } = assertPipeline(fixture, {
    classification: "replay-like-result",
    status: "displayable",
    displayable: true,
  });

  assert.equal(rowValue(section(jsonTextModel, "status"), "value"), "mismatch");
  assert.equal(treeText(jsonTextTree).includes("OutputRefsMismatch"), true);
  assert.equal(treeText(structuredTree).includes("OutputRefsMismatch"), true);
  assertNoExecutableReplayMarkers(jsonTextTree);
  assertNoExecutableReplayMarkers(structuredTree);
  assertSemanticEquivalence(jsonTextModel, structuredModel);
});

test("PR69 stale artifact remains derived", () => {
  const fixture = loadFixture(fixturePaths.staleArtifact);
  const { jsonTextModel, structuredModel, jsonTextTree } = assertPipeline(fixture, {
    classification: "artifact-freshness-like-result",
    status: "displayable",
    displayable: true,
  });

  assert.equal(rowValue(section(jsonTextModel, "status"), "value"), "stale");
  assert.equal(treeText(jsonTextTree).includes("ArtifactStale"), true);
  assert.equal(treeText(jsonTextTree).includes("derived display data only"), true);
  assertProvenance(jsonTextModel);
  assertProvenance(structuredModel);
});

test("PR69 prompt-shaped unsupported input stays unsupported", () => {
  const fixture = loadFixture(fixturePaths.unsupportedPrompt);
  const { jsonTextModel, structuredModel, jsonTextTree, structuredTree } = assertPipeline(fixture, {
    classification: "unsupported-shape",
    status: "unsupported",
    displayable: false,
  });

  assert.equal(jsonTextModel.provenance.promptIsSourceTruth, false);
  assert.equal(structuredModel.provenance.promptIsSourceTruth, false);
  assert.equal(jsonTextModel.errors.some((notice) => notice.code === "UnsupportedInput"), true);
  assert.equal(structuredModel.errors.some((notice) => notice.code === "UnsupportedInput"), true);
  assert.equal(treeText(jsonTextTree).includes("UnsupportedInput"), true);
  assertNoCreativeInference(jsonTextTree);
  assertNoCreativeInference(structuredTree);
});

test("PR69 fixture pipeline is deterministic", () => {
  for (const name of Object.values(fixturePaths)) {
    const fixture = loadFixture(name);
    const first = pipeline(fixture);
    const second = pipeline(fixture);

    assert.deepEqual(first.jsonTextModel, second.jsonTextModel);
    assert.deepEqual(first.structuredModel, second.structuredModel);
    assert.deepEqual(first.jsonTextTree, second.jsonTextTree);
    assert.deepEqual(first.structuredTree, second.structuredTree);
  }
});

test("PR69 fixture pipeline does not mutate structured inputs", () => {
  for (const name of Object.values(fixturePaths)) {
    const fixture = deepFreeze(loadFixture(name));
    const before = cloneJson(fixture);

    pipeline(fixture);

    assert.deepEqual(fixture, before);
  }
});

test("PR69 fixtures contain synthetic local-only data", () => {
  for (const name of Object.values(fixturePaths)) {
    const source = readFileSync(fixturePath(name), "utf8");

    for (const forbiddenPattern of syntheticDataForbiddenPatterns) {
      assert.doesNotMatch(source, forbiddenPattern);
    }
  }
});

test("PR69 keeps protected surfaces unchanged", () => {
  const changed = branchChangedFiles();
  const expectedFiles = approvedChangedFilesFor(changed);
  const protectedAllowlist = exactApprovedChangedFiles(changed) ?? [];

  const unexpected = changed.filter((file) => !expectedFiles.includes(file));

  assert.deepEqual(unexpected, []);
  assert.deepEqual(
    changed.filter((file) => isUnexpectedProtectedChange(file, protectedAllowlist)),
    [],
  );
});

function assertPipeline(fixture, expected) {
  const result = pipeline(fixture);

  for (const model of [result.jsonTextModel, result.structuredModel]) {
    assert.equal(model.status, expected.status);
    assert.equal(model.classification, expected.classification);
    assert.equal(model.displayable, expected.displayable);
    assertProvenance(model);
  }

  assert.equal(result.jsonTextModel.sourceMode, "explicit-json-text");
  assert.equal(result.structuredModel.sourceMode, "explicit-structured-object");
  assert.equal(result.jsonTextTree.status, expected.status);
  assert.equal(result.structuredTree.status, expected.status);
  assert.equal(result.jsonTextTree.classification, expected.classification);
  assert.equal(result.structuredTree.classification, expected.classification);
  assert.deepEqual(result.jsonTextTree.provenance, result.structuredTree.provenance);
  assertSemanticTreeEquivalence(result.jsonTextTree, result.structuredTree);

  return result;
}

function pipeline(fixture) {
  const jsonText = JSON.stringify(fixture);
  const jsonTextModel = createReadOnlyViewerModel({ kind: "jsonText", value: jsonText });
  const structuredModel = createReadOnlyViewerModel({ kind: "structured", value: fixture });

  return {
    jsonTextModel,
    structuredModel,
    jsonTextTree: modelToStaticViewTree(jsonTextModel),
    structuredTree: modelToStaticViewTree(structuredModel),
  };
}

function assertSemanticEquivalence(left, right) {
  assert.deepEqual(omitSourceMode(left), omitSourceMode(right));
}

function assertSemanticTreeEquivalence(left, right) {
  assert.deepEqual(omitSourceMode(left), omitSourceMode(right));
}

function assertProvenance(model) {
  assert.deepEqual(model.provenance, {
    sourceTruth: "explicit-structured-input",
    artifactsAreDerived: true,
    promptIsSourceTruth: false,
    displayabilityIsTruthValidation: false,
  });
}

function assertNoExecutableReplayMarkers(tree) {
  const text = treeText(tree);

  assert.equal(text.includes("/replay-run"), false);
  assert.equal(text.includes("norma.replayRun"), false);
  assert.equal(text.includes("replayRun("), false);
}

function assertNoCreativeInference(tree) {
  const text = treeText(tree).toLowerCase();

  assert.equal(text.includes("rule"), false);
  assert.equal(text.includes("intent"), false);
  assert.equal(text.includes("recommendation"), false);
}

function section(model, id) {
  const found = model.sections.find((item) => item.id === id);
  assert.notEqual(found, undefined, `${id} section should exist`);
  return found;
}

function rowValue(foundSection, label) {
  const row = foundSection.rows.find((item) => item.label === label);
  assert.notEqual(row, undefined, `${label} row should exist`);
  return row.value;
}

function loadFixture(name) {
  return JSON.parse(readFileSync(fixturePath(name), "utf8"));
}

function fixturePath(name) {
  return join(fixtureRoot, name);
}

function treeText(tree) {
  return JSON.stringify(tree);
}

function omitSourceMode(value) {
  const clone = cloneJson(value);
  delete clone.sourceMode;
  return clone;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (isJsonObject(value) || Array.isArray(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function branchChangedFiles() {
  const probes = [
    gitLines(["diff", "--name-only", "main...HEAD"]),
    gitLines(["diff", "--name-only", "origin/main...HEAD"]),
    gitLines(["diff", "--name-only"]),
    gitLines(["diff", "--cached", "--name-only"]),
    gitLines(["ls-files", "--others", "--exclude-standard"]),
  ];
  const successful = probes.filter((files) => files !== null);

  assert.notEqual(successful.length, 0, "Unable to inspect changed files with git");
  return successful
    .flat()
    .filter((file, index, files) => files.indexOf(file) === index)
    .sort();
}

function gitLines(args) {
  let output;
  try {
    output = execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }

  return output === "" ? [] : output.split("\n");
}

function approvedChangedFilesFor(changed) {
  return exactApprovedChangedFiles(changed) ?? expectedChangedFiles;
}

function exactApprovedChangedFiles(changed) {
  return exactApprovedChangedFileSets.find((approvedFiles) => isExactChangedFileSet(changed, approvedFiles)) ?? null;
}

function isUnexpectedProtectedChange(file, protectedAllowlist) {
  return isProtectedChange(file) && !protectedAllowlist.includes(file);
}

function isExactChangedFileSet(changed, approvedFiles) {
  return changed.length === approvedFiles.length && approvedFiles.every((file) => changed.includes(file));
}

function isProtectedChange(file) {
  return [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "src/index.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "tests/read-only-viewer-model.test.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "tests/read-only-viewer-static.test.mjs",
    "docs/",
    "bin/",
    "examples/",
    "src/api/",
    "src/mcp/",
  ].some((protectedPath) => file === protectedPath || file.startsWith(protectedPath));
}

const syntheticDataForbiddenPatterns = [
  /\bhttps?:\/\//i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:token|secret|password|api[_-]?key)\b/i,
  /(?:\/Users\/|\/Volumes\/|\/tmp\/|[A-Za-z]:\\)/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\b20\d\d-\d\d-\d\d[T ][0-2]\d:/,
];
