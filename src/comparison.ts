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
import type { EvaluationStatusV1, EvaluationV1 } from "./evaluation.js";
import { validateEvaluationV1 } from "./evaluation.js";

export const COMPARISON_POLICY_V1_SCHEMA_VERSION = "comparison-policy-v1" as const;
export const COMPARISON_V1_SCHEMA_VERSION = "comparison-v1" as const;
export const DECISION_V1_SCHEMA_VERSION = "decision-v1" as const;
export const STRUCTURED_EXPLANATION_V1_SCHEMA_VERSION = "structured-explanation-v1" as const;

export const COMPARISON_V1_STATUSES = [
  "a_closer",
  "b_closer",
  "tie",
  "ambiguous",
  "non_comparable",
] as const;

export const COMPARISON_V1_WARNING_CODES = [
  "LowComparisonConfidence",
  "EvaluationAmbiguous",
  "TiedWithinTolerance",
  "ContextMismatch",
] as const;

export const STRUCTURED_EXPLANATION_V1_CLAIM_CODES = [
  "A_CLOSER_TO_DECLARED_SYSTEM",
  "B_CLOSER_TO_DECLARED_SYSTEM",
  "TIED_WITHIN_TOLERANCE",
  "AMBIGUOUS_COMPARISON",
  "NON_COMPARABLE_CONTEXT",
] as const;

export type ComparisonPolicyV1SchemaVersion = typeof COMPARISON_POLICY_V1_SCHEMA_VERSION;
export type ComparisonV1SchemaVersion = typeof COMPARISON_V1_SCHEMA_VERSION;
export type DecisionV1SchemaVersion = typeof DECISION_V1_SCHEMA_VERSION;
export type StructuredExplanationV1SchemaVersion = typeof STRUCTURED_EXPLANATION_V1_SCHEMA_VERSION;
export type ComparisonStatusV1 = (typeof COMPARISON_V1_STATUSES)[number];
export type ComparisonWarningCodeV1 = (typeof COMPARISON_V1_WARNING_CODES)[number];
export type StructuredExplanationClaimCodeV1 = (typeof STRUCTURED_EXPLANATION_V1_CLAIM_CODES)[number];
export type AmbiguousEvaluationPolicyV1 = "do_not_select";

export interface ComparisonPolicyV1 {
  kind: "comparison-policy";
  schemaVersion: ComparisonPolicyV1SchemaVersion;
  policyRef: string;
  tieTolerance: number;
  minimumConfidence: number;
  ambiguousEvaluationPolicy: AmbiguousEvaluationPolicyV1;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface ComparisonInputV1 {
  kind: "comparison-input";
  schemaVersion: "comparison-input-v1";
  evaluationA: EvaluationV1;
  evaluationB: EvaluationV1;
  policy: ComparisonPolicyV1;
  operationVersion: string;
  sourceRefs: readonly SourceReference[];
}

export interface ComparisonContextCheckV1 {
  kind: "comparison-context-check";
  field: string;
  aValue: string | null;
  bValue: string | null;
  matches: boolean;
}

export interface ComparisonWarningV1 {
  kind: "comparison-warning";
  code: ComparisonWarningCodeV1;
  targetRef: string;
  sourceRefs: readonly SourceReference[];
}

export interface ComparisonLimitsV1 {
  kind: "comparison-limits";
  tieTolerance: number;
  minimumConfidence: number;
  ambiguousEvaluationPolicy: AmbiguousEvaluationPolicyV1;
  statusPrecedence: readonly ComparisonStatusV1[];
}

export interface ComparisonV1 {
  kind: "comparison";
  schemaVersion: ComparisonV1SchemaVersion;
  comparisonRef: string;
  evaluationARef: string;
  evaluationBRef: string;
  compositionARef: string;
  compositionBRef: string;
  policyRef: string;
  profileRef: string | null;
  packRef: string | null;
  evaluationAStatus: EvaluationStatusV1;
  evaluationBStatus: EvaluationStatusV1;
  scoreA: number;
  scoreB: number;
  signedScoreDelta: number;
  absoluteScoreDelta: number;
  confidenceA: number;
  confidenceB: number;
  contextChecks: readonly ComparisonContextCheckV1[];
  status: ComparisonStatusV1;
  selectedEvaluationRef: string | null;
  selectedCompositionRef: string | null;
  warnings: readonly ComparisonWarningV1[];
  limits: ComparisonLimitsV1;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
  decisionRef: string;
  explanationRef: string;
  artifactRefs: readonly SourceReference[];
}

export interface DecisionV1 {
  kind: "decision";
  schemaVersion: DecisionV1SchemaVersion;
  decisionRef: string;
  comparisonRef: string;
  status: ComparisonStatusV1;
  selectedEvaluationRef: string | null;
  selectedCompositionRef: string | null;
  sourceEvaluationRefs: readonly SourceReference[];
  sourceScoreRefs: readonly SourceReference[];
  policyRef: string;
  warnings: readonly ComparisonWarningV1[];
  limits: ComparisonLimitsV1;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface StructuredExplanationFactsV1 {
  kind: "structured-explanation-facts";
  status: ComparisonStatusV1;
  scoreA: number;
  scoreB: number;
  signedScoreDelta: number;
  absoluteScoreDelta: number;
  tieTolerance: number;
  confidenceA: number;
  confidenceB: number;
  selectedEvaluationRef: string | null;
  selectedCompositionRef: string | null;
  contextMismatches: readonly ComparisonContextCheckV1[];
  warningCodes: readonly ComparisonWarningCodeV1[];
}

export interface StructuredExplanationV1 {
  kind: "structured-explanation";
  schemaVersion: StructuredExplanationV1SchemaVersion;
  explanationRef: string;
  comparisonRef: string;
  decisionRef: string;
  claimCode: StructuredExplanationClaimCodeV1;
  factRefs: readonly SourceReference[];
  facts: StructuredExplanationFactsV1;
  summary: string;
  limits: ComparisonLimitsV1;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface ComparisonDecisionExplanationV1 {
  kind: "comparison-decision-explanation";
  schemaVersion: "comparison-decision-explanation-v1";
  comparison: ComparisonV1;
  decision: DecisionV1;
  structuredExplanation: StructuredExplanationV1;
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

type ComparisonValidation<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; result: CoreResult };

const COMPARISON_DECISION_EXPLANATION_V1_SCHEMA_VERSION = "comparison-decision-explanation-v1" as const;
const COMPARISON_OPERATION_REF = "comparison.compareCompositionsBasic";
const COMPARISON_OPERATION_VERSION = "0.1.0";
const EPSILON = 1e-9;

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

const STATUS_PRECEDENCE: readonly ComparisonStatusV1[] = [
  "non_comparable",
  "ambiguous",
  "tie",
  "a_closer",
  "b_closer",
];

const SOURCE_REFERENCE_ALLOWED_KEYS = ["kind", "ref"] as const;
const PROVENANCE_ALLOWED_KEYS = ["operationName", "operationVersion", "inputRefs", "source"] as const;
const COMPARISON_POLICY_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "policyRef",
  "tieTolerance",
  "minimumConfidence",
  "ambiguousEvaluationPolicy",
  "sourceRefs",
  "provenance",
] as const;
const COMPARISON_INPUT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "evaluationA",
  "evaluationB",
  "policy",
  "operationVersion",
  "sourceRefs",
] as const;
const CONTEXT_CHECK_ALLOWED_KEYS = ["kind", "field", "aValue", "bValue", "matches"] as const;
const COMPARISON_WARNING_ALLOWED_KEYS = ["kind", "code", "targetRef", "sourceRefs"] as const;
const COMPARISON_LIMITS_ALLOWED_KEYS = [
  "kind",
  "tieTolerance",
  "minimumConfidence",
  "ambiguousEvaluationPolicy",
  "statusPrecedence",
] as const;
const COMPARISON_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "comparisonRef",
  "evaluationARef",
  "evaluationBRef",
  "compositionARef",
  "compositionBRef",
  "policyRef",
  "profileRef",
  "packRef",
  "evaluationAStatus",
  "evaluationBStatus",
  "scoreA",
  "scoreB",
  "signedScoreDelta",
  "absoluteScoreDelta",
  "confidenceA",
  "confidenceB",
  "contextChecks",
  "status",
  "selectedEvaluationRef",
  "selectedCompositionRef",
  "warnings",
  "limits",
  "sourceRefs",
  "provenance",
  "decisionRef",
  "explanationRef",
  "artifactRefs",
] as const;
const DECISION_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "decisionRef",
  "comparisonRef",
  "status",
  "selectedEvaluationRef",
  "selectedCompositionRef",
  "sourceEvaluationRefs",
  "sourceScoreRefs",
  "policyRef",
  "warnings",
  "limits",
  "sourceRefs",
  "provenance",
] as const;
const STRUCTURED_EXPLANATION_FACTS_ALLOWED_KEYS = [
  "kind",
  "status",
  "scoreA",
  "scoreB",
  "signedScoreDelta",
  "absoluteScoreDelta",
  "tieTolerance",
  "confidenceA",
  "confidenceB",
  "selectedEvaluationRef",
  "selectedCompositionRef",
  "contextMismatches",
  "warningCodes",
] as const;
const STRUCTURED_EXPLANATION_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "explanationRef",
  "comparisonRef",
  "decisionRef",
  "claimCode",
  "factRefs",
  "facts",
  "summary",
  "limits",
  "sourceRefs",
  "provenance",
] as const;

const BEAUTY_POLICY_FIELDS = ["beauty", "aesthetic", "preference", "preferred", "best", "better"] as const;
const RECOMMENDATION_POLICY_FIELDS = ["recommendation", "recommended", "winner", "choose", "optimize", "optimization"] as const;
const EXECUTABLE_POLICY_FIELDS = ["code", "script", "formula", "function", "expression"] as const;
const FORBIDDEN_SUMMARY_TERMS = [
  "better",
  "best",
  "beautiful",
  "aesthetic",
  "preferred",
  "winner",
  "recommendation",
  "choose",
  "optimize",
  "authorintent",
] as const;

export function validateComparisonPolicyV1(policy: unknown): CoreResult<ComparisonPolicyV1> {
  const validation = validateComparisonPolicyValue(policy);
  if (!validation.ok) {
    return validation.result as CoreResult<ComparisonPolicyV1>;
  }

  return createComparisonResult({
    status: "ok",
    provenance: createComparisonProvenance("core.comparison-policy-v1.validate", [
      { kind: "comparison-policy", ref: validation.value.policyRef },
    ]),
    outputRefs: [{ kind: "comparison-policy", ref: validation.value.policyRef }],
    output: validation.value,
  });
}

export function compareCompositionsBasicV1(input: unknown): CoreResult<ComparisonDecisionExplanationV1> {
  const validation = validateComparisonInputValue(input);
  if (!validation.ok) {
    return validation.result as CoreResult<ComparisonDecisionExplanationV1>;
  }

  const { evaluationA, evaluationB, policy, operationVersion } = validation.value;
  const comparison = createComparison(validation.value);
  const comparisonValidation = validateComparisonValue(comparison);
  if (!comparisonValidation.ok) {
    return comparisonValidation.result as CoreResult<ComparisonDecisionExplanationV1>;
  }

  const decision = createDecision(comparisonValidation.value, evaluationA, evaluationB);
  const decisionValidation = validateDecisionValue(decision, comparisonValidation.value);
  if (!decisionValidation.ok) {
    return decisionValidation.result as CoreResult<ComparisonDecisionExplanationV1>;
  }

  const structuredExplanation = createStructuredExplanation(comparisonValidation.value, decisionValidation.value);
  const explanationValidation = validateStructuredExplanationValue(
    structuredExplanation,
    comparisonValidation.value,
    decisionValidation.value,
  );
  if (!explanationValidation.ok) {
    return explanationValidation.result as CoreResult<ComparisonDecisionExplanationV1>;
  }

  const output: ComparisonDecisionExplanationV1 = {
    kind: "comparison-decision-explanation",
    schemaVersion: COMPARISON_DECISION_EXPLANATION_V1_SCHEMA_VERSION,
    comparison: comparisonValidation.value,
    decision: decisionValidation.value,
    structuredExplanation: explanationValidation.value,
  };

  return createComparisonResult({
    status: "ok",
    provenance: createComparisonProvenance("core.comparison-v1.compareCompositionsBasic", [
      { kind: "evaluation", ref: evaluationA.evaluationRef },
      { kind: "evaluation", ref: evaluationB.evaluationRef },
      { kind: "comparison-policy", ref: policy.policyRef },
      { kind: "comparison-operation", ref: `${COMPARISON_OPERATION_REF}@${operationVersion}` },
    ]),
    outputRefs: [
      { kind: "comparison", ref: comparison.comparisonRef },
      { kind: "decision", ref: decision.decisionRef },
      { kind: "structured-explanation", ref: structuredExplanation.explanationRef },
    ],
    output,
  });
}

export function validateComparisonV1(value: unknown): CoreResult<ComparisonV1> {
  const validation = validateComparisonValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<ComparisonV1>;
  }

  return createComparisonResult({
    status: "ok",
    provenance: createComparisonProvenance("core.comparison-v1.validate", [
      { kind: "comparison", ref: validation.value.comparisonRef },
    ]),
    outputRefs: [{ kind: "comparison", ref: validation.value.comparisonRef }],
    output: validation.value,
  });
}

export function validateDecisionV1(value: unknown, comparison?: unknown): CoreResult<DecisionV1> {
  const comparisonValidation = comparison === undefined ? null : validateComparisonValue(comparison);
  if (comparisonValidation !== null && !comparisonValidation.ok) {
    return invalidDecision("comparison", "Decision V1 cannot be validated against an invalid Comparison V1.") as CoreResult<DecisionV1>;
  }

  const validation = validateDecisionValue(
    value,
    comparisonValidation === null ? undefined : comparisonValidation.value,
  );
  if (!validation.ok) {
    return validation.result as CoreResult<DecisionV1>;
  }

  return createComparisonResult({
    status: "ok",
    provenance: createComparisonProvenance("core.decision-v1.validate", [
      { kind: "decision", ref: validation.value.decisionRef },
    ]),
    outputRefs: [{ kind: "decision", ref: validation.value.decisionRef }],
    output: validation.value,
  });
}

export function validateStructuredExplanationV1(
  value: unknown,
  comparison?: unknown,
  decision?: unknown,
): CoreResult<StructuredExplanationV1> {
  const comparisonValidation = comparison === undefined ? null : validateComparisonValue(comparison);
  if (comparisonValidation !== null && !comparisonValidation.ok) {
    return invalidStructuredExplanation(
      "comparison",
      "StructuredExplanation V1 cannot be validated against an invalid Comparison V1.",
    ) as CoreResult<StructuredExplanationV1>;
  }

  const decisionValidation = decision === undefined
    ? null
    : validateDecisionValue(
      decision,
      comparisonValidation === null ? undefined : comparisonValidation.value,
    );
  if (decisionValidation !== null && !decisionValidation.ok) {
    return invalidStructuredExplanation(
      "decision",
      "StructuredExplanation V1 cannot be validated against an invalid Decision V1.",
    ) as CoreResult<StructuredExplanationV1>;
  }

  const validation = validateStructuredExplanationValue(
    value,
    comparisonValidation === null ? undefined : comparisonValidation.value,
    decisionValidation === null ? undefined : decisionValidation.value,
  );
  if (!validation.ok) {
    return validation.result as CoreResult<StructuredExplanationV1>;
  }

  return createComparisonResult({
    status: "ok",
    provenance: createComparisonProvenance("core.structured-explanation-v1.validate", [
      { kind: "structured-explanation", ref: validation.value.explanationRef },
    ]),
    outputRefs: [{ kind: "structured-explanation", ref: validation.value.explanationRef }],
    output: validation.value,
  });
}

function validateComparisonPolicyValue(policy: unknown): ComparisonValidation<ComparisonPolicyV1> {
  if (!isRecord(policy)) {
    return failedComparison(invalidComparisonPolicy("policy", "ComparisonPolicy V1 must be a structured object."));
  }

  const forbiddenField = firstForbiddenPolicyField(policy);
  if (forbiddenField !== null) {
    if (BEAUTY_POLICY_FIELDS.includes(forbiddenField as (typeof BEAUTY_POLICY_FIELDS)[number])) {
      return failedComparison(beautyClaimRejected(forbiddenField));
    }
    if (RECOMMENDATION_POLICY_FIELDS.includes(forbiddenField as (typeof RECOMMENDATION_POLICY_FIELDS)[number])) {
      return failedComparison(recommendationRejected(forbiddenField));
    }
    return failedComparison(invalidComparisonPolicy(forbiddenField, `ComparisonPolicy V1 cannot contain executable field: ${forbiddenField}.`));
  }

  const unsupportedField = firstUnsupportedKey(policy, COMPARISON_POLICY_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedComparison(invalidComparisonPolicy(unsupportedField, `ComparisonPolicy V1 field is outside scope: ${unsupportedField}.`));
  }

  if (policy.kind !== "comparison-policy"
    || policy.schemaVersion !== COMPARISON_POLICY_V1_SCHEMA_VERSION
    || !isNonEmptyString(policy.policyRef)
    || !isNonNegativeFiniteNumber(policy.tieTolerance)
    || !isNormalizedNumber(policy.minimumConfidence)
    || policy.ambiguousEvaluationPolicy !== "do_not_select"
    || !isSourceReferenceArray(policy.sourceRefs)
    || policy.sourceRefs.length === 0
    || !isProvenance(policy.provenance)) {
    return failedComparison(invalidComparisonPolicy("policy", "ComparisonPolicy V1 identity, thresholds, or provenance are invalid."));
  }

  return validComparison(policy as unknown as ComparisonPolicyV1);
}

function validateComparisonInputValue(input: unknown): ComparisonValidation<ComparisonInputV1> {
  if (!isRecord(input)) {
    return failedComparison(invalidComparison("comparisonInput", "Comparison input must be a structured object."));
  }

  const unsupportedField = firstUnsupportedKey(input, COMPARISON_INPUT_ALLOWED_KEYS);
  if (unsupportedField !== null) {
    return failedComparison(invalidComparison(unsupportedField, `Comparison input field is outside scope: ${unsupportedField}.`));
  }

  if (input.kind !== "comparison-input"
    || input.schemaVersion !== "comparison-input-v1"
    || !isNonEmptyString(input.operationVersion)
    || !isSourceReferenceArray(input.sourceRefs)
    || input.sourceRefs.length === 0) {
    return failedComparison(invalidComparison("comparisonInput", "Comparison input identity or source refs are invalid."));
  }

  if (input.evaluationA === undefined || input.evaluationA === null) {
    return failedComparison(missingEvaluationInput("evaluationA"));
  }
  if (input.evaluationB === undefined || input.evaluationB === null) {
    return failedComparison(missingEvaluationInput("evaluationB"));
  }

  const evaluationAValidation = validateEvaluationV1(input.evaluationA);
  if (evaluationAValidation.status !== "ok" || evaluationAValidation.output === null) {
    return failedComparison(invalidComparison("evaluationA", "evaluationA must be a valid EvaluationV1."));
  }

  const evaluationBValidation = validateEvaluationV1(input.evaluationB);
  if (evaluationBValidation.status !== "ok" || evaluationBValidation.output === null) {
    return failedComparison(invalidComparison("evaluationB", "evaluationB must be a valid EvaluationV1."));
  }

  const policyValidation = validateComparisonPolicyValue(input.policy);
  if (!policyValidation.ok) {
    return policyValidation;
  }

  return validComparison({
    kind: "comparison-input",
    schemaVersion: "comparison-input-v1",
    evaluationA: evaluationAValidation.output,
    evaluationB: evaluationBValidation.output,
    policy: policyValidation.value,
    operationVersion: input.operationVersion,
    sourceRefs: input.sourceRefs,
  });
}

function createComparison(input: ComparisonInputV1): ComparisonV1 {
  const { evaluationA, evaluationB, policy, operationVersion } = input;
  const comparisonRef = comparisonRefFor(evaluationA, evaluationB, policy, operationVersion);
  const signedScoreDelta = evaluationA.score.overallScore - evaluationB.score.overallScore;
  const absoluteScoreDelta = Math.abs(signedScoreDelta);
  const contextChecks = contextChecksFor(evaluationA, evaluationB);
  const status = statusForComparison(
    evaluationA,
    evaluationB,
    policy,
    contextChecks,
    signedScoreDelta,
    absoluteScoreDelta,
  );
  const warnings = warningsForStatus(comparisonRef, status, evaluationA, evaluationB, policy, contextChecks);
  const limits = comparisonLimits(policy);
  const sourceRefs = uniqueSourceRefs([
    ...input.sourceRefs,
    { kind: "evaluation", ref: evaluationA.evaluationRef },
    { kind: "evaluation", ref: evaluationB.evaluationRef },
    { kind: "score", ref: evaluationA.score.scoreRef },
    { kind: "score", ref: evaluationB.score.scoreRef },
    { kind: "confidence", ref: evaluationA.confidence.confidenceRef },
    { kind: "confidence", ref: evaluationB.confidence.confidenceRef },
    { kind: "comparison-policy", ref: policy.policyRef },
  ]);

  return {
    kind: "comparison",
    schemaVersion: COMPARISON_V1_SCHEMA_VERSION,
    comparisonRef,
    evaluationARef: evaluationA.evaluationRef,
    evaluationBRef: evaluationB.evaluationRef,
    compositionARef: evaluationA.compositionRef,
    compositionBRef: evaluationB.compositionRef,
    policyRef: policy.policyRef,
    profileRef: sharedContextValue(contextChecks, "profileRef"),
    packRef: sharedContextValue(contextChecks, "packRef"),
    evaluationAStatus: evaluationA.status,
    evaluationBStatus: evaluationB.status,
    scoreA: evaluationA.score.overallScore,
    scoreB: evaluationB.score.overallScore,
    signedScoreDelta,
    absoluteScoreDelta,
    confidenceA: evaluationA.confidence.value,
    confidenceB: evaluationB.confidence.value,
    contextChecks,
    status,
    selectedEvaluationRef: selectedEvaluationRef(status, evaluationA, evaluationB),
    selectedCompositionRef: selectedCompositionRef(status, evaluationA, evaluationB),
    warnings,
    limits,
    sourceRefs,
    provenance: createComparisonProvenance("core.comparison-v1.compare", sourceRefs),
    decisionRef: `${comparisonRef}:decision`,
    explanationRef: `${comparisonRef}:explanation`,
    artifactRefs: [],
  };
}

function createDecision(comparison: ComparisonV1, evaluationA: EvaluationV1, evaluationB: EvaluationV1): DecisionV1 {
  const sourceRefs = uniqueSourceRefs([
    { kind: "comparison", ref: comparison.comparisonRef },
    { kind: "evaluation", ref: evaluationA.evaluationRef },
    { kind: "evaluation", ref: evaluationB.evaluationRef },
    { kind: "score", ref: evaluationA.score.scoreRef },
    { kind: "score", ref: evaluationB.score.scoreRef },
    { kind: "comparison-policy", ref: comparison.policyRef },
  ]);

  return {
    kind: "decision",
    schemaVersion: DECISION_V1_SCHEMA_VERSION,
    decisionRef: comparison.decisionRef,
    comparisonRef: comparison.comparisonRef,
    status: comparison.status,
    selectedEvaluationRef: comparison.selectedEvaluationRef,
    selectedCompositionRef: comparison.selectedCompositionRef,
    sourceEvaluationRefs: [
      { kind: "evaluation", ref: evaluationA.evaluationRef },
      { kind: "evaluation", ref: evaluationB.evaluationRef },
    ],
    sourceScoreRefs: [
      { kind: "score", ref: evaluationA.score.scoreRef },
      { kind: "score", ref: evaluationB.score.scoreRef },
    ],
    policyRef: comparison.policyRef,
    warnings: comparison.warnings,
    limits: comparison.limits,
    sourceRefs,
    provenance: createComparisonProvenance("core.decision-v1.derive", sourceRefs),
  };
}

function createStructuredExplanation(comparison: ComparisonV1, decision: DecisionV1): StructuredExplanationV1 {
  const sourceRefs = uniqueSourceRefs([
    { kind: "comparison", ref: comparison.comparisonRef },
    { kind: "decision", ref: decision.decisionRef },
    { kind: "evaluation", ref: comparison.evaluationARef },
    { kind: "evaluation", ref: comparison.evaluationBRef },
    ...decision.sourceScoreRefs,
    { kind: "comparison-policy", ref: comparison.policyRef },
  ]);

  return {
    kind: "structured-explanation",
    schemaVersion: STRUCTURED_EXPLANATION_V1_SCHEMA_VERSION,
    explanationRef: comparison.explanationRef,
    comparisonRef: comparison.comparisonRef,
    decisionRef: decision.decisionRef,
    claimCode: claimCodeForStatus(comparison.status),
    factRefs: sourceRefs,
    facts: {
      kind: "structured-explanation-facts",
      status: comparison.status,
      scoreA: comparison.scoreA,
      scoreB: comparison.scoreB,
      signedScoreDelta: comparison.signedScoreDelta,
      absoluteScoreDelta: comparison.absoluteScoreDelta,
      tieTolerance: comparison.limits.tieTolerance,
      confidenceA: comparison.confidenceA,
      confidenceB: comparison.confidenceB,
      selectedEvaluationRef: comparison.selectedEvaluationRef,
      selectedCompositionRef: comparison.selectedCompositionRef,
      contextMismatches: comparison.contextChecks.filter((check) => !check.matches),
      warningCodes: comparison.warnings.map((warning) => warning.code),
    },
    summary: summaryForStatus(comparison),
    limits: comparison.limits,
    sourceRefs,
    provenance: createComparisonProvenance("core.structured-explanation-v1.derive", sourceRefs),
  };
}

function validateComparisonValue(value: unknown): ComparisonValidation<ComparisonV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, COMPARISON_ALLOWED_KEYS) !== null) {
    return failedComparison(invalidComparison("comparison", "Comparison V1 must be closed and structured."));
  }

  if (value.kind !== "comparison"
    || value.schemaVersion !== COMPARISON_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.comparisonRef)
    || !isNonEmptyString(value.evaluationARef)
    || !isNonEmptyString(value.evaluationBRef)
    || !isNonEmptyString(value.compositionARef)
    || !isNonEmptyString(value.compositionBRef)
    || !isNonEmptyString(value.policyRef)
    || !(value.profileRef === null || isNonEmptyString(value.profileRef))
    || !(value.packRef === null || isNonEmptyString(value.packRef))
    || !isEvaluationStatus(value.evaluationAStatus)
    || !isEvaluationStatus(value.evaluationBStatus)
    || !isNormalizedNumber(value.scoreA)
    || !isNormalizedNumber(value.scoreB)
    || !isFiniteNumber(value.signedScoreDelta)
    || !isNonNegativeFiniteNumber(value.absoluteScoreDelta)
    || !isNormalizedNumber(value.confidenceA)
    || !isNormalizedNumber(value.confidenceB)
    || !Array.isArray(value.contextChecks)
    || value.contextChecks.length === 0
    || !value.contextChecks.every(isComparisonContextCheck)
    || !isComparisonStatus(value.status)
    || !(value.selectedEvaluationRef === null || isNonEmptyString(value.selectedEvaluationRef))
    || !(value.selectedCompositionRef === null || isNonEmptyString(value.selectedCompositionRef))
    || !isComparisonWarningArray(value.warnings)
    || !isComparisonLimits(value.limits)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)
    || !isNonEmptyString(value.decisionRef)
    || !isNonEmptyString(value.explanationRef)
    || !isEmptySourceReferenceArray(value.artifactRefs)) {
    return failedComparison(invalidComparison("comparison", "Comparison V1 envelope is invalid."));
  }

  const comparison = value as unknown as ComparisonV1;
  if (new Set(comparison.contextChecks.map((check) => check.field)).size !== comparison.contextChecks.length) {
    return failedComparison(invalidComparison("contextChecks", "Comparison context checks must be unique by field."));
  }

  if (!comparison.contextChecks.every((check) => check.matches === (check.aValue === check.bValue))) {
    return failedComparison(invalidComparison("contextChecks", "Comparison context checks must not hide mismatched values."));
  }

  if (!nearlyEqual(comparison.signedScoreDelta, comparison.scoreA - comparison.scoreB)
    || !nearlyEqual(comparison.absoluteScoreDelta, Math.abs(comparison.signedScoreDelta))) {
    return failedComparison(invalidComparison("scoreDelta", "Comparison score deltas are inconsistent with source scores."));
  }

  const expectedStatus = expectedStatusForComparison(comparison);
  if (comparison.status !== expectedStatus) {
    return failedComparison(invalidComparison("status", "Comparison status is inconsistent with precedence, context, confidence, and score facts."));
  }

  if (!selectionMatchesStatus(comparison)) {
    return failedComparison(invalidComparison("selection", "Comparison selected refs are inconsistent with status."));
  }

  const profileContext = comparison.contextChecks.find((check) => check.field === "profileRef");
  const packContext = comparison.contextChecks.find((check) => check.field === "packRef");
  if ((profileContext?.matches === true && comparison.profileRef !== profileContext.aValue)
    || (profileContext?.matches === false && comparison.profileRef !== null)
    || (packContext?.matches === true && comparison.packRef !== packContext.aValue)
    || (packContext?.matches === false && comparison.packRef !== null)) {
    return failedComparison(invalidComparison("contextRefs", "Comparison shared profile or pack refs are inconsistent with context checks."));
  }

  return validComparison(comparison);
}

function validateDecisionValue(value: unknown, comparison?: ComparisonV1): ComparisonValidation<DecisionV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, DECISION_ALLOWED_KEYS) !== null) {
    return failedComparison(invalidDecision("decision", "Decision V1 must be closed and structured."));
  }

  if (value.kind !== "decision"
    || value.schemaVersion !== DECISION_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.decisionRef)
    || !isNonEmptyString(value.comparisonRef)
    || !isComparisonStatus(value.status)
    || !(value.selectedEvaluationRef === null || isNonEmptyString(value.selectedEvaluationRef))
    || !(value.selectedCompositionRef === null || isNonEmptyString(value.selectedCompositionRef))
    || !isSourceReferenceArray(value.sourceEvaluationRefs)
    || value.sourceEvaluationRefs.length !== 2
    || !isSourceReferenceArray(value.sourceScoreRefs)
    || value.sourceScoreRefs.length !== 2
    || !isNonEmptyString(value.policyRef)
    || !isComparisonWarningArray(value.warnings)
    || !isComparisonLimits(value.limits)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)) {
    return failedComparison(invalidDecision("decision", "Decision V1 envelope is invalid."));
  }

  const decision = value as unknown as DecisionV1;
  if (!decisionSelectionIsInternallyValid(decision)) {
    return failedComparison(invalidDecision("selection", "Decision V1 selection is inconsistent with status."));
  }

  if (comparison !== undefined) {
    if (decision.decisionRef !== comparison.decisionRef
      || decision.comparisonRef !== comparison.comparisonRef
      || decision.status !== comparison.status
      || decision.selectedEvaluationRef !== comparison.selectedEvaluationRef
      || decision.selectedCompositionRef !== comparison.selectedCompositionRef
      || decision.policyRef !== comparison.policyRef
      || !sameComparisonWarnings(decision.warnings, comparison.warnings)
      || !sameComparisonLimits(decision.limits, comparison.limits)) {
      return failedComparison(invalidDecision("comparisonRef", "Decision V1 must match its source Comparison V1."));
    }

    const expectedEvaluationRefs = [comparison.evaluationARef, comparison.evaluationBRef];
    const actualEvaluationRefs = decision.sourceEvaluationRefs.map((ref) => ref.ref);
    if (!decision.sourceEvaluationRefs.every((ref) => ref.kind === "evaluation")
      || !sameStringList(actualEvaluationRefs, expectedEvaluationRefs)
      || (decision.selectedEvaluationRef !== null && !expectedEvaluationRefs.includes(decision.selectedEvaluationRef))) {
      return failedComparison(invalidDecision("sourceEvaluationRefs", "Decision V1 evaluation refs must match the comparison."));
    }
  }

  return validComparison(decision);
}

function validateStructuredExplanationValue(
  value: unknown,
  comparison?: ComparisonV1,
  decision?: DecisionV1,
): ComparisonValidation<StructuredExplanationV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, STRUCTURED_EXPLANATION_ALLOWED_KEYS) !== null) {
    return failedComparison(invalidStructuredExplanation("structuredExplanation", "StructuredExplanation V1 must be closed and structured."));
  }

  if (value.kind !== "structured-explanation"
    || value.schemaVersion !== STRUCTURED_EXPLANATION_V1_SCHEMA_VERSION
    || !isNonEmptyString(value.explanationRef)
    || !isNonEmptyString(value.comparisonRef)
    || !isNonEmptyString(value.decisionRef)
    || !isStructuredExplanationClaimCode(value.claimCode)
    || !isSourceReferenceArray(value.factRefs)
    || value.factRefs.length === 0
    || !isStructuredExplanationFacts(value.facts)
    || !isNonEmptyString(value.summary)
    || summaryContainsForbiddenTerm(value.summary)
    || !isComparisonLimits(value.limits)
    || !isSourceReferenceArray(value.sourceRefs)
    || value.sourceRefs.length === 0
    || !isProvenance(value.provenance)) {
    return failedComparison(invalidStructuredExplanation("structuredExplanation", "StructuredExplanation V1 envelope is invalid."));
  }

  const explanation = value as unknown as StructuredExplanationV1;
  if (explanation.claimCode !== claimCodeForStatus(explanation.facts.status)) {
    return failedComparison(invalidStructuredExplanation("claimCode", "StructuredExplanation V1 claim code is inconsistent with status."));
  }

  if (comparison !== undefined) {
    if (explanation.explanationRef !== comparison.explanationRef
      || explanation.comparisonRef !== comparison.comparisonRef
      || explanation.facts.status !== comparison.status
      || !sameComparisonLimits(explanation.limits, comparison.limits)
      || !factsMatchComparison(explanation.facts, comparison)) {
      return failedComparison(invalidStructuredExplanation("facts", "StructuredExplanation V1 facts must match the source comparison."));
    }
  }

  if (decision !== undefined) {
    if (explanation.decisionRef !== decision.decisionRef
      || explanation.facts.selectedEvaluationRef !== decision.selectedEvaluationRef
      || explanation.facts.selectedCompositionRef !== decision.selectedCompositionRef) {
      return failedComparison(invalidStructuredExplanation("decisionRef", "StructuredExplanation V1 decision refs must match the source decision."));
    }
  }

  return validComparison(explanation);
}

function contextChecksFor(evaluationA: EvaluationV1, evaluationB: EvaluationV1): readonly ComparisonContextCheckV1[] {
  return [
    contextCheck("schemaVersion", evaluationA.schemaVersion, evaluationB.schemaVersion),
    contextCheck("operationRef", evaluationA.operationRef, evaluationB.operationRef),
    contextCheck("profileRef", evaluationA.profileRef, evaluationB.profileRef),
    contextCheck("packRef", evaluationA.packRef, evaluationB.packRef),
    contextCheck("ruleSetRef", evaluationA.ruleSetRef, evaluationB.ruleSetRef),
    contextCheck("constructionRef", evaluationA.constructionRef, evaluationB.constructionRef),
    contextCheck("scoreSchemaVersion", evaluationA.score.schemaVersion, evaluationB.score.schemaVersion),
    contextCheck("confidenceSchemaVersion", evaluationA.confidence.schemaVersion, evaluationB.confidence.schemaVersion),
    contextCheck("scoreLimits", stableJson(evaluationA.score.limits), stableJson(evaluationB.score.limits)),
    contextCheck("evaluationLimits", stableJson(evaluationA.limits), stableJson(evaluationB.limits)),
    contextCheck("confidencePolicy", stableJson(evaluationA.confidence.policy), stableJson(evaluationB.confidence.policy)),
    contextCheck("statusThresholds", stableJson(evaluationA.limits.statusThresholds), stableJson(evaluationB.limits.statusThresholds)),
    contextCheck("missingMeasurementPolicy", stableJson(evaluationA.limits.missingMeasurementPolicy), stableJson(evaluationB.limits.missingMeasurementPolicy)),
    contextCheck("weightNormalization", evaluationA.limits.weightNormalization, evaluationB.limits.weightNormalization),
  ];
}

function contextCheck(field: string, aValue: string | null, bValue: string | null): ComparisonContextCheckV1 {
  return {
    kind: "comparison-context-check",
    field,
    aValue,
    bValue,
    matches: aValue === bValue,
  };
}

function statusForComparison(
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
  policy: ComparisonPolicyV1,
  contextChecks: readonly ComparisonContextCheckV1[],
  signedScoreDelta: number,
  absoluteScoreDelta: number,
): ComparisonStatusV1 {
  if (contextChecks.some((check) => !check.matches)) {
    return "non_comparable";
  }
  if (evaluationA.status === "ambiguous"
    || evaluationB.status === "ambiguous"
    || evaluationA.confidence.value < policy.minimumConfidence
    || evaluationB.confidence.value < policy.minimumConfidence) {
    return "ambiguous";
  }
  if (absoluteScoreDelta <= policy.tieTolerance) {
    return "tie";
  }
  return signedScoreDelta > 0 ? "a_closer" : "b_closer";
}

function expectedStatusForComparison(comparison: ComparisonV1): ComparisonStatusV1 {
  if (comparison.contextChecks.some((check) => !check.matches)) {
    return "non_comparable";
  }
  if (comparison.evaluationAStatus === "ambiguous"
    || comparison.evaluationBStatus === "ambiguous"
    || comparison.confidenceA < comparison.limits.minimumConfidence
    || comparison.confidenceB < comparison.limits.minimumConfidence) {
    return "ambiguous";
  }
  if (comparison.absoluteScoreDelta <= comparison.limits.tieTolerance) {
    return "tie";
  }
  return comparison.signedScoreDelta > 0 ? "a_closer" : "b_closer";
}

function warningsForStatus(
  comparisonRef: string,
  status: ComparisonStatusV1,
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
  policy: ComparisonPolicyV1,
  contextChecks: readonly ComparisonContextCheckV1[],
): readonly ComparisonWarningV1[] {
  const warnings: ComparisonWarningV1[] = [];
  const evaluationRefs = [
    { kind: "evaluation", ref: evaluationA.evaluationRef },
    { kind: "evaluation", ref: evaluationB.evaluationRef },
  ];
  if (status === "non_comparable") {
    warnings.push(comparisonWarning("ContextMismatch", comparisonRef, [
      ...evaluationRefs,
      ...contextChecks.filter((check) => !check.matches).map((check) => ({ kind: "comparison-context-check", ref: check.field })),
    ]));
  }
  if (status === "ambiguous") {
    if (evaluationA.status === "ambiguous" || evaluationB.status === "ambiguous") {
      warnings.push(comparisonWarning("EvaluationAmbiguous", comparisonRef, evaluationRefs));
    }
    if (evaluationA.confidence.value < policy.minimumConfidence || evaluationB.confidence.value < policy.minimumConfidence) {
      warnings.push(comparisonWarning("LowComparisonConfidence", comparisonRef, [
        { kind: "confidence", ref: evaluationA.confidence.confidenceRef },
        { kind: "confidence", ref: evaluationB.confidence.confidenceRef },
        { kind: "comparison-policy", ref: policy.policyRef },
      ]));
    }
  }
  if (status === "tie") {
    warnings.push(comparisonWarning("TiedWithinTolerance", comparisonRef, [
      { kind: "score", ref: evaluationA.score.scoreRef },
      { kind: "score", ref: evaluationB.score.scoreRef },
      { kind: "comparison-policy", ref: policy.policyRef },
    ]));
  }
  return warnings;
}

function comparisonWarning(
  code: ComparisonWarningCodeV1,
  targetRef: string,
  sourceRefs: readonly SourceReference[],
): ComparisonWarningV1 {
  return {
    kind: "comparison-warning",
    code,
    targetRef,
    sourceRefs: uniqueSourceRefs(sourceRefs),
  };
}

function comparisonLimits(policy: ComparisonPolicyV1): ComparisonLimitsV1 {
  return {
    kind: "comparison-limits",
    tieTolerance: policy.tieTolerance,
    minimumConfidence: policy.minimumConfidence,
    ambiguousEvaluationPolicy: policy.ambiguousEvaluationPolicy,
    statusPrecedence: STATUS_PRECEDENCE,
  };
}

function comparisonRefFor(
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
  policy: ComparisonPolicyV1,
  operationVersion: string,
): string {
  return `comparison:${evaluationA.evaluationRef}:${evaluationB.evaluationRef}:${policy.policyRef}:${operationVersion}`;
}

function selectedEvaluationRef(
  status: ComparisonStatusV1,
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
): string | null {
  if (status === "a_closer") {
    return evaluationA.evaluationRef;
  }
  if (status === "b_closer") {
    return evaluationB.evaluationRef;
  }
  return null;
}

function selectedCompositionRef(
  status: ComparisonStatusV1,
  evaluationA: EvaluationV1,
  evaluationB: EvaluationV1,
): string | null {
  if (status === "a_closer") {
    return evaluationA.compositionRef;
  }
  if (status === "b_closer") {
    return evaluationB.compositionRef;
  }
  return null;
}

function selectionMatchesStatus(comparison: ComparisonV1): boolean {
  if (comparison.status === "a_closer") {
    return comparison.selectedEvaluationRef === comparison.evaluationARef
      && comparison.selectedCompositionRef === comparison.compositionARef;
  }
  if (comparison.status === "b_closer") {
    return comparison.selectedEvaluationRef === comparison.evaluationBRef
      && comparison.selectedCompositionRef === comparison.compositionBRef;
  }
  return comparison.selectedEvaluationRef === null && comparison.selectedCompositionRef === null;
}

function decisionSelectionIsInternallyValid(decision: DecisionV1): boolean {
  if (decision.status === "a_closer" || decision.status === "b_closer") {
    return decision.selectedEvaluationRef !== null && decision.selectedCompositionRef !== null;
  }
  return decision.selectedEvaluationRef === null && decision.selectedCompositionRef === null;
}

function claimCodeForStatus(status: ComparisonStatusV1): StructuredExplanationClaimCodeV1 {
  if (status === "a_closer") {
    return "A_CLOSER_TO_DECLARED_SYSTEM";
  }
  if (status === "b_closer") {
    return "B_CLOSER_TO_DECLARED_SYSTEM";
  }
  if (status === "tie") {
    return "TIED_WITHIN_TOLERANCE";
  }
  if (status === "ambiguous") {
    return "AMBIGUOUS_COMPARISON";
  }
  return "NON_COMPARABLE_CONTEXT";
}

function summaryForStatus(comparison: ComparisonV1): string {
  if (comparison.status === "a_closer") {
    return `Composition A is closer to the declared system under profile ${comparison.profileRef ?? "unknown"}.`;
  }
  if (comparison.status === "b_closer") {
    return `Composition B is closer to the declared system under profile ${comparison.profileRef ?? "unknown"}.`;
  }
  if (comparison.status === "tie") {
    return "The evaluations are tied because the score delta is within the declared tie tolerance.";
  }
  if (comparison.status === "ambiguous") {
    return "The comparison is ambiguous under the declared confidence policy.";
  }
  const mismatches = comparison.contextChecks.filter((check) => !check.matches).map((check) => check.field).join(", ");
  return `The evaluations are non-comparable because shared context differs: ${mismatches}.`;
}

function sharedContextValue(contextChecks: readonly ComparisonContextCheckV1[], field: string): string | null {
  const check = contextChecks.find((candidate) => candidate.field === field);
  return check?.matches === true ? check.aValue : null;
}

function factsMatchComparison(facts: StructuredExplanationFactsV1, comparison: ComparisonV1): boolean {
  return facts.status === comparison.status
    && nearlyEqual(facts.scoreA, comparison.scoreA)
    && nearlyEqual(facts.scoreB, comparison.scoreB)
    && nearlyEqual(facts.signedScoreDelta, comparison.signedScoreDelta)
    && nearlyEqual(facts.absoluteScoreDelta, comparison.absoluteScoreDelta)
    && nearlyEqual(facts.tieTolerance, comparison.limits.tieTolerance)
    && nearlyEqual(facts.confidenceA, comparison.confidenceA)
    && nearlyEqual(facts.confidenceB, comparison.confidenceB)
    && facts.selectedEvaluationRef === comparison.selectedEvaluationRef
    && facts.selectedCompositionRef === comparison.selectedCompositionRef
    && sameContextChecks(facts.contextMismatches, comparison.contextChecks.filter((check) => !check.matches))
    && sameStringList(facts.warningCodes, comparison.warnings.map((warning) => warning.code));
}

function createComparisonResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function createComparisonError(input: DiagnosticInput): CoreError {
  const diagnostic = { sourceRef: COMPARISON_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };

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

function createComparisonProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: COMPARISON_OPERATION_VERSION,
    inputRefs: uniqueSourceRefs(inputRefs),
    source: COMPARISON_SOURCE_REFERENCE,
  };
}

function invalidComparisonPolicy(targetRef: string, message: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [createComparisonError({ code: "InvalidComparisonPolicyV1", message, targetRef })],
  });
}

function invalidComparison(targetRef: string, message: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [createComparisonError({ code: "InvalidComparisonV1", message, targetRef })],
  });
}

function invalidDecision(targetRef: string, message: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [createComparisonError({ code: "InvalidDecisionV1", message, targetRef })],
  });
}

function invalidStructuredExplanation(targetRef: string, message: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [createComparisonError({ code: "InvalidStructuredExplanationV1", message, targetRef })],
  });
}

function missingEvaluationInput(targetRef: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [createComparisonError({
      code: "MissingEvaluationInput",
      message: "Comparison requires both EvaluationV1 inputs.",
      targetRef,
    })],
  });
}

function beautyClaimRejected(targetRef: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [createComparisonError({
      code: "BeautyClaimRejected",
      message: "ComparisonPolicy V1 cannot contain aesthetic preference fields.",
      targetRef,
    })],
  });
}

function recommendationRejected(targetRef: string): CoreResult {
  return createComparisonResult({
    status: "failed",
    errors: [createComparisonError({
      code: "RecommendationRejected",
      message: "ComparisonPolicy V1 cannot contain recommendation fields.",
      targetRef,
    })],
  });
}

function failedComparison(result: CoreResult): ComparisonValidation<never> {
  return { ok: false, result };
}

function validComparison<TValue>(value: TValue): ComparisonValidation<TValue> {
  return { ok: true, value };
}

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function firstForbiddenPolicyField(value: Record<string, unknown>): string | null {
  const forbiddenFields = [
    ...BEAUTY_POLICY_FIELDS,
    ...RECOMMENDATION_POLICY_FIELDS,
    ...EXECUTABLE_POLICY_FIELDS,
  ];
  return Object.keys(value).find((key) => forbiddenFields.includes(key as (typeof forbiddenFields)[number])) ?? null;
}

function firstUnsupportedKey(value: Record<string, unknown>, allowedKeys: readonly string[]): string | null {
  return Object.keys(value).find((key) => !allowedKeys.includes(key)) ?? null;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sameStringList(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function sameComparisonLimits(actual: ComparisonLimitsV1, expected: ComparisonLimitsV1): boolean {
  return actual.kind === expected.kind
    && nearlyEqual(actual.tieTolerance, expected.tieTolerance)
    && nearlyEqual(actual.minimumConfidence, expected.minimumConfidence)
    && actual.ambiguousEvaluationPolicy === expected.ambiguousEvaluationPolicy
    && sameStringList(actual.statusPrecedence, expected.statusPrecedence);
}

function sameComparisonWarnings(
  actual: readonly ComparisonWarningV1[],
  expected: readonly ComparisonWarningV1[],
): boolean {
  return actual.length === expected.length
    && actual.every((warning, index) => comparisonWarningKey(warning) === comparisonWarningKey(expected[index]));
}

function sameContextChecks(
  actual: readonly ComparisonContextCheckV1[],
  expected: readonly ComparisonContextCheckV1[],
): boolean {
  return actual.length === expected.length
    && actual.every((check, index) => contextCheckKey(check) === contextCheckKey(expected[index]));
}

function comparisonWarningKey(value: ComparisonWarningV1 | undefined): string {
  if (value === undefined) {
    return "";
  }
  return `${value.code}:${value.targetRef}:${value.sourceRefs.map((sourceRef) => `${sourceRef.kind}:${sourceRef.ref}`).join("|")}`;
}

function contextCheckKey(value: ComparisonContextCheckV1 | undefined): string {
  if (value === undefined) {
    return "";
  }
  return `${value.field}:${value.aValue ?? "null"}:${value.bValue ?? "null"}:${String(value.matches)}`;
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

function nearlyEqual(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= EPSILON;
}

function isComparisonStatus(value: unknown): value is ComparisonStatusV1 {
  return typeof value === "string" && (COMPARISON_V1_STATUSES as readonly string[]).includes(value);
}

function isComparisonWarningCode(value: unknown): value is ComparisonWarningCodeV1 {
  return typeof value === "string" && (COMPARISON_V1_WARNING_CODES as readonly string[]).includes(value);
}

function isStructuredExplanationClaimCode(value: unknown): value is StructuredExplanationClaimCodeV1 {
  return typeof value === "string" && (STRUCTURED_EXPLANATION_V1_CLAIM_CODES as readonly string[]).includes(value);
}

function isEvaluationStatus(value: unknown): value is EvaluationStatusV1 {
  return value === "match" || value === "near_match" || value === "weak_match" || value === "no_match" || value === "ambiguous";
}

function isComparisonContextCheck(value: unknown): value is ComparisonContextCheckV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, CONTEXT_CHECK_ALLOWED_KEYS) === null
    && value.kind === "comparison-context-check"
    && isNonEmptyString(value.field)
    && (value.aValue === null || isNonEmptyString(value.aValue))
    && (value.bValue === null || isNonEmptyString(value.bValue))
    && typeof value.matches === "boolean";
}

function isComparisonWarning(value: unknown): value is ComparisonWarningV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, COMPARISON_WARNING_ALLOWED_KEYS) === null
    && value.kind === "comparison-warning"
    && isComparisonWarningCode(value.code)
    && isNonEmptyString(value.targetRef)
    && isSourceReferenceArray(value.sourceRefs);
}

function isComparisonWarningArray(value: unknown): value is readonly ComparisonWarningV1[] {
  return Array.isArray(value) && value.every(isComparisonWarning);
}

function isComparisonLimits(value: unknown): value is ComparisonLimitsV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, COMPARISON_LIMITS_ALLOWED_KEYS) === null
    && value.kind === "comparison-limits"
    && isNonNegativeFiniteNumber(value.tieTolerance)
    && isNormalizedNumber(value.minimumConfidence)
    && value.ambiguousEvaluationPolicy === "do_not_select"
    && Array.isArray(value.statusPrecedence)
    && sameStringList(value.statusPrecedence, STATUS_PRECEDENCE);
}

function isStructuredExplanationFacts(value: unknown): value is StructuredExplanationFactsV1 {
  return isRecord(value)
    && firstUnsupportedKey(value, STRUCTURED_EXPLANATION_FACTS_ALLOWED_KEYS) === null
    && value.kind === "structured-explanation-facts"
    && isComparisonStatus(value.status)
    && isNormalizedNumber(value.scoreA)
    && isNormalizedNumber(value.scoreB)
    && isFiniteNumber(value.signedScoreDelta)
    && isNonNegativeFiniteNumber(value.absoluteScoreDelta)
    && isNonNegativeFiniteNumber(value.tieTolerance)
    && isNormalizedNumber(value.confidenceA)
    && isNormalizedNumber(value.confidenceB)
    && (value.selectedEvaluationRef === null || isNonEmptyString(value.selectedEvaluationRef))
    && (value.selectedCompositionRef === null || isNonEmptyString(value.selectedCompositionRef))
    && Array.isArray(value.contextMismatches)
    && value.contextMismatches.every(isComparisonContextCheck)
    && Array.isArray(value.warningCodes)
    && value.warningCodes.every(isComparisonWarningCode);
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

function summaryContainsForbiddenTerm(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_SUMMARY_TERMS.some((term) => lower.includes(term));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNormalizedNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
