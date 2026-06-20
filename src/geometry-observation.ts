import { createHash } from "node:crypto";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const GEOMETRY_OBSERVATION_CONTRACT_ID = "norma.geometry-observation@1" as const;
export const GEOMETRY_OBSERVATION_CONTRACT_VERSION = 1 as const;
export const PERCEPTION_PROVIDER_CONTRACT_ID = "norma.perception-provider@1" as const;
export const PERCEPTION_PROVIDER_CONTRACT_VERSION = 1 as const;
export const ACCEPTED_GEOMETRY_CONTRACT_ID = "norma.accepted-geometry@1" as const;
export const ACCEPTED_GEOMETRY_CONTRACT_VERSION = 1 as const;

export type ObservationActorType = "provider" | "human" | "deterministic-test" | "system";
export type ObservationPrimitiveKind = "point" | "segment" | "axis" | "rectangle";
export type EvidenceKind = "provider-local-reference" | "text-label" | "region-reference" | "warning-code";
export type ObservationWarningSeverity = "info" | "warning" | "error";
export type CorrectionOperation = "add" | "update" | "remove";
export type ValidatorDiagnosticSeverity = "error" | "warning" | "info";
export type ValidatorDiagnosticSurface =
  | "GeometryObservation"
  | "AcceptedGeometry"
  | "SourceAssetRef"
  | "ProviderIdentity"
  | "CoordinateFrame"
  | "Primitive"
  | "EvidenceRef"
  | "ObservationWarning"
  | "ProvenanceRef"
  | "CorrectionHistory"
  | "CorrectionEntry"
  | "AcceptanceRecord"
  | "ContentIdentity";

export type ValidatorDiagnosticCode =
  | "UnsupportedGeometryObservationContract"
  | "UnsupportedAcceptedGeometryContract"
  | "InvalidGeometryObservationShape"
  | "InvalidAcceptedGeometryShape"
  | "MissingProviderIdentity"
  | "MissingSourceAssetIdentity"
  | "InvalidObservationCoordinateFrame"
  | "UnsupportedObservationPrimitiveKind"
  | "DuplicateObservationPrimitiveId"
  | "ObservationCoordinateOutsideBounds"
  | "DegenerateObservationPrimitive"
  | "InvalidObservationConfidence"
  | "InvalidCorrectionHistory"
  | "ExplicitAcceptanceRequired"
  | "AcceptedGeometryRevisionMismatch"
  | "MissingObservationProvenance"
  | "UnsupportedAcceptedGeometryMappingRequest";

export interface ValidatorDiagnostic {
  readonly code: ValidatorDiagnosticCode;
  readonly severity: ValidatorDiagnosticSeverity;
  readonly surface: ValidatorDiagnosticSurface;
  readonly path: string;
  readonly primitiveId: string | null;
  readonly message: string;
}

export type ValidatorResult<TValue> =
  | {
      readonly ok: true;
      readonly value: TValue;
      readonly diagnostics: readonly ValidatorDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly ValidatorDiagnostic[];
    };

export interface ProvenanceRef {
  readonly provenanceId: string;
  readonly actorType: ObservationActorType;
  readonly actorId: string | null;
  readonly operationId: string;
  readonly operationVersion: string;
  readonly inputContentIdentity: string | null;
  readonly createdAt: string;
  readonly notes: string | null;
}

export interface SourceAssetRef {
  readonly assetId: string;
  readonly mediaType: string;
  readonly contentDigest: string;
  readonly contentIdentity: string;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly synthetic: boolean;
  readonly localOnly: boolean;
  readonly provenance: ProvenanceRef;
}

export interface ProviderIdentity {
  readonly providerFamily: string;
  readonly providerImplementationId: string;
  readonly providerVersion: string | null;
  readonly operationId: string;
  readonly operationVersion: string;
  readonly configurationIdentity: string;
  readonly providerRunId: string;
  readonly provenance: ProvenanceRef;
  readonly warnings: readonly ObservationWarning[];
}

export interface CoordinateFrame {
  readonly dimensions: 2;
  readonly coordinateScale: "normalized";
  readonly origin: "top-left";
  readonly xDirection: "right";
  readonly yDirection: "down";
  readonly bounds: {
    readonly x: readonly [0, 1];
    readonly y: readonly [0, 1];
  };
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}

export interface ObservationPoint {
  readonly x: number;
  readonly y: number;
}

export interface ObservationPrimitiveBase {
  readonly id: string;
  readonly kind: ObservationPrimitiveKind;
  readonly confidence: number | null;
}

export interface PointPrimitive extends ObservationPrimitiveBase {
  readonly kind: "point";
  readonly x: number;
  readonly y: number;
}

export interface SegmentPrimitive extends ObservationPrimitiveBase {
  readonly kind: "segment";
  readonly start: ObservationPoint;
  readonly end: ObservationPoint;
}

export interface AxisPrimitive extends ObservationPrimitiveBase {
  readonly kind: "axis";
  readonly start: ObservationPoint;
  readonly end: ObservationPoint;
}

export interface RectanglePrimitive extends ObservationPrimitiveBase {
  readonly kind: "rectangle";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type ObservationPrimitive =
  | PointPrimitive
  | SegmentPrimitive
  | AxisPrimitive
  | RectanglePrimitive;

export interface EvidenceRef {
  readonly evidenceId: string;
  readonly kind: EvidenceKind;
  readonly targetPrimitiveId: string | null;
  readonly confidence: number | null;
  readonly label: string | null;
  readonly regionRef: string | null;
  readonly warningCode: string | null;
  readonly provenance: ProvenanceRef;
}

export interface ObservationWarning {
  readonly code: string;
  readonly severity: ObservationWarningSeverity;
  readonly message: string;
  readonly targetPath: string | null;
  readonly targetPrimitiveId: string | null;
  readonly provenance: ProvenanceRef;
}

export interface GeometryObservation {
  readonly contractId: typeof GEOMETRY_OBSERVATION_CONTRACT_ID;
  readonly contractVersion: typeof GEOMETRY_OBSERVATION_CONTRACT_VERSION;
  readonly observationId: string;
  readonly status: "candidate";
  readonly sourceAsset: SourceAssetRef;
  readonly provider: ProviderIdentity;
  readonly coordinateFrame: CoordinateFrame;
  readonly primitives: readonly ObservationPrimitive[];
  readonly evidence: readonly EvidenceRef[];
  readonly warnings: readonly ObservationWarning[];
  readonly provenance: ProvenanceRef;
  readonly contentIdentity: string;
}

export interface CorrectionEntry {
  readonly correctionId: string;
  readonly sequence: number;
  readonly actorType: ObservationActorType;
  readonly operation: CorrectionOperation;
  readonly targetPrimitiveId: string | null;
  readonly reason: string;
  readonly beforeContentIdentity: string | null;
  readonly afterContentIdentity: string | null;
  readonly provenance: ProvenanceRef;
}

export interface AcceptanceRecord {
  readonly acceptanceId: string;
  readonly accepted: true;
  readonly actorType: Exclude<ObservationActorType, "provider">;
  readonly actorId: string | null;
  readonly acceptedAt: string;
  readonly sourceObservationId: string;
  readonly sourceObservationContentIdentity: string;
  readonly acceptedRevision: number;
  readonly acceptedContentIdentity: string;
  readonly acceptedPrimitiveIds: readonly string[];
  readonly provenance: ProvenanceRef;
}

export interface AcceptedGeometry {
  readonly contractId: typeof ACCEPTED_GEOMETRY_CONTRACT_ID;
  readonly contractVersion: typeof ACCEPTED_GEOMETRY_CONTRACT_VERSION;
  readonly acceptedGeometryId: string;
  readonly sourceObservationId: string;
  readonly sourceObservationContentIdentity: string;
  readonly acceptedRevision: number;
  readonly coordinateFrame: CoordinateFrame;
  readonly primitives: readonly ObservationPrimitive[];
  readonly correctionHistory: readonly CorrectionEntry[];
  readonly acceptance: AcceptanceRecord;
  readonly provenance: ProvenanceRef;
  readonly contentIdentity: string;
}

type RecordValue = Record<string, unknown>;

interface WarningInfo {
  readonly code: string;
  readonly severity: string;
  readonly targetPath: string | null;
  readonly targetPrimitiveId: string | null;
}

interface Rfc3339DateTimeParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly offsetHour: number;
  readonly offsetMinute: number;
}

interface CorrectionSequenceState {
  readonly sequences: Set<number>;
  previousSequence: number;
}

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const RFC3339_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/;

const IDENTITY_SERIALIZATION_POLICY = Object.freeze({
  ...DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  timestampFields: Object.freeze([
    ...DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY.timestampFields,
    "acceptedAt",
  ]),
});

const GEOMETRY_OBSERVATION_KEYS = [
  "contractId",
  "contractVersion",
  "observationId",
  "status",
  "sourceAsset",
  "provider",
  "coordinateFrame",
  "primitives",
  "evidence",
  "warnings",
  "provenance",
  "contentIdentity",
] as const;

const SOURCE_ASSET_KEYS = [
  "assetId",
  "mediaType",
  "contentDigest",
  "contentIdentity",
  "pixelWidth",
  "pixelHeight",
  "synthetic",
  "localOnly",
  "provenance",
] as const;

const PROVIDER_IDENTITY_KEYS = [
  "providerFamily",
  "providerImplementationId",
  "providerVersion",
  "operationId",
  "operationVersion",
  "configurationIdentity",
  "providerRunId",
  "provenance",
  "warnings",
] as const;

const COORDINATE_FRAME_KEYS = [
  "dimensions",
  "coordinateScale",
  "origin",
  "xDirection",
  "yDirection",
  "bounds",
  "sourcePixelWidth",
  "sourcePixelHeight",
] as const;
const COORDINATE_BOUNDS_KEYS = ["x", "y"] as const;

const POINT_PRIMITIVE_KEYS = ["id", "kind", "x", "y", "confidence"] as const;
const SEGMENT_PRIMITIVE_KEYS = ["id", "kind", "start", "end", "confidence"] as const;
const RECTANGLE_PRIMITIVE_KEYS = ["id", "kind", "x", "y", "width", "height", "confidence"] as const;
const POINT_KEYS = ["x", "y"] as const;

const EVIDENCE_REF_KEYS = [
  "evidenceId",
  "kind",
  "targetPrimitiveId",
  "confidence",
  "label",
  "regionRef",
  "warningCode",
  "provenance",
] as const;

const OBSERVATION_WARNING_KEYS = [
  "code",
  "severity",
  "message",
  "targetPath",
  "targetPrimitiveId",
  "provenance",
] as const;

const PROVENANCE_REF_KEYS = [
  "provenanceId",
  "actorType",
  "actorId",
  "operationId",
  "operationVersion",
  "inputContentIdentity",
  "createdAt",
  "notes",
] as const;

const ACCEPTED_GEOMETRY_KEYS = [
  "contractId",
  "contractVersion",
  "acceptedGeometryId",
  "sourceObservationId",
  "sourceObservationContentIdentity",
  "acceptedRevision",
  "coordinateFrame",
  "primitives",
  "correctionHistory",
  "acceptance",
  "provenance",
  "contentIdentity",
] as const;

const CORRECTION_ENTRY_KEYS = [
  "correctionId",
  "sequence",
  "actorType",
  "operation",
  "targetPrimitiveId",
  "reason",
  "beforeContentIdentity",
  "afterContentIdentity",
  "provenance",
] as const;

const ACCEPTANCE_RECORD_KEYS = [
  "acceptanceId",
  "accepted",
  "actorType",
  "actorId",
  "acceptedAt",
  "sourceObservationId",
  "sourceObservationContentIdentity",
  "acceptedRevision",
  "acceptedContentIdentity",
  "acceptedPrimitiveIds",
  "provenance",
] as const;

const OBSERVATION_PRIMITIVE_KINDS = ["point", "segment", "axis", "rectangle"] as const;
const EVIDENCE_KINDS = ["provider-local-reference", "text-label", "region-reference", "warning-code"] as const;
const WARNING_SEVERITIES = ["info", "warning", "error"] as const;
const ACTOR_TYPES = ["provider", "human", "deterministic-test", "system"] as const;
const CORRECTION_OPERATIONS = ["add", "update", "remove"] as const;

export function computeGeometryObservationContentIdentity(observation: GeometryObservation): string {
  return contentIdentityFor({
    contractId: observation.contractId,
    contractVersion: observation.contractVersion,
    observationId: observation.observationId,
    status: observation.status,
    sourceAsset: observation.sourceAsset,
    provider: observation.provider,
    coordinateFrame: observation.coordinateFrame,
    primitives: observation.primitives,
    evidence: observation.evidence,
    warnings: observation.warnings,
    provenance: observation.provenance,
  });
}

export function computeAcceptedGeometryRevisionContentIdentity(accepted: AcceptedGeometry): string {
  return contentIdentityFor({
    contractId: accepted.contractId,
    contractVersion: accepted.contractVersion,
    acceptedGeometryId: accepted.acceptedGeometryId,
    sourceObservationId: accepted.sourceObservationId,
    sourceObservationContentIdentity: accepted.sourceObservationContentIdentity,
    acceptedRevision: accepted.acceptedRevision,
    coordinateFrame: accepted.coordinateFrame,
    primitives: accepted.primitives,
    correctionHistory: accepted.correctionHistory,
  });
}

export function computeAcceptedGeometryContentIdentity(accepted: AcceptedGeometry): string {
  return contentIdentityFor({
    contractId: accepted.contractId,
    contractVersion: accepted.contractVersion,
    acceptedGeometryId: accepted.acceptedGeometryId,
    sourceObservationId: accepted.sourceObservationId,
    sourceObservationContentIdentity: accepted.sourceObservationContentIdentity,
    acceptedRevision: accepted.acceptedRevision,
    coordinateFrame: accepted.coordinateFrame,
    primitives: accepted.primitives,
    correctionHistory: accepted.correctionHistory,
    acceptance: accepted.acceptance,
    provenance: accepted.provenance,
  });
}

export function validateGeometryObservationV1(value: unknown): ValidatorResult<GeometryObservation> {
  const diagnostics: ValidatorDiagnostic[] = [];

  try {
    if (!isRecord(value)) {
      addDiagnostic(diagnostics, "InvalidGeometryObservationShape", "GeometryObservation", "", null, "GeometryObservation must be a closed object.");
      return invalid(diagnostics);
    }

    validateExactKeys(value, GEOMETRY_OBSERVATION_KEYS, "GeometryObservation", "", "InvalidGeometryObservationShape", diagnostics);
    validateGeometryObservationContract(value, diagnostics);
    validateNonEmptyString(value.observationId, "observationId", "GeometryObservation", "InvalidGeometryObservationShape", diagnostics);
    if (value.status !== "candidate") {
      addDiagnostic(diagnostics, "InvalidGeometryObservationShape", "GeometryObservation", "status", null, "GeometryObservation status must be candidate.");
    }

    validateSourceAssetRef(value.sourceAsset, "sourceAsset", diagnostics);
    validateProviderIdentity(value.provider, "provider", diagnostics);
    validateCoordinateFrame(value.coordinateFrame, "coordinateFrame", "InvalidObservationCoordinateFrame", diagnostics);
    const primitiveIds = validatePrimitives(value.primitives, "primitives", "InvalidGeometryObservationShape", diagnostics);
    const warnings = validateObservationWarnings(value.warnings, "warnings", primitiveIds, "InvalidGeometryObservationShape", diagnostics);
    validateEvidenceRefs(value.evidence, "evidence", primitiveIds, warnings, "InvalidGeometryObservationShape", diagnostics);
    validatePrimitiveNullConfidenceWarnings(value.primitives, warnings, diagnostics);
    validateProvenanceRef(value.provenance, "provenance", "MissingObservationProvenance", diagnostics);
    validateDigestField(value.contentIdentity, "contentIdentity", "ContentIdentity", "InvalidGeometryObservationShape", diagnostics);
    validateGeometryObservationContentIdentity(value, diagnostics);
  } catch {
    addDiagnostic(diagnostics, "InvalidGeometryObservationShape", "GeometryObservation", "", null, "GeometryObservation could not be safely inspected.");
  }

  return diagnostics.length === 0
    ? { ok: true, value: clonePlainData(value) as GeometryObservation, diagnostics: [] }
    : invalid(diagnostics);
}

export function validateAcceptedGeometryV1(value: unknown): ValidatorResult<AcceptedGeometry> {
  const diagnostics: ValidatorDiagnostic[] = [];

  try {
    if (!isRecord(value)) {
      addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "AcceptedGeometry", "", null, "AcceptedGeometry must be a closed object.");
      return invalid(diagnostics);
    }

    validateExactKeys(value, ACCEPTED_GEOMETRY_KEYS, "AcceptedGeometry", "", "InvalidAcceptedGeometryShape", diagnostics);
    validateAcceptedGeometryContract(value, diagnostics);
    validateNonEmptyString(value.acceptedGeometryId, "acceptedGeometryId", "AcceptedGeometry", "InvalidAcceptedGeometryShape", diagnostics);
    validateNonEmptyString(value.sourceObservationId, "sourceObservationId", "AcceptedGeometry", "InvalidAcceptedGeometryShape", diagnostics);
    validateDigestField(value.sourceObservationContentIdentity, "sourceObservationContentIdentity", "AcceptedGeometry", "InvalidAcceptedGeometryShape", diagnostics);
    validateNonNegativeInteger(value.acceptedRevision, "acceptedRevision", "AcceptedGeometry", "InvalidAcceptedGeometryShape", diagnostics);
    validateCoordinateFrame(value.coordinateFrame, "coordinateFrame", "InvalidAcceptedGeometryShape", diagnostics);
    const primitiveIds = validatePrimitives(value.primitives, "primitives", "InvalidAcceptedGeometryShape", diagnostics);
    validateCorrectionHistory(value.correctionHistory, "correctionHistory", primitiveIds, diagnostics);
    validateAcceptanceRecord(value.acceptance, value, primitiveIds, diagnostics);
    validateProvenanceRef(value.provenance, "provenance", "InvalidAcceptedGeometryShape", diagnostics);
    validateDigestField(value.contentIdentity, "contentIdentity", "ContentIdentity", "InvalidAcceptedGeometryShape", diagnostics);
    validateAcceptedGeometryContentIdentities(value, diagnostics);
  } catch {
    addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "AcceptedGeometry", "", null, "AcceptedGeometry could not be safely inspected.");
  }

  return diagnostics.length === 0
    ? { ok: true, value: clonePlainData(value) as AcceptedGeometry, diagnostics: [] }
    : invalid(diagnostics);
}

function validateGeometryObservationContract(value: RecordValue, diagnostics: ValidatorDiagnostic[]): void {
  if (
    value.contractId !== GEOMETRY_OBSERVATION_CONTRACT_ID ||
    value.contractVersion !== GEOMETRY_OBSERVATION_CONTRACT_VERSION
  ) {
    addDiagnostic(
      diagnostics,
      "UnsupportedGeometryObservationContract",
      "GeometryObservation",
      "contractId",
      null,
      "GeometryObservation contractId and contractVersion must identify norma.geometry-observation@1.",
    );
  }
}

function validateAcceptedGeometryContract(value: RecordValue, diagnostics: ValidatorDiagnostic[]): void {
  if (
    value.contractId !== ACCEPTED_GEOMETRY_CONTRACT_ID ||
    value.contractVersion !== ACCEPTED_GEOMETRY_CONTRACT_VERSION
  ) {
    addDiagnostic(
      diagnostics,
      "UnsupportedAcceptedGeometryContract",
      "AcceptedGeometry",
      "contractId",
      null,
      "AcceptedGeometry contractId and contractVersion must identify norma.accepted-geometry@1.",
    );
  }
}

function validateSourceAssetRef(value: unknown, path: string, diagnostics: ValidatorDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "MissingSourceAssetIdentity", "SourceAssetRef", path, null, "Source asset identity is required.");
    return;
  }

  validateExactKeys(value, SOURCE_ASSET_KEYS, "SourceAssetRef", path, "InvalidGeometryObservationShape", diagnostics);
  if (!allTrue([
    isNonEmptyString(value.assetId),
    isNonEmptyString(value.mediaType),
    isDigest(value.contentDigest),
    isDigest(value.contentIdentity),
    isPositiveInteger(value.pixelWidth),
    isPositiveInteger(value.pixelHeight),
    typeof value.synthetic === "boolean",
    typeof value.localOnly === "boolean",
  ])) {
    addDiagnostic(diagnostics, "MissingSourceAssetIdentity", "SourceAssetRef", path, null, "SourceAssetRef must include stable asset identity fields.");
  }

  validateProvenanceRef(value.provenance, `${path}.provenance`, "MissingObservationProvenance", diagnostics);
}

function validateProviderIdentity(value: unknown, path: string, diagnostics: ValidatorDiagnostic[]): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "MissingProviderIdentity", "ProviderIdentity", path, null, "Provider identity is required.");
    return;
  }

  validateExactKeys(value, PROVIDER_IDENTITY_KEYS, "ProviderIdentity", path, "InvalidGeometryObservationShape", diagnostics);
  if (!allTrue([
    isNonEmptyString(value.providerFamily),
    isNonEmptyString(value.providerImplementationId),
    isNullableNonEmptyString(value.providerVersion),
    isNonEmptyString(value.operationId),
    isNonEmptyString(value.operationVersion),
    isNonEmptyString(value.configurationIdentity),
    isNonEmptyString(value.providerRunId),
    Array.isArray(value.warnings),
  ])) {
    addDiagnostic(diagnostics, "MissingProviderIdentity", "ProviderIdentity", path, null, "ProviderIdentity must include provider and run identity.");
  }

  validateProvenanceRef(value.provenance, `${path}.provenance`, "MissingObservationProvenance", diagnostics);
  const warnings = Array.isArray(value.warnings)
    ? validateObservationWarnings(value.warnings, `${path}.warnings`, new Set(), "InvalidGeometryObservationShape", diagnostics)
    : [];
  if (Array.isArray(value.warnings)) {
    validateProviderVersionNullWarning(value.providerVersion, warnings, path, diagnostics);
  }
}

function validateCoordinateFrame(
  value: unknown,
  path: string,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidObservationCoordinateFrame" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, shapeCode, "CoordinateFrame", path, null, "CoordinateFrame must be a closed object.");
    return;
  }

  validateExactKeys(value, COORDINATE_FRAME_KEYS, "CoordinateFrame", path, shapeCode, diagnostics);
  const boundsOk = validateCoordinateBounds(value.bounds, `${path}.bounds`, shapeCode, diagnostics);
  if (!allTrue([
    value.dimensions === 2,
    value.coordinateScale === "normalized",
    value.origin === "top-left",
    value.xDirection === "right",
    value.yDirection === "down",
    isPositiveInteger(value.sourcePixelWidth),
    isPositiveInteger(value.sourcePixelHeight),
    boundsOk,
  ])) {
    addDiagnostic(diagnostics, shapeCode, "CoordinateFrame", path, null, "CoordinateFrame must use the exact normalized image V1 frame.");
  }
}

function validatePrimitives(
  value: unknown,
  path: string,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): Set<string> {
  const primitiveIds = new Set<string>();
  const seenIds = new Set<string>();

  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, shapeCode, "Primitive", path, null, "Primitives must be an ordered array.");
    return primitiveIds;
  }

  for (const [index, primitive] of value.entries()) {
    validatePrimitive(primitive, index, path, shapeCode, primitiveIds, seenIds, diagnostics);
  }

  return primitiveIds;
}

function validatePrimitive(
  value: unknown,
  index: number,
  path: string,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  primitiveIds: Set<string>,
  seenIds: Set<string>,
  diagnostics: ValidatorDiagnostic[],
): void {
  const primitivePath = `${path}.${index}`;
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, shapeCode, "Primitive", primitivePath, null, "Primitive must be a closed object.");
    return;
  }

  const primitiveId = validatePrimitiveId(value, primitivePath, shapeCode, primitiveIds, seenIds, diagnostics);
  validateConfidence(value.confidence, `${primitivePath}.confidence`, primitiveId, diagnostics);

  if (!isObservationPrimitiveKind(value.kind)) {
    addDiagnostic(diagnostics, "UnsupportedObservationPrimitiveKind", "Primitive", `${primitivePath}.kind`, primitiveId, "Observation primitive kind is not supported by V1.");
    return;
  }

  validatePrimitiveGeometry(value, value.kind, primitivePath, primitiveId, shapeCode, diagnostics);
}

function validatePrimitiveId(
  primitive: RecordValue,
  primitivePath: string,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  primitiveIds: Set<string>,
  seenIds: Set<string>,
  diagnostics: ValidatorDiagnostic[],
): string | null {
  if (!isNonEmptyString(primitive.id)) {
    addDiagnostic(diagnostics, shapeCode, "Primitive", `${primitivePath}.id`, null, "Primitive id must be a non-empty string.");
    return null;
  }

  if (seenIds.has(primitive.id)) {
    addDiagnostic(diagnostics, "DuplicateObservationPrimitiveId", "Primitive", `${primitivePath}.id`, primitive.id, `Primitive id is duplicated: ${primitive.id}.`);
    return primitive.id;
  }

  seenIds.add(primitive.id);
  primitiveIds.add(primitive.id);
  return primitive.id;
}

function validatePrimitiveGeometry(
  primitive: RecordValue,
  kind: ObservationPrimitiveKind,
  primitivePath: string,
  primitiveId: string | null,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (kind === "point") {
    validateExactKeys(primitive, POINT_PRIMITIVE_KEYS, "Primitive", primitivePath, shapeCode, diagnostics);
    validatePointCoordinates(primitive.x, primitive.y, primitivePath, primitiveId, diagnostics);
    return;
  }

  if (kind === "segment" || kind === "axis") {
    validateExactKeys(primitive, SEGMENT_PRIMITIVE_KEYS, "Primitive", primitivePath, shapeCode, diagnostics);
    validateSegmentLikePrimitive(primitive, primitivePath, primitiveId, shapeCode, diagnostics);
    return;
  }

  validateExactKeys(primitive, RECTANGLE_PRIMITIVE_KEYS, "Primitive", primitivePath, shapeCode, diagnostics);
  validateRectanglePrimitive(primitive, primitivePath, primitiveId, diagnostics);
}

function validateEvidenceRefs(
  value: unknown,
  path: string,
  primitiveIds: ReadonlySet<string>,
  warnings: readonly WarningInfo[],
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, shapeCode, "EvidenceRef", path, null, "Evidence must be an ordered array.");
    return;
  }

  for (const [index, evidence] of value.entries()) {
    validateEvidenceRef(evidence, index, path, primitiveIds, warnings, shapeCode, diagnostics);
  }
}

function validateEvidenceRef(
  value: unknown,
  index: number,
  path: string,
  primitiveIds: ReadonlySet<string>,
  warnings: readonly WarningInfo[],
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  const evidencePath = `${path}.${index}`;
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, shapeCode, "EvidenceRef", evidencePath, null, "EvidenceRef must be a closed object.");
    return;
  }

  validateExactKeys(value, EVIDENCE_REF_KEYS, "EvidenceRef", evidencePath, shapeCode, diagnostics);
  validateEvidenceRefShape(value, evidencePath, primitiveIds, shapeCode, diagnostics);
  validateEvidenceConfidenceExplanation(value, evidencePath, warnings, diagnostics);
}

function validateEvidenceRefShape(
  evidence: RecordValue,
  evidencePath: string,
  primitiveIds: ReadonlySet<string>,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isNonEmptyString(evidence.evidenceId)) {
    addDiagnostic(diagnostics, shapeCode, "EvidenceRef", `${evidencePath}.evidenceId`, null, "EvidenceRef evidenceId must be non-empty.");
  }
  if (!isEvidenceKind(evidence.kind)) {
    addDiagnostic(diagnostics, shapeCode, "EvidenceRef", `${evidencePath}.kind`, null, "EvidenceRef kind is not supported by V1.");
  }
  if (!isKnownNullablePrimitive(evidence.targetPrimitiveId, primitiveIds)) {
    addDiagnostic(diagnostics, shapeCode, "EvidenceRef", `${evidencePath}.targetPrimitiveId`, null, "EvidenceRef targetPrimitiveId must be a known primitive id or null.");
  }
  validateConfidence(evidence.confidence, `${evidencePath}.confidence`, nullablePrimitiveId(evidence.targetPrimitiveId), diagnostics);
  validateNullableStringField(evidence.label, `${evidencePath}.label`, "EvidenceRef", shapeCode, diagnostics);
  validateNullableStringField(evidence.regionRef, `${evidencePath}.regionRef`, "EvidenceRef", shapeCode, diagnostics);
  validateNullableStringField(evidence.warningCode, `${evidencePath}.warningCode`, "EvidenceRef", shapeCode, diagnostics);
  validateProvenanceRef(evidence.provenance, `${evidencePath}.provenance`, "MissingObservationProvenance", diagnostics);
}

function validateEvidenceConfidenceExplanation(
  evidence: RecordValue,
  evidencePath: string,
  warnings: readonly WarningInfo[],
  diagnostics: ValidatorDiagnostic[],
): void {
  if (evidence.confidence !== null) {
    return;
  }

  const targetPrimitiveId = nullablePrimitiveId(evidence.targetPrimitiveId);
  const confidencePath = `${evidencePath}.confidence`;
  if (!hasConfidenceUnavailableWarning(warnings, confidencePath, targetPrimitiveId)) {
    addDiagnostic(diagnostics, "InvalidObservationConfidence", "EvidenceRef", confidencePath, targetPrimitiveId, "Null evidence confidence requires a linked ConfidenceUnavailable warning.");
  }
}

function validateObservationWarnings(
  value: unknown,
  path: string,
  primitiveIds: ReadonlySet<string>,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): readonly WarningInfo[] {
  const warnings: WarningInfo[] = [];

  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, shapeCode, "ObservationWarning", path, null, "Warnings must be an ordered array.");
    return warnings;
  }

  for (const [index, warning] of value.entries()) {
    const warningInfo = validateObservationWarning(warning, index, path, primitiveIds, shapeCode, diagnostics);
    if (warningInfo !== null) {
      warnings.push(warningInfo);
    }
  }

  return warnings;
}

function validateProviderVersionNullWarning(
  providerVersion: unknown,
  warnings: readonly WarningInfo[],
  path: string,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (providerVersion !== null) {
    return;
  }

  if (!hasProviderVersionUnavailableWarning(warnings, `${path}.providerVersion`)) {
    addDiagnostic(
      diagnostics,
      "MissingProviderIdentity",
      "ProviderIdentity",
      `${path}.providerVersion`,
      null,
      "Null providerVersion requires a linked ProviderVersionUnavailable warning.",
    );
  }
}

function hasProviderVersionUnavailableWarning(warnings: readonly WarningInfo[], targetPath: string): boolean {
  return warnings.some((warning) => allTrue([
    warning.code === "ProviderVersionUnavailable",
    warning.targetPath === targetPath,
    warning.targetPrimitiveId === null,
    warning.severity === "info" || warning.severity === "warning",
  ]));
}

function validateObservationWarning(
  value: unknown,
  index: number,
  path: string,
  primitiveIds: ReadonlySet<string>,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): WarningInfo | null {
  const warningPath = `${path}.${index}`;
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, shapeCode, "ObservationWarning", warningPath, null, "ObservationWarning must be a closed object.");
    return null;
  }

  validateExactKeys(value, OBSERVATION_WARNING_KEYS, "ObservationWarning", warningPath, shapeCode, diagnostics);
  validateObservationWarningShape(value, warningPath, primitiveIds, shapeCode, diagnostics);
  return warningInfoFrom(value);
}

function validateObservationWarningShape(
  warning: RecordValue,
  warningPath: string,
  primitiveIds: ReadonlySet<string>,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  validateObservationWarningTextFields(warning, warningPath, shapeCode, diagnostics);
  validateObservationWarningTargetFields(warning, warningPath, primitiveIds, shapeCode, diagnostics);
  validateProvenanceRef(warning.provenance, `${warningPath}.provenance`, "MissingObservationProvenance", diagnostics);
}

function validateObservationWarningTextFields(
  warning: RecordValue,
  warningPath: string,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isNonEmptyString(warning.code)) {
    addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.code`, null, "ObservationWarning code must be non-empty.");
  }
  if (!isWarningSeverity(warning.severity)) {
    addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.severity`, null, "ObservationWarning severity is invalid.");
  }
  if (!isNonEmptyString(warning.message)) {
    addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.message`, null, "ObservationWarning message must be non-empty.");
  }
}

function validateObservationWarningTargetFields(
  warning: RecordValue,
  warningPath: string,
  primitiveIds: ReadonlySet<string>,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isNullableString(warning.targetPath)) {
    addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.targetPath`, null, "ObservationWarning targetPath must be a string or null.");
  }
  if (!isKnownNullablePrimitive(warning.targetPrimitiveId, primitiveIds)) {
    addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.targetPrimitiveId`, null, "ObservationWarning targetPrimitiveId must be a known primitive id or null.");
  }
}

function warningInfoFrom(warning: RecordValue): WarningInfo {
  return {
    code: typeof warning.code === "string" ? warning.code : "",
    severity: typeof warning.severity === "string" ? warning.severity : "",
    targetPath: nullableStringOrNull(warning.targetPath),
    targetPrimitiveId: nullableStringOrNull(warning.targetPrimitiveId),
  };
}

function validatePrimitiveNullConfidenceWarnings(
  value: unknown,
  warnings: readonly WarningInfo[],
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const [index, primitive] of value.entries()) {
    validatePrimitiveNullConfidenceWarning(primitive, index, warnings, diagnostics);
  }
}

function validatePrimitiveNullConfidenceWarning(
  primitive: unknown,
  index: number,
  warnings: readonly WarningInfo[],
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isPrimitiveNullConfidenceCheckable(primitive)) {
    return;
  }

  const confidencePath = `primitives.${index}.confidence`;
  if (!hasConfidenceUnavailableWarning(warnings, confidencePath, primitive.id)) {
    addDiagnostic(diagnostics, "InvalidObservationConfidence", "Primitive", confidencePath, primitive.id, "Null primitive confidence requires a linked ConfidenceUnavailable warning.");
  }
}

function isPrimitiveNullConfidenceCheckable(value: unknown): value is RecordValue & { readonly id: string; readonly confidence: null } {
  return isRecord(value) && value.confidence === null && isNonEmptyString(value.id);
}

function validateProvenanceRef(
  value: unknown,
  path: string,
  code: Extract<ValidatorDiagnosticCode, "MissingObservationProvenance" | "InvalidAcceptedGeometryShape" | "InvalidCorrectionHistory">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, code, "ProvenanceRef", path, null, "ProvenanceRef is required.");
    return;
  }

  validateExactKeys(value, PROVENANCE_REF_KEYS, "ProvenanceRef", path, code, diagnostics);
  if (!allTrue([
    isNonEmptyString(value.provenanceId),
    isActorType(value.actorType),
    isNullableString(value.actorId),
    isNonEmptyString(value.operationId),
    isNonEmptyString(value.operationVersion),
    isNullableString(value.inputContentIdentity),
    isStrictRfc3339DateTime(value.createdAt),
    isNullableString(value.notes),
  ])) {
    addDiagnostic(diagnostics, code, "ProvenanceRef", path, null, "ProvenanceRef fields are invalid.");
  }
}

function validateCorrectionHistory(
  value: unknown,
  path: string,
  primitiveIds: ReadonlySet<string>,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionHistory", path, null, "Correction history must be an ordered array.");
    return;
  }

  const sequences = new Set<number>();
  const sequenceState: CorrectionSequenceState = { sequences, previousSequence: -1 };
  for (const [index, entry] of value.entries()) {
    validateCorrectionEntry(entry, index, path, primitiveIds, sequenceState, diagnostics);
  }
}

function validateCorrectionEntry(
  value: unknown,
  index: number,
  path: string,
  primitiveIds: ReadonlySet<string>,
  sequenceState: CorrectionSequenceState,
  diagnostics: ValidatorDiagnostic[],
): void {
  const entryPath = `${path}.${index}`;
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, null, "CorrectionEntry must be a closed object.");
    return;
  }

  validateExactKeys(value, CORRECTION_ENTRY_KEYS, "CorrectionEntry", entryPath, "InvalidCorrectionHistory", diagnostics);
  validateNonEmptyString(value.correctionId, `${entryPath}.correctionId`, "CorrectionEntry", "InvalidCorrectionHistory", diagnostics);
  validateCorrectionSequence(value.sequence, `${entryPath}.sequence`, sequenceState, diagnostics);
  validateCorrectionActorAndOperation(value, entryPath, diagnostics);
  validateCorrectionTargetPrimitive(value, entryPath, primitiveIds, diagnostics);
  validateNonEmptyString(value.reason, `${entryPath}.reason`, "CorrectionEntry", "InvalidCorrectionHistory", diagnostics);
  validateCorrectionContentIdentities(value, entryPath, diagnostics);
  validateProvenanceRef(value.provenance, `${entryPath}.provenance`, "InvalidCorrectionHistory", diagnostics);
}

function validateCorrectionSequence(
  value: unknown,
  path: string,
  state: CorrectionSequenceState,
  diagnostics: ValidatorDiagnostic[],
): void {
  validateNonNegativeInteger(value, path, "CorrectionEntry", "InvalidCorrectionHistory", diagnostics);
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return;
  }

  if (!isNextCorrectionSequence(value, state)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", path, null, "CorrectionEntry sequence values must be unique and ordered.");
  }
  state.sequences.add(value);
  state.previousSequence = value;
}

function isNextCorrectionSequence(value: number, state: CorrectionSequenceState): boolean {
  return !state.sequences.has(value) && value > state.previousSequence;
}

function validateCorrectionActorAndOperation(
  entry: RecordValue,
  entryPath: string,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isActorType(entry.actorType)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.actorType`, null, "CorrectionEntry actorType is invalid.");
  }
  if (!isCorrectionOperation(entry.operation)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.operation`, null, "CorrectionEntry operation is invalid.");
  }
}

function validateAcceptanceRecord(
  value: unknown,
  accepted: RecordValue,
  primitiveIds: ReadonlySet<string>,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance", null, "AcceptedGeometry requires an explicit acceptance record.");
    return;
  }

  validateExactKeys(value, ACCEPTANCE_RECORD_KEYS, "AcceptanceRecord", "acceptance", "InvalidAcceptedGeometryShape", diagnostics);
  validateNonEmptyString(value.acceptanceId, "acceptance.acceptanceId", "AcceptanceRecord", "ExplicitAcceptanceRequired", diagnostics);
  validateAcceptanceActorFields(value, diagnostics);
  validateAcceptanceRevisionMatch(value, accepted, diagnostics);
  validateDigestField(value.acceptedContentIdentity, "acceptance.acceptedContentIdentity", "AcceptanceRecord", "AcceptedGeometryRevisionMismatch", diagnostics);
  validateAcceptedPrimitiveIds(value.acceptedPrimitiveIds, primitiveIds, diagnostics);
  validateProvenanceRef(value.provenance, "acceptance.provenance", "InvalidAcceptedGeometryShape", diagnostics);
}

function validateAcceptanceActorFields(
  acceptance: RecordValue,
  diagnostics: ValidatorDiagnostic[],
): void {
  validateAcceptanceFlag(acceptance.accepted, diagnostics);
  validateAcceptanceActor(acceptance, diagnostics);
  validateAcceptanceTimestamp(acceptance.acceptedAt, diagnostics);
}

function validateAcceptanceFlag(value: unknown, diagnostics: ValidatorDiagnostic[]): void {
  if (value !== true) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.accepted", null, "AcceptedGeometry acceptance must be explicitly true.");
  }
}

function validateAcceptanceActor(acceptance: RecordValue, diagnostics: ValidatorDiagnostic[]): void {
  if (!isNonProviderActorType(acceptance.actorType)) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.actorType", null, "Provider self-acceptance is not approved.");
  }
  if (!isNullableString(acceptance.actorId)) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.actorId", null, "Acceptance actorId must be a string or null.");
  }
}

function validateAcceptanceTimestamp(value: unknown, diagnostics: ValidatorDiagnostic[]): void {
  if (!isStrictRfc3339DateTime(value)) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.acceptedAt", null, "acceptedAt must be a strict RFC3339 date-time string.");
  }
}

function validateAcceptanceRevisionMatch(
  acceptance: RecordValue,
  accepted: RecordValue,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (acceptance.sourceObservationId !== accepted.sourceObservationId) {
    addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "AcceptanceRecord", "acceptance.sourceObservationId", null, "Acceptance sourceObservationId must match AcceptedGeometry.");
  }
  if (acceptance.sourceObservationContentIdentity !== accepted.sourceObservationContentIdentity) {
    addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "AcceptanceRecord", "acceptance.sourceObservationContentIdentity", null, "Acceptance source observation content identity must match AcceptedGeometry.");
  }
  if (acceptance.acceptedRevision !== accepted.acceptedRevision) {
    addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "AcceptanceRecord", "acceptance.acceptedRevision", null, "Acceptance revision must match AcceptedGeometry.");
  }
}

function validateAcceptedPrimitiveIds(
  value: unknown,
  primitiveIds: ReadonlySet<string>,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isStringArray(value)) {
    addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "AcceptanceRecord", "acceptance.acceptedPrimitiveIds", null, "acceptedPrimitiveIds must be an ordered string array.");
    return;
  }

  if (!acceptedPrimitiveIdsMatch(value, primitiveIds)) {
    addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "AcceptanceRecord", "acceptance.acceptedPrimitiveIds", null, "acceptedPrimitiveIds must exactly match accepted primitives in order.");
  }
}

function acceptedPrimitiveIdsMatch(value: readonly string[], primitiveIds: ReadonlySet<string>): boolean {
  const uniqueIds = new Set(value);
  return uniqueIds.size === value.length && arraysMatchInOrder(value, [...primitiveIds]);
}

function arraysMatchInOrder(first: readonly string[], second: readonly string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }
  return first.every((item, index) => item === second[index]);
}

function validateCorrectionTargetPrimitive(
  entry: RecordValue,
  entryPath: string,
  primitiveIds: ReadonlySet<string>,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isNullableString(entry.targetPrimitiveId)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.targetPrimitiveId`, null, "CorrectionEntry targetPrimitiveId must be a string or null.");
    return;
  }

  if (!validateRequiredCorrectionTargetPrimitive(entry, entryPath, diagnostics)) {
    return;
  }
  validateKnownCorrectionTargetPrimitive(entry, entryPath, primitiveIds, diagnostics);
}

function validateRequiredCorrectionTargetPrimitive(
  entry: RecordValue,
  entryPath: string,
  diagnostics: ValidatorDiagnostic[],
): boolean {
  if (requiresTargetPrimitive(entry.operation) && !isNonEmptyString(entry.targetPrimitiveId)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.targetPrimitiveId`, null, "CorrectionEntry targetPrimitiveId is required for update and remove.");
    return false;
  }
  return true;
}

function validateKnownCorrectionTargetPrimitive(
  entry: RecordValue,
  entryPath: string,
  primitiveIds: ReadonlySet<string>,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (typeof entry.targetPrimitiveId === "string" && !primitiveIds.has(entry.targetPrimitiveId)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.targetPrimitiveId`, entry.targetPrimitiveId, "CorrectionEntry targetPrimitiveId must reference an accepted primitive.");
  }
}

function requiresTargetPrimitive(operation: unknown): boolean {
  return operation === "update" || operation === "remove";
}

function validateCorrectionContentIdentities(
  entry: RecordValue,
  entryPath: string,
  diagnostics: ValidatorDiagnostic[],
): void {
  const before = entry.beforeContentIdentity;
  const after = entry.afterContentIdentity;

  if (!isNullableDigest(before) || !isNullableDigest(after)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, null, "CorrectionEntry before/after identities must be sha256 identities or null.");
    return;
  }

  const validateOperationIdentities = correctionIdentityValidatorFor(entry.operation);
  if (validateOperationIdentities !== null) {
    validateOperationIdentities(entry, entryPath, diagnostics);
  }
}

function correctionIdentityValidatorFor(
  operation: unknown,
): ((entry: RecordValue, entryPath: string, diagnostics: ValidatorDiagnostic[]) => void) | null {
  if (operation === "add") {
    return validateAddCorrectionIdentities;
  }
  if (operation === "update") {
    return validateUpdateCorrectionIdentities;
  }
  if (operation === "remove") {
    return validateRemoveCorrectionIdentities;
  }
  return null;
}

function validateAddCorrectionIdentities(
  entry: RecordValue,
  entryPath: string,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (entry.beforeContentIdentity !== null || !isDigest(entry.afterContentIdentity)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, nullablePrimitiveId(entry.targetPrimitiveId), "Add corrections require null before identity and non-null after identity.");
  }
}

function validateUpdateCorrectionIdentities(
  entry: RecordValue,
  entryPath: string,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isDigest(entry.beforeContentIdentity) || !isDigest(entry.afterContentIdentity) || entry.beforeContentIdentity === entry.afterContentIdentity) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, nullablePrimitiveId(entry.targetPrimitiveId), "Update corrections require different non-null before and after identities.");
  }
}

function validateRemoveCorrectionIdentities(
  entry: RecordValue,
  entryPath: string,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isDigest(entry.beforeContentIdentity) || entry.afterContentIdentity !== null) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, nullablePrimitiveId(entry.targetPrimitiveId), "Remove corrections require non-null before identity and null after identity.");
  }
}

function validateSegmentLikePrimitive(
  primitive: RecordValue,
  primitivePath: string,
  primitiveId: string | null,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  const startOk = validateEndpoint(primitive.start, `${primitivePath}.start`, primitiveId, shapeCode, diagnostics);
  const endOk = validateEndpoint(primitive.end, `${primitivePath}.end`, primitiveId, shapeCode, diagnostics);

  if (startOk && endOk && endpointsMatch(primitive.start as ObservationPoint, primitive.end as ObservationPoint)) {
    addDiagnostic(diagnostics, "DegenerateObservationPrimitive", "Primitive", primitivePath, primitiveId, "Segment and axis endpoints must be distinct.");
  }
}

function endpointsMatch(start: ObservationPoint, end: ObservationPoint): boolean {
  return start.x === end.x && start.y === end.y;
}

function validateEndpoint(
  value: unknown,
  path: string,
  primitiveId: string | null,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidGeometryObservationShape" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, shapeCode, "Primitive", path, primitiveId, "Endpoint must be a closed { x, y } object.");
    return false;
  }

  validateExactKeys(value, POINT_KEYS, "Primitive", path, shapeCode, diagnostics);
  validatePointCoordinates(value.x, value.y, path, primitiveId, diagnostics);
  return isFiniteNormalized(value.x) && isFiniteNormalized(value.y);
}

function validatePointCoordinates(
  x: unknown,
  y: unknown,
  path: string,
  primitiveId: string | null,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isFiniteNormalized(x) || !isFiniteNormalized(y)) {
    addDiagnostic(diagnostics, "ObservationCoordinateOutsideBounds", "Primitive", path, primitiveId, "Observation coordinates must be finite normalized numbers in [0, 1].");
  }
}

function validateRectanglePrimitive(
  primitive: RecordValue,
  primitivePath: string,
  primitiveId: string | null,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!hasPositiveRectangleSize(primitive)) {
    addDiagnostic(diagnostics, "DegenerateObservationPrimitive", "Primitive", primitivePath, primitiveId, "Rectangle width and height must be positive.");
  }

  if (!isRectangleWithinBounds(primitive)) {
    addDiagnostic(diagnostics, "ObservationCoordinateOutsideBounds", "Primitive", primitivePath, primitiveId, "Rectangle must remain within inclusive normalized bounds.");
  }
}

function hasPositiveRectangleSize(primitive: RecordValue): boolean {
  return isFiniteNumber(primitive.width) &&
    isFiniteNumber(primitive.height) &&
    primitive.width > 0 &&
    primitive.height > 0;
}

function isRectangleWithinBounds(primitive: RecordValue): boolean {
  if (!allTrue([
    isFiniteNormalized(primitive.x),
    isFiniteNormalized(primitive.y),
    isFiniteNumber(primitive.width),
    isFiniteNumber(primitive.height),
  ])) {
    return false;
  }

  const x = primitive.x as number;
  const y = primitive.y as number;
  const width = primitive.width as number;
  const height = primitive.height as number;
  return x + width <= 1 && y + height <= 1;
}

function validateConfidence(
  value: unknown,
  path: string,
  primitiveId: string | null,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (value === null) {
    return;
  }

  if (!isFiniteNormalized(value)) {
    addDiagnostic(diagnostics, "InvalidObservationConfidence", "Primitive", path, primitiveId, "Confidence must be finite in [0, 1] or explicit null.");
  }
}

function validateGeometryObservationContentIdentity(value: RecordValue, diagnostics: ValidatorDiagnostic[]): void {
  if (diagnostics.length !== 0 || !isDigest(value.contentIdentity)) {
    return;
  }

  const expected = computeGeometryObservationContentIdentity(value as unknown as GeometryObservation);
  if (value.contentIdentity !== expected) {
    addDiagnostic(diagnostics, "InvalidGeometryObservationShape", "ContentIdentity", "contentIdentity", null, "GeometryObservation contentIdentity does not match the canonical V1 projection.");
  }
}

function validateAcceptedGeometryContentIdentities(value: RecordValue, diagnostics: ValidatorDiagnostic[]): void {
  if (!isRecord(value.acceptance)) {
    return;
  }

  validateAcceptedRevisionContentIdentity(value, value.acceptance, diagnostics);
  validateAcceptedGeometryEnvelopeContentIdentity(value, diagnostics);
}

function validateAcceptedRevisionContentIdentity(
  value: RecordValue,
  acceptance: RecordValue,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isAcceptedRevisionIdentityCheckable(value, acceptance)) {
    return;
  }

  const expectedRevisionIdentity = computeAcceptedGeometryRevisionContentIdentity(value as unknown as AcceptedGeometry);
  if (acceptance.acceptedContentIdentity !== expectedRevisionIdentity) {
    addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "ContentIdentity", "acceptance.acceptedContentIdentity", null, "AcceptedGeometry acceptedContentIdentity does not match the accepted revision payload.");
  }
}

function validateAcceptedGeometryEnvelopeContentIdentity(
  value: RecordValue,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (diagnostics.length === 0 && isDigest(value.contentIdentity)) {
    const expectedContentIdentity = computeAcceptedGeometryContentIdentity(value as unknown as AcceptedGeometry);
    if (value.contentIdentity !== expectedContentIdentity) {
      addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "ContentIdentity", "contentIdentity", null, "AcceptedGeometry contentIdentity does not match the canonical V1 projection.");
    }
  }
}

function isAcceptedRevisionIdentityCheckable(value: RecordValue, acceptance: RecordValue): boolean {
  return allTrue([
    isDigest(acceptance.acceptedContentIdentity),
    value.acceptedRevision === acceptance.acceptedRevision,
    isAcceptedGeometryShapeSafeForIdentity(value),
  ]);
}

function isAcceptedGeometryShapeSafeForIdentity(value: RecordValue): boolean {
  return allTrue([
    isRecord(value.coordinateFrame),
    Array.isArray(value.primitives),
    Array.isArray(value.correctionHistory),
    isNonEmptyString(value.acceptedGeometryId),
    isNonEmptyString(value.sourceObservationId),
    isDigest(value.sourceObservationContentIdentity),
    isNonNegativeIntegerValue(value.acceptedRevision),
  ]);
}

function validateExactKeys(
  value: RecordValue,
  keys: readonly string[],
  surface: ValidatorDiagnosticSurface,
  path: string,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  const actualKeys = safeObjectKeys(value);
  if (actualKeys === null) {
    addDiagnostic(diagnostics, code, surface, path, null, "Object could not be safely inspected.");
    return;
  }

  const allowed = new Set(keys);
  validateUnexpectedKeys(actualKeys, allowed, surface, path, code, diagnostics);
  validateMissingKeys(new Set(actualKeys), keys, surface, path, code, diagnostics);
}

function validateUnexpectedKeys(
  actualKeys: readonly string[],
  allowed: ReadonlySet<string>,
  surface: ValidatorDiagnosticSurface,
  path: string,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  for (const key of [...actualKeys].sort(compareStrings)) {
    if (!allowed.has(key)) {
      addDiagnostic(diagnostics, code, surface, joinPath(path, key), null, `Unexpected property is not allowed: ${joinPath(path, key)}.`);
    }
  }
}

function validateMissingKeys(
  actualKeys: ReadonlySet<string>,
  keys: readonly string[],
  surface: ValidatorDiagnosticSurface,
  path: string,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  for (const key of keys) {
    if (!actualKeys.has(key)) {
      addDiagnostic(diagnostics, code, surface, joinPath(path, key), null, `Required property is missing: ${joinPath(path, key)}.`);
    }
  }
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  surface: ValidatorDiagnosticSurface,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isNonEmptyString(value)) {
    addDiagnostic(diagnostics, code, surface, path, null, `${path} must be a non-empty string.`);
  }
}

function validateNullableStringField(
  value: unknown,
  path: string,
  surface: ValidatorDiagnosticSurface,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isNullableString(value)) {
    addDiagnostic(diagnostics, code, surface, path, null, `${path} must be a string or null.`);
  }
}

function validateNonNegativeInteger(
  value: unknown,
  path: string,
  surface: ValidatorDiagnosticSurface,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isNonNegativeIntegerValue(value)) {
    addDiagnostic(diagnostics, code, surface, path, null, `${path} must be a non-negative integer.`);
  }
}

function validateDigestField(
  value: unknown,
  path: string,
  surface: ValidatorDiagnosticSurface,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isDigest(value)) {
    addDiagnostic(diagnostics, code, surface, path, null, `${path} must use sha256:<64 lowercase hex characters>.`);
  }
}

function hasConfidenceUnavailableWarning(
  warnings: readonly WarningInfo[],
  targetPath: string,
  targetPrimitiveId: string | null,
): boolean {
  return warnings.some((warning) => isMatchingConfidenceUnavailableWarning(warning, targetPath, targetPrimitiveId));
}

function isMatchingConfidenceUnavailableWarning(
  warning: WarningInfo,
  targetPath: string,
  targetPrimitiveId: string | null,
): boolean {
  return allTrue([
    warning.code === "ConfidenceUnavailable",
    warning.targetPath === targetPath,
    warning.targetPrimitiveId === targetPrimitiveId,
    warning.severity === "info" || warning.severity === "warning",
  ]);
}

function invalid<TValue>(diagnostics: readonly ValidatorDiagnostic[]): ValidatorResult<TValue> {
  return {
    ok: false,
    diagnostics: sortDiagnostics(diagnostics),
  };
}

function addDiagnostic(
  diagnostics: ValidatorDiagnostic[],
  code: ValidatorDiagnosticCode,
  surface: ValidatorDiagnosticSurface,
  path: string,
  primitiveId: string | null,
  message: string,
): void {
  diagnostics.push({
    code,
    severity: "error",
    surface,
    path,
    primitiveId,
    message,
  });
}

function sortDiagnostics(diagnostics: readonly ValidatorDiagnostic[]): readonly ValidatorDiagnostic[] {
  const pathOrder = new Map<string, number>();
  for (const [index, diagnostic] of diagnostics.entries()) {
    if (!pathOrder.has(diagnostic.path)) {
      pathOrder.set(diagnostic.path, index);
    }
  }

  return [...diagnostics].sort((first, second) => compareDiagnostics(first, second, pathOrder));
}

function compareDiagnostics(
  first: ValidatorDiagnostic,
  second: ValidatorDiagnostic,
  pathOrder: ReadonlyMap<string, number>,
): number {
  return firstNonZero([
    compareNumbers(pathOrder.get(first.path) ?? 0, pathOrder.get(second.path) ?? 0),
    compareStrings(first.code, second.code),
    compareStrings(first.message, second.message),
  ]);
}

function contentIdentityFor(projection: unknown): string {
  const canonicalJson = serializeCanonicalJson(projection, IDENTITY_SERIALIZATION_POLICY);
  return `sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`;
}

function validateCoordinateBounds(
  value: unknown,
  path: string,
  shapeCode: Extract<ValidatorDiagnosticCode, "InvalidObservationCoordinateFrame" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, shapeCode, "CoordinateFrame", path, null, "CoordinateFrame bounds must be a closed object.");
    return false;
  }

  validateExactKeys(value, COORDINATE_BOUNDS_KEYS, "CoordinateFrame", path, shapeCode, diagnostics);
  if (!isUnitTuple(value.x) || !isUnitTuple(value.y)) {
    addDiagnostic(diagnostics, shapeCode, "CoordinateFrame", path, null, "CoordinateFrame bounds must exactly be { x: [0, 1], y: [0, 1] }.");
    return false;
  }

  return true;
}

function isUnitTuple(value: unknown): value is readonly [0, 1] {
  return Array.isArray(value) && value.length === 2 && value[0] === 0 && value[1] === 1;
}

function isStrictRfc3339DateTime(value: unknown): value is string {
  const parts = parseRfc3339DateTime(value);
  if (parts === null) {
    return false;
  }

  return allTrue([
    isValidRfc3339CalendarDate(parts),
    isValidRfc3339Time(parts),
    isValidRfc3339Offset(parts),
  ]);
}

function parseRfc3339DateTime(value: unknown): Rfc3339DateTimeParts | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const match = RFC3339_DATE_TIME_PATTERN.exec(value);
  if (match === null) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    offsetHour: rfc3339OffsetPart(match[8]),
    offsetMinute: rfc3339OffsetPart(match[9]),
  };
}

function rfc3339OffsetPart(value: string | undefined): number {
  return value === undefined ? 0 : Number(value);
}

function isValidRfc3339CalendarDate(parts: Rfc3339DateTimeParts): boolean {
  return allTrue([
    isIntegerInRange(parts.month, 1, 12),
    isIntegerInRange(parts.day, 1, daysInMonth(parts.year, parts.month)),
  ]);
}

function isValidRfc3339Time(parts: Rfc3339DateTimeParts): boolean {
  return allTrue([
    isIntegerInRange(parts.hour, 0, 23),
    isIntegerInRange(parts.minute, 0, 59),
    isIntegerInRange(parts.second, 0, 59),
  ]);
}

function isValidRfc3339Offset(parts: Rfc3339DateTimeParts): boolean {
  return allTrue([
    isIntegerInRange(parts.offsetHour, 0, 23),
    isIntegerInRange(parts.offsetMinute, 0, 59),
  ]);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isRecord(value: unknown): value is RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function safeObjectKeys(value: RecordValue): readonly string[] | null {
  try {
    return Object.keys(value);
  } catch {
    return null;
  }
}

function clonePlainData(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function nullableStringOrNull(value: unknown): string | null {
  return isNullableString(value) ? value : null;
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return isNonEmptyString(value) || value === null;
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_PATTERN.test(value);
}

function isNullableDigest(value: unknown): boolean {
  return value === null || isDigest(value);
}

function allTrue(values: readonly boolean[]): boolean {
  return values.every(Boolean);
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isNonNegativeIntegerValue(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNormalized(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isObservationPrimitiveKind(value: unknown): value is ObservationPrimitiveKind {
  return OBSERVATION_PRIMITIVE_KINDS.includes(value as ObservationPrimitiveKind);
}

function isEvidenceKind(value: unknown): value is EvidenceKind {
  return EVIDENCE_KINDS.includes(value as EvidenceKind);
}

function isWarningSeverity(value: unknown): value is ObservationWarningSeverity {
  return WARNING_SEVERITIES.includes(value as ObservationWarningSeverity);
}

function isActorType(value: unknown): value is ObservationActorType {
  return ACTOR_TYPES.includes(value as ObservationActorType);
}

function isNonProviderActorType(value: unknown): value is Exclude<ObservationActorType, "provider"> {
  return isActorType(value) && value !== "provider";
}

function isCorrectionOperation(value: unknown): value is CorrectionOperation {
  return CORRECTION_OPERATIONS.includes(value as CorrectionOperation);
}

function isKnownNullablePrimitive(value: unknown, primitiveIds: ReadonlySet<string>): boolean {
  return value === null || (typeof value === "string" && primitiveIds.has(value));
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isString);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function nullablePrimitiveId(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function joinPath(prefix: string, key: string): string {
  return prefix.length === 0 ? key : `${prefix}.${key}`;
}

function compareStrings(first: string, second: string): number {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}

function compareNumbers(first: number, second: number): number {
  return first - second;
}

function firstNonZero(values: readonly number[]): number {
  for (const value of values) {
    if (value !== 0) {
      return value;
    }
  }
  return 0;
}
