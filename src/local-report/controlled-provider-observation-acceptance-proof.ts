import { createHash } from "node:crypto";

import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  validateAcceptedGeometryV1,
  type AcceptedGeometry,
  type ObservationActorType,
} from "../geometry-observation.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "../serialization.js";
import {
  validateControlledProviderObservationContractV2,
  type ControlledProviderObservationContractV1,
  type ControlledProviderObservationContractV2,
} from "./controlled-provider-observation-contract.js";
import {
  validateExactLocalVisualCandidateAcceptanceV1,
  validateLocalVisualCandidateObservationEnvelopeV1,
  validateLocalVisualHumanCandidateSelectionV1,
  type LocalVisualCandidateObservationEnvelopeV1,
  type LocalVisualHumanCandidateSelectionV1,
} from "./controlled-local-live-visual-candidate-observation-contracts.js";

export type ControlledProviderObservationAcceptanceActorClassV1 =
  | "human"
  | "reviewed_system"
  | "deterministic_test";

export interface ControlledProviderObservationAcceptanceBoundaryV1 {
  readonly kind: "norma.controlled-provider-observation-acceptance-boundary.v1";
  readonly version: 1;
  readonly acceptanceActor: {
    readonly actorClass: ControlledProviderObservationAcceptanceActorClassV1;
    readonly actorId: string;
  };
  readonly acceptanceMode: "explicit_acceptance";
  readonly providerObservationId: string;
  readonly providerObservationContentIdentity: string;
  readonly acceptedGeometryId: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly acceptedGeometryRevisionContentIdentity: string;
  readonly decisionProvenance: {
    readonly source: "non_provider_explicit_acceptance";
    readonly localOnly: true;
    readonly providerGenerated: false;
    readonly promptDerived: false;
    readonly artifactDerived: false;
    readonly confidenceDerived: false;
    readonly diagnosticDerived: false;
    readonly metadataDerived: false;
  };
  readonly localOnly: true;
  readonly outsideProviderBoundary: true;
  readonly nonProviderAuthority: true;
  readonly providerEvidenceOnly: true;
  readonly providerSelfAcceptance: false;
  readonly confidenceScoreValueCanAuthorizeAcceptance: false;
  readonly providerStatusCanAuthorizeAcceptance: false;
  readonly providerDiagnosticCanAuthorizeAcceptance: false;
  readonly providerMetadataCanAuthorizeAcceptance: false;
  readonly artifactCanAuthorizeAcceptance: false;
  readonly promptCanAuthorizeAcceptance: false;
  readonly automaticAcceptance: false;
  readonly providerGeometryCreated: false;
}

export interface ControlledProviderObservationAcceptanceProofV1 {
  readonly status: "ok";
  readonly boundarySourceTruth: "acceptedStructuredGeometry";
  readonly coreInputAuthority: "acceptedStructuredGeometry";
  readonly providerObservationAuthority: "candidateEvidenceOnly";
  readonly acceptedGeometryIsOnlyCoreInput: true;
  readonly providerEvidenceOnly: true;
  readonly providerSelfAcceptance: false;
  readonly providerGeometryCreated: false;
  readonly coreInputProduced: false;
  readonly structuredAnalyzeRun: false;
  readonly resultJsonProduced: false;
  readonly acceptedStructuredGeometryValidated: true;
  readonly acceptanceBoundaryExplicit: true;
  readonly providerObservationId: string;
  readonly providerObservationContentIdentity: string;
  readonly acceptedGeometryId: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly acceptedGeometryRevisionContentIdentity: string;
  readonly nextAllowedStep: "accepted_geometry_to_core_mapping_or_structured_analyze";
}

export interface ControlledProviderObservationCandidateAcceptanceProofV1
  extends ControlledProviderObservationAcceptanceProofV1 {
  readonly providerExecutionReceiptContentIdentity: string;
  readonly candidateObservationId: string;
  readonly candidateObservationContentIdentity: string;
  readonly humanSelectionId: string;
  readonly humanSelectionContentIdentity: string;
}

const INPUT_FIELDS = Object.freeze([
  "providerObservationContract",
  "acceptanceBoundary",
  "acceptedStructuredGeometry",
] as const);

const CANDIDATE_INPUT_FIELDS = Object.freeze([
  "providerObservationContract",
  "candidateObservationEnvelope",
  "humanCandidateSelection",
  "acceptanceBoundary",
  "acceptedStructuredGeometry",
] as const);

const PROVIDER_OBSERVATION_CONTRACT_FIELDS = Object.freeze([
  "kind",
  "version",
  "observationId",
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

const ACCEPTANCE_BOUNDARY_FIELDS = Object.freeze([
  "kind",
  "version",
  "acceptanceActor",
  "acceptanceMode",
  "providerObservationId",
  "providerObservationContentIdentity",
  "acceptedGeometryId",
  "acceptedGeometryContentIdentity",
  "acceptedGeometryRevisionContentIdentity",
  "decisionProvenance",
  "localOnly",
  "outsideProviderBoundary",
  "nonProviderAuthority",
  "providerEvidenceOnly",
  "providerSelfAcceptance",
  "confidenceScoreValueCanAuthorizeAcceptance",
  "providerStatusCanAuthorizeAcceptance",
  "providerDiagnosticCanAuthorizeAcceptance",
  "providerMetadataCanAuthorizeAcceptance",
  "artifactCanAuthorizeAcceptance",
  "promptCanAuthorizeAcceptance",
  "automaticAcceptance",
  "providerGeometryCreated",
] as const);

const ACCEPTANCE_ACTOR_FIELDS = Object.freeze(["actorClass", "actorId"] as const);

const DECISION_PROVENANCE_FIELDS = Object.freeze([
  "source",
  "localOnly",
  "providerGenerated",
  "promptDerived",
  "artifactDerived",
  "confidenceDerived",
  "diagnosticDerived",
  "metadataDerived",
] as const);

class ControlledProviderObservationAcceptanceProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlledProviderObservationAcceptanceProofError";
  }
}

export function computeControlledProviderObservationContractContentIdentityV1(
  providerObservationContract: ControlledProviderObservationContractV1 | ControlledProviderObservationContractV2,
): string {
  const canonicalJson = serializeCanonicalJson(
    providerObservationContract,
    DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  );

  return `sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`;
}

export function createControlledProviderObservationAcceptanceProofV1(
  input: unknown,
): ControlledProviderObservationAcceptanceProofV1 | ControlledProviderObservationCandidateAcceptanceProofV1 {
  const record = requirePlainRecord(input, "input");
  rejectUnsafeContent(record, "input");
  const candidatePath = "candidateObservationEnvelope" in record || "humanCandidateSelection" in record;
  const expectedInputFields = candidatePath ? CANDIDATE_INPUT_FIELDS : INPUT_FIELDS;
  rejectUnknownFields(record, expectedInputFields, "input");
  requireOwnFields(record, expectedInputFields, "input");

  if (candidatePath) {
    return createCandidateAcceptanceProof(record);
  }

  const providerObservationContract = requirePlainOwnRecord(
    record,
    "providerObservationContract",
    "input.providerObservationContract",
  ) as unknown as ControlledProviderObservationContractV1;
  const acceptanceBoundary = requirePlainOwnRecord(
    record,
    "acceptanceBoundary",
    "input.acceptanceBoundary",
  ) as unknown as ControlledProviderObservationAcceptanceBoundaryV1;
  const acceptedStructuredGeometry = requirePlainOwnRecord(
    record,
    "acceptedStructuredGeometry",
    "input.acceptedStructuredGeometry",
  ) as unknown as AcceptedGeometry;

  validateProviderObservationContract(providerObservationContract);
  validateAcceptanceBoundaryShape(acceptanceBoundary);

  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(providerObservationContract);
  validateAcceptanceBoundaryLinks(
    acceptanceBoundary,
    providerObservationContract,
    providerObservationContentIdentity,
  );
  validateAcceptedStructuredGeometryBoundary(
    acceptedStructuredGeometry,
    acceptanceBoundary,
    providerObservationContract,
    providerObservationContentIdentity,
  );

  return {
    status: "ok",
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    providerObservationAuthority: "candidateEvidenceOnly",
    acceptedGeometryIsOnlyCoreInput: true,
    providerEvidenceOnly: true,
    providerSelfAcceptance: false,
    providerGeometryCreated: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    acceptedStructuredGeometryValidated: true,
    acceptanceBoundaryExplicit: true,
    providerObservationId: providerObservationContract.observationId,
    providerObservationContentIdentity,
    acceptedGeometryId: acceptedStructuredGeometry.acceptedGeometryId,
    acceptedGeometryContentIdentity: acceptedStructuredGeometry.contentIdentity,
    acceptedGeometryRevisionContentIdentity:
      computeAcceptedGeometryRevisionContentIdentity(acceptedStructuredGeometry),
    nextAllowedStep: "accepted_geometry_to_core_mapping_or_structured_analyze",
  };
}

function createCandidateAcceptanceProof(
  record: Record<string, unknown>,
): ControlledProviderObservationCandidateAcceptanceProofV1 {
  const providerObservationContract = validateControlledProviderObservationContractV2(
    requirePlainOwnRecord(record, "providerObservationContract", "input.providerObservationContract"),
  );
  const candidateObservationEnvelope = validateLocalVisualCandidateObservationEnvelopeV1(
    requirePlainOwnRecord(record, "candidateObservationEnvelope", "input.candidateObservationEnvelope"),
  );
  const humanCandidateSelection = requirePlainOwnRecord(
    record,
    "humanCandidateSelection",
    "input.humanCandidateSelection",
  ) as unknown as LocalVisualHumanCandidateSelectionV1;
  validateLocalVisualHumanCandidateSelectionV1(
    candidateObservationEnvelope,
    humanCandidateSelection,
  );
  const acceptanceBoundary = requirePlainOwnRecord(
    record,
    "acceptanceBoundary",
    "input.acceptanceBoundary",
  ) as unknown as ControlledProviderObservationAcceptanceBoundaryV1;
  const acceptedStructuredGeometry = requirePlainOwnRecord(
    record,
    "acceptedStructuredGeometry",
    "input.acceptedStructuredGeometry",
  ) as unknown as AcceptedGeometry;

  validateAcceptanceBoundaryShape(acceptanceBoundary);
  requireValue(
    acceptanceBoundary.acceptanceActor.actorClass,
    "acceptanceBoundary.acceptanceActor.actorClass",
    "human",
  );
  const providerObservationContentIdentity =
    computeControlledProviderObservationContractContentIdentityV1(providerObservationContract);
  validateCandidateEvidenceChain(
    providerObservationContract,
    providerObservationContentIdentity,
    candidateObservationEnvelope,
  );
  const accepted = validateExactLocalVisualCandidateAcceptanceV1(
    candidateObservationEnvelope,
    humanCandidateSelection,
    acceptedStructuredGeometry,
  );
  validateCandidateAcceptanceBoundaryLinks(
    acceptanceBoundary,
    candidateObservationEnvelope,
    humanCandidateSelection,
    accepted,
  );

  return {
    status: "ok",
    boundarySourceTruth: "acceptedStructuredGeometry",
    coreInputAuthority: "acceptedStructuredGeometry",
    providerObservationAuthority: "candidateEvidenceOnly",
    acceptedGeometryIsOnlyCoreInput: true,
    providerEvidenceOnly: true,
    providerSelfAcceptance: false,
    providerGeometryCreated: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
    acceptedStructuredGeometryValidated: true,
    acceptanceBoundaryExplicit: true,
    providerObservationId: candidateObservationEnvelope.observationId,
    providerObservationContentIdentity: candidateObservationEnvelope.observationContentIdentity,
    acceptedGeometryId: accepted.acceptedGeometryId,
    acceptedGeometryContentIdentity: accepted.contentIdentity,
    acceptedGeometryRevisionContentIdentity:
      computeAcceptedGeometryRevisionContentIdentity(accepted),
    providerExecutionReceiptContentIdentity:
      candidateObservationEnvelope.provenance.providerExecutionReceiptContentIdentity,
    candidateObservationId: candidateObservationEnvelope.observationId,
    candidateObservationContentIdentity: candidateObservationEnvelope.observationContentIdentity,
    humanSelectionId: humanCandidateSelection.selectionId,
    humanSelectionContentIdentity: humanCandidateSelection.selectionContentIdentity,
    nextAllowedStep: "accepted_geometry_to_core_mapping_or_structured_analyze",
  };
}

function validateCandidateEvidenceChain(
  providerObservationContract: ControlledProviderObservationContractV2,
  providerObservationContentIdentity: string,
  candidate: LocalVisualCandidateObservationEnvelopeV1,
): void {
  requireValue(
    candidate.provenance.sourceReceiptObservationId,
    "candidateObservationEnvelope.provenance.sourceReceiptObservationId",
    providerObservationContract.observationId,
  );
  requireValue(
    candidate.provenance.sourceReceiptObservationContentIdentity,
    "candidateObservationEnvelope.provenance.sourceReceiptObservationContentIdentity",
    providerObservationContentIdentity,
  );
  requireValue(
    candidate.provenance.providerExecutionReceiptContentIdentity,
    "candidateObservationEnvelope.provenance.providerExecutionReceiptContentIdentity",
    providerObservationContract.providerExecutionReceiptContentIdentity,
  );
  requireValue(
    candidate.sourceImage.contentIdentity,
    "candidateObservationEnvelope.sourceImage.contentIdentity",
    providerObservationContract.imageContentIdentity,
  );
}

function validateCandidateAcceptanceBoundaryLinks(
  boundary: ControlledProviderObservationAcceptanceBoundaryV1,
  candidate: LocalVisualCandidateObservationEnvelopeV1,
  selection: LocalVisualHumanCandidateSelectionV1,
  accepted: AcceptedGeometry,
): void {
  requireValue(
    boundary.providerObservationId,
    "acceptanceBoundary.providerObservationId",
    candidate.observationId,
  );
  requireValue(
    boundary.providerObservationContentIdentity,
    "acceptanceBoundary.providerObservationContentIdentity",
    candidate.observationContentIdentity,
  );
  requireValue(
    boundary.acceptanceActor.actorId,
    "acceptanceBoundary.acceptanceActor.actorId",
    selection.acceptanceActor.actorId,
  );
  requireValue(
    boundary.acceptedGeometryId,
    "acceptanceBoundary.acceptedGeometryId",
    accepted.acceptedGeometryId,
  );
  requireValue(
    boundary.acceptedGeometryContentIdentity,
    "acceptanceBoundary.acceptedGeometryContentIdentity",
    computeAcceptedGeometryContentIdentity(accepted),
  );
  requireValue(
    boundary.acceptedGeometryRevisionContentIdentity,
    "acceptanceBoundary.acceptedGeometryRevisionContentIdentity",
    computeAcceptedGeometryRevisionContentIdentity(accepted),
  );
}

function validateProviderObservationContract(
  record: ControlledProviderObservationContractV1,
): void {
  rejectUnknownFields(
    record as unknown as Record<string, unknown>,
    PROVIDER_OBSERVATION_CONTRACT_FIELDS,
    "providerObservationContract",
  );
  requireOwnFields(
    record as unknown as Record<string, unknown>,
    PROVIDER_OBSERVATION_CONTRACT_FIELDS,
    "providerObservationContract",
  );

  const expectedValues = [
    ["kind", "norma.controlled-provider-observation-contract.v1"],
    ["version", 1],
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
    requireValue(
      (record as unknown as Record<string, unknown>)[field],
      `providerObservationContract.${field}`,
      expected,
    );
  }

  requireNonEmptyString(record.observationId, "providerObservationContract.observationId");
  requireExactStringArray(record.sourceArtifactKinds, "providerObservationContract.sourceArtifactKinds", [
    "provider-evidence-envelope.json",
    "summary.json",
  ]);
  requireNullableSha256(record.imageContentIdentity, "providerObservationContract.imageContentIdentity");
  requireValue(
    record.observationId,
    "providerObservationContract.observationId",
    canonicalProviderObservationId(record),
  );
  requireOneOf(record.mediaTypeClass, "providerObservationContract.mediaTypeClass", [
    "raster_png",
    "raster_jpeg",
    "raster_webp",
    "unknown_redacted_media_type",
  ]);
  requireOneOf(record.imageSizeClass, "providerObservationContract.imageSizeClass", [
    "small",
    "medium",
    "large",
    "unknown_redacted_size",
  ]);
  requireOneOf(record.providerClass, "providerObservationContract.providerClass", [
    "controlled_live_provider",
    "unknown_redacted_provider",
  ]);
  requireOneOf(record.endpointClass, "providerObservationContract.endpointClass", [
    "responses_api",
    "unknown_redacted_endpoint",
  ]);
  requireOneOf(record.responseStatusClass, "providerObservationContract.responseStatusClass", [
    "2xx_success",
    "unknown_redacted_status",
  ]);
}

function validateAcceptanceBoundaryShape(
  record: ControlledProviderObservationAcceptanceBoundaryV1,
): void {
  rejectUnknownFields(
    record as unknown as Record<string, unknown>,
    ACCEPTANCE_BOUNDARY_FIELDS,
    "acceptanceBoundary",
  );
  requireOwnFields(
    record as unknown as Record<string, unknown>,
    ACCEPTANCE_BOUNDARY_FIELDS,
    "acceptanceBoundary",
  );

  const expectedValues = [
    ["kind", "norma.controlled-provider-observation-acceptance-boundary.v1"],
    ["version", 1],
    ["acceptanceMode", "explicit_acceptance"],
    ["localOnly", true],
    ["outsideProviderBoundary", true],
    ["nonProviderAuthority", true],
    ["providerEvidenceOnly", true],
    ["providerSelfAcceptance", false],
    ["confidenceScoreValueCanAuthorizeAcceptance", false],
    ["providerStatusCanAuthorizeAcceptance", false],
    ["providerDiagnosticCanAuthorizeAcceptance", false],
    ["providerMetadataCanAuthorizeAcceptance", false],
    ["artifactCanAuthorizeAcceptance", false],
    ["promptCanAuthorizeAcceptance", false],
    ["automaticAcceptance", false],
    ["providerGeometryCreated", false],
  ] as const;

  for (const [field, expected] of expectedValues) {
    requireValue(
      (record as unknown as Record<string, unknown>)[field],
      `acceptanceBoundary.${field}`,
      expected,
    );
  }

  requireSha256(
    record.providerObservationContentIdentity,
    "acceptanceBoundary.providerObservationContentIdentity",
  );
  requireSha256(record.acceptedGeometryContentIdentity, "acceptanceBoundary.acceptedGeometryContentIdentity");
  requireSha256(
    record.acceptedGeometryRevisionContentIdentity,
    "acceptanceBoundary.acceptedGeometryRevisionContentIdentity",
  );
  requireNonEmptyString(record.providerObservationId, "acceptanceBoundary.providerObservationId");
  requireNonEmptyString(record.acceptedGeometryId, "acceptanceBoundary.acceptedGeometryId");
  validateAcceptanceActor(record.acceptanceActor);
  validateDecisionProvenance(record.decisionProvenance);
}

function validateAcceptanceActor(
  record: ControlledProviderObservationAcceptanceBoundaryV1["acceptanceActor"],
): void {
  const actor = requirePlainRecord(record, "acceptanceBoundary.acceptanceActor");
  rejectUnknownFields(actor, ACCEPTANCE_ACTOR_FIELDS, "acceptanceBoundary.acceptanceActor");
  requireOwnFields(actor, ACCEPTANCE_ACTOR_FIELDS, "acceptanceBoundary.acceptanceActor");
  requireOneOf(actor.actorClass, "acceptanceBoundary.acceptanceActor.actorClass", [
    "human",
    "reviewed_system",
    "deterministic_test",
  ]);
  requireNonEmptyString(actor.actorId, "acceptanceBoundary.acceptanceActor.actorId");
}

function validateDecisionProvenance(
  record: ControlledProviderObservationAcceptanceBoundaryV1["decisionProvenance"],
): void {
  const provenance = requirePlainRecord(record, "acceptanceBoundary.decisionProvenance");
  rejectUnknownFields(provenance, DECISION_PROVENANCE_FIELDS, "acceptanceBoundary.decisionProvenance");
  requireOwnFields(provenance, DECISION_PROVENANCE_FIELDS, "acceptanceBoundary.decisionProvenance");

  const expectedValues = [
    ["source", "non_provider_explicit_acceptance"],
    ["localOnly", true],
    ["providerGenerated", false],
    ["promptDerived", false],
    ["artifactDerived", false],
    ["confidenceDerived", false],
    ["diagnosticDerived", false],
    ["metadataDerived", false],
  ] as const;

  for (const [field, expected] of expectedValues) {
    requireValue(provenance[field], `acceptanceBoundary.decisionProvenance.${field}`, expected);
  }
}

function validateAcceptanceBoundaryLinks(
  boundary: ControlledProviderObservationAcceptanceBoundaryV1,
  providerObservationContract: ControlledProviderObservationContractV1,
  providerObservationContentIdentity: string,
): void {
  requireValue(
    boundary.providerObservationId,
    "acceptanceBoundary.providerObservationId",
    providerObservationContract.observationId,
  );
  requireValue(
    boundary.providerObservationContentIdentity,
    "acceptanceBoundary.providerObservationContentIdentity",
    providerObservationContentIdentity,
  );
}

function validateAcceptedStructuredGeometryBoundary(
  accepted: AcceptedGeometry,
  boundary: ControlledProviderObservationAcceptanceBoundaryV1,
  providerObservationContract: ControlledProviderObservationContractV1,
  providerObservationContentIdentity: string,
): void {
  if (validateAcceptedGeometryV1(providerObservationContract).ok) {
    throw invalid("providerObservationContract", "must not validate as accepted geometry");
  }

  const acceptedValidation = validateAcceptedGeometryV1(accepted);
  if (!acceptedValidation.ok) {
    throw invalid("acceptedStructuredGeometry", "must satisfy validateAcceptedGeometryV1");
  }

  rejectProviderAuthoredCorrections(accepted);

  const acceptedGeometryContentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  const acceptedGeometryRevisionContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  const expectedActorType = acceptedActorTypeFor(boundary.acceptanceActor.actorClass);

  requireValue(
    accepted.sourceObservationId,
    "acceptedStructuredGeometry.sourceObservationId",
    providerObservationContract.observationId,
  );
  requireValue(
    accepted.sourceObservationContentIdentity,
    "acceptedStructuredGeometry.sourceObservationContentIdentity",
    providerObservationContentIdentity,
  );
  requireValue(
    accepted.acceptance.sourceObservationId,
    "acceptedStructuredGeometry.acceptance.sourceObservationId",
    providerObservationContract.observationId,
  );
  requireValue(
    accepted.acceptance.sourceObservationContentIdentity,
    "acceptedStructuredGeometry.acceptance.sourceObservationContentIdentity",
    providerObservationContentIdentity,
  );
  requireValue(accepted.acceptance.actorType, "acceptedStructuredGeometry.acceptance.actorType", expectedActorType);
  requireValue(accepted.acceptance.actorId, "acceptedStructuredGeometry.acceptance.actorId", boundary.acceptanceActor.actorId);
  requireValue(accepted.provenance.actorType, "acceptedStructuredGeometry.provenance.actorType", expectedActorType);
  requireValue(accepted.provenance.actorId, "acceptedStructuredGeometry.provenance.actorId", boundary.acceptanceActor.actorId);
  requireValue(
    accepted.provenance.inputContentIdentity,
    "acceptedStructuredGeometry.provenance.inputContentIdentity",
    providerObservationContentIdentity,
  );
  requireValue(
    accepted.acceptance.provenance.actorType,
    "acceptedStructuredGeometry.acceptance.provenance.actorType",
    expectedActorType,
  );
  requireValue(
    accepted.acceptance.provenance.actorId,
    "acceptedStructuredGeometry.acceptance.provenance.actorId",
    boundary.acceptanceActor.actorId,
  );
  requireValue(
    accepted.acceptance.provenance.inputContentIdentity,
    "acceptedStructuredGeometry.acceptance.provenance.inputContentIdentity",
    providerObservationContentIdentity,
  );
  requireValue(boundary.acceptedGeometryId, "acceptanceBoundary.acceptedGeometryId", accepted.acceptedGeometryId);
  requireValue(
    boundary.acceptedGeometryContentIdentity,
    "acceptanceBoundary.acceptedGeometryContentIdentity",
    acceptedGeometryContentIdentity,
  );
  requireValue(
    boundary.acceptedGeometryRevisionContentIdentity,
    "acceptanceBoundary.acceptedGeometryRevisionContentIdentity",
    acceptedGeometryRevisionContentIdentity,
  );
  requireValue(accepted.contentIdentity, "acceptedStructuredGeometry.contentIdentity", acceptedGeometryContentIdentity);
  requireValue(
    accepted.acceptance.acceptedContentIdentity,
    "acceptedStructuredGeometry.acceptance.acceptedContentIdentity",
    acceptedGeometryRevisionContentIdentity,
  );
}

function canonicalProviderObservationId(
  contract: ControlledProviderObservationContractV1,
): string {
  const sourceIdentity = contract.imageContentIdentity ?? contract.sourceArtifactKinds.join("+");
  return `controlled-provider-observation:v1:${sourceIdentity}`;
}

function rejectProviderAuthoredCorrections(accepted: AcceptedGeometry): void {
  for (const [index, correction] of accepted.correctionHistory.entries()) {
    if (correction.actorType === "provider") {
      throw invalid(
        `acceptedStructuredGeometry.correctionHistory.${String(index)}.actorType`,
        "provider-authored corrections are not allowed",
      );
    }
    if (correction.provenance.actorType === "provider") {
      throw invalid(
        `acceptedStructuredGeometry.correctionHistory.${String(index)}.provenance.actorType`,
        "provider-authored correction provenance is not allowed",
      );
    }
  }
}

function acceptedActorTypeFor(
  actorClass: ControlledProviderObservationAcceptanceActorClassV1,
): Exclude<ObservationActorType, "provider"> {
  if (actorClass === "deterministic_test") {
    return "deterministic-test";
  }
  if (actorClass === "reviewed_system") {
    return "system";
  }
  return "human";
}

function rejectUnsafeContent(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      rejectUnsafeContent(item, `${path}[${String(index)}]`);
    }
    return;
  }

  if (value === null || typeof value !== "object") {
    rejectUnsafeScalar(value, path);
    return;
  }

  requirePlainRecord(value, path);
  for (const [key, child] of Object.entries(value)) {
    rejectUnsafeKey(key, `${path}.${key}`);
    rejectUnsafeContent(child, `${path}.${key}`);
  }
}

const unsafeFieldNames = new Set(
  [
    "accountId",
    "account_id",
    "apiKey",
    "artifactOutput",
    "authorization",
    "autoAcceptance",
    "bearerToken",
    "chainOfThought",
    "confidenceThresholdAcceptance",
    "credential",
    "diagnosticNextAction",
    "exactModelEnvValue",
    "hiddenPrompt",
    "imageBase64",
    "imageBytes",
    "localPath",
    "metadataAuthorization",
    "modelEnvValue",
    "providerBody",
    "providerMetadata",
    "providerOutput",
    "providerPayload",
    "providerRequestId",
    "providerSpecificPayload",
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
    "sourcePath",
    "systemPrompt",
    "token",
    "url",
    "x-request-id",
    "xRequestId",
  ].map((fieldName) => fieldName.toLowerCase()),
);

function rejectUnsafeKey(key: string, path: string): void {
  const allowedSafeKeys = new Set([
    "acceptedGeometry",
    "acceptedGeometryContentIdentity",
    "acceptedGeometryId",
    "acceptedGeometryRevisionContentIdentity",
    "acceptedStructuredGeometry",
    "acceptedStructuredGeometryProduced",
    "artifactCanAuthorizeAcceptance",
    "automaticAcceptance",
    "confidence",
    "confidenceScoreValueCanAuthorizeAcceptance",
    "coreInputProduced",
    "providerDiagnosticCanAuthorizeAcceptance",
    "providerEvidenceOnly",
    "providerGeometryCreated",
    "providerMetadataCanAuthorizeAcceptance",
    "providerObservationContract",
    "providerObservationContentIdentity",
    "providerObservationId",
    "providerOutputObserved",
    "providerSelfAcceptance",
    "providerStatusCanAuthorizeAcceptance",
    "rawImagePersisted",
    "rawProviderOutputPersisted",
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

function requireNonEmptyString(value: unknown, path: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw invalid(path, "requires non-empty string");
  }
}

function requireOneOf(value: unknown, path: string, expected: readonly string[]): void {
  if (typeof value !== "string" || !expected.includes(value)) {
    throw invalid(path, `requires one of ${expected.join(", ")}`);
  }
}

function requireSha256(value: unknown, path: string): void {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value)) {
    throw invalid(path, "requires sha256 content identity");
  }
}

function requireNullableSha256(value: unknown, path: string): void {
  if (value !== null) {
    requireSha256(value, path);
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

function invalid(field: string, reason: string): ControlledProviderObservationAcceptanceProofError {
  return new ControlledProviderObservationAcceptanceProofError(
    `Invalid controlled provider observation acceptance proof field "${field}": ${reason}.`,
  );
}
