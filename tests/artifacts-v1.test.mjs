import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  ARTIFACT_V1_SCHEMA_VERSION,
  ARTIFACT_V1_STATUSES,
  ARTIFACT_V1_TYPES,
  BASIC_PROPORTIONS_PACK,
  COMPARISON_POLICY_V1_SCHEMA_VERSION,
  CORE_VERSION,
  EVALUATION_PROFILE_V1_SCHEMA_VERSION,
  MEASUREMENT_RESULT_V1_SCHEMA_VERSION,
  STRUCTURED_EXPLANATION_V1_SCHEMA_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  compareCompositionsBasicV1,
  createConstructionSummaryArtifactV1,
  createEvaluationReportArtifactV1,
  createExplanationArtifactV1,
  createSimpleVisualArtifactV1,
  createStructuredResultArtifactV1,
  evaluateCompositionBasicV1,
  generateConstructionV1,
  measureGeometryV1,
  resolveRuleSetV1,
  validateArtifactV1,
  validateComparisonV1,
  validateDecisionV1,
  validateEvaluationV1,
  validateMeasurementResultV1,
  validateStructuredExplanationV1,
} from "../dist/src/index.js";

const EPSILON = 1e-9;
const EVALUATION_OPERATION_VERSION = "0.1.0";
const COMPARISON_OPERATION_VERSION = "0.1.0";
const PACK_REF = "norma.basic-proportions@0.1.0";
const PROFILE_REF = "evaluation-profile:basic-grid-alignment";
const POLICY_REF = "comparison-policy:basic-score-delta";
const RUN_REF = { id: "run:pr10-artifacts-fixture" };

const normalizedCoordinateSystem2d = {
  kind: "coordinate-system",
  id: "norma-canonical-2d-normalized",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "normalized",
};

const tolerancePolicy = {
  kind: "tolerance-policy",
  id: "exact-geometry",
  coordinateTolerance: 0,
  metricTolerance: 0,
};

const measurementMetricPolicy = {
  kind: "measurement-metric-policy",
  id: "surface-1200x800-px",
  surfaceRef: "surface:unit",
  width: 1200,
  height: 800,
  unit: "px",
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
  const diagnostics = [...result.errors, ...result.warnings]
    .map((diagnostic) => `${diagnostic.code}:${diagnostic.targetRef}:${diagnostic.message}`)
    .join(", ");
  assert.equal(result.status, "ok", diagnostics);
  assert.equal(result.errors.length, 0, diagnostics);
  assert.ok(result.output);
}

function assertFailedWithDiagnostic(result, diagnosticCode) {
  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes(diagnosticCode), diagnosticCodes(result).join(", "));
  assert.equal(result.output, null);
}

function assertClose(actual, expected, epsilon = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function canonicalSurface(overrides = {}) {
  return {
    kind: "surface-space",
    id: "surface:unit",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
    ...overrides,
  };
}

function compositionA(overrides = {}) {
  return {
    kind: "composition-2d",
    id: "composition:A",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    surface: canonicalSurface(),
    elements: [
      { kind: "element", id: "element:header", geometry: { kind: "rect", x: 0, y: 2 / 3, width: 1, height: 1 / 3 } },
      { kind: "element", id: "element:side", geometry: { kind: "rect", x: 0, y: 1 / 3, width: 1 / 3, height: 1 / 3 } },
      { kind: "element", id: "element:main", geometry: { kind: "rect", x: 1 / 3, y: 1 / 3, width: 2 / 3, height: 1 / 3 } },
      { kind: "element", id: "element:footer", geometry: { kind: "rect", x: 0, y: 0, width: 1, height: 1 / 3 } },
    ],
    ...overrides,
  };
}

function compositionB() {
  return {
    kind: "composition-2d",
    id: "composition:B",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    surface: canonicalSurface(),
    elements: [
      { kind: "element", id: "element:header", geometry: { kind: "rect", x: 0.04, y: 0.62, width: 0.92, height: 0.29 } },
      { kind: "element", id: "element:side", geometry: { kind: "rect", x: 0.03, y: 0.29, width: 0.31, height: 0.34 } },
      { kind: "element", id: "element:main", geometry: { kind: "rect", x: 0.38, y: 0.30, width: 0.57, height: 0.35 } },
      { kind: "element", id: "element:footer", geometry: { kind: "rect", x: 0.02, y: 0.02, width: 0.95, height: 0.26 } },
    ],
  };
}

function canonicalConstruction(surface = canonicalSurface()) {
  const resolution = resolveRuleSetV1(BASIC_PROPORTIONS_PACK, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assertOk(resolution);
  const construction = generateConstructionV1(surface, resolution.output);
  assertOk(construction);
  return structuredClone(construction.output);
}

function guideRef(construction, orientation, position) {
  const guide = construction.guides.find((candidate) => (
    candidate.orientation === orientation && Math.abs(candidate.position - position) <= EPSILON
  ));
  assert.ok(guide, `${orientation} guide at ${position} missing`);
  return guide.guideRef;
}

function evaluationRequests(construction) {
  const verticalThird = guideRef(construction, "vertical", 1 / 3);
  return [
    {
      kind: "measurement-request",
      requestRef: "distance:main-left-third",
      measurementType: "distance",
      sourceRef: "element:main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "horizontal",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "alignment:main-left-third",
      measurementType: "alignment",
      sourceRef: "element:main",
      targetRef: verticalThird,
      sourceAnchor: "left",
      targetAnchor: "guide",
      axis: "x",
      tolerance: { kind: "measurement-tolerance", id: "profile-source", value: 0.01 },
    },
    {
      kind: "measurement-request",
      requestRef: "containment:header-surface",
      measurementType: "containment",
      childRef: "element:header",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "overlap:side-main",
      measurementType: "overlap",
      sourceRef: "element:side",
      targetRef: "element:main",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "coverage:composition",
      measurementType: "coverage",
      targetRef: "surface:unit",
      contributorRefs: ["element:main", "element:footer", "element:side", "element:header"],
      metric: "both",
      coveragePolicy: "union-clipped",
    },
    {
      kind: "measurement-request",
      requestRef: "ratio:side-main",
      measurementType: "ratio",
      numeratorRef: "element:side",
      denominatorRef: "element:main",
      ratioKind: "area",
      targetRatio: { kind: "ratio-target", targetRef: "target:half", value: 0.5 },
    },
  ];
}

function measurementInput(composition = compositionA(), overrides = {}) {
  const construction = canonicalConstruction();
  return {
    kind: "measurement-input",
    schemaVersion: "measurement-input-v1",
    measurementResultRef: `measurement-result:${composition.id.split(":").at(-1)}`,
    surface: canonicalSurface(),
    construction,
    composition,
    metricPolicy: measurementMetricPolicy,
    geometryRefs: [],
    requests: evaluationRequests(construction),
    ...overrides,
  };
}

function runMeasurements(composition = compositionA(), overrides = {}) {
  const result = measureGeometryV1(measurementInput(composition, overrides));
  assertOk(result);
  assert.equal(result.output.schemaVersion, MEASUREMENT_RESULT_V1_SCHEMA_VERSION);
  assertOk(validateMeasurementResultV1(structuredClone(result.output)));
  return result.output;
}

function measurementRef(measurementResult, requestRef) {
  const measurement = measurementResult.measurements.find((candidate) => candidate.requestRef === requestRef);
  assert.ok(measurement, `measurement missing: ${requestRef}`);
  return measurement.measurementRef;
}

function profileProvenance(profileRef = PROFILE_REF) {
  return {
    operationName: "core.evaluation-profile-v1.fixture",
    operationVersion: EVALUATION_OPERATION_VERSION,
    inputRefs: [{ kind: "evaluation-profile", ref: profileRef }],
    source: { kind: "test-fixture", ref: "tests/artifacts-v1.test.mjs" },
  };
}

function profileWithComponents(measurementResult, components, overrides = {}) {
  const profileRef = overrides.profileRef ?? PROFILE_REF;
  return {
    kind: "evaluation-profile",
    schemaVersion: EVALUATION_PROFILE_V1_SCHEMA_VERSION,
    profileRef,
    version: "0.1.0",
    packRef: PACK_REF,
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    weightPolicy: { kind: "evaluation-weight-policy", normalization: "normalize-total-positive" },
    missingMeasurementPolicy: {
      kind: "missing-measurement-policy",
      required: "fail",
      optional: "renormalize_remaining",
    },
    statusThresholds: {
      kind: "evaluation-status-thresholds",
      match: 0.9,
      nearMatch: 0.75,
      weakMatch: 0.5,
      minimumConfidenceForNormalStatus: 0.4,
    },
    confidencePolicy: {
      kind: "evaluation-confidence-policy",
      highThreshold: 0.8,
      mediumThreshold: 0.5,
      optionalMissingPenalty: 0.15,
      ambiguousMeasurementPenalty: 0.2,
      warningPenalty: 0.05,
    },
    limits: {
      kind: "evaluation-profile-limits",
      scoreMin: 0,
      scoreMax: 1,
      minComponents: 1,
    },
    components,
    sourceRefs: [{ kind: "evaluation-profile", ref: profileRef }],
    provenance: profileProvenance(profileRef),
    ...overrides,
  };
}

function componentDefinition(measurementResult, overrides = {}) {
  return {
    kind: "evaluation-component-definition",
    componentRef: "component:guide-proximity",
    componentType: "guide_proximity",
    measurementType: "distance",
    measurementRefs: [measurementRef(measurementResult, "distance:main-left-third")],
    scoring: {
      kind: "linear-distance-tolerance",
      distanceBasis: "normalizedDistance",
      targetDistance: 0,
      tolerance: 0.05,
    },
    weight: 1,
    required: true,
    ambiguousMeasurementPolicy: "include_with_confidence_penalty",
    sourceRefs: [{ kind: "evaluation-component", ref: "component:guide-proximity" }],
    ...overrides,
  };
}

function basicProfile(measurementResult, overrides = {}) {
  const components = [
    componentDefinition(measurementResult, {
      componentRef: "component:guide-proximity",
      componentType: "guide_proximity",
      measurementType: "distance",
      measurementRefs: [measurementRef(measurementResult, "distance:main-left-third")],
      scoring: { kind: "linear-distance-tolerance", distanceBasis: "normalizedDistance", targetDistance: 0, tolerance: 0.05 },
      weight: 0.30,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:guide-proximity" }],
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:alignment",
      componentType: "alignment",
      measurementType: "alignment",
      measurementRefs: [measurementRef(measurementResult, "alignment:main-left-third")],
      scoring: { kind: "linear-alignment-tolerance", deltaBasis: "normalizedDelta", targetDelta: 0, tolerance: 0.05 },
      weight: 0.25,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:alignment" }],
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:containment",
      componentType: "containment",
      measurementType: "containment",
      measurementRefs: [measurementRef(measurementResult, "containment:header-surface")],
      scoring: {
        kind: "containment-status-map",
        statusScores: { inside: 1, on_boundary: 0.95, partially_outside: 0.25, outside: 0 },
      },
      weight: 0.15,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:containment" }],
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:overlap-penalty",
      componentType: "overlap_penalty",
      measurementType: "overlap",
      measurementRefs: [measurementRef(measurementResult, "overlap:side-main")],
      scoring: { kind: "overlap-linear-penalty", overlapBasis: "maxOverlapRatio", tolerance: 1 },
      weight: 0.15,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:overlap-penalty" }],
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:coverage-match",
      componentType: "coverage_match",
      measurementType: "coverage",
      measurementRefs: [measurementRef(measurementResult, "coverage:composition")],
      scoring: { kind: "target-closeness", valueBasis: "coverageRatio", target: 1, tolerance: 0.25 },
      weight: 0.10,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:coverage-match" }],
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:area-ratio-match",
      componentType: "area_ratio_match",
      measurementType: "ratio",
      measurementRefs: [measurementRef(measurementResult, "ratio:side-main")],
      scoring: { kind: "ratio-target-closeness", deltaBasis: "absoluteDelta", targetRatio: 0.5, tolerance: 0.1 },
      weight: 0.05,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:area-ratio-match" }],
    }),
  ];
  return profileWithComponents(measurementResult, components, overrides);
}

function evaluationInput(measurementResult, profile, overrides = {}) {
  const compositionRef = overrides.compositionRef ?? "composition:A";
  return {
    kind: "evaluation-input",
    schemaVersion: "evaluation-input-v1",
    compositionRef,
    constructionRef: "construction:surface:unit:norma.basic-proportions@0.1.0:surface-basic-third-grid",
    measurementResult,
    profile,
    packRef: profile.packRef,
    ruleSetRef: profile.ruleSetRef,
    operationVersion: EVALUATION_OPERATION_VERSION,
    sourceRefs: [
      { kind: "composition", ref: compositionRef },
      { kind: "measurement-result", ref: measurementResult.measurementResultRef },
      { kind: "evaluation-profile", ref: profile.profileRef },
    ],
    ...overrides,
  };
}

function evaluate(measurementResult, profile, overrides = {}) {
  const result = evaluateCompositionBasicV1(evaluationInput(measurementResult, profile, overrides));
  assertOk(result);
  assertOk(validateEvaluationV1(structuredClone(result.output)));
  return result.output;
}

function policy(overrides = {}) {
  return {
    kind: "comparison-policy",
    schemaVersion: COMPARISON_POLICY_V1_SCHEMA_VERSION,
    policyRef: POLICY_REF,
    tieTolerance: 0.0001,
    minimumConfidence: 0.4,
    ambiguousEvaluationPolicy: "do_not_select",
    sourceRefs: [{ kind: "comparison-policy", ref: POLICY_REF }],
    provenance: {
      operationName: "core.comparison-policy-v1.fixture",
      operationVersion: COMPARISON_OPERATION_VERSION,
      inputRefs: [{ kind: "comparison-policy", ref: POLICY_REF }],
      source: { kind: "test-fixture", ref: "tests/artifacts-v1.test.mjs" },
    },
    ...overrides,
  };
}

function comparisonInput(evaluationA, evaluationB, comparisonPolicy = policy(), overrides = {}) {
  return {
    kind: "comparison-input",
    schemaVersion: "comparison-input-v1",
    evaluationA,
    evaluationB,
    policy: comparisonPolicy,
    operationVersion: COMPARISON_OPERATION_VERSION,
    sourceRefs: [
      { kind: "evaluation", ref: evaluationA.evaluationRef },
      { kind: "evaluation", ref: evaluationB.evaluationRef },
      { kind: "comparison-policy", ref: comparisonPolicy.policyRef },
    ],
    ...overrides,
  };
}

function compare(evaluationA, evaluationB, comparisonPolicy = policy(), overrides = {}) {
  const result = compareCompositionsBasicV1(comparisonInput(evaluationA, evaluationB, comparisonPolicy, overrides));
  assertOk(result);
  assertOk(validateComparisonV1(structuredClone(result.output.comparison)));
  assertOk(validateDecisionV1(structuredClone(result.output.decision), result.output.comparison));
  assertOk(validateStructuredExplanationV1(
    structuredClone(result.output.structuredExplanation),
    result.output.comparison,
    result.output.decision,
  ));
  return result.output;
}

function canonicalSources(overrides = {}) {
  const surface = canonicalSurface();
  const construction = canonicalConstruction(surface);
  const compositionForA = compositionA();
  const compositionForB = compositionB();
  const measurementResultA = runMeasurements(compositionForA);
  const measurementResultB = runMeasurements(compositionForB);
  const evaluationA = evaluate(measurementResultA, basicProfile(measurementResultA), { compositionRef: "composition:A" });
  const evaluationB = evaluate(measurementResultB, basicProfile(measurementResultB), { compositionRef: "composition:B" });
  const comparisonOutput = compare(evaluationA, evaluationB);

  return {
    kind: "artifact-source-bundle",
    schemaVersion: "artifact-source-bundle-v1",
    surface,
    construction,
    compositionA: compositionForA,
    compositionB: compositionForB,
    measurementResultA,
    measurementResultB,
    evaluationA,
    evaluationB,
    comparison: comparisonOutput.comparison,
    decision: comparisonOutput.decision,
    structuredExplanation: comparisonOutput.structuredExplanation,
    ...overrides,
  };
}

function structuredOptions(overrides = {}) {
  return {
    kind: "artifact-options",
    artifactType: "structured-result",
    includeConstruction: true,
    includeMeasurements: true,
    includeEvaluation: true,
    includeComparison: true,
    includeDecision: true,
    includeExplanation: true,
    includeWarnings: true,
    includeProvenance: true,
    ...overrides,
  };
}

function summaryOptions(overrides = {}) {
  return {
    kind: "artifact-options",
    artifactType: "construction-summary",
    includeTraceSummary: true,
    includeWarnings: true,
    ...overrides,
  };
}

function reportOptions(overrides = {}) {
  return {
    kind: "artifact-options",
    artifactType: "evaluation-report",
    includeComparison: true,
    includeDecision: true,
    includeExplanation: true,
    includeHumanSummary: true,
    includeWarnings: true,
    includeLimits: true,
    ...overrides,
  };
}

function explanationOptions(overrides = {}) {
  return {
    kind: "artifact-options",
    artifactType: "explanation",
    includeStructuredSource: true,
    includeHumanSummary: true,
    includeWarnings: true,
    includeLimits: true,
    ...overrides,
  };
}

function visualOptions(overrides = {}) {
  return {
    kind: "artifact-options",
    artifactType: "simple-visual",
    format: "svg",
    mediaType: "image/svg+xml",
    viewportWidth: 300,
    viewportHeight: 200,
    padding: 10,
    includeSurface: true,
    includeZones: true,
    includeGridCells: true,
    includeGuides: true,
    includeIntersections: true,
    includeElements: true,
    includeLabels: true,
    includeWarnings: true,
    coordinatePrecision: 3,
    styleVersion: "simple-v1",
    ...overrides,
  };
}

function createStructured(sources = canonicalSources(), overrides = {}) {
  return createStructuredResultArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: structuredOptions(overrides.options),
    runRef: overrides.runRef === undefined ? RUN_REF : overrides.runRef,
    staleEvidence: overrides.staleEvidence,
  });
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function lossCodes(artifact) {
  return artifact.losses.map((loss) => loss.code);
}

function warningCodes(artifact) {
  return artifact.warnings.map((warning) => warning.code);
}

test("PR10 Artifacts V1 remains projection-only after PR11 exports run envelopes", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr12");
  assert.equal(ARTIFACT_V1_SCHEMA_VERSION, "artifact-v1");
  assert.deepEqual(ARTIFACT_V1_STATUSES, ["current", "lossy", "stale", "non_replayable"]);
  assert.deepEqual(ARTIFACT_V1_TYPES, [
    "structured-result",
    "construction-summary",
    "evaluation-report",
    "explanation",
    "simple-visual",
  ]);

  for (const exported of [
    createStructuredResultArtifactV1,
    createConstructionSummaryArtifactV1,
    createEvaluationReportArtifactV1,
    createExplanationArtifactV1,
    createSimpleVisualArtifactV1,
    validateArtifactV1,
  ]) {
    assert.equal(typeof exported, "function");
  }

  for (const code of [
    "InvalidArtifactV1",
    "MissingArtifactSource",
    "ArtifactSourceMismatch",
    "ArtifactWouldBecomeSourceOfTruth",
    "UnsupportedArtifactOption",
  ]) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(code), code);
  }

  for (const forbiddenExport of [
    "replayArtifactV1",
    "replayRun",
    "replayRunV1",
    "verifyRun",
    "verifyRunV1",
    "verifyArtifactFreshness",
    "verifyArtifactFreshnessV1",
    "exportArtifactPngV1",
    "exportArtifactPdfV1",
    "exportArtifactCsvV1",
    "renderInteractiveArtifactV1",
  ]) {
    assert.equal(forbiddenExport in core, false, `${forbiddenExport} must remain out of Norma Core scope`);
  }
});

test("StructuredResultArtifactV1 copies requested PR6-PR9 sources deterministically", () => {
  const sources = canonicalSources();
  const first = createStructured(sources);
  const second = createStructured(structuredClone(sources));
  assertOk(first);
  assertOk(second);
  assert.deepEqual(first.output, second.output);

  const artifact = first.output;
  assert.equal(artifact.kind, "artifact");
  assert.equal(artifact.schemaVersion, "artifact-v1");
  assert.equal(artifact.artifactType, "structured-result");
  assert.equal(artifact.status, "current");
  assert.deepEqual(artifact.runRef, RUN_REF);
  assert.deepEqual(lossCodes(artifact), []);
  assert.deepEqual(warningCodes(artifact), []);
  assert.deepEqual(
    artifact.sourceRefs.map((ref) => `${ref.kind}:${ref.ref}`),
    [
      "geometry:surface:unit",
      `construction:${sources.construction.constructionRef}`,
      "composition:composition:A",
      "composition:composition:B",
      "measurement-result:measurement-result:A",
      "measurement-result:measurement-result:B",
      `evaluation:${sources.evaluationA.evaluationRef}`,
      `evaluation:${sources.evaluationB.evaluationRef}`,
      `comparison:${sources.comparison.comparisonRef}`,
      `decision:${sources.decision.decisionRef}`,
      `structured-explanation:${sources.structuredExplanation.explanationRef}`,
    ],
  );
  assert.equal(artifact.payload.construction.constructionRef, sources.construction.constructionRef);
  assert.deepEqual(artifact.payload.measurementResults.map((result) => result.measurementResultRef), [
    "measurement-result:A",
    "measurement-result:B",
  ]);
  assert.deepEqual(artifact.payload.evaluations.map((evaluation) => evaluation.evaluationRef), [
    sources.evaluationA.evaluationRef,
    sources.evaluationB.evaluationRef,
  ]);
  assert.equal(artifact.payload.comparison.comparisonRef, sources.comparison.comparisonRef);
  assert.equal(artifact.payload.decision.decisionRef, sources.decision.decisionRef);
  assert.equal(artifact.payload.structuredExplanation.explanationRef, sources.structuredExplanation.explanationRef);
  assertOk(validateArtifactV1(structuredClone(artifact), sources));

  const sourceBefore = JSON.stringify(sources);
  artifact.payload.construction.guides[0].position = 0.123;
  assert.equal(JSON.stringify(sources), sourceBefore);
});

test("StructuredResultArtifactV1 declares omissions and non-replayability", () => {
  const sources = canonicalSources();
  const lossy = createStructured(sources, {
    options: {
      includeMeasurements: false,
      includeExplanation: false,
      includeWarnings: false,
      includeProvenance: false,
    },
  });
  assertOk(lossy);
  assert.equal(lossy.output.status, "lossy");
  assert.ok(lossCodes(lossy.output).includes("OmittedSourceObject"));
  assert.equal(lossy.output.payload.measurementResults.length, 0);
  assert.equal(lossy.output.payload.structuredExplanation, null);

  const noRun = createStructured(sources, { runRef: null });
  assertOk(noRun);
  assert.equal(noRun.output.status, "non_replayable");
  assert.ok(warningCodes(noRun.output).includes("MissingRunRef"));
  assert.ok(lossCodes(noRun.output).includes("NonReplayableProjection"));
});

test("ConstructionSummaryArtifactV1 derives counts and refs from ConstructionV1 only", () => {
  const sources = canonicalSources();
  const result = createConstructionSummaryArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: summaryOptions(),
    runRef: RUN_REF,
  });
  assertOk(result);
  const artifact = result.output;
  assert.equal(artifact.artifactType, "construction-summary");
  assert.equal(artifact.status, "lossy");
  assert.ok(lossCodes(artifact).includes("SummaryProjection"));
  assert.equal(artifact.payload.constructionRef, sources.construction.constructionRef);
  assert.equal(artifact.payload.guideCount, sources.construction.guides.length);
  assert.equal(artifact.payload.zoneCount, sources.construction.zones.length);
  assert.equal(artifact.payload.gridCount, sources.construction.grids.length);
  assert.equal(artifact.payload.cellCount, sources.construction.grids[0].cells.length);
  assert.equal(artifact.payload.intersectionCount, sources.construction.intersections.length);
  assert.deepEqual(artifact.payload.appliedRuleRefs, sources.construction.appliedRuleRefs);
  assertOk(validateArtifactV1(structuredClone(artifact), sources));

  const forged = structuredClone(artifact);
  forged.payload.guideCount += 1;
  assertFailedWithDiagnostic(validateArtifactV1(forged, sources), "InvalidArtifactV1");
});

test("EvaluationReportArtifactV1 preserves scores, decision, and source-backed language", () => {
  const sources = canonicalSources();
  const result = createEvaluationReportArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: reportOptions(),
    runRef: RUN_REF,
  });
  assertOk(result);
  const artifact = result.output;
  assert.equal(artifact.artifactType, "evaluation-report");
  assert.equal(artifact.status, "lossy");
  assert.equal(artifact.payload.evaluation.evaluationRef, sources.evaluationA.evaluationRef);
  assertClose(artifact.payload.evaluation.overallScore, sources.evaluationA.score.overallScore);
  assertClose(artifact.payload.evaluation.confidence, sources.evaluationA.confidence.value);
  assert.equal(artifact.payload.comparison.status, sources.comparison.status);
  assert.equal(artifact.payload.decision.status, sources.decision.status);
  assert.equal(artifact.payload.structuredExplanation.claimCode, sources.structuredExplanation.claimCode);
  assert.equal(artifact.payload.humanSummary.includes("closer to the declared system"), true);
  for (const forbidden of ["better", "best", "beautiful", "winner", "recommended", "authorIntent", "optimize"]) {
    assert.equal(JSON.stringify(artifact).toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
  }
  assertOk(validateArtifactV1(structuredClone(artifact), sources));

  const forgedScore = structuredClone(artifact);
  forgedScore.payload.evaluation.overallScore = 0;
  assertFailedWithDiagnostic(validateArtifactV1(forgedScore, sources), "InvalidArtifactV1");
});

test("ExplanationArtifactV1 wraps StructuredExplanationV1 without inventing claims", () => {
  const sources = canonicalSources();
  const result = createExplanationArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: explanationOptions(),
    runRef: RUN_REF,
  });
  assertOk(result);
  const artifact = result.output;
  assert.equal(artifact.artifactType, "explanation");
  assert.equal(artifact.status, "current");
  assert.equal(artifact.payload.explanationRef, sources.structuredExplanation.explanationRef);
  assert.equal(artifact.payload.claimCode, sources.structuredExplanation.claimCode);
  assert.deepEqual(artifact.payload.facts, sources.structuredExplanation.facts);
  assert.equal(artifact.payload.summary, sources.structuredExplanation.summary);
  assertOk(validateArtifactV1(structuredClone(artifact), sources));

  const humanOnly = createExplanationArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: explanationOptions({ includeStructuredSource: false }),
    runRef: RUN_REF,
  });
  assertOk(humanOnly);
  assert.equal(humanOnly.output.status, "lossy");
  assert.ok(lossCodes(humanOnly.output).includes("SummaryProjection"));

  const forged = structuredClone(artifact);
  forged.payload.claimCode = "B_CLOSER_TO_DECLARED_SYSTEM";
  assertFailedWithDiagnostic(validateArtifactV1(forged, sources), "InvalidArtifactV1");
});

test("SimpleVisualArtifactV1 produces deterministic safe SVG with Norma-to-SVG mapping", () => {
  const sources = canonicalSources({
    compositionA: compositionA({
      elements: [
        { kind: "element", id: "label:<unsafe>&\"", geometry: { kind: "rect", x: 0.25, y: 0.25, width: 0.25, height: 0.25 } },
      ],
    }),
  });
  const result = createSimpleVisualArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: visualOptions(),
    runRef: RUN_REF,
  });
  const repeated = createSimpleVisualArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources: structuredClone(sources),
    options: visualOptions(),
    runRef: RUN_REF,
  });
  assertOk(result);
  assertOk(repeated);
  assert.deepEqual(result.output, repeated.output);

  const artifact = result.output;
  assert.equal(artifact.artifactType, "simple-visual");
  assert.equal(artifact.status, "lossy");
  assert.equal(artifact.payload.format, "svg");
  assert.equal(artifact.payload.mediaType, "image/svg+xml");
  assert.equal(artifact.payload.coordinateMapping.normalizedPoint, "svgX=padding+x*drawableWidth;svgY=padding+(1-y)*drawableHeight");
  assert.equal(artifact.payload.coordinateMapping.normalizedRect, "svgX=padding+x*drawableWidth;svgY=padding+(1-y-height)*drawableHeight");
  assert.ok(lossCodes(artifact).includes("VisualOnlyArtifact"));
  assert.ok(warningCodes(artifact).includes("RoundedCoordinates"));
  assert.match(artifact.payload.svg, /^<svg /);
  assert.match(artifact.payload.svg, /<rect data-kind="surface" height="180" width="280" x="10" y="10" \/>/);
  assert.match(artifact.payload.svg, /<rect data-ref="label:&lt;unsafe&gt;&amp;&quot;" height="45" width="70" x="80" y="100" \/>/);
  assert.match(artifact.payload.svg, /label:&lt;unsafe&gt;&amp;&quot;/);
  assert.doesNotMatch(artifact.payload.svg, /<script|onload=|onclick=|foreignObject|href=/);
  assertOk(validateArtifactV1(structuredClone(artifact), sources));

  const noRun = createSimpleVisualArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: visualOptions(),
  });
  assertOk(noRun);
  assert.equal(noRun.output.status, "non_replayable");
  assert.ok(lossCodes(noRun.output).includes("VisualOnlyArtifact"));
});

test("Artifacts reject source-of-truth misuse, mismatched source chains, bad options, and closed-shape violations", () => {
  const sources = canonicalSources();
  const structured = createStructured(sources);
  assertOk(structured);

  assertFailedWithDiagnostic(
    createStructuredResultArtifactV1({
      kind: "artifact-request",
      schemaVersion: "artifact-request-v1",
      sources: { kind: "artifact-source-bundle", schemaVersion: "artifact-source-bundle-v1", construction: structured.output },
      options: structuredOptions(),
      runRef: RUN_REF,
    }),
    "ArtifactWouldBecomeSourceOfTruth",
  );
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...structured.output,
      sourceRefs: [...structured.output.sourceRefs, { kind: "artifact", ref: "artifact:nested" }],
    }),
    "ArtifactWouldBecomeSourceOfTruth",
  );

  const wrongDecisionSources = {
    ...sources,
    decision: { ...sources.decision, comparisonRef: "comparison:other" },
  };
  assertFailedWithDiagnostic(
    createEvaluationReportArtifactV1({
      kind: "artifact-request",
      schemaVersion: "artifact-request-v1",
      sources: wrongDecisionSources,
      options: reportOptions(),
      runRef: RUN_REF,
    }),
    "ArtifactSourceMismatch",
  );

  const unrelatedEvaluation = evaluate(
    sources.measurementResultA,
    basicProfile(sources.measurementResultA, { profileRef: "evaluation-profile:other" }),
    { compositionRef: "composition:A" },
  );
  assert.notEqual(unrelatedEvaluation.evaluationRef, sources.evaluationA.evaluationRef);
  assertFailedWithDiagnostic(
    createEvaluationReportArtifactV1({
      kind: "artifact-request",
      schemaVersion: "artifact-request-v1",
      sources: { ...sources, evaluation: unrelatedEvaluation },
      options: reportOptions(),
      runRef: RUN_REF,
    }),
    "ArtifactSourceMismatch",
  );

  assertFailedWithDiagnostic(
    createStructuredResultArtifactV1({
      kind: "artifact-request",
      schemaVersion: "artifact-request-v1",
      sources,
      options: structuredOptions({ arbitraryCss: "body{display:none}" }),
      runRef: RUN_REF,
    }),
    "UnsupportedArtifactOption",
  );

  assertFailedWithDiagnostic(
    createSimpleVisualArtifactV1({
      kind: "artifact-request",
      schemaVersion: "artifact-request-v1",
      sources,
      options: visualOptions({ coordinatePrecision: 12 }),
      runRef: RUN_REF,
    }),
    "UnsupportedArtifactOption",
  );

  assertFailedWithDiagnostic(
    validateArtifactV1({ ...structured.output, extra: true }),
    "InvalidArtifactV1",
  );
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...structured.output,
      payload: {
        ...structured.output.payload,
        construction: { kind: "construction", schemaVersion: "construction-v1" },
      },
    }),
    "InvalidArtifactV1",
  );

  const report = createEvaluationReportArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: reportOptions(),
    runRef: RUN_REF,
  });
  assertOk(report);
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...report.output,
      payload: {
        ...report.output.payload,
        evaluation: { kind: "forged-evaluation-report-evaluation", evaluationRef: sources.evaluationA.evaluationRef },
      },
    }),
    "InvalidArtifactV1",
  );
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...report.output,
      payload: {
        ...report.output.payload,
        comparison: { kind: "evaluation-report-comparison", comparisonRef: sources.comparison.comparisonRef },
      },
    }),
    "InvalidArtifactV1",
  );
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...report.output,
      payload: {
        ...report.output.payload,
        decision: { kind: "evaluation-report-decision", decisionRef: sources.decision.decisionRef },
      },
    }),
    "InvalidArtifactV1",
  );
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...report.output,
      payload: {
        ...report.output.payload,
        structuredExplanation: {
          kind: "evaluation-report-structured-explanation",
          explanationRef: sources.structuredExplanation.explanationRef,
        },
      },
    }),
    "InvalidArtifactV1",
  );

  const explanation = createExplanationArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: explanationOptions(),
    runRef: RUN_REF,
  });
  assertOk(explanation);
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...explanation.output,
      payload: {
        ...explanation.output.payload,
        facts: { kind: "structured-explanation-facts" },
      },
    }),
    "InvalidArtifactV1",
  );
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...explanation.output,
      payload: {
        ...explanation.output.payload,
        structuredExplanation: { kind: "structured-explanation", explanationRef: sources.structuredExplanation.explanationRef },
      },
    }),
    "InvalidArtifactV1",
  );

  const visual = createSimpleVisualArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: visualOptions(),
    runRef: RUN_REF,
  });
  assertOk(visual);
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...visual.output,
      payload: {
        ...visual.output.payload,
        coordinateMapping: { kind: "coordinate-mapping" },
      },
    }),
    "InvalidArtifactV1",
  );
  assertFailedWithDiagnostic(
    validateArtifactV1({
      ...visual.output,
      payload: {
        ...visual.output.payload,
        viewport: { kind: "svg-viewport", width: 300, height: 200, padding: 10, drawableWidth: 1, drawableHeight: 180 },
      },
    }),
    "InvalidArtifactV1",
  );
});

test("Artifact statuses enforce precedence, evidence, warnings, provenance, determinism, and immutability", () => {
  const sources = canonicalSources();
  const staleEvidence = {
    kind: "artifact-stale-evidence",
    reason: "Source comparison was superseded in the caller state.",
    sourceRefs: [{ kind: "comparison", ref: sources.comparison.comparisonRef }],
  };
  const stale = createStructured(sources, {
    options: { includeMeasurements: false },
    staleEvidence,
  });
  assertOk(stale);
  assert.equal(stale.output.status, "stale");
  assert.ok(warningCodes(stale.output).includes("StaleArtifact"));
  assert.ok(lossCodes(stale.output).includes("OmittedSourceObject"));
  assertOk(validateArtifactV1(structuredClone(stale.output), sources));

  const staleWithoutEvidence = structuredClone(stale.output);
  staleWithoutEvidence.staleEvidence = null;
  assertFailedWithDiagnostic(validateArtifactV1(staleWithoutEvidence), "InvalidArtifactV1");

  const lossyWithoutLoss = structuredClone(stale.output);
  lossyWithoutLoss.status = "lossy";
  lossyWithoutLoss.losses = [];
  lossyWithoutLoss.staleEvidence = null;
  assertFailedWithDiagnostic(validateArtifactV1(lossyWithoutLoss), "InvalidArtifactV1");

  const frozenSources = deepFreeze(structuredClone(sources));
  const frozenOptions = deepFreeze(structuredOptions());
  const beforeSources = JSON.stringify(frozenSources);
  const beforeOptions = JSON.stringify(frozenOptions);
  const first = createStructuredResultArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources: frozenSources,
    options: frozenOptions,
    runRef: RUN_REF,
  });
  const second = createStructuredResultArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources: structuredClone(sources),
    options: structuredOptions(),
    runRef: RUN_REF,
  });
  assertOk(first);
  assertOk(second);
  assert.deepEqual(first.output, second.output);
  assert.equal(JSON.stringify(frozenSources), beforeSources);
  assert.equal(JSON.stringify(frozenOptions), beforeOptions);
  assert.equal(first.output.provenance.inputRefs.some((ref) => ref.ref === sources.comparison.comparisonRef), true);
  assert.equal(first.output.provenance.inputRefs.some((ref) => ref.ref === RUN_REF.id), true);
});
