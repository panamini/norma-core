import { createHash } from "node:crypto";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const PERSONAL_VISUAL_HARMONY_CONSTRUCTION_ANALYSIS_CONTRACT_ID =
  "norma.personal-visual-harmony-construction-analysis@1" as const;

export const PERSONAL_VISUAL_HARMONY_CONSTRUCTION_LAYERS = [
  "support-line-extensions",
  "format-diagonals",
  "junction-angles",
  "triangles",
  "triangle-medians",
  "triangle-perpendicular-bisectors",
  "triangle-angle-bisectors",
  "triangle-altitudes",
] as const;

export type PersonalVisualHarmonyConstructionLayerV1 =
  typeof PERSONAL_VISUAL_HARMONY_CONSTRUCTION_LAYERS[number];

export interface PersonalVisualHarmonyConstructionPointV1 {
  readonly x: number;
  readonly y: number;
}

export interface PersonalVisualHarmonyConstructionFrameV1 {
  readonly frameId: string;
  readonly kind: "confirmed-image-boundary" | "confirmed-rectangle" | "confirmed-quadrilateral";
  readonly vertices: readonly [
    PersonalVisualHarmonyConstructionPointV1,
    PersonalVisualHarmonyConstructionPointV1,
    PersonalVisualHarmonyConstructionPointV1,
    PersonalVisualHarmonyConstructionPointV1,
  ];
}

export interface PersonalVisualHarmonyObservedLineInputV1 {
  readonly candidateId: string;
  readonly label: string;
  readonly primitiveKind: "segment" | "axis" | "quadrilateral-side";
  readonly start: PersonalVisualHarmonyConstructionPointV1;
  readonly end: PersonalVisualHarmonyConstructionPointV1;
  readonly quadrilateralSideIndex?: 0 | 1 | 2 | 3;
}

export interface PersonalVisualHarmonyObservedLineV1 {
  readonly observedLineId: string;
  readonly kind: "observed-line-segment";
  readonly candidateId: string;
  readonly label: string;
  readonly primitiveKind: "segment" | "axis" | "quadrilateral-side";
  readonly quadrilateralSideIndex?: 0 | 1 | 2 | 3;
  readonly start: PersonalVisualHarmonyConstructionPointV1;
  readonly end: PersonalVisualHarmonyConstructionPointV1;
  readonly provenance: "observed";
  readonly confirmation: "user-confirmed";
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyFrameEdgeContactV1 {
  readonly point: PersonalVisualHarmonyConstructionPointV1;
  readonly frameEdgeIndices: readonly number[];
  readonly positionOnClippedLine: 0 | 1;
}

export interface PersonalVisualHarmonySupportLineExtensionV1 {
  readonly constructionId: string;
  readonly kind: "support-line-extension";
  readonly observedLineId: string;
  readonly clippedStart: PersonalVisualHarmonyConstructionPointV1;
  readonly clippedEnd: PersonalVisualHarmonyConstructionPointV1;
  readonly frameEdgeContacts: readonly [
    PersonalVisualHarmonyFrameEdgeContactV1,
    PersonalVisualHarmonyFrameEdgeContactV1,
  ];
  readonly angleDegrees: number;
  readonly provenance: "derived-construction";
  readonly derivation: "infinite_supporting_line_from_user_confirmed_observed_endpoints";
  readonly clipping: "confirmed_frame_only";
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyFormatDiagonalV1 {
  readonly constructionId: string;
  readonly kind: "format-diagonal";
  readonly diagonal: "vertex-0-to-2" | "vertex-1-to-3";
  readonly start: PersonalVisualHarmonyConstructionPointV1;
  readonly end: PersonalVisualHarmonyConstructionPointV1;
  readonly angleDegrees: number;
  readonly provenance: "derived-construction";
  readonly derivation: "opposite_vertices_of_user_confirmed_frame";
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonySupportLineDiagonalRelationV1 {
  readonly relationId: string;
  readonly kind: "support-line-format-diagonal-relation";
  readonly supportLineConstructionId: string;
  readonly formatDiagonalConstructionId: string;
  readonly status: "intersection_within_frame" | "no_intersection_within_frame" | "coincident" | "parallel";
  readonly intersection: PersonalVisualHarmonyConstructionPointV1 | null;
  readonly normalizedSupportLinePosition: number | null;
  readonly normalizedFormatDiagonalPosition: number | null;
  readonly provenance: "derived-construction";
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyJunctionParticipantV1 {
  readonly constructionId: string;
  readonly kind: "support-line-extension" | "format-diagonal" | "frame-edge";
  readonly provenance: "derived-construction" | "user-confirmed-frame";
  readonly sourceObservedLineId: string | null;
  readonly intersectionWithinObservedExtent: boolean | null;
}

export interface PersonalVisualHarmonyJunctionAngleV1 {
  readonly junctionId: string;
  readonly kind: "junction-angle";
  readonly junctionKind:
    | "support-line-support-line"
    | "support-line-format-diagonal"
    | "format-diagonal-format-diagonal"
    | "support-line-frame-edge"
    | "format-diagonal-frame-edge";
  readonly intersection: PersonalVisualHarmonyConstructionPointV1;
  readonly firstParticipant: PersonalVisualHarmonyJunctionParticipantV1;
  readonly secondParticipant: PersonalVisualHarmonyJunctionParticipantV1;
  readonly smallerAngleDegrees: number;
  readonly supplementaryAngleDegrees: number;
  readonly angleConvention: "projected_image_plane_smaller_and_supplementary";
  readonly provenance: "derived-measurement";
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export type PersonalVisualHarmonyTriangleParticipantReferenceV1 =
  | {
    readonly kind: "support-line-extension";
    readonly candidateId: string;
  }
  | {
    readonly kind: "format-diagonal";
    readonly diagonal: "vertex-0-to-2" | "vertex-1-to-3";
  }
  | {
    readonly kind: "frame-edge";
    readonly frameEdgeIndex: 0 | 1 | 2 | 3;
  };

export type PersonalVisualHarmonyTriangleVertexParentInputV1 =
  | {
    readonly kind: "observed-line-endpoint";
    readonly candidateId: string;
    readonly endpoint: "start" | "end";
  }
  | {
    readonly kind: "junction-intersection";
    readonly participants: readonly [
      PersonalVisualHarmonyTriangleParticipantReferenceV1,
      PersonalVisualHarmonyTriangleParticipantReferenceV1,
    ];
  };

export interface PersonalVisualHarmonyTriangleVertexInputV1 {
  readonly point: PersonalVisualHarmonyConstructionPointV1;
  readonly parent: PersonalVisualHarmonyTriangleVertexParentInputV1;
}

export interface PersonalVisualHarmonyTriangleRequestInputV1 {
  readonly requestId: string;
  readonly vertices: readonly [
    PersonalVisualHarmonyTriangleVertexInputV1,
    PersonalVisualHarmonyTriangleVertexInputV1,
    PersonalVisualHarmonyTriangleVertexInputV1,
  ];
}

export type PersonalVisualHarmonyTriangleVertexParentV1 =
  | {
    readonly kind: "observed-line-endpoint";
    readonly parentId: string;
    readonly candidateId: string;
    readonly endpoint: "start" | "end";
    readonly provenance: "user-confirmed-observed-endpoint";
  }
  | {
    readonly kind: "junction-intersection";
    readonly parentId: string;
    readonly participantConstructionIds: readonly [string, string];
    readonly provenance: "derived-junction-intersection";
  };

export interface PersonalVisualHarmonyTriangleVertexV1 {
  readonly point: PersonalVisualHarmonyConstructionPointV1;
  readonly parent: PersonalVisualHarmonyTriangleVertexParentV1;
}

export interface PersonalVisualHarmonyTriangleConstructionV1 {
  readonly triangleId: string;
  readonly kind: "triangle-construction";
  readonly requestId: string;
  readonly vertices: readonly [
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
  ];
  readonly winding: "clockwise_image_plane";
  readonly signedNormalizedArea: number;
  readonly absoluteNormalizedArea: number;
  readonly areaToleranceNormalized: number;
  readonly sideLengthsPixels: readonly [number, number, number];
  readonly interiorAnglesDegrees: readonly [number, number, number];
  readonly angleConvention: "projected_image_plane_interior";
  readonly provenance: "derived-construction";
  readonly derivation: "three_explicit_parented_vertices";
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyTriangleMedianV1 {
  readonly medianId: string;
  readonly kind: "triangle-median";
  readonly triangleId: string;
  readonly vertexIndex: 0 | 1 | 2;
  readonly vertex: PersonalVisualHarmonyConstructionPointV1;
  readonly vertexParent: PersonalVisualHarmonyTriangleVertexParentV1;
  readonly oppositeSideVertexIndices: readonly [0 | 1 | 2, 0 | 1 | 2];
  readonly oppositeSideVertices: readonly [
    PersonalVisualHarmonyConstructionPointV1,
    PersonalVisualHarmonyConstructionPointV1,
  ];
  readonly oppositeSideParents: readonly [
    PersonalVisualHarmonyTriangleVertexParentV1,
    PersonalVisualHarmonyTriangleVertexParentV1,
  ];
  readonly midpoint: PersonalVisualHarmonyConstructionPointV1;
  readonly lengthPixels: number;
  readonly provenance: "derived-construction";
  readonly derivation: "canonical_triangle_vertex_to_opposite_side_midpoint";
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyTrianglePerpendicularBisectorV1 {
  readonly bisectorId: string;
  readonly kind: "triangle-perpendicular-bisector";
  readonly triangleId: string;
  readonly sideIndex: 0 | 1 | 2;
  readonly sideVertexIndices: readonly [0 | 1 | 2, 0 | 1 | 2];
  readonly sideVertices: readonly [PersonalVisualHarmonyConstructionPointV1, PersonalVisualHarmonyConstructionPointV1];
  readonly sideParents: readonly [PersonalVisualHarmonyTriangleVertexParentV1, PersonalVisualHarmonyTriangleVertexParentV1];
  readonly midpoint: PersonalVisualHarmonyConstructionPointV1;
  readonly supportLineStart: PersonalVisualHarmonyConstructionPointV1;
  readonly supportLineEnd: PersonalVisualHarmonyConstructionPointV1;
  readonly clippedStart: PersonalVisualHarmonyConstructionPointV1;
  readonly clippedEnd: PersonalVisualHarmonyConstructionPointV1;
  readonly angleDegrees: number;
  readonly provenance: "derived-construction";
  readonly derivation: "canonical_triangle_side_perpendicular_bisector";
  readonly clipping: "confirmed_frame_only";
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyTriangleAngleBisectorV1 {
  readonly bisectorId: string;
  readonly kind: "triangle-angle-bisector";
  readonly triangleId: string;
  readonly vertexIndex: 0 | 1 | 2;
  readonly vertex: PersonalVisualHarmonyConstructionPointV1;
  readonly vertexParent: PersonalVisualHarmonyTriangleVertexParentV1;
  readonly oppositeSideVertexIndices: readonly [0 | 1 | 2, 0 | 1 | 2];
  readonly oppositeSideParents: readonly [PersonalVisualHarmonyTriangleVertexParentV1, PersonalVisualHarmonyTriangleVertexParentV1];
  readonly oppositeSideIntersection: PersonalVisualHarmonyConstructionPointV1;
  readonly lengthPixels: number;
  readonly angleToleranceDegrees: number;
  readonly provenance: "derived-construction";
  readonly derivation: "canonical_triangle_internal_angle_bisector";
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyTriangleAltitudeV1 {
  readonly altitudeId: string;
  readonly kind: "triangle-altitude";
  readonly triangleId: string;
  readonly vertexIndex: 0 | 1 | 2;
  readonly vertex: PersonalVisualHarmonyConstructionPointV1;
  readonly vertexParent: PersonalVisualHarmonyTriangleVertexParentV1;
  readonly oppositeSideVertexIndices: readonly [0 | 1 | 2, 0 | 1 | 2];
  readonly oppositeSideVertices: readonly [
    PersonalVisualHarmonyConstructionPointV1,
    PersonalVisualHarmonyConstructionPointV1,
  ];
  readonly oppositeSideParents: readonly [
    PersonalVisualHarmonyTriangleVertexParentV1,
    PersonalVisualHarmonyTriangleVertexParentV1,
  ];
  readonly foot: PersonalVisualHarmonyConstructionPointV1;
  readonly footPositionOnOppositeSideSupport: number;
  readonly footWithinOppositeSideSegment: boolean;
  readonly supportLineStart: PersonalVisualHarmonyConstructionPointV1;
  readonly supportLineEnd: PersonalVisualHarmonyConstructionPointV1;
  readonly clippedStart: PersonalVisualHarmonyConstructionPointV1;
  readonly clippedEnd: PersonalVisualHarmonyConstructionPointV1;
  readonly lengthPixels: number;
  readonly angleDegrees: number;
  readonly provenance: "derived-construction";
  readonly derivation: "canonical_triangle_vertex_perpendicular_to_opposite_side_support";
  readonly clipping: "confirmed_frame_only";
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly coreAuthority: false;
}

export interface PersonalVisualHarmonyConstructionAnalysisV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_CONSTRUCTION_ANALYSIS_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "completed";
  readonly enabledLayers: readonly PersonalVisualHarmonyConstructionLayerV1[];
  readonly coordinateSpace: "image_plane_pixels_v1";
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly frame: PersonalVisualHarmonyConstructionFrameV1 & {
    readonly provenance: "user-confirmed";
    readonly sourceTruth: false;
    readonly coreAuthority: false;
  };
  readonly observedLines: readonly PersonalVisualHarmonyObservedLineV1[];
  readonly supportLineExtensions: readonly PersonalVisualHarmonySupportLineExtensionV1[];
  readonly formatDiagonals: readonly PersonalVisualHarmonyFormatDiagonalV1[];
  readonly relations: readonly PersonalVisualHarmonySupportLineDiagonalRelationV1[];
  readonly junctionAngles?: readonly PersonalVisualHarmonyJunctionAngleV1[];
  readonly triangles?: readonly PersonalVisualHarmonyTriangleConstructionV1[];
  readonly triangleMedians?: readonly PersonalVisualHarmonyTriangleMedianV1[];
  readonly trianglePerpendicularBisectors?: readonly PersonalVisualHarmonyTrianglePerpendicularBisectorV1[];
  readonly triangleAngleBisectors?: readonly PersonalVisualHarmonyTriangleAngleBisectorV1[];
  readonly triangleAltitudes?: readonly PersonalVisualHarmonyTriangleAltitudeV1[];
  readonly boundaryToleranceNormalized: number;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly automaticAcceptance: false;
  readonly explicitUserConfirmationRequired: true;
  readonly coreRun: false;
  readonly limits: {
    readonly imagePlaneOnly: true;
    readonly noWorldSpaceMetricClaim: true;
    readonly noHarmonicRatioClaim: true;
    readonly noIntentInference: true;
    readonly noVanishingPointInference: true;
  };
  readonly contentIdentity: string;
}

const BOUNDARY_TOLERANCE_NORMALIZED = 1e-9;
const TRIANGLE_ANGLE_BISECTOR_TOLERANCE_DEGREES = 1e-7;
export const PERSONAL_VISUAL_HARMONY_TRIANGLE_AREA_TOLERANCE_NORMALIZED = 1e-9;
export const PERSONAL_VISUAL_HARMONY_MAX_TRIANGLE_REQUESTS = 4;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

interface ClippedContact {
  readonly point: PersonalVisualHarmonyConstructionPointV1;
  readonly scale: number;
  readonly frameEdgeIndices: readonly number[];
}

interface BoundedConstructionLine {
  readonly constructionId: string;
  readonly kind: PersonalVisualHarmonyJunctionParticipantV1["kind"];
  readonly start: PersonalVisualHarmonyConstructionPointV1;
  readonly end: PersonalVisualHarmonyConstructionPointV1;
  readonly provenance: PersonalVisualHarmonyJunctionParticipantV1["provenance"];
  readonly sourceObservedLineId: string | null;
  readonly observedStart: PersonalVisualHarmonyConstructionPointV1 | null;
  readonly observedEnd: PersonalVisualHarmonyConstructionPointV1 | null;
}

interface BoundedLineIntersection {
  readonly status: "intersection" | "no_intersection" | "coincident" | "parallel";
  readonly intersection: PersonalVisualHarmonyConstructionPointV1 | null;
  readonly firstPosition: number | null;
  readonly secondPosition: number | null;
}

/**
 * Creates optional image-plane constructions without promoting them to observed
 * geometry or Core input. The input frame and observed extents are never mutated.
 */
export function analyzePersonalVisualHarmonyConstructionsV1(input: {
  readonly enabledLayers: readonly PersonalVisualHarmonyConstructionLayerV1[];
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly frame: PersonalVisualHarmonyConstructionFrameV1;
  readonly observedLines: readonly PersonalVisualHarmonyObservedLineInputV1[];
  readonly triangleRequests?: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
}): PersonalVisualHarmonyConstructionAnalysisV1 {
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const enabledLayers = normalizeLayers(input.enabledLayers);
  const frame = validateFrame(input.frame);
  const observedLineInputs = validateObservedLines(input.observedLines);
  const triangleRequests = normalizePersonalVisualHarmonyTriangleRequestsV1(
    input.triangleRequests ?? [],
  );
  const supportLayerEnabled = enabledLayers.includes("support-line-extensions");
  const diagonalLayerEnabled = enabledLayers.includes("format-diagonals");
  const observedLines = supportLayerEnabled
    ? observedLineInputs.map(createObservedLine)
    : [];
  const supportLineExtensions = observedLines.map((observedLine) => createSupportLine(
    observedLine,
    frame,
    input.sourcePixelWidth,
    input.sourcePixelHeight,
  ));
  const formatDiagonals = diagonalLayerEnabled
    ? createFormatDiagonals(frame, input.sourcePixelWidth, input.sourcePixelHeight)
    : [];
  const relations = supportLineExtensions.flatMap((supportLine) => formatDiagonals.map((diagonal) => (
    createSupportLineDiagonalRelation(supportLine, diagonal)
  )));
  const junctionLayerEnabled = enabledLayers.includes("junction-angles");
  const junctionAngles = junctionLayerEnabled
    ? createJunctionAngles(
      observedLines,
      supportLineExtensions,
      formatDiagonals,
      frame,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    )
    : [];
  const triangleLayerEnabled = enabledLayers.includes("triangles");
  const triangles = triangleLayerEnabled
    ? constructPersonalVisualHarmonyTrianglesV1({
      requests: triangleRequests,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
      frame,
      observedLines,
      supportLineExtensions,
      formatDiagonals,
      junctionAngles,
    })
    : [];
  const triangleMedianLayerEnabled = enabledLayers.includes("triangle-medians");
  const triangleMedians = triangleMedianLayerEnabled
    ? constructPersonalVisualHarmonyTriangleMediansV1({
      triangles,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
    })
    : [];
  const trianglePerpendicularBisectorLayerEnabled = enabledLayers.includes("triangle-perpendicular-bisectors");
  const trianglePerpendicularBisectors = trianglePerpendicularBisectorLayerEnabled
    ? constructPersonalVisualHarmonyTrianglePerpendicularBisectorsV1({
      triangles,
      frame,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
    })
    : [];
  const triangleAngleBisectorLayerEnabled = enabledLayers.includes("triangle-angle-bisectors");
  const triangleAngleBisectors = triangleAngleBisectorLayerEnabled
    ? constructPersonalVisualHarmonyTriangleAngleBisectorsV1({ triangles, sourcePixelWidth: input.sourcePixelWidth, sourcePixelHeight: input.sourcePixelHeight })
    : [];
  const triangleAltitudeLayerEnabled = enabledLayers.includes("triangle-altitudes");
  const triangleAltitudes = triangleAltitudeLayerEnabled
    ? constructPersonalVisualHarmonyTriangleAltitudesV1({
      triangles,
      frame,
      sourcePixelWidth: input.sourcePixelWidth,
      sourcePixelHeight: input.sourcePixelHeight,
    })
    : [];
  const withoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_CONSTRUCTION_ANALYSIS_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "completed" as const,
    enabledLayers,
    coordinateSpace: "image_plane_pixels_v1" as const,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
    frame: {
      ...frame,
      provenance: "user-confirmed" as const,
      sourceTruth: false as const,
      coreAuthority: false as const,
    },
    observedLines,
    supportLineExtensions,
    formatDiagonals,
    relations,
    ...(junctionLayerEnabled ? { junctionAngles } : {}),
    ...(triangleLayerEnabled ? { triangles } : {}),
    ...(triangleMedianLayerEnabled ? { triangleMedians } : {}),
    ...(trianglePerpendicularBisectorLayerEnabled ? { trianglePerpendicularBisectors } : {}),
    ...(triangleAngleBisectorLayerEnabled ? { triangleAngleBisectors } : {}),
    ...(triangleAltitudeLayerEnabled ? { triangleAltitudes } : {}),
    boundaryToleranceNormalized: BOUNDARY_TOLERANCE_NORMALIZED,
    candidateEvidenceOnly: true as const,
    sourceTruth: false as const,
    automaticAcceptance: false as const,
    explicitUserConfirmationRequired: true as const,
    coreRun: false as const,
    limits: {
      imagePlaneOnly: true as const,
      noWorldSpaceMetricClaim: true as const,
      noHarmonicRatioClaim: true as const,
      noIntentInference: true as const,
      noVanishingPointInference: true as const,
    },
  };
  return {
    ...withoutIdentity,
    contentIdentity: contentIdentityFor(withoutIdentity),
  };
}

function normalizeLayers(
  values: readonly PersonalVisualHarmonyConstructionLayerV1[],
): readonly PersonalVisualHarmonyConstructionLayerV1[] {
  if (!Array.isArray(values) || values.length > PERSONAL_VISUAL_HARMONY_CONSTRUCTION_LAYERS.length) {
    throw new Error("Construction layers must be a bounded array.");
  }
  const unique = new Set<PersonalVisualHarmonyConstructionLayerV1>();
  for (const value of values) {
    if (!PERSONAL_VISUAL_HARMONY_CONSTRUCTION_LAYERS.includes(value) || unique.has(value)) {
      throw new Error("Construction layers must be unique supported values.");
    }
    unique.add(value);
  }
  if (unique.has("junction-angles") && !unique.has("support-line-extensions")) {
    throw new Error("Junction angles require the support-line extension layer.");
  }
  if (unique.has("triangles") && !unique.has("support-line-extensions")) {
    throw new Error("Triangles require the support-line extension layer.");
  }
  if (unique.has("triangle-medians") && !unique.has("triangles")) {
    throw new Error("Triangle medians require the triangle construction layer.");
  }
  if (unique.has("triangle-perpendicular-bisectors") && !unique.has("triangles")) {
    throw new Error("Triangle perpendicular bisectors require the triangle construction layer.");
  }
  if (unique.has("triangle-angle-bisectors") && !unique.has("triangles")) {
    throw new Error("Triangle angle bisectors require the triangle construction layer.");
  }
  if (unique.has("triangle-altitudes") && !unique.has("triangles")) {
    throw new Error("Triangle altitudes require the triangle construction layer.");
  }
  return PERSONAL_VISUAL_HARMONY_CONSTRUCTION_LAYERS.filter((value) => unique.has(value));
}

export function normalizePersonalVisualHarmonyTriangleRequestsV1(
  requests: readonly PersonalVisualHarmonyTriangleRequestInputV1[],
): readonly PersonalVisualHarmonyTriangleRequestInputV1[] {
  if (!Array.isArray(requests) || requests.length > PERSONAL_VISUAL_HARMONY_MAX_TRIANGLE_REQUESTS) {
    throw new Error("Triangle construction requests must be a bounded array.");
  }
  const requestIds = new Set<string>();
  const normalized = requests.map((request, requestIndex) => {
    if (request === null || typeof request !== "object" || !ID_PATTERN.test(request.requestId)
      || !Array.isArray(request.vertices) || request.vertices.length !== 3) {
      throw new Error(`Triangle construction request ${String(requestIndex)} is invalid.`);
    }
    if (requestIds.has(request.requestId)) {
      throw new Error("Triangle construction request ids must be unique.");
    }
    requestIds.add(request.requestId);
    const vertices = request.vertices.map((
      vertex: PersonalVisualHarmonyTriangleVertexInputV1,
      vertexIndex: number,
    ) => normalizeTriangleVertexInput(
      vertex,
      `triangleRequests.${String(requestIndex)}.vertices.${String(vertexIndex)}`,
    )).sort((
      first: PersonalVisualHarmonyTriangleVertexInputV1,
      second: PersonalVisualHarmonyTriangleVertexInputV1,
    ) => stringCompare(
      triangleVertexInputKey(first),
      triangleVertexInputKey(second),
    ));
    return {
      requestId: request.requestId,
      vertices: [vertices[0]!, vertices[1]!, vertices[2]!] as const,
    };
  });
  return normalized.sort((first, second) => stringCompare(first.requestId, second.requestId));
}

function normalizeTriangleVertexInput(
  vertex: PersonalVisualHarmonyTriangleVertexInputV1,
  field: string,
): PersonalVisualHarmonyTriangleVertexInputV1 {
  if (vertex === null || typeof vertex !== "object"
    || Object.keys(vertex).sort().join("|") !== "parent|point") {
    throw new Error(`${field} must contain exactly point and parent.`);
  }
  const point = validateTrianglePoint(vertex.point, `${field}.point`);
  const parent = normalizeTriangleVertexParentInput(vertex.parent, `${field}.parent`);
  return { point, parent };
}

function normalizeTriangleVertexParentInput(
  parent: PersonalVisualHarmonyTriangleVertexParentInputV1,
  field: string,
): PersonalVisualHarmonyTriangleVertexParentInputV1 {
  if (parent === null || typeof parent !== "object") {
    throw new Error(`${field} must be a supported parent reference.`);
  }
  if (parent.kind === "observed-line-endpoint") {
    if (Object.keys(parent).sort().join("|") !== "candidateId|endpoint|kind"
      || !ID_PATTERN.test(parent.candidateId)
      || !["start", "end"].includes(parent.endpoint)) {
      throw new Error(`${field} observed endpoint reference is invalid.`);
    }
    return {
      kind: "observed-line-endpoint",
      candidateId: parent.candidateId,
      endpoint: parent.endpoint,
    };
  }
  if (parent.kind !== "junction-intersection"
    || Object.keys(parent).sort().join("|") !== "kind|participants"
    || !Array.isArray(parent.participants) || parent.participants.length !== 2) {
    throw new Error(`${field} junction reference is invalid.`);
  }
  const participants = parent.participants
    .map((participant, index) => normalizeTriangleParticipantReference(
      participant,
      `${field}.participants.${String(index)}`,
    ))
    .sort((first, second) => stringCompare(
      triangleParticipantReferenceKey(first),
      triangleParticipantReferenceKey(second),
    ));
  if (triangleParticipantReferenceKey(participants[0]!)
    === triangleParticipantReferenceKey(participants[1]!)) {
    throw new Error(`${field} requires two distinct junction participants.`);
  }
  if (participants.every(({ kind }) => kind === "frame-edge")) {
    throw new Error(`${field} does not support a junction made only from frame edges.`);
  }
  return {
    kind: "junction-intersection",
    participants: [participants[0]!, participants[1]!] as const,
  };
}

function normalizeTriangleParticipantReference(
  participant: PersonalVisualHarmonyTriangleParticipantReferenceV1,
  field: string,
): PersonalVisualHarmonyTriangleParticipantReferenceV1 {
  if (participant === null || typeof participant !== "object") {
    throw new Error(`${field} must be a supported construction participant.`);
  }
  if (participant.kind === "support-line-extension") {
    if (Object.keys(participant).sort().join("|") !== "candidateId|kind"
      || !ID_PATTERN.test(participant.candidateId)) {
      throw new Error(`${field} support-line reference is invalid.`);
    }
    return { kind: participant.kind, candidateId: participant.candidateId };
  }
  if (participant.kind === "format-diagonal") {
    if (Object.keys(participant).sort().join("|") !== "diagonal|kind"
      || !["vertex-0-to-2", "vertex-1-to-3"].includes(participant.diagonal)) {
      throw new Error(`${field} format-diagonal reference is invalid.`);
    }
    return { kind: participant.kind, diagonal: participant.diagonal };
  }
  if (participant.kind === "frame-edge") {
    if (Object.keys(participant).sort().join("|") !== "frameEdgeIndex|kind"
      || ![0, 1, 2, 3].includes(participant.frameEdgeIndex)) {
      throw new Error(`${field} frame-edge reference is invalid.`);
    }
    return { kind: participant.kind, frameEdgeIndex: participant.frameEdgeIndex };
  }
  throw new Error(`${field} must be a supported construction participant.`);
}

function triangleParticipantReferenceKey(
  participant: PersonalVisualHarmonyTriangleParticipantReferenceV1,
): string {
  if (participant.kind === "support-line-extension") {
    return `${participant.kind}:${participant.candidateId}`;
  }
  if (participant.kind === "format-diagonal") {
    return `${participant.kind}:${participant.diagonal}`;
  }
  return `${participant.kind}:${String(participant.frameEdgeIndex)}`;
}

function triangleVertexInputKey(vertex: PersonalVisualHarmonyTriangleVertexInputV1): string {
  const parent = vertex.parent;
  const parentKey = parent.kind === "observed-line-endpoint"
    ? `${parent.kind}:${parent.candidateId}:${parent.endpoint}`
    : `${parent.kind}:${parent.participants.map(triangleParticipantReferenceKey).join("|")}`;
  return `${parentKey}:${vertex.point.x.toFixed(12)}:${vertex.point.y.toFixed(12)}`;
}

function validateFrame(frame: PersonalVisualHarmonyConstructionFrameV1): PersonalVisualHarmonyConstructionFrameV1 {
  if (frame === null || typeof frame !== "object" || !ID_PATTERN.test(frame.frameId)
    || !["confirmed-image-boundary", "confirmed-rectangle", "confirmed-quadrilateral"].includes(frame.kind)
    || !Array.isArray(frame.vertices) || frame.vertices.length !== 4) {
    throw new Error("Construction frame must be a bounded confirmed quadrilateral.");
  }
  const vertices = frame.vertices.map((point, index) => validatePoint(point, `frame.vertices.${String(index)}`));
  const crosses = vertices.map((point, index) => {
    const next = vertices[(index + 1) % 4]!;
    const after = vertices[(index + 2) % 4]!;
    return cross(subtract(next, point), subtract(after, next));
  });
  if (!crosses.every((value) => value > BOUNDARY_TOLERANCE_NORMALIZED)
    && !crosses.every((value) => value < -BOUNDARY_TOLERANCE_NORMALIZED)) {
    throw new Error("Construction frame must be a simple convex quadrilateral.");
  }
  return {
    frameId: frame.frameId,
    kind: frame.kind,
    vertices: [vertices[0]!, vertices[1]!, vertices[2]!, vertices[3]!],
  };
}

function validateObservedLines(
  lines: readonly PersonalVisualHarmonyObservedLineInputV1[],
): readonly PersonalVisualHarmonyObservedLineInputV1[] {
  if (!Array.isArray(lines) || lines.length > 48) {
    throw new Error("Observed construction lines must be a bounded array.");
  }
  const keys = new Set<string>();
  return lines.map((line, index) => {
    if (line === null || typeof line !== "object" || !ID_PATTERN.test(line.candidateId)
      || typeof line.label !== "string" || line.label.length < 1 || line.label.length > 160
      || !["segment", "axis", "quadrilateral-side"].includes(line.primitiveKind)) {
      throw new Error(`Observed construction line ${String(index)} is invalid.`);
    }
    const start = validatePoint(line.start, `observedLines.${String(index)}.start`);
    const end = validatePoint(line.end, `observedLines.${String(index)}.end`);
    if (start.x === end.x && start.y === end.y) {
      throw new Error(`Observed construction line ${String(index)} requires distinct endpoints.`);
    }
    if (line.primitiveKind === "quadrilateral-side") {
      if (line.quadrilateralSideIndex === undefined
        || ![0, 1, 2, 3].includes(line.quadrilateralSideIndex)) {
        throw new Error("Quadrilateral-side evidence requires a bounded side index.");
      }
    } else if (line.quadrilateralSideIndex !== undefined) {
      throw new Error("Only quadrilateral-side evidence may include a side index.");
    }
    const key = `${line.candidateId}\u0000${line.primitiveKind}\u0000${String(line.quadrilateralSideIndex ?? "")}`;
    if (keys.has(key)) throw new Error("Observed construction lines must be unique.");
    keys.add(key);
    return {
      candidateId: line.candidateId,
      label: line.label,
      primitiveKind: line.primitiveKind,
      start,
      end,
      ...(line.quadrilateralSideIndex === undefined
        ? {}
        : { quadrilateralSideIndex: line.quadrilateralSideIndex }),
    };
  });
}

function createObservedLine(
  line: PersonalVisualHarmonyObservedLineInputV1,
): PersonalVisualHarmonyObservedLineV1 {
  const identity = contentIdentityFor({
    kind: "observed-line-segment",
    candidateId: line.candidateId,
    primitiveKind: line.primitiveKind,
    start: line.start,
    end: line.end,
    ...(line.quadrilateralSideIndex === undefined
      ? {}
      : { quadrilateralSideIndex: line.quadrilateralSideIndex }),
  });
  return {
    observedLineId: `observed-line:${identityToken(identity)}`,
    kind: "observed-line-segment",
    candidateId: line.candidateId,
    label: line.label,
    primitiveKind: line.primitiveKind,
    ...(line.quadrilateralSideIndex === undefined
      ? {}
      : { quadrilateralSideIndex: line.quadrilateralSideIndex }),
    start: line.start,
    end: line.end,
    provenance: "observed",
    confirmation: "user-confirmed",
    sourceTruth: false,
    coreAuthority: false,
  };
}

function createSupportLine(
  observedLine: PersonalVisualHarmonyObservedLineV1,
  frame: PersonalVisualHarmonyConstructionFrameV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): PersonalVisualHarmonySupportLineExtensionV1 {
  const contacts = clipInfiniteLineToFrame(observedLine.start, observedLine.end, frame.vertices);
  const identity = contentIdentityFor({
    kind: "support-line-extension",
    observedLineId: observedLine.observedLineId,
    frame,
    sourcePixelWidth,
    sourcePixelHeight,
  });
  return {
    constructionId: `construction:support-line:${identityToken(identity)}`,
    kind: "support-line-extension",
    observedLineId: observedLine.observedLineId,
    clippedStart: contacts[0].point,
    clippedEnd: contacts[1].point,
    frameEdgeContacts: [
      {
        point: contacts[0].point,
        frameEdgeIndices: contacts[0].frameEdgeIndices,
        positionOnClippedLine: 0,
      },
      {
        point: contacts[1].point,
        frameEdgeIndices: contacts[1].frameEdgeIndices,
        positionOnClippedLine: 1,
      },
    ],
    angleDegrees: pixelAngleDegrees(
      observedLine.start,
      observedLine.end,
      sourcePixelWidth,
      sourcePixelHeight,
    ),
    provenance: "derived-construction",
    derivation: "infinite_supporting_line_from_user_confirmed_observed_endpoints",
    clipping: "confirmed_frame_only",
    sourceTruth: false,
    coreAuthority: false,
  };
}

function clipInfiniteLineToFrame(
  start: PersonalVisualHarmonyConstructionPointV1,
  end: PersonalVisualHarmonyConstructionPointV1,
  vertices: PersonalVisualHarmonyConstructionFrameV1["vertices"],
  contactPolicy: "crossing-only" | "allow-point-contact" = "crossing-only",
): readonly [ClippedContact, ClippedContact] {
  const direction = subtract(end, start);
  const contacts: Array<{
    point: PersonalVisualHarmonyConstructionPointV1;
    scale: number;
    frameEdgeIndex: number;
  }> = [];
  for (let frameEdgeIndex = 0; frameEdgeIndex < vertices.length; frameEdgeIndex += 1) {
    const edgeStart = vertices[frameEdgeIndex]!;
    const edgeEnd = vertices[(frameEdgeIndex + 1) % vertices.length]!;
    const edge = subtract(edgeEnd, edgeStart);
    const denominator = cross(direction, edge);
    const offset = subtract(edgeStart, start);
    if (Math.abs(denominator) <= BOUNDARY_TOLERANCE_NORMALIZED) {
      if (Math.abs(cross(offset, direction)) <= BOUNDARY_TOLERANCE_NORMALIZED) {
        for (const point of [edgeStart, edgeEnd]) {
          contacts.push({
            point,
            scale: projectionScale(point, start, direction),
            frameEdgeIndex,
          });
        }
      }
      continue;
    }
    const scale = cross(offset, edge) / denominator;
    const edgeScale = cross(offset, direction) / denominator;
    if (edgeScale < -BOUNDARY_TOLERANCE_NORMALIZED
      || edgeScale > 1 + BOUNDARY_TOLERANCE_NORMALIZED) continue;
    contacts.push({
      point: canonicalPoint(add(start, multiply(direction, scale))),
      scale,
      frameEdgeIndex,
    });
  }
  const merged = new Map<string, { point: PersonalVisualHarmonyConstructionPointV1; scale: number; edges: Set<number> }>();
  for (const contact of contacts) {
    const point = canonicalPoint(contact.point);
    const key = `${point.x.toFixed(12)}:${point.y.toFixed(12)}`;
    const current = merged.get(key);
    if (current === undefined) {
      merged.set(key, { point, scale: contact.scale, edges: new Set([contact.frameEdgeIndex]) });
    } else {
      current.edges.add(contact.frameEdgeIndex);
    }
  }
  const ordered = [...merged.values()].sort((first, second) => first.scale - second.scale);
  const first = ordered[0];
  const last = ordered.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("Observed line does not cross the confirmed construction frame.");
  }
  if (pointsEqual(first.point, last.point)) {
    if (contactPolicy !== "allow-point-contact") {
      throw new Error("Observed line does not cross the confirmed construction frame.");
    }
    const frameEdgeIndices = [...first.edges].sort(numberCompare);
    return [
      { point: first.point, scale: first.scale, frameEdgeIndices },
      { point: first.point, scale: first.scale, frameEdgeIndices: [...frameEdgeIndices] },
    ];
  }
  return [
    { point: first.point, scale: first.scale, frameEdgeIndices: [...first.edges].sort(numberCompare) },
    { point: last.point, scale: last.scale, frameEdgeIndices: [...last.edges].sort(numberCompare) },
  ];
}

function createFormatDiagonals(
  frame: PersonalVisualHarmonyConstructionFrameV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): readonly PersonalVisualHarmonyFormatDiagonalV1[] {
  const pairs = [
    { diagonal: "vertex-0-to-2" as const, start: frame.vertices[0], end: frame.vertices[2] },
    { diagonal: "vertex-1-to-3" as const, start: frame.vertices[1], end: frame.vertices[3] },
  ];
  return pairs.map(({ diagonal, start, end }) => {
    const identity = contentIdentityFor({
      kind: "format-diagonal",
      diagonal,
      frame,
      sourcePixelWidth,
      sourcePixelHeight,
    });
    return {
      constructionId: `construction:format-diagonal:${identityToken(identity)}`,
      kind: "format-diagonal",
      diagonal,
      start,
      end,
      angleDegrees: pixelAngleDegrees(start, end, sourcePixelWidth, sourcePixelHeight),
      provenance: "derived-construction",
      derivation: "opposite_vertices_of_user_confirmed_frame",
      sourceTruth: false,
      coreAuthority: false,
    };
  });
}

function createSupportLineDiagonalRelation(
  supportLine: PersonalVisualHarmonySupportLineExtensionV1,
  diagonal: PersonalVisualHarmonyFormatDiagonalV1,
): PersonalVisualHarmonySupportLineDiagonalRelationV1 {
  const boundedIntersection = intersectBoundedLines(
    supportLine.clippedStart,
    supportLine.clippedEnd,
    diagonal.start,
    diagonal.end,
  );
  let status: PersonalVisualHarmonySupportLineDiagonalRelationV1["status"];
  if (boundedIntersection.status === "intersection") status = "intersection_within_frame";
  else if (boundedIntersection.status === "coincident") status = "coincident";
  else if (boundedIntersection.status === "parallel") status = "parallel";
  else status = "no_intersection_within_frame";
  const intersection = boundedIntersection.intersection;
  const normalizedSupportLinePosition = boundedIntersection.firstPosition;
  const normalizedFormatDiagonalPosition = boundedIntersection.secondPosition;
  const identity = contentIdentityFor({
    kind: "support-line-format-diagonal-relation",
    supportLineConstructionId: supportLine.constructionId,
    formatDiagonalConstructionId: diagonal.constructionId,
    status,
    intersection,
    normalizedSupportLinePosition,
    normalizedFormatDiagonalPosition,
  });
  return {
    relationId: `relation:support-line-format-diagonal:${identityToken(identity)}`,
    kind: "support-line-format-diagonal-relation",
    supportLineConstructionId: supportLine.constructionId,
    formatDiagonalConstructionId: diagonal.constructionId,
    status,
    intersection,
    normalizedSupportLinePosition,
    normalizedFormatDiagonalPosition,
    provenance: "derived-construction",
    sourceTruth: false,
    coreAuthority: false,
  };
}

function createJunctionAngles(
  observedLines: readonly PersonalVisualHarmonyObservedLineV1[],
  supportLines: readonly PersonalVisualHarmonySupportLineExtensionV1[],
  formatDiagonals: readonly PersonalVisualHarmonyFormatDiagonalV1[],
  frame: PersonalVisualHarmonyConstructionFrameV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): readonly PersonalVisualHarmonyJunctionAngleV1[] {
  const observedById = new Map(observedLines.map((line) => [line.observedLineId, line]));
  const supportParticipants = supportLines.map((line): BoundedConstructionLine => {
    const observed = observedById.get(line.observedLineId);
    if (observed === undefined) {
      throw new Error("Support-line junction evidence requires its observed source line.");
    }
    return {
      constructionId: line.constructionId,
      kind: "support-line-extension",
      start: line.clippedStart,
      end: line.clippedEnd,
      provenance: "derived-construction",
      sourceObservedLineId: line.observedLineId,
      observedStart: observed.start,
      observedEnd: observed.end,
    };
  });
  const diagonalParticipants = formatDiagonals.map((line): BoundedConstructionLine => ({
    constructionId: line.constructionId,
    kind: "format-diagonal",
    start: line.start,
    end: line.end,
    provenance: "derived-construction",
    sourceObservedLineId: null,
    observedStart: null,
    observedEnd: null,
  }));
  const frameParticipants = createFrameParticipants(frame);
  const participants = [
    ...supportParticipants,
    ...diagonalParticipants,
    ...frameParticipants,
  ].sort((first, second) => stringCompare(first.constructionId, second.constructionId));
  const junctions: PersonalVisualHarmonyJunctionAngleV1[] = [];
  for (let firstIndex = 0; firstIndex < participants.length; firstIndex += 1) {
    const first = participants[firstIndex]!;
    for (let secondIndex = firstIndex + 1; secondIndex < participants.length; secondIndex += 1) {
      const second = participants[secondIndex]!;
      if (first.kind === "frame-edge" && second.kind === "frame-edge") continue;
      const boundedIntersection = intersectBoundedLines(
        first.start,
        first.end,
        second.start,
        second.end,
      );
      if (boundedIntersection.status !== "intersection"
        || boundedIntersection.intersection === null) continue;
      const intersection = boundedIntersection.intersection;
      const smallerAngleDegrees = pixelUndirectedAngleDistanceDegrees(
        first.start,
        first.end,
        second.start,
        second.end,
        sourcePixelWidth,
        sourcePixelHeight,
      );
      if (smallerAngleDegrees === 0) continue;
      const supplementaryAngleDegrees = canonicalNumber(180 - smallerAngleDegrees);
      const firstParticipant = createJunctionParticipant(first, intersection);
      const secondParticipant = createJunctionParticipant(second, intersection);
      const junctionKind = junctionKindFor(first.kind, second.kind);
      const identity = contentIdentityFor({
        kind: "junction-angle",
        junctionKind,
        intersection,
        firstParticipant,
        secondParticipant,
        smallerAngleDegrees,
        supplementaryAngleDegrees,
        sourcePixelWidth,
        sourcePixelHeight,
      });
      junctions.push({
        junctionId: `junction:angle:${identityToken(identity)}`,
        kind: "junction-angle",
        junctionKind,
        intersection,
        firstParticipant,
        secondParticipant,
        smallerAngleDegrees,
        supplementaryAngleDegrees,
        angleConvention: "projected_image_plane_smaller_and_supplementary",
        provenance: "derived-measurement",
        sourceTruth: false,
        coreAuthority: false,
      });
    }
  }
  return junctions.sort((first, second) => stringCompare(first.junctionId, second.junctionId));
}

function createFrameParticipants(
  frame: PersonalVisualHarmonyConstructionFrameV1,
): readonly BoundedConstructionLine[] {
  return frame.vertices.map((start, frameEdgeIndex): BoundedConstructionLine => {
    const end = frame.vertices[(frameEdgeIndex + 1) % frame.vertices.length]!;
    const identity = contentIdentityFor({
      kind: "frame-edge",
      frameId: frame.frameId,
      frameEdgeIndex,
      start,
      end,
    });
    return {
      constructionId: `construction:frame-edge:${identityToken(identity)}`,
      kind: "frame-edge",
      start,
      end,
      provenance: "user-confirmed-frame",
      sourceObservedLineId: null,
      observedStart: null,
      observedEnd: null,
    };
  });
}

export function constructPersonalVisualHarmonyTrianglesV1(input: {
  readonly requests: readonly PersonalVisualHarmonyTriangleRequestInputV1[];
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly frame: PersonalVisualHarmonyConstructionFrameV1;
  readonly observedLines: readonly PersonalVisualHarmonyObservedLineV1[];
  readonly supportLineExtensions: readonly PersonalVisualHarmonySupportLineExtensionV1[];
  readonly formatDiagonals: readonly PersonalVisualHarmonyFormatDiagonalV1[];
  readonly junctionAngles: readonly PersonalVisualHarmonyJunctionAngleV1[];
}): readonly PersonalVisualHarmonyTriangleConstructionV1[] {
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const requests = normalizePersonalVisualHarmonyTriangleRequestsV1(input.requests);
  const frame = validateFrame(input.frame);
  const observedById = uniqueValuesBy(
    input.observedLines,
    ({ observedLineId }) => observedLineId,
    "Observed triangle parents must have unique stable ids.",
  );
  const observedByCandidate = groupedValuesBy(input.observedLines, ({ candidateId }) => candidateId);
  const constructionParticipantReferences = new Map<
    string,
    PersonalVisualHarmonyTriangleParticipantReferenceV1
  >();
  for (const supportLine of input.supportLineExtensions) {
    const observed = observedById.get(supportLine.observedLineId);
    if (observed === undefined) {
      throw new Error("Triangle support-line parent is missing its observed source.");
    }
    setUniqueConstructionParticipantReference(
      constructionParticipantReferences,
      supportLine.constructionId,
      { kind: "support-line-extension", candidateId: observed.candidateId },
    );
  }
  for (const diagonal of input.formatDiagonals) {
    setUniqueConstructionParticipantReference(
      constructionParticipantReferences,
      diagonal.constructionId,
      { kind: "format-diagonal", diagonal: diagonal.diagonal },
    );
  }
  for (const [frameEdgeIndex, edge] of createFrameParticipants(frame).entries()) {
    setUniqueConstructionParticipantReference(
      constructionParticipantReferences,
      edge.constructionId,
      { kind: "frame-edge", frameEdgeIndex: frameEdgeIndex as 0 | 1 | 2 | 3 },
    );
  }
  const junctionsByParentKey = groupedValuesBy(input.junctionAngles, (junction) => {
    const first = constructionParticipantReferences.get(junction.firstParticipant.constructionId);
    const second = constructionParticipantReferences.get(junction.secondParticipant.constructionId);
    if (first === undefined || second === undefined) {
      throw new Error("Triangle junction parent references an unknown construction participant.");
    }
    return triangleJunctionParentKey([first, second]);
  });
  uniqueValuesBy(
    input.junctionAngles,
    ({ junctionId }) => junctionId,
    "Triangle junction parents must have unique stable ids.",
  );
  const triangles = requests.map((request) => {
    const resolved = request.vertices.map((vertex) => resolveTriangleVertex({
      vertex,
      observedByCandidate,
      junctionsByParentKey,
    }));
    const parentKeys = resolved.map(({ parent }) => triangleResolvedParentKey(parent));
    if (new Set(parentKeys).size !== 3) {
      throw new Error("Triangle vertices require three distinct stable parent references.");
    }
    for (let firstIndex = 0; firstIndex < resolved.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < resolved.length; secondIndex += 1) {
        if (pointsEqual(resolved[firstIndex]!.point, resolved[secondIndex]!.point)) {
          throw new Error("Triangle vertices must be distinct within the normalized tolerance.");
        }
      }
    }
    const sorted = [...resolved].sort((first, second) => stringCompare(
      triangleResolvedVertexKey(first),
      triangleResolvedVertexKey(second),
    ));
    const initiallyOrdered = [sorted[0]!, sorted[1]!, sorted[2]!] as const;
    const initialSignedArea = triangleSignedNormalizedArea(initiallyOrdered);
    const vertices = (initialSignedArea < 0
      ? [initiallyOrdered[0], initiallyOrdered[2], initiallyOrdered[1]]
      : initiallyOrdered) as readonly [
        PersonalVisualHarmonyTriangleVertexV1,
        PersonalVisualHarmonyTriangleVertexV1,
        PersonalVisualHarmonyTriangleVertexV1,
      ];
    const signedNormalizedArea = canonicalNumber(triangleSignedNormalizedArea(vertices));
    const absoluteNormalizedArea = canonicalNumber(Math.abs(signedNormalizedArea));
    if (absoluteNormalizedArea <= PERSONAL_VISUAL_HARMONY_TRIANGLE_AREA_TOLERANCE_NORMALIZED) {
      throw new Error("Triangle vertices are collinear or near-collinear within the normalized area tolerance.");
    }
    const sideLengthsPixels = triangleSideLengthsPixels(
      vertices,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    const interiorAnglesDegrees = triangleInteriorAnglesDegrees(
      vertices,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    if (interiorAnglesDegrees.some((angle) => !Number.isFinite(angle) || angle <= 0 || angle >= 180)) {
      throw new Error("Triangle is degenerate in pixel space.");
    }
    const withoutIdentity = {
      kind: "triangle-construction" as const,
      requestId: request.requestId,
      vertices,
      winding: "clockwise_image_plane" as const,
      signedNormalizedArea,
      absoluteNormalizedArea,
      areaToleranceNormalized: PERSONAL_VISUAL_HARMONY_TRIANGLE_AREA_TOLERANCE_NORMALIZED,
      sideLengthsPixels,
      interiorAnglesDegrees,
      angleConvention: "projected_image_plane_interior" as const,
      provenance: "derived-construction" as const,
      derivation: "three_explicit_parented_vertices" as const,
      candidateEvidenceOnly: true as const,
      sourceTruth: false as const,
      coreAuthority: false as const,
    };
    const identity = contentIdentityFor(withoutIdentity);
    return {
      triangleId: `construction:triangle:${identityToken(identity)}`,
      ...withoutIdentity,
    };
  });
  return triangles.sort((first, second) => stringCompare(first.triangleId, second.triangleId));
}

export function constructPersonalVisualHarmonyTriangleMediansV1(input: {
  readonly triangles: readonly PersonalVisualHarmonyTriangleConstructionV1[];
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}): readonly PersonalVisualHarmonyTriangleMedianV1[] {
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  if (!Array.isArray(input.triangles) || input.triangles.length !== 1) {
    throw new Error("Triangle medians require exactly one current canonical triangle parent.");
  }
  const currentTriangles = input.triangles.map((triangle, triangleIndex) => {
    return validateTriangleMedianParent(
      triangle,
      triangleIndex,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
  });
  return currentTriangles.flatMap((current) => {
    const oppositeSideIndices = [
      [1, 2],
      [0, 2],
      [0, 1],
    ] as const;
    return oppositeSideIndices.map((oppositeSideVertexIndices, vertexIndex) => {
      const canonicalVertexIndex = vertexIndex as 0 | 1 | 2;
      const vertex = current.vertices[canonicalVertexIndex]!;
      const firstOpposite = current.vertices[oppositeSideVertexIndices[0]]!;
      const secondOpposite = current.vertices[oppositeSideVertexIndices[1]]!;
      const midpoint = validateTrianglePoint(canonicalPoint({
        x: (firstOpposite.point.x + secondOpposite.point.x) / 2,
        y: (firstOpposite.point.y + secondOpposite.point.y) / 2,
      }), "triangle median midpoint");
      const withoutIdentity = {
        kind: "triangle-median" as const,
        triangleId: current.triangleId,
        vertexIndex: canonicalVertexIndex,
        vertex: { ...vertex.point },
        vertexParent: cloneTriangleVertexParent(vertex.parent),
        oppositeSideVertexIndices,
        oppositeSideVertices: [
          { ...firstOpposite.point },
          { ...secondOpposite.point },
        ] as const,
        oppositeSideParents: [
          cloneTriangleVertexParent(firstOpposite.parent),
          cloneTriangleVertexParent(secondOpposite.parent),
        ] as const,
        midpoint,
        lengthPixels: pixelDistance(
          vertex.point,
          midpoint,
          input.sourcePixelWidth,
          input.sourcePixelHeight,
        ),
        provenance: "derived-construction" as const,
        derivation: "canonical_triangle_vertex_to_opposite_side_midpoint" as const,
        candidateEvidenceOnly: true as const,
        sourceTruth: false as const,
        coreAuthority: false as const,
      };
      const identity = contentIdentityFor(withoutIdentity);
      return {
        medianId: `construction:triangle-median:${identityToken(identity)}`,
        ...withoutIdentity,
      };
    });
  });
}

export function constructPersonalVisualHarmonyTrianglePerpendicularBisectorsV1(input: {
  readonly triangles: readonly PersonalVisualHarmonyTriangleConstructionV1[];
  readonly frame: PersonalVisualHarmonyConstructionFrameV1;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}): readonly PersonalVisualHarmonyTrianglePerpendicularBisectorV1[] {
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const frame = validateFrame(input.frame);
  if (!Array.isArray(input.triangles) || input.triangles.length !== 1) {
    throw new Error("Triangle perpendicular bisectors require exactly one current canonical triangle parent.");
  }
  const triangle = validateTriangleMedianParent(
    input.triangles[0],
    0,
    input.sourcePixelWidth,
    input.sourcePixelHeight,
  );
  const sides = [
    [1, 2],
    [0, 2],
    [0, 1],
  ] as const;
  return sides.map((sideVertexIndices, sideIndex) => {
    const first = triangle.vertices[sideVertexIndices[0]]!;
    const second = triangle.vertices[sideVertexIndices[1]]!;
    const dxPixels = (second.point.x - first.point.x) * input.sourcePixelWidth;
    const dyPixels = (second.point.y - first.point.y) * input.sourcePixelHeight;
    const lengthPixels = Math.hypot(dxPixels, dyPixels);
    if (!Number.isFinite(lengthPixels) || lengthPixels <= BOUNDARY_TOLERANCE_NORMALIZED) {
      throw new Error("Triangle perpendicular bisector side is degenerate.");
    }
    const midpoint = validateTrianglePoint(canonicalPoint({
      x: (first.point.x + second.point.x) / 2,
      y: (first.point.y + second.point.y) / 2,
    }), "triangle perpendicular bisector midpoint");
    const supportDirection = {
      x: (-dyPixels / lengthPixels) / input.sourcePixelWidth,
      y: (dxPixels / lengthPixels) / input.sourcePixelHeight,
    };
    const supportLineStart = canonicalPoint({
      x: midpoint.x - supportDirection.x,
      y: midpoint.y - supportDirection.y,
    });
    const supportLineEnd = canonicalPoint({
      x: midpoint.x + supportDirection.x,
      y: midpoint.y + supportDirection.y,
    });
    const contacts = clipInfiniteLineToFrame(supportLineStart, supportLineEnd, frame.vertices);
    const withoutIdentity = {
      kind: "triangle-perpendicular-bisector" as const,
      triangleId: triangle.triangleId,
      sideIndex: sideIndex as 0 | 1 | 2,
      sideVertexIndices,
      sideVertices: [{ ...first.point }, { ...second.point }] as const,
      sideParents: [cloneTriangleVertexParent(first.parent), cloneTriangleVertexParent(second.parent)] as const,
      midpoint,
      supportLineStart,
      supportLineEnd,
      clippedStart: contacts[0].point,
      clippedEnd: contacts[1].point,
      angleDegrees: pixelAngleDegrees(supportLineStart, supportLineEnd, input.sourcePixelWidth, input.sourcePixelHeight),
      provenance: "derived-construction" as const,
      derivation: "canonical_triangle_side_perpendicular_bisector" as const,
      clipping: "confirmed_frame_only" as const,
      candidateEvidenceOnly: true as const,
      sourceTruth: false as const,
      coreAuthority: false as const,
    };
    const identity = contentIdentityFor(withoutIdentity);
    return { bisectorId: `construction:triangle-perpendicular-bisector:${identityToken(identity)}`, ...withoutIdentity };
  });
}

export function constructPersonalVisualHarmonyTriangleAngleBisectorsV1(input: {
  readonly triangles: readonly PersonalVisualHarmonyTriangleConstructionV1[];
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}): readonly PersonalVisualHarmonyTriangleAngleBisectorV1[] {
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  if (!Array.isArray(input.triangles) || input.triangles.length !== 1) {
    throw new Error("Triangle angle bisectors require exactly one current canonical triangle parent.");
  }
  const triangle = validateTriangleMedianParent(input.triangles[0], 0, input.sourcePixelWidth, input.sourcePixelHeight);
  const oppositeSides = [[1, 2], [0, 2], [0, 1]] as const;
  return oppositeSides.map((oppositeSideVertexIndices, vertexIndex) => {
    const vertex = triangle.vertices[vertexIndex]!;
    const first = triangle.vertices[oppositeSideVertexIndices[0]]!;
    const second = triangle.vertices[oppositeSideVertexIndices[1]]!;
    const firstLength = pixelDistance(vertex.point, first.point, input.sourcePixelWidth, input.sourcePixelHeight);
    const secondLength = pixelDistance(vertex.point, second.point, input.sourcePixelWidth, input.sourcePixelHeight);
    const total = firstLength + secondLength;
    if (!Number.isFinite(total) || firstLength <= BOUNDARY_TOLERANCE_NORMALIZED || secondLength <= BOUNDARY_TOLERANCE_NORMALIZED) {
      throw new Error("Triangle angle bisector side is degenerate.");
    }
    const oppositeSideIntersection = validateTrianglePoint(canonicalPoint({
      x: ((secondLength * first.point.x) + (firstLength * second.point.x)) / total,
      y: ((secondLength * first.point.y) + (firstLength * second.point.y)) / total,
    }), "triangle angle bisector opposite-side intersection");
    const lengthPixels = pixelDistance(
      vertex.point,
      oppositeSideIntersection,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    const firstRayAngle = pixelUndirectedAngleDistanceDegrees(
      vertex.point,
      oppositeSideIntersection,
      vertex.point,
      first.point,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    const secondRayAngle = pixelUndirectedAngleDistanceDegrees(
      vertex.point,
      oppositeSideIntersection,
      vertex.point,
      second.point,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    const angleErrorDegrees = canonicalNumber(Math.abs(firstRayAngle - secondRayAngle));
    if (!Number.isFinite(lengthPixels)
      || lengthPixels <= BOUNDARY_TOLERANCE_NORMALIZED
      || !Number.isFinite(angleErrorDegrees)
      || angleErrorDegrees > TRIANGLE_ANGLE_BISECTOR_TOLERANCE_DEGREES) {
      throw new Error("Triangle angle bisector is numerically unstable after canonical rounding.");
    }
    const withoutIdentity = {
      kind: "triangle-angle-bisector" as const,
      triangleId: triangle.triangleId,
      vertexIndex: vertexIndex as 0 | 1 | 2,
      vertex: { ...vertex.point },
      vertexParent: cloneTriangleVertexParent(vertex.parent),
      oppositeSideVertexIndices,
      oppositeSideParents: [cloneTriangleVertexParent(first.parent), cloneTriangleVertexParent(second.parent)] as const,
      oppositeSideIntersection,
      lengthPixels,
      angleToleranceDegrees: TRIANGLE_ANGLE_BISECTOR_TOLERANCE_DEGREES,
      provenance: "derived-construction" as const,
      derivation: "canonical_triangle_internal_angle_bisector" as const,
      candidateEvidenceOnly: true as const,
      sourceTruth: false as const,
      coreAuthority: false as const,
    };
    const identity = contentIdentityFor(withoutIdentity);
    return { bisectorId: `construction:triangle-angle-bisector:${identityToken(identity)}`, ...withoutIdentity };
  });
}

export function constructPersonalVisualHarmonyTriangleAltitudesV1(input: {
  readonly triangles: readonly PersonalVisualHarmonyTriangleConstructionV1[];
  readonly frame: PersonalVisualHarmonyConstructionFrameV1;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}): readonly PersonalVisualHarmonyTriangleAltitudeV1[] {
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const frame = validateFrame(input.frame);
  if (!Array.isArray(input.triangles) || input.triangles.length !== 1) {
    throw new Error("Triangle altitudes require exactly one current canonical triangle parent.");
  }
  const triangle = validateTriangleMedianParent(
    input.triangles[0],
    0,
    input.sourcePixelWidth,
    input.sourcePixelHeight,
  );
  const oppositeSides = [
    [1, 2],
    [0, 2],
    [0, 1],
  ] as const;
  return oppositeSides.map((oppositeSideVertexIndices, vertexIndex) => {
    const canonicalVertexIndex = vertexIndex as 0 | 1 | 2;
    const vertex = triangle.vertices[canonicalVertexIndex]!;
    const first = triangle.vertices[oppositeSideVertexIndices[0]]!;
    const second = triangle.vertices[oppositeSideVertexIndices[1]]!;
    const sideDxPixels = (second.point.x - first.point.x) * input.sourcePixelWidth;
    const sideDyPixels = (second.point.y - first.point.y) * input.sourcePixelHeight;
    const sideLengthPixels = Math.hypot(sideDxPixels, sideDyPixels);
    if (!Number.isFinite(sideLengthPixels)
      || sideLengthPixels <= BOUNDARY_TOLERANCE_NORMALIZED) {
      throw new Error("Triangle altitude opposite side is degenerate.");
    }
    const vertexDxPixels = (vertex.point.x - first.point.x) * input.sourcePixelWidth;
    const vertexDyPixels = (vertex.point.y - first.point.y) * input.sourcePixelHeight;
    const rawFootPosition = (
      (vertexDxPixels * sideDxPixels) + (vertexDyPixels * sideDyPixels)
    ) / (sideLengthPixels * sideLengthPixels);
    if (!Number.isFinite(rawFootPosition)) {
      throw new Error("Triangle altitude foot projection is non-finite.");
    }
    const footPositionOnOppositeSideSupport = canonicalNumber(rawFootPosition);
    const foot = validateFiniteConstructionPoint(canonicalPoint({
      x: first.point.x + ((second.point.x - first.point.x) * rawFootPosition),
      y: first.point.y + ((second.point.y - first.point.y) * rawFootPosition),
    }), "triangle altitude foot");
    const supportDirection = {
      x: (-sideDyPixels / sideLengthPixels) / input.sourcePixelWidth,
      y: (sideDxPixels / sideLengthPixels) / input.sourcePixelHeight,
    };
    const supportLineStart = validateFiniteConstructionPoint(canonicalPoint({
      x: vertex.point.x - supportDirection.x,
      y: vertex.point.y - supportDirection.y,
    }), "triangle altitude support-line start");
    const supportLineEnd = validateFiniteConstructionPoint(canonicalPoint({
      x: vertex.point.x + supportDirection.x,
      y: vertex.point.y + supportDirection.y,
    }), "triangle altitude support-line end");
    const contacts = clipInfiniteLineToFrame(
      supportLineStart,
      supportLineEnd,
      frame.vertices,
      "allow-point-contact",
    );
    const lengthPixels = pixelDistance(
      vertex.point,
      foot,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    );
    if (!Number.isFinite(lengthPixels) || lengthPixels <= BOUNDARY_TOLERANCE_NORMALIZED) {
      throw new Error("Triangle altitude is degenerate or numerically unstable.");
    }
    const withoutIdentity = {
      kind: "triangle-altitude" as const,
      triangleId: triangle.triangleId,
      vertexIndex: canonicalVertexIndex,
      vertex: { ...vertex.point },
      vertexParent: cloneTriangleVertexParent(vertex.parent),
      oppositeSideVertexIndices,
      oppositeSideVertices: [{ ...first.point }, { ...second.point }] as const,
      oppositeSideParents: [
        cloneTriangleVertexParent(first.parent),
        cloneTriangleVertexParent(second.parent),
      ] as const,
      foot,
      footPositionOnOppositeSideSupport,
      footWithinOppositeSideSegment: rawFootPosition >= -BOUNDARY_TOLERANCE_NORMALIZED
        && rawFootPosition <= 1 + BOUNDARY_TOLERANCE_NORMALIZED,
      supportLineStart,
      supportLineEnd,
      clippedStart: contacts[0].point,
      clippedEnd: contacts[1].point,
      lengthPixels,
      angleDegrees: pixelAngleDegrees(
        supportLineStart,
        supportLineEnd,
        input.sourcePixelWidth,
        input.sourcePixelHeight,
      ),
      provenance: "derived-construction" as const,
      derivation: "canonical_triangle_vertex_perpendicular_to_opposite_side_support" as const,
      clipping: "confirmed_frame_only" as const,
      candidateEvidenceOnly: true as const,
      sourceTruth: false as const,
      coreAuthority: false as const,
    };
    const identity = contentIdentityFor(withoutIdentity);
    return {
      altitudeId: `construction:triangle-altitude:${identityToken(identity)}`,
      ...withoutIdentity,
    };
  });
}

function validateTriangleMedianParent(
  value: unknown,
  triangleIndex: number,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): PersonalVisualHarmonyTriangleConstructionV1 {
  if (value === null || typeof value !== "object"
    || Object.keys(value).sort().join("|") !== [
      "absoluteNormalizedArea",
      "angleConvention",
      "areaToleranceNormalized",
      "candidateEvidenceOnly",
      "coreAuthority",
      "derivation",
      "interiorAnglesDegrees",
      "kind",
      "provenance",
      "requestId",
      "sideLengthsPixels",
      "signedNormalizedArea",
      "sourceTruth",
      "triangleId",
      "vertices",
      "winding",
    ].join("|")) {
    throw new Error(`Triangle median parent ${String(triangleIndex)} has an invalid contract shape.`);
  }
  const triangle = value as PersonalVisualHarmonyTriangleConstructionV1;
  if (typeof triangle.triangleId !== "string" || !ID_PATTERN.test(triangle.triangleId)
    || typeof triangle.requestId !== "string" || !ID_PATTERN.test(triangle.requestId)
    || triangle.kind !== "triangle-construction"
    || triangle.winding !== "clockwise_image_plane"
    || triangle.angleConvention !== "projected_image_plane_interior"
    || triangle.provenance !== "derived-construction"
    || triangle.derivation !== "three_explicit_parented_vertices"
    || triangle.candidateEvidenceOnly !== true
    || triangle.sourceTruth !== false
    || triangle.coreAuthority !== false
    || triangle.areaToleranceNormalized
      !== PERSONAL_VISUAL_HARMONY_TRIANGLE_AREA_TOLERANCE_NORMALIZED
    || !Array.isArray(triangle.vertices)
    || triangle.vertices.length !== 3) {
    throw new Error("Triangle median parent must be a current non-authoritative triangle construction.");
  }
  const vertices = triangle.vertices.map((vertex, vertexIndex) => (
    validateTriangleMedianVertex(vertex, triangleIndex, vertexIndex)
  )) as unknown as PersonalVisualHarmonyTriangleConstructionV1["vertices"];
  const parentKeys = vertices.map(({ parent }) => triangleResolvedParentKey(parent));
  if (new Set(parentKeys).size !== 3) {
    throw new Error("Triangle median parent vertices require distinct stable parent references.");
  }
  for (let firstIndex = 0; firstIndex < vertices.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < vertices.length; secondIndex += 1) {
      if (pointsEqual(vertices[firstIndex]!.point, vertices[secondIndex]!.point)) {
        throw new Error("Triangle median parent vertices must be distinct.");
      }
    }
  }
  const signedNormalizedArea = canonicalNumber(triangleSignedNormalizedArea(vertices));
  const absoluteNormalizedArea = canonicalNumber(Math.abs(signedNormalizedArea));
  const sideLengthsPixels = triangleSideLengthsPixels(vertices, sourcePixelWidth, sourcePixelHeight);
  const interiorAnglesDegrees = triangleInteriorAnglesDegrees(
    vertices,
    sourcePixelWidth,
    sourcePixelHeight,
  );
  if (absoluteNormalizedArea <= PERSONAL_VISUAL_HARMONY_TRIANGLE_AREA_TOLERANCE_NORMALIZED
    || triangle.signedNormalizedArea !== signedNormalizedArea
    || triangle.absoluteNormalizedArea !== absoluteNormalizedArea
    || !numberTupleEquals(triangle.sideLengthsPixels, sideLengthsPixels)
    || !numberTupleEquals(triangle.interiorAnglesDegrees, interiorAnglesDegrees)) {
    throw new Error("Triangle median parent geometry or deterministic measurements are stale.");
  }
  const withoutIdentity = {
    kind: triangle.kind,
    requestId: triangle.requestId,
    vertices,
    winding: triangle.winding,
    signedNormalizedArea,
    absoluteNormalizedArea,
    areaToleranceNormalized: triangle.areaToleranceNormalized,
    sideLengthsPixels,
    interiorAnglesDegrees,
    angleConvention: triangle.angleConvention,
    provenance: triangle.provenance,
    derivation: triangle.derivation,
    candidateEvidenceOnly: triangle.candidateEvidenceOnly,
    sourceTruth: triangle.sourceTruth,
    coreAuthority: triangle.coreAuthority,
  };
  const expectedTriangleId = `construction:triangle:${identityToken(contentIdentityFor(withoutIdentity))}`;
  if (triangle.triangleId !== expectedTriangleId) {
    throw new Error("Triangle median parent identity is missing, stale, or does not match its geometry.");
  }
  return { triangleId: expectedTriangleId, ...withoutIdentity };
}

function validateTriangleMedianVertex(
  value: unknown,
  triangleIndex: number,
  vertexIndex: number,
): PersonalVisualHarmonyTriangleVertexV1 {
  if (value === null || typeof value !== "object"
    || Object.keys(value).sort().join("|") !== "parent|point") {
    throw new Error(`Triangle median parent ${String(triangleIndex)} vertex ${String(vertexIndex)} is invalid.`);
  }
  const vertex = value as PersonalVisualHarmonyTriangleVertexV1;
  return {
    point: validateTrianglePoint(vertex.point, "triangle median parent vertex point"),
    parent: cloneTriangleVertexParent(vertex.parent),
  };
}

function cloneTriangleVertexParent(
  value: PersonalVisualHarmonyTriangleVertexParentV1,
): PersonalVisualHarmonyTriangleVertexParentV1 {
  if (value === null || typeof value !== "object") {
    throw new Error("Triangle median vertex parent is missing or invalid.");
  }
  if (value.kind === "observed-line-endpoint") {
    if (Object.keys(value).sort().join("|") !== "candidateId|endpoint|kind|parentId|provenance"
      || typeof value.parentId !== "string" || !ID_PATTERN.test(value.parentId)
      || typeof value.candidateId !== "string" || !ID_PATTERN.test(value.candidateId)
      || !["start", "end"].includes(value.endpoint)
      || value.provenance !== "user-confirmed-observed-endpoint") {
      throw new Error("Triangle median observed endpoint parent is missing or stale.");
    }
    return { ...value };
  }
  if (value.kind === "junction-intersection") {
    if (Object.keys(value).sort().join("|")
        !== "kind|parentId|participantConstructionIds|provenance"
      || typeof value.parentId !== "string" || !ID_PATTERN.test(value.parentId)
      || !Array.isArray(value.participantConstructionIds)
      || value.participantConstructionIds.length !== 2
      || value.participantConstructionIds.some((id) => (
        typeof id !== "string" || !ID_PATTERN.test(id)
      ))
      || value.participantConstructionIds[0] === value.participantConstructionIds[1]
      || stringCompare(
        value.participantConstructionIds[0],
        value.participantConstructionIds[1],
      ) >= 0
      || value.provenance !== "derived-junction-intersection") {
      throw new Error("Triangle median junction parent is missing, stale, or ambiguous.");
    }
    return {
      ...value,
      participantConstructionIds: [...value.participantConstructionIds] as [string, string],
    };
  }
  throw new Error("Triangle median vertex parent kind is unsupported.");
}

function numberTupleEquals(
  first: readonly number[],
  second: readonly number[],
): boolean {
  return Array.isArray(first)
    && first.length === second.length
    && first.every((value, index) => Number.isFinite(value) && value === second[index]);
}

function resolveTriangleVertex(input: {
  readonly vertex: PersonalVisualHarmonyTriangleVertexInputV1;
  readonly observedByCandidate: ReadonlyMap<string, readonly PersonalVisualHarmonyObservedLineV1[]>;
  readonly junctionsByParentKey: ReadonlyMap<string, readonly PersonalVisualHarmonyJunctionAngleV1[]>;
}): PersonalVisualHarmonyTriangleVertexV1 {
  const requestedPoint = validateTrianglePoint(input.vertex.point, "triangle vertex point");
  const parent = input.vertex.parent;
  if (parent.kind === "observed-line-endpoint") {
    const matches = input.observedByCandidate.get(parent.candidateId) ?? [];
    if (matches.length !== 1) {
      throw new Error(matches.length === 0
        ? "Triangle observed endpoint parent is missing or stale."
        : "Triangle observed endpoint parent is ambiguous.");
    }
    const observedLine = matches[0]!;
    const actualPoint = validateTrianglePoint(observedLine[parent.endpoint], "triangle observed endpoint");
    requireMatchingTrianglePoint(requestedPoint, actualPoint);
    return {
      point: actualPoint,
      parent: {
        kind: "observed-line-endpoint",
        parentId: observedLine.observedLineId,
        candidateId: observedLine.candidateId,
        endpoint: parent.endpoint,
        provenance: "user-confirmed-observed-endpoint",
      },
    };
  }
  const parentKey = triangleJunctionParentKey(parent.participants);
  const matches = input.junctionsByParentKey.get(parentKey) ?? [];
  if (matches.length !== 1) {
    throw new Error(matches.length === 0
      ? "Triangle junction parent is missing, stale, or not admitted."
      : "Triangle junction parent is ambiguous.");
  }
  const junction = matches[0]!;
  const actualPoint = validateTrianglePoint(junction.intersection, "triangle junction intersection");
  requireMatchingTrianglePoint(requestedPoint, actualPoint);
  const participantConstructionIds = [
    junction.firstParticipant.constructionId,
    junction.secondParticipant.constructionId,
  ].sort(stringCompare);
  return {
    point: actualPoint,
    parent: {
      kind: "junction-intersection",
      parentId: junction.junctionId,
      participantConstructionIds: [
        participantConstructionIds[0]!,
        participantConstructionIds[1]!,
      ],
      provenance: "derived-junction-intersection",
    },
  };
}

function requireMatchingTrianglePoint(
  requested: PersonalVisualHarmonyConstructionPointV1,
  actual: PersonalVisualHarmonyConstructionPointV1,
): void {
  if (!pointsEqual(requested, actual)) {
    throw new Error("Triangle vertex point does not match its stable parent geometry.");
  }
}

function setUniqueConstructionParticipantReference(
  references: Map<string, PersonalVisualHarmonyTriangleParticipantReferenceV1>,
  constructionId: string,
  reference: PersonalVisualHarmonyTriangleParticipantReferenceV1,
): void {
  if (!ID_PATTERN.test(constructionId) || references.has(constructionId)) {
    throw new Error("Triangle construction participant ids must be unique and bounded.");
  }
  references.set(constructionId, reference);
}

function triangleJunctionParentKey(
  participants: readonly PersonalVisualHarmonyTriangleParticipantReferenceV1[],
): string {
  return [...participants].map(triangleParticipantReferenceKey).sort(stringCompare).join("|");
}

function triangleResolvedParentKey(parent: PersonalVisualHarmonyTriangleVertexParentV1): string {
  return parent.kind === "observed-line-endpoint"
    ? `${parent.kind}:${parent.parentId}:${parent.endpoint}`
    : `${parent.kind}:${parent.parentId}`;
}

function triangleResolvedVertexKey(vertex: PersonalVisualHarmonyTriangleVertexV1): string {
  return `${triangleResolvedParentKey(vertex.parent)}:${vertex.point.x.toFixed(12)}:${vertex.point.y.toFixed(12)}`;
}

function triangleSignedNormalizedArea(
  vertices: readonly [
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
  ],
): number {
  const [first, second, third] = vertices.map(({ point }) => point);
  return (
    (first!.x * second!.y) + (second!.x * third!.y) + (third!.x * first!.y)
    - (first!.y * second!.x) - (second!.y * third!.x) - (third!.y * first!.x)
  ) / 2;
}

function triangleSideLengthsPixels(
  vertices: readonly [
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
  ],
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): readonly [number, number, number] {
  return [
    pixelDistance(vertices[0].point, vertices[1].point, sourcePixelWidth, sourcePixelHeight),
    pixelDistance(vertices[1].point, vertices[2].point, sourcePixelWidth, sourcePixelHeight),
    pixelDistance(vertices[2].point, vertices[0].point, sourcePixelWidth, sourcePixelHeight),
  ];
}

function triangleInteriorAnglesDegrees(
  vertices: readonly [
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
    PersonalVisualHarmonyTriangleVertexV1,
  ],
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): readonly [number, number, number] {
  const angleAt = (index: number) => {
    const center = vertices[index]!.point;
    const before = vertices[(index + 2) % 3]!.point;
    const after = vertices[(index + 1) % 3]!.point;
    const first = {
      x: (before.x - center.x) * sourcePixelWidth,
      y: (before.y - center.y) * sourcePixelHeight,
    };
    const second = {
      x: (after.x - center.x) * sourcePixelWidth,
      y: (after.y - center.y) * sourcePixelHeight,
    };
    const denominator = Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y);
    const cosine = ((first.x * second.x) + (first.y * second.y)) / denominator;
    return canonicalNumber(Math.acos(Math.max(-1, Math.min(1, cosine))) * (180 / Math.PI));
  };
  return [angleAt(0), angleAt(1), angleAt(2)];
}

function pixelDistance(
  first: PersonalVisualHarmonyConstructionPointV1,
  second: PersonalVisualHarmonyConstructionPointV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): number {
  return canonicalNumber(Math.hypot(
    (second.x - first.x) * sourcePixelWidth,
    (second.y - first.y) * sourcePixelHeight,
  ));
}

function groupedValuesBy<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
): ReadonlyMap<string, readonly T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    const current = grouped.get(key);
    if (current === undefined) grouped.set(key, [value]);
    else current.push(value);
  }
  return grouped;
}

function uniqueValuesBy<T>(
  values: readonly T[],
  keyFor: (value: T) => string,
  message: string,
): ReadonlyMap<string, T> {
  const unique = new Map<string, T>();
  for (const value of values) {
    const key = keyFor(value);
    if (!ID_PATTERN.test(key) || unique.has(key)) throw new Error(message);
    unique.set(key, value);
  }
  return unique;
}

function createJunctionParticipant(
  line: BoundedConstructionLine,
  intersection: PersonalVisualHarmonyConstructionPointV1,
): PersonalVisualHarmonyJunctionParticipantV1 {
  return {
    constructionId: line.constructionId,
    kind: line.kind,
    provenance: line.provenance,
    sourceObservedLineId: line.sourceObservedLineId,
    intersectionWithinObservedExtent: line.observedStart === null || line.observedEnd === null
      ? null
      : pointWithinObservedExtent(intersection, line.observedStart, line.observedEnd),
  };
}

function junctionKindFor(
  first: PersonalVisualHarmonyJunctionParticipantV1["kind"],
  second: PersonalVisualHarmonyJunctionParticipantV1["kind"],
): PersonalVisualHarmonyJunctionAngleV1["junctionKind"] {
  const kinds = [first, second].sort().join("|");
  if (kinds === "support-line-extension|support-line-extension") {
    return "support-line-support-line";
  }
  if (kinds === "format-diagonal|support-line-extension") {
    return "support-line-format-diagonal";
  }
  if (kinds === "format-diagonal|format-diagonal") {
    return "format-diagonal-format-diagonal";
  }
  if (kinds === "frame-edge|support-line-extension") {
    return "support-line-frame-edge";
  }
  if (kinds === "format-diagonal|frame-edge") {
    return "format-diagonal-frame-edge";
  }
  throw new Error("Unsupported junction participant pair.");
}

function intersectBoundedLines(
  firstStart: PersonalVisualHarmonyConstructionPointV1,
  firstEnd: PersonalVisualHarmonyConstructionPointV1,
  secondStart: PersonalVisualHarmonyConstructionPointV1,
  secondEnd: PersonalVisualHarmonyConstructionPointV1,
): BoundedLineIntersection {
  const firstVector = subtract(firstEnd, firstStart);
  const secondVector = subtract(secondEnd, secondStart);
  const denominator = cross(firstVector, secondVector);
  if (Math.abs(denominator) <= BOUNDARY_TOLERANCE_NORMALIZED) {
    return {
      status: Math.abs(cross(subtract(secondStart, firstStart), firstVector))
        <= BOUNDARY_TOLERANCE_NORMALIZED
        ? "coincident"
        : "parallel",
      intersection: null,
      firstPosition: null,
      secondPosition: null,
    };
  }
  const offset = subtract(secondStart, firstStart);
  const firstPosition = cross(offset, secondVector) / denominator;
  const secondPosition = cross(offset, firstVector) / denominator;
  if (firstPosition < -BOUNDARY_TOLERANCE_NORMALIZED
    || firstPosition > 1 + BOUNDARY_TOLERANCE_NORMALIZED
    || secondPosition < -BOUNDARY_TOLERANCE_NORMALIZED
    || secondPosition > 1 + BOUNDARY_TOLERANCE_NORMALIZED) {
    return {
      status: "no_intersection",
      intersection: null,
      firstPosition: null,
      secondPosition: null,
    };
  }
  return {
    status: "intersection",
    intersection: canonicalPoint(add(firstStart, multiply(firstVector, firstPosition))),
    firstPosition: canonicalNumber(clampUnit(firstPosition)),
    secondPosition: canonicalNumber(clampUnit(secondPosition)),
  };
}

function pointWithinObservedExtent(
  point: PersonalVisualHarmonyConstructionPointV1,
  start: PersonalVisualHarmonyConstructionPointV1,
  end: PersonalVisualHarmonyConstructionPointV1,
): boolean {
  const position = projectionScale(point, start, subtract(end, start));
  return position >= -BOUNDARY_TOLERANCE_NORMALIZED
    && position <= 1 + BOUNDARY_TOLERANCE_NORMALIZED;
}

function pixelUndirectedAngleDistanceDegrees(
  firstStart: PersonalVisualHarmonyConstructionPointV1,
  firstEnd: PersonalVisualHarmonyConstructionPointV1,
  secondStart: PersonalVisualHarmonyConstructionPointV1,
  secondEnd: PersonalVisualHarmonyConstructionPointV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): number {
  const firstAngle = pixelAngleDegrees(firstStart, firstEnd, sourcePixelWidth, sourcePixelHeight);
  const secondAngle = pixelAngleDegrees(secondStart, secondEnd, sourcePixelWidth, sourcePixelHeight);
  const absolute = Math.abs(firstAngle - secondAngle) % 180;
  return canonicalNumber(Math.min(absolute, 180 - absolute));
}

function validatePoint(value: unknown, field: string): PersonalVisualHarmonyConstructionPointV1 {
  if (value === null || typeof value !== "object" || Object.keys(value).sort().join("|") !== "x|y") {
    throw new Error(`${field} must use exact x and y fields.`);
  }
  const point = value as { readonly x?: unknown; readonly y?: unknown };
  if (typeof point.x !== "number" || typeof point.y !== "number"
    || !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
    throw new Error(`${field} must be a normalized point inside the image.`);
  }
  return canonicalPoint({ x: point.x, y: point.y });
}

function validateTrianglePoint(
  value: unknown,
  field: string,
): PersonalVisualHarmonyConstructionPointV1 {
  if (value === null || typeof value !== "object"
    || Object.keys(value).sort().join("|") !== "x|y") {
    throw new Error(`${field} must use exact x and y fields.`);
  }
  const point = value as { readonly x?: unknown; readonly y?: unknown };
  if (typeof point.x !== "number" || typeof point.y !== "number"
    || !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < -BOUNDARY_TOLERANCE_NORMALIZED
    || point.x > 1 + BOUNDARY_TOLERANCE_NORMALIZED
    || point.y < -BOUNDARY_TOLERANCE_NORMALIZED
    || point.y > 1 + BOUNDARY_TOLERANCE_NORMALIZED) {
    throw new Error(`${field} must be finite and inside the normalized image tolerance.`);
  }
  return canonicalPoint({ x: clampUnit(point.x), y: clampUnit(point.y) });
}

function validateFiniteConstructionPoint(
  value: unknown,
  field: string,
): PersonalVisualHarmonyConstructionPointV1 {
  if (value === null || typeof value !== "object"
    || Object.keys(value).sort().join("|") !== "x|y") {
    throw new Error(`${field} must use exact x and y fields.`);
  }
  const point = value as { readonly x?: unknown; readonly y?: unknown };
  if (typeof point.x !== "number" || typeof point.y !== "number"
    || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${field} must be finite.`);
  }
  return canonicalPoint({ x: point.x, y: point.y });
}

function pixelAngleDegrees(
  start: PersonalVisualHarmonyConstructionPointV1,
  end: PersonalVisualHarmonyConstructionPointV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): number {
  const raw = Math.atan2(
    (end.y - start.y) * sourcePixelHeight,
    (end.x - start.x) * sourcePixelWidth,
  ) * (180 / Math.PI);
  const normalized = raw % 180;
  return canonicalNumber(normalized < 0 ? normalized + 180 : normalized);
}

function requirePixelDimension(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 100_000) {
    throw new Error(`${field} must be a positive bounded image dimension.`);
  }
}

function subtract(
  first: PersonalVisualHarmonyConstructionPointV1,
  second: PersonalVisualHarmonyConstructionPointV1,
): PersonalVisualHarmonyConstructionPointV1 {
  return { x: first.x - second.x, y: first.y - second.y };
}

function add(
  first: PersonalVisualHarmonyConstructionPointV1,
  second: PersonalVisualHarmonyConstructionPointV1,
): PersonalVisualHarmonyConstructionPointV1 {
  return { x: first.x + second.x, y: first.y + second.y };
}

function multiply(
  point: PersonalVisualHarmonyConstructionPointV1,
  scale: number,
): PersonalVisualHarmonyConstructionPointV1 {
  return { x: point.x * scale, y: point.y * scale };
}

function cross(
  first: PersonalVisualHarmonyConstructionPointV1,
  second: PersonalVisualHarmonyConstructionPointV1,
): number {
  return (first.x * second.y) - (first.y * second.x);
}

function projectionScale(
  point: PersonalVisualHarmonyConstructionPointV1,
  origin: PersonalVisualHarmonyConstructionPointV1,
  direction: PersonalVisualHarmonyConstructionPointV1,
): number {
  const lengthSquared = (direction.x * direction.x) + (direction.y * direction.y);
  return (((point.x - origin.x) * direction.x) + ((point.y - origin.y) * direction.y))
    / lengthSquared;
}

function pointsEqual(
  first: PersonalVisualHarmonyConstructionPointV1,
  second: PersonalVisualHarmonyConstructionPointV1,
): boolean {
  return Math.abs(first.x - second.x) <= BOUNDARY_TOLERANCE_NORMALIZED
    && Math.abs(first.y - second.y) <= BOUNDARY_TOLERANCE_NORMALIZED;
}

function canonicalPoint(
  point: PersonalVisualHarmonyConstructionPointV1,
): PersonalVisualHarmonyConstructionPointV1 {
  return { x: canonicalNumber(point.x), y: canonicalNumber(point.y) };
}

function canonicalNumber(value: number): number {
  const result = Number(value.toFixed(12));
  return Object.is(result, -0) ? 0 : result;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function numberCompare(first: number, second: number): number {
  return first - second;
}

function stringCompare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

function identityToken(identity: string): string {
  return identity.slice("sha256:".length);
}
