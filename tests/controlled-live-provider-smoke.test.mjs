import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import { analyzeStructuredCompositionV1 } from "../dist/src/structured-composition-analysis.js";
import {
  CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES,
  createControlledLiveProviderSmokeDefaultStateV1,
  createControlledLiveProviderSmokeGateStateV1,
  createOpenAIResponsesVisionSmokeRequestBodyV1,
  detectControlledLiveProviderSmokeImageV1,
} from "../dist/src/local-report/controlled-live-provider-smoke.js";
import { runControlledLiveProviderSmokeCli } from "../bin/norma-core-controlled-live-provider-smoke.mjs";
import {
  branchChangedFiles,
  controlledLiveProviderSmokeChangedFiles,
  disabledLiveProviderExperimentHarnessChangedFiles,
  providerEvidenceReplayAdapterChangedFiles,
  sharedExactApprovedChangedFiles,
} from "./changed-file-guard.mjs";

const execFileAsync = promisify(execFile);
const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(testDir);
const commandPath = join(repoRoot, "bin", "norma-core-controlled-live-provider-smoke.mjs");
const helperSourcePath = join(repoRoot, "src", "local-report", "controlled-live-provider-smoke.ts");
const commandSourcePath = commandPath;
const packageJsonPath = join(repoRoot, "package.json");
const indexSourcePath = join(repoRoot, "src", "index.ts");
const decisionPath = join(
  repoRoot,
  "docs",
  "decisions",
  "2026-07-08-controlled-live-provider-smoke.md",
);
const roadmapPath = join(repoRoot, "docs", "BUSINESS_READINESS_ROADMAP.md");

test("PR117 default helper state is disabled fail-closed and provider-evidence-only", () => {
  const state = createControlledLiveProviderSmokeDefaultStateV1();

  assert.equal(state.gateStatus, "blocked_disabled_by_default");
  assert.equal(state.liveProviderExecution, false);
  assert.equal(state.disabledByDefault, true);
  assert.equal(state.manualOnly, true);
  assert.equal(state.failClosed, true);
  assert.equal(state.providerEvidenceOnly, true);
  assert.equal(state.requiresExplicitAcceptance, true);
  assert.equal(state.providerOutputIsCoreTruth, false);
  assert.equal(state.acceptedStructuredGeometryOnlyCoreInput, true);
  assert.equal(state.pr116Harness.liveProviderExecution, false);
  assert.equal(state.pr116Harness.disabledByDefault, true);
});

test("PR117 default command does not read live env secrets or call injected transport", async () => {
  let transportCalls = 0;
  const { stdout, exitCode } = await runCli([], {
    env: {
      NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT: "1",
      NORMA_LIVE_PROVIDER: "openai-responses-vision",
      NORMA_LIVE_PROVIDER_MODEL: "gpt-fake",
      NORMA_LIVE_PROVIDER_API_KEY: "FAKE_SECRET_VALUE_SHOULD_NOT_PRINT",
    },
    transport: async () => {
      transportCalls += 1;
      throw new Error("transport should not be called");
    },
  });
  const parsed = JSON.parse(stdout);

  assert.equal(exitCode, 0);
  assert.equal(transportCalls, 0);
  assert.equal(parsed.liveProviderExecution, false);
  assert.equal(parsed.disabledByDefault, true);
  assertNoForbiddenOutputValue(parsed);
  assert.doesNotMatch(stdout, /FAKE_SECRET_VALUE_SHOULD_NOT_PRINT|Bearer/u);
});

test("PR117 default command emits safe structured JSON from the real command entrypoint", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [commandPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NORMA_LIVE_PROVIDER_API_KEY: "FAKE_ENTRYPOINT_SECRET",
    },
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
  assertNoForbiddenOutputValue(parsed);
  assert.doesNotMatch(stdout, /FAKE_ENTRYPOINT_SECRET|Bearer/u);
});

test("PR117 explicit live mode fails closed when opt-in env is missing", async () => {
  const result = await runLiveMissingGate({ env: completeEnv({ NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT: undefined }) });

  assert.equal(result.parsed.gateStatus, "blocked_missing_env_opt_in");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode fails closed for CI marker variants before network", async () => {
  for (const env of [
    completeEnv({ CI: "1" }),
    completeEnv({ CI: "true" }),
    completeEnv({ CI: undefined, GITHUB_ACTIONS: "true" }),
    completeEnv({ CI: undefined, GITLAB_CI: "1" }),
  ]) {
    const result = await runLiveMissingGate({
      args: ["--live", "--input-image", "unused.png", "--output", "unused"],
      env,
    });

    assert.equal(result.parsed.gateStatus, "blocked_ci_live_network_dependency");
    assert.equal(result.transportCalls, 0);
  }
});

test("PR117 explicit live mode fails closed when provider selection is missing", async () => {
  const result = await runLiveMissingGate({ env: completeEnv({ NORMA_LIVE_PROVIDER: undefined }) });

  assert.equal(result.parsed.gateStatus, "blocked_missing_provider_selection");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode fails closed when model env is missing", async () => {
  const result = await runLiveMissingGate({ env: completeEnv({ NORMA_LIVE_PROVIDER_MODEL: undefined }) });

  assert.equal(result.parsed.gateStatus, "blocked_missing_provider_model");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode fails closed when API key presence is missing", async () => {
  const result = await runLiveMissingGate({ env: completeEnv({ NORMA_LIVE_PROVIDER_API_KEY: undefined }) });

  assert.equal(result.parsed.gateStatus, "blocked_missing_provider_api_key");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode fails closed when input image path is missing", async () => {
  const result = await runLiveMissingGate({ args: ["--live", "--output", "unused"], env: completeEnv() });

  assert.equal(result.parsed.gateStatus, "blocked_missing_input_image_path");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode rejects remote and file URL image input before network", async () => {
  for (const input of ["https://example.invalid/image.png", "file:///tmp/image.png"]) {
    const result = await runLiveMissingGate({
      args: ["--live", "--input-image", input, "--output", "unused"],
      env: completeEnv(),
    });

    assert.equal(result.parsed.gateStatus, "blocked_remote_or_file_url_input");
    assert.equal(result.transportCalls, 0);
  }
});

test("PR117 explicit live mode fails closed before network when image file is missing", async () => {
  const result = await runLiveMissingGate({
    args: ["--live", "--input-image", "/tmp/norma-core-missing-pr117-image.png", "--output", "unused"],
    env: completeEnv(),
  });

  assert.equal(result.parsed.gateStatus, "blocked_input_image_not_found");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode fails closed on oversized input before reading bytes", async () => {
  let readCalls = 0;
  const result = await runLiveMissingGate({
    args: ["--live", "--input-image", "large.png", "--output", "unused"],
    env: completeEnv(),
    options: {
      stat: async () => ({
        isFile: () => true,
        size: CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES + 1,
      }),
      readFile: async () => {
        readCalls += 1;
        throw new Error("readFile should not be called for oversized input");
      },
    },
  });

  assert.equal(result.parsed.gateStatus, "blocked_input_image_too_large");
  assert.equal(result.transportCalls, 0);
  assert.equal(readCalls, 0);
});

test("PR117 image validation allows only supported local PNG JPEG and WEBP magic bytes", () => {
  const bytes = pngBytes();
  const png = detectControlledLiveProviderSmokeImageV1("source.png", bytes);
  const jpeg = detectControlledLiveProviderSmokeImageV1("source.jpg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00]));
  const webp = detectControlledLiveProviderSmokeImageV1(
    "source.webp",
    Uint8Array.from([...asciiBytes("RIFF"), 0x00, 0x00, 0x00, 0x00, ...asciiBytes("WEBP")]),
  );

  assert.equal(png?.mediaType, "image/png");
  assert.equal(png?.contentIdentity, `sha256:${createHash("sha256").update(bytes).digest("hex")}`);
  assert.equal(jpeg?.mediaType, "image/jpeg");
  assert.equal(webp?.mediaType, "image/webp");
  assert.equal(detectControlledLiveProviderSmokeImageV1("source.gif", asciiBytes("GIF89a")), null);
  assert.equal(detectControlledLiveProviderSmokeImageV1("source.png", asciiBytes("not-png")), null);
});

test("PR117 OpenAI Responses request disables provider-side response storage", () => {
  const body = createOpenAIResponsesVisionSmokeRequestBodyV1({
    model: "gpt-fake",
    imageDataUrl: "data:image/png;base64,AAAA",
  });

  assert.equal(body.store, false);
});

test("PR117 gate helper requires writable output proof before ready state", () => {
  const request = {
    liveFlagPresent: true,
    ciEnvironmentPresent: false,
    envOptInValue: "1",
    provider: "openai-responses-vision",
    modelPresent: true,
    apiKeyPresent: true,
    inputImagePathPresent: true,
    inputImagePathIsRemoteOrFileUrl: false,
    inputImageExists: true,
    inputImageSizeBytes: 12,
    inputImageMimeType: "image/png",
    outputDirectoryPresent: true,
    timeoutMs: 30_000,
  };

  assert.equal(
    createControlledLiveProviderSmokeGateStateV1(request).gateStatus,
    "blocked_output_directory_unwritable",
  );
  assert.equal(
    createControlledLiveProviderSmokeGateStateV1({ ...request, outputDirectoryWritable: true }).gateStatus,
    "ready_for_manual_live_transport",
  );
});

test("PR117 fake transport is called only after every live gate is represented", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr117-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    await writeFile(imagePath, pngBytes());
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async (request) => {
        assert.equal(request.url, "https://api.openai.com/v1/responses");
        assert.equal(request.timeoutMs, 30_000);
        assert.equal(request.headers.Authorization, "Bearer FAKE_SECRET_VALUE_DO_NOT_PRINT");
        assert.equal(JSON.parse(request.body).store, false);
        assert.match(request.body, /"type":"input_image"/u);
        assert.match(request.body, /data:image\/png;base64/u);
        return {
          ok: true,
          statusCode: 200,
          body: {
            status: "completed",
            output: [{ content: [{ type: "output_text", text: "FAKE_PROVIDER_RAW_TEXT" }] }],
            confidence: 0.99,
            token: "FAKE_PROVIDER_TOKEN",
          },
        };
      },
    });
    const parsed = JSON.parse(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(parsed.liveProviderExecution, true);
    assert.equal(parsed.providerEvidenceOnly, true);
    assert.equal(parsed.rawProviderOutputPersisted, false);
    assert.deepEqual(parsed.artifacts, [
      "provider-evidence-envelope.json",
      "summary.json",
      "summary.md",
    ]);
    await assertSafeArtifacts(outputDir, imagePath);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR117 output directory is proven writable before live transport", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr117-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputPath = join(tmp, "not-a-directory");
    await writeFile(imagePath, pngBytes());
    await writeFile(outputPath, "existing-file", "utf8");
    const result = await runLiveMissingGate({
      args: ["--live", "--input-image", imagePath, "--output", outputPath],
      env: completeEnv(),
    });

    assert.equal(result.parsed.gateStatus, "blocked_output_directory_unwritable");
    assert.equal(result.transportCalls, 0);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR117 fake transport provider response is reduced to provider-neutral redacted evidence only", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr117-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    await writeFile(imagePath, pngBytes());
    await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async () => ({
        ok: true,
        statusCode: 200,
        body: {
          acceptedStructuredGeometry: { unsafe: true },
          coreInput: true,
          score: 1,
          valueMetadata: "unsafe",
          output: "FAKE_PROVIDER_RAW_TEXT",
        },
      }),
    });
    const envelope = JSON.parse(await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8"));

    assert.equal(envelope.kind, "norma.controlled-live-provider-smoke.provider-evidence-envelope.v1");
    assert.equal(envelope.liveProviderExecution, true);
    assert.equal(envelope.providerEvidenceOnly, true);
    assert.equal(envelope.requiresExplicitAcceptance, true);
    assert.equal(envelope.providerOutputIsCoreTruth, false);
    assert.equal(envelope.acceptedStructuredGeometryOnlyCoreInput, true);
    assert.equal(envelope.acceptedStructuredGeometryProduced, false);
    assert.equal(envelope.coreInputProduced, false);
    assert.equal(envelope.resultJsonProduced, false);
    assert.equal(envelope.providerSelfAcceptance, false);
    assert.equal(envelope.confidenceScoreValueCanAuthorizeAcceptance, false);
    assert.equal(envelope.promptArtifactOrMetricPolicyCanAuthorizeAcceptance, false);
    assert.equal(envelope.rawProviderOutputPersisted, false);
    assert.equal(envelope.redacted, true);
    assert.equal(validateAcceptedGeometryV1(envelope).ok, false);
    assert.equal(analyzeStructuredCompositionV1(envelope).status, "invalid");
    assertNoForbiddenOutputValue(envelope);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR117 command and helper sources avoid forbidden SDK public API env-file and Core widening surfaces", async () => {
  const helperSource = await readFile(helperSourcePath, "utf8");
  const commandSource = await readFile(commandSourcePath, "utf8");
  const combined = `${helperSource}\n${commandSource}`;
  const importStatements = combined
    .split("\n")
    .filter((line) => line.trim().startsWith("import "))
    .join("\n");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const indexSource = await readFile(indexSourcePath, "utf8");

  assert.doesNotMatch(
    importStatements,
    /openai|provider-sdk|@openai|mcp|chatgpt|cad|figma|server|upload|oauth|from "\.\.\/dist\/src\/index\.js"|from "\.\/index|from "@norma\/core"/iu,
  );
  assert.doesNotMatch(
    combined,
    /dotenv|["']\.env["']|readFile\([^)]*\.env|writeFile\([^)]*\.env|node:http|node:https|XMLHttpRequest|WebSocket|acceptedStructuredGeometry\s*:\s*\{/iu,
  );
  assert.doesNotMatch(indexSource, /controlled-live-provider-smoke/u);
  assert.deepEqual(packageJson.exports, {
    ".": {
      types: "./dist/src/index.d.ts",
      default: "./dist/src/index.js",
    },
  });
  assert.equal("bin" in packageJson, false);
  assert.equal("dependencies" in packageJson, false);
  assert.equal("publishConfig" in packageJson, false);
});

test("PR117 docs state manual live smoke boundary without approving provider truth or production integration", async () => {
  const doc = await readFile(decisionPath, "utf8");
  const roadmap = await readFile(roadmapPath, "utf8");

  assertDocMentions(doc, [
    "PR117 adds a controlled manual live-provider smoke behind the PR116 disabled harness",
    "Default command remains safe and does not call network",
    "Live execution requires explicit opt-in and local operator credentials",
    "Live execution must not run in CI",
    "no recognized non-empty CI marker",
    "a writable `--output <dir>`",
    "No secrets may be committed",
    "No `.env` files may be committed or mutated",
    "Raw provider output is ephemeral and not persisted",
    "disable provider-side response storage",
    "Redacted provider-neutral evidence output is the only allowed persisted result",
    "Provider output remains evidence only",
    "Accepted structured geometry remains the only Core input",
    "PR117 does not implement production OpenAI integration",
    "PR117 does not approve provider output as truth",
  ]);
  assertDocMentions(roadmap, [
    "PR117: add controlled live provider smoke behind disabled harness",
    "No CI live-network behavior is approved",
    "Provider evidence remains non-truth",
  ]);
});

test("PR117 exact changed-file guard accepts only the controlled smoke file set", () => {
  assert.deepEqual(
    sharedExactApprovedChangedFiles(controlledLiveProviderSmokeChangedFiles),
    controlledLiveProviderSmokeChangedFiles,
  );
  assert.deepEqual(controlledLiveProviderSmokeChangedFiles, [
    "bin/norma-core-controlled-live-provider-smoke.mjs",
    "docs/BUSINESS_READINESS_ROADMAP.md",
    "docs/decisions/2026-07-08-controlled-live-provider-smoke.md",
    "src/local-report/controlled-live-provider-smoke.ts",
    "tests/changed-file-guard.mjs",
    "tests/changed-file-guard.test.mjs",
    "tests/controlled-live-provider-smoke.test.mjs",
    "tests/synthetic-external-evidence-acceptance-proof.test.mjs",
  ]);
});

test("PR117 changed-file guard rejects forbidden extras and preserves PR111 PR114 PR116 files", () => {
  for (const forbiddenFile of [
    "src/index.ts",
    "src/provider-evidence-replay-adapter.ts",
    "src/local-report/synthetic-external-evidence-acceptance-proof.ts",
    "src/providers/openai.ts",
    "src/providers/vision.ts",
    "src/providers/image.ts",
    "src/adapters/cad.ts",
    "src/adapters/figma.ts",
    "src/mcp/stdio-protocol.ts",
    "src/chatgpt/connector.ts",
    "src/server/upload.ts",
    "src/auth/oauth.ts",
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
  ]) {
    assert.equal(
      sharedExactApprovedChangedFiles([...controlledLiveProviderSmokeChangedFiles, forbiddenFile]),
      null,
      forbiddenFile,
    );
  }
  assert.notDeepEqual(controlledLiveProviderSmokeChangedFiles, providerEvidenceReplayAdapterChangedFiles);
  assert.notDeepEqual(controlledLiveProviderSmokeChangedFiles, disabledLiveProviderExperimentHarnessChangedFiles);
});

test("PR117 package files lockfiles package root exports scripts and metadata remain unchanged", async () => {
  const changedFiles = await gitDiffNames();

  assert.deepEqual(changedFiles, controlledLiveProviderSmokeChangedFiles);
  for (const forbidden of [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "src/index.ts",
    ".github/",
    "tests/fixtures/",
    "examples/",
    "viewer/",
  ]) {
    assert.equal(changedFiles.some((file) => file.startsWith(forbidden) || file === forbidden), false, forbidden);
  }
});

function completeEnv(overrides = {}) {
  return {
    NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT: "1",
    NORMA_LIVE_PROVIDER: "openai-responses-vision",
    NORMA_LIVE_PROVIDER_MODEL: "gpt-fake",
    NORMA_LIVE_PROVIDER_API_KEY: "FAKE_SECRET_VALUE_DO_NOT_PRINT",
    CI: "false",
    ...overrides,
  };
}

async function runLiveMissingGate({ args = ["--live"], env, options = {} }) {
  let transportCalls = 0;
  const result = await runCli(args, {
    ...options,
    env,
    transport: async () => {
      transportCalls += 1;
      throw new Error("transport should not be called");
    },
  });

  return {
    ...result,
    parsed: JSON.parse(result.stdout),
    transportCalls,
  };
}

async function runCli(args, options = {}) {
  let stdout = "";
  let stderr = "";
  const exitCode = await runControlledLiveProviderSmokeCli({
    args,
    stdout: { write: (value) => { stdout += value; } },
    stderr: { write: (value) => { stderr += value; } },
    options,
  });

  return { exitCode, stdout, stderr };
}

async function assertSafeArtifacts(outputDir, imagePath) {
  const artifactTexts = await Promise.all([
    readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8"),
    readFile(join(outputDir, "summary.json"), "utf8"),
    readFile(join(outputDir, "summary.md"), "utf8"),
  ]);

  for (const text of artifactTexts) {
    assert.doesNotMatch(text, new RegExp(escapeRegExp(imagePath), "u"));
    assert.doesNotMatch(text, /FAKE_SECRET_VALUE_DO_NOT_PRINT|FAKE_PROVIDER_RAW_TEXT|FAKE_PROVIDER_TOKEN|Bearer|data:image|;base64,|\/Users\/|\/Volumes\//u);
    assert.doesNotMatch(text, /acceptedStructuredGeometry"\s*:/u);
  }
}

async function gitDiffNames() {
  return branchChangedFiles(repoRoot);
}

function pngBytes() {
  return Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
}

function asciiBytes(value) {
  return Uint8Array.from([...value].map((char) => char.charCodeAt(0)));
}

function assertNoForbiddenOutputValue(value) {
  const serialized = JSON.stringify(value);
  assert.doesNotMatch(serialized, /https?:\/\/|file:|data:image|;base64,|Bearer\s+|\/Users\/|\/Volumes\//u);
  assert.equal(hasKey(value, "acceptedStructuredGeometry"), false);
  assert.equal(hasKey(value, "acceptedGeometry"), false);
  assert.equal(hasKey(value, "resultJson"), false);
  assert.equal(hasKey(value, "providerPayload"), false);
  assert.equal(hasKey(value, "cookie"), false);
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

function assertDocMentions(doc, snippets) {
  for (const snippet of snippets) {
    assert.match(
      doc,
      new RegExp(escapeRegExp(snippet).replace(/\s+/g, "\\s+"), "iu"),
      snippet,
    );
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
