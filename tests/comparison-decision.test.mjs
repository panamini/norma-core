import assert from "node:assert/strict";
import test from "node:test";
import * as core from "../dist/src/index.js";

const comparisonDiagnosticCodes = [
  "MissingComparisonInput",
  "MissingEvaluation",
  "InvalidComparisonInput",
  "NonComparableEvaluations",
  "AmbiguousComparison",
  "TieComparison",
  "BeautyDecisionRejected",
  "IntentInferenceRejected",
  "ComparisonExplanationMissingSource",
];

const sharedContextRefs = [
  { kind: "surface", ref: "surface:1200x800" },
  { kind: "coordinate-system", ref: "norma-canonical-2d-metric" },
  { kind: "metric-policy", ref: "pixel-length-policy" },
  { kind: "evaluation-tolerances", ref: "explicit-evaluation-tolerances" },
  { kind: "tolerance-policy", ref: "evaluation-tolerance-policy" },
  { kind: "operation-context", ref: "context:evaluation" },
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
  assert.equal(result.errors.length, 0);
  assert.ok(result.output);
}

function assertFailedWithDiagnostic(result, diagnosticCode) {
  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes(diagnosticCode), diagnosticCodes(result).join(", "));
  assert.equal(result.output, null);
}

function sourceRef(kind, refs) {
  return refs.find((ref) => ref.kind === kind);
}

function makeEvaluation(label, scoreValue, overrides = {}) {
  const id = overrides.id ?? `evaluation:${label}:basic-grid-alignment`;
  const measurementRefs = overrides.measurementRefs ?? [
    { kind: "measurement", ref: `measurement:${label}:alignment` },
    { kind: "measurement", ref: `measurement:${label}:coverage` },
  ];
  const inputRefs = overrides.inputRefs ?? [
    { kind: "measurement-set", ref: "measurement-set:construction:mvp" },
    { kind: "evaluation-profile", ref: "basic-grid-alignment" },
    { kind: "ratio-pack", ref: "norma.basic-proportions@0.1.0" },
    { kind: "pack-lock-prelock", ref: "prelock:norma.basic-proportions@0.1.0" },
    ...sharedContextRefs,
  ];
  const provenance = {
    kind: "evaluation-provenance",
    evaluationRef: id,
    operationRef: "core.evaluation.basic.evaluate@0.1.0",
    inputRefs,
    sourceRefs: measurementRefs,
  };
  const componentScores = [
    {
      kind: "component-score",
      id: `component-score:${label}:alignment`,
      componentId: "alignment",
      status: scoreValue >= 0.75 ? "near_match" : "weak_match",
      value: scoreValue,
      measurementSourceRefs: measurementRefs.slice(0, 1),
      warnings: [],
      provenance,
    },
    {
      kind: "component-score",
      id: `component-score:${label}:coverage_match`,
      componentId: "coverage_match",
      status: scoreValue >= 0.75 ? "near_match" : "weak_match",
      value: scoreValue,
      measurementSourceRefs: measurementRefs.slice(1, 2),
      warnings: [],
      provenance,
    },
  ];
  return {
    kind: "evaluation",
    id,
    profileRef: overrides.profileRef ?? "evaluation-profile:basic-grid-alignment",
    packRef: overrides.packRef ?? "norma.basic-proportions@0.1.0",
    packLockRef: overrides.packLockRef ?? null,
    packPreLockRef: overrides.packPreLockRef ?? "prelock:norma.basic-proportions@0.1.0",
    compositionLabel: label,
    measurementRefs,
    componentScores,
    score: Object.hasOwn(overrides, "score") ? overrides.score : {
      kind: "minimal-score",
      id: `minimal-score:${id}`,
      value: scoreValue,
      derivedFromComponentRefs: componentScores.map((component) => component.id),
      measurementSourceRefs: measurementRefs,
      provenance,
    },
    confidence: {
      kind: "confidence",
      id: `confidence:${id}`,
      value: 1,
      factors: {
        componentCoverage: 1,
        measurementSourceCoverage: 1,
        warningPenalty: 0,
        ambiguityPenalty: 0,
      },
      measurementSourceRefs: measurementRefs,
      provenance,
    },
    status: scoreValue >= 0.75 ? "near_match" : "weak_match",
    warnings: [],
    provenance,
    ...overrides.evaluationOverrides,
  };
}

function baseComparisonInput(overrides = {}) {
  return {
    evaluationA: makeEvaluation("A", 0.92),
    evaluationB: makeEvaluation("B", 0.64),
    tieTolerance: 0.01,
    operationContextRef: { id: "context:evaluation" },
    requestedOutputs: ["comparison", "decision", "explanation"],
    ...overrides,
  };
}

function assertNoForbiddenDecisionLanguage(value) {
  const forbiddenTerms = ["better", "best", "beautiful", "meilleur", "plus beau", "recommended", "recommendation", "preferred"];
  const serialized = JSON.stringify(value).toLowerCase();
  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, term);
  }
}

test("PR9 exports comparison vocabulary, diagnostics, helper, and version", () => {
  assert.equal(core.CORE_VERSION, "0.1.0-pr10");
  assert.equal(typeof core.compareCompositionsBasic, "function");
  for (const diagnosticCode of comparisonDiagnosticCodes) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(diagnosticCode), diagnosticCode);
  }
});

test("PR9 selects A or B only as closer to the declared system", () => {
  const aCloser = core.compareCompositionsBasic(baseComparisonInput());
  assertOk(aCloser);
  assert.equal(aCloser.output.kind, "comparison");
  assert.equal(aCloser.output.status, "a_closer");
  assert.equal(aCloser.output.decision.kind, "decision");
  assert.equal(aCloser.output.decision.status, "a_closer");
  assert.equal(aCloser.output.decision.selectedEvaluationRef, "evaluation:A:basic-grid-alignment");
  assert.equal(aCloser.output.decision.summary, "A is closer to the declared system");
  assert.equal(aCloser.output.explanation.kind, "explanation");
  assert.ok(aCloser.output.explanation.sourceEvaluationRefs.includes("evaluation:A:basic-grid-alignment"));
  assert.ok(aCloser.output.explanation.sourceMeasurementRefs.length > 0);
  assert.ok(aCloser.output.explanation.componentDeltas.length > 0);
  assert.equal(aCloser.output.scoreDelta > 0, true);
  assertNoForbiddenDecisionLanguage(aCloser.output);

  const bCloser = core.compareCompositionsBasic(baseComparisonInput({
    evaluationA: makeEvaluation("A", 0.52),
    evaluationB: makeEvaluation("B", 0.88),
  }));
  assertOk(bCloser);
  assert.equal(bCloser.output.status, "b_closer");
  assert.equal(bCloser.output.decision.selectedEvaluationRef, "evaluation:B:basic-grid-alignment");
  assert.equal(bCloser.output.decision.summary, "B is closer to the declared system");
  assertNoForbiddenDecisionLanguage(bCloser.output);
});

test("PR9 treats scores inside explicit tie tolerance as tie", () => {
  const result = core.compareCompositionsBasic(baseComparisonInput({
    evaluationA: makeEvaluation("A", 0.812),
    evaluationB: makeEvaluation("B", 0.808),
    tieTolerance: 0.01,
  }));
  assertOk(result);
  assert.equal(result.output.status, "tie");
  assert.equal(result.output.decision.selectedEvaluationRef, null);
  assert.equal(result.output.decision.summary, "tie");
  assert.ok(diagnosticCodes(result).includes("TieComparison"));
});

test("PR9 returns ambiguous when required shared-context proof or explanation sources are missing", () => {
  const missingSurfaceRefs = sharedContextRefs.filter((ref) => ref.kind !== "surface");
  const result = core.compareCompositionsBasic(baseComparisonInput({
    evaluationA: makeEvaluation("A", 0.92, {
      inputRefs: [
        { kind: "measurement-set", ref: "measurement-set:construction:mvp" },
        { kind: "evaluation-profile", ref: "basic-grid-alignment" },
        { kind: "ratio-pack", ref: "norma.basic-proportions@0.1.0" },
        { kind: "pack-lock-prelock", ref: "prelock:norma.basic-proportions@0.1.0" },
        ...missingSurfaceRefs,
      ],
    }),
  }));
  assertOk(result);
  assert.equal(result.output.status, "ambiguous");
  assert.equal(result.output.decision.selectedEvaluationRef, null);
  assert.equal(result.output.decision.summary, "ambiguous");
  assert.ok(diagnosticCodes(result).includes("AmbiguousComparison"));

  const missingMeasurementSources = core.compareCompositionsBasic(baseComparisonInput({
    evaluationA: makeEvaluation("A", 0.92, { measurementRefs: [] }),
  }));
  assertOk(missingMeasurementSources);
  assert.equal(missingMeasurementSources.output.status, "ambiguous");
  assert.ok(diagnosticCodes(missingMeasurementSources).includes("ComparisonExplanationMissingSource"));

  const missingMinimalScore = core.compareCompositionsBasic(baseComparisonInput({
    evaluationA: makeEvaluation("A", 0.92, { score: null }),
  }));
  assertOk(missingMinimalScore);
  assert.equal(missingMinimalScore.output.status, "ambiguous");
  assert.equal(missingMinimalScore.output.decision.selectedEvaluationRef, null);
  assert.ok(diagnosticCodes(missingMinimalScore).includes("AmbiguousComparison"));
});

test("PR9 returns non_comparable when shared context differs", () => {
  const mismatches = [
    { field: "packRef", overrides: { packRef: "other-pack@0.1.0" } },
    { field: "packPreLockRef", overrides: { packPreLockRef: "prelock:other-pack@0.1.0" } },
    { field: "profileRef", overrides: { profileRef: "evaluation-profile:other" } },
    {
      field: "evaluation-tolerances",
      overrides: {
        inputRefs: sharedContextRefs.map((ref) => (
          ref.kind === "evaluation-tolerances" ? { kind: ref.kind, ref: "other-tolerances" } : ref
        )),
      },
    },
    {
      field: "surface",
      overrides: {
        inputRefs: sharedContextRefs.map((ref) => (
          ref.kind === "surface" ? { kind: ref.kind, ref: "surface:other" } : ref
        )),
      },
    },
    {
      field: "coordinate-system",
      overrides: {
        inputRefs: sharedContextRefs.map((ref) => (
          ref.kind === "coordinate-system" ? { kind: ref.kind, ref: "coordinate:other" } : ref
        )),
      },
    },
    {
      field: "metric-policy",
      overrides: {
        inputRefs: sharedContextRefs.map((ref) => (
          ref.kind === "metric-policy" ? { kind: ref.kind, ref: "metric:other" } : ref
        )),
      },
    },
    {
      field: "operation-context",
      overrides: {
        inputRefs: sharedContextRefs.map((ref) => (
          ref.kind === "operation-context" ? { kind: ref.kind, ref: "context:other" } : ref
        )),
      },
    },
  ];

  for (const { field, overrides } of mismatches) {
    const inputRefs = overrides.inputRefs === undefined
      ? undefined
      : [
          { kind: "measurement-set", ref: "measurement-set:construction:mvp" },
          { kind: "evaluation-profile", ref: "basic-grid-alignment" },
          { kind: "ratio-pack", ref: "norma.basic-proportions@0.1.0" },
          { kind: "pack-lock-prelock", ref: "prelock:norma.basic-proportions@0.1.0" },
          ...overrides.inputRefs,
        ];
    const result = core.compareCompositionsBasic(baseComparisonInput({
      evaluationB: makeEvaluation("B", 0.64, { ...overrides, inputRefs }),
    }));
    assertOk(result);
    assert.equal(result.output.status, "non_comparable", field);
    assert.equal(result.output.decision.selectedEvaluationRef, null);
    assert.equal(result.output.decision.summary, "non comparable");
    assert.ok(diagnosticCodes(result).includes("NonComparableEvaluations"), field);
  }
});

test("PR9 rejects missing inputs, invalid tie policy, beauty, and intent requests", () => {
  assertFailedWithDiagnostic(core.compareCompositionsBasic(null), "MissingComparisonInput");
  assertFailedWithDiagnostic(
    core.compareCompositionsBasic(baseComparisonInput({ evaluationA: null })),
    "MissingEvaluation",
  );
  assertFailedWithDiagnostic(
    core.compareCompositionsBasic(baseComparisonInput({ tieTolerance: undefined })),
    "MissingComparisonInput",
  );
  assertFailedWithDiagnostic(
    core.compareCompositionsBasic(baseComparisonInput({ tieTolerance: -1 })),
    "InvalidComparisonInput",
  );
  assertFailedWithDiagnostic(
    core.compareCompositionsBasic(baseComparisonInput({ requestedOutputs: ["beauty-decision"] })),
    "BeautyDecisionRejected",
  );
  assertFailedWithDiagnostic(
    core.compareCompositionsBasic(baseComparisonInput({ requestedOutputs: ["intent-inference"] })),
    "IntentInferenceRejected",
  );
});
