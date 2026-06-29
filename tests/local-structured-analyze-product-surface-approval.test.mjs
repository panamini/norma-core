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
  "2026-06-28-local-structured-analyze-product-surface-approval.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const r19DecisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-28-local-inspection-surface-boundary.md",
);
const r20DecisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-28-structured-analyze-product-scope-alignment.md",
);
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

const blockedSurfaces = [
  "hosted dashboard",
  "public webapp",
  "SDK",
  "API runtime",
  "public npm publication",
  "hosted MCP",
  "remote MCP",
  "recommendation logic",
  "optimization logic",
  "scoring logic",
  "inference logic",
  "correction logic",
];

test("R21 decision doc exists and references R19 and R20", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "# Local Structured Analyze Product-Surface Approval",
    "R21 is an approval gate only",
    "PR #141",
    "R19",
    "PR #142",
    "R20",
    "R19 remains the current authoritative local inspection boundary",
    "R20 remains the current documentation interpretation checkpoint",
  ]);
});

test("R21 approves only a future separate local-only static read-only inspection surface", () => {
  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "R21 approves only the future product-surface implementation scope for a separate local-only, static, read-only Structured Analyze inspection surface",
    "direct engine result object",
    "result.json",
    "existing report bundle artifacts",
    "future implementation must remain local-only, static, read-only, separate, optional, and scoped",
    "The future implementation must be a separate PR",
    "R22: local Structured Analyze inspection surface implementation",
  ]);
});

test("R21 does not implement UI or change runtime contracts", () => {
  const combinedDocs = [readDoc(decisionDocPath), readDoc(businessRoadmapDocPath)].join("\n");

  assertDocMentions(combinedDocs, [
    "R21 itself does not implement UI",
    "R21 does not implement UI, define Norma truth, execute analysis, recompute results",
    "R21 does not define or modify engine correctness or runtime contracts",
    "R21 changes no engine, MCP, CLI, report-kit, viewer, package export, schema, example, package metadata, lockfile, or runtime behavior",
  ]);

  assert.doesNotMatch(combinedDocs, /\bR21\s+implements\s+UI\b/i);
  assert.doesNotMatch(combinedDocs, /\bR21\s+(?:defines|modifies)\s+engine\s+correctness\b/i);
  assert.doesNotMatch(combinedDocs, /\bR21\s+(?:defines|modifies)\s+runtime\s+contracts\b/i);
});

test("R21 does not approve hosted public package remote or logic surfaces", () => {
  const combinedDocs = [readDoc(decisionDocPath), readDoc(businessRoadmapDocPath)].join("\n");

  for (const blockedSurface of blockedSurfaces) {
    assertDocMentions(combinedDocs, [blockedSurface]);
    assertNoApproval(combinedDocs, blockedSurface);
  }

  assertDocMentions(combinedDocs, [
    "image/vision/CAD/provider input",
    "image input",
    "vision input",
    "CAD input",
    "provider input",
  ]);
});

test("R21 contextualizes PR55 and PR56 without modifying them", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const pr55RequirementsDoc = readDoc(pr55RequirementsDocPath);
  const pr56PlanDoc = readDoc(pr56PlanDocPath);

  assertDocMentions(decisionDoc, [
    "PR55 product requirements remain useful product-context documentation",
    "docs/decisions/2026-06-16-read-only-result-viewer-product-requirements.md",
    "PR56 viewer plan remains useful viewer-context documentation",
    "docs/plans/2026-06-16-read-only-result-viewer-plan.md",
    "PR55 and PR56 remain useful context, but R21 is the current narrow approval gate",
    "R21 does not rewrite PR55 or PR56",
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
  assert.doesNotMatch(pr55RequirementsDoc, /\bR21\b/);
  assert.doesNotMatch(pr56PlanDoc, /\bR21\b/);
});

test("R21 preserves R19 and R20 source boundaries", () => {
  const r19DecisionDoc = readDoc(r19DecisionDocPath);
  const r20DecisionDoc = readDoc(r20DecisionDocPath);

  assertDocMentions(r19DecisionDoc, [
    "Norma Core has local inspection surfaces",
    "result.json",
    "direct engine output remain canonical Norma truth",
    "derived local inspection artifacts only",
  ]);
  assertDocMentions(r20DecisionDoc, [
    "R20 is a documentation alignment checkpoint only",
    "R19 remains the current authoritative local inspection boundary",
    "PR55 and PR56 do not imply current approval for new UI implementation or any new product surface",
  ]);
  assert.doesNotMatch(r19DecisionDoc, /\bR21\b/);
  assert.doesNotMatch(r20DecisionDoc, /\bR21\b/);
});

test("R21 roadmap records an approval gate only", () => {
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const r21RoadmapSection = sectionForHeading(
    businessRoadmapDoc,
    "## R21 Local Structured Analyze Product-Surface Approval Gate",
  );

  assertDocMentions(r21RoadmapSection, [
    "R21 is an approval gate only",
    "PR #142",
    "R20",
    "does not implement UI or change runtime behavior",
    "R21 approves only the future product-surface implementation scope",
    "direct engine result objects",
    "result.json",
    "existing report bundle artifacts",
    "R19 remains the current authoritative local inspection boundary",
    "R20 remains the current documentation interpretation checkpoint",
    "R22: local Structured Analyze inspection surface implementation",
  ]);

  assertNoApproval(r21RoadmapSection, "hosted dashboard");
  assertNoApproval(r21RoadmapSection, "public webapp");
  assertNoApproval(r21RoadmapSection, "API runtime");
  assertNoApproval(r21RoadmapSection, "hosted MCP");
  assertNoApproval(r21RoadmapSection, "remote MCP");
});

test("R21 approval guard catches punctuation-separated forbidden approval wording", () => {
  assert.throws(
    () => assertNoApproval("Approved: hosted dashboard", "hosted dashboard"),
    /hosted dashboard approval wording must remain absent/,
  );
  assert.throws(
    () => assertNoApproval("Approved, public webapp", "public webapp"),
    /public webapp approval wording must remain absent/,
  );
  assert.throws(
    () => assertNoApproval("API runtime: approved", "API runtime"),
    /API runtime approval wording must remain absent/,
  );
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
