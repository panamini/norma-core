import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const decisionUrl = new URL("../docs/decisions/2026-07-11-private-dev-chatgpt-mcp-visual-pilot-gate.md", import.meta.url);
const roadmapUrl = new URL("../docs/BUSINESS_READINESS_ROADMAP.md", import.meta.url);

test("PR133 selected exactly the private/dev ChatGPT + MCP visual pilot", async () => {
  const [decision, roadmap] = await Promise.all([readFile(decisionUrl, "utf8"), readFile(roadmapUrl, "utf8")]);
  assert.match(decision, /selected a private\/developer-only ChatGPT \+ MCP visual pilot/u);
  assert.match(roadmap, /single next external\s+product track/u);
  assert.match(decision, /PR132 local candidate review/u);
  assert.match(decision, /existing PR129 no-network resume/u);
  assert.match(decision, /2026-07-11-pr132-operator-validation-checkpoint\.md/u);
  assert.match(decision, /exact commands and receipt, observation, selection, and canonical\s+`result\.json` identities/u);
});

test("PR133 preserves accepted geometry and result.json authority", async () => {
  const decision = await readFile(decisionUrl, "utf8");
  assert.match(decision, /Only the existing explicit accepted-geometry boundary may authorize Core\s+input/u);
  assert.match(decision, /result\.json` remains canonical computational output/u);
  assert.match(decision, /must not create a second candidate validator, selection authority, acceptance\s+engine/u);
});

test("PR133 records that PR134 remained blocked until its exact HIGH-risk contract was approved", async () => {
  const decision = await readFile(decisionUrl, "utf8");
  assert.match(decision, /PR134 was HIGH risk and remained blocked until its exact implementation\s+contract/u);
  assert.match(decision, /CC-PR134-PRIVATE-DEV-LOCAL-VISUAL-MCP-ORCHESTRATION-V2/u);
  for (const gate of [
    "exact tool inventory", "authentication and authorization posture", "retention, and redaction policy",
    "timeout, cancellation, concurrency", "no-network tests", "exact changed-file set", "rollback path",
  ]) assert.equal(decision.includes(gate), true, gate);
});

test("PR133 does not approve runtime hosted auth provider publication or adapter surfaces", async () => {
  const [decision, roadmap] = await Promise.all([readFile(decisionUrl, "utf8"), readFile(roadmapUrl, "utf8")]);
  const text = `${decision}\n${roadmap}`;
  for (const surface of [
    "ChatGPT connector runtime", "hosted MCP", "OAuth", "provider calls",
    "package publication", "CAD/Figma adapters", "autonomous acceptance",
  ]) assertSurfaceNotApproved(text, surface);
  for (const fixture of [
    "Approved: hosted MCP", "approved, OAuth", "ChatGPT connector runtime approved",
  ]) assert.throws(() => assertNoForbiddenApproval(fixture), /forbidden approval/u, fixture);
  assert.match(decision, /This gate does not approve:/u);
});

function assertNoForbiddenApproval(text) {
  for (const surface of [
    "ChatGPT connector runtime", "hosted MCP", "OAuth", "provider calls",
    "package publication", "CAD/Figma adapters", "autonomous acceptance",
  ]) assertSurfaceNotApproved(text, surface);
}

function assertSurfaceNotApproved(text, surface) {
  const escaped = surface.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const forward = new RegExp(`${escaped}\\s+(?:is\\s+|are\\s+)?approved`, "iu");
  const reverse = new RegExp(`approved\\s*[:,-]?\\s*${escaped}`, "iu");
  if (forward.test(text) || reverse.test(text)) throw new Error(`forbidden approval: ${surface}`);
}
