import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const packageJson = JSON.parse(readFixture("package.json"));
const packageLock = JSON.parse(readFixture("package-lock.json"));
const decisionDoc = readFileSync(
  join(repoRoot, "docs/decisions/2026-07-03-package-publication-candidate-without-publishing.md"),
  "utf8",
);
const roadmap = readFixture("docs/BUSINESS_READINESS_ROADMAP.md");
const readme = readFixture("README.md");
const combinedDocs = `${decisionDoc}\n${roadmap}\n${readme}`;

test("PR100 keeps package publication blocked while adding only safe candidate metadata", () => {
  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.repository.type, "git");
  assert.equal(packageJson.repository.url, "git+https://github.com/panamini/norma-core.git");
  assert.equal(packageJson.bugs.url, "https://github.com/panamini/norma-core/issues");
  assert.deepEqual(packageJson.engines, { node: ">=22" });
  assert.deepEqual(packageLock.packages[""].engines, packageJson.engines);

  for (const fieldName of ["license", "publishConfig", "bin"]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
  }

  assert.deepEqual(packageJson.files, [
    "dist/src/**/*.d.ts",
    "dist/src/**/*.js",
    "README.md",
  ]);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.deepEqual(Object.keys(packageJson.scripts).sort(), [
    "build",
    "check",
    "norma:analyze",
    "norma:report",
    "pretest",
    "test",
  ]);
  assert.deepEqual(Object.keys(packageJson.devDependencies).sort(), ["typescript"]);
  assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock);
});

test("PR100 keeps lockfile changes limited to root package metadata consistency", () => {
  assert.equal(packageLock.name, "@norma/core");
  assert.equal(packageLock.version, "0.1.0");
  assert.equal(packageLock.packages[""].name, "@norma/core");
  assert.equal(packageLock.packages[""].version, "0.1.0");
  assert.deepEqual(packageLock.packages[""].engines, { node: ">=22" });
  assert.deepEqual(Object.keys(packageLock.packages[""].devDependencies).sort(), ["typescript"]);
  assert.deepEqual(packageLock.packages[""].dependencies, packageJson.dependencies);
  assert.equal(Object.hasOwn(packageLock.packages[""], "peerDependencies"), false);
  assert.equal(Object.hasOwn(packageLock.packages[""], "optionalDependencies"), false);
});

test("PR100 documents the manual release gate without approving publish operations", () => {
  for (const requiredText of [
    "PR100 finalizes the local `@norma/core` package publication candidate boundary without publishing",
    "No `license` field is added",
    "no authoritative root license file",
    "human/manual release gate is still required",
    "explicit maintainer license and public-publication authorization decision",
    "Until that decision exists, keep `@norma/core` private, local-only, and unpublished",
  ]) {
    assert.match(combinedDocs, new RegExp(escapeRegExp(requiredText), "u"));
  }

  for (const forbiddenApproval of [
    "PR100 approves npm publish",
    "PR100 approves registry mutation",
    "PR100 approves npm auth setup",
    "PR100 approves provenance",
    "PR100 approves trusted-publishing",
    "PR100 approves release workflow",
    "PR100 approves git tag",
    "PR100 approves version bump",
    "PR100 approves hosted MCP",
    "PR100 approves ChatGPT connector runtime",
    "PR100 approves OpenAI/provider calls",
    "PR100 approves image, CAD, Figma, or provider adapters",
  ]) {
    assert.doesNotMatch(combinedDocs, new RegExp(escapeRegExp(forbiddenApproval), "iu"));
  }
});

test("PR100 preserves the guided inspection package truth boundary", () => {
  for (const requiredText of [
    "The package root remains the only export",
    "createGuidedInspectionArtifactContractV1",
    "consumeGuidedInspectionDemoEnvelopeV1",
    "`result.json` remains the canonical machine-consumable Norma truth",
    "`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` remain derived local inspection artifacts only",
  ]) {
    assert.match(decisionDoc, new RegExp(escapeRegExp(requiredText), "u"));
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readFixture(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}
