import { validateAcceptedGeometryV1 } from "../geometry-observation.js";

export interface SyntheticExternalEvidenceAcceptanceProofV1 {
  readonly boundarySourceTruth: "acceptedStructuredGeometry";
  readonly coreInputAuthority: "acceptedStructuredGeometry";
  readonly acceptedGeometryIsOnlyCoreInput: true;
  readonly providerEvidenceOnly: true;
  readonly observationEnvelopeCoreInput: false;
  readonly confidenceAuthority: false;
  readonly providerSelfAcceptance: false;
  readonly localOnly: true;
  readonly fixtureOnly: true;
  readonly syntheticOnly: true;
  readonly envelopeId: string;
  readonly observationIdentity: string;
  readonly observationContentIdentity: string;
  readonly acceptedGeometryId: string;
  readonly acceptedGeometryContentIdentity: string;
}

const EXPECTED_ENVELOPE_FIELDS = Object.freeze([
  "acceptanceBoundary",
  "acceptedStructuredGeometry",
  "derivedArtifacts",
  "envelopeContentIdentity",
  "envelopeId",
  "evidenceIdentity",
  "fixtureOnly",
  "kind",
  "localOnly",
  "notFutureApiContract",
  "notProductionPayload",
  "notProviderResponseJson",
  "notProviderSdkResponse",
  "observationEnvelope",
  "staticFixture",
  "syntheticOnly",
  "version",
  "warnings",
] as const);

class SyntheticExternalEvidenceAcceptanceProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyntheticExternalEvidenceAcceptanceProofError";
  }
}

export function createSyntheticExternalEvidenceAcceptanceProofV1(
  envelope: unknown,
): SyntheticExternalEvidenceAcceptanceProofV1 {
  const record = requirePlainRecord(envelope, "envelope");
  rejectUnknownFields(record, EXPECTED_ENVELOPE_FIELDS, "envelope");
  requireOwnFields(record, EXPECTED_ENVELOPE_FIELDS, "envelope");
  validateFixtureBoundary(record);

  const evidenceIdentity = requirePlainOwnRecord(record, "evidenceIdentity");
  const observationEnvelope = requirePlainOwnRecord(record, "observationEnvelope");
  const acceptanceBoundary = requirePlainOwnRecord(record, "acceptanceBoundary");
  const acceptedStructuredGeometry = requirePlainOwnRecord(record, "acceptedStructuredGeometry");
  const warnings = requirePlainOwnRecord(record, "warnings");
  const derivedArtifacts = requireArray(record.derivedArtifacts, "derivedArtifacts");
  const observationIdentity = requireString(evidenceIdentity.observationIdentity, "evidenceIdentity.observationIdentity");
  const observationContentIdentity = requireString(
    evidenceIdentity.observationContentIdentity,
    "evidenceIdentity.observationContentIdentity",
  );

  validateObservationEnvelope(observationEnvelope);
  validateAcceptanceBoundary(acceptanceBoundary, observationIdentity, observationContentIdentity);
  validateEvidenceOnlyCollections(observationEnvelope, warnings, derivedArtifacts);
  validateAcceptedStructuredGeometryBoundary(
    acceptedStructuredGeometry,
    acceptanceBoundary,
    observationIdentity,
    observationContentIdentity,
  );

  const acceptedValidation = validateAcceptedGeometryV1(acceptedStructuredGeometry);
  if (!acceptedValidation.ok) {
    throw invalid("acceptedStructuredGeometry", "must satisfy validateAcceptedGeometryV1");
  }

  return {
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    acceptedGeometryIsOnlyCoreInput: true,
    providerEvidenceOnly: true,
    observationEnvelopeCoreInput: false,
    confidenceAuthority: false,
    providerSelfAcceptance: false,
    localOnly: true,
    fixtureOnly: true,
    syntheticOnly: true,
    envelopeId: requireString(record.envelopeId, "envelopeId"),
    observationIdentity,
    observationContentIdentity,
    acceptedGeometryId: requireString(acceptedStructuredGeometry.acceptedGeometryId, "acceptedStructuredGeometry.acceptedGeometryId"),
    acceptedGeometryContentIdentity: requireString(acceptedStructuredGeometry.contentIdentity, "acceptedStructuredGeometry.contentIdentity"),
  };
}

function validateFixtureBoundary(record: Record<string, unknown>): void {
  requireValue(record.kind, "kind", "norma.external-evidence-envelope.synthetic");
  requireValue(record.version, "version", 1);
  requireValue(record.localOnly, "localOnly", true);
  requireValue(record.fixtureOnly, "fixtureOnly", true);
  requireValue(record.staticFixture, "staticFixture", true);
  requireValue(record.syntheticOnly, "syntheticOnly", true);
  requireValue(record.notProviderResponseJson, "notProviderResponseJson", true);
  requireValue(record.notProviderSdkResponse, "notProviderSdkResponse", true);
  requireValue(record.notProductionPayload, "notProductionPayload", true);
  requireValue(record.notFutureApiContract, "notFutureApiContract", true);
  requireString(record.envelopeId, "envelopeId");
  requireString(record.envelopeContentIdentity, "envelopeContentIdentity");
}

function validateObservationEnvelope(record: Record<string, unknown>): void {
  requireValue(record.kind, "observationEnvelope.kind", "ObservationEnvelope");
  const trust = requirePlainOwnRecord(record, "trust", "observationEnvelope.trust");
  const requiredTrust = [
    ["untrusted", true],
    ["nonAuthoritative", true],
    ["candidateEvidenceOnly", true],
    ["sourceTruth", false],
    ["coreInput", false],
    ["packageApiTruth", false],
    ["connectorTruth", false],
    ["acceptedStructuredGeometry", false],
  ] as const;

  for (const [field, value] of requiredTrust) {
    requireValue(trust[field], `observationEnvelope.trust.${field}`, value);
  }

  for (const field of ["candidateLabels", "candidateMeasurements", "candidateGeometrySuggestions"] as const) {
    const values = requireArray(record[field], `observationEnvelope.${field}`);
    for (const [index, value] of values.entries()) {
      validateEvidenceOnlyRecord(value, `observationEnvelope.${field}[${index}]`);
    }
  }

  const diagnosticMetadata = requirePlainOwnRecord(record, "diagnosticMetadata", "observationEnvelope.diagnosticMetadata");
  validateEvidenceOnlyRecord(diagnosticMetadata, "observationEnvelope.diagnosticMetadata");
  requireValue(diagnosticMetadata.canAuthorizeAcceptance, "observationEnvelope.diagnosticMetadata.canAuthorizeAcceptance", false);
  requireValue(diagnosticMetadata.canCreateGeometry, "observationEnvelope.diagnosticMetadata.canCreateGeometry", false);
  requireValue(diagnosticMetadata.canModifyEvaluation, "observationEnvelope.diagnosticMetadata.canModifyEvaluation", false);

  const promptText = requirePlainOwnRecord(record, "promptText", "observationEnvelope.promptText");
  validateEvidenceOnlyRecord(promptText, "observationEnvelope.promptText");
  requireValue(promptText.sourceTruth, "observationEnvelope.promptText.sourceTruth", false);
}

function validateAcceptanceBoundary(
  record: Record<string, unknown>,
  observationIdentity: string,
  observationContentIdentity: string,
): void {
  requireValue(record.kind, "acceptanceBoundary.kind", "AcceptanceBoundary");
  requireValue(record.acceptanceMode, "acceptanceBoundary.acceptanceMode", "explicit_fixture_acceptance");
  requireValue(record.acceptanceStatus, "acceptanceBoundary.acceptanceStatus", "accepted");
  requireValue(record.outsideProviderBoundary, "acceptanceBoundary.outsideProviderBoundary", true);
  requireValue(record.providerEvidenceSelfAccepted, "acceptanceBoundary.providerEvidenceSelfAccepted", false);

  const actor = requirePlainOwnRecord(record, "acceptanceActor", "acceptanceBoundary.acceptanceActor");
  requireValue(actor.actorType, "acceptanceBoundary.acceptanceActor.actorType", "deterministic-test");
  requireString(actor.actorId, "acceptanceBoundary.acceptanceActor.actorId");

  const provenance = requirePlainOwnRecord(record, "provenance", "acceptanceBoundary.provenance");
  requireValue(provenance.inputObservationIdentity, "acceptanceBoundary.provenance.inputObservationIdentity", observationIdentity);
  requireValue(
    provenance.inputObservationContentIdentity,
    "acceptanceBoundary.provenance.inputObservationContentIdentity",
    observationContentIdentity,
  );
}

function validateAcceptedStructuredGeometryBoundary(
  accepted: Record<string, unknown>,
  acceptanceBoundary: Record<string, unknown>,
  observationIdentity: string,
  observationContentIdentity: string,
): void {
  requireValue(accepted.sourceObservationId, "acceptedStructuredGeometry.sourceObservationId", observationIdentity);
  requireValue(
    accepted.sourceObservationContentIdentity,
    "acceptedStructuredGeometry.sourceObservationContentIdentity",
    observationContentIdentity,
  );
  requireString(accepted.acceptedGeometryId, "acceptedStructuredGeometry.acceptedGeometryId");
  requireString(accepted.contentIdentity, "acceptedStructuredGeometry.contentIdentity");

  const acceptance = requirePlainOwnRecord(accepted, "acceptance", "acceptedStructuredGeometry.acceptance");
  const boundaryActor = requirePlainOwnRecord(
    acceptanceBoundary,
    "acceptanceActor",
    "acceptanceBoundary.acceptanceActor",
  );
  requireValue(acceptance.accepted, "acceptedStructuredGeometry.acceptance.accepted", true);
  requireValue(acceptance.actorType, "acceptedStructuredGeometry.acceptance.actorType", boundaryActor.actorType);
  requireValue(acceptance.actorId, "acceptedStructuredGeometry.acceptance.actorId", boundaryActor.actorId);
  requireValue(acceptance.sourceObservationId, "acceptedStructuredGeometry.acceptance.sourceObservationId", observationIdentity);
  requireValue(
    acceptance.sourceObservationContentIdentity,
    "acceptedStructuredGeometry.acceptance.sourceObservationContentIdentity",
    observationContentIdentity,
  );

  const provenance = requirePlainOwnRecord(accepted, "provenance", "acceptedStructuredGeometry.provenance");
  requireValue(provenance.operationId, "acceptedStructuredGeometry.provenance.operationId", "synthetic-external-evidence.acceptance-boundary");
  requireValue(provenance.actorType, "acceptedStructuredGeometry.provenance.actorType", boundaryActor.actorType);
  requireValue(provenance.actorId, "acceptedStructuredGeometry.provenance.actorId", boundaryActor.actorId);
  requireValue(provenance.inputContentIdentity, "acceptedStructuredGeometry.provenance.inputContentIdentity", observationContentIdentity);
}

function validateEvidenceOnlyCollections(
  observationEnvelope: Record<string, unknown>,
  warnings: Record<string, unknown>,
  derivedArtifacts: readonly unknown[],
): void {
  requireValue(warnings.diagnosticOnly, "warnings.diagnosticOnly", true);
  requireArray(warnings.lossyConversionWarnings, "warnings.lossyConversionWarnings");
  requireArray(warnings.evidenceLimitations, "warnings.evidenceLimitations");

  for (const [index, value] of derivedArtifacts.entries()) {
    const artifact = requirePlainRecord(value, `derivedArtifacts[${index}]`);
    requireValue(artifact.candidateEvidenceOnly, `derivedArtifacts[${index}].candidateEvidenceOnly`, true);
    requireValue(artifact.sourceTruth, `derivedArtifacts[${index}].sourceTruth`, false);
    requireValue(artifact.coreInput, `derivedArtifacts[${index}].coreInput`, false);
    requireValue(artifact.mayAuthorizeAcceptance, `derivedArtifacts[${index}].mayAuthorizeAcceptance`, false);
    requireValue(artifact.mayOverrideAcceptedGeometry, `derivedArtifacts[${index}].mayOverrideAcceptedGeometry`, false);
  }

  if (validateAcceptedGeometryV1(observationEnvelope).ok) {
    throw invalid("observationEnvelope", "must not validate as accepted geometry");
  }
}

function validateEvidenceOnlyRecord(value: unknown, path: string): void {
  const record = requirePlainRecord(value, path);
  requireValue(record.untrusted, `${path}.untrusted`, true);
  requireValue(record.nonAuthoritative, `${path}.nonAuthoritative`, true);
  requireValue(record.candidateEvidenceOnly, `${path}.candidateEvidenceOnly`, true);
}

function requirePlainOwnRecord(
  record: Record<string, unknown>,
  field: string,
  path = field,
): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(record, field)) {
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

function requireValue(value: unknown, path: string, expected: unknown): void {
  if (value !== expected) {
    throw invalid(path, `requires ${String(expected)}`);
  }
}

function invalid(field: string, reason: string): SyntheticExternalEvidenceAcceptanceProofError {
  return new SyntheticExternalEvidenceAcceptanceProofError(
    `Invalid synthetic external evidence acceptance proof envelope field "${field}": ${reason}.`,
  );
}
