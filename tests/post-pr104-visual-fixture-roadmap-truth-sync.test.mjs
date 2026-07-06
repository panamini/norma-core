import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  postPr104VisualFixtureRoadmapTruthSyncChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const decisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-06-post-pr104-visual-fixture-roadmap-truth-sync.md",
);

test("PR105 records the post-PR104 visual fixture rail truth", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const roadmapSection = sectionForHeading(businessRoadmapDoc, "## Visual Fixture Roadmap Truth Sync After PR104");
  const combinedDocs = `${roadmapSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "PR102 approved the local-only visual adapter fixture contract",
    "PR103 added the static synthetic visual fixture handoff proof",
    "PR104 added the local visual fixture guided inspection demo",
    "local-only",
    "synthetic",
    "static",
    "fixture/demo proof only",
  ]);
});

test("PR105 locks candidate evidence, accepted geometry, canonical truth, and derived artifact boundaries", () => {
  const combinedDocs = `${readDoc(businessRoadmapDocPath)}\n${readDoc(decisionDocPath)}`;

  assertDocMentions(combinedDocs, [
    "Visual observations are candidate evidence only",
    "The only accepted bridge into existing Norma Core / Structured Analyze in this rail is explicit accepted structured geometry",
    "`result.json` remains canonical Norma truth",
    "`guide.html`, `visual.svg`, `summary.json`, `summary.md`, report artifacts, overlays, observations, and prompts are derived or evidence-only artifacts",
    "They may be referenced only as derived inspection evidence",
    "package API truth",
  ]);

  for (const derivedArtifact of [
    "guide.html",
    "visual.svg",
    "summary.json",
    "summary.md",
    "report artifacts",
    "overlays",
    "observations",
    "prompts",
  ]) {
    assertDocMentions(combinedDocs, [derivedArtifact]);
  }

  assertNoApproval(combinedDocs, "visual observations");
  assertNoApproval(combinedDocs, "derived artifacts");
  assertNoApproval(combinedDocs, "prompts");
});

test("PR105 keeps blocked visual, provider, publication, and product surfaces blocked", () => {
  const combinedDocs = `${readDoc(businessRoadmapDocPath)}\n${readDoc(decisionDocPath)}`;

  for (const blockedSurface of [
    "real image recognition",
    "provider/OpenAI calls",
    "CAD/Figma import",
    "hosted MCP",
    "ChatGPT connector runtime",
    "package publication",
    "new visual-fixture or additional package-root public exports",
    "recommendation",
    "correction",
    "optimization",
    "scoring",
    "beauty judgment",
    "automatic family selection",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
    assertNoApproval(combinedDocs, blockedSurface);
  }

  assert.doesNotMatch(combinedDocs, /\bpackage\s+publication,\s+public\s+exports\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+not\s+become\s+source\s+truth,\s+Core\s+input,\s+package\s+API,\s+future\s+connector\s+schema\b/i);
});

test("PR105 names only the PR106 through PR108 next sequence without over-specifying it", () => {
  const combinedDocs = `${readDoc(businessRoadmapDocPath)}\n${readDoc(decisionDocPath)}`;
  const nextSequenceSection = sectionForHeading(combinedDocs, "## Next Sequence");

  assertDocMentions(nextSequenceSection, [
    "PR106: local consumer proof for PR104 visual fixture demo envelope/result",
    "PR107: static synthetic scenario corpus, 2-3 fixtures, still no recognition",
    "PR108: decision PR for first real external track",
    "does not over-specify PR106, PR107, or PR108",
  ]);

  assert.doesNotMatch(nextSequenceSection, futurePrAfterPr108Pattern());
  assert.doesNotMatch(nextSequenceSection, /\bmust\s+(?:implement|add|change|publish|deploy|call)\b/i);
  assert.doesNotMatch(nextSequenceSection, /\bprovider\s+implementation\b/i);
  assert.doesNotMatch(nextSequenceSection, /\bimage\s+recognition\s+implementation\b/i);
});

test("PR105 next-sequence guard rejects PR109 and later PR references", () => {
  const forbiddenFuturePrPattern = futurePrAfterPr108Pattern();

  for (const allowedPr of ["PR106", "PR107", "PR108"]) {
    assert.doesNotMatch(allowedPr, forbiddenFuturePrPattern, allowedPr);
  }

  for (const forbiddenPr of ["PR109", "PR110", "PR120", "PR999"]) {
    assert.match(forbiddenPr, forbiddenFuturePrPattern, forbiddenPr);
  }
});

test("PR105 exact changed-file guard accepts only the approved roadmap truth sync set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(postPr104VisualFixtureRoadmapTruthSyncChangedFiles),
    postPr104VisualFixtureRoadmapTruthSyncChangedFiles,
  );

  assert.deepEqual(postPr104VisualFixtureRoadmapTruthSyncChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-06-post-pr104-visual-fixture-roadmap-truth-sync.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/post-pr104-visual-fixture-roadmap-truth-sync.test.mjs",
    "tests/roadmap-status-update.test.mjs",
  ]);

  const missingRequiredFile = postPr104VisualFixtureRoadmapTruthSyncChangedFiles.filter(
    (file) => file !== "tests/post-pr104-visual-fixture-roadmap-truth-sync.test.mjs",
  );
  assert.equal(sharedExactApprovedChangedFiles(missingRequiredFile), null);

  for (const forbiddenFile of [
    "../norma-core-wiki/wiki/hot.md",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/providers/openai.ts",
    "src/adapters/visual.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-core-visual-fixture-guided-inspection-demo.mjs",
    "bin/norma-core-guided-inspection-demo.mjs",
    "bin/norma-core-report.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/fixtures/visual-adapter/static-handoff-proof-v1.json",
    "tests/fixtures/visual-adapter/source-image.png",
    "docs/examples/local-visual-fixture-guided-inspection-demo.md",
    "docs/decisions/2026-07-04-visual-adapter-fixture-contract.md",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...postPr104VisualFixtureRoadmapTruthSyncChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }

  for (const broadPath of ["docs/**", "examples/**", "tests/**", "src/**", "bin/**", "viewer/**"]) {
    assert.equal(sharedExactApprovedChangedFiles([broadPath]), null);
  }
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
    assert.doesNotMatch(doc, approvalPattern, `${surface} approval wording must remain absent`);
  }
}

function approvalPatterns(surface) {
  const surfacePattern = escapeRegExp(surface).replace(/\s+/g, "\\s+");
  const separator = "[\\s:;,.-]+";

  return [
    new RegExp(`\\b${surfacePattern}\\b(?:\\s+(?:is|are|was|were))?${separator}approved\\b`, "i"),
    new RegExp(`(?:^|[\\n.;])\\s*(?:[-*]\\s*)?approved\\b${separator}${surfacePattern}\\b`, "i"),
    new RegExp(`(?:^|[\\n.;])\\s*(?:PR105|this\\s+decision|the\\s+decision|this\\s+PR|the\\s+PR)\\s+approv(?:e|es|ed|ing)\\b[^\\n.;]*\\b${surfacePattern}\\b`, "i"),
  ];
}

function futurePrAfterPr108Pattern() {
  return /\bPR(?:10[9]|1[1-9]\d|[2-9]\d{2,})\b/i;
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
