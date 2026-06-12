import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const evaluationDiagnosticCodes = [
  "MissingMeasurements",
  "MissingEvaluationProfile",
  "MissingPack",
  "MissingPackLock",
  "MissingTolerances",
  "MissingTolerancePolicy",
  "BeautyScoreRejected",
  "IntentInferenceRejected",
];

const expectedProfileComponents = [
  "guide_proximity",
  "alignment",
  "containment",
  "overlap_penalty",
  "coverage_match",
  "area_ratio_match",
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
  id: "evaluation-tolerance-policy",
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
  assert.equal(result.errors.length, 0);
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

function measureGeometrySet() {
  const result = core.measureGeometry({
    construction: generateMvpConstruction(),
    compositionA,
    compositionB,
    operationContextRef: { id: "context:measurement" },
    requestedOutputs: ["measurements"],
  });

  assertOk(result);
  return result.output;
}

function baseEvaluationInput(compositionLabel = "A", overrides = {}) {
  return {
    measurements: measureGeometrySet(),
    compositionLabel,
    profile: core.BASIC_GRID_ALIGNMENT_PROFILE,
    pack: core.BASIC_PROPORTIONS_PACK,
    packPreLock: core.BASIC_PROPORTIONS_PACK.preLock,
    tolerancePolicy,
    tolerances: evaluationTolerances,
    operationContextRef: { id: "context:evaluation" },
    requestedOutputs: ["evaluation"],
    sourceReferences: [{ kind: "test", ref: "evaluation-input" }],
    ...overrides,
  };
}

function cloneProfile(overrides = {}) {
  return {
    ...structuredClone(core.BASIC_GRID_ALIGNMENT_PROFILE),
    ...overrides,
  };
}

function assertEvaluationShape(evaluation, compositionLabel) {
  assert.equal(evaluation.kind, "evaluation");
  assert.equal(evaluation.profileRef, "evaluation-profile:basic-grid-alignment");
  assert.equal(evaluation.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(evaluation.packPreLockRef, core.BASIC_PROPORTIONS_PACK.preLock.ref);
  assert.equal(evaluation.compositionLabel, compositionLabel);
  assert.deepEqual(
    evaluation.componentScores.map((component) => component.componentId),
    expectedProfileComponents,
  );
  assert.equal(evaluation.score.kind, "minimal-score");
  assert.equal(typeof evaluation.score.value, "number");
  assert.ok(evaluation.score.measurementSourceRefs.length > 0);
  assert.equal("confidence" in evaluation.score, false);
  assert.equal(evaluation.confidence.kind, "confidence");
  assert.equal(typeof evaluation.confidence.value, "number");
  assert.ok(evaluation.confidence.value >= 0);
  assert.ok(evaluation.confidence.value <= 1);
  assert.ok(evaluation.measurementRefs.length > 0);
  assertNoForbiddenPr8Fields(evaluation);

  for (const component of evaluation.componentScores) {
    assert.equal(component.kind, "component-score");
    assert.equal(typeof component.value, "number");
    assert.ok(component.measurementSourceRefs.length > 0, component.componentId);
    assert.ok(["match", "near_match", "weak_match", "no_match", "ambiguous"].includes(component.status));
  }
}

function assertNoForbiddenPr8Fields(value) {
  const forbiddenTerms = ["comparison", "decision", "recommendation", "ranking", "beauty", "intent", "optimization", "artifact"];
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== "object") {
      continue;
    }

    for (const [key, child] of Object.entries(current)) {
      const normalizedKey = key.toLowerCase();
      for (const term of forbiddenTerms) {
        assert.equal(normalizedKey.includes(term), false, `forbidden PR8 field: ${key}`);
      }
      stack.push(child);
    }
  }
}

test("PR8 exports evaluation vocabulary, diagnostics, profile, helper, and version", () => {
  assert.equal(core.CORE_VERSION, "0.1.0-pr8");

  for (const diagnosticCode of evaluationDiagnosticCodes) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(diagnosticCode), diagnosticCode);
  }

  assert.equal(typeof core.evaluateCompositionBasic, "function");
  assert.equal(core.BASIC_GRID_ALIGNMENT_PROFILE.kind, "evaluation-profile");
  assert.equal(core.BASIC_GRID_ALIGNMENT_PROFILE.id, "basic-grid-alignment");
  assert.equal(core.BASIC_GRID_ALIGNMENT_PROFILE.allowMinimalScore, true);
  assert.deepEqual(
    core.BASIC_GRID_ALIGNMENT_PROFILE.components.map((component) => component.id),
    expectedProfileComponents,
  );

  for (const forbiddenField of ["ratios", "rules", "measurements", "decision", "comparison"]) {
    assert.equal(forbiddenField in core.BASIC_GRID_ALIGNMENT_PROFILE, false);
  }
});

test("PR8 evaluates A and B separately without comparison or decision output", () => {
  const evaluationA = core.evaluateCompositionBasic(baseEvaluationInput("A"));
  const evaluationB = core.evaluateCompositionBasic(baseEvaluationInput("B"));

  assertOk(evaluationA);
  assertOk(evaluationB);
  assertEvaluationShape(evaluationA.output, "A");
  assertEvaluationShape(evaluationB.output, "B");
  assert.notEqual(evaluationA.output.id, evaluationB.output.id);
  assert.ok(["match", "near_match"].includes(evaluationA.output.status));
  assert.ok(evaluationA.output.score.value > evaluationB.output.score.value);
});

test("PR8 minimal score uses EvaluationProfile component weights", () => {
  const weightedProfile = cloneProfile({
    components: core.BASIC_GRID_ALIGNMENT_PROFILE.components.map((component) => ({
      ...structuredClone(component),
      weight: component.id === "guide_proximity" ? 10 : 1,
    })),
  });
  const result = core.evaluateCompositionBasic(baseEvaluationInput("A", { profile: weightedProfile }));

  assertOk(result);
  const componentScores = result.output.componentScores;
  const totalWeight = weightedProfile.components.reduce((sum, component) => sum + component.weight, 0);
  const expectedWeightedScore = componentScores.reduce((sum, componentScore) => {
    const component = weightedProfile.components.find((candidate) => candidate.id === componentScore.componentId);
    assert.ok(component);
    return sum + (componentScore.value * component.weight);
  }, 0) / totalWeight;

  assert.equal(result.output.score.value, expectedWeightedScore);
});

test("PR8 rejects missing required evaluation inputs with structured diagnostics", () => {
  assertFailedWithDiagnostic(core.evaluateCompositionBasic(null), "MissingMeasurements");
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { measurements: undefined })),
    "MissingMeasurements",
  );
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { profile: undefined })),
    "MissingEvaluationProfile",
  );
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { pack: undefined })),
    "MissingPack",
  );
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { packPreLock: undefined, packLock: undefined })),
    "MissingPackLock",
  );
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { tolerances: undefined })),
    "MissingTolerances",
  );
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { tolerancePolicy: undefined })),
    "MissingTolerancePolicy",
  );
});

test("PR8 rejects beauty score and intention inference requests", () => {
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { requestedOutputs: ["beauty-score"] })),
    "BeautyScoreRejected",
  );
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { requestedOutputs: ["intent-inference"] })),
    "IntentInferenceRejected",
  );
});

test("PR8 rejects invalid profiles that exceed evaluation scope", () => {
  for (const profile of [
    cloneProfile({ ratios: [{ id: "golden" }] }),
    cloneProfile({ rules: [{ id: "new-rule" }] }),
    cloneProfile({ measurements: [{ id: "new-measurement" }] }),
    cloneProfile({ hiddenTolerances: { guideProximity: 0.1 } }),
    cloneProfile({ requestedOutputs: ["comparison"] }),
    cloneProfile({ requestedOutputs: ["decision"] }),
    cloneProfile({ requestedOutputs: ["ranking"] }),
    cloneProfile({ requestedOutputs: ["recommendation"] }),
    cloneProfile({ requestedOutputs: ["beauty-score"] }),
    cloneProfile({ requestedOutputs: ["intent-inference"] }),
  ]) {
    const result = core.evaluateCompositionBasic(baseEvaluationInput("A", { profile }));
    assert.equal(result.status, "failed");
    assert.ok(result.errors.length > 0);
  }
});

test("PR8 rejects profiles without limits", () => {
  const profile = cloneProfile();
  delete profile.limits;

  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { profile })),
    "InvalidInputShape",
  );
});

test("PR8 rejects profiles with incoherent PR8 limits", () => {
  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", {
      profile: cloneProfile({
        limits: {
          ...structuredClone(core.BASIC_GRID_ALIGNMENT_PROFILE.limits),
          noBeautyScore: false,
        },
      }),
    })),
    "InvalidInputShape",
  );
});

test("PR8 rejects profiles without structured provenance", () => {
  const profile = cloneProfile();
  delete profile.provenance;

  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { profile })),
    "InvalidInputShape",
  );
});

test("PR8 rejects profile measurement sources that are absent from PR7 measurements", () => {
  const profile = cloneProfile({
    components: [
      {
        ...structuredClone(core.BASIC_GRID_ALIGNMENT_PROFILE.components[0]),
        measurementSources: [{ measurementType: "distance", metric: "missing-distance" }],
      },
      ...structuredClone(core.BASIC_GRID_ALIGNMENT_PROFILE.components.slice(1)),
    ],
  });

  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic(baseEvaluationInput("A", { profile })),
    "MissingMeasurements",
  );
});

test("PR8 rejects score production when measurement source refs are missing", () => {
  const input = baseEvaluationInput("A");
  const measurements = structuredClone(input.measurements);
  const composition = measurements.compositions.find((candidate) => candidate.label === "A");
  assert.ok(composition);

  composition.measurements = composition.measurements.map((measurement) => ({
    ...measurement,
    inputRefs: [],
    provenance: { ...measurement.provenance, inputRefs: [], sourceRefs: [] },
  }));

  assertFailedWithDiagnostic(
    core.evaluateCompositionBasic({ ...input, measurements }),
    "MissingMeasurements",
  );
});
