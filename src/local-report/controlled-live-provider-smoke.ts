import { createHash } from "node:crypto";

import { createDisabledLiveProviderExperimentHarnessStateV1 } from "./disabled-live-provider-experiment-harness.js";

export type ControlledLiveProviderSmokeGateStatusV1 =
  | "blocked_disabled_by_default"
  | "blocked_ci_live_network_dependency"
  | "blocked_missing_env_opt_in"
  | "blocked_missing_provider_selection"
  | "blocked_missing_provider_model"
  | "blocked_missing_provider_api_key"
  | "blocked_missing_input_image_path"
  | "blocked_remote_or_file_url_input"
  | "blocked_input_image_not_found"
  | "blocked_input_image_too_large"
  | "blocked_unsupported_image_type"
  | "blocked_missing_output_directory"
  | "blocked_invalid_timeout"
  | "ready_for_manual_live_transport";

export type ControlledLiveProviderSmokeProviderV1 = "openai-responses-vision";

export interface ControlledLiveProviderSmokeGateRequestV1 {
  readonly liveFlagPresent?: boolean;
  readonly ciEnvironmentPresent?: boolean;
  readonly envOptInValue?: string | undefined;
  readonly provider?: string | undefined;
  readonly modelPresent?: boolean;
  readonly apiKeyPresent?: boolean;
  readonly inputImagePathPresent?: boolean;
  readonly inputImagePathIsRemoteOrFileUrl?: boolean;
  readonly inputImageExists?: boolean;
  readonly inputImageSizeBytes?: number;
  readonly inputImageMimeType?: string | null;
  readonly outputDirectoryPresent?: boolean;
  readonly timeoutMs?: number;
}

export interface ControlledLiveProviderSmokeGateStateV1 {
  readonly smokeKind: "norma.controlled-live-provider-smoke.gate.v1";
  readonly gateStatus: ControlledLiveProviderSmokeGateStatusV1;
  readonly disabledByDefault: true;
  readonly manualOnly: true;
  readonly failClosed: true;
  readonly localOnly: true;
  readonly liveProviderExecution: false;
  readonly ciLiveNetworkDependency: false;
  readonly providerEvidenceOnly: true;
  readonly requiresExplicitAcceptance: true;
  readonly providerOutputIsCoreTruth: false;
  readonly acceptedStructuredGeometryOnlyCoreInput: true;
  readonly rawProviderOutputPersisted: false;
  readonly rawImagePersisted: false;
  readonly redacted: true;
  readonly pr116Harness: {
    readonly harnessKind: "norma.disabled-local-live-provider-experiment-harness.v1";
    readonly disabledByDefault: true;
    readonly manualOnly: true;
    readonly failClosed: true;
    readonly liveProviderExecution: false;
  };
  readonly requiredGates: {
    readonly liveFlag: "--live";
    readonly envOptIn: "NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT=1";
    readonly provider: "NORMA_LIVE_PROVIDER=openai-responses-vision";
    readonly modelEnv: "NORMA_LIVE_PROVIDER_MODEL";
    readonly apiKeyEnvPresence: "NORMA_LIVE_PROVIDER_API_KEY";
    readonly inputImageFlag: "--input-image";
    readonly outputDirectoryFlag: "--output";
    readonly boundedTimeout: true;
  };
}

export interface ControlledLiveProviderSmokeImageIdentityV1 {
  readonly contentIdentity: string;
  readonly mediaType: "image/png" | "image/jpeg" | "image/webp";
  readonly sizeBytes: number;
  readonly sourcePathPersisted: false;
  readonly rawImagePersisted: false;
  readonly base64Persisted: false;
}

export interface ControlledLiveProviderSmokeProviderCallMetadataV1 {
  readonly provider: ControlledLiveProviderSmokeProviderV1;
  readonly modelConfigured: true;
  readonly endpointKind: "openai_responses_api";
  readonly timeoutMs: number;
  readonly credentialHeaderPersisted: false;
  readonly requestBodyPersisted: false;
  readonly rawProviderOutputPersisted: false;
  readonly responseStatusCode: number;
  readonly responseClass: "success" | "provider_error";
  readonly providerOutputObserved: boolean;
  readonly providerOutputTextPersisted: false;
}

export interface ControlledLiveProviderEvidenceEnvelopeV1 {
  readonly kind: "norma.controlled-live-provider-smoke.provider-evidence-envelope.v1";
  readonly version: 1;
  readonly liveProviderExecution: true;
  readonly manualOnly: true;
  readonly localOnly: true;
  readonly providerEvidenceOnly: true;
  readonly requiresExplicitAcceptance: true;
  readonly providerOutputIsCoreTruth: false;
  readonly acceptedStructuredGeometryOnlyCoreInput: true;
  readonly acceptedStructuredGeometryProduced: false;
  readonly coreInputProduced: false;
  readonly resultJsonProduced: false;
  readonly providerSelfAcceptance: false;
  readonly confidenceScoreValueCanAuthorizeAcceptance: false;
  readonly promptArtifactOrMetricPolicyCanAuthorizeAcceptance: false;
  readonly rawProviderOutputPersisted: false;
  readonly rawImagePersisted: false;
  readonly redacted: true;
  readonly ciLiveNetworkDependency: false;
  readonly image: ControlledLiveProviderSmokeImageIdentityV1;
  readonly providerCall: ControlledLiveProviderSmokeProviderCallMetadataV1;
  readonly evidenceSummary: {
    readonly providerOutputObserved: boolean;
    readonly persistedObservationClass: "redacted_provider_response_observed" | "redacted_provider_error_observed";
    readonly providerNeutralObservationTextPersisted: false;
    readonly lowCardinalityOnly: true;
  };
}

export interface ControlledLiveProviderSmokeSummaryV1 {
  readonly kind: "norma.controlled-live-provider-smoke.summary.v1";
  readonly liveProviderExecution: boolean;
  readonly providerEvidenceOnly: true;
  readonly requiresExplicitAcceptance: true;
  readonly providerOutputIsCoreTruth: false;
  readonly acceptedStructuredGeometryOnlyCoreInput: true;
  readonly rawProviderOutputPersisted: false;
  readonly redacted: true;
  readonly ciLiveNetworkDependency: false;
  readonly artifacts: readonly [
    "provider-evidence-envelope.json",
    "summary.json",
    "summary.md",
  ];
  readonly nonGoals: readonly string[];
}

export const CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const CONTROLLED_LIVE_PROVIDER_SMOKE_DEFAULT_TIMEOUT_MS = 30_000;
export const CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_TIMEOUT_MS = 30_000;

const REQUIRED_GATES = Object.freeze({
  liveFlag: "--live",
  envOptIn: "NORMA_ENABLE_LIVE_PROVIDER_EXPERIMENT=1",
  provider: "NORMA_LIVE_PROVIDER=openai-responses-vision",
  modelEnv: "NORMA_LIVE_PROVIDER_MODEL",
  apiKeyEnvPresence: "NORMA_LIVE_PROVIDER_API_KEY",
  inputImageFlag: "--input-image",
  outputDirectoryFlag: "--output",
  boundedTimeout: true,
} as const);

export function createControlledLiveProviderSmokeDefaultStateV1(): ControlledLiveProviderSmokeGateStateV1 {
  return createGateState("blocked_disabled_by_default");
}

export function createControlledLiveProviderSmokeGateStateV1(
  request: ControlledLiveProviderSmokeGateRequestV1,
): ControlledLiveProviderSmokeGateStateV1 {
  if (request.liveFlagPresent !== true) {
    return createGateState("blocked_disabled_by_default");
  }

  if (request.ciEnvironmentPresent === true) {
    return createGateState("blocked_ci_live_network_dependency");
  }

  if (request.envOptInValue !== "1") {
    return createGateState("blocked_missing_env_opt_in");
  }

  if (request.provider !== "openai-responses-vision") {
    return createGateState("blocked_missing_provider_selection");
  }

  if (request.modelPresent !== true) {
    return createGateState("blocked_missing_provider_model");
  }

  if (request.apiKeyPresent !== true) {
    return createGateState("blocked_missing_provider_api_key");
  }

  if (request.inputImagePathPresent !== true) {
    return createGateState("blocked_missing_input_image_path");
  }

  if (request.inputImagePathIsRemoteOrFileUrl === true) {
    return createGateState("blocked_remote_or_file_url_input");
  }

  if (request.inputImageExists !== true) {
    return createGateState("blocked_input_image_not_found");
  }

  if (
    typeof request.inputImageSizeBytes !== "number" ||
    request.inputImageSizeBytes <= 0 ||
    request.inputImageSizeBytes > CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES
  ) {
    return createGateState("blocked_input_image_too_large");
  }

  if (!isSupportedImageMimeType(request.inputImageMimeType)) {
    return createGateState("blocked_unsupported_image_type");
  }

  if (request.outputDirectoryPresent !== true) {
    return createGateState("blocked_missing_output_directory");
  }

  if (!isValidTimeoutMs(request.timeoutMs)) {
    return createGateState("blocked_invalid_timeout");
  }

  return createGateState("ready_for_manual_live_transport");
}

export function detectControlledLiveProviderSmokeImageV1(
  filePath: string,
  bytes: Uint8Array,
): ControlledLiveProviderSmokeImageIdentityV1 | null {
  const mediaType = mediaTypeFor(filePath, bytes);
  if (mediaType === null || bytes.byteLength === 0 || bytes.byteLength > CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_IMAGE_BYTES) {
    return null;
  }

  return {
    contentIdentity: `sha256:${createHash("sha256").update(hexStringForHash(bytes)).digest("hex")}`,
    mediaType,
    sizeBytes: bytes.byteLength,
    sourcePathPersisted: false,
    rawImagePersisted: false,
    base64Persisted: false,
  };
}

export function createOpenAIResponsesVisionSmokeRequestBodyV1({
  model,
  imageDataUrl,
}: {
  readonly model: string;
  readonly imageDataUrl: string;
}): Record<string, unknown> {
  return {
    model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: imageDataUrl,
            detail: "low",
          },
        ],
      },
    ],
    max_output_tokens: 80,
  };
}

export function createControlledLiveProviderEvidenceEnvelopeV1({
  image,
  responseStatusCode,
  responseOk,
  providerOutputObserved,
  timeoutMs,
}: {
  readonly image: ControlledLiveProviderSmokeImageIdentityV1;
  readonly responseStatusCode: number;
  readonly responseOk: boolean;
  readonly providerOutputObserved: boolean;
  readonly timeoutMs: number;
}): ControlledLiveProviderEvidenceEnvelopeV1 {
  return {
    kind: "norma.controlled-live-provider-smoke.provider-evidence-envelope.v1",
    version: 1,
    liveProviderExecution: true,
    manualOnly: true,
    localOnly: true,
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    resultJsonProduced: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    promptArtifactOrMetricPolicyCanAuthorizeAcceptance: false,
    rawProviderOutputPersisted: false,
    rawImagePersisted: false,
    redacted: true,
    ciLiveNetworkDependency: false,
    image,
    providerCall: {
      provider: "openai-responses-vision",
      modelConfigured: true,
      endpointKind: "openai_responses_api",
      timeoutMs,
      credentialHeaderPersisted: false,
      requestBodyPersisted: false,
      rawProviderOutputPersisted: false,
      responseStatusCode,
      responseClass: responseOk ? "success" : "provider_error",
      providerOutputObserved,
      providerOutputTextPersisted: false,
    },
    evidenceSummary: {
      providerOutputObserved,
      persistedObservationClass: responseOk
        ? "redacted_provider_response_observed"
        : "redacted_provider_error_observed",
      providerNeutralObservationTextPersisted: false,
      lowCardinalityOnly: true,
    },
  };
}

export function createControlledLiveProviderSmokeSummaryV1(
  envelope: ControlledLiveProviderEvidenceEnvelopeV1,
): ControlledLiveProviderSmokeSummaryV1 {
  return {
    kind: "norma.controlled-live-provider-smoke.summary.v1",
    liveProviderExecution: envelope.liveProviderExecution,
    providerEvidenceOnly: true,
    requiresExplicitAcceptance: true,
    providerOutputIsCoreTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    rawProviderOutputPersisted: false,
    redacted: true,
    ciLiveNetworkDependency: false,
    artifacts: [
      "provider-evidence-envelope.json",
      "summary.json",
      "summary.md",
    ],
    nonGoals: [
      "not production OpenAI integration",
      "not provider output truth",
      "not accepted structured geometry",
      "not Core input",
      "not result.json production",
      "not CI live-network behavior",
      "not package API or export expansion",
    ],
  };
}

export function createControlledLiveProviderSmokeSummaryMarkdownV1(
  summary: ControlledLiveProviderSmokeSummaryV1,
): string {
  return [
    "# Controlled Live Provider Smoke Summary",
    "",
    `- liveProviderExecution: ${String(summary.liveProviderExecution)}`,
    "- providerEvidenceOnly: true",
    "- requiresExplicitAcceptance: true",
    "- providerOutputIsCoreTruth: false",
    "- acceptedStructuredGeometryOnlyCoreInput: true",
    "- rawProviderOutputPersisted: false",
    "- redacted: true",
    "- ciLiveNetworkDependency: false",
    "",
  ].join("\n");
}

export function isRemoteOrFileUrlInput(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

export function isValidTimeoutMs(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= CONTROLLED_LIVE_PROVIDER_SMOKE_MAX_TIMEOUT_MS
  );
}

function createGateState(
  gateStatus: ControlledLiveProviderSmokeGateStatusV1,
): ControlledLiveProviderSmokeGateStateV1 {
  const pr116Harness = createDisabledLiveProviderExperimentHarnessStateV1();

  return {
    smokeKind: "norma.controlled-live-provider-smoke.gate.v1",
    gateStatus,
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
      harnessKind: pr116Harness.harnessKind,
      disabledByDefault: pr116Harness.disabledByDefault,
      manualOnly: pr116Harness.manualOnly,
      failClosed: pr116Harness.failClosed,
      liveProviderExecution: pr116Harness.liveProviderExecution,
    },
    requiredGates: REQUIRED_GATES,
  };
}

function mediaTypeFor(
  filePath: string,
  bytes: Uint8Array,
): ControlledLiveProviderSmokeImageIdentityV1["mediaType"] | null {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".png") && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if ((lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) && hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    lowerPath.endsWith(".webp") &&
    hasAsciiAt(bytes, 0, "RIFF") &&
    hasAsciiAt(bytes, 8, "WEBP")
  ) {
    return "image/webp";
  }

  return null;
}

function isSupportedImageMimeType(value: string | null | undefined): value is ControlledLiveProviderSmokeImageIdentityV1["mediaType"] {
  return value === "image/png" || value === "image/jpeg" || value === "image/webp";
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return bytes.byteLength >= prefix.length && prefix.every((byte, index) => bytes[index] === byte);
}

function hasAsciiAt(bytes: Uint8Array, offset: number, expected: string): boolean {
  if (bytes.byteLength < offset + expected.length) {
    return false;
  }

  return [...expected].every((char, index) => bytes[offset + index] === char.charCodeAt(0));
}

function hexStringForHash(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
