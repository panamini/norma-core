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
  const supportVector = subtract(supportLine.clippedEnd, supportLine.clippedStart);
  const diagonalVector = subtract(diagonal.end, diagonal.start);
  const denominator = cross(supportVector, diagonalVector);
  let status: PersonalVisualHarmonySupportLineDiagonalRelationV1["status"];
  let intersection: PersonalVisualHarmonyConstructionPointV1 | null = null;
  let normalizedSupportLinePosition: number | null = null;
  let normalizedFormatDiagonalPosition: number | null = null;
  if (Math.abs(denominator) <= BOUNDARY_TOLERANCE_NORMALIZED) {
    status = Math.abs(cross(
      subtract(diagonal.start, supportLine.clippedStart),
      supportVector,
    )) <= BOUNDARY_TOLERANCE_NORMALIZED
      ? "coincident"
      : "parallel";
  } else {
    const offset = subtract(diagonal.start, supportLine.clippedStart);
    const supportScale = cross(offset, diagonalVector) / denominator;
    const diagonalScale = cross(offset, supportVector) / denominator;
    if (supportScale >= -BOUNDARY_TOLERANCE_NORMALIZED
      && supportScale <= 1 + BOUNDARY_TOLERANCE_NORMALIZED
      && diagonalScale >= -BOUNDARY_TOLERANCE_NORMALIZED
      && diagonalScale <= 1 + BOUNDARY_TOLERANCE_NORMALIZED) {
      status = "intersection_within_frame";
      intersection = canonicalPoint(add(
        supportLine.clippedStart,
        multiply(supportVector, supportScale),
      ));
      normalizedSupportLinePosition = canonicalNumber(clampUnit(supportScale));
      normalizedFormatDiagonalPosition = canonicalNumber(clampUnit(diagonalScale));
    } else {
      status = "no_intersection_within_frame";
    }
  }
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

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

function identityToken(identity: string): string {
  return identity.slice("sha256:".length);
}
