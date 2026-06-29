import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);

const businessRoadmapDocPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const postR25RoadmapTruthSyncDocPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-06-30-post-r25-roadmap-truth-sync.md",
);

test("R26 post-R25 roadmap truth sync aligns the roadmap and decision docs", () => {
  const businessRoadmapDoc = readDoc(businessRoadmapDocPath);
  const postR25RoadmapTruthSyncDoc = readDoc(postR25RoadmapTruthSyncDocPath);
  const combinedDocs = `${businessRoadmapDoc}\n${postR25RoadmapTruthSyncDoc}`;

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
    "Accepted as R26 after PR #147 / R25 merged at",
    "Roadmap reference: `docs/BUSINESS_READINESS_ROADMAP.md`.",
    "R22 through R25 are complete",
    "R25 is the latest completed local inspection/static safety guard checkpoint",
    "R26 is this docs-only roadmap truth-sync checkpoint",
    "The old PR27-PR46 ladder remains historical/gated context, not the current execution queue",
    "local-only, static, read-only, paste-based, and non-computational",
    "Viewer output is derived inspection only",
    "This checkpoint does not approve:",
    "runtime behavior changes",
    "package or lockfile changes",
    "viewer behavior changes",
    "engine behavior changes",
    "CLI behavior changes",
    "MCP behavior changes",
    "report-kit behavior changes",
  ]);

  assertDocMentions(combinedDocs, [
    "R22 implemented the local Structured Analyze inspection surface",
    "R23 added the local inspection onboarding fixture",
    "R24 added the Structured Analyze scenario regression harness",
    "R25 added the local inspection surface static safety guard",
    "R25 is the latest completed local inspection/static safety guard checkpoint",
  ]);
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(doc, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), `${snippet} should be documented`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
