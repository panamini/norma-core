import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const checkpointPath = join(repoRoot, "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md");
const roadmapPath = join(repoRoot, "docs/BUSINESS_READINESS_ROADMAP.md");

test("PR129 checkpoint records the controlled operator completion without overstating UI proof", async () => {
  const checkpoint = await readFile(checkpointPath, "utf8");
  for (const fact of [
    "real controlled operator run",
    "three rectangular candidate observations",
    "selection_required",
    "candidate evidence only",
    "user-authorized operator selection record",
    "accepted exactly the three candidates without correction",
    "explicitHumanSelectionValidated",
    "no independent UI proof for each candidate",
    "no provider network call",
    "accepted structured geometry only after the explicit selection",
    "Core / Structured Analyze completed",
    "canonical `result.json`",
    "derived artifacts only",
    "productization decision",
  ]) assert.match(checkpoint, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), fact);

  assert.match(checkpoint, /sha256:7ad63f06c7f2756e972a1dfca9494054691ef78399793d35a2d96d8a3f5d6cef/u);
  assert.match(checkpoint, /does not approve\s+production provider integration, autonomous acceptance, package publication, or\s+public product readiness/u);
});

test("PR129 checkpoint and roadmap contain no sensitive operator artifact data or local paths", async () => {
  const text = await readFile(checkpointPath, "utf8");
  for (const forbidden of [
    /\/tmp\//u,
    /\.env\.local/u,
    /sk-[A-Za-z0-9_-]+/u,
    /Bearer\s+[A-Za-z0-9._-]+/iu,
    /data:image\//iu,
    /base64,/iu,
    /gpt-[A-Za-z0-9._-]+/iu,
  ]) assert.doesNotMatch(text, forbidden);
});

test("roadmap advances only to the PR131 productization decision", async () => {
  const roadmap = await readFile(roadmapPath, "utf8");
  assert.match(roadmap, /PR129 is now proven by a real controlled operator run/u);
  assert.match(roadmap, /next phase is `productization decision`/u);
  assert.match(roadmap, /PR131 must choose exactly one first\s+visual pilot product surface/u);
  assert.match(roadmap, /does not approve production provider\s+integration[\s\S]*autonomous acceptance[\s\S]*package publication[\s\S]*public product\s+readiness/u);
});
