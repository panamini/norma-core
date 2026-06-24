import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const requiredNegativeCaseIds = [
  "MissingPackLock",
  "MissingEvaluationProfile",
  "DifferentTolerancesForComparison",
  "BeautyScoreRequested",
  "RatioAbsentFromPack",
  "MissingRule",
  "ImplicitPackRejected",
  "MismatchContext",
  "ArtifactAsSourceRejected",
];

const forbiddenDecisionTerms = [
  "better",
  "best",
  "beautiful",
  "more beautiful",
  "meilleure",
  "plus belle",
  "recommended",
  "preferred",
  "creative recommendation",
  "intended design",
];

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

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

function caseById(result, caseId) {
  const negativeCase = result.output.negativeCaseResults.find((candidate) => candidate.caseId === caseId);
  assert.ok(negativeCase, caseId);
  return negativeCase;
}

function assertNegativeCase(result, caseId, expectedDiagnostic, expectedStatus = "failed") {
  const negativeCase = caseById(result, caseId);
  assert.equal(negativeCase.pass, true, caseId);
  assert.equal(negativeCase.actualStatus, expectedStatus, caseId);
  assert.ok(negativeCase.actualDiagnostics.includes(expectedDiagnostic), `${caseId}: ${negativeCase.actualDiagnostics.join(", ")}`);
}

function assertNoForbiddenDecisionLanguage(value) {
  const serialized = JSON.stringify(value).toLowerCase();
  for (const term of forbiddenDecisionTerms) {
    assert.equal(serialized.includes(term), false, term);
  }
}

function assertUniqueRefs(refs) {
  const uniqueRefs = new Set(refs.map((ref) => `${ref.kind}:${ref.ref}`));
  assert.equal(uniqueRefs.size, refs.length);
}

function requiredOutput(result, label) {
  assertOk(result);
  assert.ok(result.output, label);
  return result.output;
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

function r3SourceRefs({ caseId, surface, ratioPack, ruleSetRef, evaluationProfile, tolerancePolicy, evaluationTolerances }) {
  return [
    { kind: "mvp-demo-input", ref: `${caseId}:structured-input` },
    { kind: "surface", ref: surface.id },
    { kind: "ratio-pack", ref: ratioPackRef(ratioPack) },
    { kind: "rule-set", ref: ruleSetRef },
    { kind: "evaluation-profile", ref: evaluationProfile.id },
    { kind: "tolerance-policy", ref: tolerancePolicy.id },
    { kind: "evaluation-tolerances", ref: evaluationTolerances.id },
    { kind: "coordinate-system", ref: surface.coordinateSystem.id },
    { kind: "metric-policy", ref: surface.metricPolicy.id },
  ];
}

function r3ArtifactOptions(baseOptions, caseId) {
  const options = structuredClone(baseOptions);
  for (const [key, option] of Object.entries(options)) {
    option.id = `${caseId}:${option.artifactType}:${key}`;
  }
  return options;
}

function createR3MvpDemoInput(caseId, { width, height, compositionAElements, compositionBElements }) {
  const base = core.createMvpDemoInput();
  const coordinateSystem = {
    ...structuredClone(base.surface.coordinateSystem),
    id: `${caseId}:2d-metric`,
  };
  const metricPolicy = {
    ...structuredClone(base.surface.metricPolicy),
    id: `${caseId}:pixel-length-policy`,
  };
  const tolerancePolicy = {
    ...structuredClone(base.tolerancePolicy),
    id: `${caseId}:tolerance-policy`,
  };
  const evaluationTolerances = {
    ...structuredClone(base.evaluationTolerances),
    id: `${caseId}:evaluation-tolerances`,
  };
  const surface = {
    ...structuredClone(base.surface),
    id: `surface:${caseId}:${width}x${height}`,
    coordinateSystem,
    metricPolicy,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width, height },
  };
  const ratioPack = structuredClone(base.ratioPack);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  }), `${caseId}:pack-lock`);
  const sourceRefs = r3SourceRefs({
    caseId,
    surface,
    ratioPack,
    ruleSetRef: base.ruleSetRef,
    evaluationProfile: base.evaluationProfile,
    tolerancePolicy,
    evaluationTolerances,
  });
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.MVP_DEMO_OPERATION_NAME,
    operationVersion: core.MVP_DEMO_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: coordinateSystem,
    metricPolicy,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { mvpDemoHarness: true, [`${caseId}:explicit`]: true },
    sourceRefs,
  }), `${caseId}:operation-context`);

  return {
    ...base,
    surface,
    ratioPack,
    packRef: ratioPackRef(ratioPack),
    packLock,
    packLockRef: packLock.ref,
    compositionA: {
      kind: "composition-2d",
      id: `composition:${caseId}:A`,
      coordinateSystem,
      metricPolicy,
      tolerancePolicy,
      surface,
      elements: compositionAElements,
    },
    compositionB: {
      kind: "composition-2d",
      id: `composition:${caseId}:B`,
      coordinateSystem,
      metricPolicy,
      tolerancePolicy,
      surface,
      elements: compositionBElements,
    },
    tolerancePolicy,
    evaluationTolerances,
    operationContext,
    operationContextRef: operationContext.ref,
    artifactOptions: r3ArtifactOptions(base.artifactOptions, caseId),
    sourceRefs,
  };
}

function createR3CaseAInput() {
  return createR3MvpDemoInput("r3-case-a", {
    width: 900,
    height: 600,
    compositionAElements: [
      { kind: "element", id: "case-a-left-panel", geometry: { kind: "rect", x: 0, y: 0, width: 300, height: 600 } },
      { kind: "element", id: "case-a-middle-panel", geometry: { kind: "rect", x: 300, y: 0, width: 300, height: 600 } },
      { kind: "element", id: "case-a-right-panel", geometry: { kind: "rect", x: 600, y: 0, width: 300, height: 600 } },
    ],
    compositionBElements: [
      { kind: "element", id: "case-a-wide-panel", geometry: { kind: "rect", x: 0, y: 0, width: 520, height: 600 } },
      { kind: "element", id: "case-a-offset-panel", geometry: { kind: "rect", x: 500, y: 0, width: 250, height: 600 } },
    ],
  });
}

function createR3CaseBInput() {
  return createR3MvpDemoInput("r3-case-b", {
    width: 600,
    height: 900,
    compositionAElements: [
      { kind: "element", id: "case-b-wide-panel", geometry: { kind: "rect", x: 0, y: 0, width: 420, height: 900 } },
      { kind: "element", id: "case-b-offset-panel", geometry: { kind: "rect", x: 390, y: 0, width: 150, height: 900 } },
    ],
    compositionBElements: [
      { kind: "element", id: "case-b-left-panel", geometry: { kind: "rect", x: 0, y: 0, width: 200, height: 900 } },
      { kind: "element", id: "case-b-middle-panel", geometry: { kind: "rect", x: 200, y: 0, width: 200, height: 900 } },
      { kind: "element", id: "case-b-right-panel", geometry: { kind: "rect", x: 400, y: 0, width: 200, height: 900 } },
    ],
  });
}

function assertHasRef(refs, kind, ref) {
  assert.ok(refs.some((candidate) => candidate.kind === kind && candidate.ref === ref), `${kind}:${ref}`);
}

function assertNoExactCanonicalFixtureRefs(value) {
  const serialized = core.serializeCanonicalJson(value);
  for (const ref of [
    "surface:1200x800",
    "composition:A",
    "composition:B",
    "left-third",
    "middle-third",
    "right-third",
    "wide-left",
    "offset-right",
  ]) {
    assert.equal(serialized.includes(JSON.stringify(ref)), false, ref);
  }
}

function thirdGuidePosition(result) {
  const guide = result.output.constructionResult.output.guides.find((candidate) => (
    candidate.axis === "x" && candidate.ratioRef === "1/3"
  ));
  assert.ok(guide, "x third guide");
  return guide.position;
}

function assertR3CaseResult(result, expected) {
  assertOk(result);
  const demo = result.output;
  assert.equal(demo.inputSummary.surfaceRef, expected.surfaceRef);
  assert.deepEqual(demo.inputSummary.surfaceSize, expected.surfaceSize);
  assert.deepEqual(demo.inputSummary.compositionRefs, expected.compositionRefs);
  assert.equal(demo.constructionResult.output.sourceGeometryRef.ref, expected.surfaceRef);
  assert.equal(demo.constructionResult.output.id, expected.constructionRef);
  assert.equal(thirdGuidePosition(result), expected.thirdGuidePosition);
  assertHasRef(demo.measurementAResult.output.sourceGeometryRefs, "composition-2d", expected.compositionRefs[0]);
  assertHasRef(demo.measurementBResult.output.sourceGeometryRefs, "composition-2d", expected.compositionRefs[1]);
  assertHasRef(demo.runEnvelope.input.sourceRefs, "mvp-demo-input", expected.inputRef);
  assertHasRef(demo.runEnvelope.input.sourceRefs, "surface", expected.surfaceRef);
  assertHasRef(demo.outputRefs, "construction", expected.constructionRef);
  assert.equal(demo.evaluationAResult.output.score.value, expected.scoreA);
  assert.equal(demo.evaluationBResult.output.score.value, expected.scoreB);
  assert.equal(demo.comparisonResult.output.status, expected.comparisonStatus);
  assert.equal(demo.comparisonResult.output.decision.selectedEvaluationRef, expected.selectedEvaluationRef);
  assert.equal(demo.runEnvelope.replayReadinessStatus, "ready");
  assertNoExactCanonicalFixtureRefs(demo);
}

test("PR12 exports the MVP demo harness while PR21 owns verifyRun and PR22 owns replayRun", () => {
  assert.equal(core.CORE_VERSION, "0.1.0-pr12");
  assert.equal(typeof core.createMvpDemoInput, "function");
  assert.equal(typeof core.runMvpDemo, "function");
  assert.deepEqual(core.MVP_DEMO_OPERATION_SEQUENCE, [
    "validate-lock-pack",
    "resolve-rule-set",
    "generate-construction",
    "measure-composition-a",
    "measure-composition-b",
    "evaluate-composition-a",
    "evaluate-composition-b",
    "compare-evaluations",
    "generate-explanation",
    "generate-structured-artifacts",
    "generate-simple-visual-artifact",
    "wrap-run",
    "produce-demo-report",
    "execute-negative-cases",
  ]);
  assert.equal(typeof core.replayRun, "function");
  assert.equal(typeof core.verifyRun, "function");
  assert.equal(typeof core.verifyArtifactFreshness, "function");
});

test("PR12 runs the deterministic structured MVP demo truth path", () => {
  const input = core.createMvpDemoInput();

  assert.equal(input.surface.bounds.width, 1200);
  assert.equal(input.surface.bounds.height, 800);
  assert.equal(input.ratioPack.id, "norma.basic-proportions");
  assert.equal(input.packLock.packId, "norma.basic-proportions");
  assert.equal(input.ruleSetRef, "surface-basic-third-grid");
  assert.equal(input.evaluationProfile.id, "basic-grid-alignment");
  assert.equal(input.tolerancePolicy.id, "mvp-demo-tolerance-policy");
  assert.equal(input.evaluationTolerances.id, "mvp-demo-evaluation-tolerances");
  assert.equal(input.operationContext.kind, "operation-context");
  assert.equal(input.operationContextRef.id, input.operationContext.ref.id);

  const result = core.runMvpDemo(input);
  assertOk(result);

  const demo = result.output;
  assert.equal(demo.kind, "mvp-demo-result");
  assert.deepEqual(demo.warnings, result.warnings);
  assert.deepEqual(demo.errors, result.errors);
  assert.deepEqual(demo.outputRefs, result.outputRefs);
  assert.equal(demo.packLock.ref.id, result.packLockRef.id);
  assert.equal(demo.operationContext.ref.id, result.operationContextRef.id);
  assert.equal(demo.runEnvelope.kind, "run");
  assert.equal(demo.runEnvelope.packLockRef.id, demo.packLock.ref.id);
  assert.equal(demo.runEnvelope.operationContextRef.id, demo.operationContext.ref.id);
  assert.ok(["ready", "ready_with_warnings"].includes(demo.runEnvelope.replayReadinessStatus));

  assert.equal(demo.constructionResult.output.guides.length, 6);
  assert.equal(demo.constructionResult.output.zones.length, 6);
  assert.equal(demo.constructionResult.output.grid.cells.length, 9);
  assert.equal(demo.constructionResult.output.diagonals.length, 2);
  assert.ok(demo.constructionResult.output.intersections.length >= 22);

  assert.equal(demo.measurementAResult.output.compositions.length, 1);
  assert.equal(demo.measurementBResult.output.compositions.length, 1);
  assert.equal(demo.evaluationAResult.output.compositionLabel, "A");
  assert.equal(demo.evaluationBResult.output.compositionLabel, "B");
  assert.equal(demo.evaluationAResult.output.profileRef, demo.evaluationBResult.output.profileRef);
  assert.equal(demo.evaluationAResult.output.packLockRef, demo.packLock.ref.id);
  assert.equal(demo.evaluationBResult.output.packLockRef, demo.packLock.ref.id);
  assert.ok(demo.evaluationAResult.output.score.value > demo.evaluationBResult.output.score.value);

  assert.equal(demo.comparisonResult.output.status, "a_closer");
  assert.equal(demo.comparisonResult.output.decision.summary, "A is closer to the declared system");
  assertNoForbiddenDecisionLanguage(demo.comparisonResult.output.decision);
  assert.equal(demo.explanationResult.kind, "explanation");
  assert.ok(demo.explanationResult.sourceEvaluationRefs.includes(demo.evaluationAResult.output.id));
  assert.ok(demo.explanationResult.sourceMeasurementRefs.length > 0);

  assert.ok(demo.artifactResults.structuredResults.length >= 1);
  assert.equal(demo.visualArtifactResult.output.artifactType, "simple-visual");
  assert.equal(demo.visualArtifactResult.output.derived, true);
  assert.ok(demo.visualArtifactResult.output.descriptor.guides.length > 0);
  assert.equal(demo.demoReport.visualArtifactDerived, true);
  assert.equal(demo.demoReport.truthOrder.indexOf("structured-outputs") < demo.demoReport.truthOrder.indexOf("simple-visual-artifact"), true);
  assert.equal(demo.demoReport.truthSource, "structured-core-objects");
  assert.equal(demo.demoReport.noPostMvpSurfaces, true);
  assert.deepEqual(demo.demoReport.operationSequence, core.MVP_DEMO_OPERATION_SEQUENCE);
  assert.deepEqual(demo.demoReport.negativeCaseSummary.map((item) => item.caseId), requiredNegativeCaseIds);
});

test("PR12 keeps output refs, statuses, report, and negative cases deterministic", () => {
  const input = core.createMvpDemoInput();
  const first = core.runMvpDemo(input);
  const second = core.runMvpDemo(input);

  assertOk(first);
  assertOk(second);
  assert.deepEqual(first.outputRefs, second.outputRefs);
  assertUniqueRefs(first.outputRefs);
  assertUniqueRefs(first.output.runEnvelope.outputRefs.refs);
  assert.equal(first.output.runEnvelope.id, second.output.runEnvelope.id);
  assert.equal(first.output.comparisonResult.output.status, second.output.comparisonResult.output.status);
  assert.deepEqual(first.output.demoReport, second.output.demoReport);
  assert.deepEqual(
    first.output.negativeCaseResults.map((negativeCase) => [negativeCase.caseId, negativeCase.actualStatus, negativeCase.actualDiagnostics]),
    second.output.negativeCaseResults.map((negativeCase) => [negativeCase.caseId, negativeCase.actualStatus, negativeCase.actualDiagnostics]),
  );
});

test("PR12 exposes controlled negative cases without hiding warnings or errors", () => {
  const result = core.runMvpDemo(core.createMvpDemoInput());
  assertOk(result);

  assertNegativeCase(result, "MissingPackLock", "MissingPackLock");
  assertNegativeCase(result, "MissingEvaluationProfile", "MissingEvaluationProfile");
  assertNegativeCase(result, "DifferentTolerancesForComparison", "NonComparableEvaluations", "non_comparable");
  assertNegativeCase(result, "BeautyScoreRequested", "BeautyScoreRejected");
  assertNegativeCase(result, "RatioAbsentFromPack", "MissingRatioReference");
  assertNegativeCase(result, "MissingRule", "MissingRuleDeclaration");
  assertNegativeCase(result, "ImplicitPackRejected", "ImplicitPackNotAllowed");
  assertNegativeCase(result, "MismatchContext", "NonComparableEvaluations", "non_comparable");
  assertNegativeCase(result, "ArtifactAsSourceRejected", "ArtifactWouldBecomeSourceOfTruth");

  for (const negativeCase of result.output.negativeCaseResults) {
    assert.ok(Array.isArray(negativeCase.warnings), negativeCase.caseId);
    assert.ok(Array.isArray(negativeCase.errors), negativeCase.caseId);
    assert.deepEqual(
      negativeCase.actualDiagnostics,
      [...negativeCase.errors, ...negativeCase.warnings].map((diagnostic) => diagnostic.code),
      negativeCase.caseId,
    );
  }
});

test("PR12 simple visual artifact is derived and cannot mutate source objects", () => {
  const result = core.runMvpDemo(core.createMvpDemoInput());
  assertOk(result);

  const constructionBefore = structuredClone(result.output.constructionResult.output);
  result.output.visualArtifactResult.output.descriptor.guides[0].position = -1;

  assert.deepEqual(result.output.constructionResult.output, constructionBefore);
  assert.equal(result.output.visualArtifactResult.output.sourceConstructionRef.ref, constructionBefore.id);
  assert.equal(result.output.visualArtifactResult.output.derived, true);
});

test("PR12 rejects implicit or prompt-like demo inputs instead of choosing hidden defaults", () => {
  const missingInput = core.runMvpDemo(null);
  assertStructuredResult(missingInput);
  assert.equal(missingInput.status, "failed");
  assert.ok(diagnosticCodes(missingInput).includes("InvalidInputShape"));

  const promptInput = core.runMvpDemo({ freeFormPrompt: "make the layout look good" });
  assertStructuredResult(promptInput);
  assert.equal(promptInput.status, "failed");
  assert.ok(diagnosticCodes(promptInput).includes("FreeFormPromptNotAllowed"));
});

test("PR12 rejects inconsistent supplied pack locks and operation context refs", () => {
  const validInput = core.createMvpDemoInput();
  const wrongPackLock = {
    ...validInput.packLock,
    packId: "other-pack",
    ref: { id: "pack-lock:other-pack" },
  };
  const wrongPackLockResult = core.runMvpDemo({
    ...validInput,
    packLock: wrongPackLock,
    packLockRef: wrongPackLock.ref,
  });

  assertStructuredResult(wrongPackLockResult);
  assert.equal(wrongPackLockResult.status, "failed");
  assert.ok(diagnosticCodes(wrongPackLockResult).includes("InvalidPackLock"));

  const wrongContextRefResult = core.runMvpDemo({
    ...validInput,
    operationContextRef: { id: "operation-context:wrong" },
  });

  assertStructuredResult(wrongContextRefResult);
  assert.equal(wrongContextRefResult.status, "failed");
  assert.ok(diagnosticCodes(wrongContextRefResult).includes("InvalidOperationContext"));
});

test("R3 runs non-canonical structured MVP inputs end-to-end", () => {
  const canonical = core.runMvpDemo(core.createMvpDemoInput());
  const caseA = core.runMvpDemo(createR3CaseAInput());
  const caseB = core.runMvpDemo(createR3CaseBInput());

  assertOk(canonical);
  assertR3CaseResult(caseA, {
    inputRef: "r3-case-a:structured-input",
    surfaceRef: "surface:r3-case-a:900x600",
    surfaceSize: { width: 900, height: 600 },
    compositionRefs: ["composition:r3-case-a:A", "composition:r3-case-a:B"],
    constructionRef: "construction:surface:r3-case-a:900x600:surface-basic-third-grid",
    thirdGuidePosition: 300,
    scoreA: 0.8444444444444444,
    scoreB: 0.4568055555555555,
    comparisonStatus: "a_closer",
    selectedEvaluationRef: "evaluation:A:basic-grid-alignment",
  });
  assertR3CaseResult(caseB, {
    inputRef: "r3-case-b:structured-input",
    surfaceRef: "surface:r3-case-b:600x900",
    surfaceSize: { width: 600, height: 900 },
    compositionRefs: ["composition:r3-case-b:A", "composition:r3-case-b:B"],
    constructionRef: "construction:surface:r3-case-b:600x900:surface-basic-third-grid",
    thirdGuidePosition: 200,
    scoreA: 0.4950694444444445,
    scoreB: 0.8444444444444444,
    comparisonStatus: "b_closer",
    selectedEvaluationRef: "evaluation:B:basic-grid-alignment",
  });
  assert.notEqual(core.serializeCanonicalJson(caseA.output), core.serializeCanonicalJson(canonical.output));
  assert.notEqual(core.serializeCanonicalJson(caseB.output), core.serializeCanonicalJson(canonical.output));
  assert.notEqual(core.serializeCanonicalJson(caseA.output), core.serializeCanonicalJson(caseB.output));
});

test("R3 keeps non-canonical structured MVP inputs deterministic", () => {
  for (const input of [createR3CaseAInput(), createR3CaseBInput()]) {
    const first = core.runMvpDemo(input);
    const second = core.runMvpDemo(input);

    assertOk(first);
    assertOk(second);
    assert.deepEqual(first.outputRefs, second.outputRefs);
    assert.equal(first.output.runEnvelope.id, second.output.runEnvelope.id);
    assert.equal(core.serializeCanonicalJson(first.output), core.serializeCanonicalJson(second.output));
  }
});

test("R3 rejects invalid non-canonical structured MVP input deterministically", () => {
  const invalidInput = createR3CaseAInput();
  invalidInput.compositionA.elements[1].id = invalidInput.compositionA.elements[0].id;
  const first = core.runMvpDemo(invalidInput);
  const second = core.runMvpDemo(invalidInput);

  assertStructuredResult(first);
  assertStructuredResult(second);
  assert.equal(first.status, "failed");
  assert.equal(first.output, null);
  assert.deepEqual(first.outputRefs, []);
  assert.ok(diagnosticCodes(first).includes("DuplicateGeometrySourceId"));
  assert.deepEqual(
    first.errors.map((error) => [error.code, error.targetRef]),
    [["DuplicateGeometrySourceId", "composition.elements.1.id"]],
  );
  assert.equal(core.serializeCanonicalJson(first), core.serializeCanonicalJson(second));
});
