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
}): PersonalVisualHarmonyConstructionAnalysisV1 {
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const enabledLayers = normalizeLayers(input.enabledLayers);
  const frame = validateFrame(input.frame);
  const observedLineInputs = validateObservedLines(input.observedLines);
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
  return PERSONAL_VISUAL_HARMONY_CONSTRUCTION_LAYERS.filter((value) => unique.has(value));
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
  if (first === undefined || last === undefined || pointsEqual(first.point, last.point)) {
    throw new Error("Observed line does not cross the confirmed construction frame.");
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
  const frameParticipants = frame.vertices.map((start, frameEdgeIndex): BoundedConstructionLine => {
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
