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
  "2026-07-02-post-pr92-roadmap-truth-sync.md",
);

const blockedSurfaces = [
  "public package exports",
  "public npm publication",
  "package metadata changes",
  "lockfile or dependency changes",
  "hosted MCP runtime",
  "ChatGPT connector runtime",
  "OpenAI/provider calls",
  "image/CAD/Figma/provider adapter implementation",
  "prompt-derived source truth",
  "recommendation, optimization, correction, or beauty scoring",
  "automatic ratio-pack or family selection",
];

test("post-PR92 roadmap truth sync records the current merged guided inspection rail", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(decisionDocPath), true);

  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(
    roadmapDoc,
    "## Guided Inspection Package/API Readiness Gate After PR89",
  );
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "PR #169 / PR89",
    "local guided inspection demo surface",
    "PR #170 / PR90",
    "package/API readiness gate",
    "PR #171 / PR91",
    "427121f61bf5bda2effe02bdf93b5d5c4c0d9fca",
    "createGuidedInspectionArtifactContract",
    "PR #172 / PR92",
    "2a897b2e7c41a54081a80aa50f0c72b5f6341aa7",
    "bin/norma-core-guided-inspection-demo.mjs",
    "package-private guided inspection artifact contract",
  ]);
});

test("post-PR92 roadmap truth sync keeps result.json canonical and artifacts derived-only", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(
    roadmapDoc,
    "## Guided Inspection Package/API Readiness Gate After PR89",
  );
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "`result.json` remains the canonical machine-consumable Norma truth",
    "`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` are derived local inspection artifacts only",
    "must not treat those artifacts as source truth",
    "infer, correct, optimize, recommend, score, select families, or override Norma results",
    "PR86 metric-policy invariant",
    "accepted geometry, synthetic shared surfaces, normalized output compositions, Structured Analyze operation contexts, and derived inspection artifacts",
  ]);
});

test("post-PR92 roadmap truth sync names only the next local consumer proof", () => {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const currentStateSection = sectionForHeading(
    roadmapDoc,
    "## Guided Inspection Package/API Readiness Gate After PR89",
  );
  const combinedDocs = `${currentStateSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "The next safe implementation slice after this truth sync is a local guided inspection consumer proof",
    "consume the existing demo output and `result.json` from the local artifact envelope",
    "local caller can consume the existing demo output envelope and `result.json` through the package-private artifact contract",
    "must stay local, package-private, and structural",
    "PR93 records current roadmap truth only",
  ]);

  for (const blockedSurface of blockedSurfaces) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }
});

test("post-PR92 roadmap truth sync remains docs and tests only", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "does not change runtime behavior",
    "runtime source code",
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
    "hosted runtime",
    "connector runtime",
    "adapter behavior",
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
