import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const packageReadinessDocPath = join(repoRoot, "docs", "PACKAGE_PUBLICATION_READINESS.md");
const publicationGateDocPath = join(repoRoot, "docs", "PUBLIC_PACKAGE_PUBLISHING_GATE.md");
const decisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-30-post-r31-roadmap-truth-sync.md",
);

test("post-R31 roadmap truth sync records R30 and R31 as complete", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);

  assertDocMentions(roadmapDoc, [
    "This roadmap is synced through R31",
    "R30 is complete",
    "PR #152",
    "local Structured Analyze demo workflow smoke",
    "R31 is complete",
    "PR #153",
    "real-usecase Structured Analyze layout demo",
    "R26, R30, and R31 are roadmap/usecase stabilization checkpoints",
  ]);
});

test("post-R31 roadmap truth sync treats old PR30-PR33 labels as historical", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);

  assertDocMentions(roadmapDoc, [
    "The old PR30, PR31, PR32, and PR33 labels are historical context",
    "not the current execution queue",
    "not mandatory next work",
    "The next real work after R32 must be selected from current gaps, not stale roadmap labels",
  ]);

  assert.doesNotMatch(roadmapDoc, /\bmust\s+(?:complete|execute|start)\s+PR3[0-3]\b/i);
  assert.doesNotMatch(roadmapDoc, /\bnext\s+(?:mandatory|recommended)\s+PR\s*:\s*PR33\b/i);
});

test("post-R31 roadmap truth sync records existing package readiness gates and blocked surfaces", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);

  assertDocMentions(roadmapDoc, [
    "Package readiness and publication gate documents already exist",
    "docs/PACKAGE_PUBLICATION_READINESS.md",
    "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
    "do not publish the package without explicit maintainer approval",
    "do not add hosted or remote MCP expansion without explicit approval",
    "do not add image, CAD, Figma, Photoshop, or Illustrator adapters without explicit approval",
    "do not add recommendation, optimization, beauty scoring, or prompt-derived source truth",
  ]);

  for (const surface of [
    "public npm publication",
    "hosted dashboard",
    "API runtime",
    "hosted or remote MCP",
    "image, CAD, Figma, Photoshop, or Illustrator adapters",
    "recommendation, optimization, or beauty scoring",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(roadmapDoc, [surface]);
  }
});

test("post-R31 decision doc contains the same current truth and non-goals", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "PR #152 / R30 is merged",
    "PR #153 / R31 is merged",
    "65a9bbebd4e11548be33acb7eba3b38af3e31205",
    "Package readiness and publication gate documentation already exists",
    "There is no forced PR ladder after R31",
    "one small PR at a time",
    "select work from current repository gaps",
    "public npm publication",
    "hosted dashboard",
    "API runtime",
    "hosted or remote MCP",
    "image, CAD, Figma, Photoshop, or Illustrator adapters",
    "recommendation, optimization, or beauty scoring",
    "prompt-derived source truth",
    "does not change runtime behavior",
    "package metadata",
    "lockfiles",
    "wiki state",
  ]);
});

test("package gate docs do not claim PR33 is the active next mandatory PR", () => {
  const packageDocs = `${readDoc(packageReadinessDocPath)}\n${readDoc(publicationGateDocPath)}`;

  assertDocMentions(packageDocs, [
    "historical package-readiness context",
    "not the current execution queue after R31/R32 roadmap truth sync",
    "PR33 is historical context",
    "not the active next mandatory PR after the post-R31 roadmap truth sync",
    "Public npm publication is still blocked by design",
    "explicit maintainer approval",
  ]);

  assert.doesNotMatch(packageDocs, /\bNext recommended PR:\s*PR33\b/i);
  assert.doesNotMatch(packageDocs, /\bPR33\s+is\s+the\s+active\s+next\b/i);
  assert.doesNotMatch(packageDocs, /\bmust\s+(?:complete|execute|start)\s+PR33\b/i);
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), `${snippet} should be documented`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
