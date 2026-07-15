import { createHash } from "node:crypto";
import type {
  PersonalVisualHarmonyPointV1,
  PersonalVisualHarmonyPrimitiveV1,
} from "./personal-visual-harmony.js";
import { canonicalizePersonalVisualHarmonyRotatedEllipseV1 } from "./personal-visual-harmony.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID =
  "norma.personal-visual-harmony-pixel-refinement-shadow@1" as const;
export const PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_PROPOSAL_CONTRACT_ID =
  "norma.personal-visual-harmony-pixel-refinement-proposal@1" as const;

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
  readonly rotatedEllipseSearch?: PersonalVisualHarmonyRotatedEllipsePixelSearchV1;
  readonly contentIdentity: string;
}

export interface PersonalVisualHarmonyRotatedEllipsePixelSearchV1 {
  readonly maximumEvaluations: 214;
  readonly evaluatedCandidates: number;
  readonly centerWindowPixels: number;
  readonly semiAxisWindowPixels: number;
  readonly orientationWindowDegrees: 4;
  readonly orientationStepDegrees: 1;
  readonly eccentricity: number;
  readonly visibleArcShare: number;
  readonly orientationAmbiguityMargin: number;
  readonly orientationPolicy:
    | "refined"
    | "unchanged"
    | "preserved_near_circle"
    | "ambiguous_abstention";
  readonly parameterDeltas: {
    readonly centerX: number;
    readonly centerY: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly rotationDegrees: number;
  };
}

export type PersonalVisualHarmonyPixelCropPlanV1 =
  | {
      readonly status: "ready";
      readonly originX: number;
      readonly originY: number;
      readonly sourceWidth: number;
      readonly sourceHeight: number;
      readonly rasterWidth: number;
      readonly rasterHeight: number;
      readonly scaleX: number;
      readonly scaleY: number;
      readonly maxDisplacementRasterPixels: number;
      readonly maxDisplacementSourcePixels: 6;
      readonly maxRasterDimension: 384;
      readonly maxRasterPixels: 147_456;
    }
  | {
      readonly status: "abstained";
      readonly reason: "bounded_crop_exceeded";
      readonly maxDisplacementSourcePixels: 6;
      readonly maxRasterDimension: 384;
      readonly maxRasterPixels: 147_456;
    };

export type PersonalVisualHarmonyPixelRefinementProposalReasonV1 =
  | PersonalVisualHarmonyPixelRefinementReasonV1
  | "bounded_crop_exceeded"
  | "pixel_read_unavailable";

export interface PersonalVisualHarmonyPixelRefinementProposalV1 {
  readonly contractId: typeof PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_PROPOSAL_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "refined" | "abstained";
  readonly candidateSetIdentity: string;
  readonly candidateId: string;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly automaticAcceptance: false;
  readonly explicitProposalAdoptionRequired: true;
  readonly proposalAdopted: false;
  readonly explicitUserConfirmationRequired: true;
  readonly coreRun: false;
  readonly coordinateSpace: "normalized-image";
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly crop: PersonalVisualHarmonyPixelCropPlanV1;
  readonly pixelRasterContentIdentity: string | null;
  readonly kernelContentIdentity: string | null;
  readonly originalGeometry: PersonalVisualHarmonyPixelRefinementPrimitiveV1;
  readonly proposedGeometry: PersonalVisualHarmonyPixelRefinementPrimitiveV1 | null;
  readonly evidence: PersonalVisualHarmonyPixelRefinementResultV1["evidence"] | null;
  readonly displacementPixels: {
    readonly bound: 6;
    readonly maximum: number;
    readonly mean: number;
  };
  readonly reason: PersonalVisualHarmonyPixelRefinementProposalReasonV1;
  readonly diagnostics: readonly PersonalVisualHarmonyPixelRefinementDiagnosticV1[];
  readonly contentIdentity: string;
}

/**
 * Builds the exact bounded crop plan shared by the widget and server. Keep this
 * function self-contained so the widget can embed its compiled implementation.
 */
export function createPersonalVisualHarmonyPixelCropPlanV1(input: {
  readonly primitive: PersonalVisualHarmonyPixelRefinementPrimitiveV1;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
}): PersonalVisualHarmonyPixelCropPlanV1 {
  const maxRasterDimension = 384 as const;
  const maxRasterPixels = 147_456 as const;
  const maxDisplacementSourcePixels = 6 as const;
  const cropMarginSourcePixels = 8;
  const sourceWidth = input?.sourcePixelWidth;
  const sourceHeight = input?.sourcePixelHeight;
  if (!Number.isInteger(sourceWidth) || !Number.isInteger(sourceHeight)
    || sourceWidth < 8 || sourceHeight < 8 || sourceWidth > 100_000 || sourceHeight > 100_000) {
    throw new Error("Pixel crop planning requires bounded integer source dimensions.");
  }
  const primitive = input?.primitive;
  if (primitive === null || typeof primitive !== "object" || Array.isArray(primitive)) {
    throw new Error("Pixel crop planning requires a supported primitive.");
  }
  const xExtent = sourceWidth;
  const yExtent = sourceHeight;
  let points: Array<{ x: number; y: number }>;
  if (primitive.kind === "segment" || primitive.kind === "axis") {
    points = [primitive.start, primitive.end].map((point) => ({
      x: point.x * xExtent,
      y: point.y * yExtent,
    }));
  } else if (primitive.kind === "quadrilateral") {
    points = primitive.vertices.map((point) => ({ x: point.x * xExtent, y: point.y * yExtent }));
  } else if (primitive.kind === "ellipse") {
    const center = { x: primitive.center.x * xExtent, y: primitive.center.y * yExtent };
    const radiusX = primitive.radiusX * xExtent;
    const radiusY = primitive.radiusY * yExtent;
    points = [
      { x: center.x - radiusX, y: center.y - radiusY },
      { x: center.x + radiusX, y: center.y + radiusY },
    ];
  } else {
    throw new Error("Pixel crop planning requires a supported primitive kind.");
  }
  if (points.length < 2 || points.some((point) => (
    !Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < 0 || point.x > xExtent || point.y < 0 || point.y > yExtent
  ))) {
    throw new Error("Pixel crop planning requires in-image primitive coordinates.");
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  let originX = Math.max(0, Math.floor(Math.min(...xs) - cropMarginSourcePixels));
  let originY = Math.max(0, Math.floor(Math.min(...ys) - cropMarginSourcePixels));
  let endX = Math.min(sourceWidth, Math.ceil(Math.max(...xs) + cropMarginSourcePixels) + 1);
  let endY = Math.min(sourceHeight, Math.ceil(Math.max(...ys) + cropMarginSourcePixels) + 1);
  if (endX - originX < 8) {
    const centerX = (originX + endX) / 2;
    originX = Math.max(0, Math.min(sourceWidth - 8, Math.floor(centerX - 4)));
    endX = originX + 8;
  }
  if (endY - originY < 8) {
    const centerY = (originY + endY) / 2;
    originY = Math.max(0, Math.min(sourceHeight - 8, Math.floor(centerY - 4)));
    endY = originY + 8;
  }
  const cropWidth = endX - originX;
  const cropHeight = endY - originY;
  const rasterWidth = Math.min(maxRasterDimension, cropWidth);
  const rasterHeight = Math.min(maxRasterDimension, cropHeight);
  const scaleX = cropWidth / rasterWidth;
  const scaleY = cropHeight / rasterHeight;
  const maximumScale = Math.max(scaleX, scaleY);
  if (maximumScale > maxDisplacementSourcePixels || rasterWidth * rasterHeight > maxRasterPixels) {
    return {
      status: "abstained",
      reason: "bounded_crop_exceeded",
      maxDisplacementSourcePixels,
      maxRasterDimension,
      maxRasterPixels,
    };
  }
  return {
    status: "ready",
    originX,
    originY,
    sourceWidth: cropWidth,
    sourceHeight: cropHeight,
    rasterWidth,
    rasterHeight,
    scaleX,
    scaleY,
    maxDisplacementRasterPixels: Math.max(1, Math.floor(maxDisplacementSourcePixels / maximumScale)),
    maxDisplacementSourcePixels,
    maxRasterDimension,
    maxRasterPixels,
  };
}

/**
 * Reuses the deterministic kernel on one candidate-local crop and returns a
 * separate, non-adopted normalized proposal. Core is never invoked here.
 */
export function refinePersonalVisualHarmonyCandidatePixelCropV1(input: {
  readonly candidateSetIdentity: string;
  readonly candidateId: string;
  readonly primitive: PersonalVisualHarmonyPixelRefinementPrimitiveV1;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly luminanceBytes?: readonly number[];
}): PersonalVisualHarmonyPixelRefinementProposalV1 {
  validatePixelCropProposalInput(input);
  const originalGeometry = clonePrimitive(input.primitive);
  const crop = createPersonalVisualHarmonyPixelCropPlanV1(input);
  if (crop.status === "abstained") {
    if (input.luminanceBytes !== undefined) {
      throw new Error("Abstained pixel crop plans must not receive luminance bytes.");
    }
    return pixelCropAbstention(input, originalGeometry, crop, "bounded_crop_exceeded");
  }
  if (input.luminanceBytes === undefined) {
    return pixelCropAbstention(input, originalGeometry, crop, "pixel_read_unavailable");
  }
  validateLuminanceBytes(input.luminanceBytes, crop.rasterWidth * crop.rasterHeight);
  const workingPrimitive = primitiveToWorkingCrop(input.primitive, input, crop);
  const workingRaster = {
    width: crop.rasterWidth,
    height: crop.rasterHeight,
    luminance: input.luminanceBytes.map((value) => value / 255),
  };
  try {
    validatePrimitive(workingPrimitive, workingRaster);
  } catch {
    return pixelCropAbstention(input, originalGeometry, crop, "invalid_refined_geometry");
  }
  const kernelResult = refinePersonalVisualHarmonyPrimitivePixelsV1({
    raster: workingRaster,
    primitive: workingPrimitive,
    maxDisplacementPixels: crop.maxDisplacementRasterPixels,
  });
  const mappedProposal = kernelResult.proposedGeometry === null
    ? null
    : primitiveFromWorkingCrop(kernelResult.proposedGeometry, input, crop);
  const sourceDisplacement = mappedProposal === null
    ? { maximum: 0, mean: 0 }
    : normalizedPrimitiveDisplacementPixels(
        input.primitive,
        mappedProposal,
        input.sourcePixelWidth,
        input.sourcePixelHeight,
      );
  const withinSourceBound = sourceDisplacement.maximum <= crop.maxDisplacementSourcePixels + EPSILON;
  const status = kernelResult.status === "refined" && mappedProposal !== null && withinSourceBound
    ? "refined" as const
    : "abstained" as const;
  const reason = withinSourceBound ? kernelResult.reason : "invalid_refined_geometry";
  const diagnostics = withinSourceBound
    ? kernelResult.diagnostics
    : Object.freeze([diagnosticFor("invalid_refined_geometry")]);
  const resultWithoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_PROPOSAL_CONTRACT_ID,
    contractVersion: 1 as const,
    status,
    candidateSetIdentity: input.candidateSetIdentity,
    candidateId: input.candidateId,
    candidateEvidenceOnly: true as const,
    sourceTruth: false as const,
    automaticAcceptance: false as const,
    explicitProposalAdoptionRequired: true as const,
    proposalAdopted: false as const,
    explicitUserConfirmationRequired: true as const,
    coreRun: false as const,
    coordinateSpace: "normalized-image" as const,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
    crop,
    pixelRasterContentIdentity: kernelResult.rasterContentIdentity,
    kernelContentIdentity: kernelResult.contentIdentity,
    originalGeometry,
    proposedGeometry: status === "refined" ? mappedProposal : null,
    evidence: kernelResult.evidence,
    displacementPixels: {
      bound: crop.maxDisplacementSourcePixels,
      maximum: canonicalNumber(Math.min(crop.maxDisplacementSourcePixels, sourceDisplacement.maximum)),
      mean: canonicalNumber(Math.min(crop.maxDisplacementSourcePixels, sourceDisplacement.mean)),
    },
    reason,
    diagnostics,
  };
  return { ...resultWithoutIdentity, contentIdentity: contentIdentityFor(resultWithoutIdentity) };
}

interface ScoredGeometry<TGeometry extends PersonalVisualHarmonyPixelRefinementPrimitiveV1> {
  readonly geometry: TGeometry;
  readonly support: number;
  readonly selectionScore: number;
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
  readonly rotatedEllipseSearch?: PersonalVisualHarmonyRotatedEllipsePixelSearchV1;
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
const ROTATED_ELLIPSE_ORIENTATION_DELTAS_DEGREES = Object.freeze([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
const ROTATED_ELLIPSE_MAX_EVALUATIONS = 214 as const;
const ROTATED_ELLIPSE_MIN_VISIBLE_ARC_SHARE = 0.3;
const ROTATED_ELLIPSE_VISIBLE_CONTRAST = 0.12;
const ROTATED_ELLIPSE_NEAR_CIRCLE_ECCENTRICITY = 0.05;
const ROTATED_ELLIPSE_MOVEMENT_PENALTY = 0.0025;
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
    ...(decision.rotatedEllipseSearch === undefined
      ? {}
      : { rotatedEllipseSearch: decision.rotatedEllipseSearch }),
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
  if (primitive.rotationDegrees !== undefined) {
    return refineRotatedEllipse(
      raster,
      { ...primitive, rotationDegrees: primitive.rotationDegrees },
      displacementBound,
    );
  }
  return refineAxisAlignedEllipse(raster, primitive, displacementBound);
}

function refineAxisAlignedEllipse(
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

function refineRotatedEllipse(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  primitive: EllipsePrimitive & { readonly rotationDegrees: number },
  displacementBound: number,
): RefinementDecision<EllipsePrimitive> {
  // The fixed coordinate-descent stages attempt at most 49 center + 49 axes
  // + 9 orientation + 49 center + 49 axes + 9 final orientation candidates.
  const searchDelta = Math.min(displacementBound, 3);
  const eccentricity = (primitive.radiusX - primitive.radiusY) / primitive.radiusX;
  const preserveOrientation = eccentricity < ROTATED_ELLIPSE_NEAR_CIRCLE_ECCENTRICITY;
  let evaluatedCandidates = 0;
  const visitedCandidates: ScoredGeometry<EllipsePrimitive>[] = [];

  const evaluate = (candidate: EllipsePrimitive | null): ScoredGeometry<EllipsePrimitive> | null => {
    if (candidate === null || evaluatedCandidates >= ROTATED_ELLIPSE_MAX_EVALUATIONS
      || (preserveOrientation && candidate.rotationDegrees !== primitive.rotationDegrees)
      || candidate.radiusX <= 1 || candidate.radiusY <= 1 || !ellipseInsideRaster(candidate, raster)) {
      return null;
    }
    const displacement = ellipseDisplacement(primitive, candidate);
    if (displacement.maximum > displacementBound + EPSILON) return null;
    evaluatedCandidates += 1;
    const evidence = rotatedEllipseEdgeEvidence(raster, candidate);
    const movementPenalty = ROTATED_ELLIPSE_MOVEMENT_PENALTY
      * displacement.mean / Math.max(1, displacementBound);
    const selectionScore = evidence.support * (0.6 + 0.4 * evidence.visibleArcShare)
      - movementPenalty;
    const scored = scoredGeometry(candidate, evidence.support, displacement, selectionScore);
    visitedCandidates.push(scored);
    return scored;
  };
  const centerStage = (base: EllipsePrimitive): readonly ScoredGeometry<EllipsePrimitive>[] => {
    const candidates: ScoredGeometry<EllipsePrimitive>[] = [];
    for (let dx = -searchDelta; dx <= searchDelta; dx += 1) {
      for (let dy = -searchDelta; dy <= searchDelta; dy += 1) {
        const scored = evaluate(canonicalRotatedEllipse({
          ...base,
          center: { x: base.center.x + dx, y: base.center.y + dy },
        }));
        if (scored !== null) candidates.push(scored);
      }
    }
    return candidates.sort(compareScoredGeometry);
  };
  const semiAxisStage = (base: EllipsePrimitive): readonly ScoredGeometry<EllipsePrimitive>[] => {
    const candidates: ScoredGeometry<EllipsePrimitive>[] = [];
    for (let radiusXDelta = -searchDelta; radiusXDelta <= searchDelta; radiusXDelta += 1) {
      for (let radiusYDelta = -searchDelta; radiusYDelta <= searchDelta; radiusYDelta += 1) {
        const scored = evaluate(canonicalRotatedEllipse({
          ...base,
          radiusX: base.radiusX + radiusXDelta,
          radiusY: base.radiusY + radiusYDelta,
        }));
        if (scored !== null) candidates.push(scored);
      }
    }
    return candidates.sort(compareScoredGeometry);
  };
  const bestGeometry = (
    candidates: readonly ScoredGeometry<EllipsePrimitive>[],
    fallback: EllipsePrimitive,
  ): EllipsePrimitive => candidates[0]?.geometry ?? fallback;
  const orientationStage = (base: EllipsePrimitive): readonly ScoredGeometry<EllipsePrimitive>[] => {
    const candidates: ScoredGeometry<EllipsePrimitive>[] = [];
    for (const rotationDelta of ROTATED_ELLIPSE_ORIENTATION_DELTAS_DEGREES) {
      const scored = evaluate(canonicalRotatedEllipse({
        ...base,
        rotationDegrees: primitive.rotationDegrees + rotationDelta,
      }));
      if (scored !== null) candidates.push(scored);
    }
    return candidates.sort(compareScoredGeometry);
  };

  let current: EllipsePrimitive = primitive;
  current = bestGeometry(centerStage(current), current);
  current = bestGeometry(semiAxisStage(current), current);
  if (!preserveOrientation) current = bestGeometry(orientationStage(current), current);

  current = bestGeometry(centerStage(current), current);
  current = bestGeometry(semiAxisStage(current), current);

  let orientationAmbiguityMargin = 1;
  let ambiguousOrientation = false;
  if (!preserveOrientation) {
    const orientationCandidates = orientationStage(current);
    const bestOrientation = orientationCandidates[0];
    if (bestOrientation !== undefined) {
      current = bestOrientation.geometry;
      const competingOrientationSupport = Math.max(0, ...orientationCandidates
        .filter((candidate) => undirectedAngleSeparationDegrees(
          candidate.geometry.rotationDegrees ?? 0,
          bestOrientation.geometry.rotationDegrees ?? 0,
        ) >= 3)
        .map((candidate) => candidate.support));
      orientationAmbiguityMargin = Math.max(
        0,
        bestOrientation.support - competingOrientationSupport,
      );
      ambiguousOrientation = competingOrientationSupport > 0
        && orientationAmbiguityMargin < MIN_AMBIGUITY_MARGIN;
    }
  }

  const originalEvidence = rotatedEllipseEdgeEvidence(raster, primitive);
  const proposedEvidence = rotatedEllipseEdgeEvidence(raster, current);
  const competingShapeSupport = Math.max(0, ...visitedCandidates
    .filter((candidate) => (
      geometrySeparation(current, candidate.geometry) >= MATERIAL_AMBIGUITY_SEPARATION_PIXELS
    ))
    .map((candidate) => candidate.support));
  const shapeAmbiguityMargin = Math.max(
    0,
    proposedEvidence.support - competingShapeSupport,
  );
  const ambiguityMargin = preserveOrientation
    ? shapeAmbiguityMargin
    : Math.min(shapeAmbiguityMargin, orientationAmbiguityMargin);
  let decision: RefinementDecision<EllipsePrimitive>;
  if (proposedEvidence.visibleArcShare < ROTATED_ELLIPSE_MIN_VISIBLE_ARC_SHARE) {
    decision = abstainedDecision(originalEvidence.support, "weak_edge_support");
  } else if (ambiguousOrientation) {
    decision = {
      status: "abstained",
      geometry: null,
      originalSupport: originalEvidence.support,
      proposedSupport: proposedEvidence.support,
      ambiguityMargin: orientationAmbiguityMargin,
      maximumDisplacement: 0,
      meanDisplacement: 0,
      reason: "ambiguous_edge_support",
    };
  } else {
    decision = decideSingleProposal(
      primitive,
      current,
      originalEvidence.support,
      proposedEvidence.support,
      ambiguityMargin,
      ellipseDisplacement(primitive, current),
    );
  }

  const proposed = decision.geometry;
  const rotationDelta = proposed === null
    ? 0
    : signedUndirectedAngleDeltaDegrees(
        proposed.rotationDegrees ?? 0,
        primitive.rotationDegrees,
      );
  const orientationPolicy = decision.reason === "ambiguous_edge_support" && ambiguousOrientation
    ? "ambiguous_abstention" as const
    : preserveOrientation
      ? "preserved_near_circle" as const
      : proposed !== null && Math.abs(rotationDelta) > EPSILON
        ? "refined" as const
        : "unchanged" as const;
  return {
    ...decision,
    rotatedEllipseSearch: {
      maximumEvaluations: ROTATED_ELLIPSE_MAX_EVALUATIONS,
      evaluatedCandidates,
      centerWindowPixels: searchDelta,
      semiAxisWindowPixels: searchDelta,
      orientationWindowDegrees: 4,
      orientationStepDegrees: 1,
      eccentricity: canonicalNumber(eccentricity),
      visibleArcShare: canonicalNumber(proposedEvidence.visibleArcShare),
      orientationAmbiguityMargin: canonicalNumber(orientationAmbiguityMargin),
      orientationPolicy,
      parameterDeltas: {
        centerX: canonicalNumber(proposed === null ? 0 : proposed.center.x - primitive.center.x),
        centerY: canonicalNumber(proposed === null ? 0 : proposed.center.y - primitive.center.y),
        radiusX: canonicalNumber(proposed === null ? 0 : proposed.radiusX - primitive.radiusX),
        radiusY: canonicalNumber(proposed === null ? 0 : proposed.radiusY - primitive.radiusY),
        rotationDegrees: canonicalNumber(rotationDelta),
      },
    },
  };
}

function canonicalRotatedEllipse(ellipse: EllipsePrimitive): EllipsePrimitive | null {
  const rotationDegrees = ellipse.rotationDegrees ?? 0;
  return canonicalizePersonalVisualHarmonyRotatedEllipseV1({
    kind: "ellipse",
    center: ellipse.center,
    radiusX: ellipse.radiusX,
    radiusY: ellipse.radiusY,
    rotationDegrees,
  });
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
  selectionScore = support,
): ScoredGeometry<TGeometry> {
  return {
    geometry,
    support,
    selectionScore,
    maximumDisplacement: displacement.maximum,
    meanDisplacement: displacement.mean,
    key: geometryKey(geometry),
  };
}

function compareScoredGeometry(
  first: ScoredGeometry<PersonalVisualHarmonyPixelRefinementPrimitiveV1>,
  second: ScoredGeometry<PersonalVisualHarmonyPixelRefinementPrimitiveV1>,
): number {
  return second.selectionScore - first.selectionScore
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
  if (ellipse.rotationDegrees !== undefined) {
    return rotatedEllipseEdgeEvidence(raster, ellipse).support;
  }
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

function rotatedEllipseEdgeEvidence(
  raster: PersonalVisualHarmonyLuminanceRasterV1,
  ellipse: EllipsePrimitive,
): { readonly support: number; readonly visibleArcShare: number } {
  const sampleCount = 128;
  const rotationRadians = (ellipse.rotationDegrees ?? 0) * Math.PI / 180;
  const rotationCos = Math.cos(rotationRadians);
  const rotationSin = Math.sin(rotationRadians);
  let total = 0;
  let observed = 0;
  let visible = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const angle = 2 * Math.PI * index / sampleCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const localX = ellipse.radiusX * cos;
    const localY = ellipse.radiusY * sin;
    const point = {
      x: ellipse.center.x + rotationCos * localX - rotationSin * localY,
      y: ellipse.center.y + rotationSin * localX + rotationCos * localY,
    };
    const localNormalX = cos / ellipse.radiusX;
    const localNormalY = sin / ellipse.radiusY;
    const rotatedNormal = {
      x: rotationCos * localNormalX - rotationSin * localNormalY,
      y: rotationSin * localNormalX + rotationCos * localNormalY,
    };
    const normalLength = Math.hypot(rotatedNormal.x, rotatedNormal.y);
    const contrast = contrastAcrossNormal(raster, point, {
      x: rotatedNormal.x / normalLength,
      y: rotatedNormal.y / normalLength,
    });
    if (contrast !== null) {
      total += contrast;
      observed += 1;
      if (contrast >= ROTATED_ELLIPSE_VISIBLE_CONTRAST) visible += 1;
    }
  }
  return {
    support: observed === 0 ? 0 : total / observed,
    visibleArcShare: observed === 0 ? 0 : visible / observed,
  };
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
  if (original.rotationDegrees !== undefined || proposed.rotationDegrees !== undefined) {
    return rotatedEllipseDisplacement(original, proposed);
  }
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

function rotatedEllipseDisplacement(
  original: EllipsePrimitive,
  proposed: EllipsePrimitive,
): { readonly maximum: number; readonly mean: number } {
  const originalMatrix = ellipseParameterMatrix(original);
  const proposedMatrix = ellipseParameterMatrix(proposed);
  const deltaMatrix = {
    xx: proposedMatrix.xx - originalMatrix.xx,
    xy: proposedMatrix.xy - originalMatrix.xy,
    yx: proposedMatrix.yx - originalMatrix.yx,
    yy: proposedMatrix.yy - originalMatrix.yy,
  };
  const centerDeltaX = proposed.center.x - original.center.x;
  const centerDeltaY = proposed.center.y - original.center.y;
  const values: number[] = [];
  for (let index = 0; index < ELLIPSE_DISPLACEMENT_SAMPLE_COUNT; index += 1) {
    const angle = 2 * Math.PI * index / ELLIPSE_DISPLACEMENT_SAMPLE_COUNT;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    values.push(Math.hypot(
      centerDeltaX + deltaMatrix.xx * cos + deltaMatrix.xy * sin,
      centerDeltaY + deltaMatrix.yx * cos + deltaMatrix.yy * sin,
    ));
  }
  const derivativeBound = Math.hypot(
    deltaMatrix.xx,
    deltaMatrix.xy,
    deltaMatrix.yx,
    deltaMatrix.yy,
  );
  return {
    maximum: Math.max(...values)
      + derivativeBound * Math.PI / ELLIPSE_DISPLACEMENT_SAMPLE_COUNT,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

function ellipseParameterMatrix(ellipse: EllipsePrimitive): {
  readonly xx: number;
  readonly xy: number;
  readonly yx: number;
  readonly yy: number;
} {
  const rotationRadians = (ellipse.rotationDegrees ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  return {
    xx: ellipse.radiusX * cos,
    xy: -ellipse.radiusY * sin,
    yx: ellipse.radiusX * sin,
    yy: ellipse.radiusY * cos,
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
  if (ellipse.rotationDegrees !== undefined) {
    const rotationRadians = ellipse.rotationDegrees * Math.PI / 180;
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);
    const halfWidth = Math.hypot(ellipse.radiusX * cos, ellipse.radiusY * sin);
    const halfHeight = Math.hypot(ellipse.radiusX * sin, ellipse.radiusY * cos);
    return ellipse.center.x - halfWidth >= CONTRAST_SAMPLE_OFFSET_PIXELS
      && ellipse.center.y - halfHeight >= CONTRAST_SAMPLE_OFFSET_PIXELS
      && ellipse.center.x + halfWidth <= raster.width - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS
      && ellipse.center.y + halfHeight <= raster.height - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS;
  }
  return ellipse.center.x - ellipse.radiusX >= CONTRAST_SAMPLE_OFFSET_PIXELS
    && ellipse.center.y - ellipse.radiusY >= CONTRAST_SAMPLE_OFFSET_PIXELS
    && ellipse.center.x + ellipse.radiusX <= raster.width - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS
    && ellipse.center.y + ellipse.radiusY <= raster.height - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS;
}

function undirectedAngleSeparationDegrees(first: number, second: number): number {
  return Math.abs(signedUndirectedAngleDeltaDegrees(first, second));
}

function signedUndirectedAngleDeltaDegrees(value: number, reference: number): number {
  let delta = (value - reference) % 180;
  if (delta < -90) delta += 180;
  if (delta >= 90) delta -= 180;
  return delta;
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

type PixelCropProposalInputV1 = {
  readonly candidateSetIdentity: string;
  readonly candidateId: string;
  readonly primitive: PersonalVisualHarmonyPixelRefinementPrimitiveV1;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly luminanceBytes?: readonly number[];
};

function pixelCropAbstention(
  input: PixelCropProposalInputV1,
  originalGeometry: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  crop: PersonalVisualHarmonyPixelCropPlanV1,
  reason: "bounded_crop_exceeded" | "pixel_read_unavailable" | "invalid_refined_geometry",
): PersonalVisualHarmonyPixelRefinementProposalV1 {
  const diagnostic = reason === "invalid_refined_geometry"
    ? diagnosticFor(reason)
    : {
        code: `pixel_refinement.${reason}`,
        severity: "warning" as const,
        message: reason === "bounded_crop_exceeded"
          ? "The candidate-local crop would exceed the fixed pixel or source-scale limit, so refinement abstained."
          : "The widget could not read a bounded luminance crop from the hydrated image, so refinement abstained.",
      };
  const resultWithoutIdentity = {
    contractId: PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_PROPOSAL_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "abstained" as const,
    candidateSetIdentity: input.candidateSetIdentity,
    candidateId: input.candidateId,
    candidateEvidenceOnly: true as const,
    sourceTruth: false as const,
    automaticAcceptance: false as const,
    explicitProposalAdoptionRequired: true as const,
    proposalAdopted: false as const,
    explicitUserConfirmationRequired: true as const,
    coreRun: false as const,
    coordinateSpace: "normalized-image" as const,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
    crop,
    pixelRasterContentIdentity: null,
    kernelContentIdentity: null,
    originalGeometry,
    proposedGeometry: null,
    evidence: null,
    displacementPixels: { bound: 6 as const, maximum: 0, mean: 0 },
    reason,
    diagnostics: Object.freeze([diagnostic]),
  };
  return { ...resultWithoutIdentity, contentIdentity: contentIdentityFor(resultWithoutIdentity) };
}

function validatePixelCropProposalInput(input: unknown): asserts input is PixelCropProposalInputV1 {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Pixel crop proposal input must use exact fields.");
  }
  const fields = Object.prototype.hasOwnProperty.call(input, "luminanceBytes")
    ? ["candidateId", "candidateSetIdentity", "luminanceBytes", "primitive", "sourcePixelHeight", "sourcePixelWidth"]
    : ["candidateId", "candidateSetIdentity", "primitive", "sourcePixelHeight", "sourcePixelWidth"];
  requireExactFields(input, fields, "Pixel crop proposal input");
  const value = input as Record<string, unknown>;
  if (typeof value.candidateSetIdentity !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(value.candidateSetIdentity)) {
    throw new Error("Pixel crop proposals require a canonical candidate-set identity.");
  }
  if (typeof value.candidateId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u.test(value.candidateId)) {
    throw new Error("Pixel crop proposals require a bounded candidate identifier.");
  }
  if (!Number.isInteger(value.sourcePixelWidth) || !Number.isInteger(value.sourcePixelHeight)
    || (value.sourcePixelWidth as number) < 8 || (value.sourcePixelHeight as number) < 8
    || (value.sourcePixelWidth as number) > 100_000 || (value.sourcePixelHeight as number) > 100_000) {
    throw new Error("Pixel crop proposals require bounded integer source dimensions.");
  }
  validateNormalizedRefinementPrimitive(value.primitive);
  if (Object.prototype.hasOwnProperty.call(value, "luminanceBytes") && !Array.isArray(value.luminanceBytes)) {
    throw new Error("Pixel crop luminance bytes must be an array when supplied.");
  }
}

function validateNormalizedRefinementPrimitive(
  value: unknown,
): asserts value is PersonalVisualHarmonyPixelRefinementPrimitiveV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Pixel crop proposals require a supported primitive object.");
  }
  const primitive = value as PersonalVisualHarmonyPixelRefinementPrimitiveV1;
  const validateNormalizedPoint = (point: PersonalVisualHarmonyPointV1): void => {
    requireExactFields(point, ["x", "y"], "Normalized primitive points");
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
      throw new Error("Normalized primitive points must stay inside the image.");
    }
  };
  if (primitive.kind === "segment" || primitive.kind === "axis") {
    requireExactFields(primitive, ["end", "kind", "start"], "Normalized line primitives");
    validateNormalizedPoint(primitive.start);
    validateNormalizedPoint(primitive.end);
    if (primitive.start.x === primitive.end.x && primitive.start.y === primitive.end.y) {
      throw new Error("Normalized line primitives require distinct endpoints.");
    }
    return;
  }
  if (primitive.kind === "quadrilateral") {
    requireExactFields(primitive, ["kind", "vertices"], "Normalized quadrilateral primitives");
    if (!Array.isArray(primitive.vertices) || primitive.vertices.length !== 4) {
      throw new Error("Normalized quadrilateral primitives require four vertices.");
    }
    for (const point of primitive.vertices) validateNormalizedPoint(point);
    const crosses = primitive.vertices.map((point, index) => {
      const next = primitive.vertices[(index + 1) % 4]!;
      const after = primitive.vertices[(index + 2) % 4]!;
      return (next.x - point.x) * (after.y - next.y) - (next.y - point.y) * (after.x - next.x);
    });
    if (!(crosses.every((cross) => cross > EPSILON) || crosses.every((cross) => cross < -EPSILON))) {
      throw new Error("Normalized quadrilateral primitives must be strictly convex.");
    }
    return;
  }
  if (primitive.kind !== "ellipse") {
    throw new Error("Pixel crop proposals require a supported primitive kind.");
  }
  requireExactFields(primitive, ["center", "kind", "radiusX", "radiusY"], "Normalized ellipse primitives");
  validateNormalizedPoint(primitive.center);
  if (!Number.isFinite(primitive.radiusX) || !Number.isFinite(primitive.radiusY)
    || primitive.radiusX <= 0 || primitive.radiusY <= 0
    || primitive.center.x - primitive.radiusX < 0 || primitive.center.x + primitive.radiusX > 1
    || primitive.center.y - primitive.radiusY < 0 || primitive.center.y + primitive.radiusY > 1) {
    throw new Error("Normalized ellipses must have positive in-image radii.");
  }
}

function validateLuminanceBytes(value: readonly number[], expectedLength: number): void {
  if (value.length !== expectedLength) {
    throw new Error("Pixel crop luminance byte length must match the canonical crop plan.");
  }
  for (const byte of value) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
      throw new Error("Pixel crop luminance bytes must be integers from 0 to 255.");
    }
  }
}

function primitiveToWorkingCrop(
  primitive: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  input: Pick<PixelCropProposalInputV1, "sourcePixelWidth" | "sourcePixelHeight">,
  crop: Extract<PersonalVisualHarmonyPixelCropPlanV1, { readonly status: "ready" }>,
): PersonalVisualHarmonyPixelRefinementPrimitiveV1 {
  const xExtent = input.sourcePixelWidth;
  const yExtent = input.sourcePixelHeight;
  const point = (value: PersonalVisualHarmonyPointV1): PersonalVisualHarmonyPointV1 => ({
    x: Math.max(0, Math.min(
      crop.rasterWidth - 1,
      (value.x * xExtent - crop.originX) / crop.scaleX,
    )),
    y: Math.max(0, Math.min(
      crop.rasterHeight - 1,
      (value.y * yExtent - crop.originY) / crop.scaleY,
    )),
  });
  if (primitive.kind === "segment" || primitive.kind === "axis") {
    return { kind: primitive.kind, start: point(primitive.start), end: point(primitive.end) };
  }
  if (primitive.kind === "quadrilateral") {
    return {
      kind: "quadrilateral",
      vertices: [
        point(primitive.vertices[0]),
        point(primitive.vertices[1]),
        point(primitive.vertices[2]),
        point(primitive.vertices[3]),
      ],
    };
  }
  const ellipsePoint = (value: PersonalVisualHarmonyPointV1): PersonalVisualHarmonyPointV1 => ({
    x: Math.max(CONTRAST_SAMPLE_OFFSET_PIXELS, Math.min(
      crop.rasterWidth - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS,
      (value.x * xExtent - crop.originX) / crop.scaleX,
    )),
    y: Math.max(CONTRAST_SAMPLE_OFFSET_PIXELS, Math.min(
      crop.rasterHeight - 1 - CONTRAST_SAMPLE_OFFSET_PIXELS,
      (value.y * yExtent - crop.originY) / crop.scaleY,
    )),
  });
  const minimum = ellipsePoint({
    x: primitive.center.x - primitive.radiusX,
    y: primitive.center.y - primitive.radiusY,
  });
  const maximum = ellipsePoint({
    x: primitive.center.x + primitive.radiusX,
    y: primitive.center.y + primitive.radiusY,
  });
  return {
    kind: "ellipse",
    center: {
      x: (minimum.x + maximum.x) / 2,
      y: (minimum.y + maximum.y) / 2,
    },
    radiusX: (maximum.x - minimum.x) / 2,
    radiusY: (maximum.y - minimum.y) / 2,
  };
}

function primitiveFromWorkingCrop(
  primitive: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  input: Pick<PixelCropProposalInputV1, "sourcePixelWidth" | "sourcePixelHeight">,
  crop: Extract<PersonalVisualHarmonyPixelCropPlanV1, { readonly status: "ready" }>,
): PersonalVisualHarmonyPixelRefinementPrimitiveV1 {
  const xExtent = input.sourcePixelWidth;
  const yExtent = input.sourcePixelHeight;
  const unit = (value: number): number => canonicalNumber(Math.max(0, Math.min(1, value)));
  const point = (value: PersonalVisualHarmonyPointV1): PersonalVisualHarmonyPointV1 => ({
    x: unit((crop.originX + value.x * crop.scaleX) / xExtent),
    y: unit((crop.originY + value.y * crop.scaleY) / yExtent),
  });
  if (primitive.kind === "segment" || primitive.kind === "axis") {
    return { kind: primitive.kind, start: point(primitive.start), end: point(primitive.end) };
  }
  if (primitive.kind === "quadrilateral") {
    return {
      kind: "quadrilateral",
      vertices: [
        point(primitive.vertices[0]),
        point(primitive.vertices[1]),
        point(primitive.vertices[2]),
        point(primitive.vertices[3]),
      ],
    };
  }
  return {
    kind: "ellipse",
    center: point(primitive.center),
    radiusX: unit(primitive.radiusX * crop.scaleX / xExtent),
    radiusY: unit(primitive.radiusY * crop.scaleY / yExtent),
  };
}

function normalizedPrimitiveDisplacementPixels(
  original: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  proposed: PersonalVisualHarmonyPixelRefinementPrimitiveV1,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): { readonly maximum: number; readonly mean: number } {
  const xExtent = sourcePixelWidth;
  const yExtent = sourcePixelHeight;
  const distance = (first: PersonalVisualHarmonyPointV1, second: PersonalVisualHarmonyPointV1): number => (
    Math.hypot((first.x - second.x) * xExtent, (first.y - second.y) * yExtent)
  );
  let distances: number[];
  if ((original.kind === "segment" || original.kind === "axis") && proposed.kind === original.kind) {
    distances = [distance(original.start, proposed.start), distance(original.end, proposed.end)];
  } else if (original.kind === "quadrilateral" && proposed.kind === "quadrilateral") {
    distances = original.vertices.map((point, index) => distance(point, proposed.vertices[index]!));
  } else if (original.kind === "ellipse" && proposed.kind === "ellipse") {
    distances = Array.from({ length: ELLIPSE_DISPLACEMENT_SAMPLE_COUNT }, (_, index) => {
      const radians = index * Math.PI * 2 / ELLIPSE_DISPLACEMENT_SAMPLE_COUNT;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return distance(
        {
          x: original.center.x + original.radiusX * cos,
          y: original.center.y + original.radiusY * sin,
        },
        {
          x: proposed.center.x + proposed.radiusX * cos,
          y: proposed.center.y + proposed.radiusY * sin,
        },
      );
    });
  } else {
    return { maximum: Number.POSITIVE_INFINITY, mean: Number.POSITIVE_INFINITY };
  }
  return {
    maximum: Math.max(...distances),
    mean: distances.reduce((sum, value) => sum + value, 0) / distances.length,
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
  const ellipseFields = primitive.rotationDegrees === undefined
    ? ["center", "kind", "radiusX", "radiusY"]
    : ["center", "kind", "radiusX", "radiusY", "rotationDegrees"];
  requireExactFields(primitive, ellipseFields, "Ellipse primitives");
  validatePoint(primitive.center, raster);
  if (!Number.isFinite(primitive.radiusX) || !Number.isFinite(primitive.radiusY)
    || primitive.radiusX <= 1 || primitive.radiusY <= 1) {
    throw new Error("Ellipse radii must be finite and greater than 1 pixel.");
  }
  if (primitive.rotationDegrees !== undefined) {
    const canonical = canonicalRotatedEllipse(primitive);
    if (canonical === null || geometryKey(canonical) !== geometryKey(primitive)) {
      throw new Error("Rotated ellipse pixel refinement requires canonical finite geometry.");
    }
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
    ...(primitive.rotationDegrees === undefined
      ? {}
      : { rotationDegrees: primitive.rotationDegrees }),
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
