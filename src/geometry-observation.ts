import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const GEOMETRY_OBSERVATION_CONTRACT_ID = "norma.geometry-observation" as const;
export const GEOMETRY_OBSERVATION_CONTRACT_VERSION = 1 as const;
export const PERCEPTION_PROVIDER_CONTRACT_ID = "norma.perception-provider" as const;
export const PERCEPTION_PROVIDER_CONTRACT_VERSION = 1 as const;
export const ACCEPTED_GEOMETRY_CONTRACT_ID = "norma.accepted-geometry" as const;
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

const SHA256_INITIAL_HASHES = [
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
] as const;

const SHA256_ROUND_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

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

  return diagnostics.length === 0
    ? { ok: true, value: value as unknown as GeometryObservation, diagnostics: [] }
    : invalid(diagnostics);
}

export function validateAcceptedGeometryV1(value: unknown): ValidatorResult<AcceptedGeometry> {
  const diagnostics: ValidatorDiagnostic[] = [];

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

  return diagnostics.length === 0
    ? { ok: true, value: value as unknown as AcceptedGeometry, diagnostics: [] }
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
  const invalid =
    !isNonEmptyString(value.assetId) ||
    !isNonEmptyString(value.mediaType) ||
    !isDigest(value.contentDigest) ||
    !isDigest(value.contentIdentity) ||
    !isPositiveInteger(value.pixelWidth) ||
    !isPositiveInteger(value.pixelHeight) ||
    typeof value.synthetic !== "boolean" ||
    typeof value.localOnly !== "boolean";

  if (invalid) {
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
  const invalid =
    !isNonEmptyString(value.providerFamily) ||
    !isNonEmptyString(value.providerImplementationId) ||
    !(isNonEmptyString(value.providerVersion) || value.providerVersion === null) ||
    !isNonEmptyString(value.operationId) ||
    !isNonEmptyString(value.operationVersion) ||
    !isNonEmptyString(value.configurationIdentity) ||
    !isNonEmptyString(value.providerRunId) ||
    !Array.isArray(value.warnings);

  if (invalid) {
    addDiagnostic(diagnostics, "MissingProviderIdentity", "ProviderIdentity", path, null, "ProviderIdentity must include provider and run identity.");
  }

  validateProvenanceRef(value.provenance, `${path}.provenance`, "MissingObservationProvenance", diagnostics);
  if (Array.isArray(value.warnings)) {
    validateObservationWarnings(value.warnings, `${path}.warnings`, new Set(), "InvalidGeometryObservationShape", diagnostics);
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
  if (
    value.dimensions !== 2 ||
    value.coordinateScale !== "normalized" ||
    value.origin !== "top-left" ||
    value.xDirection !== "right" ||
    value.yDirection !== "down" ||
    !isPositiveInteger(value.sourcePixelWidth) ||
    !isPositiveInteger(value.sourcePixelHeight) ||
    !isCoordinateBounds(value.bounds)
  ) {
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

  value.forEach((primitive, index) => {
    const primitivePath = `${path}.${index}`;
    if (!isRecord(primitive)) {
      addDiagnostic(diagnostics, shapeCode, "Primitive", primitivePath, null, "Primitive must be a closed object.");
      return;
    }

    const primitiveId = typeof primitive.id === "string" ? primitive.id : null;
    if (!isNonEmptyString(primitive.id)) {
      addDiagnostic(diagnostics, shapeCode, "Primitive", `${primitivePath}.id`, null, "Primitive id must be a non-empty string.");
    } else if (seenIds.has(primitive.id)) {
      addDiagnostic(
        diagnostics,
        "DuplicateObservationPrimitiveId",
        "Primitive",
        `${primitivePath}.id`,
        primitive.id,
        `Primitive id is duplicated: ${primitive.id}.`,
      );
    } else {
      seenIds.add(primitive.id);
      primitiveIds.add(primitive.id);
    }

    validateConfidence(primitive.confidence, `${primitivePath}.confidence`, primitiveId, diagnostics);

    if (!isObservationPrimitiveKind(primitive.kind)) {
      addDiagnostic(
        diagnostics,
        "UnsupportedObservationPrimitiveKind",
        "Primitive",
        `${primitivePath}.kind`,
        primitiveId,
        "Observation primitive kind is not supported by V1.",
      );
      return;
    }

    if (primitive.kind === "point") {
      validateExactKeys(primitive, POINT_PRIMITIVE_KEYS, "Primitive", primitivePath, shapeCode, diagnostics);
      validatePointCoordinates(primitive.x, primitive.y, primitivePath, primitiveId, diagnostics);
    } else if (primitive.kind === "segment" || primitive.kind === "axis") {
      validateExactKeys(primitive, SEGMENT_PRIMITIVE_KEYS, "Primitive", primitivePath, shapeCode, diagnostics);
      validateSegmentLikePrimitive(primitive, primitivePath, primitiveId, diagnostics);
    } else {
      validateExactKeys(primitive, RECTANGLE_PRIMITIVE_KEYS, "Primitive", primitivePath, shapeCode, diagnostics);
      validateRectanglePrimitive(primitive, primitivePath, primitiveId, diagnostics);
    }
  });

  return primitiveIds;
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

  value.forEach((evidence, index) => {
    const evidencePath = `${path}.${index}`;
    if (!isRecord(evidence)) {
      addDiagnostic(diagnostics, shapeCode, "EvidenceRef", evidencePath, null, "EvidenceRef must be a closed object.");
      return;
    }

    validateExactKeys(evidence, EVIDENCE_REF_KEYS, "EvidenceRef", evidencePath, shapeCode, diagnostics);
    if (!isNonEmptyString(evidence.evidenceId)) {
      addDiagnostic(diagnostics, shapeCode, "EvidenceRef", `${evidencePath}.evidenceId`, null, "EvidenceRef evidenceId must be non-empty.");
    }
    if (!isEvidenceKind(evidence.kind)) {
      addDiagnostic(diagnostics, shapeCode, "EvidenceRef", `${evidencePath}.kind`, null, "EvidenceRef kind is not supported by V1.");
    }
    if (!isNullableString(evidence.targetPrimitiveId) || !isKnownNullablePrimitive(evidence.targetPrimitiveId, primitiveIds)) {
      addDiagnostic(diagnostics, shapeCode, "EvidenceRef", `${evidencePath}.targetPrimitiveId`, null, "EvidenceRef targetPrimitiveId must be a known primitive id or null.");
    }
    validateConfidence(evidence.confidence, `${evidencePath}.confidence`, nullablePrimitiveId(evidence.targetPrimitiveId), diagnostics);
    validateNullableStringField(evidence.label, `${evidencePath}.label`, "EvidenceRef", shapeCode, diagnostics);
    validateNullableStringField(evidence.regionRef, `${evidencePath}.regionRef`, "EvidenceRef", shapeCode, diagnostics);
    validateNullableStringField(evidence.warningCode, `${evidencePath}.warningCode`, "EvidenceRef", shapeCode, diagnostics);
    validateProvenanceRef(evidence.provenance, `${evidencePath}.provenance`, "MissingObservationProvenance", diagnostics);

    if (evidence.confidence === null) {
      const targetPrimitiveId = nullablePrimitiveId(evidence.targetPrimitiveId);
      const confidencePath = `${evidencePath}.confidence`;
      if (!hasConfidenceUnavailableWarning(warnings, confidencePath, targetPrimitiveId)) {
        addDiagnostic(
          diagnostics,
          "InvalidObservationConfidence",
          "EvidenceRef",
          confidencePath,
          targetPrimitiveId,
          "Null evidence confidence requires a linked ConfidenceUnavailable warning.",
        );
      }
    }
  });
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

  value.forEach((warning, index) => {
    const warningPath = `${path}.${index}`;
    if (!isRecord(warning)) {
      addDiagnostic(diagnostics, shapeCode, "ObservationWarning", warningPath, null, "ObservationWarning must be a closed object.");
      return;
    }

    validateExactKeys(warning, OBSERVATION_WARNING_KEYS, "ObservationWarning", warningPath, shapeCode, diagnostics);
    if (!isNonEmptyString(warning.code)) {
      addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.code`, null, "ObservationWarning code must be non-empty.");
    }
    if (!isWarningSeverity(warning.severity)) {
      addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.severity`, null, "ObservationWarning severity is invalid.");
    }
    if (!isNonEmptyString(warning.message)) {
      addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.message`, null, "ObservationWarning message must be non-empty.");
    }
    if (!isNullableString(warning.targetPath)) {
      addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.targetPath`, null, "ObservationWarning targetPath must be a string or null.");
    }
    if (!isNullableString(warning.targetPrimitiveId) || !isKnownNullablePrimitive(warning.targetPrimitiveId, primitiveIds)) {
      addDiagnostic(diagnostics, shapeCode, "ObservationWarning", `${warningPath}.targetPrimitiveId`, null, "ObservationWarning targetPrimitiveId must be a known primitive id or null.");
    }
    validateProvenanceRef(warning.provenance, `${warningPath}.provenance`, "MissingObservationProvenance", diagnostics);

    warnings.push({
      code: typeof warning.code === "string" ? warning.code : "",
      severity: typeof warning.severity === "string" ? warning.severity : "",
      targetPath: typeof warning.targetPath === "string" || warning.targetPath === null ? warning.targetPath : null,
      targetPrimitiveId: typeof warning.targetPrimitiveId === "string" || warning.targetPrimitiveId === null ? warning.targetPrimitiveId : null,
    });
  });

  return warnings;
}

function validatePrimitiveNullConfidenceWarnings(
  value: unknown,
  warnings: readonly WarningInfo[],
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((primitive, index) => {
    if (!isRecord(primitive) || primitive.confidence !== null || !isNonEmptyString(primitive.id)) {
      return;
    }

    const confidencePath = `primitives.${index}.confidence`;
    if (!hasConfidenceUnavailableWarning(warnings, confidencePath, primitive.id)) {
      addDiagnostic(
        diagnostics,
        "InvalidObservationConfidence",
        "Primitive",
        confidencePath,
        primitive.id,
        "Null primitive confidence requires a linked ConfidenceUnavailable warning.",
      );
    }
  });
}

function validateProvenanceRef(
  value: unknown,
  path: string,
  code: Extract<ValidatorDiagnosticCode, "MissingObservationProvenance" | "InvalidAcceptedGeometryShape">,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, code, "ProvenanceRef", path, null, "ProvenanceRef is required.");
    return;
  }

  validateExactKeys(value, PROVENANCE_REF_KEYS, "ProvenanceRef", path, code, diagnostics);
  const invalid =
    !isNonEmptyString(value.provenanceId) ||
    !isActorType(value.actorType) ||
    !isNullableString(value.actorId) ||
    !isNonEmptyString(value.operationId) ||
    !isNonEmptyString(value.operationVersion) ||
    !isNullableString(value.inputContentIdentity) ||
    !isStrictRfc3339DateTime(value.createdAt) ||
    !isNullableString(value.notes);

  if (invalid) {
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
  let previousSequence = -1;
  value.forEach((entry, index) => {
    const entryPath = `${path}.${index}`;
    if (!isRecord(entry)) {
      addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, null, "CorrectionEntry must be a closed object.");
      return;
    }

    validateExactKeys(entry, CORRECTION_ENTRY_KEYS, "CorrectionEntry", entryPath, "InvalidCorrectionHistory", diagnostics);
    validateNonEmptyString(entry.correctionId, `${entryPath}.correctionId`, "CorrectionEntry", "InvalidCorrectionHistory", diagnostics);
    validateNonNegativeInteger(entry.sequence, `${entryPath}.sequence`, "CorrectionEntry", "InvalidCorrectionHistory", diagnostics);
    if (typeof entry.sequence === "number" && Number.isInteger(entry.sequence)) {
      if (sequences.has(entry.sequence) || entry.sequence <= previousSequence) {
        addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.sequence`, null, "CorrectionEntry sequence values must be unique and ordered.");
      }
      sequences.add(entry.sequence);
      previousSequence = entry.sequence;
    }
    if (!isActorType(entry.actorType)) {
      addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.actorType`, null, "CorrectionEntry actorType is invalid.");
    }
    if (!isCorrectionOperation(entry.operation)) {
      addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.operation`, null, "CorrectionEntry operation is invalid.");
    }
    validateCorrectionTargetPrimitive(entry, entryPath, primitiveIds, diagnostics);
    validateNonEmptyString(entry.reason, `${entryPath}.reason`, "CorrectionEntry", "InvalidCorrectionHistory", diagnostics);
    validateCorrectionContentIdentities(entry, entryPath, diagnostics);
    validateProvenanceRef(entry.provenance, `${entryPath}.provenance`, "InvalidAcceptedGeometryShape", diagnostics);
  });
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
  if (value.accepted !== true) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.accepted", null, "AcceptedGeometry acceptance must be explicitly true.");
  }
  if (!isActorType(value.actorType) || value.actorType === "provider") {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.actorType", null, "Provider self-acceptance is not approved.");
  }
  if (!isNullableString(value.actorId)) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.actorId", null, "Acceptance actorId must be a string or null.");
  }
  if (!isStrictRfc3339DateTime(value.acceptedAt)) {
    addDiagnostic(diagnostics, "ExplicitAcceptanceRequired", "AcceptanceRecord", "acceptance.acceptedAt", null, "acceptedAt must be a strict RFC3339 date-time string.");
  }
  if (value.sourceObservationId !== accepted.sourceObservationId) {
    addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "AcceptanceRecord", "acceptance.sourceObservationId", null, "Acceptance sourceObservationId must match AcceptedGeometry.");
  }
  if (value.sourceObservationContentIdentity !== accepted.sourceObservationContentIdentity) {
    addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "AcceptanceRecord", "acceptance.sourceObservationContentIdentity", null, "Acceptance source observation content identity must match AcceptedGeometry.");
  }
  if (value.acceptedRevision !== accepted.acceptedRevision) {
    addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "AcceptanceRecord", "acceptance.acceptedRevision", null, "Acceptance revision must match AcceptedGeometry.");
  }
  validateDigestField(value.acceptedContentIdentity, "acceptance.acceptedContentIdentity", "AcceptanceRecord", "AcceptedGeometryRevisionMismatch", diagnostics);
  validateAcceptedPrimitiveIds(value.acceptedPrimitiveIds, primitiveIds, diagnostics);
  validateProvenanceRef(value.provenance, "acceptance.provenance", "InvalidAcceptedGeometryShape", diagnostics);
}

function validateAcceptedPrimitiveIds(
  value: unknown,
  primitiveIds: ReadonlySet<string>,
  diagnostics: ValidatorDiagnostic[],
): void {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "AcceptanceRecord", "acceptance.acceptedPrimitiveIds", null, "acceptedPrimitiveIds must be an ordered string array.");
    return;
  }

  const uniqueIds = new Set(value);
  const expectedIds = [...primitiveIds];
  const matchesPrimitives = value.length === expectedIds.length && value.every((item, index) => item === expectedIds[index]);

  if (uniqueIds.size !== value.length || !matchesPrimitives) {
    addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "AcceptanceRecord", "acceptance.acceptedPrimitiveIds", null, "acceptedPrimitiveIds must exactly match accepted primitives in order.");
  }
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

  if ((entry.operation === "update" || entry.operation === "remove") && !isNonEmptyString(entry.targetPrimitiveId)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.targetPrimitiveId`, null, "CorrectionEntry targetPrimitiveId is required for update and remove.");
    return;
  }

  if (typeof entry.targetPrimitiveId === "string" && !primitiveIds.has(entry.targetPrimitiveId)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", `${entryPath}.targetPrimitiveId`, entry.targetPrimitiveId, "CorrectionEntry targetPrimitiveId must reference an accepted primitive.");
  }
}

function validateCorrectionContentIdentities(
  entry: RecordValue,
  entryPath: string,
  diagnostics: ValidatorDiagnostic[],
): void {
  const before = entry.beforeContentIdentity;
  const after = entry.afterContentIdentity;
  const beforeValid = before === null || isDigest(before);
  const afterValid = after === null || isDigest(after);

  if (!beforeValid || !afterValid) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, null, "CorrectionEntry before/after identities must be sha256 identities or null.");
    return;
  }

  if (entry.operation === "add") {
    if (before !== null || !isDigest(after)) {
      addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, nullablePrimitiveId(entry.targetPrimitiveId), "Add corrections require null before identity and non-null after identity.");
    }
  } else if (entry.operation === "update") {
    if (!isDigest(before) || !isDigest(after) || before === after) {
      addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, nullablePrimitiveId(entry.targetPrimitiveId), "Update corrections require different non-null before and after identities.");
    }
  } else if (entry.operation === "remove" && (!isDigest(before) || after !== null)) {
    addDiagnostic(diagnostics, "InvalidCorrectionHistory", "CorrectionEntry", entryPath, nullablePrimitiveId(entry.targetPrimitiveId), "Remove corrections require non-null before identity and null after identity.");
  }
}

function validateSegmentLikePrimitive(
  primitive: RecordValue,
  primitivePath: string,
  primitiveId: string | null,
  diagnostics: ValidatorDiagnostic[],
): void {
  const startOk = validateEndpoint(primitive.start, `${primitivePath}.start`, primitiveId, diagnostics);
  const endOk = validateEndpoint(primitive.end, `${primitivePath}.end`, primitiveId, diagnostics);

  if (startOk && endOk) {
    const start = primitive.start as ObservationPoint;
    const end = primitive.end as ObservationPoint;
    if (start.x === end.x && start.y === end.y) {
      addDiagnostic(diagnostics, "DegenerateObservationPrimitive", "Primitive", primitivePath, primitiveId, "Segment and axis endpoints must be distinct.");
    }
  }
}

function validateEndpoint(
  value: unknown,
  path: string,
  primitiveId: string | null,
  diagnostics: ValidatorDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "InvalidGeometryObservationShape", "Primitive", path, primitiveId, "Endpoint must be a closed { x, y } object.");
    return false;
  }

  validateExactKeys(value, POINT_KEYS, "Primitive", path, "InvalidGeometryObservationShape", diagnostics);
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
  if (!isFiniteNumber(primitive.width) || !isFiniteNumber(primitive.height) || primitive.width <= 0 || primitive.height <= 0) {
    addDiagnostic(diagnostics, "DegenerateObservationPrimitive", "Primitive", primitivePath, primitiveId, "Rectangle width and height must be positive.");
  }

  if (
    !isFiniteNormalized(primitive.x) ||
    !isFiniteNormalized(primitive.y) ||
    !isFiniteNumber(primitive.width) ||
    !isFiniteNumber(primitive.height) ||
    primitive.x + primitive.width > 1 ||
    primitive.y + primitive.height > 1
  ) {
    addDiagnostic(diagnostics, "ObservationCoordinateOutsideBounds", "Primitive", primitivePath, primitiveId, "Rectangle must remain within inclusive normalized bounds.");
  }
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

  if (
    isDigest(value.acceptance.acceptedContentIdentity) &&
    value.acceptedRevision === value.acceptance.acceptedRevision &&
    isAcceptedGeometryShapeSafeForIdentity(value)
  ) {
    const expectedRevisionIdentity = computeAcceptedGeometryRevisionContentIdentity(value as unknown as AcceptedGeometry);
    if (value.acceptance.acceptedContentIdentity !== expectedRevisionIdentity) {
      addDiagnostic(diagnostics, "AcceptedGeometryRevisionMismatch", "ContentIdentity", "acceptance.acceptedContentIdentity", null, "AcceptedGeometry acceptedContentIdentity does not match the accepted revision payload.");
    }
  }

  if (diagnostics.length === 0 && isDigest(value.contentIdentity)) {
    const expectedContentIdentity = computeAcceptedGeometryContentIdentity(value as unknown as AcceptedGeometry);
    if (value.contentIdentity !== expectedContentIdentity) {
      addDiagnostic(diagnostics, "InvalidAcceptedGeometryShape", "ContentIdentity", "contentIdentity", null, "AcceptedGeometry contentIdentity does not match the canonical V1 projection.");
    }
  }
}

function isAcceptedGeometryShapeSafeForIdentity(value: RecordValue): boolean {
  return isRecord(value.coordinateFrame) &&
    Array.isArray(value.primitives) &&
    Array.isArray(value.correctionHistory) &&
    isNonEmptyString(value.acceptedGeometryId) &&
    isNonEmptyString(value.sourceObservationId) &&
    isDigest(value.sourceObservationContentIdentity) &&
    isNonNegativeIntegerValue(value.acceptedRevision);
}

function validateExactKeys(
  value: RecordValue,
  keys: readonly string[],
  surface: ValidatorDiagnosticSurface,
  path: string,
  code: ValidatorDiagnosticCode,
  diagnostics: ValidatorDiagnostic[],
): void {
  const allowed = new Set(keys);

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      addDiagnostic(diagnostics, code, surface, joinPath(path, key), null, `Unexpected property is not allowed: ${joinPath(path, key)}.`);
    }
  }

  for (const key of keys) {
    if (!(key in value)) {
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
  return warnings.some((warning) => (
    warning.code === "ConfidenceUnavailable" &&
    warning.targetPath === targetPath &&
    warning.targetPrimitiveId === targetPrimitiveId &&
    (warning.severity === "info" || warning.severity === "warning")
  ));
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
  diagnostics.forEach((diagnostic, index) => {
    if (!pathOrder.has(diagnostic.path)) {
      pathOrder.set(diagnostic.path, index);
    }
  });

  return [...diagnostics].sort((first, second) => (
    (pathOrder.get(first.path) ?? 0) - (pathOrder.get(second.path) ?? 0) ||
    compareStrings(first.code, second.code) ||
    compareStrings(first.message, second.message)
  ));
}

function contentIdentityFor(projection: unknown): string {
  const canonicalJson = serializeCanonicalJson(projection, IDENTITY_SERIALIZATION_POLICY);
  return `sha256:${sha256Hex(canonicalJson)}`;
}

function sha256Hex(input: string): string {
  const inputBytes = new TextEncoder().encode(input);
  const paddedLength = Math.ceil((inputBytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(inputBytes);
  padded[inputBytes.length] = 0x80;

  const bitLength = inputBytes.length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const hash: number[] = [...SHA256_INITIAL_HASHES];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15] ?? 0, 7) ^ rotateRight(words[index - 15] ?? 0, 18) ^ ((words[index - 15] ?? 0) >>> 3);
      const s1 = rotateRight(words[index - 2] ?? 0, 17) ^ rotateRight(words[index - 2] ?? 0, 19) ^ ((words[index - 2] ?? 0) >>> 10);
      words[index] = ((words[index - 16] ?? 0) + s0 + (words[index - 7] ?? 0) + s1) >>> 0;
    }

    let a = hash[0] ?? 0;
    let b = hash[1] ?? 0;
    let c = hash[2] ?? 0;
    let d = hash[3] ?? 0;
    let e = hash[4] ?? 0;
    let f = hash[5] ?? 0;
    let g = hash[6] ?? 0;
    let h = hash[7] ?? 0;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (SHA256_ROUND_CONSTANTS[index] ?? 0) + (words[index] ?? 0)) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = ((hash[0] ?? 0) + a) >>> 0;
    hash[1] = ((hash[1] ?? 0) + b) >>> 0;
    hash[2] = ((hash[2] ?? 0) + c) >>> 0;
    hash[3] = ((hash[3] ?? 0) + d) >>> 0;
    hash[4] = ((hash[4] ?? 0) + e) >>> 0;
    hash[5] = ((hash[5] ?? 0) + f) >>> 0;
    hash[6] = ((hash[6] ?? 0) + g) >>> 0;
    hash[7] = ((hash[7] ?? 0) + h) >>> 0;
  }

  return hash.map((word) => word.toString(16).padStart(8, "0")).join("");
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function isCoordinateBounds(value: unknown): value is CoordinateFrame["bounds"] {
  if (!isRecord(value)) {
    return false;
  }

  validateBoundsKeys(value);
  return isUnitTuple(value.x) && isUnitTuple(value.y);
}

function validateBoundsKeys(value: RecordValue): boolean {
  const keys = Object.keys(value);
  return keys.length === 2 && keys.includes("x") && keys.includes("y");
}

function isUnitTuple(value: unknown): value is readonly [0, 1] {
  return Array.isArray(value) && value.length === 2 && value[0] === 0 && value[1] === 1;
}

function isStrictRfc3339DateTime(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  const match = RFC3339_DATE_TIME_PATTERN.exec(value);
  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);

  return month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59 &&
    offsetHour >= 0 &&
    offsetHour <= 23 &&
    offsetMinute >= 0 &&
    offsetMinute <= 59;
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
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_PATTERN.test(value);
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

function isCorrectionOperation(value: unknown): value is CorrectionOperation {
  return CORRECTION_OPERATIONS.includes(value as CorrectionOperation);
}

function isKnownNullablePrimitive(value: unknown, primitiveIds: ReadonlySet<string>): boolean {
  return value === null || (typeof value === "string" && primitiveIds.has(value));
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
