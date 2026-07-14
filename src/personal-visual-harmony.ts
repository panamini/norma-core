import { createHash } from "node:crypto";
import {
  ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
  mapAcceptedGeometryToCoreV1,
} from "./accepted-geometry-to-core-mapping.js";
import {
  ACCEPTED_GEOMETRY_CONTRACT_ID,
  ACCEPTED_GEOMETRY_CONTRACT_VERSION,
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  type AcceptedGeometry,
  type RectanglePrimitive,
  validateAcceptedGeometryV1,
} from "./geometry-observation.js";
import {
  analyzeHarmonicRelationshipsV1,
  type HarmonicRelationshipAnalysisResultV1,
  type HarmonicRelationshipMetricV1,
  type HarmonicRelationshipQualityV1,
} from "./harmonic-relationship-analysis.js";
import {
  BASIC_PROPORTIONS_PACK,
  GEOMETRY_HARMONIES_PACK,
} from "./ratio-pack.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID =
  "norma.personal-visual-harmony-candidate-set@1" as const;
export const PERSONAL_VISUAL_HARMONY_RESULT_CONTRACT_ID =
  "norma.personal-visual-harmony-result@1" as const;
export const PERSONAL_VISUAL_HARMONY_IMAGE_PLANE_RELATIONS_CONTRACT_ID =
  "norma.personal-visual-harmony-image-plane-relations@1" as const;
export const PERSONAL_VISUAL_HARMONY_MAX_CANDIDATES = 12;

export type PersonalVisualHarmonyCandidateRoleV1 =
  | "primary-subject"
  | "secondary-subject"
  | "structural-region"
  | "frame";

export const PERSONAL_VISUAL_HARMONY_PRIMITIVE_KINDS = [
  "rectangle",
  "quadrilateral",
  "segment",
  "axis",
  "ellipse",
] as const;

export type PersonalVisualHarmonyPrimitiveKindV1 =
  typeof PERSONAL_VISUAL_HARMONY_PRIMITIVE_KINDS[number];

export interface PersonalVisualHarmonyPointV1 {
  readonly x: number;
  readonly y: number;
}

export type PersonalVisualHarmonyPrimitiveV1 =
  | { readonly kind: "rectangle" }
  | {
    readonly kind: "quadrilateral";
    readonly vertices: readonly [
      PersonalVisualHarmonyPointV1,
      PersonalVisualHarmonyPointV1,
      PersonalVisualHarmonyPointV1,
      PersonalVisualHarmonyPointV1,
    ];
  }
  | {
    readonly kind: "segment";
    readonly start: PersonalVisualHarmonyPointV1;
    readonly end: PersonalVisualHarmonyPointV1;
  }
  | {
    readonly kind: "axis";
    readonly start: PersonalVisualHarmonyPointV1;
    readonly end: PersonalVisualHarmonyPointV1;
  }
  | {
    readonly kind: "ellipse";
    readonly center: PersonalVisualHarmonyPointV1;
    readonly radiusX: number;
    readonly radiusY: number;
  };

export interface PersonalVisualHarmonyCandidateInputV1 {
  readonly id: string;
  readonly label: string;
  readonly role: PersonalVisualHarmonyCandidateRoleV1;
  readonly reason: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly primitive?: PersonalVisualHarmonyPrimitiveV1;
}

export interface PersonalVisualHarmonyPreparedCandidateSetV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "confirmation_required";
  readonly sourceImageReferenceIdentity: string;
  readonly sourceImageMediaType: string | null;
  readonly imageBytesObservedByNorma: false;
  readonly sourceImageIdentityBasis: "chatgpt_file_reference_not_image_bytes";
  readonly visualInterpretationSource: "chatgpt";
  readonly candidateEvidenceOnly: true;
  readonly explicitSelectionConfirmationRequired: true;
  readonly coreRun: false;
  readonly coordinateFrame: {
    readonly dimensions: 2;
    readonly coordinateScale: "normalized";
    readonly origin: "top-left";
    readonly xDirection: "right";
    readonly yDirection: "down";
    readonly bounds: { readonly x: readonly [0, 1]; readonly y: readonly [0, 1] };
  };
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly candidateSetIdentity: string;
}

export interface PersonalVisualHarmonyExplanationV1 {
  readonly relationshipId: string;
  readonly subjectCandidateId: string;
  readonly subjectLabel: string;
  readonly relatedCandidateIds: readonly string[];
  readonly metric: HarmonicRelationshipMetricV1;
  readonly quality: HarmonicRelationshipQualityV1;
  readonly ratioLabel: string;
  readonly ratioFamily: string | null;
  readonly observedPercent: number;
  readonly targetPercent: number;
  readonly deltaPercentagePoints: number;
  readonly explanation: string;
}

export interface PersonalVisualHarmonyResultV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_RESULT_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "completed";
  readonly candidateSetIdentity: string;
  readonly confirmedSelectionIdentity: string;
  readonly sourceImageReferenceIdentity: string;
  readonly imageBytesObservedByNorma: false;
  readonly sourceImageDimensionsObservedBy: "chatgpt_widget";
  readonly selectedCandidateIds: readonly string[];
  readonly explicitSelectionConfirmation: true;
  readonly confirmationMode: "client_asserted_widget_interaction";
  readonly serverVerifiedHumanPresence: false;
  readonly acceptedStructuredGeometryCreated: true;
  readonly coreInputAuthority: "confirmed_structured_geometry";
  readonly coreRun: true;
  readonly mappedGeometryContentIdentity: string;
  readonly harmonicAnalysis: HarmonicRelationshipAnalysisResultV1;
  readonly explanations: readonly PersonalVisualHarmonyExplanationV1[];
  readonly headline: string;
  readonly limits: {
    readonly noBeautyClaims: true;
    readonly noIntentInference: true;
    readonly geometricMatchesWithinDeclaredToleranceOnly: true;
  };
  readonly contentIdentity: string;
}

export type PersonalVisualHarmonyEllipseContactLocationV1 =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "oblique";

export interface PersonalVisualHarmonyImagePlaneRelationV1 {
  readonly relationshipId: string;
  readonly kind: "ellipse-supporting-line-relation";
  readonly ellipseCandidateId: string;
  readonly ellipseLabel: string;
  readonly lineCandidateId: string;
  readonly lineLabel: string;
  readonly linePrimitiveKind: "segment" | "axis" | "quadrilateral-side";
  readonly quadrilateralSideIndex?: 0 | 1 | 2 | 3;
  readonly contactLocation: PersonalVisualHarmonyEllipseContactLocationV1;
  readonly ellipseContactPoint: PersonalVisualHarmonyPointV1;
  readonly closestPointOnSupportingLine: PersonalVisualHarmonyPointV1;
  readonly intersectionPoints: readonly PersonalVisualHarmonyPointV1[];
  readonly gapPixels: number;
  readonly gapImageWidthShare: number;
  readonly gapPercentOfImageWidth: number;
  readonly centerToLineDistancePixels: number;
  readonly ellipseSupportRadiusPixels: number;
  readonly lineAngleDegrees: number;
  readonly tangentAngleDegrees: number;
  readonly tangentAngleDeltaDegrees: number;
  readonly supportingLineContactWithinObservedSegment: boolean;
  readonly classification: "intersection" | "near_tangent" | "proximity";
  readonly contactCharacter:
    | "tangent"
    | "near_tangent"
    | "shallow_intersection"
    | "crossing_intersection"
    | "proximity";
  readonly derivation: "infinite_supporting_line_from_confirmed_endpoints";
  readonly explanation: string;
}

export interface PersonalVisualHarmonyQuadrilateralMeasurementV1 {
  readonly measurementId: string;
  readonly kind: "quadrilateral-measurement";
  readonly candidateId: string;
  readonly candidateLabel: string;
  readonly classification: "quadrilateral" | "trapezoid" | "parallelogram" | "rectangle";
  readonly vertices: readonly [
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
  ];
  readonly sideLengthsPixels: readonly [number, number, number, number];
  readonly interiorAnglesDegrees: readonly [number, number, number, number];
  readonly diagonalLengthsPixels: readonly [number, number];
  readonly diagonalIntersection: PersonalVisualHarmonyPointV1;
  readonly oppositeSideParallelism: readonly [{
    readonly sideIndices: readonly [0, 2];
    readonly angleDeltaDegrees: number;
    readonly parallelWithinTolerance: boolean;
  }, {
    readonly sideIndices: readonly [1, 3];
    readonly angleDeltaDegrees: number;
    readonly parallelWithinTolerance: boolean;
  }];
  readonly parallelAngleToleranceDegrees: number;
  readonly rightAngleToleranceDegrees: number;
  readonly areaPixelsSquared: number;
  readonly areaImageShare: number;
  readonly centroid: PersonalVisualHarmonyPointV1;
  readonly derivation: "confirmed_quadrilateral_vertices";
  readonly explanation: string;
}

export interface PersonalVisualHarmonyImagePlaneRelationsV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_IMAGE_PLANE_RELATIONS_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "completed";
  readonly candidateSetIdentity: string;
  readonly sourceImageReferenceIdentity: string;
  readonly imageBytesObservedByNorma: false;
  readonly sourceImageDimensionsObservedBy: "chatgpt_widget";
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly coordinateSpace: "image_plane_pixels_v1";
  readonly normalization: "image_width";
  readonly confirmationMode: "client_asserted_widget_interaction";
  readonly serverVerifiedHumanPresence: false;
  readonly confirmedVisualGuideCandidateIds: readonly string[];
  readonly positionToleranceImageWidthShare: number;
  readonly maxReportedGapImageWidthShare: number;
  readonly tangentAngleToleranceDegrees: number;
  readonly shallowIntersectionAngleToleranceDegrees: number;
  readonly relationships: readonly PersonalVisualHarmonyImagePlaneRelationV1[];
  readonly quadrilateralMeasurements?: readonly PersonalVisualHarmonyQuadrilateralMeasurementV1[];
  readonly limits: {
    readonly imagePlaneOnly: true;
    readonly axisAlignedEllipseOnly: true;
    readonly noWorldSpaceMetricClaim: true;
    readonly noHarmonicRatioClaim: true;
    readonly noIntentInference: true;
  };
  readonly contentIdentity: string;
}

export interface PersonalVisualHarmonyConfirmationV1 {
  readonly result: PersonalVisualHarmonyResultV1;
  readonly imagePlaneGuideAnalysis: PersonalVisualHarmonyImagePlaneRelationsV1;
  readonly overlaySvg: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly mappingResultContentIdentity: string;
}

const CANDIDATE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MATCH_TOLERANCE = 0.025;
const IMAGE_PLANE_NEAR_CONTACT_IMAGE_WIDTH_SHARE = 0.01;
const IMAGE_PLANE_MAX_REPORTED_GAP_IMAGE_WIDTH_SHARE = 0.025;
const IMAGE_PLANE_TANGENT_ANGLE_TOLERANCE_DEGREES = 5;
const IMAGE_PLANE_SHALLOW_INTERSECTION_ANGLE_TOLERANCE_DEGREES = 12;
const IMAGE_PLANE_PARALLEL_ANGLE_TOLERANCE_DEGREES = 2;
const IMAGE_PLANE_RIGHT_ANGLE_TOLERANCE_DEGREES = 2;

export function preparePersonalVisualHarmonyCandidateSetV1(input: {
  readonly sourceFileId: string;
  readonly sourceImageMediaType?: string | null;
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
}): PersonalVisualHarmonyPreparedCandidateSetV1 {
  requireBoundedString(input.sourceFileId, "sourceFileId", 1, 2_048);
  const sourceImageMediaType = normalizeMediaType(input.sourceImageMediaType);
  const candidates = validateCandidates(input.candidates);
  const coordinateFrame = {
    dimensions: 2 as const,
    coordinateScale: "normalized" as const,
    origin: "top-left" as const,
    xDirection: "right" as const,
    yDirection: "down" as const,
    bounds: { x: [0, 1] as const, y: [0, 1] as const },
  };
  const sourceImageReferenceIdentity = contentIdentityFor({
    kind: "chatgpt-file-reference",
    fileId: input.sourceFileId,
  });
  const withoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "confirmation_required" as const,
    sourceImageReferenceIdentity,
    sourceImageMediaType,
    imageBytesObservedByNorma: false as const,
    sourceImageIdentityBasis: "chatgpt_file_reference_not_image_bytes" as const,
    visualInterpretationSource: "chatgpt" as const,
    candidateEvidenceOnly: true as const,
    explicitSelectionConfirmationRequired: true as const,
    coreRun: false as const,
    coordinateFrame,
    candidates,
  };
  return {
    ...withoutIdentity,
    candidateSetIdentity: contentIdentityFor(withoutIdentity),
  };
}

export function confirmPersonalVisualHarmonyCandidateSetV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSetV1;
  readonly expectedCandidateSetIdentity: string;
  readonly selectedCandidateIds: readonly string[];
  readonly confirmedVisualGuideCandidateIds?: readonly string[];
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly acceptedAt: string;
}): PersonalVisualHarmonyConfirmationV1 {
  const prepared = validatePreparedCandidateSet(input.preparedCandidateSet);
  if (input.expectedCandidateSetIdentity !== prepared.candidateSetIdentity) {
    throw new Error("Candidate set identity does not match the prepared review.");
  }
  const selectedCandidateIds = normalizeSelectedCandidateIds(prepared, input.selectedCandidateIds);
  const confirmedVisualGuideCandidateIds = normalizeVisualGuideCandidateIds(
    prepared,
    input.confirmedVisualGuideCandidateIds ?? [],
  );
  requirePositivePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePositivePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  if (!UTC_TIMESTAMP_PATTERN.test(input.acceptedAt)) {
    throw new Error("acceptedAt must be an explicit UTC RFC3339 timestamp.");
  }
  const selectionIdentity = contentIdentityFor({
    candidateSetIdentity: prepared.candidateSetIdentity,
    selectedCandidateIds,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
  });
  const acceptedGeometry = createAcceptedGeometry(
    prepared,
    selectedCandidateIds,
    selectionIdentity,
    input.sourcePixelWidth,
    input.sourcePixelHeight,
    input.acceptedAt,
  );
  const mapping = mapAcceptedGeometryToCoreV1({
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: `request:personal-visual-harmony:map:${identityToken(selectionIdentity)}`,
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    mappingProfileVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    acceptedGeometry,
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    sourceObservationId: acceptedGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
    mappingContext: {
      boundary: "explicit-external-evidence-acceptance@1",
      primitiveLossPolicy: "reject",
      coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    },
  });
  if (!mapping.ok || mapping.status !== "mapped" || mapping.mappedGeometry === null
    || mapping.mappedGeometryContentIdentity === null) {
    throw new Error("Confirmed structured geometry could not be mapped into Norma Core.");
  }
  const harmonicAnalysis = analyzeHarmonicRelationshipsV1({
    composition: mapping.mappedGeometry,
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: MATCH_TOLERANCE,
  });
  const coreElementToCandidateId = createCoreElementToCandidateMap(mapping.primitiveMappings);
  const candidatesById = new Map(prepared.candidates.map((candidate) => [candidate.id, candidate]));
  const explanations = harmonicAnalysis.relationships.flatMap((relationship) => {
    const subjectCandidateId = coreElementToCandidateId.get(relationship.subjectElementId);
    if (subjectCandidateId === undefined) return [];
    const subject = candidatesById.get(subjectCandidateId);
    if (subject === undefined) return [];
    const relatedCandidateIds = relationship.relatedElementIds.flatMap((elementId) => {
      const candidateId = coreElementToCandidateId.get(elementId);
      return candidateId === undefined ? [] : [candidateId];
    });
    return [createExplanation(subject, relatedCandidateIds, relationship)];
  });
  const headline = headlineFor(explanations);
  const resultWithoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_RESULT_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "completed" as const,
    candidateSetIdentity: prepared.candidateSetIdentity,
    confirmedSelectionIdentity: selectionIdentity,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    imageBytesObservedByNorma: false as const,
    sourceImageDimensionsObservedBy: "chatgpt_widget" as const,
    selectedCandidateIds,
    explicitSelectionConfirmation: true as const,
    confirmationMode: "client_asserted_widget_interaction" as const,
    serverVerifiedHumanPresence: false as const,
    acceptedStructuredGeometryCreated: true as const,
    coreInputAuthority: "confirmed_structured_geometry" as const,
    coreRun: true as const,
    mappedGeometryContentIdentity: mapping.mappedGeometryContentIdentity,
    harmonicAnalysis,
    explanations,
    headline,
    limits: {
      noBeautyClaims: true as const,
      noIntentInference: true as const,
      geometricMatchesWithinDeclaredToleranceOnly: true as const,
    },
  };
  const result: PersonalVisualHarmonyResultV1 = {
    ...resultWithoutIdentity,
    contentIdentity: contentIdentityFor(resultWithoutIdentity),
  };
  const imagePlaneGuideAnalysis = analyzePersonalVisualHarmonyImagePlaneRelationsV1({
    preparedCandidateSet: prepared,
    confirmedVisualGuideCandidateIds,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
  });
  return {
    result,
    imagePlaneGuideAnalysis,
    overlaySvg: createPersonalVisualHarmonyOverlaySvgV1({
      preparedCandidateSet: prepared,
      result,
      imagePlaneGuideAnalysis,
    }),
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    mappingResultContentIdentity: mapping.resultContentIdentity,
  };
}

export function analyzePersonalVisualHarmonyImagePlaneRelationsV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSetV1;
  readonly confirmedVisualGuideCandidateIds: readonly string[];
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}): PersonalVisualHarmonyImagePlaneRelationsV1 {
  const prepared = validatePreparedCandidateSet(input.preparedCandidateSet);
  requirePositivePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePositivePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const confirmedVisualGuideCandidateIds = normalizeVisualGuideCandidateIds(
    prepared,
    input.confirmedVisualGuideCandidateIds,
  );
  const confirmed = new Set(confirmedVisualGuideCandidateIds);
  const ellipses = prepared.candidates.filter((candidate) => (
    confirmed.has(candidate.id) && candidate.primitive?.kind === "ellipse"
  ));
  const confirmedGuides = prepared.candidates.filter((candidate) => confirmed.has(candidate.id));
  const lines = confirmedGuides.flatMap(imagePlaneLineEvidenceForCandidate);
  const quadrilateralMeasurements = confirmedGuides.flatMap((candidate) => {
    const measurement = createQuadrilateralMeasurement(
      candidate,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    return measurement === null ? [] : [measurement];
  }).sort((first, second) => stableStringCompare(first.measurementId, second.measurementId));
  const relationships = ellipses.flatMap((ellipse) => lines.flatMap((line) => {
    const relationship = createEllipseSupportingLineRelationship(
      ellipse,
      line,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    return relationship === null ? [] : [relationship];
  })).sort((first, second) => {
    const classificationOrder = imagePlaneRelationPriority(first.contactCharacter)
      - imagePlaneRelationPriority(second.contactCharacter);
    if (classificationOrder !== 0) return classificationOrder;
    if (first.supportingLineContactWithinObservedSegment
      !== second.supportingLineContactWithinObservedSegment) {
      return first.supportingLineContactWithinObservedSegment ? -1 : 1;
    }
    if (first.gapPixels !== second.gapPixels) return first.gapPixels - second.gapPixels;
    if (first.tangentAngleDeltaDegrees !== second.tangentAngleDeltaDegrees) {
      return first.tangentAngleDeltaDegrees - second.tangentAngleDeltaDegrees;
    }
    return stableStringCompare(first.relationshipId, second.relationshipId);
  });
  const withoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_IMAGE_PLANE_RELATIONS_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "completed" as const,
    candidateSetIdentity: prepared.candidateSetIdentity,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    imageBytesObservedByNorma: false as const,
    sourceImageDimensionsObservedBy: "chatgpt_widget" as const,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
    coordinateSpace: "image_plane_pixels_v1" as const,
    normalization: "image_width" as const,
    confirmationMode: "client_asserted_widget_interaction" as const,
    serverVerifiedHumanPresence: false as const,
    confirmedVisualGuideCandidateIds,
    positionToleranceImageWidthShare: IMAGE_PLANE_NEAR_CONTACT_IMAGE_WIDTH_SHARE,
    maxReportedGapImageWidthShare: IMAGE_PLANE_MAX_REPORTED_GAP_IMAGE_WIDTH_SHARE,
    tangentAngleToleranceDegrees: IMAGE_PLANE_TANGENT_ANGLE_TOLERANCE_DEGREES,
    shallowIntersectionAngleToleranceDegrees:
      IMAGE_PLANE_SHALLOW_INTERSECTION_ANGLE_TOLERANCE_DEGREES,
    relationships,
    ...(quadrilateralMeasurements.length === 0 ? {} : { quadrilateralMeasurements }),
    limits: {
      imagePlaneOnly: true as const,
      axisAlignedEllipseOnly: true as const,
      noWorldSpaceMetricClaim: true as const,
      noHarmonicRatioClaim: true as const,
      noIntentInference: true as const,
    },
  };
  return {
    ...withoutIdentity,
    contentIdentity: contentIdentityFor(withoutIdentity),
  };
}

interface PersonalVisualHarmonyImagePlaneLineEvidenceV1 {
  readonly candidateId: string;
  readonly label: string;
  readonly primitiveKind: "segment" | "axis" | "quadrilateral-side";
  readonly start: PersonalVisualHarmonyPointV1;
  readonly end: PersonalVisualHarmonyPointV1;
  readonly quadrilateralSideIndex?: 0 | 1 | 2 | 3;
}

function imagePlaneLineEvidenceForCandidate(
  candidate: PersonalVisualHarmonyCandidateInputV1,
): readonly PersonalVisualHarmonyImagePlaneLineEvidenceV1[] {
  const primitive = candidate.primitive;
  if (primitive?.kind === "segment" || primitive?.kind === "axis") {
    return [{
      candidateId: candidate.id,
      label: candidate.label,
      primitiveKind: primitive.kind,
      start: primitive.start,
      end: primitive.end,
    }];
  }
  if (primitive?.kind !== "quadrilateral") return [];
  return primitive.vertices.map((start, index) => {
    const sideIndex = index as 0 | 1 | 2 | 3;
    const end = primitive.vertices[(index + 1) % primitive.vertices.length];
    if (end === undefined) throw new Error("Quadrilateral side endpoint is missing.");
    return {
      candidateId: candidate.id,
      label: `${candidate.label} · côté ${String(index + 1)}`,
      primitiveKind: "quadrilateral-side" as const,
      start,
      end,
      quadrilateralSideIndex: sideIndex,
    };
  });
}

function createQuadrilateralMeasurement(
  candidate: PersonalVisualHarmonyCandidateInputV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): PersonalVisualHarmonyQuadrilateralMeasurementV1 | null {
  const primitive = candidate.primitive;
  if (primitive?.kind !== "quadrilateral") return null;
  const vertices = primitive.vertices;
  const pixelVertices = vertices.map((point) => ({
    x: point.x * sourcePixelWidth,
    y: point.y * sourcePixelHeight,
  })) as [
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
  ];
  const sideVectors = pixelVertices.map((point, index) => {
    const next = pixelVertices[(index + 1) % pixelVertices.length];
    if (next === undefined) throw new Error("Quadrilateral side endpoint is missing.");
    return { x: next.x - point.x, y: next.y - point.y };
  }) as [
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
  ];
  const sideLengthsPixels = sideVectors.map((vector) => canonicalNumber(Math.hypot(vector.x, vector.y))) as [
    number,
    number,
    number,
    number,
  ];
  const interiorAnglesDegrees = pixelVertices.map((point, index) => {
    const previous = pixelVertices[(index + pixelVertices.length - 1) % pixelVertices.length];
    const next = pixelVertices[(index + 1) % pixelVertices.length];
    if (previous === undefined || next === undefined) {
      throw new Error("Quadrilateral angle endpoint is missing.");
    }
    return canonicalNumber(angleBetweenVectorsDegrees(
      { x: previous.x - point.x, y: previous.y - point.y },
      { x: next.x - point.x, y: next.y - point.y },
    ));
  }) as [number, number, number, number];
  const firstParallelAngleDeltaDegrees = undirectedAngleDistanceDegrees(
    normalizeUndirectedAngleDegrees(Math.atan2(sideVectors[0].y, sideVectors[0].x) * (180 / Math.PI)),
    normalizeUndirectedAngleDegrees(Math.atan2(sideVectors[2].y, sideVectors[2].x) * (180 / Math.PI)),
  );
  const secondParallelAngleDeltaDegrees = undirectedAngleDistanceDegrees(
    normalizeUndirectedAngleDegrees(Math.atan2(sideVectors[1].y, sideVectors[1].x) * (180 / Math.PI)),
    normalizeUndirectedAngleDegrees(Math.atan2(sideVectors[3].y, sideVectors[3].x) * (180 / Math.PI)),
  );
  const oppositeSideParallelism: PersonalVisualHarmonyQuadrilateralMeasurementV1["oppositeSideParallelism"] = [
    {
      sideIndices: [0, 2],
      angleDeltaDegrees: firstParallelAngleDeltaDegrees,
      parallelWithinTolerance:
        firstParallelAngleDeltaDegrees <= IMAGE_PLANE_PARALLEL_ANGLE_TOLERANCE_DEGREES,
    },
    {
      sideIndices: [1, 3],
      angleDeltaDegrees: secondParallelAngleDeltaDegrees,
      parallelWithinTolerance:
        secondParallelAngleDeltaDegrees <= IMAGE_PLANE_PARALLEL_ANGLE_TOLERANCE_DEGREES,
    },
  ];
  const parallelPairCount = oppositeSideParallelism.filter(({ parallelWithinTolerance }) => (
    parallelWithinTolerance
  )).length;
  const allRightAngles = interiorAnglesDegrees.every((angle) => (
    Math.abs(angle - 90) <= IMAGE_PLANE_RIGHT_ANGLE_TOLERANCE_DEGREES
  ));
  const classification: PersonalVisualHarmonyQuadrilateralMeasurementV1["classification"] =
    parallelPairCount === 2 && allRightAngles
      ? "rectangle"
      : parallelPairCount === 2
        ? "parallelogram"
        : parallelPairCount === 1
          ? "trapezoid"
          : "quadrilateral";
  const firstDiagonalLength = Math.hypot(
    pixelVertices[2].x - pixelVertices[0].x,
    pixelVertices[2].y - pixelVertices[0].y,
  );
  const secondDiagonalLength = Math.hypot(
    pixelVertices[3].x - pixelVertices[1].x,
    pixelVertices[3].y - pixelVertices[1].y,
  );
  const diagonalIntersectionPixels = lineIntersection(
    pixelVertices[0],
    pixelVertices[2],
    pixelVertices[1],
    pixelVertices[3],
  );
  if (diagonalIntersectionPixels === null) {
    throw new Error("Confirmed quadrilateral diagonals must intersect.");
  }
  const { areaPixelsSquared, centroidPixels } = polygonAreaAndCentroid(pixelVertices);
  const measurementIdentity = contentIdentityFor({
    kind: "quadrilateral-measurement",
    candidateId: candidate.id,
    vertices,
    sourcePixelWidth,
    sourcePixelHeight,
  });
  const classLabel = {
    quadrilateral: "quadrilatère",
    trapezoid: "trapèze apparent",
    parallelogram: "parallélogramme apparent",
    rectangle: "rectangle apparent",
  }[classification];
  const areaImageShare = canonicalNumber(areaPixelsSquared / (sourcePixelWidth * sourcePixelHeight));
  return {
    measurementId: `measurement:quadrilateral:${identityToken(measurementIdentity)}`,
    kind: "quadrilateral-measurement",
    candidateId: candidate.id,
    candidateLabel: candidate.label,
    classification,
    vertices,
    sideLengthsPixels,
    interiorAnglesDegrees,
    diagonalLengthsPixels: [
      canonicalNumber(firstDiagonalLength),
      canonicalNumber(secondDiagonalLength),
    ],
    diagonalIntersection: {
      x: canonicalNumber(diagonalIntersectionPixels.x / sourcePixelWidth),
      y: canonicalNumber(diagonalIntersectionPixels.y / sourcePixelHeight),
    },
    oppositeSideParallelism,
    parallelAngleToleranceDegrees: IMAGE_PLANE_PARALLEL_ANGLE_TOLERANCE_DEGREES,
    rightAngleToleranceDegrees: IMAGE_PLANE_RIGHT_ANGLE_TOLERANCE_DEGREES,
    areaPixelsSquared: canonicalNumber(areaPixelsSquared),
    areaImageShare,
    centroid: {
      x: canonicalNumber(centroidPixels.x / sourcePixelWidth),
      y: canonicalNumber(centroidPixels.y / sourcePixelHeight),
    },
    derivation: "confirmed_quadrilateral_vertices",
    explanation: `${candidate.label}: ${classLabel} mesuré dans le plan image; côtés ${sideLengthsPixels.map(formatNumber).join(" / ")} px, angles ${interiorAnglesDegrees.map((angle) => `${formatNumber(angle)}°`).join(" / ")}, surface ${formatPercent(percentage(areaImageShare))} de l’image.`,
  };
}

function angleBetweenVectorsDegrees(
  first: PersonalVisualHarmonyPointV1,
  second: PersonalVisualHarmonyPointV1,
): number {
  const denominator = Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y);
  if (denominator === 0) throw new Error("Quadrilateral sides must have positive length.");
  const cosine = Math.max(-1, Math.min(1, ((first.x * second.x) + (first.y * second.y)) / denominator));
  return Math.acos(cosine) * (180 / Math.PI);
}

function lineIntersection(
  firstStart: PersonalVisualHarmonyPointV1,
  firstEnd: PersonalVisualHarmonyPointV1,
  secondStart: PersonalVisualHarmonyPointV1,
  secondEnd: PersonalVisualHarmonyPointV1,
): PersonalVisualHarmonyPointV1 | null {
  const firstVector = { x: firstEnd.x - firstStart.x, y: firstEnd.y - firstStart.y };
  const secondVector = { x: secondEnd.x - secondStart.x, y: secondEnd.y - secondStart.y };
  const denominator = crossProduct(firstVector, secondVector);
  if (Math.abs(denominator) <= 1e-12) return null;
  const offset = { x: secondStart.x - firstStart.x, y: secondStart.y - firstStart.y };
  const firstScale = crossProduct(offset, secondVector) / denominator;
  return {
    x: firstStart.x + (firstScale * firstVector.x),
    y: firstStart.y + (firstScale * firstVector.y),
  };
}

function polygonAreaAndCentroid(
  points: readonly PersonalVisualHarmonyPointV1[],
): { readonly areaPixelsSquared: number; readonly centroidPixels: PersonalVisualHarmonyPointV1 } {
  let signedAreaTwice = 0;
  let centroidXTimesSixArea = 0;
  let centroidYTimesSixArea = 0;
  for (const [index, point] of points.entries()) {
    const next = points[(index + 1) % points.length];
    if (next === undefined) throw new Error("Polygon endpoint is missing.");
    const cross = (point.x * next.y) - (next.x * point.y);
    signedAreaTwice += cross;
    centroidXTimesSixArea += (point.x + next.x) * cross;
    centroidYTimesSixArea += (point.y + next.y) * cross;
  }
  if (Math.abs(signedAreaTwice) <= 1e-12) throw new Error("Polygon area must be positive.");
  return {
    areaPixelsSquared: Math.abs(signedAreaTwice) / 2,
    centroidPixels: {
      x: centroidXTimesSixArea / (3 * signedAreaTwice),
      y: centroidYTimesSixArea / (3 * signedAreaTwice),
    },
  };
}

function crossProduct(
  first: PersonalVisualHarmonyPointV1,
  second: PersonalVisualHarmonyPointV1,
): number {
  return (first.x * second.y) - (first.y * second.x);
}

function createEllipseSupportingLineRelationship(
  ellipseCandidate: PersonalVisualHarmonyCandidateInputV1,
  lineEvidence: PersonalVisualHarmonyImagePlaneLineEvidenceV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): PersonalVisualHarmonyImagePlaneRelationV1 | null {
  const ellipse = ellipseCandidate.primitive;
  if (ellipse?.kind !== "ellipse") return null;
  const lineStart = {
    x: lineEvidence.start.x * sourcePixelWidth,
    y: lineEvidence.start.y * sourcePixelHeight,
  };
  const lineEnd = {
    x: lineEvidence.end.x * sourcePixelWidth,
    y: lineEvidence.end.y * sourcePixelHeight,
  };
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return null;
  const length = Math.sqrt(lengthSquared);
  const unitNormal = { x: -dy / length, y: dx / length };
  const lineConstant = -((unitNormal.x * lineStart.x) + (unitNormal.y * lineStart.y));
  const center = {
    x: ellipse.center.x * sourcePixelWidth,
    y: ellipse.center.y * sourcePixelHeight,
  };
  const radiusX = ellipse.radiusX * sourcePixelWidth;
  const radiusY = ellipse.radiusY * sourcePixelHeight;
  const signedCenterToLineDistance = (unitNormal.x * center.x)
    + (unitNormal.y * center.y)
    + lineConstant;
  const centerToLineDistancePixels = Math.abs(signedCenterToLineDistance);
  const ellipseSupportRadiusPixels = Math.sqrt(
    ((radiusX * unitNormal.x) ** 2) + ((radiusY * unitNormal.y) ** 2),
  );
  if (ellipseSupportRadiusPixels === 0) return null;
  const lineAngleDegrees = normalizeUndirectedAngleDegrees(Math.atan2(dy, dx) * (180 / Math.PI));
  const offsetX = (radiusX * radiusX * unitNormal.x) / ellipseSupportRadiusPixels;
  const offsetY = (radiusY * radiusY * unitNormal.y) / ellipseSupportRadiusPixels;
  const centerSide = signedCenterToLineDistance >= 0 ? 1 : -1;
  let contactPixels = {
    x: center.x - (centerSide * offsetX),
    y: center.y - (centerSide * offsetY),
  };
  let closestPixels = projectPointOntoSupportingLine(
    contactPixels,
    unitNormal,
    lineConstant,
  );
  let intersectionPointsPixels = ellipseLineIntersections(
    center,
    radiusX,
    radiusY,
    lineStart,
    dx,
    dy,
    centerToLineDistancePixels,
    ellipseSupportRadiusPixels,
    contactPixels,
  );
  let classification: PersonalVisualHarmonyImagePlaneRelationV1["classification"];
  let gapPixelsValue: number;
  let supportingLineContactWithinObservedSegment: boolean;
  if (intersectionPointsPixels.length > 0) {
    const rankedIntersections = intersectionPointsPixels
      .map((point) => ({
        point,
        projectionScale: projectionScaleOnLine(point, lineStart, dx, dy, lengthSquared),
      }))
      .sort((first, second) => {
        const firstDistance = distanceFromUnitInterval(first.projectionScale);
        const secondDistance = distanceFromUnitInterval(second.projectionScale);
        if (firstDistance !== secondDistance) return firstDistance - secondDistance;
        return first.projectionScale - second.projectionScale;
      });
    const chosen = rankedIntersections[0];
    if (chosen === undefined) return null;
    contactPixels = chosen.point;
    closestPixels = chosen.point;
    classification = intersectionPointsPixels.length === 1 ? "near_tangent" : "intersection";
    gapPixelsValue = 0;
    supportingLineContactWithinObservedSegment = rankedIntersections.some(({ projectionScale }) => (
      projectionScale >= 0 && projectionScale <= 1
    ));
  } else {
    gapPixelsValue = Math.max(0, centerToLineDistancePixels - ellipseSupportRadiusPixels);
    const gapImageWidthShareValue = gapPixelsValue / sourcePixelWidth;
    if (gapImageWidthShareValue > IMAGE_PLANE_MAX_REPORTED_GAP_IMAGE_WIDTH_SHARE) return null;
    classification = "proximity";
    const contactProjectionScale = projectionScaleOnLine(
      closestPixels,
      lineStart,
      dx,
      dy,
      lengthSquared,
    );
    supportingLineContactWithinObservedSegment = contactProjectionScale >= 0
      && contactProjectionScale <= 1;
  }
  intersectionPointsPixels = [...intersectionPointsPixels]
    .sort((first, second) => (first.x - second.x) || (first.y - second.y));
  const contactLocation = ellipseContactLocation(contactPixels, center, radiusX, radiusY);
  const tangentAngleDegrees = ellipseTangentAngleDegrees(
    contactPixels,
    center,
    radiusX,
    radiusY,
  );
  const tangentAngleDeltaDegrees = undirectedAngleDistanceDegrees(
    lineAngleDegrees,
    tangentAngleDegrees,
  );
  const gapImageWidthShare = gapPixelsValue / sourcePixelWidth;
  if (intersectionPointsPixels.length === 0
    && gapImageWidthShare <= IMAGE_PLANE_NEAR_CONTACT_IMAGE_WIDTH_SHARE
    && tangentAngleDeltaDegrees <= IMAGE_PLANE_TANGENT_ANGLE_TOLERANCE_DEGREES) {
    classification = "near_tangent";
  }
  const gapPixels = canonicalNumber(gapPixelsValue);
  const gapPercentOfImageWidth = percentage(gapImageWidthShare);
  const canonicalTangentAngleDeltaDegrees = canonicalNumber(tangentAngleDeltaDegrees);
  const contactCharacter = classification === "intersection"
    ? tangentAngleDeltaDegrees <= IMAGE_PLANE_SHALLOW_INTERSECTION_ANGLE_TOLERANCE_DEGREES
      ? "shallow_intersection" as const
      : "crossing_intersection" as const
    : classification === "near_tangent"
      ? gapPixels <= 0.000001 && intersectionPointsPixels.length === 1
        ? "tangent" as const
        : "near_tangent" as const
      : "proximity" as const;
  const relationLabel = {
    tangent: "tangence apparente",
    near_tangent: "quasi-tangence apparente",
    shallow_intersection: `intersection rasante apparente (${String(intersectionPointsPixels.length)} points)`,
    crossing_intersection: `intersection franche apparente (${String(intersectionPointsPixels.length)} points)`,
    proximity: "proximité apparente",
  }[contactCharacter];
  const observedExtentLabel = supportingLineContactWithinObservedSegment
    ? "sur le segment visible"
    : "sur le prolongement de sa droite support";
  const relationshipIdentity = contentIdentityFor({
    kind: "ellipse-supporting-line-relation",
    ellipseCandidateId: ellipseCandidate.id,
    lineCandidateId: lineEvidence.candidateId,
    ...(lineEvidence.quadrilateralSideIndex === undefined
      ? {}
      : { quadrilateralSideIndex: lineEvidence.quadrilateralSideIndex }),
    contactLocation,
  });
  return {
    relationshipId: `relation:ellipse-supporting-line:${identityToken(relationshipIdentity)}`,
    kind: "ellipse-supporting-line-relation",
    ellipseCandidateId: ellipseCandidate.id,
    ellipseLabel: ellipseCandidate.label,
    lineCandidateId: lineEvidence.candidateId,
    lineLabel: lineEvidence.label,
    linePrimitiveKind: lineEvidence.primitiveKind,
    ...(lineEvidence.quadrilateralSideIndex === undefined
      ? {}
      : { quadrilateralSideIndex: lineEvidence.quadrilateralSideIndex }),
    contactLocation,
    ellipseContactPoint: {
      x: canonicalNumber(contactPixels.x / sourcePixelWidth),
      y: canonicalNumber(contactPixels.y / sourcePixelHeight),
    },
    closestPointOnSupportingLine: {
      x: canonicalNumber(closestPixels.x / sourcePixelWidth),
      y: canonicalNumber(closestPixels.y / sourcePixelHeight),
    },
    intersectionPoints: intersectionPointsPixels.map((point) => ({
      x: canonicalNumber(point.x / sourcePixelWidth),
      y: canonicalNumber(point.y / sourcePixelHeight),
    })),
    gapPixels,
    gapImageWidthShare: canonicalNumber(gapImageWidthShare),
    gapPercentOfImageWidth,
    centerToLineDistancePixels: canonicalNumber(centerToLineDistancePixels),
    ellipseSupportRadiusPixels: canonicalNumber(ellipseSupportRadiusPixels),
    lineAngleDegrees: canonicalNumber(lineAngleDegrees),
    tangentAngleDegrees: canonicalNumber(tangentAngleDegrees),
    tangentAngleDeltaDegrees: canonicalTangentAngleDeltaDegrees,
    supportingLineContactWithinObservedSegment,
    classification,
    contactCharacter,
    derivation: "infinite_supporting_line_from_confirmed_endpoints",
    explanation: `${ellipseCandidate.label} ↔ ${lineEvidence.label}: ${relationLabel} au contact ${ellipseContactLocationLabel(contactLocation)}, ${observedExtentLabel}; écart ${formatNumber(gapPixels)} px (${formatPercent(gapPercentOfImageWidth)} de la largeur), angle ligne/tangente ${formatNumber(canonicalTangentAngleDeltaDegrees)}° dans le plan image.`,
  };
}

function projectPointOntoSupportingLine(
  point: PersonalVisualHarmonyPointV1,
  unitNormal: PersonalVisualHarmonyPointV1,
  lineConstant: number,
): PersonalVisualHarmonyPointV1 {
  const signedDistance = (unitNormal.x * point.x) + (unitNormal.y * point.y) + lineConstant;
  return {
    x: point.x - (signedDistance * unitNormal.x),
    y: point.y - (signedDistance * unitNormal.y),
  };
}

function ellipseLineIntersections(
  center: PersonalVisualHarmonyPointV1,
  radiusX: number,
  radiusY: number,
  lineStart: PersonalVisualHarmonyPointV1,
  dx: number,
  dy: number,
  centerToLineDistancePixels: number,
  ellipseSupportRadiusPixels: number,
  tangentContactPoint: PersonalVisualHarmonyPointV1,
): readonly PersonalVisualHarmonyPointV1[] {
  const numericalDistanceTolerancePixels = 1e-9 * Math.max(
    1,
    centerToLineDistancePixels,
    ellipseSupportRadiusPixels,
  );
  if (centerToLineDistancePixels
    > ellipseSupportRadiusPixels + numericalDistanceTolerancePixels) return [];
  if (Math.abs(centerToLineDistancePixels - ellipseSupportRadiusPixels)
    <= numericalDistanceTolerancePixels) return [tangentContactPoint];
  const relativeX = lineStart.x - center.x;
  const relativeY = lineStart.y - center.y;
  const radiusXSquared = radiusX * radiusX;
  const radiusYSquared = radiusY * radiusY;
  const a = ((dx * dx) / radiusXSquared) + ((dy * dy) / radiusYSquared);
  const b = 2 * (((relativeX * dx) / radiusXSquared) + ((relativeY * dy) / radiusYSquared));
  const c = ((relativeX * relativeX) / radiusXSquared)
    + ((relativeY * relativeY) / radiusYSquared)
    - 1;
  const discriminant = (b * b) - (4 * a * c);
  const root = Math.sqrt(Math.max(0, discriminant));
  const firstParameter = (-b - root) / (2 * a);
  const secondParameter = (-b + root) / (2 * a);
  return [firstParameter, secondParameter].map((parameter) => ({
    x: lineStart.x + (parameter * dx),
    y: lineStart.y + (parameter * dy),
  }));
}

function projectionScaleOnLine(
  point: PersonalVisualHarmonyPointV1,
  lineStart: PersonalVisualHarmonyPointV1,
  dx: number,
  dy: number,
  lengthSquared: number,
): number {
  return (((point.x - lineStart.x) * dx) + ((point.y - lineStart.y) * dy)) / lengthSquared;
}

function distanceFromUnitInterval(value: number): number {
  if (value < 0) return -value;
  if (value > 1) return value - 1;
  return 0;
}

function ellipseContactLocation(
  point: PersonalVisualHarmonyPointV1,
  center: PersonalVisualHarmonyPointV1,
  radiusX: number,
  radiusY: number,
): PersonalVisualHarmonyEllipseContactLocationV1 {
  const normalizedX = (point.x - center.x) / radiusX;
  const normalizedY = (point.y - center.y) / radiusY;
  const extremumTolerance = 0.000001;
  if (Math.abs(Math.abs(normalizedX) - 1) <= extremumTolerance
    && Math.abs(normalizedY) <= extremumTolerance) {
    return normalizedX < 0 ? "left" : "right";
  }
  if (Math.abs(Math.abs(normalizedY) - 1) <= extremumTolerance
    && Math.abs(normalizedX) <= extremumTolerance) {
    return normalizedY < 0 ? "top" : "bottom";
  }
  return "oblique";
}

function ellipseTangentAngleDegrees(
  point: PersonalVisualHarmonyPointV1,
  center: PersonalVisualHarmonyPointV1,
  radiusX: number,
  radiusY: number,
): number {
  const gradientX = (point.x - center.x) / (radiusX * radiusX);
  const gradientY = (point.y - center.y) / (radiusY * radiusY);
  return normalizeUndirectedAngleDegrees(Math.atan2(gradientX, -gradientY) * (180 / Math.PI));
}

function normalizeUndirectedAngleDegrees(value: number): number {
  const normalized = value % 180;
  return canonicalNumber(normalized < 0 ? normalized + 180 : normalized);
}

function undirectedAngleDistanceDegrees(first: number, second: number): number {
  const absolute = Math.abs(first - second) % 180;
  return canonicalNumber(Math.min(absolute, 180 - absolute));
}

function ellipseContactLocationLabel(value: PersonalVisualHarmonyEllipseContactLocationV1): string {
  return {
    left: "gauche",
    right: "droite",
    top: "haut",
    bottom: "bas",
    oblique: "oblique",
  }[value];
}

function stableStringCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function imagePlaneRelationPriority(
  contactCharacter: PersonalVisualHarmonyImagePlaneRelationV1["contactCharacter"],
): number {
  return {
    tangent: 0,
    near_tangent: 1,
    shallow_intersection: 2,
    crossing_intersection: 3,
    proximity: 4,
  }[contactCharacter];
}

export function createPersonalVisualHarmonyOverlaySvgV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSetV1;
  readonly result?: PersonalVisualHarmonyResultV1;
  readonly imagePlaneGuideAnalysis?: PersonalVisualHarmonyImagePlaneRelationsV1;
  readonly selectedCandidateIds?: readonly string[];
}): string {
  const prepared = validatePreparedCandidateSet(input.preparedCandidateSet);
  const selectedIds = new Set([
    ...(input.result?.selectedCandidateIds ?? input.selectedCandidateIds ?? []),
    ...(input.imagePlaneGuideAnalysis?.confirmedVisualGuideCandidateIds ?? []),
  ]);
  const palette = ["#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#e11d48", "#eab308"];
  const guides = input.result?.harmonicAnalysis.relationships
    .filter((relationship) => relationship.guide !== null)
    .slice(0, 10) ?? [];
  const relationshipByCandidate = new Map<string, PersonalVisualHarmonyExplanationV1>();
  for (const explanation of input.result?.explanations ?? []) {
    if (!relationshipByCandidate.has(explanation.subjectCandidateId)) {
      relationshipByCandidate.set(explanation.subjectCandidateId, explanation);
    }
  }
  const candidateMarkup = prepared.candidates.map((candidateValue, index) => {
    const color = palette[index % palette.length] ?? "#f97316";
    const primitiveKind = primitiveKindFor(candidateValue);
    const x = candidateValue.x * 1000;
    const y = candidateValue.y * 1000;
    const width = candidateValue.width * 1000;
    const height = candidateValue.height * 1000;
    const selected = selectedIds.has(candidateValue.id);
    const explanation = relationshipByCandidate.get(candidateValue.id);
    const badge = explanation === undefined
      ? `${String(index + 1)} · ${candidateValue.label}`
      : `${explanation.ratioLabel} · ${formatPercent(explanation.observedPercent)}`;
    const badgeWidth = Math.min(360, Math.max(120, 22 + (badge.length * 8)));
    const editable = input.result === undefined && primitiveKind !== "ellipse";
    const editHandles = editable ? candidateEditHandlesMarkup(candidateValue) : "";
    return [
      `<g data-candidate-id="${escapeXml(candidateValue.id)}" data-primitive-kind="${primitiveKind}"${editable ? ` tabindex="0" role="group" aria-label="Ajuster ${escapeXml(candidateValue.label)}"` : ` role="img" aria-label="${escapeXml(candidateValue.label)} · guide ${primitiveKind}"`} >`,
      visualPrimitiveMarkup(candidateValue, color, selected),
      `<rect data-candidate-badge pointer-events="none" x="${numberAttr(x + 8)}" y="${numberAttr(y + 8)}" width="${numberAttr(badgeWidth)}" height="38" rx="12" fill="#0f172a" fill-opacity="0.88"/>`,
      `<text data-candidate-label pointer-events="none" x="${numberAttr(x + 22)}" y="${numberAttr(y + 34)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(badge)}</text>`,
      editHandles,
      "</g>",
    ].join("");
  }).join("");
  const guideMarkup = guides.map((relationship) => {
    const guide = relationship.guide;
    if (guide === null) return "";
    const position = guide.position * 1000;
    const line = guide.axis === "x"
      ? `<line x1="${numberAttr(position)}" y1="0" x2="${numberAttr(position)}" y2="1000"/>`
      : `<line x1="0" y1="${numberAttr(1000 - position)}" x2="1000" y2="${numberAttr(1000 - position)}"/>`;
    return `<g pointer-events="none" stroke="#f8fafc" stroke-width="4" stroke-dasharray="18 12" stroke-opacity="0.92">${line}</g>`;
  }).join("");
  const imagePlaneRelationMarkup = (input.imagePlaneGuideAnalysis?.relationships ?? [])
    .slice(0, 5)
    .map((relationship) => {
      const fromX = relationship.ellipseContactPoint.x * 1000;
      const fromY = relationship.ellipseContactPoint.y * 1000;
      const toX = relationship.closestPointOnSupportingLine.x * 1000;
      const toY = relationship.closestPointOnSupportingLine.y * 1000;
      return [
        `<g data-image-plane-relation-id="${escapeXml(relationship.relationshipId)}" pointer-events="none" stroke="#f8fafc" stroke-width="5" stroke-dasharray="12 10">`,
        `<line x1="${numberAttr(fromX)}" y1="${numberAttr(fromY)}" x2="${numberAttr(toX)}" y2="${numberAttr(toY)}"/>`,
        `<circle cx="${numberAttr(fromX)}" cy="${numberAttr(fromY)}" r="10" fill="#fb7a27" stroke="#020617" stroke-width="4"/>`,
        `<circle cx="${numberAttr(toX)}" cy="${numberAttr(toY)}" r="10" fill="#4bd4ff" stroke="#020617" stroke-width="4"/>`,
        "</g>",
      ].join("");
    })
    .join("");
  const phaseLabel = input.result === undefined
    ? "CANDIDATS VISUELS · CONFIRMATION REQUISE"
    : `NORMA CORE · ${String(input.result.explanations.length)} RAPPORT${input.result.explanations.length === 1 ? "" : "S"} · ${String(input.imagePlaneGuideAnalysis?.relationships.length ?? 0)} RELATION${input.imagePlaneGuideAnalysis?.relationships.length === 1 ? "" : "S"} VISUELLE${input.imagePlaneGuideAnalysis?.relationships.length === 1 ? "" : "S"}`;
  return [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"Norma visual harmony overlay\">",
    guideMarkup,
    candidateMarkup,
    imagePlaneRelationMarkup,
    "<g pointer-events=\"none\"><rect x=\"20\" y=\"930\" width=\"640\" height=\"50\" rx=\"16\" fill=\"#020617\" fill-opacity=\"0.88\"/>",
    `<text x="42" y="963" font-family="ui-sans-serif, system-ui, sans-serif" font-size="21" font-weight="800" letter-spacing="1.5" fill="#f8fafc">${escapeXml(phaseLabel)}</text></g>`,
    "</svg>",
  ].join("");
}

function createAcceptedGeometry(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
  selectedCandidateIds: readonly string[],
  selectionIdentity: string,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
  acceptedAt: string,
): AcceptedGeometry {
  const candidatesById = new Map(prepared.candidates.map((candidateValue) => [candidateValue.id, candidateValue]));
  const selectedCandidates = selectedCandidateIds.map((candidateId) => {
    const match = candidatesById.get(candidateId);
    if (match === undefined) throw new Error("Selected candidate does not exist in the prepared review.");
    return match;
  });
  const selectionToken = identityToken(selectionIdentity);
  const sourceObservationContentIdentity = contentIdentityFor({
    candidateSetIdentity: prepared.candidateSetIdentity,
    sourcePixelWidth,
    sourcePixelHeight,
    dimensionsObservedBy: "chatgpt-widget",
  });
  const sourceObservationId = `observation:chatgpt-visual:${identityToken(prepared.candidateSetIdentity)}`;
  const provenance = (provenanceId: string, inputContentIdentity: string) => ({
    provenanceId,
    actorType: "system" as const,
    actorId: "chatgpt-widget-client",
    operationId: "personal-visual-harmony-widget-confirmation",
    operationVersion: "1",
    inputContentIdentity,
    createdAt: acceptedAt,
    notes: "ChatGPT visual candidates confirmed by a client-asserted widget interaction; server-side human presence was not attested and Norma did not inspect the image bytes.",
  });
  const primitiveIds = selectedCandidates.map((candidateValue) => `accepted:${candidateValue.id}`);
  const accepted: AcceptedGeometry = {
    contractId: ACCEPTED_GEOMETRY_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_CONTRACT_VERSION,
    acceptedGeometryId: `accepted-geometry:personal-visual-harmony:${selectionToken}`,
    sourceObservationId,
    sourceObservationContentIdentity,
    acceptedRevision: 1,
    coordinateFrame: {
      ...structuredClone(prepared.coordinateFrame),
      sourcePixelWidth,
      sourcePixelHeight,
    },
    primitives: selectedCandidates.map((candidateValue, index): RectanglePrimitive => ({
      id: primitiveIds[index] ?? `accepted:${candidateValue.id}`,
      kind: "rectangle",
      confidence: null,
      x: candidateValue.x,
      y: candidateValue.y,
      width: candidateValue.width,
      height: candidateValue.height,
    })),
    correctionHistory: [],
    acceptance: {
      acceptanceId: `acceptance:personal-visual-harmony:${selectionToken}`,
      accepted: true,
      actorType: "system",
      actorId: "chatgpt-widget-client",
      acceptedAt,
      sourceObservationId,
      sourceObservationContentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: "",
      acceptedPrimitiveIds: primitiveIds,
      provenance: provenance(`acceptance:personal-visual-harmony:${selectionToken}`, selectionIdentity),
    },
    provenance: provenance(`accepted-geometry:personal-visual-harmony:${selectionToken}`, prepared.candidateSetIdentity),
    contentIdentity: "",
  };
  const revisionIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  const completed: AcceptedGeometry = {
    ...accepted,
    acceptance: { ...accepted.acceptance, acceptedContentIdentity: revisionIdentity },
  };
  const withIdentity: AcceptedGeometry = {
    ...completed,
    contentIdentity: computeAcceptedGeometryContentIdentity(completed),
  };
  const validation = validateAcceptedGeometryV1(withIdentity);
  if (!validation.ok) {
    throw new Error("Explicitly confirmed candidates did not produce valid AcceptedGeometry.");
  }
  return withIdentity;
}

function createCoreElementToCandidateMap(
  primitiveMappings: readonly { readonly acceptedPrimitiveId: string; readonly coreObjectId: string }[],
): ReadonlyMap<string, string> {
  return new Map(primitiveMappings.map((mapping) => [
    mapping.coreObjectId,
    mapping.acceptedPrimitiveId.replace(/^accepted:/u, ""),
  ]));
}

function createExplanation(
  subject: PersonalVisualHarmonyCandidateInputV1,
  relatedCandidateIds: readonly string[],
  relationship: HarmonicRelationshipAnalysisResultV1["relationships"][number],
): PersonalVisualHarmonyExplanationV1 {
  const observedPercent = percentage(relationship.observedValue);
  const targetPercent = percentage(relationship.ratio.targetValue);
  const deltaPercentagePoints = percentage(relationship.absoluteDelta);
  return {
    relationshipId: relationship.relationshipId,
    subjectCandidateId: subject.id,
    subjectLabel: subject.label,
    relatedCandidateIds,
    metric: relationship.metric,
    quality: relationship.quality,
    ratioLabel: relationship.ratio.displayLabel,
    ratioFamily: relationship.ratio.familyRef,
    observedPercent,
    targetPercent,
    deltaPercentagePoints,
    explanation: `${subject.label}: ${metricLabel(relationship.metric)} = ${formatPercent(observedPercent)}, proche de ${relationship.ratio.displayLabel} (${formatPercent(targetPercent)}), écart ${formatNumber(deltaPercentagePoints)} point${deltaPercentagePoints === 1 ? "" : "s"}.`,
  };
}

function headlineFor(explanations: readonly PersonalVisualHarmonyExplanationV1[]): string {
  if (explanations.length === 0) {
    return "Aucun rapport déclaré n’est assez proche dans la tolérance de 2,5 points.";
  }
  const best = explanations[0];
  if (best === undefined) return "Analyse harmonique déterministe terminée.";
  return `${String(explanations.length)} rapport${explanations.length === 1 ? "" : "s"} géométrique${explanations.length === 1 ? "" : "s"} détecté${explanations.length === 1 ? "" : "s"}; correspondance la plus proche : ${best.ratioLabel} sur « ${best.subjectLabel} ».`;
}

function metricLabel(metric: HarmonicRelationshipMetricV1): string {
  const labels: Record<HarmonicRelationshipMetricV1, string> = {
    "horizontal-split-share": "part du découpage horizontal",
    "vertical-split-share": "part du découpage vertical",
    "width-share": "largeur / image",
    "height-share": "hauteur / image",
    "left-edge-position": "position du bord gauche",
    "right-edge-position": "position du bord droit",
    "bottom-edge-position": "position du bord bas",
    "top-edge-position": "position du bord haut",
    "area-share": "surface / image",
  };
  return labels[metric];
}

function validatePreparedCandidateSet(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
): PersonalVisualHarmonyPreparedCandidateSetV1 {
  if (prepared.contractId !== PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID
    || prepared.contractVersion !== 1
    || prepared.status !== "confirmation_required"
    || prepared.imageBytesObservedByNorma !== false
    || prepared.candidateEvidenceOnly !== true
    || prepared.explicitSelectionConfirmationRequired !== true
    || prepared.coreRun !== false
    || !SHA256_PATTERN.test(prepared.sourceImageReferenceIdentity)
    || !SHA256_PATTERN.test(prepared.candidateSetIdentity)) {
    throw new Error("Prepared visual harmony candidate set is invalid.");
  }
  const candidates = validateCandidates(prepared.candidates);
  const expected = prepareCandidateIdentityProjection(prepared, candidates);
  if (contentIdentityFor(expected) !== prepared.candidateSetIdentity) {
    throw new Error("Prepared visual harmony candidate set identity is invalid.");
  }
  return structuredClone(prepared);
}

function prepareCandidateIdentityProjection(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
) {
  return {
    contractId: prepared.contractId,
    contractVersion: prepared.contractVersion,
    status: prepared.status,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    sourceImageMediaType: prepared.sourceImageMediaType,
    imageBytesObservedByNorma: prepared.imageBytesObservedByNorma,
    sourceImageIdentityBasis: prepared.sourceImageIdentityBasis,
    visualInterpretationSource: prepared.visualInterpretationSource,
    candidateEvidenceOnly: prepared.candidateEvidenceOnly,
    explicitSelectionConfirmationRequired: prepared.explicitSelectionConfirmationRequired,
    coreRun: prepared.coreRun,
    coordinateFrame: prepared.coordinateFrame,
    candidates,
  };
}

function validateCandidates(
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
): readonly PersonalVisualHarmonyCandidateInputV1[] {
  if (!Array.isArray(candidates) || candidates.length < 1 || candidates.length > PERSONAL_VISUAL_HARMONY_MAX_CANDIDATES) {
    throw new Error(`Visual harmony requires 1 to ${String(PERSONAL_VISUAL_HARMONY_MAX_CANDIDATES)} candidates.`);
  }
  const ids = new Set<string>();
  return candidates.map((candidateValue, index) => {
    if (candidateValue === null || typeof candidateValue !== "object") {
      throw new Error(`Visual harmony candidate ${String(index)} must be an object.`);
    }
    const candidateRecord = candidateValue as unknown as Record<string, unknown>;
    const expectedKeys = ["height", "id", "label", "reason", "role", "width", "x", "y"];
    const candidateKeys = Object.keys(candidateRecord).sort();
    const legacyKeys = expectedKeys.join("|");
    const primitiveKeys = [...expectedKeys, "primitive"].sort().join("|");
    if (candidateKeys.join("|") !== legacyKeys && candidateKeys.join("|") !== primitiveKeys) {
      throw new Error(`Visual harmony candidate ${String(index)} must use exact fields.`);
    }
    if (typeof candidateValue.id !== "string" || !CANDIDATE_ID_PATTERN.test(candidateValue.id) || ids.has(candidateValue.id)) {
      throw new Error(`Visual harmony candidate ${String(index)} requires a unique safe id.`);
    }
    ids.add(candidateValue.id);
    requireBoundedString(candidateValue.label, `candidates.${String(index)}.label`, 1, 80);
    requireBoundedString(candidateValue.reason, `candidates.${String(index)}.reason`, 1, 240);
    if (!["primary-subject", "secondary-subject", "structural-region", "frame"].includes(candidateValue.role)) {
      throw new Error(`Visual harmony candidate ${String(index)} has an unsupported role.`);
    }
    for (const [field, value] of Object.entries({
      x: candidateValue.x,
      y: candidateValue.y,
      width: candidateValue.width,
      height: candidateValue.height,
    })) {
      if (!Number.isFinite(value)) throw new Error(`Visual harmony candidate ${String(index)} ${field} must be finite.`);
      if (value < 0 || value > 1) {
        throw new Error(`Visual harmony candidate ${String(index)} must have normalized primitive bounds inside the image.`);
      }
    }
    const primitive = validateCandidatePrimitive(candidateValue.primitive, candidateValue, index);
    const bounds = canonicalBoundsForPrimitive(candidateValue, primitive);
    if (bounds.x < 0 || bounds.y < 0 || bounds.width < 0 || bounds.height < 0
      || bounds.x + bounds.width > 1 || bounds.y + bounds.height > 1) {
      throw new Error(`Visual harmony candidate ${String(index)} must have normalized primitive bounds inside the image.`);
    }
    return {
      id: candidateValue.id,
      label: candidateValue.label,
      role: candidateValue.role,
      reason: candidateValue.reason,
      ...bounds,
      ...(primitive === undefined ? {} : { primitive }),
    };
  });
}

function canonicalBoundsForPrimitive(
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  primitive: PersonalVisualHarmonyPrimitiveV1 | undefined,
): Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height"> {
  if (primitive?.kind === "ellipse") {
    return {
      x: canonicalNumber(primitive.center.x - primitive.radiusX),
      y: canonicalNumber(primitive.center.y - primitive.radiusY),
      width: canonicalNumber(primitive.radiusX * 2),
      height: canonicalNumber(primitive.radiusY * 2),
    };
  }
  if (primitive?.kind === "quadrilateral") {
    const xs = primitive.vertices.map(({ x }) => x);
    const ys = primitive.vertices.map(({ y }) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
      x: canonicalNumber(minX),
      y: canonicalNumber(minY),
      width: canonicalNumber(Math.max(...xs) - minX),
      height: canonicalNumber(Math.max(...ys) - minY),
    };
  }
  return {
    x: canonicalNumber(bounds.x),
    y: canonicalNumber(bounds.y),
    width: canonicalNumber(bounds.width),
    height: canonicalNumber(bounds.height),
  };
}

function validateCandidatePrimitive(
  value: PersonalVisualHarmonyPrimitiveV1 | undefined,
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  candidateIndex: number,
): PersonalVisualHarmonyPrimitiveV1 | undefined {
  if (value === undefined) {
    requirePositiveRectangleBounds(bounds, candidateIndex);
    return undefined;
  }
  if (value === null || typeof value !== "object" || !PERSONAL_VISUAL_HARMONY_PRIMITIVE_KINDS.includes(value.kind)) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} has an unsupported primitive.`);
  }
  if (value.kind === "rectangle") {
    if (Object.keys(value).sort().join("|") !== "kind") {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} rectangle primitive must use exact fields.`);
    }
    requirePositiveRectangleBounds(bounds, candidateIndex);
    return { kind: "rectangle" };
  }
  if (value.kind === "segment" || value.kind === "axis") {
    if (Object.keys(value).sort().join("|") !== "end|kind|start") {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} line primitive must use exact fields.`);
    }
    const start = validatePrimitivePoint(value.start, `candidates.${String(candidateIndex)}.primitive.start`);
    const end = validatePrimitivePoint(value.end, `candidates.${String(candidateIndex)}.primitive.end`);
    if (start.x === end.x && start.y === end.y) {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} line primitive requires distinct endpoints.`);
    }
    requireLineEnvelope(bounds, start, end, candidateIndex);
    return { kind: value.kind, start, end };
  }
  if (value.kind === "quadrilateral") {
    if (Object.keys(value).sort().join("|") !== "kind|vertices"
      || !Array.isArray(value.vertices)
      || value.vertices.length !== 4) {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} quadrilateral primitive must use exactly four vertices.`);
    }
    const vertices = canonicalQuadrilateralVertices(value.vertices, candidateIndex);
    return { kind: "quadrilateral", vertices };
  }
  if (Object.keys(value).sort().join("|") !== "center|kind|radiusX|radiusY") {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse primitive must use exact fields.`);
  }
  const center = validatePrimitivePoint(value.center, `candidates.${String(candidateIndex)}.primitive.center`);
  if (!Number.isFinite(value.radiusX) || !Number.isFinite(value.radiusY)
    || value.radiusX <= 0 || value.radiusY <= 0
    || center.x - value.radiusX < 0 || center.x + value.radiusX > 1
    || center.y - value.radiusY < 0 || center.y + value.radiusY > 1) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse must be positive and remain inside the image.`);
  }
  return {
    kind: "ellipse",
    center,
    radiusX: canonicalNumber(value.radiusX),
    radiusY: canonicalNumber(value.radiusY),
  };
}

function canonicalQuadrilateralVertices(
  values: readonly unknown[],
  candidateIndex: number,
): readonly [
  PersonalVisualHarmonyPointV1,
  PersonalVisualHarmonyPointV1,
  PersonalVisualHarmonyPointV1,
  PersonalVisualHarmonyPointV1,
] {
  let vertices = values.map((value, vertexIndex) => validatePrimitivePoint(
    value,
    `candidates.${String(candidateIndex)}.primitive.vertices.${String(vertexIndex)}`,
  ));
  const uniqueVertices = new Set(vertices.map(({ x, y }) => `${String(x)}:${String(y)}`));
  if (uniqueVertices.size !== 4) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} quadrilateral requires four distinct vertices.`);
  }
  if (signedPolygonAreaTwice(vertices) < 0) {
    vertices = [vertices[0]!, ...vertices.slice(1).reverse()];
  }
  const firstIndex = vertices.reduce((bestIndex, vertex, index) => {
    const best = vertices[bestIndex];
    if (best === undefined) return index;
    return vertex.y < best.y || (vertex.y === best.y && vertex.x < best.x) ? index : bestIndex;
  }, 0);
  vertices = [...vertices.slice(firstIndex), ...vertices.slice(0, firstIndex)];
  const crossValues = vertices.map((point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    const afterNext = vertices[(index + 2) % vertices.length];
    if (next === undefined || afterNext === undefined) {
      throw new Error("Quadrilateral vertex is missing.");
    }
    return crossProduct(
      { x: next.x - point.x, y: next.y - point.y },
      { x: afterNext.x - next.x, y: afterNext.y - next.y },
    );
  });
  if (crossValues.some((value) => value <= 1e-12)) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} quadrilateral must be a simple convex perimeter.`);
  }
  return vertices as [
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
    PersonalVisualHarmonyPointV1,
  ];
}

function signedPolygonAreaTwice(points: readonly PersonalVisualHarmonyPointV1[]): number {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    if (next === undefined) throw new Error("Polygon endpoint is missing.");
    return sum + ((point.x * next.y) - (next.x * point.y));
  }, 0);
}

function validatePrimitivePoint(value: unknown, field: string): PersonalVisualHarmonyPointV1 {
  if (value === null || typeof value !== "object"
    || Object.keys(value).sort().join("|") !== "x|y") {
    throw new Error(`${field} must use exact x and y fields.`);
  }
  const point = value as Record<string, unknown>;
  if (typeof point.x !== "number" || typeof point.y !== "number"
    || !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    throw new Error(`${field} must be a normalized point inside the image.`);
  }
  return { x: canonicalNumber(point.x), y: canonicalNumber(point.y) };
}

function requirePositiveRectangleBounds(
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  candidateIndex: number,
): void {
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} rectangle must have positive normalized bounds.`);
  }
}

function requireLineEnvelope(
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  start: PersonalVisualHarmonyPointV1,
  end: PersonalVisualHarmonyPointV1,
  candidateIndex: number,
): void {
  const tolerance = 0.000001;
  if (Math.abs(bounds.x - Math.min(start.x, end.x)) > tolerance
    || Math.abs(bounds.y - Math.min(start.y, end.y)) > tolerance
    || Math.abs(bounds.width - Math.abs(end.x - start.x)) > tolerance
    || Math.abs(bounds.height - Math.abs(end.y - start.y)) > tolerance) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} line bounds must match its endpoints.`);
  }
}

function normalizeSelectedCandidateIds(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
  selectedCandidateIds: readonly string[],
): readonly string[] {
  if (!Array.isArray(selectedCandidateIds) || selectedCandidateIds.length === 0) {
    throw new Error("Explicit human confirmation requires at least one selected candidate.");
  }
  const selected = new Set<string>();
  for (const candidateId of selectedCandidateIds) {
    if (typeof candidateId !== "string" || !CANDIDATE_ID_PATTERN.test(candidateId) || selected.has(candidateId)) {
      throw new Error("Selected candidate ids must be unique prepared candidate ids.");
    }
    selected.add(candidateId);
  }
  const ordered = prepared.candidates.filter((candidateValue) => selected.has(candidateValue.id)).map(({ id }) => id);
  if (ordered.length !== selected.size) {
    throw new Error("Selected candidate id does not exist in the prepared review.");
  }
  const nonRectangleSelection = prepared.candidates.find((candidateValue) => (
    selected.has(candidateValue.id) && primitiveKindFor(candidateValue) !== "rectangle"
  ));
  if (nonRectangleSelection !== undefined) {
    throw new Error("Visual guides cannot enter Norma Core until a compatible deterministic mapping exists.");
  }
  return ordered;
}

function normalizeVisualGuideCandidateIds(
  prepared: PersonalVisualHarmonyPreparedCandidateSetV1,
  confirmedVisualGuideCandidateIds: readonly string[],
): readonly string[] {
  if (!Array.isArray(confirmedVisualGuideCandidateIds)) {
    throw new Error("Confirmed visual guide candidate ids must be an array.");
  }
  const confirmed = new Set<string>();
  for (const candidateId of confirmedVisualGuideCandidateIds) {
    if (typeof candidateId !== "string"
      || !CANDIDATE_ID_PATTERN.test(candidateId)
      || confirmed.has(candidateId)) {
      throw new Error("Confirmed visual guide candidate ids must be unique prepared candidate ids.");
    }
    confirmed.add(candidateId);
  }
  const ordered = prepared.candidates
    .filter((candidateValue) => confirmed.has(candidateValue.id))
    .map(({ id }) => id);
  if (ordered.length !== confirmed.size) {
    throw new Error("Confirmed visual guide candidate id does not exist in the prepared review.");
  }
  const rectangleConfirmation = prepared.candidates.find((candidateValue) => (
    confirmed.has(candidateValue.id) && primitiveKindFor(candidateValue) === "rectangle"
  ));
  if (rectangleConfirmation !== undefined) {
    throw new Error("Core rectangles and visual guides require separate confirmation fields.");
  }
  return ordered;
}

function normalizeMediaType(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.length === 0) return null;
  requireBoundedString(value, "sourceImageMediaType", 1, 128);
  if (!/^image\/[A-Za-z0-9.+-]+$/u.test(value)) {
    throw new Error("sourceImageMediaType must be an image media type when supplied.");
  }
  return value.toLowerCase();
}

function requireBoundedString(value: unknown, field: string, min: number, max: number): asserts value is string {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${field} must be a bounded printable string.`);
  }
}

function requirePositivePixelDimension(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 100_000) {
    throw new Error(`${field} must be a positive image dimension.`);
  }
}

function percentage(value: number): number {
  return Number((value * 100).toFixed(3));
}

function formatPercent(value: number): string {
  return `${formatNumber(value)}%`;
}

function formatNumber(value: number): string {
  return value.toFixed(3).replace(/0+$/u, "").replace(/\.$/u, "");
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : Number(value.toFixed(12));
}

function primitiveKindFor(
  candidate: PersonalVisualHarmonyCandidateInputV1,
): PersonalVisualHarmonyPrimitiveKindV1 {
  return candidate.primitive?.kind ?? "rectangle";
}

function visualPrimitiveMarkup(
  candidate: PersonalVisualHarmonyCandidateInputV1,
  color: string,
  selected: boolean,
): string {
  const primitive = candidate.primitive;
  const strokeWidth = selected ? "7" : "4";
  if (primitive?.kind === "segment" || primitive?.kind === "axis") {
    const support = extendLineToUnitSquare(primitive.start, primitive.end);
    const dash = primitive.kind === "axis" ? "20 12" : "none";
    return [
      `<line data-supporting-line x1="${numberAttr(support.start.x * 1000)}" y1="${numberAttr(support.start.y * 1000)}" x2="${numberAttr(support.end.x * 1000)}" y2="${numberAttr(support.end.y * 1000)}" stroke="${color}" stroke-width="3" stroke-dasharray="10 14" stroke-opacity="0.58"/>`,
      `<line data-candidate-shape x1="${numberAttr(primitive.start.x * 1000)}" y1="${numberAttr(primitive.start.y * 1000)}" x2="${numberAttr(primitive.end.x * 1000)}" y2="${numberAttr(primitive.end.y * 1000)}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" stroke-linecap="round"/>`,
    ].join("");
  }
  if (primitive?.kind === "quadrilateral") {
    const points = primitive.vertices
      .map(({ x, y }) => `${numberAttr(x * 1000)},${numberAttr(y * 1000)}`)
      .join(" ");
    return `<polygon data-candidate-shape data-candidate-polygon points="${points}" fill="${color}" fill-opacity="${selected ? "0.14" : "0.06"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
  }
  if (primitive?.kind === "ellipse") {
    return `<ellipse data-candidate-shape cx="${numberAttr(primitive.center.x * 1000)}" cy="${numberAttr(primitive.center.y * 1000)}" rx="${numberAttr(primitive.radiusX * 1000)}" ry="${numberAttr(primitive.radiusY * 1000)}" fill="${color}" fill-opacity="${selected ? "0.12" : "0.05"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${selected ? "none" : "14 10"}"/>`;
  }
  return `<rect data-candidate-box data-candidate-shape x="${numberAttr(candidate.x * 1000)}" y="${numberAttr(candidate.y * 1000)}" width="${numberAttr(candidate.width * 1000)}" height="${numberAttr(candidate.height * 1000)}" rx="10" fill="${color}" fill-opacity="${selected ? "0.16" : "0.08"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${selected ? "none" : "14 10"}"/>`;
}

function candidateEditHandlesMarkup(candidate: PersonalVisualHarmonyCandidateInputV1): string {
  const primitive = candidate.primitive;
  const handle = (attributes: string) => `<circle ${attributes} r="15" fill="#f8fafc" stroke="#0f172a" stroke-width="5"/>`;
  if (primitive?.kind === "segment" || primitive?.kind === "axis") {
    return [
      handle(`data-point-handle="start" tabindex="0" cx="${numberAttr(primitive.start.x * 1000)}" cy="${numberAttr(primitive.start.y * 1000)}"`),
      handle(`data-point-handle="end" tabindex="0" cx="${numberAttr(primitive.end.x * 1000)}" cy="${numberAttr(primitive.end.y * 1000)}"`),
    ].join("");
  }
  if (primitive?.kind === "quadrilateral") {
    return primitive.vertices.map((point, index) => handle(
      `data-vertex-handle="${String(index)}" tabindex="0" cx="${numberAttr(point.x * 1000)}" cy="${numberAttr(point.y * 1000)}"`,
    )).join("");
  }
  return `<rect data-resize-handle x="${numberAttr((candidate.x + candidate.width) * 1000 - 16)}" y="${numberAttr((candidate.y + candidate.height) * 1000 - 16)}" width="32" height="32" rx="8" fill="#f8fafc" stroke="#0f172a" stroke-width="5"/>`;
}

function extendLineToUnitSquare(
  start: PersonalVisualHarmonyPointV1,
  end: PersonalVisualHarmonyPointV1,
): { readonly start: PersonalVisualHarmonyPointV1; readonly end: PersonalVisualHarmonyPointV1 } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const candidates: { readonly point: PersonalVisualHarmonyPointV1; readonly scale: number }[] = [];
  const add = (scale: number) => {
    const point = { x: start.x + (scale * dx), y: start.y + (scale * dy) };
    if (point.x < -1e-12 || point.x > 1 + 1e-12 || point.y < -1e-12 || point.y > 1 + 1e-12) return;
    if (candidates.some(({ point: existing }) => (
      Math.abs(existing.x - point.x) <= 1e-12 && Math.abs(existing.y - point.y) <= 1e-12
    ))) return;
    candidates.push({
      scale,
      point: { x: canonicalNumber(Math.max(0, Math.min(1, point.x))), y: canonicalNumber(Math.max(0, Math.min(1, point.y))) },
    });
  };
  if (dx !== 0) {
    add((0 - start.x) / dx);
    add((1 - start.x) / dx);
  }
  if (dy !== 0) {
    add((0 - start.y) / dy);
    add((1 - start.y) / dy);
  }
  candidates.sort((first, second) => first.scale - second.scale);
  const first = candidates[0];
  const last = candidates.at(-1);
  if (first === undefined || last === undefined) return { start, end };
  return { start: first.point, end: last.point };
}

function numberAttr(value: number): string {
  return canonicalNumber(value).toString();
}

const XML_DELIMITER_ESCAPES = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
});

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) => XML_DELIMITER_ESCAPES[character as keyof typeof XML_DELIMITER_ESCAPES],
  );
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

function identityToken(identity: string): string {
  if (!SHA256_PATTERN.test(identity)) throw new Error("Identity must be a SHA-256 content identity.");
  return identity.slice("sha256:".length);
}
