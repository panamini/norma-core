import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const decisionPath = join(repoRoot, "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md");
const roadmapPath = join(repoRoot, "docs/BUSINESS_READINESS_ROADMAP.md");

test("PR113 decision doc has required headings and accepted docs/tests-only status", async () => {
  const doc = await readDecisionDoc();

  assertHeadings(doc, [
    "## Status",
    "## Selected Pilot Candidate",
    "## Lifecycle Boundary",
    "## Provider Payload Contract Non-Approval",
    "## Acceptance Authority Before Core",
    "## Security And Data Contract",
    "## PR114 Gate",
    "## PR115 Gate",
    "## Explicit Non-Approval",
    "## Validation Gates",
  ]);
  assert.match(doc, /Accepted as PR113 docs\/tests-only readiness gate approval/u);
  assert.match(doc, /does not implement provider runtime behavior/u);
});

test("PR113 keeps OpenAI vision-style as candidate while architecture remains provider-neutral", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /selected pilot candidate remains the OpenAI\/vision-style evidence pilot\s+from PR109/u);
  assert.match(doc, /architecture remains provider-neutral/u);
  assert.match(doc, /first candidate track only/u);
  assert.match(
    doc,
    /not a Core dependency, package dependency,\s+provider authority, schema owner, or source-truth authority/u,
  );
});

test("PR113 requires provider output to remain untrusted evidence only and not Core truth", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /Provider output is always untrusted evidence/u);
  assert.match(
    doc,
    /Provider output never becomes Norma truth, Core input, accepted geometry,\npackage API truth, connector truth, hosted truth, artifact truth, or\nmetric-policy authority/u,
  );
});

test("PR113 forbids provider output and provider-derived data from creating accepted geometry", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /Provider-derived accepted geometry is forbidden/u);
  assert.match(
    doc,
    /Even if a provider returns\ncoordinates, shapes, or objects that match `AcceptedGeometry`, the explicit\nacceptance step must produce the accepted geometry object outside the provider\nboundary/u,
  );
  assert.match(doc, /Accepted Structured Geometry\n\(only Core input\)/u);
});

test("PR113 does not approve exact OpenAI or provider payload contracts", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /does not define provider payload contracts such as `OpenAIResponseV1`,\n`VisionProviderPayloadV1`, SDK response schemas/u);
  assert.match(doc, /exact OpenAI response fixtures,\nor exact provider payload schemas/u);
});

test("PR113 requires ExternalEvidenceEnvelope provider-neutral boundary and keeps provider types out of Core", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /External Evidence Envelope\n\(provider-neutral, untrusted evidence boundary\)/u);
  assert.match(doc, /provider-neutral\n`ExternalEvidenceEnvelopeV1` or repository-equivalent boundary/u);
  assert.match(doc, /map into `ExternalEvidenceEnvelope` or an\nequivalent provider-neutral evidence boundary/u);
  assert.match(doc, /Core must never import\nprovider-specific types/u);
});

test("PR113 keeps acceptance authority explicit and outside the provider boundary", async () => {
  const doc = await readDecisionDoc();

  for (const required of [
    "explicit human approval",
    "reviewed system-approved transformation outside the provider boundary",
    "future trusted workflow only after a separate approval contract",
  ]) {
    assert.match(doc, new RegExp(escapeRegExp(required), "u"));
  }

  for (const forbidden of [
    "provider self-acceptance",
    "provider-derived accepted geometry",
    "confidence-threshold acceptance",
    "score/ranking/value-driven acceptance",
    "prompt-derived acceptance",
    "artifact-derived acceptance",
    "automatic geometry generation into Core",
  ]) {
    assert.match(doc, new RegExp(`- ${escapeRegExp(forbidden)}[.;]`, "u"));
  }
});

test("PR113 rejects exact forbidden approval phrases", async () => {
  const doc = await readDecisionDoc();

  for (const forbiddenPhrase of [
    "OpenAI API is approved",
    "Approved: OpenAI API",
    "Provider output can create accepted geometry",
    "Confidence threshold acceptance enabled",
  ]) {
    assert.doesNotMatch(doc, new RegExp(escapeRegExp(forbiddenPhrase), "u"), forbiddenPhrase);
  }
});

test("PR113 defines the required security and data lifecycle rules", async () => {
  const doc = await readDecisionDoc();

  for (const required of [
    "no committed secrets",
    "no API keys in fixtures, docs examples, tests, PR bodies, logs, or artifacts",
    "environment variables only for any future live provider experiment",
    "no `.env` mutation or committed local environment files",
    "no raw user uploads",
    "no real-user data in tests",
    "no production/private source assets in fixtures",
    "no raw provider response persistence by default",
    "no live provider output may be persisted, committed, or used as a fixture\n  without an explicit redaction and replay contract",
    "no raw provider traces, hidden prompts, chain-of-thought, signed URLs,\n  cookies, bearer tokens, local paths, or remote URLs in committed fixtures",
    "redaction required before any persistence",
    "deterministic replay fixture strategy required before comparing or debugging\n  provider behavior",
    "fail-closed behavior when required provider configuration is missing",
  ]) {
    assert.match(doc, new RegExp(escapeRegExp(required), "u"), required);
  }
});

test("PR113 does not approve live provider output retention without explicit redaction and replay contract", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /no raw provider response persistence by default/u);
  assert.match(doc, /without an explicit redaction and replay contract/u);
  assert.match(doc, /deterministic replay fixture strategy required/u);
});

test("PR114 gate is local gated prototype-only and no live API by default", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /PR114: local gated provider-evidence adapter prototype/u);
  for (const required of [
    "provider-neutral envelope",
    "unchanged PR111 helper boundary",
    "no direct provider-to-Core path",
    "no provider-derived accepted geometry",
    "no Core schema/runtime widening",
    "no package/public exports",
    "deterministic replay/redaction strategy",
    "clear failure behavior",
    "no CI live-network dependency",
    "no live provider API call by default",
    "synthetic/local provider-boundary implementation proof",
  ]) {
    assert.match(doc, new RegExp(escapeRegExp(required), "u"), required);
  }
});

test("PR115 is an approval gate and PR116 is the next disabled implementation gate", async () => {
  const doc = await readDecisionDoc();

  assert.match(doc, /`PR115: approve controlled live provider experiment gate` is the approval gate\nbefore any controlled live-provider experiment implementation/u);
  assert.match(doc, /PR116: add disabled local live-provider experiment harness/u);
  assert.match(doc, /PR116 must be disabled by default, manual-only, fail-closed without environment\nconfiguration, and excluded from CI live-network execution/u);
  assert.match(doc, /live provider execution remains PR117 or later/u);
  assert.match(doc, /PR113 does not approve a live provider call by itself/u);
});

test("PR113 explicitly leaves runtime provider package and widening surfaces unapproved", async () => {
  const doc = await readDecisionDoc();

  for (const nonApproval of [
    "OpenAI calls",
    "image APIs",
    "vision model calls",
    "provider SDK",
    "provider runtime",
    "provider payload parser",
    "exact OpenAI response fixture",
    "exact provider payload schema",
    "real image recognition",
    "live provider data retention",
    "image upload",
    "CAD/Figma import",
    "MCP changes",
    "ChatGPT connector runtime",
    "hosted MCP",
    "server, deployment, auth, OAuth, or secrets",
    "package exports",
    "package metadata",
    "dependencies",
    "lockfile changes",
    "Core schema widening",
    "Core runtime widening",
    "runtime adapters",
    "source fixture changes",
    "demo changes",
    "public API",
    "package publication",
  ]) {
    assert.match(doc, new RegExp(`- ${escapeRegExp(nonApproval)};`, "u"), nonApproval);
  }
});

test("roadmap records PR113 readiness gate and PR114 PR115 sequencing", async () => {
  const roadmap = await readFile(roadmapPath, "utf8");

  assert.match(roadmap, /PR113: approve real external evidence pilot readiness gate/u);
  assert.match(roadmap, /PR113 is docs\/tests-only/u);
  assert.match(roadmap, /Provider output -> External Evidence Envelope -> Explicit Acceptance Boundary/u);
  assert.match(roadmap, /PR114: local gated provider-evidence adapter prototype/u);
  assert.match(roadmap, /no live provider API call by default/u);
  assert.match(roadmap, /PR115: approve controlled live provider experiment gate/u);
  assert.match(roadmap, /PR113 does not approve live provider calls/u);
});

async function readDecisionDoc() {
  return readFile(decisionPath, "utf8");
}

function assertHeadings(doc, headings) {
  for (const heading of headings) {
    assert.match(doc, new RegExp(`^${escapeRegExp(heading)}$`, "mu"), heading);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
