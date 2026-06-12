import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

function createTruthPath() {
  const input = core.createMvpDemoInput();
  const result = core.runMvpDemo(input);
  assert.equal(result.status, "ok");
  assert.ok(result.output);
  return { input, demo: result.output };
}

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function assertRunVerification(result, status, mode) {
  assert.equal(result.kind, "run-verification");
  assert.equal(result.status, status);
  assert.equal(result.mode, mode);
  assert.ok("runRef" in result);
  assert.ok("operationName" in result);
  assert.ok("operationVersion" in result);
  assert.ok("packLockRef" in result);
  assert.ok("operationContextRef" in result);
  assert.ok(Array.isArray(result.sourceRefs));
  assert.ok(Array.isArray(result.missingSourceRefs));
  assert.ok(Array.isArray(result.outputRefs));
  assert.ok(Array.isArray(result.mismatchCodes));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.replaySummary);
  assert.equal(result.replaySummary.replayAttempted, false);
  assert.equal(result.replaySummary.replayRequired, false);
  assert.equal(result.replaySummary.replayStatus, null);
  assert.deepEqual(result.replaySummary.replayDiagnostics, []);
  assert.deepEqual(result.replaySummary.replayMismatches, []);
  assert.deepEqual(result.replaySummary.replayOutputRefs, []);
  assert.ok(Array.isArray(result.replaySummary.recordedOutputRefs));
  assert.ok(Array.isArray(result.replaySummary.sourceRefsUsed));
  assert.ok(result.serializationSummary);
  assert.equal(result.serializationSummary.canonicalOrdering, true);
}

function weakSourceObjectsForRun(run) {
  return run.input.sourceRefs.map((sourceRef) => ({
    sourceRef,
    sourceObject: { kind: `${sourceRef.kind}-source`, id: sourceRef.ref },
  }));
}

function sourceObjectsForRun(input) {
  return [
    {
      sourceRef: { kind: "mvp-demo-input", ref: "mvp-demo:structured-input" },
      sourceObject: { ...input, id: "mvp-demo:structured-input" },
    },
    { sourceRef: { kind: "surface", ref: input.surface.id }, sourceObject: input.surface },
    { sourceRef: { kind: "ratio-pack", ref: input.packRef }, sourceObject: input.ratioPack },
    {
      sourceRef: { kind: "rule-set", ref: input.ruleSetRef },
      sourceObject: input.ratioPack.ruleSets.find((ruleSet) => ruleSet.id === input.ruleSetRef),
    },
    {
      sourceRef: { kind: "evaluation-profile", ref: input.evaluationProfile.id },
      sourceObject: input.evaluationProfile,
    },
    {
      sourceRef: { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
      sourceObject: input.tolerancePolicy,
    },
    {
      sourceRef: { kind: "evaluation-tolerances", ref: input.evaluationTolerances.id },
      sourceObject: input.evaluationTolerances,
    },
    {
      sourceRef: { kind: "coordinate-system", ref: input.surface.coordinateSystem.id },
      sourceObject: input.surface.coordinateSystem,
    },
    {
      sourceRef: { kind: "metric-policy", ref: input.surface.metricPolicy.id },
      sourceObject: input.surface.metricPolicy,
    },
  ];
}

function sourceObjectsForArtifact(demo, artifact) {
  return artifact.sourceRefs.flatMap((sourceRef) => {
    if (sourceRef.kind === "core-result" && sourceRef.ref === "mvp-demo:construction") {
      return [{ sourceRef, result: demo.constructionResult }];
    }

    if (sourceRef.kind === "construction" && sourceRef.ref === demo.constructionResult.output.id) {
      return [demo.constructionResult.output];
    }

    return [];
  });
}

function freshnessInput(demo, artifact, overrides = {}) {
  return {
    artifact,
    sourceObjects: sourceObjectsForArtifact(demo, artifact),
    expectedSourceRefs: [...artifact.sourceRefs].reverse(),
    expectedOutputRefs: [...artifact.outputRefs].reverse(),
    expectedRunRef: artifact.runRef,
    expectedOptions: reverseObjectKeys(artifact.options),
    expectedOperationContextRef: demo.operationContext.ref,
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

function reversedRunOrdering(run) {
  return {
    ...run,
    inputRefs: [...run.inputRefs].reverse(),
    input: {
      ...run.input,
      inputRefs: [...run.input.inputRefs].reverse(),
      sourceRefs: [...run.input.sourceRefs].reverse(),
      requestedOutputRefs: {
        ...run.input.requestedOutputRefs,
        refs: [...run.input.requestedOutputRefs.refs].reverse(),
      },
    },
    outputRefs: {
      ...run.outputRefs,
      refs: [...run.outputRefs.refs].reverse(),
    },
    warnings: [...run.warnings].reverse(),
    errors: [...run.errors].reverse(),
  };
}

function canonicalVerification(result) {
  return core.serializeCanonicalJson(result, core.DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
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

function isPlainRecord(value) {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

test("PR21 exports verifyRun while PR22 owns replayRun and external surfaces stay absent", () => {
  assert.equal(typeof core.verifyRun, "function");
  assert.equal(typeof core.replayRun, "function");
  assert.equal("createCli" in core, false);
  assert.equal("createSdk" in core, false);
  assert.equal("createMcpServer" in core, false);
});

test("PR21 audit_only verifies the MVP run by inspection without replay", () => {
  const { demo } = createTruthPath();
  const result = core.verifyRun({
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    expectedOutputRefs: [...demo.runEnvelope.outputRefs.refs].reverse(),
    expectedOperationName: demo.runEnvelope.operationName,
    expectedOperationVersion: demo.runEnvelope.operationVersion,
  });

  assertRunVerification(result, "verified", "audit_only");
  assert.deepEqual(result.runRef, demo.runEnvelope.runRef);
  assert.equal(result.operationName, "core.mvp-demo.run");
  assert.equal(result.operationVersion, "0.1.0-pr12");
  assert.deepEqual(result.outputRefs, core.canonicalizeOutputRefs(demo.runEnvelope.outputRefs).refs);
  assert.deepEqual(result.sourceRefs, core.canonicalizeRefs(demo.runEnvelope.input.sourceRefs));
  assert.equal(result.replaySummary.replayEligible, "not_requested");
  assert.equal("artifactFreshness" in result, false);
});

test("PR21 audit_only preserves coherent run warnings as verified_with_warnings", () => {
  const { demo } = createTruthPath();
  const warning = core.createCoreWarning({
    code: "ArtifactStale",
    message: "Synthetic non-blocking audit warning.",
    targetRef: demo.runEnvelope.id,
    sourceRef: { kind: "run", ref: demo.runEnvelope.id },
  });
  const run = { ...demo.runEnvelope, warnings: [warning] };
  const result = core.verifyRun({
    run,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
  });

  assertRunVerification(result, "verified_with_warnings", "audit_only");
  assert.ok(diagnosticCodes(result).includes("ArtifactStale"), diagnosticCodes(result).join(", "));
  assert.equal(result.warnings.some((item) => item.message === warning.message), true);
});

test("PR21 replay_eligible verifies visible MVP replay dependencies without executing replay", () => {
  const { input, demo } = createTruthPath();
  const result = core.verifyRun({
    run: demo.runEnvelope,
    mode: "replay_eligible",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    sourceObjects: sourceObjectsForRun(input),
    expectedOutputRefs: demo.runEnvelope.outputRefs,
  });

  assertRunVerification(result, "verified", "replay_eligible");
  assert.equal(result.replaySummary.replayEligible, "eligible");
  assert.deepEqual(result.missingSourceRefs, []);
  assert.deepEqual(result.replaySummary.sourceRefsUsed, core.canonicalizeRefs(demo.runEnvelope.input.sourceRefs));
});

test("PR21 does not accept weak source-object placeholders as replay-eligible source coverage", () => {
  const { demo } = createTruthPath();
  const result = core.verifyRun({
    run: demo.runEnvelope,
    mode: "replay_eligible",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    sourceObjects: weakSourceObjectsForRun(demo.runEnvelope),
  });

  assertRunVerification(result, "non_replayable", "replay_eligible");
  assert.ok(diagnosticCodes(result).includes("MissingSource"), diagnosticCodes(result).join(", "));
  assert.equal(result.replaySummary.replayEligible, "not_eligible");
  assert.deepEqual(result.missingSourceRefs, core.canonicalizeRefs(demo.runEnvelope.input.sourceRefs));
});

test("PR21 replay_eligible reports missing replay dependencies as non_replayable", () => {
  const { demo } = createTruthPath();
  const result = core.verifyRun({
    run: demo.runEnvelope,
    mode: "replay_eligible",
  });

  assertRunVerification(result, "non_replayable", "replay_eligible");
  for (const code of ["MissingPackLock", "MissingOperationContext", "MissingSource"]) {
    assert.ok(diagnosticCodes(result).includes(code), diagnosticCodes(result).join(", "));
  }
  assert.equal(result.replaySummary.replayEligible, "not_eligible");
  assert.deepEqual(result.missingSourceRefs, core.canonicalizeRefs(demo.runEnvelope.input.sourceRefs));
});

test("PR21 reports explicit PackLock, OperationContext, output ref, and operation mismatches", () => {
  const { demo } = createTruthPath();
  const mismatchedPackLock = {
    ...demo.packLock,
    id: `${demo.packLock.id}:mismatch`,
    ref: { id: `${demo.packLock.ref.id}:mismatch` },
    contentIdentity: "different-content-identity",
  };
  const mismatchedContext = {
    ...demo.operationContext,
    id: `${demo.operationContext.id}:mismatch`,
    ref: { id: `${demo.operationContext.ref.id}:mismatch` },
    operationVersion: "0.1.0-mismatch",
  };

  const result = core.verifyRun({
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: mismatchedPackLock,
    operationContext: mismatchedContext,
    expectedOutputRefs: [{ kind: "construction", ref: "construction:changed" }],
    expectedOperationVersion: "0.1.0-mismatch",
  });

  assertRunVerification(result, "mismatch", "audit_only");
  for (const code of ["PackContentIdentityMismatch", "OperationVersionMismatch", "MissingOutputRefs"]) {
    assert.ok(diagnosticCodes(result).includes(code), diagnosticCodes(result).join(", "));
    assert.ok(result.mismatchCodes.includes(code), result.mismatchCodes.join(", "));
  }
  assert.equal(result.replaySummary.replayEligible, "not_requested");
});

test("PR21 rejects incoherent run internal refs before merge", () => {
  const { demo } = createTruthPath();
  const cases = [
    {
      run: {
        ...demo.runEnvelope,
        input: { ...demo.runEnvelope.input, packLockRef: { id: `${demo.runEnvelope.packLockRef.id}:changed` } },
      },
      code: "PackContentIdentityMismatch",
    },
    {
      run: {
        ...demo.runEnvelope,
        input: { ...demo.runEnvelope.input, operationContextRef: { id: `${demo.runEnvelope.operationContextRef.id}:changed` } },
      },
      code: "OperationVersionMismatch",
    },
    {
      run: {
        ...demo.runEnvelope,
        inputRefs: [{ kind: "surface", ref: "surface:changed" }],
      },
      code: "MissingSource",
    },
    {
      run: {
        ...demo.runEnvelope,
        input: {
          ...demo.runEnvelope.input,
          requestedOutputRefs: { ...demo.runEnvelope.input.requestedOutputRefs, refs: [{ kind: "construction", ref: "construction:changed" }] },
        },
      },
      code: "MissingOutputRefs",
    },
  ];

  for (const { run, code } of cases) {
    const result = core.verifyRun({
      run,
      mode: "audit_only",
      packLock: demo.packLock,
      operationContext: demo.operationContext,
    });
    assertRunVerification(result, "mismatch", "audit_only");
    assert.ok(diagnosticCodes(result).includes(code), diagnosticCodes(result).join(", "));
    assert.ok(result.mismatchCodes.includes(code), result.mismatchCodes.join(", "));
  }
});

test("PR21 detects PackLock content identity drift even when the ref id is unchanged", () => {
  const { demo } = createTruthPath();
  const result = core.verifyRun({
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: { ...demo.packLock, contentIdentity: "different-content-identity" },
    operationContext: demo.operationContext,
  });

  assertRunVerification(result, "mismatch", "audit_only");
  assert.ok(diagnosticCodes(result).includes("PackContentIdentityMismatch"), diagnosticCodes(result).join(", "));
  assert.ok(result.mismatchCodes.includes("PackContentIdentityMismatch"), result.mismatchCodes.join(", "));
});

test("PR21 detects OperationContext output-changing policy drift even when the ref id is unchanged", () => {
  const { demo } = createTruthPath();
  const featureFlagResult = core.verifyRun({
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: {
      ...demo.operationContext,
      featureFlags: { ...demo.operationContext.featureFlags, mvpDemoHarness: false },
    },
  });
  assertRunVerification(featureFlagResult, "mismatch", "audit_only");
  assert.ok(diagnosticCodes(featureFlagResult).includes("FeatureFlagsMismatch"), diagnosticCodes(featureFlagResult).join(", "));

  const toleranceResult = core.verifyRun({
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: {
      ...demo.operationContext,
      tolerancePolicy: {
        ...demo.operationContext.tolerancePolicy,
        value: { ...demo.operationContext.tolerancePolicy.value, id: "changed-tolerance-policy" },
      },
    },
  });
  assertRunVerification(toleranceResult, "mismatch", "audit_only");
  assert.ok(diagnosticCodes(toleranceResult).includes("TolerancePolicyMismatch"), diagnosticCodes(toleranceResult).join(", "));
});

test("PR21 returns unsupported for replay_required mode or unsupported operations without fallback", () => {
  const { demo } = createTruthPath();
  const unsupportedMode = core.verifyRun({
    run: demo.runEnvelope,
    mode: "replay_required",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
  });
  assertRunVerification(unsupportedMode, "unsupported", "replay_required");
  assert.ok(diagnosticCodes(unsupportedMode).includes("UnsupportedOperation"));
  assert.equal(unsupportedMode.replaySummary.replayEligible, "unsupported");

  const unsupportedOperation = core.verifyRun({
    run: { ...demo.runEnvelope, operationName: "core.future.operation" },
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
  });
  assertRunVerification(unsupportedOperation, "unsupported", "audit_only");
  assert.ok(diagnosticCodes(unsupportedOperation).includes("UnsupportedOperation"));
});

test("PR21 returns invalid for malformed input, runtime objects, diagnostics, refs, or artifact-as-source", () => {
  const { demo } = createTruthPath();
  const malformedDiagnostic = { code: "ArtifactStale" };
  const cases = [
    [null, "InvalidInputShape"],
    [{ run: { kind: "run", id: "broken" } }, "MissingRun"],
    [{ run: { ...demo.runEnvelope, runRef: { id: "" } } }, "MissingRun"],
    [{ run: { ...demo.runEnvelope, input: { ...demo.runEnvelope.input, sourceRefs: [{ kind: "surface" }] } } }, "InvalidInputShape"],
    [{ run: { ...demo.runEnvelope, warnings: [malformedDiagnostic] } }, "InvalidInputShape"],
    [{ run: demo.runEnvelope, packLock: { ...demo.packLock, ref: null } }, "InvalidPackLock"],
    [{ run: demo.runEnvelope, operationContext: { ...demo.operationContext, operationVersion: "" } }, "InvalidOperationContext"],
    [{
      run: demo.runEnvelope,
      mode: "replay_eligible",
      packLock: demo.packLock,
      operationContext: demo.operationContext,
      sourceObjects: [demo.visualArtifactResult.output],
    }, "ArtifactWouldBecomeSourceOfTruth"],
  ];

  for (const [input, code] of cases) {
    const result = core.verifyRun(input);
    assert.equal(result.status, "invalid", code);
    assert.ok(diagnosticCodes(result).includes(code), diagnosticCodes(result).join(", "));
  }
});

test("PR21 integrates explicit artifact freshness inputs without treating artifacts as source truth", () => {
  const { input, demo } = createTruthPath();
  const artifact = demo.artifactResults.structuredResults[0].output;
  const current = core.verifyRun({
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    artifactFreshnessInputs: [freshnessInput(demo, artifact)],
  });

  assertRunVerification(current, "verified", "audit_only");
  assert.equal(current.artifactFreshness.length, 1);
  assert.equal(current.artifactFreshness[0].status, "current");

  const nonReplayableAudit = core.verifyRun({
    run: demo.runEnvelope,
    mode: "audit_only",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    artifactFreshnessInputs: [
      freshnessInput(demo, { ...artifact, status: "non_replayable" }),
    ],
    requireFreshArtifacts: false,
  });
  assertRunVerification(nonReplayableAudit, "verified_with_warnings", "audit_only");
  assert.equal(nonReplayableAudit.artifactFreshness[0].status, "non_replayable");
  assert.equal(nonReplayableAudit.errors.length, 0);
  assert.ok(diagnosticCodes(nonReplayableAudit).includes("ArtifactNonReplayable"), diagnosticCodes(nonReplayableAudit).join(", "));

  const staleRequired = core.verifyRun({
    run: demo.runEnvelope,
    mode: "replay_eligible",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    sourceObjects: sourceObjectsForRun(input),
    artifactFreshnessInputs: [
      freshnessInput(demo, { ...artifact, status: "stale" }),
    ],
    requireFreshArtifacts: true,
  });

  assertRunVerification(staleRequired, "mismatch", "replay_eligible");
  assert.ok(diagnosticCodes(staleRequired).includes("ArtifactStale"), diagnosticCodes(staleRequired).join(", "));
  assert.equal(staleRequired.replaySummary.replayEligible, "not_eligible");

  const nonReplayableRequired = core.verifyRun({
    run: demo.runEnvelope,
    mode: "replay_eligible",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    sourceObjects: sourceObjectsForRun(input),
    artifactFreshnessInputs: [
      freshnessInput(demo, { ...artifact, status: "non_replayable" }),
    ],
    requireFreshArtifacts: true,
  });

  assertRunVerification(nonReplayableRequired, "non_replayable", "replay_eligible");
  assert.equal(nonReplayableRequired.artifactFreshness[0].status, "non_replayable");
  assert.ok(nonReplayableRequired.errors.length > 0);
  assert.ok(diagnosticCodes(nonReplayableRequired).includes("ArtifactNonReplayable"), diagnosticCodes(nonReplayableRequired).join(", "));
  assert.equal(nonReplayableRequired.replaySummary.replayEligible, "not_eligible");
});

test("PR21 canonicalizes verification results independently of input ordering", () => {
  const { input, demo } = createTruthPath();
  const first = core.verifyRun({
    run: demo.runEnvelope,
    mode: "replay_eligible",
    packLock: demo.packLock,
    operationContext: demo.operationContext,
    sourceObjects: sourceObjectsForRun(input),
    expectedOutputRefs: demo.runEnvelope.outputRefs,
  });
  const second = core.verifyRun({
    run: reversedRunOrdering(demo.runEnvelope),
    mode: "replay_eligible",
    packLock: reverseObjectKeys(demo.packLock),
    operationContext: reverseObjectKeys(demo.operationContext),
    sourceObjects: sourceObjectsForRun(input).reverse(),
    expectedOutputRefs: [...demo.runEnvelope.outputRefs.refs].reverse(),
  });

  assertRunVerification(first, "verified", "replay_eligible");
  assertRunVerification(second, "verified", "replay_eligible");
  assert.equal(canonicalVerification(first), canonicalVerification(second));
});

test("PR21 does not mutate run, lock, context, source objects, or artifacts", () => {
  const { input, demo } = createTruthPath();
  const artifact = deepFreeze(structuredClone(demo.visualArtifactResult.output));
  const run = deepFreeze(structuredClone(demo.runEnvelope));
  const packLock = deepFreeze(structuredClone(demo.packLock));
  const operationContext = deepFreeze(structuredClone(demo.operationContext));
  const sourceObjects = deepFreeze(sourceObjectsForRun(input));
  const freshness = deepFreeze(freshnessInput(demo, artifact));
  const before = structuredClone({ run, packLock, operationContext, sourceObjects, artifact, freshness });

  const result = core.verifyRun({
    run,
    mode: "audit_only",
    packLock,
    operationContext,
    sourceObjects,
    artifactFreshnessInputs: [freshness],
  });

  assert.ok(["verified", "verified_with_warnings"].includes(result.status));
  assert.deepEqual({ run, packLock, operationContext, sourceObjects, artifact, freshness }, before);
});
