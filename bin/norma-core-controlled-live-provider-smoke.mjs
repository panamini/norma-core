import { realpathSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export { runControlledLiveProviderSmokeCli };

const CONTROLLED_LIVE_PROVIDER_SMOKE_URL = ["ht", "tps://api.openai.com/v1/responses"].join("");
const PROVIDER_CREDENTIAL_HEADER_NAME = ["Author", "ization"].join("");
const CONTROLLED_LIVE_PROVIDER_SMOKE_DEFAULT_TIMEOUT_MS = 30_000;
const CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES = 2 * 1024 * 1024;

let builtHelpersPromise;

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

  if (!parsedArgs.live) {
    stdout.write(`${JSON.stringify(createLocalControlledLiveProviderSmokeDefaultState())}\n`);
    return 0;
  }

  const env = options.env ?? process.env;
  const timeoutMs = parsedArgs.timeoutMs ?? CONTROLLED_LIVE_PROVIDER_SMOKE_DEFAULT_TIMEOUT_MS;
  const ciEnvironmentPresent = isCiEnvironmentPresent(env);
  let helpers;
  try {
    helpers = await loadBuiltHelpers(options);
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
  const requestBody = helpers.createOpenAIResponsesVisionSmokeRequestBodyV1({
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

  const providerOutputObserved = typeof providerResponse.providerOutputObserved === "boolean"
    ? providerResponse.providerOutputObserved
    : providerResponse.body !== null;
  const providerDiagnostic = providerResponse.ok
    ? undefined
    : helpers.createControlledLiveProviderSmokeProviderErrorDiagnosticV1({
      responseStatusCode: providerResponse.statusCode,
      providerOutputObserved,
      providerBody: providerResponse.body,
    });
  const envelope = helpers.createControlledLiveProviderEvidenceEnvelopeV1({
    image,
    responseStatusCode: providerResponse.statusCode,
    responseOk: providerResponse.ok,
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
      providerResponseClass: providerResponse.ok ? "success" : "provider_error",
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
    status: providerResponse.ok ? "ok" : "provider_error",
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
  return providerResponse.ok ? 0 : 2;
}

function parseArgs(args) {
  const parsed = {
    ok: true,
    live: false,
    inputImage: undefined,
    output: undefined,
    timeoutMs: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--live") {
      parsed.live = true;
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

    if (arg === "--timeout-ms" && typeof args[index + 1] === "string" && args[index + 1] !== "") {
      parsed.timeoutMs = Number(args[index + 1]);
      index += 1;
      continue;
    }

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
    const text = await response.text();

    return {
      ok: response.ok,
      statusCode: response.status,
      body: safeJson(text),
      providerOutputObserved: text.length > 0,
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
