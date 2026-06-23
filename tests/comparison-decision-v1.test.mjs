import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  BASIC_PROPORTIONS_PACK,
  COMPARISON_POLICY_V1_SCHEMA_VERSION,
  COMPARISON_V1_SCHEMA_VERSION,
  CORE_VERSION,
  DECISION_V1_SCHEMA_VERSION,
  EVALUATION_PROFILE_V1_SCHEMA_VERSION,
  MEASUREMENT_RESULT_V1_SCHEMA_VERSION,
  STRUCTURED_EXPLANATION_V1_SCHEMA_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  compareCompositionsBasicV1,
  evaluateCompositionBasicV1,
  generateConstructionV1,
  measureGeometryV1,
  resolveRuleSetV1,
  validateComparisonPolicyV1,
  validateComparisonV1,
  validateDecisionV1,
  validateEvaluationV1,
  validateStructuredExplanationV1,
} from "../dist/src/index.js";

const EPSILON = 1e-9;
const EVALUATION_OPERATION_VERSION = "0.1.0";
const COMPARISON_OPERATION_VERSION = "0.1.0";
const PACK_REF = "norma.basic-proportions@0.1.0";
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
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
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

function compositionA() {
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
    measurementResultRef: `measurement-result:${composition.id.split(":")[1]}`,
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
    source: { kind: "test-fixture", ref: "tests/comparison-decision-v1.test.mjs" },
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

function lowConfidenceProfile(measurementResult, overrides = {}) {
  const profile = basicProfile(measurementResult);
  return profileWithComponents(measurementResult, [
    profile.components[0],
    {
      ...profile.components[1],
      componentRef: "component:missing-optional",
      measurementRefs: ["measurement:missing"],
      required: false,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:missing-optional" }],
    },
  ], {
    confidencePolicy: {
      kind: "evaluation-confidence-policy",
      highThreshold: 0.8,
      mediumThreshold: 0.5,
      optionalMissingPenalty: 0.75,
      ambiguousMeasurementPenalty: 0.2,
      warningPenalty: 0.05,
    },
    statusThresholds: {
      kind: "evaluation-status-thresholds",
      match: 0.9,
      nearMatch: 0.75,
      weakMatch: 0.5,
      minimumConfidenceForNormalStatus: 0.99,
    },
    ...overrides,
  });
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

function generatedEvaluations() {
  const measurementsA = runMeasurements(compositionA());
  const measurementsB = runMeasurements(compositionB());
  const evaluationA = evaluate(measurementsA, basicProfile(measurementsA), { compositionRef: "composition:A" });
  const evaluationB = evaluate(measurementsB, basicProfile(measurementsB), { compositionRef: "composition:B" });
  assert.ok(evaluationA.score.overallScore > evaluationB.score.overallScore);
  return { evaluationA, evaluationB, measurementsA, measurementsB };
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
      source: { kind: "test-fixture", ref: "tests/comparison-decision-v1.test.mjs" },
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

function warningCodes(value) {
  return value.warnings.map((warning) => warning.code);
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

test("PR9 exports Comparison, Decision, and Structured Explanation V1 while PR10 artifacts are public", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr11");
  assert.equal(COMPARISON_POLICY_V1_SCHEMA_VERSION, "comparison-policy-v1");
  assert.equal(COMPARISON_V1_SCHEMA_VERSION, "comparison-v1");
  assert.equal(DECISION_V1_SCHEMA_VERSION, "decision-v1");
  assert.equal(STRUCTURED_EXPLANATION_V1_SCHEMA_VERSION, "structured-explanation-v1");
  assert.equal(typeof compareCompositionsBasicV1, "function");
  assert.equal(typeof validateComparisonPolicyV1, "function");
  assert.equal(typeof validateComparisonV1, "function");
  assert.equal(typeof validateDecisionV1, "function");
  assert.equal(typeof validateStructuredExplanationV1, "function");
  for (const code of [
    "InvalidComparisonPolicyV1",
    "InvalidComparisonV1",
    "InvalidDecisionV1",
    "InvalidStructuredExplanationV1",
    "IncompatibleEvaluationContext",
    "MissingEvaluationInput",
    "BeautyClaimRejected",
    "RecommendationRejected",
  ]) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(code), code);
  }
  for (const forbiddenExport of [
    "CandidateRankingV1",
    "CandidateSetV1",
    "RecommendationV1",
    "renderComparisonArtifactV1",
    "optimizeCompositionV1",
  ]) {
    assert.equal(forbiddenExport in core, false, `${forbiddenExport} must remain out of PR9`);
  }
});

test("valid ComparisonPolicy V1 is explicit, closed, and source-backed", () => {
  assertOk(validateComparisonPolicyV1(policy()));
  assertOk(validateComparisonPolicyV1(policy({ tieTolerance: 0, minimumConfidence: 0 })));
  assertOk(validateComparisonPolicyV1(policy({ tieTolerance: 0.25, minimumConfidence: 1 })));

  const invalids = [
    [policy({ tieTolerance: -1 }), "InvalidComparisonPolicyV1"],
    [policy({ tieTolerance: Number.POSITIVE_INFINITY }), "InvalidComparisonPolicyV1"],
    [policy({ minimumConfidence: -0.01 }), "InvalidComparisonPolicyV1"],
    [policy({ minimumConfidence: 1.01 }), "InvalidComparisonPolicyV1"],
    [policy({ code: "return 1" }), "InvalidComparisonPolicyV1"],
    [policy({ formula: "scoreA - scoreB" }), "InvalidComparisonPolicyV1"],
    [policy({ extra: true }), "InvalidComparisonPolicyV1"],
    [policy({ beauty: true }), "BeautyClaimRejected"],
    [policy({ preference: "A" }), "BeautyClaimRejected"],
    [policy({ recommendation: "choose A" }), "RecommendationRejected"],
    [policy({ sourceRefs: [] }), "InvalidComparisonPolicyV1"],
    [policy({ provenance: null }), "InvalidComparisonPolicyV1"],
  ];

  for (const [candidate, code] of invalids) {
    assertFailedWithDiagnostic(validateComparisonPolicyV1(candidate), code);
  }
});

test("compareCompositionsBasicV1 selects A only when A is closer beyond tolerance", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const output = compare(evaluationA, evaluationB);
  const { comparison, decision, structuredExplanation } = output;

  assert.equal(comparison.status, "a_closer");
  assert.equal(comparison.evaluationARef, evaluationA.evaluationRef);
  assert.equal(comparison.evaluationBRef, evaluationB.evaluationRef);
  assert.equal(comparison.selectedEvaluationRef, evaluationA.evaluationRef);
  assert.equal(comparison.selectedCompositionRef, "composition:A");
  assertClose(comparison.signedScoreDelta, evaluationA.score.overallScore - evaluationB.score.overallScore);
  assertClose(comparison.absoluteScoreDelta, Math.abs(comparison.signedScoreDelta));
  assert.equal(decision.status, "a_closer");
  assert.equal(decision.selectedEvaluationRef, evaluationA.evaluationRef);
  assert.equal(decision.selectedCompositionRef, "composition:A");
  assert.equal(structuredExplanation.claimCode, "A_CLOSER_TO_DECLARED_SYSTEM");
  assert.equal(structuredExplanation.summary.includes("closer to the declared system"), true);
  assert.equal(JSON.stringify(output).includes("recommendation"), false);
});

test("B closer preserves caller order and symmetry negates the signed delta", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const forward = compare(evaluationA, evaluationB);
  const reverse = compare(evaluationB, evaluationA);

  assert.equal(reverse.comparison.status, "b_closer");
  assert.equal(reverse.comparison.evaluationARef, evaluationB.evaluationRef);
  assert.equal(reverse.comparison.evaluationBRef, evaluationA.evaluationRef);
  assert.equal(reverse.comparison.selectedEvaluationRef, evaluationA.evaluationRef);
  assertClose(reverse.comparison.signedScoreDelta, -forward.comparison.signedScoreDelta);
  assertClose(reverse.comparison.absoluteScoreDelta, forward.comparison.absoluteScoreDelta);
  assert.notEqual(reverse.comparison.comparisonRef, forward.comparison.comparisonRef);
  assert.deepEqual(compare(evaluationB, evaluationA), reverse);
});

test("tie status is inclusive at the declared tie tolerance and never selects a candidate", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const delta = Math.abs(evaluationA.score.overallScore - evaluationB.score.overallScore);

  for (const tieTolerance of [delta, delta + 0.01]) {
    const output = compare(evaluationA, evaluationB, policy({ tieTolerance }));
    assert.equal(output.comparison.status, "tie");
    assert.equal(output.comparison.selectedEvaluationRef, null);
    assert.equal(output.comparison.selectedCompositionRef, null);
    assert.equal(output.decision.status, "tie");
    assert.equal(output.decision.selectedEvaluationRef, null);
    assert.equal(output.structuredExplanation.claimCode, "TIED_WITHIN_TOLERANCE");
    assert.ok(warningCodes(output.comparison).includes("TiedWithinTolerance"));
  }
});

test("ambiguous comparison precedes score closeness when evaluation status or confidence is insufficient", () => {
  const measurementsA = runMeasurements(compositionA());
  const measurementsB = runMeasurements(compositionB());
  const ambiguousA = evaluate(measurementsA, lowConfidenceProfile(measurementsA), { compositionRef: "composition:A" });
  const ambiguousB = evaluate(measurementsB, lowConfidenceProfile(measurementsB), { compositionRef: "composition:B" });
  assert.equal(ambiguousA.status, "ambiguous");

  const byStatus = compare(ambiguousA, ambiguousB, policy({ minimumConfidence: 0 }));
  assert.equal(byStatus.comparison.status, "ambiguous");
  assert.equal(byStatus.decision.selectedEvaluationRef, null);
  assert.equal(byStatus.structuredExplanation.claimCode, "AMBIGUOUS_COMPARISON");
  assert.ok(warningCodes(byStatus.comparison).includes("EvaluationAmbiguous"));

  const normalLowConfidenceProfile = (measurementResult) => lowConfidenceProfile(measurementResult, {
    statusThresholds: {
      kind: "evaluation-status-thresholds",
      match: 0.9,
      nearMatch: 0.75,
      weakMatch: 0.5,
      minimumConfidenceForNormalStatus: 0,
    },
  });
  const lowConfidenceA = evaluate(measurementsA, normalLowConfidenceProfile(measurementsA), { compositionRef: "composition:A" });
  const lowConfidenceB = evaluate(measurementsB, normalLowConfidenceProfile(measurementsB), { compositionRef: "composition:B" });
  assert.notEqual(lowConfidenceA.status, "ambiguous");
  assert.ok(lowConfidenceA.confidence.value < 0.9);
  const byConfidence = compare(lowConfidenceA, lowConfidenceB, policy({ minimumConfidence: 0.9 }));
  assert.equal(byConfidence.comparison.status, "ambiguous");
  assert.equal(byConfidence.decision.selectedEvaluationRef, null);
  assert.ok(warningCodes(byConfidence.comparison).includes("LowComparisonConfidence"));
});

test("non-comparable context precedes ambiguity, tie, and score winner logic", () => {
  const { evaluationA, evaluationB, measurementsB } = generatedEvaluations();
  const profileMismatch = evaluate(
    measurementsB,
    basicProfile(measurementsB, { profileRef: "evaluation-profile:other" }),
    { compositionRef: "composition:B" },
  );
  const cases = [
    profileMismatch,
    { ...evaluationB, packRef: "norma.other-pack@0.1.0" },
    { ...evaluationB, ruleSetRef: "other-rule-set" },
    { ...evaluationB, constructionRef: "construction:other" },
  ];

  for (const candidate of cases) {
    assertOk(validateEvaluationV1(candidate));
    const output = compare(evaluationA, candidate, policy({ tieTolerance: 1, minimumConfidence: 1 }));
    assert.equal(output.comparison.status, "non_comparable");
    assert.equal(output.comparison.selectedEvaluationRef, null);
    assert.equal(output.decision.selectedCompositionRef, null);
    assert.equal(output.structuredExplanation.claimCode, "NON_COMPARABLE_CONTEXT");
    assert.ok(output.comparison.contextChecks.some((check) => check.matches === false));
    assert.ok(warningCodes(output.comparison).includes("ContextMismatch"));
  }
});

test("candidate-specific refs may differ while shared context remains comparable", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const output = compare(evaluationA, evaluationB);

  assert.notEqual(evaluationA.compositionRef, evaluationB.compositionRef);
  assert.notEqual(evaluationA.measurementResultRef, evaluationB.measurementResultRef);
  assert.notEqual(evaluationA.evaluationRef, evaluationB.evaluationRef);
  assert.notEqual(evaluationA.score.scoreRef, evaluationB.score.scoreRef);
  assert.equal(output.comparison.status, "a_closer");
  assert.equal(output.comparison.contextChecks.every((check) => check.matches), true);
});

test("malformed inputs fail as structured operation errors", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();

  assertFailedWithDiagnostic(
    compareCompositionsBasicV1(comparisonInput({ ...evaluationA, score: { ...evaluationA.score, overallScore: 2 } }, evaluationB)),
    "InvalidComparisonV1",
  );
  assertFailedWithDiagnostic(
    compareCompositionsBasicV1(comparisonInput(evaluationA, evaluationB, { ...policy(), tieTolerance: -1 })),
    "InvalidComparisonPolicyV1",
  );
  assertFailedWithDiagnostic(
    compareCompositionsBasicV1({ ...comparisonInput(evaluationA, evaluationB), evaluationA: null }),
    "MissingEvaluationInput",
  );
});

test("Decision V1 validation rejects inconsistent selection and orphan comparison refs", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const output = compare(evaluationA, evaluationB);
  const decision = output.decision;

  const invalids = [
    { ...decision, selectedEvaluationRef: evaluationB.evaluationRef },
    { ...decision, status: "b_closer", selectedEvaluationRef: evaluationA.evaluationRef },
    { ...decision, selectedEvaluationRef: null, selectedCompositionRef: null },
    { ...decision, comparisonRef: "comparison:orphan" },
    { ...decision, selectedEvaluationRef: "evaluation:unknown" },
    { ...decision, sourceScoreRefs: [{ kind: "score", ref: "score:unknown" }, decision.sourceScoreRefs[1]] },
    { ...decision, recommendation: "use A" },
    { ...decision, beauty: "high" },
  ];
  for (const candidate of invalids) {
    assertFailedWithDiagnostic(validateDecisionV1(candidate, output.comparison), "InvalidDecisionV1");
  }

  const tie = compare(evaluationA, evaluationB, policy({ tieTolerance: 1 }));
  assertFailedWithDiagnostic(
    validateDecisionV1({ ...tie.decision, selectedEvaluationRef: evaluationA.evaluationRef }, tie.comparison),
    "InvalidDecisionV1",
  );
});

test("StructuredExplanation V1 validation rejects facts or claims that are not source-backed", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const output = compare(evaluationA, evaluationB);
  const explanation = output.structuredExplanation;

  const invalids = [
    { ...explanation, claimCode: "B_CLOSER_TO_DECLARED_SYSTEM" },
    { ...explanation, facts: { ...explanation.facts, absoluteScoreDelta: 99 } },
    { ...explanation, facts: { ...explanation.facts, tieTolerance: 99 } },
    { ...explanation, facts: { ...explanation.facts, confidenceA: 99 } },
    { ...explanation, comparisonRef: "comparison:missing" },
    { ...explanation, decisionRef: "decision:missing" },
    { ...explanation, factRefs: [{ kind: "score", ref: "score:unbacked" }] },
    { ...explanation, sourceRefs: [{ kind: "score", ref: "score:unbacked" }] },
    { ...explanation, summary: "Composition A is closer using declared score facts." },
    { ...explanation, summary: "A is the better design." },
    { ...explanation, recommendation: "choose A" },
    { ...explanation, unsupportedClaim: "creative correction" },
    { ...explanation, sourceRefs: [{ kind: "comparison" }] },
  ];
  for (const candidate of invalids) {
    assertFailedWithDiagnostic(
      validateStructuredExplanationV1(candidate, output.comparison, output.decision),
      "InvalidStructuredExplanationV1",
    );
  }
});

test("Comparison V1 validation rejects derived invariant and precedence violations", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const output = compare(evaluationA, evaluationB);
  const comparison = output.comparison;

  const hiddenMismatch = structuredClone(comparison);
  hiddenMismatch.contextChecks = [
    { ...hiddenMismatch.contextChecks[0], aValue: "A", bValue: "B", matches: true },
    ...hiddenMismatch.contextChecks.slice(1),
  ];

  const duplicateCheck = structuredClone(comparison);
  duplicateCheck.contextChecks = [duplicateCheck.contextChecks[0], ...duplicateCheck.contextChecks];

  const invalids = [
    { ...comparison, signedScoreDelta: 99 },
    { ...comparison, absoluteScoreDelta: 99 },
    duplicateCheck,
    hiddenMismatch,
    { ...comparison, status: "a_closer", scoreA: 0, scoreB: 1, signedScoreDelta: -1, absoluteScoreDelta: 1 },
    { ...comparison, status: "tie", limits: { ...comparison.limits, tieTolerance: 0 } },
    { ...comparison, status: "non_comparable" },
    { ...comparison, decisionRef: "decision:orphan" },
    { ...comparison, explanationRef: "explanation:orphan" },
    { ...comparison, scoreA: 2 },
    { ...comparison, confidenceA: -1 },
    { ...comparison, artifactRefs: [{ kind: "artifact", ref: "future" }] },
  ];

  for (const candidate of invalids) {
    assertFailedWithDiagnostic(validateComparisonV1(candidate), "InvalidComparisonV1");
  }
});

test("comparison provenance is complete, deterministic, and inputs are immutable", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const comparisonPolicy = policy();
  const beforeA = JSON.stringify(evaluationA);
  const beforeB = JSON.stringify(evaluationB);
  const beforePolicy = JSON.stringify(comparisonPolicy);

  const first = compare(
    deepFreeze(structuredClone(evaluationA)),
    deepFreeze(structuredClone(evaluationB)),
    deepFreeze(structuredClone(comparisonPolicy)),
  );
  const second = compare(structuredClone(evaluationA), structuredClone(evaluationB), structuredClone(comparisonPolicy));

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(evaluationA), beforeA);
  assert.equal(JSON.stringify(evaluationB), beforeB);
  assert.equal(JSON.stringify(comparisonPolicy), beforePolicy);
  assert.ok(first.comparison.provenance.inputRefs.some((ref) => ref.ref === evaluationA.evaluationRef));
  assert.ok(first.comparison.provenance.inputRefs.some((ref) => ref.ref === evaluationB.evaluationRef));
  assert.ok(first.comparison.provenance.inputRefs.some((ref) => ref.ref === comparisonPolicy.policyRef));
  assert.ok(first.decision.provenance.inputRefs.some((ref) => ref.ref === first.comparison.comparisonRef));
  assert.ok(first.structuredExplanation.provenance.inputRefs.some((ref) => ref.ref === first.decision.decisionRef));
});

test("PR9 outputs contain no recommendations, aesthetic claims, artifacts, rankings, or rendering payloads", () => {
  const { evaluationA, evaluationB } = generatedEvaluations();
  const output = compare(evaluationA, evaluationB);
  const serialized = JSON.stringify(output);

  for (const forbidden of [
    "better",
    "best",
    "beautiful",
    "aesthetic",
    "preferred",
    "winner",
    "recommendation",
    "optimize",
    "authorIntent",
    "CandidateRanking",
    "CandidateSet",
    "<svg",
    "rendering",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(output.comparison.artifactRefs, []);
});
