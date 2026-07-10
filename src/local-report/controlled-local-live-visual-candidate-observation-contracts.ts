import { createHash } from "node:crypto";

import {
  ACCEPTED_GEOMETRY_CONTRACT_ID,
  ACCEPTED_GEOMETRY_CONTRACT_VERSION,
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  validateAcceptedGeometryV1,
  type AcceptedGeometry,
  type CoordinateFrame,
  type RectanglePrimitive,
} from "../geometry-observation.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "../serialization.js";

type NodeUtilModule = {
  readonly types?: {
    readonly isProxy?: (value: unknown) => boolean;
  };
};

const nodeProcess = globalThis as typeof globalThis & {
  readonly process?: {
    readonly getBuiltinModule?: (id: string) => unknown;
  };
};
const nodeUtilTypes = (
  nodeProcess.process?.getBuiltinModule?.("node:util") as NodeUtilModule | undefined
)?.types;

const LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_CONTRACT_ID =
  "norma.local-visual-provider-execution-receipt@1" as const;
const LOCAL_VISUAL_CANDIDATE_OBSERVATION_CONTRACT_ID =
  "norma.local-visual-candidate-observation@1" as const;
const LOCAL_VISUAL_HUMAN_CANDIDATE_SELECTION_CONTRACT_ID =
  "norma.local-visual-human-candidate-selection@1" as const;

export interface LocalVisualProviderExecutionReceiptV1 {
  readonly contractId: typeof LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly executionReceiptContentIdentity: string;
  readonly sourceImageContentIdentity: string;
  readonly providerClass: "controlled_live_provider";
  readonly endpointClass: "responses_api";
  readonly responseStatusClass: "2xx_success";
  readonly providerResponseContentIdentity: string;
  readonly structuredOutputSchemaVersion: "controlled-rectangle-candidates@1";
  readonly adapterOperationId: "local-visual-provider-response-to-candidate-observation";
  readonly adapterOperationVersion: 1;
  readonly persistence: {
    readonly rawProviderResponsePersisted: false;
    readonly requestBodyPersisted: false;
    readonly rawImagePersisted: false;
    readonly localPathPersisted: false;
    readonly urlPersisted: false;
    readonly providerRequestIdPersisted: false;
    readonly exactModelValuePersisted: false;
    readonly secretOrCredentialPersisted: false;
  };
}

export interface LocalVisualRectangleCandidateV1 {
  readonly candidateId: string;
  readonly order: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly diagnosticMetadata?: {
    readonly providerConfidence: number;
  };
}

export interface LocalVisualCandidateObservationEnvelopeV1 {
  readonly contractId: typeof LOCAL_VISUAL_CANDIDATE_OBSERVATION_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly observationId: string;
  readonly observationContentIdentity: string;
  readonly sourceImage: {
    readonly contentIdentity: string;
    readonly rawImagePersisted: false;
    readonly base64Persisted: false;
    readonly localPathPersisted: false;
    readonly urlPersisted: false;
  };
  readonly provenance: {
    readonly provenanceClass: "controlled-local-live-visual-observation";
    readonly adapterBoundary: "provider-specific-response-to-provider-neutral-candidate-observation@1";
    readonly sourceReceiptObservationId: string;
    readonly sourceReceiptObservationContentIdentity: string;
    readonly providerExecutionReceiptContentIdentity: string;
    readonly providerSpecificSchemaTerminated: true;
    readonly manualOnly: true;
    readonly localOnly: true;
    readonly realUserData: false;
  };
  readonly coordinateFrame: CoordinateFrame;
  readonly rectangleCandidates: readonly LocalVisualRectangleCandidateV1[];
  readonly lossyWarnings: readonly {
    readonly warningId: string;
    readonly code:
      | "coordinate-normalization-loss"
      | "rectangle-approximation-loss"
      | "provider-confidence-diagnostic-only";
    readonly candidateId: string | null;
  }[];
  readonly authority: {
    readonly providerEvidenceOnly: true;
    readonly sourceTruth: false;
    readonly acceptedGeometry: false;
    readonly coreInput: false;
    readonly maySelfAccept: false;
    readonly requiresExplicitHumanAcceptance: true;
    readonly mayAuthorizeMapping: false;
    readonly mayAuthorizeResultJson: false;
    readonly ratioAuthority: false;
    readonly packAuthority: false;
    readonly ruleAuthority: false;
    readonly toleranceAuthority: false;
    readonly evaluationAuthority: false;
  };
  readonly persistence: {
    readonly providerPayloadPersisted: false;
    readonly rawProviderResponsePersisted: false;
    readonly rawImagePersisted: false;
    readonly redactedStructuredObservationOnly: true;
  };
  readonly outcomes: {
    readonly acceptedGeometryProduced: false;
    readonly coreInputProduced: false;
    readonly structuredAnalyzeRun: false;
    readonly resultJsonProduced: false;
  };
}

export interface LocalVisualHumanCandidateSelectionV1 {
  readonly contractId: typeof LOCAL_VISUAL_HUMAN_CANDIDATE_SELECTION_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly selectionId: string;
  readonly selectionContentIdentity: string;
  readonly candidateObservationId: string;
  readonly candidateObservationContentIdentity: string;
  readonly providerExecutionReceiptContentIdentity: string;
  readonly acceptanceActor: {
    readonly actorClass: "human";
    readonly actorId: string;
  };
  readonly geometryAction: "accept_exact";
  readonly selections: readonly {
    readonly order: number;
    readonly candidateId: string;
    readonly acceptedPrimitiveId: string;
  }[];
  readonly authority: {
    readonly explicitHumanSelection: true;
    readonly providerAuthority: false;
    readonly confidenceAuthority: false;
    readonly automaticAcceptance: false;
    readonly coordinateCorrectionAllowed: false;
    readonly coordinateRepairAllowed: false;
  };
}

export interface LocalVisualSelectedCandidateV1 {
  readonly selection: LocalVisualHumanCandidateSelectionV1["selections"][number];
  readonly candidate: LocalVisualRectangleCandidateV1;
}

export interface LocalVisualImageDimensionsV1 {
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}

const RECEIPT_FIELDS = Object.freeze([
  "contractId",
  "contractVersion",
  "executionReceiptContentIdentity",
  "sourceImageContentIdentity",
  "providerClass",
  "endpointClass",
  "responseStatusClass",
  "providerResponseContentIdentity",
  "structuredOutputSchemaVersion",
  "adapterOperationId",
  "adapterOperationVersion",
  "persistence",
] as const);
const RECEIPT_PERSISTENCE_FIELDS = Object.freeze([
  "rawProviderResponsePersisted",
  "requestBodyPersisted",
  "rawImagePersisted",
  "localPathPersisted",
  "urlPersisted",
  "providerRequestIdPersisted",
  "exactModelValuePersisted",
  "secretOrCredentialPersisted",
] as const);
const CANDIDATE_FIELDS = Object.freeze([
  "contractId",
  "contractVersion",
  "observationId",
  "observationContentIdentity",
  "sourceImage",
  "provenance",
  "coordinateFrame",
  "rectangleCandidates",
  "lossyWarnings",
  "authority",
  "persistence",
  "outcomes",
] as const);
const SOURCE_IMAGE_FIELDS = Object.freeze([
  "contentIdentity",
  "rawImagePersisted",
  "base64Persisted",
  "localPathPersisted",
  "urlPersisted",
] as const);
const CANDIDATE_PROVENANCE_FIELDS = Object.freeze([
  "provenanceClass",
  "adapterBoundary",
  "sourceReceiptObservationId",
  "sourceReceiptObservationContentIdentity",
  "providerExecutionReceiptContentIdentity",
  "providerSpecificSchemaTerminated",
  "manualOnly",
  "localOnly",
  "realUserData",
] as const);
const COORDINATE_FRAME_FIELDS = Object.freeze([
  "dimensions",
  "coordinateScale",
  "origin",
  "xDirection",
  "yDirection",
  "bounds",
  "sourcePixelWidth",
  "sourcePixelHeight",
] as const);
const RECTANGLE_CANDIDATE_REQUIRED_FIELDS = Object.freeze([
  "candidateId",
  "order",
  "x",
  "y",
  "width",
  "height",
] as const);
const CANDIDATE_AUTHORITY_FIELDS = Object.freeze([
  "providerEvidenceOnly",
  "sourceTruth",
  "acceptedGeometry",
  "coreInput",
  "maySelfAccept",
  "requiresExplicitHumanAcceptance",
  "mayAuthorizeMapping",
  "mayAuthorizeResultJson",
  "ratioAuthority",
  "packAuthority",
  "ruleAuthority",
  "toleranceAuthority",
  "evaluationAuthority",
] as const);
const CANDIDATE_PERSISTENCE_FIELDS = Object.freeze([
  "providerPayloadPersisted",
  "rawProviderResponsePersisted",
  "rawImagePersisted",
  "redactedStructuredObservationOnly",
] as const);
const CANDIDATE_OUTCOME_FIELDS = Object.freeze([
  "acceptedGeometryProduced",
  "coreInputProduced",
  "structuredAnalyzeRun",
  "resultJsonProduced",
] as const);
const SELECTION_FIELDS = Object.freeze([
  "contractId",
  "contractVersion",
  "selectionId",
  "selectionContentIdentity",
  "candidateObservationId",
  "candidateObservationContentIdentity",
  "providerExecutionReceiptContentIdentity",
  "acceptanceActor",
  "geometryAction",
  "selections",
  "authority",
] as const);

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

class ControlledLocalLiveVisualCandidateContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlledLocalLiveVisualCandidateContractError";
  }
}

export function sha256ContentIdentityV1(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256")
    .update(value instanceof Uint8Array ? value as unknown as string : value)
    .digest("hex")}`;
}

export function computeLocalVisualProviderExecutionReceiptContentIdentityV1(
  receipt: LocalVisualProviderExecutionReceiptV1,
): string {
  const snapshot = snapshotRecord(receipt, "providerExecutionReceipt");
  const { executionReceiptContentIdentity: _excluded, ...projection } = snapshot;
  return contentIdentityFor(projection);
}

export function createLocalVisualProviderExecutionReceiptV1({
  sourceImageBytes,
  rawProviderResponseBytes,
}: {
  readonly sourceImageBytes: Uint8Array;
  readonly rawProviderResponseBytes: Uint8Array;
}): LocalVisualProviderExecutionReceiptV1 {
  requireNonEmptyBytes(sourceImageBytes, "sourceImageBytes");
  requireNonEmptyBytes(rawProviderResponseBytes, "rawProviderResponseBytes");
  const receipt: LocalVisualProviderExecutionReceiptV1 = {
    contractId: LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_CONTRACT_ID,
    contractVersion: 1,
    executionReceiptContentIdentity: "",
    sourceImageContentIdentity: sha256ContentIdentityV1(sourceImageBytes),
    providerClass: "controlled_live_provider",
    endpointClass: "responses_api",
    responseStatusClass: "2xx_success",
    providerResponseContentIdentity: sha256ContentIdentityV1(rawProviderResponseBytes),
    structuredOutputSchemaVersion: "controlled-rectangle-candidates@1",
    adapterOperationId: "local-visual-provider-response-to-candidate-observation",
    adapterOperationVersion: 1,
    persistence: {
      rawProviderResponsePersisted: false,
      requestBodyPersisted: false,
      rawImagePersisted: false,
      localPathPersisted: false,
      urlPersisted: false,
      providerRequestIdPersisted: false,
      exactModelValuePersisted: false,
      secretOrCredentialPersisted: false,
    },
  };
  return {
    ...receipt,
    executionReceiptContentIdentity:
      computeLocalVisualProviderExecutionReceiptContentIdentityV1(receipt),
  };
}

export function validateLocalVisualProviderExecutionReceiptV1(
  value: unknown,
  rawProviderResponseBytes?: Uint8Array,
): LocalVisualProviderExecutionReceiptV1 {
  const receipt = snapshotRecord(value, "providerExecutionReceipt") as unknown as LocalVisualProviderExecutionReceiptV1;
  requireExactFields(receipt, RECEIPT_FIELDS, "providerExecutionReceipt");
  requireValue(receipt.contractId, LOCAL_VISUAL_PROVIDER_EXECUTION_RECEIPT_CONTRACT_ID, "providerExecutionReceipt.contractId");
  requireValue(receipt.contractVersion, 1, "providerExecutionReceipt.contractVersion");
  requireSha256(receipt.executionReceiptContentIdentity, "providerExecutionReceipt.executionReceiptContentIdentity");
  requireSha256(receipt.sourceImageContentIdentity, "providerExecutionReceipt.sourceImageContentIdentity");
  requireValue(receipt.providerClass, "controlled_live_provider", "providerExecutionReceipt.providerClass");
  requireValue(receipt.endpointClass, "responses_api", "providerExecutionReceipt.endpointClass");
  requireValue(receipt.responseStatusClass, "2xx_success", "providerExecutionReceipt.responseStatusClass");
  requireSha256(receipt.providerResponseContentIdentity, "providerExecutionReceipt.providerResponseContentIdentity");
  requireValue(receipt.structuredOutputSchemaVersion, "controlled-rectangle-candidates@1", "providerExecutionReceipt.structuredOutputSchemaVersion");
  requireValue(receipt.adapterOperationId, "local-visual-provider-response-to-candidate-observation", "providerExecutionReceipt.adapterOperationId");
  requireValue(receipt.adapterOperationVersion, 1, "providerExecutionReceipt.adapterOperationVersion");
  const persistence = requireRecord(receipt.persistence, "providerExecutionReceipt.persistence");
  requireExactFields(persistence, RECEIPT_PERSISTENCE_FIELDS, "providerExecutionReceipt.persistence");
  for (const field of RECEIPT_PERSISTENCE_FIELDS) {
    requireValue(persistence[field], false, `providerExecutionReceipt.persistence.${field}`);
  }
  requireValue(
    receipt.executionReceiptContentIdentity,
    computeLocalVisualProviderExecutionReceiptContentIdentityV1(receipt),
    "providerExecutionReceipt.executionReceiptContentIdentity",
  );
  if (rawProviderResponseBytes !== undefined) {
    requireNonEmptyBytes(rawProviderResponseBytes, "rawProviderResponseBytes");
    requireValue(
      receipt.providerResponseContentIdentity,
      sha256ContentIdentityV1(rawProviderResponseBytes),
      "providerExecutionReceipt.providerResponseContentIdentity",
    );
  }
  return receipt;
}

export function computeLocalVisualCandidateObservationContentIdentityV1(
  envelope: LocalVisualCandidateObservationEnvelopeV1,
): string {
  const snapshot = snapshotRecord(envelope, "candidateObservationEnvelope");
  const { observationContentIdentity: _excluded, ...projection } = snapshot;
  return contentIdentityFor(projection);
}

export function createLocalVisualCandidateObservationEnvelopeV1({
  receipt,
  sourceReceiptObservationId,
  sourceReceiptObservationContentIdentity,
  sourcePixelWidth,
  sourcePixelHeight,
  rectangleCandidates,
  lossyWarnings,
}: {
  readonly receipt: LocalVisualProviderExecutionReceiptV1;
  readonly sourceReceiptObservationId: string;
  readonly sourceReceiptObservationContentIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly rectangleCandidates: readonly LocalVisualRectangleCandidateV1[];
  readonly lossyWarnings: LocalVisualCandidateObservationEnvelopeV1["lossyWarnings"];
}): LocalVisualCandidateObservationEnvelopeV1 {
  const validatedReceipt = validateLocalVisualProviderExecutionReceiptV1(receipt);
  requireIdentifier(sourceReceiptObservationId, "sourceReceiptObservationId");
  requireSha256(sourceReceiptObservationContentIdentity, "sourceReceiptObservationContentIdentity");
  const receiptToken = validatedReceipt.executionReceiptContentIdentity.slice("sha256:".length);
  const envelope: LocalVisualCandidateObservationEnvelopeV1 = {
    contractId: LOCAL_VISUAL_CANDIDATE_OBSERVATION_CONTRACT_ID,
    contractVersion: 1,
    observationId: `local-visual-candidate:v1:${receiptToken}`,
    observationContentIdentity: "",
    sourceImage: {
      contentIdentity: validatedReceipt.sourceImageContentIdentity,
      rawImagePersisted: false,
      base64Persisted: false,
      localPathPersisted: false,
      urlPersisted: false,
    },
    provenance: {
      provenanceClass: "controlled-local-live-visual-observation",
      adapterBoundary: "provider-specific-response-to-provider-neutral-candidate-observation@1",
      sourceReceiptObservationId,
      sourceReceiptObservationContentIdentity,
      providerExecutionReceiptContentIdentity: validatedReceipt.executionReceiptContentIdentity,
      providerSpecificSchemaTerminated: true,
      manualOnly: true,
      localOnly: true,
      realUserData: false,
    },
    coordinateFrame: {
      dimensions: 2,
      coordinateScale: "normalized",
      origin: "top-left",
      xDirection: "right",
      yDirection: "down",
      bounds: { x: [0, 1], y: [0, 1] },
      sourcePixelWidth,
      sourcePixelHeight,
    },
    rectangleCandidates: structuredClone(rectangleCandidates),
    lossyWarnings: structuredClone(lossyWarnings),
    authority: {
      providerEvidenceOnly: true,
      sourceTruth: false,
      acceptedGeometry: false,
      coreInput: false,
      maySelfAccept: false,
      requiresExplicitHumanAcceptance: true,
      mayAuthorizeMapping: false,
      mayAuthorizeResultJson: false,
      ratioAuthority: false,
      packAuthority: false,
      ruleAuthority: false,
      toleranceAuthority: false,
      evaluationAuthority: false,
    },
    persistence: {
      providerPayloadPersisted: false,
      rawProviderResponsePersisted: false,
      rawImagePersisted: false,
      redactedStructuredObservationOnly: true,
    },
    outcomes: {
      acceptedGeometryProduced: false,
      coreInputProduced: false,
      structuredAnalyzeRun: false,
      resultJsonProduced: false,
    },
  };
  return validateLocalVisualCandidateObservationEnvelopeV1({
    ...envelope,
    observationContentIdentity: computeLocalVisualCandidateObservationContentIdentityV1(envelope),
  });
}

export function validateLocalVisualCandidateObservationEnvelopeV1(
  value: unknown,
): LocalVisualCandidateObservationEnvelopeV1 {
  const envelope = snapshotRecord(value, "candidateObservationEnvelope") as unknown as LocalVisualCandidateObservationEnvelopeV1;
  requireExactFields(envelope, CANDIDATE_FIELDS, "candidateObservationEnvelope");
  requireValue(envelope.contractId, LOCAL_VISUAL_CANDIDATE_OBSERVATION_CONTRACT_ID, "candidateObservationEnvelope.contractId");
  requireValue(envelope.contractVersion, 1, "candidateObservationEnvelope.contractVersion");
  requireIdentifier(envelope.observationId, "candidateObservationEnvelope.observationId");
  requireSha256(envelope.observationContentIdentity, "candidateObservationEnvelope.observationContentIdentity");

  const sourceImage = requireRecord(envelope.sourceImage, "candidateObservationEnvelope.sourceImage");
  requireExactFields(sourceImage, SOURCE_IMAGE_FIELDS, "candidateObservationEnvelope.sourceImage");
  requireSha256(sourceImage.contentIdentity, "candidateObservationEnvelope.sourceImage.contentIdentity");
  for (const field of SOURCE_IMAGE_FIELDS.slice(1)) {
    requireValue(sourceImage[field], false, `candidateObservationEnvelope.sourceImage.${field}`);
  }

  const provenance = requireRecord(envelope.provenance, "candidateObservationEnvelope.provenance");
  requireExactFields(provenance, CANDIDATE_PROVENANCE_FIELDS, "candidateObservationEnvelope.provenance");
  requireValue(provenance.provenanceClass, "controlled-local-live-visual-observation", "candidateObservationEnvelope.provenance.provenanceClass");
  requireValue(provenance.adapterBoundary, "provider-specific-response-to-provider-neutral-candidate-observation@1", "candidateObservationEnvelope.provenance.adapterBoundary");
  requireIdentifier(provenance.sourceReceiptObservationId, "candidateObservationEnvelope.provenance.sourceReceiptObservationId");
  requireSha256(provenance.sourceReceiptObservationContentIdentity, "candidateObservationEnvelope.provenance.sourceReceiptObservationContentIdentity");
  requireSha256(provenance.providerExecutionReceiptContentIdentity, "candidateObservationEnvelope.provenance.providerExecutionReceiptContentIdentity");
  requireValue(provenance.providerSpecificSchemaTerminated, true, "candidateObservationEnvelope.provenance.providerSpecificSchemaTerminated");
  requireValue(provenance.manualOnly, true, "candidateObservationEnvelope.provenance.manualOnly");
  requireValue(provenance.localOnly, true, "candidateObservationEnvelope.provenance.localOnly");
  requireValue(provenance.realUserData, false, "candidateObservationEnvelope.provenance.realUserData");

  validateCoordinateFrame(envelope.coordinateFrame);
  validateRectangleCandidates(envelope.rectangleCandidates);
  validateLossyWarnings(envelope.lossyWarnings, envelope.rectangleCandidates);
  validateFixedRecord(envelope.authority, CANDIDATE_AUTHORITY_FIELDS, {
    providerEvidenceOnly: true,
    sourceTruth: false,
    acceptedGeometry: false,
    coreInput: false,
    maySelfAccept: false,
    requiresExplicitHumanAcceptance: true,
    mayAuthorizeMapping: false,
    mayAuthorizeResultJson: false,
    ratioAuthority: false,
    packAuthority: false,
    ruleAuthority: false,
    toleranceAuthority: false,
    evaluationAuthority: false,
  }, "candidateObservationEnvelope.authority");
  validateFixedRecord(envelope.persistence, CANDIDATE_PERSISTENCE_FIELDS, {
    providerPayloadPersisted: false,
    rawProviderResponsePersisted: false,
    rawImagePersisted: false,
    redactedStructuredObservationOnly: true,
  }, "candidateObservationEnvelope.persistence");
  validateFixedRecord(envelope.outcomes, CANDIDATE_OUTCOME_FIELDS, {
    acceptedGeometryProduced: false,
    coreInputProduced: false,
    structuredAnalyzeRun: false,
    resultJsonProduced: false,
  }, "candidateObservationEnvelope.outcomes");
  requireValue(
    envelope.observationContentIdentity,
    computeLocalVisualCandidateObservationContentIdentityV1(envelope),
    "candidateObservationEnvelope.observationContentIdentity",
  );
  return envelope;
}

export function computeLocalVisualHumanCandidateSelectionContentIdentityV1(
  selection: LocalVisualHumanCandidateSelectionV1,
): string {
  const snapshot = snapshotRecord(selection, "humanCandidateSelection");
  const { selectionContentIdentity: _excluded, ...projection } = snapshot;
  return contentIdentityFor(projection);
}

export function validateLocalVisualHumanCandidateSelectionV1(
  candidateValue: unknown,
  selectionValue: unknown,
): readonly LocalVisualSelectedCandidateV1[] {
  const candidate = validateLocalVisualCandidateObservationEnvelopeV1(candidateValue);
  const selection = snapshotRecord(selectionValue, "humanCandidateSelection") as unknown as LocalVisualHumanCandidateSelectionV1;
  requireExactFields(selection, SELECTION_FIELDS, "humanCandidateSelection");
  requireValue(selection.contractId, LOCAL_VISUAL_HUMAN_CANDIDATE_SELECTION_CONTRACT_ID, "humanCandidateSelection.contractId");
  requireValue(selection.contractVersion, 1, "humanCandidateSelection.contractVersion");
  requireIdentifier(selection.selectionId, "humanCandidateSelection.selectionId");
  requireSha256(selection.selectionContentIdentity, "humanCandidateSelection.selectionContentIdentity");
  requireIdentifier(selection.candidateObservationId, "humanCandidateSelection.candidateObservationId");
  requireSha256(selection.candidateObservationContentIdentity, "humanCandidateSelection.candidateObservationContentIdentity");
  requireSha256(selection.providerExecutionReceiptContentIdentity, "humanCandidateSelection.providerExecutionReceiptContentIdentity");
  const actor = requireRecord(selection.acceptanceActor, "humanCandidateSelection.acceptanceActor");
  requireExactFields(actor, ["actorClass", "actorId"], "humanCandidateSelection.acceptanceActor");
  requireValue(actor.actorClass, "human", "humanCandidateSelection.acceptanceActor.actorClass");
  requireIdentifier(actor.actorId, "humanCandidateSelection.acceptanceActor.actorId");
  requireValue(selection.geometryAction, "accept_exact", "humanCandidateSelection.geometryAction");
  validateFixedRecord(selection.authority, [
    "explicitHumanSelection",
    "providerAuthority",
    "confidenceAuthority",
    "automaticAcceptance",
    "coordinateCorrectionAllowed",
    "coordinateRepairAllowed",
  ], {
    explicitHumanSelection: true,
    providerAuthority: false,
    confidenceAuthority: false,
    automaticAcceptance: false,
    coordinateCorrectionAllowed: false,
    coordinateRepairAllowed: false,
  }, "humanCandidateSelection.authority");
  requireValue(selection.candidateObservationId, candidate.observationId, "humanCandidateSelection.candidateObservationId");
  requireValue(selection.candidateObservationContentIdentity, candidate.observationContentIdentity, "humanCandidateSelection.candidateObservationContentIdentity");
  requireValue(
    selection.providerExecutionReceiptContentIdentity,
    candidate.provenance.providerExecutionReceiptContentIdentity,
    "humanCandidateSelection.providerExecutionReceiptContentIdentity",
  );
  requireValue(
    selection.selectionContentIdentity,
    computeLocalVisualHumanCandidateSelectionContentIdentityV1(selection),
    "humanCandidateSelection.selectionContentIdentity",
  );
  if (!Array.isArray(selection.selections) || selection.selections.length === 0) {
    throw invalid("humanCandidateSelection.selections", "requires at least one selection");
  }
  const candidatesById = new Map(candidate.rectangleCandidates.map((item, index) => [item.candidateId, { item, index }]));
  const selectedIds = new Set<string>();
  const acceptedIds = new Set<string>();
  let previousCandidateIndex = -1;
  return selection.selections.map((item, index) => {
    const record = requireRecord(item, `humanCandidateSelection.selections.${String(index)}`);
    requireExactFields(record, ["order", "candidateId", "acceptedPrimitiveId"], `humanCandidateSelection.selections.${String(index)}`);
    requireValue(item.order, index, `humanCandidateSelection.selections.${String(index)}.order`);
    requireIdentifier(item.candidateId, `humanCandidateSelection.selections.${String(index)}.candidateId`);
    requireIdentifier(item.acceptedPrimitiveId, `humanCandidateSelection.selections.${String(index)}.acceptedPrimitiveId`);
    if (selectedIds.has(item.candidateId)) throw invalid(`humanCandidateSelection.selections.${String(index)}.candidateId`, "must be unique");
    if (acceptedIds.has(item.acceptedPrimitiveId)) throw invalid(`humanCandidateSelection.selections.${String(index)}.acceptedPrimitiveId`, "must be unique");
    const match = candidatesById.get(item.candidateId);
    if (match === undefined) throw invalid(`humanCandidateSelection.selections.${String(index)}.candidateId`, "must identify a candidate");
    if (match.index <= previousCandidateIndex) throw invalid("humanCandidateSelection.selections", "must preserve candidate order");
    previousCandidateIndex = match.index;
    selectedIds.add(item.candidateId);
    acceptedIds.add(item.acceptedPrimitiveId);
    return { selection: item, candidate: match.item };
  });
}

export function createAcceptedGeometryFromLocalVisualHumanSelectionV1({
  candidateObservationEnvelope,
  humanCandidateSelection,
  acceptedAt,
}: {
  readonly candidateObservationEnvelope: LocalVisualCandidateObservationEnvelopeV1;
  readonly humanCandidateSelection: LocalVisualHumanCandidateSelectionV1;
  readonly acceptedAt: string;
}): AcceptedGeometry {
  const candidate = validateLocalVisualCandidateObservationEnvelopeV1(candidateObservationEnvelope);
  const selection = snapshotRecord(humanCandidateSelection, "humanCandidateSelection") as unknown as LocalVisualHumanCandidateSelectionV1;
  const selected = validateLocalVisualHumanCandidateSelectionV1(candidate, selection);
  if (typeof acceptedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(acceptedAt)) {
    throw invalid("acceptedAt", "requires explicit UTC RFC3339 timestamp");
  }
  const selectionToken = selection.selectionContentIdentity.slice("sha256:".length);
  const provenance = (provenanceId: string, inputContentIdentity: string) => ({
    provenanceId,
    actorType: "human" as const,
    actorId: selection.acceptanceActor.actorId,
    operationId: "local-visual-human-candidate-selection",
    operationVersion: "1",
    inputContentIdentity,
    createdAt: acceptedAt,
    notes: null,
  });
  const accepted: AcceptedGeometry = {
    contractId: ACCEPTED_GEOMETRY_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_CONTRACT_VERSION,
    acceptedGeometryId: `accepted-geometry:local-visual:${selectionToken}`,
    sourceObservationId: candidate.observationId,
    sourceObservationContentIdentity: candidate.observationContentIdentity,
    acceptedRevision: 1,
    coordinateFrame: structuredClone(candidate.coordinateFrame),
    primitives: selected.map(({ selection: selectedItem, candidate: candidateItem }): RectanglePrimitive => ({
      id: selectedItem.acceptedPrimitiveId,
      kind: "rectangle",
      confidence: null,
      x: candidateItem.x,
      y: candidateItem.y,
      width: candidateItem.width,
      height: candidateItem.height,
    })),
    correctionHistory: [],
    acceptance: {
      acceptanceId: selection.selectionId,
      accepted: true,
      actorType: "human",
      actorId: selection.acceptanceActor.actorId,
      acceptedAt,
      sourceObservationId: candidate.observationId,
      sourceObservationContentIdentity: candidate.observationContentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: "",
      acceptedPrimitiveIds: selection.selections.map(({ acceptedPrimitiveId }) => acceptedPrimitiveId),
      provenance: provenance(`acceptance:local-visual:${selectionToken}`, selection.selectionContentIdentity),
    },
    provenance: provenance(`accepted-geometry:local-visual:${selectionToken}`, candidate.observationContentIdentity),
    contentIdentity: "",
  };
  const revisionIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  const completed: AcceptedGeometry = {
    ...accepted,
    acceptance: { ...accepted.acceptance, acceptedContentIdentity: revisionIdentity },
  };
  const withContentIdentity: AcceptedGeometry = {
    ...completed,
    contentIdentity: computeAcceptedGeometryContentIdentity(completed),
  };
  validateExactLocalVisualCandidateAcceptanceV1(candidate, selection, withContentIdentity);
  return withContentIdentity;
}

export function validateExactLocalVisualCandidateAcceptanceV1(
  candidateValue: unknown,
  selectionValue: unknown,
  acceptedValue: unknown,
): AcceptedGeometry {
  const candidate = validateLocalVisualCandidateObservationEnvelopeV1(candidateValue);
  const selection = snapshotRecord(selectionValue, "humanCandidateSelection") as unknown as LocalVisualHumanCandidateSelectionV1;
  const selected = validateLocalVisualHumanCandidateSelectionV1(candidate, selection);
  const acceptedValidation = validateAcceptedGeometryV1(acceptedValue);
  if (!acceptedValidation.ok || acceptedValidation.value === null) {
    throw invalid("acceptedStructuredGeometry", "must satisfy AcceptedGeometry@1");
  }
  const accepted = acceptedValidation.value;
  requireValue(accepted.sourceObservationId, candidate.observationId, "acceptedStructuredGeometry.sourceObservationId");
  requireValue(accepted.sourceObservationContentIdentity, candidate.observationContentIdentity, "acceptedStructuredGeometry.sourceObservationContentIdentity");
  if (serializeCanonicalJson(accepted.coordinateFrame, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    !== serializeCanonicalJson(candidate.coordinateFrame, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)) {
    throw invalid("acceptedStructuredGeometry.coordinateFrame", "must equal candidate coordinate frame");
  }
  if (accepted.correctionHistory.length !== 0) throw invalid("acceptedStructuredGeometry.correctionHistory", "must be empty");
  requireValue(accepted.acceptance.acceptanceId, selection.selectionId, "acceptedStructuredGeometry.acceptance.acceptanceId");
  requireValue(accepted.acceptance.actorType, "human", "acceptedStructuredGeometry.acceptance.actorType");
  requireValue(accepted.acceptance.actorId, selection.acceptanceActor.actorId, "acceptedStructuredGeometry.acceptance.actorId");
  requireValue(accepted.acceptance.sourceObservationId, candidate.observationId, "acceptedStructuredGeometry.acceptance.sourceObservationId");
  requireValue(accepted.acceptance.sourceObservationContentIdentity, candidate.observationContentIdentity, "acceptedStructuredGeometry.acceptance.sourceObservationContentIdentity");
  requireValue(accepted.acceptance.provenance.inputContentIdentity, selection.selectionContentIdentity, "acceptedStructuredGeometry.acceptance.provenance.inputContentIdentity");
  requireValue(accepted.provenance.inputContentIdentity, candidate.observationContentIdentity, "acceptedStructuredGeometry.provenance.inputContentIdentity");
  requireValue(accepted.provenance.actorType, "human", "acceptedStructuredGeometry.provenance.actorType");
  requireValue(accepted.provenance.actorId, selection.acceptanceActor.actorId, "acceptedStructuredGeometry.provenance.actorId");
  requireStringArraysEqual(accepted.acceptance.acceptedPrimitiveIds, selection.selections.map(({ acceptedPrimitiveId }) => acceptedPrimitiveId), "acceptedStructuredGeometry.acceptance.acceptedPrimitiveIds");
  if (accepted.primitives.length !== selected.length) throw invalid("acceptedStructuredGeometry.primitives", "must contain exactly selected candidates");
  selected.forEach(({ selection: selectedItem, candidate: candidateItem }, index) => {
    const primitive = accepted.primitives[index];
    if (primitive?.kind !== "rectangle") throw invalid(`acceptedStructuredGeometry.primitives.${String(index)}.kind`, "requires rectangle");
    requireValue(primitive.id, selectedItem.acceptedPrimitiveId, `acceptedStructuredGeometry.primitives.${String(index)}.id`);
    requireValue(primitive.confidence, null, `acceptedStructuredGeometry.primitives.${String(index)}.confidence`);
    for (const field of ["x", "y", "width", "height"] as const) {
      requireValue(primitive[field], candidateItem[field], `acceptedStructuredGeometry.primitives.${String(index)}.${field}`);
    }
  });
  return accepted;
}

export function decodeValidatedLocalVisualImageDimensionsV1(
  bytes: Uint8Array,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
): LocalVisualImageDimensionsV1 {
  requireNonEmptyBytes(bytes, "sourceImageBytes");
  if (mediaType === "image/png") return decodePngDimensions(bytes);
  if (mediaType === "image/jpeg") return decodeJpegDimensions(bytes);
  return decodeWebpDimensions(bytes);
}

function validateCoordinateFrame(value: unknown): void {
  const frame = requireRecord(value, "candidateObservationEnvelope.coordinateFrame");
  requireExactFields(frame, COORDINATE_FRAME_FIELDS, "candidateObservationEnvelope.coordinateFrame");
  requireValue(frame.dimensions, 2, "candidateObservationEnvelope.coordinateFrame.dimensions");
  requireValue(frame.coordinateScale, "normalized", "candidateObservationEnvelope.coordinateFrame.coordinateScale");
  requireValue(frame.origin, "top-left", "candidateObservationEnvelope.coordinateFrame.origin");
  requireValue(frame.xDirection, "right", "candidateObservationEnvelope.coordinateFrame.xDirection");
  requireValue(frame.yDirection, "down", "candidateObservationEnvelope.coordinateFrame.yDirection");
  const bounds = requireRecord(frame.bounds, "candidateObservationEnvelope.coordinateFrame.bounds");
  requireExactFields(bounds, ["x", "y"], "candidateObservationEnvelope.coordinateFrame.bounds");
  requireUnitTuple(bounds.x, "candidateObservationEnvelope.coordinateFrame.bounds.x");
  requireUnitTuple(bounds.y, "candidateObservationEnvelope.coordinateFrame.bounds.y");
  requirePositiveInteger(frame.sourcePixelWidth, "candidateObservationEnvelope.coordinateFrame.sourcePixelWidth");
  requirePositiveInteger(frame.sourcePixelHeight, "candidateObservationEnvelope.coordinateFrame.sourcePixelHeight");
}

function validateRectangleCandidates(value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) throw invalid("candidateObservationEnvelope.rectangleCandidates", "requires at least one candidate");
  const ids = new Set<string>();
  value.forEach((item, index) => {
    const record = requireRecord(item, `candidateObservationEnvelope.rectangleCandidates.${String(index)}`);
    const keys = Object.keys(record).sort();
    const required = [...RECTANGLE_CANDIDATE_REQUIRED_FIELDS].sort();
    const withDiagnostic = [...RECTANGLE_CANDIDATE_REQUIRED_FIELDS, "diagnosticMetadata"].sort();
    if (!arraysEqual(keys, required) && !arraysEqual(keys, withDiagnostic)) {
      throw invalid(`candidateObservationEnvelope.rectangleCandidates.${String(index)}`, "requires exact closed fields");
    }
    requireIdentifier(record.candidateId, `candidateObservationEnvelope.rectangleCandidates.${String(index)}.candidateId`);
    requireValue(record.order, index, `candidateObservationEnvelope.rectangleCandidates.${String(index)}.order`);
    if (ids.has(record.candidateId as string)) throw invalid(`candidateObservationEnvelope.rectangleCandidates.${String(index)}.candidateId`, "must be unique");
    ids.add(record.candidateId as string);
    for (const field of ["x", "y", "width", "height"] as const) {
      requireFiniteNumber(record[field], `candidateObservationEnvelope.rectangleCandidates.${String(index)}.${field}`);
    }
    const { x, y, width, height } = record as unknown as LocalVisualRectangleCandidateV1;
    if (x < 0 || x > 1 || y < 0 || y > 1 || width <= 0 || width > 1 || height <= 0 || height > 1) {
      throw invalid(`candidateObservationEnvelope.rectangleCandidates.${String(index)}`, "requires normalized positive rectangle");
    }
    if (x + width > 1 || y + height > 1) throw invalid(`candidateObservationEnvelope.rectangleCandidates.${String(index)}`, "rectangle exceeds bounds");
    if ("diagnosticMetadata" in record) {
      const diagnostic = requireRecord(record.diagnosticMetadata, `candidateObservationEnvelope.rectangleCandidates.${String(index)}.diagnosticMetadata`);
      requireExactFields(diagnostic, ["providerConfidence"], `candidateObservationEnvelope.rectangleCandidates.${String(index)}.diagnosticMetadata`);
      requireFiniteNumber(diagnostic.providerConfidence, `candidateObservationEnvelope.rectangleCandidates.${String(index)}.diagnosticMetadata.providerConfidence`);
      if ((diagnostic.providerConfidence as number) < 0 || (diagnostic.providerConfidence as number) > 1) {
        throw invalid(`candidateObservationEnvelope.rectangleCandidates.${String(index)}.diagnosticMetadata.providerConfidence`, "requires normalized confidence");
      }
    }
  });
}

function validateLossyWarnings(value: unknown, candidates: readonly LocalVisualRectangleCandidateV1[]): void {
  if (!Array.isArray(value)) throw invalid("candidateObservationEnvelope.lossyWarnings", "requires array");
  const candidateIds = new Set(candidates.map(({ candidateId }) => candidateId));
  const allowedCodes = new Set([
    "coordinate-normalization-loss",
    "rectangle-approximation-loss",
    "provider-confidence-diagnostic-only",
  ]);
  value.forEach((item, index) => {
    const record = requireRecord(item, `candidateObservationEnvelope.lossyWarnings.${String(index)}`);
    requireExactFields(record, ["warningId", "code", "candidateId"], `candidateObservationEnvelope.lossyWarnings.${String(index)}`);
    requireIdentifier(record.warningId, `candidateObservationEnvelope.lossyWarnings.${String(index)}.warningId`);
    if (typeof record.code !== "string" || !allowedCodes.has(record.code)) throw invalid(`candidateObservationEnvelope.lossyWarnings.${String(index)}.code`, "requires allowlisted code");
    if (record.candidateId !== null) {
      requireIdentifier(record.candidateId, `candidateObservationEnvelope.lossyWarnings.${String(index)}.candidateId`);
      if (!candidateIds.has(record.candidateId as string)) throw invalid(`candidateObservationEnvelope.lossyWarnings.${String(index)}.candidateId`, "must identify candidate");
    }
  });
}

function decodePngDimensions(bytes: Uint8Array): LocalVisualImageDimensionsV1 {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((byte, index) => bytes[index] === byte)
    || readUint32Be(bytes, 8) !== 13 || ascii(bytes, 12, 4) !== "IHDR") {
    throw invalid("sourceImageBytes", "requires validated PNG IHDR");
  }
  return dimensions(readUint32Be(bytes, 16), readUint32Be(bytes, 20), "PNG");
}

function decodeJpegDimensions(bytes: Uint8Array): LocalVisualImageDimensionsV1 {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw invalid("sourceImageBytes", "requires JPEG SOI");
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset]!;
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const segmentLength = readUint16Be(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (sofMarkers.has(marker)) {
      if (segmentLength < 7) break;
      return dimensions(readUint16Be(bytes, offset + 5), readUint16Be(bytes, offset + 3), "JPEG");
    }
    offset += segmentLength;
  }
  throw invalid("sourceImageBytes", "requires JPEG frame dimensions");
}

function decodeWebpDimensions(bytes: Uint8Array): LocalVisualImageDimensionsV1 {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    throw invalid("sourceImageBytes", "requires validated WebP RIFF");
  }
  const riffSize = readUint32Le(bytes, 4);
  const riffEnd = riffSize + 8;
  if (riffSize < 12 || riffEnd > bytes.length) throw invalid("sourceImageBytes", "requires complete WebP RIFF");
  const chunk = ascii(bytes, 12, 4);
  const chunkSize = readUint32Le(bytes, 16);
  const chunkEnd = 20 + chunkSize;
  if (chunkEnd > riffEnd || chunkEnd > bytes.length) {
    throw invalid("sourceImageBytes", "requires complete WebP dimension chunk");
  }
  if (chunk === "VP8X") {
    if (chunkSize !== 10) throw invalid("sourceImageBytes", "requires exact WebP VP8X chunk size");
    return dimensions(1 + readUint24Le(bytes, 24), 1 + readUint24Le(bytes, 27), "WebP");
  }
  if (chunk === "VP8 ") {
    if (chunkSize < 10 || bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      throw invalid("sourceImageBytes", "requires WebP VP8 frame header");
    }
    return dimensions(readUint16Le(bytes, 26) & 0x3fff, readUint16Le(bytes, 28) & 0x3fff, "WebP");
  }
  if (chunk === "VP8L") {
    if (chunkSize < 5 || bytes[20] !== 0x2f) throw invalid("sourceImageBytes", "requires WebP VP8L signature");
    const bits = readUint32Le(bytes, 21);
    return dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1, "WebP");
  }
  throw invalid("sourceImageBytes", "requires supported WebP dimension chunk");
}

function dimensions(width: number, height: number, kind: string): LocalVisualImageDimensionsV1 {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw invalid("sourceImageBytes", `requires positive ${kind} dimensions`);
  }
  return { sourcePixelWidth: width, sourcePixelHeight: height };
}

function readUint16Be(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}
function readUint16Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}
function readUint32Be(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset]! << 24) >>> 0) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!) >>> 0;
}
function readUint32Le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! + (bytes[offset + 1]! << 8) + (bytes[offset + 2]! << 16) + ((bytes[offset + 3]! << 24) >>> 0)) >>> 0;
}
function readUint24Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
}
function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function contentIdentityFor(value: unknown): string {
  return sha256ContentIdentityV1(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY));
}

function snapshotRecord(value: unknown, path: string): Record<string, unknown> {
  requirePlainData(value, path, new WeakSet<object>(), 0);
  const record = requireRecord(value, path);
  try {
    return structuredClone(record) as Record<string, unknown>;
  } catch {
    throw invalid(path, "cannot be snapshotted as plain data");
  }
}

function requirePlainData(value: unknown, path: string, seen: WeakSet<object>, depth: number): void {
  if (depth > 64) throw invalid(path, "exceeds maximum depth");
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    if (typeof value === "number" && !Number.isFinite(value)) throw invalid(path, "requires finite number");
    return;
  }
  if (typeof value !== "object") throw invalid(path, "requires JSON-compatible data");
  if (isProxy(value)) throw invalid(path, "must not be a Proxy");
  if (seen.has(value)) throw invalid(path, "must not be cyclic");
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw invalid(`${path}.${String(index)}`, "must not be sparse");
    }
    for (const key of Reflect.ownKeys(value)) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(key)) throw invalid(path, "contains unsafe array property");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) throw invalid(`${path}.${key}`, "requires enumerable data property");
      requirePlainData(descriptor.value, `${path}.${key}`, seen, depth + 1);
    }
    return;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) throw invalid(path, "requires plain object");
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw invalid(path, "contains symbol property");
    if (["__proto__", "prototype", "constructor"].includes(key)) throw invalid(`${path}.${key}`, "contains unsafe key");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) throw invalid(`${path}.${key}`, "requires enumerable data property");
    requirePlainData(descriptor.value, `${path}.${key}`, seen, depth + 1);
  }
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (isProxy(value)) throw invalid(path, "must not be a Proxy");
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw invalid(path, "requires plain object");
  }
  return value as Record<string, unknown>;
}

function isProxy(value: unknown): boolean {
  if (nodeUtilTypes?.isProxy === undefined) {
    throw invalid("runtime", "requires Node proxy detection");
  }
  return nodeUtilTypes.isProxy(value);
}

function requireExactFields(record: object, expected: readonly string[], path: string): void {
  const keys = Reflect.ownKeys(record);
  if (keys.some((key) => typeof key !== "string") || !arraysEqual((keys as string[]).sort(), [...expected].sort())) {
    throw invalid(path, "requires exact closed fields");
  }
}

function validateFixedRecord(value: unknown, fields: readonly string[], expected: Record<string, unknown>, path: string): void {
  const record = requireRecord(value, path);
  requireExactFields(record, fields, path);
  for (const field of fields) requireValue(record[field], expected[field], `${path}.${field}`);
}

function requireValue(actual: unknown, expected: unknown, path: string): void {
  if (actual !== expected) throw invalid(path, `requires ${String(expected)}`);
}
function requireIdentifier(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !IDENTIFIER_PATTERN.test(value)) throw invalid(path, "requires local identifier");
}
function requireSha256(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) throw invalid(path, "requires SHA-256 content identity");
}
function requireFiniteNumber(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalid(path, "requires finite number");
}
function requirePositiveInteger(value: unknown, path: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) <= 0) throw invalid(path, "requires positive integer");
}
function requireNonEmptyBytes(value: Uint8Array, path: string): void {
  if (!(value instanceof Uint8Array) || value.byteLength === 0) throw invalid(path, "requires non-empty bytes");
}
function requireUnitTuple(value: unknown, path: string): void {
  if (!Array.isArray(value) || value.length !== 2 || value[0] !== 0 || value[1] !== 1) throw invalid(path, "requires [0,1]");
}
function requireStringArraysEqual(actual: readonly string[], expected: readonly string[], path: string): void {
  if (!arraysEqual(actual, expected)) throw invalid(path, "requires exact ordered values");
}
function arraysEqual(first: readonly unknown[], second: readonly unknown[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}
function invalid(path: string, reason: string): ControlledLocalLiveVisualCandidateContractError {
  return new ControlledLocalLiveVisualCandidateContractError(`${path}: ${reason}`);
}
