import { createHash } from "node:crypto";

import {
  analyzeDeclaredLengthPairV1,
  type DeclaredLengthPairAnalysisResultV1,
} from "./harmonic-relationship-analysis.js";
import {
  BASIC_PROPORTIONS_PACK,
  GEOMETRY_HARMONIES_PACK,
} from "./ratio-pack.js";
import { serializeCanonicalJson } from "./serialization.js";

export const DECLARED_SPATIAL_MEASUREMENT_PLAN_CONTRACT_ID =
  "norma.declared-spatial-measurement-plan@1" as const;
export const DECLARED_SPATIAL_MEASUREMENT_CONFIRMATION_CONTRACT_ID =
  "norma.declared-spatial-measurement-confirmation@1" as const;
export const DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID =
  "norma.confirmDeclaredSpatialMeasurementsV1" as const;
export const DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY =
  "image_plane_pixels_v1" as const;
export const DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS = [
  "norma.geometry-harmonies@0.1.0",
  "norma.basic-proportions@0.1.0",
] as const;
export const DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE = 0.025 as const;

const SHA256_IDENTITY_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const CANDIDATE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;

export type DeclaredSpatialMeasurementOwnerV1 =
  | { readonly kind: "image-frame" }
  | { readonly kind: "rectangle"; readonly candidateId: string };

export type DeclaredSpatialMeasurementAnchorKindV1 =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-midpoint"
  | "right-midpoint"
  | "bottom-midpoint"
  | "left-midpoint";

export interface DeclaredSpatialMeasurementAnchorV1 {
  readonly owner: DeclaredSpatialMeasurementOwnerV1;
  readonly anchor: DeclaredSpatialMeasurementAnchorKindV1;
}

export type DeclaredSpatialMeasurementExpressionV1 =
  | {
      readonly kind: "extent";
      readonly owner: DeclaredSpatialMeasurementOwnerV1;
      readonly extent: "width" | "height" | "diagonal";
    }
  | {
      readonly kind: "anchor-distance";
      readonly metric: "euclidean" | "horizontal" | "vertical";
      readonly from: DeclaredSpatialMeasurementAnchorV1;
      readonly to: DeclaredSpatialMeasurementAnchorV1;
    }
  | {
      readonly kind: "anchor-to-frame-edge";
      readonly anchor: DeclaredSpatialMeasurementAnchorV1;
      readonly edge: "left" | "right" | "top" | "bottom";
    };

export interface DeclaredSpatialMeasurementCandidateV1 {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly primitive?: { readonly kind: string };
}

export interface DeclaredSpatialMeasurementPlanV1 {
  readonly contractId: typeof DECLARED_SPATIAL_MEASUREMENT_PLAN_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly operationId: typeof DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID;
  readonly operationVersion: 1;
  readonly sourceIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly coordinatePolicy: typeof DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY;
  readonly spatialCandidateSetIdentity: string;
  readonly selectedRectangleCandidateIds: readonly string[];
  readonly expressions: readonly [
    DeclaredSpatialMeasurementExpressionV1,
    DeclaredSpatialMeasurementExpressionV1,
  ];
  readonly ratioPackRefs: typeof DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS;
  readonly matchTolerance: typeof DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE;
  readonly planIdentity: string;
}

export interface DeclaredSpatialMeasurementResolvedAnchorV1 {
  readonly anchorIdentity: string;
  readonly owner: DeclaredSpatialMeasurementOwnerV1;
  readonly anchor: DeclaredSpatialMeasurementAnchorKindV1;
  readonly xPixels: number;
  readonly yPixels: number;
  readonly derivedOnly: true;
  readonly acceptedPrimitive: false;
  readonly sourceTruth: false;
}

export interface DeclaredSpatialMeasurementResolvedV1 {
  readonly measurementIdentity: string;
  readonly expressionIdentity: string;
  readonly expression: DeclaredSpatialMeasurementExpressionV1;
  readonly lengthPixels: number;
  readonly resolvedAnchors: readonly DeclaredSpatialMeasurementResolvedAnchorV1[];
  readonly provenance: "explicit_accepted_geometry_image_plane_pixels";
}

export interface DeclaredSpatialMeasurementConfirmationV1 {
  readonly contractId:
    typeof DECLARED_SPATIAL_MEASUREMENT_CONFIRMATION_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly operationId: typeof DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID;
  readonly operationVersion: 1;
  readonly status: "completed";
  readonly sourceIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly coordinatePolicy: typeof DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY;
  readonly spatialCandidateSetIdentity: string;
  readonly acceptedSpatialGeometryIdentity: string;
  readonly selectedRectangleCandidateIds: readonly string[];
  readonly planIdentity: string;
  readonly resolvedMeasurements: readonly [
    DeclaredSpatialMeasurementResolvedV1,
    DeclaredSpatialMeasurementResolvedV1,
  ];
  readonly canonicalRatio: {
    readonly normalization: "dominant_length_divided_by_pair_sum";
    readonly dominantShare: number;
    readonly longToShortRatio: number;
    readonly longToShortRatioIsSecondary: true;
  };
  readonly analysis: DeclaredLengthPairAnalysisResultV1;
  readonly ratioPackRefs: typeof DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS;
  readonly matchTolerance: typeof DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE;
  readonly providerCalls: 0;
  readonly coreRun: true;
  readonly coreExecutionCount: 1;
  readonly pairOnly: true;
  readonly noUnrequestedComparisons: true;
  readonly candidateEvidenceOnly: true;
  readonly sourceTruth: false;
  readonly noAcceptedDerivedAnchors: true;
  readonly confirmationIdentity: string;
}

export function createDeclaredSpatialCandidateSetIdentityV1(input: {
  readonly candidates: readonly DeclaredSpatialMeasurementCandidateV1[];
  readonly selectedRectangleCandidateIds: readonly string[];
}): string {
  selectedRectangleProjection(input);
  return sha256Identity(serializeCanonicalJson({
    contractId: "norma.declared-spatial-candidate-set@1",
    rectangles: rectangleCandidateProjection(input.candidates),
  }));
}

export function createDeclaredSpatialMeasurementPlanV1(input: {
  readonly sourceIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly candidates: readonly DeclaredSpatialMeasurementCandidateV1[];
  readonly selectedRectangleCandidateIds: readonly string[];
  readonly expressions: readonly [
    DeclaredSpatialMeasurementExpressionV1,
    DeclaredSpatialMeasurementExpressionV1,
  ];
  readonly ratioPackRefs?: typeof DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS;
  readonly matchTolerance?: typeof DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE;
}): DeclaredSpatialMeasurementPlanV1 {
  requireSha256Identity(input.sourceIdentity, "sourceIdentity");
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  const rectangles = selectedRectangleProjection(input);
  const selectedRectangleCandidateIds = rectangles.map(({ id }) => id);
  const spatialCandidateSetIdentity = createDeclaredSpatialCandidateSetIdentityV1({
    candidates: input.candidates,
    selectedRectangleCandidateIds,
  });
  if (!Array.isArray(input.expressions) || input.expressions.length !== 2) {
    throw new Error("Declared spatial measurement plan requires exactly two expressions.");
  }
  const expressions = input.expressions
    .map((expression) => canonicalExpression(expression, new Set(selectedRectangleCandidateIds)))
    .sort((first, second) => compareStrings(
      serializeCanonicalJson(first),
      serializeCanonicalJson(second),
    )) as [
      DeclaredSpatialMeasurementExpressionV1,
      DeclaredSpatialMeasurementExpressionV1,
    ];
  if (serializeCanonicalJson(expressions[0]) === serializeCanonicalJson(expressions[1])) {
    throw new Error("Declared spatial measurement expressions must be distinct.");
  }
  const ratioPackRefs =
    input.ratioPackRefs ?? DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS;
  requireExactRatioPackRefs(ratioPackRefs);
  const matchTolerance =
    input.matchTolerance ?? DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE;
  if (matchTolerance !== DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE) {
    throw new Error("Declared spatial measurement match tolerance is invalid.");
  }
  const withoutIdentity = {
    contractId: DECLARED_SPATIAL_MEASUREMENT_PLAN_CONTRACT_ID,
    contractVersion: 1 as const,
    operationId: DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID,
    operationVersion: 1 as const,
    sourceIdentity: input.sourceIdentity,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
    coordinatePolicy: DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY,
    spatialCandidateSetIdentity,
    selectedRectangleCandidateIds,
    expressions,
    ratioPackRefs: DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS,
    matchTolerance: DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE,
  };
  return {
    ...withoutIdentity,
    planIdentity: sha256Identity(serializeCanonicalJson(withoutIdentity)),
  };
}

export function confirmDeclaredSpatialMeasurementPlanV1(input: {
  readonly plan: DeclaredSpatialMeasurementPlanV1;
  readonly sourceIdentity: string;
  readonly sourcePixelWidth: number;
  readonly sourcePixelHeight: number;
  readonly candidates: readonly DeclaredSpatialMeasurementCandidateV1[];
  readonly selectedRectangleCandidateIds: readonly string[];
  readonly analyzePair?: typeof analyzeDeclaredLengthPairV1;
}): DeclaredSpatialMeasurementConfirmationV1 {
  const plan = requireCanonicalPlan(input.plan, input.candidates);
  requireSha256Identity(input.sourceIdentity, "sourceIdentity");
  requirePixelDimension(input.sourcePixelWidth, "sourcePixelWidth");
  requirePixelDimension(input.sourcePixelHeight, "sourcePixelHeight");
  if (plan.sourceIdentity !== input.sourceIdentity) {
    throw new Error("Declared spatial measurement source identity is stale or mismatched.");
  }
  if (
    plan.sourcePixelWidth !== input.sourcePixelWidth
    || plan.sourcePixelHeight !== input.sourcePixelHeight
  ) {
    throw new Error("Declared spatial measurement source dimensions are stale or mismatched.");
  }
  const rectangles = selectedRectangleProjection(input);
  const selectedRectangleCandidateIds = rectangles.map(({ id }) => id);
  if (serializeCanonicalJson(selectedRectangleCandidateIds)
    !== serializeCanonicalJson(plan.selectedRectangleCandidateIds)) {
    throw new Error("Declared spatial measurement rectangle selection is stale or mismatched.");
  }
  const spatialCandidateSetIdentity = createDeclaredSpatialCandidateSetIdentityV1({
    candidates: input.candidates,
    selectedRectangleCandidateIds,
  });
  if (spatialCandidateSetIdentity !== plan.spatialCandidateSetIdentity) {
    throw new Error("Declared spatial measurement candidate geometry is stale or mismatched.");
  }

  const rectangleMap = new Map(rectangles.map((rectangle) => [rectangle.id, rectangle]));
  const resolvedMeasurements = plan.expressions.map((expression) => (
    resolveExpression(
      plan,
      expression,
      rectangleMap,
      input.sourcePixelWidth,
      input.sourcePixelHeight,
    )
  )).sort((first, second) => (
    compareStrings(first.measurementIdentity, second.measurementIdentity)
  )) as [
    DeclaredSpatialMeasurementResolvedV1,
    DeclaredSpatialMeasurementResolvedV1,
  ];
  if (resolvedMeasurements.some(({ lengthPixels }) => (
    !Number.isFinite(lengthPixels) || lengthPixels <= 0
  ))) {
    throw new Error("Declared spatial measurement resolved to a zero or invalid length.");
  }

  const analyzePair = input.analyzePair ?? analyzeDeclaredLengthPairV1;
  const analysis = analyzePair({
    measurements: resolvedMeasurements.map(({ measurementIdentity, lengthPixels }) => ({
      measurementId: measurementIdentity,
      length: lengthPixels,
    })) as [
      { readonly measurementId: string; readonly length: number },
      { readonly measurementId: string; readonly length: number },
    ],
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE,
  });
  const lengths = resolvedMeasurements.map(({ lengthPixels }) => lengthPixels);
  const shorter = Math.min(...lengths);
  const longer = Math.max(...lengths);
  const acceptedSpatialGeometryIdentity = sha256Identity(serializeCanonicalJson({
    contractId: "norma.accepted-spatial-geometry@1",
    rectangles,
  }));
  const withoutIdentity = {
    contractId: DECLARED_SPATIAL_MEASUREMENT_CONFIRMATION_CONTRACT_ID,
    contractVersion: 1 as const,
    operationId: DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID,
    operationVersion: 1 as const,
    status: "completed" as const,
    sourceIdentity: input.sourceIdentity,
    sourcePixelWidth: input.sourcePixelWidth,
    sourcePixelHeight: input.sourcePixelHeight,
    coordinatePolicy: DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY,
    spatialCandidateSetIdentity,
    acceptedSpatialGeometryIdentity,
    selectedRectangleCandidateIds,
    planIdentity: plan.planIdentity,
    resolvedMeasurements,
    canonicalRatio: {
      normalization: "dominant_length_divided_by_pair_sum" as const,
      dominantShare: analysis.observedDominantShare,
      longToShortRatio: canonicalNumber(longer / shorter),
      longToShortRatioIsSecondary: true as const,
    },
    analysis,
    ratioPackRefs: DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS,
    matchTolerance: DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE,
    providerCalls: 0 as const,
    coreRun: true as const,
    coreExecutionCount: 1 as const,
    pairOnly: true as const,
    noUnrequestedComparisons: true as const,
    candidateEvidenceOnly: true as const,
    sourceTruth: false as const,
    noAcceptedDerivedAnchors: true as const,
  };
  return {
    ...withoutIdentity,
    confirmationIdentity: sha256Identity(serializeCanonicalJson(withoutIdentity)),
  };
}

function requireCanonicalPlan(
  value: DeclaredSpatialMeasurementPlanV1,
  candidates: readonly DeclaredSpatialMeasurementCandidateV1[],
): DeclaredSpatialMeasurementPlanV1 {
  requireExactRecord(value, [
    "contractId",
    "contractVersion",
    "coordinatePolicy",
    "expressions",
    "matchTolerance",
    "operationId",
    "operationVersion",
    "planIdentity",
    "ratioPackRefs",
    "selectedRectangleCandidateIds",
    "sourceIdentity",
    "sourcePixelHeight",
    "sourcePixelWidth",
    "spatialCandidateSetIdentity",
  ], "Declared spatial measurement plan");
  if (
    value.contractId !== DECLARED_SPATIAL_MEASUREMENT_PLAN_CONTRACT_ID
    || value.contractVersion !== 1
    || value.operationId !== DECLARED_SPATIAL_MEASUREMENT_OPERATION_ID
    || value.operationVersion !== 1
    || value.coordinatePolicy !== DECLARED_SPATIAL_MEASUREMENT_COORDINATE_POLICY
  ) {
    throw new Error("Declared spatial measurement plan contract or coordinate policy is invalid.");
  }
  requireSha256Identity(value.planIdentity, "planIdentity");
  requireSha256Identity(value.spatialCandidateSetIdentity, "spatialCandidateSetIdentity");
  const rebuilt = createDeclaredSpatialMeasurementPlanV1({
    sourceIdentity: value.sourceIdentity,
    sourcePixelWidth: value.sourcePixelWidth,
    sourcePixelHeight: value.sourcePixelHeight,
    candidates,
    selectedRectangleCandidateIds: value.selectedRectangleCandidateIds,
    expressions: value.expressions,
    ratioPackRefs: value.ratioPackRefs,
    matchTolerance: value.matchTolerance,
  });
  if (serializeCanonicalJson(rebuilt) !== serializeCanonicalJson(value)) {
    throw new Error("Declared spatial measurement plan identity or canonical fields are stale.");
  }
  return rebuilt;
}

function selectedRectangleProjection(input: {
  readonly candidates: readonly DeclaredSpatialMeasurementCandidateV1[];
  readonly selectedRectangleCandidateIds: readonly string[];
}): readonly {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}[] {
  if (
    !Array.isArray(input.candidates)
    || !Array.isArray(input.selectedRectangleCandidateIds)
    || input.selectedRectangleCandidateIds.length !== 2
    || new Set(input.selectedRectangleCandidateIds).size
      !== input.selectedRectangleCandidateIds.length
  ) {
    throw new Error("Declared spatial measurement requires exactly two unique selected rectangles.");
  }
  const candidates = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  return [...input.selectedRectangleCandidateIds].sort(compareStrings).map((candidateId) => {
    if (typeof candidateId !== "string" || !CANDIDATE_ID_PATTERN.test(candidateId)) {
      throw new Error("Declared spatial measurement rectangle id is invalid.");
    }
    const candidate = candidates.get(candidateId);
    if (candidate === undefined) {
      throw new Error("Declared spatial measurement references a missing rectangle.");
    }
    if (candidate.primitive !== undefined && candidate.primitive.kind !== "rectangle") {
      throw new Error("Declared spatial measurement selected candidate is not a rectangle.");
    }
    requireNormalizedRectangle(candidate);
    return {
      id: candidate.id,
      x: canonicalNumber(candidate.x),
      y: canonicalNumber(candidate.y),
      width: canonicalNumber(candidate.width),
      height: canonicalNumber(candidate.height),
    };
  });
}

function rectangleCandidateProjection(
  candidates: readonly DeclaredSpatialMeasurementCandidateV1[],
): readonly {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}[] {
  if (!Array.isArray(candidates)) {
    throw new Error("Declared spatial measurement candidate set is invalid.");
  }
  const rectangles = candidates.filter((candidate) => (
    candidate.primitive === undefined || candidate.primitive.kind === "rectangle"
  ));
  if (
    rectangles.length === 0
    || new Set(rectangles.map(({ id }) => id)).size !== rectangles.length
  ) {
    throw new Error("Declared spatial measurement rectangle candidate ids must be unique.");
  }
  return rectangles.map((candidate) => {
    if (typeof candidate.id !== "string" || !CANDIDATE_ID_PATTERN.test(candidate.id)) {
      throw new Error("Declared spatial measurement rectangle id is invalid.");
    }
    requireNormalizedRectangle(candidate);
    return {
      id: candidate.id,
      x: canonicalNumber(candidate.x),
      y: canonicalNumber(candidate.y),
      width: canonicalNumber(candidate.width),
      height: canonicalNumber(candidate.height),
    };
  }).sort((first, second) => compareStrings(first.id, second.id));
}

function canonicalExpression(
  expression: DeclaredSpatialMeasurementExpressionV1,
  selectedIds: ReadonlySet<string>,
): DeclaredSpatialMeasurementExpressionV1 {
  if (!isRecord(expression)) {
    throw new Error("Declared spatial measurement expression must be an object.");
  }
  if (expression.kind === "extent") {
    requireExactRecord(expression, ["extent", "kind", "owner"], "Extent expression");
    if (!["width", "height", "diagonal"].includes(expression.extent)) {
      throw new Error("Declared spatial measurement extent is unsupported.");
    }
    return {
      kind: "extent",
      owner: canonicalOwner(expression.owner, selectedIds),
      extent: expression.extent,
    };
  }
  if (expression.kind === "anchor-distance") {
    requireExactRecord(expression, ["from", "kind", "metric", "to"], "Anchor distance expression");
    if (!["euclidean", "horizontal", "vertical"].includes(expression.metric)) {
      throw new Error("Declared spatial measurement anchor metric is unsupported.");
    }
    const anchors = [
      canonicalAnchor(expression.from, selectedIds),
      canonicalAnchor(expression.to, selectedIds),
    ].sort((first, second) => compareStrings(
      serializeCanonicalJson(first),
      serializeCanonicalJson(second),
    ));
    return {
      kind: "anchor-distance",
      metric: expression.metric,
      from: anchors[0] as DeclaredSpatialMeasurementAnchorV1,
      to: anchors[1] as DeclaredSpatialMeasurementAnchorV1,
    };
  }
  if (expression.kind === "anchor-to-frame-edge") {
    requireExactRecord(expression, ["anchor", "edge", "kind"], "Anchor-to-edge expression");
    if (!["left", "right", "top", "bottom"].includes(expression.edge)) {
      throw new Error("Declared spatial measurement frame edge is unsupported.");
    }
    return {
      kind: "anchor-to-frame-edge",
      anchor: canonicalAnchor(expression.anchor, selectedIds),
      edge: expression.edge,
    };
  }
  throw new Error("Declared spatial measurement expression kind is unsupported.");
}

function canonicalOwner(
  owner: DeclaredSpatialMeasurementOwnerV1,
  selectedIds: ReadonlySet<string>,
): DeclaredSpatialMeasurementOwnerV1 {
  if (!isRecord(owner)) {
    throw new Error("Declared spatial measurement owner must be an object.");
  }
  if (owner.kind === "image-frame") {
    requireExactRecord(owner, ["kind"], "Image-frame owner");
    return { kind: "image-frame" };
  }
  if (owner.kind === "rectangle") {
    requireExactRecord(owner, ["candidateId", "kind"], "Rectangle owner");
    if (
      typeof owner.candidateId !== "string"
      || !selectedIds.has(owner.candidateId)
    ) {
      throw new Error("Declared spatial measurement rectangle owner is not selected.");
    }
    return { kind: "rectangle", candidateId: owner.candidateId };
  }
  throw new Error("Declared spatial measurement owner kind is unsupported.");
}

function canonicalAnchor(
  value: DeclaredSpatialMeasurementAnchorV1,
  selectedIds: ReadonlySet<string>,
): DeclaredSpatialMeasurementAnchorV1 {
  requireExactRecord(value, ["anchor", "owner"], "Declared spatial anchor");
  const anchors: readonly DeclaredSpatialMeasurementAnchorKindV1[] = [
    "center",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "top-midpoint",
    "right-midpoint",
    "bottom-midpoint",
    "left-midpoint",
  ];
  if (!anchors.includes(value.anchor)) {
    throw new Error("Declared spatial measurement anchor is unsupported.");
  }
  return { owner: canonicalOwner(value.owner, selectedIds), anchor: value.anchor };
}

function resolveExpression(
  plan: DeclaredSpatialMeasurementPlanV1,
  expression: DeclaredSpatialMeasurementExpressionV1,
  rectangles: ReadonlyMap<string, {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): DeclaredSpatialMeasurementResolvedV1 {
  let lengthPixels: number;
  let resolvedAnchors: readonly DeclaredSpatialMeasurementResolvedAnchorV1[] = [];
  if (expression.kind === "extent") {
    const bounds = ownerBounds(
      expression.owner,
      rectangles,
      sourcePixelWidth,
      sourcePixelHeight,
    );
    lengthPixels = expression.extent === "width"
      ? bounds.width
      : expression.extent === "height"
        ? bounds.height
        : Math.hypot(bounds.width, bounds.height);
  } else if (expression.kind === "anchor-distance") {
    const from = resolveAnchor(
      expression.from,
      rectangles,
      sourcePixelWidth,
      sourcePixelHeight,
    );
    const to = resolveAnchor(
      expression.to,
      rectangles,
      sourcePixelWidth,
      sourcePixelHeight,
    );
    resolvedAnchors = [from, to].sort((first, second) => (
      compareStrings(first.anchorIdentity, second.anchorIdentity)
    ));
    lengthPixels = expression.metric === "euclidean"
      ? Math.hypot(from.xPixels - to.xPixels, from.yPixels - to.yPixels)
      : expression.metric === "horizontal"
        ? Math.abs(from.xPixels - to.xPixels)
        : Math.abs(from.yPixels - to.yPixels);
  } else {
    const anchor = resolveAnchor(
      expression.anchor,
      rectangles,
      sourcePixelWidth,
      sourcePixelHeight,
    );
    resolvedAnchors = [anchor];
    lengthPixels = expression.edge === "left"
      ? anchor.xPixels
      : expression.edge === "right"
        ? sourcePixelWidth - anchor.xPixels
        : expression.edge === "top"
          ? anchor.yPixels
          : sourcePixelHeight - anchor.yPixels;
  }
  if (!Number.isFinite(lengthPixels) || lengthPixels <= 0) {
    throw new Error("Declared spatial measurement resolved to a zero or invalid length.");
  }
  const canonicalLength = canonicalNumber(lengthPixels);
  const expressionIdentity = sha256Identity(serializeCanonicalJson({
    contractId: "norma.declared-spatial-measurement-expression@1",
    expression,
  }));
  const measurementIdentity = sha256Identity(serializeCanonicalJson({
    planIdentity: plan.planIdentity,
    expressionIdentity,
    lengthPixels: canonicalLength,
  }));
  return {
    measurementIdentity,
    expressionIdentity,
    expression,
    lengthPixels: canonicalLength,
    resolvedAnchors,
    provenance: "explicit_accepted_geometry_image_plane_pixels",
  };
}

function resolveAnchor(
  value: DeclaredSpatialMeasurementAnchorV1,
  rectangles: ReadonlyMap<string, {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): DeclaredSpatialMeasurementResolvedAnchorV1 {
  const bounds = ownerBounds(value.owner, rectangles, sourcePixelWidth, sourcePixelHeight);
  const factors: Record<DeclaredSpatialMeasurementAnchorKindV1, readonly [number, number]> = {
    center: [0.5, 0.5],
    "top-left": [0, 0],
    "top-right": [1, 0],
    "bottom-left": [0, 1],
    "bottom-right": [1, 1],
    "top-midpoint": [0.5, 0],
    "right-midpoint": [1, 0.5],
    "bottom-midpoint": [0.5, 1],
    "left-midpoint": [0, 0.5],
  };
  const [xFactor, yFactor] = factors[value.anchor];
  const ownerIdentity = sha256Identity(serializeCanonicalJson(value.owner));
  return {
    anchorIdentity: sha256Identity(serializeCanonicalJson({
      ownerIdentity,
      anchor: value.anchor,
    })),
    owner: value.owner,
    anchor: value.anchor,
    xPixels: canonicalNumber(bounds.x + (bounds.width * xFactor)),
    yPixels: canonicalNumber(bounds.y + (bounds.height * yFactor)),
    derivedOnly: true,
    acceptedPrimitive: false,
    sourceTruth: false,
  };
}

function ownerBounds(
  owner: DeclaredSpatialMeasurementOwnerV1,
  rectangles: ReadonlyMap<string, {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>,
  sourcePixelWidth: number,
  sourcePixelHeight: number,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  if (owner.kind === "image-frame") {
    return { x: 0, y: 0, width: sourcePixelWidth, height: sourcePixelHeight };
  }
  const rectangle = rectangles.get(owner.candidateId);
  if (rectangle === undefined) {
    throw new Error("Declared spatial measurement rectangle owner is missing.");
  }
  return {
    x: rectangle.x * sourcePixelWidth,
    y: rectangle.y * sourcePixelHeight,
    width: rectangle.width * sourcePixelWidth,
    height: rectangle.height * sourcePixelHeight,
  };
}

function requireNormalizedRectangle(candidate: DeclaredSpatialMeasurementCandidateV1): void {
  if (
    typeof candidate.id !== "string"
    || !CANDIDATE_ID_PATTERN.test(candidate.id)
    || !isNormalized(candidate.x)
    || !isNormalized(candidate.y)
    || !isNormalized(candidate.width)
    || !isNormalized(candidate.height)
    || candidate.width <= 0
    || candidate.height <= 0
    || candidate.x + candidate.width > 1
    || candidate.y + candidate.height > 1
  ) {
    throw new Error("Declared spatial measurement rectangle geometry is invalid.");
  }
}

function requireExactRatioPackRefs(value: readonly string[]): void {
  if (
    !Array.isArray(value)
    || value.length !== DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS.length
    || value.some((ref, index) => (
      ref !== DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS[index]
    ))
  ) {
    throw new Error("Declared spatial measurement ratio pack references are invalid.");
  }
}

function requireExactRecord(
  value: unknown,
  fields: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (
    !isRecord(value)
    || Object.keys(value).sort(compareStrings).join("\n")
      !== [...fields].sort(compareStrings).join("\n")
  ) {
    throw new Error(`${label} must expose exact fields.`);
  }
}

function requireSha256Identity(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !SHA256_IDENTITY_PATTERN.test(value)) {
    throw new Error(`Declared spatial measurement ${field} must be a sha256 identity.`);
  }
}

function requirePixelDimension(value: unknown, field: string): asserts value is number {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value <= 0
    || value > 100_000
  ) {
    throw new Error(`Declared spatial measurement ${field} must be a positive pixel dimension.`);
  }
}

function isNormalized(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalNumber(value: number): number {
  return Number(value.toFixed(12));
}

function sha256Identity(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function compareStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}
