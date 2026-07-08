import { createHash } from "node:crypto";

import { createSyntheticExternalEvidenceAcceptanceProofV1 } from "./local-report/synthetic-external-evidence-acceptance-proof.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export interface ProviderEvidenceReplayExplicitAcceptanceV1 {
  readonly acceptanceBoundary: Record<string, unknown>;
  readonly acceptedStructuredGeometry: Record<string, unknown>;
}

export interface ProviderEvidenceReplayAdapterResultV1 {
  readonly providerEvidenceAuthority: "candidateEvidenceOnly";
  readonly providerNeutralEnvelope: Record<string, unknown>;
  readonly acceptedGeometryRequired: true;
  readonly acceptedGeometryFromProvider: false;
  readonly coreInputAuthority: "acceptedStructuredGeometry";
  readonly localOnly: true;
  readonly fixtureOnly: true;
  readonly syntheticOnly: true;
}

const REPLAY_FIELDS = Object.freeze([
  "kind",
  "version",
  "replayId",
  "localOnly",
  "fixtureOnly",
  "staticFixture",
  "syntheticOnly",
  "notProviderResponseJson",
  "notProviderSdkResponse",
  "notProductionPayload",
  "notFutureApiContract",
  "evidenceIdentity",
  "providerEvidence",
  "warnings",
  "artifacts",
] as const);

const FORBIDDEN_PROVIDER_AUTHORITY_FIELDS = Object.freeze([
  "acceptance",
  "acceptanceBoundary",
  "accepted",
  "acceptedGeometry",
  "acceptedStructuredGeometry",
  "coreInput",
  "sourceTruth",
] as const);

const PROVIDER_EVIDENCE_FIELDS = Object.freeze([
  "kind",
  "untrusted",
  "nonAuthoritative",
  "candidateEvidenceOnly",
  "providerSelfAcceptance",
  "canAuthorizeAcceptance",
  "canCreateGeometry",
  "candidateLabels",
  "candidateMeasurements",
  "candidateGeometrySuggestions",
  "diagnosticMetadata",
  "promptText",
] as const);

const CANDIDATE_LABEL_FIELDS = Object.freeze([
  "id",
  "label",
  "untrusted",
  "nonAuthoritative",
  "candidateEvidenceOnly",
  "confidence",
  "score",
] as const);

const CANDIDATE_MEASUREMENT_FIELDS = Object.freeze([
  "id",
  "dimension",
  "value",
  "unit",
  "untrusted",
  "nonAuthoritative",
  "candidateEvidenceOnly",
  "ranking",
] as const);

const CANDIDATE_GEOMETRY_FIELDS = Object.freeze([
  "id",
  "kind",
  "x",
  "y",
  "width",
  "height",
  "untrusted",
  "nonAuthoritative",
  "candidateEvidenceOnly",
  "confidence",
] as const);

const DIAGNOSTIC_METADATA_FIELDS = Object.freeze([
  "providerCertainty",
  "confidence",
  "score",
  "valueMetadata",
  "untrusted",
  "nonAuthoritative",
  "candidateEvidenceOnly",
  "canAuthorizeAcceptance",
  "canCreateGeometry",
  "canModifyEvaluation",
] as const);

const PROMPT_TEXT_FIELDS = Object.freeze([
  "value",
  "untrusted",
  "nonAuthoritative",
  "candidateEvidenceOnly",
  "sourceTruth",
] as const);

const WARNINGS_FIELDS = Object.freeze([
  "lossyConversionWarnings",
  "evidenceLimitations",
  "diagnosticOnly",
] as const);

const ARTIFACT_FIELDS = Object.freeze([
  "kind",
  "artifactId",
  "candidateEvidenceOnly",
  "sourceTruth",
  "coreInput",
  "mayAuthorizeAcceptance",
  "mayOverrideAcceptedGeometry",
] as const);

const FORBIDDEN_REPLAY_DATA_FIELD_PATTERN = new RegExp(
  [
    "apiKey",
    ["to", "ken"].join(""),
    "cookie",
    "credential",
    "secret",
    "password",
    "sourceUrl",
    "signedUrl",
    "url",
    "uri",
    "href",
    "path",
    "localPath",
    "rawImage",
    "imageBytes",
    "base64",
    "upload",
  ].join("|"),
  "iu",
);

const FORBIDDEN_REPLAY_DATA_STRING_PATTERN = new RegExp(
  [
    ["h", "ttp", "s?://"].join(""),
    "file:",
    "data:image",
    "base64",
    "Bearer\\s+",
    "sk-[A-Za-z0-9]",
    "\\/Users\\/",
    "\\/Volumes\\/",
  ].join("|"),
  "iu",
);

const ACCEPTANCE_BOUNDARY_FIELDS = Object.freeze([
  "kind",
  "acceptanceMode",
  "acceptanceStatus",
  "outsideProviderBoundary",
  "providerEvidenceSelfAccepted",
  "acceptanceActor",
  "provenance",
] as const);

const ACCEPTANCE_ACTOR_FIELDS = Object.freeze([
  "actorType",
  "actorId",
] as const);

const ACCEPTANCE_PROVENANCE_FIELDS = Object.freeze([
  "provenanceId",
  "operationId",
  "operationVersion",
  "inputObservationIdentity",
  "inputObservationContentIdentity",
  "createdAt",
  "notes",
] as const);

class ProviderEvidenceReplayAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderEvidenceReplayAdapterError";
  }
}

export function createProviderNeutralEnvelopeFromReplayV1(
  replay: unknown,
  explicitAcceptance: ProviderEvidenceReplayExplicitAcceptanceV1,
): ProviderEvidenceReplayAdapterResultV1 {
  const record = requirePlainRecord(replay, "replay");
  rejectUnknownFields(record, REPLAY_FIELDS, "replay");
  requireOwnFields(record, REPLAY_FIELDS, "replay");
  rejectForbiddenReplayDataClasses(record, "replay");
  validateReplayBoundary(record);

  const evidenceIdentity = requirePlainOwnRecord(record, "evidenceIdentity", "replay.evidenceIdentity");
  const providerEvidence = requirePlainOwnRecord(record, "providerEvidence", "replay.providerEvidence");
  const warnings = requirePlainOwnRecord(record, "warnings", "replay.warnings");
  const artifacts = requireArray(record.artifacts, "replay.artifacts");
  const acceptanceBoundary = structuredClone(
    requirePlainRecord(explicitAcceptance.acceptanceBoundary, "explicitAcceptance.acceptanceBoundary"),
  );
  const acceptedStructuredGeometry = structuredClone(requirePlainRecord(
    explicitAcceptance.acceptedStructuredGeometry,
    "explicitAcceptance.acceptedStructuredGeometry",
  ));
  rejectForbiddenReplayDataClasses(acceptanceBoundary, "explicitAcceptance.acceptanceBoundary");

  validateEvidenceIdentity(evidenceIdentity);
  validateProviderEvidence(providerEvidence);
  validateWarnings(warnings);
  validateArtifacts(artifacts);
  validateExplicitAcceptance(acceptanceBoundary, acceptedStructuredGeometry, evidenceIdentity);

  const observationEnvelope = providerEvidenceToObservationEnvelope(providerEvidence);
  requireValue(
    evidenceIdentity.observationEnvelopeContentIdentity,
    "replay.evidenceIdentity.observationEnvelopeContentIdentity",
    contentIdentityFor(observationEnvelope),
  );

  const providerNeutralEnvelope: Record<string, unknown> = {
    kind: "norma.external-evidence-envelope.synthetic",
    version: 1,
    envelopeId: requireString(evidenceIdentity.envelopeId, "replay.evidenceIdentity.envelopeId"),
    envelopeContentIdentity: requireString(
      evidenceIdentity.envelopeContentIdentity,
      "replay.evidenceIdentity.envelopeContentIdentity",
    ),
    localOnly: true,
    fixtureOnly: true,
    staticFixture: true,
    syntheticOnly: true,
    notProviderResponseJson: true,
    notProviderSdkResponse: true,
    notProductionPayload: true,
    notFutureApiContract: true,
    evidenceIdentity: {
      syntheticSourceIdentity: requireString(
        evidenceIdentity.syntheticSourceIdentity,
        "replay.evidenceIdentity.syntheticSourceIdentity",
      ),
      providerCategoryIdentity: requireString(
        evidenceIdentity.providerCategoryIdentity,
        "replay.evidenceIdentity.providerCategoryIdentity",
      ),
      observationIdentity: requireString(
        evidenceIdentity.observationIdentity,
        "replay.evidenceIdentity.observationIdentity",
      ),
      observationContentIdentity: requireString(
        evidenceIdentity.observationContentIdentity,
        "replay.evidenceIdentity.observationContentIdentity",
      ),
      observationEnvelopeContentIdentity: requireString(
        evidenceIdentity.observationEnvelopeContentIdentity,
        "replay.evidenceIdentity.observationEnvelopeContentIdentity",
      ),
    },
    observationEnvelope,
    acceptanceBoundary,
    acceptedStructuredGeometry,
    warnings: structuredClone(warnings),
    derivedArtifacts: structuredClone(artifacts),
  };
  createSyntheticExternalEvidenceAcceptanceProofV1(providerNeutralEnvelope);

  return {
    providerEvidenceAuthority: "candidateEvidenceOnly",
    providerNeutralEnvelope,
    acceptedGeometryRequired: true,
    acceptedGeometryFromProvider: false,
    coreInputAuthority: "acceptedStructuredGeometry",
    localOnly: true,
    fixtureOnly: true,
    syntheticOnly: true,
  };
}

function validateReplayBoundary(record: Record<string, unknown>): void {
  requireValue(record.kind, "replay.kind", "norma.provider-evidence-replay.synthetic");
  requireValue(record.version, "replay.version", 1);
  requireString(record.replayId, "replay.replayId");
  requireValue(record.localOnly, "replay.localOnly", true);
  requireValue(record.fixtureOnly, "replay.fixtureOnly", true);
  requireValue(record.staticFixture, "replay.staticFixture", true);
  requireValue(record.syntheticOnly, "replay.syntheticOnly", true);
  requireValue(record.notProviderResponseJson, "replay.notProviderResponseJson", true);
  requireValue(record.notProviderSdkResponse, "replay.notProviderSdkResponse", true);
  requireValue(record.notProductionPayload, "replay.notProductionPayload", true);
  requireValue(record.notFutureApiContract, "replay.notFutureApiContract", true);
}

function validateEvidenceIdentity(record: Record<string, unknown>): void {
  for (const field of [
    "envelopeId",
    "envelopeContentIdentity",
    "syntheticSourceIdentity",
    "providerCategoryIdentity",
    "observationIdentity",
    "observationContentIdentity",
    "observationEnvelopeContentIdentity",
  ]) {
    requireString(record[field], `replay.evidenceIdentity.${field}`);
  }
}

function validateProviderEvidence(record: Record<string, unknown>): void {
  rejectUnknownFields(record, PROVIDER_EVIDENCE_FIELDS, "replay.providerEvidence");
  requireValue(record.kind, "replay.providerEvidence.kind", "SyntheticProviderStyleEvidence");
  requireValue(record.untrusted, "replay.providerEvidence.untrusted", true);
  requireValue(record.nonAuthoritative, "replay.providerEvidence.nonAuthoritative", true);
  requireValue(record.candidateEvidenceOnly, "replay.providerEvidence.candidateEvidenceOnly", true);
  requireValue(record.providerSelfAcceptance, "replay.providerEvidence.providerSelfAcceptance", false);
  requireValue(record.canAuthorizeAcceptance, "replay.providerEvidence.canAuthorizeAcceptance", false);
  requireValue(record.canCreateGeometry, "replay.providerEvidence.canCreateGeometry", false);
  rejectForbiddenAuthorityFields(record, "replay.providerEvidence");

  for (const field of ["candidateLabels", "candidateMeasurements", "candidateGeometrySuggestions"] as const) {
    for (const [index, value] of requireArray(record[field], `replay.providerEvidence.${field}`).entries()) {
      const path = `replay.providerEvidence.${field}[${index}]`;
      const candidate = requirePlainRecord(value, path);
      validateEvidenceOnlyRecord(candidate, path);
      rejectForbiddenAuthorityFields(candidate, path);
      rejectUnknownFields(candidate, expectedCandidateFields(field), path);
      validateCandidateRecord(candidate, field, path);
    }
  }

  const diagnosticMetadata = requirePlainOwnRecord(
    record,
    "diagnosticMetadata",
    "replay.providerEvidence.diagnosticMetadata",
  );
  rejectUnknownFields(diagnosticMetadata, DIAGNOSTIC_METADATA_FIELDS, "replay.providerEvidence.diagnosticMetadata");
  validateEvidenceOnlyRecord(diagnosticMetadata, "replay.providerEvidence.diagnosticMetadata");
  requireValue(diagnosticMetadata.canAuthorizeAcceptance, "replay.providerEvidence.diagnosticMetadata.canAuthorizeAcceptance", false);
  requireValue(diagnosticMetadata.canCreateGeometry, "replay.providerEvidence.diagnosticMetadata.canCreateGeometry", false);
  requireValue(diagnosticMetadata.canModifyEvaluation, "replay.providerEvidence.diagnosticMetadata.canModifyEvaluation", false);
  requireString(diagnosticMetadata.providerCertainty, "replay.providerEvidence.diagnosticMetadata.providerCertainty");
  requireString(diagnosticMetadata.valueMetadata, "replay.providerEvidence.diagnosticMetadata.valueMetadata");
  requireNumber(diagnosticMetadata.confidence, "replay.providerEvidence.diagnosticMetadata.confidence");
  requireNumber(diagnosticMetadata.score, "replay.providerEvidence.diagnosticMetadata.score");

  const promptText = requirePlainOwnRecord(record, "promptText", "replay.providerEvidence.promptText");
  rejectUnknownFields(promptText, PROMPT_TEXT_FIELDS, "replay.providerEvidence.promptText");
  validateEvidenceOnlyRecord(promptText, "replay.providerEvidence.promptText");
  requireValue(promptText.sourceTruth, "replay.providerEvidence.promptText.sourceTruth", false);
  requireString(promptText.value, "replay.providerEvidence.promptText.value");
}

function validateWarnings(record: Record<string, unknown>): void {
  rejectUnknownFields(record, WARNINGS_FIELDS, "replay.warnings");
  requireValue(record.diagnosticOnly, "replay.warnings.diagnosticOnly", true);
  requireStringArray(record.lossyConversionWarnings, "replay.warnings.lossyConversionWarnings");
  requireStringArray(record.evidenceLimitations, "replay.warnings.evidenceLimitations");
}

function validateArtifacts(values: readonly unknown[]): void {
  for (const [index, value] of values.entries()) {
    const record = requirePlainRecord(value, `replay.artifacts[${index}]`);
    rejectUnknownFields(record, ARTIFACT_FIELDS, `replay.artifacts[${index}]`);
    requireValue(record.candidateEvidenceOnly, `replay.artifacts[${index}].candidateEvidenceOnly`, true);
    requireValue(record.sourceTruth, `replay.artifacts[${index}].sourceTruth`, false);
    requireValue(record.coreInput, `replay.artifacts[${index}].coreInput`, false);
    requireValue(record.mayAuthorizeAcceptance, `replay.artifacts[${index}].mayAuthorizeAcceptance`, false);
    requireValue(record.mayOverrideAcceptedGeometry, `replay.artifacts[${index}].mayOverrideAcceptedGeometry`, false);
    requireString(record.kind, `replay.artifacts[${index}].kind`);
    requireString(record.artifactId, `replay.artifacts[${index}].artifactId`);
  }
}

function validateCandidateRecord(
  record: Record<string, unknown>,
  field: "candidateLabels" | "candidateMeasurements" | "candidateGeometrySuggestions",
  path: string,
): void {
  requireString(record.id, `${path}.id`);

  if (field === "candidateLabels") {
    requireString(record.label, `${path}.label`);
    requireOptionalNumber(record.confidence, `${path}.confidence`);
    requireOptionalNumber(record.score, `${path}.score`);
    return;
  }

  if (field === "candidateMeasurements") {
    requireString(record.dimension, `${path}.dimension`);
    requireString(record.unit, `${path}.unit`);
    requireNumber(record.value, `${path}.value`);
    requireNumber(record.ranking, `${path}.ranking`);
    return;
  }

  requireString(record.kind, `${path}.kind`);
  requireNumber(record.x, `${path}.x`);
  requireNumber(record.y, `${path}.y`);
  requireNumber(record.width, `${path}.width`);
  requireNumber(record.height, `${path}.height`);
  requireNumber(record.confidence, `${path}.confidence`);
}

function expectedCandidateFields(field: "candidateLabels" | "candidateMeasurements" | "candidateGeometrySuggestions"): readonly string[] {
  if (field === "candidateLabels") {
    return CANDIDATE_LABEL_FIELDS;
  }

  if (field === "candidateMeasurements") {
    return CANDIDATE_MEASUREMENT_FIELDS;
  }

  return CANDIDATE_GEOMETRY_FIELDS;
}

function validateExplicitAcceptance(
  acceptanceBoundary: Record<string, unknown>,
  acceptedStructuredGeometry: Record<string, unknown>,
  evidenceIdentity: Record<string, unknown>,
): void {
  const observationIdentity = requireString(evidenceIdentity.observationIdentity, "replay.evidenceIdentity.observationIdentity");
  const observationContentIdentity = requireString(
    evidenceIdentity.observationContentIdentity,
    "replay.evidenceIdentity.observationContentIdentity",
  );

  rejectUnknownFields(acceptanceBoundary, ACCEPTANCE_BOUNDARY_FIELDS, "explicitAcceptance.acceptanceBoundary");
  requireValue(acceptanceBoundary.outsideProviderBoundary, "explicitAcceptance.acceptanceBoundary.outsideProviderBoundary", true);
  requireValue(acceptanceBoundary.providerEvidenceSelfAccepted, "explicitAcceptance.acceptanceBoundary.providerEvidenceSelfAccepted", false);
  const acceptanceActor = requirePlainOwnRecord(
    acceptanceBoundary,
    "acceptanceActor",
    "explicitAcceptance.acceptanceBoundary.acceptanceActor",
  );
  const acceptanceProvenance = requirePlainOwnRecord(
    acceptanceBoundary,
    "provenance",
    "explicitAcceptance.acceptanceBoundary.provenance",
  );
  rejectUnknownFields(acceptanceActor, ACCEPTANCE_ACTOR_FIELDS, "explicitAcceptance.acceptanceBoundary.acceptanceActor");
  rejectUnknownFields(acceptanceProvenance, ACCEPTANCE_PROVENANCE_FIELDS, "explicitAcceptance.acceptanceBoundary.provenance");
  requireValue(acceptedStructuredGeometry.sourceObservationId, "explicitAcceptance.acceptedStructuredGeometry.sourceObservationId", observationIdentity);
  requireValue(
    acceptedStructuredGeometry.sourceObservationContentIdentity,
    "explicitAcceptance.acceptedStructuredGeometry.sourceObservationContentIdentity",
    observationContentIdentity,
  );
}

function rejectForbiddenReplayDataClasses(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      rejectForbiddenReplayDataClasses(item, `${path}[${index}]`);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    const record = requirePlainRecord(value, path);
    for (const [key, child] of Object.entries(record)) {
      if (FORBIDDEN_REPLAY_DATA_FIELD_PATTERN.test(key)) {
        throw invalid(`${path}.${key}`, "forbidden replay data class");
      }
      rejectForbiddenReplayDataClasses(child, `${path}.${key}`);
    }
    return;
  }

  if (typeof value === "string" && FORBIDDEN_REPLAY_DATA_STRING_PATTERN.test(value)) {
    throw invalid(path, "forbidden replay data value");
  }
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

function providerEvidenceToObservationEnvelope(providerEvidence: Record<string, unknown>): Record<string, unknown> {
  return {
    kind: "ObservationEnvelope",
    trust: {
      untrusted: true,
      nonAuthoritative: true,
      candidateEvidenceOnly: true,
      sourceTruth: false,
      coreInput: false,
      packageApiTruth: false,
      connectorTruth: false,
      acceptedStructuredGeometry: false,
    },
    candidateLabels: structuredClone(providerEvidence.candidateLabels),
    candidateMeasurements: structuredClone(providerEvidence.candidateMeasurements),
    candidateGeometrySuggestions: structuredClone(providerEvidence.candidateGeometrySuggestions),
    diagnosticMetadata: structuredClone(providerEvidence.diagnosticMetadata),
    promptText: structuredClone(providerEvidence.promptText),
  };
}

function validateEvidenceOnlyRecord(value: unknown, path: string): void {
  const record = requirePlainRecord(value, path);
  requireValue(record.untrusted, `${path}.untrusted`, true);
  requireValue(record.nonAuthoritative, `${path}.nonAuthoritative`, true);
  requireValue(record.candidateEvidenceOnly, `${path}.candidateEvidenceOnly`, true);
}

function rejectForbiddenAuthorityFields(record: Record<string, unknown>, path: string): void {
  for (const field of FORBIDDEN_PROVIDER_AUTHORITY_FIELDS) {
    if (Object.hasOwn(record, field)) {
      throw invalid(`${path}.${field}`, "provider evidence cannot carry acceptance or Core authority fields");
    }
  }
}

function requirePlainOwnRecord(
  record: Record<string, unknown>,
  field: string,
  path = field,
): Record<string, unknown> {
  if (!Object.hasOwn(record, field)) {
    throw invalid(path, "requires own field");
  }

  return requirePlainRecord(record[field], path);
}

function requirePlainRecord(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw invalid(path, "requires plain object");
  }

  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }

  return value as Record<string, unknown>;
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  expectedFields: readonly string[],
  path: string,
): void {
  const expected = new Set(expectedFields);

  for (const key of Object.keys(record)) {
    if (!expected.has(key)) {
      throw invalid(`${path}.${key}`, "unknown field");
    }
  }
}

function requireOwnFields(record: Record<string, unknown>, expectedFields: readonly string[], path: string): void {
  for (const field of expectedFields) {
    if (!Object.hasOwn(record, field)) {
      throw invalid(`${path}.${field}`, "requires own field");
    }
  }
}

function requireArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw invalid(path, "requires array");
  }

  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw invalid(path, "requires non-empty string");
  }

  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalid(path, "requires finite number");
  }

  return value;
}

function requireOptionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireNumber(value, path);
}

function requireStringArray(value: unknown, path: string): readonly string[] {
  const array = requireArray(value, path);

  for (const [index, item] of array.entries()) {
    requireString(item, `${path}[${index}]`);
  }

  return array as readonly string[];
}

function requireValue(value: unknown, path: string, expected: unknown): void {
  if (value !== expected) {
    throw invalid(path, `requires ${String(expected)}`);
  }
}

function invalid(field: string, reason: string): ProviderEvidenceReplayAdapterError {
  return new ProviderEvidenceReplayAdapterError(
    `Invalid provider evidence replay field "${field}": ${reason}.`,
  );
}
