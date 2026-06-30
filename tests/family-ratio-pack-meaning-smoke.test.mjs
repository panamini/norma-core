import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
  createLocalStructuredAnalyzeReportBundle,
} from "../dist/src/local-report/structured-analyze-report.js";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const baseInputPath = join(repoRoot, "examples/structured-analyze/basic-grid-alignment.json");
const rootTwoFixturePath = join(repoRoot, "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json");
const expectedOutputFiles = [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort();

const ROOT_TWO_PACK_ID = "norma.root-two-harmonics";
const ROOT_TWO_PACK_VERSION = "0.1.0";
const ROOT_TWO_CONTENT_IDENTITY = "norma.root-two-harmonics@0.1.0:ratio-pack-v1:root-two-surface-partition";
const ROOT_TWO_RULE_SET_ID = "surface-root-two-section";
const ROOT_TWO_PACK_REF = `${ROOT_TWO_PACK_ID}@${ROOT_TWO_PACK_VERSION}`;

test("R27 validates the root-two family fixture as explicit authored ratio-pack data", async () => {
  const pack = await readRootTwoPack();
  const result = core.validateRatioPackV1(pack);

  assert.equal(pack.kind, "ratio-pack");
  assert.equal(pack.id, ROOT_TWO_PACK_ID);
  assert.equal(pack.version, ROOT_TWO_PACK_VERSION);
  assert.equal(pack.schemaVersion, "ratio-pack-v1");
  assert.equal(pack.contentIdentity, ROOT_TWO_CONTENT_IDENTITY);
  assert.equal(pack.identity.concept, "Root-two architectural surface partitions");
  assert.deepEqual(pack.conventions, ["ratio-pack-v1", "declarative-rules-only"]);
  assert.deepEqual(pack.limits, {
    noBeautyClaims: true,
    noIntentInference: true,
    noUiPreset: true,
  });
  assert.deepEqual(pack.preLock, {
    kind: "pack-lock-prelock",
    ref: "prelock:norma.root-two-harmonics@0.1.0",
    packId: ROOT_TWO_PACK_ID,
    packVersion: ROOT_TWO_PACK_VERSION,
    schemaVersion: "ratio-pack-v1",
    contentIdentity: ROOT_TWO_CONTENT_IDENTITY,
    final: false,
  });
  assert.deepEqual(pack.ratioFamilies.map((family) => family.scope), ["surface-partition", "surface-partition"]);
  assert.equal(pack.ruleSets.some((ruleSet) => ruleSet.id === ROOT_TWO_RULE_SET_ID), true);
  assertNoPositiveFamilyClaims(pack);

  assertOk(result);
  assert.equal(result.output.id, ROOT_TWO_PACK_ID);
  assert.equal(result.output.version, ROOT_TWO_PACK_VERSION);
  assert.equal(result.output.contentIdentity, ROOT_TWO_CONTENT_IDENTITY);
  assert.equal(result.packLockRef.id, pack.preLock.ref);
  assert.equal("ROOT_TWO_HARMONICS_PACK" in core, false);
  assert.equal("ROOT_TWO_HARMONICS_PACK_ID" in core, false);
});

test("R27 passes the root-two family pack through Structured Analyze deterministically", async () => {
  const input = await createRootTwoInput();
  const before = core.serializeCanonicalJson(input);
  const first = core.analyzeStructuredCompositionV1(input);
  const second = core.analyzeStructuredCompositionV1(input);

  assertValid(first);
  assert.deepEqual(first, second);
  assert.equal(core.serializeCanonicalJson(input), before);
  assert.equal(first.inputRefs.some((ref) => ref.kind === "ratio-pack" && ref.ref === ROOT_TWO_PACK_REF), true);
  assert.equal(first.inputRefs.some((ref) => ref.kind === "rule-set" && ref.ref === ROOT_TWO_RULE_SET_ID), true);
  assert.equal(first.packLockRef.id, input.packLock.ref.id);
  assert.equal(input.packLock.packId, ROOT_TWO_PACK_ID);
  assert.equal(input.packLock.packVersion, ROOT_TWO_PACK_VERSION);
  assert.equal(input.packLock.contentIdentity, ROOT_TWO_CONTENT_IDENTITY);
  assertPackLockIdentityOnly(input.packLock);
});

test("R27 shows the root-two family pack through the existing local report bundle", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "norma-r27-root-two-report-"));
  const input = await createRootTwoInput();
  const before = core.serializeCanonicalJson(input);
  const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));
  const bundle = createLocalStructuredAnalyzeReportBundle(structuredClone(input));

  try {
    assert.equal(core.serializeCanonicalJson(input), before);
    assert.deepEqual(bundle.result, directResult);
    assert.deepEqual(Object.keys(bundle.artifacts).sort(), expectedOutputFiles);
    assert.equal(bundle.summary.status, "valid");
    assert.equal(bundle.summary.input.ratioPackId, ROOT_TWO_PACK_ID);
    assert.equal(bundle.summary.input.ratioPackVersion, ROOT_TWO_PACK_VERSION);
    assert.equal(bundle.summary.input.ratioPackRef, ROOT_TWO_PACK_REF);
    assert.equal(bundle.summary.input.ruleSetRef, ROOT_TWO_RULE_SET_ID);
    assert.equal(bundle.summary.scope.newRatioPack, true);
    assert.equal(bundle.summary.scope.geometryHarmoniesPack, false);
    assert.equal(bundle.summary.scope.recommendation, false);
    assert.equal(bundle.summary.scope.beautyScore, false);
    assert.equal(bundle.summary.scope.promptImageInference, false);

    await Promise.all(Object.entries(bundle.artifacts).map(([file, contents]) => (
      writeReportArtifact(outputDir, file, contents)
    )));

    const result = JSON.parse(bundle.artifacts["result.json"]);
    const summary = JSON.parse(bundle.artifacts["summary.json"]);
    const summaryMarkdown = bundle.artifacts["summary.md"];
    const visualSvg = bundle.artifacts["visual.svg"];
    const reportHtml = bundle.artifacts["report.html"];

    assert.deepEqual(await readdir(outputDir).then((files) => files.sort()), expectedOutputFiles);
    assert.deepEqual(result, directResult);
    assert.deepEqual(summary, bundle.summary);
    assert.match(summaryMarkdown, /- ratioPack: norma\.root-two-harmonics@0\.1\.0/u);
    assert.match(summaryMarkdown, /- ruleSet: surface-root-two-section/u);
    assert.match(summaryMarkdown, /result\.json is the canonical source of truth/u);
    assert.match(summaryMarkdown, /summary\.json, summary\.md, visual\.svg, and report\.html are derived local inspection artifacts/u);
    assert.match(reportHtml, /norma\.root-two-harmonics@0\.1\.0/u);
    assert.match(reportHtml, /surface-root-two-section/u);
    assert.match(reportHtml, /result\.json<\/code> is the canonical source of truth/u);
    assert.match(reportHtml, /local read-only inspection artifact/u);
    assert.match(reportHtml, /derived local views/u);
    assert.match(visualSvg, /^<svg/u);
    assert.match(visualSvg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
    assert.doesNotMatch(visualSvg, /<script\b/iu);
    assertNoPositiveInferenceClaims(`${summaryMarkdown}\n${reportHtml}\n${visualSvg}`);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

async function createRootTwoInput() {
  const input = await readJson(baseInputPath);
  const ratioPack = await readRootTwoPack();
  const sourceRefs = sourceRefsForRootTwoInput(input);
  const packLock = requiredOutput(core.createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ROOT_TWO_PACK_REF }],
  }), "root-two:pack-lock");
  const operationContext = requiredOutput(core.createOperationContext({
    operationName: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: core.STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    geometryModelVersion: "geometry-v1",
    coordinatePolicy: input.compositionA.coordinateSystem,
    metricPolicy: input.compositionA.metricPolicy,
    tolerancePolicy: input.tolerancePolicy,
    roundingPolicy: input.operationContext.roundingPolicy.value,
    numericPolicy: input.operationContext.numericPolicy.value,
    orderingPolicy: input.operationContext.orderingPolicy.value,
    featureFlags: {
      explicitStructuredJsonInput: true,
      localStructuredAnalyzeReportKit: true,
      r27RootTwoFamilyMeaningSmoke: true,
    },
    sourceRefs,
  }), "root-two:operation-context");

  return {
    ...input,
    analysisId: "analysis:r27-root-two-family-meaning-smoke",
    ratioPack,
    packLock,
    ruleSetRef: ROOT_TWO_RULE_SET_ID,
    operationContext,
    provenance: {
      ...input.provenance,
      externalSourceRef: { kind: "test-fixture", ref: "r27-root-two-family-meaning-smoke" },
      mappingVersion: "r27-root-two-family-meaning-smoke-v1",
      operationContextRef: operationContext.ref,
    },
  };
}

function sourceRefsForRootTwoInput(input) {
  return [
    { kind: "structured-analysis-input", ref: "r27-root-two-family-meaning-smoke:structured-input" },
    { kind: "surface", ref: input.compositionA.surface.id },
    { kind: "ratio-pack", ref: ROOT_TWO_PACK_REF },
    { kind: "rule-set", ref: ROOT_TWO_RULE_SET_ID },
    { kind: "evaluation-profile", ref: input.evaluationProfile.id },
    { kind: "coordinate-policy", ref: input.compositionA.coordinateSystem.id },
    { kind: "metric-policy", ref: input.compositionA.metricPolicy.id },
    { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
  ];
}

async function writeReportArtifact(outputDir, file, contents) {
  await writeFile(join(outputDir, file), contents, "utf8");
}

function assertPackLockIdentityOnly(packLock) {
  for (const executableField of [
    "metadata",
    "ratios",
    "ratioFamilies",
    "ratioSequences",
    "partitionPatterns",
    "ruleDeclarations",
    "ruleSets",
    "preLock",
  ]) {
    assert.equal(executableField in packLock, false, `PackLock must not carry ${executableField}`);
  }
}

function assertNoPositiveFamilyClaims(pack) {
  for (const value of stringValues(pack)) {
    assert.doesNotMatch(
      value,
      /\b(?:recommends?|recommended|optimization|optimized|beauty score|aesthetic score|more beautiful|intended design|ui preset|rendering preset)\b/iu,
      value,
    );
  }
}

function assertNoPositiveInferenceClaims(text) {
  assert.doesNotMatch(
    text,
    /\b(?:recommends?|recommended)\b|\b(?:optimization|optimized|inferred intent|prompt-derived ratios|more beautiful|beauty score: [0-9]|aesthetic score)\b/iu,
  );
}

function stringValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(stringValues);
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(stringValues);
  }

  return [];
}

function assertOk(result) {
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
  assert.ok(result.output);
}

function assertValid(result) {
  assert.equal(result.status, "valid");
  assert.equal(result.errors.length, 0);
  assert.ok(result.decision);
  assert.equal(result.replayReadiness.status, "ready");
}

function requiredOutput(result, label) {
  assertOk(result, label);
  return result.output;
}

async function readRootTwoPack() {
  return readJson(rootTwoFixturePath);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
