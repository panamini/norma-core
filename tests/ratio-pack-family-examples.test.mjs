import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES,
} from "../dist/src/local-report/structured-analyze-report.js";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const docsPath = join(repoRoot, "docs/examples/ratio-pack-family-workflow.md");
const expectedOutputFiles = [...LOCAL_STRUCTURED_ANALYZE_REPORT_KIT_OUTPUT_FILES].sort();

const examples = Object.freeze([
  {
    label: "harmonic triads",
    examplePath: join(repoRoot, "examples/structured-analyze/families/harmonic-triads-basic.json"),
    fixturePath: join(repoRoot, "tests/fixtures/ratio-packs/norma-harmonic-triads-0.1.0.json"),
    packId: "norma.harmonic-triads",
    packVersion: "0.1.0",
    contentIdentity: "norma.harmonic-triads@0.1.0:ratio-pack-v1:synthetic-1-2-1",
    ruleSetRef: "surface-harmonic-triads",
    ratioPackRef: "norma.harmonic-triads@0.1.0",
  },
  {
    label: "root-two harmonics",
    examplePath: join(repoRoot, "examples/structured-analyze/families/root-two-harmonics-basic.json"),
    fixturePath: join(repoRoot, "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json"),
    packId: "norma.root-two-harmonics",
    packVersion: "0.1.0",
    contentIdentity: "norma.root-two-harmonics@0.1.0:ratio-pack-v1:root-two-surface-partition",
    ruleSetRef: "surface-root-two-section",
    ratioPackRef: "norma.root-two-harmonics@0.1.0",
  },
]);

test("R29 family examples exist, parse, and embed the expected fixture identity", async () => {
  for (const example of examples) {
    const input = await readJson(example.examplePath);
    const fixture = await readJson(example.fixturePath);

    assertJsonObject(input, `${example.label} example`);
    assert.deepEqual(
      pickRatioPackIdentity(input.ratioPack),
      pickRatioPackIdentity(fixture),
    );
    assert.deepEqual(pickRatioPackIdentity(input.ratioPack), {
      id: example.packId,
      version: example.packVersion,
      contentIdentity: example.contentIdentity,
    });
    assert.equal(input.ruleSetRef, example.ruleSetRef);
    assert.equal(input.packLock.packId, example.packId);
    assert.equal(input.packLock.packVersion, example.packVersion);
    assert.equal(input.packLock.contentIdentity, example.contentIdentity);
    assert.equal(input.operationContext.featureFlags.r29RunnableRatioPackFamilyExamples, true);

    const validation = core.validateRatioPackV1(input.ratioPack);
    assertOk(validation);
  }
});

test("R29 family examples run through Structured Analyze deterministically", async () => {
  for (const example of examples) {
    const input = await readJson(example.examplePath);
    const before = core.serializeCanonicalJson(input);
    const first = core.analyzeStructuredCompositionV1(input);
    const second = core.analyzeStructuredCompositionV1(input);

    assertValid(first);
    assert.deepEqual(first, second);
    assert.equal(core.serializeCanonicalJson(first), core.serializeCanonicalJson(second));
    assert.equal(core.serializeCanonicalJson(input), before);
    assert.equal(first.inputRefs.some((ref) => ref.kind === "ratio-pack" && ref.ref === example.ratioPackRef), true);
    assert.equal(first.inputRefs.some((ref) => ref.kind === "rule-set" && ref.ref === example.ruleSetRef), true);
    assert.equal(first.packLockRef.id, input.packLock.ref.id);
  }
});

test("R29 family examples produce canonical report result.json through the existing CLI", async () => {
  for (const example of examples) {
    const outputDir = await mkdtemp(join(tmpdir(), `norma-r29-${example.packId.replaceAll(".", "-")}-`));

    try {
      const input = await readJson(example.examplePath);
      const directResult = core.analyzeStructuredCompositionV1(structuredClone(input));
      const { stdout } = await execFileAsync(process.execPath, [reportCommandPath, example.examplePath, outputDir], {
        cwd: repoRoot,
      });
      const commandResult = JSON.parse(stdout);

      assert.equal(commandResult.status, "ok");
      assert.equal(commandResult.resultStatus, "valid");
      assert.deepEqual(await readdir(outputDir).then((files) => files.sort()), expectedOutputFiles);

      const resultText = await readFile(join(outputDir, "result.json"), "utf8");
      const result = JSON.parse(resultText);
      const summary = await readJson(join(outputDir, "summary.json"));
      const summaryMarkdown = await readFile(join(outputDir, "summary.md"), "utf8");
      const reportHtml = await readFile(join(outputDir, "report.html"), "utf8");
      const visualSvg = await readFile(join(outputDir, "visual.svg"), "utf8");

      assert.deepEqual(result, directResult);
      assert.equal(resultText, `${core.serializeCanonicalJson(directResult)}\n`);
      assert.equal(summary.input.ratioPackRef, example.ratioPackRef);
      assert.equal(summary.input.ruleSetRef, example.ruleSetRef);
      assert.match(summaryMarkdown, new RegExp(escapeRegex(example.ratioPackRef), "u"));
      assert.match(summaryMarkdown, new RegExp(escapeRegex(example.ruleSetRef), "u"));
      assert.match(reportHtml, new RegExp(escapeRegex(example.ratioPackRef), "u"));
      assert.match(reportHtml, new RegExp(escapeRegex(example.ruleSetRef), "u"));
      assert.doesNotMatch(visualSvg, /<script\b/iu);
      assertNoPositiveBoundaryClaims(`${summaryMarkdown}\n${reportHtml}\n${visualSvg}`);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  }
});

test("R29 workflow docs preserve the explicit local-only family boundary", async () => {
  const docs = await readFile(docsPath, "utf8");

  for (const requiredText of [
    "node bin/norma-core-report.mjs examples/structured-analyze/families/harmonic-triads-basic.json",
    "node bin/norma-core-report.mjs examples/structured-analyze/families/root-two-harmonics-basic.json",
    "`result.json` is the canonical Norma truth",
    "derived local inspection",
    "not a new API surface",
    "Norma Core does not choose, infer, select",
    "image, CAD, GPT, provider",
    "hosted dashboard, webapp",
  ]) {
    assert.match(docs, new RegExp(escapeRegex(requiredText), "u"));
  }

  assertNoPositiveBoundaryClaims(docs);
});

function assertJsonObject(value, label) {
  assert.equal(value !== null && typeof value === "object" && !Array.isArray(value), true, label);
}

function pickRatioPackIdentity(pack) {
  return {
    id: pack.id,
    version: pack.version,
    contentIdentity: pack.contentIdentity,
  };
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

function assertNoPositiveBoundaryClaims(text) {
  assert.doesNotMatch(
    text,
    /\b(?:recommended family|chosen family|selected family|inferred family|optimizes family|optimized family|beauty score: [0-9]|aesthetic score: [0-9]|intent inference enabled|prompt-derived ratio choice|image-derived ratio choice|automatic correction enabled|automatic family selection enabled|runtime registry enabled|package export added)\b/iu,
  );
}

function escapeRegex(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
