import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as core from "../dist/src/index.js";
import { createReadOnlyViewerModel } from "../dist/src/local-viewer/read-only-viewer-model.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const scenarioDir = join(repoRoot, "examples", "structured-analyze", "scenarios");

const scenarios = Object.freeze([
  {
    name: "alignment-basic",
    status: "valid",
    comparisonStatus: "a_closer",
    decisionStatus: "a_closer",
    canonicalSha256: "5bc4528ffc9f31fdc2782e5733f4f869b45e8ae3b0566936d639a70ae428aadc",
    diagnosticCounts: { MeasurementGapWarning: 12, MeasurementOutOfTolerance: 97 },
    warningCounts: { MeasurementGapWarning: 12, MeasurementOutOfTolerance: 97 },
    errorCounts: {},
    outputRefsCount: 387,
    acceptedSourceIds: [
      "alignment-a-left-third",
      "alignment-a-middle-third",
      "alignment-a-right-third",
      "alignment-b-left-offset",
      "alignment-b-middle-offset",
      "alignment-b-right-offset",
      "composition:alignment-basic:A",
      "composition:alignment-basic:B",
      "surface:alignment-basic:900x600",
    ],
    effectiveSourceIds: [
      "alignment-a-left-third",
      "alignment-a-middle-third",
      "alignment-a-right-third",
      "alignment-b-left-offset",
      "alignment-b-middle-offset",
      "alignment-b-right-offset",
      "composition:alignment-basic:A",
      "composition:alignment-basic:B",
      "surface:alignment-basic:900x600",
    ],
  },
  {
    name: "symmetry-test",
    status: "valid",
    comparisonStatus: "tie",
    decisionStatus: "tie",
    canonicalSha256: "4e92ebed6f946894f02a99878792957d4823977021f2555e4f86c95da0c14899",
    diagnosticCounts: { MeasurementGapWarning: 32, MeasurementOutOfTolerance: 68, TieComparison: 1 },
    warningCounts: { MeasurementGapWarning: 32, MeasurementOutOfTolerance: 68, TieComparison: 1 },
    errorCounts: {},
    outputRefsCount: 293,
    acceptedSourceIds: [
      "composition:symmetry-test:A",
      "composition:symmetry-test:B",
      "surface:symmetry-test:900x600",
      "symmetry-a-left-panel",
      "symmetry-a-right-panel",
      "symmetry-b-narrow-right-panel",
      "symmetry-b-wide-left-panel",
    ],
    effectiveSourceIds: [
      "composition:symmetry-test:A",
      "composition:symmetry-test:B",
      "surface:symmetry-test:900x600",
      "symmetry-a-left-panel",
      "symmetry-a-right-panel",
      "symmetry-b-narrow-right-panel",
      "symmetry-b-wide-left-panel",
    ],
  },
  {
    name: "ratio-comparison",
    status: "valid",
    comparisonStatus: "a_closer",
    decisionStatus: "a_closer",
    canonicalSha256: "27bc87ae0817aaebeba60e66738c96e36f50bca07174d6c52163ceadee00c797",
    diagnosticCounts: { MeasurementOutOfTolerance: 88 },
    warningCounts: { MeasurementOutOfTolerance: 88 },
    errorCounts: {},
    outputRefsCount: 272,
    acceptedSourceIds: [
      "composition:ratio-comparison:A",
      "composition:ratio-comparison:B",
      "ratio-a-golden-major-panel",
      "ratio-a-golden-minor-panel",
      "ratio-b-broken-major-panel",
      "ratio-b-broken-minor-panel",
      "surface:ratio-comparison:1000x618",
    ],
    effectiveSourceIds: [
      "composition:ratio-comparison:A",
      "composition:ratio-comparison:B",
      "ratio-a-golden-major-panel",
      "ratio-a-golden-minor-panel",
      "ratio-b-broken-major-panel",
      "ratio-b-broken-minor-panel",
      "surface:ratio-comparison:1000x618",
    ],
  },
  {
    name: "boundary-case",
    status: "valid",
    comparisonStatus: "tie",
    decisionStatus: "tie",
    canonicalSha256: "a856d5d1821739b0a6341c0ebeff4b1c2623dfa9d0b0faba6530c4c95c71c868",
    diagnosticCounts: { TieComparison: 1 },
    warningCounts: { TieComparison: 1 },
    errorCounts: {},
    outputRefsCount: 387,
    acceptedSourceIds: [
      "boundary-a-third-1",
      "boundary-a-third-2",
      "boundary-a-third-3",
      "boundary-b-third-1",
      "boundary-b-third-2",
      "boundary-b-third-3",
      "composition:boundary-case:A",
      "composition:boundary-case:B",
      "surface:boundary-case:1x1",
    ],
    effectiveSourceIds: [
      "boundary-a-third-1",
      "boundary-a-third-2",
      "boundary-a-third-3",
      "boundary-b-third-1",
      "boundary-b-third-2",
      "boundary-b-third-3",
      "composition:boundary-case:A",
      "composition:boundary-case:B",
      "surface:boundary-case:1x1",
    ],
  },
  {
    name: "invalid-case",
    status: "invalid",
    canonicalSha256: "694f87be1be9000d2aed2195266813a38b3f2d60856d4c54cff43b220096f99e",
    diagnosticCounts: { InvalidInputShape: 1 },
    warningCounts: {},
    errorCounts: { InvalidInputShape: 1 },
    outputRefsCount: 0,
    expectedDiagnosticCodes: ["InvalidInputShape"],
    acceptedSourceIds: [
      "composition:invalid-case:A",
      "composition:invalid-case:B",
      "invalid-a-left-third",
      "invalid-a-middle-third",
      "invalid-a-right-third",
      "invalid-b-left-offset",
      "invalid-b-middle-offset",
      "invalid-b-right-offset",
      "surface:invalid-case:900x600",
    ],
    effectiveSourceIds: [
      "composition:invalid-case:A",
      "composition:invalid-case:B",
      "invalid-a-left-third",
      "invalid-a-middle-third",
      "invalid-a-right-third",
      "invalid-b-left-offset",
      "invalid-b-middle-offset",
      "invalid-b-right-offset",
      "surface:invalid-case:900x600",
    ],
  },
  {
    name: "invalid-duplicate-id",
    fixtureName: "alignment-basic",
    prepareInput: createInvalidDuplicateIdInput,
    status: "invalid",
    canonicalSha256: "85b31b9b97bf80e92b70c0d04b26ca8bef3f6906b7ea2e36f87437ed0e2b69b3",
    diagnosticCounts: { DuplicateGeometrySourceId: 1 },
    warningCounts: {},
    errorCounts: { DuplicateGeometrySourceId: 1 },
    outputRefsCount: 0,
    expectedDiagnosticCodes: ["DuplicateGeometrySourceId"],
    acceptedSourceIds: [
      "composition:invalid-duplicate-id:A",
      "composition:invalid-duplicate-id:B",
      "invalid-duplicate-a-left-third",
      "invalid-duplicate-a-right-third",
      "invalid-duplicate-b-left-offset",
      "invalid-duplicate-b-middle-offset",
      "invalid-duplicate-b-right-offset",
      "surface:invalid-duplicate-id:900x600",
    ],
    effectiveSourceIds: [],
  },
]);

const duplicateIdScenarioReplacements = Object.freeze([
  ["alignment-basic", "invalid-duplicate-id"],
  ["alignment-a-", "invalid-duplicate-a-"],
  ["alignment-b-", "invalid-duplicate-b-"],
  ["structured-analyze-scenario-pack", "structured-analyze-duplicate-id-scenario"],
]);

test("Structured Analyze scenarios are deterministic direct-engine regressions", async () => {
  for (const scenario of scenarios) {
    await assertScenarioRegression(scenario);
  }
});

async function assertScenarioRegression(scenario) {
  const { inputPath, originalText, originalInput } = await loadScenarioInput(scenario);
  const firstInput = structuredClone(originalInput);
  const secondInput = structuredClone(originalInput);
  const firstResult = core.analyzeStructuredCompositionV1(firstInput);
  const secondResult = core.analyzeStructuredCompositionV1(secondInput);
  const firstCanonical = core.serializeCanonicalJson(firstResult);
  const secondCanonical = core.serializeCanonicalJson(secondResult);

  await assertInputAndResultStability({
    inputPath,
    originalText,
    originalInput,
    firstInput,
    secondInput,
    firstResult,
    secondResult,
    firstCanonical,
    secondCanonical,
    scenario,
  });
  assertScenarioResultSummary(firstResult, secondResult, originalInput, scenario);
  assertScenarioResultShape(firstResult, scenario);
  assertViewerCompatibility(firstResult, firstCanonical, scenario);
}

async function loadScenarioInput(scenario) {
  const inputPath = scenarioPath(scenario.fixtureName ?? scenario.name);
  const originalText = await readFile(inputPath, "utf8");
  const fixtureInput = JSON.parse(originalText);
  return {
    inputPath,
    originalText,
    originalInput: scenario.prepareInput === undefined
      ? fixtureInput
      : scenario.prepareInput(structuredClone(fixtureInput)),
  };
}

async function assertInputAndResultStability(context) {
  assert.deepEqual(context.firstInput, context.originalInput, `${context.scenario.name}: first input mutation`);
  assert.deepEqual(context.secondInput, context.originalInput, `${context.scenario.name}: second input mutation`);
  assert.equal(await readFile(context.inputPath, "utf8"), context.originalText, `${context.scenario.name}: fixture text mutation`);
  assert.deepEqual(context.secondResult, context.firstResult, `${context.scenario.name}: result object stability`);
  assert.equal(context.secondCanonical, context.firstCanonical, `${context.scenario.name}: canonical JSON stability`);
  assert.equal(sha256(context.firstCanonical), context.scenario.canonicalSha256, `${context.scenario.name}: canonical hash`);
}

function assertScenarioResultSummary(firstResult, secondResult, originalInput, scenario) {
  assert.equal(firstResult.status, scenario.status, `${scenario.name}: status`);
  assert.deepEqual(firstResult.validation.acceptedSourceIds, scenario.acceptedSourceIds, `${scenario.name}: acceptedSourceIds`);
  assert.deepEqual(firstResult.validation.effectiveSourceIds, scenario.effectiveSourceIds, `${scenario.name}: effectiveSourceIds`);
  assert.deepEqual(secondResult.validation.acceptedSourceIds, firstResult.validation.acceptedSourceIds, `${scenario.name}: acceptedSourceIds stability`);
  assert.deepEqual(secondResult.validation.effectiveSourceIds, firstResult.validation.effectiveSourceIds, `${scenario.name}: effectiveSourceIds stability`);
  assert.deepEqual(firstResult.packLockRef, originalInput.packLock.ref, `${scenario.name}: packLockRef`);
  assert.deepEqual(firstResult.operationContextRef, originalInput.operationContext.ref, `${scenario.name}: operationContextRef`);
  assert.deepEqual(countByCode(firstResult.diagnostics), scenario.diagnosticCounts, `${scenario.name}: diagnostic counts`);
  assert.deepEqual(countByCode(firstResult.warnings), scenario.warningCounts, `${scenario.name}: warning counts`);
  assert.deepEqual(countByCode(firstResult.errors), scenario.errorCounts, `${scenario.name}: error counts`);
  assert.equal(firstResult.outputRefs.length, scenario.outputRefsCount, `${scenario.name}: outputRefs count`);
  for (const diagnostic of allDiagnostics(firstResult)) {
    assertDiagnosticShape(diagnostic, scenario.name);
  }
}

function allDiagnostics(result) {
  return [...result.validation.diagnostics, ...result.diagnostics, ...result.warnings, ...result.errors];
}

function assertScenarioResultShape(result, scenario) {
  if (scenario.status === "valid") {
    assertValidResultShape(result, scenario);
    return;
  }
  assertInvalidResultShape(result, scenario);
}

function scenarioPath(name) {
  return join(scenarioDir, `${name}.json`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countByCode(entries) {
  return Object.fromEntries(
    [...entries.reduce((counts, entry) => counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1), new Map()).entries()]
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function assertDiagnosticShape(diagnostic, scenarioName) {
  for (const key of ["blocking", "code", "message", "provenance", "severity", "source", "targetRef"]) {
    assert.equal(Object.hasOwn(diagnostic, key), true, `${scenarioName}: diagnostic ${diagnostic.code} missing ${key}`);
  }
  assert.equal(typeof diagnostic.code, "string", `${scenarioName}: diagnostic code`);
  assert.equal(typeof diagnostic.severity, "string", `${scenarioName}: diagnostic severity`);
  assert.equal(typeof diagnostic.message, "string", `${scenarioName}: diagnostic message`);
  assert.equal(typeof diagnostic.targetRef, "string", `${scenarioName}: diagnostic targetRef`);
  assert.equal(typeof diagnostic.blocking, "boolean", `${scenarioName}: diagnostic blocking`);
}

function assertValidResultShape(result, scenario) {
  assert.notEqual(result.measurements, null, `${scenario.name}: measurements`);
  assert.notEqual(result.evaluations, null, `${scenario.name}: evaluations`);
  assert.notEqual(result.comparison, null, `${scenario.name}: comparison`);
  assert.notEqual(result.decision, null, `${scenario.name}: decision`);
  assert.equal(result.comparison.status, scenario.comparisonStatus, `${scenario.name}: comparison status`);
  assert.equal(result.decision.status, scenario.decisionStatus, `${scenario.name}: decision status`);
  assert.equal(result.replayReadiness.status, "ready", `${scenario.name}: replay readiness`);
  assert.equal(result.serializationSummary.serializationVersion, "stable-serialization-v1", `${scenario.name}: serialization version`);
  assert.equal(typeof result.serializationSummary.meaningfulIdentity, "string", `${scenario.name}: meaningful identity type`);
  assert.notEqual(result.serializationSummary.meaningfulIdentity, "", `${scenario.name}: meaningful identity value`);
}

function assertInvalidResultShape(result, scenario) {
  assert.equal(result.measurements, null, `${scenario.name}: measurements`);
  assert.equal(result.evaluations, null, `${scenario.name}: evaluations`);
  assert.equal(result.comparison, null, `${scenario.name}: comparison`);
  assert.equal(result.decision, null, `${scenario.name}: decision`);
  assert.deepEqual(result.outputRefs, [], `${scenario.name}: outputRefs`);
  assert.equal(result.replayReadiness, null, `${scenario.name}: replay readiness`);
  assert.equal(result.serializationSummary, null, `${scenario.name}: serialization summary`);
  for (const code of scenario.expectedDiagnosticCodes) {
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === code), `${scenario.name}: expected diagnostic ${code}`);
  }
}

function assertViewerCompatibility(result, canonical, scenario) {
  const structuredModel = createReadOnlyViewerModel({ kind: "structured", value: result });
  assert.equal(structuredModel.status, "displayable", `${scenario.name}: structured viewer status`);
  assert.equal(structuredModel.classification, "structured-analyze-like-result", `${scenario.name}: structured viewer classification`);

  const jsonTextModel = createReadOnlyViewerModel({ kind: "jsonText", value: canonical });
  if (scenario.status === "invalid") {
    assert.equal(jsonTextModel.status, "displayable", `${scenario.name}: JSON text viewer status`);
    assert.equal(jsonTextModel.classification, "structured-analyze-like-result", `${scenario.name}: JSON text viewer classification`);
    return;
  }

  // Full valid engine results exceed the existing pasted-JSON string limit; this PR keeps viewer behavior unchanged.
  assert.equal(jsonTextModel.status, "unsupported", `${scenario.name}: JSON text viewer guard status`);
  assert.equal(jsonTextModel.classification, "unsupported-shape", `${scenario.name}: JSON text viewer guard classification`);
  assert.equal(jsonTextModel.notDisplayableReason, "JSON string length limit exceeded.", `${scenario.name}: JSON text viewer guard reason`);
}

function createInvalidDuplicateIdInput(input) {
  const fixture = JSON.parse(rewriteDuplicateIdScenarioJson(JSON.stringify(input)));
  fixture.compositionA.elements[1] = {
    ...fixture.compositionA.elements[1],
    id: fixture.compositionA.elements[0].id,
  };

  const acceptedSourceIds = [
    ...new Set([
      fixture.compositionA.id,
      fixture.compositionA.surface.id,
      ...fixture.compositionA.elements.map((element) => element.id),
      fixture.compositionB.id,
      fixture.compositionB.surface.id,
      ...fixture.compositionB.elements.map((element) => element.id),
    ]),
  ].sort();

  fixture.acceptance.acceptedSourceIds = acceptedSourceIds;
  fixture.provenance.callerSourceIds = acceptedSourceIds;
  fixture.provenance.acceptanceRecord = fixture.acceptance;
  return fixture;
}

function rewriteDuplicateIdScenarioJson(jsonText) {
  return duplicateIdScenarioReplacements.reduce(
    (rewritten, [from, to]) => rewritten.replaceAll(from, to),
    jsonText,
  );
}
