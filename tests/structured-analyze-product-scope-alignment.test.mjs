import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const decisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-28-structured-analyze-product-scope-alignment.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const pr55RequirementsDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-16-read-only-result-viewer-product-requirements.md",
);
const pr56PlanDocPath = join(
  repoRoot,
  "docs",
  "plans",
  "2026-06-16-read-only-result-viewer-plan.md",
);

test("R20 decision doc exists and references PR141 R19 as the current inspection boundary", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "# Structured Analyze Product-Scope Alignment",
    "PR #141",
    "R19",
    "current authoritative local inspection boundary",
    "documentation alignment checkpoint only",
    "result.json",
    "direct engine output remain canonical Norma truth",
    "summary.json",
    "summary.md",
    "visual.svg",
    "report.html",
    "viewer output",
    "derived inspection artifacts",
  ]);
});

test("R20 contextualizes PR55 and PR56 without rewriting their source documents", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const pr55RequirementsDoc = readDoc(pr55RequirementsDocPath);
  const pr56PlanDoc = readDoc(pr56PlanDocPath);

  assertDocMentions(decisionDoc, [
    "PR55 product requirements remain useful product-context documentation",
    "docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md",
    "PR56 viewer plan remains useful viewer-context documentation",
    "docs/plans/2026-06-16-read-only-result-viewer-plan.md",
    "PR55 and PR56 do not imply current approval for new UI implementation or any new product surface",
    "R20 does not rewrite PR55 or PR56",
  ]);

  assertDocMentions(pr55RequirementsDoc, [
    "PR55 is docs/contract-tests only",
    "PR55 is product-requirements only",
    "PR55 does not implement UI",
    "PR55 approves no implementation",
  ]);
  assertDocMentions(pr56PlanDoc, [
    "PR56 is docs/contract-tests only",
    "PR56 is viewer-plan only",
    "PR56 does not implement UI",
    "PR56 approves no implementation",
  ]);
});

test("R20 does not approve UI implementation or a product surface", () => {
  const combinedDocs = [readDoc(decisionDocPath), readDoc(businessRoadmapDocPath)].join("\n");

  assertDocMentions(combinedDocs, [
    "R20 does not approve UI implementation",
    "R20 does not approve any new product surface",
    "R20 does not approve a hosted dashboard direction",
    "Future product or UI work requires a separate explicit approval PR",
  ]);

  assertNoApproval(combinedDocs, "UI implementation");
  assertNoApproval(combinedDocs, "new product surface");
  assertNoApproval(combinedDocs, "product surface");
  assertNoApproval(combinedDocs, "hosted dashboard");
});

test("R20 roadmap entry records an alignment checkpoint only", () => {
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const r20RoadmapSection = sectionForHeading(
    businessRoadmapDoc,
    "## R20 Structured Analyze Product-Scope Alignment Checkpoint",
  );

  assertDocMentions(r20RoadmapSection, [
    "documentation interpretation checkpoint",
    "PR #141",
    "R19",
    "current R19 local inspection boundary",
    "R19 remains the current authoritative local inspection boundary",
    "PR55 and PR56 viewer documentation remains useful product and viewer context",
    "does not imply current approval for new UI implementation or any new product surface",
  ]);

  assertNoApproval(r20RoadmapSection, "UI implementation");
  assertNoApproval(r20RoadmapSection, "new product surface");
  assertNoApproval(r20RoadmapSection, "product surface");
});

test("R20 introduces no engine or runtime contract assumptions", () => {
  const combinedDocs = [readDoc(decisionDocPath), readDoc(businessRoadmapDocPath)].join("\n");

  assertDocMentions(combinedDocs, [
    "R20 does not define or modify engine correctness or runtime contracts",
    "R20 does not redefine deterministic output behavior, artifact semantics, or global architecture policy",
    "R20 changes no engine, MCP, CLI, report-kit, viewer, package export, schema, example, package metadata, lockfile, or runtime behavior",
  ]);

  assert.doesNotMatch(combinedDocs, /\bengine correctness\s+is\s+(?:defined|changed|approved)\b/i);
  assert.doesNotMatch(combinedDocs, /\bruntime contract\s+is\s+(?:defined|changed|approved)\b/i);
  assert.doesNotMatch(combinedDocs, /\bnew runtime contract\b/i);
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), `${snippet} should be documented`);
  }
}

function assertNoApproval(doc, surface) {
  for (const approvalPattern of approvalPatterns(surface)) {
    assert.doesNotMatch(
      doc,
      approvalPattern,
      `${surface} approval wording must remain absent`,
    );
  }
}

function approvalPatterns(surface) {
  const surfacePattern = escapeRegExp(surface).replace(/\s+/g, "\\s+");
  const separator = "[\\s:;,.-]+";

  return [
    new RegExp(`\\b${surfacePattern}\\b(?:\\s+(?:is|are|was|were))?${separator}approved\\b`, "i"),
    new RegExp(`(?:^|[\\n.;])\\s*(?:[-*]\\s*)?approved\\b${separator}${surfacePattern}\\b`, "i"),
  ];
}

function sectionForHeading(doc, heading) {
  const start = doc.indexOf(heading);
  assert.notEqual(start, -1, `${heading} should exist`);
  const nextHeading = doc.slice(start + heading.length).match(/\n##\s+/);
  const end = nextHeading ? start + heading.length + nextHeading.index : doc.length;
  return doc.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
