import {
  createControlledLiveProviderSmokeArtifactProofV1,
  type ControlledLiveProviderCandidateArtifactProofV1,
  type ControlledLiveProviderSmokeArtifactProofV1,
} from "./controlled-live-provider-smoke-artifact-proof.js";
import {
  validateLocalVisualProviderExecutionReceiptV1,
  type LocalVisualProviderExecutionReceiptV1,
} from "./controlled-local-live-visual-candidate-observation-contracts.js";

export type ControlledProviderObservationMediaTypeClassV1 =
  | "raster_png"
  | "raster_jpeg"
  | "raster_webp"
  | "unknown_redacted_media_type";

export type ControlledProviderObservationImageSizeClassV1 =
  | "small"
  | "medium"
  | "large"
  | "unknown_redacted_size";

export type ControlledProviderObservationProviderClassV1 =
  | "controlled_live_provider"
  | "unknown_redacted_provider";

export type ControlledProviderObservationEndpointClassV1 =
  | "responses_api"
  | "unknown_redacted_endpoint";

export type ControlledProviderObservationResponseStatusClassV1 =
  | "2xx_success"
  | "unknown_redacted_status";

export interface ControlledProviderObservationContractV1 {
  readonly kind: "norma.controlled-provider-observation-contract.v1";
  readonly version: 1;
  readonly observationId: string;
  readonly providerEvidenceOnly: true;
  readonly untrusted: true;
  readonly nonAuthoritative: true;
  readonly sourceArtifactsRedacted: true;
  readonly sourceArtifactKinds: readonly ControlledLiveProviderSmokeArtifactProofV1["sourceArtifactKinds"][number][];
  readonly providerOutputObserved: true;
  readonly redactedDiagnosticClass: null;
  readonly redactedDiagnosticNextAction: null;
  readonly imageContentIdentity: string | null;
  readonly mediaTypeClass: ControlledProviderObservationMediaTypeClassV1;
  readonly imageSizeClass: ControlledProviderObservationImageSizeClassV1;
  readonly providerClass: ControlledProviderObservationProviderClassV1;
  readonly endpointClass: ControlledProviderObservationEndpointClassV1;
  readonly responseStatusClass: ControlledProviderObservationResponseStatusClassV1;
  readonly acceptedGeometry: false;
  readonly acceptedStructuredGeometryProduced: false;
  readonly coreInputProduced: false;
  readonly structuredAnalyzeInputProduced: false;
  readonly structuredAnalyzeRun: false;
  readonly resultJsonProduced: false;
  readonly resultJsonCanonicalTruth: false;
  readonly sourceTruth: false;
  readonly packageApiTruth: false;
  readonly connectorTruth: false;
  readonly hostedTruth: false;
  readonly metricPolicyAuthority: false;
  readonly providerSelfAcceptance: false;
  readonly confidenceScoreValueCanAuthorizeAcceptance: false;
  readonly providerStatusCanAuthorizeAcceptance: false;
  readonly providerDiagnosticCanAuthorizeAcceptance: false;
  readonly providerMetadataCanAuthorizeAcceptance: false;
  readonly artifactCanAuthorizeAcceptance: false;
  readonly cannotSelfAccept: true;
  readonly requiresExplicitFutureAcceptance: true;
  readonly nextAllowedStep: "explicit_acceptance_contract_required";
}

export interface ControlledProviderObservationContractV2
  extends Omit<ControlledProviderObservationContractV1, "kind" | "version"> {
  readonly kind: "norma.controlled-provider-observation-contract.v2";
  readonly version: 2;
  readonly providerExecutionReceiptContentIdentity: string;
}

type ControlledProviderObservationInputV1 =
  | ControlledLiveProviderSmokeArtifactProofV1
  | {
      readonly providerEvidenceEnvelope: unknown;
      readonly summary: unknown;
    }
  | {
      readonly artifactProof: ControlledLiveProviderSmokeArtifactProofV1;
      readonly providerEvidenceEnvelope?: unknown;
      readonly summary?: unknown;
    };

class ControlledProviderObservationContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlledProviderObservationContractError";
  }
}

const ARTIFACT_PROOF_FIELDS = Object.freeze([
  "status",
  "smokeStatus",
  "providerEvidenceOnly",
  "providerOutputObserved",
  "providerOutputIsCoreTruth",
  "providerOutputIsAcceptedGeometry",
  "acceptedStructuredGeometryProduced",
  "coreInputProduced",
  "structuredAnalyzeRun",
  "resultJsonProduced",
  "resultJsonCanonicalTruth",
  "acceptedStructuredGeometryOnlyCoreInput",
  "sourceArtifactsRedacted",
  "rawProviderOutputPersisted",
  "rawRequestBodyPersisted",
  "rawImagePersisted",
  "sourceArtifactKinds",
  "derivedArtifactRefs",
  "nextAllowedStep",
] as const);

const CANDIDATE_ARTIFACT_PROOF_FIELDS = Object.freeze([
  ...ARTIFACT_PROOF_FIELDS,
  "providerExecutionReceiptContentIdentity",
] as const);

const PROVIDER_OBSERVATION_V2_FIELDS = Object.freeze([
  "kind",
  "version",
  "observationId",
  "providerExecutionReceiptContentIdentity",
  "providerEvidenceOnly",
  "untrusted",
  "nonAuthoritative",
  "sourceArtifactsRedacted",
  "sourceArtifactKinds",
  "providerOutputObserved",
  "redactedDiagnosticClass",
  "redactedDiagnosticNextAction",
  "imageContentIdentity",
  "mediaTypeClass",
  "imageSizeClass",
  "providerClass",
  "endpointClass",
  "responseStatusClass",
  "acceptedGeometry",
  "acceptedStructuredGeometryProduced",
  "coreInputProduced",
  "structuredAnalyzeInputProduced",
  "structuredAnalyzeRun",
  "resultJsonProduced",
  "resultJsonCanonicalTruth",
  "sourceTruth",
  "packageApiTruth",
  "connectorTruth",
  "hostedTruth",
  "metricPolicyAuthority",
  "providerSelfAcceptance",
  "confidenceScoreValueCanAuthorizeAcceptance",
  "providerStatusCanAuthorizeAcceptance",
  "providerDiagnosticCanAuthorizeAcceptance",
  "providerMetadataCanAuthorizeAcceptance",
  "artifactCanAuthorizeAcceptance",
  "cannotSelfAccept",
  "requiresExplicitFutureAcceptance",
  "nextAllowedStep",
] as const);

export function createControlledProviderObservationContractV1(
  input: ControlledProviderObservationInputV1,
): ControlledProviderObservationContractV1 {
  rejectUnsafeContent(input, "input");

  const record = requirePlainRecord(input, "input");
  const artifactProof = resolveArtifactProof(record);
  validateArtifactProof(artifactProof);

  const providerEvidenceEnvelope = resolveProviderEvidenceEnvelope(record);
  const image = optionalPlainRecord(providerEvidenceEnvelope?.image, "input.providerEvidenceEnvelope.image");
  const providerCall = optionalPlainRecord(
    providerEvidenceEnvelope?.providerCall,
    "input.providerEvidenceEnvelope.providerCall",
  );

  return {
    kind: "norma.controlled-provider-observation-contract.v1",
    version: 1,
    observationId: observationIdFor(artifactProof, image),
    providerEvidenceOnly: true,
    untrusted: true,
    nonAuthoritative: true,
    sourceArtifactsRedacted: true,
    sourceArtifactKinds: [...artifactProof.sourceArtifactKinds],
    providerOutputObserved: true,
    redactedDiagnosticClass: null,
    redactedDiagnosticNextAction: null,
    imageContentIdentity: safeImageContentIdentity(image?.contentIdentity),
    mediaTypeClass: mediaTypeClassFor(image?.mediaType),
    imageSizeClass: imageSizeClassFor(image?.sizeBytes),
    providerClass: providerClassFor(providerCall?.provider),
    endpointClass: endpointClassFor(providerCall?.endpointKind),
    responseStatusClass: responseStatusClassFor(providerCall?.responseStatusCode),
    acceptedGeometry: false,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    resultJsonCanonicalTruth: false,
    sourceTruth: false,
    packageApiTruth: false,
    connectorTruth: false,
    hostedTruth: false,
    metricPolicyAuthority: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    providerStatusCanAuthorizeAcceptance: false,
    providerDiagnosticCanAuthorizeAcceptance: false,
    providerMetadataCanAuthorizeAcceptance: false,
    artifactCanAuthorizeAcceptance: false,
    cannotSelfAccept: true,
    requiresExplicitFutureAcceptance: true,
    nextAllowedStep: "explicit_acceptance_contract_required",
  };
}

export function createControlledProviderObservationContractV2(input: {
  readonly artifactProof: ControlledLiveProviderCandidateArtifactProofV1;
  readonly providerExecutionReceipt: LocalVisualProviderExecutionReceiptV1;
}): ControlledProviderObservationContractV2 {
  rejectUnsafeContent(input, "input");
  const record = requirePlainRecord(input, "input");
  rejectUnknownFields(record, ["artifactProof", "providerExecutionReceipt"], "input");
  const proof = requirePlainRecord(
    record.artifactProof,
    "input.artifactProof",
  ) as unknown as ControlledLiveProviderCandidateArtifactProofV1;
  validateCandidateArtifactProof(proof);
  const receipt = validateLocalVisualProviderExecutionReceiptV1(record.providerExecutionReceipt);
  if (proof.providerExecutionReceiptContentIdentity !== receipt.executionReceiptContentIdentity) {
    throw invalid(
      "input.artifactProof.providerExecutionReceiptContentIdentity",
      "must match execution receipt",
    );
  }
  return createCandidateObservationFromReceipt(receipt, proof.sourceArtifactKinds);
}

export function restoreControlledProviderObservationContractV2FromReceipt(
  providerExecutionReceipt: LocalVisualProviderExecutionReceiptV1,
): ControlledProviderObservationContractV2 {
  const receipt = validateLocalVisualProviderExecutionReceiptV1(providerExecutionReceipt);
  return createCandidateObservationFromReceipt(receipt, [
    "provider-evidence-envelope.json",
    "summary.json",
  ]);
}

export function validateControlledProviderObservationContractV2(
  value: unknown,
): ControlledProviderObservationContractV2 {
  rejectUnsafeContent(value, "providerObservationContract");
  const record = requirePlainRecord(
    value,
    "providerObservationContract",
  ) as unknown as ControlledProviderObservationContractV2;
  rejectUnknownFields(
    record as unknown as Record<string, unknown>,
    PROVIDER_OBSERVATION_V2_FIELDS,
    "providerObservationContract",
  );
  const expectedValues = [
    ["kind", "norma.controlled-provider-observation-contract.v2"],
    ["version", 2],
    ["providerEvidenceOnly", true],
    ["untrusted", true],
    ["nonAuthoritative", true],
    ["sourceArtifactsRedacted", true],
    ["providerOutputObserved", true],
    ["redactedDiagnosticClass", null],
    ["redactedDiagnosticNextAction", null],
    ["acceptedGeometry", false],
    ["acceptedStructuredGeometryProduced", false],
    ["coreInputProduced", false],
    ["structuredAnalyzeInputProduced", false],
    ["structuredAnalyzeRun", false],
    ["resultJsonProduced", false],
    ["resultJsonCanonicalTruth", false],
    ["sourceTruth", false],
    ["packageApiTruth", false],
    ["connectorTruth", false],
    ["hostedTruth", false],
    ["metricPolicyAuthority", false],
    ["providerSelfAcceptance", false],
    ["confidenceScoreValueCanAuthorizeAcceptance", false],
    ["providerStatusCanAuthorizeAcceptance", false],
    ["providerDiagnosticCanAuthorizeAcceptance", false],
    ["providerMetadataCanAuthorizeAcceptance", false],
    ["artifactCanAuthorizeAcceptance", false],
    ["cannotSelfAccept", true],
    ["requiresExplicitFutureAcceptance", true],
    ["nextAllowedStep", "explicit_acceptance_contract_required"],
  ] as const;
  for (const [field, expected] of expectedValues) {
    if ((record as unknown as Record<string, unknown>)[field] !== expected) {
      throw invalid(`providerObservationContract.${field}`, `requires ${String(expected)}`);
    }
  }
  if (!/^sha256:[0-9a-f]{64}$/u.test(record.providerExecutionReceiptContentIdentity)) {
    throw invalid(
      "providerObservationContract.providerExecutionReceiptContentIdentity",
      "requires SHA-256 content identity",
    );
  }
  const expectedId = `controlled-provider-observation:v2:${record.providerExecutionReceiptContentIdentity.slice("sha256:".length)}`;
  if (record.observationId !== expectedId) {
    throw invalid("providerObservationContract.observationId", "must derive from execution receipt identity");
  }
  if (record.imageContentIdentity === null || !/^sha256:[0-9a-f]{64}$/u.test(record.imageContentIdentity)) {
    throw invalid("providerObservationContract.imageContentIdentity", "requires non-null SHA-256 identity");
  }
  requireExactStringArray(record.sourceArtifactKinds, "providerObservationContract.sourceArtifactKinds", [
    "provider-evidence-envelope.json",
    "summary.json",
  ]);
  if (!["raster_png", "raster_jpeg", "raster_webp", "unknown_redacted_media_type"].includes(record.mediaTypeClass)) {
    throw invalid("providerObservationContract.mediaTypeClass", "requires redacted media type class");
  }
  if (!["small", "medium", "large", "unknown_redacted_size"].includes(record.imageSizeClass)) {
    throw invalid("providerObservationContract.imageSizeClass", "requires redacted image size class");
  }
  if (record.providerClass !== "controlled_live_provider"
    || record.endpointClass !== "responses_api"
    || record.responseStatusClass !== "2xx_success") {
    throw invalid("providerObservationContract", "requires candidate-capable redacted provider classes");
  }
  return structuredClone(record);
}

function createCandidateObservationFromReceipt(
  receipt: LocalVisualProviderExecutionReceiptV1,
  sourceArtifactKinds: ControlledProviderObservationContractV2["sourceArtifactKinds"],
): ControlledProviderObservationContractV2 {
  const receiptHex = receipt.executionReceiptContentIdentity.slice("sha256:".length);
  return {
    kind: "norma.controlled-provider-observation-contract.v2",
    version: 2,
    observationId: `controlled-provider-observation:v2:${receiptHex}`,
    providerExecutionReceiptContentIdentity: receipt.executionReceiptContentIdentity,
    providerEvidenceOnly: true,
    untrusted: true,
    nonAuthoritative: true,
    sourceArtifactsRedacted: true,
    sourceArtifactKinds: [...sourceArtifactKinds],
    providerOutputObserved: true,
    redactedDiagnosticClass: null,
    redactedDiagnosticNextAction: null,
    imageContentIdentity: receipt.sourceImageContentIdentity,
    mediaTypeClass: "unknown_redacted_media_type",
    imageSizeClass: "unknown_redacted_size",
    providerClass: receipt.providerClass,
    endpointClass: receipt.endpointClass,
    responseStatusClass: receipt.responseStatusClass,
    acceptedGeometry: false,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    resultJsonCanonicalTruth: false,
    sourceTruth: false,
    packageApiTruth: false,
    connectorTruth: false,
    hostedTruth: false,
    metricPolicyAuthority: false,
    providerSelfAcceptance: false,
    confidenceScoreValueCanAuthorizeAcceptance: false,
    providerStatusCanAuthorizeAcceptance: false,
    providerDiagnosticCanAuthorizeAcceptance: false,
    providerMetadataCanAuthorizeAcceptance: false,
    artifactCanAuthorizeAcceptance: false,
    cannotSelfAccept: true,
    requiresExplicitFutureAcceptance: true,
    nextAllowedStep: "explicit_acceptance_contract_required",
  };
}

function validateCandidateArtifactProof(
  proof: ControlledLiveProviderCandidateArtifactProofV1,
): void {
  rejectUnknownFields(
    proof as unknown as Record<string, unknown>,
    CANDIDATE_ARTIFACT_PROOF_FIELDS,
    "input.artifactProof",
  );
  const { providerExecutionReceiptContentIdentity: _identity, ...v1Projection } = proof;
  validateArtifactProof(v1Projection as ControlledLiveProviderSmokeArtifactProofV1);
  if (!/^sha256:[0-9a-f]{64}$/u.test(proof.providerExecutionReceiptContentIdentity)) {
    throw invalid(
      "input.artifactProof.providerExecutionReceiptContentIdentity",
      "requires SHA-256 content identity",
    );
  }
}

function resolveArtifactProof(record: Record<string, unknown>): ControlledLiveProviderSmokeArtifactProofV1 {
  if (isArtifactProof(record)) {
    return record as unknown as ControlledLiveProviderSmokeArtifactProofV1;
  }

  if ("artifactProof" in record) {
    const proof = requirePlainRecord(record.artifactProof, "input.artifactProof");
    if (!isArtifactProof(proof)) {
      throw invalid("input.artifactProof", "requires PR123 smoke artifact proof");
    }
    return proof as unknown as ControlledLiveProviderSmokeArtifactProofV1;
  }

  return createControlledLiveProviderSmokeArtifactProofV1(record);
}

function resolveProviderEvidenceEnvelope(record: Record<string, unknown>): Record<string, unknown> | null {
  const providerEvidenceEnvelope = optionalPlainRecord(
    record.providerEvidenceEnvelope,
    "input.providerEvidenceEnvelope",
  );

  if ("artifactProof" in record) {
    return null;
  }

  return providerEvidenceEnvelope;
}

function validateArtifactProof(proof: ControlledLiveProviderSmokeArtifactProofV1): void {
  rejectUnknownFields(proof as unknown as Record<string, unknown>, ARTIFACT_PROOF_FIELDS, "artifactProof");

  const expectedValues = [
    ["status", "ok"],
    ["smokeStatus", "ok"],
    ["providerEvidenceOnly", true],
    ["providerOutputObserved", true],
    ["providerOutputIsCoreTruth", false],
    ["providerOutputIsAcceptedGeometry", false],
    ["acceptedStructuredGeometryProduced", false],
    ["coreInputProduced", false],
    ["structuredAnalyzeRun", false],
    ["resultJsonProduced", false],
    ["resultJsonCanonicalTruth", false],
    ["acceptedStructuredGeometryOnlyCoreInput", true],
    ["sourceArtifactsRedacted", true],
    ["rawProviderOutputPersisted", false],
    ["rawRequestBodyPersisted", false],
    ["rawImagePersisted", false],
    ["nextAllowedStep", "controlled_provider_observation_contract"],
  ] as const;

  for (const [field, expected] of expectedValues) {
    if (proof[field] !== expected) {
      throw invalid(`artifactProof.${field}`, `requires ${String(expected)}`);
    }
  }

  requireExactStringArray(proof.sourceArtifactKinds, "artifactProof.sourceArtifactKinds", [
    "provider-evidence-envelope.json",
    "summary.json",
  ]);
  if (!Array.isArray(proof.derivedArtifactRefs) || proof.derivedArtifactRefs.length !== 0) {
    throw invalid("artifactProof.derivedArtifactRefs", "requires no derived artifact refs");
  }
}

function observationIdFor(
  proof: ControlledLiveProviderSmokeArtifactProofV1,
  image: Record<string, unknown> | null,
): string {
  const imageIdentity = safeImageContentIdentity(image?.contentIdentity);
  const sourceIdentity = imageIdentity ?? proof.sourceArtifactKinds.join("+");
  return `controlled-provider-observation:v1:${sourceIdentity}`;
}

function safeImageContentIdentity(value: unknown): string | null {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value) ? value : null;
}

function mediaTypeClassFor(value: unknown): ControlledProviderObservationMediaTypeClassV1 {
  if (value === "image/png") {
    return "raster_png";
  }
  if (value === "image/jpeg") {
    return "raster_jpeg";
  }
  if (value === "image/webp") {
    return "raster_webp";
  }
  return "unknown_redacted_media_type";
}

function imageSizeClassFor(value: unknown): ControlledProviderObservationImageSizeClassV1 {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "unknown_redacted_size";
  }
  if (value <= 256_000) {
    return "small";
  }
  if (value <= 1_000_000) {
    return "medium";
  }
  return "large";
}

function providerClassFor(value: unknown): ControlledProviderObservationProviderClassV1 {
  return value === "openai-responses-vision" ? "controlled_live_provider" : "unknown_redacted_provider";
}

function endpointClassFor(value: unknown): ControlledProviderObservationEndpointClassV1 {
  return value === "openai_responses_api" ? "responses_api" : "unknown_redacted_endpoint";
}

function responseStatusClassFor(value: unknown): ControlledProviderObservationResponseStatusClassV1 {
  return typeof value === "number" && value >= 200 && value <= 299
    ? "2xx_success"
    : "unknown_redacted_status";
}

function isArtifactProof(value: Record<string, unknown>): boolean {
  return value.status === "ok" && value.nextAllowedStep === "controlled_provider_observation_contract";
}

function rejectUnsafeContent(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      rejectUnsafeContent(item, `${path}[${String(index)}]`);
    }
    return;
  }

  if (!isObject(value)) {
    rejectUnsafeScalar(value, path);
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    rejectUnsafeKey(key, `${path}.${key}`);
    rejectUnsafeContent(child, `${path}.${key}`);
  }
}

const unsafeFieldNames = new Set(
  [
    "acceptedGeometryPayload",
    "acceptedStructuredGeometry",
    "accountId",
    "account_id",
    "apiKey",
    "authorization",
    "autoAcceptance",
    "automaticAcceptance",
    "bearerToken",
    "chainOfThought",
    "confidence",
    "confidenceThresholdAcceptance",
    "coreInput",
    "credential",
    "exactModelEnvValue",
    "hiddenPrompt",
    "imageBase64",
    "imageBytes",
    "localPath",
    "metricPolicyAuthorizedAcceptance",
    "modelEnvValue",
    "providerBody",
    "providerMetadata",
    "providerOutput",
    "providerRequestId",
    "providerStatusAuthorizedAcceptance",
    "prompt",
    "promptText",
    "rawImage",
    "rawImageBase64",
    "rawImageBytes",
    "rawProviderBody",
    "rawProviderOutput",
    "rawRequestBody",
    "rawResponseBody",
    "reasoningText",
    "requestBody",
    "requestId",
    "request_id",
    "resultJson",
    "secret",
    "signedUrl",
    "score",
    "structuredAnalyzeInput",
    "structuredAnalyzeRun",
    "systemPrompt",
    "token",
    "url",
    "valueMetadata",
    "x-request-id",
    "xRequestId",
  ].map((fieldName) => fieldName.toLowerCase()),
);

function rejectUnsafeKey(key: string, path: string): void {
  const allowedSafeKeys = new Set([
    "acceptedGeometry",
    "acceptedStructuredGeometryOnlyCoreInput",
    "acceptedStructuredGeometryProduced",
    "artifactCanAuthorizeAcceptance",
    "base64Persisted",
    "confidenceScoreValueCanAuthorizeAcceptance",
    "coreInputProduced",
    "credentialHeaderPersisted",
    "providerDiagnosticCanAuthorizeAcceptance",
    "providerMetadataCanAuthorizeAcceptance",
    "providerOutputIsAcceptedGeometry",
    "providerOutputIsCoreTruth",
    "providerOutputObserved",
    "providerOutputTextPersisted",
    "providerSelfAcceptance",
    "providerStatusCanAuthorizeAcceptance",
    "rawImagePersisted",
    "rawProviderOutputPersisted",
    "requestBodyPersisted",
    "resultJsonCanonicalTruth",
    "resultJsonProduced",
    "structuredAnalyzeInputProduced",
    "structuredAnalyzeRun",
  ]);

  if (allowedSafeKeys.has(key)) {
    return;
  }

  if (unsafeFieldNames.has(key.toLowerCase())) {
    throw invalid(path, "unsafe field");
  }
}

const credentialHeaderValuePattern = new RegExp(
  `(?:^|[\\s"'([{])(?:${"authori"}${"zation"}|proxy-${"authori"}${"zation"})\\s*:\\s*(?:Basic|Bearer)\\s+[A-Za-z0-9+/=._-]+`,
  "iu",
);

const credentialEnvAssignmentPattern = new RegExp(
  `(?:^|[\\s"'([{])(?:[A-Z0-9_]*(?:API_KEY|${"TO"}${"KEN"}|${"SEC"}${"RET"})[A-Z0-9_]*)\\s*=\\s*\\S+`,
  "iu",
);

const fileUrlPattern = new RegExp(`${"fi"}${"le"}:`, "iu");

function rejectUnsafeScalar(value: unknown, path: string): void {
  if (typeof value !== "string") {
    return;
  }

  if (
    /https?:\/\//iu.test(value) ||
    fileUrlPattern.test(value) ||
    /sk-[A-Za-z0-9_-]+/u.test(value) ||
    /Bearer\s+[A-Za-z0-9_.-]+/iu.test(value) ||
    /Basic\s+[A-Za-z0-9+/=._-]+/iu.test(value) ||
    credentialHeaderValuePattern.test(value) ||
    credentialEnvAssignmentPattern.test(value) ||
    /data:image\/[a-z0-9.+-]+;base64,/iu.test(value) ||
    /(?:^|[\s"'([{:=])(?:\/Users\/|\/Volumes\/|\/private\/|\/tmp\/|\/var\/folders\/|\/home\/|[A-Za-z]:[\\/])/u.test(value) ||
    /chain[- ]of[- ]thought/iu.test(value) ||
    /hidden prompt/iu.test(value) ||
    /(?:iVBORw0KGgo|\/9j\/|UklGR)[A-Za-z0-9+/=]{12,}/u.test(value)
  ) {
    throw invalid(path, "unsafe value");
  }
}

function requirePlainRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isObject(value) || Array.isArray(value)) {
    throw invalid(path, "requires plain object");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw invalid(path, "requires plain object");
  }

  return value as Record<string, unknown>;
}

function optionalPlainRecord(value: unknown, path: string): Record<string, unknown> | null {
  if (value === undefined) {
    return null;
  }

  return requirePlainRecord(value, path);
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  expectedFields: readonly string[],
  path: string,
): void {
  const expected = new Set<string>(expectedFields);
  for (const key of Object.keys(record)) {
    if (!expected.has(key)) {
      throw invalid(`${path}.${key}`, "unknown field");
    }
  }
}

function requireExactStringArray(value: unknown, path: string, expected: readonly string[]): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw invalid(path, "requires string array");
  }

  if (value.length !== expected.length || value.some((item, index) => item !== expected[index])) {
    throw invalid(path, `requires ${expected.join(", ")}`);
  }
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function invalid(field: string, reason: string): ControlledProviderObservationContractError {
  return new ControlledProviderObservationContractError(
    `Invalid controlled provider observation contract input field "${field}": ${reason}.`,
  );
}
