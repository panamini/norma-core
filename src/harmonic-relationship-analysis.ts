import { createHash } from "node:crypto";
import type { Composition2D, Element } from "./index.js";
import { validateGeometryV1 } from "./index.js";
import type { Ratio, RatioPack } from "./ratio-pack.js";
import { validateRatioPackV1 } from "./ratio-pack.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const HARMONIC_RELATIONSHIP_ANALYSIS_CONTRACT_ID =
  "norma.harmonic-relationship-analysis@1" as const;
export const HARMONIC_RELATIONSHIP_ANALYSIS_OPERATION_ID =
  "core.harmonic-relationship-analysis.analyze" as const;
export const HARMONIC_RELATIONSHIP_ANALYSIS_OPERATION_VERSION = "0.1.0-personal-demo" as const;
export const DECLARED_LENGTH_PAIR_ANALYSIS_CONTRACT_ID =
  "norma.declared-length-pair-analysis@1" as const;

export type HarmonicRelationshipMetricV1 =
  | "horizontal-split-share"
  | "vertical-split-share"
  | "width-share"
  | "height-share"
  | "left-edge-position"
  | "right-edge-position"
  | "bottom-edge-position"
  | "top-edge-position"
  | "area-share";

export type HarmonicRelationshipQualityV1 = "exact" | "strong" | "near";

export interface HarmonicRatioRefV1 {
  readonly packId: string;
  readonly packVersion: string;
  readonly ratioId: string;
  readonly familyRef: string | null;
  readonly displayLabel: string;
  readonly targetValue: number;
}

export interface HarmonicRelationshipGuideV1 {
  readonly axis: "x" | "y";
  readonly position: number;
}

export interface HarmonicRelationshipV1 {
  readonly relationshipId: string;
  readonly metric: HarmonicRelationshipMetricV1;
  readonly quality: HarmonicRelationshipQualityV1;
  readonly subjectElementId: string;
  readonly relatedElementIds: readonly string[];
  readonly observedValue: number;
  readonly absoluteDelta: number;
  readonly closeness: number;
  readonly ratio: HarmonicRatioRefV1;
  readonly anchor: {
    readonly x: number;
    readonly y: number;
  };
  readonly guide: HarmonicRelationshipGuideV1 | null;
}

export interface HarmonicRelationshipAnalysisResultV1 {
  readonly contractId: typeof HARMONIC_RELATIONSHIP_ANALYSIS_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly operationId: typeof HARMONIC_RELATIONSHIP_ANALYSIS_OPERATION_ID;
  readonly operationVersion: typeof HARMONIC_RELATIONSHIP_ANALYSIS_OPERATION_VERSION;
  readonly status: "completed";
  readonly coreInputAuthority: "confirmed_structured_geometry";
  readonly deterministic: true;
  readonly canonical: true;
  readonly matchTolerance: number;
  readonly ratioPackRefs: readonly string[];
  readonly relationshipCount: number;
  readonly relationships: readonly HarmonicRelationshipV1[];
  readonly limits: {
    readonly noBeautyClaims: true;
    readonly noIntentInference: true;
    readonly matchesMeanNearDeclaredRatiosOnly: true;
  };
  readonly contentIdentity: string;
}

export interface HarmonicRelationshipAnalysisInputV1 {
  readonly composition: Composition2D;
  readonly ratioPacks: readonly RatioPack[];
  readonly matchTolerance?: number;
  readonly adjacencyTolerance?: number;
  readonly maxRelationships?: number;
}

export interface DeclaredLengthPairMeasurementV1 {
  readonly measurementId: string;
  readonly length: number;
}

export interface DeclaredLengthPairMatchV1 {
  readonly quality: HarmonicRelationshipQualityV1;
  readonly absoluteDelta: number;
  readonly closeness: number;
  readonly ratio: HarmonicRatioRefV1;
}

export interface DeclaredLengthPairAnalysisResultV1 {
  readonly contractId: typeof DECLARED_LENGTH_PAIR_ANALYSIS_CONTRACT_ID;
  readonly contractVersion: 1;
  readonly status: "completed";
  readonly deterministic: true;
  readonly canonical: true;
  readonly measurements: readonly [
    DeclaredLengthPairMeasurementV1,
    DeclaredLengthPairMeasurementV1,
  ];
  readonly dominantMeasurementId: string;
  readonly observedDominantShare: number;
  readonly matchTolerance: number;
  readonly ratioPackRefs: readonly string[];
  readonly relationshipCount: 0 | 1;
  readonly match: DeclaredLengthPairMatchV1 | null;
  readonly pairOnly: true;
  readonly noUnrequestedComparisons: true;
  readonly limits: {
    readonly noBeautyClaims: true;
    readonly noIntentInference: true;
    readonly matchesMeanNearDeclaredRatiosOnly: true;
  };
  readonly contentIdentity: string;
}

export interface DeclaredLengthPairAnalysisInputV1 {
  readonly measurements: readonly [
    DeclaredLengthPairMeasurementV1,
    DeclaredLengthPairMeasurementV1,
  ];
  readonly ratioPacks: readonly RatioPack[];
  readonly matchTolerance: number;
}

interface CatalogRatio {
  readonly packId: string;
  readonly packVersion: string;
  readonly ratio: Ratio;
}

interface RelationshipCandidate {
  readonly metric: HarmonicRelationshipMetricV1;
  readonly priority: number;
  readonly subjectElementId: string;
  readonly relatedElementIds: readonly string[];
  readonly observedValue: number;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly guide: HarmonicRelationshipGuideV1 | null;
}

const DEFAULT_MATCH_TOLERANCE = 0.025;
const DEFAULT_ADJACENCY_TOLERANCE = 0.025;
const DEFAULT_MAX_RELATIONSHIPS = 24;
const OVERLAP_FRACTION_FOR_ADJACENCY = 0.8;

export function analyzeHarmonicRelationshipsV1(
  input: HarmonicRelationshipAnalysisInputV1,
): HarmonicRelationshipAnalysisResultV1 {
  requireValidInput(input);
  const matchTolerance = input.matchTolerance ?? DEFAULT_MATCH_TOLERANCE;
  const adjacencyTolerance = input.adjacencyTolerance ?? DEFAULT_ADJACENCY_TOLERANCE;
  const maxRelationships = input.maxRelationships ?? DEFAULT_MAX_RELATIONSHIPS;
  const catalog = createRatioCatalog(input.ratioPacks);
  const candidates = createRelationshipCandidates(input.composition, adjacencyTolerance);
  const relationships = selectRelationships(candidates, catalog, matchTolerance, maxRelationships);
  const resultWithoutIdentity = {
    contractId: HARMONIC_RELATIONSHIP_ANALYSIS_CONTRACT_ID,
    contractVersion: 1 as const,
    operationId: HARMONIC_RELATIONSHIP_ANALYSIS_OPERATION_ID,
    operationVersion: HARMONIC_RELATIONSHIP_ANALYSIS_OPERATION_VERSION,
    status: "completed" as const,
    coreInputAuthority: "confirmed_structured_geometry" as const,
    deterministic: true as const,
    canonical: true as const,
    matchTolerance,
    ratioPackRefs: input.ratioPacks.map((pack) => `${pack.id}@${pack.version}`),
    relationshipCount: relationships.length,
    relationships,
    limits: {
      noBeautyClaims: true as const,
      noIntentInference: true as const,
      matchesMeanNearDeclaredRatiosOnly: true as const,
    },
  };
  return {
    ...resultWithoutIdentity,
    contentIdentity: contentIdentityFor(resultWithoutIdentity),
  };
}

export function analyzeDeclaredLengthPairV1(
  input: DeclaredLengthPairAnalysisInputV1,
): DeclaredLengthPairAnalysisResultV1 {
  requireDeclaredLengthPairInput(input);
  const measurements = [...input.measurements]
    .sort((first, second) => stableCompare(first.measurementId, second.measurementId)) as [
      DeclaredLengthPairMeasurementV1,
      DeclaredLengthPairMeasurementV1,
    ];
  const dominant = [...measurements].sort((first, second) => (
    second.length - first.length || stableCompare(first.measurementId, second.measurementId)
  ))[0];
  if (dominant === undefined) throw new Error("Declared length-pair analysis requires exactly two measurements.");
  const observedDominantShare = Math.min(
    canonicalNumber(dominant.length / (measurements[0].length + measurements[1].length)),
    1 - 1e-12,
  );
  const catalog = createRatioCatalog(input.ratioPacks);
  const closest = closestRatio(observedDominantShare, catalog);
  const delta = closest === null
    ? Number.POSITIVE_INFINITY
    : canonicalNumber(Math.abs(observedDominantShare - closest.ratio.normalizedValue));
  const match: DeclaredLengthPairMatchV1 | null = closest === null || delta > input.matchTolerance
    ? null
    : {
        quality: qualityFor(delta),
        absoluteDelta: delta,
        closeness: canonicalNumber(1 - (delta / input.matchTolerance)),
        ratio: ratioRefFor(closest),
      };
  const resultWithoutIdentity = {
    contractId: DECLARED_LENGTH_PAIR_ANALYSIS_CONTRACT_ID,
    contractVersion: 1 as const,
    status: "completed" as const,
    deterministic: true as const,
    canonical: true as const,
    measurements,
    dominantMeasurementId: dominant.measurementId,
    observedDominantShare,
    matchTolerance: input.matchTolerance,
    ratioPackRefs: input.ratioPacks.map((pack) => `${pack.id}@${pack.version}`),
    relationshipCount: (match === null ? 0 : 1) as 0 | 1,
    match,
    pairOnly: true as const,
    noUnrequestedComparisons: true as const,
    limits: {
      noBeautyClaims: true as const,
      noIntentInference: true as const,
      matchesMeanNearDeclaredRatiosOnly: true as const,
    },
  };
  return {
    ...resultWithoutIdentity,
    contentIdentity: contentIdentityFor(resultWithoutIdentity),
  };
}

function requireValidInput(input: HarmonicRelationshipAnalysisInputV1): void {
  const geometryValidation = validateGeometryV1(input.composition);
  if (geometryValidation.status !== "ok") {
    throw new Error("Harmonic relationship analysis requires valid Composition2D geometry.");
  }
  requireValidRatioPacks(input.ratioPacks);
  requireUnitIntervalLimit(input.matchTolerance ?? DEFAULT_MATCH_TOLERANCE, "matchTolerance");
  requireUnitIntervalLimit(input.adjacencyTolerance ?? DEFAULT_ADJACENCY_TOLERANCE, "adjacencyTolerance");
  const maxRelationships = input.maxRelationships ?? DEFAULT_MAX_RELATIONSHIPS;
  if (!Number.isInteger(maxRelationships) || maxRelationships < 1 || maxRelationships > 64) {
    throw new Error("Harmonic relationship analysis maxRelationships must be an integer from 1 to 64.");
  }
}

function requireDeclaredLengthPairInput(input: DeclaredLengthPairAnalysisInputV1): void {
  if (!Array.isArray(input.measurements) || input.measurements.length !== 2) {
    throw new Error("Declared length-pair analysis requires exactly two measurements.");
  }
  const [first, second] = input.measurements;
  if (first === undefined || second === undefined
    || !Number.isFinite(first.length) || first.length <= 0
    || !Number.isFinite(second.length) || second.length <= 0) {
    throw new Error("Declared length-pair analysis requires positive finite lengths.");
  }
  if (typeof first.measurementId !== "string" || first.measurementId.length === 0
    || typeof second.measurementId !== "string" || second.measurementId.length === 0) {
    throw new Error("Declared length-pair analysis requires bounded measurement identities.");
  }
  if (first.measurementId.length > 240 || second.measurementId.length > 240) {
    throw new Error("Declared length-pair analysis requires bounded measurement identities.");
  }
  if (first.measurementId === second.measurementId) {
    throw new Error("Declared length-pair analysis requires distinct measurement identities.");
  }
  requireValidRatioPacks(input.ratioPacks);
  requireUnitIntervalLimit(input.matchTolerance, "matchTolerance");
}

function requireValidRatioPacks(ratioPacks: readonly RatioPack[]): void {
  if (!Array.isArray(ratioPacks) || ratioPacks.length === 0) {
    throw new Error("Harmonic relationship analysis requires at least one explicit ratio pack.");
  }
  for (const pack of ratioPacks) {
    const packValidation = validateRatioPackV1(pack);
    if (packValidation.status !== "ok") {
      throw new Error("Harmonic relationship analysis requires valid explicit ratio packs.");
    }
  }
}

function requireUnitIntervalLimit(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > 0.1) {
    throw new Error(`Harmonic relationship analysis ${field} must be greater than 0 and at most 0.1.`);
  }
}

function createRatioCatalog(packs: readonly RatioPack[]): readonly CatalogRatio[] {
  const seenValues = new Set<string>();
  const catalog: CatalogRatio[] = [];
  for (const pack of packs) {
    for (const ratio of pack.ratios) {
      const key = canonicalNumber(ratio.normalizedValue).toFixed(12);
      if (seenValues.has(key)) continue;
      seenValues.add(key);
      catalog.push({ packId: pack.id, packVersion: pack.version, ratio });
    }
  }
  return catalog.sort((first, second) => {
    if (first.ratio.normalizedValue !== second.ratio.normalizedValue) {
      return first.ratio.normalizedValue - second.ratio.normalizedValue;
    }
    return stableCompare(`${first.packId}:${first.ratio.id}`, `${second.packId}:${second.ratio.id}`);
  });
}

function createRelationshipCandidates(
  composition: Composition2D,
  adjacencyTolerance: number,
): readonly RelationshipCandidate[] {
  const { bounds } = composition.surface;
  const candidates: RelationshipCandidate[] = [];
  for (const element of composition.elements) {
    const rect = normalizedRect(element, bounds);
    candidates.push(
      candidate("width-share", 1, element.id, [], rect.width, rect.x + (rect.width / 2), rect.y + (rect.height / 2), {
        axis: "x",
        position: rect.x + rect.width,
      }),
      candidate("height-share", 1, element.id, [], rect.height, rect.x + (rect.width / 2), rect.y + (rect.height / 2), {
        axis: "y",
        position: rect.y + rect.height,
      }),
      candidate("area-share", 3, element.id, [], rect.width * rect.height, rect.x + (rect.width / 2), rect.y + (rect.height / 2), null),
    );
    if (rect.x > adjacencyTolerance && rect.x < 1 - adjacencyTolerance) {
      candidates.push(candidate("left-edge-position", 2, element.id, [], rect.x, rect.x, rect.y + (rect.height / 2), {
        axis: "x",
        position: rect.x,
      }));
    }
    const right = rect.x + rect.width;
    if (right > adjacencyTolerance && right < 1 - adjacencyTolerance) {
      candidates.push(candidate("right-edge-position", 2, element.id, [], right, right, rect.y + (rect.height / 2), {
        axis: "x",
        position: right,
      }));
    }
    if (rect.y > adjacencyTolerance && rect.y < 1 - adjacencyTolerance) {
      candidates.push(candidate("bottom-edge-position", 2, element.id, [], rect.y, rect.x + (rect.width / 2), rect.y, {
        axis: "y",
        position: rect.y,
      }));
    }
    const top = rect.y + rect.height;
    if (top > adjacencyTolerance && top < 1 - adjacencyTolerance) {
      candidates.push(candidate("top-edge-position", 2, element.id, [], top, rect.x + (rect.width / 2), top, {
        axis: "y",
        position: top,
      }));
    }
  }

  for (let firstIndex = 0; firstIndex < composition.elements.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < composition.elements.length; secondIndex += 1) {
      const first = composition.elements[firstIndex];
      const second = composition.elements[secondIndex];
      if (first === undefined || second === undefined) continue;
      addAdjacentSplitCandidates(candidates, first, second, composition, adjacencyTolerance);
    }
  }
  return candidates;
}

function addAdjacentSplitCandidates(
  candidates: RelationshipCandidate[],
  first: Element,
  second: Element,
  composition: Composition2D,
  adjacencyTolerance: number,
): void {
  const firstRect = normalizedRect(first, composition.surface.bounds);
  const secondRect = normalizedRect(second, composition.surface.bounds);
  const [leftId, left, rightId, right] = firstRect.x <= secondRect.x
    ? [first.id, firstRect, second.id, secondRect]
    : [second.id, secondRect, first.id, firstRect];
  const horizontalGap = Math.abs((left.x + left.width) - right.x);
  const verticalOverlap = intervalOverlap(left.y, left.y + left.height, right.y, right.y + right.height);
  const horizontalTotal = left.width + right.width;
  if (horizontalGap <= adjacencyTolerance
    && verticalOverlap / Math.min(left.height, right.height) >= OVERLAP_FRACTION_FOR_ADJACENCY
    && horizontalTotal > 0) {
    const boundary = (left.x + left.width + right.x) / 2;
    const anchorY = (Math.max(left.y, right.y) + Math.min(left.y + left.height, right.y + right.height)) / 2;
    candidates.push(
      candidate("horizontal-split-share", 0, leftId, [rightId], left.width / horizontalTotal, boundary, anchorY, {
        axis: "x", position: boundary,
      }),
      candidate("horizontal-split-share", 0, rightId, [leftId], right.width / horizontalTotal, boundary, anchorY, {
        axis: "x", position: boundary,
      }),
    );
  }

  const [bottomId, bottom, topId, top] = firstRect.y <= secondRect.y
    ? [first.id, firstRect, second.id, secondRect]
    : [second.id, secondRect, first.id, firstRect];
  const verticalGap = Math.abs((bottom.y + bottom.height) - top.y);
  const horizontalOverlap = intervalOverlap(bottom.x, bottom.x + bottom.width, top.x, top.x + top.width);
  const verticalTotal = bottom.height + top.height;
  if (verticalGap <= adjacencyTolerance
    && horizontalOverlap / Math.min(bottom.width, top.width) >= OVERLAP_FRACTION_FOR_ADJACENCY
    && verticalTotal > 0) {
    const boundary = (bottom.y + bottom.height + top.y) / 2;
    const anchorX = (Math.max(bottom.x, top.x) + Math.min(bottom.x + bottom.width, top.x + top.width)) / 2;
    candidates.push(
      candidate("vertical-split-share", 0, bottomId, [topId], bottom.height / verticalTotal, anchorX, boundary, {
        axis: "y", position: boundary,
      }),
      candidate("vertical-split-share", 0, topId, [bottomId], top.height / verticalTotal, anchorX, boundary, {
        axis: "y", position: boundary,
      }),
    );
  }
}

function selectRelationships(
  candidates: readonly RelationshipCandidate[],
  catalog: readonly CatalogRatio[],
  tolerance: number,
  maxRelationships: number,
): readonly HarmonicRelationshipV1[] {
  const matched = candidates.flatMap((entry) => {
    const closest = closestRatio(entry.observedValue, catalog);
    if (closest === null) return [];
    const delta = canonicalNumber(Math.abs(entry.observedValue - closest.ratio.normalizedValue));
    if (delta > tolerance) return [];
    return [{ entry, closest, delta }];
  });
  matched.sort((first, second) => {
    if (first.delta !== second.delta) return first.delta - second.delta;
    if (first.entry.priority !== second.entry.priority) return first.entry.priority - second.entry.priority;
    return stableCompare(candidateSortKey(first.entry, first.closest), candidateSortKey(second.entry, second.closest));
  });

  const deduplicated = new Map<string, typeof matched[number]>();
  for (const match of matched) {
    const key = [
      match.entry.subjectElementId,
      match.entry.metric,
      [...match.entry.relatedElementIds].sort(stableCompare).join(","),
      canonicalNumber(match.entry.observedValue).toFixed(9),
      canonicalNumber(match.closest.ratio.normalizedValue).toFixed(9),
    ].join("|");
    if (!deduplicated.has(key)) deduplicated.set(key, match);
  }

  return [...deduplicated.values()].slice(0, maxRelationships).map(({ entry, closest, delta }) => {
    const observedValue = canonicalNumber(entry.observedValue);
    const closeness = canonicalNumber(1 - (delta / tolerance));
    const relationshipSeed = {
      metric: entry.metric,
      subjectElementId: entry.subjectElementId,
      relatedElementIds: entry.relatedElementIds,
      observedValue,
      packId: closest.packId,
      ratioId: closest.ratio.id,
    };
    return {
      relationshipId: `relationship:${entry.metric}:${identityToken(contentIdentityFor(relationshipSeed)).slice(0, 16)}`,
      metric: entry.metric,
      quality: qualityFor(delta),
      subjectElementId: entry.subjectElementId,
      relatedElementIds: [...entry.relatedElementIds],
      observedValue,
      absoluteDelta: delta,
      closeness,
      ratio: {
        ...ratioRefFor(closest),
      },
      anchor: {
        x: canonicalNumber(entry.anchor.x),
        y: canonicalNumber(entry.anchor.y),
      },
      guide: entry.guide === null
        ? null
        : { axis: entry.guide.axis, position: canonicalNumber(entry.guide.position) },
    };
  });
}

function ratioRefFor(entry: CatalogRatio): HarmonicRatioRefV1 {
  return {
    packId: entry.packId,
    packVersion: entry.packVersion,
    ratioId: entry.ratio.id,
    familyRef: entry.ratio.familyRef ?? null,
    displayLabel: ratioDisplayLabel(entry.ratio.id),
    targetValue: canonicalNumber(entry.ratio.normalizedValue),
  };
}

function closestRatio(value: number, catalog: readonly CatalogRatio[]): CatalogRatio | null {
  let closest: CatalogRatio | null = null;
  let closestDelta = Number.POSITIVE_INFINITY;
  for (const entry of catalog) {
    const delta = Math.abs(value - entry.ratio.normalizedValue);
    if (delta < closestDelta) {
      closest = entry;
      closestDelta = delta;
    }
  }
  return closest;
}

function candidate(
  metric: HarmonicRelationshipMetricV1,
  priority: number,
  subjectElementId: string,
  relatedElementIds: readonly string[],
  observedValue: number,
  x: number,
  y: number,
  guide: HarmonicRelationshipGuideV1 | null,
): RelationshipCandidate {
  return { metric, priority, subjectElementId, relatedElementIds, observedValue, anchor: { x, y }, guide };
}

function normalizedRect(element: Element, bounds: Composition2D["surface"]["bounds"]) {
  return {
    x: (element.geometry.x - bounds.x) / bounds.width,
    y: (element.geometry.y - bounds.y) / bounds.height,
    width: element.geometry.width / bounds.width,
    height: element.geometry.height / bounds.height,
  };
}

function intervalOverlap(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number): number {
  return Math.max(0, Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart));
}

function qualityFor(delta: number): HarmonicRelationshipQualityV1 {
  if (delta <= 0.002) return "exact";
  if (delta <= 0.01) return "strong";
  return "near";
}

function ratioDisplayLabel(ratioId: string): string {
  if (ratioId === "phi-minor") return "φ minor";
  if (ratioId === "phi-major") return "φ major";
  return ratioId;
}

function candidateSortKey(candidateValue: RelationshipCandidate, ratio: CatalogRatio): string {
  return [
    candidateValue.metric,
    candidateValue.subjectElementId,
    ...candidateValue.relatedElementIds,
    ratio.packId,
    ratio.ratio.id,
  ].join(":");
}

function canonicalNumber(value: number): number {
  return Object.is(value, -0) ? 0 : Number(value.toFixed(12));
}

function stableCompare(first: string, second: string): number {
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
