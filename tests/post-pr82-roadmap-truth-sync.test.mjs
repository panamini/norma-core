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
  "2026-07-01-post-pr82-roadmap-truth-sync.md",
);

test("post-PR82 roadmap truth sync records the current merged PR82 state", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(roadmapDoc, "## Current State After PR82");
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assert.equal(existsSync(decisionDocPath), true);

  assertDocMentions(combinedDocs, [
    "Norma Core is current through PR #162 / PR82",
    "6537b3a59fedd348d693a12e319e910a6a7283dd",
    "PR #153 / R31",
    "real-usecase Structured Analyze layout demo",
    "PR #154 / R32",
    "PR #155 / R32",
    "real-usecase local inspection demo smoke",
    "PR #156 / R33",
    "local truth projection smoke",
    "PR #157 / R34",
    "real-usecase local demo command",
    "PR #158 / R35",
    "PR #159 / R36",
    "local CLI report boundary",
    "PR #160 / PR81",
    "package-private accepted geometry to Core mapper",
    "PR #161",
    "PR81 mapper review findings",
    "PR #162 / PR82",
    "synthetic accepted geometry to Structured Analyze bridge",
  ]);
});

test("post-PR82 roadmap truth sync preserves accepted geometry and exposure boundaries", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(roadmapDoc, "## Current State After PR82");
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "mapAcceptedGeometryToCoreV1",
    "package-private mapper",
    "not a package-root export",
    "not a provider adapter",
    "not a perception layer",
    "not a source-truth shortcut",
    "rectangle-only synthetic `AcceptedGeometry@1` payloads",
    "explicit synthetic shared-unit-surface normalization step",
    "analyzeStructuredCompositionV1",
    "unsupported accepted-geometry primitives stop at the mapper",
  ]);

  for (const blockedSurface of [
    "provider ingestion",
    "image analysis",
    "OpenAI or ChatGPT runtime behavior",
    "camera/CAD/Figma/Photoshop/Illustrator adapters",
    "hosted MCP",
    "remote API runtime",
    "UI/dashboard behavior",
    "package publication",
    "public package exports",
    "automatic ratio-pack or family selection",
    "recommendation, optimization, correction, beauty scoring",
    "prompt inference",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }
});

test("post-PR82 roadmap truth sync records no forced ladder after PR83", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(roadmapDoc, "## Current State After PR82");
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "PR83 is this docs/tests-only post-PR82 roadmap truth-sync checkpoint",
    "The next real work after PR83 must be selected from current gaps, not stale roadmap labels",
    "There is no forced PR ladder after PR82",
    "one small PR at a time",
    "select work from current repository gaps",
  ]);

  assert.doesNotMatch(combinedDocs, /\bnext\s+(?:mandatory|recommended)\s+PR\s*:\s*PR8[4-9]\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+(?:complete|execute|start)\s+PR8[4-9]\b/i);
});

test("post-PR82 roadmap truth sync remains docs and tests only", () => {
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
