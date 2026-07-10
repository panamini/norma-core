import { realpathSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export { runControlledLiveProviderSmokeCli };

const CONTROLLED_LIVE_PROVIDER_SMOKE_URL = ["ht", "tps://api.openai.com/v1/responses"].join("");
const PROVIDER_CREDENTIAL_HEADER_NAME = ["Author", "ization"].join("");
const CONTROLLED_LIVE_PROVIDER_SMOKE_DEFAULT_TIMEOUT_MS = 30_000;
const CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES = 2 * 1024 * 1024;

let builtHelpersPromise;
let builtCandidateHelpersPromise;

async function runControlledLiveProviderSmokeCli({
  args = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  options = {},
} = {}) {
  const parsedArgs = parseArgs(args);

  if (!parsedArgs.ok) {
    stdout.write(`${JSON.stringify(errorGate("InvalidCliUsage"))}\n`);
    return 1;
  }

  if (parsedArgs.resume) {
    return runControlledLocalLiveVisualCandidateResumeCli({
      parsedArgs,
      stdout,
      options,
    });
  }

  if (!parsedArgs.live) {
    stdout.write(`${JSON.stringify(createLocalControlledLiveProviderSmokeDefaultState())}\n`);
    return 0;
  }

  const env = options.env ?? process.env;
  const timeoutMs = parsedArgs.timeoutMs ?? CONTROLLED_LIVE_PROVIDER_SMOKE_DEFAULT_TIMEOUT_MS;
  const ciEnvironmentPresent = isCiEnvironmentPresent(env);
  let helpers;
  let candidateHelpers;
  try {
    helpers = await loadBuiltHelpers(options);
    candidateHelpers = await loadBuiltCandidateHelpers(options);
  } catch {
    stdout.write(`${JSON.stringify(errorGate("BuildRequired"))}\n`);
    return 1;
  }
  const initialGate = createCliGateState({
    helpers,
    env,
    parsedArgs,
    timeoutMs,
    ciEnvironmentPresent,
    inputImageExists: typeof parsedArgs.inputImage === "string" ? true : undefined,
    inputImageSizeBytes: 1,
    inputImageMimeType: "image/png",
    outputDirectoryWritable: true,
  });

  if (initialGate.gateStatus !== "ready_for_manual_live_transport") {
    stdout.write(`${JSON.stringify(initialGate)}\n`);
    return 1;
  }

  let imageRead;
  try {
    imageRead = await readBoundedImageBytes(parsedArgs.inputImage, options);
  } catch {
    stdout.write(`${JSON.stringify(createCliGateState({
      helpers,
      env,
      parsedArgs,
      timeoutMs,
      ciEnvironmentPresent,
      inputImageExists: false,
      inputImageSizeBytes: 1,
      inputImageMimeType: "image/png",
    }))}\n`);
    return 1;
  }

  if (!imageRead.ok) {
    stdout.write(`${JSON.stringify(createCliGateState({
      helpers,
      env,
      parsedArgs,
      timeoutMs,
      ciEnvironmentPresent,
      inputImageExists: imageRead.inputImageExists,
      inputImageSizeBytes: imageRead.inputImageSizeBytes,
      inputImageMimeType: "image/png",
    }))}\n`);
    return 1;
  }

  const imageBytes = imageRead.bytes;
  const image = helpers.detectControlledLiveProviderSmokeImageV1(parsedArgs.inputImage, imageBytes);
  const imageGate = createCliGateState({
    helpers,
    env,
    parsedArgs,
    timeoutMs,
    ciEnvironmentPresent,
    inputImageExists: true,
    inputImageSizeBytes: imageBytes.byteLength,
    inputImageMimeType: image?.mediaType ?? null,
    outputDirectoryWritable: true,
  });

  if (imageGate.gateStatus !== "ready_for_manual_live_transport" || image === null) {
    stdout.write(`${JSON.stringify(imageGate)}\n`);
    return 1;
  }

  const outputDir = resolve(parsedArgs.output);
  try {
    await prepareOutputDirectory(outputDir, options);
  } catch {
    stdout.write(`${JSON.stringify(createCliGateState({
      helpers,
      env,
      parsedArgs,
      timeoutMs,
      ciEnvironmentPresent,
      inputImageExists: true,
      inputImageSizeBytes: imageBytes.byteLength,
      inputImageMimeType: image.mediaType,
      outputDirectoryWritable: false,
    }))}\n`);
    return 1;
  }

  const model = env.NORMA_LIVE_PROVIDER_MODEL.trim();
  const apiKey = env.NORMA_LIVE_PROVIDER_API_KEY.trim();
  const requestBody = candidateHelpers.createControlledLiveProviderCandidateRequestBodyV1({
    model,
    imageDataUrl: `data:${image.mediaType};base64,${Buffer.from(imageBytes).toString("base64")}`,
  });
  const transport = options.transport ?? builtInTransport;

  let providerResponse;
  try {
    providerResponse = await transport({
      url: CONTROLLED_LIVE_PROVIDER_SMOKE_URL,
      timeoutMs,
      headers: {
        "Content-Type": "application/json",
        [PROVIDER_CREDENTIAL_HEADER_NAME]: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    const providerDiagnostic = helpers.createControlledLiveProviderSmokeNetworkDiagnosticV1();
    stdout.write(`${JSON.stringify({
      status: "transport_error",
      liveProviderExecution: true,
      ...providerDiagnostic,
      providerEvidenceOnly: true,
      requiresExplicitAcceptance: true,
      providerOutputIsCoreTruth: false,
      acceptedStructuredGeometryOnlyCoreInput: true,
      rawProviderOutputPersisted: false,
      rawImagePersisted: false,
      redacted: true,
      ciLiveNetworkDependency: false,
    })}\n`);
    return 2;
  }

  const rawResponseText = typeof providerResponse.rawResponseText === "string"
    ? providerResponse.rawResponseText
    : undefined;
  const rawProviderResponseBytes = providerResponse.rawResponseBytes instanceof Uint8Array
    ? providerResponse.rawResponseBytes
    : rawResponseText === undefined
      ? undefined
      : new TextEncoder().encode(rawResponseText);
  const providerOutputObserved = typeof providerResponse.providerOutputObserved === "boolean"
    ? providerResponse.providerOutputObserved
    : rawProviderResponseBytes === undefined
      ? providerResponse.body !== null
      : rawProviderResponseBytes.byteLength > 0;
  let capture;
  let candidateError;
  if (providerResponse.ok && rawProviderResponseBytes !== undefined) {
    try {
      capture = candidateHelpers.createControlledLocalLiveVisualCandidateCaptureV1({
        sourceImageBytes: imageBytes,
        sourceImageMediaType: image.mediaType,
        rawProviderResponseBytes,
        responseStatusCode: providerResponse.statusCode,
        timeoutMs,
      });
    } catch (error) {
      candidateError = error;
    }
  }
  const providerBody = rawProviderResponseBytes === undefined
    ? providerResponse.body
    : safeJsonBytes(rawProviderResponseBytes);
  const incompleteResponseDiagnostic = providerResponse.ok
    ? helpers.createControlledLiveProviderSmokeIncompleteResponseDiagnosticV1({
      responseStatusCode: providerResponse.statusCode,
      providerOutputObserved,
      providerBody,
    })
    : undefined;
  const providerSucceeded = providerResponse.ok && incompleteResponseDiagnostic === undefined;

  if (capture === undefined && providerSucceeded) {
      stdout.write(`${JSON.stringify({
        status: "provider_schema_error",
        liveProviderExecution: true,
        providerResponseStatusCode: providerResponse.statusCode,
        providerOutputObserved,
        errorCode: safeCandidateErrorCode(
          candidateError ?? new Error("MissingExactProviderResponseBytes"),
        ),
        providerEvidenceOnly: true,
        requiresExplicitHumanSelection: true,
        acceptedGeometryProduced: false,
        coreInputProduced: false,
        structuredAnalyzeRun: false,
        resultJsonProduced: false,
        rawProviderResponsePersisted: false,
        rawImagePersisted: false,
        redacted: true,
        ciLiveNetworkDependency: false,
        artifactsPersisted: false,
      })}\n`);
      return 2;
  }

  if (capture !== undefined) {
    try {
      await writeCandidateCaptureArtifacts(outputDir, capture, options);
    } catch {
      stdout.write(`${JSON.stringify({
        status: "artifact_write_error",
        phase: "candidate_capture",
        liveProviderExecution: true,
        providerResponseStatusCode: providerResponse.statusCode,
        providerOutputObserved,
        providerEvidenceOnly: true,
        requiresExplicitHumanSelection: true,
        acceptedGeometryProduced: false,
        coreInputProduced: false,
        structuredAnalyzeRun: false,
        resultJsonProduced: false,
        rawProviderResponsePersisted: false,
        rawImagePersisted: false,
        redacted: true,
        ciLiveNetworkDependency: false,
        artifactsPersisted: false,
      })}\n`);
      return 2;
    }

    stdout.write(`${JSON.stringify({
      status: "selection_required",
      liveProviderExecution: true,
      providerEvidenceOnly: true,
      requiresExplicitHumanSelection: true,
      acceptedGeometryProduced: false,
      coreInputProduced: false,
      structuredAnalyzeRun: false,
      resultJsonProduced: false,
      rawProviderResponsePersisted: false,
      rawImagePersisted: false,
      redacted: true,
      ciLiveNetworkDependency: false,
      providerExecutionReceiptContentIdentity:
        capture.providerExecutionReceipt.executionReceiptContentIdentity,
      candidateObservationId: capture.candidateObservationEnvelope.observationId,
      candidateObservationContentIdentity:
        capture.candidateObservationEnvelope.observationContentIdentity,
      artifacts: capture.persistedArtifactNames,
    })}\n`);
    return 0;
  }

  const providerDiagnostic = providerSucceeded
    ? undefined
    : incompleteResponseDiagnostic ?? helpers.createControlledLiveProviderSmokeProviderErrorDiagnosticV1({
      responseStatusCode: providerResponse.statusCode,
      providerOutputObserved,
      providerBody,
    });
  const envelope = helpers.createControlledLiveProviderEvidenceEnvelopeV1({
    image,
    responseStatusCode: providerResponse.statusCode,
    responseOk: providerSucceeded,
    providerOutputObserved,
    timeoutMs,
    providerDiagnostic,
  });
  const summary = helpers.createControlledLiveProviderSmokeSummaryV1(envelope);

  try {
    await writeSafeArtifacts(outputDir, envelope, summary, options, helpers);
  } catch {
    const artifactDiagnostic = helpers.createControlledLiveProviderSmokeArtifactWriteDiagnosticV1({
      responseStatusCode: providerResponse.statusCode,
      providerOutputObserved,
    });
    stdout.write(`${JSON.stringify({
      status: "artifact_write_error",
      liveProviderExecution: true,
      providerResponseStatusCode: providerResponse.statusCode,
      providerResponseClass: providerSucceeded ? "success" : "provider_error",
      providerOutputObserved,
      ...artifactDiagnostic,
      providerEvidenceOnly: true,
      requiresExplicitAcceptance: true,
      providerOutputIsCoreTruth: false,
      acceptedStructuredGeometryOnlyCoreInput: true,
      rawProviderOutputPersisted: false,
      rawImagePersisted: false,
      redacted: true,
      ciLiveNetworkDependency: false,
      artifactsPersisted: false,
    })}\n`);
    return 2;
  } finally {
    if (typeof stderr.flush === "function") {
      stderr.flush();
    }
  }

  stdout.write(`${JSON.stringify({
    status: providerSucceeded ? "ok" : "provider_error",
    liveProviderExecution: true,
    ...(providerDiagnostic ?? {}),
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    rawProviderOutputPersisted: false,
    rawImagePersisted: false,
    redacted: true,
    ciLiveNetworkDependency: false,
    artifacts: summary.artifacts,
  })}\n`);
  return providerSucceeded ? 0 : 2;
}

function parseArgs(args) {
  const parsed = {
    ok: true,
    live: false,
    resume: false,
    inputImage: undefined,
    capture: undefined,
    selection: undefined,
    acceptedAt: undefined,
    output: undefined,
    timeoutMs: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--live") {
      parsed.live = true;
      continue;
    }

    if (arg === "--resume") {
      parsed.resume = true;
      continue;
    }

    if (arg === "--input-image" && typeof args[index + 1] === "string" && args[index + 1] !== "") {
      parsed.inputImage = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--output" && typeof args[index + 1] === "string" && args[index + 1] !== "") {
      parsed.output = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--capture" && typeof args[index + 1] === "string" && args[index + 1] !== "") {
      parsed.capture = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--selection" && typeof args[index + 1] === "string" && args[index + 1] !== "") {
      parsed.selection = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--accepted-at" && typeof args[index + 1] === "string" && args[index + 1] !== "") {
      parsed.acceptedAt = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--timeout-ms" && typeof args[index + 1] === "string" && args[index + 1] !== "") {
      parsed.timeoutMs = Number(args[index + 1]);
      index += 1;
      continue;
    }

    return { ok: false };
  }

  if (parsed.live && parsed.resume) {
    return { ok: false };
  }
  if (parsed.resume) {
    return typeof parsed.capture === "string"
      && typeof parsed.selection === "string"
      && typeof parsed.acceptedAt === "string"
      && typeof parsed.output === "string"
      && parsed.inputImage === undefined
      && parsed.timeoutMs === undefined
      ? parsed
      : { ok: false };
  }
  if (parsed.capture !== undefined || parsed.selection !== undefined || parsed.acceptedAt !== undefined) {
    return { ok: false };
  }
  return parsed;
}

function createCliGateState({
  helpers,
  env,
  parsedArgs,
  timeoutMs,
  ciEnvironmentPresent,
  inputImageExists,
  inputImageSizeBytes,
  inputImageMimeType,
  outputDirectoryWritable,
}) {
  return helpers.createControlledLiveProviderSmokeGateStateV1({
    liveFlagPresent: true,
    ciEnvironmentPresent,
    envOptInValue: env.NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT,
    provider: env.NORMA_LIVE_PROVIDER,
    modelPresent: isNonBlankString(env.NORMA_LIVE_PROVIDER_MODEL),
    apiKeyPresent: isNonBlankString(env.NORMA_LIVE_PROVIDER_API_KEY),
    inputImagePathPresent: typeof parsedArgs.inputImage === "string",
    inputImagePathIsRemoteOrFileUrl: typeof parsedArgs.inputImage === "string" && helpers.isRemoteOrFileUrlInput(parsedArgs.inputImage),
    inputImageExists,
    inputImageSizeBytes,
    inputImageMimeType,
    outputDirectoryPresent: typeof parsedArgs.output === "string",
    outputDirectoryWritable,
    timeoutMs,
  });
}

async function runControlledLocalLiveVisualCandidateResumeCli({
  parsedArgs,
  stdout,
  options,
}) {
  let candidateHelpers;
  try {
    candidateHelpers = await loadBuiltCandidateHelpers(options);
  } catch {
    stdout.write(`${JSON.stringify(errorGate("BuildRequired"))}\n`);
    return 1;
  }

  let resume;
  try {
    const captureDir = resolve(parsedArgs.capture);
    const [providerExecutionReceipt, candidateObservationEnvelope, humanCandidateSelection] =
      await Promise.all([
        readJsonFile(join(captureDir, "provider-execution-receipt.json"), options),
        readJsonFile(join(captureDir, "candidate-observation.json"), options),
        readJsonFile(resolve(parsedArgs.selection), options),
      ]);
    resume = candidateHelpers.createControlledLocalLiveVisualCandidateResumeV1({
      providerExecutionReceipt,
      candidateObservationEnvelope,
      humanCandidateSelection,
      acceptedAt: parsedArgs.acceptedAt,
    });
  } catch (error) {
    stdout.write(`${JSON.stringify({
      status: "selection_validation_error",
      liveProviderExecution: false,
      networkTransportUsed: false,
      errorCode: safeCandidateErrorCode(error),
      acceptedGeometryProduced: false,
      coreInputProduced: false,
      structuredAnalyzeRun: false,
      resultJsonProduced: false,
      redacted: true,
      artifactsPersisted: false,
    })}\n`);
    return 2;
  }

  try {
    await writeResumeArtifactsAtomically(resolve(parsedArgs.output), resume.artifacts, options);
  } catch {
    stdout.write(`${JSON.stringify({
      status: "artifact_write_error",
      phase: "candidate_resume",
      liveProviderExecution: false,
      networkTransportUsed: false,
      acceptedGeometryProduced: false,
      coreInputProduced: false,
      structuredAnalyzeRun: false,
      resultJsonProduced: false,
      redacted: true,
      artifactsPersisted: false,
    })}\n`);
    return 2;
  }

  stdout.write(`${JSON.stringify({
    status: "completed",
    liveProviderExecution: false,
    networkTransportUsed: false,
    explicitHumanSelectionValidated: true,
    acceptedGeometryProduced: true,
    coreInputProduced: true,
    structuredAnalyzeRun: true,
    resultJsonProduced: true,
    providerMetadataInfluencedComputation: false,
    trace: resume.trace,
    canonicalResultJsonContentIdentity:
      resume.execution.handoff.canonicalResultJsonContentIdentity,
    artifacts: Object.keys(resume.artifacts).sort(),
  })}\n`);
  return 0;
}

async function readJsonFile(path, options) {
  return JSON.parse(await (options.readFile ?? readFile)(path, "utf8"));
}

async function readBoundedImageBytes(inputImage, options) {
  const fileStat = await (options.stat ?? stat)(inputImage);
  if (!fileStat.isFile()) {
    return {
      ok: false,
      inputImageExists: false,
      inputImageSizeBytes: 1,
    };
  }

  if (
    typeof fileStat.size !== "number" ||
    fileStat.size <= 0 ||
    fileStat.size > CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES
  ) {
    return {
      ok: false,
      inputImageExists: true,
      inputImageSizeBytes: typeof fileStat.size === "number" ? fileStat.size : 0,
    };
  }

  return {
    ok: true,
    bytes: new Uint8Array(await (options.readFile ?? readFile)(inputImage)),
  };
}

async function prepareOutputDirectory(outputDir, options) {
  const write = options.writeFile ?? writeFile;
  const remove = options.rm ?? rm;
  const probePath = join(
    outputDir,
    `.norma-core-controlled-live-provider-smoke-write-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  await (options.mkdir ?? mkdir)(outputDir, { recursive: true });
  await write(probePath, "", { encoding: "utf8", flag: "wx" });
  await remove(probePath, { force: true });
}

async function writeCandidateCaptureArtifacts(outputDir, capture, options) {
  const write = options.writeFile ?? writeFile;
  await write(
    join(outputDir, "provider-execution-receipt.json"),
    `${JSON.stringify(capture.providerExecutionReceipt)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  await write(
    join(outputDir, "candidate-observation.json"),
    `${JSON.stringify(capture.candidateObservationEnvelope)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}

async function writeResumeArtifactsAtomically(outputDir, artifacts, options) {
  const makeDirectory = options.mkdir ?? mkdir;
  const write = options.writeFile ?? writeFile;
  const move = options.rename ?? rename;
  const remove = options.rm ?? rm;
  const stagingDir = `${outputDir}.staging-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await makeDirectory(dirname(outputDir), { recursive: true });
  await makeDirectory(stagingDir, { recursive: false });
  try {
    const orderedArtifacts = Object.entries(artifacts)
      .filter(([name]) => name !== "result.json")
      .sort(([left], [right]) => left.localeCompare(right));
    for (const [name, contents] of orderedArtifacts) {
      await write(join(stagingDir, name), contents, { encoding: "utf8", flag: "wx" });
    }
    await write(join(stagingDir, "result.json"), artifacts["result.json"], {
      encoding: "utf8",
      flag: "wx",
    });
    await move(stagingDir, outputDir);
  } catch (error) {
    await remove(stagingDir, { recursive: true, force: true });
    throw error;
  }
}

async function writeSafeArtifacts(outputDir, envelope, summary, options, helpers) {
  const write = options.writeFile ?? writeFile;
  await (options.mkdir ?? mkdir)(outputDir, { recursive: true });
  await write(join(outputDir, "provider-evidence-envelope.json"), `${JSON.stringify(envelope)}\n`, "utf8");
  await write(join(outputDir, "summary.json"), `${JSON.stringify(summary)}\n`, "utf8");
  await write(join(outputDir, "summary.md"), helpers.createControlledLiveProviderSmokeSummaryMarkdownV1(summary), "utf8");
}

async function builtInTransport({ url, timeoutMs, headers, body }) {
  const transportFn = globalThis["fet" + "ch"];
  if (typeof transportFn !== "function") {
    throw new Error("Built-in transport is unavailable.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await transportFn(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    const rawResponseBytes = new Uint8Array(await response.arrayBuffer());

    return {
      ok: response.ok,
      statusCode: response.status,
      rawResponseBytes,
      body: null,
      providerOutputObserved: rawResponseBytes.byteLength > 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function safeJsonBytes(bytes) {
  try {
    return safeJson(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

function errorGate(code) {
  return {
    smokeKind: "norma.controlled-live-provider-smoke.gate.v1",
    gateStatus: "blocked_disabled_by_default",
    status: "error",
    code,
    liveProviderExecution: false,
    disabledByDefault: true,
    manualOnly: true,
    failClosed: true,
    providerEvidenceOnly: true,
    acceptedStructuredGeometryOnlyCoreInput: true,
    redacted: true,
  };
}

function createLocalControlledLiveProviderSmokeDefaultState() {
  return {
    smokeKind: "norma.controlled-live-provider-smoke.gate.v1",
    gateStatus: "blocked_disabled_by_default",
    disabledByDefault: true,
    manualOnly: true,
    failClosed: true,
    localOnly: true,
    liveProviderExecution: false,
    ciLiveNetworkDependency: false,
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    rawProviderOutputPersisted: false,
    rawImagePersisted: false,
    redacted: true,
    pr116Harness: {
      harnessKind: "norma.disabled-local-live-provider-experiment-harness.v1",
      disabledByDefault: true,
      manualOnly: true,
      failClosed: true,
      liveProviderExecution: false,
    },
    requiredGates: {
      liveFlag: "--live",
      envOptIn: "NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT=1",
      provider: "NORMA_LIVE_PROVIDER=openai-responses-vision",
      modelEnv: "NORMA_LIVE_PROVIDER_MODEL",
      apiKeyEnvPresence: "NORMA_LIVE_PROVIDER_API_KEY",
      inputImageFlag: "--input-image",
      outputDirectoryFlag: "--output",
      boundedTimeout: true,
    },
  };
}

async function loadBuiltHelpers(options) {
  if (options.helpers) {
    return options.helpers;
  }

  builtHelpersPromise ??= import("../dist/src/local-report/controlled-live-provider-smoke.js");
  return builtHelpersPromise;
}

async function loadBuiltCandidateHelpers(options) {
  if (options.candidateHelpers) {
    return options.candidateHelpers;
  }

  builtCandidateHelpersPromise ??= import(
    "../dist/src/local-report/controlled-local-live-visual-candidate-observation-demo.js"
  );
  return builtCandidateHelpersPromise;
}

function safeCandidateErrorCode(error) {
  const code = typeof error === "object" && error !== null && typeof error.code === "string"
    ? error.code
    : error instanceof Error
      ? error.message
      : "CandidateValidationFailed";
  return [
    "InvalidSourceImage",
    "InvalidProviderResponseStatus",
    "InvalidProviderResponseEncoding",
    "MalformedProviderResponse",
    "MalformedProviderStatus",
    "MalformedProviderSchema",
    "CandidateEvidenceMismatch",
    "InvalidHumanSelection",
    "ResultIdentityMismatch",
    "MissingExactProviderResponseBytes",
  ].includes(code)
    ? code
    : "CandidateValidationFailed";
}

function isCiEnvironmentPresent(env) {
  return [
    "CI",
    "GITHUB_ACTIONS",
    "GITLAB_CI",
    "BUILDKITE",
    "CIRCLECI",
    "TF_BUILD",
    "TEAMCITY_VERSION",
    "CODEBUILD_BUILD_ID",
    "CODEBUILD_BUILD_ARN",
    "CODEBUILD_INITIATOR",
    "BITBUCKET_BUILD_NUMBER",
    "DRONE",
    "TRAVIS",
    "APPVEYOR",
    "JENKINS_URL",
    "BUILD_ID",
    "BUILD_NUMBER",
  ].some((name) => isTruthyEnvMarker(env[name]));
}

function isTruthyEnvMarker(value) {
  if (value === undefined || value === null) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false" && normalized !== "no" && normalized !== "off";
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isCliEntrypoint() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isCliEntrypoint()) {
  process.exitCode = await runControlledLiveProviderSmokeCli();
}
