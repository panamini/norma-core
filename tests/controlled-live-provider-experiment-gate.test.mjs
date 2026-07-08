import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import {
  controlledLiveProviderExperimentGateChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const decisionPath = join(
  repoRoot,
  "docs/decisions/2026-07-08-controlled-live-provider-experiment-gate.md",
);
const roadmapPath = join(repoRoot, "docs/BUSINESS_READINESS_ROADMAP.md");

test("PR115 decision doc exists and has required headings", async () => {
  const doc = await readDecisionDoc();

  assertHeadings(doc, [
    "# Controlled Live Provider Experiment Gate",
    "## Status",
    "## Purpose",
    "## Current Rail",
    "## Provider-Neutral Architecture",
    "## Selected Candidate",
    "## Live Experiment Gate",
    "## Data Retention And Replay",
    "## Acceptance Authority",
    "## Core Truth Rule",
    "## PR116 Gate",
    "## Explicit Non-Goals",
    "## Validation Gates",
  ]);
});

test("PR115 status is accepted gate approval contract and not implementation", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "Accepted as PR115 controlled live provider experiment gate / approval contract",
    "PR115 approves only the controlled live provider experiment gate and approval contract",
    "It does not implement a live provider runtime",
    "provider SDK",
    "payload parser",
    "network call",
  ]);
});

test("PR115 current rail summarizes PR108 through PR115 from current repo state", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "PR108 established the current external evidence boundary",
    "PR109 selected OpenAI/vision-style evidence as the first external pilot candidate",
    "PR110 proved the synthetic external evidence acceptance boundary",
    "PR111 added the package-private synthetic evidence acceptance proof helper",
    "PR112 added the local synthetic evidence acceptance demo command",
    "PR113 approved the first real external evidence pilot readiness gate",
    "PR114 added the package-private local gated provider-evidence replay adapter prototype",
    "PR115 is the gate before any later real provider experiment",
  ]);
});

test("PR115 keeps selected candidate while architecture remains provider-neutral", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "The selected pilot candidate remains OpenAI/vision-style evidence",
    "OpenAI/vision-style is the selected pilot candidate only",
    "It is not a Core dependency, package dependency, source-truth authority",
    "CAD/Figma remains unselected",
    "ChatGPT/MCP product path remains unselected",
    "The required lifecycle remains",
    "Provider output -> provider-neutral External Evidence Envelope -> explicit Acceptance Boundary -> Accepted Structured Geometry -> Norma Core / Structured Analyze -> result.json-shaped canonical computational output where applicable",
    "Future provider-specific mapping must terminate at a provider-neutral External Evidence Envelope or repository-equivalent boundary",
  ]);
});

test("PR115 treats provider output as untrusted evidence only and never Core truth", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "Provider output may suggest evidence",
    "Provider output never defines Norma truth",
    "Only accepted structured geometry may enter Core",
    "Provider output is untrusted evidence only",
    "Provider output cannot become Norma truth, Core input, accepted geometry directly, package API truth, connector truth, hosted truth, artifact truth, metric-policy authority",
    "Only accepted structured geometry may enter Norma Core / Structured Analyze",
    "result.json-shaped computational output remains the canonical Norma result",
  ]);
});

test("PR115 does not approve exact OpenAI or provider payload contracts or fixtures", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "No provider-specific type, payload shape, SDK response object, exact provider JSON fixture, or provider metadata may become a Core contract",
    "exact OpenAI response schemas such as `OpenAIResponseV1`",
    "exact provider response schemas such as `VisionProviderPayloadV1`",
    "exact OpenAI response fixtures",
    "raw provider response fixtures",
  ]);
});

test("PR115 defines secret configuration fail-closed timeout and no-CI-network rules", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "manual/operator-gated only",
    "explicit opt-in before provider execution",
    "environment-variable-only secrets",
    "committed secrets",
    "API keys",
    "signed URLs",
    "local paths",
    "bearer tokens",
    "raw provider traces",
    "hidden prompts",
    "chain-of-thought",
    "raw user data",
    "production assets",
    "private source assets",
    "`.env` mutation",
    "Missing required configuration must fail closed before any network call",
    "No CI live-network dependency is allowed",
    "bounded timeout",
    "deterministic failure reporting",
  ]);
});

test("PR115 forbids raw provider output persistence without redaction and replay contract", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "Raw provider output must be ephemeral by default",
    "Live provider output must not be persisted, committed, logged into durable test artifacts, or used as a fixture unless a later redaction/replay contract explicitly approves",
    "Any replay fixture must be synthetic, redacted, and provider-neutral",
    "A replay fixture must never be raw provider JSON",
    "exact OpenAI response JSON",
    "provider SDK response JSON",
    "image bytes",
    "upload payload",
    "signed URL payload",
    "local-path payload",
    "production/private source asset",
  ]);
});

test("PR115 keeps acceptance authority outside provider boundary", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "Provider output must terminate at an external evidence envelope",
    "Provider output must not produce accepted structured geometry directly",
    "Provider self-acceptance is forbidden",
    "Confidence threshold",
    "score",
    "ranking",
    "value metadata",
    "label",
    "prompt",
    "artifact",
    "provider metadata",
    "must not authorize acceptance",
    "explicit human approval",
    "reviewed system-approved transformation outside the provider boundary",
    "Automatic geometry generation into Core is forbidden",
  ]);
});

test("PR115 preserves PR111 and PR114 proof boundaries", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "PR111 and PR114 proof boundaries remain intact",
    "package-private proof helper",
    "package-private replay adapter",
    "local synthetic/replay boundaries only",
    "without live provider execution or package export",
  ]);
});

test("PR116 gate is named exactly and stays disabled manual fail-closed no-CI-live-network", async () => {
  const doc = await readDecisionDoc();

  assertDocMentions(doc, [
    "PR116: add disabled local live-provider experiment harness",
    "PR116 must be disabled by default, manual-only, fail-closed without environment configuration, and excluded from CI live-network execution",
    "PR116 must not run a provider call unless its own Change Contract explicitly requests and justifies live network/provider execution",
    "Without that explicit request and justification, live provider execution remains PR117 or later",
  ]);
});

test("PR115 explicitly leaves runtime provider package MCP ChatGPT CAD Figma and Core surfaces unapproved", async () => {
  const doc = await readDecisionDoc();

  for (const nonGoal of [
    "live provider calls",
    "provider runtime",
    "OpenAI API calls",
    "OpenAI SDK usage",
    "image APIs",
    "vision model calls",
    "provider SDKs",
    "provider payload parsers",
    "real image recognition",
    "image upload",
    "CAD/Figma import",
    "MCP runtime changes",
    "ChatGPT connector runtime",
    "hosted MCP",
    "server, deployment, auth, OAuth, or secret-management runtime",
    "package exports",
    "package metadata changes",
    "package publication",
    "dependency changes",
    "lockfile changes",
    "Core schema widening",
    "Core runtime widening",
    "runtime adapters",
    "source fixture changes",
    "demo commands",
    "public API changes",
    "wiki mutation",
    "provider-derived accepted geometry",
    "confidence-threshold acceptance",
    "prompt-derived, artifact-derived, provider-derived, confidence-derived, or\n  observation-derived source truth",
  ]) {
    assert.match(doc, new RegExp(`- ${escapeRegExp(nonGoal)}[.;]`, "u"), nonGoal);
  }
});

test("roadmap records PR115 and PR116 gates without claiming implementation", async () => {
  const roadmap = await readFile(roadmapPath, "utf8");
  const pr115Section = sectionBetween(roadmap, "PR115 is the controlled live provider experiment gate:", "## Definitions of Ready");

  assertDocMentions(pr115Section, [
    "PR115: approve controlled live provider experiment gate",
    "PR115 is docs/tests-only",
    "It approves only the controlled live provider experiment gate and approval contract",
    "It does not implement live provider runtime",
    "OpenAI/vision-style remains the selected pilot candidate",
    "The architecture remains provider-neutral",
    "provider-neutral External Evidence Envelope",
    "Real provider calls remain unapproved until a later PR explicitly approves them",
    "PR116: add disabled local live-provider experiment harness",
    "disabled by default",
    "manual-only",
    "fail-closed without environment configuration",
    "excluded from CI live-network execution",
    "otherwise live provider execution remains PR117 or later",
  ]);
});

test("PR115 forbidden approval phrasing is absent", async () => {
  const combined = `${await readDecisionDoc()}\n${await readFile(roadmapPath, "utf8")}`;

  for (const forbiddenPhrase of [
    "OpenAI API is approved",
    "OpenAI integration is implemented",
    "Provider output may create accepted geometry",
    "Confidence threshold acceptance is enabled",
    "Live provider calls are approved",
    "Raw provider responses may be committed",
  ]) {
    assert.doesNotMatch(combined, new RegExp(escapeRegExp(forbiddenPhrase), "u"), forbiddenPhrase);
  }
});

test("PR115 changed-file guard accepts exactly the docs tests gate set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderExperimentGateChangedFiles),
    controlledLiveProviderExperimentGateChangedFiles,
  );
  assert.deepEqual(controlledLiveProviderExperimentGateChangedFiles, [
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-experiment-gate.md",
    "docs/decisions/2026-07-08-real-external-evidence-pilot-readiness.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-experiment-gate.test.mjs",
    "tests/real-external-evidence-pilot-readiness.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
});

test("PR115 changed-file guard rejects runtime provider package MCP ChatGPT CAD Figma wiki dependency and broad extras", () => {
  const forbiddenFiles = [
    "src/index.ts",
    "src/structured-composition-analysis.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/visual.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/mcp/http-server.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "bin/norma-core-live-provider-experiment.mjs",
    "bin/norma-cli.mjs",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "docs/examples/openai-vision-pilot.md",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "viewer/read-only-result-viewer.html",
    "reports/structured-analyze/report.html",
    "src/**",
    "bin/**",
    "docs/**",
    "tests/**",
    "tests/fixtures/**",
    ".github/**",
    "../norma-core-wiki/**",
    "examples/**",
    "viewer/**",
    "reports/**",
  ];

  for (const forbiddenFile of forbiddenFiles) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...controlledLiveProviderExperimentGateChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

async function readDecisionDoc() {
  return readFile(decisionPath, "utf8");
}

function assertHeadings(doc, headings) {
  for (const heading of headings) {
    assert.match(doc, new RegExp(`^${escapeRegExp(heading)}$`, "mu"), heading);
  }
}

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(
      doc,
      new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "iu"),
      snippet,
    );
  }
}

function sectionBetween(doc, startText, endHeading) {
  const start = doc.indexOf(startText);
  assert.notEqual(start, -1, `${startText} should exist`);
  const end = doc.indexOf(endHeading, start + startText.length);
  assert.notEqual(end, -1, `${endHeading} should exist`);
  assert.ok(end > start, `${endHeading} should appear after ${startText}`);
  return doc.slice(start, end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
