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
  "2026-06-28-local-inspection-surface-boundary.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const onboardingDocPath = join(repoRoot, "docs", "onboarding", "README.md");
const readOnlyViewerWorkflowDocPath = join(
  repoRoot,
  "docs",
  "examples",
  "read-only-result-viewer-workflow.md",
);
const localReportKitDocPath = join(repoRoot, "docs", "local-structured-analyze-report-kit.md");

const derivedInspectionArtifacts = [
  "summary.json",
  "summary.md",
  "visual.svg",
  "report.html",
  "viewer output",
];

const forbiddenApprovals = [
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

test("R19 local inspection boundary decision exists and keeps result output canonical", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);

  assertDocMentions(decisionDoc, [
    "# Local Inspection Surface Boundary",
    "PR #140",
    "R18",
    "Norma Core has local inspection surfaces",
    "local-only",
    "derived-only",
    "result.json",
    "direct engine output remain canonical Norma truth",
    "analyzeStructuredCompositionV1",
    "package consumption remains local/private",
  ]);
});

test("R19 docs define report and viewer output as derived inspection artifacts only", () => {
  const combinedDocs = [
    readDoc(decisionDocPath),
    readDoc(businessRoadmapDocPath),
    readDoc(localReportKitDocPath),
  ].join("\n");

  assertDocMentions(combinedDocs, ["result.json", "canonical"]);

  for (const artifact of derivedInspectionArtifacts) {
    assertDocMentions(combinedDocs, [artifact]);
  }

  assertDocMentions(combinedDocs, [
    "derived local inspection artifacts only",
    "derived local inspection views",
    "viewer output",
    "must not define, recompute, infer, correct, optimize, recommend, score, or override Norma results",
  ]);
});

test("R19 docs do not approve product, remote, package, or new logic surfaces", () => {
  const combinedDocs = [readDoc(decisionDocPath), readDoc(businessRoadmapDocPath)].join("\n");

  for (const forbiddenApproval of forbiddenApprovals) {
    assertDocMentions(combinedDocs, [forbiddenApproval]);
  }

  assertNoApproval(combinedDocs, "hosted dashboard");
  assertNoApproval(combinedDocs, "public webapp");
  assertNoApproval(combinedDocs, "SDK");
  assertNoApproval(combinedDocs, "API runtime");
  assertNoApproval(combinedDocs, "public npm publication");
  assertNoApproval(combinedDocs, "hosted MCP");
  assertNoApproval(combinedDocs, "remote MCP");
  assertNoApproval(combinedDocs, "recommendation logic");
  assertNoApproval(combinedDocs, "optimization logic");
  assertNoApproval(combinedDocs, "scoring logic");
  assertNoApproval(combinedDocs, "inference logic");
  assertNoApproval(combinedDocs, "correction logic");
});

test("R19 approval guard catches punctuation-separated approval wording", () => {
  assert.throws(
    () => assertNoApproval("Approved: hosted dashboard", "hosted dashboard"),
    /hosted dashboard approval wording must remain absent/,
  );
  assert.throws(
    () => assertNoApproval("Approved, public webapp", "public webapp"),
    /public webapp approval wording must remain absent/,
  );
  assert.throws(
    () => assertNoApproval("hosted MCP: approved", "hosted MCP"),
    /hosted MCP approval wording must remain absent/,
  );
  assert.throws(
    () => assertNoApproval("remote MCP is approved", "remote MCP"),
    /remote MCP approval wording must remain absent/,
  );
});

test("R19 onboarding and examples no longer describe current inspection surfaces as inert or hypothetical", () => {
  const onboardingDoc = readDoc(onboardingDocPath);
  const readOnlyViewerWorkflowDoc = readDoc(readOnlyViewerWorkflowDocPath);
  const combinedDocs = `${onboardingDoc}\n${readOnlyViewerWorkflowDoc}`;

  assertDocMentions(combinedDocs, [
    "current local inspection workflow",
    "current local-only inspection workflow",
    "inspection-only views over existing Norma output",
    "does not add a product surface",
    "does not execute Norma operations",
    "Displayability is not source-truth validation",
  ]);

  assert.doesNotMatch(combinedDocs, /inert documentation only/i);
  assert.doesNotMatch(combinedDocs, /\bhypothetical\b/i);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
