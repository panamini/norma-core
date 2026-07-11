import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const decisionPath = join(
  repoRoot,
  "docs/decisions/2026-07-11-local-visual-candidate-review-product-surface.md",
);
const roadmapPath = join(repoRoot, "docs/BUSINESS_READINESS_ROADMAP.md");
const pr129CheckpointPath = join(repoRoot, "docs/decisions/2026-07-10-pr129-operator-proof-checkpoint.md");

async function decisionText() {
  return readFile(decisionPath, "utf8");
}

function selectionIntentSchema(text) {
  const match = text.match(
    /<!-- BEGIN LOCAL_VISUAL_CANDIDATE_SELECTION_INTENT_V1 -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- END LOCAL_VISUAL_CANDIDATE_SELECTION_INTENT_V1 -->/u,
  );
  assert.notEqual(match, null, "selection intent schema must be embedded between stable markers");
  return JSON.parse(match[1]);
}

function section(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, `${heading} must exist`);
  const end = nextHeading === undefined ? text.length : text.indexOf(nextHeading, start + heading.length);
  assert.notEqual(end, -1, `${nextHeading} must exist after ${heading}`);
  return text.slice(start, end);
}

function assertNotApproved(text, surface) {
  const escaped = surface.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  assert.doesNotMatch(text, new RegExp(`${escaped}[^.\\n]{0,80}(?:is|are|:)\\s*approved`, "iu"));
  assert.doesNotMatch(text, new RegExp(`approved\\s*[:,-]?\\s*[^.\\n]{0,40}${escaped}`, "iu"));
}

function assertIncludesNormalized(text, expected) {
  const normalized = text.replace(/\s+/gu, " ");
  assert.equal(normalized.includes(expected), true, expected);
}

test("PR131 selects exactly the local static candidate-review surface", async () => {
  const text = await decisionText();
  const selected = section(text, "## Selected Product Surface", "## Why This Surface");

  assertIncludesNormalized(selected, "local static visual candidate review and explicit-selection surface");
  assert.match(selected, /not the existing read-only result viewer/u);
  assert.match(selected, /continues to inspect completed result envelopes only and remains read-only/u);
  for (const deferred of ["Private ChatGPT/MCP", "hosted MCP", "CAD/Figma", "package publication", "public product launch"]) {
    assertIncludesNormalized(selected, deferred);
    assertNotApproved(selected, deferred);
  }
});

test("PR131 deferred-surface approval guard catches both wording directions", () => {
  assert.throws(() => assertNotApproved("Hosted MCP is approved", "Hosted MCP"));
  assert.throws(() => assertNotApproved("Approved: hosted MCP", "hosted MCP"));
  assert.throws(() => assertNotApproved("Package publication: approved", "Package publication"));
  assert.throws(() => assertNotApproved("Approved, CAD/Figma", "CAD/Figma"));
});

test("PR131 records an honest local operator journey without claiming human identity proof", async () => {
  const text = await decisionText();
  const journey = section(text, "## Local Operator Journey", "## Input And Output Boundaries");
  for (const required of [
    "candidate-observation.json",
    "original local",
    "first product slice is PNG only",
    "hashes the exact image bytes in memory",
    "decoded natural width and height",
    "sourcePixelWidth",
    "sourcePixelHeight",
    "blocks overlays and selection",
    "starts with no candidate selected",
    "keyboard-operable",
    "separate affirmative confirm action",
    "produces no selection artifact",
    "non-authoritative selection-intent JSON",
    "selection-intent JSON",
    "does not create AcceptedGeometry or call Core",
    "package-private Node finalizer",
    "provider execution receipt",
    "--confirm-exact-selection",
    "norma.local-visual-human-candidate-selection@1",
    "existing PR129 no-network `--resume` path",
    "canonical `result.json`",
  ]) assertIncludesNormalized(journey, required);

  assertIncludesNormalized(text, "not proof of a legal identity, account, email address, or authenticated human");
  assertIncludesNormalized(text, "does not claim cryptographic proof that a particular person reviewed the image");
  assertIncludesNormalized(text, "literal `actorClass: \"human\"` does not authenticate a person");
  assertIncludesNormalized(text, "restricted to synthetic or explicitly non-sensitive local images");
});

test("PR131 freezes a closed and bounded selection-intent schema", async () => {
  const schema = selectionIntentSchema(await decisionText());
  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    "contractId",
    "contractVersion",
    "candidateObservationId",
    "candidateObservationContentIdentity",
    "providerExecutionReceiptContentIdentity",
    "reviewedSourceImageContentIdentity",
    "acceptanceActor",
    "geometryAction",
    "selectedCandidateIds",
  ]);
  assert.deepEqual(Object.keys(schema.properties), schema.required);
  assert.equal(schema.properties.contractId.const, "norma.local-visual-candidate-selection-intent@1");
  assert.equal(schema.properties.contractVersion.const, 1);
  assert.equal(schema.properties.acceptanceActor.additionalProperties, false);
  assert.deepEqual(schema.properties.acceptanceActor.required, ["actorClass", "actorId"]);
  assert.equal(schema.properties.acceptanceActor.properties.actorClass.const, "human");
  assert.equal(schema.properties.geometryAction.const, "accept_exact");
  assert.equal(schema.properties.selectedCandidateIds.minItems, 1);
  assert.equal(schema.properties.selectedCandidateIds.maxItems, 64);
  assert.equal(schema.properties.selectedCandidateIds.uniqueItems, true);
  for (const identity of [
    "candidateObservationContentIdentity",
    "providerExecutionReceiptContentIdentity",
    "reviewedSourceImageContentIdentity",
  ]) assert.equal(schema.properties[identity].pattern, "^sha256:[0-9a-f]{64}$");

  for (const forbidden of [
    "coordinates",
    "confidence",
    "corrections",
    "prompt",
    "providerPayload",
    "url",
    "path",
    "credential",
    "rawImage",
    "acceptedGeometry",
    "coreInput",
    "pack",
    "rule",
    "tolerance",
    "evaluation",
  ]) assert.equal(forbidden in schema.properties, false, forbidden);
});

test("PR131 keeps browser intent separate from acceptance and canonical computation", async () => {
  const text = await decisionText();
  for (const required of [
    "must not implement Norma canonical serialization or final",
    "finalizeLocalVisualHumanCandidateSelectionIdentityV1",
    "existing PR129 selection validator remains the acceptance gate",
    "reuse the existing package-private receipt and candidate validators",
    "bounded-read the same local PNG image once",
    "sourcePixelWidth",
    "sourcePixelHeight",
    "Missing `--confirm-exact-selection`",
    "must preserve candidate",
    "image identities to match exactly",
    "must preserve candidate envelope order",
    "must not execute Core or Structured Analyze in browser code",
    "local-only, dependency-free, package-private, and CI-network-free",
  ]) assertIncludesNormalized(text, required);

  for (const forbiddenBrowserSurface of [
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "beacon",
    "remote URLs",
    "cookies",
    "local/session storage",
    "IndexedDB",
    "service workers",
    "analytics",
    "clipboard APIs",
    "restrictive local Content Security Policy",
    "unsafe HTML insertion",
  ]) assert.match(text, new RegExp(forbiddenBrowserSurface.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));

  for (const boundedRequirement of [
    "Candidate-observation JSON is limited to 256 KiB and 64 candidates",
    "intent is limited to 64 KiB and 64 selected candidate IDs",
    "top-left/y-down normalized rectangle overlays",
    "rendered image content box",
    "accept-all defaults",
    "confidence-driven sorting",
  ]) assertIncludesNormalized(text, boundedRequirement);
});

test("roadmap advances directly to PR132 while deferred tracks remain blocked", async () => {
  const roadmap = await readFile(roadmapPath, "utf8");
  assert.match(roadmap, /PR131 selects exactly one first visual pilot product surface/u);
  assert.match(roadmap, /PR131 is docs\/tests-only and implements no UI or runtime/u);
  assert.match(roadmap, /freezes PR132 as\s+the next implementation PR/u);
  assert.match(roadmap, /one no-PR operator validation/u);
  assertIncludesNormalized(roadmap, "Existing PR129 `--resume` remains the only path to AcceptedGeometry");
  assert.match(roadmap, /Hosted MCP, ChatGPT connector runtime, CAD\/Figma[\s\S]*remain unapproved/u);
});

test("PR129 checkpoint records PR132 implementation and routes to operator validation", async () => {
  const checkpoint = await readFile(pr129CheckpointPath, "utf8");
  assert.match(checkpoint, /PR131 completed the `productization decision`/u);
  assert.match(checkpoint, /PR132 implements the selected local review slice/u);
  assert.match(checkpoint, /After merge, the next action is a no-PR operator validation/u);
  assert.doesNotMatch(checkpoint, /PR131 must choose exactly one first\s+visual pilot product surface/u);
});

test("PR131 implements no runtime or product surface files", async () => {
  const text = await decisionText();
  assert.match(text, /PR131 is docs\/tests-only/u);
  assert.match(text, /does not implement or modify runtime code, UI files, fixtures/u);
  assert.match(text, /does not implement UI, runtime, provider, package, hosted, or public behavior/u);
});
