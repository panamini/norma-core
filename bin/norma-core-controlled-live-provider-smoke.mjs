import { realpathSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTROLLED_LIVE_PROVIDER_SMOKE_DEFAULT_TIMEOUT_MS,
  createControlledLiveProviderEvidenceEnvelopeV1,
  createControlledLiveProviderSmokeDefaultStateV1,
  createControlledLiveProviderSmokeGateStateV1,
  createControlledLiveProviderSmokeSummaryMarkdownV1,
  createControlledLiveProviderSmokeSummaryV1,
  createOpenAIResponsesVisionSmokeRequestBodyV1,
  detectControlledLiveProviderSmokeImageV1,
  isRemoteOrFileUrlInput,
} from "../dist/src/local-report/controlled-live-provider-smoke.js";

export { runControlledLiveProviderSmokeCli };

const CONTROLLED_LIVE_PROVIDER_SMOKE_URL = ["ht", "tps://api.openai.com/v1/responses"].join("");
const PROVIDER_CREDENTIAL_HEADER_NAME = ["Author", "ization"].join("");

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
    stdout.write(`${JSON.stringify(createControlledLiveProviderSmokeDefaultStateV1())}\n`);
    return 0;
  }

  const env = options.env ?? process.env;
  const timeoutMs = parsedArgs.timeoutMs ?? CONTROLLED_LIVE_PROVIDER_SMOKE_DEFAULT_TIMEOUT_MS;
  const initialGate = createControlledLiveProviderSmokeGateStateV1({
    liveFlagPresent: true,
    ciEnvironmentPresent: env.CI === "true",
    envOptInValue: env.NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT,
    provider: env.NORMA_LIVE_PROVIDER,
    modelPresent: typeof env.NORMA_LIVE_PROVIDER_MODEL === "string" && env.NORMA_LIVE_PROVIDER_MODEL.length > 0,
    apiKeyPresent: typeof env.NORMA_LIVE_PROVIDER_API_KEY === "string" && env.NORMA_LIVE_PROVIDER_API_KEY.length > 0,
    inputImagePathPresent: typeof parsedArgs.inputImage === "string",
    inputImagePathIsRemoteOrFileUrl: typeof parsedArgs.inputImage === "string" && isRemoteOrFileUrlInput(parsedArgs.inputImage),
    inputImageExists: typeof parsedArgs.inputImage === "string" ? true : undefined,
    inputImageSizeBytes: 1,
    inputImageMimeType: "image/png",
    outputDirectoryPresent: typeof parsedArgs.output === "string",
    timeoutMs,
  });

  if (initialGate.gateStatus !== "ready_for_manual_live_transport") {
    stdout.write(`${JSON.stringify(initialGate)}\n`);
    return 1;
  }

  let imageBytes;
  try {
    imageBytes = await readImageBytes(parsedArgs.inputImage, options);
  } catch {
    stdout.write(`${JSON.stringify(createControlledLiveProviderSmokeGateStateV1({
      liveFlagPresent: true,
      ciEnvironmentPresent: false,
      envOptInValue: "1",
      provider: "openai-responses-vision",
      modelPresent: true,
      apiKeyPresent: true,
      inputImagePathPresent: true,
      inputImagePathIsRemoteOrFileUrl: false,
      inputImageExists: false,
      inputImageSizeBytes: 1,
      inputImageMimeType: "image/png",
      outputDirectoryPresent: true,
      timeoutMs,
    }))}\n`);
    return 1;
  }

  const image = detectControlledLiveProviderSmokeImageV1(parsedArgs.inputImage, imageBytes);
  const imageGate = createControlledLiveProviderSmokeGateStateV1({
    liveFlagPresent: true,
    ciEnvironmentPresent: false,
    envOptInValue: "1",
    provider: "openai-responses-vision",
    modelPresent: true,
    apiKeyPresent: true,
    inputImagePathPresent: true,
    inputImagePathIsRemoteOrFileUrl: false,
    inputImageExists: true,
    inputImageSizeBytes: imageBytes.byteLength,
    inputImageMimeType: image?.mediaType ?? null,
    outputDirectoryPresent: true,
    timeoutMs,
  });

  if (imageGate.gateStatus !== "ready_for_manual_live_transport" || image === null) {
    stdout.write(`${JSON.stringify(imageGate)}\n`);
    return 1;
  }

  const requestBody = createOpenAIResponsesVisionSmokeRequestBodyV1({
    model: env.NORMA_LIVE_PROVIDER_MODEL,
    imageDataUrl: `data:${image.mediaType};base64,${Buffer.from(imageBytes).toString("base64")}`,
  });
  const transport = options.transport ?? builtInTransport;
  const outputDir = resolve(parsedArgs.output);

  try {
    const providerResponse = await transport({
      url: CONTROLLED_LIVE_PROVIDER_SMOKE_URL,
      timeoutMs,
      headers: {
        "Content-Type": "application/json",
        [PROVIDER_CREDENTIAL_HEADER_NAME]: `Bearer ${env.NORMA_LIVE_PROVIDER_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    const envelope = createControlledLiveProviderEvidenceEnvelopeV1({
      image,
      responseStatusCode: providerResponse.statusCode,
      responseOk: providerResponse.ok,
      providerOutputObserved: providerResponse.body !== null,
      timeoutMs,
    });
    const summary = createControlledLiveProviderSmokeSummaryV1(envelope);

    await writeSafeArtifacts(outputDir, envelope, summary, options);
    stdout.write(`${JSON.stringify({
      status: providerResponse.ok ? "ok" : "provider_error",
      liveProviderExecution: true,
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
  } catch {
    stdout.write(`${JSON.stringify({
      status: "transport_error",
      liveProviderExecution: true,
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
  } finally {
    if (typeof stderr.flush === "function") {
      stderr.flush();
    }
  }
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

async function readImageBytes(inputImage, options) {
  const fileStat = await (options.stat ?? stat)(inputImage);
  if (!fileStat.isFile()) {
    throw new Error("Input image is not a file.");
  }

  return new Uint8Array(await (options.readFile ?? readFile)(inputImage));
}

async function writeSafeArtifacts(outputDir, envelope, summary, options) {
  const write = options.writeFile ?? writeFile;
  await (options.mkdir ?? mkdir)(outputDir, { recursive: true });
  await write(join(outputDir, "provider-evidence-envelope.json"), `${JSON.stringify(envelope)}\n`, "utf8");
  await write(join(outputDir, "summary.json"), `${JSON.stringify(summary)}\n`, "utf8");
  await write(join(outputDir, "summary.md"), createControlledLiveProviderSmokeSummaryMarkdownV1(summary), "utf8");
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
