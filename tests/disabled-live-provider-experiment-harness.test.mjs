import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import * as packageRoot from "../dist/src/index.js";
import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import { createDisabledLiveProviderExperimentHarnessStateV1 } from "../dist/src/local-report/disabled-live-provider-experiment-harness.js";
import {
  branchChangedFiles,
  disabledLiveProviderExperimentHarnessChangedFiles,
  isExactChangedFileSet,
  permanentRemoteMcpRuntimeChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";
import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const commandPath = join(repoRoot, "bin", "norma-core-disabled-live-provider-experiment-harness.mjs");
const helperSourcePath = join(
  repoRoot,
  "src",
  "local-report",
  "disabled-live-provider-experiment-harness.ts",
);
const commandSourcePath = join(repoRoot, "bin", "norma-core-disabled-live-provider-experiment-harness.mjs");
const packageJsonPath = join(repoRoot, "package.json");
const indexSourcePath = join(repoRoot, "src", "index.ts");
const decisionPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-08-disabled-local-live-provider-experiment-harness.md",
);
const roadmapPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");
const pr115DecisionPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-08-controlled-live-provider-experiment-gate.md",
);
const pr111HelperPath = join(
  repoRoot,
  "src",
  "local-report",
  "synthetic-external-evidence-acceptance-proof.ts",
);
const pr114AdapterPath = join(repoRoot, "src", "provider-evidence-replay-adapter.ts");

test("PR116 harness is disabled by default and emits fail-closed local state", () => {
  const state = createDisabledLiveProviderExperimentHarnessStateV1();

  assert.equal(state.gateStatus, "blocked_disabled_by_default");
  assert.equal(state.disabledByDefault, true);
  assert.equal(state.manualOnly, true);
  assert.equal(state.failClosed, true);
  assert.equal(state.localOnly, true);
  assert.equal(state.liveProviderExecution, false);
  assert.equal(state.ciLiveNetworkDependency, false);
  assert.equal(state.requiresFutureApprovalForNetwork, true);
  assert.equal(state.futureApprovalGate, "PR117+ explicit Change Contract");
  assert.equal(state.gateInputs.manualOperatorIntentRepresented, false);
  assert.equal(state.gateInputs.redactedConfigurationPresenceRepresented, false);
});

test("PR116 missing manual operator intent fails closed before live execution", () => {
  const state = createDisabledLiveProviderExperimentHarnessStateV1({
    redactedConfigurationPresence: representedRedactedConfiguration(),
  });

  assert.equal(state.gateStatus, "blocked_missing_manual_operator_intent");
  assert.equal(state.gateInputs.manualOperatorIntentRepresented, false);
  assert.equal(state.gateInputs.redactedConfigurationPresenceRepresented, true);
  assert.equal(state.liveProviderExecution, false);
  assert.equal(state.networkCall, false);
});

test("PR116 missing redacted configuration presence fails closed before live execution", () => {
  const state = createDisabledLiveProviderExperimentHarnessStateV1({
    manualOperatorIntent: true,
  });

  assert.equal(state.gateStatus, "blocked_missing_redacted_configuration_presence");
  assert.equal(state.gateInputs.manualOperatorIntentRepresented, true);
  assert.equal(state.gateInputs.redactedConfigurationPresenceRepresented, false);
  assert.equal(state.liveProviderExecution, false);
  assert.equal(state.providerSdkUsage, false);
});

test("PR116 malformed request input still returns structured fail-closed state", () => {
  const state = createDisabledLiveProviderExperimentHarnessStateV1(null);

  assert.equal(state.gateStatus, "blocked_disabled_by_default");
  assert.equal(state.failClosed, true);
  assert.equal(state.liveProviderExecution, false);
  assert.equal(state.networkCall, false);
  assert.equal(state.gateInputs.manualOperatorIntentRepresented, false);
  assert.equal(state.gateInputs.redactedConfigurationPresenceRepresented, false);
});

test("PR116 represented manual intent and redacted configuration still require a future contract", () => {
  const state = createDisabledLiveProviderExperimentHarnessStateV1({
    manualOperatorIntent: true,
    redactedConfigurationPresence: representedRedactedConfiguration(),
  });

  assert.equal(state.gateStatus, "live_execution_unapproved_requires_future_change_contract");
  assert.equal(state.gateInputs.manualOperatorIntentRepresented, true);
  assert.equal(state.gateInputs.redactedConfigurationPresenceRepresented, true);
  assert.equal(state.liveProviderExecution, false);
  assert.equal(state.networkCall, false);
  assert.equal(state.requiresFutureApprovalForNetwork, true);
});

test("PR116 harness returns only low-sensitivity redacted state recursively", () => {
  const fakeSecret = "sk-test-redacted-do-not-return";
  const fakeBearer = "Bearer fake-redacted";
  const fakeUrl = "https://example.invalid/private";
  const fakePath = "/Users/private/source.png";
  const fakePrompt = "private prompt text";
  const state = createDisabledLiveProviderExperimentHarnessStateV1({
    manualOperatorIntent: true,
    redactedConfigurationPresence: {
      ...representedRedactedConfiguration(),
      unsafeSecretProbe: fakeSecret,
      unsafeBearerProbe: fakeBearer,
      unsafeUrlProbe: fakeUrl,
      unsafePathProbe: fakePath,
      unsafePromptProbe: fakePrompt,
    },
  });
  const serialized = JSON.stringify(state);

  for (const forbidden of [fakeSecret, fakeBearer, fakeUrl, fakePath, fakePrompt]) {
    assert.doesNotMatch(serialized, new RegExp(escapeRegExp(forbidden), "u"), forbidden);
  }
  assert.deepEqual(state.futureGateNames, [
    "NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT",
    "NORMA_LIVE_PROVIDER",
    "NORMA_LIVE_PROVIDER_API_KEY",
  ]);
  assertNoForbiddenOutputValue(state);
});

test("PR116 harness cannot produce Core input accepted geometry provider truth or result output", () => {
  const state = createDisabledLiveProviderExperimentHarnessStateV1({
    manualOperatorIntent: true,
    redactedConfigurationPresence: representedRedactedConfiguration(),
  });

  assert.equal(validateAcceptedGeometryV1(state).ok, false);
  assert.equal(state.providerEvidenceOnly, true);
  assert.equal(state.providerOutputIsCoreTruth, false);
  assert.equal(state.providerOutputCanCreateAcceptedGeometry, false);
  assert.equal(state.acceptedStructuredGeometryOnlyCoreInput, true);
  assert.equal(state.providerSelfAcceptance, false);
  assert.equal(state.confidenceScoreValueCanAuthorizeAcceptance, false);
  assert.equal(state.promptArtifactOrMetricPolicyCanAuthorizeAcceptance, false);
  assert.equal(state.coreInputProduced, false);
  assert.equal(state.acceptedStructuredGeometryProduced, false);
  assert.equal(state.resultJsonProduced, false);
  assert.equal(state.packageApiTruth, false);
  assert.equal(state.connectorTruth, false);
  assert.equal(state.hostedTruth, false);
  assert.equal(state.artifactTruth, false);
  assert.equal(state.metricPolicyAuthority, false);
});

test("PR116 command exists runs without args and emits structured JSON only", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [commandPath], {
    cwd: repoRoot,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  const parsed = JSON.parse(stdout);

  assert.equal(stderr, "");
  assert.equal(stdout, `${JSON.stringify(parsed)}\n`);
  assert.equal(parsed.liveProviderExecution, false);
  assert.equal(parsed.disabledByDefault, true);
  assert.equal(parsed.manualOnly, true);
  assert.equal(parsed.failClosed, true);
  assert.equal(parsed.ciLiveNetworkDependency, false);
  assert.equal(parsed.providerNeutral, true);
  assert.equal(parsed.providerEvidenceOnly, true);
  assert.equal(parsed.acceptedStructuredGeometryOnlyCoreInput, true);
  assert.equal(parsed.providerOutputIsCoreTruth, false);
  assert.equal(parsed.requiresFutureApprovalForNetwork, true);
  assertNoForbiddenOutputValue(parsed);
});

test("PR116 source uses no forbidden provider network env image package or public surfaces", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const commandSource = await readFile(commandSourcePath, "utf8");
  const packageJsonText = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonText);
  const indexSource = await readFile(indexSourcePath, "utf8");
  const combinedSource = `${helperSource}\n${commandSource}`;
  const importStatements = combinedSource
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n");

  assert.doesNotMatch(
    importStatements,
    /openai|providers|provider-sdk|node:http|node:https|child_process|fetch|websocket|image|vision|cad|figma|mcp|chatgpt|server|upload|oauth|from "\.\.\/dist\/src\/index\.js"|from "\.\/index|from "@norma\/core"/iu,
  );
  assert.doesNotMatch(combinedSource, /\b(?:fetch|XMLHttpRequest|WebSocket|process\.env)\b|\.env\s*=|dotenv|child_process|node:http|node:https|imageRecognition\s*:\s*true/iu);
  assert.equal("createDisabledLiveProviderExperimentHarnessStateV1" in packageRoot, false);
  assert.doesNotMatch(indexSource, /disabled-live-provider-experiment-harness/u);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assertCurrentRemoteMcpPackageBoundary(packageJson);
  if (isExactChangedFileSet(await gitDiffNames(), permanentRemoteMcpRuntimeChangedFiles)) return;
  assert.deepEqual(
    (await gitDiffNames()).filter((file) => [
      "package.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      ".github/workflows/ci.yml",
      "src/index.ts",
    ].includes(file)),
    [],
  );
});

test("PR116 docs do not claim live provider implementation or approval", async () => {
  const combinedDocs = [
    await readFile(decisionPath, "utf8"),
    await readFile(roadmapPath, "utf8"),
    await readFile(pr115DecisionPath, "utf8"),
  ].join("\n");

  assert.match(combinedDocs, /PR116: add disabled local live-provider experiment harness/u);
  assert.match(combinedDocs, /PR117\+ explicit Change Contract/u);
  assert.match(combinedDocs, /Provider output remains untrusted evidence only/u);
  for (const forbiddenPhrase of [
    "live provider calls are implemented",
    "live provider calls are approved",
    "OpenAI API is approved",
    "provider output is Core truth",
    "provider output can create accepted geometry",
    "confidence threshold acceptance is enabled",
    "result.json is produced by PR116",
  ]) {
    assert.doesNotMatch(combinedDocs, new RegExp(escapeRegExp(forbiddenPhrase), "iu"), forbiddenPhrase);
  }
});

test("PR116 preserves existing PR111 proof helper and PR114 replay adapter files", async () => {
  const pr111Source = await readFile(pr111HelperPath, "utf8");
  const pr114Source = await readFile(pr114AdapterPath, "utf8");

  assert.match(pr111Source, /export function createSyntheticExternalEvidenceAcceptanceProofV1/u);
  assert.match(pr111Source, /providerEvidenceOnly: true/u);
  assert.match(pr111Source, /confidenceAuthority: false/u);
  assert.match(pr114Source, /export function createProviderNeutralEnvelopeFromReplayV1/u);
  assert.match(pr114Source, /providerEvidenceAuthority: "candidateEvidenceOnly"/u);
  assert.match(pr114Source, /acceptedGeometryFromProvider: false/u);
});

test("PR116 exact changed-file guard accepts only the disabled harness file set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(disabledLiveProviderExperimentHarnessChangedFiles),
    disabledLiveProviderExperimentHarnessChangedFiles,
  );
  assert.deepEqual(disabledLiveProviderExperimentHarnessChangedFiles, [
    "bin/norma-core-disabled-live-provider-experiment-harness.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-disabled-local-live-provider-experiment-harness.md",
    "src/local-report/disabled-live-provider-experiment-harness.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/disabled-live-provider-experiment-harness.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
});

test("PR116 changed-file guard rejects forbidden runtime provider public fixture and dependency extras", () => {
  for (const forbiddenFile of [
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
    "bin/norma-core-live-provider-experiment.mjs",
    "docs/examples/disabled-local-live-provider-experiment-harness.md",
    "docs/examples/openai-vision-pilot.md",
    "tests/fixtures/provider-evidence-replay/openai-response.json",
    "tests/fixtures/provider-evidence-replay/raw-provider-response.json",
    "tests/fixtures/provider-evidence-replay/raw-image.png",
    "tests/fixtures/visual-adapter/openai-response.json",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "../norma-core-wiki/wiki/hot.md",
    "/Volumes/video/git/norma-core-wiki/wiki/hot.md",
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
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([
        ...disabledLiveProviderExperimentHarnessChangedFiles,
        forbiddenFile,
      ]),
      null,
      forbiddenFile,
    );
  }
});

function representedRedactedConfiguration() {
  return {
    enableFlagPresent: true,
    providerNamePresent: true,
    providerCredentialPresent: true,
  };
}

function assertNoForbiddenOutputValue(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /https?:\/\/|file:|data:image|base64|Bearer\s+|sk-[A-Za-z0-9]|\/Users\/|\/Volumes\//u);
  assert.equal(hasKey(value, "acceptedStructuredGeometry"), false);
  assert.equal(hasKey(value, "acceptedGeometry"), false);
  assert.equal(hasKey(value, "resultJson"), false);
  assert.equal(hasKey(value, "providerPayload"), false);
  assert.equal(hasKey(value, "prompt"), false);
  assert.equal(hasKey(value, "cookie"), false);
}

async function gitDiffNames() {
  const workingTree = await execFileAsync("git", ["diff", "--name-only"], { cwd: repoRoot });
  const untracked = await execFileAsync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: repoRoot,
  });

  return [...new Set([
    ...branchChangedFiles(repoRoot),
    ...workingTree.stdout.split(/\r?\n/u).filter(Boolean),
    ...untracked.stdout.split(/\r?\n/u).filter(Boolean),
  ])].sort();
}

function hasKey(value, keyName) {
  if (Array.isArray(value)) {
    return value.some((item) => hasKey(item, keyName));
  }

  if (value === null || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, child]) => key === keyName || hasKey(child, keyName));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
