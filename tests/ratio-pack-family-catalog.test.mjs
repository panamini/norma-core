import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";

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

test("R28 cataloged fixtures validate with stable catalog identity fields", async () => {
  for (const entry of catalogEntries) {
    const pack = await readFixture(entry);
    const result = core.validateRatioPackV1(pack);

    assertOk(result, entry.packId);
    assert.equal(pack.id, entry.packId, entry.packId);
    assert.equal(pack.version, entry.version, entry.packId);
    assert.equal(pack.schemaVersion, entry.schemaVersion, entry.packId);
    assert.equal(pack.contentIdentity, entry.contentIdentity, entry.packId);
    assert.equal(result.output.id, entry.packId, entry.packId);
    assert.equal(result.output.version, entry.version, entry.packId);
    assert.equal(result.output.schemaVersion, entry.schemaVersion, entry.packId);
    assert.equal(result.output.contentIdentity, entry.contentIdentity, entry.packId);
  }
});

test("R28 cataloged rule sets and ratio family membership match fixture declarations", async () => {
  for (const entry of catalogEntries) {
    const pack = await readFixture(entry);
    const ruleSet = pack.ruleSets.find((candidate) => candidate.id === entry.ruleSetId);

    assert.ok(ruleSet, entry.ruleSetId);
    assert.deepEqual(pack.ratioFamilies.map((family) => family.id), entry.familyIds, entry.packId);
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
    "read-only projection of R13 ratio-pack registry and fixtures",
    "does not participate in runtime selection or validation",
    "no authority over execution",
    "explicitly declare a family identifier in structured input",
    "explicit structured input",
    "result.json",
    "canonical truth",
  ]) {
    assertIncludes(doc, requiredPhrase);
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
