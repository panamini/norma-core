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
  "2026-07-02-guided-inspection-package-publication-readiness-gate.md",
);
const packageJsonPath = join(repoRoot, "package.json");

const requiredDecisionHeadings = [
  "# Guided Inspection Package Publication Readiness Gate",
  "## Status",
  "## Sequencing Basis",
  "## Current Gate Decision",
  "## API And Source Truth Contract",
  "## Future Publication Prerequisites",
  "## Non-Approval Boundary",
  "## Best Next PR",
];

const blockedSurfaces = [
  "package publication",
  "public npm publication",
  "package metadata changes",
  "package-level bin",
  "dependency changes",
  "hosted MCP",
  "ChatGPT connector runtime",
  "OpenAI/provider calls",
  "image/CAD/Figma/provider adapters",
  "inference",
  "recommendation",
  "optimization",
  "correction",
  "scoring",
  "automatic family selection",
];

test("PR98 guided inspection package publication readiness decision exists with required headings", () => {
  assert.equal(existsSync(decisionDocPath), true);

  const decisionDoc = readDoc(decisionDocPath);
  assertHeadingsInOrder(decisionDoc, requiredDecisionHeadings);
});

test("PR98 records PR97 merge evidence exactly", () => {
  const combinedDocs = combinedPr98Docs();

  assertDocMentions(combinedDocs, [
    "PR97 is merged as PR #177",
    "merge commit: 6d831e9cb9ab38814832247d1946a6c8cd050675",
    "head commit: c4aff0176bf9cd396dd1d1d49fccebb153634e19",
    "PR97 proved local package-root consumer compatibility",
  ]);
});

test("PR98 keeps current package private without metadata export bin dependency or publication expansion", () => {
  const packageJson = JSON.parse(readDoc(packageJsonPath));

  assert.equal(packageJson.private, true);
  assert.deepEqual(Object.keys(packageJson.exports).sort(), ["."]);

  for (const fieldName of [
    "publishConfig",
    "bin",
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    assert.equal(Object.hasOwn(packageJson, fieldName), false, `${fieldName} should stay absent`);
  }

  assert.deepEqual(Object.keys(packageJson.devDependencies).sort(), ["typescript"]);
});

test("PR98 explicitly keeps publication and package metadata changes blocked", () => {
  const combinedDocs = combinedPr98Docs();

  assertDocMentions(combinedDocs, [
    "The current package remains private",
    "Publication remains blocked",
    "Package metadata changes remain blocked until a later explicit package-change PR",
    "Actual publish remains blocked until a separate explicit maintainer approval",
    "PR98 is a gate/checkpoint, not a publication candidate",
    "Public npm publication remains blocked",
  ]);
});

test("PR98 defines exact future publication prerequisites", () => {
  const combinedDocs = combinedPr98Docs();

  assertDocMentions(combinedDocs, [
    "explicit maintainer decision whether public npm publication should happen at all",
    "npm scope ownership and access verified outside PR98",
    "package files and tarball policy approved",
    "`dist/` and TypeScript types inclusion strategy approved",
    "tests, goldens, and internal docs exclusion policy approved",
    "package-level `bin` decision approved or explicitly excluded",
    "license, repository, bugs, homepage, engines, and support metadata decision approved",
    "provenance, trusted-publishing, token, 2FA, and release-environment policy approved",
    "packed tarball install smoke required in a later package-change or publication-candidate PR",
    "rollback, deprecate, and unpublish policy documented before actual publish",
  ]);
});

test("PR98 preserves guided inspection API and source-truth boundaries", () => {
  const combinedDocs = combinedPr98Docs();

  assertDocMentions(combinedDocs, [
    "`@norma/core` package-root guided inspection V1 functions remain the approved API surface from PR96",
    "`createGuidedInspectionArtifactContractV1`",
    "`consumeGuidedInspectionDemoEnvelopeV1`",
    "PR97 local consumer proof remains the compatibility evidence",
    "`result.json` remains the canonical machine-consumable Norma truth",
    "`guide.html`, `report.html`, `visual.svg`, `summary.json`, and `summary.md` remain derived local inspection artifacts only",
    "Derived artifacts may be referenced as inspection outputs",
    "must never be treated as source truth or package API truth",
  ]);
});

test("PR98 keeps publication runtime hosted provider adapter and inference approvals absent", () => {
  const combinedDocs = combinedPr98Docs();

  assertDocMentions(combinedDocs, blockedSurfaces);

  for (const blockedSurface of blockedSurfaces) {
    assertNoApproval(combinedDocs, blockedSurface);
  }

  for (const reverseApproval of [
    "Approved: package publication",
    "public npm publication: approved",
    "approved package metadata changes",
    "approved package-level bin",
    "dependency changes are approved",
    "hosted MCP is approved",
    "approved ChatGPT connector runtime",
    "OpenAI/provider calls approved",
    "approved image/CAD/Figma/provider adapters",
  ]) {
    assert.throws(
      () => assertNoApproval(reverseApproval, approvalSurfaceFor(reverseApproval)),
      /approval wording must remain absent/,
      reverseApproval,
    );
  }
});

test("PR98 names PR99 as the one best next PR without publish or metadata implementation authority", () => {
  const combinedDocs = combinedPr98Docs();

  assertDocMentions(combinedDocs, [
    "PR99: package tarball contents and metadata approval contract",
    "PR99 should still not publish",
    "should not implement package metadata changes unless those exact changes are explicitly approved in that PR",
  ]);
});

function combinedPr98Docs() {
  const roadmapSection = sectionForHeading(
    readDoc(businessRoadmapDocPath),
    "## Guided Inspection Package/API Readiness Gate After PR89",
  );

  return [readDoc(decisionDocPath), roadmapSection].join("\n");
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
    new RegExp(`(?:^|[\\n.;])\\s*(?:PR98|this\\s+decision|the\\s+decision|this\\s+PR|the\\s+PR)\\s+approv(?:e|es|ed|ing)\\b[^\\n.;]*\\b${surfacePattern}\\b`, "i"),
  ];
}

function approvalSurfaceFor(reverseApproval) {
  const approvalSamples = [
    [/package publication/i, "package publication"],
    [/public npm publication/i, "public npm publication"],
    [/package metadata changes/i, "package metadata changes"],
    [/package-level bin/i, "package-level bin"],
    [/dependency changes/i, "dependency changes"],
    [/hosted MCP/i, "hosted MCP"],
    [/ChatGPT connector runtime/i, "ChatGPT connector runtime"],
    [/OpenAI\/provider calls/i, "OpenAI/provider calls"],
    [/image\/CAD\/Figma\/provider adapters/i, "image/CAD/Figma/provider adapters"],
  ];

  for (const [pattern, surface] of approvalSamples) {
    if (pattern.test(reverseApproval)) return surface;
  }

  throw new Error(`Unhandled reverse approval sample: ${reverseApproval}`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
