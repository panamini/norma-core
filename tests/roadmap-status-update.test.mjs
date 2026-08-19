import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertCurrentMcpRuntimeSourceBoundary,
  assertCurrentRemoteMcpPackageBoundary,
} from "./current-remote-mcp-boundary.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

let handleMcpJsonRpcMessagePromise;

const roadmapStatusDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-15-roadmap-status-update.md",
);
const postR14RoadmapCheckpointDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-27-post-r14-roadmap-checkpoint.md",
);
const localInspectionSurfaceBoundaryDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-28-local-inspection-surface-boundary.md",
);
const structuredAnalyzeProductScopeAlignmentDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-28-structured-analyze-product-scope-alignment.md",
);
const localStructuredAnalyzeProductSurfaceApprovalDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-28-local-structured-analyze-product-surface-approval.md",
);
const postR25RoadmapTruthSyncDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-30-post-r25-roadmap-truth-sync.md",
);
const postR31RoadmapTruthSyncDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-30-post-r31-roadmap-truth-sync.md",
);
const postPr82RoadmapTruthSyncDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-01-post-pr82-roadmap-truth-sync.md",
);
const postPr86RoadmapTruthSyncDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-01-post-pr86-roadmap-truth-sync.md",
);
const postPr92RoadmapTruthSyncDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-02-post-pr92-roadmap-truth-sync.md",
);
const postPr104VisualFixtureRoadmapTruthSyncDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-06-post-pr104-visual-fixture-roadmap-truth-sync.md",
);
const postPr318PrivateObservationGateDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-08-19-post-pr318-private-observation-gate.md",
);
const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const docsDir = join(repoRoot, "docs");
const packageJsonPath = join(repoRoot, "package.json");
const packageLockPath = join(repoRoot, "package-lock.json");
const wrapperPath = join(repoRoot, "bin", "norma-core-mcp-stdio.mjs");

const existingMcpRemoteDocs = [
  "docs/MCP_REMOTE_THREAT_MODEL.md",
  "docs/MCP_REMOTE_APPROVAL_DECISION.md",
  "docs/MCP_REMOTE_TRANSPORT_AUTH_PACKAGE_DECISION.md",
  "docs/MCP_REMOTE_PACKAGE_DEPENDENCY_DECISION.md",
  "docs/MCP_REMOTE_SECURITY_TEST_MATRIX.md",
  "docs/MCP_REMOTE_DEPLOYMENT_POLICY_DECISION.md",
];

const requiredRoadmapSections = [
  "# Roadmap Status Update",
  "## Status",
  "## Decision",
  "## Source Documents",
  "## What Remains True From The Original Roadmap",
  "## Historical PR Number Boundary",
  "## Current Position After PR47",
  "## Phase 4 Remote MCP Governance Extension",
  "## Next PR Sequence",
  "## Non-Approval Boundary",
  "## Validation Policy",
  "## Final Decision",
];

const approvedCallableTools = [
  "norma.getVersion",
  "norma.serializeCanonicalJson",
  "norma.verifyRun",
  "norma.verifyArtifactFreshness",
  "norma.replayMvpDemo",
];
const currentRuntimeTools = [...approvedCallableTools, "norma.analyzeStructuredCompositionV1"];

const blockedRuntimeAndDeploymentPaths = [
  "src/mcp/http-server.ts",
  "src/mcp/streamable-http.ts",
  "src/mcp/sse.ts",
  "src/mcp/websocket.ts",
  "src/mcp/auth.ts",
  "src/mcp/deployment.ts",
  "bin/norma-core-mcp-http.mjs",
  "bin/norma-core-mcp-server.mjs",
  "Dockerfile",
  "docker-compose.yml",
  "compose.yml",
  ".env",
  ".env.example",
  "serverless.yml",
  "vercel.json",
  "netlify.toml",
  "wrangler.toml",
  "fly.toml",
  "Procfile",
  "nginx.conf",
  "Caddyfile",
  "caddyfile",
];

test("R15 post-R14 roadmap checkpoint records the current merged Structured Analyze rail", () => {
  assert.equal(existsSync(postR14RoadmapCheckpointDocPath), true);

  const checkpointDoc = readDoc(postR14RoadmapCheckpointDocPath);
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);

  for (const doc of [checkpointDoc, businessRoadmapDoc]) {
    assertDocMentions(doc, [
      "PR #135",
      "R14",
      "dcb113cb2abfcafbf1155b47a2a7c41d2fd50974",
      "R10",
      "R11",
      "R12",
      "R13",
      "R14",
      "result.json",
      "report.html",
      "local",
      "private",
      "manual",
    ]);
  }
});

test("R15 post-R14 roadmap checkpoint keeps blocked surfaces blocked", () => {
  const checkpointDoc = readDoc(postR14RoadmapCheckpointDocPath);
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const combinedDocs = `${checkpointDoc}\n${businessRoadmapDoc}`;

  assertDocMentions(combinedDocs, [
    "hosted MCP",
    "public ChatGPT app submission",
    "public package publication",
    "package export expansion",
    "remote API runtime",
    "image, vision, camera, CAD, or provider runtime",
    "recommendation",
    "optimization",
    "beauty scoring",
    "prompt-derived source truth",
  ]);

  assert.doesNotMatch(combinedDocs, /\bhosted MCP\s+is\s+approved\b/i);
  assert.doesNotMatch(combinedDocs, /\bpublic ChatGPT app submission\s+is\s+approved\b/i);
  assert.doesNotMatch(combinedDocs, /\bpublic package publication\s+is\s+approved\b/i);
  assert.doesNotMatch(combinedDocs, /\bremote API runtime\s+is\s+approved\b/i);
  assert.doesNotMatch(combinedDocs, /\bimage, vision, camera, CAD, or provider runtime\s+is\s+approved\b/i);
});

test("R17 roadmap convergence records the current execution mode after R16", () => {
  const checkpointDoc = readDoc(postR14RoadmapCheckpointDocPath);
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);

  for (const doc of [checkpointDoc, businessRoadmapDoc]) {
    assertDocMentions(doc, [
      "## Current Execution Mode After R16",
      "Historical note: before R16, the next implementation rail was",
      "R16 was intended to prove",
    ]);

    const currentExecutionModeSection = sectionForHeading(doc, "## Current Execution Mode After R16");

    assertDocMentions(currentExecutionModeSection, [
      "R16 is merged",
      "R17 is this docs-only roadmap convergence checkpoint",
      "not obligated to execute 17 more historical PRs",
      "Future work should be selected by current gaps, not old numbering",
      "Work remains one PR at a time",
      "Swarm or multi-agent work is allowed only for read-only review, planning, or independent checks",
      "single-owner per branch/PR",
      "Local consumer readiness refresh",
      "A later explicit package publication decision, only if maintainers want publication",
      "Product/UI/dashboard work only after a separate product-scope approval",
      "Hosted/remote MCP only after explicit threat-model and deployment approval",
      "Public npm publication remains blocked",
      "Hosted MCP remains blocked",
      "UI/dashboard work remains blocked until explicitly approved",
      "Engine behavior must not change",
    ]);
  }
});

test("R17 roadmap convergence treats old PR31 PR32 and PR33 labels as historical", () => {
  const checkpointDoc = readDoc(postR14RoadmapCheckpointDocPath);
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const combinedDocs = `${checkpointDoc}\n${businessRoadmapDoc}`;

  assertDocMentions(combinedDocs, [
    "historical roadmap labels",
    "remaining work items",
    "old PR27-PR33 roadmap is historical context",
    "## Historical Immediate PR Sequence",
    "Do not treat this PR27-PR33 sequence as mandatory remaining work after R16",
  ]);
  assert.doesNotMatch(combinedDocs, /\bmust\s+complete\s+PR33\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+execute\s+PR31\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+execute\s+PR32\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+execute\s+PR33\b/i);
});

test("R26 roadmap truth sync records the post-R25 current state and historical queue boundary", () => {
  assert.equal(existsSync(postR25RoadmapTruthSyncDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const postR25RoadmapTruthSyncDoc = readDoc(postR25RoadmapTruthSyncDocPath);

  assert.match(businessRoadmapDoc, /^## Current State After R25$/m);
  assert.doesNotMatch(businessRoadmapDoc, /^## Current State After PR25$/m);

  assertDocMentions(businessRoadmapDoc, [
    "Decision reference: `docs/decisions/2026-06-30-post-r25-roadmap-truth-sync.md`.",
    "This roadmap is synced through R25",
    "R22 through R25 are complete",
    "R25 is the latest completed local inspection/static safety guard checkpoint",
    "R26 is this docs-only roadmap truth-sync checkpoint",
    "The old PR27-PR46 ladder remains historical/gated context, not the current execution queue",
  ]);

  assertDocMentions(postR25RoadmapTruthSyncDoc, [
    "Roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.",
    "R22 through R25 are complete",
    "R25 is the latest completed local inspection/static safety guard checkpoint",
    "R26 is this docs-only roadmap truth-sync checkpoint",
    "PR #147",
    "3889cf84d6df41391996d9d16cb76b5c48638a2d",
    "This checkpoint does not approve:",
    "runtime behavior changes",
    "package or lockfile changes",
    "viewer behavior changes",
    "engine behavior changes",
    "CLI behavior changes",
    "MCP behavior changes",
    "report-kit behavior changes",
  ]);
});

test("R32 roadmap truth sync records the post-R31 execution model", () => {
  assert.equal(existsSync(postR31RoadmapTruthSyncDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const postR31RoadmapTruthSyncDoc = readDoc(postR31RoadmapTruthSyncDocPath);
  const postR31RoadmapSection = sectionForHeading(businessRoadmapDoc, "## Current State After R31");
  const combinedDocs = `${postR31RoadmapSection}\n${postR31RoadmapTruthSyncDoc}`;

  assertDocMentions(combinedDocs, [
    "PR #152",
    "R30 is complete",
    "local Structured Analyze demo workflow smoke",
    "PR #153",
    "R31 is complete",
    "real-usecase Structured Analyze layout demo",
    "Package readiness and publication gate documents already exist",
    "docs/PACKAGE_PUBLICATION_READINESS.md",
    "docs/PUBLIC_PACKAGE_PUBLISHING_GATE.md",
    "old PR30, PR31, PR32, and PR33 labels are historical context",
    "not the current execution queue",
    "one small PR at a time",
    "current repository gaps",
    "The next real work after R32 must be selected from current gaps, not stale roadmap labels",
  ]);

  for (const blockedSurface of [
    "public npm publication",
    "hosted dashboard",
    "API runtime",
    "hosted or remote MCP",
    "image, CAD, Figma, Photoshop, or Illustrator adapters",
    "recommendation, optimization, or beauty scoring",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }

  assert.doesNotMatch(combinedDocs, /\bnext\s+(?:mandatory|recommended)\s+PR\s*:\s*PR33\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+(?:complete|execute|start)\s+PR3[0-3]\b/i);
});

test("PR83 roadmap truth sync records the post-PR82 execution model", () => {
  assert.equal(existsSync(postPr82RoadmapTruthSyncDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const postPr82RoadmapTruthSyncDoc = readDoc(postPr82RoadmapTruthSyncDocPath);
  const postPr82RoadmapSection = sectionForHeading(businessRoadmapDoc, "## Current State After PR82");
  const combinedDocs = `${postPr82RoadmapSection}\n${postPr82RoadmapTruthSyncDoc}`;

  assertDocMentions(combinedDocs, [
    "Norma Core is current through PR #162 / PR82",
    "6537b3a59fedd348d693a12e319e910a6a7283dd",
    "PR #160 / PR81",
    "package-private accepted geometry to Core mapper",
    "PR #162 / PR82",
    "synthetic accepted geometry to Structured Analyze bridge",
    "unsupported accepted-geometry primitives stop at the mapper",
    "There is no forced PR ladder after PR82",
    "The next real work after PR83 must be selected from current gaps, not stale roadmap labels",
  ]);

  for (const blockedSurface of [
    "provider ingestion",
    "image analysis",
    "OpenAI or ChatGPT runtime behavior",
    "hosted MCP",
    "remote API runtime",
    "package publication",
    "public package exports",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }

  assert.doesNotMatch(combinedDocs, /\bnext\s+(?:mandatory|recommended)\s+PR\s*:\s*PR8[4-9]\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+(?:complete|execute|start)\s+PR8[4-9]\b/i);
});

test("PR87 roadmap truth sync records the post-PR86 execution model", () => {
  assert.equal(existsSync(postPr86RoadmapTruthSyncDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const postPr86RoadmapTruthSyncDoc = readDoc(postPr86RoadmapTruthSyncDocPath);
  const postPr86RoadmapSection = sectionForHeading(businessRoadmapDoc, "## Current State After PR86");
  const combinedDocs = `${postPr86RoadmapSection}\n${postPr86RoadmapTruthSyncDoc}`;

  assertDocMentions(combinedDocs, [
    "Norma Core is current through PR #166 / PR86",
    "2a2152c1bf90768a5540141f8d91196c32239735",
    "PR #165 / PR85",
    "package-private synthetic shared-unit-surface normalization helper",
    "PR #166 / PR86",
    "surface-only metric policies",
    "accepted-geometry local/private bridge rail is closed through PR86",
    "There is no forced PR ladder after PR86",
    "The next real work after PR87 must be selected from current repository gaps, not stale roadmap labels",
  ]);

  for (const blockedSurface of [
    "provider ingestion",
    "image analysis",
    "OpenAI or ChatGPT runtime behavior",
    "hosted MCP",
    "remote API runtime",
    "package publication",
    "public package exports",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }

  assert.doesNotMatch(combinedDocs, /\bnext\s+(?:mandatory|recommended)\s+PR\s*:\s*PR8[8-9]\b/i);
  assert.doesNotMatch(combinedDocs, /\bmust\s+(?:complete|execute|start)\s+PR8[8-9]\b/i);
});

test("PR93 roadmap truth sync records the post-PR92 guided inspection package boundary", () => {
  assert.equal(existsSync(postPr92RoadmapTruthSyncDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const postPr92RoadmapTruthSyncDoc = readDoc(postPr92RoadmapTruthSyncDocPath);
  const postPr92RoadmapSection = sectionForHeading(
    businessRoadmapDoc,
    "## Guided Inspection Package/API Readiness Gate After PR89",
  );
  const combinedDocs = `${postPr92RoadmapSection}\n${postPr92RoadmapTruthSyncDoc}`;

  assertDocMentions(combinedDocs, [
    "Norma Core `origin/main` is current through PR #172 / PR92",
    "2a897b2e7c41a54081a80aa50f0c72b5f6341aa7",
    "PR #171 / PR91",
    "createGuidedInspectionArtifactContract",
    "PR #172 / PR92",
    "bin/norma-core-guided-inspection-demo.mjs",
    "result.json",
    "derived local inspection artifacts only",
    "The next real work after PR93 is the local guided inspection consumer proof",
  ]);

  for (const blockedSurface of [
    "hosted MCP runtime",
    "ChatGPT connector runtime",
    "OpenAI/provider calls",
    "image/CAD/Figma/provider adapter implementation",
    "public package exports",
    "public npm publication",
    "package metadata changes",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }
});

test("PR105 roadmap truth sync records the post-PR104 visual fixture boundary", () => {
  assert.equal(existsSync(postPr104VisualFixtureRoadmapTruthSyncDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const postPr104RoadmapTruthSyncDoc = readDoc(postPr104VisualFixtureRoadmapTruthSyncDocPath);
  const postPr104RoadmapSection = sectionForHeading(
    businessRoadmapDoc,
    "## Visual Fixture Roadmap Truth Sync After PR104",
  );
  const combinedDocs = `${postPr104RoadmapSection}\n${postPr104RoadmapTruthSyncDoc}`;

  assertDocMentions(combinedDocs, [
    "PR102 approved the local-only visual adapter fixture contract",
    "PR103 added the static synthetic visual fixture handoff proof",
    "PR104 added the local visual fixture guided inspection demo",
    "visual observations are candidate evidence only",
    "explicit accepted structured geometry",
    "`result.json` remains canonical Norma truth",
    "`guide.html`, `visual.svg`, `summary.json`, `summary.md`, report artifacts, overlays, observations, and prompts are derived or evidence-only artifacts",
    "PR106: local consumer proof for PR104 visual fixture demo envelope/result",
    "PR107: static synthetic scenario corpus, 2-3 fixtures, still no recognition",
    "PR108: decision PR for first real external track",
  ]);

  for (const blockedSurface of [
    "real image recognition",
    "provider/OpenAI calls",
    "CAD/Figma import",
    "hosted MCP",
    "ChatGPT connector runtime",
    "package publication",
    "new visual-fixture or additional package-root public exports",
    "prompt-derived source truth",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
  }
});

test("post-PR318 truth sync closes the private feature rail and routes to observation", () => {
  assert.equal(existsSync(postPr318PrivateObservationGateDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const decisionDoc = readDoc(postPr318PrivateObservationGateDocPath);
  const currentSection = sectionForHeading(
    businessRoadmapDoc,
    "## Current State After PR318",
  );
  const combinedDocs = `${currentSection}\n${decisionDoc}`;

  assertDocMentions(combinedDocs, [
    "1e39e026f8df5d358fbfce62c6acc4bac0cbc8e0",
    "PR #312 added the direct mouse A/B measurement path",
    "PR #314 broadened automatic harmonic discovery",
    "PR #315 through PR #317",
    "PR #318 declared standard MCP Apps `ui.csp` and `ui.domain` metadata",
    "bdc416c8-7ff3-4206-b456-e20ead106b77",
    "There is no mandatory implementation PR after PR #318",
    "observation-led maintenance",
    "one surgical corrective PR",
    "The existing twelve-case corpus proves instrumentation and gross regressions, not product quality",
    "Widget publication metadata is not public publication",
  ]);

  for (const blockedSurface of [
    "public ChatGPT app submission",
    "collaborator access",
    "commercial or production qualification",
    "public npm publication",
    "default SAM expansion",
    "new geometry families",
    "artistic-intent inference",
  ]) {
    assertDocMentions(combinedDocs, [blockedSurface]);
    assertNoApproval(combinedDocs, blockedSurface);
  }
});

test("R19 roadmap records local inspection surfaces without approving product or remote scope", () => {
  assert.equal(existsSync(localInspectionSurfaceBoundaryDocPath), true);

  const decisionDoc = readDoc(localInspectionSurfaceBoundaryDocPath);
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const r19RoadmapSection = sectionForHeading(businessRoadmapDoc, "## R19 Local Inspection Surface Boundary Checkpoint");
  const combinedDocs = `${decisionDoc}\n${r19RoadmapSection}`;

  assertDocMentions(combinedDocs, [
    "PR #140",
    "R18",
    "Norma Core currently has local inspection surfaces",
    "Package consumption remains local/private",
    "analyzeStructuredCompositionV1",
    "result.json",
    "direct engine output",
    "canonical Norma truth",
    "summary.json",
    "summary.md",
    "visual.svg",
    "report.html",
    "viewer output",
    "derived local inspection artifacts only",
    "adds no features",
    "changes no runtime behavior",
  ]);

  assertDocMentions(combinedDocs, [
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
  ]);

  for (const surface of [
    "hosted dashboard",
    "public webapp",
    "API runtime",
    "hosted MCP",
    "remote MCP",
    "public npm publication",
  ]) {
    assertNoApproval(combinedDocs, surface);
  }
});

test("R19 roadmap approval guard catches punctuation-separated approval wording", () => {
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

test("R20 roadmap records product-scope alignment without approving UI or runtime scope", () => {
  assert.equal(existsSync(structuredAnalyzeProductScopeAlignmentDocPath), true);

  const decisionDoc = readDoc(structuredAnalyzeProductScopeAlignmentDocPath);
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const r20RoadmapSection = sectionForHeading(
    businessRoadmapDoc,
    "## R20 Structured Analyze Product-Scope Alignment Checkpoint",
  );
  const combinedDocs = `${decisionDoc}\n${r20RoadmapSection}`;

  assertDocMentions(combinedDocs, [
    "PR #141",
    "R19",
    "documentation alignment checkpoint only",
    "documentation interpretation checkpoint",
    "current authoritative local inspection boundary",
    "PR55 and PR56",
    "does not imply current approval for new UI implementation or any new product surface",
    "Future product or UI work requires a separate explicit approval PR",
    "does not define or modify engine correctness or runtime contracts",
  ]);

  assertNoApproval(combinedDocs, "UI implementation");
  assertNoApproval(combinedDocs, "new product surface");
  assertNoApproval(combinedDocs, "product surface");
  assertNoApproval(combinedDocs, "hosted dashboard");
  assert.doesNotMatch(combinedDocs, /\bnew runtime contract\b/i);
});

test("R21 roadmap records local product-surface approval gate without runtime or remote scope", () => {
  assert.equal(existsSync(localStructuredAnalyzeProductSurfaceApprovalDocPath), true);

  const decisionDoc = readDoc(localStructuredAnalyzeProductSurfaceApprovalDocPath);
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const r21RoadmapSection = sectionForHeading(
    businessRoadmapDoc,
    "## R21 Local Structured Analyze Product-Surface Approval Gate",
  );
  const combinedDocs = `${decisionDoc}\n${r21RoadmapSection}`;

  assertDocMentions(combinedDocs, [
    "R21 is an approval gate only",
    "PR #141",
    "R19",
    "PR #142",
    "R20",
    "future product-surface implementation scope",
    "local-only, static, read-only Structured Analyze inspection surface",
    "direct engine result object",
    "result.json",
    "existing report bundle artifacts",
    "R19 remains the current authoritative local inspection boundary",
    "R20 remains the current documentation interpretation checkpoint",
    "R22: local Structured Analyze inspection surface implementation",
    "The future implementation must be a separate PR",
  ]);

  for (const blockedSurface of [
    "hosted dashboard",
    "public webapp",
    "SDK",
    "API runtime",
    "public npm publication",
    "hosted MCP",
    "remote MCP",
    "image input",
    "vision input",
    "CAD input",
    "provider input",
  ]) {
    assertNoApproval(combinedDocs, blockedSurface);
  }

  assert.doesNotMatch(combinedDocs, /\bR21\s+implements\s+UI\b/i);
  assert.doesNotMatch(combinedDocs, /\bnew runtime contract\b/i);
});

test("PR48 roadmap status update exists under docs/decisions with required headings", () => {
  assert.equal(existsSync(roadmapStatusDocPath), true);
  assert.equal(basename(roadmapStatusDocPath), "2026-06-15-roadmap-status-update.md");

  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);
  assertHeadingsInOrder(roadmapStatusDoc, requiredRoadmapSections);
  assertDocMentions(roadmapStatusDoc, [
    "PR48 is docs/contract-tests only",
    "PR48 updates roadmap status after PR47 / PR46-label",
    "Current official documentation state in PR48: Unknown",
    "PR48 does not re-check current official docs because it makes no transport, auth, package, runtime, deployment, API, UI, provider-compatibility, or tool-exposure decision",
  ]);
});

test("PR48 documents the original roadmap as planning context with historical PR numbers", () => {
  assert.equal(existsSync(businessRoadmapDocPath), true);

  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(businessRoadmapDoc, [
    "This is a planning document",
    "It does not authorize scope by itself",
    "## Phase 4",
    "## Phase 6",
  ]);
  assertDocMentions(roadmapStatusDoc, [
    "The original Business Readiness Roadmap remains a planning document",
    "The roadmap does not authorize scope by itself",
    "The original PR numbers in the roadmap are historical",
    "Historical PR numbers in `docs/BUSINESS_READINESS_ROADMAP.md` must not be treated as current PR numbers",
    "current repository history wins",
  ]);
});

test("PR48 documents PR39 through PR47 / PR46-label as a cautious Phase 4 extension", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(roadmapStatusDoc, [
    "Current PR39-PR47 / PR46-label sequence is a cautious Phase 4 extension of remote MCP/API readiness",
    "PR39-PR47 / PR46-label are a cautious Phase 4 extension",
    "This extension was intentionally conservative and docs/contract-tests only after local STDIO MCP",
    "The extension does not contradict the roadmap",
    "remote MCP/API readiness phase",
  ]);

  for (const prNumber of ["PR39", "PR40", "PR41", "PR42", "PR43", "PR44", "PR45", "PR47"]) {
    assertDocMentions(roadmapStatusDoc, [prNumber]);
  }
});

test("PR48 keeps remote MCP local STDIO package API and UI boundaries blocked", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);

  assertDocMentions(roadmapStatusDoc, [
    "Remote MCP remains blocked",
    "Local STDIO remains the only approved MCP runtime",
    "No remote runtime, API, UI, deployment, package publishing, or remote MCP tool exposure was approved by PR39-PR47 / PR46-label",
    "API implementation is gated behind API contract/auth/rate-limit policy",
    "UI implementation is gated behind product requirements and viewer plan",
    "Package publishing remains blocked until explicit publishing decision",
    "Remote MCP runtime remains blocked unless future explicit approval satisfies gates",
  ]);

  assert.doesNotMatch(roadmapStatusDoc, /\bremote MCP\s+is\s+approved\b/i);
  assert.doesNotMatch(roadmapStatusDoc, /\bAPI implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(roadmapStatusDoc, /\bUI implementation\s+is\s+approved\b/i);
  assert.doesNotMatch(roadmapStatusDoc, /\bpackage publishing\s+is\s+approved\b/i);
});

test("PR48 next PR sequence includes PR48 through PR63 labels", () => {
  const roadmapStatusDoc = readDoc(roadmapStatusDocPath);
  const nextSequenceSection = sectionBetween(
    roadmapStatusDoc,
    "## Next PR Sequence",
    "## Non-Approval Boundary",
  );

  for (const prNumber of Array.from({ length: 16 }, (_, index) => `PR${48 + index}`)) {
    assert.match(nextSequenceSection, new RegExp(`\\b${prNumber}\\b`), `${prNumber} should be listed`);
  }

  assertDocMentions(nextSequenceSection, [
    "PR48 - roadmap status update",
    "PR49 - remote MCP/API readiness checkpoint, still no runtime",
    "PR50 - API contract decision, docs/tests only",
    "PR51 - auth/audit/rate-limit policy for API and future remote MCP, docs/tests only",
    "PR52 - minimal API server approval decision, no implementation unless explicitly approved",
    "PR53 - minimal API server skeleton, conditional on PR50-PR52 gates approving it",
    "PR54 - API contract tests and golden envelopes, conditional on an approved API contract",
    "PR55 - product requirements for read-only result viewer",
    "PR56 - read-only result viewer plan, no UI implementation",
    "PR57 - structured JSON input viewer prototype, conditional on PR55-PR56 approval",
    "PR58 - verification/replay result UI prototype, no source-truth inference",
    "PR59 - onboarding and examples",
    "PR60 - beta pilot readiness checklist",
    "PR61 - privacy/security/support policy",
    "PR62 - pricing/package/public npm decision",
    "PR63 - business launch checklist",
  ]);
});

test("PR48 adds no root-level MCP_REMOTE docs beyond the PR39 through PR44 legacy exception set", () => {
  const actualRootMcpRemoteDocs = readdirSync(docsDir)
    .filter((entry) => /^MCP_REMOTE_.*\.md$/.test(entry))
    .sort();
  const expectedRootMcpRemoteDocs = existingMcpRemoteDocs.map((path) => basename(path)).sort();

  assert.deepEqual(actualRootMcpRemoteDocs, expectedRootMcpRemoteDocs);

  for (const docPath of existingMcpRemoteDocs) {
    assert.equal(existsSync(join(repoRoot, docPath)), true, `${docPath} must remain at its current path`);
  }
});

test("PR48 keeps package metadata dependencies lockfile and MCP SDK unchanged", () => {
  const packageJson = parseJson(packageJsonPath);
  const packageLock = parseJson(packageLockPath);
  assertCurrentRemoteMcpPackageBoundary(packageJson, packageLock);

  assert.equal(packageJson.name, "@norma/core");
  assert.equal(packageJson.version, "0.1.0");
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.sideEffects, false);
  assert.deepEqual(packageJson.exports?.["."], {
    types: "./dist/src/index.d.ts",
    default: "./dist/src/index.js",
  });
  assert.deepEqual(packageJson.devDependencies, { typescript: "^5.8.0" });
  assert.deepEqual(packageLock.packages[""].devDependencies, { typescript: "^5.8.0" });
});

test("PR48 keeps runtime and deployment surfaces absent in the MCP boundary", () => {
  assertCurrentMcpRuntimeSourceBoundary(filesUnder("src/mcp"));
  assert.equal(existsSync(wrapperPath), true);

  for (const path of blockedRuntimeAndDeploymentPaths) {
    assert.equal(existsSync(join(repoRoot, path)), false, `${path} must not exist`);
  }

  for (const path of [
    "src/mcp/private-dev-local-visual-mcp-protocol.ts",
    "src/mcp/stdio-protocol.ts",
    "bin/norma-core-mcp-stdio.mjs",
  ]) {
    const source = readDoc(join(repoRoot, path));
    assertNoRemoteMcpRuntimeSurface(source, path);
    assertNoMcpRuntimeSideEffects(source, path);
  }
});

test("PR48 keeps current MCP tools exactly and replayRun blocked", async () => {
  const toolsListResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr48-tools-list",
    method: "tools/list",
  });

  assert.deepEqual(
    toolsListResponse.result.tools.map((tool) => tool.name),
    currentRuntimeTools,
  );

  const replayRunResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr48-replay-run-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayRun",
      arguments: {},
    },
  });

  assert.deepEqual(replayRunResponse, {
    jsonrpc: "2.0",
    id: "pr48-replay-run-blocked",
    error: {
      code: -32602,
      message: "Unknown tool: norma.replayRun",
    },
  });

  const arbitraryReplayResponse = await parseRequiredResponse({
    jsonrpc: "2.0",
    id: "pr48-arbitrary-replay-blocked",
    method: "tools/call",
    params: {
      name: "norma.replayMvpDemo",
      arguments: {
        run: {},
      },
    },
  });

  assert.deepEqual(arbitraryReplayResponse, {
    jsonrpc: "2.0",
    id: "pr48-arbitrary-replay-blocked",
    error: {
      code: -32602,
      message: "Invalid params",
    },
  });
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function parseJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function loadHandleMcpJsonRpcMessage() {
  handleMcpJsonRpcMessagePromise ??= import("../dist/src/mcp/stdio-protocol.js")
    .then((module) => {
      assert.equal(
        typeof module.handleMcpJsonRpcMessage,
        "function",
        "dist/src/mcp/stdio-protocol.js should export handleMcpJsonRpcMessage",
      );
      return module.handleMcpJsonRpcMessage;
    })
    .catch((error) => {
      assert.fail(
        `Build output is required before PR48 MCP runtime contract validation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

  return handleMcpJsonRpcMessagePromise;
}

async function parseRequiredResponse(message) {
  const handleMcpJsonRpcMessage = await loadHandleMcpJsonRpcMessage();
  const response = handleMcpJsonRpcMessage(JSON.stringify(message));
  assert.ok(response != null, "Handler must return a non-null/undefined JSON-RPC response");
  return JSON.parse(response);
}

function filesUnder(path) {
  const absolutePath = join(repoRoot, path);
  if (!existsSync(absolutePath)) {
    return [];
  }

  return relativeFiles(absolutePath, path).sort();
}

function relativeFiles(absolutePath, relativePath) {
  const stat = statSync(absolutePath);
  if (stat.isFile()) {
    return [relativePath];
  }

  assert.equal(stat.isDirectory(), true, `${relativePath} should be a file or directory`);

  return readdirSync(absolutePath).flatMap((entry) =>
    relativeFiles(join(absolutePath, entry), `${relativePath}/${entry}`),
  );
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
    new RegExp(`(?:^|[\\n.;])\\s*(?:R21|this\\s+decision|the\\s+decision|this\\s+PR|the\\s+PR)\\s+approv(?:e|es|ed|ing)\\b[^\\n.;]*\\b${surfacePattern}\\b`, "i"),
  ];
}

function sectionBetween(doc, startHeading, endHeading) {
  const start = doc.indexOf(startHeading);
  assert.notEqual(start, -1, `${startHeading} should exist`);
  const end = doc.indexOf(endHeading, start + startHeading.length);
  assert.notEqual(end, -1, `${endHeading} should exist`);
  assert.ok(end > start, `${endHeading} should appear after ${startHeading}`);
  return doc.slice(start, end);
}

function sectionForHeading(doc, heading) {
  const start = doc.indexOf(heading);
  assert.notEqual(start, -1, `${heading} should exist`);
  const nextHeading = doc.slice(start + heading.length).match(/\n##\s+/);
  const end = nextHeading ? start + heading.length + nextHeading.index : doc.length;
  return doc.slice(start, end);
}

function assertNoRemoteMcpRuntimeSurface(source, path) {
  assert.doesNotMatch(
    source,
    /@modelcontextprotocol|\b(?:modelcontextprotocol|FastMCP|McpServer|StdioServerTransport|createServer|server_url|MCP endpoint|Mcp-Session-Id|WWW-Authenticate|https?[A-Za-z0-9_]*(?:Server|Transport|Endpoint)|sse|streamable|websocket|networkFetch|XMLHttpRequest|WebSocket)\b/i,
    `${path} must not contain remote MCP runtime markers`,
  );
}

function assertNoMcpRuntimeSideEffects(source, path) {
  assert.doesNotMatch(
    source,
    /\b(?:readFile(?:Sync)?|writeFile(?:Sync)?|deleteFile(?:Sync)?|rm(?:Sync)?|unlink(?:Sync)?|readdir(?:Sync)?|stat(?:Sync)?|open(?:Sync)?|createReadStream|createWriteStream|shell|exec|spawn|child_process|process\.env|CLAUDE_PROJECT_DIR)\b/,
    `${path} must not contain MCP runtime filesystem, shell, or environment behavior`,
  );
}

function assertNoMcpDependency(packageJson) {
  for (const dependencyGroup of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ]) {
    for (const dependencyName of Object.keys(dependencyGroup ?? {})) {
      assert.doesNotMatch(dependencyName, /modelcontextprotocol|@modelcontextprotocol|mcp/i);
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
