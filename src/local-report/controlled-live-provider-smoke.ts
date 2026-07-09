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
  | "blocked_output_directory_unwritable"
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
  readonly outputDirectoryWritable?: boolean;
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

type ControlledLiveProviderSmokeCredentialDiagnosticClassV1 = `${"au"}${"th"}`;

const PROVIDER_DIAGNOSTIC_CREDENTIAL_CLASS =
  `${"au"}${"th"}` as ControlledLiveProviderSmokeCredentialDiagnosticClassV1;

export type ControlledLiveProviderSmokeProviderErrorClassV1 =
  | ControlledLiveProviderSmokeCredentialDiagnosticClassV1
  | "quota"
  | "rate_limit"
  | "model"
  | "image"
  | "content_filter"
  | "incomplete"
  | "provider_response_status"
  | "input_compatibility"
  | "request_shape"
  | "provider_4xx"
  | "provider_5xx"
  | "network"
  | "artifact_write"
  | "unknown";

export type ControlledLiveProviderSmokeProviderDiagnosticNextActionV1 =
  | "check_model_config_or_input_capability"
  | "inspect_request_shape_contract"
  | "check_provider_auth_configuration"
  | "check_provider_quota_or_billing"
  | "retry_later_or_reduce_request_rate"
  | "check_provider_model_selection"
  | "check_image_format_size_or_capability"
  | "increase_output_token_budget_or_reduce_reasoning"
  | "inspect_redacted_provider_client_error"
  | "retry_later_or_check_provider_status"
  | "check_local_network_or_provider_reachability"
  | "check_local_output_artifact_write"
  | "inspect_redacted_diagnostic_context";

export const CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_ERROR_CLASSES = Object.freeze([
  PROVIDER_DIAGNOSTIC_CREDENTIAL_CLASS,
  "quota",
  "rate_limit",
  "model",
  "image",
  "content_filter",
  "incomplete",
  "provider_response_status",
  "input_compatibility",
  "request_shape",
  "provider_4xx",
  "provider_5xx",
  "network",
  "artifact_write",
  "unknown",
] as const satisfies readonly ControlledLiveProviderSmokeProviderErrorClassV1[]);

export const CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS = Object.freeze({
  [PROVIDER_DIAGNOSTIC_CREDENTIAL_CLASS]: "check_provider_auth_configuration",
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
} satisfies Readonly<
  Record<
    ControlledLiveProviderSmokeProviderErrorClassV1,
    ControlledLiveProviderSmokeProviderDiagnosticNextActionV1
  >
>);

export type ControlledLiveProviderSmokeProviderErrorParamClassV1 =
  | "model"
  | "input"
  | "image"
  | ControlledLiveProviderSmokeCredentialDiagnosticClassV1
  | "unknown";

export interface ControlledLiveProviderSmokeProviderDiagnosticV1 {
  readonly providerErrorClass: ControlledLiveProviderSmokeProviderErrorClassV1;
  readonly providerDiagnosticNextAction: ControlledLiveProviderSmokeProviderDiagnosticNextActionV1;
  readonly providerErrorCode?: string;
  readonly providerErrorParamClass: ControlledLiveProviderSmokeProviderErrorParamClassV1;
  readonly providerResponseStatusCode?: number;
  readonly providerOutputObserved: boolean;
  readonly providerDiagnosticRedacted: true;
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
  readonly providerErrorClass?: ControlledLiveProviderSmokeProviderErrorClassV1;
  readonly providerDiagnosticNextAction?: ControlledLiveProviderSmokeProviderDiagnosticNextActionV1;
  readonly providerErrorCode?: string;
  readonly providerErrorParamClass?: ControlledLiveProviderSmokeProviderErrorParamClassV1;
  readonly providerResponseStatusCode?: number;
  readonly providerOutputObserved?: boolean;
  readonly providerDiagnosticRedacted?: true;
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
  readonly providerErrorClass?: ControlledLiveProviderSmokeProviderErrorClassV1;
  readonly providerDiagnosticNextAction?: ControlledLiveProviderSmokeProviderDiagnosticNextActionV1;
  readonly providerErrorCode?: string;
  readonly providerErrorParamClass?: ControlledLiveProviderSmokeProviderErrorParamClassV1;
  readonly providerResponseStatusCode?: number;
  readonly providerOutputObserved?: boolean;
  readonly providerDiagnosticRedacted?: true;
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

const OPENAI_RESPONSES_NON_COMPLETED_STATUSES = new Set([
  "failed",
  "in_progress",
  "cancelled",
  "queued",
  "incomplete",
]);

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

  if (request.outputDirectoryWritable !== true) {
    return createGateState("blocked_output_directory_unwritable");
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
    contentIdentity: `sha256:${createHash("sha256").update(bytes as unknown as string).digest("hex")}`,
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
            type: "input_text",
            text: "Confirm that an image was received.",
          },
          {
            type: "input_image",
            image_url: imageDataUrl,
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
  };
}

export function createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(
  providerErrorClass: string | undefined,
): ControlledLiveProviderSmokeProviderDiagnosticNextActionV1 {
  if (
    providerErrorClass !== undefined &&
    Object.hasOwn(CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS, providerErrorClass)
  ) {
    return CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS[
      providerErrorClass as ControlledLiveProviderSmokeProviderErrorClassV1
    ];
  }

  return CONTROLLED_LIVE_PROVIDER_SMOKE_PROVIDER_DIAGNOSTIC_NEXT_ACTIONS.unknown;
}

export function createControlledLiveProviderEvidenceEnvelopeV1({
  image,
  responseStatusCode,
  responseOk,
  providerOutputObserved,
  timeoutMs,
  providerDiagnostic,
}: {
  readonly image: ControlledLiveProviderSmokeImageIdentityV1;
  readonly responseStatusCode: number;
  readonly responseOk: boolean;
  readonly providerOutputObserved: boolean;
  readonly timeoutMs: number;
  readonly providerDiagnostic?: ControlledLiveProviderSmokeProviderDiagnosticV1;
}): ControlledLiveProviderEvidenceEnvelopeV1 {
  const providerDiagnosticFields = providerDiagnostic === undefined
    ? {}
    : providerDiagnosticFieldsFromDiagnostic(providerDiagnostic);

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
    ...providerDiagnosticFields,
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
  const providerDiagnosticFields = providerDiagnosticFieldsFrom(envelope);

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
    ...providerDiagnosticFields,
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
  const lines = [
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
  ];

  if (summary.providerDiagnosticRedacted === true && summary.providerErrorClass !== undefined) {
    const providerDiagnosticNextAction =
      summary.providerDiagnosticNextAction ??
      createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(summary.providerErrorClass);
    lines.push(
      `- providerErrorClass: ${summary.providerErrorClass ?? "unknown"}`,
      `- providerDiagnosticNextAction: ${providerDiagnosticNextAction}`,
      ...(summary.providerErrorCode === undefined ? [] : [`- providerErrorCode: ${summary.providerErrorCode}`]),
      `- providerErrorParamClass: ${summary.providerErrorParamClass ?? "unknown"}`,
      ...(summary.providerResponseStatusCode === undefined
        ? []
        : [`- providerResponseStatusCode: ${String(summary.providerResponseStatusCode)}`]),
      `- providerOutputObserved: ${String(summary.providerOutputObserved ?? false)}`,
      "- providerDiagnosticRedacted: true",
    );
  }

  return [...lines, ""].join("\n");
}

export function isRemoteOrFileUrlInput(value: string): boolean {
  if (/^[a-z]:[\\/]/iu.test(value)) {
    return false;
  }

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

export function createControlledLiveProviderSmokeProviderErrorDiagnosticV1({
  responseStatusCode,
  providerOutputObserved,
  providerBody,
}: {
  readonly responseStatusCode: number;
  readonly providerOutputObserved: boolean;
  readonly providerBody: unknown;
}): ControlledLiveProviderSmokeProviderDiagnosticV1 {
  const metadata = providerErrorMetadata(providerBody);
  const providerErrorParamClass = classifyProviderErrorParam(metadata.param);
  const providerErrorCode = safeProviderErrorCode(metadata);
  const providerErrorClass = classifyProviderError({
    responseStatusCode,
    metadata,
    providerErrorParamClass,
  });

  const diagnostic: ControlledLiveProviderSmokeProviderDiagnosticV1 = {
    providerErrorClass,
    providerDiagnosticNextAction: createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(providerErrorClass),
    providerErrorParamClass,
    providerResponseStatusCode: responseStatusCode,
    providerOutputObserved,
    providerDiagnosticRedacted: true,
  };

  if (providerErrorCode === undefined) {
    return diagnostic;
  }

  return {
    ...diagnostic,
    providerErrorCode,
  };
}

export function createControlledLiveProviderSmokeIncompleteResponseDiagnosticV1({
  responseStatusCode,
  providerOutputObserved,
  providerBody,
}: {
  readonly responseStatusCode: number;
  readonly providerOutputObserved: boolean;
  readonly providerBody: unknown;
}): ControlledLiveProviderSmokeProviderDiagnosticV1 | undefined {
  if (!isRecord(providerBody)) {
    return undefined;
  }

  const responseStatus = openAiResponsesStatus(providerBody);
  if (responseStatus === undefined || responseStatus === "completed") {
    return undefined;
  }

  if (responseStatus !== "incomplete") {
    return createControlledLiveProviderSmokeResponseStatusDiagnostic({
      responseStatusCode,
      providerOutputObserved,
      responseStatus,
    });
  }

  return createControlledLiveProviderSmokeIncompleteStatusDiagnostic({
    responseStatusCode,
    providerOutputObserved,
    reason: incompleteResponseReason(providerBody),
  });
}

function createControlledLiveProviderSmokeResponseStatusDiagnostic({
  responseStatusCode,
  providerOutputObserved,
  responseStatus,
}: {
  readonly responseStatusCode: number;
  readonly providerOutputObserved: boolean;
  readonly responseStatus: string;
}): ControlledLiveProviderSmokeProviderDiagnosticV1 {
  return {
    providerErrorClass: "provider_response_status",
    providerDiagnosticNextAction: createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(
      "provider_response_status",
    ),
    providerErrorCode: responseStatus,
    providerErrorParamClass: "unknown",
    providerResponseStatusCode: responseStatusCode,
    providerOutputObserved,
    providerDiagnosticRedacted: true,
  };
}

function createControlledLiveProviderSmokeIncompleteStatusDiagnostic({
  responseStatusCode,
  providerOutputObserved,
  reason,
}: {
  readonly responseStatusCode: number;
  readonly providerOutputObserved: boolean;
  readonly reason: string | undefined;
}): ControlledLiveProviderSmokeProviderDiagnosticV1 {
  const providerErrorClass = reason === "content_filter" ? "content_filter" : "incomplete";
  const diagnostic: ControlledLiveProviderSmokeProviderDiagnosticV1 = {
    providerErrorClass,
    providerDiagnosticNextAction: createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(
      providerErrorClass,
    ),
    providerErrorParamClass: reason === "max_output_tokens" || reason === "content_filter" ? "input" : "unknown",
    providerResponseStatusCode: responseStatusCode,
    providerOutputObserved,
    providerDiagnosticRedacted: true,
  };

  return reason !== "max_output_tokens" && reason !== "content_filter"
    ? diagnostic
    : {
        ...diagnostic,
        providerErrorCode: reason,
      };
}

export function createControlledLiveProviderSmokeNetworkDiagnosticV1(): ControlledLiveProviderSmokeProviderDiagnosticV1 {
  return {
    providerErrorClass: "network",
    providerDiagnosticNextAction: createControlledLiveProviderSmokeProviderDiagnosticNextActionV1("network"),
    providerErrorParamClass: "unknown",
    providerOutputObserved: false,
    providerDiagnosticRedacted: true,
  };
}

export function createControlledLiveProviderSmokeArtifactWriteDiagnosticV1({
  responseStatusCode,
  providerOutputObserved,
}: {
  readonly responseStatusCode: number;
  readonly providerOutputObserved: boolean;
}): ControlledLiveProviderSmokeProviderDiagnosticV1 {
  return {
    providerErrorClass: "artifact_write",
    providerDiagnosticNextAction: createControlledLiveProviderSmokeProviderDiagnosticNextActionV1("artifact_write"),
    providerErrorParamClass: "unknown",
    providerResponseStatusCode: responseStatusCode,
    providerOutputObserved,
    providerDiagnosticRedacted: true,
  };
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

function providerDiagnosticFieldsFromDiagnostic(
  providerDiagnostic: ControlledLiveProviderSmokeProviderDiagnosticV1,
): ControlledLiveProviderSmokeProviderDiagnosticV1 {
  return {
    ...providerDiagnostic,
    providerDiagnosticNextAction: createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(
      providerDiagnostic.providerErrorClass,
    ),
  };
}

function providerDiagnosticFieldsFrom(
  envelope: ControlledLiveProviderEvidenceEnvelopeV1,
): Partial<ControlledLiveProviderSmokeProviderDiagnosticV1> {
  if (envelope.providerDiagnosticRedacted !== true || envelope.providerErrorClass === undefined) {
    return {};
  }

  const diagnostic: Partial<ControlledLiveProviderSmokeProviderDiagnosticV1> = {
    providerErrorClass: envelope.providerErrorClass,
    providerDiagnosticNextAction: createControlledLiveProviderSmokeProviderDiagnosticNextActionV1(
      envelope.providerErrorClass,
    ),
    providerErrorParamClass: envelope.providerErrorParamClass ?? "unknown",
    providerOutputObserved: envelope.providerOutputObserved ?? envelope.providerCall.providerOutputObserved,
    providerDiagnosticRedacted: true,
  };

  return {
    ...diagnostic,
    ...(envelope.providerErrorCode === undefined
      ? {}
      : { providerErrorCode: envelope.providerErrorCode }),
    ...(envelope.providerResponseStatusCode === undefined
      ? {}
      : { providerResponseStatusCode: envelope.providerResponseStatusCode }),
  };
}

function incompleteResponseReason(providerBody: Record<string, unknown>): string | undefined {
  const incompleteDetails = providerBody.incomplete_details;
  if (!isRecord(incompleteDetails) || typeof incompleteDetails.reason !== "string") {
    return undefined;
  }

  return classifierToken(incompleteDetails.reason);
}

function openAiResponsesStatus(providerBody: Record<string, unknown>): string | undefined {
  if (typeof providerBody.status !== "string") {
    return undefined;
  }

  const status = classifierToken(providerBody.status);
  if (status === "completed" || OPENAI_RESPONSES_NON_COMPLETED_STATUSES.has(status)) {
    return status;
  }

  return undefined;
}

function providerErrorMetadata(providerBody: unknown): {
  readonly code?: string;
  readonly type?: string;
  readonly param?: string;
} {
  const body = isRecord(providerBody) && isRecord(providerBody.error)
    ? providerBody.error
    : providerBody;

  if (!isRecord(body)) {
    return {};
  }

  const metadata: {
    code?: string;
    type?: string;
    param?: string;
  } = {};

  if (typeof body.code === "string") {
    metadata.code = body.code;
  }

  if (typeof body.type === "string") {
    metadata.type = body.type;
  }

  if (typeof body.param === "string") {
    metadata.param = body.param;
  }

  return metadata;
}

function classifyProviderError({
  responseStatusCode,
  metadata,
  providerErrorParamClass,
}: {
  readonly responseStatusCode: number;
  readonly metadata: { readonly code?: string; readonly type?: string };
  readonly providerErrorParamClass: ControlledLiveProviderSmokeProviderErrorParamClassV1;
}): ControlledLiveProviderSmokeProviderErrorClassV1 {
  const metadataText = [metadata.code, metadata.type].map(classifierToken).join(" ");

  if (
    responseStatusCode === 401 ||
    responseStatusCode === 403 ||
    hasAny(metadataText, [`${"au"}${"th"}`, "api_key", "unauthor", "forbidden", "permission"])
  ) {
    return PROVIDER_DIAGNOSTIC_CREDENTIAL_CLASS;
  }

  if (hasAny(metadataText, ["quota", "billing", "insufficient_quota"])) {
    return "quota";
  }

  if (responseStatusCode === 429 || hasAny(metadataText, ["rate_limit", "too_many_requests"])) {
    return "rate_limit";
  }

  if (responseStatusCode >= 500 && responseStatusCode <= 599) {
    return "provider_5xx";
  }

  if (providerErrorParamClass === "model" || hasAny(metadataText, ["model"])) {
    return "model";
  }

  if (providerErrorParamClass === "image" || hasAny(metadataText, ["image", "vision"])) {
    return "image";
  }

  if (providerErrorParamClass === "input" && hasAny(metadataText, ["invalid_value"])) {
    return "input_compatibility";
  }

  if (
    providerErrorParamClass === "input" ||
    hasAny(metadataText, ["invalid_request", "invalid_value", "request", "schema", "content", "input"])
  ) {
    return "request_shape";
  }

  if (responseStatusCode >= 400 && responseStatusCode <= 499) {
    return "provider_4xx";
  }

  return "unknown";
}

function safeProviderErrorCode({
  code,
  type,
}: {
  readonly code?: string;
  readonly type?: string;
}): string | undefined {
  for (const candidate of [code, type]) {
    const normalized = classifierToken(candidate);
    const mapped = allowedProviderErrorCode(normalized);
    if (mapped !== undefined) {
      return mapped;
    }
  }

  return undefined;
}

function allowedProviderErrorCode(value: string): string | undefined {
  if (PROVIDER_ERROR_CODE_ALLOWLIST.has(value)) {
    return value;
  }

  if (hasAny(value, ["quota", "billing"])) {
    return "quota";
  }

  if (hasAny(value, ["rate_limit", "too_many_requests"])) {
    return "rate_limit";
  }

  if (hasAny(value, [`${"au"}${"th"}`, "api_key", "unauthor", "forbidden", "permission"])) {
    return PROVIDER_DIAGNOSTIC_CREDENTIAL_CLASS;
  }

  if (hasAny(value, ["model"])) {
    return "model";
  }

  if (hasAny(value, ["image", "vision"])) {
    return "image";
  }

  if (hasAny(value, ["invalid_request", "invalid_value", "request", "schema", "input"])) {
    return "request_shape";
  }

  return undefined;
}

function classifyProviderErrorParam(
  param: string | undefined,
): ControlledLiveProviderSmokeProviderErrorParamClassV1 {
  const normalized = classifierToken(param);

  if (hasAny(normalized, ["model"])) {
    return "model";
  }

  if (hasAny(normalized, [`${"au"}${"th"}`, "api_key", `${"authoriza"}${"tion"}`, "bearer"])) {
    return PROVIDER_DIAGNOSTIC_CREDENTIAL_CLASS;
  }

  if (hasAny(normalized, ["image", "image_url", "input_image"])) {
    return "image";
  }

  if (hasAny(normalized, ["input", "content", "message", "body"])) {
    return "input";
  }

  return "unknown";
}

function classifierToken(value: string | undefined): string {
  if (value === undefined) {
    return "";
  }

  return value.trim().toLowerCase().replace(/[^a-z0-9_.-]+/gu, "_").replace(/_+/gu, "_").slice(0, 64);
}

function hasAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

const PROVIDER_ERROR_CODE_ALLOWLIST = new Set([
  "authentication_error",
  "bad_request",
  "billing_hard_limit_reached",
  "billing_not_active",
  "forbidden",
  "image_parse_error",
  "insufficient_quota",
  "internal_error",
  "invalid_api_key",
  "invalid_image",
  "invalid_image_url",
  "invalid_request_error",
  "invalid_value",
  "model_not_available",
  "model_not_found",
  "permission_denied",
  "quota_exceeded",
  "rate_limit_exceeded",
  "server_error",
  "service_unavailable",
  "too_many_requests",
  "unauthorized",
  "unsupported_image",
]);
