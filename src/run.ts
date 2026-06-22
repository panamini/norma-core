import {
  CORE_DIAGNOSTIC_CODES,
  CORE_VERSION,
  createCoreError,
  createCoreWarning,
  validateGeometryV1,
} from "./index.js";
import type {
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  OperationStatus,
  Provenance,
  RunRef,
  SourceReference,
} from "./index.js";
import type { RatioPack } from "./ratio-pack.js";
import { validateRatioPackV1 } from "./ratio-pack.js";
import type { ConstructionV1 } from "./construction-generation.js";
import { validateConstructionV1 } from "./construction-generation.js";
import type { MeasurementResultV1 } from "./measurements.js";
import { validateMeasurementResultV1 } from "./measurements.js";
import type { EvaluationV1 } from "./evaluation.js";
import { validateEvaluationV1 } from "./evaluation.js";
import type {
  ComparisonV1,
  DecisionV1,
  StructuredExplanationV1,
} from "./comparison.js";
import {
  validateComparisonV1,
  validateDecisionV1,
  validateStructuredExplanationV1,
} from "./comparison.js";
import type { ArtifactV1 } from "./artifacts.js";
import { validateArtifactV1 } from "./artifacts.js";

export const PACK_LOCK_V1_SCHEMA_VERSION = "pack-lock-v1" as const;
export const OPERATION_CONTEXT_V1_SCHEMA_VERSION = "operation-context-v1" as const;
export const RUN_INPUT_V1_SCHEMA_VERSION = "run-input-v1" as const;
export const RUN_OUTPUT_V1_SCHEMA_VERSION = "run-output-v1" as const;
export const RUN_V1_SCHEMA_VERSION = "run-v1" as const;
export const RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION = "run-source-bundle-v1" as const;
export const REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION = "replay-readiness-report-v1" as const;
export const RUN_IDENTITY_ALGORITHM_V1 = "norma-run-v1-stable-json-fnv1a64" as const;

export const RUN_EXECUTION_STATUSES_V1 = ["success", "partial", "failed"] as const;
export const REPLAY_READINESS_V1_STATUSES = [
  "replay_ready",
  "non_replayable",
  "stale",
  "incompatible",
] as const;
export const RUN_MISMATCH_KINDS_V1 = [
  "input_identity_mismatch",
  "operation_mismatch",
  "pack_ref_mismatch",
  "pack_version_mismatch",
  "pack_schema_version_mismatch",
  "pack_content_identity_mismatch",
  "rule_refs_mismatch",
  "rule_set_ref_mismatch",
  "core_version_mismatch",
  "operation_version_mismatch",
  "geometry_model_version_mismatch",
  "coordinate_policy_mismatch",
  "metric_policy_mismatch",
  "tolerance_policy_mismatch",
  "rounding_policy_mismatch",
  "numeric_policy_mismatch",
  "ordering_policy_mismatch",
  "feature_flags_mismatch",
  "artifact_run_ref_mismatch",
  "artifact_stale",
  "missing_source",
] as const;

export type PackLockV1SchemaVersion = typeof PACK_LOCK_V1_SCHEMA_VERSION;
export type OperationContextV1SchemaVersion = typeof OPERATION_CONTEXT_V1_SCHEMA_VERSION;
export type RunInputV1SchemaVersion = typeof RUN_INPUT_V1_SCHEMA_VERSION;
export type RunOutputV1SchemaVersion = typeof RUN_OUTPUT_V1_SCHEMA_VERSION;
export type RunV1SchemaVersion = typeof RUN_V1_SCHEMA_VERSION;
export type RunSourceBundleV1SchemaVersion = typeof RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION;
export type ReplayReadinessReportV1SchemaVersion = typeof REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION;
export type RunExecutionStatusV1 = (typeof RUN_EXECUTION_STATUSES_V1)[number];
export type ReplayReadinessStatusV1 = (typeof REPLAY_READINESS_V1_STATUSES)[number];
export type RunMismatchKindV1 = (typeof RUN_MISMATCH_KINDS_V1)[number];
export type FeatureFlagValueV1 = boolean | number | string | null;
export type RunMismatchSeverityV1 = "warning" | "error" | "critical";

export interface PackLockV1 {
  kind: "pack-lock";
  schemaVersion: PackLockV1SchemaVersion;
  lockRef: string;
  packRef: string;
  packVersion: string;
  packSchemaVersion: string;
  contentIdentity: string;
  compatibility: unknown;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface OperationFeatureFlagV1 {
  kind: "operation-feature-flag";
  key: string;
  value: FeatureFlagValueV1;
}

export interface OperationContextV1 {
  kind: "operation-context";
  schemaVersion: OperationContextV1SchemaVersion;
  contextRef: string;
  coreVersion: string;
  operation: string;
  operationVersion: string;
  geometryModelVersion: string;
  coordinatePolicy: unknown;
  metricPolicy: unknown;
  tolerancePolicy: unknown;
  roundingPolicy: unknown;
  numericPolicy: unknown;
  orderingPolicy: unknown;
  featureFlags: readonly OperationFeatureFlagV1[];
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface RunSourceInputV1 {
  kind: "run-source-input";
  inputRef: SourceReference;
  snapshot?: unknown;
  contentIdentity?: string;
}

export interface RunInputV1 {
  kind: "run-input";
  schemaVersion: RunInputV1SchemaVersion;
  inputIdentity: string;
  inputs: readonly RunSourceInputV1[];
  inputRefs: readonly SourceReference[];
  packLockRef: string;
  orderedRuleRefs: readonly string[];
  ruleSetRef: string | null;
  operationContextRef: string;
  sourceRefs: readonly SourceReference[];
  provenance: Provenance;
}

export interface RunOutputV1 {
  kind: "run-output";
  schemaVersion: RunOutputV1SchemaVersion;
  constructionRefs: readonly SourceReference[];
  measurementRefs: readonly SourceReference[];
  evaluationRefs: readonly SourceReference[];
  comparisonRefs: readonly SourceReference[];
  decisionRefs: readonly SourceReference[];
  explanationRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
  executionStatus: RunExecutionStatusV1;
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: Provenance;
}

export interface RunMismatchV1 {
  kind: "run-mismatch";
  mismatchRef: string;
  mismatchKind: RunMismatchKindV1;
  path: string;
  expected: unknown;
  actual: unknown;
  severity: RunMismatchSeverityV1;
  blocksReplay: boolean;
  sourceRefs: readonly SourceReference[];
  deterministicOrdering: string;
}

export interface RunReplayReadinessV1 {
  kind: "run-replay-readiness";
  status: ReplayReadinessStatusV1;
  mismatches: readonly RunMismatchV1[];
  missingSources: readonly SourceReference[];
  staleArtifactRefs: readonly SourceReference[];
}

export interface RunV1 {
  kind: "run";
  schemaVersion: RunV1SchemaVersion;
  runRef: RunRef;
  operation: string;
  operationVersion: string;
  runInput: RunInputV1;
  packLock: PackLockV1;
  orderedRuleRefs: readonly string[];
  ruleSetRef: string | null;
  operationContext: OperationContextV1;
  runOutput: RunOutputV1;
  executionStatus: RunExecutionStatusV1;
  replayReadiness: RunReplayReadinessV1;
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: Provenance;
}

export interface RunSourceBundleV1 {
  kind: "run-source-bundle";
  schemaVersion: RunSourceBundleV1SchemaVersion;
  surface?: unknown;
  construction?: ConstructionV1;
  composition?: unknown;
  compositionA?: unknown;
  compositionB?: unknown;
  measurementResult?: MeasurementResultV1;
  measurementResultA?: MeasurementResultV1;
  measurementResultB?: MeasurementResultV1;
  evaluation?: EvaluationV1;
  evaluationA?: EvaluationV1;
  evaluationB?: EvaluationV1;
  comparison?: ComparisonV1;
  decision?: DecisionV1;
  structuredExplanation?: StructuredExplanationV1;
  artifacts?: readonly ArtifactV1[];
}

export interface ReplayReadinessDependenciesV1 {
  kind?: "replay-readiness-dependencies";
  inputIdentity?: string;
  packLock?: PackLockV1;
  orderedRuleRefs?: readonly string[];
  ruleSetRef?: string | null;
  operationContext?: OperationContextV1;
  sourceRefs?: readonly SourceReference[];
  artifacts?: readonly ArtifactV1[];
}

export interface ReplayReadinessReportV1 {
  kind: "replay-readiness-report";
  schemaVersion: ReplayReadinessReportV1SchemaVersion;
  reportRef: string;
  runRef: RunRef;
  status: ReplayReadinessStatusV1;
  mismatches: readonly RunMismatchV1[];
  missingSources: readonly SourceReference[];
  staleArtifactRefs: readonly SourceReference[];
  warnings: readonly CoreWarning[];
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
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  runRef?: RunRef | null;
  packLockRef?: { id: string } | null;
  operationContextRef?: { id: string } | null;
  output?: TOutput | null;
}

type RunValidation<TValue> =
  | { ok: true; value: TValue }
  | { ok: false; result: CoreResult };

interface ValidSourceRegistry {
  refs: ReadonlySet<string>;
  artifacts: readonly ArtifactV1[];
}

interface RunValueValidationOptions {
  allowExternalArtifactEvidence?: boolean;
}

const RUN_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/run-v1",
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
const PACK_LOCK_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "lockRef",
  "packRef",
  "packVersion",
  "packSchemaVersion",
  "contentIdentity",
  "compatibility",
  "sourceRefs",
  "provenance",
] as const;
const FEATURE_FLAG_ALLOWED_KEYS = ["kind", "key", "value"] as const;
const OPERATION_CONTEXT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "contextRef",
  "coreVersion",
  "operation",
  "operationVersion",
  "geometryModelVersion",
  "coordinatePolicy",
  "metricPolicy",
  "tolerancePolicy",
  "roundingPolicy",
  "numericPolicy",
  "orderingPolicy",
  "featureFlags",
  "sourceRefs",
  "provenance",
] as const;
const COORDINATE_POLICY_ALLOWED_KEYS = [
  "kind",
  "surfaceRef",
  "origin",
  "xAxis",
  "yAxis",
  "normalizedBounds",
  "coordinateScale",
] as const;
const METRIC_POLICY_ALLOWED_KEYS = [
  "kind",
  "surfaceRef",
  "measurement",
  "unit",
  "distance",
  "area",
  "angle",
] as const;
const TOLERANCE_POLICY_ALLOWED_KEYS = [
  "kind",
  "coordinateTolerance",
  "metricTolerance",
  "angleTolerance",
] as const;
const ROUNDING_POLICY_ALLOWED_KEYS = ["kind", "mode", "precision"] as const;
const NUMERIC_POLICY_ALLOWED_KEYS = ["kind", "epsilon", "comparison", "negativeZero", "nonFinite"] as const;
const ORDERING_POLICY_ALLOWED_KEYS = [
  "kind",
  "inputRefs",
  "outputRefs",
  "rules",
  "featureFlags",
  "warnings",
  "errors",
  "mismatches",
] as const;
const RECT_POLICY_ALLOWED_KEYS = ["kind", "x", "y", "width", "height"] as const;
const RUN_SOURCE_INPUT_ALLOWED_KEYS = ["kind", "inputRef", "snapshot", "contentIdentity"] as const;
const RUN_INPUT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "inputIdentity",
  "inputs",
  "inputRefs",
  "packLockRef",
  "orderedRuleRefs",
  "ruleSetRef",
  "operationContextRef",
  "sourceRefs",
  "provenance",
] as const;
const RUN_OUTPUT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "constructionRefs",
  "measurementRefs",
  "evaluationRefs",
  "comparisonRefs",
  "decisionRefs",
  "explanationRefs",
  "artifactRefs",
  "executionStatus",
  "warnings",
  "errors",
  "provenance",
] as const;
const DIAGNOSTIC_ALLOWED_KEYS = [
  "code",
  "severity",
  "message",
  "targetRef",
  "source",
  "blocking",
  "provenance",
] as const;
const MISMATCH_ALLOWED_KEYS = [
  "kind",
  "mismatchRef",
  "mismatchKind",
  "path",
  "expected",
  "actual",
  "severity",
  "blocksReplay",
  "sourceRefs",
  "deterministicOrdering",
] as const;
const RUN_READINESS_ALLOWED_KEYS = ["kind", "status", "mismatches", "missingSources", "staleArtifactRefs"] as const;
const RUN_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "runRef",
  "operation",
  "operationVersion",
  "runInput",
  "packLock",
  "orderedRuleRefs",
  "ruleSetRef",
  "operationContext",
  "runOutput",
  "executionStatus",
  "replayReadiness",
  "warnings",
  "errors",
  "provenance",
] as const;
const RUN_SOURCE_BUNDLE_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "surface",
  "construction",
  "composition",
  "compositionA",
  "compositionB",
  "measurementResult",
  "measurementResultA",
  "measurementResultB",
  "evaluation",
  "evaluationA",
  "evaluationB",
  "comparison",
  "decision",
  "structuredExplanation",
  "artifacts",
] as const;
const REPORT_ALLOWED_KEYS = [
  "kind",
  "schemaVersion",
  "reportRef",
  "runRef",
  "status",
  "mismatches",
  "missingSources",
  "staleArtifactRefs",
  "warnings",
  "provenance",
] as const;

const OUTPUT_CATEGORIES = [
  ["constructionRefs", "construction"],
  ["measurementRefs", "measurement-result"],
  ["evaluationRefs", "evaluation"],
  ["comparisonRefs", "comparison"],
  ["decisionRefs", "decision"],
  ["explanationRefs", "structured-explanation"],
  ["artifactRefs", "artifact"],
] as const;

const EXECUTABLE_FIELD_NAMES = [
  "callback",
  "execute",
  "function",
  "handler",
  "registry",
  "remote",
  "replay",
  "replayRun",
  "script",
  "signature",
  "storage",
] as const;

export function createPackLockV1(pack: unknown): CoreResult<PackLockV1> {
  const packValidation = validateRatioPackV1(pack);
  if (packValidation.status !== "ok" || packValidation.output === null) {
    return packValidation as unknown as CoreResult<PackLockV1>;
  }

  const ratioPack = packValidation.output;
  const lock = packLockFromPack(ratioPack);
  return runResult({
    status: "ok",
    provenance: lock.provenance,
    outputRefs: [{ kind: "pack-lock", ref: lock.lockRef }],
    packLockRef: { id: lock.lockRef },
    output: lock,
  });
}

export function validatePackLockV1(value: unknown, sourcePack?: unknown): CoreResult<PackLockV1> {
  const validation = validatePackLockValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<PackLockV1>;
  }

  if (sourcePack !== undefined) {
    const packValidation = validateRatioPackV1(sourcePack);
    if (packValidation.status !== "ok" || packValidation.output === null) {
      return packValidation as unknown as CoreResult<PackLockV1>;
    }
    const expected = packLockFromPack(packValidation.output);
    const mismatch = firstPackLockMismatch(validation.value, expected);
    if (mismatch !== null) {
      return invalidPackLock(mismatch.path, mismatch.message) as CoreResult<PackLockV1>;
    }
  }

  return runResult({
    status: "ok",
    provenance: createRunProvenance("core.pack-lock-v1.validate", [
      { kind: "pack-lock", ref: validation.value.lockRef },
    ]),
    outputRefs: [{ kind: "pack-lock", ref: validation.value.lockRef }],
    packLockRef: { id: validation.value.lockRef },
    output: validation.value,
  });
}

export function createOperationContextV1(input: unknown): CoreResult<OperationContextV1> {
  if (!isRecord(input) || firstUnsupportedKey(input, OPERATION_CONTEXT_ALLOWED_KEYS.filter((key) => key !== "contextRef" && key !== "schemaVersion" && key !== "kind")) !== null) {
    return invalidOperationContext("operationContext", "OperationContext V1 input must be closed and structured.") as CoreResult<OperationContextV1>;
  }

  const contextSeed = operationContextSeed(input);
  if (!contextSeed.ok) {
    return contextSeed.result as CoreResult<OperationContextV1>;
  }

  const contextRef = contextRefFor(contextSeed.value);
  const context: OperationContextV1 = {
    kind: "operation-context",
    schemaVersion: OPERATION_CONTEXT_V1_SCHEMA_VERSION,
    contextRef,
    ...contextSeed.value,
  };

  return runResult({
    status: "ok",
    provenance: context.provenance,
    outputRefs: [{ kind: "operation-context", ref: context.contextRef }],
    operationContextRef: { id: context.contextRef },
    output: context,
  });
}

export function validateOperationContextV1(value: unknown): CoreResult<OperationContextV1> {
  const validation = validateOperationContextValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<OperationContextV1>;
  }

  return runResult({
    status: "ok",
    provenance: createRunProvenance("core.operation-context-v1.validate", [
      { kind: "operation-context", ref: validation.value.contextRef },
    ]),
    outputRefs: [{ kind: "operation-context", ref: validation.value.contextRef }],
    operationContextRef: { id: validation.value.contextRef },
    output: validation.value,
  });
}

export function createRunInputV1(input: unknown): CoreResult<RunInputV1> {
  const seed = runInputSeed(input);
  if (!seed.ok) {
    return seed.result as CoreResult<RunInputV1>;
  }
  const runInput = runInputFromSeed(seed.value);
  return runResult({
    status: "ok",
    provenance: runInput.provenance,
    outputRefs: [{ kind: "run-input", ref: runInput.inputIdentity }],
    packLockRef: { id: runInput.packLockRef },
    operationContextRef: { id: runInput.operationContextRef },
    output: runInput,
  });
}

export function validateRunInputV1(value: unknown): CoreResult<RunInputV1> {
  const validation = validateRunInputValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<RunInputV1>;
  }
  return runResult({
    status: "ok",
    provenance: createRunProvenance("core.run-input-v1.validate", [
      { kind: "run-input", ref: validation.value.inputIdentity },
    ]),
    outputRefs: [{ kind: "run-input", ref: validation.value.inputIdentity }],
    packLockRef: { id: validation.value.packLockRef },
    operationContextRef: { id: validation.value.operationContextRef },
    output: validation.value,
  });
}

export function createRunOutputV1(input: unknown): CoreResult<RunOutputV1> {
  const seed = runOutputSeed(input);
  if (!seed.ok) {
    return seed.result as CoreResult<RunOutputV1>;
  }
  const output = runOutputFromSeed(seed.value);
  const invariant = validateExecutionStatusInvariant(output.executionStatus, outputRefsForRunOutput(output), output.warnings, output.errors);
  if (invariant !== null) {
    return invariant as CoreResult<RunOutputV1>;
  }
  return runResult({
    status: "ok",
    provenance: output.provenance,
    outputRefs: outputRefsForRunOutput(output),
    output,
  });
}

export function validateRunOutputV1(value: unknown): CoreResult<RunOutputV1> {
  const validation = validateRunOutputValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<RunOutputV1>;
  }
  return runResult({
    status: "ok",
    provenance: createRunProvenance("core.run-output-v1.validate", outputRefsForRunOutput(validation.value)),
    outputRefs: outputRefsForRunOutput(validation.value),
    output: validation.value,
  });
}

export function deriveRunRefV1(input: unknown): CoreResult<RunRef> {
  const basis = runIdentityBasisFromInput(input);
  if (!basis.ok) {
    return basis.result as CoreResult<RunRef>;
  }
  const runRef = runRefForBasis(basis.value);
  return runResult({
    status: "ok",
    provenance: createRunProvenance("core.run-v1.deriveRunRef", [
      { kind: "run", ref: runRef.id },
    ]),
    outputRefs: [{ kind: "run", ref: runRef.id }],
    runRef,
    output: runRef,
  });
}

export function createRunV1(input: unknown): CoreResult<RunV1> {
  if (!isRecord(input) || firstUnsupportedKey(input, [
    "operation",
    "operationVersion",
    "runInput",
    "inputs",
    "packLock",
    "orderedRuleRefs",
    "ruleSetRef",
    "operationContext",
    "runOutput",
    "executionStatus",
    "warnings",
    "errors",
    "provenance",
    "sourceBundle",
  ] as const) !== null) {
    return invalidRun("runRequest", "Run V1 creation input must be closed and structured.") as CoreResult<RunV1>;
  }

  const packLockValidation = validatePackLockValue(input.packLock);
  if (!packLockValidation.ok) {
    return packLockValidation.result as CoreResult<RunV1>;
  }
  const contextValidation = validateOperationContextValue(input.operationContext);
  if (!contextValidation.ok) {
    return contextValidation.result as CoreResult<RunV1>;
  }
  const operation = nonEmptyString(input.operation);
  const operationVersion = nonEmptyString(input.operationVersion);
  if (operation === null || operationVersion === null) {
    return invalidRun("operation", "Run V1 requires non-empty operation and operationVersion.") as CoreResult<RunV1>;
  }
  if (contextValidation.value.operation !== operation || contextValidation.value.operationVersion !== operationVersion) {
    return invalidRun("operationContext", "Run operation and OperationContext operation identity must match.") as CoreResult<RunV1>;
  }

  const runInputResult = input.runInput !== undefined
    ? validateRunInputV1(input.runInput)
    : createRunInputV1({
        inputs: input.inputs,
        packLock: packLockValidation.value,
        orderedRuleRefs: input.orderedRuleRefs,
        ruleSetRef: input.ruleSetRef,
        operationContext: contextValidation.value,
      });
  if (runInputResult.status !== "ok" || runInputResult.output === null) {
    return runInputResult as unknown as CoreResult<RunV1>;
  }
  const runInput = runInputResult.output;
  const linkFailure = validateRunInputLinks(runInput, packLockValidation.value, contextValidation.value, input.orderedRuleRefs, input.ruleSetRef);
  if (linkFailure !== null) {
    return linkFailure as CoreResult<RunV1>;
  }

  const runOutputResult = isRecord(input.runOutput) && input.runOutput.kind === "run-output"
    ? validateRunOutputV1(input.runOutput)
    : createRunOutputV1(input.runOutput ?? {
        executionStatus: input.executionStatus ?? "success",
      });
  if (runOutputResult.status !== "ok" || runOutputResult.output === null) {
    return runOutputResult as unknown as CoreResult<RunV1>;
  }
  const runOutput = runOutputResult.output;
  const executionStatus = runExecutionStatus(input.executionStatus ?? runOutput.executionStatus);
  if (executionStatus === null || executionStatus !== runOutput.executionStatus) {
    return invalidRun("executionStatus", "Run executionStatus must match RunOutput executionStatus.") as CoreResult<RunV1>;
  }

  const runRefResult = deriveRunRefV1({
    operation,
    operationVersion,
    runInput,
    packLock: packLockValidation.value,
    orderedRuleRefs: runInput.orderedRuleRefs,
    ruleSetRef: runInput.ruleSetRef,
    operationContext: contextValidation.value,
  });
  if (runRefResult.status !== "ok" || runRefResult.output === null) {
    return runRefResult as unknown as CoreResult<RunV1>;
  }
  const runRef = runRefResult.output;

  const sourceRegistry = input.sourceBundle !== undefined ? validateRunSourceRegistry(input.sourceBundle) : undefined;
  if (sourceRegistry !== undefined && !sourceRegistry.ok) {
    return sourceRegistry.result as CoreResult<RunV1>;
  }

  const sourceMismatches = readinessMismatchesForRunSources(runInput, sourceRegistry?.value);
  const artifactMismatches = readinessMismatchesForArtifacts(runRef, runOutput.artifactRefs, sourceRegistry?.value.artifacts);
  const replayReadiness = replayReadinessFromMismatches([...sourceMismatches, ...artifactMismatches]);
  const userWarnings = validateDiagnosticsArray(input.warnings ?? [], "warnings", "warning");
  if (!userWarnings.ok) {
    return userWarnings.result as CoreResult<RunV1>;
  }
  const userErrors = validateDiagnosticsArray(input.errors ?? [], "errors", "error");
  if (!userErrors.ok) {
    return userErrors.result as CoreResult<RunV1>;
  }
  const warnings = sortDiagnostics([
    ...userWarnings.value as readonly CoreWarning[],
    ...runOutput.warnings,
    ...warningsForReadiness(replayReadiness),
  ]);
  const errors = sortDiagnostics([
    ...userErrors.value as readonly CoreError[],
    ...runOutput.errors,
    ...errorsForReadiness(replayReadiness),
  ]) as readonly CoreError[];
  const provenance = validateProvenanceValue(input.provenance, "provenance");
  if (!provenance.ok) {
    return provenance.result as CoreResult<RunV1>;
  }
  const runProvenance = provenance.value ?? createRunProvenance("core.run-v1.create", [
    { kind: "run-input", ref: runInput.inputIdentity },
    { kind: "pack-lock", ref: packLockValidation.value.lockRef },
    { kind: "operation-context", ref: contextValidation.value.contextRef },
    ...outputRefsForRunOutput(runOutput),
  ]);

  const run: RunV1 = {
    kind: "run",
    schemaVersion: RUN_V1_SCHEMA_VERSION,
    runRef,
    operation,
    operationVersion,
    runInput,
    packLock: packLockValidation.value,
    orderedRuleRefs: [...runInput.orderedRuleRefs],
    ruleSetRef: runInput.ruleSetRef,
    operationContext: contextValidation.value,
    runOutput,
    executionStatus,
    replayReadiness,
    warnings,
    errors,
    provenance: runProvenance,
  };

  const validation = validateRunValue(run, sourceRegistry?.value);
  if (!validation.ok) {
    return validation.result as CoreResult<RunV1>;
  }

  return runResult({
    status: "ok",
    warnings,
    errors,
    provenance: run.provenance,
    outputRefs: [{ kind: "run", ref: run.runRef.id }, ...outputRefsForRunOutput(run.runOutput)],
    runRef,
    packLockRef: { id: run.packLock.lockRef },
    operationContextRef: { id: run.operationContext.contextRef },
    output: run,
  });
}

export function validateRunV1(value: unknown, sourceBundle?: unknown): CoreResult<RunV1> {
  const sourceRegistry = sourceBundle !== undefined ? validateRunSourceRegistry(sourceBundle) : undefined;
  if (sourceRegistry !== undefined && !sourceRegistry.ok) {
    return sourceRegistry.result as CoreResult<RunV1>;
  }
  const validation = validateRunValue(value, sourceRegistry?.value);
  if (!validation.ok) {
    return validation.result as CoreResult<RunV1>;
  }
  return runResult({
    status: "ok",
    warnings: validation.value.warnings,
    errors: validation.value.errors,
    provenance: createRunProvenance("core.run-v1.validate", [
      { kind: "run", ref: validation.value.runRef.id },
    ]),
    outputRefs: [{ kind: "run", ref: validation.value.runRef.id }, ...outputRefsForRunOutput(validation.value.runOutput)],
    runRef: validation.value.runRef,
    packLockRef: { id: validation.value.packLock.lockRef },
    operationContextRef: { id: validation.value.operationContext.contextRef },
    output: validation.value,
  });
}

export function assessReplayReadinessV1(run: unknown, dependencies: unknown): CoreResult<ReplayReadinessReportV1> {
  if (!isRecord(dependencies)) {
    return invalidReplayReadinessReport("dependencies", "Replay readiness assessment requires an explicit dependency set.") as CoreResult<ReplayReadinessReportV1>;
  }
  const runValidation = validateRunValue(run, undefined, { allowExternalArtifactEvidence: true });
  if (!runValidation.ok) {
    return runValidation.result as CoreResult<ReplayReadinessReportV1>;
  }

  const available = dependencies as ReplayReadinessDependenciesV1;
  const mismatches = [
    ...compareInputIdentity(runValidation.value, available.inputIdentity),
    ...comparePackLock(runValidation.value.packLock, available.packLock),
    ...compareRules(runValidation.value, available.orderedRuleRefs, available.ruleSetRef),
    ...compareOperationContext(runValidation.value.operationContext, available.operationContext),
    ...compareSources(runValidation.value.runInput, available.sourceRefs),
    ...compareArtifacts(runValidation.value.runRef, runValidation.value.runOutput.artifactRefs, available.artifacts),
  ];
  const readiness = replayReadinessFromMismatches(mismatches);
  const reportRef = reportRefFor(runValidation.value.runRef, readiness);
  const report: ReplayReadinessReportV1 = {
    kind: "replay-readiness-report",
    schemaVersion: REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION,
    reportRef,
    runRef: runValidation.value.runRef,
    status: readiness.status,
    mismatches: readiness.mismatches,
    missingSources: readiness.missingSources,
    staleArtifactRefs: readiness.staleArtifactRefs,
    warnings: warningsForReadiness(readiness),
    provenance: createRunProvenance("core.run-v1.assessReplayReadiness", [
      { kind: "run", ref: runValidation.value.runRef.id },
    ]),
  };

  const reportValidation = validateReplayReadinessReportValue(report);
  if (!reportValidation.ok) {
    return reportValidation.result as CoreResult<ReplayReadinessReportV1>;
  }
  return runResult({
    status: "ok",
    warnings: report.warnings,
    provenance: report.provenance,
    outputRefs: [{ kind: "replay-readiness-report", ref: report.reportRef }],
    runRef: report.runRef,
    output: report,
  });
}

export function validateReplayReadinessReportV1(value: unknown): CoreResult<ReplayReadinessReportV1> {
  const validation = validateReplayReadinessReportValue(value);
  if (!validation.ok) {
    return validation.result as CoreResult<ReplayReadinessReportV1>;
  }
  return runResult({
    status: "ok",
    warnings: validation.value.warnings,
    provenance: createRunProvenance("core.run-v1.validateReplayReadinessReport", [
      { kind: "replay-readiness-report", ref: validation.value.reportRef },
    ]),
    outputRefs: [{ kind: "replay-readiness-report", ref: validation.value.reportRef }],
    runRef: validation.value.runRef,
    output: validation.value,
  });
}

function packLockFromPack(pack: RatioPack): PackLockV1 {
  const packRef = ratioPackRef(pack);
  const sourceRefs = uniqueSourceRefs([
    { kind: "ratio-pack", ref: packRef },
    ...pack.provenance.sourceRefs,
  ]);
  const seed = {
    packRef,
    packVersion: pack.version,
    packSchemaVersion: pack.schemaVersion,
    contentIdentity: pack.contentIdentity,
  };
  const lockRef = `pack-lock:v1:${stableDigest(seed)}`;
  return {
    kind: "pack-lock",
    schemaVersion: PACK_LOCK_V1_SCHEMA_VERSION,
    lockRef,
    packRef,
    packVersion: pack.version,
    packSchemaVersion: pack.schemaVersion,
    contentIdentity: pack.contentIdentity,
    compatibility: deepCloneJson(pack.compatibility),
    sourceRefs,
    provenance: createRunProvenance("core.pack-lock-v1.create", sourceRefs),
  };
}

function validatePackLockValue(value: unknown): RunValidation<PackLockV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, PACK_LOCK_ALLOWED_KEYS) !== null) {
    return failedRun(invalidPackLock("packLock", "PackLock V1 must be a closed structured object."));
  }
  if (value.kind !== "pack-lock" || value.schemaVersion !== PACK_LOCK_V1_SCHEMA_VERSION) {
    return failedRun(invalidPackLock("schemaVersion", "PackLock V1 requires pack-lock-v1."));
  }
  const lockRef = nonEmptyString(value.lockRef);
  const packRef = nonEmptyString(value.packRef);
  const packVersion = nonEmptyString(value.packVersion);
  const packSchemaVersion = nonEmptyString(value.packSchemaVersion);
  const contentIdentity = nonEmptyString(value.contentIdentity);
  if (lockRef === null || packRef === null || packVersion === null || packSchemaVersion === null || contentIdentity === null) {
    return failedRun(invalidPackLock("packLock", "PackLock V1 requires non-empty lockRef, packRef, packVersion, packSchemaVersion, and contentIdentity."));
  }
  if (!jsonSafe(value.compatibility)) {
    return failedRun(invalidPackLock("compatibility", "PackLock V1 compatibility must be JSON-safe."));
  }
  const sourceRefs = validateSourceRefs(value.sourceRefs, "sourceRefs");
  if (!sourceRefs.ok) {
    return sourceRefs;
  }
  const provenance = validateProvenanceValue(value.provenance, "provenance");
  if (!provenance.ok || provenance.value === null) {
    return failedRun(invalidPackLock("provenance", "PackLock V1 requires valid provenance."));
  }
  const expectedRef = `pack-lock:v1:${stableDigest({ packRef, packVersion, packSchemaVersion, contentIdentity })}`;
  if (lockRef !== expectedRef) {
    return failedRun(invalidPackLock("lockRef", "PackLock V1 lockRef does not match pack identity fields."));
  }
  return validRun({
    kind: "pack-lock",
    schemaVersion: PACK_LOCK_V1_SCHEMA_VERSION,
    lockRef,
    packRef,
    packVersion,
    packSchemaVersion,
    contentIdentity,
    compatibility: deepCloneJson(value.compatibility),
    sourceRefs: sourceRefs.value,
    provenance: provenance.value,
  });
}

function firstPackLockMismatch(actual: PackLockV1, expected: PackLockV1): { path: string; message: string } | null {
  for (const key of ["packRef", "packVersion", "packSchemaVersion", "contentIdentity", "lockRef"] as const) {
    if (actual[key] !== expected[key]) {
      return {
        path: key,
        message: `PackLock V1 ${key} does not match the supplied RatioPackV1.`,
      };
    }
  }
  if (stableJson(actual.compatibility) !== stableJson(expected.compatibility)) {
    return { path: "compatibility", message: "PackLock V1 compatibility does not match the supplied RatioPackV1." };
  }
  return null;
}

function operationContextSeed(input: Record<string, unknown>): RunValidation<Omit<OperationContextV1, "kind" | "schemaVersion" | "contextRef">> {
  const coreVersion = nonEmptyString(input.coreVersion);
  const operation = nonEmptyString(input.operation);
  const operationVersion = nonEmptyString(input.operationVersion);
  const geometryModelVersion = nonEmptyString(input.geometryModelVersion);
  if (coreVersion === null || operation === null || operationVersion === null || geometryModelVersion === null) {
    return failedRun(invalidOperationContext("operationContext", "OperationContext V1 requires non-empty core, operation, operationVersion, and geometry model versions."));
  }
  if (coreVersion !== CORE_VERSION) {
    return failedRun(invalidOperationContext("coreVersion", "OperationContext V1 coreVersion must match the active Norma Core version."));
  }
  const coordinatePolicy = validateCoordinatePolicy(input.coordinatePolicy);
  if (!coordinatePolicy.ok) return coordinatePolicy;
  const metricPolicy = validateMetricPolicy(input.metricPolicy, coordinatePolicy.value);
  if (!metricPolicy.ok) return metricPolicy;
  const tolerancePolicy = validateTolerancePolicy(input.tolerancePolicy);
  if (!tolerancePolicy.ok) return tolerancePolicy;
  const roundingPolicy = validateRoundingPolicy(input.roundingPolicy);
  if (!roundingPolicy.ok) return roundingPolicy;
  const numericPolicy = validateNumericPolicy(input.numericPolicy);
  if (!numericPolicy.ok) return numericPolicy;
  const orderingPolicy = validateOrderingPolicy(input.orderingPolicy);
  if (!orderingPolicy.ok) return orderingPolicy;
  const featureFlags = validateFeatureFlags(input.featureFlags);
  if (!featureFlags.ok) return featureFlags;
  const sourceRefs = validateSourceRefs(input.sourceRefs ?? [], "sourceRefs");
  if (!sourceRefs.ok) return sourceRefs;
  const provenance = validateProvenanceValue(input.provenance, "provenance");
  if (!provenance.ok) return provenance;

  return validRun({
    coreVersion,
    operation,
    operationVersion,
    geometryModelVersion,
    coordinatePolicy: coordinatePolicy.value,
    metricPolicy: metricPolicy.value,
    tolerancePolicy: tolerancePolicy.value,
    roundingPolicy: roundingPolicy.value,
    numericPolicy: numericPolicy.value,
    orderingPolicy: orderingPolicy.value,
    featureFlags: featureFlags.value,
    sourceRefs: sourceRefs.value,
    provenance: provenance.value ?? createRunProvenance("core.operation-context-v1.create", [
      { kind: "operation", ref: `${operation}@${operationVersion}` },
    ]),
  });
}

function validateOperationContextValue(value: unknown): RunValidation<OperationContextV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, OPERATION_CONTEXT_ALLOWED_KEYS) !== null) {
    return failedRun(invalidOperationContext("operationContext", "OperationContext V1 must be a closed structured object."));
  }
  if (value.kind !== "operation-context" || value.schemaVersion !== OPERATION_CONTEXT_V1_SCHEMA_VERSION) {
    return failedRun(invalidOperationContext("schemaVersion", "OperationContext V1 requires operation-context-v1."));
  }
  const contextRef = nonEmptyString(value.contextRef);
  if (contextRef === null) {
    return failedRun(invalidOperationContext("contextRef", "OperationContext V1 requires a non-empty contextRef."));
  }
  const seed = operationContextSeed(value);
  if (!seed.ok) return seed;
  const expectedContextRef = contextRefFor(seed.value);
  if (contextRef !== expectedContextRef) {
    return failedRun(invalidOperationContext("contextRef", "OperationContext V1 contextRef does not match its deterministic policy basis."));
  }
  return validRun({
    kind: "operation-context",
    schemaVersion: OPERATION_CONTEXT_V1_SCHEMA_VERSION,
    contextRef,
    ...seed.value,
  });
}

function validateCoordinatePolicy(value: unknown): RunValidation<unknown> {
  if (!isRecord(value) || firstUnsupportedKey(value, COORDINATE_POLICY_ALLOWED_KEYS) !== null) {
    return failedRun(invalidOperationContext("coordinatePolicy", "Coordinate policy must be closed and structured."));
  }
  if (value.kind !== "run-coordinate-policy") {
    return failedRun(invalidOperationContext("coordinatePolicy.kind", "Coordinate policy kind must be run-coordinate-policy."));
  }
  if (nonEmptyString(value.surfaceRef) === null || value.origin !== "bottom-left" || value.xAxis !== "right" || value.yAxis !== "up" || value.coordinateScale !== "normalized") {
    return failedRun(invalidOperationContext("coordinatePolicy", "Coordinate policy must expose the Norma canonical normalized surface conventions."));
  }
  if (!isRecord(value.normalizedBounds) || firstUnsupportedKey(value.normalizedBounds, RECT_POLICY_ALLOWED_KEYS) !== null || value.normalizedBounds.kind !== "rect" || !isNormalizedRect(value.normalizedBounds)) {
    return failedRun(invalidOperationContext("coordinatePolicy.normalizedBounds", "Coordinate policy normalizedBounds must be a normalized rectangle."));
  }
  return validRun(deepCloneJson(value));
}

function validateMetricPolicy(value: unknown, coordinatePolicy: unknown): RunValidation<unknown> {
  if (!isRecord(value) || firstUnsupportedKey(value, METRIC_POLICY_ALLOWED_KEYS) !== null) {
    return failedRun(invalidOperationContext("metricPolicy", "Metric policy must be closed and structured."));
  }
  if (value.kind !== "run-metric-policy") {
    return failedRun(invalidOperationContext("metricPolicy.kind", "Metric policy kind must be run-metric-policy."));
  }
  if (nonEmptyString(value.surfaceRef) === null || (isRecord(coordinatePolicy) && value.surfaceRef !== coordinatePolicy.surfaceRef)) {
    return failedRun(invalidOperationContext("metricPolicy.surfaceRef", "Metric policy must bind to the same surface as the coordinate policy."));
  }
  if (value.measurement !== "normalized" && value.measurement !== "metric" && value.measurement !== "both") {
    return failedRun(invalidOperationContext("metricPolicy.measurement", "Metric policy measurement must be normalized, metric, or both."));
  }
  if (!isNullableString(value.unit) || value.distance !== "axis-aligned" || value.area !== "rectangular" || value.angle !== "radians") {
    return failedRun(invalidOperationContext("metricPolicy", "Metric policy must expose unit, distance, area, and angle conventions."));
  }
  return validRun(deepCloneJson(value));
}

function validateTolerancePolicy(value: unknown): RunValidation<unknown> {
  if (!isRecord(value) || firstUnsupportedKey(value, TOLERANCE_POLICY_ALLOWED_KEYS) !== null || value.kind !== "run-tolerance-policy") {
    return failedRun(invalidOperationContext("tolerancePolicy", "Tolerance policy must be closed and structured."));
  }
  for (const key of ["coordinateTolerance", "metricTolerance", "angleTolerance"] as const) {
    if (!isNonNegativeFiniteNumber(value[key])) {
      return failedRun(invalidOperationContext(`tolerancePolicy.${key}`, "Tolerance policy values must be finite and non-negative."));
    }
  }
  return validRun(deepCloneJson(value));
}

function validateRoundingPolicy(value: unknown): RunValidation<unknown> {
  if (!isRecord(value) || firstUnsupportedKey(value, ROUNDING_POLICY_ALLOWED_KEYS) !== null || value.kind !== "run-rounding-policy") {
    return failedRun(invalidOperationContext("roundingPolicy", "Rounding policy must be closed and structured."));
  }
  if (value.mode !== "none" && value.mode !== "fixed-decimal") {
    return failedRun(invalidOperationContext("roundingPolicy.mode", "Rounding policy mode must be none or fixed-decimal."));
  }
  if (value.mode === "none" && value.precision !== null) {
    return failedRun(invalidOperationContext("roundingPolicy.precision", "No-rounding policy must explicitly use null precision."));
  }
  if (value.mode === "fixed-decimal" && (!Number.isInteger(value.precision) || (value.precision as number) < 0)) {
    return failedRun(invalidOperationContext("roundingPolicy.precision", "Fixed-decimal rounding precision must be a non-negative integer."));
  }
  return validRun(deepCloneJson(value));
}

function validateNumericPolicy(value: unknown): RunValidation<unknown> {
  if (!isRecord(value) || firstUnsupportedKey(value, NUMERIC_POLICY_ALLOWED_KEYS) !== null || value.kind !== "run-numeric-policy") {
    return failedRun(invalidOperationContext("numericPolicy", "Numeric policy must be closed and structured."));
  }
  if (!isNonNegativeFiniteNumber(value.epsilon) || value.comparison !== "absolute" || value.negativeZero !== "normalize-to-zero" || value.nonFinite !== "reject") {
    return failedRun(invalidOperationContext("numericPolicy", "Numeric policy must expose finite epsilon and comparison conventions."));
  }
  return validRun(deepCloneJson(value));
}

function validateOrderingPolicy(value: unknown): RunValidation<unknown> {
  if (!isRecord(value) || firstUnsupportedKey(value, ORDERING_POLICY_ALLOWED_KEYS) !== null || value.kind !== "run-ordering-policy") {
    return failedRun(invalidOperationContext("orderingPolicy", "Ordering policy must be closed and structured."));
  }
  for (const key of ["inputRefs", "outputRefs", "rules", "featureFlags", "warnings", "errors", "mismatches"] as const) {
    const policyValue = nonEmptyString(value[key]);
    if (policyValue === null || hasExecutableTerm(policyValue)) {
      return failedRun(invalidOperationContext(`orderingPolicy.${key}`, "Ordering policy values must be explicit deterministic conventions."));
    }
  }
  return validRun(deepCloneJson(value));
}

function validateFeatureFlags(value: unknown): RunValidation<readonly OperationFeatureFlagV1[]> {
  const flags: OperationFeatureFlagV1[] = [];
  if (Array.isArray(value)) {
    for (const flag of value) {
      if (!isRecord(flag) || firstUnsupportedKey(flag, FEATURE_FLAG_ALLOWED_KEYS) !== null || flag.kind !== "operation-feature-flag" || nonEmptyString(flag.key) === null || !isFeatureFlagValue(flag.value) || hasExecutableTerm(flag.key as string)) {
        return failedRun(invalidOperationContext("featureFlags", "Feature flags must be explicit key/value facts."));
      }
      flags.push({ kind: "operation-feature-flag", key: flag.key as string, value: normalizeJsonScalar(flag.value) });
    }
  } else if (isRecord(value)) {
    for (const [key, flagValue] of Object.entries(value)) {
      if (key.length === 0 || !isFeatureFlagValue(flagValue) || hasExecutableTerm(key)) {
        return failedRun(invalidOperationContext("featureFlags", "Feature flag record values must be JSON scalar facts."));
      }
      flags.push({ kind: "operation-feature-flag", key, value: normalizeJsonScalar(flagValue) });
    }
  } else if (value === undefined) {
    return failedRun(invalidOperationContext("featureFlags", "Feature flags must be explicit, even when empty."));
  } else {
    return failedRun(invalidOperationContext("featureFlags", "Feature flags must be an array or record."));
  }

  const duplicateFlag = firstDuplicate(flags.map((flag) => flag.key));
  if (duplicateFlag !== null) {
    return failedRun(invalidOperationContext("featureFlags", `Feature flag is declared more than once: ${duplicateFlag}.`));
  }
  return validRun(flags.sort((first, second) => first.key.localeCompare(second.key)));
}

function contextRefFor(seed: Omit<OperationContextV1, "kind" | "schemaVersion" | "contextRef">): string {
  return `operation-context:v1:${stableDigest(operationContextIdentityBasis(seed))}`;
}

function operationContextIdentityBasis(context: Omit<OperationContextV1, "kind" | "schemaVersion" | "contextRef"> | OperationContextV1): unknown {
  return {
    coreVersion: context.coreVersion,
    operation: context.operation,
    operationVersion: context.operationVersion,
    geometryModelVersion: context.geometryModelVersion,
    coordinatePolicy: context.coordinatePolicy,
    metricPolicy: context.metricPolicy,
    tolerancePolicy: context.tolerancePolicy,
    roundingPolicy: context.roundingPolicy,
    numericPolicy: context.numericPolicy,
    orderingPolicy: context.orderingPolicy,
    featureFlags: context.featureFlags,
  };
}

function runInputSeed(input: unknown): RunValidation<{
  inputs: readonly RunSourceInputV1[];
  packLockRef: string;
  orderedRuleRefs: readonly string[];
  ruleSetRef: string | null;
  operationContextRef: string;
  provenance?: Provenance;
}> {
  if (!isRecord(input) || firstUnsupportedKey(input, [
    "inputs",
    "packLock",
    "packLockRef",
    "orderedRuleRefs",
    "ruleSetRef",
    "operationContext",
    "operationContextRef",
    "provenance",
  ] as const) !== null) {
    return failedRun(invalidRunInput("runInput", "RunInput V1 creation input must be closed and structured."));
  }
  const packLockRef = nonEmptyString(input.packLockRef) ?? (isRecord(input.packLock) ? nonEmptyString(input.packLock.lockRef) : null);
  const operationContextRef = nonEmptyString(input.operationContextRef) ?? (isRecord(input.operationContext) ? nonEmptyString(input.operationContext.contextRef) : null);
  if (packLockRef === null || operationContextRef === null) {
    return failedRun(invalidRunInput("runInput", "RunInput V1 requires packLock and operationContext refs."));
  }
  const orderedRuleRefs = validateStringArray(input.orderedRuleRefs, "orderedRuleRefs", { allowEmpty: false, preserveOrder: true });
  if (!orderedRuleRefs.ok) return orderedRuleRefs;
  if (firstDuplicate(orderedRuleRefs.value) !== null) {
    return failedRun(invalidRunInput("orderedRuleRefs", "RunInput V1 ordered rule refs must be unique."));
  }
  const ruleSetRef = input.ruleSetRef === null ? null : nonEmptyString(input.ruleSetRef);
  if (ruleSetRef === null && input.ruleSetRef !== null) {
    return failedRun(invalidRunInput("ruleSetRef", "RunInput V1 ruleSetRef must be non-empty or null."));
  }
  const sourceInputs = validateRunSourceInputs(input.inputs);
  if (!sourceInputs.ok) return sourceInputs;
  const provenance = validateProvenanceValue(input.provenance, "provenance");
  if (!provenance.ok) return provenance;
  return validRun({
    inputs: sourceInputs.value,
    packLockRef,
    orderedRuleRefs: orderedRuleRefs.value,
    ruleSetRef,
    operationContextRef,
    ...(provenance.value !== null ? { provenance: provenance.value } : {}),
  });
}

function runInputFromSeed(seed: {
  inputs: readonly RunSourceInputV1[];
  packLockRef: string;
  orderedRuleRefs: readonly string[];
  ruleSetRef: string | null;
  operationContextRef: string;
  provenance?: Provenance;
}): RunInputV1 {
  const inputs = normalizeRunSourceInputs(seed.inputs);
  const inputIdentity = inputIdentityFor(inputs);
  const inputRefs = inputs.map((input) => input.inputRef);
  return {
    kind: "run-input",
    schemaVersion: RUN_INPUT_V1_SCHEMA_VERSION,
    inputIdentity,
    inputs,
    inputRefs,
    packLockRef: seed.packLockRef,
    orderedRuleRefs: [...seed.orderedRuleRefs],
    ruleSetRef: seed.ruleSetRef,
    operationContextRef: seed.operationContextRef,
    sourceRefs: uniqueSourceRefs(inputRefs),
    provenance: seed.provenance ?? createRunProvenance("core.run-input-v1.create", inputRefs),
  };
}

function validateRunInputValue(value: unknown): RunValidation<RunInputV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, RUN_INPUT_ALLOWED_KEYS) !== null) {
    return failedRun(invalidRunInput("runInput", "RunInput V1 must be a closed structured object."));
  }
  if (value.kind !== "run-input" || value.schemaVersion !== RUN_INPUT_V1_SCHEMA_VERSION) {
    return failedRun(invalidRunInput("schemaVersion", "RunInput V1 requires run-input-v1."));
  }
  const seed = runInputSeed({
    inputs: value.inputs,
    packLockRef: value.packLockRef,
    orderedRuleRefs: value.orderedRuleRefs,
    ruleSetRef: value.ruleSetRef,
    operationContextRef: value.operationContextRef,
    provenance: value.provenance,
  });
  if (!seed.ok) return seed;
  const expected = runInputFromSeed(seed.value);
  if (value.inputIdentity !== expected.inputIdentity) {
    return failedRun(invalidRunInput("inputIdentity", "RunInput V1 inputIdentity does not match its deterministic input basis."));
  }
  const inputRefs = validateSourceRefs(value.inputRefs, "inputRefs");
  if (!inputRefs.ok) return inputRefs;
  const sourceRefs = validateSourceRefs(value.sourceRefs, "sourceRefs");
  if (!sourceRefs.ok) return sourceRefs;
  if (stableJson(inputRefs.value) !== stableJson(expected.inputRefs) || stableJson(sourceRefs.value) !== stableJson(expected.sourceRefs)) {
    return failedRun(invalidRunInput("inputRefs", "RunInput V1 refs do not match normalized inputs."));
  }
  return validRun({
    ...expected,
    provenance: seed.value.provenance ?? expected.provenance,
  });
}

function validateRunSourceInputs(value: unknown): RunValidation<readonly RunSourceInputV1[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return failedRun(invalidRunInput("inputs", "RunInput V1 requires at least one structured input dependency."));
  }
  const inputs: RunSourceInputV1[] = [];
  for (const item of value) {
    if (!isRecord(item) || firstUnsupportedKey(item, RUN_SOURCE_INPUT_ALLOWED_KEYS) !== null || item.kind !== "run-source-input") {
      return failedRun(invalidRunInput("inputs", "Run source inputs must be closed run-source-input objects."));
    }
    const inputRef = validateSourceReference(item.inputRef, "inputRef");
    if (!inputRef.ok) return inputRef;
    if (inputRef.value.kind === "artifact" || artifactWouldBecomeSource(item.snapshot)) {
      return failedRun(invalidRunInput("inputs", "Artifacts are derived outputs and cannot be RunInput V1 sources."));
    }
    const sourceInput: RunSourceInputV1 = {
      kind: "run-source-input",
      inputRef: inputRef.value,
    };
    if ("snapshot" in item) {
      const snapshot = cloneJsonSafe(item.snapshot);
      if (!snapshot.ok) {
        return failedRun(invalidRunInput("snapshot", "RunInput V1 snapshots must be JSON-safe structured data."));
      }
      sourceInput.snapshot = snapshot.value;
    }
    if ("contentIdentity" in item) {
      const contentIdentity = nonEmptyString(item.contentIdentity);
      if (contentIdentity === null) {
        return failedRun(invalidRunInput("contentIdentity", "RunInput V1 contentIdentity must be non-empty when supplied."));
      }
      sourceInput.contentIdentity = contentIdentity;
    }
    inputs.push(sourceInput);
  }
  const duplicateInput = firstDuplicate(inputs.map((input) => sourceKey(input.inputRef)));
  if (duplicateInput !== null) {
    return failedRun(invalidRunInput("inputs", `RunInput V1 input ref is duplicated: ${duplicateInput}.`));
  }
  return validRun(normalizeRunSourceInputs(inputs));
}

function normalizeRunSourceInputs(inputs: readonly RunSourceInputV1[]): readonly RunSourceInputV1[] {
  return [...inputs]
    .map((input) => {
      const normalized: RunSourceInputV1 = {
        kind: "run-source-input",
        inputRef: { ...input.inputRef },
      };
      if ("contentIdentity" in input) {
        normalized.contentIdentity = input.contentIdentity;
      }
      if ("snapshot" in input) {
        normalized.snapshot = deepCloneJson(input.snapshot);
      }
      return normalized;
    })
    .sort((first, second) => sourceKey(first.inputRef).localeCompare(sourceKey(second.inputRef)));
}

function inputIdentityFor(inputs: readonly RunSourceInputV1[]): string {
  return `run-input:v1:${stableDigest(inputs.map((input) => ({
    inputRef: input.inputRef,
    contentIdentity: input.contentIdentity ?? null,
    snapshot: "snapshot" in input ? input.snapshot : null,
  })))}`;
}

function runOutputSeed(input: unknown): RunValidation<{
  constructionRefs: readonly SourceReference[];
  measurementRefs: readonly SourceReference[];
  evaluationRefs: readonly SourceReference[];
  comparisonRefs: readonly SourceReference[];
  decisionRefs: readonly SourceReference[];
  explanationRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
  executionStatus: RunExecutionStatusV1;
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance?: Provenance;
}> {
  if (!isRecord(input) || firstUnsupportedKey(input, RUN_OUTPUT_ALLOWED_KEYS) !== null) {
    return failedRun(invalidRunOutput("runOutput", "RunOutput V1 creation input must be closed and structured."));
  }
  const refs: Record<string, readonly SourceReference[]> = {};
  for (const [field, expectedKind] of OUTPUT_CATEGORIES) {
    const validation = validateOutputCategoryRefs(input[field] ?? [], field, expectedKind);
    if (!validation.ok) return validation;
    refs[field] = validation.value;
  }
  const duplicate = firstDuplicate(OUTPUT_CATEGORIES.flatMap(([field]) => refs[field]?.map(sourceKey) ?? []));
  if (duplicate !== null) {
    return failedRun(invalidRunOutput("outputRefs", `RunOutput V1 output ref is duplicated across categories: ${duplicate}.`));
  }
  const executionStatus = runExecutionStatus(input.executionStatus);
  if (executionStatus === null) {
    return failedRun(invalidRunOutput("executionStatus", "RunOutput V1 requires success, partial, or failed executionStatus."));
  }
  const warnings = validateDiagnosticsArray(input.warnings ?? [], "warnings", "warning");
  if (!warnings.ok) return warnings;
  const errors = validateDiagnosticsArray(input.errors ?? [], "errors", "error");
  if (!errors.ok) return errors;
  const provenance = validateProvenanceValue(input.provenance, "provenance");
  if (!provenance.ok) return provenance;
  return validRun({
    constructionRefs: refs.constructionRefs ?? [],
    measurementRefs: refs.measurementRefs ?? [],
    evaluationRefs: refs.evaluationRefs ?? [],
    comparisonRefs: refs.comparisonRefs ?? [],
    decisionRefs: refs.decisionRefs ?? [],
    explanationRefs: refs.explanationRefs ?? [],
    artifactRefs: refs.artifactRefs ?? [],
    executionStatus,
    warnings: warnings.value as readonly CoreWarning[],
    errors: errors.value as readonly CoreError[],
    ...(provenance.value !== null ? { provenance: provenance.value } : {}),
  });
}

function runOutputFromSeed(seed: {
  constructionRefs: readonly SourceReference[];
  measurementRefs: readonly SourceReference[];
  evaluationRefs: readonly SourceReference[];
  comparisonRefs: readonly SourceReference[];
  decisionRefs: readonly SourceReference[];
  explanationRefs: readonly SourceReference[];
  artifactRefs: readonly SourceReference[];
  executionStatus: RunExecutionStatusV1;
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance?: Provenance;
}): RunOutputV1 {
  const outputRefs = [
    ...seed.constructionRefs,
    ...seed.measurementRefs,
    ...seed.evaluationRefs,
    ...seed.comparisonRefs,
    ...seed.decisionRefs,
    ...seed.explanationRefs,
    ...seed.artifactRefs,
  ];
  return {
    kind: "run-output",
    schemaVersion: RUN_OUTPUT_V1_SCHEMA_VERSION,
    constructionRefs: sortSourceRefs(seed.constructionRefs),
    measurementRefs: sortSourceRefs(seed.measurementRefs),
    evaluationRefs: sortSourceRefs(seed.evaluationRefs),
    comparisonRefs: sortSourceRefs(seed.comparisonRefs),
    decisionRefs: sortSourceRefs(seed.decisionRefs),
    explanationRefs: sortSourceRefs(seed.explanationRefs),
    artifactRefs: sortSourceRefs(seed.artifactRefs),
    executionStatus: seed.executionStatus,
    warnings: sortDiagnostics(seed.warnings),
    errors: sortDiagnostics(seed.errors) as readonly CoreError[],
    provenance: seed.provenance ?? createRunProvenance("core.run-output-v1.create", outputRefs),
  };
}

function validateRunOutputValue(value: unknown): RunValidation<RunOutputV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, RUN_OUTPUT_ALLOWED_KEYS) !== null) {
    return failedRun(invalidRunOutput("runOutput", "RunOutput V1 must be a closed structured object."));
  }
  if (value.kind !== "run-output" || value.schemaVersion !== RUN_OUTPUT_V1_SCHEMA_VERSION) {
    return failedRun(invalidRunOutput("schemaVersion", "RunOutput V1 requires run-output-v1."));
  }
  const seed = runOutputSeed(value);
  if (!seed.ok) return seed;
  const output = runOutputFromSeed(seed.value);
  if (stableJson(outputRefsForRunOutput(output)) !== stableJson(outputRefsForRunOutput(value as unknown as RunOutputV1))) {
    return failedRun(invalidRunOutput("outputRefs", "RunOutput V1 refs are not in deterministic category order."));
  }
  const invariant = validateExecutionStatusInvariant(output.executionStatus, outputRefsForRunOutput(output), output.warnings, output.errors);
  if (invariant !== null) return failedRun(invariant);
  return validRun(output);
}

function runIdentityBasisFromInput(input: unknown): RunValidation<unknown> {
  if (!isRecord(input)) {
    return failedRun(invalidRun("runIdentity", "Run identity input must be structured."));
  }
  const operation = nonEmptyString(input.operation);
  const operationVersion = nonEmptyString(input.operationVersion);
  if (operation === null || operationVersion === null) {
    return failedRun(invalidRun("operation", "Run identity requires non-empty operation and operationVersion."));
  }
  const runInputValidation = validateRunInputValue(input.runInput);
  if (!runInputValidation.ok) return runInputValidation;
  const packLockValidation = validatePackLockValue(input.packLock);
  if (!packLockValidation.ok) return packLockValidation;
  const contextValidation = validateOperationContextValue(input.operationContext);
  if (!contextValidation.ok) return contextValidation;
  const orderedRuleRefs = validateStringArray(input.orderedRuleRefs, "orderedRuleRefs", { allowEmpty: false, preserveOrder: true });
  if (!orderedRuleRefs.ok) return orderedRuleRefs;
  const ruleSetRef = input.ruleSetRef === null ? null : nonEmptyString(input.ruleSetRef);
  if (ruleSetRef === null && input.ruleSetRef !== null) {
    return failedRun(invalidRun("ruleSetRef", "Run identity ruleSetRef must be non-empty or null."));
  }
  if (contextValidation.value.operation !== operation || contextValidation.value.operationVersion !== operationVersion) {
    return failedRun(invalidRun("operationContext", "Run identity operation must match OperationContext V1."));
  }
  return validRun({
    algorithm: RUN_IDENTITY_ALGORITHM_V1,
    operation,
    operationVersion,
    coreVersion: contextValidation.value.coreVersion,
    geometryModelVersion: contextValidation.value.geometryModelVersion,
    inputIdentity: runInputValidation.value.inputIdentity,
    packLock: {
      packRef: packLockValidation.value.packRef,
      packVersion: packLockValidation.value.packVersion,
      packSchemaVersion: packLockValidation.value.packSchemaVersion,
      contentIdentity: packLockValidation.value.contentIdentity,
      lockRef: packLockValidation.value.lockRef,
    },
    orderedRuleRefs: [...orderedRuleRefs.value],
    ruleSetRef,
    operationContext: operationContextIdentityBasis(contextValidation.value),
  });
}

function runRefForBasis(basis: unknown): RunRef {
  return { id: `run:v1:${stableDigest(basis)}` };
}

function validateRunInputLinks(
  runInput: RunInputV1,
  packLock: PackLockV1,
  operationContext: OperationContextV1,
  orderedRuleRefs: unknown,
  ruleSetRef: unknown,
): CoreResult | null {
  if (runInput.packLockRef !== packLock.lockRef) {
    return invalidRun("runInput.packLockRef", "RunInput V1 packLockRef must match RunV1 PackLock.");
  }
  if (runInput.operationContextRef !== operationContext.contextRef) {
    return invalidRun("runInput.operationContextRef", "RunInput V1 operationContextRef must match RunV1 OperationContext.");
  }
  if (orderedRuleRefs !== undefined && stableJson(runInput.orderedRuleRefs) !== stableJson(orderedRuleRefs)) {
    return invalidRun("orderedRuleRefs", "RunV1 orderedRuleRefs must match RunInput V1.");
  }
  if (ruleSetRef !== undefined && runInput.ruleSetRef !== ruleSetRef) {
    return invalidRun("ruleSetRef", "RunV1 ruleSetRef must match RunInput V1.");
  }
  return null;
}

function validateRunValue(
  value: unknown,
  sourceRegistry?: ValidSourceRegistry,
  options: RunValueValidationOptions = {},
): RunValidation<RunV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, RUN_ALLOWED_KEYS) !== null) {
    return failedRun(invalidRun("run", "Run V1 must be a closed structured object."));
  }
  if (value.kind !== "run" || value.schemaVersion !== RUN_V1_SCHEMA_VERSION) {
    return failedRun(invalidRun("schemaVersion", "Run V1 requires run-v1."));
  }
  const runRef = validateRunRef(value.runRef, "runRef");
  if (!runRef.ok) return runRef;
  const operation = nonEmptyString(value.operation);
  const operationVersion = nonEmptyString(value.operationVersion);
  if (operation === null || operationVersion === null) {
    return failedRun(invalidRun("operation", "Run V1 requires non-empty operation and operationVersion."));
  }
  const packLock = validatePackLockValue(value.packLock);
  if (!packLock.ok) return packLock;
  const context = validateOperationContextValue(value.operationContext);
  if (!context.ok) return context;
  const runInput = validateRunInputValue(value.runInput);
  if (!runInput.ok) return runInput;
  const runOutput = validateRunOutputValue(value.runOutput);
  if (!runOutput.ok) return runOutput;
  if (operation !== context.value.operation || operationVersion !== context.value.operationVersion) {
    return failedRun(invalidRun("operationContext", "Run operation identity must match OperationContext V1."));
  }
  if (stableJson(value.orderedRuleRefs) !== stableJson(runInput.value.orderedRuleRefs) || value.ruleSetRef !== runInput.value.ruleSetRef) {
    return failedRun(invalidRun("rules", "Run V1 rule refs must match RunInput V1."));
  }
  const linkFailure = validateRunInputLinks(runInput.value, packLock.value, context.value, value.orderedRuleRefs, value.ruleSetRef);
  if (linkFailure !== null) return failedRun(linkFailure);
  const expectedRunRef = deriveRunRefV1({
    operation,
    operationVersion,
    runInput: runInput.value,
    packLock: packLock.value,
    orderedRuleRefs: runInput.value.orderedRuleRefs,
    ruleSetRef: runInput.value.ruleSetRef,
    operationContext: context.value,
  });
  if (expectedRunRef.status !== "ok" || expectedRunRef.output === null || expectedRunRef.output.id !== runRef.value.id) {
    return failedRun(invalidRun("runRef", "Run V1 runRef does not match its deterministic identity basis."));
  }
  const executionStatus = runExecutionStatus(value.executionStatus);
  if (executionStatus === null || executionStatus !== runOutput.value.executionStatus) {
    return failedRun(invalidRun("executionStatus", "Run V1 executionStatus must match RunOutput V1."));
  }
  const warnings = validateDiagnosticsArray(value.warnings, "warnings", "warning");
  if (!warnings.ok) return warnings;
  const errors = validateDiagnosticsArray(value.errors, "errors", "error");
  if (!errors.ok) return errors;
  const readiness = validateRunReplayReadinessValue(value.replayReadiness);
  if (!readiness.ok) return readiness;
  const readinessFailure = validateReadinessInvariants(readiness.value, runInput.value);
  if (readinessFailure !== null) return failedRun(readinessFailure);
  const evidenceFailure = validateReadinessAgainstEvidence(
    readiness.value,
    runInput.value,
    runOutput.value,
    runRef.value,
    sourceRegistry,
    options,
  );
  if (evidenceFailure !== null) return failedRun(evidenceFailure);
  const provenance = validateProvenanceValue(value.provenance, "provenance");
  if (!provenance.ok || provenance.value === null) {
    return failedRun(invalidRun("provenance", "Run V1 requires valid provenance."));
  }
  if (sourceRegistry !== undefined) {
    const sourceFailure = validateRunAgainstSourceRegistry(runInput.value, runOutput.value, runRef.value, sourceRegistry);
    if (sourceFailure !== null) return failedRun(sourceFailure);
  }
  return validRun({
    kind: "run",
    schemaVersion: RUN_V1_SCHEMA_VERSION,
    runRef: runRef.value,
    operation,
    operationVersion,
    runInput: runInput.value,
    packLock: packLock.value,
    orderedRuleRefs: [...runInput.value.orderedRuleRefs],
    ruleSetRef: runInput.value.ruleSetRef,
    operationContext: context.value,
    runOutput: runOutput.value,
    executionStatus,
    replayReadiness: readiness.value,
    warnings: warnings.value as readonly CoreWarning[],
    errors: errors.value as readonly CoreError[],
    provenance: provenance.value,
  });
}

function validateRunReplayReadinessValue(value: unknown): RunValidation<RunReplayReadinessV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, RUN_READINESS_ALLOWED_KEYS) !== null || value.kind !== "run-replay-readiness" || !isReplayReadinessStatus(value.status)) {
    return failedRun(invalidRun("replayReadiness", "Run replayReadiness must be a closed status object."));
  }
  const mismatches = validateMismatches(value.mismatches);
  if (!mismatches.ok) return mismatches;
  const missingSources = validateSourceRefs(value.missingSources, "missingSources");
  if (!missingSources.ok) return missingSources;
  const staleArtifactRefs = validateSourceRefs(value.staleArtifactRefs, "staleArtifactRefs");
  if (!staleArtifactRefs.ok) return staleArtifactRefs;
  return validRun({
    kind: "run-replay-readiness",
    status: value.status,
    mismatches: mismatches.value,
    missingSources: missingSources.value,
    staleArtifactRefs: staleArtifactRefs.value,
  });
}

function validateReadinessInvariants(readiness: RunReplayReadinessV1, runInput: RunInputV1): CoreResult | null {
  const expectedStatus = readinessStatusFor(readiness.mismatches);
  const expectedMissingSources = uniqueSourceRefs(readiness.mismatches
    .filter((mismatch) => mismatch.mismatchKind === "missing_source")
    .flatMap((mismatch) => mismatch.sourceRefs));
  const expectedStaleArtifactRefs = uniqueSourceRefs(readiness.mismatches
    .filter((mismatch) => mismatch.mismatchKind === "artifact_stale")
    .flatMap((mismatch) => mismatch.sourceRefs));
  const missingInputKeys = new Set(missingInputSources(runInput).map(sourceKey));
  const hasBlockingIncompatible = readiness.mismatches.some((mismatch) => mismatch.blocksReplay && mismatch.mismatchKind !== "missing_source" && mismatch.mismatchKind !== "artifact_stale");
  const hasStale = readiness.staleArtifactRefs.length > 0 || readiness.mismatches.some((mismatch) => mismatch.mismatchKind === "artifact_stale");
  const hasMissing = readiness.missingSources.length > 0 || readiness.mismatches.some((mismatch) => mismatch.mismatchKind === "missing_source") || missingInputSources(runInput).length > 0;
  if (readiness.status !== expectedStatus) {
    return invalidRun("replayReadiness.status", "Run V1 replayReadiness status must match deterministic mismatch precedence.");
  }
  if (stableJson(readiness.missingSources) !== stableJson(expectedMissingSources)) {
    return invalidRun("replayReadiness.missingSources", "Run V1 missingSources must match missing_source mismatch evidence.");
  }
  if (stableJson(readiness.staleArtifactRefs) !== stableJson(expectedStaleArtifactRefs)) {
    return invalidRun("replayReadiness.staleArtifactRefs", "Run V1 staleArtifactRefs must match artifact_stale mismatch evidence.");
  }
  if ([...missingInputKeys].some((missingKey) => !expectedMissingSources.some((ref) => sourceKey(ref) === missingKey))) {
    return invalidRun("replayReadiness.missingSources", "Run V1 replayReadiness must include missing source evidence for inputs without snapshots or content identities.");
  }
  if (readiness.status === "replay_ready" && (readiness.mismatches.length > 0 || hasStale || hasMissing)) {
    return invalidRun("replayReadiness", "Run V1 cannot be replay_ready with missing sources, stale artifacts, or mismatches.");
  }
  if (readiness.status === "non_replayable" && !hasMissing) {
    return invalidRun("replayReadiness", "Run V1 non_replayable status requires missing source evidence.");
  }
  if (readiness.status === "stale" && !hasStale) {
    return invalidRun("replayReadiness", "Run V1 stale status requires stale artifact evidence.");
  }
  if (readiness.status === "incompatible" && !hasBlockingIncompatible) {
    return invalidRun("replayReadiness", "Run V1 incompatible status requires a blocking deterministic dependency mismatch.");
  }
  return null;
}

function validateReadinessAgainstEvidence(
  readiness: RunReplayReadinessV1,
  runInput: RunInputV1,
  runOutput: RunOutputV1,
  runRef: RunRef,
  registry?: ValidSourceRegistry,
  options: RunValueValidationOptions = {},
): CoreResult | null {
  if (registry === undefined && options.allowExternalArtifactEvidence === true) {
    return null;
  }
  const expected = replayReadinessFromMismatches([
    ...readinessMismatchesForRunSources(runInput, registry),
    ...readinessMismatchesForArtifacts(runRef, runOutput.artifactRefs, registry?.artifacts),
  ]);
  if (stableJson(readiness) !== stableJson(expected)) {
    return invalidRun("replayReadiness", "Run V1 replayReadiness does not match current source and artifact evidence.");
  }
  return null;
}

function validateRunSourceRegistry(value: unknown): RunValidation<ValidSourceRegistry> {
  if (!isRecord(value) || firstUnsupportedKey(value, RUN_SOURCE_BUNDLE_ALLOWED_KEYS) !== null) {
    return failedRun(invalidRun("sourceBundle", "Run source bundle must be closed and structured."));
  }
  if (value.kind !== RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION.replace("-v1", "-bundle") && value.kind !== "run-source-bundle") {
    return failedRun(invalidRun("sourceBundle.kind", "Run source bundle kind must be run-source-bundle."));
  }
  if (value.schemaVersion !== RUN_SOURCE_BUNDLE_V1_SCHEMA_VERSION) {
    return failedRun(invalidRun("sourceBundle.schemaVersion", "Run source bundle requires run-source-bundle-v1."));
  }
  const refs: SourceReference[] = [];
  const artifacts: ArtifactV1[] = [];

  for (const key of RUN_SOURCE_BUNDLE_ALLOWED_KEYS) {
    if (key === "kind" || key === "schemaVersion" || !(key in value)) {
      continue;
    }
    if (key === "surface" || key === "composition" || key === "compositionA" || key === "compositionB") {
      const geometry = validateGeometryV1(value[key]);
      if (geometry.status !== "ok" || geometry.output === null) {
        return geometry as unknown as RunValidation<ValidSourceRegistry>;
      }
      refs.push({ kind: key === "surface" ? "geometry" : "composition", ref: geometry.output.id });
    } else if (key === "construction") {
      const construction = validateConstructionV1(value[key]);
      if (construction.status !== "ok" || construction.output === null) return construction as unknown as RunValidation<ValidSourceRegistry>;
      refs.push({ kind: "construction", ref: construction.output.constructionRef });
    } else if (key === "measurementResult" || key === "measurementResultA" || key === "measurementResultB") {
      const measurement = validateMeasurementResultV1(value[key]);
      if (measurement.status !== "ok" || measurement.output === null) return measurement as unknown as RunValidation<ValidSourceRegistry>;
      refs.push({ kind: "measurement-result", ref: measurement.output.measurementResultRef });
    } else if (key === "evaluation" || key === "evaluationA" || key === "evaluationB") {
      const evaluation = validateEvaluationV1(value[key]);
      if (evaluation.status !== "ok" || evaluation.output === null) return evaluation as unknown as RunValidation<ValidSourceRegistry>;
      refs.push({ kind: "evaluation", ref: evaluation.output.evaluationRef });
    } else if (key === "comparison") {
      const comparison = validateComparisonV1(value[key]);
      if (comparison.status !== "ok" || comparison.output === null) return comparison as unknown as RunValidation<ValidSourceRegistry>;
      refs.push({ kind: "comparison", ref: comparison.output.comparisonRef });
    } else if (key === "decision") {
      const decision = validateDecisionV1(value[key]);
      if (decision.status !== "ok" || decision.output === null) return decision as unknown as RunValidation<ValidSourceRegistry>;
      refs.push({ kind: "decision", ref: decision.output.decisionRef });
    } else if (key === "structuredExplanation") {
      const explanation = validateStructuredExplanationV1(value[key]);
      if (explanation.status !== "ok" || explanation.output === null) return explanation as unknown as RunValidation<ValidSourceRegistry>;
      refs.push({ kind: "structured-explanation", ref: explanation.output.explanationRef });
    } else if (key === "artifacts") {
      if (!Array.isArray(value.artifacts)) {
        return failedRun(invalidRun("sourceBundle.artifacts", "Run source bundle artifacts must be an array."));
      }
      for (const artifactValue of value.artifacts) {
        const artifact = validateArtifactV1(artifactValue);
        if (artifact.status !== "ok" || artifact.output === null) return artifact as unknown as RunValidation<ValidSourceRegistry>;
        refs.push({ kind: "artifact", ref: artifact.output.artifactRef });
        artifacts.push(artifact.output);
      }
    }
  }

  const duplicate = firstDuplicate(refs.map(sourceKey));
  if (duplicate !== null) {
    return failedRun(invalidRun("sourceBundle", `Run source bundle contains duplicate source ref: ${duplicate}.`));
  }
  return validRun({ refs: new Set(refs.map(sourceKey)), artifacts });
}

function validateRunAgainstSourceRegistry(
  runInput: RunInputV1,
  runOutput: RunOutputV1,
  runRef: RunRef,
  registry: ValidSourceRegistry,
): CoreResult | null {
  for (const input of runInput.inputs) {
    if (input.inputRef.kind === "artifact") {
      return invalidRunInput("inputs", "Artifacts cannot be input sources.");
    }
    if (!registry.refs.has(sourceKey(input.inputRef))) {
      return missingRunSource(input.inputRef, `RunInput V1 source is absent from source bundle: ${sourceKey(input.inputRef)}.`);
    }
  }
  for (const [field, expectedKind] of OUTPUT_CATEGORIES) {
    for (const ref of runOutput[field]) {
      if (ref.kind !== expectedKind) {
        return invalidRunOutput(field, `RunOutput V1 ${field} contains a ${ref.kind} ref.`);
      }
      if (!registry.refs.has(sourceKey(ref))) {
        return missingRunSource(ref, `RunOutput V1 output ref is absent from source bundle: ${sourceKey(ref)}.`);
      }
    }
  }
  for (const artifact of registry.artifacts) {
    if (runOutput.artifactRefs.some((ref) => ref.ref === artifact.artifactRef)) {
      if (artifact.runRef?.id !== runRef.id) {
        return artifactRunRefMismatch(artifact.artifactRef);
      }
    }
  }
  return null;
}

function readinessMismatchesForRunSources(runInput: RunInputV1, registry?: ValidSourceRegistry): readonly RunMismatchV1[] {
  const mismatches: RunMismatchV1[] = [];
  for (const missing of missingInputSources(runInput)) {
    mismatches.push(createMismatch("missing_source", `runInput.inputs.${sourceKey(missing)}`, "snapshot-or-contentIdentity", null, "critical", [missing]));
  }
  if (registry !== undefined) {
    for (const input of runInput.inputs) {
      if (!registry.refs.has(sourceKey(input.inputRef))) {
        mismatches.push(createMismatch("missing_source", `sourceBundle.${sourceKey(input.inputRef)}`, sourceKey(input.inputRef), null, "critical", [input.inputRef]));
      }
    }
  }
  return sortMismatches(mismatches);
}

function readinessMismatchesForArtifacts(runRef: RunRef, artifactRefs: readonly SourceReference[], artifacts?: readonly ArtifactV1[]): readonly RunMismatchV1[] {
  const mismatches: RunMismatchV1[] = [];
  if (artifacts === undefined) {
    return artifactRefs.map((artifactRef) => createMismatch("missing_source", `runOutput.artifactRefs.${artifactRef.ref}`, artifactRef.ref, null, "critical", [artifactRef]));
  }
  for (const artifactRef of artifactRefs) {
    const artifact = artifacts.find((candidate) => candidate.artifactRef === artifactRef.ref);
    if (artifact === undefined) {
      mismatches.push(createMismatch("missing_source", `runOutput.artifactRefs.${artifactRef.ref}`, artifactRef.ref, null, "critical", [artifactRef]));
      continue;
    }
    if (artifact.runRef?.id !== runRef.id) {
      mismatches.push(createMismatch("artifact_run_ref_mismatch", `artifacts.${artifact.artifactRef}.runRef`, runRef.id, artifact.runRef?.id ?? null, "error", [artifactRef]));
    }
    if (artifact.status === "stale") {
      mismatches.push(createMismatch("artifact_stale", `artifacts.${artifact.artifactRef}.status`, "current-compatible", "stale", "warning", [artifactRef]));
    }
  }
  return sortMismatches(mismatches);
}

function compareInputIdentity(run: RunV1, actual: unknown): readonly RunMismatchV1[] {
  if (actual === undefined || actual === run.runInput.inputIdentity) return [];
  return [createMismatch("input_identity_mismatch", "runInput.inputIdentity", run.runInput.inputIdentity, actual, "error", [{ kind: "run-input", ref: run.runInput.inputIdentity }])];
}

function comparePackLock(expected: PackLockV1, actual: unknown): readonly RunMismatchV1[] {
  if (isRecord(actual)) {
    const fieldMismatches: RunMismatchV1[] = [];
    const actualPackRef = typeof actual.packRef === "string" ? actual.packRef : null;
    const actualPackVersion = typeof actual.packVersion === "string" ? actual.packVersion : null;
    const actualPackSchemaVersion = typeof actual.packSchemaVersion === "string" ? actual.packSchemaVersion : null;
    const actualContentIdentity = typeof actual.contentIdentity === "string" ? actual.contentIdentity : null;
    if (expected.packRef !== actualPackRef) {
      fieldMismatches.push(createMismatch("pack_ref_mismatch", "packLock.packRef", expected.packRef, actualPackRef, "error", expected.sourceRefs));
    }
    if (expected.packVersion !== actualPackVersion) {
      fieldMismatches.push(createMismatch("pack_version_mismatch", "packLock.packVersion", expected.packVersion, actualPackVersion, "error", expected.sourceRefs));
    }
    if (expected.packSchemaVersion !== actualPackSchemaVersion) {
      fieldMismatches.push(createMismatch("pack_schema_version_mismatch", "packLock.packSchemaVersion", expected.packSchemaVersion, actualPackSchemaVersion, "error", expected.sourceRefs));
    }
    if (expected.contentIdentity !== actualContentIdentity) {
      fieldMismatches.push(createMismatch("pack_content_identity_mismatch", "packLock.contentIdentity", expected.contentIdentity, actualContentIdentity, "error", expected.sourceRefs));
    }
    if (fieldMismatches.length > 0) {
      return sortMismatches(fieldMismatches);
    }
  }
  const validation = validatePackLockValue(actual);
  if (!validation.ok) {
    return [createMismatch("pack_ref_mismatch", "packLock", expected.packRef, null, "error", expected.sourceRefs)];
  }
  const mismatches: RunMismatchV1[] = [];
  if (expected.packRef !== validation.value.packRef) {
    mismatches.push(createMismatch("pack_ref_mismatch", "packLock.packRef", expected.packRef, validation.value.packRef, "error", expected.sourceRefs));
  }
  if (expected.packVersion !== validation.value.packVersion) {
    mismatches.push(createMismatch("pack_version_mismatch", "packLock.packVersion", expected.packVersion, validation.value.packVersion, "error", expected.sourceRefs));
  }
  if (expected.packSchemaVersion !== validation.value.packSchemaVersion) {
    mismatches.push(createMismatch("pack_schema_version_mismatch", "packLock.packSchemaVersion", expected.packSchemaVersion, validation.value.packSchemaVersion, "error", expected.sourceRefs));
  }
  if (expected.contentIdentity !== validation.value.contentIdentity) {
    mismatches.push(createMismatch("pack_content_identity_mismatch", "packLock.contentIdentity", expected.contentIdentity, validation.value.contentIdentity, "error", expected.sourceRefs));
  }
  return sortMismatches(mismatches);
}

function compareRules(run: RunV1, orderedRuleRefs: unknown, ruleSetRef: unknown): readonly RunMismatchV1[] {
  const mismatches: RunMismatchV1[] = [];
  if (orderedRuleRefs !== undefined && stableJson(run.orderedRuleRefs) !== stableJson(orderedRuleRefs)) {
    mismatches.push(createMismatch("rule_refs_mismatch", "orderedRuleRefs", run.orderedRuleRefs, orderedRuleRefs, "error", [{ kind: "rule-set", ref: run.ruleSetRef ?? "none" }]));
  }
  if (ruleSetRef !== undefined && run.ruleSetRef !== ruleSetRef) {
    mismatches.push(createMismatch("rule_set_ref_mismatch", "ruleSetRef", run.ruleSetRef, ruleSetRef, "error", [{ kind: "rule-set", ref: run.ruleSetRef ?? "none" }]));
  }
  return sortMismatches(mismatches);
}

function compareOperationContext(expected: OperationContextV1, actual: unknown): readonly RunMismatchV1[] {
  const validation = validateOperationContextValue(actual);
  if (!validation.ok) {
    return [createMismatch("core_version_mismatch", "operationContext", expected.contextRef, null, "error", expected.sourceRefs)];
  }
  const actualContext = validation.value;
  const checks: readonly [RunMismatchKindV1, string, unknown, unknown][] = [
    ["core_version_mismatch", "coreVersion", expected.coreVersion, actualContext.coreVersion],
    ["operation_mismatch", "operation", expected.operation, actualContext.operation],
    ["operation_version_mismatch", "operationVersion", expected.operationVersion, actualContext.operationVersion],
    ["geometry_model_version_mismatch", "geometryModelVersion", expected.geometryModelVersion, actualContext.geometryModelVersion],
    ["coordinate_policy_mismatch", "coordinatePolicy", expected.coordinatePolicy, actualContext.coordinatePolicy],
    ["metric_policy_mismatch", "metricPolicy", expected.metricPolicy, actualContext.metricPolicy],
    ["tolerance_policy_mismatch", "tolerancePolicy", expected.tolerancePolicy, actualContext.tolerancePolicy],
    ["rounding_policy_mismatch", "roundingPolicy", expected.roundingPolicy, actualContext.roundingPolicy],
    ["numeric_policy_mismatch", "numericPolicy", expected.numericPolicy, actualContext.numericPolicy],
    ["ordering_policy_mismatch", "orderingPolicy", expected.orderingPolicy, actualContext.orderingPolicy],
    ["feature_flags_mismatch", "featureFlags", expected.featureFlags, actualContext.featureFlags],
  ];
  return sortMismatches(checks
    .filter(([, , expectedValue, actualValue]) => stableJson(expectedValue) !== stableJson(actualValue))
    .map(([kind, path, expectedValue, actualValue]) => createMismatch(kind, `operationContext.${path}`, expectedValue, actualValue, "error", expected.sourceRefs)));
}

function compareSources(runInput: RunInputV1, sourceRefs: unknown): readonly RunMismatchV1[] {
  if (sourceRefs === undefined) {
    return readinessMismatchesForRunSources(runInput);
  }
  const validation = validateSourceRefs(sourceRefs, "sourceRefs");
  if (!validation.ok) {
    return missingInputSources(runInput).map((ref) => createMismatch("missing_source", `sourceRefs.${sourceKey(ref)}`, sourceKey(ref), null, "critical", [ref]));
  }
  const available = new Set(validation.value.map(sourceKey));
  return sortMismatches(runInput.inputs
    .filter((input) => !available.has(sourceKey(input.inputRef)))
    .map((input) => createMismatch("missing_source", `sourceRefs.${sourceKey(input.inputRef)}`, sourceKey(input.inputRef), null, "critical", [input.inputRef])));
}

function compareArtifacts(runRef: RunRef, artifactRefs: readonly SourceReference[], artifacts: unknown): readonly RunMismatchV1[] {
  if (artifacts === undefined) {
    return readinessMismatchesForArtifacts(runRef, artifactRefs, undefined);
  }
  if (!Array.isArray(artifacts)) {
    return artifactRefs.map((ref) => createMismatch("missing_source", `artifacts.${ref.ref}`, ref.ref, null, "critical", [ref]));
  }
  const mismatches: RunMismatchV1[] = [];
  const artifactRecords = new Map<string, Record<string, unknown>>();
  for (const artifact of artifacts) {
    if (isRecord(artifact) && typeof artifact.artifactRef === "string") {
      artifactRecords.set(artifact.artifactRef, artifact);
    }
  }
  for (const artifactRef of artifactRefs) {
    const artifact = artifactRecords.get(artifactRef.ref);
    if (artifact === undefined) {
      mismatches.push(createMismatch("missing_source", `artifacts.${artifactRef.ref}`, artifactRef.ref, null, "critical", [artifactRef]));
      continue;
    }
    const artifactRunRef = isRecord(artifact.runRef) && typeof artifact.runRef.id === "string" ? artifact.runRef.id : null;
    if (artifactRunRef !== runRef.id) {
      mismatches.push(createMismatch("artifact_run_ref_mismatch", `artifacts.${artifactRef.ref}.runRef`, runRef.id, artifactRunRef, "error", [artifactRef]));
    }
    if (artifact.status === "stale") {
      mismatches.push(createMismatch("artifact_stale", `artifacts.${artifactRef.ref}.status`, "current-compatible", "stale", "warning", [artifactRef]));
    }
  }
  if (mismatches.length > 0) {
    return sortMismatches(mismatches);
  }
  const validArtifacts: ArtifactV1[] = [];
  for (const value of artifacts) {
    const validation = validateArtifactV1(value);
    if (validation.status === "ok" && validation.output !== null) {
      validArtifacts.push(validation.output);
    }
  }
  return readinessMismatchesForArtifacts(runRef, artifactRefs, validArtifacts);
}

function replayReadinessFromMismatches(mismatches: readonly RunMismatchV1[]): RunReplayReadinessV1 {
  const sorted = sortMismatches(mismatches);
  const missingSources = uniqueSourceRefs(sorted.filter((mismatch) => mismatch.mismatchKind === "missing_source").flatMap((mismatch) => mismatch.sourceRefs));
  const staleArtifactRefs = uniqueSourceRefs(sorted.filter((mismatch) => mismatch.mismatchKind === "artifact_stale").flatMap((mismatch) => mismatch.sourceRefs));
  const status = readinessStatusFor(sorted);
  return {
    kind: "run-replay-readiness",
    status,
    mismatches: sorted,
    missingSources,
    staleArtifactRefs,
  };
}

function readinessStatusFor(mismatches: readonly RunMismatchV1[]): ReplayReadinessStatusV1 {
  if (mismatches.some((mismatch) => mismatch.mismatchKind !== "missing_source" && mismatch.mismatchKind !== "artifact_stale" && mismatch.blocksReplay)) {
    return "incompatible";
  }
  if (mismatches.some((mismatch) => mismatch.mismatchKind === "artifact_stale")) {
    return "stale";
  }
  if (mismatches.some((mismatch) => mismatch.mismatchKind === "missing_source")) {
    return "non_replayable";
  }
  return "replay_ready";
}

function validateReplayReadinessReportValue(value: unknown): RunValidation<ReplayReadinessReportV1> {
  if (!isRecord(value) || firstUnsupportedKey(value, REPORT_ALLOWED_KEYS) !== null || value.kind !== "replay-readiness-report" || value.schemaVersion !== REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION) {
    return failedRun(invalidReplayReadinessReport("report", "ReplayReadinessReport V1 must be a closed replay-readiness-report-v1 object."));
  }
  const runRef = validateRunRef(value.runRef, "runRef");
  if (!runRef.ok) return runRef;
  const status = isReplayReadinessStatus(value.status) ? value.status : null;
  if (status === null) {
    return failedRun(invalidReplayReadinessReport("status", "ReplayReadinessReport V1 status is invalid."));
  }
  const mismatches = validateMismatches(value.mismatches);
  if (!mismatches.ok) return mismatches;
  const missingSources = validateSourceRefs(value.missingSources, "missingSources");
  if (!missingSources.ok) return missingSources;
  const staleArtifactRefs = validateSourceRefs(value.staleArtifactRefs, "staleArtifactRefs");
  if (!staleArtifactRefs.ok) return staleArtifactRefs;
  const warnings = validateDiagnosticsArray(value.warnings, "warnings", "warning");
  if (!warnings.ok) return warnings;
  const provenance = validateProvenanceValue(value.provenance, "provenance");
  if (!provenance.ok || provenance.value === null) {
    return failedRun(invalidReplayReadinessReport("provenance", "ReplayReadinessReport V1 requires provenance."));
  }
  const expectedStatus = readinessStatusFor(mismatches.value);
  if (status !== expectedStatus) {
    return failedRun(invalidReplayReadinessReport("status", "ReplayReadinessReport V1 status must match mismatch precedence."));
  }
  const expectedRef = reportRefFor(runRef.value, {
    kind: "run-replay-readiness",
    status,
    mismatches: mismatches.value,
    missingSources: missingSources.value,
    staleArtifactRefs: staleArtifactRefs.value,
  });
  if (value.reportRef !== expectedRef) {
    return failedRun(invalidReplayReadinessReport("reportRef", "ReplayReadinessReport V1 reportRef is not deterministic."));
  }
  return validRun({
    kind: "replay-readiness-report",
    schemaVersion: REPLAY_READINESS_REPORT_V1_SCHEMA_VERSION,
    reportRef: expectedRef,
    runRef: runRef.value,
    status,
    mismatches: mismatches.value,
    missingSources: missingSources.value,
    staleArtifactRefs: staleArtifactRefs.value,
    warnings: warnings.value as readonly CoreWarning[],
    provenance: provenance.value,
  });
}

function validateMismatches(value: unknown): RunValidation<readonly RunMismatchV1[]> {
  if (!Array.isArray(value)) {
    return failedRun(invalidReplayReadinessReport("mismatches", "Run mismatches must be an array."));
  }
  const mismatches: RunMismatchV1[] = [];
  for (const item of value) {
    if (!isRecord(item) || firstUnsupportedKey(item, MISMATCH_ALLOWED_KEYS) !== null || item.kind !== "run-mismatch" || !isMismatchKind(item.mismatchKind) || nonEmptyString(item.path) === null || !isMismatchSeverity(item.severity) || typeof item.blocksReplay !== "boolean" || nonEmptyString(item.deterministicOrdering) === null) {
      return failedRun(invalidReplayReadinessReport("mismatches", "RunMismatch V1 must be a closed structured mismatch."));
    }
    const sourceRefs = validateSourceRefs(item.sourceRefs, "sourceRefs");
    if (!sourceRefs.ok) return sourceRefs;
    if (!jsonSafe(item.expected) || !jsonSafe(item.actual)) {
      return failedRun(invalidReplayReadinessReport("mismatches", "RunMismatch V1 expected and actual values must be JSON-safe."));
    }
    const mismatch = createMismatch(item.mismatchKind, item.path as string, item.expected, item.actual, item.severity, sourceRefs.value);
    if (mismatch.mismatchRef !== item.mismatchRef || mismatch.blocksReplay !== item.blocksReplay) {
      return failedRun(invalidReplayReadinessReport("mismatchRef", "RunMismatch V1 ref or blocking flag is not deterministic."));
    }
    mismatches.push(mismatch);
  }
  return validRun(sortMismatches(mismatches));
}

function createMismatch(
  mismatchKind: RunMismatchKindV1,
  path: string,
  expected: unknown,
  actual: unknown,
  severity: RunMismatchSeverityV1,
  sourceRefs: readonly SourceReference[],
): RunMismatchV1 {
  const blocksReplay = true;
  const seed = {
    mismatchKind,
    path,
    expected,
    actual,
    sourceRefs: sortSourceRefs(sourceRefs),
  };
  return {
    kind: "run-mismatch",
    mismatchRef: `run-mismatch:v1:${stableDigest(seed)}`,
    mismatchKind,
    path,
    expected: deepCloneJson(expected),
    actual: deepCloneJson(actual),
    severity,
    blocksReplay,
    sourceRefs: sortSourceRefs(sourceRefs),
    deterministicOrdering: "precedence-kind-path",
  };
}

function reportRefFor(runRef: RunRef, readiness: RunReplayReadinessV1): string {
  return `replay-readiness-report:v1:${stableDigest({
    runRef,
    status: readiness.status,
    mismatches: readiness.mismatches,
    missingSources: readiness.missingSources,
    staleArtifactRefs: readiness.staleArtifactRefs,
  })}`;
}

function missingInputSources(runInput: RunInputV1): readonly SourceReference[] {
  return runInput.inputs
    .filter((input) => !("snapshot" in input) && !("contentIdentity" in input))
    .map((input) => input.inputRef);
}

function warningsForReadiness(readiness: RunReplayReadinessV1): readonly CoreWarning[] {
  const warnings: CoreWarning[] = [];
  if (readiness.status === "non_replayable") {
    warnings.push(createCoreWarning({
      code: "RunNonReplayable",
      severity: "warning",
      message: "Run is inspectable but lacks at least one replay-ready source snapshot or content identity.",
      targetRef: readiness.missingSources.map(sourceKey).join(","),
      sourceRef: RUN_SOURCE_REFERENCE,
    }));
  }
  if (readiness.status === "stale") {
    warnings.push(createCoreWarning({
      code: "ArtifactStale",
      severity: "warning",
      message: "Run contains stale artifact evidence; replay readiness is stale.",
      targetRef: readiness.staleArtifactRefs.map(sourceKey).join(","),
      sourceRef: RUN_SOURCE_REFERENCE,
    }));
  }
  return warnings;
}

function errorsForReadiness(readiness: RunReplayReadinessV1): readonly CoreError[] {
  if (readiness.status !== "incompatible") {
    return [];
  }
  return [createCoreError({
    code: "IncompatibleRunDependencies",
    message: "Run has at least one deterministic dependency mismatch that blocks replay readiness.",
    targetRef: readiness.mismatches.map((mismatch) => mismatch.mismatchRef).join(","),
    sourceRef: RUN_SOURCE_REFERENCE,
  })];
}

function validateExecutionStatusInvariant(
  status: RunExecutionStatusV1,
  outputRefs: readonly SourceReference[],
  warnings: readonly CoreWarning[],
  errors: readonly CoreError[],
): CoreResult | null {
  if (status === "success") {
    if (outputRefs.length === 0) {
      return invalidRunOutput("executionStatus", "Successful RunOutput V1 requires at least one output ref.");
    }
    if (errors.some((error) => error.blocking)) {
      return invalidRunOutput("executionStatus", "Successful RunOutput V1 cannot include blocking errors.");
    }
  }
  if (status === "partial" && (outputRefs.length === 0 || warnings.length + errors.length === 0)) {
    return invalidRunOutput("executionStatus", "Partial RunOutput V1 requires some output and a warning or non-fatal error reason.");
  }
  if (status === "failed" && (outputRefs.length > 0 || errors.length === 0)) {
    return invalidRunOutput("executionStatus", "Failed RunOutput V1 requires no reliable output refs and at least one blocking error.");
  }
  return null;
}

function outputRefsForRunOutput(output: Pick<RunOutputV1, typeof OUTPUT_CATEGORIES[number][0]>): readonly SourceReference[] {
  return OUTPUT_CATEGORIES.flatMap(([field]) => output[field]);
}

function validateOutputCategoryRefs(value: unknown, field: string, expectedKind: string): RunValidation<readonly SourceReference[]> {
  if (!Array.isArray(value)) {
    return failedRun(invalidRunOutput(field, `RunOutput V1 ${field} must be an array.`));
  }
  const refs: SourceReference[] = [];
  for (const item of value) {
    const ref = validateSourceReference(item, field);
    if (!ref.ok) {
      return failedRun(invalidRunOutput(field, `RunOutput V1 ${field} contains a malformed SourceReference.`));
    }
    refs.push(ref.value);
  }
  const duplicate = firstDuplicate(refs.map(sourceKey));
  if (duplicate !== null) {
    return failedRun(invalidRunOutput(field, `RunOutput V1 ${field} contains duplicate ref: ${duplicate}.`));
  }
  const wrongKind = refs.find((ref) => ref.kind !== expectedKind);
  if (wrongKind !== undefined) {
    return failedRun(invalidRunOutput(field, `RunOutput V1 ${field} must contain ${expectedKind} refs only.`));
  }
  return validRun(sortSourceRefs(refs));
}

function validateDiagnosticsArray(value: unknown, field: string, mode: "warning" | "error"): RunValidation<readonly CoreWarning[] | readonly CoreError[]> {
  if (!Array.isArray(value)) {
    return failedRun(invalidRun(field, `Run V1 ${field} must be an array.`));
  }
  const diagnostics: (CoreWarning | CoreError)[] = [];
  for (const diagnostic of value) {
    if (!isRecord(diagnostic) || firstUnsupportedKey(diagnostic, DIAGNOSTIC_ALLOWED_KEYS) !== null || !isDiagnosticCode(diagnostic.code) || typeof diagnostic.message !== "string" || typeof diagnostic.blocking !== "boolean") {
      return failedRun(invalidRun(field, `Run V1 ${field} contain malformed diagnostics.`));
    }
    if (mode === "error" && (diagnostic.severity !== "error" && diagnostic.severity !== "fatal")) {
      return failedRun(invalidRun(field, "Run V1 errors must use error or fatal severity."));
    }
    if (mode === "error" && diagnostic.blocking !== true) {
      return failedRun(invalidRun(field, "Run V1 errors must be blocking."));
    }
    if (mode === "warning" && (diagnostic.severity === "error" || diagnostic.severity === "fatal")) {
      return failedRun(invalidRun(field, "Run V1 warnings cannot use error or fatal severity."));
    }
    const source = validateSourceReference(diagnostic.source, "source");
    if (!source.ok) return source;
    const provenance = validateProvenanceValue(diagnostic.provenance, "provenance");
    if (!provenance.ok) return provenance;
    diagnostics.push({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
      targetRef: typeof diagnostic.targetRef === "string" ? diagnostic.targetRef : null,
      source: source.value,
      blocking: diagnostic.blocking,
      provenance: provenance.value,
    } as CoreWarning | CoreError);
  }
  return validRun(sortDiagnostics(diagnostics) as readonly CoreWarning[] | readonly CoreError[]);
}

function validateProvenanceValue(value: unknown, field: string): RunValidation<Provenance | null> {
  if (value === undefined || value === null) {
    return validRun(null);
  }
  if (!isRecord(value) || firstUnsupportedKey(value, PROVENANCE_ALLOWED_KEYS) !== null || nonEmptyString(value.operationName) === null || nonEmptyString(value.operationVersion) === null) {
    return failedRun(invalidRun(field, "Provenance must be closed and structured."));
  }
  const inputRefs = validateSourceRefs(value.inputRefs, `${field}.inputRefs`);
  if (!inputRefs.ok) return inputRefs;
  const source = validateSourceReference(value.source, `${field}.source`);
  if (!source.ok) return source;
  return validRun({
    operationName: value.operationName as string,
    operationVersion: value.operationVersion as string,
    inputRefs: inputRefs.value,
    source: source.value,
  });
}

function validateSourceRefs(value: unknown, field: string): RunValidation<readonly SourceReference[]> {
  if (!Array.isArray(value)) {
    return failedRun(invalidRun(field, `${field} must be an array of SourceReference objects.`));
  }
  const refs: SourceReference[] = [];
  for (const item of value) {
    const ref = validateSourceReference(item, field);
    if (!ref.ok) return ref;
    refs.push(ref.value);
  }
  const duplicate = firstDuplicate(refs.map(sourceKey));
  if (duplicate !== null) {
    return failedRun(invalidRun(field, `${field} contains duplicate SourceReference: ${duplicate}.`));
  }
  return validRun(sortSourceRefs(refs));
}

function validateSourceReference(value: unknown, field: string): RunValidation<SourceReference> {
  if (!isRecord(value) || firstUnsupportedKey(value, SOURCE_REFERENCE_ALLOWED_KEYS) !== null) {
    return failedRun(invalidRun(field, "SourceReference must be a closed object."));
  }
  const kind = nonEmptyString(value.kind);
  const ref = nonEmptyString(value.ref);
  if (kind === null || ref === null) {
    return failedRun(invalidRun(field, "SourceReference kind and ref must be non-empty strings."));
  }
  return validRun({ kind, ref });
}

function validateRunRef(value: unknown, field: string): RunValidation<RunRef> {
  if (!isRecord(value) || firstUnsupportedKey(value, ["id"] as const) !== null || nonEmptyString(value.id) === null) {
    return failedRun(invalidRun(field, "RunRef must contain a non-empty id."));
  }
  return validRun({ id: value.id as string });
}

function createRunProvenance(operationName: string, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: "0.1.0",
    inputRefs: sortSourceRefs(inputRefs),
    source: RUN_SOURCE_REFERENCE,
  };
}

function invalidPackLock(targetRef: string, message: string): CoreResult {
  return runFailure("InvalidPackLockV1", targetRef, message);
}

function invalidOperationContext(targetRef: string, message: string): CoreResult {
  return runFailure("InvalidOperationContextV1", targetRef, message);
}

function invalidRunInput(targetRef: string, message: string): CoreResult {
  return runFailure("InvalidRunInputV1", targetRef, message);
}

function invalidRunOutput(targetRef: string, message: string): CoreResult {
  return runFailure("InvalidRunOutputV1", targetRef, message);
}

function invalidRun(targetRef: string, message: string): CoreResult {
  return runFailure("InvalidRunV1", targetRef, message);
}

function missingRunSource(sourceRef: SourceReference, message: string): CoreResult {
  return runFailure("MissingRunSource", sourceKey(sourceRef), message, sourceRef);
}

function artifactRunRefMismatch(artifactRef: string): CoreResult {
  return runFailure("ArtifactRunRefMismatch", artifactRef, "Artifact runRef does not match RunV1 runRef.");
}

function invalidReplayReadinessReport(targetRef: string, message: string): CoreResult {
  return runFailure("InvalidReplayReadinessReportV1", targetRef, message);
}

function runFailure(code: DiagnosticCode, targetRef: string, message: string, sourceRef: SourceReference = RUN_SOURCE_REFERENCE): CoreResult {
  return runResult({
    status: "failed",
    errors: [
      createCoreError({
        code,
        message,
        targetRef,
        sourceRef,
      }),
    ],
  });
}

function runResult<TOutput>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  return {
    ...DEFAULT_RESULT_FIELDS,
    ...input,
    warnings: [...(input.warnings ?? [])],
    errors: [...(input.errors ?? [])],
    outputRefs: [...(input.outputRefs ?? [])],
    output: input.output ?? null,
    provenance: input.provenance ?? null,
    runRef: input.runRef ?? null,
    packLockRef: input.packLockRef ?? null,
    operationContextRef: input.operationContextRef ?? null,
  };
}

function failedRun(result: CoreResult): RunValidation<never> {
  return { ok: false, result };
}

function validRun<TValue>(value: TValue): RunValidation<TValue> {
  return { ok: true, value };
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function runExecutionStatus(value: unknown): RunExecutionStatusV1 | null {
  return typeof value === "string" && RUN_EXECUTION_STATUSES_V1.includes(value as RunExecutionStatusV1)
    ? value as RunExecutionStatusV1
    : null;
}

function isReplayReadinessStatus(value: unknown): value is ReplayReadinessStatusV1 {
  return typeof value === "string" && REPLAY_READINESS_V1_STATUSES.includes(value as ReplayReadinessStatusV1);
}

function isMismatchKind(value: unknown): value is RunMismatchKindV1 {
  return typeof value === "string" && RUN_MISMATCH_KINDS_V1.includes(value as RunMismatchKindV1);
}

function isMismatchSeverity(value: unknown): value is RunMismatchSeverityV1 {
  return value === "warning" || value === "error" || value === "critical";
}

function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  return typeof value === "string" && CORE_DIAGNOSTIC_CODES.includes(value as DiagnosticCode);
}

function validateStringArray(value: unknown, field: string, options: { allowEmpty: boolean; preserveOrder: boolean }): RunValidation<readonly string[]> {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0) || !value.every((item) => nonEmptyString(item) !== null)) {
    return failedRun(invalidRun(field, `${field} must be an array of non-empty strings.`));
  }
  const strings = value as string[];
  return validRun(options.preserveOrder ? [...strings] : [...strings].sort());
}

function sortSourceRefs(refs: readonly SourceReference[]): readonly SourceReference[] {
  return [...refs].sort((first, second) => sourceKey(first).localeCompare(sourceKey(second)));
}

function uniqueSourceRefs(refs: readonly SourceReference[]): readonly SourceReference[] {
  const byKey = new Map<string, SourceReference>();
  for (const ref of refs) {
    byKey.set(sourceKey(ref), { kind: ref.kind, ref: ref.ref });
  }
  return sortSourceRefs([...byKey.values()]);
}

function sourceKey(ref: SourceReference): string {
  return `${ref.kind}:${ref.ref}`;
}

function sortDiagnostics<TDiagnostic extends CoreWarning | CoreError>(diagnostics: readonly TDiagnostic[]): readonly TDiagnostic[] {
  return [...diagnostics].sort((first, second) => [
    first.code,
    first.targetRef ?? "",
    sourceKey(first.source),
    first.message,
  ].join("|").localeCompare([
    second.code,
    second.targetRef ?? "",
    sourceKey(second.source),
    second.message,
  ].join("|")));
}

function sortMismatches(mismatches: readonly RunMismatchV1[]): readonly RunMismatchV1[] {
  const precedence = (mismatch: RunMismatchV1): number => {
    if (mismatch.mismatchKind !== "missing_source" && mismatch.mismatchKind !== "artifact_stale") return 0;
    if (mismatch.mismatchKind === "artifact_stale") return 1;
    return 2;
  };
  return [...mismatches].sort((first, second) => {
    const precedenceDelta = precedence(first) - precedence(second);
    if (precedenceDelta !== 0) return precedenceDelta;
    return [
      first.mismatchKind,
      first.path,
      first.mismatchRef,
    ].join("|").localeCompare([
      second.mismatchKind,
      second.path,
      second.mismatchRef,
    ].join("|"));
  });
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isFeatureFlagValue(value: unknown): value is FeatureFlagValueV1 {
  return value === null || typeof value === "boolean" || typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function normalizeJsonScalar(value: FeatureFlagValueV1): FeatureFlagValueV1 {
  return typeof value === "number" && Object.is(value, -0) ? 0 : value;
}

function firstDuplicate(values: readonly unknown[]): string | null {
  const seen = new Set<unknown>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

function firstUnsupportedKey<TAllowed extends string>(value: Record<string, unknown>, allowedKeys: readonly TAllowed[]): string | null {
  const allowed = new Set<string>(allowedKeys);
  return Object.keys(value).find((key) => !allowed.has(key)) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNormalizedRect(value: Record<string, unknown>): boolean {
  return value.kind === "rect"
    && isNonNegativeFiniteNumber(value.x)
    && isNonNegativeFiniteNumber(value.y)
    && isNonNegativeFiniteNumber(value.width)
    && isNonNegativeFiniteNumber(value.height)
    && (value.x as number) + (value.width as number) <= 1
    && (value.y as number) + (value.height as number) <= 1;
}

function artifactWouldBecomeSource(value: unknown, seen = new WeakSet<object>()): boolean {
  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    const found = value.some((item) => artifactWouldBecomeSource(item, seen));
    seen.delete(value);
    return found;
  }
  if (!isRecord(value)) return false;
  if (value.kind === "artifact") return true;
  if (seen.has(value)) return false;
  seen.add(value);
  const found = Object.values(value).some((child) => artifactWouldBecomeSource(child, seen));
  seen.delete(value);
  return found;
}

function hasExecutableTerm(value: string): boolean {
  const lower = value.toLowerCase();
  return EXECUTABLE_FIELD_NAMES.some((term) => lower.includes(term.toLowerCase()));
}

function jsonSafe(value: unknown): boolean {
  return cloneJsonSafe(value).ok;
}

function cloneJsonSafe(value: unknown, seen = new WeakSet<object>()): RunValidation<unknown> {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return validRun(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? validRun(Object.is(value, -0) ? 0 : value) : failedRun(invalidRun("json", "JSON-safe values must contain finite numbers only."));
  }
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol" || value === undefined) {
    return failedRun(invalidRun("json", "JSON-safe values cannot contain functions, symbols, BigInt, or undefined."));
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return failedRun(invalidRun("json", "JSON-safe values cannot contain cycles."));
    seen.add(value);
    const items: unknown[] = [];
    for (const item of value) {
      const cloned = cloneJsonSafe(item, seen);
      if (!cloned.ok) return cloned;
      items.push(cloned.value);
    }
    seen.delete(value);
    return validRun(items);
  }
  if (!isPlainObject(value)) {
    return failedRun(invalidRun("json", "JSON-safe values must use plain structured objects."));
  }
  if (seen.has(value)) return failedRun(invalidRun("json", "JSON-safe values cannot contain cycles."));
  seen.add(value);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    if (hasExecutableTerm(key)) {
      return failedRun(invalidRun("json", "JSON-safe values cannot contain executable fields."));
    }
    const cloned = cloneJsonSafe(value[key], seen);
    if (!cloned.ok) return cloned;
    out[key] = cloned.value;
  }
  seen.delete(value);
  return validRun(out);
}

function deepCloneJson(value: unknown): unknown {
  const cloned = cloneJsonSafe(value);
  if (!cloned.ok) {
    return null;
  }
  return cloned.value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function stableValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Cannot canonicalize non-finite number.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (child !== undefined) {
        out[key] = stableValue(child);
      }
    }
    return out;
  }
  return value;
}

function stableDigest(value: unknown): string {
  const text = stableJson(value);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}
