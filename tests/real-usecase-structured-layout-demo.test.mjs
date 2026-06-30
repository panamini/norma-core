import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const fixturePath = join(
  repoRoot,
  "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
);

const expectedCompositionAElements = [
  "layout-a-header-region",
  "layout-a-left-margin-region",
  "layout-a-right-margin-region",
  "layout-a-hero-media-region",
  "layout-a-copy-region",
  "layout-a-purchase-region",
  "layout-a-gutter-left-middle",
  "layout-a-gutter-middle-right",
  "layout-a-support-card-one",
  "layout-a-support-card-two",
  "layout-a-support-card-three",
];

test("R31 real-usecase Structured Analyze layout fixture is accepted and deterministic", async () => {
  const input = await readJson(fixturePath);
  const inputBefore = core.serializeCanonicalJson(input);
  const first = core.analyzeStructuredCompositionV1(input);
  const second = core.analyzeStructuredCompositionV1(structuredClone(input));
  const third = core.analyzeStructuredCompositionV1(structuredClone(input));
  const firstCanonical = core.serializeCanonicalJson(first);

  assert.equal(core.serializeCanonicalJson(input), inputBefore);
  assert.deepEqual(second, first);
  assert.deepEqual(third, first);
  assert.equal(core.serializeCanonicalJson(second), firstCanonical);
  assert.equal(core.serializeCanonicalJson(JSON.parse(firstCanonical)), firstCanonical);

  assertValidResult(first);
  assert.equal(input.contractVersion, core.STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION);
  assert.equal(input.analysisId, "analysis:structured-layout-real-usecase");
  assert.equal(input.acceptance.mode, "user_supplied_structured_data");
  assert.equal(input.provenance.adapter, null);
  assert.deepEqual(
    input.compositionA.elements.map((element) => element.id),
    expectedCompositionAElements,
  );
  assert.equal(input.compositionA.surface.bounds.width, 1200);
  assert.equal(input.compositionA.surface.bounds.height, 900);
  assert.equal(input.ratioPack.id, "norma.basic-proportions");
  assert.equal(input.ruleSetRef, "surface-basic-third-grid");

  assert.equal(first.packLockRef.id, input.packLock.ref.id);
  assert.equal(first.operationContextRef.id, input.operationContext.ref.id);
  assert.equal(first.inputRefs.some((ref) => ref.kind === "ratio-pack" && ref.ref === "norma.basic-proportions@0.1.0"), true);
  assert.equal(first.inputRefs.some((ref) => ref.kind === "rule-set" && ref.ref === input.ruleSetRef), true);
});

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assertValidResult(result) {
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
  assert.deepEqual(result.measurements.a.compositions.map((composition) => composition.label), ["A", "B"]);
  assert.deepEqual(result.measurements.b.compositions.map((composition) => composition.label), ["A", "B"]);
  assert.equal(result.replayReadiness.status, "ready");
}
