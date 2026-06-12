import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const pr11DiagnosticCodes = [
  "MissingRun",
  "MissingRunInput",
  "MissingRunOutput",
  "InvalidPackLock",
  "InvalidOperationContext",
  "MissingOutputRefs",
  "MissingSource",
  "PackVersionMismatch",
  "PackContentIdentityMismatch",
  "OperationVersionMismatch",
  "GeometryModelVersionMismatch",
  "TolerancePolicyMismatch",
  "CoordinatePolicyMismatch",
  "MetricPolicyMismatch",
  "FeatureFlagsMismatch",
  "ArtifactStale",
  "ReplayRunNotImplemented",
];

const metricCoordinateSystem2d = {
  kind: "coordinate-system",
  id: "norma-canonical-2d-metric",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "metric",
};

const metricPolicy = {
  kind: "metric-policy",
  id: "pixel-length-policy",
  quantity: "length",
  unit: "px",
};

const tolerancePolicy = {
  kind: "tolerance-policy",
  id: "runtime-test-tolerance",
  coordinateTolerance: 0,
  metricTolerance: 1,
};

const outputRefs = [
  { kind: "artifact", ref: "artifact:summary" },
  { kind: "decision", ref: "decision:comparison:a-b" },
  { kind: "construction", ref: "construction:surface:1200x800:surface-basic-third-grid" },
  { kind: "evaluation", ref: "evaluation:A:basic-grid-alignment" },
  { kind: "measurement", ref: "measurement:A:alignment" },
  { kind: "comparison", ref: "comparison:evaluation:A:evaluation:B" },
  { kind: "measurement", ref: "measurement:A:alignment" },
];

const sourceRefs = [
  { kind: "surface", ref: "surface:1200x800" },
  { kind: "ratio-pack", ref: "norma.basic-proportions@0.1.0" },
  { kind: "rule-set", ref: "surface-basic-third-grid" },
  { kind: "tolerance-policy", ref: tolerancePolicy.id },
  { kind: "coordinate-system", ref: metricCoordinateSystem2d.id },
  { kind: "metric-policy", ref: metricPolicy.id },
];

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function assertStructuredResult(result) {
  assert.equal(typeof result, "object");
  assert.ok(result.status);
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.outputRefs));
  assert.ok("output" in result);
  assert.ok("provenance" in result);
  assert.ok("runRef" in result);
  assert.ok("packLockRef" in result);
  assert.ok("operationContextRef" in result);
}

function assertOk(result) {
  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.ok(result.output);
}

function assertFailedWithDiagnostic(result, diagnosticCode) {
  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes(diagnosticCode), diagnosticCodes(result).join(", "));
  assert.equal(result.output, null);
}

function createPackLock() {
  const result = core.createPackLock(core.BASIC_PROPORTIONS_PACK);
  assertOk(result);
  return result.output;
}

function createOperationContext(overrides = {}) {
  const result = core.createOperationContext({
    operationName: "core.evaluation.basic.evaluate",
    operationVersion: "0.1.0",
    coordinatePolicy: metricCoordinateSystem2d,
    metricPolicy,
    tolerancePolicy,
    featureFlags: { beta: false, alpha: true },
    sourceRefs,
    ...overrides,
  });
  assertOk(result);
  return result.output;
}

function sourceResult(packLock = createPackLock(), operationContext = createOperationContext()) {
  return {
    status: "ok",
    warnings: [],
    errors: [],
    provenance: {
      operationName: operationContext.operationName,
      operationVersion: operationContext.operationVersion,
      inputRefs: sourceRefs,
      source: { kind: "core", ref: "test-source-result" },
    },
    outputRefs,
    runRef: null,
    packLockRef: packLock.ref,
    operationContextRef: operationContext.ref,
    output: { kind: "evaluation", id: "evaluation:A:basic-grid-alignment" },
  };
}

function createRunEnvelope(overrides = {}) {
  const packLock = overrides.packLock ?? createPackLock();
  const operationContext = overrides.operationContext ?? createOperationContext();
  const result = core.createRun({
    packLock,
    operationContext,
    result: sourceResult(packLock, operationContext),
    outputRefs,
    sourceRefs,
    metadata: overrides.metadata,
  });
  assertOk(result);
  return result.output;
}

test("PR12 exports runtime vocabulary, diagnostics, helpers, and version", () => {
  assert.equal(core.CORE_VERSION, "0.1.0-pr12");
  assert.deepEqual(core.REPLAY_READINESS_STATUSES, [
    "ready",
    "ready_with_warnings",
    "mismatch",
    "non_replayable",
  ]);

  for (const diagnosticCode of pr11DiagnosticCodes) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(diagnosticCode), diagnosticCode);
  }

  for (const helper of [
    core.createPackLock,
    core.createOperationContext,
    core.createRun,
    core.createRunInput,
    core.createRunOutput,
    core.validateRunReadiness,
    core.compareRunContext,
    core.sortOutputRefsDeterministically,
  ]) {
    assert.equal(typeof helper, "function");
  }

  assert.equal("replayRun" in core, false);
  assert.equal("verifyRun" in core, false);
  assert.equal("verifyArtifactFreshness" in core, false);
});

test("PR11 creates an effective PackLock from a validated ratio pack without inventing a hash", () => {
  const result = core.createPackLock(core.BASIC_PROPORTIONS_PACK);
  assertOk(result);
  assert.equal(result.output.kind, "pack-lock");
  assert.equal(result.output.status, "effective_pr11");
  assert.equal(result.output.packId, "norma.basic-proportions");
  assert.equal(result.output.packVersion, "0.1.0");
  assert.equal(result.output.packSchemaVersion, core.RATIO_PACK_V1_SCHEMA_VERSION);
  assert.equal(result.output.contentIdentity, core.BASIC_PROPORTIONS_PACK_CONTENT_IDENTITY);
  assert.ok(result.output.sourceRefs.some((ref) => ref.kind === "ratio-pack"));
  assert.equal(result.output.id.includes(result.output.contentIdentity), true);
  assert.equal(result.output.id.includes("sha"), false);
});

test("PR12 creates a visible OperationContext with effective defaults and sorted feature flags", () => {
  const first = createOperationContext({ featureFlags: { zeta: false, alpha: true } });
  const second = createOperationContext({ featureFlags: { alpha: true, zeta: false } });

  assert.equal(first.kind, "operation-context");
  assert.equal(first.coreVersion, "0.1.0-pr12");
  assert.equal(first.geometryModelVersion, "geometry-v1");
  assert.equal(first.coordinatePolicy.value.id, metricCoordinateSystem2d.id);
  assert.equal(first.metricPolicy.value.id, metricPolicy.id);
  assert.equal(first.tolerancePolicy.value.id, tolerancePolicy.id);
  assert.equal(first.roundingPolicy.value.id, "runtime.rounding.none");
  assert.equal(first.numericPolicy.value.id, "runtime.numeric.finite-number");
  assert.equal(first.orderingPolicy.value.id, "runtime.ordering.output-refs-v1");
  assert.deepEqual(Object.keys(first.featureFlags), ["alpha", "zeta"]);
  assert.equal(first.id, second.id);
});

test("PR11 creates stable Run identity and deterministic OutputRefs without using timestamp identity", () => {
  const first = createRunEnvelope({ metadata: { createdAt: "2026-06-12T08:00:00Z" } });
  const second = createRunEnvelope({ metadata: { createdAt: "2027-01-01T00:00:00Z" } });

  assert.equal(first.kind, "run");
  assert.equal(first.id, second.id);
  assert.equal(first.runRef.id, second.runRef.id);
  assert.equal(first.replayReadinessStatus, "ready");
  assert.equal(first.packLockRef.id.startsWith("pack-lock:"), true);
  assert.equal(first.operationContextRef.id.startsWith("operation-context:"), true);
  assert.deepEqual(
    first.outputRefs.refs.map((ref) => ref.kind),
    ["construction", "measurement", "evaluation", "comparison", "decision", "artifact"],
  );
  assert.equal(first.outputRefs.refs.filter((ref) => ref.kind === "measurement").length, 1);
});

test("PR11 createRun does not treat result provenance inputRefs as visible sourceRefs", () => {
  const packLock = createPackLock();
  const operationContext = createOperationContext();
  const result = sourceResult(packLock, operationContext);

  assertFailedWithDiagnostic(
    core.createRun({
      operationContext,
      result: {
        ...result,
        provenance: {
          ...result.provenance,
          inputRefs: [{ kind: "construction", ref: "construction:not-a-source" }],
        },
      },
      outputRefs,
    }),
    "MissingSource",
  );
});

test("PR11 RunOutput mirrors source result diagnostics and does not duplicate business output", () => {
  const packLock = createPackLock();
  const operationContext = createOperationContext();
  const warning = core.createCoreWarning({
    code: "ArtifactStale",
    message: "Synthetic stale warning.",
    sourceRef: { kind: "artifact", ref: "artifact:summary" },
  });
  const result = core.createRunOutput({
    runRef: { id: "run:test" },
    result: {
      ...sourceResult(packLock, operationContext),
      warnings: [warning],
    },
  });

  assertOk(result);
  assert.equal(result.output.kind, "run-output");
  assert.equal(result.output.resultStatus, "ok");
  assert.deepEqual(result.output.warnings, [warning]);
  assert.equal("businessOutput" in result.output, false);
  assert.equal("output" in result.output, false);
});

test("PR11 RunOutput creates minimal runtime provenance when explicit output refs are provided", () => {
  const packLock = createPackLock();
  const operationContext = createOperationContext();
  const result = core.createRunOutput({
    runRef: { id: "run:explicit-output-refs" },
    outputRefs,
    packLockRef: packLock.ref,
    operationContextRef: operationContext.ref,
  });

  assertOk(result);
  assert.ok(result.output.provenance);
  assert.equal(result.output.provenance.operationName, "core.runtime-v1.run-output.create");
  assert.deepEqual(result.output.provenance.inputRefs, [
    { kind: "run", ref: "run:explicit-output-refs" },
    { kind: "pack-lock", ref: packLock.ref.id },
    { kind: "operation-context", ref: operationContext.ref.id },
    ...result.output.outputRefs.refs,
  ]);
});

test("PR11 rejects incomplete OperationContext policies before identity construction", () => {
  assertFailedWithDiagnostic(
    core.createOperationContext({
      operationName: "core.evaluation.basic.evaluate",
      operationVersion: "0.1.0",
      coordinatePolicy: { kind: "coordinate-system" },
    }),
    "MissingOperationContext",
  );
});

test("PR11 compareRunContext exposes required mismatch policy", () => {
  const expectedPackLock = createPackLock();
  const actualPackLock = {
    ...expectedPackLock,
    id: `${expectedPackLock.id}:other`,
    ref: { id: `${expectedPackLock.ref.id}:other` },
    packVersion: "0.2.0",
    contentIdentity: "different-content-identity",
  };
  const expectedContext = createOperationContext();
  const actualContext = {
    ...expectedContext,
    operationVersion: "0.2.0",
    geometryModelVersion: "geometry-v2",
    coordinatePolicy: {
      ...expectedContext.coordinatePolicy,
      value: { ...expectedContext.coordinatePolicy.value, id: "coordinate:other" },
    },
    metricPolicy: {
      ...expectedContext.metricPolicy,
      value: { ...metricPolicy, id: "metric:other" },
    },
    tolerancePolicy: {
      ...expectedContext.tolerancePolicy,
      value: { ...tolerancePolicy, id: "tolerance:other" },
    },
  };
  const artifact = {
    kind: "artifact",
    id: "artifact:structured-result:test",
    artifactType: "structured-result",
    status: "stale",
    sourceRefs,
    provenance: null,
    warnings: [],
    errors: [],
    outputRefs: [{ kind: "artifact", ref: "artifact:structured-result:test" }],
    runRef: { id: "run:test" },
    options: { kind: "artifact-generation-options", id: "test", artifactType: "structured-result" },
    derived: true,
  };

  const result = core.compareRunContext({
    expectedPackLock,
    actualPackLock,
    expectedOperationContext: expectedContext,
    actualOperationContext: actualContext,
    expectedFeatureFlags: { alpha: true },
    actualFeatureFlags: { alpha: false },
    artifact,
    expectedSourceRefs: [...sourceRefs, { kind: "source", ref: "missing" }],
    actualSourceRefs: sourceRefs,
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  for (const diagnosticCode of [
    "PackVersionMismatch",
    "PackContentIdentityMismatch",
    "OperationVersionMismatch",
    "GeometryModelVersionMismatch",
    "TolerancePolicyMismatch",
    "CoordinatePolicyMismatch",
    "MetricPolicyMismatch",
    "FeatureFlagsMismatch",
    "ArtifactStale",
    "MissingSource",
  ]) {
    assert.ok(diagnosticCodes(result).includes(diagnosticCode), diagnosticCode);
  }
  assert.equal(result.output.status, "mismatch");
});

test("PR11 compareRunContext detects feature flag mismatches from OperationContext objects", () => {
  const expectedContext = createOperationContext({ featureFlags: { alpha: true } });
  const actualContext = createOperationContext({ featureFlags: { alpha: false } });
  const result = core.compareRunContext({
    expectedOperationContext: expectedContext,
    actualOperationContext: actualContext,
  });

  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.ok(diagnosticCodes(result).includes("FeatureFlagsMismatch"), diagnosticCodes(result).join(", "));
  assert.equal(result.output.status, "mismatch");
});

test("PR11 derives replay-readiness from dependencies and mismatches", () => {
  const run = createRunEnvelope();
  const ready = core.validateRunReadiness({ run });
  assertOk(ready);
  assert.equal(ready.output, "ready");

  const mismatch = core.validateRunReadiness({
    run,
    comparison: {
      kind: "run-context-comparison",
      status: "mismatch",
      warnings: [core.createCoreWarning({ code: "OperationVersionMismatch", message: "Mismatch." })],
      errors: [],
      mismatchCodes: ["OperationVersionMismatch"],
    },
  });
  assertOk(mismatch);
  assert.equal(mismatch.output, "mismatch");

  const nonReplayable = core.validateRunReadiness({
    run,
    artifact: { status: "non_replayable" },
  });
  assertOk(nonReplayable);
  assert.equal(nonReplayable.output, "non_replayable");

  const nonReplayableMismatch = core.validateRunReadiness({
    run,
    artifact: { status: "non_replayable" },
    comparison: {
      kind: "run-context-comparison",
      status: "mismatch",
      warnings: [core.createCoreWarning({ code: "OperationVersionMismatch", message: "Mismatch." })],
      errors: [],
      mismatchCodes: ["OperationVersionMismatch"],
    },
  });
  assertOk(nonReplayableMismatch);
  assert.equal(nonReplayableMismatch.output, "non_replayable");
});

test("PR11 validateRunReadiness rejects malformed run wrappers without throwing", () => {
  assert.doesNotThrow(() => {
    const result = core.validateRunReadiness({ run: { kind: "run", id: "broken" } });

    assertStructuredResult(result);
    assert.equal(result.status, "failed");
    assert.ok(diagnosticCodes(result).includes("MissingRun"), diagnosticCodes(result).join(", "));
    assert.equal(result.output, "non_replayable");
  });
});

test("PR11 rejects incomplete RunInput and RunOutput dependencies", () => {
  const packLock = createPackLock();
  const operationContext = createOperationContext();

  assertFailedWithDiagnostic(
    core.createRunInput({
      inputRefs: sourceRefs,
      sourceRefs: [],
      packLockRef: packLock.ref,
      operationContextRef: operationContext.ref,
      requestedOutputRefs: outputRefs,
      operationContext,
    }),
    "MissingSource",
  );
  assertFailedWithDiagnostic(
    core.createRunOutput({
      runRef: { id: "run:missing-output-refs" },
      packLockRef: packLock.ref,
      operationContextRef: operationContext.ref,
      outputRefs: [],
    }),
    "MissingOutputRefs",
  );
});
