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

test("PR12 exports the MVP demo harness without post-MVP runtime helpers", () => {
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
  assert.equal("replayRun" in core, false);
  assert.equal("verifyRun" in core, false);
  assert.equal("verifyArtifactFreshness" in core, false);
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
