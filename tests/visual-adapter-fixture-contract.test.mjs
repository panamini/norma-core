import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  sharedExactApprovedChangedFiles,
  visualAdapterFixtureContractChangedFiles,
} from "./changed-file-guard.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const decisionPath = join(repoRoot, "docs", "decisions", "2026-07-04-visual-adapter-fixture-contract.md");

const requiredHeadings = [
  "# Visual Adapter Fixture Contract",
  "## Status",
  "## Decision",
  "## First Proof Boundary",
  "## Source Truth Boundary",
  "## Provenance And Identity",
  "## Lossy Conversion Warnings",
  "## Metric Policy Invariants",
  "## Derived Artifact Boundary",
  "## Next Implementation PR",
  "## Package Publication Boundary",
  "## Later Hosted And ChatGPT Work",
  "## Explicit Non-Goals",
  "## Validation Gates",
  "## Rollback",
];

test("PR102 decision file exists with required headings in order", () => {
  const decision = readDecision();
  assertHeadingsInOrder(decision, requiredHeadings);
});

test("PR102 keeps visual/provider output as candidate evidence, not Core truth", () => {
  const decision = readDecision();
  assertDocMentions(decision, [
    "pre-authored visual geometry observations -> explicit accepted structured geometry -> existing Norma Core / Structured Analyze path",
    "Source assets, visual observations, provider outputs, CAD output, Figma output, screenshots, photos, maps, architectural images, overlays, prompts, and derived inspection artifacts are candidate evidence only",
    "They are not Norma Core truth",
    "must not be evaluated by Core directly",
    "The only handoff that may enter existing Core or Structured Analyze analysis is explicit accepted structured geometry",
  ]);
});

test("PR102 requires synthetic static local-only fixtures without sensitive source payloads", () => {
  const decision = readDecision();
  assertDocMentions(decision, [
    "synthetic, static, local-only, and fixture-only",
    "pre-authored candidate observations",
    "accepted structured geometry handoff",
    "raw image bytes",
    "base64 image content",
    "local filesystem paths",
    "remote URLs",
    "credentials",
    "bearer tokens",
    "API keys",
    "cookies",
    "signed URLs",
    "private production assets",
    "real-user data",
  ]);
});

test("PR102 blocks runtime adapters providers publication package and Core widening", () => {
  const decision = readDecision();
  assertDocMentions(decision, [
    "runtime adapter implementation",
    "image recognition",
    "CAD import",
    "Figma import",
    "provider calls",
    "OpenAI calls",
    "hosted MCP",
    "ChatGPT connector runtime",
    "upload runtime",
    "server or deployment runtime",
    "npm publish",
    "public package publication",
    "license selection",
    "package metadata changes",
    "dependency or lockfile changes",
    "package-root exports",
    "Core schema widening",
    "Core runtime widening",
    "prompt-derived source truth",
    "automatic family selection",
    "automatic correction",
    "recommendation",
    "optimization",
    "scoring",
    "beauty judgment",
  ]);
});

test("PR102 requires provenance content identity and lossy conversion warnings", () => {
  const decision = readDecision();
  assertDocMentions(decision, [
    "source asset identity as a synthetic fixture identity",
    "provider or adapter identity",
    "observation identity",
    "acceptance actor and acceptance mode",
    "correction history when any correction exists",
    "accepted geometry content identity",
    "observation content identity when referenced",
    "operation or contract identity",
    "deterministic content projections",
    "explicit lossy-conversion warnings",
    "Warnings are diagnostic evidence only",
    "do not accept geometry",
  ]);
});

test("PR102 preserves PR86 metric policy and derived artifact source-truth boundaries", () => {
  const decision = readDecision();
  assertDocMentions(decision, [
    "The PR86 metric-policy invariant remains mandatory",
    "existing accepted geometry",
    "synthetic shared surfaces",
    "normalized output compositions",
    "Structured Analyze operation contexts",
    "derived inspection artifacts",
    "must not invent metric units",
    "infer physical measurements from pixels",
    "drop surface-only metric policies",
    "Derived artifacts must not become source truth",
    "metric-policy authority",
  ]);
});

test("PR102 identifies the next implementation PR as fixture-only and local-only", () => {
  const decision = readDecision();
  assertDocMentions(decision, [
    "The next implementation PR after PR102 must be fixture-only and local-only",
    "static synthetic fixtures",
    "focused local tests",
    "must not add runtime adapter implementation",
    "must not add",
    "Core schema/runtime widening",
  ]);
});

test("PR102 changed-file guard accepts only the exact approved file set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(visualAdapterFixtureContractChangedFiles),
    visualAdapterFixtureContractChangedFiles,
  );

  assert.deepEqual(visualAdapterFixtureContractChangedFiles, [
    "docs/decisions/2026-07-04-visual-adapter-fixture-contract.md",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/visual-adapter-fixture-contract.test.mjs",
  ]);

  for (const forbiddenFile of [
    "src/index.ts",
    "src/accepted-geometry-to-core-mapping.ts",
    "src/accepted-geometry-to-structured-analyze-normalization.ts",
    "src/structured-composition-analysis.ts",
    "src/mcp/stdio-protocol.ts",
    "src/providers/openai.ts",
    "src/adapters/figma.ts",
    "src/adapters/cad.ts",
    "bin/norma-cli.mjs",
    "viewer/read-only-result-viewer.html",
    "examples/structured-analyze/usecases/structured-layout-real-usecase.json",
    "tests/fixtures/visual-adapter/source-image.png",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...visualAdapterFixtureContractChangedFiles, forbiddenFile]),
      null,
      forbiddenFile,
    );
  }
});

function readDoc(path) {
  return readFileSync(path, "utf8");
}

function readDecision() {
  assert.equal(existsSync(decisionPath), true);
  return readDoc(decisionPath);
}

function assertHeadingsInOrder(source, expectedHeadings) {
  const positions = expectedHeadings.map((heading) => {
    const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "m");
    const match = pattern.exec(source);
    assert.notEqual(match, null, `${heading} should exist as a heading`);
    return match.index;
  });

  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
}

function assertDocMentions(source, snippets) {
  for (const snippet of snippets) {
    assert.match(source, new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "i"), `${snippet} should be documented`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
