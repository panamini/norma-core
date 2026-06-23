import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  CORE_VERSION,
  MVP_DEMO_OPERATION_VERSION_V1,
  MVP_DEMO_REQUESTED_OUTPUTS_V1,
  MVP_DEMO_TRACE_OPERATION_ORDER_V1,
  MVP_DEMO_V1_SCHEMA_VERSION,
  assessReplayReadinessV1,
  createCanonicalMvpDemoInputV1,
  validateMvpDemoInputV1,
  validateMvpDemoResultV1,
  runMvpDemoV1,
} from "../dist/src/index.js";

const EXPECTED_CONSTRUCTION_COUNTS = {
  guides: 4,
  zones: 6,
  grids: 1,
  cells: 9,
  intersections: 12,
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

function runCanonical() {
  const input = createCanonicalMvpDemoInputV1();
  const result = runMvpDemoV1(input);
  assertOk(result);
  assertOk(validateMvpDemoResultV1(structuredClone(result.output)));
  return { input, result: result.output };
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

function allTraceOutputRefs(result) {
  return result.trace.entries.flatMap((entry) => entry.outputRefs.map((ref) => `${ref.kind}:${ref.ref}`));
}

test("PR12 exports MVP demo API, final rail version, and closed diagnostics", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr12");
  assert.equal(MVP_DEMO_V1_SCHEMA_VERSION, "mvp-demo-v1");
  assert.equal(MVP_DEMO_OPERATION_VERSION_V1, "0.1.0");
  assert.deepEqual(MVP_DEMO_REQUESTED_OUTPUTS_V1, [
    "construction",
    "measurements",
    "evaluations",
    "comparison",
    "decision",
    "explanation",
    "structured-artifacts",
    "visual-artifact",
    "run",
    "replay-readiness-report",
  ]);
  assert.deepEqual(MVP_DEMO_TRACE_OPERATION_ORDER_V1, [
    "validateMvpDemoInputV1",
    "validateRatioPackV1",
    "validatePackLockV1",
    "validateGeometryV1",
    "resolveRuleSetV1",
    "generateConstructionV1",
    "measureGeometryV1:A",
    "measureGeometryV1:B",
    "evaluateCompositionBasicV1:A",
    "evaluateCompositionBasicV1:B",
    "compareCompositionsBasicV1",
    "deriveComparisonDecisionExplanationV1",
    "deriveRunRefV1",
    "createStructuredResultArtifactV1",
    "createConstructionSummaryArtifactV1",
    "createEvaluationReportArtifactV1",
    "createExplanationArtifactV1",
    "createSimpleVisualArtifactV1",
    "createRunV1",
    "assessReplayReadinessV1",
    "validateMvpDemoResultV1",
  ]);
  for (const exported of [
    createCanonicalMvpDemoInputV1,
    validateMvpDemoInputV1,
    runMvpDemoV1,
    validateMvpDemoResultV1,
  ]) {
    assert.equal(typeof exported, "function");
  }
  for (const code of [
    "InvalidMvpDemoInputV1",
    "InvalidMvpDemoResultV1",
    "MissingMvpDemoDependency",
    "UnsupportedMvpDemoRequest",
    "BeautyScoreRequested",
  ]) {
    assert.ok(core.CORE_DIAGNOSTIC_CODES.includes(code), code);
  }
  for (const forbiddenExport of [
    "PR13",
    "MvpDemoCli",
    "runMvpDemoCli",
    "createMvpDemoServer",
    "createMvpDemoApi",
    "createMvpDemoMcp",
    "replayRun",
    "replayRunV1",
    "beautyScore",
  ]) {
    assert.equal(forbiddenExport in core, false, forbiddenExport);
  }
});

test("canonical factory returns a complete explicit, independent, valid input", () => {
  const first = createCanonicalMvpDemoInputV1();
  const second = createCanonicalMvpDemoInputV1();

  assert.notEqual(first, second);
  assert.notEqual(first.pack, second.pack);
  assert.notEqual(first.packLock, second.packLock);
  assert.notEqual(first.evaluationProfiles.a, second.evaluationProfiles.a);
  assert.deepEqual(first, second);

  assert.equal(first.kind, "mvp-demo-input");
  assert.equal(first.schemaVersion, "mvp-demo-v1");
  assert.equal(first.demoName, "Surface proportionnelle évaluée");
  assert.equal(first.surface.id, "surface:unit");
  assert.equal(first.surface.bounds.width, 1);
  assert.equal(first.metricPolicy.width, 1200);
  assert.equal(first.metricPolicy.height, 800);
  assert.equal(first.metricPolicy.unit, "px");
  assert.equal(first.pack.id, "norma.basic-proportions");
  assert.equal(first.packLock.packRef, "norma.basic-proportions@0.1.0");
  assert.equal(first.ruleSetRef, "surface-basic-third-grid");
  assert.equal(first.compositions.a.id, "composition:A");
  assert.equal(first.compositions.b.id, "composition:B");
  assert.equal(first.measurementRequests.a.length, first.measurementRequests.b.length);
  assert.equal(first.evaluationProfiles.a.profileRef, "evaluation-profile:basic-grid-alignment");
  assert.equal(first.evaluationProfiles.b.profileRef, "evaluation-profile:basic-grid-alignment");
  assert.deepEqual(first.evaluationProfiles.a.components.map((component) => component.weight), [
    0.30,
    0.25,
    0.15,
    0.15,
    0.10,
    0.05,
  ]);
  assert.equal(first.comparisonPolicy.policyRef, "comparison-policy:basic-score-delta");
  assert.equal(first.operationContext.operation, "runMvpDemoV1");
  assert.equal(first.operationVersions.demo, "0.1.0");
  assert.deepEqual(first.requestedOutputs, MVP_DEMO_REQUESTED_OUTPUTS_V1);
  assert.equal(first.artifactOptions.simpleVisual.format, "svg");
  assert.equal(first.featureFlags["artifact.simpleVisual"], true);

  assertOk(validateMvpDemoInputV1(first));

  first.compositions.a.elements[0].geometry.x = 0.123;
  assert.equal(second.compositions.a.elements[0].geometry.x, 0);
});

test("canonical success path assembles the full PR4-PR11 chain and validates deeply", () => {
  const { input, result } = runCanonical();

  assert.equal(result.kind, "mvp-demo-result");
  assert.equal(result.schemaVersion, "mvp-demo-v1");
  assert.equal(result.demoName, "Surface proportionnelle évaluée");
  assert.equal(result.status, "ok");
  assert.equal(result.surface.id, input.surface.id);
  assert.equal(result.packLock.lockRef, input.packLock.lockRef);
  assert.equal(result.ruleResolution.ruleSetRef, "surface-basic-third-grid");
  assert.equal(result.construction.guides.length, EXPECTED_CONSTRUCTION_COUNTS.guides);
  assert.equal(result.construction.zones.length, EXPECTED_CONSTRUCTION_COUNTS.zones);
  assert.equal(result.construction.grids.length, EXPECTED_CONSTRUCTION_COUNTS.grids);
  assert.equal(result.construction.grids[0].cells.length, EXPECTED_CONSTRUCTION_COUNTS.cells);
  assert.equal(result.construction.intersections.length, EXPECTED_CONSTRUCTION_COUNTS.intersections);
  assert.equal(result.construction.guides.some((guide) => guide.orientation === "diagonal"), false);

  assert.deepEqual(result.measurementResultA.measurements.map((measurement) => measurement.requestRef), [
    "distance:main-left-third",
    "alignment:main-left-third",
    "containment:header-surface",
    "overlap:side-main",
    "coverage:composition",
    "ratio:side-main",
  ]);
  assert.deepEqual(
    result.measurementResultA.measurements.map((measurement) => measurement.requestRef),
    result.measurementResultB.measurements.map((measurement) => measurement.requestRef),
  );
  assert.equal(result.evaluationA.profileRef, result.evaluationB.profileRef);
  assert.equal(result.evaluationA.packRef, result.evaluationB.packRef);
  assert.equal(result.evaluationA.ruleSetRef, result.evaluationB.ruleSetRef);
  assert.ok(result.evaluationA.score.overallScore > result.evaluationB.score.overallScore);

  assert.equal(result.comparison.status, "a_closer");
  assert.equal(result.comparison.selectedCompositionRef, "composition:A");
  assert.equal(result.decision.status, "a_closer");
  assert.equal(result.structuredExplanation.claimCode, "A_CLOSER_TO_DECLARED_SYSTEM");
  assert.equal(result.structuredExplanation.summary.includes("closer to the declared system"), true);

  assert.deepEqual(Object.keys(result.artifacts), [
    "structuredResult",
    "constructionSummary",
    "evaluationReport",
    "explanation",
    "simpleVisual",
  ]);
  assert.equal(result.artifacts.structuredResult.status, "current");
  assert.equal(result.artifacts.constructionSummary.status, "lossy");
  assert.equal(result.artifacts.evaluationReport.status, "lossy");
  assert.equal(result.artifacts.explanation.status, "current");
  assert.equal(result.artifacts.simpleVisual.status, "lossy");
  for (const artifact of Object.values(result.artifacts)) {
    assert.equal(artifact.runRef.id, result.run.runRef.id);
  }

  assert.equal(result.run.runRef.id, result.summary.runRef);
  assert.equal(result.run.replayReadiness.status, "replay_ready");
  assert.equal(result.replayReadinessReport.status, "replay_ready");
  assert.deepEqual(result.replayReadinessReport.mismatches, []);
  assert.deepEqual(result.summary.constructionCounts, EXPECTED_CONSTRUCTION_COUNTS);
  assert.equal(result.summary.measurementCounts.a, 6);
  assert.equal(result.summary.measurementCounts.b, 6);
  assert.equal(result.summary.comparisonStatus, "a_closer");
  assert.equal(result.summary.selectedCompositionRef, "composition:A");
  assert.equal(result.summary.comparisonStatement, "A is closer to the declared system under the canonical MVP profile.");

  const serialized = JSON.stringify(result).toLowerCase();
  for (const forbidden of [
    "beauty",
    "beautiful",
    "best",
    "better",
    "preferred",
    "winner",
    "recommendation",
    "optimize",
    "authorintent",
    "camera",
    "cad",
    "mcp",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("trace order, refs, run identity, replay evidence, and determinism are stable", () => {
  const firstInput = createCanonicalMvpDemoInputV1();
  const frozenInput = deepFreeze(structuredClone(firstInput));
  const before = JSON.stringify(frozenInput);
  const first = runMvpDemoV1(frozenInput);
  const second = runMvpDemoV1(createCanonicalMvpDemoInputV1());

  assertOk(first);
  assertOk(second);
  assert.equal(JSON.stringify(frozenInput), before);
  assert.deepEqual(first.output, second.output);

  assert.deepEqual(
    first.output.trace.entries.map((entry) => entry.operation),
    MVP_DEMO_TRACE_OPERATION_ORDER_V1,
  );
  assert.deepEqual(
    first.output.trace.entries.map((entry) => entry.stepIndex),
    Array.from({ length: MVP_DEMO_TRACE_OPERATION_ORDER_V1.length }, (_, index) => index + 1),
  );
  assert.equal(first.output.trace.entries.every((entry) => entry.status === "ok"), true);
  assert.equal(allTraceOutputRefs(first.output).includes(`run:${first.output.run.runRef.id}`), true);
  assert.equal(allTraceOutputRefs(first.output).includes(`artifact:${first.output.artifacts.simpleVisual.artifactRef}`), true);
  assert.equal(first.output.run.runRef.id, first.output.initialRunRef.id);
  assert.equal(first.output.artifacts.simpleVisual.payload.svg, second.output.artifacts.simpleVisual.payload.svg);
});

test("input validation rejects mandatory controlled dependency failures", () => {
  const missingPackLock = createCanonicalMvpDemoInputV1();
  delete missingPackLock.packLock;
  assertFailedWithDiagnostic(runMvpDemoV1(missingPackLock), "MissingMvpDemoDependency");

  const missingProfile = createCanonicalMvpDemoInputV1();
  delete missingProfile.evaluationProfiles;
  assertFailedWithDiagnostic(runMvpDemoV1(missingProfile), "MissingMvpDemoDependency");

  const missingRuleSet = createCanonicalMvpDemoInputV1();
  delete missingRuleSet.ruleSetRef;
  assertFailedWithDiagnostic(runMvpDemoV1(missingRuleSet), "MissingMvpDemoDependency");

  const unknownRuleSet = createCanonicalMvpDemoInputV1();
  unknownRuleSet.ruleSetRef = "surface:unknown-rule-set";
  assertFailedWithDiagnostic(runMvpDemoV1(unknownRuleSet), "MissingRuleSet");

  const absentRatio = createCanonicalMvpDemoInputV1();
  absentRatio.pack = structuredClone(absentRatio.pack);
  absentRatio.pack.ratios = absentRatio.pack.ratios.filter((ratio) => ratio.id !== "1/3");
  assertFailedWithDiagnostic(runMvpDemoV1(absentRatio), "MissingRatioReference");

  const implicitPack = createCanonicalMvpDemoInputV1();
  delete implicitPack.pack;
  assertFailedWithDiagnostic(runMvpDemoV1(implicitPack), "MissingMvpDemoDependency");

  const beautyScore = createCanonicalMvpDemoInputV1();
  beautyScore.requestedOutputs = [...beautyScore.requestedOutputs, "beauty_score"];
  assertFailedWithDiagnostic(runMvpDemoV1(beautyScore), "BeautyScoreRequested");

  const extraField = createCanonicalMvpDemoInputV1();
  extraField.client = { kind: "ui" };
  assertFailedWithDiagnostic(validateMvpDemoInputV1(extraField), "InvalidMvpDemoInputV1");

  const artifactAsInput = createCanonicalMvpDemoInputV1();
  artifactAsInput.suppliedArtifact = { kind: "artifact", artifactRef: "artifact:bad" };
  assertFailedWithDiagnostic(validateMvpDemoInputV1(artifactAsInput), "ArtifactWouldBecomeSourceOfTruth");
});

test("non-comparable context is represented without selecting or recommending a candidate", () => {
  const input = createCanonicalMvpDemoInputV1();
  input.evaluationProfiles.b = structuredClone(input.evaluationProfiles.b);
  input.evaluationProfiles.b.profileRef = "evaluation-profile:basic-grid-alignment-context-shift";
  input.evaluationProfiles.b.sourceRefs = [{ kind: "evaluation-profile", ref: input.evaluationProfiles.b.profileRef }];
  input.evaluationProfiles.b.provenance = {
    ...input.evaluationProfiles.b.provenance,
    inputRefs: [{ kind: "evaluation-profile", ref: input.evaluationProfiles.b.profileRef }],
  };

  const result = runMvpDemoV1(input);
  assertOk(result);
  assert.equal(result.output.comparison.status, "non_comparable");
  assert.equal(result.output.comparison.selectedEvaluationRef, null);
  assert.equal(result.output.decision.selectedCompositionRef, null);
  assert.equal(result.output.structuredExplanation.claimCode, "NON_COMPARABLE_CONTEXT");
  assert.ok(result.output.comparison.contextChecks.some((check) => check.matches === false));
  assert.equal(JSON.stringify(result.output).toLowerCase().includes("recommendation"), false);
});

test("source-aware result validation rejects forged outputs and visual artifacts never become source truth", () => {
  const { result } = runCanonical();

  const cases = [
    { ...result, extra: true },
    { ...result, evaluationA: { ...result.evaluationA, score: { ...result.evaluationA.score, overallScore: 0 } } },
    { ...result, evaluationA: { ...result.evaluationA, confidence: { ...result.evaluationA.confidence, value: 0 } } },
    { ...result, comparison: { ...result.comparison, status: "tie" } },
    { ...result, decision: { ...result.decision, selectedCompositionRef: "composition:B" } },
    { ...result, structuredExplanation: { ...result.structuredExplanation, claimCode: "B_CLOSER_TO_DECLARED_SYSTEM" } },
    {
      ...result,
      artifacts: {
        ...result.artifacts,
        simpleVisual: {
          ...result.artifacts.simpleVisual,
          payload: { ...result.artifacts.simpleVisual.payload, svg: `${result.artifacts.simpleVisual.payload.svg}<!-- forged -->` },
        },
      },
    },
    {
      ...result,
      artifacts: {
        ...result.artifacts,
        structuredResult: { ...result.artifacts.structuredResult, runRef: { id: "run:v1:wrong" } },
      },
    },
    { ...result, run: { ...result.run, runRef: { id: "run:v1:forged" } } },
    { ...result, replayReadinessReport: { ...result.replayReadinessReport, status: "incompatible" } },
    {
      ...result,
      trace: { ...result.trace, entries: result.trace.entries.slice(0, -1) },
    },
    {
      ...result,
      summary: { ...result.summary, constructionCounts: { ...result.summary.constructionCounts, guides: 99 } },
    },
  ];

  for (const candidate of cases) {
    assertFailedWithDiagnostic(validateMvpDemoResultV1(candidate), "InvalidMvpDemoResultV1");
  }

  const sourceBefore = JSON.stringify(result.construction);
  const mutatedArtifact = structuredClone(result.artifacts.simpleVisual);
  mutatedArtifact.payload.svg = "<svg data-forged=\"true\" />";
  assert.equal(JSON.stringify(result.construction), sourceBefore);
  assertFailedWithDiagnostic(
    validateMvpDemoResultV1({
      ...result,
      artifacts: { ...result.artifacts, simpleVisual: mutatedArtifact },
    }),
    "InvalidMvpDemoResultV1",
  );
});

test("changed run dependency assesses as incompatible without replay execution", () => {
  const { result } = runCanonical();
  const changed = assessReplayReadinessV1(result.run, {
    kind: "replay-readiness-dependencies",
    inputIdentity: result.run.runInput.inputIdentity,
    packLock: { ...result.packLock, contentIdentity: `${result.packLock.contentIdentity}:changed` },
    orderedRuleRefs: result.run.orderedRuleRefs,
    ruleSetRef: result.run.ruleSetRef,
    operationContext: result.operationContext,
    sourceRefs: result.run.runInput.inputRefs,
    artifacts: Object.values(result.artifacts),
  });

  assertOk(changed);
  assert.equal(changed.output.status, "incompatible");
  assert.ok(changed.output.mismatches.some((mismatch) => mismatch.mismatchKind === "pack_content_identity_mismatch"));
  assert.equal(JSON.stringify(changed.output).includes("replayRun"), false);
});
