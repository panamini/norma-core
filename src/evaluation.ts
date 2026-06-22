import type {
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationStatus,
  PackLockRef,
  Provenance,
  SourceReference,
} from "./index.js";
import type {
  AlignmentMeasurementV1,
  ContainmentStatusV1,
  CoverageMeasurementV1,
  DistanceMeasurementV1,
  MeasurementResultV1,
  MeasurementTypeV1,
  MeasurementV1,
  OverlapMeasurementV1,
  RatioMeasurementV1,
} from "./measurements.js";
import { validateMeasurementResultV1 } from "./measurements.js";

export const EVALUATION_PROFILE_V1_SCHEMA_VERSION = "evaluation-profile-v1" as const;
export const COMPONENT_SCORE_V1_SCHEMA_VERSION = "component-score-v1" as const;
export const SCORE_V1_SCHEMA_VERSION = "score-v1" as const;
export const CONFIDENCE_V1_SCHEMA_VERSION = "confidence-v1" as const;
export const EVALUATION_V1_SCHEMA_VERSION = "evaluation-v1" as const;

export const EVALUATION_V1_COMPONENT_TYPES = [
  "guide_proximity",
  "alignment",
  "containment",
  "overlap_penalty",
  "coverage_match",
  "area_ratio_match",
] as const;

export const EVALUATION_V1_WARNING_CODES = [
  "OptionalComponentMissing",
  "AmbiguousMeasurementUsed",
  "ConfidenceReduced",
  "PartialEvaluation",
] as const;

export type EvaluationProfileV1SchemaVersion = typeof EVALUATION_PROFILE_V1_SCHEMA_VERSION;
export type ComponentScoreV1SchemaVersion = typeof COMPONENT_SCORE_V1_SCHEMA_VERSION;
export type ScoreV1SchemaVersion = typeof SCORE_V1_SCHEMA_VERSION;
export type ConfidenceV1SchemaVersion = typeof CONFIDENCE_V1_SCHEMA_VERSION;
export type EvaluationV1SchemaVersion = typeof EVALUATION_V1_SCHEMA_VERSION;
export type EvaluationComponentTypeV1 = (typeof EVALUATION_V1_COMPONENT_TYPES)[number];
export type EvaluationWarningCodeV1 = (typeof EVALUATION_V1_WARNING_CODES)[number];
export type EvaluationStatusV1 = "match" | "near_match" | "weak_match" | "no_match" | "ambiguous";
export type ConfidenceStatusV1 = "high" | "medium" | "low";
export type ComponentScoreStatusV1 = "calculated" | "ambiguous";
export type MissingRequiredPolicyV1 = "fail";
export type MissingOptionalPolicyV1 = "renormalize_remaining";
export type AmbiguousMeasurementPolicyV1 = "include_with_confidence_penalty" | "fail";

export interface EvaluationWeightPolicyV1 {
  kind: "evaluation-weight-policy";
  normalization: "normalize-total-positive";
}

export interface MissingMeasurementPolicyV1 {
  kind: "missing-measurement-policy";
  required: MissingRequiredPolicyV1;
  optional: MissingOptionalPolicyV1;
}

export interface EvaluationStatusThresholdsV1 {
  kind: "evaluation-status-thresholds";
  match: number;
  nearMatch: number;
  weakMatch: number;
  minimumConfidenceForNormalStatus: number;
}

export interface EvaluationConfidencePolicyV1 {
  kind: "evaluation-confidence-policy";
  highThreshold: number;
  mediumThreshold: number;
  optionalMissingPenalty: number;
  ambiguousMeasurementPenalty: number;
  warningPenalty: number;
}

export interface EvaluationProfileLimitsV1 {
  kind: "evaluation-profile-limits";
  scoreMin: number;
  scoreMax: number;
  minComponents: number;
}

export interface LinearDistanceScoringV1 {
  kind: "linear-distance-tolerance";
  distanceBasis: "normalizedDistance";
  targetDistance: 0;
  tolerance: number;
}

export interface LinearAlignmentScoringV1 {
  kind: "linear-alignment-tolerance";
  deltaBasis: "normalizedDelta";
  targetDelta: 0;
  tolerance: number;
}

export interface ContainmentStatusMapScoringV1 {
  kind: "containment-status-map";
  statusScores: Readonly<Record<ContainmentStatusV1, number>>;
}

export interface OverlapPenaltyScoringV1 {
  kind: "overlap-linear-penalty";
  overlapBasis: "maxOverlapRatio";
  tolerance: number;
}

export interface TargetClosenessScoringV1 {
  kind: "target-closeness";
  valueBasis: "coverageRatio";
  target: number;
  tolerance: number;
}

export interface RatioTargetClosenessScoringV1 {
  kind: "ratio-target-closeness";
  deltaBasis: "absoluteDelta";
  targetRatio: number;
  tolerance: number;
}

export type EvaluationComponentScoringV1 =
  | LinearDistanceScoringV1
  | LinearAlignmentScoringV1
  | ContainmentStatusMapScoringV1
  | OverlapPenaltyScoringV1
  | TargetClosenessScoringV1
  | RatioTargetClosenessScoringV1;

export interface EvaluationComponentDefinitionV1 {
  kind: "evaluation-component-definition";
  componentRef: string;
  componentType: EvaluationComponentTypeV1;
  measurementType: MeasurementTypeV1;
  measurementRefs: readonly string[];
  scoring: EvaluationComponentScoringV1;
  weight: number;
  required: boolean;
  ambiguousMeasurementPolicy: AmbiguousMeasurementPolicyV1;
  sourceRefs: readonly SourceReference[];
}

export interface EvaluationProfileV1 {
  kind: "evaluation-profile";
  schemaVersion: EvaluationProfileV1SchemaVersion;
  profileRef: string;
  version: string;
  packRef: string;
  ruleSetRef: string | null;
  weightPolicy: EvaluationWeightPolicyV1;
  missingMeasurementPolicy: MissingMeasurementPolicyV1;
  statusThresholds: EvaluationStatusThresholdsV1;
  confidencePolicy: EvaluationConfidencePolicyV1;
  limits: EvaluationProfileLimitsV1;
  components: readonly EvaluationComponentDefinitionV1[];
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface EvaluationWarningV1 {
  kind: "evaluation-warning";
  code: EvaluationWarningCodeV1;
  targetRef: string;
  sourceRefs: readonly SourceReference[];
}

export interface EvaluationRawValueV1 {
  kind: "evaluation-raw-value";
  key: string;
  value: number | string | null;
  measurementRef: string;
}

export interface ComponentScoreV1 {
  kind: "component-score";
  schemaVersion: ComponentScoreV1SchemaVersion;
  componentScoreRef: string;
  componentRef: string;
  componentType: EvaluationComponentTypeV1;
  measurementRefs: readonly string[];
  rawValues: readonly EvaluationRawValueV1[];
  target: number | string | null;
  tolerance: number | null;
  normalizedScore: number;
  weight: number;
  effectiveWeight: number;
  weightedContribution: number;
  status: ComponentScoreStatusV1;
  warnings: readonly EvaluationWarningV1[];
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface EffectiveWeightV1 {
  kind: "effective-weight";
  componentRef: string;
  weight: number;
  effectiveWeight: number;
}

export interface ScoreV1 {
  kind: "score";
  schemaVersion: ScoreV1SchemaVersion;
  scoreRef: string;
  overallScore: number;
  componentScoreRefs: readonly SourceReference[];
  effectiveWeights: readonly EffectiveWeightV1[];
  measurementsUsed: readonly string[];
  warnings: readonly EvaluationWarningV1[];
  limits: EvaluationLimitsV1;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface ConfidenceInputsV1 {
  kind: "confidence-inputs";
  totalComponents: number;
  calculatedComponents: number;
  requiredComponents: number;
  calculatedRequiredComponents: number;
  optionalComponents: number;
  missingOptionalComponents: number;
  ambiguousMeasurements: number;
  warningCount: number;
}

export interface ConfidenceV1 {
  kind: "confidence";
  schemaVersion: ConfidenceV1SchemaVersion;
  confidenceRef: string;
  value: number;
  status: ConfidenceStatusV1;
  policy: EvaluationConfidencePolicyV1;
  inputs: ConfidenceInputsV1;
  reasons: readonly string[];
  warnings: readonly EvaluationWarningV1[];
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface EvaluationLimitsV1 {
  kind: "evaluation-limits";
  scoreMin: number;
  scoreMax: number;
  minComponents: number;
  weightNormalization: EvaluationWeightPolicyV1["normalization"];
  missingMeasurementPolicy: MissingMeasurementPolicyV1;
  statusThresholds: EvaluationStatusThresholdsV1;
  confidencePolicy: EvaluationConfidencePolicyV1;
}

export interface EvaluationV1 {
  kind: "evaluation";
  schemaVersion: EvaluationV1SchemaVersion;
  evaluationRef: string;
  operationRef: string;
  compositionRef: string;
  constructionRef: string | null;
  measurementResultRef: string;
  profileRef: string;
  packRef: string;
  ruleSetRef: string | null;
  componentScores: readonly ComponentScoreV1[];
  score: ScoreV1;
  confidence: ConfidenceV1;
  status: EvaluationStatusV1;
  warnings: readonly EvaluationWarningV1[];
  limits: EvaluationLimitsV1;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
  comparisonRefs: readonly SourceReference[];
  decisionRefs: readonly SourceReference[];
  explanationRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
}

export interface EvaluationInputV1 {
  kind: "evaluation-input";
  schemaVersion: "evaluation-input-v1";
  compositionRef: string;
  constructionRef: string | null;
  measurementResult: MeasurementResultV1;
  profile: EvaluationProfileV1;
  packRef: string;
  ruleSetRef: string | null;
  operationVersion: string;
  sourceRefs: readonly SourceReference[];
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
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  output?: TOutput | null;
}

type EvaluationValidation<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; result: CoreResult };

interface ComponentScoreBuild {
  component: EvaluationComponentDefinitionV1;
  measurements: readonly MeasurementV1[];
  normalizedScore: number;
  rawValues: readonly EvaluationRawValueV1[];
  status: ComponentScoreStatusV1;
  warnings: readonly EvaluationWarningV1[];
  sourceRefs: readonly SourceReference[];
}

interface ComponentMeasurementScore {
  normalizedScore: number;
  rawValues: readonly EvaluationRawValueV1[];
}

const EVALUATION_OPERATION_VERSION = "0.1.0";
const EVALUATION_OPERATION_REF = "evaluation.evaluateCompositionBasic";
const EPSILON = 1e-9;

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

const SOURCE_REFERENCE_ALLOWED_KEYS = ["kind", "ref"] as const;
const PROVENANCE_ALLOWED_KEYS = ["operationName", "operationVersion", "inputRefs", "source"] as const;
const WEIGHT_POLICY_ALLOWED_KEYS = ["kind", "normalization"] as const;
const MISSING_POLICY_ALLOWED_KEYS = ["kind", "required", "optional"] as const;
const STATUS_THRESHOLDS_ALLOWED_KEYS = [
  "kind",
  "match",
  "nearMatch",
  "weakMatch",
  "minimumConfidenceForNormalStatus",
] as const;
const CONFIDENCE_POLICY_ALLOWED_KEYS = [
  "kind",
  "highThreshold",
  "mediumThreshold",
  "optionalMissingPenalty",
  "ambiguousMeasurementPenalty",
  "warningPenalty",
] as const;
const PROFILE_LIMITS_ALLOWED_KEYS = ["kind", "scoreMin", "scoreMax", "minComponents"] as const;
const EVALUATION_LIMITS_ALLOWED_KEYS = [
  ...PROFILE_LIMITS_ALLOWED_KEYS,
  "weightNormalization",
  "missingMeasurementPolicy",
  "statusThresholds",
  "confidencePolicy",
] as const;
const PROFILE_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "profileRef",
  "version",
  "packRef",
  "ruleSetRef",
  "weightPolicy",
  "missingMeasurementPolicy",
  "statusThresholds",
  "confidencePolicy",
  "limits",
  "components",
  "sourceRefs",
  "provenance",
] as const;
const COMPONENT_ALLOWED_KEYS = [
  "kind",
  "componentRef",
  "componentType",
  "measurementType",
  "measurementRefs",
  "scoring",
  "weight",
  "required",
  "ambiguousMeasurementPolicy",
  "sourceRefs",
] as const;
const DISTANCE_SCORING_ALLOWED_KEYS = ["kind", "distanceBasis", "targetDistance", "tolerance"] as const;
const ALIGNMENT_SCORING_ALLOWED_KEYS = ["kind", "deltaBasis", "targetDelta", "tolerance"] as const;
const CONTAINMENT_SCORING_ALLOWED_KEYS = ["kind", "statusScores"] as const;
const CONTAINMENT_STATUS_SCORE_ALLOWED_KEYS = ["inside", "on_boundary", "partially_outside", "outside"] as const;
const OVERLAP_SCORING_ALLOWED_KEYS = ["kind", "overlapBasis", "tolerance"] as const;
const COVERAGE_SCORING_ALLOWED_KEYS = ["kind", "valueBasis", "target", "tolerance"] as const;
const RATIO_SCORING_ALLOWED_KEYS = ["kind", "deltaBasis", "targetRatio", "tolerance"] as const;
const EVALUATION_INPUT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "compositionRef",
  "constructionRef",
  "measurementResult",
  "profile",
  "packRef",
  "ruleSetRef",
  "operationVersion",
  "sourceRefs",
] as const;
const WARNING_ALLOWED_KEYS = ["kind", "code", "targetRef", "sourceRefs"] as const;
const RAW_VALUE_ALLOWED_KEYS = ["kind", "key", "value", "measurementRef"] as const;
const COMPONENT_SCORE_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "componentScoreRef",
  "componentRef",
  "componentType",
  "measurementRefs",
  "rawValues",
  "target",
  "tolerance",
  "normalizedScore",
  "weight",
  "effectiveWeight",
  "weightedContribution",
  "status",
  "warnings",
  "sourceRefs",
  "provenance",
] as const;
const EFFECTIVE_WEIGHT_ALLOWED_KEYS = ["kind", "componentRef", "weight", "effectiveWeight"] as const;
const SCORE_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "scoreRef",
  "overallScore",
  "componentScoreRefs",
  "effectiveWeights",
  "measurementsUsed",
  "warnings",
  "limits",
  "sourceRefs",
  "provenance",
] as const;
const CONFIDENCE_INPUTS_ALLOWED_KEYS = [
  "kind",
  "totalComponents",
  "calculatedComponents",
  "requiredComponents",
  "calculatedRequiredComponents",
  "optionalComponents",
  "missingOptionalComponents",
  "ambiguousMeasurements",
  "warningCount",
] as const;
const CONFIDENCE_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "confidenceRef",
  "value",
  "status",
  "policy",
  "inputs",
  "reasons",
  "warnings",
  "sourceRefs",
  "provenance",
] as const;
const EVALUATION_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "evaluationRef",
  "operationRef",
  "compositionRef",
  "constructionRef",
  "measurementResultRef",
  "profileRef",
  "packRef",
  "ruleSetRef",
  "componentScores",
  "score",
  "confidence",
  "status",
  "warnings",
  "limits",
  "sourceRefs",
  "provenance",
  "comparisonRefs",
  "decisionRefs",
  "explanationRefs",
  "artifactRefs",
] as const;

export function validateEvaluationProfileV1(profile: unknown, measurementResult?: unknown): CoreResult<EvaluationProfileV1> {
  const validation = validateEvaluationProfileValue(profile, measurementResult);
  if (!validation.ok) {
    return validation.result as CoreResult<EvaluationProfileV1>;
  }

  return createEvaluationResult({
    status: "ok",
    provenance: createEvaluationProvenance("core.evaluation-profile-v1.validate", [
      { kind: "evaluation-profile", ref: validation.value.profileRef },
    ]),
    outputRefs: [{ kind: "evaluation-profile", ref: validation.value.profileRef }],
    output: validation.value,
  });
}

export function evaluateCompositionBasicV1(input: unknown): CoreResult<EvaluationV1> {
  const validation = validateEvaluationInputValue(input);
  if (!validation.ok) {
    return validation.result as CoreResult<EvaluationV1>;
  }

  const { measurementResult, profile } = validation.value;
  const measurementByRef = new Map(measurementResult.measurements.map((measurement) => [measurement.measurementRef, measurement]));
  const evaluationRef = evaluationRefFor(validation.value);
  const missingOptionalWarnings: EvaluationWarningV1[] = [];
  const componentBuilds: ComponentScoreBuild[] = [];
  let missingOptionalComponents = 0;
  let ambiguousMeasurementCount = 0;

  for (const component of sortedComponents(profile.components)) {
    const selectedMeasurements = component.measurementRefs.map((measurementRef) => measurementByRef.get(measurementRef));
    if (selectedMeasurements.some((measurement) => measurement === undefined)) {
      if (component.required) {
        return missingEvaluationMeasurement(component.componentRef, "Required evaluation component references a missing measurement.") as CoreResult<EvaluationV1>;
      }
      missingOptionalComponents += 1;
      missingOptionalWarnings.push(evaluationWarning("OptionalComponentMissing", component.componentRef, component.sourceRefs));
      continue;
    }

    const measurements = selectedMeasurements as MeasurementV1[];
    const incompatible = measurements.find((measurement) => measurement.measurementType !== component.measurementType);
    if (incompatible !== undefined) {
      return incompatibleEvaluationMeasurement(
        component.componentRef,
        `Evaluation component expects ${component.measurementType} but received ${incompatible.measurementType}.`,
      ) as CoreResult<EvaluationV1>;
    }

    const ambiguousMeasurements = measurements.filter(isAmbiguousMeasurement);
    if (ambiguousMeasurements.length > 0 && component.ambiguousMeasurementPolicy === "fail") {
      return incompatibleEvaluationMeasurement(component.componentRef, "Ambiguous measurement is not allowed by the component policy.") as CoreResult<EvaluationV1>;
    }

    ambiguousMeasurementCount += ambiguousMeasurements.length;
    const componentWarnings = ambiguousMeasurements.length === 0
      ? []
      : [evaluationWarning("AmbiguousMeasurementUsed", component.componentRef, ambiguousMeasurements.map(measurementSourceReference))];
    const build = scoreComponent(component, measurements, componentWarnings);
    if (!build.ok) {
      return build.result as CoreResult<EvaluationV1>;
    }
    componentBuilds.push(build.value);
  }

  if (missingOptionalComponents > 0) {
    missingOptionalWarnings.push(evaluationWarning("PartialEvaluation", profile.profileRef, profile.sourceRefs));
  }

  if (componentBuilds.length < profile.limits.minComponents) {
    return invalidEvaluation("componentScores", "Evaluation requires at least the profile-declared minimum calculated components.") as CoreResult<EvaluationV1>;
  }

  const includedWeightTotal = componentBuilds.reduce((total, build) => total + build.component.weight, 0);
  if (!isPositiveFiniteNumber(includedWeightTotal)) {
    return invalidEvaluationWeights("components", "Calculated evaluation components have zero total weight.") as CoreResult<EvaluationV1>;
  }

  const componentScores = componentBuilds.map((build) => {
    const effectiveWeight = build.component.weight / includedWeightTotal;
    return createComponentScore(evaluationRef, build, effectiveWeight);
  });
  const preConfidenceWarnings = uniqueEvaluationWarnings([
    ...missingOptionalWarnings,
    ...componentScores.flatMap((componentScore) => componentScore.warnings),
  ]);
  const confidence = createConfidence(evaluationRef, profile, {
    totalComponents: profile.components.length,
    calculatedComponents: componentScores.length,
    requiredComponents: profile.components.filter((component) => component.required).length,
    calculatedRequiredComponents: componentScores.filter((componentScore) => {
      const component = profile.components.find((candidate) => candidate.componentRef === componentScore.componentRef);
      return component?.required === true;
    }).length,
    optionalComponents: profile.components.filter((component) => !component.required).length,
    missingOptionalComponents,
    ambiguousMeasurements: ambiguousMeasurementCount,
    warningCount: preConfidenceWarnings.length,
  });
  const confidenceWarnings = confidence.value < 1
    ? [evaluationWarning("ConfidenceReduced", confidence.confidenceRef, confidence.sourceRefs)]
    : [];
  const warnings = uniqueEvaluationWarnings([...preConfidenceWarnings, ...confidenceWarnings]);
  const confidenceWithWarnings: ConfidenceV1 = {
    ...confidence,
    warnings: confidenceWarnings,
  };
  const limits = evaluationLimits(profile);
  const score = createScore(evaluationRef, profile, componentScores, warnings, limits);
  const status = statusForScore(score.overallScore, confidenceWithWarnings.value, profile.statusThresholds);
  const sourceRefs = uniqueSourceRefs([
    ...validation.value.sourceRefs,
    { kind: "measurement-result", ref: measurementResult.measurementResultRef },
    { kind: "evaluation-profile", ref: profile.profileRef },
    ...componentScores.flatMap((componentScore) => componentScore.sourceRefs),
  ]);
  const output: EvaluationV1 = {
    kind: "evaluation",
    schemaVersion: EVALUATION_V1_SCHEMA_VERSION,
    evaluationRef,
    operationRef: EVALUATION_OPERATION_REF,
    compositionRef: validation.value.compositionRef,
    constructionRef: validation.value.constructionRef,
    measurementResultRef: measurementResult.measurementResultRef,
    profileRef: profile.profileRef,
    packRef: profile.packRef,
    ruleSetRef: profile.ruleSetRef,
    componentScores,
    score,
    confidence: confidenceWithWarnings,
    status,
    warnings,
    limits,
    sourceRefs,
    provenance: createEvaluationProvenance("core.evaluation-v1.evaluateCompositionBasic", sourceRefs),
    comparisonRefs: [],
    decisionRefs: [],
    explanationRefs: [],
    artifactRefs: [],
  };

  const outputValidation = validateEvaluationValue(output);
  if (!outputValidation.ok) {
    return outputValidation.result as CoreResult<EvaluationV1>;
  }

  return createEvaluationResult({
    status: "ok",
    provenance: output.provenance,
    outputRefs: [
      { kind: "evaluation", ref: output.evaluationRef },
      { kind: "score", ref: output.score.scoreRef },
      { kind: "confidence", ref: output.confidence.confidenceRef },
      ...output.componentScores.map((componentScore) => ({ kind: "component-score", ref: componentScore.componentScoreRef })),
    ],
    output,
  });
}

export function validateEvaluationV1(value: unknown): CoreResult<EvaluationV1> {
  const validation = validateEvaluationValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<EvaluationV1>;
  }

  return createEvaluationResult({
    status: "ok",
    provenance: createEvaluationProvenance("core.evaluation-v1.validate", [
      { kind: "evaluation", ref: validation.value.evaluationRef },
    ]),
    outputRefs: [{ kind: "evaluation", ref: validation.value.evaluationRef }],
    output: validation.value,
  });
}

function validateEvaluationInputValue(input: unknown): EvaluationValidation<EvaluationInputV1> {
  if (!isRecord(input)) {
    return failedEvaluation(missingEvaluationInput("evaluationInput", "Evaluation requires a structured input."));
  }

  const unsupportedField = firstUnsupportedKey(input, EVALUATION_INPUT_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedEvaluation(invalidEvaluation(unsupportedField, `Evaluation input field is outside scope: ${unsupportedField}.`));
  }

  if (input.kind !== "evaluation-input" || input.schemaVersion !== "evaluation-input-v1") {
    return failedEvaluation(invalidEvaluation("schemaVersion", "Evaluation input requires the evaluation-input-v1 schema."));
  }

  if (!isNonEmptyString(input.compositionRef)
    || !(input.constructionRef === null || isNonEmptyString(input.constructionRef))
    || !isNonEmptyString(input.packRef)
    || !(input.ruleSetRef === null || isNonEmptyString(input.ruleSetRef))
    || input.operationVersion !== EVALUATION_OPERATION_VERSION
    || !isSourceReferenceArray(input.sourceRefs)
    || input.sourceRefs.length === 0) {
    return failedEvaluation(invalidEvaluation("evaluationInput", "Evaluation input refs and operation version are invalid."));
  }

  const measurementValidation = validateMeasurementResultV1(input.measurementResult);
  if (measurementValidation.status !== "ok" || measurementValidation.output === null) {
    return failedEvaluation(measurementValidation);
  }

  const profileValidation = validateEvaluationProfileValue(input.profile);
  if (!profileValidation.ok) {
    return profileValidation;
  }

  if (input.packRef !== profileValidation.value.packRef || input.ruleSetRef !== profileValidation.value.ruleSetRef) {
    return failedEvaluation(invalidEvaluationProfile("profile", "Evaluation input packRef and ruleSetRef must match the profile."));
  }

  return validEvaluation({
    kind: "evaluation-input",
    schemaVersion: "evaluation-input-v1",
    compositionRef: input.compositionRef,
    constructionRef: input.constructionRef,
    measurementResult: measurementValidation.output,
    profile: profileValidation.value,
    packRef: input.packRef,
    ruleSetRef: input.ruleSetRef,
    operationVersion: input.operationVersion,
    sourceRefs: input.sourceRefs,
  });
}

function validateEvaluationProfileValue(profile: unknown, measurementResult?: unknown): EvaluationValidation<EvaluationProfileV1> {
  if (!isRecord(profile)) {
    return failedEvaluation(invalidEvaluationProfile("profile", "EvaluationProfile V1 must be a structured object."));
  }

  const unsupportedField = firstUnsupportedKey(profile, PROFILE_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedEvaluation(invalidEvaluationProfile(unsupportedField, `EvaluationProfile V1 field is outside scope: ${unsupportedField}.`));
  }

  if (profile.kind !== "evaluation-profile" || profile.schemaVersion !== EVALUATION_PROFILE_V1_SCHEMA_VERSION) {
    return failedEvaluation(invalidEvaluationProfile("schemaVersion", "EvaluationProfile V1 kind and schemaVersion are required."));
  }

  if (!isNonEmptyString(profile.profileRef)
    || !isNonEmptyString(profile.version)
    || !isNonEmptyString(profile.packRef)
    || !(profile.ruleSetRef === null || isNonEmptyString(profile.ruleSetRef))
    || !isSourceReferenceArray(profile.sourceRefs)
    || profile.sourceRefs.length === 0
    || !isProvenance(profile.provenance)) {
    return failedEvaluation(invalidEvaluationProfile("profile", "EvaluationProfile V1 identity, refs, or provenance are invalid."));
  }

  const policyFailure = firstFailure([
    validateWeightPolicy(profile.weightPolicy),
    validateMissingMeasurementPolicy(profile.missingMeasurementPolicy),
    validateStatusThresholds(profile.statusThresholds),
    validateConfidencePolicy(profile.confidencePolicy),
    validateProfileLimits(profile.limits),
  ]);
  if (policyFailure !== null) {
    return failedEvaluation(policyFailure);
  }

  if (!Array.isArray(profile.components) || profile.components.length === 0) {
    return failedEvaluation(invalidEvaluationProfile("components", "EvaluationProfile V1 requires at least one component."));
  }

  const components: EvaluationComponentDefinitionV1[] = [];
  for (const component of profile.components) {
    const componentValidation = validateComponentDefinition(component);
    if (!componentValidation.ok) {
      return componentValidation;
    }
    components.push(componentValidation.value);
  }

  if (new Set(components.map((component) => component.componentRef)).size !== components.length) {
    return failedEvaluation(invalidEvaluationProfile("components", "EvaluationProfile componentRef values must be unique."));
  }

  const totalWeight = components.reduce((total, component) => total + component.weight, 0);
  if (!isPositiveFiniteNumber(totalWeight)) {
    return failedEvaluation(invalidEvaluationWeights("components", "EvaluationProfile component weights must have positive total weight."));
  }

  if (measurementResult !== undefined) {
    const measurementValidation = validateMeasurementResultV1(measurementResult);
    if (measurementValidation.status !== "ok" || measurementValidation.output === null) {
      return failedEvaluation(measurementValidation);
    }
    const compatibilityFailure = validateProfileMeasurementCompatibility(components, measurementValidation.output);
    if (compatibilityFailure !== null) {
      return failedEvaluation(compatibilityFailure);
    }
  }

  return validEvaluation({
    kind: "evaluation-profile",
    schemaVersion: EVALUATION_PROFILE_V1_SCHEMA_VERSION,
    profileRef: profile.profileRef,
    version: profile.version,
    packRef: profile.packRef,
    ruleSetRef: profile.ruleSetRef,
    weightPolicy: profile.weightPolicy as EvaluationWeightPolicyV1,
    missingMeasurementPolicy: profile.missingMeasurementPolicy as MissingMeasurementPolicyV1,
    statusThresholds: profile.statusThresholds as EvaluationStatusThresholdsV1,
    confidencePolicy: profile.confidencePolicy as EvaluationConfidencePolicyV1,
    limits: profile.limits as EvaluationProfileLimitsV1,
    components,
    sourceRefs: profile.sourceRefs,
    provenance: profile.provenance,
  });
}

function validateComponentDefinition(value: unknown): EvaluationValidation<EvaluationComponentDefinitionV1> {
  if (!isRecord(value)) {
    return failedEvaluation(invalidEvaluationProfile("components", "Evaluation component definition must be structured."));
  }

  const unsupportedField = firstUnsupportedKey(value, COMPONENT_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedEvaluation(invalidEvaluationProfile(`components.${unsupportedField}`, `Evaluation component field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "evaluation-component-definition" || !isNonEmptyString(value.componentRef)) {
    return failedEvaluation(invalidEvaluationProfile("components", "Evaluation component definition identity is invalid."));
  }

  if (!isEvaluationComponentType(value.componentType)) {
    return failedEvaluation(unsupportedEvaluationComponent(value.componentRef, `Unsupported evaluation component type: ${String(value.componentType)}.`));
  }

  if (!isMeasurementTypeForEvaluation(value.measurementType)
    || !isNonEmptyStringArray(value.measurementRefs)
    || typeof value.required !== "boolean"
    || !isAmbiguousMeasurementPolicy(value.ambiguousMeasurementPolicy)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0) {
    return failedEvaluation(invalidEvaluationProfile("components", "Evaluation component definition shape is invalid."));
  }

  if (!isNonNegativeFiniteNumber(value.weight)) {
    return failedEvaluation(invalidEvaluationWeights("components.weight", "Evaluation component weight must be finite and non-negative."));
  }

  if (new Set(value.measurementRefs).size !== value.measurementRefs.length) {
    return failedEvaluation(invalidEvaluationProfile("measurementRefs", "Evaluation component measurementRefs must be unique."));
  }

  if (!componentTypeMatchesMeasurementType(value.componentType, value.measurementType)) {
    return failedEvaluation(incompatibleEvaluationMeasurement(value.componentRef, "Evaluation component type is incompatible with its declared measurement type."));
  }

  const scoringFailure = validateComponentScoring(value.componentType, value.scoring);
  if (scoringFailure !== null) {
    return failedEvaluation(scoringFailure);
  }

  return validEvaluation(value as unknown as EvaluationComponentDefinitionV1);
}

function validateProfileMeasurementCompatibility(
  components: readonly EvaluationComponentDefinitionV1[],
  measurementResult: MeasurementResultV1,
): CoreResult | null {
  const measurementByRef = new Map(measurementResult.measurements.map((measurement) => [measurement.measurementRef, measurement]));
  for (const component of components) {
    for (const measurementRef of component.measurementRefs) {
      const measurement = measurementByRef.get(measurementRef);
      if (measurement === undefined) {
        return missingEvaluationMeasurement(measurementRef, `Evaluation component references an unknown measurement: ${measurementRef}.`);
      }
      if (measurement.measurementType !== component.measurementType) {
        return incompatibleEvaluationMeasurement(component.componentRef, `Evaluation component expects ${component.measurementType} but references ${measurement.measurementType}.`);
      }
    }
  }
  return null;
}

function validateWeightPolicy(value: unknown): CoreResult | null {
  return isRecord(value)
    && firstUnsupportedKey(value, WEIGHT_POLICY_ALLOWED_KEYS) === null
    && value.kind === "evaluation-weight-policy"
    && value.normalization === "normalize-total-positive"
    ? null
    : invalidEvaluationProfile("weightPolicy", "Evaluation weight policy must normalize a positive total weight.");
}

function validateMissingMeasurementPolicy(value: unknown): CoreResult | null {
  return isRecord(value)
    && firstUnsupportedKey(value, MISSING_POLICY_ALLOWED_KEYS) === null
    && value.kind === "missing-measurement-policy"
    && value.required === "fail"
    && value.optional === "renormalize_remaining"
    ? null
    : invalidEvaluationProfile("missingMeasurementPolicy", "Evaluation missing-measurement policy is invalid.");
}

function validateStatusThresholds(value: unknown): CoreResult | null {
  if (!isRecord(value) || firstUnsupportedKey(value, STATUS_THRESHOLDS_ALLOWED_KEYS) !== null || value.kind !== "evaluation-status-thresholds") {
    return invalidEvaluationThresholds("statusThresholds", "Evaluation status thresholds must be structured.");
  }

  if (![value.match, value.nearMatch, value.weakMatch, value.minimumConfidenceForNormalStatus].every(isNormalizedNumber)) {
    return invalidEvaluationThresholds("statusThresholds", "Evaluation status thresholds must be finite values in [0,1].");
  }

  const match = value.match as number;
  const nearMatch = value.nearMatch as number;
  const weakMatch = value.weakMatch as number;

  return match >= nearMatch && nearMatch >= weakMatch
    ? null
    : invalidEvaluationThresholds("statusThresholds", "Evaluation status thresholds must be monotonically ordered.");
}

function validateConfidencePolicy(value: unknown): CoreResult | null {
  if (!isRecord(value) || firstUnsupportedKey(value, CONFIDENCE_POLICY_ALLOWED_KEYS) !== null || value.kind !== "evaluation-confidence-policy") {
    return invalidEvaluationProfile("confidencePolicy", "Evaluation confidence policy must be structured.");
  }

  if (![value.highThreshold, value.mediumThreshold, value.optionalMissingPenalty, value.ambiguousMeasurementPenalty, value.warningPenalty].every(isNormalizedNumber)) {
    return invalidEvaluationProfile("confidencePolicy", "Evaluation confidence policy values must be finite values in [0,1].");
  }

  const highThreshold = value.highThreshold as number;
  const mediumThreshold = value.mediumThreshold as number;

  return highThreshold >= mediumThreshold
    ? null
    : invalidEvaluationProfile("confidencePolicy", "Evaluation confidence thresholds must be ordered.");
}

function validateProfileLimits(value: unknown): CoreResult | null {
  return isRecord(value)
    && firstUnsupportedKey(value, PROFILE_LIMITS_ALLOWED_KEYS) === null
    && value.kind === "evaluation-profile-limits"
    && value.scoreMin === 0
    && value.scoreMax === 1
    && isPositiveInteger(value.minComponents)
    ? null
    : invalidEvaluationProfile("limits", "Evaluation profile limits must declare normalized [0,1] scoring and minComponents.");
}

function validateComponentScoring(componentType: EvaluationComponentTypeV1, scoring: unknown): CoreResult | null {
  if (!isRecord(scoring)) {
    return invalidEvaluationProfile("scoring", "Evaluation component scoring policy must be structured.");
  }

  if (componentType === "guide_proximity") {
    return firstUnsupportedKey(scoring, DISTANCE_SCORING_ALLOWED_KEYS) === null
      && scoring.kind === "linear-distance-tolerance"
      && scoring.distanceBasis === "normalizedDistance"
      && scoring.targetDistance === 0
      && isPositiveFiniteNumber(scoring.tolerance)
      ? null
      : invalidEvaluationProfile("scoring", "Guide proximity requires positive linear normalized distance tolerance.");
  }

  if (componentType === "alignment") {
    return firstUnsupportedKey(scoring, ALIGNMENT_SCORING_ALLOWED_KEYS) === null
      && scoring.kind === "linear-alignment-tolerance"
      && scoring.deltaBasis === "normalizedDelta"
      && scoring.targetDelta === 0
      && isPositiveFiniteNumber(scoring.tolerance)
      ? null
      : invalidEvaluationProfile("scoring", "Alignment requires positive linear normalized delta tolerance.");
  }

  if (componentType === "containment") {
    return validateContainmentScoring(scoring);
  }

  if (componentType === "overlap_penalty") {
    return firstUnsupportedKey(scoring, OVERLAP_SCORING_ALLOWED_KEYS) === null
      && scoring.kind === "overlap-linear-penalty"
      && scoring.overlapBasis === "maxOverlapRatio"
      && isPositiveFiniteNumber(scoring.tolerance)
      ? null
      : invalidEvaluationProfile("scoring", "Overlap penalty requires positive maxOverlapRatio tolerance.");
  }

  if (componentType === "coverage_match") {
    return firstUnsupportedKey(scoring, COVERAGE_SCORING_ALLOWED_KEYS) === null
      && scoring.kind === "target-closeness"
      && scoring.valueBasis === "coverageRatio"
      && isNormalizedNumber(scoring.target)
      && isPositiveFiniteNumber(scoring.tolerance)
      ? null
      : invalidEvaluationProfile("scoring", "Coverage match requires target coverage and positive tolerance.");
  }

  return firstUnsupportedKey(scoring, RATIO_SCORING_ALLOWED_KEYS) === null
    && scoring.kind === "ratio-target-closeness"
    && scoring.deltaBasis === "absoluteDelta"
    && isNonNegativeFiniteNumber(scoring.targetRatio)
    && isPositiveFiniteNumber(scoring.tolerance)
    ? null
    : invalidEvaluationProfile("scoring", "Area ratio match requires target ratio and positive tolerance.");
}

function validateContainmentScoring(scoring: Record<string, unknown>): CoreResult | null {
  const statusScores = scoring.statusScores;
  if (firstUnsupportedKey(scoring, CONTAINMENT_SCORING_ALLOWED_KEYS) !== null
    || scoring.kind !== "containment-status-map"
    || !isRecord(statusScores)
    || firstUnsupportedKey(statusScores, CONTAINMENT_STATUS_SCORE_ALLOWED_KEYS) !== null) {
    return invalidEvaluationProfile("scoring", "Containment scoring requires a closed status score map.");
  }

  return CONTAINMENT_STATUS_SCORE_ALLOWED_KEYS.every((key) => isNormalizedNumber(statusScores[key]))
    ? null
    : invalidEvaluationProfile("scoring.statusScores", "Containment status scores must be normalized.");
}

function scoreComponent(
  component: EvaluationComponentDefinitionV1,
  measurements: readonly MeasurementV1[],
  warnings: readonly EvaluationWarningV1[],
): EvaluationValidation<ComponentScoreBuild> {
  const measurementScores: ComponentMeasurementScore[] = [];
  for (const measurement of measurements) {
    const measurementScore = scoreMeasurement(component, measurement);
    if (measurementScore === null) {
      return failedEvaluation(incompatibleEvaluationMeasurement(component.componentRef, "Evaluation component cannot score the referenced measurement."));
    }
    measurementScores.push(measurementScore);
  }

  const normalizedScore = clamp(
    measurementScores.reduce((total, measurementScore) => total + measurementScore.normalizedScore, 0) / measurementScores.length,
    0,
    1,
  );
  return validEvaluation({
    component,
    measurements,
    normalizedScore,
    rawValues: measurementScores.flatMap((measurementScore) => measurementScore.rawValues),
    status: warnings.some((warning) => warning.code === "AmbiguousMeasurementUsed") ? "ambiguous" : "calculated",
    warnings,
    sourceRefs: uniqueSourceRefs([
      { kind: "evaluation-component", ref: component.componentRef },
      ...component.sourceRefs,
      ...measurements.map(measurementSourceReference),
      ...measurements.flatMap((measurement) => measurement.sourceRefs),
    ]),
  });
}

function scoreMeasurement(component: EvaluationComponentDefinitionV1, measurement: MeasurementV1): ComponentMeasurementScore | null {
  if (component.componentType === "guide_proximity" && measurement.measurementType === "distance") {
    const scoring = component.scoring as LinearDistanceScoringV1;
    const value = (measurement as DistanceMeasurementV1).result.normalizedDistance;
    return {
      normalizedScore: clamp(1 - Math.abs(value - scoring.targetDistance) / scoring.tolerance, 0, 1),
      rawValues: [rawValue("normalizedDistance", value, measurement.measurementRef)],
    };
  }

  if (component.componentType === "alignment" && measurement.measurementType === "alignment") {
    const scoring = component.scoring as LinearAlignmentScoringV1;
    const value = (measurement as AlignmentMeasurementV1).result.normalizedDelta;
    return {
      normalizedScore: clamp(1 - Math.abs(value - scoring.targetDelta) / scoring.tolerance, 0, 1),
      rawValues: [
        rawValue("normalizedDelta", value, measurement.measurementRef),
        rawValue("alignmentStatus", (measurement as AlignmentMeasurementV1).result.alignmentStatus, measurement.measurementRef),
      ],
    };
  }

  if (component.componentType === "containment" && measurement.measurementType === "containment") {
    const scoring = component.scoring as ContainmentStatusMapScoringV1;
    const status = measurement.result.containmentStatus;
    return {
      normalizedScore: scoring.statusScores[status],
      rawValues: [rawValue("containmentStatus", status, measurement.measurementRef)],
    };
  }

  if (component.componentType === "overlap_penalty" && measurement.measurementType === "overlap") {
    const scoring = component.scoring as OverlapPenaltyScoringV1;
    const overlap = measurement as OverlapMeasurementV1;
    const basis = Math.max(overlap.result.overlapRatioA, overlap.result.overlapRatioB);
    return {
      normalizedScore: clamp(1 - basis / scoring.tolerance, 0, 1),
      rawValues: [
        rawValue("maxOverlapRatio", basis, measurement.measurementRef),
        rawValue("overlapStatus", overlap.result.overlapStatus, measurement.measurementRef),
      ],
    };
  }

  if (component.componentType === "coverage_match" && measurement.measurementType === "coverage") {
    const scoring = component.scoring as TargetClosenessScoringV1;
    const value = (measurement as CoverageMeasurementV1).result.coverageRatio;
    return {
      normalizedScore: clamp(1 - Math.abs(value - scoring.target) / scoring.tolerance, 0, 1),
      rawValues: [rawValue("coverageRatio", value, measurement.measurementRef)],
    };
  }

  if (component.componentType === "area_ratio_match" && measurement.measurementType === "ratio") {
    const scoring = component.scoring as RatioTargetClosenessScoringV1;
    const ratio = measurement as RatioMeasurementV1;
    const delta = ratio.result.absoluteDelta ?? Math.abs(ratio.result.ratio - scoring.targetRatio);
    return {
      normalizedScore: clamp(1 - delta / scoring.tolerance, 0, 1),
      rawValues: [
        rawValue("ratio", ratio.result.ratio, measurement.measurementRef),
        rawValue("absoluteDelta", delta, measurement.measurementRef),
      ],
    };
  }

  return null;
}

function createComponentScore(
  evaluationRef: string,
  build: ComponentScoreBuild,
  effectiveWeight: number,
): ComponentScoreV1 {
  const weightedContribution = build.normalizedScore * effectiveWeight;
  const measurementRefs = build.measurements.map((measurement) => measurement.measurementRef);
  const componentScoreRef = `${evaluationRef}:component-score:${build.component.componentRef}`;
  return {
    kind: "component-score",
    schemaVersion: COMPONENT_SCORE_V1_SCHEMA_VERSION,
    componentScoreRef,
    componentRef: build.component.componentRef,
    componentType: build.component.componentType,
    measurementRefs,
    rawValues: build.rawValues,
    target: componentTarget(build.component),
    tolerance: componentTolerance(build.component),
    normalizedScore: build.normalizedScore,
    weight: build.component.weight,
    effectiveWeight,
    weightedContribution,
    status: build.status,
    warnings: build.warnings,
    sourceRefs: build.sourceRefs,
    provenance: createEvaluationProvenance("core.evaluation-v1.component-score", [
      { kind: "component-score", ref: componentScoreRef },
      { kind: "evaluation-component", ref: build.component.componentRef },
      ...measurementRefs.map((ref) => ({ kind: "measurement", ref })),
      { kind: "evaluation-operation", ref: EVALUATION_OPERATION_REF },
    ]),
  };
}

function createScore(
  evaluationRef: string,
  profile: EvaluationProfileV1,
  componentScores: readonly ComponentScoreV1[],
  warnings: readonly EvaluationWarningV1[],
  limits: EvaluationLimitsV1,
): ScoreV1 {
  const scoreRef = `${evaluationRef}:score`;
  const sourceRefs = uniqueSourceRefs([
    { kind: "score", ref: scoreRef },
    { kind: "evaluation-profile", ref: profile.profileRef },
    ...componentScores.map((componentScore) => ({ kind: "component-score", ref: componentScore.componentScoreRef })),
    ...componentScores.flatMap((componentScore) => componentScore.sourceRefs),
  ]);
  return {
    kind: "score",
    schemaVersion: SCORE_V1_SCHEMA_VERSION,
    scoreRef,
    overallScore: componentScores.reduce((total, componentScore) => total + componentScore.weightedContribution, 0),
    componentScoreRefs: componentScores.map((componentScore) => ({ kind: "component-score", ref: componentScore.componentScoreRef })),
    effectiveWeights: componentScores.map((componentScore) => ({
      kind: "effective-weight",
      componentRef: componentScore.componentRef,
      weight: componentScore.weight,
      effectiveWeight: componentScore.effectiveWeight,
    })),
    measurementsUsed: uniqueStrings(componentScores.flatMap((componentScore) => componentScore.measurementRefs)),
    warnings,
    limits,
    sourceRefs,
    provenance: createEvaluationProvenance("core.evaluation-v1.score", sourceRefs),
  };
}

function createConfidence(
  evaluationRef: string,
  profile: EvaluationProfileV1,
  inputs: Omit<ConfidenceInputsV1, "kind">,
): ConfidenceV1 {
  const confidenceRef = `${evaluationRef}:confidence`;
  const policy = profile.confidencePolicy;
  const value = clamp(1
    - inputs.missingOptionalComponents * policy.optionalMissingPenalty
    - inputs.ambiguousMeasurements * policy.ambiguousMeasurementPenalty
    - inputs.warningCount * policy.warningPenalty, 0, 1);
  const sourceRefs = uniqueSourceRefs([
    { kind: "confidence", ref: confidenceRef },
    { kind: "evaluation-profile", ref: profile.profileRef },
  ]);

  return {
    kind: "confidence",
    schemaVersion: CONFIDENCE_V1_SCHEMA_VERSION,
    confidenceRef,
    value,
    status: confidenceStatus(value, policy),
    policy,
    inputs: { kind: "confidence-inputs", ...inputs },
    reasons: confidenceReasons(inputs),
    warnings: [],
    sourceRefs,
    provenance: createEvaluationProvenance("core.evaluation-v1.confidence", [
      ...sourceRefs,
      { kind: "confidence-policy", ref: profile.profileRef },
      { kind: "evaluation-operation", ref: EVALUATION_OPERATION_REF },
    ]),
  };
}

function validateEvaluationValue(value: unknown): EvaluationValidation<EvaluationV1> {
  if (!isRecord(value)) {
    return failedEvaluation(invalidEvaluation("evaluation", "Evaluation V1 must be a structured object."));
  }

  const unsupportedField = firstUnsupportedKey(value, EVALUATION_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedEvaluation(invalidEvaluation(unsupportedField, `Evaluation V1 field is outside scope: ${unsupportedField}.`));
  }

  if (value.kind !== "evaluation"
    || value.schemaVersion !== EVALUATION_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.evaluationRef)
    || value.operationRef !== EVALUATION_OPERATION_REF
    || !isNonEmptyString(value.compositionRef)
    || !(value.constructionRef === null || isNonEmptyString(value.constructionRef))
    || !isNonEmptyString(value.measurementResultRef)
    || !isNonEmptyString(value.profileRef)
    || !isNonEmptyString(value.packRef)
    || !(value.ruleSetRef === null || isNonEmptyString(value.ruleSetRef))
    || !Array.isArray(value.componentScores)
    || value.componentScores.length === 0
    || !isEvaluationStatus(value.status)
    || !isEvaluationWarningArray(value.warnings)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)
    || !isEmptySourceReferenceArray(value.comparisonRefs)
    || !isEmptySourceReferenceArray(value.decisionRefs)
    || !isEmptySourceReferenceArray(value.explanationRefs)
    || !isEmptySourceReferenceArray(value.artifactRefs)) {
    return failedEvaluation(invalidEvaluation("evaluation", "Evaluation V1 envelope is invalid."));
  }

  const componentScores = value.componentScores.map((componentScore) => validateComponentScoreValue(componentScore));
  const invalidComponentScore = componentScores.find((componentScore) => !componentScore.ok);
  if (invalidComponentScore !== undefined && !invalidComponentScore.ok) {
    return invalidComponentScore;
  }
  const validComponentScores = componentScores.map((componentScore) => (componentScore as { ok: true; value: ComponentScoreV1 }).value);
  if (new Set(validComponentScores.map((componentScore) => componentScore.componentScoreRef)).size !== validComponentScores.length) {
    return failedEvaluation(invalidEvaluation("componentScores", "ComponentScore refs must be unique."));
  }

  const limitsValidation = validateEvaluationLimitsValue(value.limits);
  if (!limitsValidation.ok) {
    return limitsValidation;
  }

  const scoreValidation = validateScoreValue(value.score, validComponentScores, limitsValidation.value);
  if (!scoreValidation.ok) {
    return scoreValidation;
  }

  const confidenceValidation = validateConfidenceValue(value.confidence);
  if (!confidenceValidation.ok) {
    return confidenceValidation;
  }

  if (value.status !== statusForScore(scoreValidation.value.overallScore, confidenceValidation.value.value, limitsValidation.value.statusThresholds)) {
    return failedEvaluation(invalidEvaluation("status", "Evaluation status is inconsistent with score, confidence, and thresholds."));
  }

  return validEvaluation(value as unknown as EvaluationV1);
}

function validateComponentScoreValue(value: unknown): EvaluationValidation<ComponentScoreV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, COMPONENT_SCORE_ALLOWED_KEYS) !== null) {
    return failedEvaluation(invalidEvaluation("componentScores", "ComponentScore V1 must be closed and structured."));
  }

  if (value.kind !== "component-score"
    || value.schemaVersion !== COMPONENT_SCORE_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.componentScoreRef)
    || !isNonEmptyString(value.componentRef)
    || !isEvaluationComponentType(value.componentType)
    || !isNonEmptyStringArray(value.measurementRefs)
    || !Array.isArray(value.rawValues)
    || !value.rawValues.every(isRawValue)
    || !(typeof value.target === "number" || typeof value.target === "string" || value.target === null)
    || !isNullablePositiveFiniteNumber(value.tolerance)
    || !isNormalizedNumber(value.normalizedScore)
    || !isNonNegativeFiniteNumber(value.weight)
    || !isNormalizedNumber(value.effectiveWeight)
    || !isNonNegativeFiniteNumber(value.weightedContribution)
    || !isComponentScoreStatus(value.status)
    || !isEvaluationWarningArray(value.warnings)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)
    || !nearlyEqual(value.weightedContribution, value.normalizedScore * value.effectiveWeight)) {
    return failedEvaluation(invalidEvaluation("componentScores", "ComponentScore V1 shape or derived contribution is invalid."));
  }

  return validEvaluation(value as unknown as ComponentScoreV1);
}

function validateScoreValue(
  value: unknown,
  componentScores: readonly ComponentScoreV1[],
  limits: EvaluationLimitsV1,
): EvaluationValidation<ScoreV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, SCORE_ALLOWED_KEYS) !== null) {
    return failedEvaluation(invalidEvaluation("score", "Score V1 must be closed and structured."));
  }

  if (value.kind !== "score"
    || value.schemaVersion !== SCORE_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.scoreRef)
    || !isNormalizedNumber(value.overallScore)
    || !isSourceReferenceArray(value.componentScoreRefs)
    || value.componentScoreRefs.length !== componentScores.length
    || !Array.isArray(value.effectiveWeights)
    || !value.effectiveWeights.every(isEffectiveWeight)
    || !isNonEmptyStringArray(value.measurementsUsed)
    || !isEvaluationWarningArray(value.warnings)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)) {
    return failedEvaluation(invalidEvaluation("score", "Score V1 envelope is invalid."));
  }

  const componentScoreRefs = new Set(componentScores.map((componentScore) => componentScore.componentScoreRef));
  if (!value.componentScoreRefs.every((ref) => ref.kind === "component-score" && componentScoreRefs.has(ref.ref))) {
    return failedEvaluation(invalidEvaluation("score.componentScoreRefs", "Score componentScoreRefs must resolve to component scores."));
  }

  const measurementsUsed = value.measurementsUsed as readonly string[];
  const componentMeasurements = uniqueStrings(componentScores.flatMap((componentScore) => componentScore.measurementRefs));
  if (!componentMeasurements.every((measurementRef) => measurementsUsed.includes(measurementRef))) {
    return failedEvaluation(invalidEvaluation("score.measurementsUsed", "Score measurementsUsed must include every component measurement."));
  }

  const effectiveWeightTotal = value.effectiveWeights.reduce((total, weight) => total + weight.effectiveWeight, 0);
  if (!nearlyEqual(effectiveWeightTotal, 1)) {
    return failedEvaluation(invalidEvaluation("score.effectiveWeights", "Score effective weights must sum to 1."));
  }

  const expectedScore = componentScores.reduce((total, componentScore) => total + componentScore.weightedContribution, 0);
  if (!nearlyEqual(value.overallScore, expectedScore) || value.overallScore < limits.scoreMin || value.overallScore > limits.scoreMax) {
    return failedEvaluation(invalidEvaluation("score.overallScore", "Score overallScore is inconsistent with component contributions."));
  }

  return validEvaluation(value as unknown as ScoreV1);
}

function validateConfidenceValue(value: unknown): EvaluationValidation<ConfidenceV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, CONFIDENCE_ALLOWED_KEYS) !== null) {
    return failedEvaluation(invalidEvaluation("confidence", "Confidence V1 must be closed and structured."));
  }

  const policyFailure = validateConfidencePolicy(value.policy);
  if (policyFailure !== null) {
    return failedEvaluation(invalidEvaluation("confidence.policy", "Confidence policy is invalid."));
  }

  if (value.kind !== "confidence"
    || value.schemaVersion !== CONFIDENCE_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.confidenceRef)
    || !isNormalizedNumber(value.value)
    || !isConfidenceStatus(value.status)
    || !isConfidenceInputs(value.inputs)
    || !isStringArray(value.reasons)
    || !isEvaluationWarningArray(value.warnings)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)
    || value.status !== confidenceStatus(value.value, value.policy as EvaluationConfidencePolicyV1)) {
    return failedEvaluation(invalidEvaluation("confidence", "Confidence V1 envelope is invalid."));
  }

  return validEvaluation(value as unknown as ConfidenceV1);
}

function validateEvaluationLimitsValue(value: unknown): EvaluationValidation<EvaluationLimitsV1> {
  if (!isRecord(value)
    || firstUnsupportedKey(value, EVALUATION_LIMITS_ALLOWED_KEYS) !== null
    || value.kind !== "evaluation-limits"
    || value.weightNormalization !== "normalize-total-positive"
    || validateMissingMeasurementPolicy(value.missingMeasurementPolicy) !== null
    || validateStatusThresholds(value.statusThresholds) !== null
    || validateConfidencePolicy(value.confidencePolicy) !== null
    || value.scoreMin !== 0
    || value.scoreMax !== 1
    || !isPositiveInteger(value.minComponents)) {
    return failedEvaluation(invalidEvaluation("limits", "Evaluation limits are invalid."));
  }

  return validEvaluation(value as unknown as EvaluationLimitsV1);
}

function evaluationLimits(profile: EvaluationProfileV1): EvaluationLimitsV1 {
  return {
    kind: "evaluation-limits",
    scoreMin: profile.limits.scoreMin,
    scoreMax: profile.limits.scoreMax,
    minComponents: profile.limits.minComponents,
    weightNormalization: profile.weightPolicy.normalization,
    missingMeasurementPolicy: profile.missingMeasurementPolicy,
    statusThresholds: profile.statusThresholds,
    confidencePolicy: profile.confidencePolicy,
  };
}

function componentTarget(component: EvaluationComponentDefinitionV1): number | string | null {
  if (component.componentType === "guide_proximity") {
    return (component.scoring as LinearDistanceScoringV1).targetDistance;
  }
  if (component.componentType === "alignment") {
    return (component.scoring as LinearAlignmentScoringV1).targetDelta;
  }
  if (component.componentType === "coverage_match") {
    return (component.scoring as TargetClosenessScoringV1).target;
  }
  if (component.componentType === "area_ratio_match") {
    return (component.scoring as RatioTargetClosenessScoringV1).targetRatio;
  }
  if (component.componentType === "containment") {
    return "containment-status-map";
  }
  return "maxOverlapRatio";
}

function componentTolerance(component: EvaluationComponentDefinitionV1): number | null {
  const scoring = component.scoring;
  return "tolerance" in scoring ? scoring.tolerance : null;
}

function rawValue(key: string, value: number | string | null, measurementRef: string): EvaluationRawValueV1 {
  return { kind: "evaluation-raw-value", key, value, measurementRef };
}

function statusForScore(score: number, confidence: number, thresholds: EvaluationStatusThresholdsV1): EvaluationStatusV1 {
  if (confidence < thresholds.minimumConfidenceForNormalStatus) {
    return "ambiguous";
  }
  if (score >= thresholds.match) {
    return "match";
  }
  if (score >= thresholds.nearMatch) {
    return "near_match";
  }
  if (score >= thresholds.weakMatch) {
    return "weak_match";
  }
  return "no_match";
}

function confidenceStatus(value: number, policy: EvaluationConfidencePolicyV1): ConfidenceStatusV1 {
  if (value >= policy.highThreshold) {
    return "high";
  }
  return value >= policy.mediumThreshold ? "medium" : "low";
}

function confidenceReasons(inputs: Omit<ConfidenceInputsV1, "kind">): readonly string[] {
  const reasons: string[] = [];
  if (inputs.calculatedRequiredComponents === inputs.requiredComponents) {
    reasons.push("required-components-calculated");
  }
  if (inputs.missingOptionalComponents > 0) {
    reasons.push("optional-components-missing");
  }
  if (inputs.ambiguousMeasurements > 0) {
    reasons.push("ambiguous-measurements");
  }
  if (inputs.warningCount > 0) {
    reasons.push("warnings-present");
  }
  return reasons;
}

function evaluationRefFor(input: EvaluationInputV1): string {
  return `evaluation:${input.compositionRef}:${input.profile.profileRef}:${input.measurementResult.measurementResultRef}:${input.operationVersion}`;
}

function sortedComponents(components: readonly EvaluationComponentDefinitionV1[]): readonly EvaluationComponentDefinitionV1[] {
  return [...components].sort((first, second) => first.componentRef.localeCompare(second.componentRef));
}

function componentTypeMatchesMeasurementType(componentType: EvaluationComponentTypeV1, measurementType: MeasurementTypeV1): boolean {
  if (componentType === "guide_proximity") {
    return measurementType === "distance";
  }
  if (componentType === "alignment") {
    return measurementType === "alignment";
  }
  if (componentType === "containment") {
    return measurementType === "containment";
  }
  if (componentType === "overlap_penalty") {
    return measurementType === "overlap";
  }
  if (componentType === "coverage_match") {
    return measurementType === "coverage";
  }
  return measurementType === "ratio";
}

function isAmbiguousMeasurement(measurement: MeasurementV1): boolean {
  if (measurement.measurementType === "alignment") {
    return measurement.result.alignmentStatus === "ambiguous";
  }
  if (measurement.measurementType === "directional-relation") {
    return measurement.result.relation === "ambiguous";
  }
  return false;
}

function measurementSourceReference(measurement: MeasurementV1): SourceReference {
  return { kind: "measurement", ref: measurement.measurementRef };
}

function evaluationWarning(
  code: EvaluationWarningCodeV1,
  targetRef: string,
  sourceRefs: readonly SourceReference[],
): EvaluationWarningV1 {
  return {
    kind: "evaluation-warning",
    code,
    targetRef,
    sourceRefs: uniqueSourceRefs(sourceRefs),
  };
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

function createEvaluationError(input: DiagnosticInput): CoreError {
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

function createEvaluationProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: EVALUATION_OPERATION_VERSION,
    inputRefs: uniqueSourceRefs(inputRefs),
    source: EVALUATION_SOURCE_REFERENCE,
  };
}

function missingEvaluationInput(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "InvalidEvaluationV1", message, targetRef })],
  });
}

function invalidEvaluationProfile(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "InvalidEvaluationProfileV1", message, targetRef })],
  });
}

function invalidEvaluation(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "InvalidEvaluationV1", message, targetRef })],
  });
}

function unsupportedEvaluationComponent(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "UnsupportedEvaluationComponent", message, targetRef })],
  });
}

function missingEvaluationMeasurement(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "MissingEvaluationMeasurement", message, targetRef })],
  });
}

function incompatibleEvaluationMeasurement(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "IncompatibleEvaluationMeasurement", message, targetRef })],
  });
}

function invalidEvaluationWeights(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "InvalidEvaluationWeights", message, targetRef })],
  });
}

function invalidEvaluationThresholds(targetRef: string, message: string): CoreResult {
  return createEvaluationResult({
    status: "failed",
    errors: [createEvaluationError({ code: "InvalidEvaluationThresholds", message, targetRef })],
  });
}

function failedEvaluation(result: CoreResult): EvaluationValidation<never> {
  return { ok: false, result };
}

function validEvaluation<TValue>(value: TValue): EvaluationValidation<TValue> {
  return { ok: true, value };
}

function firstFailure(results: readonly (CoreResult | null)[]): CoreResult | null {
  return results.find((result) => result !== null) ?? null;
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function firstUnsupportedKey(value: Record<string, unknown>, allowedKeys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowedKeys.includes(key)) ?? null;
}

function uniqueStrings(values: readonly string[]): string[] {
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

function uniqueEvaluationWarnings(values: readonly EvaluationWarningV1[]): EvaluationWarningV1[] {
  const seenRefs = new Set<string>();
  const uniqueWarnings: EvaluationWarningV1[] = [];
  for (const value of values) {
    const key = `${value.code}:${value.targetRef}:${value.sourceRefs.map((sourceRef) => `${sourceRef.kind}:${sourceRef.ref}`).join("|")}`;
    if (!seenRefs.has(key)) {
      seenRefs.add(key);
      uniqueWarnings.push(value);
    }
  }
  return uniqueWarnings;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nearlyEqual(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= EPSILON;
}

function isEvaluationComponentType(value: unknown): value is EvaluationComponentTypeV1 {
  return typeof value === "string" && (EVALUATION_V1_COMPONENT_TYPES as readonly string[]).includes(value);
}

function isMeasurementTypeForEvaluation(value: unknown): value is MeasurementTypeV1 {
  return value === "distance"
    || value === "alignment"
    || value === "containment"
    || value === "overlap"
    || value === "coverage"
    || value === "ratio";
}

function isAmbiguousMeasurementPolicy(value: unknown): value is AmbiguousMeasurementPolicyV1 {
  return value === "include_with_confidence_penalty" || value === "fail";
}

function isEvaluationStatus(value: unknown): value is EvaluationStatusV1 {
  return value === "match" || value === "near_match" || value === "weak_match" || value === "no_match" || value === "ambiguous";
}

function isConfidenceStatus(value: unknown): value is ConfidenceStatusV1 {
  return value === "high" || value === "medium" || value === "low";
}

function isComponentScoreStatus(value: unknown): value is ComponentScoreStatusV1 {
  return value === "calculated" || value === "ambiguous";
}

function isEvaluationWarningCode(value: unknown): value is EvaluationWarningCodeV1 {
  return typeof value === "string" && (EVALUATION_V1_WARNING_CODES as readonly string[]).includes(value);
}

function isEvaluationWarning(value: unknown): value is EvaluationWarningV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, WARNING_ALLOWED_KEYS) === null
    && value.kind === "evaluation-warning"
    && isEvaluationWarningCode(value.code)
    && isNonEmptyString(value.targetRef)
    && isSourceReferenceArray(value.sourceRefs);
}

function isEvaluationWarningArray(value: unknown): value is readonly EvaluationWarningV1[] {
  return Array.isArray(value) && value.every(isEvaluationWarning);
}

function isRawValue(value: unknown): value is EvaluationRawValueV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, RAW_VALUE_ALLOWED_KEYS) === null
    && value.kind === "evaluation-raw-value"
    && isNonEmptyString(value.key)
    && (typeof value.value === "string" || value.value === null || isFiniteNumber(value.value))
    && isNonEmptyString(value.measurementRef);
}

function isEffectiveWeight(value: unknown): value is EffectiveWeightV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, EFFECTIVE_WEIGHT_ALLOWED_KEYS) === null
    && value.kind === "effective-weight"
    && isNonEmptyString(value.componentRef)
    && isNonNegativeFiniteNumber(value.weight)
    && isNormalizedNumber(value.effectiveWeight);
}

function isConfidenceInputs(value: unknown): value is ConfidenceInputsV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, CONFIDENCE_INPUTS_ALLOWED_KEYS) === null
    && value.kind === "confidence-inputs"
    && isNonNegativeInteger(value.totalComponents)
    && isNonNegativeInteger(value.calculatedComponents)
    && isNonNegativeInteger(value.requiredComponents)
    && isNonNegativeInteger(value.calculatedRequiredComponents)
    && isNonNegativeInteger(value.optionalComponents)
    && isNonNegativeInteger(value.missingOptionalComponents)
    && isNonNegativeInteger(value.ambiguousMeasurements)
    && isNonNegativeInteger(value.warningCount);
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

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isNonEmptyStringArray(value: unknown): value is readonly string[] {
  return isStringArray(value) && value.length > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
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

function isNormalizedNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isNullablePositiveFiniteNumber(value: unknown): boolean {
  return value === null || isPositiveFiniteNumber(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
