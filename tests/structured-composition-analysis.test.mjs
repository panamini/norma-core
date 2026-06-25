import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

function requiredOutput(result, label) {
  assert.equal(result.status, "ok", label);
  assert.ok(result.output, label);
  return result.output;
}

function ratioPackRef(pack) {
  return `${pack.id}@${pack.version}`;
}

function r3SourceRefs({ caseId, surface, ratioPack, ruleSetRef, evaluationProfile, tolerancePolicy, evaluationTolerances }) {
  return [
    { kind: "structured-analysis-input", ref: `${caseId}:structured-input` },
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

function createR3MvpInput(caseId, { width, height, compositionAElements, compositionBElements }) {
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
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: coordinateSystem,
    metricPolicy,
    tolerancePolicy,
    roundingPolicy: base.operationContext.roundingPolicy.value,
    numericPolicy: base.operationContext.numericPolicy.value,
    orderingPolicy: base.operationContext.orderingPolicy.value,
    featureFlags: { structuredAnalyzeHarness: true, [`${caseId}:explicit`]: true },
    sourceRefs,
  }), `${caseId}:operation-context`);

  return {
    surface,
    ratioPack,
    packLock,
    ruleSetRef: base.ruleSetRef,
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
    evaluationProfile: base.evaluationProfile,
    tolerancePolicy,
    evaluationTolerances,
    comparisonTolerances: {
      ...structuredClone(base.comparisonTolerances),
      id: `${caseId}:comparison-tolerances`,
    },
    operationContext,
  };
}

function sourceIdsForComposition(composition) {
  return [
    composition.id,
    composition.surface.id,
    ...composition.elements.map((element) => element.id),
    ...(composition.anchors ?? []).map((anchor) => anchor.id),
    ...composition.elements.flatMap((element) => (element.anchors ?? []).map((anchor) => anchor.id)),
  ];
}

function acceptedSourceIds(compositionA, compositionB) {
  return [...new Set([
    ...sourceIdsForComposition(compositionA),
    ...sourceIdsForComposition(compositionB),
  ])].sort((first, second) => first.localeCompare(second));
}

function structuredInputFromR3(caseId, r3Input, acceptedAt = "2026-06-25T00:00:00Z") {
  const acceptedIds = acceptedSourceIds(r3Input.compositionA, r3Input.compositionB);
  const acceptance = {
    accepted: true,
    mode: "user_supplied_structured_data",
    acceptedBy: "test-caller",
    acceptedAt,
    acceptedSourceIds: acceptedIds,
    acceptanceRecordId: `acceptance:${caseId}`,
  };

  return {
    contractVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION,
    analysisId: `analysis:${caseId}`,
    compositionA: r3Input.compositionA,
    compositionB: r3Input.compositionB,
    acceptance,
    ratioPack: r3Input.ratioPack,
    packLock: r3Input.packLock,
    ruleSetRef: r3Input.ruleSetRef,
    evaluationProfile: r3Input.evaluationProfile,
    evaluationTolerances: r3Input.evaluationTolerances,
    comparisonTolerances: r3Input.comparisonTolerances,
    tolerancePolicy: r3Input.tolerancePolicy,
    operationContext: r3Input.operationContext,
    provenance: {
      kind: "structured-composition-analysis-provenance",
      sourceKind: "user_supplied_structured_data",
      externalSourceRef: { kind: "test-fixture", ref: caseId },
      callerSourceIds: acceptedIds,
      adapter: null,
      mappingVersion: "r6b-test-mapping-v1",
      normalizationVersion: null,
      transformationSteps: [],
      acceptanceRecord: acceptance,
      operationContextRef: r3Input.operationContext.ref,
    },
  };
}

function createR3CaseAInput() {
  return structuredInputFromR3("r3-case-a", createR3MvpInput("r3-case-a", {
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
  }));
}

function createR3CaseBInput() {
  return structuredInputFromR3("r3-case-b", createR3MvpInput("r3-case-b", {
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
  }));
}

function assertValid(result) {
  assert.equal(result.status, "valid");
  assert.equal(result.kind, "structured-composition-analysis-result");
  assert.equal(result.operationName, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME);
  assert.equal(result.operationVersion, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION);
  assert.equal(result.errors.length, 0);
  assert.ok(result.measurements);
  assert.ok(result.evaluations);
  assert.ok(result.comparison);
  assert.ok(result.decision);
  assert.ok(result.outputRefs.length > 0);
  assert.ok(result.replayReadiness.run);
}

function assertInvalid(result, expectedDiagnosticCode) {
  assert.equal(result.status, "invalid");
  assert.deepEqual(result.outputRefs, []);
  assert.equal(result.measurements, null);
  assert.equal(result.evaluations, null);
  assert.equal(result.comparison, null);
  assert.equal(result.decision, null);
  assert.equal(result.replayReadiness, null);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === expectedDiagnosticCode), expectedDiagnosticCode);
}

test("R6B analyzes explicit structured Case A as a_closer", () => {
  const result = core.analyzeStructuredCompositionV1(createR3CaseAInput());

  assertValid(result);
  assert.equal(result.evaluations.a.score.value, 0.8444444444444444);
  assert.equal(result.evaluations.b.score.value, 0.4568055555555555);
  assert.equal(result.comparison.status, "a_closer");
  assert.equal(result.decision.selectedEvaluationRef, "evaluation:A:basic-grid-alignment");
  assert.equal(result.replayReadiness.status, "ready");
  assert.equal(result.replayReadiness.run.operationName, core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME);
});

test("R6B analyzes explicit structured Case B as b_closer", () => {
  const result = core.analyzeStructuredCompositionV1(createR3CaseBInput());

  assertValid(result);
  assert.equal(result.evaluations.a.score.value, 0.4950694444444445);
  assert.equal(result.evaluations.b.score.value, 0.8444444444444444);
  assert.equal(result.comparison.status, "b_closer");
  assert.equal(result.decision.selectedEvaluationRef, "evaluation:B:basic-grid-alignment");
  assert.equal(result.replayReadiness.status, "ready");
});

test("R6B is deterministic and acceptedAt is metadata only", () => {
  const input = createR3CaseAInput();
  const before = core.serializeCanonicalJson(input);
  const first = core.analyzeStructuredCompositionV1(input);
  const second = core.analyzeStructuredCompositionV1(input);
  const changedAcceptedAt = structuredClone(input);
  changedAcceptedAt.acceptance.acceptedAt = "2026-06-25T01:02:03Z";
  changedAcceptedAt.provenance.acceptanceRecord = changedAcceptedAt.acceptance;
  const third = core.analyzeStructuredCompositionV1(changedAcceptedAt);

  assertValid(first);
  assertValid(second);
  assertValid(third);
  assert.equal(core.serializeCanonicalJson(input), before);
  assert.deepEqual(first.outputRefs, second.outputRefs);
  assert.equal(first.replayReadiness.run.id, second.replayReadiness.run.id);
  assert.equal(first.serializationSummary.meaningfulIdentity, second.serializationSummary.meaningfulIdentity);
  assert.deepEqual(first.outputRefs, third.outputRefs);
  assert.equal(first.replayReadiness.run.id, third.replayReadiness.run.id);
  assert.equal(first.serializationSummary.meaningfulIdentity, third.serializationSummary.meaningfulIdentity);
});

test("R6B rejects duplicate structured geometry ids before downstream outputs", () => {
  const input = createR3CaseAInput();
  input.compositionA = {
    ...input.compositionA,
    elements: input.compositionA.elements.map((element, index) => (
      index === 1 ? { ...element, id: input.compositionA.elements[0].id } : element
    )),
  };

  const result = core.analyzeStructuredCompositionV1(input);

  assertInvalid(result, "DuplicateGeometrySourceId");
});

test("R6B rejects missing acceptance and source-id mismatches", () => {
  const falseAcceptance = createR3CaseAInput();
  falseAcceptance.acceptance = { ...falseAcceptance.acceptance, accepted: false };
  falseAcceptance.provenance.acceptanceRecord = falseAcceptance.acceptance;
  assertInvalid(core.analyzeStructuredCompositionV1(falseAcceptance), "InvalidInputShape");

  const sourceMismatch = createR3CaseAInput();
  sourceMismatch.acceptance = {
    ...sourceMismatch.acceptance,
    acceptedSourceIds: sourceMismatch.acceptance.acceptedSourceIds.slice(1),
  };
  sourceMismatch.provenance.acceptanceRecord = sourceMismatch.acceptance;
  assertInvalid(core.analyzeStructuredCompositionV1(sourceMismatch), "InvalidInputShape");
});

test("R6B rejects incoherent pack locks and unknown rule sets", () => {
  const badLock = createR3CaseAInput();
  badLock.packLock = {
    ...badLock.packLock,
    contentIdentity: "changed-content-identity",
  };
  assertInvalid(core.analyzeStructuredCompositionV1(badLock), "InvalidPackLock");

  const missingRuleSet = createR3CaseAInput();
  missingRuleSet.ruleSetRef = "missing-rule-set";
  assertInvalid(core.analyzeStructuredCompositionV1(missingRuleSet), "MissingRuleSet");
});

test("R6B rejects hidden operation-context defaults", () => {
  const input = createR3CaseAInput();
  input.operationContext = {
    ...input.operationContext,
    roundingPolicy: {
      ...input.operationContext.roundingPolicy,
      explicit: false,
    },
  };

  const result = core.analyzeStructuredCompositionV1(input);

  assertInvalid(result, "HiddenOutputChangingDefault");
});
