import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const artifactDiagnosticCodes = [
  "MissingArtifactSource",
  "MissingArtifactSourceRefs",
  "MissingArtifactProvenance",
  "MissingArtifactOptions",
  "MissingArtifactRunRef",
  "InvalidArtifactInput",
  "UnsupportedArtifactSource",
  "ArtifactWouldBecomeSourceOfTruth",
  "ArtifactInventedSourceData",
  "ArtifactCriticalWarningHidden",
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
  id: "artifact-tolerance-policy",
  coordinateTolerance: 0,
  metricTolerance: 1,
};

const evaluationTolerances = {
  kind: "evaluation-tolerances",
  id: "explicit-evaluation-tolerances",
  guideProximity: 0.1,
  alignment: 0,
  containment: 0,
  overlap: 0.01,
  coverage: 0.02,
  areaRatio: 0.05,
};

const surface1200x800 = {
  kind: "surface-space",
  id: "surface:1200x800",
  coordinateSystem: metricCoordinateSystem2d,
  metricPolicy,
  tolerancePolicy,
  bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
};

const compositionA = {
  kind: "composition-2d",
  id: "composition:A",
  coordinateSystem: metricCoordinateSystem2d,
  metricPolicy,
  tolerancePolicy,
  surface: surface1200x800,
  elements: [
    { kind: "element", id: "left-third", geometry: { kind: "rect", x: 0, y: 0, width: 400, height: 800 } },
    { kind: "element", id: "middle-third", geometry: { kind: "rect", x: 400, y: 0, width: 400, height: 800 } },
    { kind: "element", id: "right-third", geometry: { kind: "rect", x: 800, y: 0, width: 400, height: 800 } },
  ],
};

const compositionB = {
  kind: "composition-2d",
  id: "composition:B",
  coordinateSystem: metricCoordinateSystem2d,
  metricPolicy,
  tolerancePolicy,
  surface: surface1200x800,
  elements: [
    { kind: "element", id: "wide-left", geometry: { kind: "rect", x: 0, y: 0, width: 700, height: 800 } },
    { kind: "element", id: "offset-right", geometry: { kind: "rect", x: 650, y: 0, width: 400, height: 800 } },
  ],
};

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

function resolveMvpRuleSet() {
  const result = core.resolveRuleSet(core.BASIC_PROPORTIONS_PACK, core.SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assertOk(result);
  return result.output;
}

function generateMvpConstruction() {
  const result = core.generateConstruction({
    surface: surface1200x800,
    pack: core.BASIC_PROPORTIONS_PACK,
    resolvedRuleSet: resolveMvpRuleSet(),
    operationContextRef: { id: "context:construction" },
  });
  assertOk(result);
  return result.output;
}

function measureGeometrySet(construction = generateMvpConstruction()) {
  const result = core.measureGeometry({
    construction,
    compositionA,
    compositionB,
    operationContextRef: { id: "context:measurement" },
    requestedOutputs: ["measurements"],
  });
  assertOk(result);
  return result.output;
}

function evaluateComposition(compositionLabel = "A") {
  const result = core.evaluateCompositionBasic({
    measurements: measureGeometrySet(),
    compositionLabel,
    profile: core.BASIC_GRID_ALIGNMENT_PROFILE,
    pack: core.BASIC_PROPORTIONS_PACK,
    packPreLock: core.BASIC_PROPORTIONS_PACK.preLock,
    tolerancePolicy,
    tolerances: evaluationTolerances,
    operationContextRef: { id: "context:evaluation" },
    requestedOutputs: ["evaluation"],
    sourceReferences: [
      { kind: "surface", ref: surface1200x800.id },
      { kind: "coordinate-system", ref: metricCoordinateSystem2d.id },
      { kind: "metric-policy", ref: metricPolicy.id },
      { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
      { kind: "tolerance-policy", ref: tolerancePolicy.id },
      { kind: "operation-context", ref: "context:evaluation" },
    ],
  });
  assertOk(result);
  return result;
}

function compareEvaluations() {
  const result = core.compareCompositionsBasic({
    evaluationA: evaluateComposition("A").output,
    evaluationB: evaluateComposition("B").output,
    tieTolerance: 0.01,
    operationContextRef: { id: "context:evaluation" },
    requestedOutputs: ["comparison", "decision", "explanation"],
  });
  assertOk(result);
  return result;
}

function artifactOptions(artifactType, overrides = {}) {
  return {
    kind: "artifact-generation-options",
    id: `${artifactType}:test`,
    artifactType,
    ...overrides,
  };
}

function assertArtifactGate(artifact, artifactType) {
  assert.equal(artifact.kind, "artifact");
  assert.equal(artifact.artifactType, artifactType);
  assert.equal(artifact.derived, true);
  assert.ok(artifact.id.startsWith(`artifact:${artifactType}:`));
  assert.ok(artifact.sourceRefs.length > 0);
  assert.ok(artifact.provenance);
  assert.ok(artifact.provenance.inputRefs.length > 0);
  assert.ok(Array.isArray(artifact.warnings));
  assert.ok(Array.isArray(artifact.errors));
  assert.ok(artifact.options);
  assert.equal(artifact.options.artifactType, artifactType);
  assert.ok(artifact.outputRefs.some((ref) => ref.kind === "artifact" && ref.ref === artifact.id));
}

test("PR10 exports artifact vocabulary, diagnostics, helpers, and version", () => {
  assert.equal(core.CORE_VERSION, "0.1.0-pr11");
  assert.deepEqual(core.ARTIFACT_TYPES, [
    "structured-result",
    "construction-summary",
    "evaluation-report",
    "explanation",
    "simple-visual",
  ]);
  assert.deepEqual(core.ARTIFACT_STATUSES, ["current", "lossy", "stale", "non_replayable"]);
  for (const diagnosticCode of artifactDiagnosticCodes) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(diagnosticCode), diagnosticCode);
  }
  for (const helper of [
    core.generateStructuredResultArtifact,
    core.generateConstructionSummaryArtifact,
    core.generateEvaluationReportArtifact,
    core.generateExplanationArtifact,
    core.generateSimpleVisualArtifact,
    core.validateArtifact,
  ]) {
    assert.equal(typeof helper, "function");
  }
});

test("PR10 generates structured artifacts from source CoreResult without mutating it", () => {
  const evaluationResult = evaluateComposition("A");
  const sourceBefore = structuredClone(evaluationResult);
  const criticalWarning = core.createCoreWarning({
    code: "MissingArtifactSource",
    severity: "critical",
    message: "Synthetic critical warning must remain visible.",
    blocking: true,
  });
  const sourceResult = {
    ...evaluationResult,
    warnings: [criticalWarning],
  };

  const result = core.generateStructuredResultArtifact({
    result: sourceResult,
    sourceResultRef: { kind: "core-result", ref: "evaluation:A" },
    options: artifactOptions("structured-result"),
    runRef: { id: "run:artifact" },
    operationContextRef: { id: "context:artifact" },
  });

  assertOk(result);
  assert.deepEqual(evaluationResult, sourceBefore);
  assertArtifactGate(result.output, "structured-result");
  assert.equal(result.output.status, "current");
  assert.equal(result.output.resultStatus, evaluationResult.status);
  assert.equal(result.output.resultProvenance.operationName, evaluationResult.provenance.operationName);
  assert.deepEqual(result.output.resultOutputRefs, evaluationResult.outputRefs);
  assert.ok(result.output.warnings.some((warning) => warning.severity === "critical" && warning.blocking));
});

test("PR10 generates construction summary and simple visual descriptors from construction only", () => {
  const construction = generateMvpConstruction();
  const sourceBefore = structuredClone(construction);

  const summary = core.generateConstructionSummaryArtifact({
    construction,
    options: artifactOptions("construction-summary", { lossy: true }),
    runRef: { id: "run:artifact" },
  });
  assertOk(summary);
  assertArtifactGate(summary.output, "construction-summary");
  assert.equal(summary.output.status, "lossy");
  assert.equal(summary.output.sourceConstructionRef.ref, construction.id);
  assert.equal(summary.output.guideCount, construction.guides.length);
  assert.equal(summary.output.zoneCount, construction.zones.length);
  assert.equal(summary.output.gridSummary.cellCount, construction.grid.cells.length);
  assert.equal(summary.output.diagonalCount, construction.diagonals.length);
  assert.equal(summary.output.intersectionCount, construction.intersections.length);

  const visual = core.generateSimpleVisualArtifact({
    construction,
    options: artifactOptions("simple-visual", {
      presentationHints: { strokeWidth: 1, mode: "test-only" },
    }),
    runRef: { id: "run:artifact" },
  });
  assertOk(visual);
  assertArtifactGate(visual.output, "simple-visual");
  assert.equal(visual.output.status, "lossy");
  assert.equal(visual.output.descriptor.kind, "simple-visual-descriptor");
  assert.deepEqual(visual.output.descriptor.viewBox, { x: 0, y: 0, width: 1200, height: 800 });
  assert.equal(visual.output.descriptor.guides.length, construction.guides.length);
  assert.equal(visual.output.descriptor.gridCells.length, construction.grid.cells.length);
  assert.equal(visual.output.descriptor.diagonals.length, construction.diagonals.length);
  assert.equal(visual.output.descriptor.intersections.length, construction.intersections.length);
  assert.equal("svg" in visual.output.descriptor, false);
  assert.equal("presentationHints" in visual.output.descriptor, true);
  assert.deepEqual(construction, sourceBefore);
});

test("PR10 generates evaluation reports and explanation artifacts without recalculation or beauty claims", () => {
  const evaluationResult = evaluateComposition("A");
  const evaluation = evaluationResult.output;
  const report = core.generateEvaluationReportArtifact({
    evaluation,
    options: artifactOptions("evaluation-report", { lossy: true }),
    runRef: { id: "run:artifact" },
  });
  assertOk(report);
  assertArtifactGate(report.output, "evaluation-report");
  assert.equal(report.output.sourceEvaluationRef.ref, evaluation.id);
  assert.equal(report.output.profileRef, evaluation.profileRef);
  assert.equal(report.output.packRef, evaluation.packRef);
  assert.equal(report.output.componentScores.length, evaluation.componentScores.length);
  assert.equal(report.output.score.value, evaluation.score.value);
  assert.equal(report.output.confidence.value, evaluation.confidence.value);
  assert.deepEqual(
    report.output.componentScores.map((score) => score.value),
    evaluation.componentScores.map((score) => score.value),
  );
  assert.equal(JSON.stringify(report.output).toLowerCase().includes("beauty"), false);

  const comparison = compareEvaluations().output;
  const explanation = core.generateExplanationArtifact({
    explanation: comparison.explanation,
    sourceExplanationRef: { kind: "explanation", ref: `explanation:${comparison.id}` },
    options: artifactOptions("explanation", { lossy: true }),
    runRef: { id: "run:artifact" },
  });
  assertOk(explanation);
  assertArtifactGate(explanation.output, "explanation");
  assert.equal(explanation.output.summary, comparison.explanation.summary);
  assert.deepEqual(explanation.output.sourceEvaluationRefs, comparison.explanation.sourceEvaluationRefs);
  assert.deepEqual(explanation.output.sourceMeasurementRefs, comparison.explanation.sourceMeasurementRefs);
  assert.deepEqual(explanation.output.componentDeltas, comparison.explanation.componentDeltas);
});

test("PR10 marks artifacts without runRef as non_replayable instead of hiding it", () => {
  const result = core.generateConstructionSummaryArtifact({
    construction: generateMvpConstruction(),
    options: artifactOptions("construction-summary", { lossy: true }),
    runRef: null,
  });
  assertOk(result);
  assert.equal(result.output.status, "non_replayable");
  assert.equal(result.output.runRef, null);
  assert.ok(diagnosticCodes(result).includes("MissingArtifactRunRef"));
  assert.ok(result.output.warnings.some((warning) => warning.code === "MissingArtifactRunRef" && warning.blocking));
});

test("PR10 marks artifacts stale when expected source refs do not match", () => {
  const result = core.generateStructuredResultArtifact({
    result: evaluateComposition("A"),
    sourceResultRef: { kind: "core-result", ref: "evaluation:A" },
    options: artifactOptions("structured-result", {
      expectedSourceRefs: [{ kind: "core-result", ref: "other-result" }],
    }),
    runRef: { id: "run:artifact" },
  });
  assertOk(result);
  assert.equal(result.output.status, "stale");
  assert.ok(diagnosticCodes(result).includes("InvalidArtifactInput"));
});

test("PR10 rejects missing sources, refs, provenance, options, and artifact-as-source", () => {
  const construction = generateMvpConstruction();
  const summary = core.generateConstructionSummaryArtifact({
    construction,
    options: artifactOptions("construction-summary", { lossy: true }),
    runRef: { id: "run:artifact" },
  });
  assertOk(summary);

  assertFailedWithDiagnostic(core.generateConstructionSummaryArtifact(null), "MissingArtifactSource");
  assertFailedWithDiagnostic(
    core.generateConstructionSummaryArtifact({ construction, runRef: { id: "run:artifact" } }),
    "MissingArtifactOptions",
  );
  assertFailedWithDiagnostic(
    core.generateStructuredResultArtifact({
      result: evaluateComposition("A"),
      options: artifactOptions("structured-result"),
      runRef: { id: "run:artifact" },
    }),
    "MissingArtifactSourceRefs",
  );

  const resultWithoutProvenance = {
    ...evaluateComposition("A"),
    provenance: null,
  };
  assertFailedWithDiagnostic(
    core.generateStructuredResultArtifact({
      result: resultWithoutProvenance,
      sourceResultRef: { kind: "core-result", ref: "evaluation:A" },
      options: artifactOptions("structured-result"),
      runRef: { id: "run:artifact" },
    }),
    "MissingArtifactProvenance",
  );
  assertFailedWithDiagnostic(
    core.generateConstructionSummaryArtifact({
      construction: summary.output,
      options: artifactOptions("construction-summary", { lossy: true }),
      runRef: { id: "run:artifact" },
    }),
    "ArtifactWouldBecomeSourceOfTruth",
  );
  assertFailedWithDiagnostic(
    core.validateArtifact({ ...summary.output, derived: false }),
    "ArtifactWouldBecomeSourceOfTruth",
  );
  assertFailedWithDiagnostic(
    core.validateArtifact({ ...summary.output, sourceRefs: [] }),
    "MissingArtifactSourceRefs",
  );
  assertFailedWithDiagnostic(
    core.validateArtifact({ ...summary.output, options: null }),
    "MissingArtifactOptions",
  );
});

test("PR10 rejects invented source-data fields on artifact projections", () => {
  const summary = core.generateConstructionSummaryArtifact({
    construction: generateMvpConstruction(),
    options: artifactOptions("construction-summary", { lossy: true }),
    runRef: { id: "run:artifact" },
  });
  assertOk(summary);

  assertFailedWithDiagnostic(
    core.validateArtifact({ ...summary.output, measurements: [{ invented: true }] }),
    "ArtifactInventedSourceData",
  );
  assertFailedWithDiagnostic(
    core.validateArtifact({ ...summary.output, score: { value: 1 } }),
    "ArtifactInventedSourceData",
  );

  const evaluationReport = core.generateEvaluationReportArtifact({
    evaluation: evaluateComposition("A").output,
    options: artifactOptions("evaluation-report", { lossy: true }),
    runRef: { id: "run:artifact" },
  });
  assertOk(evaluationReport);
  assertOk(core.validateArtifact(evaluationReport.output));
});
