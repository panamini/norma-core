import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const decisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-01-post-pr86-roadmap-truth-sync.md",
);

test("post-PR86 roadmap truth sync records the current merged PR86 state", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(decisionDocPath), true);

  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(roadmapDoc, "## Current State After PR86");
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "Norma Core is current through PR #166 / PR86",
    "2a2152c1bf90768a5540141f8d91196c32239735",
    "PR #163 / PR83",
    "post-PR82 roadmap truth sync",
    "PR #164 / PR84",
    "accepted-geometry integration determinism",
    "PR #165 / PR85",
    "synthetic shared-unit-surface normalization helper",
    "PR #166 / PR86",
    "preserved metric policy through the normalizer",
  ]);
});

test("post-PR86 roadmap truth sync records the accepted-geometry bridge closeout boundary", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(roadmapDoc, "## Current State After PR86");
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "accepted-geometry local/private bridge rail is closed through PR86",
    "mapAcceptedGeometryToCoreV1",
    "package-private mapper",
    "package-private shared-unit-surface normalizer",
    "surface-only metric policies",
    "synthetic shared surface and normalized output compositions",
    "analyzeStructuredCompositionV1",
    "unsupported accepted-geometry primitives stop at the mapper",
  ]);

  for (const blockedSurface of [
    "provider ingestion",
    "image analysis",
    "OpenAI or ChatGPT runtime behavior",
    "hosted MCP",
    "remote API runtime",
    "package publication",
    "public package exports",
    "automatic ratio-pack or family selection",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }
});

test("post-PR86 roadmap truth sync records no forced ladder after PR87", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(roadmapDoc, "## Current State After PR86");
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "PR87 is this docs/tests-only post-PR86 roadmap truth-sync checkpoint",
    "There is no forced PR ladder after PR86",
    "The next real work after PR87 must be selected from current repository gaps, not stale roadmap labels",
    "one small PR at a time",
    "select work from current repository gaps",
  ]);

  assert.doesNotMatch(combinedDocs, /\bnext\s+(?:mandatory|recommended)\s+PR\s*:\s*PR8[8-9]\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+(?:complete|execute|start)\s+PR8[8-9]\b/i);
});

test("post-PR86 roadmap truth sync remains docs and tests only", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "does not change runtime behavior",
    "source code",
    "package metadata",
    "lockfiles",
    "CLI behavior",
    "MCP behavior",
    "report-kit behavior",
    "viewer behavior",
    "examples",
    "schemas",
    "dependencies",
    "publication state",
    "wiki state",
    "provider behavior",
    "remote services",
  ]);
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function sectionForHeading(doc, heading) {
  const start = doc.indexOf(heading);

  assert.notEqual(start, -1, `${heading} should exist`);

  const nextHeading = doc.indexOf("\n## ", start + heading.length);

  return nextHeading === -1 ? doc.slice(start) : doc.slice(start, nextHeading);
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), `${snippet} should be documented`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
