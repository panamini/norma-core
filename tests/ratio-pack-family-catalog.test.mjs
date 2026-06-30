import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  ratioPackFamilyCatalogBoundaryChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const catalogDocPath = join(repoRoot, "docs/ratio-pack-family-catalog.md");

const catalogEntries = Object.freeze([
  Object.freeze({
    packId: "norma.harmonic-triads",
    version: "0.1.0",
    schemaVersion: "ratio-pack-v1",
    contentIdentity: "norma.harmonic-triads@0.1.0:ratio-pack-v1:synthetic-1-2-1",
    fixturePath: "tests/fixtures/ratio-packs/norma-harmonic-triads-0.1.0.json",
    ruleSetId: "surface-harmonic-triads",
    familyIds: ["harmonic-triad"],
  }),
  Object.freeze({
    packId: "norma.root-two-harmonics",
    version: "0.1.0",
    schemaVersion: "ratio-pack-v1",
    contentIdentity: "norma.root-two-harmonics@0.1.0:ratio-pack-v1:root-two-surface-partition",
    fixturePath: "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json",
    ruleSetId: "surface-root-two-section",
    familyIds: ["root-two-section", "halves"],
  }),
]);

test("R28 catalog documents only existing authored ratio-pack fixtures", async () => {
  for (const entry of catalogEntries) {
    await access(join(repoRoot, entry.fixturePath));
  }
});

test("R28 cataloged fixtures validate as explicit ratio-pack-v1 data", async () => {
  for (const entry of catalogEntries) {
    const pack = await readFixture(entry);
    const result = core.validateRatioPackV1(pack);

    assertOk(result, entry.packId);
    assert.equal(pack.id, entry.packId, entry.packId);
    assert.equal(pack.version, entry.version, entry.packId);
    assert.equal(pack.schemaVersion, entry.schemaVersion, entry.packId);
    assert.equal(pack.contentIdentity, entry.contentIdentity, entry.packId);
    assert.deepEqual(pack.limits, {
      noBeautyClaims: true,
      noIntentInference: true,
      noUiPreset: true,
    }, entry.packId);
    assert.deepEqual(pack.preLock, {
      kind: "pack-lock-prelock",
      ref: `prelock:${entry.packId}@${entry.version}`,
      packId: entry.packId,
      packVersion: entry.version,
      schemaVersion: entry.schemaVersion,
      contentIdentity: entry.contentIdentity,
      final: false,
    }, entry.packId);
    assert.equal(result.output.id, entry.packId, entry.packId);
    assert.equal(result.output.version, entry.version, entry.packId);
    assert.equal(result.output.schemaVersion, entry.schemaVersion, entry.packId);
    assert.equal(result.output.contentIdentity, entry.contentIdentity, entry.packId);
    assert.equal(result.packLockRef.id, pack.preLock.ref, entry.packId);
  }
});

test("R28 cataloged rule sets and ratio families are structurally intact", async () => {
  for (const entry of catalogEntries) {
    const pack = await readFixture(entry);
    const ratioIds = new Set(pack.ratios.map((ratio) => ratio.id));
    const ruleDeclarationsById = new Map(pack.ruleDeclarations.map((declaration) => [declaration.id, declaration]));
    const ruleSet = pack.ruleSets.find((candidate) => candidate.id === entry.ruleSetId);

    assert.ok(ruleSet, entry.ruleSetId);
    assert.deepEqual(pack.ratioFamilies.map((family) => family.id), entry.familyIds, entry.packId);

    for (const ruleRef of ruleSet.ruleRefs) {
      assert.ok(ruleDeclarationsById.has(ruleRef), `${entry.ruleSetId}:${ruleRef}`);
    }

    for (const family of pack.ratioFamilies) {
      assert.ok(family.ratioRefs.length > 0, `${entry.packId}:${family.id}`);
      for (const ratioRef of family.ratioRefs) {
        assert.ok(ratioIds.has(ratioRef), `${entry.packId}:${family.id}:${ratioRef}`);
      }
    }

    for (const pattern of pack.partitionPatterns) {
      assert.ok(pattern.ratioRefs.length > 0, `${entry.packId}:${pattern.id}`);
      for (const ratioRef of pattern.ratioRefs) {
        assert.ok(ratioIds.has(ratioRef), `${entry.packId}:${pattern.id}:${ratioRef}`);
      }
    }

    for (const declaration of pack.ruleDeclarations) {
      assert.equal(declaration.declarationOnly, true, `${entry.packId}:${declaration.id}`);
      assert.equal(declaration.requiresCoreSupport, true, `${entry.packId}:${declaration.id}`);
    }
  }
});

test("R28 catalog documentation stays in parity with fixture identity and source-truth wording", async () => {
  const doc = await readText(catalogDocPath);

  for (const entry of catalogEntries) {
    assertIncludes(doc, `${entry.packId}@${entry.version}`);
    assertIncludes(doc, entry.fixturePath);
    assertIncludes(doc, entry.contentIdentity);
    assertIncludes(doc, entry.ruleSetId);
  }

  for (const requiredPhrase of [
    "not a runtime registry",
    "not a package export",
    "explicit structured input",
    "result.json",
    "canonical truth",
  ]) {
    assertIncludes(doc, requiredPhrase);
  }
});

test("R28 catalog documentation does not use positive semantic-drift language", async () => {
  const doc = await readText(catalogDocPath);

  assert.doesNotMatch(
    doc,
    /\b(?:recommend(?:s|ed|ing|ation)?|optimization|optimi[sz]e[sd]?|beauty score|aesthetic score|intent inference|prompt-derived ratio choice|image-derived ratio choice|automatic correction|UI preset)\b/iu,
  );
  assert.doesNotMatch(
    doc,
    /\b(?:is|adds?|provides?|exposes?|exports?|ships?)\s+(?:a\s+)?(?:runtime registry|package export)\b/iu,
  );
});

test("R28 changed-file guard rejects runtime, export, package, and catalog-data extras", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(ratioPackFamilyCatalogBoundaryChangedFiles),
    ratioPackFamilyCatalogBoundaryChangedFiles,
  );

  for (const forbiddenFile of [
    "src/ratio-pack.ts",
    "src/structured-composition-analysis.ts",
    "src/index.ts",
    "src/runtime.ts",
    "src/mcp/stdio-protocol.ts",
    "src/cli/analyze.ts",
    "src/local-report/structured-analyze-report.ts",
    "src/local-report/visual-viewer.ts",
    "src/local-viewer/read-only-viewer-model.ts",
    "bin/norma-cli.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "viewer/read-only-result-viewer.js",
    "viewer/read-only-result-viewer.css",
    "examples/structured-analyze/geometry-harmony-basic.json",
    "examples/structured-analyze/scenarios/alignment-basic.json",
    "tests/fixtures/ratio-packs/norma-harmonic-triads-0.1.0.json",
    "tests/fixtures/ratio-packs/norma-root-two-harmonics-0.1.0.json",
    "catalog.json",
    "docs/ratio-pack-family-catalog.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...ratioPackFamilyCatalogBoundaryChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

async function readFixture(entry) {
  return JSON.parse(await readText(join(repoRoot, entry.fixturePath)));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

function assertIncludes(text, expected) {
  assert.equal(text.includes(expected), true, expected);
}

function assertOk(result, label) {
  assert.equal(result.status, "ok", label);
  assert.equal(result.errors.length, 0, label);
  assert.ok(result.output, label);
}
