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
  "2026-07-01-integration-unlock-contracts.md",
);

test("PR88 integration unlock records gated planned tracks after PR87", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);
  assert.equal(existsSync(decisionDocPath), true);

  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  const unlockSection = sectionForHeading(roadmapDoc, "## Integration Unlock Contracts After PR87");
  const combinedDocs = `${unlockSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "PR87 merged as PR #167",
    "ccd8e8c03403cbf4fd080b11c77fd59bbdba41bf",
    "PR88 is a docs/tests-only integration unlock contract",
    "hosted MCP",
    "private/dev ChatGPT connector",
    "image/CAD/Figma/provider adapters",
    "package/publication readiness",
    "explicitly gated planned tracks",
    "separate approval PR before implementation",
  ]);
});

test("PR88 integration unlock preserves priority order and first safe PR boundaries", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const prioritySection = sectionForHeading(decisionDoc, "## Priority Order");
  const combinedDocs = combinedUnlockDocs();

  assertOrdered(prioritySection, [
    "Immediate local operator validation",
    "MVP demo or guided inspection surface",
    "Package/publication readiness",
    "Hosted/private MCP and ChatGPT connector",
    "Image/CAD/Figma/provider adapters",
  ]);

  assertDocMentions(combinedDocs, [
    "hosted runtime approval contract",
    "connector approval contract",
    "adapter approval contract",
    "package-readiness approval contract",
    "first safe PR",
    "gate, not a runtime implementation",
    "urgency does not remove the approval boundary",
  ]);
});

test("PR88 integration unlock keeps Core source truth and PR86 metric-policy invariants", () => {
  const combinedDocs = combinedUnlockDocs();

  assertDocMentions(combinedDocs, [
    "Norma Core accepts explicit structured geometry only",
    "Adapters and connectors must not become Norma source truth",
    "Prompt inference must not substitute for explicit structured geometry",
    "hidden pack, rule, tolerance, operation-context, or metric-policy defaults",
    "PR86 metric-policy invariant remains mandatory",
    "accepted geometry",
    "synthetic shared surfaces",
    "normalized output compositions",
    "Structured Analyze operation contexts",
    "derived inspection artifacts",
    "result.json",
    "canonical truth",
  ]);
});

test("PR88 integration unlock does not approve forbidden runtime or publication surfaces", () => {
  const decisionDoc = readDoc(decisionDocPath);
  const combinedDocs = combinedUnlockDocs();

  assertDocMentions(decisionDoc, [
    "PR88 does not change:",
    "`src/` runtime implementation",
    "hosted MCP server implementation",
    "ChatGPT connector runtime",
    "OpenAI integration",
    "image/CAD/Figma/provider adapter implementation",
    "package publication",
    "`package.json`",
    "lockfiles",
    "dependencies",
    "CI",
    "secrets",
    "deployment",
    "OAuth or auth flows",
    "package-root exports",
  ]);

  assert.match("Approved: hosted MCP", approvalPatternsFor("hosted MCP(?: server)?(?: runtime)?")[1]);
  assert.match("approved, package publication", approvalPatternsFor("package publication")[1]);
  assert.match("approved hosted MCP", approvalPatternsFor("hosted MCP(?: server)?(?: runtime)?")[1]);

  assertNoApproval(combinedDocs, "hosted MCP(?: server)?(?: runtime)?");
  assertNoApproval(combinedDocs, "ChatGPT connector runtime");
  assertNoApproval(combinedDocs, "OpenAI integration");
  assertNoApproval(combinedDocs, "package publication");
  assertNoApproval(combinedDocs, "package-root exports?");
  assertNoApproval(combinedDocs, "(?:image/CAD/Figma/provider )?adapter implementation");
});

function combinedUnlockDocs() {
  const roadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(decisionDocPath);
  return `${sectionForHeading(roadmapDoc, "## Integration Unlock Contracts After PR87")}\n${decisionDoc}`;
}

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

function assertOrdered(doc, snippets) {
  let previousIndex = -1;

  for (const snippet of snippets) {
    const index = doc.indexOf(snippet);
    assert.notEqual(index, -1, `${snippet} should be documented`);
    assert.ok(index > previousIndex, `${snippet} should appear after the previous priority`);
    previousIndex = index;
  }
}

function assertNoApproval(doc, surfacePattern) {
  for (const pattern of approvalPatternsFor(surfacePattern)) {
    assert.doesNotMatch(doc, pattern);
  }
}

function approvalPatternsFor(surfacePattern) {
  return [
    new RegExp(`\\b${surfacePattern}\\s+(?:is|are|was|were)\\s+approved\\b`, "i"),
    new RegExp(`\\bapproved(?:\\s+|\\s*[:,-]\\s*)${surfacePattern}\\b`, "i"),
  ];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
