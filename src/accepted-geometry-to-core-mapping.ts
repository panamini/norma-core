import { createHash } from "node:crypto";
import type {
  AcceptedGeometry,
  ObservationPrimitive,
  ObservationPrimitiveKind,
  RectanglePrimitive,
  ValidatorDiagnostic,
} from "./geometry-observation.js";
import { validateAcceptedGeometryV1 } from "./geometry-observation.js";
import type { Composition2D, CoordinateSystem, CoreError, Element, Rect, SourceReference } from "./index.js";
import { validateGeometryV1 } from "./index.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID = "norma.accepted-geometry-to-core-mapping@1" as const;
export const ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION = 1 as const;
export const ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID = "core.accepted-geometry-to-core-mapping.map" as const;
export const ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION = "0.1.0-pr81" as const;
export const ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID =
  "norma.accepted-geometry-to-core-mapping.rectangles-to-composition-2d@1" as const;
export const ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION = 1 as const;
export const ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID =
  "core.geometry-v1.composition-2d.normalized-rectangles@1" as const;
export const ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND = "composition-2d" as const;
export const ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM =
  "normalized-top-left-y-down-to-bottom-left-y-up@1" as const;

export type AcceptedGeometryToCoreMappingStatus = "mapped" | "invalid" | "unsupported";
export type AcceptedGeometryToCoreMappingDiagnosticCode =
  | "InvalidAcceptedGeometryMappingRequest"
  | "UnsupportedAcceptedGeometryMappingRequest"
  | "UnsupportedAcceptedGeometryPrimitiveKind"
  | "AcceptedGeometryCoordinateTransformFailed"
  | "AcceptedGeometryMappingContentIdentityMismatch"
  | "AcceptedGeometrySourceIdentityCollision";
export type AcceptedGeometryToCoreMappingDiagnosticSurface =
  | "AcceptedGeometryToCoreMappingRequest"
  | "AcceptedGeometry"
  | "Primitive"
  | "CoordinateTransform"
  | "ContentIdentity"
  | "TargetCoreGeometry";

export interface AcceptedGeometryToCoreTargetCoordinateSystem extends CoordinateSystem {
  readonly kind: "coordinate-system";
  readonly id: "norma-canonical-2d-normalized";
  readonly origin: "bottom-left";
  readonly xAxis: "right";
  readonly yAxis: "up";
  readonly dimensions: 2;
  readonly coordinateScale: "normalized";
}

export interface AcceptedGeometryToCoreMappingContextV1 {
  readonly boundary: "synthetic-only" | "explicit-external-evidence-acceptance@1";
  readonly primitiveLossPolicy: "reject";
  readonly coordinateTransform: typeof ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM;
}

export interface AcceptedGeometryToCoreMappingRequestV1 {
  readonly contractId: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID;
  readonly contractVersion: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION;
  readonly requestId: string;
  readonly mapperOperationId: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID;
  readonly mapperOperationVersion: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION;
  readonly mappingProfileId: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID;
  readonly mappingProfileVersion: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION;
  readonly targetCoreProfileId: typeof ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID;
  readonly targetCoreGeometryKind: typeof ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND;
  readonly targetCoordinateSystem: AcceptedGeometryToCoreTargetCoordinateSystem;
  readonly acceptedGeometry: AcceptedGeometry;
  readonly acceptedGeometryContentIdentity: string;
  readonly sourceObservationId: string;
  readonly sourceObservationContentIdentity: string;
  readonly mappingContext: AcceptedGeometryToCoreMappingContextV1;
}

export interface AcceptedPrimitiveCoreMapping {
  readonly acceptedGeometryId: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly sourceObservationId: string;
  readonly sourceObservationContentIdentity: string;
  readonly acceptedPrimitiveId: string;
  readonly acceptedPrimitiveKind: ObservationPrimitiveKind;
  readonly coreObjectKind: "element";
  readonly coreObjectId: string;
  readonly coreObjectRef: string;
  readonly mappingProfileId: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID;
}

export interface CoordinateTransformRecordV1 {
  readonly coordinateTransform: typeof ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM;
  readonly sourceCoordinateSystem: {
    readonly dimensions: 2;
    readonly coordinateScale: "normalized";
    readonly origin: "top-left";
    readonly xDirection: "right";
    readonly yDirection: "down";
  };
  readonly targetCoordinateSystem: AcceptedGeometryToCoreTargetCoordinateSystem;
  readonly rectangleFormula: {
    readonly coreX: "observationX";
    readonly coreY: "1 - observationY - observationHeight";
    readonly coreWidth: "observationWidth";
    readonly coreHeight: "observationHeight";
  };
}

export interface AcceptedGeometryToCoreMappingDiagnostic {
  readonly code: AcceptedGeometryToCoreMappingDiagnosticCode;
  readonly severity: "error";
  readonly surface: AcceptedGeometryToCoreMappingDiagnosticSurface;
  readonly path: string;
  readonly primitiveId: string | null;
  readonly message: string;
}

export interface AcceptedGeometryToCoreMappingDebugEvent {
  readonly kind: "unexpected-error";
  readonly operation: "mapAcceptedGeometryToCoreV1";
  readonly errorName: string;
  readonly errorMessage: string;
}

export interface AcceptedGeometryToCoreMappingResultV1 {
  readonly contractId: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID;
  readonly contractVersion: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION;
  readonly requestId: string;
  readonly ok: boolean;
  readonly status: AcceptedGeometryToCoreMappingStatus;
  readonly mapperOperationId: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID;
  readonly mapperOperationVersion: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION;
  readonly mappingProfileId: typeof ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID;
  readonly targetCoreProfileId: typeof ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID;
  readonly targetCoreGeometryKind: typeof ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND;
  readonly mappedGeometry: Composition2D | null;
  readonly mappedGeometryContentIdentity: string | null;
  readonly resultContentIdentity: string;
  readonly primitiveMappings: readonly AcceptedPrimitiveCoreMapping[];
  readonly coordinateTransform: CoordinateTransformRecordV1;
  readonly sourceRefs: readonly SourceReference[];
  readonly diagnostics: readonly AcceptedGeometryToCoreMappingDiagnostic[];
}

type MappingRequestRecord = Record<string, unknown>;

interface MappingFailure {
  readonly status: Exclude<AcceptedGeometryToCoreMappingStatus, "mapped">;
  readonly diagnostics: readonly AcceptedGeometryToCoreMappingDiagnostic[];
}

interface BuiltMapping {
  readonly mappedGeometry: Composition2D;
  readonly primitiveMappings: readonly AcceptedPrimitiveCoreMapping[];
}

let lastMappingDebugEvent: AcceptedGeometryToCoreMappingDebugEvent | null = null;

export const ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM: AcceptedGeometryToCoreTargetCoordinateSystem =
  Object.freeze({
    kind: "coordinate-system",
    id: "norma-canonical-2d-normalized",
    origin: "bottom-left",
    xAxis: "right",
    yAxis: "up",
    dimensions: 2,
    coordinateScale: "normalized",
  });

export function getLastAcceptedGeometryToCoreMappingDebugEvent(): AcceptedGeometryToCoreMappingDebugEvent | null {
  return lastMappingDebugEvent === null ? null : { ...lastMappingDebugEvent };
}

export const ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM_RECORD: CoordinateTransformRecordV1 = Object.freeze({
  coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  sourceCoordinateSystem: Object.freeze({
    dimensions: 2,
    coordinateScale: "normalized",
    origin: "top-left",
    xDirection: "right",
    yDirection: "down",
  }),
  targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
  rectangleFormula: Object.freeze({
    coreX: "observationX",
    coreY: "1 - observationY - observationHeight",
    coreWidth: "observationWidth",
    coreHeight: "observationHeight",
  }),
});

const REQUEST_KEYS = [
  "contractId",
  "contractVersion",
  "requestId",
  "mapperOperationId",
  "mapperOperationVersion",
  "mappingProfileId",
  "mappingProfileVersion",
  "targetCoreProfileId",
  "targetCoreGeometryKind",
  "targetCoordinateSystem",
  "acceptedGeometry",
  "acceptedGeometryContentIdentity",
  "sourceObservationId",
  "sourceObservationContentIdentity",
  "mappingContext",
] as const;

const TARGET_COORDINATE_SYSTEM_KEYS = [
  "kind",
  "id",
  "origin",
  "xAxis",
  "yAxis",
  "dimensions",
  "coordinateScale",
] as const;

const MAPPING_CONTEXT_KEYS = [
  "boundary",
  "primitiveLossPolicy",
  "coordinateTransform",
] as const;

const REQUEST_FIELD_ORDER = [
  "",
  ...REQUEST_KEYS,
  ...TARGET_COORDINATE_SYSTEM_KEYS.map((key) => `targetCoordinateSystem.${key}`),
  "acceptedGeometry.contractId",
  "acceptedGeometry.contractVersion",
  "acceptedGeometry.acceptedGeometryId",
  "acceptedGeometry.sourceObservationId",
  "acceptedGeometry.sourceObservationContentIdentity",
  "acceptedGeometry.acceptedRevision",
  "acceptedGeometry.coordinateFrame",
  "acceptedGeometry.primitives",
  "acceptedGeometry.correctionHistory",
  "acceptedGeometry.acceptance",
  "acceptedGeometry.provenance",
  "acceptedGeometry.contentIdentity",
  ...MAPPING_CONTEXT_KEYS.map((key) => `mappingContext.${key}`),
] as const;

export function mapAcceptedGeometryToCoreV1(input: unknown): AcceptedGeometryToCoreMappingResultV1 {
  const diagnostics: AcceptedGeometryToCoreMappingDiagnostic[] = [];
  const requestId = requestIdFor(input);

  try {
    if (!isRecord(input)) {
      return createMappingResult({
        requestId,
        status: "invalid",
        diagnostics: [
          diagnostic(
            "InvalidAcceptedGeometryMappingRequest",
            "AcceptedGeometryToCoreMappingRequest",
            "",
            null,
            "AcceptedGeometry mapping request must be a closed object.",
          ),
        ],
      });
    }

    validateRequestEnvelope(input, diagnostics);
    const acceptedValidation = validateAcceptedGeometryV1(input.acceptedGeometry);
    addAcceptedGeometryValidationDiagnostics(acceptedValidation.diagnostics, diagnostics);

    if (!acceptedValidation.ok) {
      return createMappingResult({
        requestId,
        status: statusForDiagnostics(diagnostics),
        diagnostics: sortMappingDiagnostics(diagnostics, input.acceptedGeometry),
      });
    }

    validateAcceptedGeometryMappingRequest(input, acceptedValidation.value, diagnostics);
    validateRectangleOnlyPrimitiveSet(acceptedValidation.value.primitives, diagnostics);

    if (diagnostics.length !== 0) {
      return createMappingResult({
        requestId,
        status: statusForDiagnostics(diagnostics),
        diagnostics: sortMappingDiagnostics(diagnostics, acceptedValidation.value),
      });
    }

    const builtMapping = buildMappedGeometry(acceptedValidation.value);
    const mappingFailure = validateBuiltMapping(builtMapping);
    if (mappingFailure !== null) {
      return createMappingResult({
        requestId,
        status: mappingFailure.status,
        diagnostics: sortMappingDiagnostics(mappingFailure.diagnostics, acceptedValidation.value),
      });
    }

    return createMappingResult({
      requestId,
      status: "mapped",
      mappedGeometry: builtMapping.mappedGeometry,
      primitiveMappings: builtMapping.primitiveMappings,
      sourceRefs: sourceRefsFor(acceptedValidation.value),
      diagnostics: [],
    });
  } catch (error) {
    recordUnexpectedMappingError(error);
    return createMappingResult({
      requestId,
      status: "invalid",
      diagnostics: [
        diagnostic(
          "InvalidAcceptedGeometryMappingRequest",
          "AcceptedGeometryToCoreMappingRequest",
          "",
          null,
          "AcceptedGeometry mapping request could not be safely inspected.",
        ),
      ],
    });
  }
}

export function computeMappedGeometryContentIdentity(mappedGeometry: Composition2D): string {
  return contentIdentityFor(mappedGeometry);
}

export function computeAcceptedGeometryToCoreMappingResultContentIdentity(
  result: Omit<AcceptedGeometryToCoreMappingResultV1, "resultContentIdentity"> | AcceptedGeometryToCoreMappingResultV1,
): string {
  return contentIdentityFor({
    requestId: result.requestId,
    status: result.status,
    mapperOperationId: result.mapperOperationId,
    mapperOperationVersion: result.mapperOperationVersion,
    mappingProfileId: result.mappingProfileId,
    targetCoreProfileId: result.targetCoreProfileId,
    targetCoreGeometryKind: result.targetCoreGeometryKind,
    mappedGeometryContentIdentity: result.mappedGeometryContentIdentity,
    primitiveMappings: result.primitiveMappings,
    coordinateTransform: result.coordinateTransform,
    sourceRefs: result.sourceRefs,
    diagnostics: result.diagnostics,
  });
}

function validateRequestEnvelope(
  request: MappingRequestRecord,
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  validateExactKeys(request, REQUEST_KEYS, "", diagnostics);
  validateLiteral(request.contractId, ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID, "contractId", diagnostics, "unsupported");
  validateLiteral(request.contractVersion, ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION, "contractVersion", diagnostics, "unsupported");
  validateNonEmptyString(request.requestId, "requestId", diagnostics);
  validateLiteral(request.mapperOperationId, ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID, "mapperOperationId", diagnostics, "unsupported");
  validateLiteral(
    request.mapperOperationVersion,
    ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    "mapperOperationVersion",
    diagnostics,
    "unsupported",
  );
  validateLiteral(request.mappingProfileId, ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID, "mappingProfileId", diagnostics, "unsupported");
  validateLiteral(
    request.mappingProfileVersion,
    ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    "mappingProfileVersion",
    diagnostics,
    "unsupported",
  );
  validateLiteral(
    request.targetCoreProfileId,
    ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    "targetCoreProfileId",
    diagnostics,
    "unsupported",
    "TargetCoreGeometry",
  );
  validateLiteral(
    request.targetCoreGeometryKind,
    ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    "targetCoreGeometryKind",
    diagnostics,
    "unsupported",
    "TargetCoreGeometry",
  );
  validateTargetCoordinateSystem(request.targetCoordinateSystem, diagnostics);
  validateMappingContext(request.mappingContext, diagnostics);
}

function validateAcceptedGeometryMappingRequest(
  request: MappingRequestRecord,
  acceptedGeometry: AcceptedGeometry,
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  if (request.acceptedGeometryContentIdentity !== acceptedGeometry.contentIdentity) {
    diagnostics.push(diagnostic(
      "AcceptedGeometryMappingContentIdentityMismatch",
      "ContentIdentity",
      "acceptedGeometryContentIdentity",
      null,
      "acceptedGeometryContentIdentity must equal acceptedGeometry.contentIdentity.",
    ));
  }

  if (request.sourceObservationId !== acceptedGeometry.sourceObservationId) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryMappingRequest",
      "AcceptedGeometryToCoreMappingRequest",
      "sourceObservationId",
      null,
      "sourceObservationId must equal acceptedGeometry.sourceObservationId.",
    ));
  }

  if (request.sourceObservationContentIdentity !== acceptedGeometry.sourceObservationContentIdentity) {
    diagnostics.push(diagnostic(
      "AcceptedGeometryMappingContentIdentityMismatch",
      "ContentIdentity",
      "sourceObservationContentIdentity",
      null,
      "sourceObservationContentIdentity must equal acceptedGeometry.sourceObservationContentIdentity.",
    ));
  }

  if (acceptedGeometry.primitives.length === 0) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryMappingRequest",
      "AcceptedGeometry",
      "acceptedGeometry.primitives",
      null,
      "AcceptedGeometry mapping requires at least one accepted rectangle primitive.",
    ));
  }
}

function validateTargetCoordinateSystem(
  value: unknown,
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  if (!isRecord(value)) {
    diagnostics.push(diagnostic(
      value === undefined ? "InvalidAcceptedGeometryMappingRequest" : "UnsupportedAcceptedGeometryMappingRequest",
      value === undefined ? "AcceptedGeometryToCoreMappingRequest" : "TargetCoreGeometry",
      "targetCoordinateSystem",
      null,
      "targetCoordinateSystem must be the approved normalized Core coordinate system.",
    ));
    return;
  }

  validateExactKeys(value, TARGET_COORDINATE_SYSTEM_KEYS, "targetCoordinateSystem", diagnostics);
  validateLiteral(value.kind, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM.kind, "targetCoordinateSystem.kind", diagnostics, "unsupported");
  validateLiteral(value.id, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM.id, "targetCoordinateSystem.id", diagnostics, "unsupported");
  validateLiteral(value.origin, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM.origin, "targetCoordinateSystem.origin", diagnostics, "unsupported");
  validateLiteral(value.xAxis, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM.xAxis, "targetCoordinateSystem.xAxis", diagnostics, "unsupported");
  validateLiteral(value.yAxis, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM.yAxis, "targetCoordinateSystem.yAxis", diagnostics, "unsupported");
  validateLiteral(
    value.dimensions,
    ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM.dimensions,
    "targetCoordinateSystem.dimensions",
    diagnostics,
    "unsupported",
  );
  validateLiteral(
    value.coordinateScale,
    ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM.coordinateScale,
    "targetCoordinateSystem.coordinateScale",
    diagnostics,
    "unsupported",
  );
}

function validateMappingContext(
  value: unknown,
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  if (!isRecord(value)) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryMappingRequest",
      "AcceptedGeometryToCoreMappingRequest",
      "mappingContext",
      null,
      "mappingContext must explicitly declare the synthetic-only reject policy and coordinate transform.",
    ));
    return;
  }

  validateExactKeys(value, MAPPING_CONTEXT_KEYS, "mappingContext", diagnostics);
  if (
    value.boundary !== "synthetic-only"
    && value.boundary !== "explicit-external-evidence-acceptance@1"
  ) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryMappingRequest",
      "AcceptedGeometryToCoreMappingRequest",
      "mappingContext.boundary",
      null,
      "mappingContext.boundary must declare an approved mapping boundary.",
    ));
  }
  validateLiteral(value.primitiveLossPolicy, "reject", "mappingContext.primitiveLossPolicy", diagnostics, "invalid");
  validateLiteral(
    value.coordinateTransform,
    ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    "mappingContext.coordinateTransform",
    diagnostics,
    "invalid",
  );
}

function validateRectangleOnlyPrimitiveSet(
  primitives: readonly ObservationPrimitive[],
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  for (const [index, primitive] of primitives.entries()) {
    if (primitive.kind !== "rectangle") {
      diagnostics.push(diagnostic(
        "UnsupportedAcceptedGeometryPrimitiveKind",
        "Primitive",
        `acceptedGeometry.primitives.${index}.kind`,
        primitive.id,
        "Only rectangle primitives are supported by the PR81 Composition2D mapping profile.",
      ));
    }
  }
}

function buildMappedGeometry(acceptedGeometry: AcceptedGeometry): BuiltMapping {
  const coordinateSystem = ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM;
  const mappedGeometryId = compositionIdFor(acceptedGeometry.acceptedGeometryId);
  const surfaceId = surfaceIdFor(acceptedGeometry.acceptedGeometryId);
  const primitiveMappings: AcceptedPrimitiveCoreMapping[] = [];
  const elements: Element[] = [];

  for (const [index, primitive] of acceptedGeometry.primitives.entries()) {
    const rectangle = primitive as RectanglePrimitive;
    const elementId = elementIdFor(acceptedGeometry.acceptedGeometryId, rectangle.id);
    elements.push({
      kind: "element",
      id: elementId,
      geometry: mapRectangle(rectangle),
    });
    primitiveMappings.push({
      acceptedGeometryId: acceptedGeometry.acceptedGeometryId,
      acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
      sourceObservationId: acceptedGeometry.sourceObservationId,
      sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
      acceptedPrimitiveId: rectangle.id,
      acceptedPrimitiveKind: rectangle.kind,
      coreObjectKind: "element",
      coreObjectId: elementId,
      coreObjectRef: `mappedGeometry.elements.${index}`,
      mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    });
  }

  return {
    mappedGeometry: {
      kind: "composition-2d",
      id: mappedGeometryId,
      coordinateSystem,
      surface: {
        kind: "surface-space",
        id: surfaceId,
        coordinateSystem,
        bounds: {
          kind: "rect",
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
      },
      elements,
    },
    primitiveMappings,
  };
}

function validateBuiltMapping(builtMapping: BuiltMapping): MappingFailure | null {
  const collision = firstSourceIdentityCollision(builtMapping.mappedGeometry);
  if (collision !== null) {
    return {
      status: "invalid",
      diagnostics: [
        diagnostic(
          "AcceptedGeometrySourceIdentityCollision",
          "TargetCoreGeometry",
          collision.path,
          null,
          "Mapped Core geometry source identities must be unique.",
        ),
      ],
    };
  }

  for (const [index, element] of builtMapping.mappedGeometry.elements.entries()) {
    if (!isNormalizedRect(element.geometry)) {
      return {
        status: "invalid",
        diagnostics: [
          diagnostic(
            "AcceptedGeometryCoordinateTransformFailed",
            "CoordinateTransform",
            `acceptedGeometry.primitives.${index}`,
            builtMapping.primitiveMappings[index]?.acceptedPrimitiveId ?? null,
            "Rectangle coordinate transform produced coordinates outside the normalized Core bounds.",
          ),
        ],
      };
    }
  }

  const coreValidation = validateGeometryV1(builtMapping.mappedGeometry);
  if (coreValidation.status !== "ok") {
    return {
      status: "invalid",
      diagnostics: coreValidationDiagnostics(coreValidation.errors),
    };
  }

  return null;
}

function mapRectangle(rectangle: RectanglePrimitive): Rect {
  return {
    kind: "rect",
    x: canonicalizeZero(rectangle.x),
    y: canonicalizeZero(1 - rectangle.y - rectangle.height),
    width: canonicalizeZero(rectangle.width),
    height: canonicalizeZero(rectangle.height),
  };
}

function addAcceptedGeometryValidationDiagnostics(
  validatorDiagnostics: readonly ValidatorDiagnostic[],
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  for (const validatorDiagnostic of validatorDiagnostics) {
    diagnostics.push(mappingDiagnosticForValidatorDiagnostic(validatorDiagnostic));
  }
}

function mappingDiagnosticForValidatorDiagnostic(
  validatorDiagnostic: ValidatorDiagnostic,
): AcceptedGeometryToCoreMappingDiagnostic {
  const path = validatorDiagnostic.path.length === 0
    ? "acceptedGeometry"
    : `acceptedGeometry.${validatorDiagnostic.path}`;

  if (
    validatorDiagnostic.code === "ObservationCoordinateOutsideBounds" ||
    validatorDiagnostic.code === "DegenerateObservationPrimitive"
  ) {
    return diagnostic(
      "AcceptedGeometryCoordinateTransformFailed",
      "CoordinateTransform",
      path,
      validatorDiagnostic.primitiveId,
      "AcceptedGeometry coordinates cannot be transformed into normalized Core Composition2D rectangles.",
    );
  }

  if (validatorDiagnostic.code === "UnsupportedAcceptedGeometryContract") {
    return diagnostic(
      "UnsupportedAcceptedGeometryMappingRequest",
      "AcceptedGeometry",
      path,
      validatorDiagnostic.primitiveId,
      "AcceptedGeometry contractId and contractVersion must identify norma.accepted-geometry@1.",
    );
  }

  return diagnostic(
    "InvalidAcceptedGeometryMappingRequest",
    "AcceptedGeometry",
    path,
    validatorDiagnostic.primitiveId,
    validatorDiagnostic.message,
  );
}

function createMappingResult(input: {
  readonly requestId: string;
  readonly status: AcceptedGeometryToCoreMappingStatus;
  readonly mappedGeometry?: Composition2D;
  readonly primitiveMappings?: readonly AcceptedPrimitiveCoreMapping[];
  readonly sourceRefs?: readonly SourceReference[];
  readonly diagnostics: readonly AcceptedGeometryToCoreMappingDiagnostic[];
}): AcceptedGeometryToCoreMappingResultV1 {
  const mappedGeometry = input.mappedGeometry ?? null;
  const mappedGeometryContentIdentity = mappedGeometry === null
    ? null
    : computeMappedGeometryContentIdentity(mappedGeometry);
  const resultWithoutIdentity: Omit<AcceptedGeometryToCoreMappingResultV1, "resultContentIdentity"> = {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: input.requestId,
    ok: input.status === "mapped",
    status: input.status,
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    mappedGeometry,
    mappedGeometryContentIdentity,
    primitiveMappings: input.status === "mapped" ? input.primitiveMappings ?? [] : [],
    coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM_RECORD,
    sourceRefs: input.sourceRefs ?? [],
    diagnostics: input.diagnostics,
  };

  return {
    ...resultWithoutIdentity,
    resultContentIdentity: computeAcceptedGeometryToCoreMappingResultContentIdentity(resultWithoutIdentity),
  };
}

function sourceRefsFor(acceptedGeometry: AcceptedGeometry): readonly SourceReference[] {
  return [
    { kind: "accepted-geometry", ref: acceptedGeometry.acceptedGeometryId },
    { kind: "accepted-geometry-content-identity", ref: acceptedGeometry.contentIdentity },
    { kind: "geometry-observation", ref: acceptedGeometry.sourceObservationId },
    { kind: "geometry-observation-content-identity", ref: acceptedGeometry.sourceObservationContentIdentity },
    { kind: "mapping-profile", ref: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID },
    { kind: "core-geometry-profile", ref: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID },
  ];
}

function validateExactKeys(
  value: MappingRequestRecord,
  keys: readonly string[],
  path: string,
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  const actualKeys = safeObjectKeys(value);
  if (actualKeys === null) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryMappingRequest",
      "AcceptedGeometryToCoreMappingRequest",
      path,
      null,
      "Mapping request object keys could not be safely inspected.",
    ));
    return;
  }

  const expected = new Set(keys);
  for (const key of [...actualKeys].sort()) {
    if (!expected.has(key)) {
      diagnostics.push(diagnostic(
        "InvalidAcceptedGeometryMappingRequest",
        "AcceptedGeometryToCoreMappingRequest",
        joinPath(path, key),
        null,
        "Mapping request contains an unsupported field.",
      ));
    }
  }
}

function validateLiteral(
  value: unknown,
  expected: string | number,
  path: string,
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
  kind: "invalid" | "unsupported",
  unsupportedSurface: AcceptedGeometryToCoreMappingDiagnosticSurface = "AcceptedGeometryToCoreMappingRequest",
): void {
  if (value === expected) {
    return;
  }

  diagnostics.push(diagnostic(
    value === undefined || kind === "invalid"
      ? "InvalidAcceptedGeometryMappingRequest"
      : "UnsupportedAcceptedGeometryMappingRequest",
    value === undefined || kind === "invalid"
      ? "AcceptedGeometryToCoreMappingRequest"
      : unsupportedSurface,
    path,
    null,
    `${path} must use the approved PR81 mapping value.`,
  ));
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  diagnostics: AcceptedGeometryToCoreMappingDiagnostic[],
): void {
  if (typeof value === "string" && value.length > 0) {
    return;
  }

  diagnostics.push(diagnostic(
    "InvalidAcceptedGeometryMappingRequest",
    "AcceptedGeometryToCoreMappingRequest",
    path,
    null,
    `${path} must be a non-empty string.`,
  ));
}

function diagnostic(
  code: AcceptedGeometryToCoreMappingDiagnosticCode,
  surface: AcceptedGeometryToCoreMappingDiagnosticSurface,
  path: string,
  primitiveId: string | null,
  message: string,
): AcceptedGeometryToCoreMappingDiagnostic {
  return {
    code,
    severity: "error",
    surface,
    path,
    primitiveId,
    message,
  };
}

function sortMappingDiagnostics(
  diagnostics: readonly AcceptedGeometryToCoreMappingDiagnostic[],
  primitiveSource: unknown,
): readonly AcceptedGeometryToCoreMappingDiagnostic[] {
  const primitiveOrder = primitiveOrderFrom(primitiveSource);
  return [...diagnostics].sort((first, second) => firstNonZero([
    compareNumbers(pathRank(first.path), pathRank(second.path)),
    compareNumbers(primitiveRank(first.primitiveId, primitiveOrder), primitiveRank(second.primitiveId, primitiveOrder)),
    compareStrings(first.code, second.code),
    compareStrings(first.message, second.message),
  ]));
}

function primitiveOrderFrom(value: unknown): ReadonlyMap<string, number> {
  const primitiveOrder = new Map<string, number>();
  const primitives = isAcceptedGeometryLike(value)
    ? value.primitives
    : isCompositionLike(value)
      ? value.elements.map((element) => ({ id: element.id }))
      : [];
  for (const [index, primitive] of primitives.entries()) {
    if (typeof primitive.id === "string" && !primitiveOrder.has(primitive.id)) {
      primitiveOrder.set(primitive.id, index);
    }
  }
  return primitiveOrder;
}

function pathRank(path: string): number {
  const exactIndex = REQUEST_FIELD_ORDER.indexOf(path as (typeof REQUEST_FIELD_ORDER)[number]);
  if (exactIndex !== -1) {
    return exactIndex;
  }

  const prefixIndex = REQUEST_FIELD_ORDER.findIndex((prefix) => prefix.length > 0 && path.startsWith(`${prefix}.`));
  return prefixIndex === -1 ? REQUEST_FIELD_ORDER.length : prefixIndex;
}

function primitiveRank(primitiveId: string | null, primitiveOrder: ReadonlyMap<string, number>): number {
  if (primitiveId === null) {
    return -1;
  }
  return primitiveOrder.get(primitiveId) ?? Number.MAX_SAFE_INTEGER;
}

function statusForDiagnostics(
  diagnostics: readonly AcceptedGeometryToCoreMappingDiagnostic[],
): Exclude<AcceptedGeometryToCoreMappingStatus, "mapped"> {
  return diagnostics.some((item) => (
    item.code === "UnsupportedAcceptedGeometryMappingRequest" ||
    item.code === "UnsupportedAcceptedGeometryPrimitiveKind"
  ))
    ? "unsupported"
    : "invalid";
}

function firstSourceIdentityCollision(mappedGeometry: Composition2D): { readonly path: string } | null {
  const ids = [
    { id: mappedGeometry.id, path: "mappedGeometry.id" },
    { id: mappedGeometry.surface.id, path: "mappedGeometry.surface.id" },
    ...mappedGeometry.elements.map((element, index) => ({
      id: element.id,
      path: `mappedGeometry.elements.${index}.id`,
    })),
  ];
  const seen = new Set<string>();
  for (const item of ids) {
    if (seen.has(item.id)) {
      return { path: item.path };
    }
    seen.add(item.id);
  }
  return null;
}

function compositionIdFor(acceptedGeometryId: string): string {
  return `composition:accepted-geometry:${acceptedGeometryId}:rectangles`;
}

function surfaceIdFor(acceptedGeometryId: string): string {
  return `surface:accepted-geometry:${acceptedGeometryId}:unit`;
}

function elementIdFor(acceptedGeometryId: string, primitiveId: string): string {
  return `element:accepted-geometry:${acceptedGeometryId}:primitive:${primitiveId}`;
}

function isNormalizedRect(rect: Rect): boolean {
  return [
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    rect.x + rect.width,
    rect.y + rect.height,
  ].every(isFiniteNormalizedBoundary);
}

const NORMALIZED_BOUNDARY_EPSILON = 1e-12;

function canonicalizeZero(value: number): number {
  if (Object.is(value, -0) || (value < 0 && value >= -NORMALIZED_BOUNDARY_EPSILON)) {
    return 0;
  }

  if (value > 1 && value <= 1 + NORMALIZED_BOUNDARY_EPSILON) {
    return 1;
  }

  return value;
}

function contentIdentityFor(value: unknown): string {
  const canonicalJson = serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
  return `sha256:${createHash("sha256").update(canonicalJson).digest("hex")}`;
}

function requestIdFor(input: unknown): string {
  try {
    if (isRecord(input) && typeof input.requestId === "string" && input.requestId.length > 0) {
      return input.requestId;
    }
  } catch {
    return "invalid-request";
  }
  return "invalid-request";
}

function isRecord(value: unknown): value is MappingRequestRecord {
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

function isFiniteNormalizedBoundary(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }

  const normalizedValue = canonicalizeZero(value);
  return normalizedValue >= 0 && normalizedValue <= 1;
}

function coreValidationDiagnostics(
  coreErrors: readonly CoreError[],
): readonly AcceptedGeometryToCoreMappingDiagnostic[] {
  if (coreErrors.length === 0) {
    return [
      diagnostic(
        "AcceptedGeometryCoordinateTransformFailed",
        "TargetCoreGeometry",
        "mappedGeometry",
        null,
        "Mapped geometry did not satisfy the Core Composition2D normalized rectangle profile: Core validation returned no errors.",
      ),
    ];
  }

  return coreErrors.map((error, index) => diagnostic(
    "AcceptedGeometryCoordinateTransformFailed",
    "TargetCoreGeometry",
    coreValidationErrorPath(error, index),
    null,
    `Mapped geometry did not satisfy the Core Composition2D normalized rectangle profile: ${error.code}: ${error.message}`,
  ));
}

function coreValidationErrorPath(error: CoreError, index: number): string {
  return error.targetRef === null || error.targetRef.length === 0
    ? `mappedGeometry.errors.${index}`
    : `mappedGeometry.${error.targetRef}`;
}

function recordUnexpectedMappingError(error: unknown): void {
  lastMappingDebugEvent = {
    kind: "unexpected-error",
    operation: "mapAcceptedGeometryToCoreV1",
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : "Non-Error value thrown.",
  };
}

function isAcceptedGeometryLike(value: unknown): value is { readonly primitives: readonly { readonly id: unknown }[] } {
  return isRecord(value) && Array.isArray(value.primitives);
}

function isCompositionLike(value: unknown): value is { readonly elements: readonly { readonly id: string }[] } {
  return isRecord(value) && Array.isArray(value.elements);
}

function safeObjectKeys(value: MappingRequestRecord): readonly string[] | null {
  try {
    return Object.keys(value);
  } catch {
    return null;
  }
}

function joinPath(prefix: string, key: string): string {
  return prefix.length === 0 ? key : `${prefix}.${key}`;
}

function firstNonZero(values: readonly number[]): number {
  return values.find((value) => value !== 0) ?? 0;
}

function compareNumbers(first: number, second: number): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function compareStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}
