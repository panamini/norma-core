import type {
  Composition2D,
  CoordinateScale,
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  Element,
  MetricPolicy,
  OperationContextRef,
  OperationStatus,
  Point,
  Provenance,
  Rect,
  SourceReference,
  TolerancePolicy,
} from "./index.js";
import type {
  Construction,
  Diagonal,
  GridCell,
  Guide,
  Zone,
} from "./construction.js";

export const MEASUREMENT_TYPES_V1 = [
  "distance",
  "position",
  "alignment",
  "area",
  "ratio",
  "angle",
  "containment",
  "overlap",
  "coverage",
] as const;

export type MeasurementType = (typeof MEASUREMENT_TYPES_V1)[number];
export type MeasurementToleranceStatus = "within-tolerance" | "outside-tolerance" | "not-applicable";
export type DirectionalRelationType =
  | "left-of"
  | "right-of"
  | "above"
  | "below"
  | "same-center-x"
  | "same-center-y"
  | "overlaps";

export interface MeasurementMetricPolicy {
  kind: "measurement-metric-policy";
  coordinateSystemRef: string;
  coordinateScale: CoordinateScale;
  sourceMetricPolicyRef: string | null;
  unit: string;
  normalized: boolean;
}

export interface MeasurementTolerancePolicy {
  kind: "measurement-tolerance-policy";
  sourceTolerancePolicyRef: string;
  coordinateTolerance: number;
  metricTolerance: number | null;
}

export interface MeasurementProvenance {
  kind: "measurement-provenance";
  measurementRef: string;
  operationRef: string;
  inputRefs: readonly SourceReference[];
  sourceRefs: readonly SourceReference[];
}

export interface MeasurementBase {
  kind: "measurement";
  id: string;
  measurementType: MeasurementType;
  metric: string;
  value: number | boolean | string;
  unit: string;
  normalized: boolean;
  sourceGeometryRef: SourceReference;
  inputRefs: readonly SourceReference[];
  metricPolicy: MeasurementMetricPolicy;
  tolerancePolicy: MeasurementTolerancePolicy;
  toleranceStatus: MeasurementToleranceStatus;
  provenance: MeasurementProvenance;
}

export interface DistanceMeasurement extends MeasurementBase {
  measurementType: "distance";
  axis: "x" | "y";
  signedValue: number;
  absoluteValue: number;
  normalizedValue: number;
}

export interface PositionMeasurement extends MeasurementBase {
  measurementType: "position";
  axis: "x" | "y";
  position: number;
  normalizedPosition: number;
}

export interface AlignmentMeasurement extends MeasurementBase {
  measurementType: "alignment";
  axis: "x" | "y";
  aligned: boolean;
  distance: number;
  normalizedDistance: number;
}

export interface AreaMeasurement extends MeasurementBase {
  measurementType: "area";
  area: number;
  relativeArea: number;
}

export interface RatioMeasurement extends MeasurementBase {
  measurementType: "ratio";
  ratioKind: "aspect";
  numerator: number;
  denominator: number;
  ratio: number;
}

export interface AngleMeasurement extends MeasurementBase {
  measurementType: "angle";
  angleDegrees: number;
}

export interface ContainmentMeasurement extends MeasurementBase {
  measurementType: "containment";
  contains: boolean;
}

export interface OverlapMeasurement extends MeasurementBase {
  measurementType: "overlap";
  overlaps: boolean;
  overlapArea: number;
  overlapRatio: number;
}

export interface CoverageMeasurement extends MeasurementBase {
  measurementType: "coverage";
  targetArea: number;
  coveredArea: number;
  gapArea: number;
  coverageRatio: number;
}

export type Measurement =
  | DistanceMeasurement
  | PositionMeasurement
  | AlignmentMeasurement
  | AreaMeasurement
  | RatioMeasurement
  | AngleMeasurement
  | ContainmentMeasurement
  | OverlapMeasurement
  | CoverageMeasurement;

export interface DirectionalRelation {
  kind: "directional-relation";
  id: string;
  relation: DirectionalRelationType;
  sourceRef: SourceReference;
  targetRef: SourceReference;
  inputRefs: readonly SourceReference[];
  provenance: MeasurementProvenance;
}

export interface SurfaceHierarchyComposition {
  label: string;
  compositionRef: SourceReference;
  elementRefs: readonly SourceReference[];
}

export interface SurfaceHierarchy {
  kind: "surface-hierarchy";
  id: string;
  surfaceRef: SourceReference;
  constructionRef: SourceReference;
  compositionRefs: readonly SourceReference[];
  zoneRefs: readonly SourceReference[];
  gridCellRefs: readonly SourceReference[];
  elementRefsByComposition: readonly SurfaceHierarchyComposition[];
  provenance: MeasurementProvenance;
}

export interface CompositionMeasurements {
  kind: "composition-measurements";
  label: string;
  sourceGeometryRef: SourceReference;
  measurements: readonly Measurement[];
  directionalRelations: readonly DirectionalRelation[];
  warnings: readonly CoreWarning[];
  provenance: MeasurementProvenance;
}

export interface MeasurementSet {
  kind: "measurement-set";
  id: string;
  constructionRef: SourceReference;
  sourceGeometryRefs: readonly SourceReference[];
  constructionMeasurements: readonly Measurement[];
  compositions: readonly CompositionMeasurements[];
  directionalRelations: readonly DirectionalRelation[];
  surfaceHierarchy: SurfaceHierarchy;
  warnings: readonly CoreWarning[];
  provenance: MeasurementProvenance;
}

export interface AreaMeasurementSet {
  kind: "area-measurement-set";
  id: string;
  constructionRef: SourceReference;
  sourceGeometryRef: SourceReference;
  areaMeasurements: readonly AreaMeasurement[];
  containmentMeasurements: readonly ContainmentMeasurement[];
  overlapMeasurements: readonly OverlapMeasurement[];
  coverageMeasurements: readonly CoverageMeasurement[];
  warnings: readonly CoreWarning[];
  provenance: MeasurementProvenance;
}

export interface MeasureGeometryInput {
  construction?: unknown;
  compositionA?: unknown;
  compositionB?: unknown;
  compositions?: readonly MeasureGeometryCompositionInput[];
  operationContextRef?: OperationContextRef | null;
  requestedOutputs?: readonly string[];
}

export interface MeasureGeometryCompositionInput {
  label: string;
  geometry: unknown;
}

export interface MeasureAreasInput {
  construction?: unknown;
  composition?: unknown;
  compositionLabel?: string;
  operationContextRef?: OperationContextRef | null;
  requestedOutputs?: readonly string[];
}

interface DiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
  blocking?: boolean;
}

interface CoreResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: null;
  operationContextRef?: OperationContextRef | null;
  output?: TOutput | null;
}

type MeasurementValidation<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult<TValue>;
    };

interface MeasurementContext {
  construction: Construction;
  metricPolicy: MetricPolicy | null;
  tolerancePolicy: TolerancePolicy;
  operationContextRef: OperationContextRef | null;
}

interface LabeledComposition {
  label: string;
  geometry: Composition2D;
}

interface CompositionMeasurementParts {
  measurements: readonly Measurement[];
  areaMeasurements: readonly AreaMeasurement[];
  containmentMeasurements: readonly ContainmentMeasurement[];
  overlapMeasurements: readonly OverlapMeasurement[];
  coverageMeasurements: readonly CoverageMeasurement[];
  directionalRelations: readonly DirectionalRelation[];
  warnings: readonly CoreWarning[];
}

interface EdgePosition {
  axis: "x" | "y";
  name: string;
  position: number;
  normalizedPosition: number;
  sourceRef: SourceReference;
}

const MEASUREMENT_OPERATION_VERSION = "0.1.0";
const MEASUREMENT_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/measurements-v1",
});

const MEASURE_GEOMETRY_OPERATION = "core.measurements-v1.geometry.measure";
const MEASURE_AREAS_OPERATION = "core.measurements-v1.areas.measure";

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

const REJECTED_OUTPUT_TERMS = [
  "artifact",
  "beauty",
  "comparison",
  "decision",
  "evaluation",
  "intent",
  "recommendation",
  "score",
] as const;

export function measureGeometry(input: MeasureGeometryInput | null | undefined): CoreResult<MeasurementSet> {
  const inputValidation = validateMeasureGeometryInput(input);
  if (!inputValidation.ok) {
    return resultAs<MeasurementSet>(inputValidation.result);
  }

  const { context, compositions } = inputValidation.value;
  const constructionMeasurements = measureConstruction(context);
  const compositionMeasurements = compositions.map((composition) => (
    measureComposition(context, composition, MEASURE_GEOMETRY_OPERATION)
  ));
  const warnings = [
    ...constructionMeasurements.warnings,
    ...compositionMeasurements.flatMap((composition) => composition.warnings),
  ];
  const directionalRelations = compositionMeasurements.flatMap((composition) => composition.directionalRelations);
  const hierarchy = createSurfaceHierarchy(context, compositions);
  const measurementSetId = `measurement-set:${context.construction.id}`;
  const provenance = createMeasurementObjectProvenance(measurementSetId, MEASURE_GEOMETRY_OPERATION, [
    constructionRef(context.construction),
    ...compositions.map((composition) => compositionRef(composition.geometry, composition.label)),
  ]);

  const measurementSet: MeasurementSet = {
    kind: "measurement-set",
    id: measurementSetId,
    constructionRef: constructionRef(context.construction),
    sourceGeometryRefs: compositions.map((composition) => compositionRef(composition.geometry, composition.label)),
    constructionMeasurements: constructionMeasurements.measurements,
    compositions: compositionMeasurements.map((composition, index): CompositionMeasurements => {
      const labeledComposition = compositions[index];
      if (labeledComposition === undefined) {
        return emptyCompositionMeasurements("unknown", MEASURE_GEOMETRY_OPERATION);
      }

      const compositionMeasurementId = `composition-measurements:${labeledComposition.label}:${labeledComposition.geometry.id}`;
      return {
        kind: "composition-measurements",
        label: labeledComposition.label,
        sourceGeometryRef: compositionRef(labeledComposition.geometry, labeledComposition.label),
        measurements: composition.measurements,
        directionalRelations: composition.directionalRelations,
        warnings: composition.warnings,
        provenance: createMeasurementObjectProvenance(compositionMeasurementId, MEASURE_GEOMETRY_OPERATION, [
          constructionRef(context.construction),
          compositionRef(labeledComposition.geometry, labeledComposition.label),
        ]),
      };
    }),
    directionalRelations,
    surfaceHierarchy: hierarchy,
    warnings,
    provenance,
  };

  const gateFailure = measurementSetGateFailure(measurementSet);
  if (gateFailure !== null) {
    return gateFailure;
  }

  return createMeasurementResult({
    status: "ok",
    warnings,
    provenance: createCoreProvenance(MEASURE_GEOMETRY_OPERATION, provenance.inputRefs),
    outputRefs: [
      ...constructionMeasurements.measurements.map(measurementRef),
      ...compositionMeasurements.flatMap((composition) => composition.measurements.map(measurementRef)),
    ],
    operationContextRef: context.operationContextRef,
    output: measurementSet,
  });
}

export function measureAreas(input: MeasureAreasInput | null | undefined): CoreResult<AreaMeasurementSet> {
  const inputValidation = validateMeasureAreasInput(input);
  if (!inputValidation.ok) {
    return resultAs<AreaMeasurementSet>(inputValidation.result);
  }

  const { context, composition } = inputValidation.value;
  const parts = measureComposition(context, composition, MEASURE_AREAS_OPERATION);
  const areaSetId = `area-measurement-set:${composition.label}:${context.construction.id}`;
  const provenance = createMeasurementObjectProvenance(areaSetId, MEASURE_AREAS_OPERATION, [
    constructionRef(context.construction),
    compositionRef(composition.geometry, composition.label),
  ]);
  const output: AreaMeasurementSet = {
    kind: "area-measurement-set",
    id: areaSetId,
    constructionRef: constructionRef(context.construction),
    sourceGeometryRef: compositionRef(composition.geometry, composition.label),
    areaMeasurements: parts.areaMeasurements,
    containmentMeasurements: parts.containmentMeasurements,
    overlapMeasurements: parts.overlapMeasurements,
    coverageMeasurements: parts.coverageMeasurements,
    warnings: parts.warnings,
    provenance,
  };

  for (const measurement of [
    ...output.areaMeasurements,
    ...output.containmentMeasurements,
    ...output.overlapMeasurements,
    ...output.coverageMeasurements,
  ]) {
    if (!hasMinimumMeasurementProvenance(measurement)) {
      return missingMeasurementProvenance<AreaMeasurementSet>(measurement.id);
    }
  }

  return createMeasurementResult({
    status: "ok",
    warnings: output.warnings,
    provenance: createCoreProvenance(MEASURE_AREAS_OPERATION, provenance.inputRefs),
    outputRefs: [
      ...output.areaMeasurements.map(measurementRef),
      ...output.containmentMeasurements.map(measurementRef),
      ...output.overlapMeasurements.map(measurementRef),
      ...output.coverageMeasurements.map(measurementRef),
    ],
    operationContextRef: context.operationContextRef,
    output,
  });
}

function validateMeasureGeometryInput(input: MeasureGeometryInput | null | undefined): MeasurementValidation<{
  context: MeasurementContext;
  compositions: readonly LabeledComposition[];
}> {
  const baseValidation = validateMeasurementInputBase(input, "measureGeometry");
  if (!baseValidation.ok) {
    return failedMeasurementValidation(baseValidation.result);
  }

  const compositionsValidation = validateGeometryInputCompositions(baseValidation.value.input);
  if (!compositionsValidation.ok) {
    return failedMeasurementValidation(compositionsValidation.result);
  }

  return validMeasurementValidation({
    context: baseValidation.value.context,
    compositions: compositionsValidation.value,
  });
}

function validateMeasureAreasInput(input: MeasureAreasInput | null | undefined): MeasurementValidation<{
  context: MeasurementContext;
  composition: LabeledComposition;
}> {
  const baseValidation = validateMeasurementInputBase(input, "measureAreas");
  if (!baseValidation.ok) {
    return failedMeasurementValidation(baseValidation.result);
  }

  const compositionInput = baseValidation.value.input.composition;
  if (compositionInput === undefined || compositionInput === null) {
    return failedMeasurementValidation(missingSourceGeometry("composition", "Area measurement requires a source Composition2D."));
  }

  const compositionValidation = validateLabeledComposition(
    baseValidation.value.input.compositionLabel ?? "composition",
    compositionInput,
  );
  if (!compositionValidation.ok) {
    return failedMeasurementValidation(compositionValidation.result);
  }

  return validMeasurementValidation({
    context: baseValidation.value.context,
    composition: compositionValidation.value,
  });
}

function validateMeasurementInputBase<TInput extends { construction?: unknown; requestedOutputs?: readonly string[]; operationContextRef?: OperationContextRef | null }>(
  input: TInput | null | undefined,
  targetRef: string,
): MeasurementValidation<{ input: TInput; context: MeasurementContext }> {
  if (input === null || input === undefined) {
    return failedMeasurementValidation(missingMeasurementInput(targetRef, "Measurement input is required."));
  }

  if (!isRecord(input)) {
    return failedMeasurementValidation(invalidMeasurementInput(targetRef, "Measurement input must be a structured object."));
  }

  const outputFailure = rejectedRequestedOutput(input.requestedOutputs);
  if (outputFailure !== null) {
    return failedMeasurementValidation(outputFailure);
  }

  if (input.construction === undefined || input.construction === null) {
    return failedMeasurementValidation(missingMeasurementInput("construction", "Measurement input requires a construction."));
  }

  const constructionValidation = validateMeasurementConstruction(input.construction);
  if (!constructionValidation.ok) {
    return failedMeasurementValidation(constructionValidation.result);
  }

  return validMeasurementValidation({
    input,
    context: {
      construction: constructionValidation.value,
      metricPolicy: constructionValidation.value.metricPolicy,
      tolerancePolicy: constructionValidation.value.tolerancePolicy as TolerancePolicy,
      operationContextRef: input.operationContextRef ?? null,
    },
  });
}

function validateGeometryInputCompositions(input: MeasureGeometryInput): MeasurementValidation<readonly LabeledComposition[]> {
  const compositionInputs: MeasureGeometryCompositionInput[] = [];
  if (input.compositionA !== undefined && input.compositionA !== null) {
    compositionInputs.push({ label: "A", geometry: input.compositionA });
  }

  if (input.compositionB !== undefined && input.compositionB !== null) {
    compositionInputs.push({ label: "B", geometry: input.compositionB });
  }

  if (input.compositions !== undefined) {
    if (!Array.isArray(input.compositions)) {
      return failedMeasurementValidation(invalidMeasurementInput("compositions", "Compositions must be an array."));
    }

    compositionInputs.push(...input.compositions);
  }

  if (compositionInputs.length === 0) {
    return failedMeasurementValidation(missingSourceGeometry("composition", "Measurement requires at least one source Composition2D."));
  }

  const compositions: LabeledComposition[] = [];
  for (const compositionInput of compositionInputs) {
    const compositionValidation = validateLabeledComposition(compositionInput.label, compositionInput.geometry);
    if (!compositionValidation.ok) {
      return failedMeasurementValidation(compositionValidation.result);
    }

    compositions.push(compositionValidation.value);
  }

  return validMeasurementValidation(compositions);
}

function validateLabeledComposition(label: unknown, geometry: unknown): MeasurementValidation<LabeledComposition> {
  if (typeof label !== "string" || label.length === 0) {
    return failedMeasurementValidation(invalidMeasurementInput("composition.label", "Composition measurement label is required."));
  }

  const geometryValidation = validateMeasurementCompositionGeometry(geometry);
  if (!geometryValidation.ok) {
    return failedMeasurementValidation(geometryValidation.result);
  }

  return validMeasurementValidation({ label, geometry: geometryValidation.value });
}

function validateMeasurementCompositionGeometry(geometry: unknown): MeasurementValidation<Composition2D> {
  if (!isRecord(geometry)) {
    return failedMeasurementValidation(invalidMeasurementInput("composition", "Measurement source geometry must be a structured Composition2D."));
  }

  if (geometry.kind !== "composition-2d") {
    return failedMeasurementValidation(missingSourceGeometry("composition", "Measurement source geometry must be a Composition2D."));
  }

  if (!hasNonEmptyString(geometry, "id")) {
    return failedMeasurementValidation(invalidMeasurementInput("composition.id", "Composition2D source geometry requires an id."));
  }

  if (!isCoordinateSystemRecord(geometry.coordinateSystem)) {
    return failedMeasurementValidation(invalidMeasurementInput("composition.coordinateSystem", "Composition2D source geometry requires a valid CoordinateSystem."));
  }

  if (geometry.coordinateSystem.coordinateScale === "metric" && !isMetricPolicyRecord(geometry.metricPolicy)) {
    return failedMeasurementValidation(missingMeasurementMetricPolicy("composition.metricPolicy"));
  }

  if (geometry.tolerancePolicy !== undefined && geometry.tolerancePolicy !== null && !isTolerancePolicyRecord(geometry.tolerancePolicy)) {
    return failedMeasurementValidation(invalidMeasurementInput("composition.tolerancePolicy", "Composition2D tolerancePolicy is invalid."));
  }

  if (!isMeasurementSurfaceRecord(geometry.surface)) {
    return failedMeasurementValidation(invalidMeasurementInput("composition.surface", "Composition2D source geometry requires a rectangular SurfaceSpace."));
  }

  if (!sameCoordinateSystem(geometry.coordinateSystem, geometry.surface.coordinateSystem)) {
    return failedMeasurementValidation(invalidMeasurementInput("composition.surface.coordinateSystem", "Composition2D and SurfaceSpace coordinate systems must match."));
  }

  const measurementElements = Array.isArray(geometry.elements) ? Array.from(geometry.elements) : null;
  if (measurementElements === null || !measurementElements.every(isMeasurementElementRecord)) {
    return failedMeasurementValidation(invalidMeasurementInput("composition.elements", "Composition2D measurement source elements must be rectangular."));
  }

  const duplicateSourceIdFailure = duplicateMeasurementGeometrySourceIdFailure({
    ...(geometry as unknown as Composition2D),
    elements: measurementElements,
  });
  if (duplicateSourceIdFailure !== null) {
    return failedMeasurementValidation(duplicateSourceIdFailure);
  }

  return validMeasurementValidation(geometry as unknown as Composition2D);
}

function validateMeasurementConstruction(input: unknown): MeasurementValidation<Construction> {
  if (!isConstruction(input)) {
    return failedMeasurementValidation(invalidMeasurementInput("construction", "Measurement construction input must be a PR6 construction."));
  }

  if (input.coordinateSystem.coordinateScale === "metric" && input.metricPolicy === null) {
    return failedMeasurementValidation(missingMeasurementMetricPolicy("construction.metricPolicy"));
  }

  if (input.tolerancePolicy === null) {
    return failedMeasurementValidation(missingMeasurementTolerancePolicy("construction.tolerancePolicy"));
  }

  if (!hasConstructionMeasurementSources(input)) {
    return failedMeasurementValidation(missingMeasurementProvenance(input.id));
  }

  return validMeasurementValidation(input);
}

function measureConstruction(context: MeasurementContext): {
  measurements: readonly Measurement[];
  warnings: readonly CoreWarning[];
} {
  const measurements: Measurement[] = [];
  const warnings: CoreWarning[] = [];

  for (const guide of context.construction.guides) {
    measurements.push(createGuidePositionMeasurement(context, guide));
  }

  for (const diagonal of context.construction.diagonals) {
    measurements.push(createDiagonalAngleMeasurement(context, diagonal));
  }

  return { measurements, warnings };
}

function measureComposition(
  context: MeasurementContext,
  composition: LabeledComposition,
  operationName: string,
): CompositionMeasurementParts {
  const areaParts = measureCompositionAreas(context, composition, operationName);
  const positionMeasurements = composition.geometry.elements.flatMap((element) => (
    createElementPositionMeasurements(context, composition, element, operationName)
  ));
  const guideMeasurementParts = composition.geometry.elements.map((element) => (
    createElementGuideMeasurements(context, composition, element, operationName)
  ));
  const ratioMeasurements = composition.geometry.elements.map((element) => (
    createElementRatioMeasurement(context, composition, element, operationName)
  ));
  const directionalRelations = createDirectionalRelations(context, composition, operationName);

  return {
    measurements: [
      ...areaParts.areaMeasurements,
      ...positionMeasurements,
      ...guideMeasurementParts.flatMap((part) => part.measurements),
      ...ratioMeasurements,
      ...areaParts.containmentMeasurements,
      ...areaParts.overlapMeasurements,
      ...areaParts.coverageMeasurements,
    ],
    areaMeasurements: areaParts.areaMeasurements,
    containmentMeasurements: areaParts.containmentMeasurements,
    overlapMeasurements: areaParts.overlapMeasurements,
    coverageMeasurements: areaParts.coverageMeasurements,
    directionalRelations,
    warnings: [
      ...guideMeasurementParts.flatMap((part) => part.warnings),
      ...areaParts.warnings,
    ],
  };
}

function measureCompositionAreas(
  context: MeasurementContext,
  composition: LabeledComposition,
  operationName: string,
): {
  areaMeasurements: readonly AreaMeasurement[];
  containmentMeasurements: readonly ContainmentMeasurement[];
  overlapMeasurements: readonly OverlapMeasurement[];
  coverageMeasurements: readonly CoverageMeasurement[];
  warnings: readonly CoreWarning[];
} {
  const surfaceBounds = surfaceBoundsFromConstruction(context.construction);
  const surfaceArea = rectArea(surfaceBounds);
  const areaMeasurements: AreaMeasurement[] = [
    createAreaMeasurement({
      id: `measurement:${composition.label}:area:surface:${context.construction.sourceGeometryRef.ref}`,
      metric: "surface-area",
      inputRefs: [surfaceRef(context.construction)],
      sourceGeometryRef: compositionRef(composition.geometry, composition.label),
      area: surfaceArea,
      relativeArea: 1,
      context,
      operationName,
    }),
  ];
  const containmentMeasurements: ContainmentMeasurement[] = [];
  const overlapMeasurements: OverlapMeasurement[] = [];
  const coverageMeasurements: CoverageMeasurement[] = [];
  const warnings: CoreWarning[] = [];

  for (const element of composition.geometry.elements) {
    areaMeasurements.push(createAreaMeasurement({
      id: `measurement:${composition.label}:area:element:${element.id}`,
      metric: "element-area",
      inputRefs: [elementRef(composition.label, element)],
      sourceGeometryRef: compositionRef(composition.geometry, composition.label),
      area: rectArea(element.geometry),
      relativeArea: ratioOrZero(rectArea(element.geometry), surfaceArea),
      context,
      operationName,
    }));

    containmentMeasurements.push(createContainmentMeasurement(context, composition, element, operationName));
  }

  for (let firstIndex = 0; firstIndex < composition.geometry.elements.length; firstIndex += 1) {
    const firstElement = composition.geometry.elements[firstIndex];
    if (firstElement === undefined) {
      continue;
    }

    for (let secondIndex = firstIndex + 1; secondIndex < composition.geometry.elements.length; secondIndex += 1) {
      const secondElement = composition.geometry.elements[secondIndex];
      if (secondElement === undefined) {
        continue;
      }

      const overlapMeasurement = createOverlapMeasurement(context, composition, firstElement, secondElement, operationName);
      overlapMeasurements.push(overlapMeasurement);
      if (overlapMeasurement.overlaps) {
        warnings.push(measurementWarning({
          code: "MeasurementOverlapWarning",
          message: `Composition elements overlap by ${overlapMeasurement.overlapArea} ${areaUnit(context)}.`,
          targetRef: overlapMeasurement.id,
          sourceRef: measurementRef(overlapMeasurement),
          provenance: createCoreProvenance(operationName, overlapMeasurement.inputRefs),
        }));
      }
    }
  }

  const surfaceCoverage = createCoverageMeasurement(
    context,
    composition,
    "surface",
    surfaceRef(context.construction),
    surfaceBounds,
    operationName,
  );
  coverageMeasurements.push(surfaceCoverage);
  appendGapWarning(warnings, surfaceCoverage, operationName, context);

  for (const zone of context.construction.zones) {
    const zoneCoverage = createCoverageMeasurement(
      context,
      composition,
      "zone",
      zoneRef(zone),
      zone.bounds,
      operationName,
    );
    coverageMeasurements.push(zoneCoverage);
    appendGapWarning(warnings, zoneCoverage, operationName, context);
  }

  for (const cell of context.construction.grid.cells) {
    const cellCoverage = createCoverageMeasurement(
      context,
      composition,
      "grid-cell",
      gridCellRef(cell),
      cell.bounds,
      operationName,
    );
    coverageMeasurements.push(cellCoverage);
    appendGapWarning(warnings, cellCoverage, operationName, context);
  }

  return {
    areaMeasurements,
    containmentMeasurements,
    overlapMeasurements,
    coverageMeasurements,
    warnings,
  };
}

function createElementPositionMeasurements(
  context: MeasurementContext,
  composition: LabeledComposition,
  element: Element,
  operationName: string,
): readonly PositionMeasurement[] {
  return edgePositions(context, composition.label, element).map((edge): PositionMeasurement => {
    const id = `measurement:${composition.label}:position:${edge.sourceRef.ref}`;
    const inputRefs = [edge.sourceRef, compositionRef(composition.geometry, composition.label)];
    return {
      ...measurementBase({
        id,
        measurementType: "position",
        metric: `${edge.axis}-position`,
        value: edge.position,
        unit: lengthUnit(context),
        normalized: false,
        sourceGeometryRef: compositionRef(composition.geometry, composition.label),
        inputRefs,
        context,
        operationName,
        toleranceStatus: "not-applicable",
      }),
      measurementType: "position",
      axis: edge.axis,
      position: edge.position,
      normalizedPosition: edge.normalizedPosition,
    };
  });
}

function createElementGuideMeasurements(
  context: MeasurementContext,
  composition: LabeledComposition,
  element: Element,
  operationName: string,
): {
  measurements: readonly (DistanceMeasurement | AlignmentMeasurement)[];
  warnings: readonly CoreWarning[];
} {
  const measurements: (DistanceMeasurement | AlignmentMeasurement)[] = [];
  const warnings: CoreWarning[] = [];

  for (const edge of edgePositions(context, composition.label, element)) {
    for (const guide of context.construction.guides.filter((candidate) => candidate.axis === edge.axis)) {
      const inputRefs = [edge.sourceRef, guideRef(guide), compositionRef(composition.geometry, composition.label)];
      const distance = edge.position - guide.position;
      const absoluteDistance = Math.abs(distance);
      const normalizedDistance = normalizedDistanceForAxis(context.construction, edge.axis, absoluteDistance);
      const aligned = withinTolerance(absoluteDistance, context.tolerancePolicy);
      const toleranceStatus: MeasurementToleranceStatus = aligned ? "within-tolerance" : "outside-tolerance";
      const distanceId = `measurement:${composition.label}:distance:${edge.sourceRef.ref}:to:${guide.id}`;
      const alignmentId = `measurement:${composition.label}:alignment:${edge.sourceRef.ref}:to:${guide.id}`;
      const distanceMeasurement: DistanceMeasurement = {
        ...measurementBase({
          id: distanceId,
          measurementType: "distance",
          metric: "edge-to-guide-distance",
          value: absoluteDistance,
          unit: lengthUnit(context),
          normalized: false,
          sourceGeometryRef: compositionRef(composition.geometry, composition.label),
          inputRefs,
          context,
          operationName,
          toleranceStatus,
        }),
        measurementType: "distance",
        axis: edge.axis,
        signedValue: distance,
        absoluteValue: absoluteDistance,
        normalizedValue: normalizedDistance,
      };
      const alignmentMeasurement: AlignmentMeasurement = {
        ...measurementBase({
          id: alignmentId,
          measurementType: "alignment",
          metric: "edge-guide-alignment",
          value: aligned,
          unit: "boolean",
          normalized: false,
          sourceGeometryRef: compositionRef(composition.geometry, composition.label),
          inputRefs,
          context,
          operationName,
          toleranceStatus,
        }),
        measurementType: "alignment",
        axis: edge.axis,
        aligned,
        distance: absoluteDistance,
        normalizedDistance,
      };
      measurements.push(distanceMeasurement, alignmentMeasurement);
      if (!aligned) {
        warnings.push(measurementWarning({
          code: "MeasurementOutOfTolerance",
          message: `Alignment measurement is outside tolerance: ${alignmentId}.`,
          targetRef: alignmentId,
          sourceRef: measurementRef(alignmentMeasurement),
          provenance: createCoreProvenance(operationName, inputRefs),
        }));
      }
    }
  }

  return { measurements, warnings };
}

function createElementRatioMeasurement(
  context: MeasurementContext,
  composition: LabeledComposition,
  element: Element,
  operationName: string,
): RatioMeasurement {
  const ratio = ratioOrZero(element.geometry.width, element.geometry.height);
  const inputRefs = [elementRef(composition.label, element), compositionRef(composition.geometry, composition.label)];
  const id = `measurement:${composition.label}:ratio:element:${element.id}:aspect`;
  return {
    ...measurementBase({
      id,
      measurementType: "ratio",
      metric: "element-aspect-ratio",
      value: ratio,
      unit: "ratio",
      normalized: true,
      sourceGeometryRef: compositionRef(composition.geometry, composition.label),
      inputRefs,
      context,
      operationName,
      toleranceStatus: "not-applicable",
    }),
    measurementType: "ratio",
    ratioKind: "aspect",
    numerator: element.geometry.width,
    denominator: element.geometry.height,
    ratio,
  };
}

function createGuidePositionMeasurement(context: MeasurementContext, guide: Guide): PositionMeasurement {
  const id = `measurement:construction:position:${guide.id}`;
  const inputRefs = [guideRef(guide), constructionRef(context.construction)];
  return {
    ...measurementBase({
      id,
      measurementType: "position",
      metric: "guide-position",
      value: guide.position,
      unit: lengthUnit(context),
      normalized: false,
      sourceGeometryRef: constructionRef(context.construction),
      inputRefs,
      context,
      operationName: MEASURE_GEOMETRY_OPERATION,
      toleranceStatus: "not-applicable",
    }),
    measurementType: "position",
    axis: guide.axis,
    position: guide.position,
    normalizedPosition: guide.normalizedPosition,
  };
}

function createDiagonalAngleMeasurement(context: MeasurementContext, diagonal: Diagonal): AngleMeasurement {
  const yDelta = requiredY(diagonal.end) - requiredY(diagonal.start);
  const xDelta = diagonal.end.x - diagonal.start.x;
  const angleDegrees = Math.atan2(yDelta, xDelta) * (180 / Math.PI);
  const id = `measurement:construction:angle:${diagonal.id}`;
  const inputRefs = [diagonalRef(diagonal), constructionRef(context.construction)];
  return {
    ...measurementBase({
      id,
      measurementType: "angle",
      metric: "diagonal-angle",
      value: angleDegrees,
      unit: "degrees",
      normalized: false,
      sourceGeometryRef: constructionRef(context.construction),
      inputRefs,
      context,
      operationName: MEASURE_GEOMETRY_OPERATION,
      toleranceStatus: "not-applicable",
    }),
    measurementType: "angle",
    angleDegrees,
  };
}

function createAreaMeasurement(input: {
  id: string;
  metric: string;
  inputRefs: readonly SourceReference[];
  sourceGeometryRef: SourceReference;
  area: number;
  relativeArea: number;
  context: MeasurementContext;
  operationName: string;
}): AreaMeasurement {
  return {
    ...measurementBase({
      id: input.id,
      measurementType: "area",
      metric: input.metric,
      value: input.area,
      unit: areaUnit(input.context),
      normalized: false,
      sourceGeometryRef: input.sourceGeometryRef,
      inputRefs: input.inputRefs,
      context: input.context,
      operationName: input.operationName,
      toleranceStatus: "not-applicable",
    }),
    measurementType: "area",
    area: input.area,
    relativeArea: input.relativeArea,
  };
}

function createContainmentMeasurement(
  context: MeasurementContext,
  composition: LabeledComposition,
  element: Element,
  operationName: string,
): ContainmentMeasurement {
  const contains = rectContains(surfaceBoundsFromConstruction(context.construction), element.geometry, context.tolerancePolicy);
  const id = `measurement:${composition.label}:containment:surface:contains:${element.id}`;
  const inputRefs = [
    surfaceRef(context.construction),
    elementRef(composition.label, element),
    compositionRef(composition.geometry, composition.label),
  ];
  return {
    ...measurementBase({
      id,
      measurementType: "containment",
      metric: "surface-contains-element",
      value: contains,
      unit: "boolean",
      normalized: false,
      sourceGeometryRef: compositionRef(composition.geometry, composition.label),
      inputRefs,
      context,
      operationName,
      toleranceStatus: contains ? "within-tolerance" : "outside-tolerance",
    }),
    measurementType: "containment",
    contains,
  };
}

function createOverlapMeasurement(
  context: MeasurementContext,
  composition: LabeledComposition,
  firstElement: Element,
  secondElement: Element,
  operationName: string,
): OverlapMeasurement {
  const overlapRect = rectIntersection(firstElement.geometry, secondElement.geometry);
  const overlapArea = overlapRect === null ? 0 : rectArea(overlapRect);
  const surfaceArea = rectArea(surfaceBoundsFromConstruction(context.construction));
  const overlaps = overlapArea > toleranceArea(context);
  const id = `measurement:${composition.label}:overlap:${firstElement.id}:${secondElement.id}`;
  const inputRefs = [
    elementRef(composition.label, firstElement),
    elementRef(composition.label, secondElement),
    compositionRef(composition.geometry, composition.label),
  ];
  return {
    ...measurementBase({
      id,
      measurementType: "overlap",
      metric: "element-overlap-area",
      value: overlapArea,
      unit: areaUnit(context),
      normalized: false,
      sourceGeometryRef: compositionRef(composition.geometry, composition.label),
      inputRefs,
      context,
      operationName,
      toleranceStatus: overlaps ? "outside-tolerance" : "within-tolerance",
    }),
    measurementType: "overlap",
    overlaps,
    overlapArea,
    overlapRatio: ratioOrZero(overlapArea, surfaceArea),
  };
}

function createCoverageMeasurement(
  context: MeasurementContext,
  composition: LabeledComposition,
  targetKind: "surface" | "zone" | "grid-cell",
  targetRef: SourceReference,
  targetRect: Rect,
  operationName: string,
): CoverageMeasurement {
  const targetArea = rectArea(targetRect);
  const clippedRects = composition.geometry.elements
    .map((element) => rectIntersection(targetRect, element.geometry))
    .filter((rect): rect is Rect => rect !== null);
  const coveredArea = unionArea(clippedRects);
  const gapArea = Math.max(0, targetArea - coveredArea);
  const id = `measurement:${composition.label}:coverage:${targetKind}:${targetRef.ref}`;
  const inputRefs = [
    targetRef,
    ...composition.geometry.elements.map((element) => elementRef(composition.label, element)),
    compositionRef(composition.geometry, composition.label),
  ];
  const hasGap = gapArea > toleranceArea(context);
  return {
    ...measurementBase({
      id,
      measurementType: "coverage",
      metric: `${targetKind}-coverage-by-elements`,
      value: ratioOrZero(coveredArea, targetArea),
      unit: "ratio",
      normalized: true,
      sourceGeometryRef: compositionRef(composition.geometry, composition.label),
      inputRefs,
      context,
      operationName,
      toleranceStatus: hasGap ? "outside-tolerance" : "within-tolerance",
    }),
    measurementType: "coverage",
    targetArea,
    coveredArea,
    gapArea,
    coverageRatio: ratioOrZero(coveredArea, targetArea),
  };
}

function createDirectionalRelations(
  context: MeasurementContext,
  composition: LabeledComposition,
  operationName: string,
): readonly DirectionalRelation[] {
  const relations: DirectionalRelation[] = [];
  for (let firstIndex = 0; firstIndex < composition.geometry.elements.length; firstIndex += 1) {
    const firstElement = composition.geometry.elements[firstIndex];
    if (firstElement === undefined) {
      continue;
    }

    for (let secondIndex = firstIndex + 1; secondIndex < composition.geometry.elements.length; secondIndex += 1) {
      const secondElement = composition.geometry.elements[secondIndex];
      if (secondElement === undefined) {
        continue;
      }

      relations.push(...relationsForPair(context, composition, firstElement, secondElement, operationName));
    }
  }

  return relations;
}

function relationsForPair(
  context: MeasurementContext,
  composition: LabeledComposition,
  firstElement: Element,
  secondElement: Element,
  operationName: string,
): readonly DirectionalRelation[] {
  const firstCenter = rectCenter(firstElement.geometry);
  const secondCenter = rectCenter(secondElement.geometry);
  const relationTypes: DirectionalRelationType[] = [];
  const tolerance = effectiveTolerance(context);

  if (Math.abs(firstCenter.x - secondCenter.x) <= tolerance) {
    relationTypes.push("same-center-x");
  } else {
    relationTypes.push(firstCenter.x < secondCenter.x ? "left-of" : "right-of");
  }

  if (Math.abs(requiredY(firstCenter) - requiredY(secondCenter)) <= tolerance) {
    relationTypes.push("same-center-y");
  } else {
    relationTypes.push(requiredY(firstCenter) < requiredY(secondCenter) ? "below" : "above");
  }

  const overlapRect = rectIntersection(firstElement.geometry, secondElement.geometry);
  const overlapArea = overlapRect === null ? 0 : rectArea(overlapRect);
  if (overlapArea > toleranceArea(context)) {
    relationTypes.push("overlaps");
  }

  return relationTypes.map((relation): DirectionalRelation => {
    const sourceRef = elementRef(composition.label, firstElement);
    const targetRef = elementRef(composition.label, secondElement);
    const inputRefs = [sourceRef, targetRef, compositionRef(composition.geometry, composition.label)];
    const id = `directional-relation:${composition.label}:${firstElement.id}:${relation}:${secondElement.id}`;
    return {
      kind: "directional-relation",
      id,
      relation,
      sourceRef,
      targetRef,
      inputRefs,
      provenance: createMeasurementObjectProvenance(id, operationName, [
        constructionRef(context.construction),
        ...inputRefs,
      ]),
    };
  });
}

function measurementBase(input: {
  id: string;
  measurementType: MeasurementType;
  metric: string;
  value: number | boolean | string;
  unit: string;
  normalized: boolean;
  sourceGeometryRef: SourceReference;
  inputRefs: readonly SourceReference[];
  context: MeasurementContext;
  operationName: string;
  toleranceStatus: MeasurementToleranceStatus;
}): MeasurementBase {
  return {
    kind: "measurement",
    id: input.id,
    measurementType: input.measurementType,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    normalized: input.normalized,
    sourceGeometryRef: input.sourceGeometryRef,
    inputRefs: [...input.inputRefs],
    metricPolicy: measurementMetricPolicy(input.context, input.unit, input.normalized),
    tolerancePolicy: measurementTolerancePolicy(input.context.tolerancePolicy),
    toleranceStatus: input.toleranceStatus,
    provenance: {
      kind: "measurement-provenance",
      measurementRef: input.id,
      operationRef: operationRef(input.operationName),
      inputRefs: [...input.inputRefs],
      sourceRefs: [
        constructionRef(input.context.construction),
        input.sourceGeometryRef,
        ...input.inputRefs,
      ],
    },
  };
}

function createSurfaceHierarchy(
  context: MeasurementContext,
  compositions: readonly LabeledComposition[],
): SurfaceHierarchy {
  const id = `surface-hierarchy:${context.construction.id}`;
  const inputRefs = [
    constructionRef(context.construction),
    surfaceRef(context.construction),
    ...compositions.map((composition) => compositionRef(composition.geometry, composition.label)),
  ];
  return {
    kind: "surface-hierarchy",
    id,
    surfaceRef: surfaceRef(context.construction),
    constructionRef: constructionRef(context.construction),
    compositionRefs: compositions.map((composition) => compositionRef(composition.geometry, composition.label)),
    zoneRefs: context.construction.zones.map(zoneRef),
    gridCellRefs: context.construction.grid.cells.map(gridCellRef),
    elementRefsByComposition: compositions.map((composition) => ({
      label: composition.label,
      compositionRef: compositionRef(composition.geometry, composition.label),
      elementRefs: composition.geometry.elements.map((element) => elementRef(composition.label, element)),
    })),
    provenance: createMeasurementObjectProvenance(id, MEASURE_GEOMETRY_OPERATION, inputRefs),
  };
}

function appendGapWarning(
  warnings: CoreWarning[],
  coverageMeasurement: CoverageMeasurement,
  operationName: string,
  context: MeasurementContext,
): void {
  if (coverageMeasurement.gapArea <= toleranceArea(context)) {
    return;
  }

  warnings.push(measurementWarning({
    code: "MeasurementGapWarning",
    message: `Coverage measurement leaves a gap of ${coverageMeasurement.gapArea} ${areaUnit(context)}.`,
    targetRef: coverageMeasurement.id,
    sourceRef: measurementRef(coverageMeasurement),
    provenance: createCoreProvenance(operationName, coverageMeasurement.inputRefs),
  }));
}

function measurementSetGateFailure(measurementSet: MeasurementSet): CoreResult<MeasurementSet> | null {
  for (const measurement of [
    ...measurementSet.constructionMeasurements,
    ...measurementSet.compositions.flatMap((composition) => composition.measurements),
  ]) {
    if (!hasMinimumMeasurementProvenance(measurement)) {
      return missingMeasurementProvenance(measurement.id);
    }
  }

  return null;
}

function hasMinimumMeasurementProvenance(measurement: Measurement): boolean {
  return measurement.provenance.kind === "measurement-provenance"
    && measurement.provenance.measurementRef === measurement.id
    && measurement.provenance.inputRefs.length > 0
    && measurement.provenance.sourceRefs.length > 0
    && measurement.inputRefs.length > 0
    && measurement.metric.length > 0
    && measurement.unit.length > 0
    && measurement.metricPolicy.kind === "measurement-metric-policy"
    && measurement.tolerancePolicy.kind === "measurement-tolerance-policy";
}

function hasConstructionMeasurementSources(construction: Construction): boolean {
  return construction.provenance !== null
    && construction.provenance.sourceRefs.length > 0
    && construction.constructionTrace.createdObjectRefs.length > 0;
}

function edgePositions(context: MeasurementContext, label: string, element: Element): readonly EdgePosition[] {
  const rect = element.geometry;
  const surface = surfaceBoundsFromConstruction(context.construction);
  const center = rectCenter(rect);
  return [
    {
      axis: "x",
      name: "left",
      position: rect.x,
      normalizedPosition: ratioOrZero(rect.x - surface.x, surface.width),
      sourceRef: elementEdgeRef(label, element, "left"),
    },
    {
      axis: "x",
      name: "center-x",
      position: center.x,
      normalizedPosition: ratioOrZero(center.x - surface.x, surface.width),
      sourceRef: elementCenterRef(label, element, "center-x"),
    },
    {
      axis: "x",
      name: "right",
      position: rect.x + rect.width,
      normalizedPosition: ratioOrZero(rect.x + rect.width - surface.x, surface.width),
      sourceRef: elementEdgeRef(label, element, "right"),
    },
    {
      axis: "y",
      name: "bottom",
      position: rect.y,
      normalizedPosition: ratioOrZero(rect.y - surface.y, surface.height),
      sourceRef: elementEdgeRef(label, element, "bottom"),
    },
    {
      axis: "y",
      name: "center-y",
      position: requiredY(center),
      normalizedPosition: ratioOrZero(requiredY(center) - surface.y, surface.height),
      sourceRef: elementCenterRef(label, element, "center-y"),
    },
    {
      axis: "y",
      name: "top",
      position: rect.y + rect.height,
      normalizedPosition: ratioOrZero(rect.y + rect.height - surface.y, surface.height),
      sourceRef: elementEdgeRef(label, element, "top"),
    },
  ];
}

function measurementMetricPolicy(context: MeasurementContext, unit: string, normalized: boolean): MeasurementMetricPolicy {
  return {
    kind: "measurement-metric-policy",
    coordinateSystemRef: context.construction.coordinateSystem.id,
    coordinateScale: context.construction.coordinateSystem.coordinateScale,
    sourceMetricPolicyRef: context.metricPolicy?.id ?? null,
    unit,
    normalized,
  };
}

function measurementTolerancePolicy(tolerancePolicy: TolerancePolicy): MeasurementTolerancePolicy {
  return {
    kind: "measurement-tolerance-policy",
    sourceTolerancePolicyRef: tolerancePolicy.id,
    coordinateTolerance: tolerancePolicy.coordinateTolerance,
    metricTolerance: tolerancePolicy.metricTolerance ?? null,
  };
}

function rejectedRequestedOutput(requestedOutputs: unknown): CoreResult | null {
  if (requestedOutputs === undefined) {
    return null;
  }

  if (!Array.isArray(requestedOutputs) || !requestedOutputs.every((output) => typeof output === "string")) {
    return invalidMeasurementInput("requestedOutputs", "Requested measurement outputs must be strings.");
  }

  const rejectedOutput = requestedOutputs.find((output) => {
    const normalizedOutput = output.toLowerCase();
    return REJECTED_OUTPUT_TERMS.some((term) => normalizedOutput.includes(term));
  });

  return rejectedOutput === undefined
    ? null
    : measurementOutputRejected(rejectedOutput);
}

function emptyCompositionMeasurements(label: string, operationName: string): CompositionMeasurements {
  const id = `composition-measurements:${label}:empty`;
  return {
    kind: "composition-measurements",
    label,
    sourceGeometryRef: { kind: "composition-2d", ref: "missing" },
    measurements: [],
    directionalRelations: [],
    warnings: [],
    provenance: createMeasurementObjectProvenance(id, operationName, [{ kind: "composition-2d", ref: "missing" }]),
  };
}

function createMeasurementObjectProvenance(
  measurementRefValue: string,
  operationName: string,
  inputRefs: readonly SourceReference[],
): MeasurementProvenance {
  return {
    kind: "measurement-provenance",
    measurementRef: measurementRefValue,
    operationRef: operationRef(operationName),
    inputRefs: [...inputRefs],
    sourceRefs: [...inputRefs],
  };
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

function measurementError(input: DiagnosticInput): CoreError {
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

function measurementWarning(input: DiagnosticInput): CoreWarning {
  const diagnostic = { sourceRef: MEASUREMENT_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };
  const severity = warningSeverity(diagnostic.severity);

  return {
    code: diagnostic.code,
    severity,
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: warningBlocking(diagnostic.blocking, severity),
    provenance: diagnostic.provenance,
  };
}

function createCoreProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: MEASUREMENT_OPERATION_VERSION,
    inputRefs,
    source: MEASUREMENT_SOURCE_REFERENCE,
  };
}

function missingMeasurementInput(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      measurementError({
        code: "MissingMeasurementInput",
        message,
        targetRef,
        sourceRef: { kind: "measurement-input", ref: targetRef },
      }),
    ],
  });
}

function invalidMeasurementInput(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      measurementError({
        code: "InvalidMeasurementInput",
        message,
        targetRef,
        sourceRef: { kind: "measurement-input", ref: targetRef },
      }),
    ],
  });
}

interface MeasurementGeometrySourceIdOccurrence {
  id: string;
  targetRef: string;
}

interface DuplicateMeasurementGeometrySourceIdOccurrence {
  id: string;
  targetRef: string;
  firstRef: string;
}

function duplicateMeasurementGeometrySourceIdFailure(composition: Composition2D): CoreResult | null {
  const firstRefs = new Map<string, string>();
  const duplicates: DuplicateMeasurementGeometrySourceIdOccurrence[] = [];

  for (const occurrence of measurementGeometrySourceIdOccurrences(composition)) {
    const firstRef = firstRefs.get(occurrence.id);
    if (firstRef !== undefined) {
      duplicates.push({ ...occurrence, firstRef });
      continue;
    }

    firstRefs.set(occurrence.id, occurrence.targetRef);
  }

  if (duplicates.length === 0) {
    return null;
  }

  return createMeasurementResult({
    status: "failed",
    errors: duplicates.map((duplicate) => duplicateMeasurementGeometrySourceId(duplicate)),
  });
}

function measurementGeometrySourceIdOccurrences(composition: Composition2D): readonly MeasurementGeometrySourceIdOccurrence[] {
  const occurrences: MeasurementGeometrySourceIdOccurrence[] = [
    { id: composition.id, targetRef: "composition.id" },
    { id: composition.surface.id, targetRef: "composition.surface.id" },
  ];

  for (const [index, element] of composition.elements.entries()) {
    occurrences.push({ id: element.id, targetRef: `composition.elements.${index}.id` });
  }

  for (const [index, anchor] of sourceIdAnchors(composition.anchors).entries()) {
    occurrences.push({ id: anchor.id, targetRef: `composition.anchors.${index}.id` });
  }

  for (const [elementIndex, element] of composition.elements.entries()) {
    for (const [anchorIndex, anchor] of sourceIdAnchors(element.anchors).entries()) {
      occurrences.push({
        id: anchor.id,
        targetRef: `composition.elements.${elementIndex}.anchors.${anchorIndex}.id`,
      });
    }
  }

  return occurrences;
}

function sourceIdAnchors(value: unknown): readonly { id: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((anchor): anchor is { id: string } => isRecord(anchor) && hasNonEmptyString(anchor, "id"));
}

function duplicateMeasurementGeometrySourceId(duplicate: DuplicateMeasurementGeometrySourceIdOccurrence): CoreError {
  const message = `Duplicate Geometry V1 source id "${duplicate.id}" at ${duplicate.targetRef}; first occurrence at ${duplicate.firstRef}.`;

  return measurementError({
    code: "DuplicateGeometrySourceId",
    message,
    targetRef: duplicate.targetRef,
    sourceRef: { kind: "measurement-input", ref: duplicate.targetRef },
  });
}

function missingSourceGeometry(targetRef: string, message: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      measurementError({
        code: "MissingSourceGeometry",
        message,
        targetRef,
        sourceRef: { kind: "source-geometry", ref: targetRef },
      }),
    ],
  });
}

function missingMeasurementMetricPolicy(targetRef: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      measurementError({
        code: "MissingMeasurementMetricPolicy",
        message: "Metric measurement requires an explicit MetricPolicy.",
        targetRef,
        sourceRef: { kind: "metric-policy", ref: "missing" },
      }),
    ],
  });
}

function missingMeasurementTolerancePolicy(targetRef: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      measurementError({
        code: "MissingMeasurementTolerancePolicy",
        message: "Measurement requires an explicit TolerancePolicy.",
        targetRef,
        sourceRef: { kind: "tolerance-policy", ref: "missing" },
      }),
    ],
  });
}

function missingMeasurementProvenance<TOutput = MeasurementSet>(measurementRefValue: string): CoreResult<TOutput> {
  return createMeasurementResult({
    status: "failed",
    errors: [
      measurementError({
        code: "MissingMeasurementProvenance",
        message: `Measurement is missing traceable provenance: ${measurementRefValue}.`,
        targetRef: measurementRefValue,
        sourceRef: { kind: "measurement", ref: measurementRefValue },
      }),
    ],
  });
}

function measurementOutputRejected(outputRef: string): CoreResult {
  return createMeasurementResult({
    status: "failed",
    errors: [
      measurementError({
        code: "MeasurementOutputRejected",
        message: `Measurement operation cannot produce requested output: ${outputRef}.`,
        targetRef: "requestedOutputs",
        sourceRef: { kind: "requested-output", ref: outputRef },
      }),
    ],
  });
}

function validMeasurementValidation<TValue>(value: TValue): MeasurementValidation<TValue> {
  return { ok: true, value };
}

function failedMeasurementValidation<TValue>(result: CoreResult): MeasurementValidation<TValue> {
  return { ok: false, result: result as unknown as CoreResult<TValue> };
}

function resultAs<TOutput>(result: CoreResult): CoreResult<TOutput> {
  return result as CoreResult<TOutput>;
}

function operationRef(operationName: string): string {
  return `${operationName}@${MEASUREMENT_OPERATION_VERSION}`;
}

function measurementRef(measurement: Measurement): SourceReference {
  return { kind: "measurement", ref: measurement.id };
}

function constructionRef(construction: Construction): SourceReference {
  return { kind: "construction", ref: construction.id };
}

function surfaceRef(construction: Construction): SourceReference {
  return { kind: "surface", ref: construction.sourceGeometryRef.ref };
}

function compositionRef(composition: Composition2D, label: string): SourceReference {
  return { kind: "composition-2d", ref: composition.id || `composition:${label}` };
}

function guideRef(guide: Guide): SourceReference {
  return { kind: "guide", ref: guide.id };
}

function zoneRef(zone: Zone): SourceReference {
  return { kind: "zone", ref: zone.id };
}

function gridCellRef(cell: GridCell): SourceReference {
  return { kind: "grid-cell", ref: cell.id };
}

function diagonalRef(diagonal: Diagonal): SourceReference {
  return { kind: "diagonal", ref: diagonal.id };
}

function elementRef(label: string, element: Element): SourceReference {
  return { kind: "element", ref: `composition:${label}:element:${element.id}` };
}

function elementEdgeRef(label: string, element: Element, edge: string): SourceReference {
  return { kind: "element-edge", ref: `composition:${label}:element:${element.id}:${edge}` };
}

function elementCenterRef(label: string, element: Element, center: string): SourceReference {
  return { kind: "element-center", ref: `composition:${label}:element:${element.id}:${center}` };
}

function lengthUnit(context: MeasurementContext): string {
  return context.metricPolicy?.unit ?? "normalized";
}

function areaUnit(context: MeasurementContext): string {
  const unit = lengthUnit(context);
  return unit === "normalized" ? "normalized-area" : `${unit}^2`;
}

function effectiveTolerance(context: MeasurementContext): number {
  return context.tolerancePolicy.metricTolerance ?? context.tolerancePolicy.coordinateTolerance;
}

function toleranceArea(context: MeasurementContext): number {
  const tolerance = effectiveTolerance(context);
  return tolerance * tolerance;
}

function withinTolerance(value: number, tolerancePolicy: TolerancePolicy): boolean {
  const tolerance = tolerancePolicy.metricTolerance ?? tolerancePolicy.coordinateTolerance;
  return value <= tolerance;
}

function normalizedDistanceForAxis(construction: Construction, axis: "x" | "y", distance: number): number {
  const surface = surfaceBoundsFromConstruction(construction);
  const denominator = axis === "x" ? surface.width : surface.height;
  return ratioOrZero(distance, denominator);
}

function surfaceBoundsFromConstruction(construction: Construction): Rect {
  const rects = [
    ...construction.grid.cells.map((cell) => cell.bounds),
    ...construction.zones.map((zone) => zone.bounds),
  ];
  const firstRect = rects[0];
  if (firstRect === undefined) {
    return { kind: "rect", x: 0, y: 0, width: 1, height: 1 };
  }

  const xStart = Math.min(...rects.map((rect) => rect.x));
  const yStart = Math.min(...rects.map((rect) => rect.y));
  const xEnd = Math.max(...rects.map((rect) => rect.x + rect.width));
  const yEnd = Math.max(...rects.map((rect) => rect.y + rect.height));
  return {
    kind: "rect",
    x: xStart,
    y: yStart,
    width: xEnd - xStart,
    height: yEnd - yStart,
  };
}

function rectArea(rect: Rect): number {
  return rect.width * rect.height;
}

function rectCenter(rect: Rect): Point {
  return {
    kind: "point",
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function rectContains(container: Rect, contained: Rect, tolerancePolicy: TolerancePolicy): boolean {
  const tolerance = tolerancePolicy.metricTolerance ?? tolerancePolicy.coordinateTolerance;
  return contained.x >= container.x - tolerance
    && contained.y >= container.y - tolerance
    && contained.x + contained.width <= container.x + container.width + tolerance
    && contained.y + contained.height <= container.y + container.height + tolerance;
}

function rectIntersection(first: Rect, second: Rect): Rect | null {
  const xStart = Math.max(first.x, second.x);
  const yStart = Math.max(first.y, second.y);
  const xEnd = Math.min(first.x + first.width, second.x + second.width);
  const yEnd = Math.min(first.y + first.height, second.y + second.height);
  if (xEnd <= xStart || yEnd <= yStart) {
    return null;
  }

  return {
    kind: "rect",
    x: xStart,
    y: yStart,
    width: xEnd - xStart,
    height: yEnd - yStart,
  };
}

function unionArea(rects: readonly Rect[]): number {
  if (rects.length === 0) {
    return 0;
  }

  const xValues = uniqueSortedNumbers(rects.flatMap((rect) => [rect.x, rect.x + rect.width]));
  let area = 0;
  for (let index = 0; index < xValues.length - 1; index += 1) {
    const xStart = xValues[index];
    const xEnd = xValues[index + 1];
    if (xStart === undefined || xEnd === undefined || xEnd <= xStart) {
      continue;
    }

    const intervals = rects
      .filter((rect) => rect.x < xEnd && rect.x + rect.width > xStart)
      .map((rect) => [rect.y, rect.y + rect.height] as const);
    area += (xEnd - xStart) * mergedIntervalLength(intervals);
  }

  return area;
}

function mergedIntervalLength(intervals: readonly (readonly [number, number])[]): number {
  const sortedIntervals = [...intervals].sort((first, second) => first[0] - second[0]);
  let total = 0;
  let currentStart: number | null = null;
  let currentEnd: number | null = null;

  for (const [start, end] of sortedIntervals) {
    if (currentStart === null || currentEnd === null) {
      currentStart = start;
      currentEnd = end;
      continue;
    }

    if (start > currentEnd) {
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
      continue;
    }

    currentEnd = Math.max(currentEnd, end);
  }

  if (currentStart !== null && currentEnd !== null) {
    total += currentEnd - currentStart;
  }

  return total;
}

function uniqueSortedNumbers(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((first, second) => first - second);
}

function ratioOrZero(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function requiredY(point: Point): number {
  return point.y ?? 0;
}

function isConstruction(value: unknown): value is Construction {
  if (!isRecord(value) || value.kind !== "construction" || !hasNonEmptyString(value, "id")) {
    return false;
  }

  return isSourceReference(value.sourceGeometryRef)
    && isCoordinateSystemRecord(value.coordinateSystem)
    && (value.metricPolicy === null || isMetricPolicyRecord(value.metricPolicy))
    && (value.tolerancePolicy === null || isTolerancePolicyRecord(value.tolerancePolicy))
    && Array.isArray(value.guides)
    && value.guides.every(isGuide)
    && Array.isArray(value.zones)
    && value.zones.every(isZone)
    && isRecord(value.grid)
    && Array.isArray(value.grid.cells)
    && value.grid.cells.length > 0
    && value.grid.cells.every(isGridCell)
    && Array.isArray(value.diagonals)
    && value.diagonals.every(isDiagonal)
    && isRecord(value.constructionTrace)
    && Array.isArray(value.constructionTrace.createdObjectRefs)
    && isRecord(value.provenance)
    && Array.isArray(value.provenance.sourceRefs);
}

function isGuide(value: unknown): value is Guide {
  return isRecord(value)
    && value.kind === "guide"
    && hasNonEmptyString(value, "id")
    && (value.axis === "x" || value.axis === "y")
    && isFiniteNumber(value.position)
    && isFiniteNumber(value.normalizedPosition);
}

function isZone(value: unknown): value is Zone {
  return isRecord(value)
    && value.kind === "zone"
    && hasNonEmptyString(value, "id")
    && isRectRecord(value.bounds);
}

function isGridCell(value: unknown): value is GridCell {
  return isRecord(value)
    && value.kind === "grid-cell"
    && hasNonEmptyString(value, "id")
    && isRectRecord(value.bounds);
}

function isDiagonal(value: unknown): value is Diagonal {
  return isRecord(value)
    && value.kind === "diagonal"
    && hasNonEmptyString(value, "id")
    && isPointRecord(value.start)
    && isPointRecord(value.end);
}

function isMeasurementSurfaceRecord(value: unknown): value is Composition2D["surface"] {
  return isRecord(value)
    && value.kind === "surface-space"
    && hasNonEmptyString(value, "id")
    && isCoordinateSystemRecord(value.coordinateSystem)
    && (value.metricPolicy === undefined || value.metricPolicy === null || isMetricPolicyRecord(value.metricPolicy))
    && (value.tolerancePolicy === undefined || value.tolerancePolicy === null || isTolerancePolicyRecord(value.tolerancePolicy))
    && isRectRecord(value.bounds);
}

function isMeasurementElementRecord(value: unknown): value is Element {
  return isRecord(value)
    && value.kind === "element"
    && hasNonEmptyString(value, "id")
    && isRectRecord(value.geometry);
}

function sameCoordinateSystem(first: Construction["coordinateSystem"], second: Construction["coordinateSystem"]): boolean {
  return first.origin === second.origin
    && first.xAxis === second.xAxis
    && first.yAxis === second.yAxis
    && first.dimensions === second.dimensions
    && first.coordinateScale === second.coordinateScale;
}

function isCoordinateSystemRecord(value: unknown): value is Construction["coordinateSystem"] {
  return isRecord(value)
    && value.kind === "coordinate-system"
    && hasNonEmptyString(value, "id")
    && value.origin === "bottom-left"
    && value.xAxis === "right"
    && value.yAxis === "up"
    && value.dimensions === 2
    && (value.coordinateScale === "metric" || value.coordinateScale === "normalized");
}

function isMetricPolicyRecord(value: unknown): value is MetricPolicy {
  return isRecord(value)
    && value.kind === "metric-policy"
    && hasNonEmptyString(value, "id")
    && hasNonEmptyString(value, "unit");
}

function isTolerancePolicyRecord(value: unknown): value is TolerancePolicy {
  return isRecord(value)
    && value.kind === "tolerance-policy"
    && hasNonEmptyString(value, "id")
    && isNonNegativeFiniteNumber(value.coordinateTolerance)
    && hasOptionalNonNegativeFiniteNumber(value, "metricTolerance");
}

function isRectRecord(value: unknown): value is Rect {
  return isRecord(value)
    && value.kind === "rect"
    && isFiniteNumber(value.x)
    && isFiniteNumber(value.y)
    && isPositiveFiniteNumber(value.width)
    && isPositiveFiniteNumber(value.height);
}

function isPointRecord(value: unknown): value is Point {
  return isRecord(value)
    && value.kind === "point"
    && isFiniteNumber(value.x)
    && ("y" in value ? isFiniteNumber(value.y) : true);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && typeof value.kind === "string"
    && typeof value.ref === "string";
}

function warningSeverity(severity: DiagnosticSeverity | undefined): CoreWarning["severity"] {
  if (severity === "critical" || severity === "info" || severity === "warning") {
    return severity;
  }

  return "warning";
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function warningBlocking(blocking: boolean | undefined, severity: CoreWarning["severity"]): boolean {
  if (blocking !== undefined) {
    return blocking;
  }

  return severity === "critical";
}

function hasOptionalNonNegativeFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || isNonNegativeFiniteNumber(value[key]);
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string" && value[key].length > 0;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
