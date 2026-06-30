import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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
const reportCommandPath = join(repoRoot, "bin/norma-core-report.mjs");
const docsPath = join(repoRoot, "docs/examples/ratio-pack-family-workflow.md");

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
      await execFileAsync(process.execPath, [reportCommandPath, example.examplePath, outputDir], {
        cwd: repoRoot,
      });
      const outputFiles = await readdir(outputDir);

      assert.ok(outputFiles.length > 0);
      assert.equal(outputFiles.includes("result.json"), true);

      const resultText = await readFile(join(outputDir, "result.json"), "utf8");
      const result = JSON.parse(resultText);

      assert.deepEqual(result, directResult);
      assert.equal(resultText, `${core.serializeCanonicalJson(directResult)}\n`);
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
    "non-authoritative",
  ]) {
    assert.match(docs, new RegExp(escapeRegex(requiredText), "u"));
  }

  assertNoRuntimeBoundaryFlags(docs);
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

function assertNoRuntimeBoundaryFlags(text) {
  assert.doesNotMatch(
    text,
    /\b(?:runtime registry enabled|inference enabled|recommendation engine|automatic family selection enabled)\b/iu,
  );
}

function escapeRegex(value) {
  return value.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
