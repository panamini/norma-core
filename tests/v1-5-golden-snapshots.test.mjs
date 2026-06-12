import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(testDir, "fixtures", "v1_5");
const goldenDir = join(testDir, "golden", "v1_5");
const updateGoldens = process.env.UPDATE_GOLDENS === "1";

const expectedSnapshotFiles = [
  "pack-lock.golden.json",
  "operation-context.golden.json",
  "resolved-rule-set.golden.json",
  "construction.golden.json",
  "measurements-a.golden.json",
  "measurements-b.golden.json",
  "evaluation-a.golden.json",
  "evaluation-b.golden.json",
  "comparison-decision-explanation.golden.json",
  "artifact-metadata.golden.json",
  "run-envelope.golden.json",
  "output-refs.golden.json",
  "negative-cases.golden.json",
];

const requiredNegativeCaseIds = [
  "MissingPackLock",
  "MissingEvaluationProfile",
  "DifferentTolerancesForComparison",
  "BeautyScoreRequested",
  "RatioAbsentFromPack",
  "MissingRule",
  "ImplicitPackRejected",
  "MismatchContext",
  "ArtifactAsSourceRejected",
  "StaleArtifact",
  "NonReplayableArtifact",
  "PackLockMismatch",
  "OperationContextMismatch",
  "UnsupportedReplayTarget",
  "MalformedRunEnvelope",
];

const ARRAY_FIELD_CANONICALIZERS = Object.freeze({
  errors: core.canonicalizeErrors,
  inputRefs: core.canonicalizeRefs,
  outputRefs: canonicalizeOutputRefArray,
  requestedOutputRefs: canonicalizeOutputRefArray,
  sourceRefs: core.canonicalizeRefs,
  warnings: core.canonicalizeWarnings,
});

const DIAGNOSTIC_STRING_FIELDS = Object.freeze(["code", "severity", "message"]);

function assertOk(result, label) {
  assert.equal(result.status, "ok", label);
  assert.equal(result.errors.length, 0, label);
  assert.ok(result.output, label);
}

function readFixtureJson(fileName) {
  return JSON.parse(readFileSync(join(fixtureDir, fileName), "utf8"));
}

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function canonicalizeDomainValue(value, key = "") {
  if (Array.isArray(value)) {
    return canonicalizeArrayField(value, key);
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  if (isOutputRefsRecord(value)) {
    return core.canonicalizeOutputRefs(value);
  }

  return canonicalizeRecordFields(value);
}

function canonicalizeArrayField(value, key) {
  const canonicalizer = ARRAY_FIELD_CANONICALIZERS[key];

  if (canonicalizer !== undefined) {
    return canonicalizer(value);
  }
  if (isDiagnosticArray(value)) {
    return core.canonicalizeDiagnostics(value);
  }
  if (shouldCanonicalizeRefArray(value, key)) {
    return core.canonicalizeRefs(value);
  }
  return value.map((item) => canonicalizeDomainValue(item));
}

function canonicalizeOutputRefArray(value) {
  return core.canonicalizeOutputRefs(value).refs;
}

function canonicalizeRecordFields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([recordKey, recordValue]) => [
      recordKey,
      canonicalizeDomainValue(recordValue, recordKey),
    ]),
  );
}

function shouldCanonicalizeRefArray(value, key) {
  return isRefArray(value) && key.toLowerCase().includes("ref");
}

function prettyCanonical(value) {
  const canonicalDomainValue = canonicalizeDomainValue(value);
  const canonicalValue = core.canonicalizeForSerialization(
    canonicalDomainValue,
    core.DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  );
  return `${JSON.stringify(canonicalValue, null, 2)}\n`;
}

function readGolden(fileName) {
  return readFileSync(join(goldenDir, fileName), "utf8");
}

function writeGolden(fileName, value) {
  mkdirSync(goldenDir, { recursive: true });
  writeFileSync(join(goldenDir, fileName), value);
}

function stableSnapshotStrings() {
  return Object.fromEntries(
    createSnapshots().map(([fileName, value]) => [fileName, prettyCanonical(value)]),
  );
}

function createTruthPath() {
  const input = core.createMvpDemoInput();
  const result = core.runMvpDemo(input);
  const ruleSetResult = core.resolveRuleSet(input.ratioPack, input.ruleSetRef);

  assertOk(result, "MVP demo truth path");
  assertOk(ruleSetResult, "resolved rule set");

  return { input, result, demo: result.output, ruleSet: ruleSetResult.output };
}

function createSnapshots() {
  const truthPath = createTruthPath();
  const { demo, ruleSet } = truthPath;
  const comparison = demo.comparisonResult.output;

  return [
    ["pack-lock.golden.json", demo.packLock],
    ["operation-context.golden.json", demo.operationContext],
    ["resolved-rule-set.golden.json", ruleSet],
    ["construction.golden.json", demo.constructionResult.output],
    ["measurements-a.golden.json", demo.measurementAResult.output],
    ["measurements-b.golden.json", demo.measurementBResult.output],
    ["evaluation-a.golden.json", demo.evaluationAResult.output],
    ["evaluation-b.golden.json", demo.evaluationBResult.output],
    [
      "comparison-decision-explanation.golden.json",
      {
        kind: "v1_5-comparison-decision-explanation-snapshot",
        comparison,
        decision: comparison.decision,
        explanation: demo.explanationResult,
      },
    ],
    ["artifact-metadata.golden.json", artifactMetadataSnapshot(demo)],
    ["run-envelope.golden.json", demo.runEnvelope],
    ["output-refs.golden.json", core.canonicalizeOutputRefs(demo.outputRefs)],
    ["negative-cases.golden.json", negativeCasesSnapshot(truthPath)],
  ];
}

function artifactMetadataSnapshot(demo) {
  return {
    kind: "v1_5-artifact-metadata-snapshot",
    structuredResults: demo.artifactResults.structuredResults.map(artifactResultSummary),
    constructionSummary: artifactResultSummary(demo.artifactResults.constructionSummary),
    evaluationReports: demo.artifactResults.evaluationReports.map(artifactResultSummary),
    explanation: artifactResultSummary(demo.artifactResults.explanation),
    simpleVisual: artifactResultSummary(demo.visualArtifactResult),
  };
}

function artifactResultSummary(result) {
  return {
    kind: "artifact-result-summary",
    resultStatus: result.status,
    warnings: result.warnings,
    errors: result.errors,
    outputRefs: result.outputRefs,
    artifact: artifactMetadata(result.output),
  };
}

function artifactMetadata(artifact) {
  assert.ok(artifact, "artifact output");
  return {
    kind: artifact.kind,
    id: artifact.id,
    artifactType: artifact.artifactType,
    status: artifact.status,
    sourceRefs: artifact.sourceRefs,
    provenance: artifact.provenance,
    warnings: artifact.warnings,
    errors: artifact.errors,
    outputRefs: artifact.outputRefs,
    runRef: artifact.runRef,
    operationContextRef: artifact.operationContextRef ?? null,
    options: artifact.options,
    derived: artifact.derived,
    sourceConstructionRef: artifact.sourceConstructionRef ?? null,
  };
}

function negativeCasesSnapshot(truthPath) {
  const manifest = readFixtureJson("negative-cases.fixture.json");
  const generatedCases = generatedNegativeCases(truthPath);
  const generatedById = new Map(generatedCases.map((negativeCase) => [negativeCase.fixtureId, negativeCase]));

  return {
    kind: "v1_5-negative-cases-snapshot",
    manifestSource: manifest.source,
    cases: manifest.cases.map((fixture) => buildNegativeCaseSnapshotEntry(fixture, generatedById)),
  };
}

function buildNegativeCaseSnapshotEntry(fixture, generatedById) {
  const generatedCase = generatedById.get(fixture.fixtureId) ?? defaultNegativeCase(fixture);

  return {
    ...fixture,
    actualStatus: generatedCase.actualStatus,
    actualDiagnosticCodes: generatedCase.actualDiagnosticCodes,
    warnings: generatedCase.warnings,
    errors: generatedCase.errors,
    pass: negativeCasePasses(fixture, generatedCase),
    notes: generatedCase.notes ?? fixture.toVerify ?? null,
  };
}

function defaultNegativeCase(fixture) {
  return {
    fixtureId: fixture.fixtureId,
    actualStatus: "to verify",
    actualDiagnosticCodes: [],
    warnings: [],
    errors: [],
    notes: fixture.toVerify ?? null,
  };
}

function negativeCasePasses(fixture, generatedCase) {
  return fixture.expectedStatus === "to verify"
    || (fixture.expectedStatus === generatedCase.actualStatus
      && fixture.expectedDiagnosticCodes.every((code) => generatedCase.actualDiagnosticCodes.includes(code)));
}

function generatedNegativeCases({ demo }) {
  return [
    ...demo.negativeCaseResults.map((negativeCase) => ({
      fixtureId: negativeCase.caseId,
      actualStatus: negativeCase.actualStatus,
      actualDiagnosticCodes: negativeCase.actualDiagnostics,
      warnings: negativeCase.warnings.map(diagnosticSummary),
      errors: negativeCase.errors.map(diagnosticSummary),
      notes: negativeCase.notes,
    })),
    staleArtifactCase(demo),
    nonReplayableArtifactCase(demo),
    packLockMismatchCase(demo),
    operationContextMismatchCase(demo),
    malformedRunEnvelopeCase(),
  ];
}

function staleArtifactCase(demo) {
  const staleArtifact = { ...demo.visualArtifactResult.output, status: "stale" };
  const result = core.compareRunContext({
    expectedPackLock: demo.packLock,
    actualPackLock: demo.packLock,
    expectedOperationContext: demo.operationContext,
    actualOperationContext: demo.operationContext,
    artifact: staleArtifact,
  });

  assertOk(result, "stale artifact comparison");
  return generatedCase("StaleArtifact", result.output.status, result);
}

function nonReplayableArtifactCase(demo) {
  const nonReplayableArtifact = { ...demo.visualArtifactResult.output, status: "non_replayable" };
  const result = core.validateRunReadiness({
    run: demo.runEnvelope,
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    artifact: nonReplayableArtifact,
  });

  assertOk(result, "non-replayable artifact readiness");
  return generatedCase("NonReplayableArtifact", result.output, result);
}

function packLockMismatchCase(demo) {
  const actualPackLock = {
    ...demo.packLock,
    packVersion: "0.1.0-mismatch",
    contentIdentity: "different-content-identity",
  };
  const result = core.compareRunContext({
    expectedPackLock: demo.packLock,
    actualPackLock,
  });

  assert.equal(result.status, "failed");
  return generatedCase("PackLockMismatch", result.output.status, result);
}

function operationContextMismatchCase(demo) {
  const actualOperationContext = {
    ...demo.operationContext,
    operationVersion: "0.1.0-mismatch",
    geometryModelVersion: "geometry-v1-mismatch",
    tolerancePolicy: {
      ...demo.operationContext.tolerancePolicy,
      value: {
        ...demo.operationContext.tolerancePolicy.value,
        id: "mvp-demo-tolerance-policy-mismatch",
      },
    },
  };
  const result = core.compareRunContext({
    expectedOperationContext: demo.operationContext,
    actualOperationContext,
  });

  assertOk(result, "operation context mismatch comparison");
  return generatedCase("OperationContextMismatch", result.output.status, result);
}

function malformedRunEnvelopeCase() {
  const result = core.validateRunReadiness({ run: { kind: "run", id: "broken" } });

  assert.equal(result.status, "failed");
  return generatedCase("MalformedRunEnvelope", result.output, result);
}

function generatedCase(fixtureId, actualStatus, result) {
  return {
    fixtureId,
    actualStatus,
    actualDiagnosticCodes: diagnosticCodes(result),
    warnings: result.warnings.map(diagnosticSummary),
    errors: result.errors.map(diagnosticSummary),
    notes: null,
  };
}

function diagnosticSummary(diagnostic) {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    blocking: diagnostic.blocking,
    targetRef: diagnostic.targetRef,
    source: diagnostic.source,
  };
}

function reversedObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(reversedObjectKeys);
  }
  if (!isPlainRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, recordValue]) => [key, reversedObjectKeys(recordValue)]),
  );
}

function isPlainRecord(value) {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function isRefArray(value) {
  return value.length > 0
    && value.every((item) => isPlainRecord(item)
    && typeof item.kind === "string"
    && typeof item.ref === "string");
}

function isDiagnosticArray(value) {
  return value.length > 0 && value.every(isDiagnosticRecord);
}

function isDiagnosticRecord(value) {
  return isPlainRecord(value)
    && DIAGNOSTIC_STRING_FIELDS.every((field) => typeof value[field] === "string")
    && "blocking" in value;
}

function isOutputRefsRecord(value) {
  return value.kind === "output-refs" && Array.isArray(value.refs);
}

test("PR19 golden snapshot fixture metadata covers the V1.5 MVP truth path and negative cases", () => {
  const truthPathFixture = readFixtureJson("mvp-truth-path.fixture.json");
  const negativeCaseFixture = readFixtureJson("negative-cases.fixture.json");

  assert.equal(truthPathFixture.source, "PR12 MVP demo harness");
  assert.deepEqual(truthPathFixture.snapshotFiles, expectedSnapshotFiles.slice(0, -1));
  assert.deepEqual(
    negativeCaseFixture.cases.map((fixture) => fixture.fixtureId),
    requiredNegativeCaseIds,
  );
  assert.equal(negativeCaseFixture.cases.every((fixture) => fixture.snapshotCovered), true);
});

test("PR19 generated snapshots are stable across repeated generation", () => {
  assert.deepEqual(stableSnapshotStrings(), stableSnapshotStrings());
});

test("PR19 canonical snapshots are independent of object insertion order", () => {
  for (const [fileName, value] of createSnapshots()) {
    assert.equal(prettyCanonical(value), prettyCanonical(reversedObjectKeys(value)), fileName);
  }
});

test("PR19 canonicalizes unordered refs, outputRefs, warnings, errors, and diagnostics", () => {
  const first = [
    { kind: "artifact", ref: "artifact:z" },
    { kind: "construction", ref: "construction:a" },
    { kind: "artifact", ref: "artifact:z" },
    { kind: "measurement", ref: "measurement:b" },
  ];
  const second = [
    { kind: "measurement", ref: "measurement:b" },
    { kind: "artifact", ref: "artifact:z" },
    { kind: "construction", ref: "construction:a" },
  ];
  const diagnostics = [
    core.createCoreWarning({ code: "FeatureFlagsMismatch", message: "Feature flags differ.", targetRef: "featureFlags" }),
    core.createCoreError({ code: "MissingRun", message: "Run missing.", targetRef: "run" }),
    core.createCoreWarning({ code: "ArtifactStale", severity: "critical", message: "Artifact stale.", targetRef: "artifact:z" }),
  ];

  assert.equal(prettyCanonical({ outputRefs: first }), prettyCanonical({ outputRefs: second }));
  assert.deepEqual(
    core.canonicalizeDiagnostics(diagnostics).map((diagnostic) => diagnostic.code),
    ["MissingRun", "ArtifactStale", "FeatureFlagsMismatch"],
  );
});

test("PR19 generated negative cases satisfy expected statuses and diagnostics", () => {
  const truthPath = createTruthPath();
  const snapshot = negativeCasesSnapshot(truthPath);
  const failures = snapshot.cases.filter((negativeCase) => negativeCase.pass !== true);

  assert.deepEqual(failures, []);
});

test("PR19 deterministic identity snapshots exclude timestamp-like metadata", () => {
  const first = prettyCanonical({
    kind: "timestamp-policy-test",
    metadata: { createdAt: "2026-06-12T00:00:00Z", generatedAt: "2026-06-12T01:00:00Z", note: "kept" },
  });
  const second = prettyCanonical({
    metadata: { note: "kept", generatedAt: "2027-01-01T01:00:00Z", createdAt: "2027-01-01T00:00:00Z" },
    kind: "timestamp-policy-test",
  });

  assert.equal(first, second);
});

test("PR19 golden snapshots match committed human-readable JSON", () => {
  const generatedSnapshots = stableSnapshotStrings();

  if (updateGoldens) {
    for (const [fileName, snapshot] of Object.entries(generatedSnapshots)) {
      writeGolden(fileName, snapshot);
    }
  }

  assert.deepEqual(Object.keys(generatedSnapshots), expectedSnapshotFiles);
  for (const fileName of expectedSnapshotFiles) {
    assert.equal(existsSync(join(goldenDir, fileName)), true, fileName);
    assert.equal(readGolden(fileName), generatedSnapshots[fileName], fileName);
    assert.equal(readGolden(fileName).endsWith("\n"), true, fileName);
    assert.doesNotThrow(() => JSON.parse(readGolden(fileName)), fileName);
  }
});

test("PR19/PR21 keep external surfaces absent while PR22 owns replayRun", () => {
  assert.equal(typeof core.verifyArtifactFreshness, "function");
  assert.equal(typeof core.verifyRun, "function");
  assert.equal(typeof core.replayRun, "function");
  assert.equal("createCli" in core, false);
  assert.equal("createSdk" in core, false);
  assert.equal("createMcpServer" in core, false);
});
