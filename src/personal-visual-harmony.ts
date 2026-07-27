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
  analyzeDeclaredLengthPairV1,
  analyzeHarmonicRelationshipsV1,
  type DeclaredLengthPairMatchV1,
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
import {
  analyzePersonalVisualHarmonyConstructionsV1,
  normalizePersonalVisualHarmonyTriangleRequestsV1,
  type PersonalVisualHarmonyConstructionAnalysisV1,
  type PersonalVisualHarmonyConstructionLayerV1,
  type PersonalVisualHarmonyTriangleRequestInputV1,
} from "./personal-visual-harmony-constructions.js";
import type {
  PersonalVisualHarmonyMergedPerceptionCandidatesV1,
} from "./personal-visual-harmony-perception.js";

export const PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID =
  "norma.personal-visual-harmony-candidate-set@1" as const;
export const PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_V2_CONTRACT_ID =
  "norma.personal-visual-harmony-candidate-set@2" as const;
export const PERSONAL_VISUAL_HARMONY_RESULT_CONTRACT_ID =
  "norma.personal-visual-harmony-result@1" as const;
export const PERSONAL_VISUAL_HARMONY_IMAGE_PLANE_RELATIONS_CONTRACT_ID =
  "norma.personal-visual-harmony-image-plane-relations@1" as const;
export const PERSONAL_VISUAL_HARMONY_DECLARED_MEASUREMENT_RATIO_REPORT_CONTRACT_ID =
  "norma.personal-visual-harmony-declared-measurement-ratio-report@1" as const;
export const PERSONAL_VISUAL_HARMONY_MAX_CANDIDATES = 12;
export const PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS = [
  "norma.geometry-harmonies@0.1.0",
  "norma.basic-proportions@0.1.0",
] as const;
export const PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE = 0.025 as const;

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
    readonly rotationDegrees?: number;
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
  readonly sourceImageReferenceIdentity?: string;
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
  readonly triangleConstructionRequests?: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
  readonly candidateSetIdentity: string;
}

export type PersonalVisualHarmonyInterpretationSourceV2 =
  | "chatgpt"
  | "sam3"
  | "manual"
  | "hybrid";

export interface PersonalVisualHarmonyPreparedCandidateSetV2 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_V2_CONTRACT_ID;
  readonly contractVersion: 2;
  readonly status: "confirmation_required";
  readonly sourceImageReferenceIdentity: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType: string | null;
  readonly imageBytesObservedByNorma: true;
  readonly sourceImageIdentityBasis: "chatgpt_file_reference_plus_observed_image_bytes";
  readonly visualInterpretationSource: PersonalVisualHarmonyInterpretationSourceV2;
  readonly perceptionReceiptIdentity: string;
  readonly candidateEvidenceOnly: true;
  readonly explicitSelectionConfirmationRequired: true;
  readonly coreRun: false;
  readonly coordinateFrame: PersonalVisualHarmonyPreparedCandidateSetV1["coordinateFrame"];
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly triangleConstructionRequests?: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
  readonly candidateSetIdentity: string;
}

export type PersonalVisualHarmonyPreparedCandidateSet =
  | PersonalVisualHarmonyPreparedCandidateSetV1
  | PersonalVisualHarmonyPreparedCandidateSetV2;

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

export type PersonalVisualHarmonyMeasurementLengthReferenceV1 =
  | {
      readonly kind: "segment";
      readonly candidateId: string;
    }
  | {
      readonly kind: "axis";
      readonly candidateId: string;
    }
  | {
      readonly kind: "quadrilateral-side";
      readonly candidateId: string;
      readonly sideIndex: 0 | 1 | 2 | 3;
    }
  | {
      readonly kind: "quadrilateral-diagonal";
      readonly candidateId: string;
      readonly diagonalIndex: 0 | 1;
    };

export interface PersonalVisualHarmonyMeasurementRatioRequestV1 {
  readonly requestId: string;
  readonly measurements: readonly [
    PersonalVisualHarmonyMeasurementLengthReferenceV1,
    PersonalVisualHarmonyMeasurementLengthReferenceV1,
  ];
  readonly ratioPackRefs: typeof PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS;
  readonly matchTolerance: typeof PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE;
}

export interface PersonalVisualHarmonyMeasurementLengthEvidenceV1 {
  readonly measurementIdentity: string;
  readonly reference: PersonalVisualHarmonyMeasurementLengthReferenceV1;
  readonly candidateLabel: string;
  readonly lengthPixels: number;
  readonly provenance: "explicit_confirmed_image_plane_length";
}

export interface PersonalVisualHarmonyDeclaredMeasurementRatioReportV1 {
  readonly contractId:
    typeof PERSONAL_VISUAL_HARMONY_DECLARED_MEASUREMENT_RATIO_REPORT_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "completed";
  readonly requestId: string;
  readonly candidateSetIdentity: string;
  readonly sourceImageReferenceIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly coordinateSpace: "image_plane_pixels_v1";
  readonly normalization: "dominant_length_divided_by_pair_sum";
  readonly measurements: readonly [
    PersonalVisualHarmonyMeasurementLengthEvidenceV1,
    PersonalVisualHarmonyMeasurementLengthEvidenceV1,
  ];
  readonly dominantMeasurementIdentity: string;
  readonly observedDominantShare: number;
  readonly ratioPackRefs: typeof PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS;
  readonly matchTolerance: typeof PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE;
  readonly relationshipCount: 0 | 1;
  readonly match: DeclaredLengthPairMatchV1 | null;
  readonly pairOnly: true;
  readonly noUnrequestedComparisons: true;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
  readonly originalGeometryUnchanged: true;
  readonly noIntentInference: true;
  readonly contentIdentity: string;
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
  readonly constructionAnalysis?: PersonalVisualHarmonyConstructionAnalysisV1;
  readonly limits: {
    readonly imagePlaneOnly: true;
    readonly axisAlignedEllipseOnly?: true;
    readonly rotatedEllipseSupport?: "explicit_normalized_image_plane_rotation";
    readonly noWorldSpaceMetricClaim: true;
    readonly noHarmonicRatioClaim: true;
    readonly noIntentInference: true;
  };
  readonly contentIdentity: string;
}

export interface PersonalVisualHarmonyConfirmationV1 {
  readonly result: PersonalVisualHarmonyResultV1;
  readonly imagePlaneGuideAnalysis: PersonalVisualHarmonyImagePlaneRelationsV1;
  readonly declaredMeasurementRatioReport?: PersonalVisualHarmonyDeclaredMeasurementRatioReportV1;
  readonly overlaySvg: string;
  readonly acceptedGeometryContentIdentity: string;
  readonly mappingResultContentIdentity: string;
}

const CANDIDATE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const MATCH_TOLERANCE = PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE;
const IMAGE_PLANE_NEAR_CONTACT_IMAGE_WIDTH_SHARE = 0.01;
const IMAGE_PLANE_MAX_REPORTED_GAP_IMAGE_WIDTH_SHARE = 0.025;
const IMAGE_PLANE_TANGENT_ANGLE_TOLERANCE_DEGREES = 5;
const IMAGE_PLANE_SHALLOW_INTERSECTION_ANGLE_TOLERANCE_DEGREES = 12;
const IMAGE_PLANE_PARALLEL_ANGLE_TOLERANCE_DEGREES = 2;
const IMAGE_PLANE_RIGHT_ANGLE_TOLERANCE_DEGREES = 2;

export function preparePersonalVisualHarmonyCandidateSetV1(input: {
  readonly sourceFileId: string;
  readonly sourceImageMediaType?: string | null;
  readonly expectedSourceImageReferenceIdentity?: string;
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly triangleConstructionRequests?: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
}): PersonalVisualHarmonyPreparedCandidateSetV1 {
  requireBoundedString(input.sourceFileId, "sourceFileId", 1, 2_048);
  const sourceImageMediaType = normalizeMediaType(input.sourceImageMediaType);
  const sourceImageReferenceIdentity = contentIdentityFor({
    kind: "chatgpt-file-reference",
    fileId: input.sourceFileId,
  });
  if (input.expectedSourceImageReferenceIdentity !== undefined
    && input.expectedSourceImageReferenceIdentity !== sourceImageReferenceIdentity) {
    throw new Error("Expected source image identity does not match sourceFileId.");
  }
  const candidates = validateCandidates(input.candidates, sourceImageReferenceIdentity);
  const triangleConstructionRequests = normalizePersonalVisualHarmonyTriangleRequestsV1(
    input.triangleConstructionRequests ?? [],
  );
  validateTriangleRequestCandidateReferences(candidates, triangleConstructionRequests);
  const coordinateFrame = {
    dimensions: 2 as const,
    coordinateScale: "normalized" as const,
    origin: "top-left" as const,
    xDirection: "right" as const,
    yDirection: "down" as const,
    bounds: { x: [0, 1] as const, y: [0, 1] as const },
  };
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
    ...(triangleConstructionRequests.length === 0 ? {} : { triangleConstructionRequests }),
  };
  return {
    ...withoutIdentity,
    candidateSetIdentity: contentIdentityFor(withoutIdentity),
  };
}

export function preparePersonalVisualHarmonyCandidateSetV2(input: {
  readonly sourceFileId: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType?: string | null;
  readonly expectedSourceImageReferenceIdentity?: string;
  readonly visualInterpretationSource: PersonalVisualHarmonyInterpretationSourceV2;
  readonly perceptionReceiptIdentity: string;
  readonly candidates: readonly PersonalVisualHarmonyCandidateInputV1[];
  readonly triangleConstructionRequests?: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
}): PersonalVisualHarmonyPreparedCandidateSetV2 {
  requireBoundedString(input.sourceFileId, "sourceFileId", 1, 2_048);
  if (!SHA256_PATTERN.test(input.sourceImageContentIdentity)) {
    throw new Error("sourceImageContentIdentity must be a sha256 identity.");
  }
  if (!SHA256_PATTERN.test(input.perceptionReceiptIdentity)) {
    throw new Error("perceptionReceiptIdentity must be a sha256 identity.");
  }
  if (!["chatgpt", "sam3", "manual", "hybrid"].includes(input.visualInterpretationSource)) {
    throw new Error("visualInterpretationSource is invalid.");
  }
  const sourceImageMediaType = normalizeMediaType(input.sourceImageMediaType);
  const sourceImageReferenceIdentity = contentIdentityFor({
    kind: "chatgpt-file-reference",
    fileId: input.sourceFileId,
  });
  if (input.expectedSourceImageReferenceIdentity !== undefined
    && input.expectedSourceImageReferenceIdentity !== sourceImageReferenceIdentity) {
    throw new Error("Expected source image identity does not match sourceFileId.");
  }
  const candidates = validateCandidates(input.candidates, sourceImageReferenceIdentity);
  const triangleConstructionRequests = normalizePersonalVisualHarmonyTriangleRequestsV1(
    input.triangleConstructionRequests ?? [],
  );
  validateTriangleRequestCandidateReferences(candidates, triangleConstructionRequests);
  const coordinateFrame = {
    dimensions: 2 as const,
    coordinateScale: "normalized" as const,
    origin: "top-left" as const,
    xDirection: "right" as const,
    yDirection: "down" as const,
    bounds: { x: [0, 1] as const, y: [0, 1] as const },
  };
  const withoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_V2_CONTRACT_ID,
    contractVersion: 2 as const,
    status: "confirmation_required" as const,
    sourceImageReferenceIdentity,
    sourceImageContentIdentity: input.sourceImageContentIdentity,
    sourceImageMediaType,
    imageBytesObservedByNorma: true as const,
    sourceImageIdentityBasis: "chatgpt_file_reference_plus_observed_image_bytes" as const,
    visualInterpretationSource: input.visualInterpretationSource,
    perceptionReceiptIdentity: input.perceptionReceiptIdentity,
    candidateEvidenceOnly: true as const,
    explicitSelectionConfirmationRequired: true as const,
    coreRun: false as const,
    coordinateFrame,
    candidates,
    ...(triangleConstructionRequests.length === 0 ? {} : { triangleConstructionRequests }),
  };
  return {
    ...withoutIdentity,
    candidateSetIdentity: contentIdentityFor(withoutIdentity),
  };
}

export function preparePersonalVisualHarmonyMergedPerceptionCandidatesV1(input: {
  readonly sourceFileId: string;
  readonly sourceImageMediaType?: string | null;
  readonly mergedPerceptionCandidates: PersonalVisualHarmonyMergedPerceptionCandidatesV1;
}): PersonalVisualHarmonyPreparedCandidateSetV1 {
  const merged = input.mergedPerceptionCandidates;
  if (merged === null || typeof merged !== "object") {
    throw new Error("Merged perception candidates are required for hybrid preparation.");
  }
  if (!SHA256_PATTERN.test(merged.sourceImageReferenceIdentity)) {
    throw new Error("Merged perception candidates require a source image identity.");
  }
  const expectedMergedIdentity = contentIdentityFor({
    sourceImageReferenceIdentity: merged.sourceImageReferenceIdentity,
    manualPerceptionIdentity: merged.manualPerceptionIdentity,
    candidates: merged.candidates,
    triangleConstructionRequests: merged.triangleConstructionRequests,
    manualBoundaryEvidence: merged.manualBoundaryEvidence,
    manualWarnings: merged.manualWarnings,
  });
  if (merged.mergedPerceptionIdentity !== expectedMergedIdentity) {
    throw new Error("Merged perception identity is stale or invalid.");
  }
  return preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: input.sourceFileId,
    ...(input.sourceImageMediaType === undefined
      ? {}
      : { sourceImageMediaType: input.sourceImageMediaType }),
    expectedSourceImageReferenceIdentity: merged.sourceImageReferenceIdentity,
    candidates: merged.candidates,
    triangleConstructionRequests: merged.triangleConstructionRequests,
  });
}

export function preparePersonalVisualHarmonyMergedPerceptionCandidatesV2(input: {
  readonly sourceFileId: string;
  readonly sourceImageContentIdentity: string;
  readonly sourceImageMediaType?: string | null;
  readonly visualInterpretationSource: PersonalVisualHarmonyInterpretationSourceV2;
  readonly perceptionReceiptIdentity: string;
  readonly mergedPerceptionCandidates: PersonalVisualHarmonyMergedPerceptionCandidatesV1;
}): PersonalVisualHarmonyPreparedCandidateSetV2 {
  const merged = input.mergedPerceptionCandidates;
  if (merged === null || typeof merged !== "object") {
    throw new Error("Merged perception candidates are required for V2 preparation.");
  }
  const expectedMergedIdentity = contentIdentityFor({
    sourceImageReferenceIdentity: merged.sourceImageReferenceIdentity,
    manualPerceptionIdentity: merged.manualPerceptionIdentity,
    candidates: merged.candidates,
    triangleConstructionRequests: merged.triangleConstructionRequests,
    manualBoundaryEvidence: merged.manualBoundaryEvidence,
    manualWarnings: merged.manualWarnings,
  });
  if (!SHA256_PATTERN.test(merged.sourceImageReferenceIdentity)
    || merged.mergedPerceptionIdentity !== expectedMergedIdentity) {
    throw new Error("Merged perception identity is stale or invalid.");
  }
  return preparePersonalVisualHarmonyCandidateSetV2({
    sourceFileId: input.sourceFileId,
    sourceImageContentIdentity: input.sourceImageContentIdentity,
    ...(input.sourceImageMediaType === undefined
      ? {}
      : { sourceImageMediaType: input.sourceImageMediaType }),
    expectedSourceImageReferenceIdentity: merged.sourceImageReferenceIdentity,
    visualInterpretationSource: input.visualInterpretationSource,
    perceptionReceiptIdentity: input.perceptionReceiptIdentity,
    candidates: merged.candidates,
    triangleConstructionRequests: merged.triangleConstructionRequests,
  });
}

export function confirmPersonalVisualHarmonyCandidateSetV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSet;
  readonly expectedCandidateSetIdentity: string;
  readonly selectedCandidateIds: readonly string[];
  readonly confirmedVisualGuideCandidateIds?: readonly string[];
  readonly constructionLayers?: readonly PersonalVisualHarmonyConstructionLayerV1[];
  readonly measurementRatioRequest?: PersonalVisualHarmonyMeasurementRatioRequestV1;
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
    constructionLayers: input.constructionLayers ?? [],
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
  });
  const declaredMeasurementRatioReport = input.measurementRatioRequest === undefined
    ? null
    : createDeclaredMeasurementRatioReport(
        prepared,
        confirmedVisualGuideCandidateIds,
        input.measurementRatioRequest,
        input.sourcePixelWidth,
        input.sourcePixelHeight,
      );
  return {
    result,
    imagePlaneGuideAnalysis,
    ...(declaredMeasurementRatioReport === null ? {} : { declaredMeasurementRatioReport }),
    overlaySvg: createPersonalVisualHarmonyOverlaySvgV1({
      preparedCandidateSet: prepared,
      result,
      imagePlaneGuideAnalysis,
    }),
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    mappingResultContentIdentity: mapping.resultContentIdentity,
  };
}

function createDeclaredMeasurementRatioReport(
  prepared: PersonalVisualHarmonyPreparedCandidateSet,
  confirmedVisualGuideCandidateIds: readonly string[],
  request: PersonalVisualHarmonyMeasurementRatioRequestV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): PersonalVisualHarmonyDeclaredMeasurementRatioReportV1 {
  validateMeasurementRatioRequest(request);
  const confirmed = new Set(confirmedVisualGuideCandidateIds);
  const measurements = request.measurements.map((reference) => (
    resolveMeasurementLengthEvidence(
      prepared,
      confirmed,
      reference,
      sourcePixelWidth,
      sourcePixelHeight,
    )
  )).sort((first, second) => (
    stableStringCompare(first.measurementIdentity, second.measurementIdentity)
  )) as [
    PersonalVisualHarmonyMeasurementLengthEvidenceV1,
    PersonalVisualHarmonyMeasurementLengthEvidenceV1,
  ];
  if (measurements[0].measurementIdentity === measurements[1].measurementIdentity) {
    throw new Error("Declared measurement ratio requires two distinct measurement references.");
  }
  const analysis = analyzeDeclaredLengthPairV1({
    measurements: measurements.map(({ measurementIdentity, lengthPixels }) => ({
      measurementId: measurementIdentity,
      length: lengthPixels,
    })) as [
      { readonly measurementId: string; readonly length: number },
      { readonly measurementId: string; readonly length: number },
    ],
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: request.matchTolerance,
  });
  const withoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_DECLARED_MEASUREMENT_RATIO_REPORT_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "completed" as const,
    requestId: request.requestId,
    candidateSetIdentity: prepared.candidateSetIdentity,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    sourcePixelWidth,
    sourcePixelHeight,
    coordinateSpace: "image_plane_pixels_v1" as const,
    normalization: "dominant_length_divided_by_pair_sum" as const,
    measurements,
    dominantMeasurementIdentity: analysis.dominantMeasurementId,
    observedDominantShare: analysis.observedDominantShare,
    ratioPackRefs: PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS,
    matchTolerance: PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE,
    relationshipCount: analysis.relationshipCount,
    match: analysis.match,
    pairOnly: true as const,
    noUnrequestedComparisons: true as const,
    candidateEvidenceOnly: true as const,
    sourceTruth: false as const,
    coreAuthority: false as const,
    originalGeometryUnchanged: true as const,
    noIntentInference: true as const,
  };
  return {
    ...withoutIdentity,
    contentIdentity: contentIdentityFor(withoutIdentity),
  };
}

function validateMeasurementRatioRequest(request: PersonalVisualHarmonyMeasurementRatioRequestV1): void {
  if (!isRecord(request) || !hasExactFields(request, [
    "requestId",
    "measurements",
    "ratioPackRefs",
    "matchTolerance",
  ])) {
    throw new Error("Declared measurement ratio request must expose exact versioned fields.");
  }
  if (typeof request.requestId !== "string" || !CANDIDATE_ID_PATTERN.test(request.requestId)) {
    throw new Error("Declared measurement ratio requestId must be a safe bounded id.");
  }
  if (!Array.isArray(request.measurements) || request.measurements.length !== 2) {
    throw new Error("Declared measurement ratio requires exactly two measurement references.");
  }
  if (!Array.isArray(request.ratioPackRefs)
    || request.ratioPackRefs.length !== PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS.length
    || request.ratioPackRefs.some((ref, index) => (
      ref !== PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_PACK_REFS[index]
    ))) {
    throw new Error("Declared measurement ratio requires the exact explicit ratio pack references.");
  }
  if (request.matchTolerance !== PERSONAL_VISUAL_HARMONY_DECLARED_RATIO_MATCH_TOLERANCE) {
    throw new Error("Declared measurement ratio requires the exact explicit match tolerance.");
  }
  request.measurements.forEach(validateMeasurementLengthReference);
}

function validateMeasurementLengthReference(
  reference: PersonalVisualHarmonyMeasurementLengthReferenceV1,
): void {
  if (!isRecord(reference) || !CANDIDATE_ID_PATTERN.test(reference.candidateId)) {
    throw new Error("Declared measurement reference requires a safe candidate id.");
  }
  if (reference.kind === "segment" || reference.kind === "axis") {
    if (!hasExactFields(reference, ["kind", "candidateId"])) {
      throw new Error(`Declared ${reference.kind} measurement reference must expose exact fields.`);
    }
    return;
  }
  if (reference.kind === "quadrilateral-side") {
    if (!hasExactFields(reference, ["kind", "candidateId", "sideIndex"])
      || !Number.isInteger(reference.sideIndex) || reference.sideIndex < 0 || reference.sideIndex > 3) {
      throw new Error("Declared quadrilateral-side reference requires sideIndex 0 through 3.");
    }
    return;
  }
  if (reference.kind === "quadrilateral-diagonal") {
    if (!hasExactFields(reference, ["kind", "candidateId", "diagonalIndex"])
      || !Number.isInteger(reference.diagonalIndex)
      || reference.diagonalIndex < 0 || reference.diagonalIndex > 1) {
      throw new Error("Declared quadrilateral-diagonal reference requires diagonalIndex 0 or 1.");
    }
    return;
  }
  throw new Error("Declared measurement reference kind is unsupported.");
}

function resolveMeasurementLengthEvidence(
  prepared: PersonalVisualHarmonyPreparedCandidateSet,
  confirmed: ReadonlySet<string>,
  reference: PersonalVisualHarmonyMeasurementLengthReferenceV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): PersonalVisualHarmonyMeasurementLengthEvidenceV1 {
  const candidate = prepared.candidates.find(({ id }) => id === reference.candidateId);
  if (candidate === undefined) {
    throw new Error("Declared measurement reference is missing or stale.");
  }
  if (!confirmed.has(candidate.id)) {
    throw new Error("Declared measurement reference must belong to a confirmed visual guide.");
  }
  let lengthPixels: number;
  if (reference.kind === "segment" || reference.kind === "axis") {
    if (candidate.primitive?.kind !== reference.kind) {
      throw new Error(`Declared ${reference.kind} measurement reference does not match candidate geometry.`);
    }
    lengthPixels = Math.hypot(
      (candidate.primitive.end.x - candidate.primitive.start.x) * sourcePixelWidth,
      (candidate.primitive.end.y - candidate.primitive.start.y) * sourcePixelHeight,
    );
  } else {
    const measurement = createQuadrilateralMeasurement(candidate, sourcePixelWidth, sourcePixelHeight);
    if (measurement === null) {
      throw new Error("Declared quadrilateral measurement reference does not match candidate geometry.");
    }
    lengthPixels = reference.kind === "quadrilateral-side"
      ? measurement.sideLengthsPixels[reference.sideIndex]
      : measurement.diagonalLengthsPixels[reference.diagonalIndex];
  }
  if (!Number.isFinite(lengthPixels) || lengthPixels <= 0) {
    throw new Error("Declared measurement reference resolved to a non-finite or degenerate length.");
  }
  const canonicalLength = canonicalNumber(lengthPixels);
  const measurementIdentity = contentIdentityFor({
    candidateSetIdentity: prepared.candidateSetIdentity,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    sourcePixelWidth,
    sourcePixelHeight,
    reference,
    lengthPixels: canonicalLength,
  });
  return {
    measurementIdentity,
    reference: { ...reference },
    candidateLabel: candidate.label,
    lengthPixels: canonicalLength,
    provenance: "explicit_confirmed_image_plane_length",
  };
}

export function analyzePersonalVisualHarmonyImagePlaneRelationsV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSet;
  readonly confirmedVisualGuideCandidateIds: readonly string[];
  readonly constructionLayers?: readonly PersonalVisualHarmonyConstructionLayerV1[];
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
  const includesRotatedEllipse = ellipses.some(({ primitive }) => (
    primitive?.kind === "ellipse" && primitive.rotationDegrees !== undefined
  ));
  const confirmedGuides = prepared.candidates.filter((candidate) => confirmed.has(candidate.id));
  const lines = confirmedGuides.flatMap(imagePlaneLineEvidenceForCandidate);
  const constructionLayers = input.constructionLayers ?? [];
  validateTriangleConstructionConfirmation(
    prepared.triangleConstructionRequests ?? [],
    confirmedVisualGuideCandidateIds,
    constructionLayers,
  );
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
  const constructionAnalysis = constructionLayers.length === 0
    ? null
    : analyzePersonalVisualHarmonyConstructionsV1({
      enabledLayers: constructionLayers,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      frame: {
        frameId: "frame:image-boundary",
        kind: "confirmed-image-boundary",
        vertices: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
      },
      observedLines: lines.filter(({ primitiveKind }) => primitiveKind !== "quadrilateral-side")
        .map((line) => ({
          candidateId: line.candidateId,
          label: line.label,
          primitiveKind: line.primitiveKind,
          start: line.start,
          end: line.end,
        })),
      triangleRequests: prepared.triangleConstructionRequests ?? [],
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
    ...(constructionAnalysis === null ? {} : { constructionAnalysis }),
    limits: {
      imagePlaneOnly: true as const,
      ...(includesRotatedEllipse
        ? { rotatedEllipseSupport: "explicit_normalized_image_plane_rotation" as const }
        : { axisAlignedEllipseOnly: true as const }),
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
  const rotatedGeometry = ellipse.rotationDegrees === undefined
    ? null
    : rotatedEllipsePixelGeometry(ellipse, sourcePixelWidth, sourcePixelHeight);
  if (ellipse.rotationDegrees !== undefined && rotatedGeometry === null) return null;
  const signedCenterToLineDistance = (unitNormal.x * center.x)
    + (unitNormal.y * center.y)
    + lineConstant;
  const centerToLineDistancePixels = Math.abs(signedCenterToLineDistance);
  const ellipseSupportRadiusPixels = rotatedGeometry === null
    ? Math.sqrt(((radiusX * unitNormal.x) ** 2) + ((radiusY * unitNormal.y) ** 2))
    : Math.sqrt(
      (rotatedGeometry.matrixXX * unitNormal.x * unitNormal.x)
      + (2 * rotatedGeometry.matrixXY * unitNormal.x * unitNormal.y)
      + (rotatedGeometry.matrixYY * unitNormal.y * unitNormal.y),
    );
  if (!Number.isFinite(ellipseSupportRadiusPixels) || ellipseSupportRadiusPixels <= 0) return null;
  const lineAngleDegrees = normalizeUndirectedAngleDegrees(Math.atan2(dy, dx) * (180 / Math.PI));
  const offsetX = rotatedGeometry === null
    ? (radiusX * radiusX * unitNormal.x) / ellipseSupportRadiusPixels
    : ((rotatedGeometry.matrixXX * unitNormal.x)
      + (rotatedGeometry.matrixXY * unitNormal.y)) / ellipseSupportRadiusPixels;
  const offsetY = rotatedGeometry === null
    ? (radiusY * radiusY * unitNormal.y) / ellipseSupportRadiusPixels
    : ((rotatedGeometry.matrixXY * unitNormal.x)
      + (rotatedGeometry.matrixYY * unitNormal.y)) / ellipseSupportRadiusPixels;
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
  const computedIntersections = rotatedGeometry === null
    ? ellipseLineIntersections(
      center,
      radiusX,
      radiusY,
      lineStart,
      dx,
      dy,
      centerToLineDistancePixels,
      ellipseSupportRadiusPixels,
      contactPixels,
    )
    : rotatedEllipseLineIntersections(
      rotatedGeometry,
      lineStart,
      dx,
      dy,
      centerToLineDistancePixels,
      ellipseSupportRadiusPixels,
      contactPixels,
    );
  if (computedIntersections === null) return null;
  let intersectionPointsPixels = computedIntersections
    .filter((point) => pointIsInsideImageFramePixels(
      point,
      sourcePixelWidth,
      sourcePixelHeight,
    ))
    .map((point) => clampPointToImageFramePixels(
      point,
      sourcePixelWidth,
      sourcePixelHeight,
    ));
  if (computedIntersections.length > 0 && intersectionPointsPixels.length === 0) return null;
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
    classification = computedIntersections.length === 1 ? "near_tangent" : "intersection";
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
  if (!pointIsInsideImageFramePixels(contactPixels, sourcePixelWidth, sourcePixelHeight)
    || !pointIsInsideImageFramePixels(closestPixels, sourcePixelWidth, sourcePixelHeight)) {
    return null;
  }
  contactPixels = clampPointToImageFramePixels(contactPixels, sourcePixelWidth, sourcePixelHeight);
  closestPixels = clampPointToImageFramePixels(closestPixels, sourcePixelWidth, sourcePixelHeight);
  intersectionPointsPixels = [...intersectionPointsPixels]
    .sort((first, second) => (first.x - second.x) || (first.y - second.y));
  const contactLocation = rotatedGeometry === null
    ? ellipseContactLocation(contactPixels, center, radiusX, radiusY)
    : rotatedEllipseContactLocation(contactPixels, rotatedGeometry);
  const tangentAngleDegrees = rotatedGeometry === null
    ? ellipseTangentAngleDegrees(contactPixels, center, radiusX, radiusY)
    : rotatedEllipseTangentAngleDegrees(contactPixels, rotatedGeometry);
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
    ellipsePrimitive: ellipse,
    lineCandidateId: lineEvidence.candidateId,
    lineStart: lineEvidence.start,
    lineEnd: lineEvidence.end,
    sourcePixelWidth,
    sourcePixelHeight,
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

function pointIsInsideImageFramePixels(
  point: PersonalVisualHarmonyPointV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): boolean {
  const tolerance = 1e-9;
  return point.x >= -tolerance && point.x <= sourcePixelWidth + tolerance
    && point.y >= -tolerance && point.y <= sourcePixelHeight + tolerance;
}

function clampPointToImageFramePixels(
  point: PersonalVisualHarmonyPointV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): PersonalVisualHarmonyPointV1 {
  return {
    x: Math.max(0, Math.min(sourcePixelWidth, point.x)),
    y: Math.max(0, Math.min(sourcePixelHeight, point.y)),
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

interface RotatedEllipsePixelGeometryV1 {
  readonly center: PersonalVisualHarmonyPointV1;
  readonly matrixXX: number;
  readonly matrixXY: number;
  readonly matrixYY: number;
  readonly inverseXX: number;
  readonly inverseXY: number;
  readonly inverseYY: number;
}

function rotatedEllipsePixelGeometry(
  ellipse: Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "ellipse" }>,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): RotatedEllipsePixelGeometryV1 | null {
  const rotationRadians = (ellipse.rotationDegrees ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  const firstAxisX = sourcePixelWidth * ellipse.radiusX * cos;
  const firstAxisY = sourcePixelHeight * ellipse.radiusX * sin;
  const secondAxisX = -sourcePixelWidth * ellipse.radiusY * sin;
  const secondAxisY = sourcePixelHeight * ellipse.radiusY * cos;
  const matrixXX = (firstAxisX * firstAxisX) + (secondAxisX * secondAxisX);
  const matrixXY = (firstAxisX * firstAxisY) + (secondAxisX * secondAxisY);
  const matrixYY = (firstAxisY * firstAxisY) + (secondAxisY * secondAxisY);
  const determinant = (matrixXX * matrixYY) - (matrixXY * matrixXY);
  const determinantScale = Math.max(1, matrixXX * matrixYY);
  if (![matrixXX, matrixXY, matrixYY, determinant].every(Number.isFinite)
    || determinant <= Number.EPSILON * determinantScale) return null;
  return {
    center: {
      x: ellipse.center.x * sourcePixelWidth,
      y: ellipse.center.y * sourcePixelHeight,
    },
    matrixXX,
    matrixXY,
    matrixYY,
    inverseXX: matrixYY / determinant,
    inverseXY: -matrixXY / determinant,
    inverseYY: matrixXX / determinant,
  };
}

function rotatedEllipseLineIntersections(
  geometry: RotatedEllipsePixelGeometryV1,
  lineStart: PersonalVisualHarmonyPointV1,
  dx: number,
  dy: number,
  centerToLineDistancePixels: number,
  ellipseSupportRadiusPixels: number,
  tangentContactPoint: PersonalVisualHarmonyPointV1,
): readonly PersonalVisualHarmonyPointV1[] | null {
  const numericalDistanceTolerancePixels = 1e-9 * Math.max(
    1,
    centerToLineDistancePixels,
    ellipseSupportRadiusPixels,
  );
  if (centerToLineDistancePixels
    > ellipseSupportRadiusPixels + numericalDistanceTolerancePixels) return [];
  if (Math.abs(centerToLineDistancePixels - ellipseSupportRadiusPixels)
    <= numericalDistanceTolerancePixels) return [tangentContactPoint];
  const relativeX = lineStart.x - geometry.center.x;
  const relativeY = lineStart.y - geometry.center.y;
  const quadratic = (x: number, y: number) => (
    (geometry.inverseXX * x * x)
    + (2 * geometry.inverseXY * x * y)
    + (geometry.inverseYY * y * y)
  );
  const a = quadratic(dx, dy);
  const b = 2 * (
    (geometry.inverseXX * relativeX * dx)
    + (geometry.inverseXY * ((relativeX * dy) + (relativeY * dx)))
    + (geometry.inverseYY * relativeY * dy)
  );
  const c = quadratic(relativeX, relativeY) - 1;
  const discriminant = (b * b) - (4 * a * c);
  const discriminantTolerance = 1e-12 * Math.max(1, Math.abs(b * b), Math.abs(4 * a * c));
  if (![a, b, c, discriminant].every(Number.isFinite)
    || a <= Number.EPSILON) return null;
  if (discriminant < -discriminantTolerance) return null;
  const root = Math.sqrt(Math.max(0, discriminant));
  const denominator = 2 * a;
  const parameters = [(-b - root) / denominator, (-b + root) / denominator];
  if (!parameters.every(Number.isFinite)) return null;
  return parameters.map((parameter) => ({
    x: lineStart.x + (parameter * dx),
    y: lineStart.y + (parameter * dy),
  }));
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

function rotatedEllipseContactLocation(
  point: PersonalVisualHarmonyPointV1,
  geometry: RotatedEllipsePixelGeometryV1,
): PersonalVisualHarmonyEllipseContactLocationV1 {
  const relativeX = point.x - geometry.center.x;
  const relativeY = point.y - geometry.center.y;
  const normalizedX = relativeX / Math.sqrt(geometry.matrixXX);
  const normalizedY = relativeY / Math.sqrt(geometry.matrixYY);
  const extremumTolerance = 0.000001;
  if (Math.abs(Math.abs(normalizedX) - 1) <= extremumTolerance) {
    return normalizedX < 0 ? "left" : "right";
  }
  if (Math.abs(Math.abs(normalizedY) - 1) <= extremumTolerance) {
    return normalizedY < 0 ? "top" : "bottom";
  }
  return "oblique";
}

function rotatedEllipseTangentAngleDegrees(
  point: PersonalVisualHarmonyPointV1,
  geometry: RotatedEllipsePixelGeometryV1,
): number {
  const relativeX = point.x - geometry.center.x;
  const relativeY = point.y - geometry.center.y;
  const gradientX = (geometry.inverseXX * relativeX) + (geometry.inverseXY * relativeY);
  const gradientY = (geometry.inverseXY * relativeX) + (geometry.inverseYY * relativeY);
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

export interface PersonalVisualHarmonyLabelLayoutBoxV1 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PersonalVisualHarmonyLabelLayoutItemV1 {
  readonly candidateId: string;
  readonly preferredX: number;
  readonly preferredY: number;
  readonly width: number;
}

export interface PersonalVisualHarmonyLabelPlacementV1
  extends PersonalVisualHarmonyLabelLayoutBoxV1 {
  readonly candidateId: string;
}

export function layoutPersonalVisualHarmonyCandidateLabelsV1(input: {
  readonly labels: readonly PersonalVisualHarmonyLabelLayoutItemV1[];
  readonly obstacles?: readonly PersonalVisualHarmonyLabelLayoutBoxV1[];
}): readonly PersonalVisualHarmonyLabelPlacementV1[] {
  const margin = 8;
  const labelHeight = 38;
  const gap = 8;
  const maximumY = 884;
  const obstacles = (input.obstacles ?? []).filter(({ x, y, width, height }) => (
    [x, y, width, height].every(Number.isFinite) && Math.min(width, height) > 0
  ));
  const placements: PersonalVisualHarmonyLabelPlacementV1[] = [];
  const overlaps = (
    first: PersonalVisualHarmonyLabelLayoutBoxV1,
    second: PersonalVisualHarmonyLabelLayoutBoxV1,
  ) => (
    first.x < second.x + second.width + gap
    && first.x + first.width + gap > second.x
    && first.y < second.y + second.height + gap
    && first.y + first.height + gap > second.y
  );

  for (const label of input.labels) {
    const width = Math.min(480, Math.max(120, Number.isFinite(label.width) ? label.width : 120));
    const maximumX = 1000 - margin - width;
    const preferredX = Math.min(maximumX, Math.max(margin, label.preferredX));
    const preferredY = Math.min(maximumY, Math.max(margin, label.preferredY));
    const xSlots = [
      preferredX,
      Math.min(maximumX, Math.max(margin, label.preferredX - width - 16)),
      margin,
      maximumX,
    ].filter((value, index, values) => values.indexOf(value) === index);
    const ySlots = [preferredY];
    for (let step = 1; step <= 20; step += 1) {
      ySlots.push(
        Math.min(maximumY, preferredY + (step * (labelHeight + gap))),
        Math.max(margin, preferredY - (step * (labelHeight + gap))),
      );
    }
    const uniqueYSlots = ySlots.filter((value, index, values) => values.indexOf(value) === index);
    const candidates = uniqueYSlots.flatMap((y) => xSlots.map((x) => ({
      candidateId: label.candidateId,
      x,
      y,
      width,
      height: labelHeight,
    })));
    const placement = candidates.find((candidate) => (
      [...placements, ...obstacles].every((box) => !overlaps(candidate, box))
    )) ?? candidates.find((candidate) => (
      candidate.x === margin && placements.every((box) => !overlaps(candidate, box))
    )) ?? {
      candidateId: label.candidateId,
      x: margin,
      y: margin,
      width,
      height: labelHeight,
    };
    placements.push(placement);
  }

  return placements;
}

export function createPersonalVisualHarmonyOverlaySvgV1(input: {
  readonly preparedCandidateSet: PersonalVisualHarmonyPreparedCandidateSet;
  readonly result?: PersonalVisualHarmonyResultV1;
  readonly imagePlaneGuideAnalysis?: PersonalVisualHarmonyImagePlaneRelationsV1;
  readonly selectedCandidateIds?: readonly string[];
}): string {
  const prepared = validatePreparedCandidateSet(input.preparedCandidateSet);
  const selectedIds = new Set([
    ...(input.result?.selectedCandidateIds ?? input.selectedCandidateIds ?? []),
    ...(input.imagePlaneGuideAnalysis?.confirmedVisualGuideCandidateIds ?? []),
  ]);
  const enabledConstructionLayers = new Set(
    input.imagePlaneGuideAnalysis?.constructionAnalysis?.enabledLayers ?? [],
  );
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
  const candidateBadges = prepared.candidates.map((candidateValue, index) => {
    const explanation = relationshipByCandidate.get(candidateValue.id);
    const text = explanation === undefined
      ? `${String(index + 1)} · ${candidateValue.label}`
      : `${explanation.ratioLabel} · ${formatPercent(explanation.observedPercent)}`;
    return {
      candidateId: candidateValue.id,
      preferredX: (candidateValue.x * 1000) + 8,
      preferredY: (candidateValue.y * 1000) + 8,
      text,
      width: Math.min(480, Math.max(120, 22 + (text.length * 11))),
    };
  });
  const candidateLabelPlacements = new Map(
    layoutPersonalVisualHarmonyCandidateLabelsV1({
      labels: candidateBadges,
      obstacles: input.result === undefined
        ? editableCandidateHandleBoxes(prepared.candidates)
        : [],
    }).map((placement) => [placement.candidateId, placement]),
  );
  const candidateMarkup = prepared.candidates.map((candidateValue, index) => {
    const color = palette[index % palette.length] ?? "#f97316";
    const primitiveKind = primitiveKindFor(candidateValue);
    const x = candidateValue.x * 1000;
    const y = candidateValue.y * 1000;
    const width = candidateValue.width * 1000;
    const height = candidateValue.height * 1000;
    const selected = selectedIds.has(candidateValue.id);
    const badge = candidateBadges[index];
    const placement = candidateLabelPlacements.get(candidateValue.id);
    if (badge === undefined || placement === undefined) {
      throw new Error("Candidate label layout is incomplete.");
    }
    const editable = input.result === undefined && primitiveKind !== "ellipse";
    const editHandles = editable ? candidateEditHandlesMarkup(candidateValue) : "";
    return [
      `<g data-candidate-id="${escapeXml(candidateValue.id)}" data-primitive-kind="${primitiveKind}"${editable ? ` tabindex="0" role="group" aria-label="Ajuster ${escapeXml(candidateValue.label)}"` : ` role="img" aria-label="${escapeXml(candidateValue.label)} · guide ${primitiveKind}"`} >`,
      visualPrimitiveMarkup(
        candidateValue,
        color,
        selected,
        selected && enabledConstructionLayers.has("support-line-extensions"),
      ),
      `<line data-candidate-label-leader pointer-events="none" x1="${numberAttr(x + 8)}" y1="${numberAttr(y + 8)}" x2="${numberAttr(placement.x)}" y2="${numberAttr(placement.y + 19)}" stroke="${color}" stroke-width="3" stroke-opacity="0.82"/>`,
      `<rect data-candidate-badge pointer-events="none" x="${numberAttr(placement.x)}" y="${numberAttr(placement.y)}" width="${numberAttr(placement.width)}" height="38" rx="12" fill="#0f172a" fill-opacity="0.88"/>`,
      `<text data-candidate-label pointer-events="none" x="${numberAttr(placement.x + 14)}" y="${numberAttr(placement.y + 26)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(badge.text)}</text>`,
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
  const formatDiagonalMarkup = [
    `<line data-format-diagonal="vertex-0-to-2" x1="0" y1="0" x2="1000" y2="1000"/>`,
    `<line data-format-diagonal="vertex-1-to-3" x1="1000" y1="0" x2="0" y2="1000"/>`,
  ].join("");
  const formatDiagonalGroup = `<g data-construction-layer="format-diagonals" data-provenance="derived-construction" pointer-events="none" stroke="#22d3ee" stroke-width="3" stroke-dasharray="22 10 4 10" stroke-opacity="0.72"${enabledConstructionLayers.has("format-diagonals") ? "" : ` style="display:none"`}>${formatDiagonalMarkup}</g>`;
  const renderedJunctionKeys = new Set<string>();
  const junctionAngleMarkup = (input.imagePlaneGuideAnalysis?.constructionAnalysis?.junctionAngles ?? [])
    .filter((junction) => {
      const key = `${junction.intersection.x.toFixed(9)}:${junction.intersection.y.toFixed(9)}:${junction.smallerAngleDegrees.toFixed(9)}`;
      if (renderedJunctionKeys.has(key)) return false;
      renderedJunctionKeys.add(key);
      return true;
    })
    .slice(0, 24)
    .map((junction, index) => {
      const x = junction.intersection.x * 1000;
      const y = junction.intersection.y * 1000;
      const labelOffset = 22 + ((index % 3) * 30);
      const angleLabel = `${String(Number(junction.smallerAngleDegrees.toFixed(1)))}°`;
      return [
        `<g data-junction-angle-id="${escapeXml(junction.junctionId)}" data-construction-layer="junction-angles" data-provenance="derived-measurement" pointer-events="none"${enabledConstructionLayers.has("junction-angles") ? "" : ` style="display:none"`}>`,
        `<circle cx="${numberAttr(x)}" cy="${numberAttr(y)}" r="9" fill="#facc15" stroke="#020617" stroke-width="4"/>`,
        `<text x="${numberAttr(x + 14)}" y="${numberAttr(y - labelOffset)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="19" font-weight="800" fill="#fef08a" stroke="#020617" stroke-width="4" paint-order="stroke">${escapeXml(angleLabel)}</text>`,
        "</g>",
      ].join("");
    })
    .join("");
  const triangleMarkup = (input.imagePlaneGuideAnalysis?.constructionAnalysis?.triangles ?? [])
    .map((triangle, triangleIndex) => {
      const points = triangle.vertices
        .map(({ point }) => `${numberAttr(point.x * 1000)},${numberAttr(point.y * 1000)}`)
        .join(" ");
      const vertices = triangle.vertices.map(({ point, parent }, vertexIndex) => {
        const observedParent = parent.kind === "observed-line-endpoint";
        const parentLabel = observedParent ? "O" : "J";
        const fill = observedParent ? "#fb7185" : "#facc15";
        return [
          `<circle data-triangle-vertex="${String(vertexIndex)}" data-parent-kind="${parent.kind}" data-parent-provenance="${parent.provenance}" cx="${numberAttr(point.x * 1000)}" cy="${numberAttr(point.y * 1000)}" r="${observedParent ? "10" : "12"}" fill="${fill}" stroke="#020617" stroke-width="4"${observedParent ? "" : ` stroke-dasharray="5 3"`}/>`,
          `<text x="${numberAttr((point.x * 1000) + 15)}" y="${numberAttr((point.y * 1000) - 15)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="17" font-weight="850" fill="#fae8ff" stroke="#020617" stroke-width="4" paint-order="stroke">T${String(triangleIndex + 1)}.${parentLabel}${String(vertexIndex + 1)}</text>`,
        ].join("");
      }).join("");
      return [
        `<g data-triangle-construction-id="${escapeXml(triangle.triangleId)}" data-construction-layer="triangles" data-provenance="derived-construction" pointer-events="none"${enabledConstructionLayers.has("triangles") ? "" : ` style="display:none"`}>`,
        `<polygon points="${points}" fill="#e879f9" fill-opacity="0.08" stroke="#e879f9" stroke-width="5" stroke-dasharray="18 9" stroke-linejoin="round"/>`,
        vertices,
        "</g>",
      ].join("");
    })
    .join("");
  const triangleMedianMarkup = (
    input.imagePlaneGuideAnalysis?.constructionAnalysis?.triangleMedians ?? []
  ).map((median) => [
    `<g data-triangle-median-id="${escapeXml(median.medianId)}" data-parent-triangle-id="${escapeXml(median.triangleId)}" data-construction-layer="triangle-medians" data-provenance="derived-construction" pointer-events="none"${enabledConstructionLayers.has("triangle-medians") ? "" : ` style="display:none"`}>`,
    `<line x1="${numberAttr(median.vertex.x * 1000)}" y1="${numberAttr(median.vertex.y * 1000)}" x2="${numberAttr(median.midpoint.x * 1000)}" y2="${numberAttr(median.midpoint.y * 1000)}" stroke="#34d399" stroke-width="4" stroke-dasharray="8 7" stroke-linecap="round"/>`,
    `<circle cx="${numberAttr(median.midpoint.x * 1000)}" cy="${numberAttr(median.midpoint.y * 1000)}" r="8" fill="#34d399" stroke="#020617" stroke-width="3"/>`,
    `<text x="${numberAttr((median.midpoint.x * 1000) + 12)}" y="${numberAttr((median.midpoint.y * 1000) - 12)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="800" fill="#a7f3d0" stroke="#020617" stroke-width="4" paint-order="stroke">M${String(median.vertexIndex + 1)}</text>`,
    "</g>",
  ].join("")).join("");
  const trianglePerpendicularBisectorMarkup = (
    input.imagePlaneGuideAnalysis?.constructionAnalysis?.trianglePerpendicularBisectors ?? []
  ).map((bisector) => [
    `<g data-triangle-perpendicular-bisector-id="${escapeXml(bisector.bisectorId)}" data-parent-triangle-id="${escapeXml(bisector.triangleId)}" data-construction-layer="triangle-perpendicular-bisectors" data-provenance="derived-construction" pointer-events="none"${enabledConstructionLayers.has("triangle-perpendicular-bisectors") ? "" : ` style="display:none"`}>`,
    `<line x1="${numberAttr(bisector.clippedStart.x * 1000)}" y1="${numberAttr(bisector.clippedStart.y * 1000)}" x2="${numberAttr(bisector.clippedEnd.x * 1000)}" y2="${numberAttr(bisector.clippedEnd.y * 1000)}" stroke="#c084fc" stroke-width="4" stroke-dasharray="4 10" stroke-linecap="round"/>`,
    `<circle cx="${numberAttr(bisector.midpoint.x * 1000)}" cy="${numberAttr(bisector.midpoint.y * 1000)}" r="8" fill="#c084fc" stroke="#020617" stroke-width="3"/>`,
    `<text x="${numberAttr((bisector.midpoint.x * 1000) + 12)}" y="${numberAttr((bisector.midpoint.y * 1000) + 24)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="800" fill="#e9d5ff" stroke="#020617" stroke-width="4" paint-order="stroke">B${String(bisector.sideIndex + 1)}</text>`,
    "</g>",
  ].join("")).join("");
  const triangleAngleBisectorMarkup = (
    input.imagePlaneGuideAnalysis?.constructionAnalysis?.triangleAngleBisectors ?? []
  ).map((bisector) => [
    `<g data-triangle-angle-bisector-id="${escapeXml(bisector.bisectorId)}" data-parent-triangle-id="${escapeXml(bisector.triangleId)}" data-construction-layer="triangle-angle-bisectors" data-provenance="derived-construction" pointer-events="none"${enabledConstructionLayers.has("triangle-angle-bisectors") ? "" : ` style="display:none"`}>`,
    `<line x1="${numberAttr(bisector.vertex.x * 1000)}" y1="${numberAttr(bisector.vertex.y * 1000)}" x2="${numberAttr(bisector.oppositeSideIntersection.x * 1000)}" y2="${numberAttr(bisector.oppositeSideIntersection.y * 1000)}" stroke="#fb923c" stroke-width="4" stroke-dasharray="12 7" stroke-linecap="round"/>`,
    `<circle cx="${numberAttr(bisector.oppositeSideIntersection.x * 1000)}" cy="${numberAttr(bisector.oppositeSideIntersection.y * 1000)}" r="7" fill="#fb923c" stroke="#020617" stroke-width="3"/>`,
    `<text x="${numberAttr((bisector.oppositeSideIntersection.x * 1000) + 12)}" y="${numberAttr((bisector.oppositeSideIntersection.y * 1000) - 12)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="800" fill="#fed7aa" stroke="#020617" stroke-width="4" paint-order="stroke">A${String(bisector.vertexIndex + 1)}</text>`,
    "</g>",
  ].join("")).join("");
  const triangleAltitudeMarkup = (
    input.imagePlaneGuideAnalysis?.constructionAnalysis?.triangleAltitudes ?? []
  ).map((altitude) => {
    const footInsideFrame = altitude.foot.x >= 0 && altitude.foot.x <= 1
      && altitude.foot.y >= 0 && altitude.foot.y <= 1;
    return [
      `<g data-triangle-altitude-id="${escapeXml(altitude.altitudeId)}" data-parent-triangle-id="${escapeXml(altitude.triangleId)}" data-construction-layer="triangle-altitudes" data-provenance="derived-construction" pointer-events="none"${enabledConstructionLayers.has("triangle-altitudes") ? "" : ` style="display:none"`}>`,
      `<line x1="${numberAttr(altitude.clippedStart.x * 1000)}" y1="${numberAttr(altitude.clippedStart.y * 1000)}" x2="${numberAttr(altitude.clippedEnd.x * 1000)}" y2="${numberAttr(altitude.clippedEnd.y * 1000)}" stroke="#60a5fa" stroke-width="4" stroke-dasharray="16 8 3 8" stroke-linecap="round"/>`,
      footInsideFrame
        ? `<circle cx="${numberAttr(altitude.foot.x * 1000)}" cy="${numberAttr(altitude.foot.y * 1000)}" r="7" fill="#60a5fa" stroke="#020617" stroke-width="3"/>`
        : "",
      `<text x="${numberAttr((altitude.vertex.x * 1000) + 12)}" y="${numberAttr((altitude.vertex.y * 1000) - 12)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="800" fill="#bfdbfe" stroke="#020617" stroke-width="4" paint-order="stroke">H${String(altitude.vertexIndex + 1)}</text>`,
      "</g>",
    ].join("");
  }).join("");
  const triangleCentroidMarkup = (
    input.imagePlaneGuideAnalysis?.constructionAnalysis?.triangleCentroids ?? []
  ).map((centroid) => [
    `<g data-triangle-centroid-id="${escapeXml(centroid.centroidId)}" data-parent-triangle-id="${escapeXml(centroid.triangleId)}" data-construction-layer="triangle-centroids" data-provenance="derived-construction" data-candidate-evidence-only="true" data-source-truth="false" data-core-authority="false" pointer-events="none"${enabledConstructionLayers.has("triangle-centroids") ? "" : ` style="display:none"`}>`,
    `<circle cx="${numberAttr(centroid.centroid.x * 1000)}" cy="${numberAttr(centroid.centroid.y * 1000)}" r="10" fill="#f472b6" stroke="#020617" stroke-width="4"/>`,
    `<text x="${numberAttr((centroid.centroid.x * 1000) + 15)}" y="${numberAttr((centroid.centroid.y * 1000) - 15)}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="17" font-weight="850" fill="#fbcfe8" stroke="#020617" stroke-width="4" paint-order="stroke">G</text>`,
    "</g>",
  ].join("")).join("");
  const phaseLabel = input.result === undefined
    ? "CANDIDATS VISUELS · CONFIRMATION REQUISE"
    : `NORMA CORE · ${String(input.result.explanations.length)} RAPPORT${input.result.explanations.length === 1 ? "" : "S"} · ${String(input.imagePlaneGuideAnalysis?.relationships.length ?? 0)} RELATION${input.imagePlaneGuideAnalysis?.relationships.length === 1 ? "" : "S"} VISUELLE${input.imagePlaneGuideAnalysis?.relationships.length === 1 ? "" : "S"}`;
  return [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1000 1000\" preserveAspectRatio=\"none\" role=\"img\" aria-label=\"Norma visual harmony overlay\">",
    guideMarkup,
    formatDiagonalGroup,
    candidateMarkup,
    imagePlaneRelationMarkup,
    junctionAngleMarkup,
    triangleMarkup,
    triangleMedianMarkup,
    trianglePerpendicularBisectorMarkup,
    triangleAngleBisectorMarkup,
    triangleAltitudeMarkup,
    triangleCentroidMarkup,
    "<g pointer-events=\"none\"><rect x=\"20\" y=\"930\" width=\"640\" height=\"50\" rx=\"16\" fill=\"#020617\" fill-opacity=\"0.88\"/>",
    `<text x="42" y="963" font-family="ui-sans-serif, system-ui, sans-serif" font-size="21" font-weight="800" letter-spacing="1.5" fill="#f8fafc">${escapeXml(phaseLabel)}</text></g>`,
    "</svg>",
  ].join("");
}

function createAcceptedGeometry(
  prepared: PersonalVisualHarmonyPreparedCandidateSet,
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
  const isObservedImageCandidateSet = prepared.contractVersion === 2;
  const sourceObservationContentIdentity = contentIdentityFor(isObservedImageCandidateSet
    ? {
        candidateSetIdentity: prepared.candidateSetIdentity,
        sourceImageContentIdentity: prepared.sourceImageContentIdentity,
        perceptionReceiptIdentity: prepared.perceptionReceiptIdentity,
        visualInterpretationSource: prepared.visualInterpretationSource,
        sourcePixelWidth,
        sourcePixelHeight,
        dimensionsObservedBy: "chatgpt-widget",
      }
    : {
        candidateSetIdentity: prepared.candidateSetIdentity,
        sourcePixelWidth,
        sourcePixelHeight,
        dimensionsObservedBy: "chatgpt-widget",
      });
  const sourceObservationId = isObservedImageCandidateSet
    ? `observation:perception-assisted:${identityToken(prepared.candidateSetIdentity)}`
    : `observation:chatgpt-visual:${identityToken(prepared.candidateSetIdentity)}`;
  const actorId = isObservedImageCandidateSet
    ? "norma-personal-visual-harmony-widget"
    : "chatgpt-widget-client";
  const provenanceNotes = isObservedImageCandidateSet
    ? "Perception-assisted candidates were explicitly confirmed by a client-asserted widget interaction; server-side human presence was not attested and provider evidence did not enter Norma Core before confirmation."
    : "ChatGPT visual candidates confirmed by a client-asserted widget interaction; server-side human presence was not attested and Norma did not inspect the image bytes.";
  const provenance = (provenanceId: string, inputContentIdentity: string) => ({
    provenanceId,
    actorType: "system" as const,
    actorId,
    operationId: "personal-visual-harmony-widget-confirmation",
    operationVersion: "1",
    inputContentIdentity,
    createdAt: acceptedAt,
    notes: provenanceNotes,
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
      actorId,
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
  prepared: PersonalVisualHarmonyPreparedCandidateSet,
): PersonalVisualHarmonyPreparedCandidateSet {
  const v1IsValid = prepared.contractVersion === 1
    && prepared.contractId === PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_CONTRACT_ID
    && prepared.imageBytesObservedByNorma === false
    && prepared.sourceImageIdentityBasis === "chatgpt_file_reference_not_image_bytes"
    && prepared.visualInterpretationSource === "chatgpt";
  const v2IsValid = prepared.contractVersion === 2
    && prepared.contractId === PERSONAL_VISUAL_HARMONY_CANDIDATE_SET_V2_CONTRACT_ID
    && prepared.imageBytesObservedByNorma === true
    && prepared.sourceImageIdentityBasis === "chatgpt_file_reference_plus_observed_image_bytes"
    && SHA256_PATTERN.test(prepared.sourceImageContentIdentity)
    && SHA256_PATTERN.test(prepared.perceptionReceiptIdentity)
    && ["chatgpt", "sam3", "manual", "hybrid"].includes(prepared.visualInterpretationSource);
  if ((!v1IsValid && !v2IsValid)
    || prepared.status !== "confirmation_required"
    || prepared.candidateEvidenceOnly !== true
    || prepared.explicitSelectionConfirmationRequired !== true
    || prepared.coreRun !== false
    || !SHA256_PATTERN.test(prepared.sourceImageReferenceIdentity)
    || !SHA256_PATTERN.test(prepared.candidateSetIdentity)) {
    throw new Error("Prepared visual harmony candidate set is invalid.");
  }
  const candidates = validateCandidates(
    prepared.candidates,
    prepared.sourceImageReferenceIdentity,
  );
  const triangleConstructionRequests = normalizePersonalVisualHarmonyTriangleRequestsV1(
    prepared.triangleConstructionRequests ?? [],
  );
  validateTriangleRequestCandidateReferences(candidates, triangleConstructionRequests);
  const expected = prepareCandidateIdentityProjection(
    prepared,
    candidates,
    triangleConstructionRequests,
  );
  if (contentIdentityFor(expected) !== prepared.candidateSetIdentity) {
    throw new Error("Prepared visual harmony candidate set identity is invalid.");
  }
  return structuredClone(prepared);
}

function prepareCandidateIdentityProjection(
  prepared: PersonalVisualHarmonyPreparedCandidateSet,
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
  triangleConstructionRequests: readonly PersonalVisualHarmonyTriangleRequestInputV1[],
) {
  const common = {
    contractId: prepared.contractId,
    contractVersion: prepared.contractVersion,
    status: prepared.status,
    sourceImageReferenceIdentity: prepared.sourceImageReferenceIdentity,
    ...(prepared.contractVersion === 1
      ? {}
      : { sourceImageContentIdentity: prepared.sourceImageContentIdentity }),
    sourceImageMediaType: prepared.sourceImageMediaType,
    imageBytesObservedByNorma: prepared.imageBytesObservedByNorma,
    sourceImageIdentityBasis: prepared.sourceImageIdentityBasis,
    visualInterpretationSource: prepared.visualInterpretationSource,
    ...(prepared.contractVersion === 1
      ? {}
      : { perceptionReceiptIdentity: prepared.perceptionReceiptIdentity }),
    candidateEvidenceOnly: prepared.candidateEvidenceOnly,
    explicitSelectionConfirmationRequired: prepared.explicitSelectionConfirmationRequired,
    coreRun: prepared.coreRun,
    coordinateFrame: prepared.coordinateFrame,
    candidates,
    ...(triangleConstructionRequests.length === 0 ? {} : { triangleConstructionRequests }),
  };
  return common;
}

function validateTriangleRequestCandidateReferences(
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
  requests: readonly PersonalVisualHarmonyTriangleRequestInputV1[],
): void {
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const requireObservedLineCandidate = (candidateId: string) => {
    const candidate = candidatesById.get(candidateId);
    const primitive = candidate?.primitive;
    if (primitive?.kind !== "segment" && primitive?.kind !== "axis") {
      throw new Error("Triangle observed parent must reference a prepared segment or axis candidate.");
    }
    return { candidate, primitive };
  };
  for (const request of requests) {
    for (const vertex of request.vertices) {
      if (vertex.parent.kind === "observed-line-endpoint") {
        const { primitive } = requireObservedLineCandidate(vertex.parent.candidateId);
        const point = primitive[vertex.parent.endpoint];
        if (Math.abs(point.x - vertex.point.x) > 1e-9
          || Math.abs(point.y - vertex.point.y) > 1e-9) {
          throw new Error("Triangle observed endpoint point must match its prepared candidate parent.");
        }
        continue;
      }
      for (const participant of vertex.parent.participants) {
        if (participant.kind === "support-line-extension") {
          requireObservedLineCandidate(participant.candidateId);
        }
      }
    }
  }
}

function validateTriangleConstructionConfirmation(
  requests: readonly PersonalVisualHarmonyTriangleRequestInputV1[],
  confirmedVisualGuideCandidateIds: readonly string[],
  constructionLayers: readonly PersonalVisualHarmonyConstructionLayerV1[],
): void {
  if (constructionLayers.includes("triangle-medians")
    && !constructionLayers.includes("triangles")) {
    throw new Error("Triangle medians require the triangle construction layer.");
  }
  if (constructionLayers.includes("triangle-medians") && requests.length !== 1) {
    throw new Error("Triangle medians require exactly one explicit current triangle request.");
  }
  if (constructionLayers.includes("triangle-perpendicular-bisectors")
    && !constructionLayers.includes("triangles")) {
    throw new Error("Triangle perpendicular bisectors require the triangle construction layer.");
  }
  if (constructionLayers.includes("triangle-perpendicular-bisectors") && requests.length !== 1) {
    throw new Error("Triangle perpendicular bisectors require exactly one explicit current triangle request.");
  }
  if (constructionLayers.includes("triangle-angle-bisectors")
    && !constructionLayers.includes("triangles")) {
    throw new Error("Triangle angle bisectors require the triangle construction layer.");
  }
  if (constructionLayers.includes("triangle-angle-bisectors") && requests.length !== 1) {
    throw new Error("Triangle angle bisectors require exactly one explicit current triangle request.");
  }
  if (constructionLayers.includes("triangle-altitudes")
    && !constructionLayers.includes("triangles")) {
    throw new Error("Triangle altitudes require the triangle construction layer.");
  }
  if (constructionLayers.includes("triangle-altitudes") && requests.length !== 1) {
    throw new Error("Triangle altitudes require exactly one explicit current triangle request.");
  }
  if (constructionLayers.includes("triangle-centroids")
    && !constructionLayers.includes("triangles")) {
    throw new Error("Triangle centroids require the triangle construction layer.");
  }
  if (constructionLayers.includes("triangle-centroids") && requests.length !== 1) {
    throw new Error("Triangle centroids require exactly one explicit current triangle request.");
  }
  if (!constructionLayers.includes("triangles")) return;
  if (!constructionLayers.includes("support-line-extensions")) {
    throw new Error("Triangles require the support-line extension layer.");
  }
  const confirmed = new Set(confirmedVisualGuideCandidateIds);
  for (const request of requests) {
    for (const vertex of request.vertices) {
      if (vertex.parent.kind === "observed-line-endpoint") {
        if (!confirmed.has(vertex.parent.candidateId)) {
          throw new Error("Triangle observed endpoint parents must remain explicitly confirmed visual guides.");
        }
        continue;
      }
      if (!constructionLayers.includes("junction-angles")) {
        throw new Error("Triangle junction parents require the junction-angle layer.");
      }
      for (const participant of vertex.parent.participants) {
        if (participant.kind === "support-line-extension"
          && !confirmed.has(participant.candidateId)) {
          throw new Error("Triangle support-line parents must remain explicitly confirmed visual guides.");
        }
        if (participant.kind === "format-diagonal"
          && !constructionLayers.includes("format-diagonals")) {
          throw new Error("Triangle format-diagonal parents require the format-diagonal layer.");
        }
      }
    }
  }
}

function validateCandidates(
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
  expectedSourceImageReferenceIdentity?: string,
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
    const sourceBoundKeys = [...expectedKeys, "sourceImageReferenceIdentity"].sort().join("|");
    const sourceBoundPrimitiveKeys = [
      ...expectedKeys,
      "primitive",
      "sourceImageReferenceIdentity",
    ].sort().join("|");
    if (![legacyKeys, primitiveKeys, sourceBoundKeys, sourceBoundPrimitiveKeys]
      .includes(candidateKeys.join("|"))) {
      throw new Error(`Visual harmony candidate ${String(index)} must use exact fields.`);
    }
    if (candidateValue.sourceImageReferenceIdentity !== undefined
      && (expectedSourceImageReferenceIdentity === undefined
        || candidateValue.sourceImageReferenceIdentity !== expectedSourceImageReferenceIdentity)) {
      throw new Error(`Visual harmony candidate ${String(index)} belongs to a different source image.`);
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
      ...(candidateValue.sourceImageReferenceIdentity === undefined
        ? {}
        : { sourceImageReferenceIdentity: candidateValue.sourceImageReferenceIdentity }),
    };
  });
}

function canonicalBoundsForPrimitive(
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  primitive: PersonalVisualHarmonyPrimitiveV1 | undefined,
): Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height"> {
  if (primitive?.kind === "segment" || primitive?.kind === "axis") {
    return {
      x: canonicalNumber(Math.min(primitive.start.x, primitive.end.x)),
      y: canonicalNumber(Math.min(primitive.start.y, primitive.end.y)),
      width: canonicalNumber(Math.abs(primitive.end.x - primitive.start.x)),
      height: canonicalNumber(Math.abs(primitive.end.y - primitive.start.y)),
    };
  }
  if (primitive?.kind === "ellipse") {
    const { halfWidth, halfHeight } = rotatedEllipseNormalizedHalfExtents(primitive);
    const minX = Math.max(0, primitive.center.x - halfWidth);
    const minY = Math.max(0, primitive.center.y - halfHeight);
    const maxX = Math.min(1, primitive.center.x + halfWidth);
    const maxY = Math.min(1, primitive.center.y + halfHeight);
    return {
      x: canonicalNumber(minX),
      y: canonicalNumber(minY),
      width: canonicalNumber(maxX - minX),
      height: canonicalNumber(maxY - minY),
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

function rotatedEllipseNormalizedHalfExtents(
  primitive: Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "ellipse" }>,
): { readonly halfWidth: number; readonly halfHeight: number } {
  const rotationRadians = (primitive.rotationDegrees ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  return {
    halfWidth: Math.hypot(primitive.radiusX * cos, primitive.radiusY * sin),
    halfHeight: Math.hypot(primitive.radiusX * sin, primitive.radiusY * cos),
  };
}

function ellipsePerimeterIntersectsImageFrame(
  primitive: Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "ellipse" }>,
): boolean {
  const rotationRadians = (primitive.rotationDegrees ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ].some((corner) => {
    const dx = corner.x - primitive.center.x;
    const dy = corner.y - primitive.center.y;
    const localX = (dx * cos) + (dy * sin);
    const localY = (-dx * sin) + (dy * cos);
    const ellipseValue = ((localX / primitive.radiusX) ** 2)
      + ((localY / primitive.radiusY) ** 2);
    return ellipseValue >= 1 - 1e-12;
  });
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
  const ellipseFields = Object.keys(value).sort().join("|");
  if (ellipseFields !== "center|kind|radiusX|radiusY"
    && ellipseFields !== "center|kind|radiusX|radiusY|rotationDegrees") {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse primitive must use exact fields.`);
  }
  const center = validatePrimitivePoint(value.center, `candidates.${String(candidateIndex)}.primitive.center`);
  if (!Number.isFinite(value.radiusX) || !Number.isFinite(value.radiusY)
    || value.radiusX <= 0 || value.radiusY <= 0
    || value.radiusX > 1 || value.radiusY > 1) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse radii must be finite and within (0, 1].`);
  }
  let canonical: Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "ellipse" }>;
  if (value.rotationDegrees === undefined) {
    canonical = {
      kind: "ellipse",
      center,
      radiusX: canonicalNumber(value.radiusX),
      radiusY: canonicalNumber(value.radiusY),
    };
  } else {
    const rotated = canonicalizePersonalVisualHarmonyRotatedEllipseV1({
      kind: "ellipse",
      center,
      radiusX: value.radiusX,
      radiusY: value.radiusY,
      rotationDegrees: value.rotationDegrees,
    });
    if (rotated === null) {
      throw new Error(`Visual harmony candidate ${String(candidateIndex)} rotated ellipse must use finite non-degenerate geometry.`);
    }
    canonical = rotated;
  }
  if (!ellipsePerimeterIntersectsImageFrame(canonical)) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} ellipse perimeter must intersect the image.`);
  }
  return canonical;
}

/**
 * Canonicalizes an explicitly oriented ellipse without assigning it source or
 * Core authority. This package-private module export is shared by deterministic
 * image-plane consumers; it is intentionally absent from the package root.
 */
export function canonicalizePersonalVisualHarmonyRotatedEllipseV1(
  value: Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "ellipse" }> & {
    readonly rotationDegrees: number;
  },
): Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "ellipse" }> | null {
  if (value === null || typeof value !== "object"
    || !Number.isFinite(value.center?.x) || !Number.isFinite(value.center?.y)
    || !Number.isFinite(value.radiusX) || !Number.isFinite(value.radiusY)
    || !Number.isFinite(value.rotationDegrees)
    || value.radiusX <= 1e-9 || value.radiusY <= 1e-9) {
    return null;
  }
  let radiusX = canonicalNumber(value.radiusX);
  let radiusY = canonicalNumber(value.radiusY);
  let rotationDegrees = normalizeEllipseRotationDegrees(value.rotationDegrees);
  const nearCircle = Math.abs(radiusX - radiusY) <= 1e-9 * Math.max(radiusX, radiusY);
  if (nearCircle) {
    [radiusX, radiusY] = [Math.max(radiusX, radiusY), Math.min(radiusX, radiusY)];
    rotationDegrees = 0;
  } else if (radiusX < radiusY) {
    [radiusX, radiusY] = [radiusY, radiusX];
    rotationDegrees = normalizeEllipseRotationDegrees(rotationDegrees + 90);
  }
  return {
    kind: "ellipse",
    center: {
      x: canonicalNumber(value.center.x),
      y: canonicalNumber(value.center.y),
    },
    radiusX,
    radiusY,
    ...(rotationDegrees === 0 ? {} : { rotationDegrees }),
  };
}

function normalizeEllipseRotationDegrees(value: number): number {
  const normalized = normalizeUndirectedAngleDegrees(value);
  return normalized === 180 ? 0 : normalized;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return Object.keys(value).sort().join("|") === [...fields].sort().join("|");
}

function requirePositiveRectangleBounds(
  bounds: Pick<PersonalVisualHarmonyCandidateInputV1, "x" | "y" | "width" | "height">,
  candidateIndex: number,
): void {
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`Visual harmony candidate ${String(candidateIndex)} rectangle must have positive normalized bounds.`);
  }
}

function normalizeSelectedCandidateIds(
  prepared: PersonalVisualHarmonyPreparedCandidateSet,
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
  prepared: PersonalVisualHarmonyPreparedCandidateSet,
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
  showSupportLineExtensions: boolean,
): string {
  const primitive = candidate.primitive;
  const strokeWidth = selected ? "7" : "4";
  if (primitive?.kind === "segment" || primitive?.kind === "axis") {
    const support = extendLineToUnitSquare(primitive.start, primitive.end);
    const dash = primitive.kind === "axis" ? "20 12" : "none";
    return [
      `<line data-supporting-line data-construction-layer="support-line-extensions" data-provenance="derived-construction" x1="${numberAttr(support.start.x * 1000)}" y1="${numberAttr(support.start.y * 1000)}" x2="${numberAttr(support.end.x * 1000)}" y2="${numberAttr(support.end.y * 1000)}" stroke="${color}" stroke-width="3" stroke-dasharray="10 14" stroke-opacity="0.58"${showSupportLineExtensions ? "" : ` style="display:none"`}/>`,
      `<line data-candidate-shape data-provenance="observed" x1="${numberAttr(primitive.start.x * 1000)}" y1="${numberAttr(primitive.start.y * 1000)}" x2="${numberAttr(primitive.end.x * 1000)}" y2="${numberAttr(primitive.end.y * 1000)}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" stroke-linecap="round"/>`,
    ].join("");
  }
  if (primitive?.kind === "quadrilateral") {
    const points = primitive.vertices
      .map(({ x, y }) => `${numberAttr(x * 1000)},${numberAttr(y * 1000)}`)
      .join(" ");
    return `<polygon data-candidate-shape data-candidate-polygon points="${points}" fill="${color}" fill-opacity="${selected ? "0.14" : "0.06"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
  }
  if (primitive?.kind === "ellipse") {
    const centerX = numberAttr(primitive.center.x * 1000);
    const centerY = numberAttr(primitive.center.y * 1000);
    const rotation = primitive.rotationDegrees === undefined
      ? ""
      : ` data-ellipse-orientation-degrees="${numberAttr(primitive.rotationDegrees)}" transform="rotate(${numberAttr(primitive.rotationDegrees)} ${centerX} ${centerY})"`;
    return `<ellipse data-candidate-shape cx="${centerX}" cy="${centerY}" rx="${numberAttr(primitive.radiusX * 1000)}" ry="${numberAttr(primitive.radiusY * 1000)}"${rotation} fill="${color}" fill-opacity="${selected ? "0.12" : "0.05"}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${selected ? "none" : "14 10"}"/>`;
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

function editableCandidateHandleBoxes(
  candidates: readonly PersonalVisualHarmonyCandidateInputV1[],
): readonly PersonalVisualHarmonyLabelLayoutBoxV1[] {
  const pointBox = (point: PersonalVisualHarmonyPointV1) => ({
    x: (point.x * 1000) - 15,
    y: (point.y * 1000) - 15,
    width: 30,
    height: 30,
  });
  return candidates.flatMap((candidate) => {
    const primitive = candidate.primitive;
    if (primitive?.kind === "segment" || primitive?.kind === "axis") {
      return [pointBox(primitive.start), pointBox(primitive.end)];
    }
    if (primitive?.kind === "quadrilateral") {
      return primitive.vertices.map(pointBox);
    }
    if (primitive?.kind === "ellipse") return [];
    return [{
      x: ((candidate.x + candidate.width) * 1000) - 16,
      y: ((candidate.y + candidate.height) * 1000) - 16,
      width: 32,
      height: 32,
    }];
  });
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

export * from "./personal-visual-harmony-perception.js";

function identityToken(identity: string): string {
  if (!SHA256_PATTERN.test(identity)) throw new Error("Identity must be a SHA-256 content identity.");
  return identity.slice("sha256:".length);
}
