import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  BASIC_PROPORTIONS_PACK,
  COMPONENT_SCORE_V1_SCHEMA_VERSION,
  CONFIDENCE_V1_SCHEMA_VERSION,
  CORE_VERSION,
  EVALUATION_PROFILE_V1_SCHEMA_VERSION,
  EVALUATION_V1_COMPONENT_TYPES,
  EVALUATION_V1_SCHEMA_VERSION,
  MEASUREMENT_RESULT_V1_SCHEMA_VERSION,
  SCORE_V1_SCHEMA_VERSION,
  SURFACE_BASIC_THIRD_GRID_RULE_SET_ID,
  evaluateCompositionBasicV1,
  generateConstructionV1,
  measureGeometryV1,
  resolveRuleSetV1,
  validateEvaluationProfileV1,
  validateEvaluationV1,
  validateMeasurementResultV1,
  validateMeasurementV1,
} from "../dist/src/index.js";

const EPSILON = 1e-9;
const EVALUATION_OPERATION_VERSION = "0.1.0";
const PACK_REF = "norma.basic-proportions@0.1.0";
const PROFILE_REF = "evaluation-profile:basic-grid-alignment";

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
    geometryRefs: [
      { kind: "geometry-ref", geometryRef: "rect:inside", geometry: { kind: "rect", x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
      { kind: "geometry-ref", geometryRef: "rect:partial", geometry: { kind: "rect", x: 0.8, y: 0.8, width: 0.3, height: 0.3 } },
      { kind: "geometry-ref", geometryRef: "rect:outside", geometry: { kind: "rect", x: 1.2, y: 1.2, width: 0.2, height: 0.2 } },
      { kind: "geometry-ref", geometryRef: "rect:left", geometry: { kind: "rect", x: 0, y: 0, width: 0.75, height: 1 } },
      { kind: "geometry-ref", geometryRef: "rect:right", geometry: { kind: "rect", x: 0.25, y: 0, width: 0.75, height: 1 } },
    ],
    requests: evaluationRequests(construction),
    ...overrides,
  };
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
      requestRef: "containment:inside",
      measurementType: "containment",
      childRef: "rect:inside",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "containment:partial",
      measurementType: "containment",
      childRef: "rect:partial",
      parentRef: "surface:unit",
      tolerance: { kind: "measurement-tolerance", id: "exact", value: 0 },
    },
    {
      kind: "measurement-request",
      requestRef: "containment:outside",
      measurementType: "containment",
      childRef: "rect:outside",
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
      requestRef: "overlap:positive",
      measurementType: "overlap",
      sourceRef: "rect:left",
      targetRef: "rect:right",
      metric: "both",
    },
    {
      kind: "measurement-request",
      requestRef: "overlap:identical",
      measurementType: "overlap",
      sourceRef: "element:header",
      targetRef: "element:header",
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

function byComponent(evaluation, componentRef) {
  const componentScore = evaluation.componentScores.find((candidate) => candidate.componentRef === componentRef);
  assert.ok(componentScore, `component score missing: ${componentRef}`);
  return componentScore;
}

function warningCodes(value) {
  return value.warnings.map((warning) => warning.code);
}

function profileProvenance() {
  return {
    operationName: "core.evaluation-profile-v1.fixture",
    operationVersion: EVALUATION_OPERATION_VERSION,
    inputRefs: [{ kind: "evaluation-profile", ref: PROFILE_REF }],
    source: { kind: "test-fixture", ref: "tests/evaluation-v1.test.mjs" },
  };
}

function profileWithComponents(measurementResult, components, overrides = {}) {
  return {
    kind: "evaluation-profile",
    schemaVersion: EVALUATION_PROFILE_V1_SCHEMA_VERSION,
    profileRef: PROFILE_REF,
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
    sourceRefs: [{ kind: "evaluation-profile", ref: PROFILE_REF }],
    provenance: profileProvenance(),
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

function oneComponentProfile(measurementResult, component, overrides = {}) {
  return profileWithComponents(measurementResult, [component], overrides);
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

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

test("PR8 exports Evaluation V1 vocabulary and keeps PR9 APIs absent", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr8");
  assert.equal(EVALUATION_PROFILE_V1_SCHEMA_VERSION, "evaluation-profile-v1");
  assert.equal(EVALUATION_V1_SCHEMA_VERSION, "evaluation-v1");
  assert.equal(COMPONENT_SCORE_V1_SCHEMA_VERSION, "component-score-v1");
  assert.equal(SCORE_V1_SCHEMA_VERSION, "score-v1");
  assert.equal(CONFIDENCE_V1_SCHEMA_VERSION, "confidence-v1");
  assert.deepEqual(EVALUATION_V1_COMPONENT_TYPES, [
    "guide_proximity",
    "alignment",
    "containment",
    "overlap_penalty",
    "coverage_match",
    "area_ratio_match",
  ]);
  assert.equal(typeof evaluateCompositionBasicV1, "function");
  assert.equal(typeof validateEvaluationProfileV1, "function");
  assert.equal(typeof validateEvaluationV1, "function");
  for (const code of [
    "InvalidEvaluationProfileV1",
    "InvalidEvaluationV1",
    "MissingEvaluationMeasurement",
    "UnsupportedEvaluationComponent",
    "IncompatibleEvaluationMeasurement",
    "InvalidEvaluationWeights",
    "InvalidEvaluationThresholds",
  ]) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(code), code);
  }
  for (const forbiddenExport of [
    "compareCompositionsBasicV1",
    "CandidateRankingV1",
    "DecisionV1",
    "ExplanationV1",
    "RecommendationV1",
    "ArtifactV1",
  ]) {
    assert.equal(forbiddenExport in core, false, `${forbiddenExport} must remain out of PR8`);
  }
});

test("valid EvaluationProfile V1 declares six MVP components, weights, thresholds, and provenance", () => {
  const measurements = runMeasurements();
  const profile = basicProfile(measurements);
  const validation = validateEvaluationProfileV1(profile, measurements);
  assertOk(validation);
  assert.equal(validation.output.components.length, 6);
  assert.deepEqual(validation.output.components.map((component) => component.componentType), EVALUATION_V1_COMPONENT_TYPES);
  assertClose(validation.output.components.reduce((total, component) => total + component.weight, 0), 1);
  assert.equal(validation.output.statusThresholds.match, 0.9);
  assert.equal(validation.output.provenance.source.ref, "tests/evaluation-v1.test.mjs");

  const otherWeights = basicProfile(measurements, {
    profileRef: "evaluation-profile:coverage-heavy",
    components: basicProfile(measurements).components.map((component) => (
      component.componentRef === "component:coverage-match"
        ? { ...component, weight: 4 }
        : { ...component, weight: 1 }
    )),
  });
  assertOk(validateEvaluationProfileV1(otherWeights, measurements));
});

test("invalid EvaluationProfile V1 rejects closed-shape, weight, threshold, executable, and aesthetic failures", () => {
  const measurements = runMeasurements();
  const profile = basicProfile(measurements);

  const invalids = [
    [{ ...profile, components: [profile.components[0], structuredClone(profile.components[0])] }, "InvalidEvaluationProfileV1"],
    [{ ...profile, components: [{ ...profile.components[0], componentType: "beauty_score" }] }, "UnsupportedEvaluationComponent"],
    [{ ...profile, components: [{ ...profile.components[0], measurementRefs: ["measurement:unknown"] }] }, "MissingEvaluationMeasurement"],
    [{ ...profile, components: [{ ...profile.components[0], measurementType: "coverage" }] }, "IncompatibleEvaluationMeasurement"],
    [{ ...profile, components: [{ ...profile.components[0], weight: -1 }] }, "InvalidEvaluationWeights"],
    [{ ...profile, components: [{ ...profile.components[0], weight: Number.POSITIVE_INFINITY }] }, "InvalidEvaluationWeights"],
    [{ ...profile, components: profile.components.map((component) => ({ ...component, weight: 0 })) }, "InvalidEvaluationWeights"],
    [{ ...profile, components: [{ ...profile.components[0], scoring: { ...profile.components[0].scoring, tolerance: 0 } }] }, "InvalidEvaluationProfileV1"],
    [{ ...profile, statusThresholds: { ...profile.statusThresholds, match: 0.7, nearMatch: 0.8 } }, "InvalidEvaluationThresholds"],
    [{ ...profile, profileRef: "" }, "InvalidEvaluationProfileV1"],
    [{ ...profile, code: "return 1" }, "InvalidEvaluationProfileV1"],
    [{ ...profile, beauty: true }, "InvalidEvaluationProfileV1"],
    [{ ...profile, extra: true }, "InvalidEvaluationProfileV1"],
    [{
      ...profile,
      components: [{ ...profile.components[0], measurementRefs: [profile.components[0].measurementRefs[0], profile.components[0].measurementRefs[0]] }],
    }, "InvalidEvaluationProfileV1"],
  ];

  for (const [candidate, code] of invalids) {
    assertFailedWithDiagnostic(validateEvaluationProfileV1(candidate, measurements), code);
  }
});

test("guide proximity uses PR7 distance facts with a linear clamped tolerance formula", () => {
  const exactMeasurements = runMeasurements(compositionA());
  const offsetMeasurements = runMeasurements(compositionB());
  const offsetDistance = offsetMeasurements.measurements.find((measurement) => measurement.requestRef === "distance:main-left-third").result.normalizedDistance;

  const exact = evaluate(exactMeasurements, oneComponentProfile(exactMeasurements, componentDefinition(exactMeasurements)));
  assertClose(exact.componentScores[0].normalizedScore, 1);

  const boundaryComponent = componentDefinition(offsetMeasurements, {
    measurementRefs: [measurementRef(offsetMeasurements, "distance:main-left-third")],
    scoring: { kind: "linear-distance-tolerance", distanceBasis: "normalizedDistance", targetDistance: 0, tolerance: offsetDistance },
  });
  const boundary = evaluate(offsetMeasurements, oneComponentProfile(offsetMeasurements, boundaryComponent, { profileRef: "evaluation-profile:guide-boundary" }), { compositionRef: "composition:B" });
  assertClose(boundary.componentScores[0].normalizedScore, 0);

  const beyondComponent = componentDefinition(offsetMeasurements, {
    measurementRefs: [measurementRef(offsetMeasurements, "distance:main-left-third")],
    scoring: { kind: "linear-distance-tolerance", distanceBasis: "normalizedDistance", targetDistance: 0, tolerance: offsetDistance / 2 },
  });
  const beyond = evaluate(offsetMeasurements, oneComponentProfile(offsetMeasurements, beyondComponent, { profileRef: "evaluation-profile:guide-beyond" }), { compositionRef: "composition:B" });
  assertClose(beyond.componentScores[0].normalizedScore, 0);
  assert.equal(beyond.componentScores[0].rawValues.some((raw) => raw.key === "normalizedDistance" && raw.value === offsetDistance), true);
});

test("alignment scores from PR7 alignment deltas and handles ambiguous facts explicitly", () => {
  const exactMeasurements = runMeasurements(compositionA());
  const offsetMeasurements = runMeasurements(compositionB());
  const alignmentComponent = (measurements) => componentDefinition(measurements, {
    componentRef: "component:alignment",
    componentType: "alignment",
    measurementType: "alignment",
    measurementRefs: [measurementRef(measurements, "alignment:main-left-third")],
    scoring: { kind: "linear-alignment-tolerance", deltaBasis: "normalizedDelta", targetDelta: 0, tolerance: 0.04 },
    sourceRefs: [{ kind: "evaluation-component", ref: "component:alignment" }],
  });

  const exact = evaluate(exactMeasurements, oneComponentProfile(exactMeasurements, alignmentComponent(exactMeasurements)));
  assertClose(exact.componentScores[0].normalizedScore, 1);

  const outOfTolerance = evaluate(offsetMeasurements, oneComponentProfile(offsetMeasurements, alignmentComponent(offsetMeasurements)), { compositionRef: "composition:B" });
  assertClose(outOfTolerance.componentScores[0].normalizedScore, 0);

  const ambiguousMeasurements = structuredClone(exactMeasurements);
  ambiguousMeasurements.measurements.find((measurement) => measurement.requestRef === "alignment:main-left-third").result.alignmentStatus = "ambiguous";
  assertOk(validateMeasurementResultV1(ambiguousMeasurements));
  const ambiguous = evaluate(ambiguousMeasurements, oneComponentProfile(ambiguousMeasurements, alignmentComponent(ambiguousMeasurements)));
  assert.ok(warningCodes(ambiguous).includes("AmbiguousMeasurementUsed"));
  assert.ok(ambiguous.confidence.value < 1);
});

test("containment maps PR7 statuses by explicit profile policy", () => {
  const measurements = runMeasurements();
  const containmentScore = (requestRef) => {
    const component = componentDefinition(measurements, {
      componentRef: "component:containment",
      componentType: "containment",
      measurementType: "containment",
      measurementRefs: [measurementRef(measurements, requestRef)],
      scoring: {
        kind: "containment-status-map",
        statusScores: { inside: 1, on_boundary: 0.95, partially_outside: 0.25, outside: 0 },
      },
      sourceRefs: [{ kind: "evaluation-component", ref: "component:containment" }],
    });
    return evaluate(measurements, oneComponentProfile(measurements, component)).componentScores[0].normalizedScore;
  };

  assertClose(containmentScore("containment:inside"), 1);
  assertClose(containmentScore("containment:header-surface"), 0.95);
  assertClose(containmentScore("containment:partial"), 0.25);
  assertClose(containmentScore("containment:outside"), 0);
});

test("overlap penalty uses normalized PR7 overlap basis without recalculating intersections", () => {
  const measurements = runMeasurements();
  const overlapScore = (requestRef) => {
    const component = componentDefinition(measurements, {
      componentRef: "component:overlap-penalty",
      componentType: "overlap_penalty",
      measurementType: "overlap",
      measurementRefs: [measurementRef(measurements, requestRef)],
      scoring: { kind: "overlap-linear-penalty", overlapBasis: "maxOverlapRatio", tolerance: 1 },
      sourceRefs: [{ kind: "evaluation-component", ref: "component:overlap-penalty" }],
    });
    return evaluate(measurements, oneComponentProfile(measurements, component)).componentScores[0];
  };

  assertClose(overlapScore("overlap:side-main").normalizedScore, 1);
  assertClose(overlapScore("overlap:positive").normalizedScore, 1 / 3);
  assertClose(overlapScore("overlap:identical").normalizedScore, 0);
  assert.equal(overlapScore("overlap:positive").rawValues.some((raw) => raw.key === "maxOverlapRatio" && Math.abs(raw.value - 2 / 3) <= EPSILON), true);
});

test("coverage and area-ratio components use explicit targets and tolerances", () => {
  const exactMeasurements = runMeasurements(compositionA());
  const offsetMeasurements = runMeasurements(compositionB());

  const coverageComponent = (measurements) => componentDefinition(measurements, {
    componentRef: "component:coverage-match",
    componentType: "coverage_match",
    measurementType: "coverage",
    measurementRefs: [measurementRef(measurements, "coverage:composition")],
    scoring: { kind: "target-closeness", valueBasis: "coverageRatio", target: 1, tolerance: 0.25 },
    sourceRefs: [{ kind: "evaluation-component", ref: "component:coverage-match" }],
  });
  const ratioComponent = (measurements) => componentDefinition(measurements, {
    componentRef: "component:area-ratio-match",
    componentType: "area_ratio_match",
    measurementType: "ratio",
    measurementRefs: [measurementRef(measurements, "ratio:side-main")],
    scoring: { kind: "ratio-target-closeness", deltaBasis: "absoluteDelta", targetRatio: 0.5, tolerance: 0.1 },
    sourceRefs: [{ kind: "evaluation-component", ref: "component:area-ratio-match" }],
  });

  assertClose(evaluate(exactMeasurements, oneComponentProfile(exactMeasurements, coverageComponent(exactMeasurements))).componentScores[0].normalizedScore, 1);
  const offsetCoverage = offsetMeasurements.measurements.find((measurement) => measurement.requestRef === "coverage:composition").result.coverageRatio;
  const coverage = evaluate(offsetMeasurements, oneComponentProfile(offsetMeasurements, coverageComponent(offsetMeasurements)), { compositionRef: "composition:B" });
  assertClose(coverage.componentScores[0].normalizedScore, 1 - Math.abs(offsetCoverage - 1) / 0.25);

  assertClose(evaluate(exactMeasurements, oneComponentProfile(exactMeasurements, ratioComponent(exactMeasurements))).componentScores[0].normalizedScore, 1);
  const offsetRatioDelta = offsetMeasurements.measurements.find((measurement) => measurement.requestRef === "ratio:side-main").result.absoluteDelta;
  const ratio = evaluate(offsetMeasurements, oneComponentProfile(offsetMeasurements, ratioComponent(offsetMeasurements)), { compositionRef: "composition:B" });
  assertClose(ratio.componentScores[0].normalizedScore, 1 - offsetRatioDelta / 0.1);

  const invalidCoverage = structuredClone(exactMeasurements.measurements.find((measurement) => measurement.requestRef === "coverage:composition"));
  invalidCoverage.result.coverageRatio = 2;
  assertFailedWithDiagnostic(validateMeasurementV1(invalidCoverage), "InvalidMeasurementV1");
  assertFailedWithDiagnostic(validateEvaluationProfileV1(oneComponentProfile(exactMeasurements, {
    ...ratioComponent(exactMeasurements),
    scoring: { kind: "ratio-target-closeness", deltaBasis: "absoluteDelta", targetRatio: 0.5, tolerance: 0 },
  }), exactMeasurements), "InvalidEvaluationProfileV1");
});

test("weights normalize deterministically and drive overall score without order sensitivity", () => {
  const measurements = runMeasurements(compositionB());
  const profile = basicProfile(measurements);
  const evaluation = evaluate(measurements, profile, { compositionRef: "composition:B" });

  assertClose(evaluation.componentScores.reduce((total, component) => total + component.effectiveWeight, 0), 1);
  for (const component of evaluation.componentScores) {
    assertClose(component.weightedContribution, component.normalizedScore * component.effectiveWeight);
  }
  assertClose(evaluation.score.overallScore, evaluation.componentScores.reduce((total, component) => total + component.weightedContribution, 0));

  const coverageHeavy = basicProfile(measurements, {
    profileRef: "evaluation-profile:coverage-heavy",
    components: profile.components.map((component) => (
      component.componentRef === "component:coverage-match"
        ? { ...component, weight: 4 }
        : { ...component, weight: 1 }
    )),
  });
  const weightedDifferently = evaluate(measurements, coverageHeavy, { compositionRef: "composition:B" });
  assert.notEqual(weightedDifferently.score.overallScore, evaluation.score.overallScore);

  const reversed = basicProfile(measurements, { components: [...profile.components].reverse() });
  assert.deepEqual(evaluate(measurements, reversed, { compositionRef: "composition:B" }), evaluation);
});

test("missing measurements follow required-fail and optional-renormalize policy", () => {
  const measurements = runMeasurements();
  const profile = basicProfile(measurements);

  const missingRequired = basicProfile(measurements, {
    components: [{ ...profile.components[0], measurementRefs: ["measurement:missing"], required: true }],
  });
  assertFailedWithDiagnostic(evaluateCompositionBasicV1(evaluationInput(measurements, missingRequired)), "MissingEvaluationMeasurement");

  const optionalMissing = basicProfile(measurements, {
    components: [
      { ...profile.components[0], measurementRefs: ["measurement:missing"], required: false },
      profile.components[1],
    ],
  });
  const evaluation = evaluate(measurements, optionalMissing);
  assert.equal(evaluation.componentScores.length, 1);
  assertClose(evaluation.componentScores[0].effectiveWeight, 1);
  assert.ok(warningCodes(evaluation).includes("OptionalComponentMissing"));
  assert.ok(warningCodes(evaluation).includes("PartialEvaluation"));
  assert.ok(evaluation.confidence.value < 1);
  assert.equal(evaluation.score.measurementsUsed.includes("measurement:missing"), false);
});

test("status thresholds are inclusive and low confidence can make status ambiguous", () => {
  const measurements = runMeasurements(compositionB());
  const distance = measurements.measurements.find((measurement) => measurement.requestRef === "distance:main-left-third").result.normalizedDistance;
  const scoreWithTolerance = (targetScore) => {
    const component = componentDefinition(measurements, {
      measurementRefs: [measurementRef(measurements, "distance:main-left-third")],
      scoring: {
        kind: "linear-distance-tolerance",
        distanceBasis: "normalizedDistance",
        targetDistance: 0,
        tolerance: distance / (1 - targetScore),
      },
    });
    return evaluate(measurements, oneComponentProfile(measurements, component), { compositionRef: "composition:B" });
  };

  assert.equal(scoreWithTolerance(0.9).status, "match");
  assert.equal(scoreWithTolerance(0.75).status, "near_match");
  assert.equal(scoreWithTolerance(0.5).status, "weak_match");
  assert.equal(scoreWithTolerance(0.2).status, "no_match");

  const lowConfidenceProfile = profileWithComponents(measurements, [
    componentDefinition(measurements),
    componentDefinition(measurements, {
      componentRef: "component:missing-optional",
      measurementRefs: ["measurement:missing"],
      required: false,
      weight: 1,
      sourceRefs: [{ kind: "evaluation-component", ref: "component:missing-optional" }],
    }),
  ], {
    confidencePolicy: {
      kind: "evaluation-confidence-policy",
      highThreshold: 0.8,
      mediumThreshold: 0.5,
      optionalMissingPenalty: 1,
      ambiguousMeasurementPenalty: 0.2,
      warningPenalty: 0,
    },
    statusThresholds: {
      kind: "evaluation-status-thresholds",
      match: 0.9,
      nearMatch: 0.75,
      weakMatch: 0.5,
      minimumConfidenceForNormalStatus: 0.99,
    },
  });
  const lowConfidence = evaluate(measurements, lowConfidenceProfile, { compositionRef: "composition:B" });
  assert.equal(lowConfidence.status, "ambiguous");

  const invalidStatus = structuredClone(scoreWithTolerance(0.9));
  invalidStatus.status = "no_match";
  assertFailedWithDiagnostic(validateEvaluationV1(invalidStatus), "InvalidEvaluationV1");
});

test("confidence is separate from score and deterministic", () => {
  const measurements = runMeasurements();
  const profile = basicProfile(measurements);
  const high = evaluate(measurements, profile);
  assert.equal(high.confidence.status, "high");
  assertClose(high.confidence.value, 1);

  const optionalMissing = basicProfile(measurements, {
    components: [
      { ...profile.components[0], measurementRefs: ["measurement:missing"], required: false },
      profile.components[1],
    ],
  });
  const partial = evaluate(measurements, optionalMissing);
  assert.ok(partial.confidence.value < high.confidence.value);

  const ambiguousMeasurements = structuredClone(measurements);
  ambiguousMeasurements.measurements.find((measurement) => measurement.requestRef === "alignment:main-left-third").result.alignmentStatus = "ambiguous";
  const ambiguous = evaluate(ambiguousMeasurements, profile);
  assert.ok(ambiguous.confidence.value < high.confidence.value);

  const lowConfidenceHighScore = evaluate(ambiguousMeasurements, basicProfile(ambiguousMeasurements, {
    confidencePolicy: {
      kind: "evaluation-confidence-policy",
      highThreshold: 0.8,
      mediumThreshold: 0.5,
      optionalMissingPenalty: 0.15,
      ambiguousMeasurementPenalty: 0.9,
      warningPenalty: 0,
    },
    statusThresholds: {
      kind: "evaluation-status-thresholds",
      match: 0.9,
      nearMatch: 0.75,
      weakMatch: 0.5,
      minimumConfidenceForNormalStatus: 0,
    },
  }));
  assert.ok(lowConfidenceHighScore.score.overallScore > 0.9);
  assert.equal(lowConfidenceHighScore.confidence.status, "low");
  assert.ok(lowConfidenceHighScore.confidence.value >= 0 && lowConfidenceHighScore.confidence.value <= 1);
  assert.deepEqual(evaluate(ambiguousMeasurements, profile), ambiguous);
});

test("Evaluation V1 output is traceable, validates, and keeps PR9+ refs empty", () => {
  const measurements = runMeasurements();
  const profile = basicProfile(measurements);
  const evaluation = evaluate(measurements, profile);

  assert.equal(evaluation.kind, "evaluation");
  assert.equal(evaluation.schemaVersion, EVALUATION_V1_SCHEMA_VERSION);
  assert.equal(evaluation.compositionRef, "composition:A");
  assert.equal(evaluation.constructionRef, "construction:surface:unit:norma.basic-proportions@0.1.0:surface-basic-third-grid");
  assert.equal(evaluation.measurementResultRef, measurements.measurementResultRef);
  assert.equal(evaluation.profileRef, PROFILE_REF);
  assert.equal(evaluation.packRef, PACK_REF);
  assert.equal(evaluation.ruleSetRef, SURFACE_BASIC_THIRD_GRID_RULE_SET_ID);
  assert.equal(evaluation.score.componentScoreRefs.every((ref) => evaluation.componentScores.some((component) => component.componentScoreRef === ref.ref)), true);
  assert.equal(evaluation.confidence.confidenceRef.endsWith(":confidence"), true);
  assert.deepEqual(evaluation.comparisonRefs, []);
  assert.deepEqual(evaluation.decisionRefs, []);
  assert.deepEqual(evaluation.explanationRefs, []);
  assert.deepEqual(evaluation.artifactRefs, []);
  assert.equal(evaluation.provenance.inputRefs.some((ref) => ref.kind === "measurement-result"), true);
  assert.equal(evaluation.componentScores.every((component) => component.provenance.inputRefs.some((ref) => ref.kind === "evaluation-component")), true);
});

test("evaluation is deterministic and does not mutate profile or measurement inputs", () => {
  const measurements = runMeasurements(compositionB());
  const profile = basicProfile(measurements);
  const measurementBefore = JSON.stringify(measurements);
  const profileBefore = JSON.stringify(profile);

  const frozenMeasurements = deepFreeze(structuredClone(measurements));
  const frozenProfile = deepFreeze(structuredClone(profile));
  const first = evaluate(frozenMeasurements, frozenProfile, { compositionRef: "composition:B" });
  const second = evaluate(structuredClone(measurements), structuredClone(profile), { compositionRef: "composition:B" });

  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(measurements), measurementBefore);
  assert.equal(JSON.stringify(profile), profileBefore);
});

test("closed Evaluation V1 validation rejects orphan refs, inconsistent invariants, and populated PR9+ refs", () => {
  const measurements = runMeasurements();
  const evaluation = evaluate(measurements, basicProfile(measurements));

  const cases = [
    { ...evaluation, extra: true },
    { ...evaluation, componentScores: [{ ...evaluation.componentScores[0], extra: true }] },
    { ...evaluation, componentScores: [evaluation.componentScores[0], evaluation.componentScores[0]] },
    { ...evaluation, componentScores: [{ ...evaluation.componentScores[0], measurementRefs: ["measurement:unknown"] }] },
    { ...evaluation, componentScores: [{ ...evaluation.componentScores[0], weightedContribution: 99 }] },
    { ...evaluation, score: { ...evaluation.score, overallScore: 99 } },
    { ...evaluation, confidence: { ...evaluation.confidence, value: 2 } },
    { ...evaluation, status: "no_match" },
    { ...evaluation, sourceRefs: [{ kind: "evaluation" }] },
    { ...evaluation, provenance: { ...evaluation.provenance, operationName: "" } },
    { ...evaluation, comparisonRefs: [{ kind: "comparison", ref: "future" }] },
    { ...evaluation, decisionRefs: [{ kind: "decision", ref: "future" }] },
    { ...evaluation, explanationRefs: [{ kind: "explanation", ref: "future" }] },
    { ...evaluation, artifactRefs: [{ kind: "artifact", ref: "future" }] },
    { ...evaluation, componentScores: [], score: { ...evaluation.score, componentScoreRefs: [] } },
    { ...evaluation, profileRef: "" },
    { ...evaluation, measurementResultRef: "" },
  ];

  for (const candidate of cases) {
    assertFailedWithDiagnostic(validateEvaluationV1(candidate), "InvalidEvaluationV1");
  }
});

test("Evaluation V1 contains no beauty claims, recommendations, decisions, rankings, or artifacts", () => {
  const measurements = runMeasurements();
  const evaluation = evaluate(measurements, basicProfile(measurements));
  const serialized = JSON.stringify(evaluation);

  for (const forbidden of [
    "beauty",
    "aesthetic",
    "best",
    "better",
    "preferred",
    "winner",
    "recommendation",
    "authorIntent",
    "Decision",
    "Explanation",
    "CandidateRanking",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(evaluation.artifactRefs, []);
});
