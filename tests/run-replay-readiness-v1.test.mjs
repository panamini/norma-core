import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  BASIC_PROPORTIONS_PACK,
  COMPARISON_POLICY_V1_SCHEMA_VERSION,
  CORE_VERSION,
  EVALUATION_PROFILE_V1_SCHEMA_VERSION,
  OPERATION_CONTEXT_V1_SCHEMA_VERSION,
  PACK_LOCK_V1_SCHEMA_VERSION,
  REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION,
  REPLAY_READINESS_V1_STATUSES,
  RUN_EXECUTION_STATUSES_V1,
  RUN_IDENTITY_ALGORITHM_V1,
  RUN_INPUT_V1_SCHEMA_VERSION,
  RUN_MISMATCH_KINDS_V1,
  RUN_OUTPUT_V1_SCHEMA_VERSION,
  RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION,
  RUN_V1_SCHEMA_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  assessReplayReadinessV1,
  compareCompositionsBasicV1,
  createConstructionSummaryArtifactV1,
  createCoreError,
  createCoreWarning,
  createEvaluationReportArtifactV1,
  createExplanationArtifactV1,
  createOperationContextV1,
  createPackLockV1,
  createRunInputV1,
  createRunOutputV1,
  createRunV1,
  createSimpleVisualArtifactV1,
  createStructuredResultArtifactV1,
  deriveRunRefV1,
  evaluateCompositionBasicV1,
  generateConstructionV1,
  measureGeometryV1,
  resolveRuleSetV1,
  validateArtifactV1,
  validateComparisonV1,
  validateDecisionV1,
  validateEvaluationV1,
  validateMeasurementResultV1,
  validateOperationContextV1,
  validatePackLockV1,
  validateReplayReadinessReportV1,
  validateRunInputV1,
  validateRunOutputV1,
  validateRunV1,
  validateStructuredExplanationV1,
} from "../dist/src/index.js";

const EPSILON = 1e-9;
const PACK_REF = "norma.basic-proportions@0.1.0";
const OPERATION = "core.pr11.integration-fixture";
const OPERATION_VERSION = "0.1.0";
const EVALUATION_OPERATION_VERSION = "0.1.0";
const COMPARISON_OPERATION_VERSION = "0.1.0";
const PROFILE_REF = "evaluation-profile:basic-grid-alignment";
const POLICY_REF = "comparison-policy:basic-score-delta";

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
  assertOk(validateMeasurementResultV1(structuredClone(result.output)));
  return result.output;
}

function measurementRef(measurementResult, requestRef) {
  const measurement = measurementResult.measurements.find((candidate) => candidate.requestRef === requestRef);
  assert.ok(measurement, `measurement missing: ${requestRef}`);
  return measurement.measurementRef;
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
    provenance: {
      operationName: "core.evaluation-profile-v1.fixture",
      operationVersion: EVALUATION_OPERATION_VERSION,
      inputRefs: [{ kind: "evaluation-profile", ref: profileRef }],
      source: { kind: "test-fixture", ref: "tests/run-replay-readiness-v1.test.mjs" },
    },
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
    scoring: { kind: "linear-distance-tolerance", distanceBasis: "normalizedDistance", targetDistance: 0, tolerance: 0.05 },
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
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:alignment",
      componentType: "alignment",
      measurementType: "alignment",
      measurementRefs: [measurementRef(measurementResult, "alignment:main-left-third")],
      scoring: { kind: "linear-alignment-tolerance", deltaBasis: "normalizedDelta", targetDelta: 0, tolerance: 0.05 },
      weight: 0.25,
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
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:overlap-penalty",
      componentType: "overlap_penalty",
      measurementType: "overlap",
      measurementRefs: [measurementRef(measurementResult, "overlap:side-main")],
      scoring: { kind: "overlap-linear-penalty", overlapBasis: "maxOverlapRatio", tolerance: 1 },
      weight: 0.15,
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:coverage-match",
      componentType: "coverage_match",
      measurementType: "coverage",
      measurementRefs: [measurementRef(measurementResult, "coverage:composition")],
      scoring: { kind: "target-closeness", valueBasis: "coverageRatio", target: 1, tolerance: 0.25 },
      weight: 0.10,
    }),
    componentDefinition(measurementResult, {
      componentRef: "component:area-ratio-match",
      componentType: "area_ratio_match",
      measurementType: "ratio",
      measurementRefs: [measurementRef(measurementResult, "ratio:side-main")],
      scoring: { kind: "ratio-target-closeness", deltaBasis: "absoluteDelta", targetRatio: 0.5, tolerance: 0.1 },
      weight: 0.05,
    }),
  ];
  return profileWithComponents(measurementResult, components, overrides);
}

function evaluate(measurementResult, profile, overrides = {}) {
  const result = evaluateCompositionBasicV1({
    kind: "evaluation-input",
    schemaVersion: "evaluation-input-v1",
    compositionRef: overrides.compositionRef ?? "composition:A",
    constructionRef: "construction:surface:unit:norma.basic-proportions@0.1.0:surface-basic-third-grid",
    measurementResult,
    profile,
    packRef: profile.packRef,
    ruleSetRef: profile.ruleSetRef,
    operationVersion: EVALUATION_OPERATION_VERSION,
    sourceRefs: [
      { kind: "composition", ref: overrides.compositionRef ?? "composition:A" },
      { kind: "measurement-result", ref: measurementResult.measurementResultRef },
      { kind: "evaluation-profile", ref: profile.profileRef },
    ],
  });
  assertOk(result);
  assertOk(validateEvaluationV1(structuredClone(result.output)));
  return result.output;
}

function compare(evaluationA, evaluationB) {
  const comparisonPolicy = {
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
      source: { kind: "test-fixture", ref: "tests/run-replay-readiness-v1.test.mjs" },
    },
  };
  const result = compareCompositionsBasicV1({
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
  });
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

function artifactSources(overrides = {}) {
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

function operationContextInput(overrides = {}) {
  return {
    coreVersion: CORE_VERSION,
    operation: OPERATION,
    operationVersion: OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: {
      kind: "run-coordinate-policy",
      surfaceRef: "surface:unit",
      origin: "bottom-left",
      xAxis: "right",
      yAxis: "up",
      normalizedBounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
      coordinateScale: "normalized",
    },
    metricPolicy: {
      kind: "run-metric-policy",
      surfaceRef: "surface:unit",
      measurement: "both",
      unit: "px",
      distance: "axis-aligned",
      area: "rectangular",
      angle: "radians",
    },
    tolerancePolicy: {
      kind: "run-tolerance-policy",
      coordinateTolerance: 0,
      metricTolerance: 0,
      angleTolerance: 0,
    },
    roundingPolicy: { kind: "run-rounding-policy", mode: "none", precision: null },
    numericPolicy: {
      kind: "run-numeric-policy",
      epsilon: 1e-9,
      comparison: "absolute",
      negativeZero: "normalize-to-zero",
      nonFinite: "reject",
    },
    orderingPolicy: {
      kind: "run-ordering-policy",
      inputRefs: "kind-then-ref",
      outputRefs: "category-then-ref",
      rules: "resolved-rule-set-order",
      featureFlags: "key-ascending",
      warnings: "code-path-source",
      errors: "code-path-source",
      mismatches: "precedence-kind-path",
    },
    featureFlags: {
      "artifact.simpleVisual": true,
      "evaluation.basicProfile": true,
    },
    sourceRefs: [{ kind: "operation", ref: OPERATION }],
    ...overrides,
  };
}

function canonicalPackLock() {
  const result = createPackLockV1(BASIC_PROPORTIONS_PACK);
  assertOk(result);
  return result.output;
}

function canonicalContext(overrides = {}) {
  const result = createOperationContextV1(operationContextInput(overrides));
  assertOk(result);
  return result.output;
}

function runInputFor(sources, packLock = canonicalPackLock(), operationContext = canonicalContext(), overrides = {}) {
  const result = createRunInputV1({
    inputs: [
      {
        kind: "run-source-input",
        inputRef: { kind: "geometry", ref: sources.surface.id },
        snapshot: sources.surface,
      },
      {
        kind: "run-source-input",
        inputRef: { kind: "composition", ref: sources.compositionA.id },
        snapshot: sources.compositionA,
      },
      {
        kind: "run-source-input",
        inputRef: { kind: "composition", ref: sources.compositionB.id },
        snapshot: sources.compositionB,
      },
    ],
    packLock,
    orderedRuleRefs: sources.construction.appliedRuleRefs,
    ruleSetRef: sources.construction.ruleSetRef,
    operationContext,
    ...overrides,
  });
  assertOk(result);
  return result.output;
}

function deriveInitialRunRef(runInput, packLock, operationContext) {
  const result = deriveRunRefV1({
    operation: OPERATION,
    operationVersion: OPERATION_VERSION,
    runInput,
    packLock,
    orderedRuleRefs: runInput.orderedRuleRefs,
    ruleSetRef: runInput.ruleSetRef,
    operationContext,
  });
  assertOk(result);
  return result.output;
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

function createArtifacts(sources, runRef, overrides = {}) {
  const staleEvidence = overrides.stale
    ? {
        kind: "artifact-stale-evidence",
        reason: "Fixture source changed after artifact projection.",
        sourceRefs: [{ kind: "comparison", ref: sources.comparison.comparisonRef }],
      }
    : undefined;
  const structured = createStructuredResultArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: structuredOptions(),
    runRef,
    staleEvidence,
  });
  assertOk(structured);
  const summary = createConstructionSummaryArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: {
      kind: "artifact-options",
      artifactType: "construction-summary",
      includeTraceSummary: true,
      includeWarnings: true,
    },
    runRef,
  });
  assertOk(summary);
  const report = createEvaluationReportArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: {
      kind: "artifact-options",
      artifactType: "evaluation-report",
      includeComparison: true,
      includeDecision: true,
      includeExplanation: true,
      includeHumanSummary: true,
      includeWarnings: true,
      includeLimits: true,
    },
    runRef,
  });
  assertOk(report);
  const explanation = createExplanationArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: {
      kind: "artifact-options",
      artifactType: "explanation",
      includeStructuredSource: true,
      includeHumanSummary: true,
      includeWarnings: true,
      includeLimits: true,
    },
    runRef,
  });
  assertOk(explanation);
  const visual = createSimpleVisualArtifactV1({
    kind: "artifact-request",
    schemaVersion: "artifact-request-v1",
    sources,
    options: {
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
    },
    runRef,
  });
  assertOk(visual);
  return [structured.output, summary.output, report.output, explanation.output, visual.output];
}

function runOutputFor(sources, artifacts, overrides = {}) {
  const result = createRunOutputV1({
    constructionRefs: [{ kind: "construction", ref: sources.construction.constructionRef }],
    measurementRefs: [
      { kind: "measurement-result", ref: sources.measurementResultA.measurementResultRef },
      { kind: "measurement-result", ref: sources.measurementResultB.measurementResultRef },
    ],
    evaluationRefs: [
      { kind: "evaluation", ref: sources.evaluationA.evaluationRef },
      { kind: "evaluation", ref: sources.evaluationB.evaluationRef },
    ],
    comparisonRefs: [{ kind: "comparison", ref: sources.comparison.comparisonRef }],
    decisionRefs: [{ kind: "decision", ref: sources.decision.decisionRef }],
    explanationRefs: [{ kind: "structured-explanation", ref: sources.structuredExplanation.explanationRef }],
    artifactRefs: artifacts.map((artifact) => ({ kind: "artifact", ref: artifact.artifactRef })),
    executionStatus: "success",
    ...overrides,
  });
  assertOk(result);
  return result.output;
}

function runSourceBundle(sources, artifacts) {
  return {
    kind: "run-source-bundle",
    schemaVersion: RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION,
    surface: sources.surface,
    construction: sources.construction,
    compositionA: sources.compositionA,
    compositionB: sources.compositionB,
    measurementResultA: sources.measurementResultA,
    measurementResultB: sources.measurementResultB,
    evaluationA: sources.evaluationA,
    evaluationB: sources.evaluationB,
    comparison: sources.comparison,
    decision: sources.decision,
    structuredExplanation: sources.structuredExplanation,
    artifacts,
  };
}

function canonicalRunFixture(overrides = {}) {
  const sources = artifactSources();
  const packLock = overrides.packLock ?? canonicalPackLock();
  const operationContext = overrides.operationContext ?? canonicalContext();
  const runInput = overrides.runInput ?? runInputFor(sources, packLock, operationContext, overrides.runInputOverrides);
  const initialRunRef = deriveInitialRunRef(runInput, packLock, operationContext);
  const artifacts = overrides.artifacts ?? createArtifacts(sources, initialRunRef, overrides.artifactOptions);
  const sourceBundle = overrides.sourceBundle ?? runSourceBundle(sources, artifacts);
  const runOutput = overrides.runOutput ?? runOutputFor(sources, artifacts, overrides.runOutputOverrides);
  const result = createRunV1({
    operation: OPERATION,
    operationVersion: OPERATION_VERSION,
    runInput,
    packLock,
    orderedRuleRefs: runInput.orderedRuleRefs,
    ruleSetRef: runInput.ruleSetRef,
    operationContext,
    runOutput,
    sourceBundle,
  });
  assertOk(result);
  return { sources, packLock, operationContext, runInput, initialRunRef, artifacts, sourceBundle, runOutput, run: result.output };
}

function matchingDependencies(fixture, overrides = {}) {
  return {
    kind: "replay-readiness-dependencies",
    inputIdentity: fixture.run.runInput.inputIdentity,
    packLock: fixture.run.packLock,
    orderedRuleRefs: fixture.run.orderedRuleRefs,
    ruleSetRef: fixture.run.ruleSetRef,
    operationContext: fixture.run.operationContext,
    sourceRefs: fixture.run.runInput.inputRefs,
    artifacts: fixture.artifacts,
    ...overrides,
  };
}

function packWithIdentity(contentIdentity) {
  const pack = structuredClone(BASIC_PROPORTIONS_PACK);
  pack.contentIdentity = contentIdentity;
  pack.preLock.contentIdentity = contentIdentity;
  return pack;
}

function alternatePackLock(overrides = {}) {
  const pack = structuredClone(BASIC_PROPORTIONS_PACK);
  Object.assign(pack, overrides.pack ?? {});
  Object.assign(pack.preLock, overrides.preLock ?? {});
  const result = createPackLockV1(pack);
  assertOk(result);
  return result.output;
}

function assertMismatch(report, kind) {
  assert.equal(report.status, "ok");
  assert.ok(report.output.mismatches.some((mismatch) => mismatch.mismatchKind === kind), kind);
}

test("PR11 exports Run and Replay-Readiness V1 vocabulary and keeps replay execution absent", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr11");
  assert.equal(PACK_LOCK_V1_SCHEMA_VERSION, "pack-lock-v1");
  assert.equal(OPERATION_CONTEXT_V1_SCHEMA_VERSION, "operation-context-v1");
  assert.equal(RUN_INPUT_V1_SCHEMA_VERSION, "run-input-v1");
  assert.equal(RUN_OUTPUT_V1_SCHEMA_VERSION, "run-output-v1");
  assert.equal(RUN_V1_SCHEMA_VERSION, "run-v1");
  assert.equal(REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION, "replay-readiness-report-v1");
  assert.equal(RUN_IDENTITY_ALGORITHM_V1, "norma-run-v1-stable-json-fnv1a64");
  assert.deepEqual(RUN_EXECUTION_STATUSES_V1, ["success", "partial", "failed"]);
  assert.deepEqual(REPLAY_READINESS_V1_STATUSES, ["replay_ready", "non_replayable", "stale", "incompatible"]);
  for (const kind of [
    "pack_content_identity_mismatch",
    "coordinate_policy_mismatch",
    "artifact_run_ref_mismatch",
    "missing_source",
  ]) {
    assert.ok(RUN_MISMATCH_KINDS_V1.includes(kind), kind);
  }
  for (const exported of [
    createPackLockV1,
    validatePackLockV1,
    createOperationContextV1,
    validateOperationContextV1,
    createRunInputV1,
    validateRunInputV1,
    createRunOutputV1,
    validateRunOutputV1,
    deriveRunRefV1,
    createRunV1,
    validateRunV1,
    assessReplayReadinessV1,
    validateReplayReadinessReportV1,
  ]) {
    assert.equal(typeof exported, "function");
  }
  for (const code of [
    "InvalidPackLockV1",
    "InvalidOperationContextV1",
    "InvalidRunInputV1",
    "InvalidRunOutputV1",
    "InvalidRunV1",
    "MissingRunSource",
    "IncompatibleRunDependencies",
    "InvalidReplayReadinessReportV1",
    "ArtifactRunRefMismatch",
  ]) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(code), code);
  }
  for (const forbidden of ["replayRun", "replayRunV1", "verifyRun", "verifyRunV1", "verifyArtifactFreshness", "verifyArtifactFreshnessV1", "PR12DemoHarness"]) {
    assert.equal(forbidden in core, false, forbidden);
  }
});

test("PackLock V1 locks canonical pack identity and rejects forged values", () => {
  const first = createPackLockV1(BASIC_PROPORTIONS_PACK);
  const second = createPackLockV1(structuredClone(BASIC_PROPORTIONS_PACK));
  assertOk(first);
  assertOk(second);
  assert.deepEqual(first.output, second.output);
  assert.equal(first.output.packRef, PACK_REF);
  assert.equal(first.output.packVersion, "0.1.0");
  assert.equal(first.output.packSchemaVersion, "ratio-pack-v1");
  assert.equal(first.output.contentIdentity, "norma.basic-proportions@0.1.0:ratio-pack-v1:mvp-minimal");
  assertOk(validatePackLockV1(structuredClone(first.output), BASIC_PROPORTIONS_PACK));

  const noContentIdentity = structuredClone(BASIC_PROPORTIONS_PACK);
  noContentIdentity.contentIdentity = "";
  noContentIdentity.preLock.contentIdentity = "";
  assertFailedWithDiagnostic(createPackLockV1(noContentIdentity), "MissingRatioPackContentIdentity");

  for (const forged of [
    { ...first.output, packVersion: "9.9.9" },
    { ...first.output, packSchemaVersion: "ratio-pack-v2" },
    { ...first.output, contentIdentity: "forged-content" },
    { ...first.output, extra: true },
  ]) {
    assertFailedWithDiagnostic(validatePackLockV1(forged, BASIC_PROPORTIONS_PACK), "InvalidPackLockV1");
  }

  const changedContentLock = createPackLockV1(packWithIdentity("norma.basic-proportions@0.1.0:ratio-pack-v1:changed"));
  assertOk(changedContentLock);
  assert.notEqual(changedContentLock.output.lockRef, first.output.lockRef);
  assert.notEqual(changedContentLock.output.contentIdentity, first.output.contentIdentity);
});

test("OperationContext V1 exposes effective policies, normalizes feature flags, and validates closed shape", () => {
  const first = createOperationContextV1(operationContextInput({
    featureFlags: [
      { kind: "operation-feature-flag", key: "z.flag", value: false },
      { kind: "operation-feature-flag", key: "a.flag", value: true },
    ],
  }));
  const second = createOperationContextV1(operationContextInput({
    featureFlags: [
      { kind: "operation-feature-flag", key: "a.flag", value: true },
      { kind: "operation-feature-flag", key: "z.flag", value: false },
    ],
  }));
  assertOk(first);
  assertOk(second);
  assert.deepEqual(first.output, second.output);
  assert.deepEqual(first.output.featureFlags.map((flag) => flag.key), ["a.flag", "z.flag"]);
  assertOk(validateOperationContextV1(structuredClone(first.output)));

  const changedTolerance = createOperationContextV1(operationContextInput({
    tolerancePolicy: { kind: "run-tolerance-policy", coordinateTolerance: 0.001, metricTolerance: 0, angleTolerance: 0 },
  }));
  const changedMetric = createOperationContextV1(operationContextInput({
    metricPolicy: { kind: "run-metric-policy", surfaceRef: "surface:unit", measurement: "normalized", unit: null, distance: "axis-aligned", area: "rectangular", angle: "radians" },
  }));
  const changedCoordinate = createOperationContextV1(operationContextInput({
    coordinatePolicy: { ...operationContextInput().coordinatePolicy, normalizedBounds: { kind: "rect", x: 0, y: 0, width: 0.5, height: 1 } },
  }));
  const changedFlag = createOperationContextV1(operationContextInput({ featureFlags: { "artifact.simpleVisual": false, "evaluation.basicProfile": true } }));
  for (const result of [changedTolerance, changedMetric, changedCoordinate, changedFlag]) {
    assertOk(result);
    assert.notEqual(result.output.contextRef, canonicalContext().contextRef);
  }

  assertFailedWithDiagnostic(createOperationContextV1(operationContextInput({
    featureFlags: [
      { kind: "operation-feature-flag", key: "dup", value: true },
      { kind: "operation-feature-flag", key: "dup", value: false },
    ],
  })), "InvalidOperationContextV1");
  const missingTolerance = operationContextInput();
  delete missingTolerance.tolerancePolicy;
  assertFailedWithDiagnostic(createOperationContextV1(missingTolerance), "InvalidOperationContextV1");
  assertFailedWithDiagnostic(createOperationContextV1(operationContextInput({
    metricPolicy: { ...operationContextInput().metricPolicy, surfaceRef: "surface:other" },
  })), "InvalidOperationContextV1");
  assertFailedWithDiagnostic(createOperationContextV1(operationContextInput({
    numericPolicy: { ...operationContextInput().numericPolicy, epsilon: Number.NaN },
  })), "InvalidOperationContextV1");
  assertFailedWithDiagnostic(createOperationContextV1(operationContextInput({
    coordinatePolicy: { ...operationContextInput().coordinatePolicy, execute: "replay" },
  })), "InvalidOperationContextV1");
});

test("RunInput V1 clones structured inputs, rejects artifacts/native objects, and preserves semantic array order", () => {
  const packLock = canonicalPackLock();
  const operationContext = canonicalContext();
  const first = createRunInputV1({
    inputs: [
      {
        kind: "run-source-input",
        inputRef: { kind: "geometry", ref: "surface:unit" },
        snapshot: { b: 2, a: 1, ordered: ["a", "b"] },
      },
    ],
    packLock,
    orderedRuleRefs: ["surface-thirds-vertical", "surface-thirds-horizontal"],
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    operationContext,
  });
  const second = createRunInputV1({
    inputs: [
      {
        kind: "run-source-input",
        inputRef: { kind: "geometry", ref: "surface:unit" },
        snapshot: { ordered: ["a", "b"], a: 1, b: 2 },
      },
    ],
    packLock,
    orderedRuleRefs: ["surface-thirds-vertical", "surface-thirds-horizontal"],
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    operationContext,
  });
  const reorderedArray = createRunInputV1({
    inputs: [
      {
        kind: "run-source-input",
        inputRef: { kind: "geometry", ref: "surface:unit" },
        snapshot: { a: 1, b: 2, ordered: ["b", "a"] },
      },
    ],
    packLock,
    orderedRuleRefs: ["surface-thirds-vertical", "surface-thirds-horizontal"],
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    operationContext,
  });
  assertOk(first);
  assertOk(second);
  assertOk(reorderedArray);
  assert.equal(first.output.inputIdentity, second.output.inputIdentity);
  assert.notEqual(first.output.inputIdentity, reorderedArray.output.inputIdentity);
  const before = structuredClone(first.output);
  first.output.inputs[0].snapshot.a = 99;
  assert.equal(before.inputs[0].snapshot.a, 1);

  assertFailedWithDiagnostic(createRunInputV1({
    inputs: [{ kind: "run-source-input", inputRef: { kind: "artifact", ref: "artifact:bad" }, snapshot: { kind: "artifact" } }],
    packLock,
    orderedRuleRefs: ["surface-thirds-vertical"],
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    operationContext,
  }), "InvalidRunInputV1");
  assertFailedWithDiagnostic(createRunInputV1({
    inputs: [
      { kind: "run-source-input", inputRef: { kind: "geometry", ref: "surface:unit" }, snapshot: { ok: true } },
      { kind: "run-source-input", inputRef: { kind: "geometry", ref: "surface:unit" }, contentIdentity: "same" },
    ],
    packLock,
    orderedRuleRefs: ["surface-thirds-vertical"],
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    operationContext,
  }), "InvalidRunInputV1");
  assertFailedWithDiagnostic(createRunInputV1({
    inputs: [{ kind: "run-source-input", inputRef: { kind: "geometry", ref: "surface:unit" }, snapshot: new Date("2026-01-01T00:00:00Z") }],
    packLock,
    orderedRuleRefs: ["surface-thirds-vertical"],
    ruleSetRef: SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
    operationContext,
  }), "InvalidRunInputV1");
});

test("Run identity depends on deterministic inputs but not outputs, diagnostics, status, time, or randomness", () => {
  const fixture = canonicalRunFixture();
  const repeated = canonicalRunFixture();
  assert.equal(fixture.initialRunRef.id, fixture.run.runRef.id);
  assert.equal(repeated.run.runRef.id, fixture.run.runRef.id);
  assert.deepEqual(Object.keys(fixture.run).sort(), [
    "errors",
    "executionStatus",
    "kind",
    "operation",
    "operationContext",
    "operationVersion",
    "orderedRuleRefs",
    "packLock",
    "provenance",
    "replayReadiness",
    "ruleSetRef",
    "runInput",
    "runOutput",
    "runRef",
    "schemaVersion",
    "warnings",
  ]);

  const changedInput = runInputFor(
    { ...fixture.sources, compositionA: compositionA({ id: "composition:A2" }) },
    fixture.packLock,
    fixture.operationContext,
  );
  assert.notEqual(deriveInitialRunRef(changedInput, fixture.packLock, fixture.operationContext).id, fixture.run.runRef.id);

  const changedPack = createPackLockV1(packWithIdentity("norma.basic-proportions@0.1.0:ratio-pack-v1:changed-for-run"));
  assertOk(changedPack);
  assert.notEqual(deriveInitialRunRef(fixture.runInput, changedPack.output, fixture.operationContext).id, fixture.run.runRef.id);

  const reversedRules = createRunInputV1({
    inputs: fixture.runInput.inputs,
    packLock: fixture.packLock,
    orderedRuleRefs: [...fixture.runInput.orderedRuleRefs].reverse(),
    ruleSetRef: fixture.runInput.ruleSetRef,
    operationContext: fixture.operationContext,
  });
  assertOk(reversedRules);
  assert.notEqual(deriveInitialRunRef(reversedRules.output, fixture.packLock, fixture.operationContext).id, fixture.run.runRef.id);

  const changedOperationVersion = deriveRunRefV1({
    operation: OPERATION,
    operationVersion: "0.2.0",
    runInput: fixture.runInput,
    packLock: fixture.packLock,
    orderedRuleRefs: fixture.runInput.orderedRuleRefs,
    ruleSetRef: fixture.runInput.ruleSetRef,
    operationContext: { ...fixture.operationContext, operationVersion: "0.2.0", contextRef: canonicalContext({ operationVersion: "0.2.0" }).contextRef },
  });
  assertOk(changedOperationVersion);
  assert.notEqual(changedOperationVersion.output.id, fixture.run.runRef.id);

  const outputOnly = createRunV1({
    operation: OPERATION,
    operationVersion: OPERATION_VERSION,
    runInput: fixture.runInput,
    packLock: fixture.packLock,
    orderedRuleRefs: fixture.runInput.orderedRuleRefs,
    ruleSetRef: fixture.runInput.ruleSetRef,
    operationContext: fixture.operationContext,
    runOutput: runOutputFor(fixture.sources, [], { artifactRefs: [] }),
  });
  assertOk(outputOnly);
  assert.equal(outputOnly.output.runRef.id, fixture.run.runRef.id);

  const warningOnly = createRunV1({
    operation: OPERATION,
    operationVersion: OPERATION_VERSION,
    runInput: fixture.runInput,
    packLock: fixture.packLock,
    orderedRuleRefs: fixture.runInput.orderedRuleRefs,
    ruleSetRef: fixture.runInput.ruleSetRef,
    operationContext: fixture.operationContext,
    runOutput: runOutputFor(fixture.sources, fixture.artifacts, {
      executionStatus: "partial",
      warnings: [createCoreWarning({ code: "ReplayReadinessPartial", message: "Fixture warning.", targetRef: "fixture" })],
    }),
    executionStatus: "partial",
  });
  assertOk(warningOnly);
  assert.equal(warningOnly.output.runRef.id, fixture.run.runRef.id);
});

test("full PR6-PR10 pipeline creates a replay-ready RunV1 and resolves the artifact runRef cycle", () => {
  const fixture = canonicalRunFixture();
  assert.equal(fixture.run.kind, "run");
  assert.equal(fixture.run.schemaVersion, RUN_V1_SCHEMA_VERSION);
  assert.equal(fixture.run.runRef.id, fixture.initialRunRef.id);
  assert.equal(fixture.run.replayReadiness.status, "replay_ready");
  assert.deepEqual(fixture.run.replayReadiness.mismatches, []);
  assert.equal(fixture.run.packLock.contentIdentity, BASIC_PROPORTIONS_PACK.contentIdentity);
  assert.equal(fixture.run.operationContext.coreVersion, CORE_VERSION);
  assert.deepEqual(fixture.run.orderedRuleRefs, ["surface-thirds-vertical", "surface-thirds-horizontal"]);
  assert.deepEqual(fixture.run.runOutput.constructionRefs.map((ref) => ref.ref), [fixture.sources.construction.constructionRef]);
  assert.deepEqual(fixture.run.runOutput.measurementRefs.map((ref) => ref.ref), [
    fixture.sources.measurementResultA.measurementResultRef,
    fixture.sources.measurementResultB.measurementResultRef,
  ]);
  assert.equal(fixture.run.runOutput.artifactRefs.length, fixture.artifacts.length);
  for (const artifact of fixture.artifacts) {
    assert.equal(artifact.runRef.id, fixture.run.runRef.id);
    assertOk(validateArtifactV1(structuredClone(artifact)));
  }
  assertOk(validateRunV1(structuredClone(fixture.run), fixture.sourceBundle));

  const readiness = assessReplayReadinessV1(fixture.run, matchingDependencies(fixture));
  assertOk(readiness);
  assert.equal(readiness.output.status, "replay_ready");
  assert.deepEqual(readiness.output.mismatches, []);
  assertOk(validateReplayReadinessReportV1(structuredClone(readiness.output)));
});

test("RunOutput V1 enforces category refs, uniqueness, source resolution, and status invariants", () => {
  const fixture = canonicalRunFixture();
  assertFailedWithDiagnostic(createRunOutputV1({
    constructionRefs: [
      { kind: "construction", ref: fixture.sources.construction.constructionRef },
      { kind: "construction", ref: fixture.sources.construction.constructionRef },
    ],
    executionStatus: "success",
  }), "InvalidRunOutputV1");
  assertFailedWithDiagnostic(createRunOutputV1({
    measurementRefs: [{ kind: "construction", ref: fixture.sources.construction.constructionRef }],
    executionStatus: "success",
  }), "InvalidRunOutputV1");
  assertFailedWithDiagnostic(createRunOutputV1({
    executionStatus: "success",
  }), "InvalidRunOutputV1");
  assertFailedWithDiagnostic(createRunOutputV1({
    constructionRefs: [{ kind: "construction", ref: fixture.sources.construction.constructionRef }],
    executionStatus: "partial",
  }), "InvalidRunOutputV1");
  assertFailedWithDiagnostic(createRunOutputV1({
    constructionRefs: [{ kind: "construction", ref: fixture.sources.construction.constructionRef }],
    executionStatus: "failed",
    errors: [createCoreError({ code: "InvalidRunV1", message: "Synthetic failure." })],
  }), "InvalidRunOutputV1");

  const unknownOutputRun = structuredClone(fixture.run);
  unknownOutputRun.runOutput.constructionRefs = [{ kind: "construction", ref: "construction:missing" }];
  assertFailedWithDiagnostic(validateRunV1(unknownOutputRun, fixture.sourceBundle), "MissingRunSource");
});

test("static replay-readiness assessment reports deterministic dependency mismatches", () => {
  const fixture = canonicalRunFixture();
  const changedContent = createPackLockV1(packWithIdentity("norma.basic-proportions@0.1.0:ratio-pack-v1:changed-assess"));
  assertOk(changedContent);

  const versionPack = structuredClone(BASIC_PROPORTIONS_PACK);
  versionPack.version = "0.1.1";
  versionPack.contentIdentity = "norma.basic-proportions@0.1.1:ratio-pack-v1:mvp-minimal";
  versionPack.preLock.packVersion = "0.1.1";
  versionPack.preLock.contentIdentity = versionPack.contentIdentity;
  versionPack.preLock.ref = "prelock:norma.basic-proportions@0.1.1";
  const changedVersion = createPackLockV1(versionPack);
  assertOk(changedVersion);

  const invalidSchemaLock = { ...fixture.packLock, packSchemaVersion: "ratio-pack-v2" };

  for (const [kind, dependencies] of [
    ["input_identity_mismatch", { inputIdentity: `${fixture.runInput.inputIdentity}:changed` }],
    ["pack_ref_mismatch", { packLock: { ...fixture.packLock, packRef: "norma.other-pack@0.1.0" } }],
    ["pack_content_identity_mismatch", { packLock: changedContent.output }],
    ["pack_version_mismatch", { packLock: changedVersion.output }],
    ["pack_schema_version_mismatch", { packLock: invalidSchemaLock }],
    ["rule_refs_mismatch", { orderedRuleRefs: [...fixture.run.orderedRuleRefs].reverse() }],
    ["rule_set_ref_mismatch", { ruleSetRef: "rule-set:other" }],
    ["core_version_mismatch", { operationContext: { ...fixture.operationContext, coreVersion: "0.1.0-pr10" } }],
    ["operation_version_mismatch", { operationContext: canonicalContext({ operationVersion: "0.2.0" }) }],
    ["geometry_model_version_mismatch", { operationContext: canonicalContext({ geometryModelVersion: "geometry-v2" }) }],
    ["coordinate_policy_mismatch", { operationContext: canonicalContext({ coordinatePolicy: { ...operationContextInput().coordinatePolicy, normalizedBounds: { kind: "rect", x: 0, y: 0, width: 0.5, height: 1 } } }) }],
    ["metric_policy_mismatch", { operationContext: canonicalContext({ metricPolicy: { ...operationContextInput().metricPolicy, measurement: "normalized", unit: null } }) }],
    ["tolerance_policy_mismatch", { operationContext: canonicalContext({ tolerancePolicy: { kind: "run-tolerance-policy", coordinateTolerance: 0.01, metricTolerance: 0, angleTolerance: 0 } }) }],
    ["rounding_policy_mismatch", { operationContext: canonicalContext({ roundingPolicy: { kind: "run-rounding-policy", mode: "fixed-decimal", precision: 3 } }) }],
    ["numeric_policy_mismatch", { operationContext: canonicalContext({ numericPolicy: { ...operationContextInput().numericPolicy, epsilon: 0.000001 } }) }],
    ["ordering_policy_mismatch", { operationContext: canonicalContext({ orderingPolicy: { ...operationContextInput().orderingPolicy, outputRefs: "custom-order" } }) }],
    ["feature_flags_mismatch", { operationContext: canonicalContext({ featureFlags: { "artifact.simpleVisual": false, "evaluation.basicProfile": true } }) }],
  ]) {
    const report = assessReplayReadinessV1(fixture.run, matchingDependencies(fixture, dependencies));
    assertOk(report);
    assert.equal(report.output.status, "incompatible", kind);
    assertMismatch(report, kind);
    assert.ok(report.output.mismatches.find((mismatch) => mismatch.mismatchKind === kind).blocksReplay);
  }

});

test("replay-readiness status precedence handles missing sources, stale artifacts, and artifact runRef mismatch", () => {
  const fixture = canonicalRunFixture();
  const missing = assessReplayReadinessV1(fixture.run, matchingDependencies(fixture, {
    sourceRefs: fixture.run.runInput.inputRefs.slice(1),
  }));
  assertOk(missing);
  assert.equal(missing.output.status, "non_replayable");
  assertMismatch(missing, "missing_source");

  const staleFixture = canonicalRunFixture({ artifactOptions: { stale: true } });
  assert.equal(staleFixture.run.replayReadiness.status, "stale");
  const stale = assessReplayReadinessV1(staleFixture.run, matchingDependencies(staleFixture));
  assertOk(stale);
  assert.equal(stale.output.status, "stale");
  assertMismatch(stale, "artifact_stale");

  const wrongRunRefArtifacts = fixture.artifacts.map((artifact, index) => (
    index === 0 ? { ...artifact, runRef: { id: "run:v1:other" } } : artifact
  ));
  const artifactMismatch = assessReplayReadinessV1(fixture.run, matchingDependencies(fixture, {
    artifacts: wrongRunRefArtifacts,
  }));
  assertOk(artifactMismatch);
  assert.equal(artifactMismatch.output.status, "incompatible");
  assertMismatch(artifactMismatch, "artifact_run_ref_mismatch");

  const incompatibleOutranksStale = assessReplayReadinessV1(staleFixture.run, matchingDependencies(staleFixture, {
    inputIdentity: "changed",
  }));
  assertOk(incompatibleOutranksStale);
  assert.equal(incompatibleOutranksStale.output.status, "incompatible");
});

test("RunV1 validation rejects forged identity, statuses, readiness evidence, and source misuse", () => {
  const fixture = canonicalRunFixture();
  const forgedRunRef = structuredClone(fixture.run);
  forgedRunRef.runRef.id = "run:v1:forged";
  assertFailedWithDiagnostic(validateRunV1(forgedRunRef), "InvalidRunV1");

  const forgedInput = structuredClone(fixture.run);
  forgedInput.runInput.inputIdentity = "run-input:v1:forged";
  assertFailedWithDiagnostic(validateRunV1(forgedInput), "InvalidRunInputV1");

  const forgedContext = structuredClone(fixture.run);
  forgedContext.operationContext.contextRef = "operation-context:v1:forged";
  assertFailedWithDiagnostic(validateRunV1(forgedContext), "InvalidOperationContextV1");

  const replayReadyWithMismatch = structuredClone(fixture.run);
  replayReadyWithMismatch.replayReadiness.mismatches = [
    assessReplayReadinessV1(fixture.run, matchingDependencies(fixture, { inputIdentity: "changed" })).output.mismatches[0],
  ];
  assertFailedWithDiagnostic(validateRunV1(replayReadyWithMismatch), "InvalidRunV1");

  const staleWithoutEvidence = structuredClone(fixture.run);
  staleWithoutEvidence.replayReadiness.status = "stale";
  assertFailedWithDiagnostic(validateRunV1(staleWithoutEvidence), "InvalidRunV1");

  const nonReplayableWithoutReason = structuredClone(fixture.run);
  nonReplayableWithoutReason.replayReadiness.status = "non_replayable";
  assertFailedWithDiagnostic(validateRunV1(nonReplayableWithoutReason), "InvalidRunV1");

  const incompatibleWithoutMismatch = structuredClone(fixture.run);
  incompatibleWithoutMismatch.replayReadiness.status = "incompatible";
  assertFailedWithDiagnostic(validateRunV1(incompatibleWithoutMismatch), "InvalidRunV1");

  const artifactAsInput = structuredClone(fixture.run);
  artifactAsInput.runInput.inputs[0] = {
    kind: "run-source-input",
    inputRef: { kind: "artifact", ref: fixture.artifacts[0].artifactRef },
    contentIdentity: "artifact",
  };
  assertFailedWithDiagnostic(validateRunV1(artifactAsInput), "InvalidRunInputV1");

  const extraField = { ...fixture.run, storage: { path: "/tmp/cache" } };
  assertFailedWithDiagnostic(validateRunV1(extraField), "InvalidRunV1");
});

test("RunV1 creation is deterministic and does not mutate frozen inputs", () => {
  const fixture = canonicalRunFixture();
  const frozenRunInput = deepFreeze(structuredClone(fixture.runInput));
  const frozenPackLock = deepFreeze(structuredClone(fixture.packLock));
  const frozenContext = deepFreeze(structuredClone(fixture.operationContext));
  const frozenRunOutput = deepFreeze(structuredClone(fixture.runOutput));
  const frozenSourceBundle = deepFreeze(structuredClone(fixture.sourceBundle));
  const before = JSON.stringify({ frozenRunInput, frozenPackLock, frozenContext, frozenRunOutput, frozenSourceBundle });
  const first = createRunV1({
    operation: OPERATION,
    operationVersion: OPERATION_VERSION,
    runInput: frozenRunInput,
    packLock: frozenPackLock,
    orderedRuleRefs: frozenRunInput.orderedRuleRefs,
    ruleSetRef: frozenRunInput.ruleSetRef,
    operationContext: frozenContext,
    runOutput: frozenRunOutput,
    sourceBundle: frozenSourceBundle,
  });
  const second = createRunV1({
    operation: OPERATION,
    operationVersion: OPERATION_VERSION,
    runInput: structuredClone(fixture.runInput),
    packLock: structuredClone(fixture.packLock),
    orderedRuleRefs: fixture.runInput.orderedRuleRefs,
    ruleSetRef: fixture.runInput.ruleSetRef,
    operationContext: structuredClone(fixture.operationContext),
    runOutput: structuredClone(fixture.runOutput),
    sourceBundle: structuredClone(fixture.sourceBundle),
  });
  assertOk(first);
  assertOk(second);
  assert.deepEqual(first.output, second.output);
  assert.equal(JSON.stringify({ frozenRunInput, frozenPackLock, frozenContext, frozenRunOutput, frozenSourceBundle }), before);
});

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}
