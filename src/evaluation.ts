import type {
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationContextRef,
  OperationStatus,
  PackLock,
  PackLockRef,
  Provenance,
  SourceReference,
  TolerancePolicy,
} from "./index.js";
import type {
  AlignmentMeasurement,
  AreaMeasurement,
  ContainmentMeasurement,
  CoverageMeasurement,
  DistanceMeasurement,
  Measurement,
  MeasurementSet,
  MeasurementType,
  OverlapMeasurement,
} from "./measurements.js";
import type {
  RatioPack,
  RatioPackPreLock,
} from "./ratio-pack.js";

export const BASIC_GRID_ALIGNMENT_PROFILE_ID = "basic-grid-alignment" as const;

export const EVALUATION_COMPONENT_IDS = [
  "guide_proximity",
  "alignment",
  "containment",
  "overlap_penalty",
  "coverage_match",
  "area_ratio_match",
] as const;

export const COMPONENT_SCORE_STATUSES = [
  "match",
  "near_match",
  "weak_match",
  "no_match",
  "ambiguous",
] as const;

export type EvaluationComponentId = (typeof EVALUATION_COMPONENT_IDS)[number];
export type ComponentScoreStatus = (typeof COMPONENT_SCORE_STATUSES)[number];

export interface EvaluationMeasurementSource {
  measurementType: MeasurementType;
  metric?: string;
}

export interface EvaluationProfileComponent {
  id: EvaluationComponentId;
  measurementSources: readonly EvaluationMeasurementSource[];
  weight: number;
}

export interface EvaluationProfileLimits {
  noBeautyScore: true;
  noIntentInference: true;
  noComparison: true;
  noDecision: true;
  noRecommendation: true;
  noRatioDefinitions: true;
  noRuleDefinitions: true;
  noMeasurementDefinitions: true;
  requiresExplicitTolerances: true;
}

export interface EvaluationProfile {
  kind: "evaluation-profile";
  id: typeof BASIC_GRID_ALIGNMENT_PROFILE_ID;
  ref: string;
  version: "0.1.0-pr8";
  allowMinimalScore: boolean;
  components: readonly EvaluationProfileComponent[];
  limits: EvaluationProfileLimits;
  provenance: EvaluationProvenance;
}

export interface EvaluationTolerances {
  kind: "evaluation-tolerances";
  id: string;
  guideProximity: number;
  alignment: number;
  containment: number;
  overlap: number;
  coverage: number;
  areaRatio: number;
}

export interface EvaluationProvenance {
  kind: "evaluation-provenance";
  evaluationRef: string;
  operationRef: string;
  inputRefs: readonly SourceReference[];
  sourceRefs: readonly SourceReference[];
}

export interface ComponentScore {
  kind: "component-score";
  id: string;
  componentId: EvaluationComponentId;
  status: ComponentScoreStatus;
  value: number;
  measurementSourceRefs: readonly SourceReference[];
  warnings: readonly CoreWarning[];
  provenance: EvaluationProvenance;
}

export interface MinimalScore {
  kind: "minimal-score";
  id: string;
  value: number;
  derivedFromComponentRefs: readonly string[];
  measurementSourceRefs: readonly SourceReference[];
  provenance: EvaluationProvenance;
}

export interface Confidence {
  kind: "confidence";
  id: string;
  value: number;
  factors: {
    componentCoverage: number;
    measurementSourceCoverage: number;
    warningPenalty: number;
    ambiguityPenalty: number;
  };
  measurementSourceRefs: readonly SourceReference[];
  provenance: EvaluationProvenance;
}

export interface Evaluation {
  kind: "evaluation";
  id: string;
  profileRef: string;
  packRef: string;
  packLockRef: string | null;
  packPreLockRef: string | null;
  compositionLabel: string;
  measurementRefs: readonly SourceReference[];
  componentScores: readonly ComponentScore[];
  score: MinimalScore | null;
  confidence: Confidence;
  status: ComponentScoreStatus;
  warnings: readonly CoreWarning[];
  provenance: EvaluationProvenance;
}

export interface EvaluateCompositionBasicInput {
  measurements?: MeasurementSet | null;
  compositionLabel?: string;
  profile?: EvaluationProfile | null;
  pack?: RatioPack | null;
  packLock?: PackLock | PackLockRef | null;
  packPreLock?: RatioPackPreLock | null;
  tolerancePolicy?: TolerancePolicy | null;
  tolerances?: EvaluationTolerances | null;
  operationContextRef?: OperationContextRef | null;
  requestedOutputs?: readonly string[];
  sourceReferences?: readonly SourceReference[];
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
  runRef?: null;
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
  output?: TOutput | null;
}

type EvaluationValidation<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult;
    };

interface EvaluationContext {
  input: EvaluateCompositionBasicInput;
  measurementSet: MeasurementSet;
  compositionLabel: string;
  measurements: readonly Measurement[];
  profile: EvaluationProfile;
  pack: RatioPack;
  packLockRef: string | null;
  packPreLockRef: string | null;
  tolerances: EvaluationTolerances;
  tolerancePolicy: TolerancePolicy;
  operationContextRef: OperationContextRef | null;
  inputRefs: readonly SourceReference[];
}

interface RequiredEvaluationInputs {
  input: EvaluateCompositionBasicInput;
  measurementSet: MeasurementSet;
  profile: EvaluationProfile;
  pack: RatioPack;
  packLockRef: string | null;
  packPreLockRef: string | null;
  tolerances: EvaluationTolerances;
  tolerancePolicy: TolerancePolicy;
  compositionLabel: string;
  sourceReferences: readonly SourceReference[];
}

interface ComponentComputation {
  value: number;
  status: ComponentScoreStatus;
  measurementSourceRefs: readonly SourceReference[];
  warnings: readonly CoreWarning[];
}

const EVALUATION_OPERATION_VERSION = "0.1.0" as const;
const EVALUATE_COMPOSITION_BASIC_OPERATION = "core.evaluation.basic.evaluate" as const;

const EVALUATION_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/evaluation-v1",
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

const FORBIDDEN_PROFILE_FIELDS = [
  "ratio",
  "ratios",
  "ratioDefinitions",
  "rule",
  "rules",
  "ruleDefinitions",
  "measurement",
  "measurements",
  "measurementDefinitions",
  "tolerances",
  "hiddenTolerances",
] as const;

const FORBIDDEN_EVALUATION_OUTPUT_TERMS = [
  "artifact",
  "comparison",
  "decision",
  "optimization",
  "ranking",
  "recommendation",
] as const;

const BEAUTY_OUTPUT_TERMS = ["beauty", "aesthetic"] as const;
const INTENT_OUTPUT_TERMS = ["intent", "intention"] as const;
const EVALUATION_TOLERANCE_FIELDS = [
  "guideProximity",
  "alignment",
  "containment",
  "overlap",
  "coverage",
  "areaRatio",
] as const;
const EVALUATION_MEASUREMENT_TYPES = [
  "distance",
  "position",
  "alignment",
  "area",
  "ratio",
  "angle",
  "containment",
  "overlap",
  "coverage",
] as const satisfies readonly MeasurementType[];
const RATIO_PACK_PRELOCK_STRING_FIELDS = ["ref", "packId", "packVersion", "contentIdentity"] as const;
const EVALUATION_PROFILE_LITERAL_FIELDS = [
  ["kind", "evaluation-profile"],
  ["id", BASIC_GRID_ALIGNMENT_PROFILE_ID],
  ["version", "0.1.0-pr8"],
] as const;

export const BASIC_GRID_ALIGNMENT_PROFILE: EvaluationProfile = Object.freeze({
  kind: "evaluation-profile",
  id: BASIC_GRID_ALIGNMENT_PROFILE_ID,
  ref: `evaluation-profile:${BASIC_GRID_ALIGNMENT_PROFILE_ID}`,
  version: "0.1.0-pr8",
  allowMinimalScore: true,
  components: Object.freeze([
    evaluationComponent("guide_proximity", [{ measurementType: "distance", metric: "edge-to-guide-distance" }]),
    evaluationComponent("alignment", [{ measurementType: "alignment", metric: "edge-guide-alignment" }]),
    evaluationComponent("containment", [{ measurementType: "containment", metric: "surface-contains-element" }]),
    evaluationComponent("overlap_penalty", [{ measurementType: "overlap", metric: "element-overlap-area" }]),
    evaluationComponent("coverage_match", [{ measurementType: "coverage", metric: "surface-coverage-by-elements" }]),
    evaluationComponent("area_ratio_match", [{ measurementType: "area", metric: "element-area" }]),
  ]),
  limits: Object.freeze({
    noBeautyScore: true,
    noIntentInference: true,
    noComparison: true,
    noDecision: true,
    noRecommendation: true,
    noRatioDefinitions: true,
    noRuleDefinitions: true,
    noMeasurementDefinitions: true,
    requiresExplicitTolerances: true,
  }),
  provenance: Object.freeze({
    kind: "evaluation-provenance",
    evaluationRef: `evaluation-profile:${BASIC_GRID_ALIGNMENT_PROFILE_ID}`,
    operationRef: operationRef(EVALUATE_COMPOSITION_BASIC_OPERATION),
    inputRefs: Object.freeze([{ kind: "spec", ref: "PR8 Evaluation profile and scoring minimal" }]),
    sourceRefs: Object.freeze([{ kind: "spec", ref: "PR8 Evaluation profile and scoring minimal" }]),
  }),
});

export function evaluateCompositionBasic(
  input: EvaluateCompositionBasicInput | null | undefined,
): CoreResult<Evaluation> {
  const contextValidation = validateEvaluationInput(input);
  if (!contextValidation.ok) {
    return resultAs<Evaluation>(contextValidation.result);
  }

  const context = contextValidation.value;
  const componentScores = context.profile.components.map((component) => createComponentScore(context, component));
  const componentMeasurementRefs = uniqueSourceReferences(
    componentScores.flatMap((componentScore) => componentScore.measurementSourceRefs),
  );
  const warnings = componentScores.flatMap((componentScore) => componentScore.warnings);
  const evaluationId = `evaluation:${context.compositionLabel}:${context.profile.id}`;
  const evaluationProvenance = createEvaluationObjectProvenance(evaluationId, context.inputRefs, componentMeasurementRefs);
  const score = context.profile.allowMinimalScore
    ? createMinimalScore(evaluationId, componentScores, componentMeasurementRefs, evaluationProvenance)
    : null;
  const confidence = createConfidence(evaluationId, componentScores, componentMeasurementRefs, warnings, evaluationProvenance);
  const scoreValue = score?.value ?? 0;
  const evaluation: Evaluation = {
    kind: "evaluation",
    id: evaluationId,
    profileRef: context.profile.ref,
    packRef: ratioPackRef(context.pack),
    packLockRef: context.packLockRef,
    packPreLockRef: context.packPreLockRef,
    compositionLabel: context.compositionLabel,
    measurementRefs: componentMeasurementRefs,
    componentScores,
    score,
    confidence,
    status: statusFromScore(scoreValue),
    warnings,
    provenance: evaluationProvenance,
  };

  return createEvaluationResult({
    status: "ok",
    warnings,
    provenance: createCoreProvenance(EVALUATE_COMPOSITION_BASIC_OPERATION, evaluationProvenance.inputRefs),
    outputRefs: [
      { kind: "evaluation", ref: evaluation.id },
      ...componentScores.map((componentScore) => ({ kind: "component-score", ref: componentScore.id })),
      ...(score === null ? [] : [{ kind: "minimal-score", ref: score.id }]),
      { kind: "confidence", ref: confidence.id },
    ],
    packLockRef: packLockRefForResult(context.input.packLock),
    operationContextRef: context.operationContextRef,
    output: evaluation,
  });
}

function validateEvaluationInput(
  input: EvaluateCompositionBasicInput | null | undefined,
): EvaluationValidation<EvaluationContext> {
  const requiredInputs = validateRequiredEvaluationInputs(input);
  if (!requiredInputs.ok) {
    return failedEvaluation(requiredInputs.result);
  }

  const compositionMeasurements = requiredInputs.value.measurementSet.compositions.find((composition) => (
    composition.label === requiredInputs.value.compositionLabel
  ));
  if (compositionMeasurements === undefined || compositionMeasurements.measurements.length === 0) {
    return failedEvaluation(missingMeasurements(
      requiredInputs.value.compositionLabel,
      "Evaluation could not find PR7 measurements for the composition.",
    ));
  }

  const measurementSourceFailure = firstMissingProfileMeasurementFailure(
    requiredInputs.value.profile,
    compositionMeasurements.measurements,
  );
  if (measurementSourceFailure !== null) {
    return failedEvaluation(measurementSourceFailure);
  }

  const inputRefs = evaluationInputRefs(requiredInputs.value, compositionMeasurements.sourceGeometryRef);

  return {
    ok: true,
    value: {
      input: requiredInputs.value.input,
      measurementSet: requiredInputs.value.measurementSet,
      compositionLabel: requiredInputs.value.compositionLabel,
      measurements: compositionMeasurements.measurements,
      profile: requiredInputs.value.profile,
      pack: requiredInputs.value.pack,
      packLockRef: requiredInputs.value.packLockRef,
      packPreLockRef: requiredInputs.value.packPreLockRef,
      tolerances: requiredInputs.value.tolerances,
      tolerancePolicy: requiredInputs.value.tolerancePolicy,
      operationContextRef: requiredInputs.value.input.operationContextRef ?? null,
      inputRefs,
    },
  };
}

function validateRequiredEvaluationInputs(
  input: EvaluateCompositionBasicInput | null | undefined,
): EvaluationValidation<RequiredEvaluationInputs> {
  if (!isRecord(input)) {
    return failedEvaluation(missingMeasurements("measurements", "Evaluation requires PR7 measurements."));
  }

  const evaluationInput = input as EvaluateCompositionBasicInput;
  const baseFailure = firstBaseEvaluationInputFailure(evaluationInput);
  if (baseFailure !== null) {
    return failedEvaluation(baseFailure);
  }

  const packLockValidation = validateEvaluationPackLock(evaluationInput);
  if (!packLockValidation.ok) {
    return failedEvaluation(packLockValidation.result);
  }

  const sourceReferences = evaluationInput.sourceReferences ?? [];
  return {
    ok: true,
    value: {
      input: evaluationInput,
      measurementSet: evaluationInput.measurements as MeasurementSet,
      profile: evaluationInput.profile as EvaluationProfile,
      pack: evaluationInput.pack as RatioPack,
      packLockRef: packLockValidation.value.packLockRef,
      packPreLockRef: packLockValidation.value.packPreLockRef,
      tolerances: evaluationInput.tolerances as EvaluationTolerances,
      tolerancePolicy: evaluationInput.tolerancePolicy as TolerancePolicy,
      compositionLabel: evaluationInput.compositionLabel as string,
      sourceReferences,
    },
  };
}

function firstBaseEvaluationInputFailure(input: EvaluateCompositionBasicInput): CoreResult | null {
  return firstFailure([
    rejectedRequestedOutput(input.requestedOutputs, "requestedOutputs"),
    isMeasurementSet(input.measurements)
      ? null
      : missingMeasurements("measurements", "Evaluation requires a PR7 measurement-set."),
    validProfileFailure(input.profile),
    isRatioPack(input.pack) ? null : missingPack(),
    isEvaluationTolerances(input.tolerances) ? null : missingTolerances(),
    isTolerancePolicy(input.tolerancePolicy) ? null : missingTolerancePolicy(),
    validSourceReferencesFailure(input.sourceReferences),
    validCompositionLabelFailure(input.compositionLabel),
  ]);
}

function validProfileFailure(profile: unknown): CoreResult | null {
  if (!isEvaluationProfile(profile)) {
    return missingEvaluationProfile();
  }

  return invalidProfileFailure(profile);
}

function validateEvaluationPackLock(input: EvaluateCompositionBasicInput): EvaluationValidation<{
  packLockRef: string | null;
  packPreLockRef: string | null;
}> {
  const pack = input.pack as RatioPack;
  const packLockRef = evaluationPackLockRef(input.packLock);
  const packPreLockRef = evaluationPackPreLockRef(input.packPreLock, pack);

  return packLockRef === null && packPreLockRef === null
    ? failedEvaluation(missingPackLock())
    : { ok: true, value: { packLockRef, packPreLockRef } };
}

function validSourceReferencesFailure(sourceReferences: readonly SourceReference[] | undefined): CoreResult | null {
  if (sourceReferences === undefined || isSourceReferenceArray(sourceReferences)) {
    return null;
  }

  return invalidEvaluationInput("sourceReferences", "Evaluation source references must be structured.");
}

function validCompositionLabelFailure(compositionLabel: unknown): CoreResult | null {
  return nonEmptyString(compositionLabel) === null
    ? missingMeasurements("compositionLabel", "Evaluation requires an explicit composition label.")
    : null;
}

function evaluationInputRefs(
  input: RequiredEvaluationInputs,
  sourceGeometryRef: SourceReference,
): readonly SourceReference[] {
  return uniqueSourceReferences([
    { kind: "measurement-set", ref: input.measurementSet.id },
    sourceGeometryRef,
    { kind: "evaluation-profile", ref: input.profile.id },
    { kind: "ratio-pack", ref: ratioPackRef(input.pack) },
    ...(input.packLockRef === null ? [] : [{ kind: "pack-lock", ref: input.packLockRef }]),
    ...(input.packPreLockRef === null ? [] : [{ kind: "pack-lock-prelock", ref: input.packPreLockRef }]),
    { kind: "evaluation-tolerances", ref: input.tolerances.id },
    { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
    ...input.sourceReferences,
  ]);
}

function firstMissingProfileMeasurementFailure(
  profile: EvaluationProfile,
  measurements: readonly Measurement[],
): CoreResult | null {
  for (const component of profile.components) {
    for (const source of component.measurementSources) {
      const sourceMeasurements = measurements.filter((measurement) => measurementMatchesSource(measurement, source));
      if (sourceMeasurements.length === 0) {
        return missingMeasurements(
          `profile.components.${component.id}`,
          `Profile component ${component.id} references missing ${source.measurementType} measurements.`,
        );
      }

      if (sourceMeasurements.some((measurement) => !hasMinimumMeasurementSources(measurement))) {
        return missingMeasurements(
          `profile.components.${component.id}`,
          `Profile component ${component.id} cannot score measurements without source refs.`,
        );
      }
    }
  }

  return null;
}

function invalidProfileFailure(profile: EvaluationProfile): CoreResult | null {
  const record = profile as unknown as Record<string, unknown>;
  const forbiddenField = firstPresentField(record, FORBIDDEN_PROFILE_FIELDS);
  if (forbiddenField !== null) {
    return invalidEvaluationInput(
      `profile.${forbiddenField}`,
      "EvaluationProfile must not define ratios, rules, measurements, or hidden tolerances.",
    );
  }

  const requestedOutputFailure = rejectedRequestedOutput(record["requestedOutputs"], "profile.requestedOutputs");
  if (requestedOutputFailure !== null) {
    return requestedOutputFailure;
  }

  for (const component of profile.components) {
    if (!EVALUATION_COMPONENT_IDS.includes(component.id)) {
      return invalidEvaluationInput(
        `profile.components.${component.id}`,
        `Unsupported evaluation component: ${component.id}.`,
      );
    }
  }

  return null;
}

function createComponentScore(context: EvaluationContext, component: EvaluationProfileComponent): ComponentScore {
  const componentMeasurements = measurementsForComponent(context.measurements, component);
  const computation = computeComponent(context, component.id, componentMeasurements);
  const componentId = `component-score:${context.compositionLabel}:${component.id}`;
  const provenance = createEvaluationObjectProvenance(componentId, context.inputRefs, computation.measurementSourceRefs);

  return {
    kind: "component-score",
    id: componentId,
    componentId: component.id,
    status: computation.status,
    value: computation.value,
    measurementSourceRefs: computation.measurementSourceRefs,
    warnings: computation.warnings,
    provenance,
  };
}

function computeComponent(
  context: EvaluationContext,
  componentId: EvaluationComponentId,
  measurements: readonly Measurement[],
): ComponentComputation {
  const measurementSourceRefs = uniqueSourceReferences(measurements.map(measurementRef));

  if (componentId === "guide_proximity") {
    const value = scoreGuideProximity(measurements.filter(isDistanceMeasurement));
    return componentComputation(value, measurementSourceRefs);
  }

  if (componentId === "alignment") {
    const value = scoreAlignment(measurements.filter(isAlignmentMeasurement));
    return componentComputation(value, measurementSourceRefs);
  }

  if (componentId === "containment") {
    const value = scoreContainment(measurements.filter(isContainmentMeasurement));
    return componentComputation(value, measurementSourceRefs);
  }

  if (componentId === "overlap_penalty") {
    const value = scoreOverlapPenalty(measurements.filter(isOverlapMeasurement), context.tolerances);
    return componentComputation(value, measurementSourceRefs);
  }

  if (componentId === "coverage_match") {
    const value = scoreCoverage(measurements.filter(isCoverageMeasurement));
    return componentComputation(value, measurementSourceRefs);
  }

  const value = scoreAreaRatioMatch(measurements.filter(isAreaMeasurement), context.pack, context.tolerances);
  return componentComputation(value, measurementSourceRefs);
}

function componentComputation(value: number, measurementSourceRefs: readonly SourceReference[]): ComponentComputation {
  const clampedValue = clamp01(value);
  return {
    value: clampedValue,
    status: statusFromScore(clampedValue),
    measurementSourceRefs,
    warnings: [],
  };
}

function scoreGuideProximity(measurements: readonly DistanceMeasurement[]): number {
  const nearestDistancesByEdge = new Map<string, number>();
  for (const measurement of measurements) {
    const edgeRef = sourceRefByKind(measurement, "element-edge") ?? measurement.id;
    const current = nearestDistancesByEdge.get(edgeRef);
    const nextValue = measurement.normalizedValue;
    if (current === undefined || nextValue < current) {
      nearestDistancesByEdge.set(edgeRef, nextValue);
    }
  }

  return 1 - average([...nearestDistancesByEdge.values()]);
}

function scoreAlignment(measurements: readonly AlignmentMeasurement[]): number {
  const alignedByEdge = new Map<string, boolean>();
  for (const measurement of measurements) {
    const edgeRef = sourceRefByKind(measurement, "element-edge") ?? measurement.id;
    alignedByEdge.set(edgeRef, Boolean(alignedByEdge.get(edgeRef)) || measurement.aligned);
  }

  return ratioOrZero([...alignedByEdge.values()].filter(Boolean).length, alignedByEdge.size);
}

function scoreContainment(measurements: readonly ContainmentMeasurement[]): number {
  return ratioOrZero(measurements.filter((measurement) => measurement.contains).length, measurements.length);
}

function scoreOverlapPenalty(measurements: readonly OverlapMeasurement[], tolerances: EvaluationTolerances): number {
  const maxOverlap = Math.max(0, ...measurements.map((measurement) => measurement.overlapRatio));
  if (maxOverlap <= tolerances.overlap) {
    return 1;
  }

  return 0;
}

function scoreCoverage(measurements: readonly CoverageMeasurement[]): number {
  const surfaceCoverage = measurements.find((measurement) => measurement.metric === "surface-coverage-by-elements");
  return surfaceCoverage?.coverageRatio ?? average(measurements.map((measurement) => measurement.coverageRatio));
}

function scoreAreaRatioMatch(
  measurements: readonly AreaMeasurement[],
  pack: RatioPack,
  tolerances: EvaluationTolerances,
): number {
  const targetRatios = pack.ratios.map((ratio) => ratio.normalizedValue).filter(isPositiveFiniteNumber);
  const elementAreas = measurements.filter((measurement) => measurement.metric === "element-area");
  if (targetRatios.length === 0 || elementAreas.length === 0) {
    return 0;
  }

  return average(elementAreas.map((measurement) => {
    const closestDistance = Math.min(...targetRatios.map((ratio) => Math.abs(measurement.relativeArea - ratio)));
    return clamp01(1 - (closestDistance / positiveFloor(tolerances.areaRatio)));
  }));
}

function createMinimalScore(
  evaluationId: string,
  componentScores: readonly ComponentScore[],
  measurementSourceRefs: readonly SourceReference[],
  provenance: EvaluationProvenance,
): MinimalScore {
  const totalWeight = componentScores.length;
  const value = totalWeight === 0
    ? 0
    : componentScores.reduce((sum, componentScore) => sum + componentScore.value, 0) / totalWeight;

  return {
    kind: "minimal-score",
    id: `minimal-score:${evaluationId}`,
    value: clamp01(value),
    derivedFromComponentRefs: componentScores.map((componentScore) => componentScore.id),
    measurementSourceRefs,
    provenance,
  };
}

function createConfidence(
  evaluationId: string,
  componentScores: readonly ComponentScore[],
  measurementSourceRefs: readonly SourceReference[],
  warnings: readonly CoreWarning[],
  provenance: EvaluationProvenance,
): Confidence {
  const componentCoverage = ratioOrZero(
    componentScores.filter((componentScore) => componentScore.measurementSourceRefs.length > 0).length,
    componentScores.length,
  );
  const measurementSourceCoverage = measurementSourceRefs.length > 0 ? 1 : 0;
  const ambiguityPenalty = ratioOrZero(
    componentScores.filter((componentScore) => componentScore.status === "ambiguous").length,
    componentScores.length,
  ) * 0.25;
  const warningPenalty = Math.min(0.4, warnings.length * 0.05);
  const value = clamp01((componentCoverage * 0.6) + (measurementSourceCoverage * 0.4) - warningPenalty - ambiguityPenalty);

  return {
    kind: "confidence",
    id: `confidence:${evaluationId}`,
    value,
    factors: {
      componentCoverage,
      measurementSourceCoverage,
      warningPenalty,
      ambiguityPenalty,
    },
    measurementSourceRefs,
    provenance,
  };
}

function measurementsForComponent(
  measurements: readonly Measurement[],
  component: EvaluationProfileComponent,
): readonly Measurement[] {
  return measurements.filter((measurement) => (
    component.measurementSources.some((source) => measurementMatchesSource(measurement, source))
  ));
}

function measurementMatchesSource(measurement: Measurement, source: EvaluationMeasurementSource): boolean {
  if (measurement.measurementType !== source.measurementType) {
    return false;
  }

  return source.metric === undefined || measurement.metric === source.metric;
}

function hasMinimumMeasurementSources(measurement: Measurement): boolean {
  return measurement.inputRefs.length > 0
    && measurement.provenance.inputRefs.length > 0
    && measurement.provenance.sourceRefs.length > 0;
}

function rejectedRequestedOutput(value: unknown, targetRef: string): CoreResult | null {
  if (value === undefined) {
    return null;
  }

  if (!isStringArray(value)) {
    return invalidEvaluationInput(targetRef, "Evaluation requested outputs must be strings.");
  }

  const rejectedOutput = firstOutputWithTerm(value, BEAUTY_OUTPUT_TERMS);
  if (rejectedOutput !== undefined) {
    return beautyScoreRejected(rejectedOutput);
  }

  const rejectedIntentOutput = firstOutputWithTerm(value, INTENT_OUTPUT_TERMS);
  if (rejectedIntentOutput !== undefined) {
    return intentInferenceRejected(rejectedIntentOutput);
  }

  const rejectedScopeOutput = firstOutputWithTerm(value, FORBIDDEN_EVALUATION_OUTPUT_TERMS);

  return rejectedScopeOutput === undefined
    ? null
    : invalidEvaluationInput(targetRef, `PR8 cannot produce requested output: ${rejectedScopeOutput}.`);
}

function evaluationComponent(
  id: EvaluationComponentId,
  measurementSources: readonly EvaluationMeasurementSource[],
): EvaluationProfileComponent {
  return Object.freeze({
    id,
    measurementSources: Object.freeze(measurementSources.map((source) => Object.freeze({ ...source }))),
    weight: 1,
  });
}

function createEvaluationResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function evaluationError(input: DiagnosticInput): CoreError {
  const diagnostic = { sourceRef: EVALUATION_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };

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

function createCoreProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: EVALUATION_OPERATION_VERSION,
    inputRefs,
    source: EVALUATION_SOURCE_REFERENCE,
  };
}

function createEvaluationObjectProvenance(
  evaluationRefValue: string,
  inputRefs: readonly SourceReference[],
  sourceRefs: readonly SourceReference[],
): EvaluationProvenance {
  return {
    kind: "evaluation-provenance",
    evaluationRef: evaluationRefValue,
    operationRef: operationRef(EVALUATE_COMPOSITION_BASIC_OPERATION),
    inputRefs: [...inputRefs],
    sourceRefs: [...sourceRefs],
  };
}

function missingMeasurements(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "MissingMeasurements",
        message,
        targetRef,
        sourceRef: { kind: "measurements", ref: targetRef },
      }),
    ],
  });
}

function missingEvaluationProfile(): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "MissingEvaluationProfile",
        message: "Evaluation requires an explicit EvaluationProfile.",
        targetRef: "profile",
        sourceRef: { kind: "evaluation-profile", ref: "missing" },
      }),
    ],
  });
}

function missingPack(): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "MissingPack",
        message: "Evaluation requires an explicit ratio pack.",
        targetRef: "pack",
        sourceRef: { kind: "ratio-pack", ref: "missing" },
      }),
    ],
  });
}

function missingPackLock(): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "MissingPackLock",
        message: "Evaluation requires an explicit PackLock or PR4-compatible pre-lock.",
        targetRef: "packLock",
        sourceRef: { kind: "pack-lock", ref: "missing" },
      }),
    ],
  });
}

function missingTolerances(): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "MissingTolerances",
        message: "Evaluation requires explicit evaluation tolerances.",
        targetRef: "tolerances",
        sourceRef: { kind: "evaluation-tolerances", ref: "missing" },
      }),
    ],
  });
}

function missingTolerancePolicy(): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "MissingTolerancePolicy",
        message: "Evaluation requires an explicit TolerancePolicy.",
        targetRef: "tolerancePolicy",
        sourceRef: { kind: "tolerance-policy", ref: "missing" },
      }),
    ],
  });
}

function beautyScoreRejected(outputRef: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "BeautyScoreRejected",
        message: "PR8 rejects beauty score requests.",
        targetRef: "requestedOutputs",
        sourceRef: { kind: "requested-output", ref: outputRef },
      }),
    ],
  });
}

function intentInferenceRejected(outputRef: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "IntentInferenceRejected",
        message: "PR8 rejects intention inference requests.",
        targetRef: "requestedOutputs",
        sourceRef: { kind: "requested-output", ref: outputRef },
      }),
    ],
  });
}

function invalidEvaluationInput(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [
      evaluationError({
        code: "InvalidInputShape",
        message,
        targetRef,
        sourceRef: { kind: "evaluation-input", ref: targetRef },
      }),
    ],
  });
}

function statusFromScore(value: number): ComponentScoreStatus {
  if (value >= 0.9) {
    return "match";
  }

  if (value >= 0.75) {
    return "near_match";
  }

  if (value >= 0.5) {
    return "weak_match";
  }

  if (value > 0) {
    return "no_match";
  }

  return "no_match";
}

function packLockRefForResult(value: PackLock | PackLockRef | null | undefined): PackLockRef | null {
  if (isPackLock(value)) {
    return value.ref;
  }

  if (isPackLockRef(value)) {
    return value;
  }

  return null;
}

function evaluationPackLockRef(value: PackLock | PackLockRef | null | undefined): string | null {
  const packLockRef = packLockRefForResult(value);
  return packLockRef?.id ?? null;
}

function evaluationPackPreLockRef(value: RatioPackPreLock | null | undefined, pack: RatioPack): string | null {
  if (!isRatioPackPreLock(value)) {
    return null;
  }

  if (value.packId !== pack.id || value.packVersion !== pack.version || value.contentIdentity !== pack.contentIdentity) {
    return null;
  }

  return value.ref;
}

function measurementRef(measurement: Measurement): SourceReference {
  return { kind: "measurement", ref: measurement.id };
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function operationRef(operationName: string): string {
  return `${operationName}@${EVALUATION_OPERATION_VERSION}`;
}

function sourceRefByKind(measurement: Measurement, kind: string): string | null {
  return measurement.inputRefs.find((inputRef) => inputRef.kind === kind)?.ref ?? null;
}

function firstPresentField(value: Record<string, unknown>, fields: readonly string[]): string | null {
  return fields.find((field) => field in value) ?? null;
}

function firstOutputWithTerm(outputs: readonly string[], terms: readonly string[]): string | undefined {
  return outputs.find((output) => {
    const normalizedOutput = output.toLowerCase();
    return terms.some((term) => normalizedOutput.includes(term));
  });
}

function hasStringFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function hasLiteralFields(
  value: Record<string, unknown>,
  fields: readonly (readonly [string, unknown])[],
): boolean {
  return fields.every(([field, expectedValue]) => value[field] === expectedValue);
}

function hasNonNegativeNumberFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => isNonNegativeFiniteNumber(value[field]));
}

function hasOptionalNonNegativeNumberField(value: Record<string, unknown>, field: string): boolean {
  return value[field] === undefined || value[field] === null || isNonNegativeFiniteNumber(value[field]);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isArrayOf<TValue>(
  value: unknown,
  guard: (candidate: unknown) => candidate is TValue,
): value is readonly TValue[] {
  return Array.isArray(value) && value.every(guard);
}

function uniqueSourceReferences(refs: readonly SourceReference[]): readonly SourceReference[] {
  const seen = new Set<string>();
  const uniqueRefs: SourceReference[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.ref}`;
    if (!seen.has(key)) {
      uniqueRefs.push(ref);
      seen.add(key);
    }
  }

  return uniqueRefs;
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratioOrZero(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function positiveFloor(value: number): number {
  return Math.max(value, Number.EPSILON);
}

function failedEvaluation<TValue>(result: CoreResult): EvaluationValidation<TValue> {
  return { ok: false, result };
}

function firstFailure(results: readonly (CoreResult | null)[]): CoreResult | null {
  return results.find((result) => result !== null) ?? null;
}

function resultAs<TOutput>(result: CoreResult): CoreResult<TOutput> {
  return result as unknown as CoreResult<TOutput>;
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function isEvaluationProfile(value: unknown): value is EvaluationProfile {
  if (!isRecord(value)) {
    return false;
  }

  return hasLiteralFields(value, EVALUATION_PROFILE_LITERAL_FIELDS)
    && hasStringFields(value, ["ref"])
    && typeof value["allowMinimalScore"] === "boolean"
    && isArrayOf(value["components"], isEvaluationProfileComponent);
}

function isEvaluationProfileComponent(value: unknown): value is EvaluationProfileComponent {
  if (!isRecord(value)) {
    return false;
  }

  return EVALUATION_COMPONENT_IDS.includes(value["id"] as EvaluationComponentId)
    && Array.isArray(value["measurementSources"])
    && (value["measurementSources"] as readonly unknown[]).every(isEvaluationMeasurementSource)
    && isPositiveFiniteNumber(value["weight"]);
}

function isEvaluationMeasurementSource(value: unknown): value is EvaluationMeasurementSource {
  if (!isRecord(value)) {
    return false;
  }

  return isMeasurementType(value["measurementType"])
    && (value["metric"] === undefined || typeof value["metric"] === "string");
}

function isEvaluationTolerances(value: unknown): value is EvaluationTolerances {
  if (!isRecord(value)) {
    return false;
  }

  return value["kind"] === "evaluation-tolerances"
    && typeof value["id"] === "string"
    && hasNonNegativeNumberFields(value, EVALUATION_TOLERANCE_FIELDS);
}

function isMeasurementSet(value: unknown): value is MeasurementSet {
  if (!isRecord(value)) {
    return false;
  }

  return value["kind"] === "measurement-set"
    && typeof value["id"] === "string"
    && Array.isArray(value["compositions"]);
}

function isRatioPack(value: unknown): value is RatioPack {
  if (!isRecord(value)) {
    return false;
  }

  return value["kind"] === "ratio-pack"
    && hasStringFields(value, ["id", "version", "contentIdentity"])
    && Array.isArray(value["ratios"]);
}

function isRatioPackPreLock(value: unknown): value is RatioPackPreLock {
  if (!isRecord(value)) {
    return false;
  }

  return value["kind"] === "pack-lock-prelock"
    && hasStringFields(value, RATIO_PACK_PRELOCK_STRING_FIELDS)
    && value["final"] === false;
}

function isPackLock(value: unknown): value is PackLock {
  if (!isRecord(value)) {
    return false;
  }

  return isPackLockRef(value["ref"]);
}

function isPackLockRef(value: unknown): value is PackLockRef {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value["id"] === "string";
}

function isTolerancePolicy(value: unknown): value is TolerancePolicy {
  if (!isRecord(value)) {
    return false;
  }

  return value["kind"] === "tolerance-policy"
    && typeof value["id"] === "string"
    && isNonNegativeFiniteNumber(value["coordinateTolerance"])
    && hasOptionalNonNegativeNumberField(value, "metricTolerance");
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isSourceReference(value: unknown): value is SourceReference {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value["kind"] === "string" && typeof value["ref"] === "string";
}

function isDistanceMeasurement(measurement: Measurement): measurement is DistanceMeasurement {
  return measurement.measurementType === "distance";
}

function isAlignmentMeasurement(measurement: Measurement): measurement is AlignmentMeasurement {
  return measurement.measurementType === "alignment";
}

function isContainmentMeasurement(measurement: Measurement): measurement is ContainmentMeasurement {
  return measurement.measurementType === "containment";
}

function isOverlapMeasurement(measurement: Measurement): measurement is OverlapMeasurement {
  return measurement.measurementType === "overlap";
}

function isCoverageMeasurement(measurement: Measurement): measurement is CoverageMeasurement {
  return measurement.measurementType === "coverage";
}

function isAreaMeasurement(measurement: Measurement): measurement is AreaMeasurement {
  return measurement.measurementType === "area";
}

function isMeasurementType(value: unknown): value is MeasurementType {
  return typeof value === "string" && EVALUATION_MEASUREMENT_TYPES.includes(value as MeasurementType);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
