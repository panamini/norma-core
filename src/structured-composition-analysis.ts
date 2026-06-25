import type {
  Composition2D,
  CoordinateSystem,
  CoreError,
  CoreResult,
  CoreWarning,
  Diagnostic,
  DiagnosticCode,
  MetricPolicy,
  NumericPolicy,
  OperationContext,
  OperationContextRef,
  OutputRefs,
  PackLock,
  PackLockRef,
  Provenance,
  ReplayReadinessStatus,
  RoundingPolicy,
  Run,
  SourceReference,
  SurfaceSpace,
  TolerancePolicy,
} from "./index.js";
import {
  createCoreError,
  validateGeometryV1,
} from "./index.js";
import type { RatioPack } from "./ratio-pack.js";
import { validateRatioPackV1 } from "./ratio-pack.js";
import type { ResolvedRuleSet } from "./rules.js";
import { resolveRuleSet } from "./rules.js";
import type { Construction } from "./construction.js";
import { generateConstruction } from "./construction.js";
import type { MeasurementSet } from "./measurements.js";
import { measureGeometry } from "./measurements.js";
import type {
  Evaluation,
  EvaluationProfile,
  EvaluationTolerances,
} from "./evaluation.js";
import { evaluateCompositionBasic } from "./evaluation.js";
import type {
  Comparison,
  Decision,
  TiePolicy,
} from "./comparison.js";
import { compareCompositionsBasic } from "./comparison.js";
import {
  createPackLock,
  createRun,
  sortOutputRefsDeterministically,
  validateRunReadiness,
} from "./runtime.js";
import {
  canonicalizeDiagnostics,
  canonicalizeErrors,
  canonicalizeRefs,
  canonicalizeWarnings,
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
  STABLE_SERIALIZATION_VERSION,
} from "./serialization.js";

export const STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME = "core.structured-composition-analysis.analyze" as const;
export const STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION = "0.1.0-r6" as const;
export const STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION = "structured-composition-analysis-input.v1" as const;
export const STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION = "structured-composition-analysis-result.v1" as const;

export type StructuredCompositionAnalysisStatusV1 = "valid" | "invalid";

export interface StructuredCompositionAcceptanceV1 {
  accepted: true;
  mode: "user_supplied_structured_data";
  acceptedBy: string;
  acceptedAt: string;
  acceptedSourceIds: readonly string[];
  acceptanceRecordId: string;
}

export interface StructuredCompositionTransformationStepV1 {
  kind: "structured-composition-transformation-step";
  id: string;
  description: string;
  inputRefs: readonly SourceReference[];
  outputRefs: readonly SourceReference[];
}

export interface StructuredCompositionAnalysisProvenanceV1 {
  kind: "structured-composition-analysis-provenance";
  sourceKind: "user_supplied_structured_data";
  externalSourceRef: SourceReference | null;
  callerSourceIds: readonly string[];
  adapter: {
    id: string;
    version: string;
  } | null;
  mappingVersion: string;
  normalizationVersion: string | null;
  transformationSteps: readonly StructuredCompositionTransformationStepV1[];
  acceptanceRecord: StructuredCompositionAcceptanceV1;
  operationContextRef: OperationContextRef;
}

export interface StructuredCompositionAnalysisInputV1 {
  contractVersion: typeof STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION;
  analysisId: string;
  compositionA: Composition2D;
  compositionB: Composition2D;
  acceptance: StructuredCompositionAcceptanceV1;
  ratioPack: RatioPack;
  packLock: PackLock;
  ruleSetRef: string;
  evaluationProfile: EvaluationProfile;
  evaluationTolerances: EvaluationTolerances;
  comparisonTolerances: TiePolicy;
  tolerancePolicy: TolerancePolicy;
  operationContext: OperationContext;
  provenance: StructuredCompositionAnalysisProvenanceV1;
}

export interface StructuredCompositionAnalysisValidationV1 {
  kind: "structured-composition-analysis-validation";
  status: StructuredCompositionAnalysisStatusV1;
  diagnostics: readonly Diagnostic[];
  acceptedSourceIds: readonly string[];
  effectiveSourceIds: readonly string[];
}

export interface StructuredCompositionAnalysisMeasurementsV1 {
  a: MeasurementSet;
  b: MeasurementSet;
}

export interface StructuredCompositionAnalysisEvaluationsV1 {
  a: Evaluation;
  b: Evaluation;
}

export interface StructuredCompositionAnalysisReplayReadinessV1 {
  status: ReplayReadinessStatus;
  run: Run;
}

export interface StructuredCompositionAnalysisSerializationSummaryV1 {
  serializationVersion: typeof STABLE_SERIALIZATION_VERSION;
  meaningfulIdentity: string;
}

interface StructuredCompositionAnalysisResultBaseV1 {
  kind: "structured-composition-analysis-result";
  contractVersion: typeof STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION;
  operationName: typeof STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME;
  operationVersion: typeof STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION;
  status: StructuredCompositionAnalysisStatusV1;
  analysisId: string;
  inputRefs: readonly SourceReference[];
  outputRefs: readonly SourceReference[];
  validation: StructuredCompositionAnalysisValidationV1;
  diagnostics: readonly Diagnostic[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: StructuredCompositionAnalysisProvenanceV1 | null;
}

export interface StructuredCompositionAnalysisValidResultV1 extends StructuredCompositionAnalysisResultBaseV1 {
  status: "valid";
  outputRefs: readonly SourceReference[];
  measurements: StructuredCompositionAnalysisMeasurementsV1;
  evaluations: StructuredCompositionAnalysisEvaluationsV1;
  comparison: Comparison;
  decision: Decision;
  packLockRef: PackLockRef;
  operationContextRef: OperationContextRef;
  replayReadiness: StructuredCompositionAnalysisReplayReadinessV1;
  serializationSummary: StructuredCompositionAnalysisSerializationSummaryV1;
}

export interface StructuredCompositionAnalysisInvalidResultV1 extends StructuredCompositionAnalysisResultBaseV1 {
  status: "invalid";
  outputRefs: readonly [];
  measurements: null;
  evaluations: null;
  comparison: null;
  decision: null;
  packLockRef: PackLockRef | null;
  operationContextRef: OperationContextRef | null;
  replayReadiness: null;
  serializationSummary: null;
}

export type StructuredCompositionAnalysisResultV1 =
  | StructuredCompositionAnalysisValidResultV1
  | StructuredCompositionAnalysisInvalidResultV1;

interface PreparedAnalysisInput {
  input: StructuredCompositionAnalysisInputV1;
  analysisId: string;
  surface: SurfaceSpace;
  ratioPack: RatioPack;
  resolvedRuleSet: ResolvedRuleSet;
  packLock: PackLock;
  operationContext: OperationContext;
  inputRefs: readonly SourceReference[];
  effectiveSourceIds: readonly string[];
  acceptedSourceIds: readonly string[];
}

type InputValidation =
  | {
      ok: true;
      value: PreparedAnalysisInput;
    }
  | {
      ok: false;
      result: StructuredCompositionAnalysisInvalidResultV1;
    };

type StageResult<TOutput> =
  | {
      ok: true;
      output: TOutput;
      result: CoreResult<TOutput>;
    }
  | {
      ok: false;
      result: StructuredCompositionAnalysisInvalidResultV1;
    };

const ANALYSIS_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/structured-composition-analysis-v1",
});

const ANALYSIS_RESULT_KIND = "structured-composition-analysis-result" as const;
const UNKNOWN_ANALYSIS_ID = "unknown-analysis" as const;

const INPUT_ALLOWED_KEYS = [
  "contractVersion",
  "analysisId",
  "compositionA",
  "compositionB",
  "acceptance",
  "ratioPack",
  "packLock",
  "ruleSetRef",
  "evaluationProfile",
  "evaluationTolerances",
  "comparisonTolerances",
  "tolerancePolicy",
  "operationContext",
  "provenance",
] as const;

export function analyzeStructuredCompositionV1(
  input: StructuredCompositionAnalysisInputV1 | null | undefined,
): StructuredCompositionAnalysisResultV1 {
  const validation = validateStructuredCompositionAnalysisInput(input);
  if (!validation.ok) {
    return validation.result;
  }

  const prepared = validation.value;
  const construction = successfulStage(
    generateConstruction({
      surface: prepared.surface,
      pack: prepared.ratioPack,
      resolvedRuleSet: prepared.resolvedRuleSet,
      operationContextRef: prepared.operationContext.ref,
    }),
    prepared,
  );
  if (!construction.ok) {
    return construction.result;
  }

  const measurementA = successfulStage(
    measureGeometry({
      construction: construction.output,
      compositions: [{ label: "A", geometry: prepared.input.compositionA }],
      operationContextRef: prepared.operationContext.ref,
      requestedOutputs: ["measurements"],
    }),
    prepared,
  );
  if (!measurementA.ok) {
    return measurementA.result;
  }

  const measurementB = successfulStage(
    measureGeometry({
      construction: construction.output,
      compositions: [{ label: "B", geometry: prepared.input.compositionB }],
      operationContextRef: prepared.operationContext.ref,
      requestedOutputs: ["measurements"],
    }),
    prepared,
  );
  if (!measurementB.ok) {
    return measurementB.result;
  }

  const evaluationA = successfulStage(
    evaluateCompositionBasic({
      measurements: measurementA.output,
      compositionLabel: "A",
      profile: prepared.input.evaluationProfile,
      pack: prepared.ratioPack,
      packLock: prepared.packLock,
      packPreLock: prepared.ratioPack.preLock,
      tolerancePolicy: prepared.input.tolerancePolicy,
      tolerances: prepared.input.evaluationTolerances,
      operationContextRef: prepared.operationContext.ref,
      requestedOutputs: ["evaluation"],
      sourceReferences: evaluationSourceRefs(prepared),
    }),
    prepared,
  );
  if (!evaluationA.ok) {
    return evaluationA.result;
  }

  const evaluationB = successfulStage(
    evaluateCompositionBasic({
      measurements: measurementB.output,
      compositionLabel: "B",
      profile: prepared.input.evaluationProfile,
      pack: prepared.ratioPack,
      packLock: prepared.packLock,
      packPreLock: prepared.ratioPack.preLock,
      tolerancePolicy: prepared.input.tolerancePolicy,
      tolerances: prepared.input.evaluationTolerances,
      operationContextRef: prepared.operationContext.ref,
      requestedOutputs: ["evaluation"],
      sourceReferences: evaluationSourceRefs(prepared),
    }),
    prepared,
  );
  if (!evaluationB.ok) {
    return evaluationB.result;
  }

  const comparison = successfulStage(
    compareCompositionsBasic({
      evaluationA: evaluationA.output,
      evaluationB: evaluationB.output,
      tiePolicy: prepared.input.comparisonTolerances,
      operationContextRef: prepared.operationContext.ref,
      requestedOutputs: ["comparison", "decision", "explanation"],
    }),
    prepared,
  );
  if (!comparison.ok) {
    return comparison.result;
  }

  return createValidAnalysisResult(prepared, {
    construction,
    measurementA,
    measurementB,
    evaluationA,
    evaluationB,
    comparison,
  });
}

function validateStructuredCompositionAnalysisInput(
  input: StructuredCompositionAnalysisInputV1 | null | undefined,
): InputValidation {
  if (!isRecord(input)) {
    return invalidInput(input, [
      analysisError("InvalidInputShape", "Structured analysis input must be a structured object.", "input"),
    ]);
  }

  const analysisId = analysisIdFor(input);
  const unknownKey = Object.keys(input).find((key) => !INPUT_ALLOWED_KEYS.includes(key as (typeof INPUT_ALLOWED_KEYS)[number]));
  if (unknownKey !== undefined) {
    return invalidInput(input, [
      analysisError("InvalidInputShape", `Structured analysis input has an unknown field: ${unknownKey}.`, unknownKey),
    ]);
  }

  if (input.contractVersion !== STRUCTURED_COMPOSITION_ANALYSIS_INPUT_CONTRACT_VERSION) {
    return invalidInput(input, [
      analysisError("InvalidInputShape", "Structured analysis input contractVersion is unsupported.", "contractVersion"),
    ]);
  }

  if (!nonEmptyString(input.analysisId)) {
    return invalidInput(input, [
      analysisError("InvalidInputShape", "Structured analysis input requires a non-empty analysisId.", "analysisId"),
    ]);
  }

  const compositionAResult = validateGeometryV1(input.compositionA);
  if (compositionAResult.status !== "ok" || compositionAResult.output?.kind !== "composition-2d") {
    return { ok: false, result: invalidFromCore(input, [compositionAResult], { analysisId }) };
  }

  const compositionBResult = validateGeometryV1(input.compositionB);
  if (compositionBResult.status !== "ok" || compositionBResult.output?.kind !== "composition-2d") {
    return { ok: false, result: invalidFromCore(input, [compositionBResult], { analysisId }) };
  }

  const compositionA = compositionAResult.output;
  const compositionB = compositionBResult.output;
  if (!sameSerialized(compositionA.surface, compositionB.surface)) {
    return invalidInput(input, [
      analysisError("InvalidGeometryV1", "Composition A and B must reference the same SurfaceSpace.", "compositionB.surface"),
    ]);
  }

  const effectiveSourceIds = compositionSourceIds(compositionA, compositionB);
  const acceptanceFailure = validateAcceptance(input.acceptance, effectiveSourceIds);
  if (acceptanceFailure !== null) {
    return invalidInput(input, [acceptanceFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: acceptedSourceIdsFrom(input.acceptance),
    });
  }

  const ratioPackResult = validateRatioPackV1(input.ratioPack);
  if (ratioPackResult.status !== "ok" || ratioPackResult.output === null) {
    return { ok: false, result: invalidFromCore(input, [ratioPackResult], { analysisId, effectiveSourceIds, acceptedSourceIds: input.acceptance.acceptedSourceIds }) };
  }

  const ratioPack = ratioPackResult.output;
  const packLockFailure = validatePackLockCoherence(input.packLock, ratioPack);
  if (packLockFailure !== null) {
    return invalidInput(input, [packLockFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: packLockRefFrom(input.packLock),
    });
  }

  if (!nonEmptyString(input.ruleSetRef)) {
    return invalidInput(input, [
      analysisError("MissingRuleSet", "Structured analysis requires a non-empty ruleSetRef.", "ruleSetRef"),
    ], { analysisId, effectiveSourceIds, acceptedSourceIds: input.acceptance.acceptedSourceIds, packLockRef: input.packLock.ref });
  }

  const ruleSetResult = resolveRuleSet(ratioPack, input.ruleSetRef);
  if (ruleSetResult.status !== "ok" || ruleSetResult.output === null) {
    return { ok: false, result: invalidFromCore(input, [ruleSetResult], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: input.packLock.ref,
    }) };
  }

  const profileFailure = validateEvaluationProfile(input.evaluationProfile);
  if (profileFailure !== null) {
    return invalidInput(input, [profileFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: input.packLock.ref,
    });
  }

  const evaluationTolerancesFailure = validateEvaluationTolerances(input.evaluationTolerances);
  if (evaluationTolerancesFailure !== null) {
    return invalidInput(input, [evaluationTolerancesFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: input.packLock.ref,
    });
  }

  const comparisonTolerancesFailure = validateComparisonTolerances(input.comparisonTolerances);
  if (comparisonTolerancesFailure !== null) {
    return invalidInput(input, [comparisonTolerancesFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: input.packLock.ref,
    });
  }

  const tolerancePolicyFailure = validateTolerancePolicy(input.tolerancePolicy);
  if (tolerancePolicyFailure !== null) {
    return invalidInput(input, [tolerancePolicyFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: input.packLock.ref,
    });
  }

  const operationContextFailure = validateExplicitOperationContext(input.operationContext, input);
  if (operationContextFailure !== null) {
    return invalidInput(input, [operationContextFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: input.packLock.ref,
      operationContextRef: operationContextRefFrom(input.operationContext),
    });
  }

  const provenanceFailure = validateAnalysisProvenance(input.provenance, input.acceptance, effectiveSourceIds, input.operationContext.ref);
  if (provenanceFailure !== null) {
    return invalidInput(input, [provenanceFailure], {
      analysisId,
      effectiveSourceIds,
      acceptedSourceIds: input.acceptance.acceptedSourceIds,
      packLockRef: input.packLock.ref,
      operationContextRef: input.operationContext.ref,
    });
  }

  return {
    ok: true,
    value: {
      input,
      analysisId,
      surface: compositionA.surface,
      ratioPack,
      resolvedRuleSet: ruleSetResult.output,
      packLock: input.packLock,
      operationContext: input.operationContext,
      inputRefs: analysisInputRefs(input, effectiveSourceIds),
      effectiveSourceIds,
      acceptedSourceIds: [...input.acceptance.acceptedSourceIds].sort(compareStrings),
    },
  };
}

function successfulStage<TOutput>(
  result: CoreResult<TOutput>,
  prepared: PreparedAnalysisInput,
): StageResult<TOutput> {
  if (result.status !== "ok" || result.output === null) {
    return { ok: false, result: invalidFromCorePrepared(prepared, [result]) };
  }

  return { ok: true, output: result.output, result };
}

function createValidAnalysisResult(
  prepared: PreparedAnalysisInput,
  stages: {
    construction: StageResult<Construction> & { ok: true };
    measurementA: StageResult<MeasurementSet> & { ok: true };
    measurementB: StageResult<MeasurementSet> & { ok: true };
    evaluationA: StageResult<Evaluation> & { ok: true };
    evaluationB: StageResult<Evaluation> & { ok: true };
    comparison: StageResult<Comparison> & { ok: true };
  },
): StructuredCompositionAnalysisResultV1 {
  const outputRefs = sortOutputRefsDeterministically([
    ...stages.construction.result.outputRefs,
    { kind: "measurement-set", ref: stages.measurementA.output.id },
    ...stages.measurementA.result.outputRefs,
    { kind: "measurement-set", ref: stages.measurementB.output.id },
    ...stages.measurementB.result.outputRefs,
    ...stages.evaluationA.result.outputRefs,
    ...stages.evaluationB.result.outputRefs,
    ...stages.comparison.result.outputRefs,
  ]);
  const coreResultForRun = createCoreRunEnvelope(prepared, outputRefs);
  const runResult = createRun({
    operationName: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    packLock: prepared.packLock,
    operationContext: prepared.operationContext,
    result: coreResultForRun,
    outputRefs,
    sourceRefs: prepared.inputRefs,
  });
  if (runResult.status !== "ok" || runResult.output === null) {
    return invalidFromCorePrepared(prepared, [runResult]);
  }

  const readinessResult = validateRunReadiness({
    run: runResult.output,
    packLock: prepared.packLock,
    operationContext: prepared.operationContext,
  });
  if (readinessResult.status !== "ok" || readinessResult.output === null) {
    return invalidFromCorePrepared(prepared, [readinessResult]);
  }

  const warnings = canonicalizeWarnings([
    ...stages.construction.result.warnings,
    ...stages.measurementA.result.warnings,
    ...stages.measurementB.result.warnings,
    ...stages.evaluationA.result.warnings,
    ...stages.evaluationB.result.warnings,
    ...stages.comparison.result.warnings,
    ...runResult.warnings,
    ...readinessResult.warnings,
  ]);
  const errors = canonicalizeErrors([]);
  const diagnostics = canonicalizeDiagnostics([...warnings, ...errors]);

  return {
    kind: ANALYSIS_RESULT_KIND,
    contractVersion: STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION,
    operationName: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    status: "valid",
    analysisId: prepared.analysisId,
    inputRefs: prepared.inputRefs,
    outputRefs,
    validation: {
      kind: "structured-composition-analysis-validation",
      status: "valid",
      diagnostics,
      acceptedSourceIds: prepared.acceptedSourceIds,
      effectiveSourceIds: prepared.effectiveSourceIds,
    },
    measurements: {
      a: stages.measurementA.output,
      b: stages.measurementB.output,
    },
    evaluations: {
      a: stages.evaluationA.output,
      b: stages.evaluationB.output,
    },
    comparison: stages.comparison.output,
    decision: stages.comparison.output.decision,
    packLockRef: prepared.packLock.ref,
    operationContextRef: prepared.operationContext.ref,
    replayReadiness: {
      status: readinessResult.output,
      run: runResult.output,
    },
    diagnostics,
    warnings,
    errors,
    provenance: prepared.input.provenance,
    serializationSummary: {
      serializationVersion: STABLE_SERIALIZATION_VERSION,
      meaningfulIdentity: meaningfulIdentity(prepared, {
        outputRefs,
        measurements: {
          a: stages.measurementA.output,
          b: stages.measurementB.output,
        },
        evaluations: {
          a: stages.evaluationA.output,
          b: stages.evaluationB.output,
        },
        comparison: stages.comparison.output,
        decision: stages.comparison.output.decision,
        run: runResult.output,
        replayReadinessStatus: readinessResult.output,
      }),
    },
  };
}

function createCoreRunEnvelope(
  prepared: PreparedAnalysisInput,
  outputRefs: readonly SourceReference[],
): CoreResult {
  return {
    status: "ok",
    warnings: [],
    errors: [],
    provenance: createAnalysisCoreProvenance(prepared.inputRefs),
    outputRefs,
    runRef: null,
    packLockRef: prepared.packLock.ref,
    operationContextRef: prepared.operationContext.ref,
    output: {
      kind: "structured-composition-analysis-output-envelope",
      analysisId: prepared.analysisId,
    },
  };
}

function invalidInput(
  input: unknown,
  errors: readonly CoreError[],
  context: {
    analysisId?: string;
    inputRefs?: readonly SourceReference[];
    acceptedSourceIds?: readonly string[];
    effectiveSourceIds?: readonly string[];
    packLockRef?: PackLockRef | null;
    operationContextRef?: OperationContextRef | null;
  } = {},
): InputValidation {
  return {
    ok: false,
    result: createInvalidAnalysisResult(input, errors, [], context),
  };
}

function invalidFromCore(
  input: unknown,
  results: readonly CoreResult[],
  context: {
    analysisId?: string;
    inputRefs?: readonly SourceReference[];
    acceptedSourceIds?: readonly string[];
    effectiveSourceIds?: readonly string[];
    packLockRef?: PackLockRef | null;
    operationContextRef?: OperationContextRef | null;
  } = {},
): StructuredCompositionAnalysisInvalidResultV1 {
  return createInvalidAnalysisResult(
    input,
    results.flatMap((result) => result.errors),
    results.flatMap((result) => result.warnings),
    context,
  );
}

function invalidFromCorePrepared(
  prepared: PreparedAnalysisInput,
  results: readonly CoreResult[],
): StructuredCompositionAnalysisInvalidResultV1 {
  return invalidFromCore(prepared.input, results, {
    analysisId: prepared.analysisId,
    inputRefs: prepared.inputRefs,
    acceptedSourceIds: prepared.acceptedSourceIds,
    effectiveSourceIds: prepared.effectiveSourceIds,
    packLockRef: prepared.packLock.ref,
    operationContextRef: prepared.operationContext.ref,
  });
}

function createInvalidAnalysisResult(
  input: unknown,
  errorCandidates: readonly CoreError[],
  warningCandidates: readonly CoreWarning[],
  context: {
    analysisId?: string;
    inputRefs?: readonly SourceReference[];
    acceptedSourceIds?: readonly string[];
    effectiveSourceIds?: readonly string[];
    packLockRef?: PackLockRef | null;
    operationContextRef?: OperationContextRef | null;
  },
): StructuredCompositionAnalysisInvalidResultV1 {
  const fallbackError = analysisError("InvalidInputShape", "Structured analysis input is invalid.", "input");
  const errors = canonicalizeErrors(errorCandidates.length === 0 ? [fallbackError] : errorCandidates);
  const warnings = canonicalizeWarnings(warningCandidates);
  const diagnostics = canonicalizeDiagnostics([...errors, ...warnings]);
  const acceptedSourceIds = [...(context.acceptedSourceIds ?? acceptedSourceIdsFrom(recordField(input, "acceptance")))].sort(compareStrings);
  const effectiveSourceIds = [...(context.effectiveSourceIds ?? [])].sort(compareStrings);

  return {
    kind: ANALYSIS_RESULT_KIND,
    contractVersion: STRUCTURED_COMPOSITION_ANALYSIS_RESULT_CONTRACT_VERSION,
    operationName: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    status: "invalid",
    analysisId: context.analysisId ?? analysisIdFor(input),
    inputRefs: context.inputRefs ?? [],
    outputRefs: [],
    validation: {
      kind: "structured-composition-analysis-validation",
      status: "invalid",
      diagnostics,
      acceptedSourceIds,
      effectiveSourceIds,
    },
    measurements: null,
    evaluations: null,
    comparison: null,
    decision: null,
    packLockRef: context.packLockRef ?? packLockRefFrom(recordField(input, "packLock")),
    operationContextRef: context.operationContextRef ?? operationContextRefFrom(recordField(input, "operationContext")),
    replayReadiness: null,
    diagnostics,
    warnings,
    errors,
    provenance: provenanceFrom(recordField(input, "provenance")),
    serializationSummary: null,
  };
}

function validateAcceptance(
  acceptance: unknown,
  effectiveSourceIds: readonly string[],
): CoreError | null {
  if (!isAcceptance(acceptance)) {
    return analysisError("InvalidInputShape", "Structured analysis requires explicit user-supplied-data acceptance.", "acceptance");
  }

  if (acceptance.acceptedSourceIds.length !== new Set(acceptance.acceptedSourceIds).size) {
    return analysisError("InvalidInputShape", "Acceptance acceptedSourceIds must not contain duplicates.", "acceptance.acceptedSourceIds");
  }

  const accepted = [...acceptance.acceptedSourceIds].sort(compareStrings);
  if (!sameStrings(accepted, effectiveSourceIds)) {
    return analysisError("InvalidInputShape", "Acceptance acceptedSourceIds must exactly match both structured compositions.", "acceptance.acceptedSourceIds");
  }

  return null;
}

function validatePackLockCoherence(packLock: unknown, ratioPack: RatioPack): CoreError | null {
  if (!isPackLock(packLock)) {
    return analysisError("InvalidPackLock", "Structured analysis requires a PackLock.", "packLock");
  }

  const expectedLockResult = createPackLock({
    pack: ratioPack,
    sourceRefs: [{ kind: "ratio-pack", ref: ratioPackRef(ratioPack) }],
  });
  if (expectedLockResult.status !== "ok" || expectedLockResult.output === null) {
    return expectedLockResult.errors[0] ?? analysisError("InvalidPackLock", "Could not derive expected PackLock.", "packLock");
  }

  const expected = expectedLockResult.output;
  if (
    packLock.id !== expected.id
    || packLock.ref.id !== expected.ref.id
    || packLock.packId !== expected.packId
    || packLock.packVersion !== expected.packVersion
    || packLock.packSchemaVersion !== expected.packSchemaVersion
    || packLock.contentIdentity !== expected.contentIdentity
    || packLock.status !== expected.status
  ) {
    return analysisError("InvalidPackLock", "PackLock must match the supplied RatioPack identity and content identity.", "packLock");
  }

  return null;
}

function validateEvaluationProfile(profile: unknown): CoreError | null {
  if (!isRecord(profile) || profile.kind !== "evaluation-profile" || !nonEmptyString(profile.id) || !nonEmptyString(profile.ref)) {
    return analysisError("MissingEvaluationProfile", "Structured analysis requires an EvaluationProfile.", "evaluationProfile");
  }

  if (!Array.isArray(profile.components) || profile.components.length === 0) {
    return analysisError("MissingEvaluationProfile", "EvaluationProfile requires components.", "evaluationProfile.components");
  }

  if (!isRecord(profile.limits) || profile.limits.requiresExplicitTolerances !== true) {
    return analysisError("HiddenToleranceNotAllowed", "EvaluationProfile must require explicit tolerances.", "evaluationProfile.limits");
  }

  if ("tolerances" in profile || "hiddenTolerances" in profile) {
    return analysisError("HiddenToleranceNotAllowed", "EvaluationProfile must not embed hidden tolerances.", "evaluationProfile");
  }

  return null;
}

function validateEvaluationTolerances(tolerances: unknown): CoreError | null {
  if (!isRecord(tolerances) || tolerances.kind !== "evaluation-tolerances" || !nonEmptyString(tolerances.id)) {
    return analysisError("MissingTolerances", "Structured analysis requires EvaluationTolerances.", "evaluationTolerances");
  }

  for (const key of ["guideProximity", "alignment", "containment", "overlap", "coverage", "areaRatio"] as const) {
    if (!nonNegativeFiniteNumber(tolerances[key])) {
      return analysisError("HiddenToleranceNotAllowed", `Evaluation tolerance must be a non-negative finite number: ${key}.`, `evaluationTolerances.${key}`);
    }
  }

  return null;
}

function validateComparisonTolerances(tiePolicy: unknown): CoreError | null {
  if (!isRecord(tiePolicy) || tiePolicy.kind !== "tie-policy" || !nonEmptyString(tiePolicy.id) || !nonNegativeFiniteNumber(tiePolicy.scoreTolerance)) {
    return analysisError("InvalidComparisonInput", "Structured analysis requires an explicit TiePolicy.", "comparisonTolerances");
  }

  return null;
}

function validateTolerancePolicy(tolerancePolicy: unknown): CoreError | null {
  if (!isTolerancePolicy(tolerancePolicy)) {
    return analysisError("MissingTolerancePolicy", "Structured analysis requires a valid TolerancePolicy.", "tolerancePolicy");
  }

  return null;
}

function validateExplicitOperationContext(
  operationContext: unknown,
  input: StructuredCompositionAnalysisInputV1,
): CoreError | null {
  if (!isOperationContext(operationContext)) {
    return analysisError("InvalidOperationContext", "Structured analysis requires an OperationContext.", "operationContext");
  }

  if (operationContext.operationName !== STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME) {
    return analysisError("InvalidOperationContext", "OperationContext operationName must match the R6B direct operation.", "operationContext.operationName");
  }

  if (operationContext.operationVersion !== STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION) {
    return analysisError("InvalidOperationContext", "OperationContext operationVersion must match the R6B direct operation.", "operationContext.operationVersion");
  }

  const policyFailure = firstImplicitPolicyFailure(operationContext);
  if (policyFailure !== null) {
    return policyFailure;
  }

  if (!sameSerialized(operationContext.coordinatePolicy.value, input.compositionA.coordinateSystem)) {
    return analysisError("CoordinatePolicyMismatch", "OperationContext coordinatePolicy must match the structured compositions.", "operationContext.coordinatePolicy");
  }

  if (!sameSerialized(operationContext.metricPolicy.value, input.compositionA.metricPolicy ?? null)) {
    return analysisError("MetricPolicyMismatch", "OperationContext metricPolicy must match the structured compositions.", "operationContext.metricPolicy");
  }

  if (!sameSerialized(operationContext.tolerancePolicy.value, input.tolerancePolicy)) {
    return analysisError("TolerancePolicyMismatch", "OperationContext tolerancePolicy must match the structured analysis tolerancePolicy.", "operationContext.tolerancePolicy");
  }

  if (!sameSerialized(input.compositionA.coordinateSystem, input.compositionB.coordinateSystem)) {
    return analysisError("CoordinatePolicyMismatch", "Composition coordinate systems must match.", "compositionB.coordinateSystem");
  }

  if (!sameSerialized(input.compositionA.metricPolicy ?? null, input.compositionB.metricPolicy ?? null)) {
    return analysisError("MetricPolicyMismatch", "Composition metric policies must match.", "compositionB.metricPolicy");
  }

  if (!sameSerialized(input.compositionA.tolerancePolicy ?? null, input.tolerancePolicy)) {
    return analysisError("TolerancePolicyMismatch", "Composition A tolerancePolicy must match the analysis tolerancePolicy.", "compositionA.tolerancePolicy");
  }

  if (!sameSerialized(input.compositionB.tolerancePolicy ?? null, input.tolerancePolicy)) {
    return analysisError("TolerancePolicyMismatch", "Composition B tolerancePolicy must match the analysis tolerancePolicy.", "compositionB.tolerancePolicy");
  }

  return null;
}

function validateAnalysisProvenance(
  provenance: unknown,
  acceptance: StructuredCompositionAcceptanceV1,
  effectiveSourceIds: readonly string[],
  operationContextRef: OperationContextRef,
): CoreError | null {
  if (!isAnalysisProvenance(provenance)) {
    return analysisError("MissingProvenance", "Structured analysis requires explicit structured-data provenance.", "provenance");
  }

  if (!sameStrings([...provenance.callerSourceIds].sort(compareStrings), effectiveSourceIds)) {
    return analysisError("MissingProvenance", "Provenance callerSourceIds must match the structured composition source ids.", "provenance.callerSourceIds");
  }

  if (!sameSerialized(acceptance, provenance.acceptanceRecord)) {
    return analysisError("MissingProvenance", "Provenance acceptanceRecord must match the accepted input.", "provenance.acceptanceRecord");
  }

  if (provenance.operationContextRef.id !== operationContextRef.id) {
    return analysisError("MissingProvenance", "Provenance operationContextRef must match the supplied OperationContext.", "provenance.operationContextRef");
  }

  return null;
}

function firstImplicitPolicyFailure(operationContext: OperationContext): CoreError | null {
  const policies = [
    ["coordinatePolicy", operationContext.coordinatePolicy],
    ["metricPolicy", operationContext.metricPolicy],
    ["tolerancePolicy", operationContext.tolerancePolicy],
    ["roundingPolicy", operationContext.roundingPolicy],
    ["numericPolicy", operationContext.numericPolicy],
    ["orderingPolicy", operationContext.orderingPolicy],
  ] as const;

  for (const [name, policy] of policies) {
    if (policy.explicit !== true) {
      return analysisError("HiddenOutputChangingDefault", `OperationContext ${name} must be explicit.`, `operationContext.${name}.explicit`);
    }
  }

  return null;
}

function meaningfulIdentity(
  prepared: PreparedAnalysisInput,
  value: {
    outputRefs: readonly SourceReference[];
    measurements: StructuredCompositionAnalysisMeasurementsV1;
    evaluations: StructuredCompositionAnalysisEvaluationsV1;
    comparison: Comparison;
    decision: Decision;
    run: Run;
    replayReadinessStatus: ReplayReadinessStatus;
  },
): string {
  const acceptance = acceptanceWithoutAcceptedAt(prepared.input.acceptance);
  return serializeCanonicalJson({
    operationName: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    input: {
      contractVersion: prepared.input.contractVersion,
      analysisId: prepared.input.analysisId,
      compositionA: prepared.input.compositionA,
      compositionB: prepared.input.compositionB,
      acceptance,
      ratioPack: prepared.input.ratioPack,
      packLock: prepared.input.packLock,
      ruleSetRef: prepared.input.ruleSetRef,
      evaluationProfile: prepared.input.evaluationProfile,
      evaluationTolerances: prepared.input.evaluationTolerances,
      comparisonTolerances: prepared.input.comparisonTolerances,
      tolerancePolicy: prepared.input.tolerancePolicy,
      operationContext: prepared.input.operationContext,
      provenance: {
        ...prepared.input.provenance,
        acceptanceRecord: acceptance,
      },
    },
    outputRefs: value.outputRefs,
    measurements: value.measurements,
    evaluations: value.evaluations,
    comparison: value.comparison,
    decision: value.decision,
    packLockRef: prepared.input.packLock.ref,
    operationContextRef: prepared.input.operationContext.ref,
    runRef: value.run.runRef,
    replayReadinessStatus: value.replayReadinessStatus,
  }, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function acceptanceWithoutAcceptedAt(
  acceptance: StructuredCompositionAcceptanceV1,
): Omit<StructuredCompositionAcceptanceV1, "acceptedAt"> {
  return {
    accepted: acceptance.accepted,
    mode: acceptance.mode,
    acceptedBy: acceptance.acceptedBy,
    acceptedSourceIds: acceptance.acceptedSourceIds,
    acceptanceRecordId: acceptance.acceptanceRecordId,
  };
}

function analysisInputRefs(
  input: StructuredCompositionAnalysisInputV1,
  effectiveSourceIds: readonly string[],
): readonly SourceReference[] {
  return canonicalizeRefs([
    { kind: "analysis", ref: input.analysisId },
    { kind: "composition-2d", ref: input.compositionA.id },
    { kind: "composition-2d", ref: input.compositionB.id },
    { kind: "surface", ref: input.compositionA.surface.id },
    { kind: "ratio-pack", ref: ratioPackRef(input.ratioPack) },
    { kind: "pack-lock", ref: input.packLock.ref.id },
    { kind: "rule-set", ref: input.ruleSetRef },
    { kind: "evaluation-profile", ref: input.evaluationProfile.ref },
    { kind: "evaluation-tolerances", ref: input.evaluationTolerances.id },
    { kind: "tie-policy", ref: input.comparisonTolerances.id },
    { kind: "tolerance-policy", ref: input.tolerancePolicy.id },
    { kind: "operation-context", ref: input.operationContext.ref.id },
    { kind: "acceptance-record", ref: input.acceptance.acceptanceRecordId },
    ...effectiveSourceIds.map((sourceId) => ({ kind: "structured-source", ref: sourceId })),
  ]);
}

function evaluationSourceRefs(prepared: PreparedAnalysisInput): readonly SourceReference[] {
  return canonicalizeRefs([
    { kind: "surface", ref: prepared.surface.id },
    { kind: "coordinate-system", ref: prepared.surface.coordinateSystem.id },
    ...metricPolicyRefs(prepared.surface.metricPolicy ?? null),
    { kind: "evaluation-tolerances", ref: prepared.input.evaluationTolerances.id },
    { kind: "tolerance-policy", ref: prepared.input.tolerancePolicy.id },
    { kind: "operation-context", ref: prepared.operationContext.ref.id },
  ]);
}

function metricPolicyRefs(metricPolicy: MetricPolicy | null): readonly SourceReference[] {
  return metricPolicy === null ? [] : [{ kind: "metric-policy", ref: metricPolicy.id }];
}

function compositionSourceIds(first: Composition2D, second: Composition2D): readonly string[] {
  return uniqueStrings([
    ...singleCompositionSourceIds(first),
    ...singleCompositionSourceIds(second),
  ]);
}

function singleCompositionSourceIds(composition: Composition2D): readonly string[] {
  return [
    composition.id,
    composition.surface.id,
    ...composition.elements.map((element) => element.id),
    ...(composition.anchors ?? []).map((anchor) => anchor.id),
    ...composition.elements.flatMap((element) => (element.anchors ?? []).map((anchor) => anchor.id)),
  ];
}

function acceptedSourceIdsFrom(value: unknown): readonly string[] {
  return isRecord(value) && Array.isArray(value.acceptedSourceIds) && value.acceptedSourceIds.every((item) => typeof item === "string")
    ? [...value.acceptedSourceIds].sort(compareStrings)
    : [];
}

function createAnalysisCoreProvenance(inputRefs: readonly SourceReference[]): Provenance {
  return {
    operationName: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_NAME,
    operationVersion: STRUCTURED_COMPOSITION_ANALYSIS_OPERATION_VERSION,
    inputRefs,
    source: ANALYSIS_SOURCE_REFERENCE,
  };
}

function analysisError(code: DiagnosticCode, message: string, targetRef: string): CoreError {
  return createCoreError({
    code,
    message,
    targetRef,
    sourceRef: ANALYSIS_SOURCE_REFERENCE,
    provenance: createAnalysisCoreProvenance([]),
  });
}

function analysisIdFor(input: unknown): string {
  return isRecord(input) && nonEmptyString(input.analysisId) ? input.analysisId : UNKNOWN_ANALYSIS_ID;
}

function recordField(input: unknown, key: string): unknown {
  return isRecord(input) ? input[key] : undefined;
}

function provenanceFrom(value: unknown): StructuredCompositionAnalysisProvenanceV1 | null {
  return isAnalysisProvenance(value) ? value : null;
}

function packLockRefFrom(value: unknown): PackLockRef | null {
  return isPackLock(value) ? value.ref : null;
}

function operationContextRefFrom(value: unknown): OperationContextRef | null {
  return isOperationContext(value) ? value.ref : null;
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function isAcceptance(value: unknown): value is StructuredCompositionAcceptanceV1 {
  return isRecord(value)
    && value.accepted === true
    && value.mode === "user_supplied_structured_data"
    && nonEmptyString(value.acceptedBy)
    && nonEmptyString(value.acceptedAt)
    && Array.isArray(value.acceptedSourceIds)
    && value.acceptedSourceIds.every((item) => typeof item === "string" && item.length > 0)
    && nonEmptyString(value.acceptanceRecordId);
}

function isAnalysisProvenance(value: unknown): value is StructuredCompositionAnalysisProvenanceV1 {
  return isRecord(value)
    && value.kind === "structured-composition-analysis-provenance"
    && value.sourceKind === "user_supplied_structured_data"
    && (value.externalSourceRef === null || isSourceReference(value.externalSourceRef))
    && Array.isArray(value.callerSourceIds)
    && value.callerSourceIds.every((item) => typeof item === "string" && item.length > 0)
    && (value.adapter === null || isAdapter(value.adapter))
    && nonEmptyString(value.mappingVersion)
    && (value.normalizationVersion === null || nonEmptyString(value.normalizationVersion))
    && Array.isArray(value.transformationSteps)
    && value.transformationSteps.every(isTransformationStep)
    && isAcceptance(value.acceptanceRecord)
    && isOperationContextRef(value.operationContextRef);
}

function isTransformationStep(value: unknown): value is StructuredCompositionTransformationStepV1 {
  return isRecord(value)
    && value.kind === "structured-composition-transformation-step"
    && nonEmptyString(value.id)
    && nonEmptyString(value.description)
    && isSourceReferenceArray(value.inputRefs)
    && isSourceReferenceArray(value.outputRefs);
}

function isAdapter(value: unknown): value is { id: string; version: string } {
  return isRecord(value) && nonEmptyString(value.id) && nonEmptyString(value.version);
}

function isPackLock(value: unknown): value is PackLock {
  return isRecord(value)
    && value.kind === "pack-lock"
    && nonEmptyString(value.id)
    && isPackLockRef(value.ref)
    && nonEmptyString(value.coreVersion)
    && nonEmptyString(value.packId)
    && nonEmptyString(value.packVersion)
    && nonEmptyString(value.packSchemaVersion)
    && nonEmptyString(value.contentIdentity)
    && isSourceReferenceArray(value.sourceRefs)
    && value.status === "effective_pr11";
}

function isOperationContext(value: unknown): value is OperationContext {
  return isRecord(value)
    && value.kind === "operation-context"
    && nonEmptyString(value.id)
    && isOperationContextRef(value.ref)
    && value.ref.id === value.id
    && nonEmptyString(value.coreVersion)
    && nonEmptyString(value.operationName)
    && nonEmptyString(value.operationVersion)
    && nonEmptyString(value.geometryModelVersion)
    && isRuntimePolicy<CoordinateSystem>(value.coordinatePolicy)
    && isRuntimePolicy<MetricPolicy | null>(value.metricPolicy)
    && isRuntimePolicy<TolerancePolicy>(value.tolerancePolicy)
    && isRuntimePolicy<RoundingPolicy>(value.roundingPolicy)
    && isRuntimePolicy<NumericPolicy>(value.numericPolicy)
    && isRuntimePolicy<unknown>(value.orderingPolicy)
    && isRecord(value.featureFlags)
    && Object.values(value.featureFlags).every((flag) => typeof flag === "boolean")
    && isSourceReferenceArray(value.sourceRefs);
}

function isRuntimePolicy<TPolicy>(value: unknown): value is { value: TPolicy; explicit: boolean; sourceRefs: readonly SourceReference[] } {
  return isRecord(value)
    && "value" in value
    && typeof value.explicit === "boolean"
    && isSourceReferenceArray(value.sourceRefs);
}

function isPackLockRef(value: unknown): value is PackLockRef {
  return isRecord(value) && nonEmptyString(value.id);
}

function isOperationContextRef(value: unknown): value is OperationContextRef {
  return isRecord(value) && nonEmptyString(value.id);
}

function isTolerancePolicy(value: unknown): value is TolerancePolicy {
  return isRecord(value)
    && value.kind === "tolerance-policy"
    && nonEmptyString(value.id)
    && nonNegativeFiniteNumber(value.coordinateTolerance)
    && (value.metricTolerance === undefined || nonNegativeFiniteNumber(value.metricTolerance));
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value) && nonEmptyString(value.kind) && nonEmptyString(value.ref);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function nonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function sameSerialized(first: unknown, second: unknown): boolean {
  return serializeCanonicalJson(first, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(second, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function sameStrings(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compareStrings);
}

function compareStrings(first: string, second: string): number {
  return first.localeCompare(second);
}
