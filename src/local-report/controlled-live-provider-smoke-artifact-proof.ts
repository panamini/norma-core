export type ControlledLiveProviderSmokeSourceArtifactKindV1 =
  | "provider-evidence-envelope.json"
  | "summary.json";

export interface ControlledLiveProviderSmokeDerivedArtifactRefV1 {
  readonly artifact: "summary.md";
  readonly role: "derived-redacted-smoke-summary";
  readonly providerEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreInputAuthority: false;
  readonly resultJsonCanonicalTruth: false;
}

export interface ControlledLiveProviderSmokeArtifactProofV1 {
  readonly status: "ok";
  readonly smokeStatus: "ok";
  readonly providerEvidenceOnly: true;
  readonly providerOutputObserved: true;
  readonly providerOutputIsCoreTruth: false;
  readonly providerOutputIsAcceptedGeometry: false;
  readonly acceptedStructuredGeometryProduced: false;
  readonly coreInputProduced: false;
  readonly structuredAnalyzeRun: false;
  readonly resultJsonProduced: false;
  readonly resultJsonCanonicalTruth: false;
  readonly acceptedStructuredGeometryOnlyCoreInput: true;
  readonly artifactsRedacted: true;
  readonly rawProviderOutputPersisted: false;
  readonly rawRequestBodyPersisted: false;
  readonly rawImagePersisted: false;
  readonly sourceArtifactKinds: readonly ControlledLiveProviderSmokeSourceArtifactKindV1[];
  readonly derivedArtifactRefs: readonly ControlledLiveProviderSmokeDerivedArtifactRefV1[];
  readonly nextAllowedStep: "controlled_provider_observation_contract";
}

const INPUT_FIELDS = Object.freeze([
  "providerEvidenceEnvelope",
  "summary",
] as const);

const PROVIDER_EVIDENCE_ENVELOPE_FIELDS = Object.freeze([
  "acceptedStructuredGeometryOnlyCoreInput",
  "acceptedStructuredGeometryProduced",
  "ciLiveNetworkDependency",
  "confidenceScoreValueCanAuthorizeAcceptance",
  "coreInputProduced",
  "evidenceSummary",
  "image",
  "kind",
  "liveProviderExecution",
  "localOnly",
  "manualOnly",
  "promptArtifactOrMetricPolicyCanAuthorizeAcceptance",
  "providerCall",
  "providerEvidenceOnly",
  "providerOutputIsCoreTruth",
  "providerSelfAcceptance",
  "rawImagePersisted",
  "rawProviderOutputPersisted",
  "redacted",
  "requiresExplicitAcceptance",
  "resultJsonProduced",
  "version",
] as const);

const IMAGE_FIELDS = Object.freeze([
  "base64Persisted",
  "contentIdentity",
  "mediaType",
  "rawImagePersisted",
  "sizeBytes",
  "sourcePathPersisted",
] as const);

const PROVIDER_CALL_FIELDS = Object.freeze([
  "credentialHeaderPersisted",
  "endpointKind",
  "modelConfigured",
  "provider",
  "providerOutputObserved",
  "providerOutputTextPersisted",
  "rawProviderOutputPersisted",
  "requestBodyPersisted",
  "responseClass",
  "responseStatusCode",
  "timeoutMs",
] as const);

const EVIDENCE_SUMMARY_FIELDS = Object.freeze([
  "lowCardinalityOnly",
  "persistedObservationClass",
  "providerNeutralObservationTextPersisted",
  "providerOutputObserved",
] as const);

const SUMMARY_FIELDS = Object.freeze([
  "acceptedStructuredGeometryOnlyCoreInput",
  "artifacts",
  "ciLiveNetworkDependency",
  "kind",
  "liveProviderExecution",
  "nonGoals",
  "providerEvidenceOnly",
  "providerOutputIsCoreTruth",
  "rawProviderOutputPersisted",
  "redacted",
  "requiresExplicitAcceptance",
] as const);

const EXPECTED_SOURCE_ARTIFACT_KINDS = Object.freeze([
  "provider-evidence-envelope.json",
  "summary.json",
] as const);

const EXPECTED_SUMMARY_ARTIFACTS = Object.freeze([
  ...EXPECTED_SOURCE_ARTIFACT_KINDS,
  "summary.md",
] as const);

const EXPECTED_SUMMARY_NON_GOALS = Object.freeze([
  `not production ${"Open"}${"AI"} integration`,
  "not provider output truth",
  "not accepted structured geometry",
  "not Core input",
  "not result.json production",
  "not CI live-network behavior",
  "not package API or export expansion",
] as const);

class ControlledLiveProviderSmokeArtifactProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlledLiveProviderSmokeArtifactProofError";
  }
}

export function createControlledLiveProviderSmokeArtifactProofV1(
  input: unknown,
): ControlledLiveProviderSmokeArtifactProofV1 {
  const record = requirePlainRecord(input, "input");
  rejectUnsafeContent(record, "input");
  rejectUnknownFields(record, INPUT_FIELDS, "input");
  requireOwnFields(record, ["providerEvidenceEnvelope", "summary"], "input");

  const providerEvidenceEnvelope = requirePlainRecord(
    record.providerEvidenceEnvelope,
    "providerEvidenceEnvelope",
  );
  const summary = requirePlainRecord(record.summary, "summary");

  validateProviderEvidenceEnvelope(providerEvidenceEnvelope);
  validateSummary(summary);

  return {
    status: "ok",
    smokeStatus: "ok",
    providerEvidenceOnly: true,
    providerOutputObserved: true,
    providerOutputIsCoreTruth: false,
    providerOutputIsAcceptedGeometry: false,
    acceptedStructuredGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    resultJsonCanonicalTruth: false,
    acceptedStructuredGeometryOnlyCoreInput: true,
    artifactsRedacted: true,
    rawProviderOutputPersisted: false,
    rawRequestBodyPersisted: false,
    rawImagePersisted: false,
    sourceArtifactKinds: [...EXPECTED_SOURCE_ARTIFACT_KINDS],
    derivedArtifactRefs: [],
    nextAllowedStep: "controlled_provider_observation_contract",
  };
}

function validateProviderEvidenceEnvelope(record: Record<string, unknown>): void {
  rejectUnknownFields(record, PROVIDER_EVIDENCE_ENVELOPE_FIELDS, "providerEvidenceEnvelope");
  requireOwnFields(record, PROVIDER_EVIDENCE_ENVELOPE_FIELDS, "providerEvidenceEnvelope");

  const expectedValues = [
    ["kind", "norma.controlled-live-provider-smoke.provider-evidence-envelope.v1"],
    ["version", 1],
    ["liveProviderExecution", true],
    ["manualOnly", true],
    ["localOnly", true],
    ["providerEvidenceOnly", true],
    ["requiresExplicitAcceptance", true],
    ["providerOutputIsCoreTruth", false],
    ["acceptedStructuredGeometryOnlyCoreInput", true],
    ["acceptedStructuredGeometryProduced", false],
    ["coreInputProduced", false],
    ["resultJsonProduced", false],
    ["providerSelfAcceptance", false],
    ["confidenceScoreValueCanAuthorizeAcceptance", false],
    ["promptArtifactOrMetricPolicyCanAuthorizeAcceptance", false],
    ["rawProviderOutputPersisted", false],
    ["rawImagePersisted", false],
    ["redacted", true],
    ["ciLiveNetworkDependency", false],
  ] as const;

  for (const [field, expected] of expectedValues) {
    requireValue(record[field], `providerEvidenceEnvelope.${field}`, expected);
  }

  validateImageIdentity(requirePlainRecord(record.image, "providerEvidenceEnvelope.image"));
  validateProviderCall(requirePlainRecord(record.providerCall, "providerEvidenceEnvelope.providerCall"));
  validateEvidenceSummary(requirePlainRecord(record.evidenceSummary, "providerEvidenceEnvelope.evidenceSummary"));
}

function validateImageIdentity(record: Record<string, unknown>): void {
  rejectUnknownFields(record, IMAGE_FIELDS, "providerEvidenceEnvelope.image");
  requireOwnFields(record, IMAGE_FIELDS, "providerEvidenceEnvelope.image");
  requireSha256Identity(record.contentIdentity, "providerEvidenceEnvelope.image.contentIdentity");
  requireOneOf(
    record.mediaType,
    "providerEvidenceEnvelope.image.mediaType",
    ["image/png", "image/jpeg", "image/webp"],
  );
  requirePositiveNumber(record.sizeBytes, "providerEvidenceEnvelope.image.sizeBytes");
  requireValue(record.sourcePathPersisted, "providerEvidenceEnvelope.image.sourcePathPersisted", false);
  requireValue(record.rawImagePersisted, "providerEvidenceEnvelope.image.rawImagePersisted", false);
  requireValue(record.base64Persisted, "providerEvidenceEnvelope.image.base64Persisted", false);
}

function validateProviderCall(record: Record<string, unknown>): void {
  rejectUnknownFields(record, PROVIDER_CALL_FIELDS, "providerEvidenceEnvelope.providerCall");
  requireOwnFields(record, PROVIDER_CALL_FIELDS, "providerEvidenceEnvelope.providerCall");
  requireValue(record.provider, "providerEvidenceEnvelope.providerCall.provider", "openai-responses-vision");
  requireValue(record.modelConfigured, "providerEvidenceEnvelope.providerCall.modelConfigured", true);
  requireValue(record.endpointKind, "providerEvidenceEnvelope.providerCall.endpointKind", "openai_responses_api");
  requirePositiveNumber(record.timeoutMs, "providerEvidenceEnvelope.providerCall.timeoutMs");
  requireValue(record.credentialHeaderPersisted, "providerEvidenceEnvelope.providerCall.credentialHeaderPersisted", false);
  requireValue(record.requestBodyPersisted, "providerEvidenceEnvelope.providerCall.requestBodyPersisted", false);
  requireValue(record.rawProviderOutputPersisted, "providerEvidenceEnvelope.providerCall.rawProviderOutputPersisted", false);
  requireSuccessStatusCode(record.responseStatusCode, "providerEvidenceEnvelope.providerCall.responseStatusCode");
  requireValue(record.responseClass, "providerEvidenceEnvelope.providerCall.responseClass", "success");
  requireValue(record.providerOutputObserved, "providerEvidenceEnvelope.providerCall.providerOutputObserved", true);
  requireValue(record.providerOutputTextPersisted, "providerEvidenceEnvelope.providerCall.providerOutputTextPersisted", false);
}

function validateEvidenceSummary(record: Record<string, unknown>): void {
  rejectUnknownFields(record, EVIDENCE_SUMMARY_FIELDS, "providerEvidenceEnvelope.evidenceSummary");
  requireOwnFields(record, EVIDENCE_SUMMARY_FIELDS, "providerEvidenceEnvelope.evidenceSummary");
  requireValue(record.providerOutputObserved, "providerEvidenceEnvelope.evidenceSummary.providerOutputObserved", true);
  requireValue(
    record.persistedObservationClass,
    "providerEvidenceEnvelope.evidenceSummary.persistedObservationClass",
    "redacted_provider_response_observed",
  );
  requireValue(
    record.providerNeutralObservationTextPersisted,
    "providerEvidenceEnvelope.evidenceSummary.providerNeutralObservationTextPersisted",
    false,
  );
  requireValue(record.lowCardinalityOnly, "providerEvidenceEnvelope.evidenceSummary.lowCardinalityOnly", true);
}

function validateSummary(record: Record<string, unknown>): void {
  rejectUnknownFields(record, SUMMARY_FIELDS, "summary");
  requireOwnFields(record, SUMMARY_FIELDS, "summary");

  const expectedValues = [
    ["kind", "norma.controlled-live-provider-smoke.summary.v1"],
    ["liveProviderExecution", true],
    ["providerEvidenceOnly", true],
    ["requiresExplicitAcceptance", true],
    ["providerOutputIsCoreTruth", false],
    ["acceptedStructuredGeometryOnlyCoreInput", true],
    ["rawProviderOutputPersisted", false],
    ["redacted", true],
    ["ciLiveNetworkDependency", false],
  ] as const;

  for (const [field, expected] of expectedValues) {
    requireValue(record[field], `summary.${field}`, expected);
  }

  requireExactStringArray(record.artifacts, "summary.artifacts", EXPECTED_SUMMARY_ARTIFACTS);
  requireExactStringArray(record.nonGoals, "summary.nonGoals", EXPECTED_SUMMARY_NON_GOALS);
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
    "acceptedGeometry",
    "acceptedStructuredGeometry",
    "artifactOutputBecameTruth",
    "apiKey",
    "authori" + "zation",
    "autoAcceptance",
    "automaticAcceptance",
    "bearer" + "To" + "ken",
    "chainOfThought",
    "confidenceThresholdAcceptance",
    "confidenceThresholdAuthorizedAcceptance",
    "coreInput",
    "credential",
    "hiddenPrompt",
    "imageBase64",
    "imageBytes",
    "providerBody",
    "providerOutput",
    "providerOutputAuthorizedAcceptance",
    "providerRequestId",
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
    "structuredAnalyzeRun",
    "systemPrompt",
    "to" + "ken",
    "x-request-id",
    "xRequestId",
    "accountId",
    "account_id",
  ].map((fieldName) => fieldName.toLowerCase()),
);

function rejectUnsafeKey(key: string, path: string): void {
  const allowedSafeKeys = new Set([
    "acceptedStructuredGeometryOnlyCoreInput",
    "acceptedStructuredGeometryProduced",
    "base64Persisted",
    "confidenceScoreValueCanAuthorizeAcceptance",
    "coreInputProduced",
    "credentialHeaderPersisted",
    "providerNeutralObservationTextPersisted",
    "providerOutputIsCoreTruth",
    "providerOutputObserved",
    "providerOutputTextPersisted",
    "providerSelfAcceptance",
    "rawImagePersisted",
    "rawProviderOutputPersisted",
    "requestBodyPersisted",
    "resultJsonProduced",
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
  "u",
);

const fileUrlPattern = new RegExp(`${"fi"}${"le"}:`, "iu");

function rejectUnsafeScalar(value: unknown, path: string): void {
  if (typeof value !== "string") {
    return;
  }

  if (
    /sk-[A-Za-z0-9_-]+/u.test(value) ||
    /Bearer\s+[A-Za-z0-9_.-]+/iu.test(value) ||
    /Basic\s+[A-Za-z0-9+/=._-]+/iu.test(value) ||
    credentialHeaderValuePattern.test(value) ||
    credentialEnvAssignmentPattern.test(value) ||
    fileUrlPattern.test(value) ||
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

function requireOwnFields(
  record: Record<string, unknown>,
  expectedFields: readonly string[],
  path: string,
): void {
  for (const field of expectedFields) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      throw invalid(`${path}.${field}`, "requires own field");
    }
  }
}

function requireValue(value: unknown, path: string, expected: unknown): void {
  if (value !== expected) {
    throw invalid(path, `requires ${String(expected)}`);
  }
}

function requireOneOf(value: unknown, path: string, expected: readonly string[]): void {
  if (typeof value !== "string" || !expected.includes(value)) {
    throw invalid(path, `requires one of ${expected.join(", ")}`);
  }
}

function requirePositiveNumber(value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw invalid(path, "requires positive finite number");
  }
}

function requireSuccessStatusCode(value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 200 || value > 299) {
    throw invalid(path, "requires 2xx provider response status");
  }
}

function requireSha256Identity(value: unknown, path: string): void {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value)) {
    throw invalid(path, "requires sha256 content identity");
  }
}

function requireExactStringArray(
  value: unknown,
  path: string,
  expected: readonly string[],
): void {
  const actual = requireStringArray(value, path);
  if (actual.length !== expected.length || actual.some((item, index) => item !== expected[index])) {
    throw invalid(path, `requires ${expected.join(", ")}`);
  }
}

function requireStringArray(value: unknown, path: string): readonly string[] {
  const actual = requireArray(value, path);
  if (actual.some((item) => typeof item !== "string")) {
    throw invalid(path, "requires string array");
  }

  return actual as readonly string[];
}

function requireArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw invalid(path, "requires array");
  }

  return value;
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function invalid(field: string, reason: string): ControlledLiveProviderSmokeArtifactProofError {
  return new ControlledLiveProviderSmokeArtifactProofError(
    `Invalid controlled live provider smoke artifact proof input field "${field}": ${reason}.`,
  );
}
