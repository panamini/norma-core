import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const guidedInspectionDocPath = join(repoRoot, "docs", "examples", "local-guided-inspection-demo.md");
const decisionDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-02-guided-inspection-package-api-readiness-gate.md",
);

const requiredDecisionHeadings = [
  "# Guided Inspection Package/API Readiness Gate",
  "## Status",
  "## Sequencing Basis",
  "## Guided Inspection Truth Contract",
  "## Package/API Readiness Boundary",
  "## Core Source-Truth And Metric-Policy Invariants",
  "## Non-Approval Boundary",
  "## Next Implementation Slice",
];

const blockedSurfaces = [
  "hosted MCP",
  "ChatGPT connector runtime",
  "OpenAI integration",
  "OpenAI/provider calls",
  "image/CAD/Figma/provider adapter implementation",
  "adapter implementation",
  "public package exports",
  "public API exports",
  "public npm publication",
  "package publication",
  "package metadata changes",
  "lockfile changes",
  "dependency changes",
  "prompt inference",
  "recommendation",
  "optimization",
  "correction",
  "automatic family selection",
  "beauty scoring",
];

test("PR90 guided inspection package/API readiness decision exists with required headings", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);
  assertHeadingsInOrder(decisionDoc, requiredDecisionHeadings);
});

test("PR90 records PR88 and PR89 as the sequencing basis", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const roadmapSection = sectionForHeading(
    readDoc(businessRoadmapDocPath),
    "## Guided Inspection Package/API Readiness Gate After PR89",
  );
  const combinedDocs = `${decisionDoc}\n${roadmapSection}`;

  assertDocMentions(combinedDocs, [
    "PR88 defined the integration unlock priority order",
    "PR89 completed the local guided inspection demo surface",
    "PR89 is merged as PR #169",
    "f064ed96a173494090a86ffbfd54523b87fe83ea",
    "PR90 is a docs/tests/guard package/API readiness gate",
  ]);
});

test("PR90 keeps result.json canonical and guided inspection artifacts derived-only", () => {
  const combinedDocs = [
    readDoc(decisionDocPath),
    readDoc(guidedInspectionDocPath),
    sectionForHeading(
      readDoc(businessRoadmapDocPath),
      "## Guided Inspection Package/API Readiness Gate After PR89",
    ),
  ].join("\n");

  assertDocMentions(combinedDocs, [
    "`result.json` remains the canonical machine-consumable Norma truth",
    "`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` are derived local inspection artifacts only",
    "Future package/API surfaces may reference derived artifact paths and metadata only as inspection outputs",
    "must not treat derived artifacts as source truth",
    "only `result.json` is machine-consumable Norma truth",
  ]);
});

test("PR90 selects package-private local helper or caller contract as the first safe implementation slice", () => {
  const combinedDocs = combinedPr90Docs();

  assertDocMentions(combinedDocs, [
    "The first safe implementation PR after this gate should be a package-private local helper or caller contract",
    "PR91: package-private guided inspection caller contract",
    "It must remain local and package-private",
  ]);
});

test("PR90 keeps package runtime publication hosted connector adapter and inference surfaces blocked", () => {
  const combinedDocs = combinedPr90Docs();

  assertDocMentions(combinedDocs, blockedSurfaces);

  for (const blockedSurface of blockedSurfaces) {
    assertNoApproval(combinedDocs, blockedSurface);
  }

  for (const reverseApproval of [
    "Approved: hosted MCP",
    "approved package publication",
    "approved public package exports",
    "approved ChatGPT connector runtime",
    "approved adapter implementation",
  ]) {
    assert.throws(
      () => assertNoApproval(reverseApproval, approvalSurfaceFor(reverseApproval)),
      /approval wording must remain absent/,
      reverseApproval,
    );
  }
});

test("PR90 preserves Core source-truth and PR86 metric-policy invariants", () => {
  const combinedDocs = combinedPr90Docs();

  assertDocMentions(combinedDocs, [
    "Norma Core source truth remains explicit structured geometry only",
    "Norma Core accepts explicit structured geometry only",
    "The PR86 metric-policy invariant remains mandatory",
    "accepted geometry",
    "synthetic shared surfaces",
    "normalized output compositions",
    "Structured Analyze operation contexts",
    "derived inspection artifact",
  ]);
});

function combinedPr90Docs() {
  const roadmapSection = sectionForHeading(
    readDoc(businessRoadmapDocPath),
    "## Guided Inspection Package/API Readiness Gate After PR89",
  );

  return [readDoc(decisionDocPath), readDoc(guidedInspectionDocPath), roadmapSection].join("\n");
}

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function assertHeadingsInOrder(doc, headings) {
  let previousIndex = -1;

  for (const heading of headings) {
    const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = headingPattern.exec(doc);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    assert.ok(match.index > previousIndex, `${heading} should appear after the previous heading`);
    previousIndex = match.index;
  }
}

function sectionForHeading(doc, heading) {
  const start = doc.indexOf(heading);
  assert.notEqual(start, -1, `${heading} should exist`);
  const nextHeading = doc.slice(start + heading.length).match(/\n##\s+/);
  const end = nextHeading ? start + heading.length + nextHeading.index : doc.length;
  return doc.slice(start, end);
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
    new RegExp(`(?:^|[\\n.;])\\s*(?:PR90|this\\s+decision|the\\s+decision|this\\s+PR|the\\s+PR)\\s+approv(?:e|es|ed|ing)\\b[^\\n.;]*\\b${surfacePattern}\\b`, "i"),
  ];
}

function approvalSurfaceFor(reverseApproval) {
  const approvalSamples = [
    [/hosted MCP/i, "hosted MCP"],
    [/package publication/i, "package publication"],
    [/public package exports/i, "public package exports"],
    [/ChatGPT connector runtime/i, "ChatGPT connector runtime"],
    [/adapter implementation/i, "adapter implementation"],
  ];

  for (const [pattern, surface] of approvalSamples) {
    if (pattern.test(reverseApproval)) return surface;
  }

  throw new Error(`Unhandled reverse approval sample: ${reverseApproval}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
