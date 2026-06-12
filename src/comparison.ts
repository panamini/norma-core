import type {
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  OperationContextRef,
  OperationStatus,
  PackLockRef,
  Provenance,
  SourceReference,
} from "./index.js";
import type {
  ComponentScore,
  Evaluation,
  EvaluationComponentId,
} from "./evaluation.js";

export const COMPARISON_STATUSES = [
  "a_closer",
  "b_closer",
  "tie",
  "ambiguous",
  "non_comparable",
] as const;

export type ComparisonStatus = (typeof COMPARISON_STATUSES)[number];

export interface TiePolicy {
  kind: "tie-policy";
  id: string;
  scoreTolerance: number;
}

export interface SharedComparisonContext {
  kind: "shared-comparison-context";
  packRef: string | null;
  packLockRef: string | null;
  packPreLockRef: string | null;
  profileRef: string | null;
  surfaceRef: string | null;
  coordinateSystemRef: string | null;
  metricPolicyRef: string | null;
  evaluationTolerancesRef: string | null;
  tolerancePolicyRef: string | null;
  operationContextRef: string | null;
  missingProofs: readonly string[];
  mismatchRefs: readonly SharedContextMismatch[];
}

export interface SharedContextMismatch {
  kind: "shared-context-mismatch";
  field: string;
  evaluationARef: string | null;
  evaluationBRef: string | null;
}

export interface ComponentDelta {
  kind: "component-delta";
  componentId: EvaluationComponentId;
  evaluationAComponentRef: string | null;
  evaluationBComponentRef: string | null;
  valueA: number | null;
  valueB: number | null;
  delta: number | null;
  sourceMeasurementRefs: readonly SourceReference[];
}

export interface Explanation {
  kind: "explanation";
  summary: string;
  sourceEvaluationRefs: readonly string[];
  sourceMeasurementRefs: readonly SourceReference[];
  componentDeltas: readonly ComponentDelta[];
  warnings: readonly CoreWarning[];
  provenance: Provenance;
}

export interface Decision {
  kind: "decision";
  status: ComparisonStatus;
  selectedEvaluationRef: string | null;
  summary: "A is closer to the declared system" | "B is closer to the declared system" | "tie" | "ambiguous" | "non comparable";
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface Comparison {
  kind: "comparison";
  id: string;
  status: ComparisonStatus;
  evaluationARef: string;
  evaluationBRef: string;
  scoreDelta: number | null;
  tieTolerance: number;
  sharedContext: SharedComparisonContext;
  decision: Decision;
  explanation: Explanation;
  warnings: readonly CoreWarning[];
  provenance: Provenance;
}

export interface CompareCompositionsBasicInput {
  evaluationA?: Evaluation | null;
  evaluationB?: Evaluation | null;
  tiePolicy?: TiePolicy | null;
  tieTolerance?: number;
  operationContextRef?: OperationContextRef | null;
  requestedOutputs?: readonly string[];
}

interface ComparisonContext {
  evaluationA: Evaluation;
  evaluationB: Evaluation;
  tieTolerance: number;
  operationContextRef: OperationContextRef | null;
}

interface ComparisonResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
  output?: TOutput | null;
}

interface ContextField {
  field: keyof Omit<SharedComparisonContext, "kind" | "missingProofs" | "mismatchRefs">;
  label: string;
  evaluationARef: string | null;
  evaluationBRef: string | null;
}

const COMPARISON_OPERATION = "core.comparison.basic.compare";
const COMPARISON_OPERATION_VERSION = "0.1.0";
const COMPARISON_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/comparison-v1",
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
const ALLOWED_OUTPUTS = ["comparison", "decision", "explanation"] as const;
const BEAUTY_OUTPUT_TERMS = ["beauty", "aesthetic", "beautiful", "plus-beau", "plus_beau"] as const;
const INTENT_OUTPUT_TERMS = ["intent", "intention"] as const;
const REJECTED_OUTPUT_TERMS = [
  "artifact",
  "best",
  "better",
  "meilleur",
  "optimization",
  "ranking",
  "recommendation",
  "recommended",
  "preferred",
] as const;
const REQUIRED_SOURCE_CONTEXT_KINDS = [
  "surface",
  "coordinate-system",
  "metric-policy",
  "evaluation-tolerances",
  "tolerance-policy",
  "operation-context",
] as const;

export function compareCompositionsBasic(
  input: CompareCompositionsBasicInput | null | undefined,
): CoreResult<Comparison> {
  const contextValidation = validateComparisonInput(input);
  if (!contextValidation.ok) {
    return resultAs<Comparison>(contextValidation.result);
  }

  const ctx = contextValidation.value;
  const provenance = createComparisonProvenance(comparisonInputRefs(ctx));
  const sharedContext = createSharedContext(ctx);
  const baseWarnings = sharedContextWarnings(sharedContext, provenance);
  const explanation = createExplanation(ctx, sharedContext, provenance, baseWarnings);
  const explanationSourceWarning = explanationSourceWarningFor(ctx, explanation, provenance);
  const scoreDelta = scoreDeltaFor(ctx.evaluationA, ctx.evaluationB);
  const scoreDeltaWarning = scoreDelta === null
    ? comparisonWarning(
      "AmbiguousComparison",
      "Comparison cannot decide closeness without minimal scores for both evaluations.",
      "scoreDelta",
      provenance,
    )
    : null;
  const warnings = [
    ...baseWarnings,
    ...(explanationSourceWarning === null ? [] : [explanationSourceWarning]),
    ...(scoreDeltaWarning === null ? [] : [scoreDeltaWarning]),
  ];
  const status = comparisonStatus(ctx, sharedContext, scoreDelta, warnings);
  const tieWarning = status === "tie"
    ? comparisonWarning("TieComparison", "Comparison scores are inside the explicit tie tolerance.", "tieTolerance", provenance)
    : null;
  const finalWarnings = tieWarning === null ? warnings : [...warnings, tieWarning];
  const finalExplanation = { ...explanation, warnings: finalWarnings };
  const decision = createDecision(status, ctx, finalExplanation, provenance);
  const comparison: Comparison = {
    kind: "comparison",
    id: `comparison:${ctx.evaluationA.id}:${ctx.evaluationB.id}`,
    status,
    evaluationARef: ctx.evaluationA.id,
    evaluationBRef: ctx.evaluationB.id,
    scoreDelta,
    tieTolerance: ctx.tieTolerance,
    sharedContext,
    decision,
    explanation: finalExplanation,
    warnings: finalWarnings,
    provenance,
  };

  return createComparisonResult({
    status: "ok",
    warnings: finalWarnings,
    provenance,
    outputRefs: [
      { kind: "comparison", ref: comparison.id },
      { kind: "decision", ref: `decision:${comparison.id}` },
      { kind: "explanation", ref: `explanation:${comparison.id}` },
    ],
    packLockRef: packLockRefForResult(ctx.evaluationA.packLockRef),
    operationContextRef: ctx.operationContextRef,
    output: comparison,
  });
}

function validateComparisonInput(
  input: CompareCompositionsBasicInput | null | undefined,
): { ok: true; value: ComparisonContext } | { ok: false; result: CoreResult } {
  if (!isRecord(input)) {
    return failedComparisonValidation(missingComparisonInput("comparison", "Comparison input is required."));
  }

  const requestedOutputFailure = rejectedRequestedOutput(input.requestedOutputs);
  if (requestedOutputFailure !== null) {
    return failedComparisonValidation(requestedOutputFailure);
  }

  if (input.evaluationA === undefined || input.evaluationA === null) {
    return failedComparisonValidation(missingEvaluation("evaluationA"));
  }

  if (input.evaluationB === undefined || input.evaluationB === null) {
    return failedComparisonValidation(missingEvaluation("evaluationB"));
  }

  if (!isEvaluationRecord(input.evaluationA)) {
    return failedComparisonValidation(invalidComparisonInput("evaluationA", "Comparison requires a PR8 Evaluation for A."));
  }

  if (!isEvaluationRecord(input.evaluationB)) {
    return failedComparisonValidation(invalidComparisonInput("evaluationB", "Comparison requires a PR8 Evaluation for B."));
  }

  const tieToleranceValidation = tieToleranceFor(input);
  if (!tieToleranceValidation.ok) {
    return failedComparisonValidation(tieToleranceValidation.result);
  }

  if (input.operationContextRef !== undefined && input.operationContextRef !== null && !isOperationContextRef(input.operationContextRef)) {
    return failedComparisonValidation(invalidComparisonInput("operationContextRef", "Comparison operationContextRef must expose an id."));
  }

  return {
    ok: true,
    value: {
      evaluationA: input.evaluationA,
      evaluationB: input.evaluationB,
      tieTolerance: tieToleranceValidation.value,
      operationContextRef: input.operationContextRef ?? null,
    },
  };
}

function tieToleranceFor(
  input: CompareCompositionsBasicInput,
): { ok: true; value: number } | { ok: false; result: CoreResult } {
  if (input.tiePolicy !== undefined && input.tiePolicy !== null) {
    if (!isTiePolicy(input.tiePolicy)) {
      return { ok: false, result: invalidComparisonInput("tiePolicy", "Tie policy must expose a non-negative scoreTolerance.") };
    }

    return { ok: true, value: input.tiePolicy.scoreTolerance };
  }

  if (input.tieTolerance === undefined) {
    return { ok: false, result: missingComparisonInput("tieTolerance", "Comparison requires an explicit tie policy or tie tolerance.") };
  }

  if (!isNonNegativeFiniteNumber(input.tieTolerance)) {
    return { ok: false, result: invalidComparisonInput("tieTolerance", "Tie tolerance must be a non-negative finite number.") };
  }

  return { ok: true, value: input.tieTolerance };
}

function createSharedContext(ctx: ComparisonContext): SharedComparisonContext {
  const fields = contextFields(ctx);
  const missingProofs = fields
    .filter((field) => field.evaluationARef === null || field.evaluationBRef === null)
    .map((field) => field.label);
  const mismatchRefs = fields
    .filter((field) => field.evaluationARef !== null && field.evaluationBRef !== null && field.evaluationARef !== field.evaluationBRef)
    .map((field): SharedContextMismatch => ({
      kind: "shared-context-mismatch",
      field: field.label,
      evaluationARef: field.evaluationARef,
      evaluationBRef: field.evaluationBRef,
    }));

  return {
    kind: "shared-comparison-context",
    packRef: sharedValue("packRef", fields),
    packLockRef: sharedValue("packLockRef", fields),
    packPreLockRef: sharedValue("packPreLockRef", fields),
    profileRef: sharedValue("profileRef", fields),
    surfaceRef: sharedValue("surfaceRef", fields),
    coordinateSystemRef: sharedValue("coordinateSystemRef", fields),
    metricPolicyRef: sharedValue("metricPolicyRef", fields),
    evaluationTolerancesRef: sharedValue("evaluationTolerancesRef", fields),
    tolerancePolicyRef: sharedValue("tolerancePolicyRef", fields),
    operationContextRef: sharedValue("operationContextRef", fields),
    missingProofs,
    mismatchRefs,
  };
}

function contextFields(ctx: ComparisonContext): readonly ContextField[] {
  return [
    contextField("packRef", "pack", ctx.evaluationA.packRef, ctx.evaluationB.packRef),
    effectivePackLockField(ctx),
    contextField("profileRef", "profile", ctx.evaluationA.profileRef, ctx.evaluationB.profileRef),
    ...REQUIRED_SOURCE_CONTEXT_KINDS.map((kind) => {
      const fieldByKind = {
        "surface": "surfaceRef",
        "coordinate-system": "coordinateSystemRef",
        "metric-policy": "metricPolicyRef",
        "evaluation-tolerances": "evaluationTolerancesRef",
        "tolerance-policy": "tolerancePolicyRef",
        "operation-context": "operationContextRef",
      } as const;
      return contextField(
        fieldByKind[kind],
        kind,
        singleInputRef(ctx.evaluationA, kind),
        singleInputRef(ctx.evaluationB, kind),
      );
    }),
  ];
}

function effectivePackLockField(ctx: ComparisonContext): ContextField {
  const evaluationARef = ctx.evaluationA.packLockRef ?? ctx.evaluationA.packPreLockRef;
  const evaluationBRef = ctx.evaluationB.packLockRef ?? ctx.evaluationB.packPreLockRef;
  const field = ctx.evaluationA.packLockRef !== null && ctx.evaluationB.packLockRef !== null
    ? "packLockRef"
    : "packPreLockRef";

  return contextField(field, "pack-lock-or-prelock", evaluationARef, evaluationBRef);
}

function contextField(
  field: ContextField["field"],
  label: string,
  evaluationARef: string | null,
  evaluationBRef: string | null,
): ContextField {
  return {
    field,
    label,
    evaluationARef,
    evaluationBRef,
  };
}

function sharedValue(field: ContextField["field"], fields: readonly ContextField[]): string | null {
  const match = fields.find((candidate) => candidate.field === field);
  if (match === undefined || match.evaluationARef === null || match.evaluationBRef === null || match.evaluationARef !== match.evaluationBRef) {
    return null;
  }

  return match.evaluationARef;
}

function sharedContextWarnings(
  sharedContext: SharedComparisonContext,
  provenance: Provenance,
): readonly CoreWarning[] {
  const warnings: CoreWarning[] = [];
  if (sharedContext.mismatchRefs.length > 0) {
    warnings.push(comparisonWarning(
      "NonComparableEvaluations",
      "Evaluations do not share the required comparison context.",
      "sharedContext",
      provenance,
    ));
  }

  if (sharedContext.missingProofs.length > 0) {
    warnings.push(comparisonWarning(
      "AmbiguousComparison",
      `Comparison cannot prove shared context fields: ${sharedContext.missingProofs.join(", ")}.`,
      "sharedContext",
      provenance,
    ));
  }

  return warnings;
}

function createExplanation(
  ctx: ComparisonContext,
  sharedContext: SharedComparisonContext,
  provenance: Provenance,
  warnings: readonly CoreWarning[],
): Explanation {
  return {
    kind: "explanation",
    summary: explanationSummary(sharedContext),
    sourceEvaluationRefs: [ctx.evaluationA.id, ctx.evaluationB.id],
    sourceMeasurementRefs: uniqueSourceReferences([
      ...ctx.evaluationA.measurementRefs,
      ...ctx.evaluationB.measurementRefs,
      ...ctx.evaluationA.componentScores.flatMap((component) => component.measurementSourceRefs),
      ...ctx.evaluationB.componentScores.flatMap((component) => component.measurementSourceRefs),
    ]),
    componentDeltas: componentDeltas(ctx.evaluationA, ctx.evaluationB),
    warnings,
    provenance,
  };
}

function explanationSummary(sharedContext: SharedComparisonContext): string {
  if (sharedContext.mismatchRefs.length > 0) {
    return "Comparison stopped because shared context differs.";
  }

  if (sharedContext.missingProofs.length > 0) {
    return "Comparison cannot prove the complete shared context.";
  }

  return "Comparison uses sourced scores in the declared shared context.";
}

function componentDeltas(evaluationA: Evaluation, evaluationB: Evaluation): readonly ComponentDelta[] {
  const bByComponent = new Map(evaluationB.componentScores.map((component) => [component.componentId, component]));
  return evaluationA.componentScores.map((componentA) => {
    const componentB = bByComponent.get(componentA.componentId);
    const valueB = componentB?.value ?? null;
    return {
      kind: "component-delta",
      componentId: componentA.componentId,
      evaluationAComponentRef: componentA.id,
      evaluationBComponentRef: componentB?.id ?? null,
      valueA: componentA.value,
      valueB,
      delta: valueB === null ? null : componentA.value - valueB,
      sourceMeasurementRefs: uniqueSourceReferences([
        ...componentA.measurementSourceRefs,
        ...(componentB?.measurementSourceRefs ?? []),
      ]),
    };
  });
}

function explanationSourceWarningFor(
  ctx: ComparisonContext,
  explanation: Explanation,
  provenance: Provenance,
): CoreWarning | null {
  if (
    explanation.sourceEvaluationRefs.length === 0
    || explanation.sourceMeasurementRefs.length === 0
    || explanation.componentDeltas.length === 0
    || ctx.evaluationA.measurementRefs.length === 0
    || ctx.evaluationB.measurementRefs.length === 0
    || ctx.evaluationA.componentScores.some((component) => component.measurementSourceRefs.length === 0)
    || ctx.evaluationB.componentScores.some((component) => component.measurementSourceRefs.length === 0)
  ) {
    return comparisonWarning(
      "ComparisonExplanationMissingSource",
      "Comparison explanation cannot be traced to evaluations, component scores, and measurements.",
      "explanation",
      provenance,
    );
  }

  return null;
}

function comparisonStatus(
  ctx: ComparisonContext,
  sharedContext: SharedComparisonContext,
  scoreDelta: number | null,
  warnings: readonly CoreWarning[],
): ComparisonStatus {
  if (sharedContext.mismatchRefs.length > 0) {
    return "non_comparable";
  }

  if (
    sharedContext.missingProofs.length > 0
    || scoreDelta === null
    || warnings.some((warning) => warning.code === "ComparisonExplanationMissingSource")
  ) {
    return "ambiguous";
  }

  if (Math.abs(scoreDelta) <= ctx.tieTolerance) {
    return "tie";
  }

  return scoreDelta > 0 ? "a_closer" : "b_closer";
}

function createDecision(
  status: ComparisonStatus,
  ctx: ComparisonContext,
  explanation: Explanation,
  provenance: Provenance,
): Decision {
  return {
    kind: "decision",
    status,
    selectedEvaluationRef: selectedEvaluationRef(status, ctx),
    summary: decisionSummary(status),
    sourceRefs: uniqueSourceReferences([
      { kind: "evaluation", ref: ctx.evaluationA.id },
      { kind: "evaluation", ref: ctx.evaluationB.id },
      ...(ctx.evaluationA.score === null ? [] : [{ kind: "minimal-score", ref: ctx.evaluationA.score.id }]),
      ...(ctx.evaluationB.score === null ? [] : [{ kind: "minimal-score", ref: ctx.evaluationB.score.id }]),
      ...explanation.sourceMeasurementRefs,
    ]),
    provenance,
  };
}

function selectedEvaluationRef(status: ComparisonStatus, ctx: ComparisonContext): string | null {
  if (status === "a_closer") {
    return ctx.evaluationA.id;
  }

  if (status === "b_closer") {
    return ctx.evaluationB.id;
  }

  return null;
}

function decisionSummary(status: ComparisonStatus): Decision["summary"] {
  if (status === "a_closer") {
    return "A is closer to the declared system";
  }

  if (status === "b_closer") {
    return "B is closer to the declared system";
  }

  if (status === "non_comparable") {
    return "non comparable";
  }

  return status;
}

function scoreDeltaFor(evaluationA: Evaluation, evaluationB: Evaluation): number | null {
  if (evaluationA.score === null || evaluationB.score === null) {
    return null;
  }

  if (!isFiniteNumber(evaluationA.score.value) || !isFiniteNumber(evaluationB.score.value)) {
    return null;
  }

  return evaluationA.score.value - evaluationB.score.value;
}

function comparisonInputRefs(ctx: ComparisonContext): readonly SourceReference[] {
  return uniqueSourceReferences([
    { kind: "evaluation", ref: ctx.evaluationA.id },
    { kind: "evaluation", ref: ctx.evaluationB.id },
    ...(ctx.evaluationA.score === null ? [] : [{ kind: "minimal-score", ref: ctx.evaluationA.score.id }]),
    ...(ctx.evaluationB.score === null ? [] : [{ kind: "minimal-score", ref: ctx.evaluationB.score.id }]),
    ...ctx.evaluationA.measurementRefs,
    ...ctx.evaluationB.measurementRefs,
    ...ctx.evaluationA.provenance.inputRefs,
    ...ctx.evaluationB.provenance.inputRefs,
  ]);
}

function rejectedRequestedOutput(requestedOutputs: unknown): CoreResult | null {
  if (requestedOutputs === undefined) {
    return null;
  }

  if (!Array.isArray(requestedOutputs) || !requestedOutputs.every((output) => typeof output === "string")) {
    return invalidComparisonInput("requestedOutputs", "Comparison requested outputs must be strings.");
  }

  const beautyOutput = firstOutputWithTerm(requestedOutputs, BEAUTY_OUTPUT_TERMS);
  if (beautyOutput !== undefined) {
    return createComparisonResult({
      status: "failed",
      errors: [
        comparisonError("BeautyDecisionRejected", "PR9 rejects beauty decision requests.", "requestedOutputs", {
          kind: "requested-output",
          ref: beautyOutput,
        }),
      ],
    });
  }

  const intentOutput = firstOutputWithTerm(requestedOutputs, INTENT_OUTPUT_TERMS);
  if (intentOutput !== undefined) {
    return createComparisonResult({
      status: "failed",
      errors: [
        comparisonError("IntentInferenceRejected", "PR9 rejects intention inference requests.", "requestedOutputs", {
          kind: "requested-output",
          ref: intentOutput,
        }),
      ],
    });
  }

  const rejectedOutput = firstOutputWithTerm(requestedOutputs, REJECTED_OUTPUT_TERMS)
    ?? requestedOutputs.find((output) => !ALLOWED_OUTPUTS.includes(output as (typeof ALLOWED_OUTPUTS)[number]));
  if (rejectedOutput !== undefined) {
    return invalidComparisonInput("requestedOutputs", `PR9 cannot produce requested output: ${rejectedOutput}.`);
  }

  return null;
}

function missingComparisonInput(targetRef: string, message: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [
      comparisonError("MissingComparisonInput", message, targetRef, { kind: "comparison-input", ref: targetRef }),
    ],
  });
}

function missingEvaluation(targetRef: "evaluationA" | "evaluationB"): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [
      comparisonError("MissingEvaluation", `Comparison requires ${targetRef}.`, targetRef, {
        kind: "evaluation",
        ref: targetRef,
      }),
    ],
  });
}

function invalidComparisonInput(targetRef: string, message: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [
      comparisonError("InvalidComparisonInput", message, targetRef, { kind: "comparison-input", ref: targetRef }),
    ],
  });
}

function comparisonError(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  sourceRef: SourceReference = COMPARISON_SOURCE_REFERENCE,
): CoreError {
  return {
    code,
    severity: "error",
    message,
    targetRef,
    source: sourceRef,
    blocking: true,
    provenance: null,
  };
}

function comparisonWarning(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  provenance: Provenance,
): CoreWarning {
  return {
    code,
    severity: "warning",
    message,
    targetRef,
    source: COMPARISON_SOURCE_REFERENCE,
    blocking: false,
    provenance,
  };
}

function createComparisonProvenance(inputRefs: readonly SourceReference[]): Provenance {
  return {
    operationName: COMPARISON_OPERATION,
    operationVersion: COMPARISON_OPERATION_VERSION,
    inputRefs: [...inputRefs],
    source: COMPARISON_SOURCE_REFERENCE,
  };
}

function createComparisonResult<TOutput = unknown>(input: ComparisonResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };
  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function failedComparisonValidation<TValue>(result: CoreResult): { ok: false; result: CoreResult<TValue> } {
  return { ok: false, result: result as CoreResult<TValue> };
}

function resultAs<TOutput>(result: CoreResult): CoreResult<TOutput> {
  return result as CoreResult<TOutput>;
}

function singleInputRef(evaluation: Evaluation, kind: string): string | null {
  const matches = evaluation.provenance.inputRefs.filter((ref) => ref.kind === kind);
  return matches.length === 1 ? matches[0]?.ref ?? null : null;
}

function firstOutputWithTerm(outputs: readonly string[], terms: readonly string[]): string | undefined {
  return outputs.find((output) => {
    const normalizedOutput = output.toLowerCase();
    return terms.some((term) => normalizedOutput.includes(term));
  });
}

function uniqueSourceReferences(refs: readonly SourceReference[]): readonly SourceReference[] {
  const seen = new Set<string>();
  const uniqueRefs: SourceReference[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.ref}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRefs.push(ref);
    }
  }

  return uniqueRefs;
}

function packLockRefForResult(packLockRef: string | null): PackLockRef | null {
  return packLockRef === null ? null : { id: packLockRef };
}

function isEvaluationRecord(value: unknown): value is Evaluation {
  if (!isRecord(value)) {
    return false;
  }

  return value.kind === "evaluation"
    && hasStringFields(value, ["id", "profileRef", "packRef", "compositionLabel"])
    && (value.packLockRef === null || typeof value.packLockRef === "string")
    && (value.packPreLockRef === null || typeof value.packPreLockRef === "string")
    && isSourceReferenceArray(value.measurementRefs)
    && Array.isArray(value.componentScores)
    && value.componentScores.every(isComponentScore)
    && (value.score === null || isMinimalScoreRecord(value.score))
    && isEvaluationProvenance(value.provenance);
}

function isComponentScore(value: unknown): value is ComponentScore {
  if (!isRecord(value)) {
    return false;
  }

  return value.kind === "component-score"
    && hasStringFields(value, ["id", "componentId", "status"])
    && isFiniteNumber(value.value)
    && isSourceReferenceArray(value.measurementSourceRefs);
}

function isMinimalScoreRecord(value: unknown): value is Evaluation["score"] {
  if (!isRecord(value)) {
    return false;
  }

  return value.kind === "minimal-score"
    && hasStringFields(value, ["id"])
    && isFiniteNumber(value.value)
    && isSourceReferenceArray(value.measurementSourceRefs);
}

function isEvaluationProvenance(value: unknown): value is Evaluation["provenance"] {
  if (!isRecord(value)) {
    return false;
  }

  return value.kind === "evaluation-provenance"
    && hasStringFields(value, ["evaluationRef", "operationRef"])
    && isSourceReferenceArray(value.inputRefs)
    && isSourceReferenceArray(value.sourceRefs);
}

function isTiePolicy(value: unknown): value is TiePolicy {
  return isRecord(value)
    && value.kind === "tie-policy"
    && typeof value.id === "string"
    && isNonNegativeFiniteNumber(value.scoreTolerance);
}

function isOperationContextRef(value: unknown): value is OperationContextRef {
  return isRecord(value) && typeof value.id === "string";
}

function hasStringFields(value: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && typeof value.kind === "string"
    && typeof value.ref === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
