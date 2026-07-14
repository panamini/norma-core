import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir as mkdirp, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { validateAcceptedGeometryV1 } from "../dist/src/geometry-observation.js";
import { analyzeStructuredCompositionV1 } from "../dist/src/structured-composition-analysis.js";
import {
  CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS,
  CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_ERROR_CLASSES,
  CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES,
  createControlledLiveProviderEvidenceEnvelopeV1,
  createControlledLiveProviderSmokeDefaultStateV1,
  createControlledLiveProviderSmokeGateStateV1,
  createControlledLiveProviderSmokeProviderDiagnosticNextActionV1,
  createControlledLiveProviderSmokeSummaryMarkdownV1,
  createControlledLiveProviderSmokeSummaryV1,
  createOpenAIResponsesVisionSmokeRequestBodyV1,
  detectControlledLiveProviderSmokeImageV1,
  isRemoteOrFileUrlInput,
} from "../dist/src/local-report/controlled-live-provider-smoke.js";
import { runControlledLiveProviderSmokeCli } from "../bin/norma-core-controlled-live-provider-smoke.mjs";
import {
  finalizeLocalVisualHumanCandidateSelectionIdentityV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-demo.js";
import {
  branchChangedFiles,
  cleanMainValidationAndPr129OperatorProofChangedFiles,
  controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
  controlledProviderObservationAcceptanceProofChangedFiles,
  controlledProviderObservationContractChangedFiles,
  controlledProviderObservationToCoreHandoffChangedFiles,
  explicitAcceptedObservationToCoreHandoffChangedFiles,
  controlledLiveProviderDiagnosticNextActionsChangedFiles,
  controlledLiveProviderIncompleteResponseGuardChangedFiles,
  controlledLiveProviderSmokeArtifactProofChangedFiles,
  controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
  controlledLiveProviderSmokeChangedFiles,
  disabledLiveProviderExperimentHarnessChangedFiles,
  localVisualCandidateReviewProductSurfaceChangedFiles,
  localVisualObservationToCorePilotContractChangedFiles,
  isCleanBaseValidationContext,
  isExactChangedFileSet,
  localVisualCandidateReviewChangedFiles,
  privateDevChatGptMcpCompleteLiveProofChangedFiles,
  personalChatGptVisualHarmonyDemoChangedFiles,
  personalVisualHarmonyImageHydrationChangedFiles,
  personalVisualHarmonyPixelRefinementShadowChangedFiles,
  privateDevChatGptMcpVisualPilotGateChangedFiles,
  privateDevLocalVisualMcpOrchestrationChangedFiles,
  permanentRemoteMcpQuotaIsolationHotfixChangedFiles,
  permanentRemoteMcpRuntimeChangedFiles,
  remoteMcpRenderPrivateBetaDeploymentChangedFiles,
  pr132ValidationHardeningCheckpointChangedFiles,
  providerEvidenceReplayAdapterChangedFiles,
  sharedExactApprovedChangedFiles,
  statelessRemoteMcpCommercialBetaContractChangedFiles,
} from "./changed-file-guard.mjs";
import { assertCurrentRemoteMcpPackageBoundary } from "./current-remote-mcp-boundary.mjs";

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
  assert.equal("providerDiagnosticNextAction" in parsed, false);
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
  assert.equal("providerDiagnosticNextAction" in parsed, false);
  assertNoForbiddenOutputValue(parsed);
  assert.doesNotMatch(stdout, /FAKE_ENTRYPOINT_SECRET|Bearer/u);
});

test("PR117 default command remains runnable without prebuilt dist helpers", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr117-no-dist-"));

  try {
    const isolatedCommandPath = join(tmp, "norma-core-controlled-live-provider-smoke.mjs");
    await writeFile(isolatedCommandPath, await readFile(commandPath, "utf8"), "utf8");
    const { stdout, stderr } = await execFileAsync(process.execPath, [isolatedCommandPath], {
      cwd: tmp,
      env: {
        ...process.env,
        NORMA_LIVE_PROVIDER_API_KEY: "FAKE_NO_DIST_SECRET",
      },
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    const parsed = JSON.parse(stdout);

    assert.equal(stderr, "");
    assert.equal(parsed.gateStatus, "blocked_disabled_by_default");
    assert.equal(parsed.liveProviderExecution, false);
    assert.equal(parsed.failClosed, true);
    assert.equal("providerDiagnosticNextAction" in parsed, false);
    assertNoForbiddenOutputValue(parsed);
    assert.doesNotMatch(stdout, /FAKE_NO_DIST_SECRET|Bearer/u);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
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
    completeEnv({ CI: undefined, CODEBUILD_BUILD_ID: "norma-core:build-1" }),
    completeEnv({ CI: undefined, CODEBUILD_BUILD_ARN: "arn:aws:codebuild:example" }),
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

test("PR117 explicit live mode fails closed when model env is whitespace only", async () => {
  const result = await runLiveMissingGate({ env: completeEnv({ NORMA_LIVE_PROVIDER_MODEL: "   \t  " }) });

  assert.equal(result.parsed.gateStatus, "blocked_missing_provider_model");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode fails closed when API key presence is missing", async () => {
  const result = await runLiveMissingGate({ env: completeEnv({ NORMA_LIVE_PROVIDER_API_KEY: undefined }) });

  assert.equal(result.parsed.gateStatus, "blocked_missing_provider_api_key");
  assert.equal(result.transportCalls, 0);
});

test("PR117 explicit live mode fails closed when API key env is whitespace only", async () => {
  const result = await runLiveMissingGate({ env: completeEnv({ NORMA_LIVE_PROVIDER_API_KEY: "   \t  " }) });

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

test("PR117 input URL check preserves Windows drive-letter paths as local paths", async () => {
  assert.equal(isRemoteOrFileUrlInput("C:\\tmp\\source.png"), false);
  assert.equal(isRemoteOrFileUrlInput("d:/tmp/source.png"), false);
  assert.equal(isRemoteOrFileUrlInput("https://example.invalid/source.png"), true);
  assert.equal(isRemoteOrFileUrlInput("file:///tmp/source.png"), true);

  const result = await runLiveMissingGate({
    args: ["--live", "--input-image", "C:\\tmp\\source.png", "--output", "unused"],
    env: completeEnv(),
  });

  assert.equal(result.parsed.gateStatus, "blocked_input_image_not_found");
  assert.equal(result.transportCalls, 0);
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

test("PR118 OpenAI Responses request disables provider-side storage and uses only minimal image receipt text", () => {
  const body = createOpenAIResponsesVisionSmokeRequestBodyV1({
    model: "gpt-fake",
    imageDataUrl: "data:image/png;base64,AAAA",
  });
  const serialized = JSON.stringify(body);
  const input = body.input?.[0];
  const content = input?.content;

  assert.deepEqual(body, {
    model: "gpt-fake",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Confirm that an image was received.",
          },
          {
            type: "input_image",
            image_url: "data:image/png;base64,AAAA",
            detail: "low",
          },
        ],
      },
    ],
    reasoning: {
      effort: "low",
    },
    max_output_tokens: 80,
    store: false,
  });
  assert.deepEqual(body.reasoning, { effort: "low" });
  assert.equal(body.store, false);
  assert.equal(content?.[0]?.type, "input_text");
  assert.equal(content?.[0]?.text, "Confirm that an image was received.");
  assert.equal(content?.[1]?.type, "input_image");
  assert.equal(content?.[1]?.image_url, "data:image/png;base64,AAAA");
  assert.doesNotMatch(serialized, /geometry|ratio|accept|accepted|structured|core truth|score|recommend|optimi[sz]e|family|correction|beauty/iu);
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

test("PR129 fake transport captures only exact redacted candidate evidence after every live gate", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr117-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    await writeFile(imagePath, pngBytes());
    await mkdirp(outputDir);
    await writeFile(join(outputDir, ".norma-core-controlled-live-provider-smoke-write-test"), "do not overwrite", "utf8");
    const rawProviderResponseBytes = new TextEncoder().encode(providerCandidateResponseText([
      { x: 0.1, y: 0.2, width: 0.3, height: 0.4, providerConfidence: 0.99 },
    ], { token: "FAKE_PROVIDER_TOKEN", model: "gpt-fake" }));
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv({
        NORMA_LIVE_PROVIDER_MODEL: "  gpt-fake  ",
        NORMA_LIVE_PROVIDER_API_KEY: "  FAKE_SECRET_VALUE_DO_NOT_PRINT  ",
      }),
      transport: async (request) => {
        assert.equal(request.url, "https://api.openai.com/v1/responses");
        assert.equal(request.timeoutMs, 30_000);
        assert.equal(request.headers.Authorization, "Bearer FAKE_SECRET_VALUE_DO_NOT_PRINT");
        assert.equal(JSON.parse(request.body).model, "gpt-fake");
        assert.equal(JSON.parse(request.body).store, false);
        assert.match(request.body, /"type":"input_text"/u);
        assert.equal(JSON.parse(request.body).text.format.type, "json_schema");
        assert.equal(JSON.parse(request.body).text.format.strict, true);
        assert.match(request.body, /"type":"input_image"/u);
        assert.match(request.body, /data:image\/png;base64/u);
        assert.doesNotMatch(request.body, /ratio|accept|accepted|core truth|score|recommend|optimi[sz]e|family|correction|beauty/iu);
        return {
          ok: true,
          statusCode: 200,
          rawResponseBytes: rawProviderResponseBytes,
        };
      },
    });
    const parsed = JSON.parse(result.stdout);
    const receiptText = await readFile(join(outputDir, "provider-execution-receipt.json"), "utf8");
    const candidateText = await readFile(join(outputDir, "candidate-observation.json"), "utf8");
    const receipt = JSON.parse(receiptText);
    const candidate = JSON.parse(candidateText);

    assert.equal(result.exitCode, 0);
    assert.equal(parsed.status, "selection_required");
    assert.equal(parsed.liveProviderExecution, true);
    assert.equal(parsed.providerEvidenceOnly, true);
    assert.equal(parsed.rawProviderResponsePersisted, false);
    assert.equal(parsed.acceptedGeometryProduced, false);
    assert.equal(parsed.coreInputProduced, false);
    assert.equal(parsed.resultJsonProduced, false);
    assert.equal("providerDiagnosticNextAction" in parsed, false);
    assert.equal(receipt.contractId, "norma.local-visual-provider-execution-receipt@1");
    assert.equal(
      receipt.providerResponseContentIdentity,
      `sha256:${createHash("sha256").update(rawProviderResponseBytes).digest("hex")}`,
    );
    assert.equal(candidate.contractId, "norma.local-visual-candidate-observation@1");
    assert.equal(candidate.rectangleCandidates[0].diagnosticMetadata.providerConfidence, 0.99);
    assert.deepEqual(parsed.artifacts, [
      "provider-execution-receipt.json",
      "candidate-observation.json",
    ]);
    for (const text of [receiptText, candidateText]) {
      assert.doesNotMatch(text, /FAKE_PROVIDER_TOKEN|gpt-fake|data:image|Bearer|output_text|message|annotations/u);
    }
    assert.equal(
      await readFile(join(outputDir, ".norma-core-controlled-live-provider-smoke-write-test"), "utf8"),
      "do not overwrite",
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR129 candidate capture fails closed without exact provider response bytes", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr129-exact-bytes-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    await writeFile(imagePath, pngBytes());
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async () => ({
        ok: true,
        statusCode: 200,
        rawResponseText: providerCandidateResponseText([
          { x: 0.1, y: 0.2, width: 0.3, height: 0.4, providerConfidence: null },
        ]),
      }),
    });
    const parsed = JSON.parse(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(parsed.status, "provider_schema_error");
    assert.equal(parsed.errorCode, "MissingExactProviderResponseBytes");
    assert.equal(parsed.artifactsPersisted, false);
    assert.equal(parsed.acceptedGeometryProduced, false);
    assert.equal(parsed.coreInputProduced, false);
    assert.equal(parsed.resultJsonProduced, false);
    await assert.rejects(() => readFile(join(outputDir, "provider-execution-receipt.json")));
    await assert.rejects(() => readFile(join(outputDir, "candidate-observation.json")));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR129 no-network resume requires an independent exact human selection and writes canonical result atomically", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr129-resume-"));

  try {
    const imagePath = join(tmp, "source.png");
    const captureDir = join(tmp, "capture");
    const selectionPath = join(tmp, "selection.json");
    const resultDir = join(tmp, "result");
    await writeFile(imagePath, pngBytes());
    const captureResult = await runCli(
      ["--live", "--input-image", imagePath, "--output", captureDir],
      {
        env: completeEnv(),
        transport: async () => ({
          ok: true,
          statusCode: 200,
          rawResponseBytes: providerCandidateResponseBytes([
            { x: 0.1, y: 0.2, width: 0.3, height: 0.4, providerConfidence: 0.8 },
            { x: 0.55, y: 0.15, width: 0.2, height: 0.25, providerConfidence: null },
          ]),
        }),
      },
    );
    assert.equal(captureResult.exitCode, 0);
    const candidate = JSON.parse(await readFile(join(captureDir, "candidate-observation.json"), "utf8"));
    const selection = createHumanSelection(candidate, [0, 1]);
    await writeFile(selectionPath, `${JSON.stringify(selection)}\n`, "utf8");
    let transportCalls = 0;
    const resumeResult = await runCli([
      "--resume",
      "--capture", captureDir,
      "--selection", selectionPath,
      "--accepted-at", "2026-07-10T12:34:56.000Z",
      "--output", resultDir,
    ], {
      env: {},
      transport: async () => {
        transportCalls += 1;
        throw new Error("resume must not use transport");
      },
    });
    const parsed = JSON.parse(resumeResult.stdout);
    const resultJson = await readFile(join(resultDir, "result.json"), "utf8");

    assert.equal(resumeResult.exitCode, 0);
    assert.equal(transportCalls, 0);
    assert.equal(parsed.status, "completed");
    assert.equal(parsed.networkTransportUsed, false);
    assert.equal(parsed.explicitHumanSelectionValidated, true);
    assert.equal(parsed.providerMetadataInfluencedComputation, false);
    assert.equal(resultJson.endsWith("\n"), true);
    assert.equal(
      parsed.canonicalResultJsonContentIdentity,
      `sha256:${createHash("sha256").update(resultJson).digest("hex")}`,
    );
    assert.equal("acceptedStructuredGeometryOnlyCoreInput" in parsed, false);
    for (const name of [
      "canonical-result-proof.json",
      "derived-artifacts.json",
      "local-result-evidence.json",
      "report.html",
      "summary.json",
      "summary.md",
      "visual.svg",
    ]) {
      assert.equal((await stat(join(resultDir, name))).isFile(), true, name);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR129 resume write failures publish no partial authority Core or result artifacts", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr129-resume-write-"));

  try {
    const imagePath = join(tmp, "source.png");
    const captureDir = join(tmp, "capture");
    const selectionPath = join(tmp, "selection.json");
    const resultDir = join(tmp, "result");
    await writeFile(imagePath, pngBytes());
    await runCli(["--live", "--input-image", imagePath, "--output", captureDir], {
      env: completeEnv(),
      transport: async () => ({
        ok: true,
        statusCode: 200,
        rawResponseBytes: providerCandidateResponseBytes([
          { x: 0.1, y: 0.2, width: 0.3, height: 0.4, providerConfidence: null },
        ]),
      }),
    });
    const candidate = JSON.parse(await readFile(join(captureDir, "candidate-observation.json"), "utf8"));
    await writeFile(selectionPath, `${JSON.stringify(createHumanSelection(candidate, [0]))}\n`, "utf8");
    const resumeResult = await runCli([
      "--resume",
      "--capture", captureDir,
      "--selection", selectionPath,
      "--accepted-at", "2026-07-10T12:34:56.000Z",
      "--output", resultDir,
    ], {
      writeFile: async (filePath, data, options) => {
        if (String(filePath).includes(".staging-") && String(filePath).endsWith("summary.json")) {
          throw new Error("simulated staged write failure");
        }
        return writeFile(filePath, data, options);
      },
    });
    const parsed = JSON.parse(resumeResult.stdout);

    assert.equal(resumeResult.exitCode, 2);
    assert.equal(parsed.status, "artifact_write_error");
    assert.equal(parsed.phase, "candidate_resume");
    assert.equal(parsed.acceptedGeometryProduced, false);
    assert.equal(parsed.coreInputProduced, false);
    assert.equal(parsed.resultJsonProduced, false);
    await assert.rejects(() => stat(resultDir));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR117 artifact write failures after provider completion keep provider status distinct from transport errors", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr117-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    let transportCalls = 0;
    await writeFile(imagePath, pngBytes());
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async () => {
        transportCalls += 1;
        return {
          ok: true,
          statusCode: 200,
          rawResponseBytes: providerCandidateResponseBytes([
            { x: 0.1, y: 0.2, width: 0.3, height: 0.4, providerConfidence: null },
          ]),
        };
      },
      writeFile: async (filePath, data, options) => {
        if (String(filePath).endsWith("provider-execution-receipt.json")) {
          throw new Error("disk full after provider response");
        }

        return writeFile(filePath, data, options);
      },
    });
    const parsed = JSON.parse(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(transportCalls, 1);
    assert.equal(parsed.status, "artifact_write_error");
    assert.equal(parsed.phase, "candidate_capture");
    assert.equal(parsed.providerResponseStatusCode, 200);
    assert.equal(parsed.providerOutputObserved, true);
    assert.equal(parsed.acceptedGeometryProduced, false);
    assert.equal(parsed.coreInputProduced, false);
    assert.equal(parsed.resultJsonProduced, false);
    assert.equal(parsed.artifactsPersisted, false);
    assert.equal(parsed.liveProviderExecution, true);
    assertNoForbiddenOutputValue(parsed);
    assert.doesNotMatch(result.stdout, /transport_error|disk full|FAKE_SECRET_VALUE_DO_NOT_PRINT|Bearer/u);
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

test("PR117 non-JSON provider bodies are observed without persisting raw text", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr117-"));
  const previousFetch = globalThis.fetch;

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    await writeFile(imagePath, pngBytes());
    globalThis.fetch = async () => ({
      ok: false,
      status: 502,
      arrayBuffer: async () => new TextEncoder().encode("Bad Gateway from proxy").buffer,
    });

    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
    });
    const parsed = JSON.parse(result.stdout);
    const envelope = JSON.parse(await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8"));

    assert.equal(result.exitCode, 2);
    assert.equal(parsed.status, "provider_error");
    assert.equal(parsed.providerErrorClass, "provider_5xx");
    assert.equal(parsed.providerDiagnosticNextAction, "retry_later_or_check_provider_status");
    assert.equal(parsed.providerErrorParamClass, "unknown");
    assert.equal(parsed.providerResponseStatusCode, 502);
    assert.equal(parsed.providerOutputObserved, true);
    assert.equal(parsed.providerDiagnosticRedacted, true);
    assert.equal(envelope.providerCall.responseStatusCode, 502);
    assert.equal(envelope.providerCall.providerOutputObserved, true);
    assert.equal(envelope.providerErrorClass, "provider_5xx");
    assert.equal(envelope.providerDiagnosticNextAction, "retry_later_or_check_provider_status");
    assert.equal(envelope.providerErrorParamClass, "unknown");
    assert.equal(envelope.providerResponseStatusCode, 502);
    assert.equal(envelope.providerOutputObserved, true);
    assert.equal(envelope.providerDiagnosticRedacted, true);
    assert.equal(envelope.evidenceSummary.providerOutputObserved, true);
    assert.equal(envelope.rawProviderOutputPersisted, false);
    await assertSafeArtifacts(outputDir, imagePath);
    assert.doesNotMatch(result.stdout, /Bad Gateway|FAKE_SECRET_VALUE_DO_NOT_PRINT|Bearer/u);
  } finally {
    globalThis.fetch = previousFetch;
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR118 fake HTTP 400 JSON with unsafe raw message persists only redacted diagnostics", async () => {
  const rawMessage = "UNSAFE_RAW_PROVIDER_MESSAGE /Users/pana/private Bearer SECRET_TOKEN_SHOULD_NOT_PRINT";
  const rawParam = "input[0].content[1].image_url";
  const rawDebug = "RAW_PROVIDER_BODY_SHOULD_NOT_PERSIST";
  const result = await runProviderErrorCase({
    statusCode: 400,
    body: {
      error: {
        message: rawMessage,
        type: "invalid_request_error",
        code: "invalid_value",
        param: rawParam,
      },
      debug: rawDebug,
    },
  });

  assert.equal(result.exitCode, 2);
  assert.equal(result.parsed.status, "provider_error");
  assertRedactedDiagnostic(result.parsed, {
    providerErrorClass: "image",
    providerDiagnosticNextAction: "check_image_format_size_or_capability",
    providerErrorCode: "invalid_value",
    providerErrorParamClass: "image",
    providerResponseStatusCode: 400,
    providerOutputObserved: true,
  });
  assertRedactedDiagnostic(result.envelope, {
    providerErrorClass: "image",
    providerDiagnosticNextAction: "check_image_format_size_or_capability",
    providerErrorCode: "invalid_value",
    providerErrorParamClass: "image",
    providerResponseStatusCode: 400,
    providerOutputObserved: true,
  });
  assertRedactedDiagnostic(result.summary, {
    providerErrorClass: "image",
    providerDiagnosticNextAction: "check_image_format_size_or_capability",
    providerErrorCode: "invalid_value",
    providerErrorParamClass: "image",
    providerResponseStatusCode: 400,
    providerOutputObserved: true,
  });
  assert.match(result.summaryMd, /providerErrorClass: image/u);
  assert.match(result.summaryMd, /providerDiagnosticNextAction: check_image_format_size_or_capability/u);
  assert.match(result.summaryMd, /providerDiagnosticRedacted: true/u);
  assert.equal(hasKey(result.envelope, "message"), false);
  assert.equal(hasKey(result.envelope, "param"), false);
  assert.equal(hasKey(result.envelope, "error"), false);
  assertNoRawProviderDiagnosticLeak(result.allText, [rawMessage, rawParam, rawDebug]);
});

test("PR119 observed invalid_value input provider error is an input compatibility diagnostic", async () => {
  const rawMessage = "UNSAFE_RAW_PROVIDER_MESSAGE model input rejected /Users/pana/private";
  const rawDebug = "RAW_PROVIDER_BODY_SHOULD_NOT_PERSIST";
  const result = await runProviderErrorCase({
    statusCode: 400,
    body: {
      error: {
        message: rawMessage,
        type: "invalid_request_error",
        code: "invalid_value",
        param: "input",
      },
      debug: rawDebug,
    },
  });

  assert.equal(result.exitCode, 2);
  assert.equal(result.parsed.status, "provider_error");
  for (const value of [result.parsed, result.envelope, result.summary]) {
    assertRedactedDiagnostic(value, {
      providerErrorClass: "input_compatibility",
      providerDiagnosticNextAction: "check_model_config_or_input_capability",
      providerErrorCode: "invalid_value",
      providerErrorParamClass: "input",
      providerResponseStatusCode: 400,
      providerOutputObserved: true,
    });
  }
  assert.match(result.summaryMd, /providerErrorClass: input_compatibility/u);
  assert.match(result.summaryMd, /providerDiagnosticNextAction: check_model_config_or_input_capability/u);
  assert.match(result.summaryMd, /providerDiagnosticRedacted: true/u);
  assert.equal(hasKey(result.envelope, "message"), false);
  assert.equal(hasKey(result.envelope, "param"), false);
  assert.equal(hasKey(result.envelope, "error"), false);
  assertNoRawProviderDiagnosticLeak(result.allText, [rawMessage, rawDebug]);
});

test("PR119 generic invalid_request input content errors remain request shape diagnostics", async () => {
  const rawMessage = "UNSAFE_RAW_PROVIDER_MESSAGE content schema rejected";
  const rawParam = "input[0].content";
  const result = await runProviderErrorCase({
    statusCode: 400,
    body: {
      error: {
        message: rawMessage,
        type: "invalid_request_error",
        code: "invalid_request_error",
        param: rawParam,
      },
    },
  });

  assert.equal(result.exitCode, 2);
  assert.equal(result.parsed.status, "provider_error");
  for (const value of [result.parsed, result.envelope, result.summary]) {
    assertRedactedDiagnostic(value, {
      providerErrorClass: "request_shape",
      providerDiagnosticNextAction: "inspect_request_shape_contract",
      providerErrorCode: "invalid_request_error",
      providerErrorParamClass: "input",
      providerResponseStatusCode: 400,
      providerOutputObserved: true,
    });
  }
  assert.match(result.summaryMd, /providerErrorClass: request_shape/u);
  assert.match(result.summaryMd, /providerDiagnosticNextAction: inspect_request_shape_contract/u);
  assert.equal(hasKey(result.envelope, "message"), false);
  assert.equal(hasKey(result.envelope, "param"), false);
  assert.equal(hasKey(result.envelope, "error"), false);
  assertNoRawProviderDiagnosticLeak(result.allText, [rawMessage, rawParam]);
});

test("PR118 provider diagnostic classifier maps low-cardinality status code and metadata classes", async () => {
  const cases = [
    {
      statusCode: 401,
      body: { error: { type: "authentication_error", code: "invalid_api_key", param: "Authorization" } },
      expected: { providerErrorClass: "auth", providerErrorCode: "invalid_api_key", providerErrorParamClass: "auth" },
    },
    {
      statusCode: 403,
      body: { error: { type: "permission_denied", code: "permission_denied", param: "auth" } },
      expected: { providerErrorClass: "auth", providerErrorCode: "permission_denied", providerErrorParamClass: "auth" },
    },
    {
      statusCode: 429,
      body: { error: { type: "rate_limit_exceeded", code: "rate_limit_exceeded" } },
      expected: { providerErrorClass: "rate_limit", providerErrorCode: "rate_limit_exceeded", providerErrorParamClass: "unknown" },
    },
    {
      statusCode: 429,
      body: { error: { type: "insufficient_quota", code: "insufficient_quota" } },
      expected: { providerErrorClass: "quota", providerErrorCode: "insufficient_quota", providerErrorParamClass: "unknown" },
    },
    {
      statusCode: 429,
      body: { error: { type: "quota_exceeded", code: "quota_exceeded" } },
      expected: { providerErrorClass: "quota", providerErrorCode: "quota_exceeded", providerErrorParamClass: "unknown" },
    },
    {
      statusCode: 400,
      body: { error: { type: "invalid_request_error", code: "model_not_found", param: "model" } },
      expected: { providerErrorClass: "model", providerErrorCode: "model_not_found", providerErrorParamClass: "model" },
    },
    {
      statusCode: 400,
      body: { error: { type: "invalid_request_error", code: "invalid_image", param: "input[0].content[1].image_url" } },
      expected: { providerErrorClass: "image", providerErrorCode: "invalid_image", providerErrorParamClass: "image" },
    },
    {
      statusCode: 400,
      body: { error: { type: "invalid_request_error", code: "invalid_request_error", param: "input[0].content" } },
      expected: { providerErrorClass: "request_shape", providerErrorCode: "invalid_request_error", providerErrorParamClass: "input" },
    },
    {
      statusCode: 500,
      body: { error: { type: "server_error", code: "server_error" } },
      expected: { providerErrorClass: "provider_5xx", providerErrorCode: "server_error", providerErrorParamClass: "unknown" },
    },
  ];

  for (const { statusCode, body, expected } of cases) {
    const result = await runProviderErrorCase({ statusCode, body });

    assert.equal(result.exitCode, 2);
    assertRedactedDiagnostic(result.parsed, {
      ...expected,
      providerResponseStatusCode: statusCode,
      providerOutputObserved: true,
    });
    assertRedactedDiagnostic(result.envelope, {
      ...expected,
      providerResponseStatusCode: statusCode,
      providerOutputObserved: true,
    });
    assertNoRawProviderDiagnosticLeak(result.allText, [
      JSON.stringify(body),
      "input[0].content[1].image_url",
      "input[0].content",
      "Authorization",
    ]);
  }
});

test("PR120 maps each current redacted provider diagnostic class to one allowlisted next action", () => {
  const expected = {
    auth: "check_provider_auth_configuration",
    quota: "check_provider_quota_or_billing",
    rate_limit: "retry_later_or_reduce_request_rate",
    model: "check_provider_model_selection",
    image: "check_image_format_size_or_capability",
    content_filter: "inspect_redacted_provider_client_error",
    incomplete: "increase_output_token_budget_or_reduce_reasoning",
    provider_response_status: "inspect_redacted_diagnostic_context",
    input_compatibility: "check_model_config_or_input_capability",
    request_shape: "inspect_request_shape_contract",
    provider_4xx: "inspect_redacted_provider_client_error",
    provider_5xx: "retry_later_or_check_provider_status",
    network: "check_local_network_or_provider_reachability",
    artifact_write: "check_local_output_artifact_write",
    unknown: "inspect_redacted_diagnostic_context",
  };
  const allowlist = new Set(Object.values(CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS));

  assert.deepEqual(CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_ERROR_CLASSES, Object.keys(expected));
  assert.deepEqual(CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS, expected);
  assert.equal(
    Object.keys(CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS).length,
    CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_ERROR_CLASSES.length,
  );

  for (const providerErrorClass of CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_ERROR_CLASSES) {
    const nextAction = createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(providerErrorClass);

    assert.equal(nextAction, expected[providerErrorClass]);
    assert.equal(allowlist.has(nextAction), true);
    assert.match(nextAction, /^[a-z0-9_]+$/u);
    assert.doesNotMatch(nextAction, /Bearer|api[_ -]?key|gpt|http|file:|data:image|base64|\/Users\/|\/Volumes\//iu);
  }

  assert.equal(
    createControlledLiveProviderSmokeProviderDiagnosticNextActionV1("future_provider_error_class"),
    "inspect_redacted_diagnostic_context",
  );
  for (const inheritedObjectName of ["toString", "constructor", "__proto__"]) {
    assert.equal(
      createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(inheritedObjectName),
      "inspect_redacted_diagnostic_context",
      inheritedObjectName,
    );
  }
});

test("PR120 advisory next actions appear only on redacted diagnostic provider-error artifacts", async () => {
  const rawMessage = "UNSAFE_RAW_PROVIDER_MESSAGE with hidden request body";
  const rawParam = "input[0].content[1].image_url";
  const rawDebug = "RAW_PROVIDER_BODY_SHOULD_NOT_PERSIST";
  const result = await runProviderErrorCase({
    statusCode: 400,
    body: {
      error: {
        message: rawMessage,
        type: "invalid_request_error",
        code: "invalid_value",
        param: "input",
      },
      rawParam,
      debug: rawDebug,
    },
  });

  assert.equal(result.parsed.status, "provider_error");
  assert.equal(result.envelope.providerCall.responseClass, "provider_error");
  assert.equal(result.envelope.acceptedStructuredGeometryProduced, false);
  assert.equal(result.envelope.coreInputProduced, false);
  assert.equal(result.envelope.resultJsonProduced, false);
  assert.equal(result.envelope.providerOutputIsCoreTruth, false);
  assert.equal(result.envelope.acceptedStructuredGeometryOnlyCoreInput, true);
  for (const value of [result.parsed, result.envelope, result.summary]) {
    assertRedactedDiagnostic(value, {
      providerErrorClass: "input_compatibility",
      providerDiagnosticNextAction: "check_model_config_or_input_capability",
      providerErrorCode: "invalid_value",
      providerErrorParamClass: "input",
      providerResponseStatusCode: 400,
      providerOutputObserved: true,
    });
  }
  assert.match(result.summaryMd, /providerDiagnosticNextAction: check_model_config_or_input_capability/u);
  assertNoRawProviderDiagnosticLeak(result.allText, [rawMessage, rawParam, rawDebug]);
  assert.doesNotMatch(
    result.allText,
    /gpt-fake|Confirm that an image was received|input_image|input_text|image_url|data:image|;base64,|Bearer|FAKE_SECRET_VALUE_DO_NOT_PRINT/u,
  );
});

test("PR120 next actions stay absent when no redacted provider diagnostic exists", () => {
  const image = {
    contentIdentity: "sha256:0123456789abcdef",
    mediaType: "image/png",
    sizeBytes: 12,
    sourcePathPersisted: false,
    rawImagePersisted: false,
    base64Persisted: false,
  };
  const successEnvelope = createControlledLiveProviderEvidenceEnvelopeV1({
    image,
    responseStatusCode: 200,
    responseOk: true,
    providerOutputObserved: true,
    timeoutMs: 30_000,
  });
  const providerErrorWithoutRedactedDiagnostic = {
    ...createControlledLiveProviderEvidenceEnvelopeV1({
      image,
      responseStatusCode: 400,
      responseOk: false,
      providerOutputObserved: true,
      timeoutMs: 30_000,
    }),
    providerErrorClass: "request_shape",
  };

  for (const envelope of [successEnvelope, providerErrorWithoutRedactedDiagnostic]) {
    const summary = createControlledLiveProviderSmokeSummaryV1(envelope);
    const markdown = createControlledLiveProviderSmokeSummaryMarkdownV1(summary);

    assert.equal("providerDiagnosticNextAction" in envelope, false);
    assert.equal("providerDiagnosticNextAction" in summary, false);
    assert.doesNotMatch(markdown, /providerDiagnosticNextAction/u);
  }
});

test("PR122 HTTP-success incomplete Responses bodies fail closed as redacted provider errors", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr122-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    const rawOutput = "RAW_INCOMPLETE_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST";
    const body = {
      status: "incomplete",
      incomplete_details: {
        reason: "max_output_tokens",
      },
      output_text: rawOutput,
    };

    await writeFile(imagePath, pngBytes());
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async () => ({
        ok: true,
        statusCode: 200,
        body,
      }),
    });
    const envelopeText = await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8");
    const summaryText = await readFile(join(outputDir, "summary.json"), "utf8");
    const summaryMd = await readFile(join(outputDir, "summary.md"), "utf8");
    const parsed = JSON.parse(result.stdout);
    const envelope = JSON.parse(envelopeText);
    const summary = JSON.parse(summaryText);
    const expected = {
      providerErrorClass: "incomplete",
      providerDiagnosticNextAction: "increase_output_token_budget_or_reduce_reasoning",
      providerErrorCode: "max_output_tokens",
      providerErrorParamClass: "input",
      providerResponseStatusCode: 200,
      providerOutputObserved: true,
    };

    assert.equal(result.exitCode, 2);
    assert.equal(parsed.status, "provider_error");
    assert.equal(envelope.providerCall.responseClass, "provider_error");
    assert.equal(envelope.evidenceSummary.persistedObservationClass, "redacted_provider_error_observed");
    for (const value of [parsed, envelope, summary]) {
      assertRedactedDiagnostic(value, expected);
    }
    assert.match(summaryMd, /providerErrorClass: incomplete/u);
    assert.match(summaryMd, /providerDiagnosticNextAction: increase_output_token_budget_or_reduce_reasoning/u);
    await assertSafeArtifacts(outputDir, imagePath);
    assertNoRawProviderDiagnosticLeak(`${result.stdout}\n${envelopeText}\n${summaryText}\n${summaryMd}`, [
      JSON.stringify(body),
      rawOutput,
      "incomplete_details",
    ]);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("HTTP-success non-completed Responses statuses fail closed without success artifacts", async () => {
  for (const responseStatus of ["failed", "cancelled", "queued", "in_progress"]) {
    const tmp = await mkdtemp(join(tmpdir(), "norma-core-response-status-"));

    try {
      const imagePath = join(tmp, "source.png");
      const outputDir = join(tmp, "out");
      const rawOutput = `RAW_${responseStatus.toUpperCase()}_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST`;
      const body = {
        status: responseStatus,
        output_text: rawOutput,
      };

      await writeFile(imagePath, pngBytes());
      const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
        env: completeEnv(),
        transport: async () => ({
          ok: true,
          statusCode: 200,
          body,
        }),
      });
      const envelopeText = await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8");
      const summaryText = await readFile(join(outputDir, "summary.json"), "utf8");
      const summaryMd = await readFile(join(outputDir, "summary.md"), "utf8");
      const parsed = JSON.parse(result.stdout);
      const envelope = JSON.parse(envelopeText);
      const summary = JSON.parse(summaryText);
      const expected = {
        providerErrorClass: "provider_response_status",
        providerDiagnosticNextAction: "inspect_redacted_diagnostic_context",
        providerErrorCode: responseStatus,
        providerErrorParamClass: "unknown",
        providerResponseStatusCode: 200,
        providerOutputObserved: true,
      };

      assert.equal(result.exitCode, 2, responseStatus);
      assert.equal(parsed.status, "provider_error");
      assert.equal(envelope.providerCall.responseClass, "provider_error");
      assert.equal(envelope.evidenceSummary.persistedObservationClass, "redacted_provider_error_observed");
      for (const value of [parsed, envelope, summary]) {
        assertRedactedDiagnostic(value, expected);
      }
      assert.match(summaryMd, /providerErrorClass: provider_response_status/u);
      assert.match(summaryMd, /providerDiagnosticNextAction: inspect_redacted_diagnostic_context/u);
      assert.match(summaryMd, new RegExp(`providerErrorCode: ${responseStatus}`, "u"));
      await assertSafeArtifacts(outputDir, imagePath);
      assertNoRawProviderDiagnosticLeak(`${result.stdout}\n${envelopeText}\n${summaryText}\n${summaryMd}`, [
        JSON.stringify(body),
        rawOutput,
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
});

test("HTTP-success unknown string Responses statuses fail closed with safe redacted codes", async () => {
  for (const { responseStatus, expectedErrorCode, rawStatusMustBeAbsent } of [
    {
      responseStatus: "requires_action",
      expectedErrorCode: "requires_action",
      rawStatusMustBeAbsent: false,
    },
    {
      responseStatus: "manual review at /Users/pana/private",
      expectedErrorCode: "unknown_response_status",
      rawStatusMustBeAbsent: true,
    },
  ]) {
    const tmp = await mkdtemp(join(tmpdir(), "norma-core-unknown-response-status-"));

    try {
      const imagePath = join(tmp, "source.png");
      const outputDir = join(tmp, "out");
      const rawOutput = "RAW_UNKNOWN_STATUS_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST";
      const body = {
        status: responseStatus,
        output_text: rawOutput,
      };

      await writeFile(imagePath, pngBytes());
      const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
        env: completeEnv(),
        transport: async () => ({
          ok: true,
          statusCode: 200,
          body,
        }),
      });
      const envelopeText = await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8");
      const summaryText = await readFile(join(outputDir, "summary.json"), "utf8");
      const summaryMd = await readFile(join(outputDir, "summary.md"), "utf8");
      const parsed = JSON.parse(result.stdout);
      const envelope = JSON.parse(envelopeText);
      const summary = JSON.parse(summaryText);
      const expected = {
        providerErrorClass: "provider_response_status",
        providerDiagnosticNextAction: "inspect_redacted_diagnostic_context",
        providerErrorCode: expectedErrorCode,
        providerErrorParamClass: "unknown",
        providerResponseStatusCode: 200,
        providerOutputObserved: true,
      };
      const allText = `${result.stdout}\n${envelopeText}\n${summaryText}\n${summaryMd}`;

      assert.equal(result.exitCode, 2, responseStatus);
      assert.equal(parsed.status, "provider_error");
      assert.equal(envelope.providerCall.responseClass, "provider_error");
      assert.equal(envelope.evidenceSummary.persistedObservationClass, "redacted_provider_error_observed");
      for (const value of [parsed, envelope, summary]) {
        assertRedactedDiagnostic(value, expected);
      }
      assert.match(summaryMd, /providerErrorClass: provider_response_status/u);
      assert.match(summaryMd, /providerDiagnosticNextAction: inspect_redacted_diagnostic_context/u);
      assert.match(summaryMd, new RegExp(`providerErrorCode: ${expectedErrorCode}`, "u"));
      await assertSafeArtifacts(outputDir, imagePath);
      assertNoRawProviderDiagnosticLeak(allText, [rawOutput]);
      if (rawStatusMustBeAbsent) {
        assert.doesNotMatch(allText, new RegExp(escapeRegExp(responseStatus), "u"));
        assert.doesNotMatch(allText, /\/Users\//u);
      }
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
});

test("HTTP-success Responses bodies without string status fail closed with safe redacted status", async () => {
  for (const { name, body, rawValues } of [
    {
      name: "non-json-body",
      body: null,
      rawValues: ["RAW_NON_JSON_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST"],
    },
    {
      name: "missing-status",
      body: {
        output_text: "RAW_MISSING_STATUS_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST",
      },
      rawValues: ["RAW_MISSING_STATUS_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST"],
    },
    {
      name: "non-string-status",
      body: {
        status: 42,
        output_text: "RAW_NON_STRING_STATUS_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST",
      },
      rawValues: ["RAW_NON_STRING_STATUS_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST"],
    },
  ]) {
    const tmp = await mkdtemp(join(tmpdir(), "norma-core-missing-response-status-"));

    try {
      const imagePath = join(tmp, "source.png");
      const outputDir = join(tmp, "out");

      await writeFile(imagePath, pngBytes());
      const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
        env: completeEnv(),
        transport: async () => ({
          ok: true,
          statusCode: 200,
          body,
          providerOutputObserved: true,
        }),
      });
      const envelopeText = await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8");
      const summaryText = await readFile(join(outputDir, "summary.json"), "utf8");
      const summaryMd = await readFile(join(outputDir, "summary.md"), "utf8");
      const parsed = JSON.parse(result.stdout);
      const envelope = JSON.parse(envelopeText);
      const summary = JSON.parse(summaryText);
      const expected = {
        providerErrorClass: "provider_response_status",
        providerDiagnosticNextAction: "inspect_redacted_diagnostic_context",
        providerErrorCode: "unknown_response_status",
        providerErrorParamClass: "unknown",
        providerResponseStatusCode: 200,
        providerOutputObserved: true,
      };
      const allText = `${result.stdout}\n${envelopeText}\n${summaryText}\n${summaryMd}`;

      assert.equal(result.exitCode, 2, name);
      assert.equal(parsed.status, "provider_error");
      assert.equal(envelope.providerCall.responseClass, "provider_error");
      assert.equal(envelope.evidenceSummary.persistedObservationClass, "redacted_provider_error_observed");
      for (const value of [parsed, envelope, summary]) {
        assertRedactedDiagnostic(value, expected);
      }
      assert.match(summaryMd, /providerErrorClass: provider_response_status/u);
      assert.match(summaryMd, /providerDiagnosticNextAction: inspect_redacted_diagnostic_context/u);
      assert.match(summaryMd, /providerErrorCode: unknown_response_status/u);
      await assertSafeArtifacts(outputDir, imagePath);
      assertNoRawProviderDiagnosticLeak(allText, rawValues);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
});

test("HTTP-success content-filter incomplete Responses use content-filter diagnostics", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-content-filter-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    const rawOutput = "RAW_CONTENT_FILTER_PROVIDER_OUTPUT_SHOULD_NOT_PERSIST";
    const body = {
      status: "incomplete",
      incomplete_details: {
        reason: "content_filter",
      },
      output_text: rawOutput,
    };

    await writeFile(imagePath, pngBytes());
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async () => ({
        ok: true,
        statusCode: 200,
        body,
      }),
    });
    const envelopeText = await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8");
    const summaryText = await readFile(join(outputDir, "summary.json"), "utf8");
    const summaryMd = await readFile(join(outputDir, "summary.md"), "utf8");
    const parsed = JSON.parse(result.stdout);
    const envelope = JSON.parse(envelopeText);
    const summary = JSON.parse(summaryText);
    const expected = {
      providerErrorClass: "content_filter",
      providerDiagnosticNextAction: "inspect_redacted_provider_client_error",
      providerErrorCode: "content_filter",
      providerErrorParamClass: "input",
      providerResponseStatusCode: 200,
      providerOutputObserved: true,
    };

    assert.equal(result.exitCode, 2);
    assert.equal(parsed.status, "provider_error");
    assert.equal(envelope.providerCall.responseClass, "provider_error");
    for (const value of [parsed, envelope, summary]) {
      assertRedactedDiagnostic(value, expected);
    }
    assert.match(summaryMd, /providerErrorClass: content_filter/u);
    assert.match(summaryMd, /providerDiagnosticNextAction: inspect_redacted_provider_client_error/u);
    assert.match(summaryMd, /providerErrorCode: content_filter/u);
    assert.doesNotMatch(summaryMd, /increase_output_token_budget_or_reduce_reasoning/u);
    await assertSafeArtifacts(outputDir, imagePath);
    assertNoRawProviderDiagnosticLeak(`${result.stdout}\n${envelopeText}\n${summaryText}\n${summaryMd}`, [
      JSON.stringify(body),
      rawOutput,
      "incomplete_details",
    ]);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR118 thrown transport failures classify as redacted network diagnostics", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr118-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    await writeFile(imagePath, pngBytes());
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async () => {
        throw new Error("RAW_NETWORK_ERROR_SHOULD_NOT_PRINT");
      },
    });
    const parsed = JSON.parse(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(parsed.status, "transport_error");
    assertRedactedDiagnostic(parsed, {
      providerErrorClass: "network",
      providerDiagnosticNextAction: "check_local_network_or_provider_reachability",
      providerErrorParamClass: "unknown",
      providerOutputObserved: false,
    });
    assert.equal("providerResponseStatusCode" in parsed, false);
    assertNoRawProviderDiagnosticLeak(result.stdout, ["RAW_NETWORK_ERROR_SHOULD_NOT_PRINT"]);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("PR129 provider-specific response fields terminate before persisted candidate evidence", async () => {
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
        rawResponseBytes: providerCandidateResponseBytes([
          { x: 0.1, y: 0.2, width: 0.3, height: 0.4, providerConfidence: 1 },
        ], {
          acceptedStructuredGeometry: { unsafe: true },
          coreInput: true,
          score: 1,
          valueMetadata: "unsafe",
          rawText: "FAKE_PROVIDER_RAW_TEXT",
        }),
      }),
    });
    const candidateText = await readFile(join(outputDir, "candidate-observation.json"), "utf8");
    const candidate = JSON.parse(candidateText);

    assert.equal(candidate.contractId, "norma.local-visual-candidate-observation@1");
    assert.equal(candidate.authority.providerEvidenceOnly, true);
    assert.equal(candidate.authority.maySelfAccept, false);
    assert.equal(candidate.outcomes.acceptedGeometryProduced, false);
    assert.equal(candidate.outcomes.coreInputProduced, false);
    assert.equal(candidate.outcomes.resultJsonProduced, false);
    assert.equal(validateAcceptedGeometryV1(candidate).ok, false);
    assert.equal(analyzeStructuredCompositionV1(candidate).status, "invalid");
    assert.doesNotMatch(candidateText, /FAKE_PROVIDER_RAW_TEXT|acceptedStructuredGeometry|valueMetadata|output_text|gpt-fake/u);
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
  assertCurrentRemoteMcpPackageBoundary(packageJson);
});

test("PR117 docs state manual live smoke boundary without approving provider truth or production integration", async () => {
  const doc = await readFile(decisionPath, "utf8");
  const roadmap = await readFile(roadmapPath, "utf8");

  assertDocMentions(doc, [
    "PR117 adds a controlled manual live-provider smoke behind the PR116 disabled harness",
    "Default command remains safe and does not call network",
    "The default disabled command can run without prebuilt `dist/` output",
    "Live mode requires `npm run build` first",
    "Live execution requires explicit opt-in and local operator credentials",
    "Live execution must not run in CI",
    "no recognized non-empty CI marker",
    "a writable `--output <dir>`",
    "No secrets may be committed",
    "No `.env` files may be committed or mutated",
    "Raw provider output is ephemeral and not persisted",
    "disable provider-side response storage",
    "Redacted provider-neutral evidence output is the only allowed persisted result",
    "input_compatibility",
    "content_filter",
    "provider_response_status",
    "unknown_response_status",
    "HTTP-success Responses API bodies whose top-level `status` is not",
    "allowlisted `incomplete_details.reason`",
    "provider rejected an otherwise docs-aligned input/model/config combination",
    "PR120 adds `providerDiagnosticNextAction` as advisory operator guidance only",
    "derived only from redacted `providerErrorClass`",
    "cannot authorize acceptance",
    "cannot change the provider request body",
    "Provider output remains evidence only",
    "Accepted structured geometry remains the only Core input",
    "PR117 does not implement production OpenAI integration",
    "PR117 does not approve provider output as truth",
  ]);
  assertDocMentions(roadmap, [
    "PR117: add controlled live provider smoke behind disabled harness",
    "PR120: add controlled live provider diagnostic next-action hints",
    "allowlisted advisory `providerDiagnosticNextAction` values",
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

test("PR122 package files lockfiles package root exports scripts and metadata remain unchanged", async () => {
  const changedFiles = await gitDiffNames();
  if (isExactChangedFileSet(changedFiles, permanentRemoteMcpQuotaIsolationHotfixChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, remoteMcpRenderPrivateBetaDeploymentChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, permanentRemoteMcpRuntimeChangedFiles)) return;
  if (isExactChangedFileSet(changedFiles, statelessRemoteMcpCommercialBetaContractChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), privateDevChatGptMcpCompleteLiveProofChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), personalChatGptVisualHarmonyDemoChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), personalVisualHarmonyImageHydrationChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), personalVisualHarmonyPixelRefinementShadowChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), privateDevLocalVisualMcpOrchestrationChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), privateDevChatGptMcpVisualPilotGateChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), pr132ValidationHardeningCheckpointChangedFiles)) return;
  if (isExactChangedFileSet(branchChangedFiles(repoRoot), localVisualCandidateReviewChangedFiles)) return;
  const isCleanBase = isCleanBaseValidationContext(repoRoot);

  assert.equal(
    isCleanBase || [
      localVisualCandidateReviewProductSurfaceChangedFiles,
      cleanMainValidationAndPr129OperatorProofChangedFiles,
      controlledLocalLiveVisualCandidateObservationDemoChangedFiles,
      explicitAcceptedObservationToCoreHandoffChangedFiles,
      localVisualObservationToCorePilotContractChangedFiles,
      controlledProviderObservationToCoreHandoffChangedFiles,
      controlledProviderObservationAcceptanceProofChangedFiles,
      controlledProviderObservationContractChangedFiles,
      controlledLiveProviderIncompleteResponseGuardChangedFiles,
      controlledLiveProviderSmokeArtifactProofChangedFiles,
      controlledLiveProviderSmokeResponseStatusGuardChangedFiles,
    ].some((expectedChangedFiles) => JSON.stringify(changedFiles) === JSON.stringify(expectedChangedFiles)),
    true,
    changedFiles.join("\n"),
  );
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

async function runProviderErrorCase({ statusCode, body }) {
  const tmp = await mkdtemp(join(tmpdir(), "norma-core-pr118-"));

  try {
    const imagePath = join(tmp, "source.png");
    const outputDir = join(tmp, "out");
    await writeFile(imagePath, pngBytes());
    const result = await runCli(["--live", "--input-image", imagePath, "--output", outputDir], {
      env: completeEnv(),
      transport: async () => ({
        ok: false,
        statusCode,
        body,
      }),
    });
    const envelopeText = await readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8");
    const summaryText = await readFile(join(outputDir, "summary.json"), "utf8");
    const summaryMd = await readFile(join(outputDir, "summary.md"), "utf8");

    await assertSafeArtifacts(outputDir, imagePath);

    return {
      ...result,
      parsed: JSON.parse(result.stdout),
      envelope: JSON.parse(envelopeText),
      summary: JSON.parse(summaryText),
      summaryMd,
      allText: `${result.stdout}\n${envelopeText}\n${summaryText}\n${summaryMd}`,
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function assertSafeArtifacts(outputDir, imagePath) {
  const artifactTexts = await Promise.all([
    readFile(join(outputDir, "provider-evidence-envelope.json"), "utf8"),
    readFile(join(outputDir, "summary.json"), "utf8"),
    readFile(join(outputDir, "summary.md"), "utf8"),
  ]);

  for (const text of artifactTexts) {
    assert.doesNotMatch(text, new RegExp(escapeRegExp(imagePath), "u"));
    assert.doesNotMatch(text, /gpt-fake|FAKE_SECRET_VALUE_DO_NOT_PRINT|FAKE_PROVIDER_RAW_TEXT|FAKE_PROVIDER_TOKEN|Bearer|data:image|;base64,|Confirm that an image was received|input_image|input_text|image_url|\/Users\/|\/Volumes\//u);
    assert.doesNotMatch(text, /acceptedStructuredGeometry"\s*:/u);
  }
}

function assertRedactedDiagnostic(value, expected) {
  assert.equal(value.providerErrorClass, expected.providerErrorClass);
  if ("providerDiagnosticNextAction" in expected) {
    assert.equal(value.providerDiagnosticNextAction, expected.providerDiagnosticNextAction);
  }
  if ("providerDiagnosticNextAction" in value) {
    assert.equal(
      Object.values(CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS).includes(
        value.providerDiagnosticNextAction,
      ),
      true,
    );
  }
  if ("providerErrorCode" in expected) {
    assert.equal(value.providerErrorCode, expected.providerErrorCode);
  }
  assert.equal(value.providerErrorParamClass, expected.providerErrorParamClass);
  if ("providerResponseStatusCode" in expected) {
    assert.equal(value.providerResponseStatusCode, expected.providerResponseStatusCode);
  }
  assert.equal(value.providerOutputObserved, expected.providerOutputObserved);
  assert.equal(value.providerDiagnosticRedacted, true);
}

function assertNoRawProviderDiagnosticLeak(text, rawValues) {
  for (const rawValue of rawValues) {
    assert.doesNotMatch(text, new RegExp(escapeRegExp(rawValue), "u"), rawValue);
  }
  assert.doesNotMatch(text, /UNSAFE_RAW_PROVIDER_MESSAGE|RAW_PROVIDER_BODY_SHOULD_NOT_PERSIST|SECRET_TOKEN_SHOULD_NOT_PRINT/u);
  assert.doesNotMatch(text, /"message"\s*:|"param"\s*:|"body"\s*:|"request"\s*:/u);
}

async function gitDiffNames() {
  return branchChangedFiles(repoRoot);
}

function pngBytes() {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  bytes.set([0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x18, 0x08, 0x06], 16);
  return bytes;
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

function createHumanSelection(candidate, selectedIndexes) {
  return finalizeLocalVisualHumanCandidateSelectionIdentityV1({
    contractId: "norma.local-visual-human-candidate-selection@1",
    contractVersion: 1,
    selectionId: "human-selection:cli:1",
    candidateObservationId: candidate.observationId,
    candidateObservationContentIdentity: candidate.observationContentIdentity,
    providerExecutionReceiptContentIdentity:
      candidate.provenance.providerExecutionReceiptContentIdentity,
    acceptanceActor: { actorClass: "human", actorId: "local-human:cli" },
    geometryAction: "accept_exact",
    selections: selectedIndexes.map((candidateIndex, order) => ({
      order,
      candidateId: candidate.rectangleCandidates[candidateIndex].candidateId,
      acceptedPrimitiveId: `accepted:rectangle:${String(order)}`,
    })),
    authority: {
      explicitHumanSelection: true,
      providerAuthority: false,
      confidenceAuthority: false,
      automaticAcceptance: false,
      coordinateCorrectionAllowed: false,
      coordinateRepairAllowed: false,
    },
  });
}

function providerCandidateResponseText(rectangles, extraFields = {}) {
  return JSON.stringify({
    id: "response:fake",
    object: "response",
    status: "completed",
    error: null,
    output: [{
      id: "message:fake",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [{
        type: "output_text",
        annotations: [],
        text: JSON.stringify({
          schemaVersion: "controlled-rectangle-candidates@1",
          rectangles,
        }),
      }],
    }],
    ...extraFields,
  });
}

function providerCandidateResponseBytes(rectangles, extraFields = {}) {
  return new TextEncoder().encode(providerCandidateResponseText(rectangles, extraFields));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
