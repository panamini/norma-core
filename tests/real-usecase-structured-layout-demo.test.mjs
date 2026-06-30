import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const examplePath = join(repoRoot, "examples/structured-analyze/usecases/structured-layout-real-usecase.json");
const fixturePath = join(repoRoot, "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json");
const docPath = join(repoRoot, "docs/examples/real-usecase-structured-layout-demo.md");
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");

const expectedPackIdentity = Object.freeze({
  id: "norma.root-two-harmonics",
  version: "0.1.0",
  contentIdentity: "norma.root-two-harmonics@0.1.0:ratio-pack-v1:root-two-surface-partition",
});
const expectedRuleSetRef = "surface-root-two-section";

test("R31 real-usecase example exists, parses, validates, and is not mutated by direct analysis", async () => {
  assert.equal((await stat(examplePath)).isFile(), true);

  const input = await readJson(examplePath);
  const before = core.serializeCanonicalJson(input);
  const result = core.analyzeStructuredCompositionV1(input);

  assertValid(result);
  assert.equal(core.serializeCanonicalJson(input), before);
  assert.equal(input.analysisId, "analysis:r31-structured-layout-real-usecase");
  assert.equal(input.provenance.sourceKind, "user_supplied_structured_data");
  assert.equal(input.provenance.adapter, null);
  assert.deepEqual(input.provenance.transformationSteps, []);
});

test("R31 real-usecase example stays on an existing authored ratio-pack boundary", async () => {
  const input = await readJson(examplePath);
  const fixture = await readJson(fixturePath);

  assert.deepEqual(pickRatioPackIdentity(input.ratioPack), expectedPackIdentity);
  assert.deepEqual(pickRatioPackIdentity(input.ratioPack), pickRatioPackIdentity(fixture));
  assert.deepEqual(input.ratioPack.ratioFamilies, fixture.ratioFamilies);
  assert.equal(input.ruleSetRef, expectedRuleSetRef);
  assert.equal(fixture.ruleSets.some((ruleSet) => ruleSet.id === expectedRuleSetRef), true);
  assert.equal(input.packLock.packId, expectedPackIdentity.id);
  assert.equal(input.packLock.packVersion, expectedPackIdentity.version);
  assert.equal(input.packLock.contentIdentity, expectedPackIdentity.contentIdentity);
  assert.equal(input.operationContext.featureFlags.r31RealUsecaseStructuredLayoutDemo, true);
  assert.equal("runtimeFamilySelection" in input.operationContext.featureFlags, false);
  assert.equal(input.provenance.normalizationVersion, null);

  const validation = core.validateRatioPackV1(input.ratioPack);
  assert.equal(validation.status, "ok");
  assert.equal(validation.errors.length, 0);
});

test("R31 real-usecase direct engine execution is deterministic", async () => {
  const input = await readJson(examplePath);
  const first = core.analyzeStructuredCompositionV1(structuredClone(input));
  const second = core.analyzeStructuredCompositionV1(structuredClone(input));

  assertValid(first);
  assert.deepEqual(second, first);
  const canonical = core.serializeCanonicalJson(first);
  assert.equal(core.serializeCanonicalJson(second), canonical);
  assert.equal(core.serializeCanonicalJson(JSON.parse(canonical)), canonical);
});

test("R31 real-usecase local report result.json matches direct engine output", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "norma-r31-structured-layout-"));
  const outputDir = join(tempRoot, "report-output");

  try {
    const input = await readJson(examplePath);
    const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));

    await execFileAsync(process.execPath, [reportCommandPath, examplePath, outputDir], {
      cwd: repoRoot,
    });

    assert.equal((await stat(outputDir)).isDirectory(), true);

    const outputFiles = await readdir(outputDir);
    assert.equal(outputFiles.includes("result.json"), true);

    const resultText = await readFile(join(outputDir, "result.json"), "utf8");
    const result = JSON.parse(resultText);

    assert.deepEqual(result, directResult);
    assert.equal(resultText, `${core.serializeCanonicalJson(directResult)}\n`);

    if (outputFiles.includes("report.html")) {
      const reportHtml = await readFile(join(outputDir, "report.html"), "utf8");
      assertNoForbiddenSupportClaims(reportHtml, "report.html");
    }

    if (outputFiles.includes("visual.svg")) {
      const visualSvg = await readFile(join(outputDir, "visual.svg"), "utf8");
      assert.doesNotMatch(visualSvg, /<script\b/iu, "visual.svg must not contain scripts");
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("R31 docs and example text preserve explicit structured geometry boundaries", async () => {
  const doc = await readFile(docPath, "utf8");
  const exampleText = await readFile(examplePath, "utf8");

  for (const requiredText of [
    "explicit structured geometry",
    "node bin/norma-core-report.mjs examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "`result.json` is the canonical Norma truth",
    "derived local inspection output",
    "A future adapter could produce structured geometry like this",
    "but no adapter is implemented here",
    "does not infer geometry from images, prompts, CAD, Figma, Illustrator, Photoshop, PDFs, or other files",
    "does not add image analysis, prompt ingestion, CAD/design-app ingestion",
    "runtime family selection",
    "recommendation, optimization, beauty scoring, correction",
  ]) {
    assert.match(doc, new RegExp(escapeRegex(requiredText), "iu"), requiredText);
  }

  assertNoForbiddenSupportClaims(doc, "R31 doc");
  assertNoForbiddenSupportClaims(exampleText, "R31 example");
  assert.doesNotMatch(exampleText, /\b(?:foo|bar|test1)\b/iu);
});

function assertValid(result) {
  assert.equal(result.status, "valid");
  assert.equal(result.errors.length, 0);
  assert.ok(result.decision);
  assert.equal(result.replayReadiness.status, "ready");
  assert.equal(result.inputRefs.some((ref) => ref.kind === "ratio-pack" && ref.ref === "norma.root-two-harmonics@0.1.0"), true);
  assert.equal(result.inputRefs.some((ref) => ref.kind === "rule-set" && ref.ref === expectedRuleSetRef), true);
}

function assertNoForbiddenSupportClaims(text, label) {
  const forbiddenPatterns = [
    [/\bimage\s+(?:inference|analysis|input|adapter)\s+(?:enabled|implemented|supported)\b/iu, "image inference support"],
    [/\b(?:cad|figma|illustrator|photoshop|pdf)\s+(?:inference|input|import|adapter)\s+(?:enabled|implemented|supported)\b/iu, "design-file inference support"],
    [/\b(?:gpt|prompt)\s+(?:inference|input|ingestion|adapter)\s+(?:enabled|implemented|supported)\b/iu, "GPT or prompt inference support"],
    [/\bautomatic(?:ally)?\s+(?:ratio[- ]?)?family\s+selection\s+(?:enabled|implemented|supported)\b/iu, "automatic family selection support"],
    [/\brecommendation\s+engine\b/iu, "recommendation engine"],
    [/\boptim(?:ization|isation)\s+engine\b/iu, "optimization engine"],
    [/\bbeauty\s+scor(?:e|ing)\s+(?:computed|enabled|implemented|supported)\b/iu, "beauty scoring support"],
    [/\bautomatic(?:ally)?\s+correct(?:s|ed|ing|ion)?\s+(?:enabled|implemented|supported)\b/iu, "automatic correction support"],
    [/\bhosted\s+dashboard\s+(?:enabled|implemented|supported)\b/iu, "hosted dashboard support"],
    [/\bwebapp\s+(?:enabled|implemented|supported)\b/iu, "webapp support"],
    [/\bpublic\s+api\s+(?:enabled|implemented|supported)\b/iu, "public API support"],
    [/\bpackage\s+publishing\s+(?:enabled|implemented|supported)\b/iu, "package publishing support"],
  ];

  for (const [pattern, forbiddenLabel] of forbiddenPatterns) {
    assert.doesNotMatch(text, pattern, `${label} must not imply ${forbiddenLabel}`);
  }
}

function pickRatioPackIdentity(pack) {
  return {
    id: pack.id,
    version: pack.version,
    contentIdentity: pack.contentIdentity,
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function escapeRegex(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
}
