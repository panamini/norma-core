import { createHash } from "node:crypto";
import type {
  PersonalVisualHarmonyPointV1,
  PersonalVisualHarmonyPrimitiveV1,
} from "./personal-visual-harmony.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID =
  "norma.personal-visual-harmony-pixel-refinement-shadow@1" as const;

export type PersonalVisualHarmonyPixelRefinementPrimitiveV1 =
  | Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "segment" }>
  | Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "axis" }>
  | Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "quadrilateral" }>
  | Extract<PersonalVisualHarmonyPrimitiveV1, { readonly kind: "ellipse" }>;

export interface PersonalVisualHarmonyLuminanceRasterV1 {
  readonly width: number;
  readonly height: number;
  readonly luminance: readonly number[];
}

export type PersonalVisualHarmonyPixelRefinementReasonV1 =
  | "improved_edge_support"
  | "weak_edge_support"
  | "ambiguous_edge_support"
  | "no_material_improvement"
  | "invalid_refined_geometry";

export interface PersonalVisualHarmonyPixelRefinementDiagnosticV1 {
  readonly code: string;
  readonly severity: "info" | "warning";
  readonly message: string;
}

export interface PersonalVisualHarmonyPixelRefinementResultV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "refined" | "abstained";
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly automaticAcceptance: false;
  readonly explicitUserConfirmationRequired: true;
  readonly coreRun: false;
  readonly coordinateSpace: "image-pixels";
  readonly rasterContentIdentity: string;
  readonly originalGeometry: PersonalVisualHarmonyPixelRefinementPrimitiveV1;
  readonly proposedGeometry: PersonalVisualHarmonyPixelRefinementPrimitiveV1 | null;
  readonly evidence: {
    readonly originalEdgeSupport: number;
    readonly proposedEdgeSupport: number;
    readonly edgeSupportGain: number;
    readonly ambiguityMargin: number;
    readonly confidence: number;
  };
  readonly displacementPixels: {
    readonly bound: number;
    readonly maximum: number;
    readonly mean: number;
  };
  readonly reason: PersonalVisualHarmonyPixelRefinementReasonV1;
  readonly diagnostics: readonly PersonalVisualHarmonyPixelRefinementDiagnosticV1[];
  readonly contentIdentity: string;
}

interface ScoredGeometry<TGeometry extends PersonalVisualHarmonyPixelRefinementPrimitiveV1> {
  readonly geometry: TGeometry;
  readonly support: number;
  readonly maximumDisplacement: number;
  readonly meanDisplacement: number;
  readonly key: string;
}

interface RefinementDecision<TGeometry extends PersonalVisualHarmonyPixelRefinementPrimitiveV1> {
  readonly status: "refined" | "abstained";
  readonly geometry: TGeometry | null;
  readonly originalSupport: number;
  readonly proposedSupport: number;
  readonly ambiguityMargin: number;
  readonly maximumDisplacement: number;
  readonly meanDisplacement: number;
  readonly reason: PersonalVisualHarmonyPixelRefinementReasonV1;
}

type LinePrimitive = Extract<
  PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  { readonly kind: "segment" | "axis" }
>;
type QuadrilateralPrimitive = Extract<
  PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  { readonly kind: "quadrilateral" }
>;
type EllipsePrimitive = Extract<
  PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  { readonly kind: "ellipse" }
>;

const DEFAULT_MAX_DISPLACEMENT_PIXELS = 4;
const MAX_MAX_DISPLACEMENT_PIXELS = 6;
const MAX_RASTER_PIXELS = 4_194_304;
const SUPPORTED_PRIMITIVE_KINDS: readonly string[] = Object.freeze([
  "segment",
  "axis",
  "quadrilateral",
  "ellipse",
]);
const LINE_ANGLE_DELTAS_DEGREES = Object.freeze([-3, -2, -1, 0, 1, 2, 3]);
const CONTRAST_SAMPLE_OFFSET_PIXELS = 1.25;
const MIN_ABSOLUTE_EDGE_SUPPORT = 0.16;
const MIN_EDGE_SUPPORT_GAIN = 0.025;
const MIN_AMBIGUITY_MARGIN = 0.0005;
const MATERIAL_AMBIGUITY_SEPARATION_PIXELS = 2.5;
const ELLIPSE_DISPLACEMENT_SAMPLE_COUNT = 256;
const EPSILON = 1e-9;

/**
 * Produces non-authoritative pixel evidence for an explicitly supplied primitive.
 * The returned proposal is never accepted or forwarded to Core by this module.
 */
export function refinePersonalVisualHarmonyPrimitivePixelsV1(input: {
  readonly raster: PersonalVisualHarmonyLuminanceRasterV1;
  readonly primitive: PersonalVisualHarmonyPixelRefinementPrimitiveV1;
  readonly maxDisplacementPixels?: number;
}): PersonalVisualHarmonyPixelRefinementResultV1 {
  validateRefinementInput(input);
  validateRaster(input.raster);
  validatePrimitive(input.primitive, input.raster);
  const displacementBound = validateDisplacementBound(
    input.maxDisplacementPixels,
    Object.prototype.hasOwnProperty.call(input, "maxDisplacementPixels"),
  );
  const originalGeometry = clonePrimitive(input.primitive);

  const decision = input.primitive.kind === "segment" || input.primitive.kind === "axis"
    ? refineLinePrimitive(input.raster, input.primitive, displacementBound)
    : input.primitive.kind === "quadrilateral"
      ? refineQuadrilateral(input.raster, input.primitive, displacementBound)
      : refineEllipse(input.raster, input.primitive, displacementBound);

  const confidence = confidenceFor(decision);
  const diagnostic = diagnosticFor(decision.reason);
  const resultWithoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID,
    contractVersion: 1 as const,
    status: decision.status,
    candidateEvidenceOnly: true as const,
    sourceTruth: false as const,
    automaticAcceptance: false as const,
    explicitUserConfirmationRequired: true as const,
    coreRun: false as const,
    coordinateSpace: "image-pixels" as const,
    rasterContentIdentity: rasterContentIdentityFor(input.raster),
    originalGeometry,
    proposedGeometry: decision.geometry === null ? null : clonePrimitive(decision.geometry),
    evidence: {
      originalEdgeSupport: canonicalNumber(decision.originalSupport),
      proposedEdgeSupport: canonicalNumber(decision.proposedSupport),
      edgeSupportGain: canonicalNumber(decision.proposedSupport - decision.originalSupport),
      ambiguityMargin: canonicalNumber(decision.ambiguityMargin),
      confidence: canonicalNumber(confidence),
    },
    displacementPixels: {
      bound: displacementBound,
      maximum: canonicalNumber(decision.maximumDisplacement),
      mean: canonicalNumber(decision.meanDisplacement),
    },
    reason: decision.reason,
    diagnostics: Object.freeze([diagnostic]),
  };

  return {
    ...resultWithoutIdentity,
    contentIdentity: contentIdentityFor(resultWithoutIdentity),
  };
}

function refineLinePrimitive(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  primitive: LinePrimitive,
  displacementBound: number,
): RefinementDecision<LinePrimitive> {
  const candidates = lineCandidates(raster, primitive, displacementBound);
  return decideFromCandidates(
    candidates,
    primitive,
    lineEdgeSupport(raster, primitive.start, primitive.end),
  );
}

function lineCandidates(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  primitive: LinePrimitive,
  displacementBound: number,
): readonly ScoredGeometry<LinePrimitive>[] {
  const midpoint = {
    x: (primitive.start.x + primitive.end.x) / 2,
    y: (primitive.start.y + primitive.end.y) / 2,
  };
  const dx = primitive.end.x - primitive.start.x;
  const dy = primitive.end.y - primitive.start.y;
  const length = Math.hypot(dx, dy);
  const unitNormal = { x: -dy / length, y: dx / length };
  const scored: ScoredGeometry<LinePrimitive>[] = [];

  for (const angleDeltaDegrees of LINE_ANGLE_DELTAS_DEGREES) {
    const radians = angleDeltaDegrees * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    for (let offset = -displacementBound; offset <= displacementBound; offset += 1) {
      const shiftedMidpoint = {
        x: midpoint.x + unitNormal.x * offset,
        y: midpoint.y + unitNormal.y * offset,
      };
      const rotatedHalf = {
        x: (dx * cos - dy * sin) / 2,
        y: (dx * sin + dy * cos) / 2,
      };
      const geometry = {
        kind: primitive.kind,
        start: {
          x: shiftedMidpoint.x - rotatedHalf.x,
          y: shiftedMidpoint.y - rotatedHalf.y,
        },
        end: {
          x: shiftedMidpoint.x + rotatedHalf.x,
          y: shiftedMidpoint.y + rotatedHalf.y,
        },
      } as LinePrimitive;
      const displacement = pointDisplacements(
        [primitive.start, primitive.end],
        [geometry.start, geometry.end],
      );
      if (
        displacement.maximum <= displacementBound + EPSILON
        && lineInsideRaster(geometry, raster)
      ) {
        scored.push(scoredGeometry(
          geometry,
          lineEdgeSupport(raster, geometry.start, geometry.end),
          displacement,
        ));
      }
    }
  }

  return scored.sort(compareScoredGeometry);
}

function refineQuadrilateral(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  primitive: QuadrilateralPrimitive,
  displacementBound: number,
): RefinementDecision<QuadrilateralPrimitive> {
  const originalSupport = quadrilateralEdgeSupport(raster, primitive);
  const refinedSides: LinePrimitive[] = [];
  const sideMargins: number[] = [];

  for (let sideIndex = 0; sideIndex < 4; sideIndex += 1) {
    const start = primitive.vertices[sideIndex];
    const end = primitive.vertices[(sideIndex + 1) % 4];
    if (start === undefined || end === undefined) {
      return abstainedDecision(originalSupport, "invalid_refined_geometry");
    }
    const candidates = lineCandidates(
      raster,
      { kind: "segment", start, end },
      displacementBound,
    );
    const best = candidates[0];
    if (best === undefined) {
      return abstainedDecision(originalSupport, "invalid_refined_geometry");
    }
    refinedSides.push(best.geometry);
    const competing = candidates.find((candidate) => (
      geometrySeparation(best.geometry, candidate.geometry) >= MATERIAL_AMBIGUITY_SEPARATION_PIXELS
    ));
    sideMargins.push(best.support - (competing?.support ?? 0));
  }

  const intersections = refinedSides.map((side, sideIndex) => {
    const previous = refinedSides[(sideIndex + 3) % 4];
    return previous === undefined ? null : lineIntersection(previous, side);
  });
  if (intersections.some((point) => point === null)) {
    return abstainedDecision(originalSupport, "invalid_refined_geometry");
  }

  const vertices = intersections as unknown as QuadrilateralPrimitive["vertices"];
  const proposed: QuadrilateralPrimitive = { kind: "quadrilateral", vertices };
  const displacement = pointDisplacements(primitive.vertices, proposed.vertices);
  if (
    displacement.maximum > displacementBound + EPSILON
    || !quadrilateralIsValid(proposed, primitive, raster)
  ) {
    return abstainedDecision(originalSupport, "invalid_refined_geometry");
  }

  const proposedSupport = quadrilateralEdgeSupport(raster, proposed);
  const margin = Math.max(0, Math.min(...sideMargins));
  return decideSingleProposal(
    primitive,
    proposed,
    originalSupport,
    proposedSupport,
    margin,
    displacement,
  );
}

function refineEllipse(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  primitive: EllipsePrimitive,
  displacementBound: number,
): RefinementDecision<EllipsePrimitive> {
  const searchDelta = Math.min(displacementBound, 3);
  const scored: ScoredGeometry<EllipsePrimitive>[] = [];
  for (let dx = -searchDelta; dx <= searchDelta; dx += 1) {
    for (let dy = -searchDelta; dy <= searchDelta; dy += 1) {
      for (let radiusXDelta = -searchDelta; radiusXDelta <= searchDelta; radiusXDelta += 1) {
        for (let radiusYDelta = -searchDelta; radiusYDelta <= searchDelta; radiusYDelta += 1) {
          const geometry: EllipsePrimitive = {
            kind: "ellipse",
            center: { x: primitive.center.x + dx, y: primitive.center.y + dy },
            radiusX: primitive.radiusX + radiusXDelta,
            radiusY: primitive.radiusY + radiusYDelta,
          };
          if (geometry.radiusX <= 1 || geometry.radiusY <= 1 || !ellipseInsideRaster(geometry, raster)) {
            continue;
          }
          const displacement = ellipseDisplacement(primitive, geometry);
          if (displacement.maximum <= displacementBound + EPSILON) {
            scored.push(scoredGeometry(
              geometry,
              ellipseEdgeSupport(raster, geometry),
              displacement,
            ));
          }
        }
      }
    }
  }
  scored.sort(compareScoredGeometry);
  return decideFromCandidates(scored, primitive, ellipseEdgeSupport(raster, primitive));
}

function decideFromCandidates<TGeometry extends PersonalVisualHarmonyPixelRefinementPrimitiveV1>(
  candidates: readonly ScoredGeometry<TGeometry>[],
  original: TGeometry,
  originalSupport: number,
): RefinementDecision<TGeometry> {
  const best = candidates[0];
  if (best === undefined) {
    return abstainedDecision(originalSupport, "invalid_refined_geometry");
  }
  const competing = candidates.find((candidate) => (
    geometrySeparation(best.geometry, candidate.geometry) >= MATERIAL_AMBIGUITY_SEPARATION_PIXELS
  ));
  const ambiguityMargin = Math.max(0, best.support - (competing?.support ?? 0));
  return decideSingleProposal(
    original,
    best.geometry,
    originalSupport,
    best.support,
    ambiguityMargin,
    {
      maximum: best.maximumDisplacement,
      mean: best.meanDisplacement,
    },
  );
}

function decideSingleProposal<TGeometry extends PersonalVisualHarmonyPixelRefinementPrimitiveV1>(
  original: TGeometry,
  proposed: TGeometry,
  originalSupport: number,
  proposedSupport: number,
  ambiguityMargin: number,
  displacement: { readonly maximum: number; readonly mean: number },
): RefinementDecision<TGeometry> {
  const common = {
    originalSupport,
    proposedSupport,
    ambiguityMargin,
  };
  if (proposedSupport < MIN_ABSOLUTE_EDGE_SUPPORT) {
    return { ...common, ...emptyDisplacement(), status: "abstained", geometry: null, reason: "weak_edge_support" };
  }
  if (proposedSupport - originalSupport < MIN_EDGE_SUPPORT_GAIN || geometryKey(original) === geometryKey(proposed)) {
    return {
      ...common,
      ...emptyDisplacement(),
      status: "abstained",
      geometry: null,
      reason: "no_material_improvement",
    };
  }
  if (ambiguityMargin < MIN_AMBIGUITY_MARGIN) {
    return {
      ...common,
      ...emptyDisplacement(),
      status: "abstained",
      geometry: null,
      reason: "ambiguous_edge_support",
    };
  }
  return {
    ...common,
    status: "refined",
    geometry: proposed,
    maximumDisplacement: displacement.maximum,
    meanDisplacement: displacement.mean,
    reason: "improved_edge_support",
  };
}

function abstainedDecision<TGeometry extends PersonalVisualHarmonyPixelRefinementPrimitiveV1>(
  originalSupport: number,
  reason: PersonalVisualHarmonyPixelRefinementReasonV1,
): RefinementDecision<TGeometry> {
  return {
    status: "abstained",
    geometry: null,
    originalSupport,
    proposedSupport: originalSupport,
    ambiguityMargin: 0,
    maximumDisplacement: 0,
    meanDisplacement: 0,
    reason,
  };
}

function emptyDisplacement(): { readonly maximumDisplacement: 0; readonly meanDisplacement: 0 } {
  return { maximumDisplacement: 0, meanDisplacement: 0 };
}

function scoredGeometry<TGeometry extends PersonalVisualHarmonyPixelRefinementPrimitiveV1>(
  geometry: TGeometry,
  support: number,
  displacement: { readonly maximum: number; readonly mean: number },
): ScoredGeometry<TGeometry> {
  return {
    geometry,
    support,
    maximumDisplacement: displacement.maximum,
    meanDisplacement: displacement.mean,
    key: geometryKey(geometry),
  };
}

function compareScoredGeometry(
  first: ScoredGeometry<PersonalVisualHarmonyPixelRefinementPrimitiveV1>,
  second: ScoredGeometry<PersonalVisualHarmonyPixelRefinementPrimitiveV1>,
): number {
  return second.support - first.support
    || first.maximumDisplacement - second.maximumDisplacement
    || compareStrings(first.key, second.key);
}

function lineEdgeSupport(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  start: PersonalVisualHarmonyPointV1,
  end: PersonalVisualHarmonyPointV1,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length <= EPSILON) return 0;
  const normal = { x: -dy / length, y: dx / length };
  const sampleCount = Math.max(16, Math.min(160, Math.ceil(length * 1.5)));
  let total = 0;
  let observed = 0;
  for (let index = 1; index < sampleCount; index += 1) {
    const progress = index / sampleCount;
    if (progress < 0.06 || progress > 0.94) continue;
    const point = { x: start.x + dx * progress, y: start.y + dy * progress };
    const contrast = contrastAcrossNormal(raster, point, normal);
    if (contrast !== null) {
      total += contrast;
      observed += 1;
    }
  }
  return observed === 0 ? 0 : total / observed;
}

function quadrilateralEdgeSupport(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  primitive: QuadrilateralPrimitive,
): number {
  let total = 0;
  for (let index = 0; index < 4; index += 1) {
    const start = primitive.vertices[index];
    const end = primitive.vertices[(index + 1) % 4];
    if (start === undefined || end === undefined) return 0;
    total += lineEdgeSupport(raster, start, end);
  }
  return total / 4;
}

function ellipseEdgeSupport(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  ellipse: EllipsePrimitive,
): number {
  const sampleCount = 128;
  let total = 0;
  let observed = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const angle = 2 * Math.PI * index / sampleCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const point = {
      x: ellipse.center.x + ellipse.radiusX * cos,
      y: ellipse.center.y + ellipse.radiusY * sin,
    };
    const normalLength = Math.hypot(cos / ellipse.radiusX, sin / ellipse.radiusY);
    const normal = {
      x: (cos / ellipse.radiusX) / normalLength,
      y: (sin / ellipse.radiusY) / normalLength,
    };
    const contrast = contrastAcrossNormal(raster, point, normal);
    if (contrast !== null) {
      total += contrast;
      observed += 1;
    }
  }
  return observed === 0 ? 0 : total / observed;
}

function contrastAcrossNormal(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  point: PersonalVisualHarmonyPointV1,
  normal: PersonalVisualHarmonyPointV1,
): number | null {
  const first = {
    x: point.x + normal.x * CONTRAST_SAMPLE_OFFSET_PIXELS,
    y: point.y + normal.y * CONTRAST_SAMPLE_OFFSET_PIXELS,
  };
  const second = {
    x: point.x - normal.x * CONTRAST_SAMPLE_OFFSET_PIXELS,
    y: point.y - normal.y * CONTRAST_SAMPLE_OFFSET_PIXELS,
  };
  if (!pointInsideRaster(first, raster) || !pointInsideRaster(second, raster)) return null;
  return Math.abs(luminanceAt(raster, first.x, first.y) - luminanceAt(raster, second.x, second.y));
}

function luminanceAt(raster: PersonalVisualHarmonyLuminanceRasterV1, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(raster.width - 1, x0 + 1);
  const y1 = Math.min(raster.height - 1, y0 + 1);
  const xWeight = x - x0;
  const yWeight = y - y0;
  const top = rasterValue(raster, x0, y0) * (1 - xWeight) + rasterValue(raster, x1, y0) * xWeight;
  const bottom = rasterValue(raster, x0, y1) * (1 - xWeight) + rasterValue(raster, x1, y1) * xWeight;
  return top * (1 - yWeight) + bottom * yWeight;
}

function rasterValue(raster: PersonalVisualHarmonyLuminanceRasterV1, x: number, y: number): number {
  return raster.luminance[y * raster.width + x] ?? 0;
}

function lineIntersection(first: LinePrimitive, second: LinePrimitive): PersonalVisualHarmonyPointV1 | null {
  const firstDx = first.end.x - first.start.x;
  const firstDy = first.end.y - first.start.y;
  const secondDx = second.end.x - second.start.x;
  const secondDy = second.end.y - second.start.y;
  const denominator = firstDx * secondDy - firstDy * secondDx;
  if (Math.abs(denominator) <= EPSILON) return null;
  const offsetX = second.start.x - first.start.x;
  const offsetY = second.start.y - first.start.y;
  const scale = (offsetX * secondDy - offsetY * secondDx) / denominator;
  return {
    x: first.start.x + scale * firstDx,
    y: first.start.y + scale * firstDy,
  };
}

function quadrilateralIsValid(
  proposed: QuadrilateralPrimitive,
  original: QuadrilateralPrimitive,
  raster: PersonalVisualHarmonyLuminanceRasterV1,
): boolean {
  if (!proposed.vertices.every((point) => pointInsideRaster(point, raster))) return false;
  const proposedArea = signedArea(proposed.vertices);
  const originalArea = signedArea(original.vertices);
  if (Math.abs(proposedArea) < 4 || Math.sign(proposedArea) !== Math.sign(originalArea)) return false;
  return quadrilateralIsStrictlyConvex(proposed.vertices);
}

function quadrilateralIsStrictlyConvex(vertices: QuadrilateralPrimitive["vertices"]): boolean {
  const crossProducts = vertices.map((point, index) => {
    const next = vertices[(index + 1) % 4];
    const after = vertices[(index + 2) % 4];
    if (next === undefined || after === undefined) return 0;
    return cross(next.x - point.x, next.y - point.y, after.x - next.x, after.y - next.y);
  });
  return crossProducts.every((value) => value > EPSILON)
    || crossProducts.every((value) => value < -EPSILON);
}

function signedArea(vertices: QuadrilateralPrimitive["vertices"]): number {
  let twiceArea = 0;
  for (let index = 0; index < 4; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % 4];
    if (current !== undefined && next !== undefined) {
      twiceArea += current.x * next.y - next.x * current.y;
    }
  }
  return twiceArea / 2;
}

function cross(firstX: number, firstY: number, secondX: number, secondY: number): number {
  return firstX * secondY - firstY * secondX;
}

function pointDisplacements(
  original: readonly PersonalVisualHarmonyPointV1[],
  proposed: readonly PersonalVisualHarmonyPointV1[],
): { readonly maximum: number; readonly mean: number } {
  const values = original.map((point, index) => {
    const candidate = proposed[index];
    return candidate === undefined ? Number.POSITIVE_INFINITY : Math.hypot(candidate.x - point.x, candidate.y - point.y);
  });
  return {
    maximum: Math.max(...values),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

function ellipseDisplacement(
  original: EllipsePrimitive,
  proposed: EllipsePrimitive,
): { readonly maximum: number; readonly mean: number } {
  const centerDeltaX = proposed.center.x - original.center.x;
  const centerDeltaY = proposed.center.y - original.center.y;
  const radiusDeltaX = proposed.radiusX - original.radiusX;
  const radiusDeltaY = proposed.radiusY - original.radiusY;
  const values: number[] = [];
  for (let index = 0; index < ELLIPSE_DISPLACEMENT_SAMPLE_COUNT; index += 1) {
    const angle = 2 * Math.PI * index / ELLIPSE_DISPLACEMENT_SAMPLE_COUNT;
    values.push(Math.hypot(
      centerDeltaX + radiusDeltaX * Math.cos(angle),
      centerDeltaY + radiusDeltaY * Math.sin(angle),
    ));
  }
  const sampledMaximum = Math.max(...values);
  // The displacement norm is Lipschitz-continuous in angle with this bound.
  // Adding the farthest distance to a sample prevents perimeter underestimation.
  const angularLipschitzBound = Math.max(Math.abs(radiusDeltaX), Math.abs(radiusDeltaY));
  const conservativeMaximum = sampledMaximum
    + angularLipschitzBound * Math.PI / ELLIPSE_DISPLACEMENT_SAMPLE_COUNT;
  return {
    maximum: conservativeMaximum,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

function geometrySeparation(
  first: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  second: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
): number {
  if (first.kind !== second.kind) return Number.POSITIVE_INFINITY;
  if ((first.kind === "segment" || first.kind === "axis")
    && (second.kind === "segment" || second.kind === "axis")) {
    return pointDisplacements([first.start, first.end], [second.start, second.end]).maximum;
  }
  if (first.kind === "quadrilateral" && second.kind === "quadrilateral") {
    return pointDisplacements(first.vertices, second.vertices).maximum;
  }
  if (first.kind === "ellipse" && second.kind === "ellipse") {
    return ellipseDisplacement(first, second).maximum;
  }
  return Number.POSITIVE_INFINITY;
}

function lineInsideRaster(line: LinePrimitive, raster: PersonalVisualHarmonyLuminanceRasterV1): boolean {
  return pointInsideRaster(line.start, raster) && pointInsideRaster(line.end, raster);
}

function ellipseInsideRaster(
  ellipse: EllipsePrimitive,
  raster: PersonalVisualHarmonyLuminanceRasterV1,
): boolean {
  return ellipse.center.x - ellipse.radiusX >= CONTRAST_SAMPLE_OFFSET_PIXELS
    && ellipse.center.y - ellipse.radiusY >= CONTRAST_SAMPLE_OFFSET_PIXELS
    && ellipse.center.x + ellipse.radiusX <= raster.width - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS
    && ellipse.center.y + ellipse.radiusY <= raster.height - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS;
}

function pointInsideRaster(
  point: PersonalVisualHarmonyPointV1,
  raster: PersonalVisualHarmonyLuminanceRasterV1,
): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= raster.width - 1 && point.y <= raster.height - 1;
}

function confidenceFor(
  decision: RefinementDecision<PersonalVisualHarmonyPixelRefinementPrimitiveV1>,
): number {
  const support = Math.min(1, decision.proposedSupport);
  const gain = Math.min(1, Math.max(0, decision.proposedSupport - decision.originalSupport) / 0.3);
  const margin = Math.min(1, decision.ambiguityMargin / 0.08);
  return decision.status === "refined"
    ? support * 0.6 + gain * 0.3 + margin * 0.1
    : support * 0.35;
}

function diagnosticFor(
  reason: PersonalVisualHarmonyPixelRefinementReasonV1,
): PersonalVisualHarmonyPixelRefinementDiagnosticV1 {
  const messages: Readonly<Record<PersonalVisualHarmonyPixelRefinementReasonV1, string>> = {
    improved_edge_support: "A bounded local proposal has stronger raster edge support; explicit user confirmation is still required.",
    weak_edge_support: "The local luminance contrast is too weak to support a refinement proposal.",
    ambiguous_edge_support: "Multiple local candidates have indistinguishable edge support, so the refiner abstained.",
    no_material_improvement: "No bounded candidate materially improves the supplied geometry's edge support.",
    invalid_refined_geometry: "The bounded search did not produce a valid geometry that preserves the primitive's constraints.",
  };
  return {
    code: `pixel_refinement.${reason}`,
    severity: reason === "improved_edge_support" ? "info" : "warning",
    message: messages[reason],
  };
}

function validateRaster(raster: PersonalVisualHarmonyLuminanceRasterV1): void {
  requireExactFields(raster, ["height", "luminance", "width"], "Pixel refinement rasters");
  if (!Number.isInteger(raster.width) || !Number.isInteger(raster.height) || raster.width < 8 || raster.height < 8) {
    throw new Error("Pixel refinement requires integer raster dimensions of at least 8 by 8 pixels.");
  }
  if (raster.width * raster.height > MAX_RASTER_PIXELS) {
    throw new Error(`Pixel refinement supports at most ${MAX_RASTER_PIXELS} luminance samples.`);
  }
  if (!Array.isArray(raster.luminance)) {
    throw new Error("Raster luminance must be an array.");
  }
  if (raster.luminance.length !== raster.width * raster.height) {
    throw new Error("Raster luminance length must equal width multiplied by height.");
  }
  for (const value of raster.luminance) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error("Raster luminance values must be finite numbers between 0 and 1.");
    }
  }
}

function validatePrimitive(
  primitive: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  raster: PersonalVisualHarmonyLuminanceRasterV1,
): void {
  if (primitive === null || typeof primitive !== "object" || Array.isArray(primitive)) {
    throw new Error("Pixel refinement requires a supported primitive object.");
  }
  const primitiveKind = (primitive as unknown as Record<string, unknown>).kind;
  if (typeof primitiveKind !== "string" || !SUPPORTED_PRIMITIVE_KINDS.includes(primitiveKind)) {
    throw new Error("Pixel refinement requires a supported primitive kind.");
  }
  if (primitive.kind === "segment" || primitive.kind === "axis") {
    requireExactFields(primitive, ["end", "kind", "start"], "Line-like primitives");
    validatePoint(primitive.start, raster);
    validatePoint(primitive.end, raster);
    if (Math.hypot(primitive.end.x - primitive.start.x, primitive.end.y - primitive.start.y) < 4) {
      throw new Error("Line-like primitives must span at least 4 pixels.");
    }
    return;
  }
  if (primitive.kind === "quadrilateral") {
    requireExactFields(primitive, ["kind", "vertices"], "Quadrilateral primitives");
    if (!Array.isArray(primitive.vertices) || primitive.vertices.length !== 4) {
      throw new Error("Quadrilateral primitives must use exactly four vertices.");
    }
    for (const point of primitive.vertices) validatePoint(point, raster);
    if (Math.abs(signedArea(primitive.vertices)) < 4) {
      throw new Error("Quadrilateral primitives must have a non-degenerate area.");
    }
    if (!quadrilateralIsStrictlyConvex(primitive.vertices)) {
      throw new Error("Quadrilateral primitives must form a simple strictly convex perimeter.");
    }
    return;
  }
  if (primitive.kind !== "ellipse") {
    throw new Error("Pixel refinement requires a supported primitive kind.");
  }
  requireExactFields(primitive, ["center", "kind", "radiusX", "radiusY"], "Ellipse primitives");
  validatePoint(primitive.center, raster);
  if (!Number.isFinite(primitive.radiusX) || !Number.isFinite(primitive.radiusY)
    || primitive.radiusX <= 1 || primitive.radiusY <= 1) {
    throw new Error("Ellipse radii must be finite and greater than 1 pixel.");
  }
  if (!ellipseInsideRaster(primitive, raster)) {
    throw new Error("Ellipse perimeter and contrast samples must stay within the raster.");
  }
}

function validatePoint(
  point: PersonalVisualHarmonyPointV1,
  raster: PersonalVisualHarmonyLuminanceRasterV1,
): void {
  requireExactFields(point, ["x", "y"], "Primitive points");
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !pointInsideRaster(point, raster)) {
    throw new Error("Primitive coordinates must be finite image-pixel positions inside the raster.");
  }
}

function validateRefinementInput(input: unknown): void {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Pixel refinement input must use exact fields.");
  }
  const fields = Object.prototype.hasOwnProperty.call(input, "maxDisplacementPixels")
    ? ["maxDisplacementPixels", "primitive", "raster"]
    : ["primitive", "raster"];
  requireExactFields(input, fields, "Pixel refinement input");
}

function requireExactFields(
  value: unknown,
  expectedFields: readonly string[],
  label: string,
): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must use exact fields.`);
  }
  const actualFields = Object.keys(value).sort(compareStrings);
  const expected = [...expectedFields].sort(compareStrings);
  if (actualFields.length !== expected.length
    || actualFields.some((field, index) => field !== expected[index])) {
    throw new Error(`${label} must use exact fields.`);
  }
}

function validateDisplacementBound(value: unknown, explicitlyProvided: boolean): number {
  const bound = explicitlyProvided ? value : DEFAULT_MAX_DISPLACEMENT_PIXELS;
  if (typeof bound !== "number"
    || !Number.isInteger(bound)
    || bound < 1
    || bound > MAX_MAX_DISPLACEMENT_PIXELS) {
    throw new Error(`maxDisplacementPixels must be an integer from 1 to ${MAX_MAX_DISPLACEMENT_PIXELS}.`);
  }
  return bound;
}

function clonePrimitive<TPrimitive extends PersonalVisualHarmonyPixelRefinementPrimitiveV1>(
  primitive: TPrimitive,
): TPrimitive {
  if (primitive.kind === "segment" || primitive.kind === "axis") {
    return {
      kind: primitive.kind,
      start: { ...primitive.start },
      end: { ...primitive.end },
    } as TPrimitive;
  }
  if (primitive.kind === "quadrilateral") {
    return {
      kind: "quadrilateral",
      vertices: [
        { ...primitive.vertices[0] },
        { ...primitive.vertices[1] },
        { ...primitive.vertices[2] },
        { ...primitive.vertices[3] },
      ],
    } as unknown as TPrimitive;
  }
  return {
    kind: "ellipse",
    center: { ...primitive.center },
    radiusX: primitive.radiusX,
    radiusY: primitive.radiusY,
  } as TPrimitive;
}

function geometryKey(geometry: PersonalVisualHarmonyPixelRefinementPrimitiveV1): string {
  return serializeCanonicalJson(geometry, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function contentIdentityFor(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY))
    .digest("hex")}`;
}

function rasterContentIdentityFor(raster: PersonalVisualHarmonyLuminanceRasterV1): string {
  const hash = createHash("sha256");
  hash.update(`norma-luminance-raster-v1\n${raster.width}x${raster.height}\n`);
  const chunk: string[] = [];
  for (const luminance of raster.luminance) {
    chunk.push(Object.is(luminance, -0) ? "0" : luminance.toString());
    if (chunk.length === 1_024) {
      hash.update(`${chunk.join(",")}\n`);
      chunk.length = 0;
    }
  }
  if (chunk.length > 0) hash.update(`${chunk.join(",")}\n`);
  return `sha256:${hash.digest("hex")}`;
}

function compareStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : Number(value.toFixed(12));
}
