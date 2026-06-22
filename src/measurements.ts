import type {
  Composition2D,
  CoreError,
  CoreResult,
  DiagnosticCode,
  DiagnosticSeverity,
  Element,
  OperationStatus,
  PackLockRef,
  Point,
  Provenance,
  Rect,
  Segment,
  SourceReference,
  SurfaceSpace,
} from "./index.js";
import type {
  ConstructionV1,
  GridCellV1,
  GuideOrientationV1,
  ZoneV1,
} from "./construction-generation.js";
import { validateConstructionV1 } from "./construction-generation.js";

export const MEASUREMENT_V1_SCHEMA_VERSION = "measurement-v1" as const;
export const MEASUREMENT_RESULT_V1_SCHEMA_VERSION = "measurement-result-v1" as const;

export const MEASUREMENT_V1_TYPES = [
  "distance",
  "position",
  "alignment",
  "angle",
  "area",
  "ratio",
  "containment",
  "overlap",
  "coverage",
  "directional-relation",
  "surface-hierarchy",
] as const;

export type MeasurementV1SchemaVersion = typeof MEASUREMENT_V1_SCHEMA_VERSION;
export type MeasurementResultV1SchemaVersion = typeof MEASUREMENT_RESULT_V1_SCHEMA_VERSION;
export type MeasurementTypeV1 = (typeof MEASUREMENT_V1_TYPES)[number];
export type MeasurementUnitV1 = "normalized" | "metric" | "dimensionless" | "radians" | "mixed";
export type MeasurementStatusV1 = "measured";
export type AxisV1 = "x" | "y";
export type DistanceAxisV1 = "horizontal" | "vertical" | "euclidean";
export type MeasurementMetricRequestV1 = "normalized" | "metric" | "both";
export type RectAnchorV1 =
  | "left"
  | "right"
  | "bottom"
  | "top"
  | "centerX"
  | "centerY"
  | "center"
  | "bottomLeft"
  | "bottomRight"
  | "topLeft"
  | "topRight";
export type GuideAnchorV1 = "guide";
export type AlignmentStatusV1 = "aligned" | "not_aligned" | "ambiguous";
export type AngleRelationV1 = "parallel" | "perpendicular" | "neither" | "ambiguous";
export type PositionContainmentStatusV1 = "inside" | "on_boundary" | "outside";
export type ContainmentStatusV1 = "inside" | "on_boundary" | "partially_outside" | "outside";
export type OverlapStatusV1 = "no_overlap" | "boundary_touch" | "overlap" | "contains" | "identical";
export type DirectionalRelationV1 = "above" | "below" | "left" | "right" | "centered" | "parallel" | "perpendicular" | "ambiguous";

export interface MeasurementMetricPolicyV1 {
  kind: "measurement-metric-policy";
  id: string;
  surfaceRef: string;
  width: number;
  height: number;
  unit: string;
}

export interface MeasurementToleranceV1 {
  kind: "measurement-tolerance";
  id: string;
  value: number;
}

export interface RatioTargetV1 {
  kind: "ratio-target";
  targetRef: string;
  value: number;
}

export interface MeasurementPointV1 {
  kind: "point";
  x: number | null;
  y: number | null;
}

export interface DistanceResultV1 {
  kind: "distance-result";
  sourceRef: string;
  targetRef: string;
  sourceAnchor: string | null;
  targetAnchor: string | null;
  axis: DistanceAxisV1;
  normalizedDistance: number;
  metricDistance: number | null;
  unit: string;
  signed: false;
}

export interface PositionResultV1 {
  kind: "position-result";
  sourceRef: string;
  sourceAnchor: string | null;
  normalizedPosition: MeasurementPointV1;
  metricPosition: MeasurementPointV1 | null;
  containmentStatus: PositionContainmentStatusV1;
  parentRef: string;
}

export interface AlignmentResultV1 {
  kind: "alignment-result";
  sourceRef: string;
  targetRef: string;
  sourceAnchor: string;
  targetAnchor: string;
  axis: AxisV1;
  normalizedDelta: number;
  metricDelta: number;
  tolerance: number;
  alignmentStatus: AlignmentStatusV1;
  boundaryPolicy: "inclusive";
}

export interface AngleResultV1 {
  kind: "angle-result";
  sourceRef: string;
  targetRef: string;
  radians: number;
  normalizedUnsignedAngle: number;
  tolerance: number;
  metricBasis: "surface-metric-policy";
  angleRelation: AngleRelationV1;
}

export interface AreaResultV1 {
  kind: "area-result";
  sourceRef: string;
  parentRef: string;
  normalizedArea: number;
  metricArea: number | null;
  unit: string;
  normalizationBasis: "surface";
}

export interface RatioResultV1 {
  kind: "ratio-result";
  ratioKind: "area";
  numeratorRef: string;
  denominatorRef: string;
  numeratorValue: number;
  denominatorValue: number;
  ratio: number;
  unit: "dimensionless";
  targetRef: string | null;
  targetRatio: number | null;
  absoluteDelta: number | null;
  relativeDelta: number | null;
}

export interface ContainmentResultV1 {
  kind: "containment-result";
  childRef: string;
  parentRef: string;
  tolerance: number;
  containmentStatus: ContainmentStatusV1;
}

export interface OverlapResultV1 {
  kind: "overlap-result";
  sourceRef: string;
  targetRef: string;
  overlapStatus: OverlapStatusV1;
  intersectionBounds: Rect | null;
  normalizedOverlapArea: number;
  metricOverlapArea: number | null;
  overlapRatioA: number;
  overlapRatioB: number;
  normalizationBasis: "surface";
}

export interface CoverageResultV1 {
  kind: "coverage-result";
  targetRef: string;
  contributorRefs: readonly string[];
  targetArea: number;
  coveredArea: number;
  uncoveredArea: number;
  coverageRatio: number;
  metricTargetArea: number | null;
  metricCoveredArea: number | null;
  metricUncoveredArea: number | null;
  unit: string;
  overlapPolicy: "union-clipped";
}

export interface DirectionalRelationResultV1 {
  kind: "directional-relation-result";
  sourceRef: string;
  targetRef: string;
  relationFamily: "vertical" | "horizontal" | "orientation";
  relation: DirectionalRelationV1;
  tolerance: number;
  delta: number;
}

export interface SurfaceHierarchyEntryV1 {
  sourceRef: string;
  rank: number;
  tieGroupRef: string;
  normalizedArea: number;
  metricArea: number | null;
}

export interface SurfaceHierarchyTieGroupV1 {
  tieGroupRef: string;
  rank: number;
  sourceRefs: readonly string[];
  normalizedArea: number;
}

export interface SurfaceHierarchyResultV1 {
  kind: "surface-hierarchy-result";
  areaTolerance: number;
  ranked: readonly SurfaceHierarchyEntryV1[];
  tieGroups: readonly SurfaceHierarchyTieGroupV1[];
}

export type MeasurementPayloadV1 =
  | DistanceResultV1
  | PositionResultV1
  | AlignmentResultV1
  | AngleResultV1
  | AreaResultV1
  | RatioResultV1
  | ContainmentResultV1
  | OverlapResultV1
  | CoverageResultV1
  | DirectionalRelationResultV1
  | SurfaceHierarchyResultV1;

export interface MeasurementEnvelopeV1<TType extends MeasurementTypeV1, TResult extends MeasurementPayloadV1> {
  kind: "measurement";
  schemaVersion: MeasurementV1SchemaVersion;
  measurementRef: string;
  requestRef: string;
  measurementType: TType;
  sourceRefs: readonly SourceReference[];
  operationRef: string;
  spaceRef: string;
  unit: MeasurementUnitV1;
  status: MeasurementStatusV1;
  result: TResult;
  tolerance: MeasurementToleranceV1 | null;
  metricPolicy: MeasurementMetricPolicyV1;
  warnings: readonly string[];
  provenance: Provenance;
  evaluationRefs: readonly SourceReference[];
  scoringRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
  decisionRefs: readonly SourceReference[];
}

export type DistanceMeasurementV1 = MeasurementEnvelopeV1<"distance", DistanceResultV1>;
export type PositionMeasurementV1 = MeasurementEnvelopeV1<"position", PositionResultV1>;
export type AlignmentMeasurementV1 = MeasurementEnvelopeV1<"alignment", AlignmentResultV1>;
export type AngleMeasurementV1 = MeasurementEnvelopeV1<"angle", AngleResultV1>;
export type AreaMeasurementV1 = MeasurementEnvelopeV1<"area", AreaResultV1>;
export type RatioMeasurementV1 = MeasurementEnvelopeV1<"ratio", RatioResultV1>;
export type ContainmentMeasurementV1 = MeasurementEnvelopeV1<"containment", ContainmentResultV1>;
export type OverlapMeasurementV1 = MeasurementEnvelopeV1<"overlap", OverlapResultV1>;
export type CoverageMeasurementV1 = MeasurementEnvelopeV1<"coverage", CoverageResultV1>;
export type DirectionalRelationMeasurementV1 = MeasurementEnvelopeV1<"directional-relation", DirectionalRelationResultV1>;
export type SurfaceHierarchyV1 = MeasurementEnvelopeV1<"surface-hierarchy", SurfaceHierarchyResultV1>;

export type MeasurementV1 =
  | DistanceMeasurementV1
  | PositionMeasurementV1
  | AlignmentMeasurementV1
  | AngleMeasurementV1
  | AreaMeasurementV1
  | RatioMeasurementV1
  | ContainmentMeasurementV1
  | OverlapMeasurementV1
  | CoverageMeasurementV1
  | DirectionalRelationMeasurementV1
  | SurfaceHierarchyV1;

export interface MeasurementResultV1 {
  kind: "measurement-result";
  schemaVersion: MeasurementResultV1SchemaVersion;
  measurementResultRef: string;
  operationRef: string;
  spaceRef: string;
  metricPolicy: MeasurementMetricPolicyV1;
  measurementRefs: readonly SourceReference[];
  measurements: readonly MeasurementV1[];
  warnings: readonly string[];
  evaluationRefs: readonly SourceReference[];
  scoringRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
  decisionRefs: readonly SourceReference[];
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

interface DiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
}

interface CoreResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly never[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  output?: TOutput | null;
}

type MeasurementValidation<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; result: CoreResult };

type MeasurementBuild =
  | { ok: true; measurement: MeasurementV1 }
  | { ok: false; result: CoreResult };

type GeometryShape =
  | { shape: "point"; point: Point }
  | { shape: "rect"; rect: Rect }
  | { shape: "guide"; orientation: GuideOrientationV1; position: number; segment: Segment }
  | { shape: "segment"; segment: Segment };

interface ResolvedGeometry {
  ref: string;
  sourceRef: SourceReference;
  sourceRefs: readonly SourceReference[];
  provenanceInputRefs: readonly SourceReference[];
  shape: GeometryShape;
}

interface MeasurementContext {
  measurementResultRef: string;
  surface: SurfaceSpace;
  construction: ConstructionV1 | null;
  metricPolicy: MeasurementMetricPolicyV1;
  geometryByRef: ReadonlyMap<string, ResolvedGeometry>;
}

interface MeasurementInputContext {
  context: MeasurementContext;
  requests: readonly Record<string, unknown>[];
}

interface AnchorPoint {
  x: number;
  y: number;
}

const MEASUREMENT_OPERATION_VERSION = "0.1.0";
const MEASURE_GEOMETRY_OPERATION_REF = "measurements.measureGeometry";
const MEASURE_AREAS_OPERATION_REF = "measurements.measureAreas";

const MEASUREMENT_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/measurements-v1",
});

const DEFAULT_RESULT_FIELDS = Object.freeze({
  warnings: [],
  errors: [],
  provenance: null,
  outputRefs: [],
  runRef: null,
  packLockRef: null,
  operationContextRef: null,
  output: null,
});

const SOURCE_REFERENCE_ALLOWED_KEYS = ["kind", "ref"] as const;
const PROVENANCE_ALLOWED_KEYS = ["operationName", "operationVersion", "inputRefs", "source"] as const;
const METRIC_POLICY_ALLOWED_KEYS = ["kind", "id", "surfaceRef", "width", "height", "unit"] as const;
const TOLERANCE_ALLOWED_KEYS = ["kind", "id", "value"] as const;
const RATIO_TARGET_ALLOWED_KEYS = ["kind", "targetRef", "value"] as const;
const POINT_ALLOWED_KEYS = ["kind", "x", "y"] as const;
const SEGMENT_ALLOWED_KEYS = ["kind", "start", "end"] as const;
const RECT_ALLOWED_KEYS = ["kind", "x", "y", "width", "height"] as const;
const GEOMETRY_REF_ALLOWED_KEYS = ["kind", "geometryRef", "geometry", "sourceRefs"] as const;
const COORDINATE_SYSTEM_ALLOWED_KEYS = [
  "kind",
  "id",
  "origin",
  "xAxis",
  "yAxis",
  "dimensions",
  "coordinateScale",
] as const;
const GEOMETRY_METRIC_POLICY_ALLOWED_KEYS = ["kind", "id", "quantity", "unit"] as const;
const GEOMETRY_TOLERANCE_POLICY_ALLOWED_KEYS = ["kind", "id", "coordinateTolerance", "metricTolerance"] as const;
const ELEMENT_ALLOWED_KEYS = ["kind", "id", "geometry", "anchors"] as const;
const ANCHOR_ALLOWED_KEYS = ["kind", "id", "point", "targetElementId"] as const;
const SURFACE_ALLOWED_KEYS = [
  "kind",
  "id",
  "coordinateSystem",
  "metricPolicy",
  "tolerancePolicy",
  "bounds",
] as const;
const COMPOSITION_ALLOWED_KEYS = [
  "kind",
  "id",
  "coordinateSystem",
  "metricPolicy",
  "tolerancePolicy",
  "surface",
  "elements",
  "anchors",
] as const;
const MEASUREMENT_INPUT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "measurementResultRef",
  "surface",
  "construction",
  "composition",
  "geometryRefs",
  "metricPolicy",
  "requests",
] as const;
const AREA_INPUT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "measurementResultRef",
  "surface",
  "construction",
  "composition",
  "geometryRefs",
  "metricPolicy",
  "sourceRefs",
] as const;
const BASE_REQUEST_ALLOWED_KEYS = ["kind", "requestRef", "measurementType"] as const;
const DISTANCE_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "sourceRef",
  "targetRef",
  "sourceAnchor",
  "targetAnchor",
  "axis",
  "metric",
] as const;
const POSITION_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "sourceRef",
  "sourceAnchor",
  "positionKind",
  "metric",
] as const;
const ALIGNMENT_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "sourceRef",
  "targetRef",
  "sourceAnchor",
  "targetAnchor",
  "axis",
  "tolerance",
] as const;
const ANGLE_REQUEST_ALLOWED_KEYS = [...BASE_REQUEST_ALLOWED_KEYS, "sourceRef", "targetRef", "tolerance"] as const;
const AREA_REQUEST_ALLOWED_KEYS = [...BASE_REQUEST_ALLOWED_KEYS, "sourceRef", "metric"] as const;
const RATIO_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "numeratorRef",
  "denominatorRef",
  "ratioKind",
  "targetRatio",
] as const;
const CONTAINMENT_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "childRef",
  "parentRef",
  "tolerance",
] as const;
const OVERLAP_REQUEST_ALLOWED_KEYS = [...BASE_REQUEST_ALLOWED_KEYS, "sourceRef", "targetRef", "metric"] as const;
const COVERAGE_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "targetRef",
  "contributorRefs",
  "metric",
  "coveragePolicy",
] as const;
const DIRECTIONAL_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "sourceRef",
  "targetRef",
  "relationFamily",
  "tolerance",
] as const;
const HIERARCHY_REQUEST_ALLOWED_KEYS = [
  ...BASE_REQUEST_ALLOWED_KEYS,
  "sourceRefs",
  "areaTolerance",
  "metric",
] as const;

const MEASUREMENT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "measurementRef",
  "requestRef",
  "measurementType",
  "sourceRefs",
  "operationRef",
  "spaceRef",
  "unit",
  "status",
  "result",
  "tolerance",
  "metricPolicy",
  "warnings",
  "provenance",
  "evaluationRefs",
  "scoringRefs",
  "artifactRefs",
  "decisionRefs",
] as const;
const MEASUREMENT_RESULT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "measurementResultRef",
  "operationRef",
  "spaceRef",
  "metricPolicy",
  "measurementRefs",
  "measurements",
  "warnings",
  "evaluationRefs",
  "scoringRefs",
  "artifactRefs",
  "decisionRefs",
  "sourceRefs",
  "provenance",
] as const;

const DISTANCE_RESULT_ALLOWED_KEYS = [
  "kind",
  "sourceRef",
  "targetRef",
  "sourceAnchor",
  "targetAnchor",
  "axis",
  "normalizedDistance",
  "metricDistance",
  "unit",
  "signed",
] as const;
const POSITION_RESULT_ALLOWED_KEYS = [
  "kind",
  "sourceRef",
  "sourceAnchor",
  "normalizedPosition",
  "metricPosition",
  "containmentStatus",
  "parentRef",
] as const;
const ALIGNMENT_RESULT_ALLOWED_KEYS = [
  "kind",
  "sourceRef",
  "targetRef",
  "sourceAnchor",
  "targetAnchor",
  "axis",
  "normalizedDelta",
  "metricDelta",
  "tolerance",
  "alignmentStatus",
  "boundaryPolicy",
] as const;
const ANGLE_RESULT_ALLOWED_KEYS = [
  "kind",
  "sourceRef",
  "targetRef",
  "radians",
  "normalizedUnsignedAngle",
  "tolerance",
  "metricBasis",
  "angleRelation",
] as const;
const AREA_RESULT_ALLOWED_KEYS = [
  "kind",
  "sourceRef",
  "parentRef",
  "normalizedArea",
  "metricArea",
  "unit",
  "normalizationBasis",
] as const;
const RATIO_RESULT_ALLOWED_KEYS = [
  "kind",
  "ratioKind",
  "numeratorRef",
  "denominatorRef",
  "numeratorValue",
  "denominatorValue",
  "ratio",
  "unit",
  "targetRef",
  "targetRatio",
  "absoluteDelta",
  "relativeDelta",
] as const;
const CONTAINMENT_RESULT_ALLOWED_KEYS = [
  "kind",
  "childRef",
  "parentRef",
  "tolerance",
  "containmentStatus",
] as const;
const OVERLAP_RESULT_ALLOWED_KEYS = [
  "kind",
  "sourceRef",
  "targetRef",
  "overlapStatus",
  "intersectionBounds",
  "normalizedOverlapArea",
  "metricOverlapArea",
  "overlapRatioA",
  "overlapRatioB",
  "normalizationBasis",
] as const;
const COVERAGE_RESULT_ALLOWED_KEYS = [
  "kind",
  "targetRef",
  "contributorRefs",
  "targetArea",
  "coveredArea",
  "uncoveredArea",
  "coverageRatio",
  "metricTargetArea",
  "metricCoveredArea",
  "metricUncoveredArea",
  "unit",
  "overlapPolicy",
] as const;
const DIRECTIONAL_RESULT_ALLOWED_KEYS = [
  "kind",
  "sourceRef",
  "targetRef",
  "relationFamily",
  "relation",
  "tolerance",
  "delta",
] as const;
const HIERARCHY_RESULT_ALLOWED_KEYS = ["kind", "areaTolerance", "ranked", "tieGroups"] as const;
const HIERARCHY_ENTRY_ALLOWED_KEYS = ["sourceRef", "rank", "tieGroupRef", "normalizedArea", "metricArea"] as const;
const HIERARCHY_TIE_GROUP_ALLOWED_KEYS = ["tieGroupRef", "rank", "sourceRefs", "normalizedArea"] as const;

export function measureGeometryV1(input: unknown): CoreResult<MeasurementResultV1> {
  const validation = validateMeasurementInput(input);
  if (!validation.ok) {
    return validation.result as CoreResult<MeasurementResultV1>;
  }

  const measurements: MeasurementV1[] = [];
  for (const request of validation.value.requests) {
    const measurement = measureRequest(validation.value.context, request);
    if (!measurement.ok) {
      return measurement.result as CoreResult<MeasurementResultV1>;
    }
    measurements.push(measurement.measurement);
  }

  const measurementRefs = measurements.map((measurement) => ({
    kind: "measurement",
    ref: measurement.measurementRef,
  }));
  const sourceRefs = uniqueSourceRefs([
    { kind: "geometry", ref: validation.value.context.surface.id },
    ...(validation.value.context.construction === null
      ? []
      : [{ kind: "construction", ref: validation.value.context.construction.constructionRef }]),
    ...measurements.flatMap((measurement) => measurement.sourceRefs),
  ]);
  const output: MeasurementResultV1 = {
    kind: "measurement-result",
    schemaVersion: MEASUREMENT_RESULT_V1_SCHEMA_VERSION,
    measurementResultRef: validation.value.context.measurementResultRef,
    operationRef: MEASURE_GEOMETRY_OPERATION_REF,
    spaceRef: validation.value.context.surface.id,
    metricPolicy: validation.value.context.metricPolicy,
    measurementRefs,
    measurements,
    warnings: uniqueStrings(measurements.flatMap((measurement) => measurement.warnings)),
    evaluationRefs: [],
    scoringRefs: [],
    artifactRefs: [],
    decisionRefs: [],
    sourceRefs,
    provenance: createMeasurementProvenance("core.measurements-v1.measureGeometry", sourceRefs),
  };

  return createMeasurementResult({
    status: "ok",
    provenance: output.provenance,
    outputRefs: [{ kind: "measurement-result", ref: output.measurementResultRef }, ...measurementRefs],
    output,
  });
}

export function measureAreasV1(input: unknown): CoreResult<MeasurementResultV1> {
  if (!isRecord(input)) {
    return missingMeasurementInput("areaMeasurementInput", "Area measurement requires a structured input.") as CoreResult<MeasurementResultV1>;
  }

  const unsupportedField = firstUnsupportedKey(input, AREA_INPUT_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return invalidMeasurement(unsupportedField, `Area measurement input field is outside scope: ${unsupportedField}.`) as CoreResult<MeasurementResultV1>;
  }

  if (input.kind !== "area-measurement-input" || input.schemaVersion !== "area-measurement-input-v1") {
    return invalidMeasurement("schemaVersion", "Area measurement input requires the area-measurement-input-v1 schema.") as CoreResult<MeasurementResultV1>;
  }

  if (!Array.isArray(input.sourceRefs) || !input.sourceRefs.every(isNonEmptyString)) {
    return missingMeasurementInput("sourceRefs", "Area measurement requires explicit sourceRefs.") as CoreResult<MeasurementResultV1>;
  }

  const requests = input.sourceRefs.map((sourceRef) => ({
    kind: "measurement-request",
    requestRef: `area:${sourceRef}`,
    measurementType: "area",
    sourceRef,
    metric: "both",
  }));

  const measuredAreas = measureGeometryV1({
    kind: "measurement-input",
    schemaVersion: "measurement-input-v1",
    measurementResultRef: input.measurementResultRef,
    surface: input.surface,
    construction: input.construction,
    composition: input.composition,
    geometryRefs: input.geometryRefs,
    metricPolicy: input.metricPolicy,
    requests,
  });
  if (measuredAreas.status !== "ok" || measuredAreas.output === null) {
    return measuredAreas;
  }

  const output: MeasurementResultV1 = {
    ...measuredAreas.output,
    operationRef: MEASURE_AREAS_OPERATION_REF,
    provenance: createMeasurementProvenance("core.measurements-v1.measureAreas", measuredAreas.output.sourceRefs),
  };

  return createMeasurementResult({
    status: "ok",
    provenance: output.provenance,
    outputRefs: measuredAreas.outputRefs,
    output,
  });
}

export function validateMeasurementV1(value: unknown): CoreResult<MeasurementV1> {
  const validation = validateMeasurementValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<MeasurementV1>;
  }

  return createMeasurementResult({
    status: "ok",
    provenance: createMeasurementProvenance("core.measurements-v1.measurement.validate", [
      { kind: "measurement", ref: validation.value.measurementRef },
    ]),
    outputRefs: [{ kind: "measurement", ref: validation.value.measurementRef }],
    output: validation.value,
  });
}

export function validateMeasurementResultV1(value: unknown): CoreResult<MeasurementResultV1> {
  const validation = validateMeasurementResultValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<MeasurementResultV1>;
  }

  return createMeasurementResult({
    status: "ok",
    provenance: createMeasurementProvenance("core.measurements-v1.result.validate", [
      { kind: "measurement-result", ref: validation.value.measurementResultRef },
    ]),
    outputRefs: [{ kind: "measurement-result", ref: validation.value.measurementResultRef }, ...validation.value.measurementRefs],
    output: validation.value,
  });
}

function validateMeasurementInput(input: unknown): MeasurementValidation<MeasurementInputContext> {
  if (!isRecord(input)) {
    return failedMeasurement(missingMeasurementInput("measurementInput", "Measurement V1 requires a structured input."));
  }

  const unsupportedField = firstUnsupportedKey(input, MEASUREMENT_INPUT_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedMeasurement(invalidMeasurement(unsupportedField, `Measurement input field is outside scope: ${unsupportedField}.`));
  }

  if (input.kind !== "measurement-input" || input.schemaVersion !== "measurement-input-v1") {
    return failedMeasurement(invalidMeasurement("schemaVersion", "Measurement input requires the measurement-input-v1 schema."));
  }

  if (!isNonEmptyString(input.measurementResultRef)) {
    return failedMeasurement(missingMeasurementInput("measurementResultRef", "Measurement input requires a non-empty measurementResultRef."));
  }

  const metricPolicyValidation = validateMetricPolicyValue(input.metricPolicy);
  if (!metricPolicyValidation.ok) {
    return metricPolicyValidation;
  }

  const surfaceValidation = validateMeasurementSurface(input.surface);
  if (!surfaceValidation.ok) {
    return surfaceValidation;
  }

  const compositionValidation = validateOptionalComposition(input.composition);
  if (!compositionValidation.ok) {
    return compositionValidation;
  }

  const constructionValidation = validateOptionalConstruction(input.construction);
  if (!constructionValidation.ok) {
    return constructionValidation;
  }

  if (!Array.isArray(input.requests)) {
    return failedMeasurement(missingMeasurementInput("requests", "Measurement input requires explicit measurement requests."));
  }

  const requests: Record<string, unknown>[] = [];
  const requestRefs = new Set<string>();
  for (const request of input.requests) {
    if (!isRecord(request)) {
      return failedMeasurement(unsupportedMeasurementRequest("requests", "Measurement requests must be structured objects."));
    }
    const requestRef = nonEmptyString(request.requestRef);
    if (requestRef === null) {
      return failedMeasurement(missingMeasurementInput("requestRef", "Measurement requests require non-empty requestRef values."));
    }
    if (requestRefs.has(requestRef)) {
      return failedMeasurement(invalidMeasurement("requestRef", `Duplicate measurement requestRef: ${requestRef}.`));
    }
    requestRefs.add(requestRef);
    requests.push(request);
  }

  const registryValidation = buildGeometryRegistry(
    surfaceValidation.value,
    compositionValidation.value,
    constructionValidation.value,
    input.geometryRefs,
  );
  if (!registryValidation.ok) {
    return registryValidation;
  }

  return validMeasurement({
    context: {
      measurementResultRef: input.measurementResultRef,
      surface: surfaceValidation.value,
      construction: constructionValidation.value,
      metricPolicy: metricPolicyValidation.value,
      geometryByRef: registryValidation.value,
    },
    requests,
  });
}

function validateOptionalComposition(value: unknown): MeasurementValidation<Composition2D | null> {
  if (value === undefined || value === null) {
    return validMeasurement(null);
  }

  return validateMeasurementComposition(value);
}

function validateMeasurementSurface(value: unknown): MeasurementValidation<SurfaceSpace> {
  if (!isRecord(value)) {
    return failedMeasurement(incompatibleGeometry("surface", "Measurement V1 requires a structured SurfaceSpace input."));
  }

  const unsupportedField = firstUnsupportedKey(value, SURFACE_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedMeasurement(incompatibleGeometry(unsupportedField, `SurfaceSpace field is outside Geometry V1: ${unsupportedField}.`));
  }

  if (value.kind !== "surface-space" || !isNonEmptyString(value.id)) {
    return failedMeasurement(incompatibleGeometry("surface", "Measurement V1 requires a SurfaceSpace with a non-empty id."));
  }

  if (!isCoordinateSystem2D(value.coordinateSystem) || value.coordinateSystem.coordinateScale !== "normalized") {
    return failedMeasurement(incompatibleGeometry("coordinateSystem", "Measurements V1 requires normalized Norma canonical 2D coordinates."));
  }

  if (value.metricPolicy !== undefined && value.metricPolicy !== null && !isGeometryMetricPolicy(value.metricPolicy)) {
    return failedMeasurement(incompatibleGeometry("metricPolicy", "SurfaceSpace metricPolicy is invalid."));
  }

  if (value.tolerancePolicy !== undefined && value.tolerancePolicy !== null && !isGeometryTolerancePolicy(value.tolerancePolicy)) {
    return failedMeasurement(incompatibleGeometry("tolerancePolicy", "SurfaceSpace tolerancePolicy is invalid."));
  }

  if (!isPositiveRect(value.bounds) || !isNormalizedRect(value.bounds)) {
    return failedMeasurement(incompatibleGeometry("bounds", "SurfaceSpace bounds must be a normalized positive rectangle."));
  }

  return validMeasurement(value as unknown as SurfaceSpace);
}

function validateMeasurementComposition(value: unknown): MeasurementValidation<Composition2D> {
  if (!isRecord(value)) {
    return failedMeasurement(incompatibleGeometry("composition", "Measurement composition must be a structured Composition2D."));
  }

  const unsupportedField = firstUnsupportedKey(value, COMPOSITION_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedMeasurement(incompatibleGeometry(unsupportedField, `Composition2D field is outside Geometry V1: ${unsupportedField}.`));
  }

  if (value.kind !== "composition-2d" || !isNonEmptyString(value.id)) {
    return failedMeasurement(incompatibleGeometry("composition", "Measurement composition requires kind composition-2d and a non-empty id."));
  }

  if (!isCoordinateSystem2D(value.coordinateSystem) || value.coordinateSystem.coordinateScale !== "normalized") {
    return failedMeasurement(incompatibleGeometry("composition.coordinateSystem", "Composition2D must use normalized Norma canonical 2D coordinates."));
  }

  const surfaceValidation = validateMeasurementSurface(value.surface);
  if (!surfaceValidation.ok) {
    return surfaceValidation as MeasurementValidation<Composition2D>;
  }

  if (!sameCoordinateSystem(value.coordinateSystem, surfaceValidation.value.coordinateSystem)) {
    return failedMeasurement(incompatibleGeometry("composition.surface", "Composition2D and SurfaceSpace coordinate systems must match."));
  }

  if (!Array.isArray(value.elements) || !value.elements.every(isMeasurementElement)) {
    return failedMeasurement(incompatibleGeometry("composition.elements", "Composition2D elements must be rectangular Geometry V1 elements."));
  }

  if (value.anchors !== undefined && (!Array.isArray(value.anchors) || !value.anchors.every(isMeasurementAnchor))) {
    return failedMeasurement(incompatibleGeometry("composition.anchors", "Composition2D anchors are invalid."));
  }

  return validMeasurement(value as unknown as Composition2D);
}

function validateOptionalConstruction(value: unknown): MeasurementValidation<ConstructionV1 | null> {
  if (value === undefined || value === null) {
    return validMeasurement(null);
  }

  const validation = validateConstructionV1(value);
  if (validation.status !== "ok" || validation.output === null) {
    return failedMeasurement(invalidMeasurement("construction", "Measurement construction must be valid ConstructionV1."));
  }

  return validMeasurement(validation.output);
}

function buildGeometryRegistry(
  surface: SurfaceSpace,
  composition: Composition2D | null,
  construction: ConstructionV1 | null,
  geometryRefs: unknown,
): MeasurementValidation<ReadonlyMap<string, ResolvedGeometry>> {
  const entries = new Map<string, ResolvedGeometry>();
  const surfaceRef: SourceReference = { kind: "geometry", ref: surface.id };
  entries.set(surface.id, {
    ref: surface.id,
    sourceRef: surfaceRef,
    sourceRefs: [surfaceRef],
    provenanceInputRefs: [surfaceRef],
    shape: { shape: "rect", rect: surface.bounds },
  });

  if (composition !== null) {
    for (const element of composition.elements) {
      const sourceRef: SourceReference = { kind: "geometry", ref: element.id };
      entries.set(element.id, {
        ref: element.id,
        sourceRef,
        sourceRefs: [sourceRef, { kind: "composition", ref: composition.id }],
        provenanceInputRefs: [sourceRef, { kind: "composition", ref: composition.id }],
        shape: { shape: "rect", rect: element.geometry },
      });
    }
  }

  if (construction !== null) {
    addConstructionEntries(entries, construction);
  }

  if (geometryRefs !== undefined) {
    if (!Array.isArray(geometryRefs)) {
      return failedMeasurement(invalidMeasurement("geometryRefs", "Measurement geometryRefs must be an array."));
    }

    for (const geometryRef of geometryRefs) {
      const parsed = parseGeometryRef(geometryRef);
      if (!parsed.ok) {
        return parsed;
      }
      entries.set(parsed.value.ref, parsed.value);
    }
  }

  return validMeasurement(entries);
}

function addConstructionEntries(entries: Map<string, ResolvedGeometry>, construction: ConstructionV1): void {
  const constructionRef: SourceReference = { kind: "construction", ref: construction.constructionRef };

  for (const guide of construction.guides) {
    const sourceRef: SourceReference = { kind: "guide", ref: guide.guideRef };
    entries.set(guide.guideRef, {
      ref: guide.guideRef,
      sourceRef,
      sourceRefs: uniqueSourceRefs([sourceRef, constructionRef, ...guide.sourceRefs, ...guide.provenance.inputRefs]),
      provenanceInputRefs: uniqueSourceRefs([sourceRef, constructionRef, ...guide.provenance.inputRefs]),
      shape: {
        shape: "guide",
        orientation: guide.orientation,
        position: guide.position,
        segment: guide.segment,
      },
    });
  }

  for (const zone of construction.zones) {
    addConstructionRect(entries, constructionRef, { kind: "zone", ref: zone.zoneRef }, zone.bounds, zone);
  }

  for (const grid of construction.grids) {
    for (const cell of grid.cells) {
      addConstructionRect(entries, constructionRef, { kind: "grid-cell", ref: cell.cellRef }, cell.bounds, cell);
    }
  }

  for (const intersection of construction.intersections) {
    const sourceRef: SourceReference = { kind: "intersection", ref: intersection.intersectionRef };
    entries.set(intersection.intersectionRef, {
      ref: intersection.intersectionRef,
      sourceRef,
      sourceRefs: uniqueSourceRefs([sourceRef, constructionRef, ...intersection.sourceRefs, ...intersection.provenance.inputRefs]),
      provenanceInputRefs: uniqueSourceRefs([sourceRef, constructionRef, ...intersection.provenance.inputRefs]),
      shape: { shape: "point", point: intersection.point },
    });
  }
}

function addConstructionRect(
  entries: Map<string, ResolvedGeometry>,
  constructionRef: SourceReference,
  sourceRef: SourceReference,
  rect: Rect,
  object: ZoneV1 | GridCellV1,
): void {
  entries.set(sourceRef.ref, {
    ref: sourceRef.ref,
    sourceRef,
    sourceRefs: uniqueSourceRefs([sourceRef, constructionRef, ...object.sourceRefs, ...object.provenance.inputRefs]),
    provenanceInputRefs: uniqueSourceRefs([sourceRef, constructionRef, ...object.provenance.inputRefs]),
    shape: { shape: "rect", rect },
  });
}

function parseGeometryRef(value: unknown): MeasurementValidation<ResolvedGeometry> {
  if (!isRecord(value)) {
    return failedMeasurement(invalidMeasurement("geometryRefs", "Geometry refs must be structured objects."));
  }

  const unsupportedField = firstUnsupportedKey(value, GEOMETRY_REF_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedMeasurement(invalidMeasurement(unsupportedField, `Geometry ref field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "geometry-ref" || !isNonEmptyString(value.geometryRef)) {
    return failedMeasurement(invalidMeasurement("geometryRef", "Geometry ref requires kind geometry-ref and a non-empty geometryRef."));
  }

  const sourceRefs = value.sourceRefs === undefined
    ? []
    : isSourceReferenceArray(value.sourceRefs)
      ? value.sourceRefs
      : null;
  if (sourceRefs === null) {
    return failedMeasurement(invalidMeasurement("geometryRefs.sourceRefs", "Geometry ref sourceRefs are invalid."));
  }

  const shape = parseGeometryShape(value.geometry);
  if (shape === null) {
    return failedMeasurement(invalidMeasurement("geometryRefs.geometry", "Geometry ref supports Point, Rect, or Segment geometry."));
  }

  const sourceRef: SourceReference = { kind: "geometry", ref: value.geometryRef };
  return validMeasurement({
    ref: value.geometryRef,
    sourceRef,
    sourceRefs: uniqueSourceRefs([sourceRef, ...sourceRefs]),
    provenanceInputRefs: uniqueSourceRefs([sourceRef, ...sourceRefs]),
    shape,
  });
}

function parseGeometryShape(value: unknown): GeometryShape | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  if (value.kind === "point" && firstUnsupportedKey(value, POINT_ALLOWED_KEYS) === null && isFiniteNumber(value.x)) {
    if (value.y !== undefined && !isFiniteNumber(value.y)) {
      return null;
    }
    return { shape: "point", point: value as unknown as Point };
  }

  if (value.kind === "rect" && firstUnsupportedKey(value, RECT_ALLOWED_KEYS) === null && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.width) && isFiniteNumber(value.height) && value.width >= 0 && value.height >= 0) {
    return { shape: "rect", rect: value as unknown as Rect };
  }

  if (value.kind === "segment" && firstUnsupportedKey(value, SEGMENT_ALLOWED_KEYS) === null && isPoint(value.start) && isPoint(value.end)) {
    return { shape: "segment", segment: value as unknown as Segment };
  }

  return null;
}

function measureRequest(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const measurementType = request.measurementType;
  if (!isMeasurementType(measurementType)) {
    return failedBuild(unsupportedMeasurementRequest("measurementType", `Unsupported measurement type: ${String(measurementType)}.`));
  }

  if (measurementType === "distance") {
    return measureDistance(context, request);
  }
  if (measurementType === "position") {
    return measurePosition(context, request);
  }
  if (measurementType === "alignment") {
    return measureAlignment(context, request);
  }
  if (measurementType === "angle") {
    return measureAngle(context, request);
  }
  if (measurementType === "area") {
    return measureArea(context, request);
  }
  if (measurementType === "ratio") {
    return measureRatio(context, request);
  }
  if (measurementType === "containment") {
    return measureContainment(context, request);
  }
  if (measurementType === "overlap") {
    return measureOverlap(context, request);
  }
  if (measurementType === "coverage") {
    return measureCoverage(context, request);
  }
  if (measurementType === "directional-relation") {
    return measureDirectionalRelation(context, request);
  }
  return measureSurfaceHierarchy(context, request);
}

function measureDistance(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, DISTANCE_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const sourceRef = nonEmptyString(request.sourceRef);
  const targetRef = nonEmptyString(request.targetRef);
  if (sourceRef === null || targetRef === null) {
    return failedBuild(missingMeasurementInput("distance", "Distance measurement requires sourceRef and targetRef."));
  }

  const axis = request.axis;
  if (!isDistanceAxis(axis)) {
    return failedBuild(unsupportedMeasurementRequest("axis", "Distance axis must be horizontal, vertical, or euclidean."));
  }

  const source = context.geometryByRef.get(sourceRef);
  const target = context.geometryByRef.get(targetRef);
  if (source === undefined || target === undefined) {
    return failedBuild(incompatibleGeometry("distance", "Distance source and target refs must resolve to known geometry."));
  }

  const distance = axis === "euclidean"
    ? euclideanDistance(context, source, target)
    : axisDistance(context, source, target, axis, stringOrNull(request.sourceAnchor), stringOrNull(request.targetAnchor));
  if (!distance.ok) {
    return distance;
  }

  const metricDistance = distance.value.metricDistance;
  const result: DistanceResultV1 = {
    kind: "distance-result",
    sourceRef,
    targetRef,
    sourceAnchor: stringOrNull(request.sourceAnchor),
    targetAnchor: stringOrNull(request.targetAnchor),
    axis,
    normalizedDistance: distance.value.normalizedDistance,
    metricDistance,
    unit: context.metricPolicy.unit,
    signed: false,
  };

  return measured(context, requestRef, "distance", [source, target], "mixed", result, null, []);
}

function axisDistance(
  context: MeasurementContext,
  source: ResolvedGeometry,
  target: ResolvedGeometry,
  axis: "horizontal" | "vertical",
  sourceAnchor: string | null,
  targetAnchor: string | null,
): MeasurementValidation<{ normalizedDistance: number; metricDistance: number }> {
  const coordinateAxis: AxisV1 = axis === "horizontal" ? "x" : "y";
  const sourceCoordinate = coordinateForAxis(source, coordinateAxis, sourceAnchor);
  const targetCoordinate = coordinateForAxis(target, coordinateAxis, targetAnchor);
  if (sourceCoordinate === null || targetCoordinate === null) {
    return failedMeasurement(incompatibleGeometry("distance", "Requested anchors cannot be measured on the requested axis."));
  }

  const normalizedDistance = Math.abs(sourceCoordinate - targetCoordinate);
  return validMeasurement({
    normalizedDistance,
    metricDistance: normalizedDistance * axisScale(context.metricPolicy, coordinateAxis),
  });
}

function euclideanDistance(
  context: MeasurementContext,
  source: ResolvedGeometry,
  target: ResolvedGeometry,
): MeasurementValidation<{ normalizedDistance: number; metricDistance: number }> {
  const sourcePoint = pointForGeometry(source, null);
  const targetPoint = pointForGeometry(target, null);
  if (sourcePoint === null || targetPoint === null) {
    return failedMeasurement(incompatibleGeometry("distance", "Euclidean distance requires point-like source and target geometry."));
  }

  return validMeasurement({
    normalizedDistance: Math.hypot(sourcePoint.x - targetPoint.x, sourcePoint.y - targetPoint.y),
    metricDistance: Math.hypot(
      (sourcePoint.x - targetPoint.x) * context.metricPolicy.width,
      (sourcePoint.y - targetPoint.y) * context.metricPolicy.height,
    ),
  });
}

function measurePosition(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, POSITION_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const sourceRef = nonEmptyString(request.sourceRef);
  if (sourceRef === null) {
    return failedBuild(missingMeasurementInput("position", "Position measurement requires sourceRef."));
  }

  const source = context.geometryByRef.get(sourceRef);
  if (source === undefined) {
    return failedBuild(incompatibleGeometry("position", "Position source ref must resolve to known geometry."));
  }

  const normalizedPosition = positionForGeometry(source, stringOrNull(request.sourceAnchor));
  if (normalizedPosition === null) {
    return failedBuild(incompatibleGeometry("position", "Position source cannot be measured with the requested anchor."));
  }

  const result: PositionResultV1 = {
    kind: "position-result",
    sourceRef,
    sourceAnchor: stringOrNull(request.sourceAnchor),
    normalizedPosition,
    metricPosition: metricPoint(normalizedPosition, context.metricPolicy),
    containmentStatus: positionContainmentStatus(normalizedPosition, context.surface.bounds),
    parentRef: context.surface.id,
  };

  return measured(context, requestRef, "position", [source], "mixed", result, null, []);
}

function measureAlignment(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, ALIGNMENT_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const sourceRef = nonEmptyString(request.sourceRef);
  const targetRef = nonEmptyString(request.targetRef);
  if (sourceRef === null || targetRef === null) {
    return failedBuild(missingMeasurementInput("alignment", "Alignment requires sourceRef and targetRef."));
  }

  const tolerance = parseTolerance(request.tolerance);
  if (!tolerance.ok) {
    return failedBuild(tolerance.result);
  }

  const axis = request.axis;
  if (!isAxis(axis)) {
    return failedBuild(unsupportedMeasurementRequest("axis", "Alignment axis must be x or y."));
  }

  const source = context.geometryByRef.get(sourceRef);
  const target = context.geometryByRef.get(targetRef);
  if (source === undefined || target === undefined) {
    return failedBuild(incompatibleGeometry("alignment", "Alignment source and target refs must resolve to known geometry."));
  }

  const sourceAnchor = nonEmptyString(request.sourceAnchor);
  const targetAnchor = nonEmptyString(request.targetAnchor);
  if (sourceAnchor === null || targetAnchor === null) {
    return failedBuild(missingMeasurementInput("alignment", "Alignment requires explicit sourceAnchor and targetAnchor."));
  }

  const sourceCoordinate = coordinateForAxis(source, axis, sourceAnchor);
  const targetCoordinate = coordinateForAxis(target, axis, targetAnchor);
  if (sourceCoordinate === null || targetCoordinate === null) {
    return failedBuild(incompatibleGeometry("alignment", "Alignment anchors are incompatible with the requested axis."));
  }

  const normalizedDelta = Math.abs(sourceCoordinate - targetCoordinate);
  const result: AlignmentResultV1 = {
    kind: "alignment-result",
    sourceRef,
    targetRef,
    sourceAnchor,
    targetAnchor,
    axis,
    normalizedDelta,
    metricDelta: normalizedDelta * axisScale(context.metricPolicy, axis),
    tolerance: tolerance.value.value,
    alignmentStatus: normalizedDelta <= tolerance.value.value ? "aligned" : "not_aligned",
    boundaryPolicy: "inclusive",
  };

  return measured(context, requestRef, "alignment", [source, target], "mixed", result, tolerance.value, []);
}

function measureAngle(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, ANGLE_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const sourceRef = nonEmptyString(request.sourceRef);
  const targetRef = nonEmptyString(request.targetRef);
  if (sourceRef === null || targetRef === null) {
    return failedBuild(missingMeasurementInput("angle", "Angle measurement requires sourceRef and targetRef."));
  }

  const tolerance = parseTolerance(request.tolerance);
  if (!tolerance.ok) {
    return failedBuild(tolerance.result);
  }

  const source = context.geometryByRef.get(sourceRef);
  const target = context.geometryByRef.get(targetRef);
  if (source === undefined || target === undefined) {
    return failedBuild(incompatibleGeometry("angle", "Angle source and target refs must resolve to known geometry."));
  }

  const sourceVector = metricVector(context, source);
  const targetVector = metricVector(context, target);
  if (sourceVector === null || targetVector === null) {
    return failedBuild(incompatibleGeometry("angle", "Angle measurement requires orientable non-zero geometry."));
  }

  const sourceLength = Math.hypot(sourceVector.x, sourceVector.y);
  const targetLength = Math.hypot(targetVector.x, targetVector.y);
  if (sourceLength === 0 || targetLength === 0) {
    return failedBuild(incompatibleGeometry("angle", "Angle measurement rejects zero-length geometry."));
  }

  const cosine = clamp(Math.abs((sourceVector.x * targetVector.x + sourceVector.y * targetVector.y) / (sourceLength * targetLength)), 0, 1);
  const radians = Math.acos(cosine);
  const parallel = radians <= tolerance.value.value;
  const perpendicular = Math.abs(radians - Math.PI / 2) <= tolerance.value.value;
  const relation: AngleRelationV1 = parallel && perpendicular
    ? "ambiguous"
    : parallel
      ? "parallel"
      : perpendicular
        ? "perpendicular"
        : "neither";
  const result: AngleResultV1 = {
    kind: "angle-result",
    sourceRef,
    targetRef,
    radians,
    normalizedUnsignedAngle: radians / Math.PI,
    tolerance: tolerance.value.value,
    metricBasis: "surface-metric-policy",
    angleRelation: relation,
  };

  return measured(context, requestRef, "angle", [source, target], "radians", result, tolerance.value, []);
}

function measureArea(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, AREA_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const sourceRef = nonEmptyString(request.sourceRef);
  if (sourceRef === null) {
    return failedBuild(missingMeasurementInput("area", "Area measurement requires sourceRef."));
  }

  const source = context.geometryByRef.get(sourceRef);
  if (source === undefined) {
    return failedBuild(incompatibleGeometry("area", "Area source ref must resolve to known geometry."));
  }

  const area = areaForGeometry(context, source);
  if (!area.ok) {
    return failedBuild(area.result);
  }

  const result: AreaResultV1 = {
    kind: "area-result",
    sourceRef,
    parentRef: context.surface.id,
    normalizedArea: area.value.normalizedArea,
    metricArea: area.value.metricArea,
    unit: `${context.metricPolicy.unit}^2`,
    normalizationBasis: "surface",
  };

  return measured(context, requestRef, "area", [source], "mixed", result, null, []);
}

function measureRatio(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, RATIO_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const numeratorRef = nonEmptyString(request.numeratorRef);
  const denominatorRef = nonEmptyString(request.denominatorRef);
  if (numeratorRef === null || denominatorRef === null) {
    return failedBuild(missingMeasurementInput("ratio", "Ratio measurement requires numeratorRef and denominatorRef."));
  }
  if (request.ratioKind !== "area") {
    return failedBuild(unsupportedMeasurementRequest("ratioKind", "Measurements V1 supports area ratios only."));
  }

  const numerator = context.geometryByRef.get(numeratorRef);
  const denominator = context.geometryByRef.get(denominatorRef);
  if (numerator === undefined || denominator === undefined) {
    return failedBuild(incompatibleGeometry("ratio", "Ratio source refs must resolve to known geometry."));
  }

  const numeratorArea = areaForGeometry(context, numerator);
  const denominatorArea = areaForGeometry(context, denominator);
  if (!numeratorArea.ok || !denominatorArea.ok || denominatorArea.value.normalizedArea === 0) {
    return failedBuild(incompatibleGeometry("ratio", "Ratio area denominator must be positive and finite."));
  }

  const target = request.targetRatio === undefined ? null : validateRatioTarget(request.targetRatio);
  if (target === false) {
    return failedBuild(invalidMeasurement("targetRatio", "Ratio target must be explicit, finite, and non-empty."));
  }

  const ratio = numeratorArea.value.normalizedArea / denominatorArea.value.normalizedArea;
  const targetRatio = target === null ? null : target.value;
  const absoluteDelta = targetRatio === null ? null : Math.abs(ratio - targetRatio);
  const relativeDelta = targetRatio === null || targetRatio === 0 ? null : absoluteDelta === null ? null : absoluteDelta / Math.abs(targetRatio);
  const result: RatioResultV1 = {
    kind: "ratio-result",
    ratioKind: "area",
    numeratorRef,
    denominatorRef,
    numeratorValue: numeratorArea.value.normalizedArea,
    denominatorValue: denominatorArea.value.normalizedArea,
    ratio,
    unit: "dimensionless",
    targetRef: target === null ? null : target.targetRef,
    targetRatio,
    absoluteDelta,
    relativeDelta,
  };

  return measured(context, requestRef, "ratio", [numerator, denominator], "dimensionless", result, null, []);
}

function measureContainment(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, CONTAINMENT_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const childRef = nonEmptyString(request.childRef);
  const parentRef = nonEmptyString(request.parentRef);
  if (childRef === null || parentRef === null) {
    return failedBuild(missingMeasurementInput("containment", "Containment requires childRef and parentRef."));
  }

  const tolerance = parseTolerance(request.tolerance);
  if (!tolerance.ok) {
    return failedBuild(tolerance.result);
  }

  const child = context.geometryByRef.get(childRef);
  const parent = context.geometryByRef.get(parentRef);
  if (child === undefined || parent === undefined) {
    return failedBuild(incompatibleGeometry("containment", "Containment refs must resolve to known geometry."));
  }
  const parentRect = rectForGeometry(parent);
  if (parentRect === null) {
    return failedBuild(incompatibleGeometry("containment", "Containment parent must be rectangular."));
  }

  const status = containmentStatus(child, parentRect, tolerance.value.value);
  const result: ContainmentResultV1 = {
    kind: "containment-result",
    childRef,
    parentRef,
    tolerance: tolerance.value.value,
    containmentStatus: status,
  };

  return measured(context, requestRef, "containment", [child, parent], "normalized", result, tolerance.value, []);
}

function measureOverlap(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, OVERLAP_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const sourceRef = nonEmptyString(request.sourceRef);
  const targetRef = nonEmptyString(request.targetRef);
  if (sourceRef === null || targetRef === null) {
    return failedBuild(missingMeasurementInput("overlap", "Overlap requires sourceRef and targetRef."));
  }

  const source = context.geometryByRef.get(sourceRef);
  const target = context.geometryByRef.get(targetRef);
  if (source === undefined || target === undefined) {
    return failedBuild(incompatibleGeometry("overlap", "Overlap refs must resolve to known geometry."));
  }
  const sourceRect = rectForGeometry(source);
  const targetRect = rectForGeometry(target);
  if (sourceRect === null || targetRect === null || rectArea(sourceRect) <= 0 || rectArea(targetRect) <= 0) {
    return failedBuild(incompatibleGeometry("overlap", "Overlap requires positive-area rectangles."));
  }

  const intersection = intersectRects(sourceRect, targetRect);
  const intersectionArea = intersection === null ? 0 : rectArea(intersection);
  const status = overlapStatus(sourceRect, targetRect, intersection);
  const result: OverlapResultV1 = {
    kind: "overlap-result",
    sourceRef,
    targetRef,
    overlapStatus: status,
    intersectionBounds: intersectionArea > 0 ? intersection : null,
    normalizedOverlapArea: intersectionArea,
    metricOverlapArea: intersectionArea * metricAreaScale(context.metricPolicy),
    overlapRatioA: clamp(intersectionArea / rectArea(sourceRect), 0, 1),
    overlapRatioB: clamp(intersectionArea / rectArea(targetRect), 0, 1),
    normalizationBasis: "surface",
  };

  return measured(context, requestRef, "overlap", [source, target], "mixed", result, null, []);
}

function measureCoverage(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, COVERAGE_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const targetRef = nonEmptyString(request.targetRef);
  if (targetRef === null) {
    return failedBuild(missingMeasurementInput("coverage", "Coverage requires targetRef."));
  }
  if (request.coveragePolicy !== "union-clipped") {
    return failedBuild(unsupportedMeasurementRequest("coveragePolicy", "Coverage policy must be union-clipped."));
  }
  if (!Array.isArray(request.contributorRefs) || !request.contributorRefs.every(isNonEmptyString) || request.contributorRefs.length === 0) {
    return failedBuild(missingMeasurementInput("contributorRefs", "Coverage requires at least one contributor ref."));
  }

  const target = context.geometryByRef.get(targetRef);
  const targetRect = target === undefined ? null : rectForGeometry(target);
  if (target === undefined || targetRect === null || rectArea(targetRect) <= 0) {
    return failedBuild(incompatibleGeometry("coverage", "Coverage target must be a positive-area rectangle."));
  }

  const contributorRefs = [...request.contributorRefs].sort();
  const contributors: ResolvedGeometry[] = [];
  const clippedRects: Rect[] = [];
  const warnings: string[] = [];
  for (const contributorRef of contributorRefs) {
    const contributor = context.geometryByRef.get(contributorRef);
    const contributorRect = contributor === undefined ? null : rectForGeometry(contributor);
    if (contributor === undefined || contributorRect === null || rectArea(contributorRect) <= 0) {
      return failedBuild(incompatibleGeometry("coverage", `Coverage contributor is not a positive-area rectangle: ${contributorRef}.`));
    }
    contributors.push(contributor);
    const clipped = intersectRects(targetRect, contributorRect);
    if (clipped !== null && rectArea(clipped) > 0) {
      clippedRects.push(clipped);
    }
    if (containmentStatusForRect(contributorRect, targetRect, 0) !== "inside" && containmentStatusForRect(contributorRect, targetRect, 0) !== "on_boundary") {
      warnings.push(`contributor-partially-outside:${contributorRef}`);
    }
  }

  const targetArea = rectArea(targetRect);
  const coveredArea = unionRectArea(clippedRects);
  const uncoveredArea = Math.max(0, targetArea - coveredArea);
  const result: CoverageResultV1 = {
    kind: "coverage-result",
    targetRef,
    contributorRefs,
    targetArea,
    coveredArea,
    uncoveredArea,
    coverageRatio: coveredArea / targetArea,
    metricTargetArea: targetArea * metricAreaScale(context.metricPolicy),
    metricCoveredArea: coveredArea * metricAreaScale(context.metricPolicy),
    metricUncoveredArea: uncoveredArea * metricAreaScale(context.metricPolicy),
    unit: `${context.metricPolicy.unit}^2`,
    overlapPolicy: "union-clipped",
  };

  return measured(context, requestRef, "coverage", [target, ...contributors], "mixed", result, null, uniqueStrings(warnings).sort());
}

function measureDirectionalRelation(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, DIRECTIONAL_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const sourceRef = nonEmptyString(request.sourceRef);
  const targetRef = nonEmptyString(request.targetRef);
  if (sourceRef === null || targetRef === null) {
    return failedBuild(missingMeasurementInput("directional-relation", "Directional relation requires sourceRef and targetRef."));
  }

  const tolerance = parseTolerance(request.tolerance);
  if (!tolerance.ok) {
    return failedBuild(tolerance.result);
  }

  const relationFamily = request.relationFamily;
  if (relationFamily !== "vertical" && relationFamily !== "horizontal" && relationFamily !== "orientation") {
    return failedBuild(unsupportedMeasurementRequest("relationFamily", "Directional relation family must be vertical, horizontal, or orientation."));
  }

  const source = context.geometryByRef.get(sourceRef);
  const target = context.geometryByRef.get(targetRef);
  if (source === undefined || target === undefined) {
    return failedBuild(incompatibleGeometry("directional-relation", "Directional relation refs must resolve to known geometry."));
  }

  const relation = directionalRelation(context, source, target, relationFamily, tolerance.value.value);
  if (relation === null) {
    return failedBuild(incompatibleGeometry("directional-relation", "Directional relation sources are incompatible with the requested family."));
  }

  const result: DirectionalRelationResultV1 = {
    kind: "directional-relation-result",
    sourceRef,
    targetRef,
    relationFamily,
    relation: relation.relation,
    tolerance: tolerance.value.value,
    delta: relation.delta,
  };

  return measured(context, requestRef, "directional-relation", [source, target], "normalized", result, tolerance.value, []);
}

function measureSurfaceHierarchy(context: MeasurementContext, request: Record<string, unknown>): MeasurementBuild {
  const failure = validateRequestShape(request, HIERARCHY_REQUEST_ALLOWED_KEYS);
  if (failure !== null) {
    return failedBuild(failure);
  }

  const requestRef = request.requestRef as string;
  const tolerance = parseTolerance(request.areaTolerance);
  if (!tolerance.ok) {
    return failedBuild(tolerance.result);
  }
  if (!Array.isArray(request.sourceRefs) || !request.sourceRefs.every(isNonEmptyString) || request.sourceRefs.length === 0) {
    return failedBuild(missingMeasurementInput("sourceRefs", "Surface hierarchy requires explicit sourceRefs."));
  }

  const sources: ResolvedGeometry[] = [];
  const areas: { sourceRef: string; normalizedArea: number; metricArea: number }[] = [];
  for (const sourceRef of request.sourceRefs) {
    const source = context.geometryByRef.get(sourceRef);
    if (source === undefined) {
      return failedBuild(incompatibleGeometry("surface-hierarchy", `Surface hierarchy source is unknown: ${sourceRef}.`));
    }
    const area = areaForGeometry(context, source);
    if (!area.ok) {
      return failedBuild(area.result);
    }
    sources.push(source);
    areas.push({
      sourceRef,
      normalizedArea: area.value.normalizedArea,
      metricArea: area.value.metricArea,
    });
  }

  const sortedAreas = areas.sort((first, second) => second.normalizedArea - first.normalizedArea || first.sourceRef.localeCompare(second.sourceRef));
  const tieGroups: SurfaceHierarchyTieGroupV1[] = [];
  const ranked: SurfaceHierarchyEntryV1[] = [];
  let rank = 1;
  let index = 0;
  while (index < sortedAreas.length) {
    const groupArea = sortedAreas[index];
    if (groupArea === undefined) {
      break;
    }
    const group = [groupArea];
    index += 1;
    while (index < sortedAreas.length) {
      const candidate = sortedAreas[index];
      if (candidate === undefined || Math.abs(candidate.normalizedArea - groupArea.normalizedArea) > tolerance.value.value) {
        break;
      }
      group.push(candidate);
      index += 1;
    }
    const sourceRefs = group.map((entry) => entry.sourceRef).sort();
    const tieGroupRef = `tie:${rank}`;
    tieGroups.push({
      tieGroupRef,
      rank,
      sourceRefs,
      normalizedArea: groupArea.normalizedArea,
    });
    for (const entry of group.sort((first, second) => first.sourceRef.localeCompare(second.sourceRef))) {
      ranked.push({
        sourceRef: entry.sourceRef,
        rank,
        tieGroupRef,
        normalizedArea: entry.normalizedArea,
        metricArea: entry.metricArea,
      });
    }
    rank += 1;
  }

  const result: SurfaceHierarchyResultV1 = {
    kind: "surface-hierarchy-result",
    areaTolerance: tolerance.value.value,
    ranked,
    tieGroups,
  };

  return measured(context, requestRef, "surface-hierarchy", sources, "mixed", result, tolerance.value, []);
}

function measured<TType extends MeasurementTypeV1, TResult extends MeasurementPayloadV1>(
  context: MeasurementContext,
  requestRef: string,
  measurementType: TType,
  sources: readonly ResolvedGeometry[],
  unit: MeasurementUnitV1,
  result: TResult,
  tolerance: MeasurementToleranceV1 | null,
  warnings: readonly string[],
): MeasurementBuild {
  const measurementRef = `${context.measurementResultRef}:${requestRef}`;
  const sourceRefs = uniqueSourceRefs([
    { kind: "measurement-request", ref: requestRef },
    { kind: "geometry", ref: context.surface.id },
    ...sources.flatMap((source) => source.sourceRefs),
  ]);
  const provenanceInputRefs = uniqueSourceRefs([
    { kind: "measurement", ref: measurementRef },
    { kind: "measurement-request", ref: requestRef },
    ...sources.flatMap((source) => source.provenanceInputRefs),
  ]);
  const measurement = {
    kind: "measurement",
    schemaVersion: MEASUREMENT_V1_SCHEMA_VERSION,
    measurementRef,
    requestRef,
    measurementType,
    sourceRefs,
    operationRef: `measurements.${measurementType}`,
    spaceRef: context.surface.id,
    unit,
    status: "measured",
    result,
    tolerance,
    metricPolicy: context.metricPolicy,
    warnings: [...warnings],
    provenance: createMeasurementProvenance(`core.measurements-v1.${measurementType}`, provenanceInputRefs),
    evaluationRefs: [],
    scoringRefs: [],
    artifactRefs: [],
    decisionRefs: [],
  } as MeasurementV1;

  return { ok: true, measurement };
}

function validateMeasurementValue(value: unknown): MeasurementValidation<MeasurementV1> {
  if (!isRecord(value)) {
    return failedMeasurement(invalidMeasurement("measurement", "Measurement V1 must be a structured object."));
  }

  const unsupportedField = firstUnsupportedKey(value, MEASUREMENT_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedMeasurement(invalidMeasurement(unsupportedField, `Measurement V1 field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "measurement" || value.schemaVersion !== MEASUREMENT_V1_SCHEMA_VERSION) {
    return failedMeasurement(invalidMeasurement("schemaVersion", "Measurement V1 kind and schemaVersion are required."));
  }

  if (!isNonEmptyString(value.measurementRef)
    || !isNonEmptyString(value.requestRef)
    || !isMeasurementType(value.measurementType)
    || !isNonEmptyString(value.operationRef)
    || !isNonEmptyString(value.spaceRef)
    || !isMeasurementUnit(value.unit)
    || value.status !== "measured"
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isStringArray(value.warnings)
    || !isProvenance(value.provenance)
    || !isEmptySourceReferenceArray(value.evaluationRefs)
    || !isEmptySourceReferenceArray(value.scoringRefs)
    || !isEmptySourceReferenceArray(value.artifactRefs)
    || !isEmptySourceReferenceArray(value.decisionRefs)) {
    return failedMeasurement(invalidMeasurement("measurement", "Measurement V1 envelope is invalid."));
  }

  const metricPolicyValidation = validateMetricPolicyValue(value.metricPolicy);
  if (!metricPolicyValidation.ok) {
    return metricPolicyValidation as MeasurementValidation<MeasurementV1>;
  }

  if (value.tolerance !== null && !isMeasurementTolerance(value.tolerance)) {
    return failedMeasurement(invalidMeasurement("tolerance", "Measurement tolerance is invalid."));
  }

  if (!isMeasurementPayload(value.measurementType, value.result)) {
    return failedMeasurement(invalidMeasurement("result", "Measurement V1 result payload is invalid."));
  }

  return validMeasurement(value as unknown as MeasurementV1);
}

function validateMeasurementResultValue(value: unknown): MeasurementValidation<MeasurementResultV1> {
  if (!isRecord(value)) {
    return failedMeasurement(invalidMeasurement("measurementResult", "MeasurementResult V1 must be a structured object."));
  }

  const unsupportedField = firstUnsupportedKey(value, MEASUREMENT_RESULT_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedMeasurement(invalidMeasurement(unsupportedField, `MeasurementResult V1 field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "measurement-result" || value.schemaVersion !== MEASUREMENT_RESULT_V1_SCHEMA_VERSION) {
    return failedMeasurement(invalidMeasurement("schemaVersion", "MeasurementResult V1 kind and schemaVersion are required."));
  }

  if (!isNonEmptyString(value.measurementResultRef)
    || !isNonEmptyString(value.operationRef)
    || !isNonEmptyString(value.spaceRef)
    || !isSourceReferenceArray(value.measurementRefs)
    || !Array.isArray(value.measurements)
    || !isStringArray(value.warnings)
    || !isEmptySourceReferenceArray(value.evaluationRefs)
    || !isEmptySourceReferenceArray(value.scoringRefs)
    || !isEmptySourceReferenceArray(value.artifactRefs)
    || !isEmptySourceReferenceArray(value.decisionRefs)
    || !isSourceReferenceArray(value.sourceRefs)
    || !isProvenance(value.provenance)) {
    return failedMeasurement(invalidMeasurement("measurementResult", "MeasurementResult V1 envelope is invalid."));
  }

  const metricPolicyValidation = validateMetricPolicyValue(value.metricPolicy);
  if (!metricPolicyValidation.ok) {
    return metricPolicyValidation as MeasurementValidation<MeasurementResultV1>;
  }

  const measurementRefs = new Set<string>();
  for (const measurement of value.measurements) {
    const validation = validateMeasurementValue(measurement);
    if (!validation.ok) {
      return validation as MeasurementValidation<MeasurementResultV1>;
    }
    if (measurementRefs.has(validation.value.measurementRef)) {
      return failedMeasurement(invalidMeasurement("measurementRefs", "Measurement refs must be unique."));
    }
    measurementRefs.add(validation.value.measurementRef);
  }

  if (value.measurementRefs.length !== value.measurements.length
    || !value.measurementRefs.every((ref) => ref.kind === "measurement" && measurementRefs.has(ref.ref))) {
    return failedMeasurement(invalidMeasurement("measurementRefs", "MeasurementResult refs must match nested measurements."));
  }

  return validMeasurement(value as unknown as MeasurementResultV1);
}

function isMeasurementPayload(type: MeasurementTypeV1, value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (type === "distance") {
    return firstUnsupportedKey(value, DISTANCE_RESULT_ALLOWED_KEYS) === null
      && value.kind === "distance-result"
      && isNonEmptyString(value.sourceRef)
      && isNonEmptyString(value.targetRef)
      && (value.sourceAnchor === null || isNonEmptyString(value.sourceAnchor))
      && (value.targetAnchor === null || isNonEmptyString(value.targetAnchor))
      && isDistanceAxis(value.axis)
      && isNonNegativeFiniteNumber(value.normalizedDistance)
      && isNullableNonNegativeFiniteNumber(value.metricDistance)
      && isNonEmptyString(value.unit)
      && value.signed === false;
  }

  if (type === "position") {
    return firstUnsupportedKey(value, POSITION_RESULT_ALLOWED_KEYS) === null
      && value.kind === "position-result"
      && isNonEmptyString(value.sourceRef)
      && (value.sourceAnchor === null || isNonEmptyString(value.sourceAnchor))
      && isMeasurementPoint(value.normalizedPosition)
      && (value.metricPosition === null || isMeasurementPoint(value.metricPosition))
      && isPositionContainmentStatus(value.containmentStatus)
      && isNonEmptyString(value.parentRef);
  }

  if (type === "alignment") {
    return firstUnsupportedKey(value, ALIGNMENT_RESULT_ALLOWED_KEYS) === null
      && value.kind === "alignment-result"
      && isNonEmptyString(value.sourceRef)
      && isNonEmptyString(value.targetRef)
      && isNonEmptyString(value.sourceAnchor)
      && isNonEmptyString(value.targetAnchor)
      && isAxis(value.axis)
      && isNonNegativeFiniteNumber(value.normalizedDelta)
      && isNonNegativeFiniteNumber(value.metricDelta)
      && isNonNegativeFiniteNumber(value.tolerance)
      && isAlignmentStatus(value.alignmentStatus)
      && value.boundaryPolicy === "inclusive";
  }

  if (type === "angle") {
    return firstUnsupportedKey(value, ANGLE_RESULT_ALLOWED_KEYS) === null
      && value.kind === "angle-result"
      && isNonEmptyString(value.sourceRef)
      && isNonEmptyString(value.targetRef)
      && isNonNegativeFiniteNumber(value.radians)
      && value.radians <= Math.PI
      && isNonNegativeFiniteNumber(value.normalizedUnsignedAngle)
      && value.normalizedUnsignedAngle <= 1
      && isNonNegativeFiniteNumber(value.tolerance)
      && value.metricBasis === "surface-metric-policy"
      && isAngleRelation(value.angleRelation);
  }

  if (type === "area") {
    return firstUnsupportedKey(value, AREA_RESULT_ALLOWED_KEYS) === null
      && value.kind === "area-result"
      && isNonEmptyString(value.sourceRef)
      && isNonEmptyString(value.parentRef)
      && isNonNegativeFiniteNumber(value.normalizedArea)
      && isNullableNonNegativeFiniteNumber(value.metricArea)
      && isNonEmptyString(value.unit)
      && value.normalizationBasis === "surface";
  }

  if (type === "ratio") {
    return firstUnsupportedKey(value, RATIO_RESULT_ALLOWED_KEYS) === null
      && value.kind === "ratio-result"
      && value.ratioKind === "area"
      && isNonEmptyString(value.numeratorRef)
      && isNonEmptyString(value.denominatorRef)
      && isNonNegativeFiniteNumber(value.numeratorValue)
      && isPositiveFiniteNumber(value.denominatorValue)
      && isNonNegativeFiniteNumber(value.ratio)
      && value.unit === "dimensionless"
      && (value.targetRef === null || isNonEmptyString(value.targetRef))
      && (value.targetRatio === null || isFiniteNumber(value.targetRatio))
      && isNullableNonNegativeFiniteNumber(value.absoluteDelta)
      && isNullableNonNegativeFiniteNumber(value.relativeDelta);
  }

  if (type === "containment") {
    return firstUnsupportedKey(value, CONTAINMENT_RESULT_ALLOWED_KEYS) === null
      && value.kind === "containment-result"
      && isNonEmptyString(value.childRef)
      && isNonEmptyString(value.parentRef)
      && isNonNegativeFiniteNumber(value.tolerance)
      && isContainmentStatus(value.containmentStatus);
  }

  if (type === "overlap") {
    return firstUnsupportedKey(value, OVERLAP_RESULT_ALLOWED_KEYS) === null
      && value.kind === "overlap-result"
      && isNonEmptyString(value.sourceRef)
      && isNonEmptyString(value.targetRef)
      && isOverlapStatus(value.overlapStatus)
      && (value.intersectionBounds === null || isRect(value.intersectionBounds))
      && isNonNegativeFiniteNumber(value.normalizedOverlapArea)
      && isNullableNonNegativeFiniteNumber(value.metricOverlapArea)
      && isNonNegativeFiniteNumber(value.overlapRatioA)
      && isNonNegativeFiniteNumber(value.overlapRatioB)
      && value.overlapRatioA <= 1
      && value.overlapRatioB <= 1
      && value.normalizationBasis === "surface";
  }

  if (type === "coverage") {
    return firstUnsupportedKey(value, COVERAGE_RESULT_ALLOWED_KEYS) === null
      && value.kind === "coverage-result"
      && isNonEmptyString(value.targetRef)
      && isStringArray(value.contributorRefs)
      && isPositiveFiniteNumber(value.targetArea)
      && isNonNegativeFiniteNumber(value.coveredArea)
      && isNonNegativeFiniteNumber(value.uncoveredArea)
      && isNonNegativeFiniteNumber(value.coverageRatio)
      && value.coverageRatio <= 1
      && isNullableNonNegativeFiniteNumber(value.metricTargetArea)
      && isNullableNonNegativeFiniteNumber(value.metricCoveredArea)
      && isNullableNonNegativeFiniteNumber(value.metricUncoveredArea)
      && isNonEmptyString(value.unit)
      && value.overlapPolicy === "union-clipped";
  }

  if (type === "directional-relation") {
    return firstUnsupportedKey(value, DIRECTIONAL_RESULT_ALLOWED_KEYS) === null
      && value.kind === "directional-relation-result"
      && isNonEmptyString(value.sourceRef)
      && isNonEmptyString(value.targetRef)
      && (value.relationFamily === "vertical" || value.relationFamily === "horizontal" || value.relationFamily === "orientation")
      && isDirectionalRelation(value.relation)
      && isNonNegativeFiniteNumber(value.tolerance)
      && isFiniteNumber(value.delta);
  }

  return firstUnsupportedKey(value, HIERARCHY_RESULT_ALLOWED_KEYS) === null
    && value.kind === "surface-hierarchy-result"
    && isNonNegativeFiniteNumber(value.areaTolerance)
    && Array.isArray(value.ranked)
    && value.ranked.every(isHierarchyEntry)
    && Array.isArray(value.tieGroups)
    && value.tieGroups.every(isHierarchyTieGroup);
}

function validateRequestShape(request: Record<string, unknown>, allowedKeys: readonly string[]): CoreResult | null {
  const unsupportedField = firstUnsupportedKey(request, allowedKeys);
  if (unsupportedField !== null) {
    return unsupportedMeasurementRequest(unsupportedField, `Measurement request field is outside scope: ${unsupportedField}.`);
  }

  if (request.kind !== "measurement-request" || !isNonEmptyString(request.requestRef)) {
    return missingMeasurementInput("requestRef", "Measurement request requires kind measurement-request and non-empty requestRef.");
  }

  return null;
}

function validateMetricPolicyValue(value: unknown): MeasurementValidation<MeasurementMetricPolicyV1> {
  if (!isRecord(value)) {
    return failedMeasurement(invalidMetricPolicy("metricPolicy", "Measurement requires an explicit metric policy."));
  }

  const unsupportedField = firstUnsupportedKey(value, METRIC_POLICY_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedMeasurement(invalidMetricPolicy(unsupportedField, `Metric policy field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "measurement-metric-policy"
    || !isNonEmptyString(value.id)
    || !isNonEmptyString(value.surfaceRef)
    || !isPositiveFiniteNumber(value.width)
    || !isPositiveFiniteNumber(value.height)
    || !isSupportedMeasurementUnitRef(value.unit)) {
    return failedMeasurement(invalidMetricPolicy("metricPolicy", "Metric policy requires finite width, height, unit, and refs."));
  }

  return validMeasurement(value as unknown as MeasurementMetricPolicyV1);
}

function parseTolerance(value: unknown): MeasurementValidation<MeasurementToleranceV1> {
  if (!isMeasurementTolerance(value)) {
    return failedMeasurement(invalidTolerancePolicy("tolerance", "Measurement classification requires an explicit non-negative tolerance."));
  }

  return validMeasurement(value);
}

function isMeasurementTolerance(value: unknown): value is MeasurementToleranceV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, TOLERANCE_ALLOWED_KEYS) === null
    && value.kind === "measurement-tolerance"
    && isNonEmptyString(value.id)
    && isNonNegativeFiniteNumber(value.value);
}

function validateRatioTarget(value: unknown): RatioTargetV1 | false {
  if (!isRecord(value)
    || firstUnsupportedKey(value, RATIO_TARGET_ALLOWED_KEYS) !== null
    || value.kind !== "ratio-target"
    || !isNonEmptyString(value.targetRef)
    || !isFiniteNumber(value.value)) {
    return false;
  }

  return value as unknown as RatioTargetV1;
}

function coordinateForAxis(geometry: ResolvedGeometry, axis: AxisV1, anchor: string | null): number | null {
  if (geometry.shape.shape === "guide") {
    if (anchor !== null && anchor !== "guide") {
      return null;
    }
    if ((axis === "x" && geometry.shape.orientation === "vertical") || (axis === "y" && geometry.shape.orientation === "horizontal")) {
      return geometry.shape.position;
    }
    return null;
  }

  if (geometry.shape.shape === "point") {
    if (axis === "x") {
      return geometry.shape.point.x;
    }
    return geometry.shape.point.y ?? null;
  }

  if (geometry.shape.shape === "rect") {
    return rectCoordinate(geometry.shape.rect, axis, anchor);
  }

  return null;
}

function rectCoordinate(rect: Rect, axis: AxisV1, anchor: string | null): number | null {
  const resolvedAnchor = anchor ?? (axis === "x" ? "centerX" : "centerY");
  if (axis === "x") {
    if (resolvedAnchor === "left" || resolvedAnchor === "bottomLeft" || resolvedAnchor === "topLeft") {
      return rect.x;
    }
    if (resolvedAnchor === "right" || resolvedAnchor === "bottomRight" || resolvedAnchor === "topRight") {
      return rect.x + rect.width;
    }
    if (resolvedAnchor === "centerX" || resolvedAnchor === "center") {
      return rect.x + rect.width / 2;
    }
  }

  if (resolvedAnchor === "bottom" || resolvedAnchor === "bottomLeft" || resolvedAnchor === "bottomRight") {
    return rect.y;
  }
  if (resolvedAnchor === "top" || resolvedAnchor === "topLeft" || resolvedAnchor === "topRight") {
    return rect.y + rect.height;
  }
  if (resolvedAnchor === "centerY" || resolvedAnchor === "center") {
    return rect.y + rect.height / 2;
  }
  return null;
}

function positionForGeometry(geometry: ResolvedGeometry, anchor: string | null): MeasurementPointV1 | null {
  if (geometry.shape.shape === "guide") {
    return geometry.shape.orientation === "vertical"
      ? { kind: "point", x: geometry.shape.position, y: null }
      : { kind: "point", x: null, y: geometry.shape.position };
  }

  if (geometry.shape.shape === "point") {
    return {
      kind: "point",
      x: geometry.shape.point.x,
      y: geometry.shape.point.y ?? null,
    };
  }

  if (geometry.shape.shape === "rect") {
    const point = rectAnchorPoint(geometry.shape.rect, anchor ?? "center");
    return point === null ? null : { kind: "point", x: point.x, y: point.y };
  }

  return null;
}

function pointForGeometry(geometry: ResolvedGeometry, anchor: string | null): AnchorPoint | null {
  if (geometry.shape.shape === "point" && geometry.shape.point.y !== undefined) {
    return { x: geometry.shape.point.x, y: geometry.shape.point.y };
  }
  if (geometry.shape.shape === "rect") {
    return rectAnchorPoint(geometry.shape.rect, anchor ?? "center");
  }
  if (geometry.shape.shape === "guide") {
    return geometry.shape.orientation === "vertical"
      ? { x: geometry.shape.position, y: 0 }
      : { x: 0, y: geometry.shape.position };
  }
  return null;
}

function rectAnchorPoint(rect: Rect, anchor: string): AnchorPoint | null {
  if (anchor === "center") {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  if (anchor === "bottomLeft") {
    return { x: rect.x, y: rect.y };
  }
  if (anchor === "bottomRight") {
    return { x: rect.x + rect.width, y: rect.y };
  }
  if (anchor === "topLeft") {
    return { x: rect.x, y: rect.y + rect.height };
  }
  if (anchor === "topRight") {
    return { x: rect.x + rect.width, y: rect.y + rect.height };
  }
  return null;
}

function metricPoint(point: MeasurementPointV1, metricPolicy: MeasurementMetricPolicyV1): MeasurementPointV1 {
  return {
    kind: "point",
    x: point.x === null ? null : point.x * metricPolicy.width,
    y: point.y === null ? null : point.y * metricPolicy.height,
  };
}

function positionContainmentStatus(point: MeasurementPointV1, parent: Rect): PositionContainmentStatusV1 {
  if (point.x === null || point.y === null) {
    return "inside";
  }

  const left = parent.x;
  const right = parent.x + parent.width;
  const bottom = parent.y;
  const top = parent.y + parent.height;
  if (point.x < left || point.x > right || point.y < bottom || point.y > top) {
    return "outside";
  }
  if (point.x === left || point.x === right || point.y === bottom || point.y === top) {
    return "on_boundary";
  }
  return "inside";
}

function metricVector(context: MeasurementContext, geometry: ResolvedGeometry): AnchorPoint | null {
  if (geometry.shape.shape === "guide") {
    return geometry.shape.orientation === "vertical"
      ? { x: 0, y: context.metricPolicy.height }
      : { x: context.metricPolicy.width, y: 0 };
  }

  if (geometry.shape.shape === "segment") {
    const startY = geometry.shape.segment.start.y;
    const endY = geometry.shape.segment.end.y;
    if (startY === undefined || endY === undefined) {
      return null;
    }
    return {
      x: (geometry.shape.segment.end.x - geometry.shape.segment.start.x) * context.metricPolicy.width,
      y: (endY - startY) * context.metricPolicy.height,
    };
  }

  return null;
}

function areaForGeometry(context: MeasurementContext, geometry: ResolvedGeometry): MeasurementValidation<{ normalizedArea: number; metricArea: number }> {
  const rect = rectForGeometry(geometry);
  if (rect === null || rect.width < 0 || rect.height < 0) {
    return failedMeasurement(incompatibleGeometry("area", "Area measurement requires rectangular geometry."));
  }

  const normalizedArea = rectArea(rect);
  if (!Number.isFinite(normalizedArea) || normalizedArea <= 0) {
    return failedMeasurement(incompatibleGeometry("area", "Area measurement requires finite positive area."));
  }

  return validMeasurement({
    normalizedArea,
    metricArea: normalizedArea * metricAreaScale(context.metricPolicy),
  });
}

function rectForGeometry(geometry: ResolvedGeometry): Rect | null {
  if (geometry.shape.shape === "rect") {
    return geometry.shape.rect;
  }
  return null;
}

function containmentStatus(child: ResolvedGeometry, parent: Rect, tolerance: number): ContainmentStatusV1 {
  if (child.shape.shape === "point") {
    const point = child.shape.point;
    if (point.y === undefined) {
      return "outside";
    }
    const position = positionContainmentStatus({ kind: "point", x: point.x, y: point.y }, parent);
    return position === "outside" ? "outside" : position;
  }

  const childRect = rectForGeometry(child);
  if (childRect === null) {
    return "outside";
  }
  return containmentStatusForRect(childRect, parent, tolerance);
}

function containmentStatusForRect(child: Rect, parent: Rect, tolerance: number): ContainmentStatusV1 {
  const deltas = [
    child.x - parent.x,
    child.y - parent.y,
    parent.x + parent.width - (child.x + child.width),
    parent.y + parent.height - (child.y + child.height),
  ];

  const insideOrBoundary = deltas.every((delta) => delta >= -tolerance);
  if (insideOrBoundary) {
    return deltas.some((delta) => Math.abs(delta) <= tolerance) ? "on_boundary" : "inside";
  }

  const intersection = intersectRects(child, parent);
  return intersection !== null && rectArea(intersection) > 0 ? "partially_outside" : "outside";
}

function overlapStatus(source: Rect, target: Rect, intersection: Rect | null): OverlapStatusV1 {
  if (intersection === null) {
    return rectsTouchBoundary(source, target) ? "boundary_touch" : "no_overlap";
  }

  const intersectionArea = rectArea(intersection);
  if (intersectionArea === 0) {
    return "boundary_touch";
  }
  if (sameRect(source, target)) {
    return "identical";
  }
  if (intersectionArea === rectArea(source) || intersectionArea === rectArea(target)) {
    return "contains";
  }
  return "overlap";
}

function intersectRects(first: Rect, second: Rect): Rect | null {
  const x = Math.max(first.x, second.x);
  const y = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const top = Math.min(first.y + first.height, second.y + second.height);
  const width = right - x;
  const height = top - y;
  if (width < 0 || height < 0) {
    return null;
  }

  return { kind: "rect", x, y, width, height };
}

function rectsTouchBoundary(first: Rect, second: Rect): boolean {
  const horizontalTouch = first.x + first.width === second.x || second.x + second.width === first.x;
  const verticalOverlap = first.y <= second.y + second.height && second.y <= first.y + first.height;
  const verticalTouch = first.y + first.height === second.y || second.y + second.height === first.y;
  const horizontalOverlap = first.x <= second.x + second.width && second.x <= first.x + first.width;
  return (horizontalTouch && verticalOverlap) || (verticalTouch && horizontalOverlap);
}

function sameRect(first: Rect, second: Rect): boolean {
  return first.x === second.x && first.y === second.y && first.width === second.width && first.height === second.height;
}

function unionRectArea(rects: readonly Rect[]): number {
  if (rects.length === 0) {
    return 0;
  }

  const xs = uniqueNumbers(rects.flatMap((rect) => [rect.x, rect.x + rect.width])).sort((first, second) => first - second);
  let area = 0;
  for (let index = 0; index < xs.length - 1; index += 1) {
    const left = xs[index];
    const right = xs[index + 1];
    if (left === undefined || right === undefined || right <= left) {
      continue;
    }
    const intervals = rects
      .filter((rect) => rect.x <= left && rect.x + rect.width >= right)
      .map((rect) => [rect.y, rect.y + rect.height] as const)
      .sort((first, second) => first[0] - second[0] || first[1] - second[1]);
    area += (right - left) * unionIntervalLength(intervals);
  }
  return area;
}

function unionIntervalLength(intervals: readonly (readonly [number, number])[]): number {
  let total = 0;
  let currentStart: number | null = null;
  let currentEnd: number | null = null;
  for (const [start, end] of intervals) {
    if (currentStart === null || currentEnd === null) {
      currentStart = start;
      currentEnd = end;
      continue;
    }
    if (start > currentEnd) {
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    } else {
      currentEnd = Math.max(currentEnd, end);
    }
  }
  if (currentStart !== null && currentEnd !== null) {
    total += currentEnd - currentStart;
  }
  return total;
}

function directionalRelation(
  context: MeasurementContext,
  source: ResolvedGeometry,
  target: ResolvedGeometry,
  family: "vertical" | "horizontal" | "orientation",
  tolerance: number,
): { relation: DirectionalRelationV1; delta: number } | null {
  if (family === "orientation") {
    const sourceVector = metricVector(context, source);
    const targetVector = metricVector(context, target);
    if (sourceVector === null || targetVector === null) {
      return null;
    }
    const sourceLength = Math.hypot(sourceVector.x, sourceVector.y);
    const targetLength = Math.hypot(targetVector.x, targetVector.y);
    if (sourceLength === 0 || targetLength === 0) {
      return null;
    }
    const angle = Math.acos(clamp(Math.abs((sourceVector.x * targetVector.x + sourceVector.y * targetVector.y) / (sourceLength * targetLength)), 0, 1));
    if (angle <= tolerance) {
      return { relation: "parallel", delta: angle };
    }
    if (Math.abs(angle - Math.PI / 2) <= tolerance) {
      return { relation: "perpendicular", delta: angle };
    }
    return { relation: "ambiguous", delta: angle };
  }

  const sourceCenter = centerForGeometry(source);
  const targetCenter = centerForGeometry(target);
  if (sourceCenter === null || targetCenter === null) {
    return null;
  }

  const delta = family === "vertical" ? sourceCenter.y - targetCenter.y : sourceCenter.x - targetCenter.x;
  if (Math.abs(delta) <= tolerance) {
    return { relation: "centered", delta };
  }
  if (family === "vertical") {
    return { relation: delta > 0 ? "above" : "below", delta };
  }
  return { relation: delta < 0 ? "left" : "right", delta };
}

function centerForGeometry(geometry: ResolvedGeometry): AnchorPoint | null {
  if (geometry.shape.shape === "point" && geometry.shape.point.y !== undefined) {
    return { x: geometry.shape.point.x, y: geometry.shape.point.y };
  }
  if (geometry.shape.shape === "rect") {
    return { x: geometry.shape.rect.x + geometry.shape.rect.width / 2, y: geometry.shape.rect.y + geometry.shape.rect.height / 2 };
  }
  return null;
}

function isHierarchyEntry(value: unknown): value is SurfaceHierarchyEntryV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, HIERARCHY_ENTRY_ALLOWED_KEYS) === null
    && isNonEmptyString(value.sourceRef)
    && isPositiveInteger(value.rank)
    && isNonEmptyString(value.tieGroupRef)
    && isNonNegativeFiniteNumber(value.normalizedArea)
    && isNullableNonNegativeFiniteNumber(value.metricArea);
}

function isHierarchyTieGroup(value: unknown): value is SurfaceHierarchyTieGroupV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, HIERARCHY_TIE_GROUP_ALLOWED_KEYS) === null
    && isNonEmptyString(value.tieGroupRef)
    && isPositiveInteger(value.rank)
    && isStringArray(value.sourceRefs)
    && value.sourceRefs.length > 0
    && isNonNegativeFiniteNumber(value.normalizedArea);
}

function createMeasurementResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function createMeasurementError(input: DiagnosticInput): CoreError {
  const diagnostic = { sourceRef: MEASUREMENT_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };

  return {
    code: diagnostic.code,
    severity: errorSeverity(diagnostic.severity),
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: true,
    provenance: diagnostic.provenance,
  };
}

function createMeasurementProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: MEASUREMENT_OPERATION_VERSION,
    inputRefs: uniqueSourceRefs(inputRefs),
    source: MEASUREMENT_SOURCE_REFERENCE,
  };
}

function invalidMeasurement(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      createMeasurementError({
        code: "InvalidMeasurementV1",
        message,
        targetRef,
      }),
    ],
  });
}

function missingMeasurementInput(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      createMeasurementError({
        code: "MissingMeasurementInput",
        message,
        targetRef,
      }),
    ],
  });
}

function unsupportedMeasurementRequest(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      createMeasurementError({
        code: "UnsupportedMeasurementRequest",
        message,
        targetRef,
      }),
    ],
  });
}

function incompatibleGeometry(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      createMeasurementError({
        code: "IncompatibleMeasurementGeometry",
        message,
        targetRef,
      }),
    ],
  });
}

function invalidMetricPolicy(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      createMeasurementError({
        code: "InvalidMetricPolicy",
        message,
        targetRef,
      }),
    ],
  });
}

function invalidTolerancePolicy(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      createMeasurementError({
        code: "InvalidTolerancePolicy",
        message,
        targetRef,
      }),
    ],
  });
}

function validMeasurement<TValue>(value: TValue): MeasurementValidation<TValue> {
  return { ok: true, value };
}

function failedMeasurement(result: CoreResult): MeasurementValidation<never> {
  return { ok: false, result };
}

function failedBuild(result: CoreResult): MeasurementBuild {
  return { ok: false, result };
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function firstUnsupportedKey(value: Record<string, unknown>, allowedKeys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowedKeys.includes(key)) ?? null;
}

function axisScale(metricPolicy: MeasurementMetricPolicyV1, axis: AxisV1): number {
  return axis === "x" ? metricPolicy.width : metricPolicy.height;
}

function metricAreaScale(metricPolicy: MeasurementMetricPolicyV1): number {
  return metricPolicy.width * metricPolicy.height;
}

function rectArea(rect: Rect): number {
  return rect.width * rect.height;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stringOrNull(value: unknown): string | null {
  return isNonEmptyString(value) ? value : null;
}

function isMeasurementType(value: unknown): value is MeasurementTypeV1 {
  return typeof value === "string" && (MEASUREMENT_V1_TYPES as readonly string[]).includes(value);
}

function isMeasurementUnit(value: unknown): value is MeasurementUnitV1 {
  return value === "normalized" || value === "metric" || value === "dimensionless" || value === "radians" || value === "mixed";
}

function isSupportedMeasurementUnitRef(value: unknown): value is string {
  return value === "unit" || value === "px" || value === "mm" || value === "cm" || value === "m" || value === "in";
}

function isDistanceAxis(value: unknown): value is DistanceAxisV1 {
  return value === "horizontal" || value === "vertical" || value === "euclidean";
}

function isAxis(value: unknown): value is AxisV1 {
  return value === "x" || value === "y";
}

function isAlignmentStatus(value: unknown): value is AlignmentStatusV1 {
  return value === "aligned" || value === "not_aligned" || value === "ambiguous";
}

function isAngleRelation(value: unknown): value is AngleRelationV1 {
  return value === "parallel" || value === "perpendicular" || value === "neither" || value === "ambiguous";
}

function isPositionContainmentStatus(value: unknown): value is PositionContainmentStatusV1 {
  return value === "inside" || value === "on_boundary" || value === "outside";
}

function isContainmentStatus(value: unknown): value is ContainmentStatusV1 {
  return value === "inside" || value === "on_boundary" || value === "partially_outside" || value === "outside";
}

function isOverlapStatus(value: unknown): value is OverlapStatusV1 {
  return value === "no_overlap" || value === "boundary_touch" || value === "overlap" || value === "contains" || value === "identical";
}

function isDirectionalRelation(value: unknown): value is DirectionalRelationV1 {
  return value === "above"
    || value === "below"
    || value === "left"
    || value === "right"
    || value === "centered"
    || value === "parallel"
    || value === "perpendicular"
    || value === "ambiguous";
}

function isMeasurementPoint(value: unknown): value is MeasurementPointV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, POINT_ALLOWED_KEYS) === null
    && value.kind === "point"
    && (value.x === null || isFiniteNumber(value.x))
    && (value.y === null || isFiniteNumber(value.y));
}

function isCoordinateSystem2D(value: unknown): value is SurfaceSpace["coordinateSystem"] {
  return isRecord(value)
    && firstUnsupportedKey(value, COORDINATE_SYSTEM_ALLOWED_KEYS) === null
    && value.kind === "coordinate-system"
    && isNonEmptyString(value.id)
    && value.origin === "bottom-left"
    && value.xAxis === "right"
    && value.yAxis === "up"
    && value.dimensions === 2
    && (value.coordinateScale === "normalized" || value.coordinateScale === "metric");
}

function sameCoordinateSystem(first: SurfaceSpace["coordinateSystem"], second: SurfaceSpace["coordinateSystem"]): boolean {
  return first.id === second.id
    && first.origin === second.origin
    && first.xAxis === second.xAxis
    && first.yAxis === second.yAxis
    && first.dimensions === second.dimensions
    && first.coordinateScale === second.coordinateScale;
}

function isGeometryMetricPolicy(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, GEOMETRY_METRIC_POLICY_ALLOWED_KEYS) === null
    && value.kind === "metric-policy"
    && isNonEmptyString(value.id)
    && value.quantity === "length"
    && isNonEmptyString(value.unit);
}

function isGeometryTolerancePolicy(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, GEOMETRY_TOLERANCE_POLICY_ALLOWED_KEYS) === null
    && value.kind === "tolerance-policy"
    && isNonEmptyString(value.id)
    && isNonNegativeFiniteNumber(value.coordinateTolerance)
    && (value.metricTolerance === undefined || isNonNegativeFiniteNumber(value.metricTolerance));
}

function isMeasurementElement(value: unknown): value is Element {
  return isRecord(value)
    && firstUnsupportedKey(value, ELEMENT_ALLOWED_KEYS) === null
    && value.kind === "element"
    && isNonEmptyString(value.id)
    && isPositiveRect(value.geometry)
    && isNormalizedRect(value.geometry)
    && (value.anchors === undefined || (Array.isArray(value.anchors) && value.anchors.every(isMeasurementAnchor)));
}

function isMeasurementAnchor(value: unknown): boolean {
  return isRecord(value)
    && firstUnsupportedKey(value, ANCHOR_ALLOWED_KEYS) === null
    && value.kind === "anchor"
    && isNonEmptyString(value.id)
    && isPoint2D(value.point)
    && (value.targetElementId === undefined || isNonEmptyString(value.targetElementId));
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && firstUnsupportedKey(value, SOURCE_REFERENCE_ALLOWED_KEYS) === null
    && isNonEmptyString(value.kind)
    && isNonEmptyString(value.ref);
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isEmptySourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return isSourceReferenceArray(value) && value.length === 0;
}

function isProvenance(value: unknown): value is Provenance {
  return isRecord(value)
    && firstUnsupportedKey(value, PROVENANCE_ALLOWED_KEYS) === null
    && isNonEmptyString(value.operationName)
    && isNonEmptyString(value.operationVersion)
    && isSourceReferenceArray(value.inputRefs)
    && isSourceReference(value.source);
}

function isPoint(value: unknown): value is Point {
  return isRecord(value)
    && firstUnsupportedKey(value, POINT_ALLOWED_KEYS) === null
    && value.kind === "point"
    && isFiniteNumber(value.x)
    && (value.y === undefined || isFiniteNumber(value.y));
}

function isPoint2D(value: unknown): value is Point {
  return isPoint(value) && value.y !== undefined;
}

function isPositiveRect(value: unknown): value is Rect {
  return isRecord(value)
    && firstUnsupportedKey(value, RECT_ALLOWED_KEYS) === null
    && value.kind === "rect"
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isPositiveFiniteNumber(value.width)
    && isPositiveFiniteNumber(value.height);
}

function isRect(value: unknown): value is Rect {
  return isRecord(value)
    && firstUnsupportedKey(value, RECT_ALLOWED_KEYS) === null
    && value.kind === "rect"
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isNonNegativeFiniteNumber(value.width)
    && isNonNegativeFiniteNumber(value.height);
}

function isNormalizedRect(value: unknown): value is Rect {
  return isRect(value)
    && [value.x, value.y, value.width, value.height, value.x + value.width, value.y + value.height].every(isNormalizedValue);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function nonEmptyString(value: unknown): string | null {
  return isNonEmptyString(value) ? value : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNormalizedValue(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isNullableNonNegativeFiniteNumber(value: unknown): boolean {
  return value === null || isNonNegativeFiniteNumber(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function uniqueSourceRefs(values: readonly SourceReference[]): SourceReference[] {
  const seenRefs = new Set<string>();
  const uniqueRefs: SourceReference[] = [];

  for (const value of values) {
    const key = `${value.kind}:${value.ref}`;
    if (!seenRefs.has(key)) {
      seenRefs.add(key);
      uniqueRefs.push(value);
    }
  }

  return uniqueRefs;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
