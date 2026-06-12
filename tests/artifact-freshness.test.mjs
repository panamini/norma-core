import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

function assertFreshnessResult(result) {
  assert.equal(result.kind, "artifact-freshness-verification");
  assert.ok(result.status);
  assert.ok(Array.isArray(result.sourceRefs));
  assert.ok(Array.isArray(result.missingSourceRefs));
  assert.ok(Array.isArray(result.staleSourceRefs));
  assert.ok(Array.isArray(result.outputRefs));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.serializationSummary);
  assert.equal(result.serializationSummary.canonicalOrdering, true);
}

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function assertStatus(result, status) {
  assertFreshnessResult(result);
  assert.equal(result.status, status);
}

function createTruthPath() {
  const input = core.createMvpDemoInput();
  const result = core.runMvpDemo(input);
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return { input, demo: result.output };
}

function sourceObjectsForRefs(refs) {
  return refs.map((ref) => ({ kind: ref.kind, id: ref.ref }));
}

function freshnessInput(artifact, overrides = {}) {
  return {
    artifact,
    sourceObjects: sourceObjectsForRefs(artifact.sourceRefs),
    expectedSourceRefs: [...artifact.sourceRefs].reverse(),
    expectedOutputRefs: [...artifact.outputRefs].reverse(),
    expectedRunRef: artifact.runRef,
    expectedOptions: reverseObjectKeys(artifact.options),
    ...overrides,
  };
}

function reverseObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeys);
  }
  if (!isPlainRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeys(nestedValue)]),
  );
}

function isPlainRecord(value) {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function deepFreeze(value) {
  if (!isPlainRecord(value) && !Array.isArray(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue);
  }
  return value;
}

function canonicalFreshness(result) {
  return core.serializeCanonicalJson(result, core.DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

test("PR20 exports verifyArtifactFreshness without starting verifyRun or replayRun", () => {
  assert.equal(typeof core.verifyArtifactFreshness, "function");
  assert.equal("verifyRun" in core, false);
  assert.equal("replayRun" in core, false);
});

test("PR20 verifies a current MVP artifact from explicit structured source refs", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;

  const result = core.verifyArtifactFreshness(freshnessInput(artifact));

  assertStatus(result, "current");
  assert.deepEqual(result.artifactRef, { kind: "artifact", ref: artifact.id });
  assert.deepEqual(result.sourceRefs, core.canonicalizeRefs(artifact.sourceRefs));
  assert.deepEqual(result.missingSourceRefs, []);
  assert.deepEqual(result.staleSourceRefs, []);
  assert.deepEqual(result.outputRefs, core.canonicalizeOutputRefs(artifact.outputRefs).refs);
  assert.deepEqual(result.warnings, core.canonicalizeWarnings(artifact.warnings));
  assert.deepEqual(result.errors, core.canonicalizeErrors(artifact.errors));
  assert.deepEqual(result.provenance, artifact.provenance);
});

test("PR20 preserves lossy artifact status instead of upgrading it to current", () => {
  const { demo } = createTruthPath();
  const artifact = demo.visualArtifactResult.output;

  const result = core.verifyArtifactFreshness(freshnessInput(artifact));

  assertStatus(result, "lossy");
  assert.equal(artifact.status, "lossy");
  assert.deepEqual(result.warnings, core.canonicalizeWarnings(artifact.warnings));
  assert.deepEqual(result.errors, core.canonicalizeErrors(artifact.errors));
});

test("PR20 marks explicit expected ref, output, run, or option mismatches as stale", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
  const before = structuredClone(artifact);

  const result = core.verifyArtifactFreshness(freshnessInput(artifact, {
    expectedSourceRefs: [{ kind: "surface", ref: "surface:changed" }],
    expectedOutputRefs: [{ kind: "artifact", ref: "artifact:changed" }],
    expectedRunRef: { id: "run:changed" },
    expectedOptions: { ...artifact.options, id: "changed" },
  }));

  assertStatus(result, "stale");
  assert.ok(diagnosticCodes(result).includes("ArtifactStale"), diagnosticCodes(result).join(", "));
  assert.deepEqual(artifact, before);
});

test("PR20 returns non_replayable when required run refs or explicit source objects are missing", () => {
  const { demo } = createTruthPath();
  const artifact = {
    ...demo.artifactResults.structuredResults[0].output,
    runRef: null,
  };

  const result = core.verifyArtifactFreshness({
    artifact,
    sourceObjects: [],
    expectedSourceRefs: artifact.sourceRefs,
    expectedOutputRefs: artifact.outputRefs,
    expectedRunRef: null,
    expectedOptions: artifact.options,
  });

  assertStatus(result, "non_replayable");
  assert.ok(diagnosticCodes(result).includes("MissingArtifactRunRef"), diagnosticCodes(result).join(", "));
  assert.ok(diagnosticCodes(result).includes("MissingSource"), diagnosticCodes(result).join(", "));
  assert.deepEqual(result.missingSourceRefs, core.canonicalizeRefs(artifact.sourceRefs));
});

test("PR20 reports a non-replayable artifact with a present runRef without claiming the runRef is missing", () => {
  const { demo } = createTruthPath();
  const artifact = {
    ...demo.artifactResults.structuredResults[0].output,
    status: "non_replayable",
  };

  const result = core.verifyArtifactFreshness(freshnessInput(artifact));

  assertStatus(result, "non_replayable");
  assert.ok(diagnosticCodes(result).includes("ArtifactNonReplayable"), diagnosticCodes(result).join(", "));
  assert.equal(diagnosticCodes(result).includes("MissingArtifactRunRef"), false);
});

test("PR20 rejects malformed or non-derived artifacts as invalid", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;

  const result = core.verifyArtifactFreshness({
    ...freshnessInput(artifact),
    artifact: { ...artifact, derived: false },
  });

  assertStatus(result, "invalid");
  assert.ok(diagnosticCodes(result).includes("ArtifactWouldBecomeSourceOfTruth"), diagnosticCodes(result).join(", "));
});

test("PR20 rejects artifact-as-source inputs without treating derived content as truth", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;

  const result = core.verifyArtifactFreshness(freshnessInput(artifact, {
    sourceObjects: [demo.visualArtifactResult.output],
  }));

  assertStatus(result, "invalid");
  assert.ok(diagnosticCodes(result).includes("ArtifactWouldBecomeSourceOfTruth"), diagnosticCodes(result).join(", "));
});

test("PR20 preserves visible diagnostics and rejects hidden critical warnings", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
  const hiddenCriticalWarning = core.createCoreWarning({
    code: "MissingArtifactSource",
    severity: "critical",
    message: "Critical warning cannot be non-blocking.",
    targetRef: artifact.id,
    blocking: false,
  });
  const existingError = core.createCoreError({
    code: "InvalidArtifactInput",
    message: "Existing artifact error remains visible.",
    targetRef: artifact.id,
  });

  const result = core.verifyArtifactFreshness(freshnessInput({
    ...artifact,
    warnings: [hiddenCriticalWarning],
    errors: [existingError],
  }));

  assertStatus(result, "invalid");
  assert.ok(diagnosticCodes(result).includes("ArtifactCriticalWarningHidden"), diagnosticCodes(result).join(", "));
  assert.ok(result.warnings.some((warning) => warning === hiddenCriticalWarning || warning.message === hiddenCriticalWarning.message));
  assert.ok(result.errors.some((error) => error === existingError || error.message === existingError.message));
});

test("PR20 canonicalizes refs, output refs, diagnostics, and options deterministically", () => {
  const { demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
  const first = core.verifyArtifactFreshness(freshnessInput(artifact));
  const second = core.verifyArtifactFreshness(freshnessInput(artifact, {
    sourceObjects: sourceObjectsForRefs([...artifact.sourceRefs].reverse()),
    expectedSourceRefs: [...artifact.sourceRefs],
    expectedOutputRefs: [...artifact.outputRefs],
    expectedOptions: artifact.options,
  }));

  assertStatus(first, "current");
  assertStatus(second, "current");
  assert.equal(canonicalFreshness(first), canonicalFreshness(second));
});

test("PR20 does not mutate artifacts or source objects", () => {
  const { demo } = createTruthPath();
  const artifact = deepFreeze(structuredClone(demo.visualArtifactResult.output));
  const sourceObjects = deepFreeze(sourceObjectsForRefs(artifact.sourceRefs));
  const artifactBefore = structuredClone(artifact);
  const sourceObjectsBefore = structuredClone(sourceObjects);

  const result = core.verifyArtifactFreshness(freshnessInput(artifact, { sourceObjects }));

  assertStatus(result, "lossy");
  assert.deepEqual(artifact, artifactBefore);
  assert.deepEqual(sourceObjects, sourceObjectsBefore);
});
