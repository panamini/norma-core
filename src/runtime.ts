import type {
  CoordinateSystem,
  CoreError,
  CoreResult,
  CoreWarning,
  DiagnosticCode,
  DiagnosticSeverity,
  MetricPolicy,
  NumericPolicy,
  OperationContext,
  OperationContextRef,
  OperationName,
  OperationStatus,
  OperationVersion,
  OrderingPolicy,
  OutputRefs,
  PackLock,
  PackLockRef,
  Provenance,
  ReplayReadinessStatus,
  RoundingPolicy,
  Run,
  RunInput,
  RunOutput,
  RunRef,
  RuntimePolicy,
  SourceReference,
  TolerancePolicy,
} from "./index.js";
import {
  CORE_VERSION,
  NORMA_CANONICAL_COORDINATE_SYSTEM,
} from "./core-constants.js";
import type { Artifact } from "./artifacts.js";
import type { RatioPack } from "./ratio-pack.js";
import { validateRatioPackV1 } from "./ratio-pack.js";

export const REPLAY_READINESS_STATUSES = [
  "ready",
  "ready_with_warnings",
  "mismatch",
  "non_replayable",
] as const satisfies readonly ReplayReadinessStatus[];

export const PR11_RUNTIME_OPERATION_VERSION = "0.1.0" as const;
export const DEFAULT_GEOMETRY_MODEL_VERSION = "geometry-v1" as const;

export interface CreatePackLockInput {
  pack?: unknown;
  sourceRefs?: readonly SourceReference[];
}

export interface CreateOperationContextInput {
  operationName?: OperationName;
  operationVersion?: OperationVersion;
  geometryModelVersion?: string;
  coordinatePolicy?: CoordinateSystem | RuntimePolicy<CoordinateSystem> | null;
  metricPolicy?: MetricPolicy | RuntimePolicy<MetricPolicy | null> | null;
  tolerancePolicy?: TolerancePolicy | RuntimePolicy<TolerancePolicy> | null;
  roundingPolicy?: RoundingPolicy | RuntimePolicy<RoundingPolicy> | null;
  numericPolicy?: NumericPolicy | RuntimePolicy<NumericPolicy> | null;
  orderingPolicy?: OrderingPolicy | RuntimePolicy<OrderingPolicy> | null;
  featureFlags?: Readonly<Record<string, boolean>>;
  sourceRefs?: readonly SourceReference[];
}

export interface CreateRunInputInput {
  inputRefs?: readonly SourceReference[];
  sourceRefs?: readonly SourceReference[];
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
  requestedOutputRefs?: readonly SourceReference[] | OutputRefs;
  operationContext?: OperationContext | null;
  featureFlags?: Readonly<Record<string, boolean>>;
}

export interface CreateRunOutputInput {
  runRef?: RunRef | null;
  result?: CoreResult | null;
  outputRefs?: readonly SourceReference[] | OutputRefs;
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
}

export interface CreateRunInput {
  operationName?: OperationName;
  operationVersion?: OperationVersion;
  packLock?: PackLock | null;
  packLockRef?: PackLockRef | null;
  operationContext?: OperationContext | null;
  operationContextRef?: OperationContextRef | null;
  input?: RunInput | null;
  inputRefs?: readonly SourceReference[];
  sourceRefs?: readonly SourceReference[];
  output?: RunOutput | null;
  result?: CoreResult | null;
  outputRefs?: readonly SourceReference[] | OutputRefs;
  requestedOutputRefs?: readonly SourceReference[] | OutputRefs;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  metadata?: Run["metadata"];
}

export interface RunContextComparisonInput {
  expectedPackLock?: PackLock | PackLockRef | null;
  actualPackLock?: PackLock | PackLockRef | null;
  expectedOperationContext?: OperationContext | OperationContextRef | null;
  actualOperationContext?: OperationContext | OperationContextRef | null;
  expectedFeatureFlags?: Readonly<Record<string, boolean>>;
  actualFeatureFlags?: Readonly<Record<string, boolean>>;
  artifact?: Artifact | null;
  expectedSourceRefs?: readonly SourceReference[];
  actualSourceRefs?: readonly SourceReference[];
}

export interface RunContextComparison {
  kind: "run-context-comparison";
  status: "match" | "mismatch";
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  mismatchCodes: readonly DiagnosticCode[];
}

export interface ValidateRunReadinessInput {
  run?: Run | null;
  packLock?: PackLock | null;
  operationContext?: OperationContext | null;
  comparison?: RunContextComparison | null;
  artifact?: Artifact | null;
}

interface RuntimeResultInput<TOutput> {
  status: OperationStatus;
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
  outputRefs?: readonly SourceReference[];
  runRef?: RunRef | null;
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
  output?: TOutput | null;
}

interface RuntimeDiagnosticInput {
  code: DiagnosticCode;
  severity?: DiagnosticSeverity;
  message: string;
  targetRef?: string | null;
  sourceRef?: SourceReference;
  provenance?: Provenance | null;
  blocking?: boolean;
}

const RUNTIME_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/runtime-readiness-v1",
});

const CREATE_PACK_LOCK_OPERATION = "core.runtime-v1.pack-lock.create";
const CREATE_OPERATION_CONTEXT_OPERATION = "core.runtime-v1.operation-context.create";
const CREATE_RUN_INPUT_OPERATION = "core.runtime-v1.run-input.create";
const CREATE_RUN_OUTPUT_OPERATION = "core.runtime-v1.run-output.create";
const CREATE_RUN_OPERATION = "core.runtime-v1.run.create";
const VALIDATE_READINESS_OPERATION = "core.runtime-v1.readiness.validate";
const COMPARE_CONTEXT_OPERATION = "core.runtime-v1.context.compare";

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

const OUTPUT_REF_KIND_RANK = new Map<string, number>([
  ["construction", 0],
  ["measurement-set", 1],
  ["measurement", 1],
  ["evaluation", 2],
  ["comparison", 3],
  ["decision", 4],
  ["artifact", 5],
  ["artifacts", 5],
]);

const DEFAULT_ROUNDING_POLICY: RoundingPolicy = Object.freeze({
  kind: "rounding-policy",
  id: "runtime.rounding.none",
  mode: "none",
  precision: null,
});

const DEFAULT_NUMERIC_POLICY: NumericPolicy = Object.freeze({
  kind: "numeric-policy",
  id: "runtime.numeric.finite-number",
  precision: "number",
  finiteOnly: true,
});

const DEFAULT_ORDERING_POLICY: OrderingPolicy = Object.freeze({
  kind: "ordering-policy",
  id: "runtime.ordering.output-refs-v1",
  outputRefs: "kind-rank-then-ref",
  featureFlags: "key-ascending",
});

const DEFAULT_TOLERANCE_POLICY: TolerancePolicy = Object.freeze({
  kind: "tolerance-policy",
  id: "runtime.tolerance.exact-coordinate",
  coordinateTolerance: 0,
  metricTolerance: 0,
});

export function createPackLock(input: CreatePackLockInput | RatioPack | null | undefined): CoreResult<PackLock> {
  const packInput = isRecord(input) && "pack" in input ? input.pack : input;
  const packResult = validateRatioPackV1(packInput);
  if (packResult.status !== "ok" || packResult.output === null) {
    return resultAs<PackLock>(packResult);
  }

  const pack = packResult.output;
  const sourceRefs = inputSourceRefs(input, pack);
  const packRef = ratioPackRef(pack);
  const lockId = `pack-lock:${packRef}:${pack.contentIdentity}`;
  const provenance = createRuntimeProvenance(CREATE_PACK_LOCK_OPERATION, [
    { kind: "ratio-pack", ref: packRef },
    { kind: "pack-content-identity", ref: pack.contentIdentity },
    ...sourceRefs,
  ]);
  const packLock: PackLock = {
    kind: "pack-lock",
    id: lockId,
    ref: { id: lockId },
    coreVersion: CORE_VERSION,
    packId: pack.id,
    packVersion: pack.version,
    packSchemaVersion: pack.schemaVersion,
    contentIdentity: pack.contentIdentity,
    sourceRefs,
    provenance,
    status: "effective_pr11",
  };

  return createRuntimeResult({
    status: "ok",
    provenance,
    outputRefs: [{ kind: "pack-lock", ref: lockId }],
    packLockRef: packLock.ref,
    output: packLock,
  });
}

export function createOperationContext(
  input: CreateOperationContextInput | null | undefined,
): CoreResult<OperationContext> {
  if (!isRecord(input)) {
    return resultAs<OperationContext>(missingOperationContextResult());
  }

  const contextInput = input as CreateOperationContextInput;
  if (!nonEmptyString(contextInput.operationName)) {
    return resultAs<OperationContext>(missingRunInput("operationName", "OperationContext requires operationName."));
  }

  if (!nonEmptyString(contextInput.operationVersion)) {
    return resultAs<OperationContext>(missingRunInput("operationVersion", "OperationContext requires operationVersion."));
  }

  const featureFlags = sortFeatureFlags(contextInput.featureFlags ?? {});
  const coordinatePolicy = runtimePolicy(
    unwrapPolicyValue(contextInput.coordinatePolicy) ?? NORMA_CANONICAL_COORDINATE_SYSTEM,
    contextInput.coordinatePolicy !== undefined && contextInput.coordinatePolicy !== null,
    policySourceRefs(contextInput.coordinatePolicy, "coordinate-policy"),
  );
  const metricPolicy = runtimePolicy(
    unwrapPolicyValue(contextInput.metricPolicy) ?? null,
    contextInput.metricPolicy !== undefined,
    policySourceRefs(contextInput.metricPolicy, "metric-policy"),
  );
  const tolerancePolicy = runtimePolicy(
    unwrapPolicyValue(contextInput.tolerancePolicy) ?? DEFAULT_TOLERANCE_POLICY,
    contextInput.tolerancePolicy !== undefined && contextInput.tolerancePolicy !== null,
    policySourceRefs(contextInput.tolerancePolicy, "tolerance-policy"),
  );
  const roundingPolicy = runtimePolicy(
    unwrapPolicyValue(contextInput.roundingPolicy) ?? DEFAULT_ROUNDING_POLICY,
    contextInput.roundingPolicy !== undefined && contextInput.roundingPolicy !== null,
    policySourceRefs(contextInput.roundingPolicy, "rounding-policy"),
  );
  const numericPolicy = runtimePolicy(
    unwrapPolicyValue(contextInput.numericPolicy) ?? DEFAULT_NUMERIC_POLICY,
    contextInput.numericPolicy !== undefined && contextInput.numericPolicy !== null,
    policySourceRefs(contextInput.numericPolicy, "numeric-policy"),
  );
  const orderingPolicy = runtimePolicy(
    unwrapPolicyValue(contextInput.orderingPolicy) ?? DEFAULT_ORDERING_POLICY,
    contextInput.orderingPolicy !== undefined && contextInput.orderingPolicy !== null,
    policySourceRefs(contextInput.orderingPolicy, "ordering-policy"),
  );
  if (
    !isCoordinateSystem(coordinatePolicy.value)
    || metricPolicy.value !== null && !isMetricPolicy(metricPolicy.value)
    || !isTolerancePolicy(tolerancePolicy.value)
    || !isRoundingPolicy(roundingPolicy.value)
    || !isNumericPolicy(numericPolicy.value)
    || !isOrderingPolicy(orderingPolicy.value)
  ) {
    return resultAs<OperationContext>(missingOperationContextResult());
  }

  const sourceRefs = uniqueSourceReferences([
    ...(contextInput.sourceRefs ?? []),
    ...coordinatePolicy.sourceRefs,
    ...metricPolicy.sourceRefs,
    ...tolerancePolicy.sourceRefs,
    ...roundingPolicy.sourceRefs,
    ...numericPolicy.sourceRefs,
    ...orderingPolicy.sourceRefs,
  ]);
  const operationName = contextInput.operationName;
  const operationVersion = contextInput.operationVersion;
  const geometryModelVersion = contextInput.geometryModelVersion ?? DEFAULT_GEOMETRY_MODEL_VERSION;
  const contextId = runtimeId([
    "operation-context",
    operationName,
    operationVersion,
    geometryModelVersion,
    coordinatePolicy.value.id,
    metricPolicy.value?.id ?? "metric:none",
    tolerancePolicy.value.id,
    roundingPolicy.value.id,
    numericPolicy.value.id,
    orderingPolicy.value.id,
    featureFlagIdentity(featureFlags),
  ]);
  const provenance = createRuntimeProvenance(CREATE_OPERATION_CONTEXT_OPERATION, sourceRefs);
  const operationContext: OperationContext = {
    kind: "operation-context",
    id: contextId,
    ref: { id: contextId },
    coreVersion: CORE_VERSION,
    operationName,
    operationVersion,
    geometryModelVersion,
    coordinatePolicy,
    metricPolicy,
    tolerancePolicy,
    roundingPolicy,
    numericPolicy,
    orderingPolicy,
    featureFlags,
    sourceRefs,
    provenance,
  };

  return createRuntimeResult({
    status: "ok",
    provenance,
    outputRefs: [{ kind: "operation-context", ref: contextId }],
    operationContextRef: operationContext.ref,
    output: operationContext,
  });
}

export function createRunInput(input: CreateRunInputInput | null | undefined): CoreResult<RunInput> {
  if (!isRecord(input)) {
    return resultAs<RunInput>(missingRunInput("runInput", "RunInput is required."));
  }

  const runInputInput = input as CreateRunInputInput;
  if (!isRef(runInputInput.packLockRef)) {
    return resultAs<RunInput>(missingPackLockResult());
  }

  if (!isRef(runInputInput.operationContextRef)) {
    return resultAs<RunInput>(missingOperationContextResult());
  }

  const sourceRefs = uniqueSourceReferences(runInputInput.sourceRefs ?? []);
  if (sourceRefs.length === 0) {
    return resultAs<RunInput>(missingSource("sourceRefs", "RunInput requires visible source refs."));
  }

  const operationContext = runInputInput.operationContext ?? null;
  const outputRefs = normalizeOutputRefs(runInputInput.requestedOutputRefs ?? []);
  const runInput: RunInput = {
    kind: "run-input",
    id: runtimeId([
      "run-input",
      refsIdentity(runInputInput.inputRefs ?? []),
      refsIdentity(sourceRefs),
      runInputInput.packLockRef.id,
      runInputInput.operationContextRef.id,
      refsIdentity(outputRefs.refs),
      featureFlagIdentity(runInputInput.featureFlags ?? operationContext?.featureFlags ?? {}),
    ]),
    inputRefs: sortOutputRefsDeterministically(runInputInput.inputRefs ?? []),
    sourceRefs,
    packLockRef: runInputInput.packLockRef,
    operationContextRef: runInputInput.operationContextRef,
    requestedOutputRefs: outputRefs,
    explicitPolicies: explicitPoliciesFor(operationContext),
    featureFlags: sortFeatureFlags(runInputInput.featureFlags ?? operationContext?.featureFlags ?? {}),
  };

  const provenance = createRuntimeProvenance(CREATE_RUN_INPUT_OPERATION, [
    ...runInput.inputRefs,
    ...runInput.sourceRefs,
    { kind: "pack-lock", ref: runInput.packLockRef.id },
    { kind: "operation-context", ref: runInput.operationContextRef.id },
  ]);

  return createRuntimeResult({
    status: "ok",
    provenance,
    outputRefs: [{ kind: "run-input", ref: runInput.id }],
    packLockRef: runInput.packLockRef,
    operationContextRef: runInput.operationContextRef,
    output: runInput,
  });
}

export function createRunOutput(input: CreateRunOutputInput | null | undefined): CoreResult<RunOutput> {
  if (!isRecord(input)) {
    return resultAs<RunOutput>(missingRunOutput("runOutput", "RunOutput is required."));
  }

  const runOutputInput = input as CreateRunOutputInput;
  if (!isRef(runOutputInput.runRef)) {
    return resultAs<RunOutput>(missingRun("runRef", "RunOutput requires a runRef."));
  }

  const result = runOutputInput.result ?? null;
  const outputRefs = normalizeOutputRefs(runOutputInput.outputRefs ?? result?.outputRefs ?? []);
  if (outputRefs.refs.length === 0) {
    return resultAs<RunOutput>(missingOutputRefs("outputRefs", "RunOutput requires outputRefs."));
  }

  const packLockRef = runOutputInput.packLockRef ?? result?.packLockRef ?? null;
  if (!isRef(packLockRef)) {
    return resultAs<RunOutput>(missingPackLockResult());
  }

  const operationContextRef = runOutputInput.operationContextRef ?? result?.operationContextRef ?? null;
  if (!isRef(operationContextRef)) {
    return resultAs<RunOutput>(missingOperationContextResult());
  }

  const provenance = result?.provenance ?? createRuntimeProvenance(CREATE_RUN_OUTPUT_OPERATION, [
    { kind: "run", ref: runOutputInput.runRef.id },
    { kind: "pack-lock", ref: packLockRef.id },
    { kind: "operation-context", ref: operationContextRef.id },
    ...outputRefs.refs,
  ]);
  const runOutput: RunOutput = {
    kind: "run-output",
    id: runtimeId(["run-output", runOutputInput.runRef.id, refsIdentity(outputRefs.refs)]),
    outputRefs,
    resultStatus: result?.status ?? "ok",
    warnings: [...(result?.warnings ?? [])],
    errors: [...(result?.errors ?? [])],
    provenance,
    packLockRef,
    operationContextRef,
    runRef: runOutputInput.runRef,
  };

  return createRuntimeResult({
    status: "ok",
    warnings: runOutput.warnings,
    errors: runOutput.errors,
    provenance,
    outputRefs: [{ kind: "run-output", ref: runOutput.id }, ...runOutput.outputRefs.refs],
    runRef: runOutput.runRef,
    packLockRef,
    operationContextRef,
    output: runOutput,
  });
}

export function createRun(input: CreateRunInput | null | undefined): CoreResult<Run> {
  if (!isRecord(input)) {
    return resultAs<Run>(missingRun("run", "Run input is required."));
  }

  const runInput = input as CreateRunInput;
  const operationContextRef = runInput.operationContext?.ref ?? runInput.operationContextRef ?? runInput.result?.operationContextRef ?? null;
  if (!isRef(operationContextRef)) {
    return resultAs<Run>(missingOperationContextResult());
  }

  const packLockRef = runInput.packLock?.ref ?? runInput.packLockRef ?? runInput.result?.packLockRef ?? null;
  if (!isRef(packLockRef)) {
    return resultAs<Run>(missingPackLockResult());
  }

  const operationName = runInput.operationName ?? runInput.operationContext?.operationName ?? runInput.result?.provenance?.operationName;
  const operationVersion = runInput.operationVersion ?? runInput.operationContext?.operationVersion ?? runInput.result?.provenance?.operationVersion;
  if (!nonEmptyString(operationName)) {
    return resultAs<Run>(missingRunInput("operationName", "Run requires operationName."));
  }

  if (!nonEmptyString(operationVersion)) {
    return resultAs<Run>(missingRunInput("operationVersion", "Run requires operationVersion."));
  }

  const inputResult = runInput.input === undefined || runInput.input === null
    ? createRunInput({
      inputRefs: runInput.inputRefs ?? runInput.result?.provenance?.inputRefs ?? [],
      sourceRefs: runInput.sourceRefs ?? runInput.result?.provenance?.inputRefs ?? [],
      packLockRef,
      operationContextRef,
      requestedOutputRefs: runInput.requestedOutputRefs ?? runInput.outputRefs ?? runInput.result?.outputRefs ?? [],
      operationContext: runInput.operationContext ?? null,
    })
    : createRuntimeResult({
      status: "ok",
      outputRefs: [{ kind: "run-input", ref: runInput.input.id }],
      packLockRef,
      operationContextRef,
      output: runInput.input,
    });
  if (inputResult.status !== "ok" || inputResult.output === null) {
    return resultAs<Run>(inputResult);
  }

  const runRef = {
    id: runtimeId([
      "run",
      operationName,
      operationVersion,
      refsIdentity(inputResult.output.inputRefs),
      refsIdentity(inputResult.output.sourceRefs),
      packLockRef.id,
      operationContextRef.id,
      refsIdentity(normalizeOutputRefs(runInput.outputRefs ?? runInput.result?.outputRefs ?? []).refs),
    ]),
  };
  const outputResult = runInput.output === undefined || runInput.output === null
    ? createRunOutput({
      runRef,
      result: runInput.result ?? null,
      outputRefs: runInput.outputRefs ?? runInput.result?.outputRefs ?? [],
      packLockRef,
      operationContextRef,
    })
    : createRuntimeResult({
      status: "ok",
      warnings: runInput.output.warnings,
      errors: runInput.output.errors,
      outputRefs: [{ kind: "run-output", ref: runInput.output.id }, ...runInput.output.outputRefs.refs],
      runRef,
      packLockRef,
      operationContextRef,
      output: runInput.output,
    });
  if (outputResult.status !== "ok" || outputResult.output === null) {
    return resultAs<Run>(outputResult);
  }

  const provenance = createRuntimeProvenance(CREATE_RUN_OPERATION, [
    { kind: "run-input", ref: inputResult.output.id },
    { kind: "run-output", ref: outputResult.output.id },
    { kind: "pack-lock", ref: packLockRef.id },
    { kind: "operation-context", ref: operationContextRef.id },
  ]);
  const warnings = [...(runInput.warnings ?? []), ...outputResult.output.warnings];
  const errors = [...(runInput.errors ?? []), ...outputResult.output.errors];
  const readinessStatus = readinessStatusFor({
    hasRun: true,
    hasRunInput: true,
    hasRunOutput: true,
    hasPackLock: true,
    hasOperationContext: true,
    hasOutputRefs: outputResult.output.outputRefs.refs.length > 0,
    hasSourceRefs: inputResult.output.sourceRefs.length > 0,
    mismatchCodes: [],
    warnings,
    errors,
    artifactStatus: null,
  });
  const run: Run = {
    kind: "run",
    id: runRef.id,
    runRef,
    coreVersion: CORE_VERSION,
    operationName,
    operationVersion,
    input: inputResult.output,
    inputRefs: inputResult.output.inputRefs,
    packLockRef,
    operationContextRef,
    outputRefs: outputResult.output.outputRefs,
    replayReadinessStatus: readinessStatus,
    warnings,
    errors,
    provenance,
    ...(runInput.metadata === undefined ? {} : { metadata: runInput.metadata }),
  };

  return createRuntimeResult({
    status: "ok",
    warnings,
    errors,
    provenance,
    outputRefs: [{ kind: "run", ref: run.id }, ...run.outputRefs.refs],
    runRef,
    packLockRef,
    operationContextRef,
    output: run,
  });
}

export function validateRunReadiness(
  input: Run | ValidateRunReadinessInput | null | undefined,
): CoreResult<ReplayReadinessStatus> {
  const readinessInput = isRun(input) ? { run: input } : input;
  if (!isRecord(readinessInput)) {
    return readinessFailure("MissingRun", "run", "Run is required for replay-readiness validation.");
  }

  const runReadinessInput = readinessInput as ValidateRunReadinessInput;
  const run = runReadinessInput.run ?? null;
  if (run !== null && !isRun(run)) {
    return readinessFailure("MissingRun", "run", "Run must be a complete PR11 Run object.");
  }

  const comparison = runReadinessInput.comparison ?? null;
  const warnings = [
    ...(run?.warnings ?? []),
    ...(comparison?.warnings ?? []),
    ...artifactReadinessWarnings(runReadinessInput.artifact ?? null),
  ];
  const errors = [
    ...(run?.errors ?? []),
    ...(comparison?.errors ?? []),
  ];
  const status = readinessStatusFor({
    hasRun: run !== null,
    hasRunInput: run?.input !== null,
    hasRunOutput: run !== null && run.outputRefs.refs.length > 0,
    hasPackLock: runReadinessInput.packLock !== null && runReadinessInput.packLock !== undefined || isRef(run?.packLockRef),
    hasOperationContext: runReadinessInput.operationContext !== null && runReadinessInput.operationContext !== undefined || isRef(run?.operationContextRef),
    hasOutputRefs: (run?.outputRefs.refs.length ?? 0) > 0,
    hasSourceRefs: (run?.input?.sourceRefs.length ?? 0) > 0,
    mismatchCodes: comparison?.mismatchCodes ?? [],
    warnings,
    errors,
    artifactStatus: runReadinessInput.artifact?.status ?? null,
  });

  return createRuntimeResult({
    status: status === "non_replayable" && run === null ? "failed" : "ok",
    warnings,
    errors: run === null ? [runtimeError({
      code: "MissingRun",
      message: "Run is required for replay-readiness validation.",
      targetRef: "run",
    })] : errors,
    provenance: createRuntimeProvenance(VALIDATE_READINESS_OPERATION, run === null ? [] : [{ kind: "run", ref: run.id }]),
    outputRefs: run === null ? [] : [{ kind: "run", ref: run.id }],
    runRef: run?.runRef ?? null,
    packLockRef: run?.packLockRef ?? null,
    operationContextRef: run?.operationContextRef ?? null,
    output: status,
  });
}

export function compareRunContext(
  input: RunContextComparisonInput | null | undefined,
): CoreResult<RunContextComparison> {
  if (!isRecord(input)) {
    return resultAs<RunContextComparison>(missingRunInput("runContext", "Run context comparison input is required."));
  }

  const contextComparisonInput = input as RunContextComparisonInput;
  const warnings: CoreWarning[] = [];
  const errors: CoreError[] = [];
  appendPackLockMismatches(warnings, errors, contextComparisonInput.expectedPackLock ?? null, contextComparisonInput.actualPackLock ?? null);
  appendOperationContextMismatches(warnings, contextComparisonInput.expectedOperationContext ?? null, contextComparisonInput.actualOperationContext ?? null);

  if (!sameFeatureFlags(contextComparisonInput.expectedFeatureFlags ?? {}, contextComparisonInput.actualFeatureFlags ?? {})) {
    warnings.push(runtimeWarning({
      code: "FeatureFlagsMismatch",
      message: "Feature flags differ between run contexts.",
      targetRef: "featureFlags",
    }));
  }

  if (contextComparisonInput.artifact?.status === "stale") {
    warnings.push(runtimeWarning({
      code: "ArtifactStale",
      message: "Artifact source refs differ from expected source refs.",
      targetRef: contextComparisonInput.artifact.id,
      sourceRef: { kind: "artifact", ref: contextComparisonInput.artifact.id },
    }));
  }

  if (contextComparisonInput.expectedSourceRefs !== undefined && !sameSourceRefs(contextComparisonInput.expectedSourceRefs, contextComparisonInput.actualSourceRefs ?? [])) {
    errors.push(runtimeError({
      code: "MissingSource",
      message: "Expected source refs are missing from the actual run context.",
      targetRef: "sourceRefs",
    }));
  }

  const mismatchCodes = [...errors, ...warnings].map((diagnostic) => diagnostic.code);
  const comparison: RunContextComparison = {
    kind: "run-context-comparison",
    status: mismatchCodes.length > 0 ? "mismatch" : "match",
    warnings,
    errors,
    mismatchCodes,
  };

  return createRuntimeResult({
    status: errors.length > 0 ? "failed" : "ok",
    warnings,
    errors,
    provenance: createRuntimeProvenance(COMPARE_CONTEXT_OPERATION),
    outputRefs: [],
    output: comparison,
  });
}

export function sortOutputRefsDeterministically(refs: readonly SourceReference[]): readonly SourceReference[] {
  return uniqueSourceReferences(refs).sort((first, second) => {
    const rankDelta = outputRefKindRank(first.kind) - outputRefKindRank(second.kind);
    if (rankDelta !== 0) {
      return rankDelta;
    }

    const kindDelta = first.kind.localeCompare(second.kind);
    if (kindDelta !== 0) {
      return kindDelta;
    }

    return first.ref.localeCompare(second.ref);
  });
}

function appendPackLockMismatches(
  warnings: CoreWarning[],
  errors: CoreError[],
  expected: PackLock | PackLockRef | null,
  actual: PackLock | PackLockRef | null,
): void {
  if (expected === null || actual === null) {
    if (expected !== actual) {
      errors.push(runtimeError({
        code: "MissingPackLock",
        message: "PackLock is missing from one run context.",
        targetRef: "packLock",
      }));
    }
    return;
  }

  if (isPackLock(expected) && isPackLock(actual)) {
    if (expected.packVersion !== actual.packVersion) {
      warnings.push(runtimeWarning({
        code: "PackVersionMismatch",
        message: "Pack versions differ between run contexts.",
        targetRef: "packVersion",
      }));
    }

    if (expected.contentIdentity !== actual.contentIdentity) {
      errors.push(runtimeError({
        code: "PackContentIdentityMismatch",
        message: "Pack content identity differs between run contexts.",
        targetRef: "contentIdentity",
      }));
    }
    return;
  }

  if (packLockRefId(expected) !== packLockRefId(actual)) {
    warnings.push(runtimeWarning({
      code: "PackVersionMismatch",
      message: "PackLock refs differ between run contexts.",
      targetRef: "packLockRef",
    }));
  }
}

function appendOperationContextMismatches(
  warnings: CoreWarning[],
  expected: OperationContext | OperationContextRef | null,
  actual: OperationContext | OperationContextRef | null,
): void {
  if (expected === null || actual === null) {
    if (expected !== actual) {
      warnings.push(runtimeWarning({
        code: "MissingOperationContext",
        message: "OperationContext is missing from one run context.",
        targetRef: "operationContext",
      }));
    }
    return;
  }

  if (!isOperationContext(expected) || !isOperationContext(actual)) {
    if (refId(expected) !== refId(actual)) {
      warnings.push(runtimeWarning({
        code: "OperationVersionMismatch",
        message: "OperationContext refs differ between run contexts.",
        targetRef: "operationContextRef",
      }));
    }
    return;
  }

  appendStringMismatch(warnings, expected.operationVersion, actual.operationVersion, "OperationVersionMismatch", "operationVersion");
  appendStringMismatch(warnings, expected.geometryModelVersion, actual.geometryModelVersion, "GeometryModelVersionMismatch", "geometryModelVersion");
  appendStringMismatch(warnings, expected.coordinatePolicy.value.id, actual.coordinatePolicy.value.id, "CoordinatePolicyMismatch", "coordinatePolicy");
  appendStringMismatch(warnings, expected.metricPolicy.value?.id ?? "metric:none", actual.metricPolicy.value?.id ?? "metric:none", "MetricPolicyMismatch", "metricPolicy");
  appendStringMismatch(warnings, expected.tolerancePolicy.value.id, actual.tolerancePolicy.value.id, "TolerancePolicyMismatch", "tolerancePolicy");
}

function appendStringMismatch(
  warnings: CoreWarning[],
  expected: string,
  actual: string,
  code: DiagnosticCode,
  targetRef: string,
): void {
  if (expected === actual) {
    return;
  }

  warnings.push(runtimeWarning({
    code,
    message: `${targetRef} differs between run contexts.`,
    targetRef,
  }));
}

function readinessStatusFor(input: {
  hasRun: boolean;
  hasRunInput: boolean;
  hasRunOutput: boolean;
  hasPackLock: boolean;
  hasOperationContext: boolean;
  hasOutputRefs: boolean;
  hasSourceRefs: boolean;
  mismatchCodes: readonly DiagnosticCode[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  artifactStatus: Artifact["status"] | null;
}): ReplayReadinessStatus {
  if (!input.hasRun || !input.hasRunInput || !input.hasRunOutput || !input.hasPackLock || !input.hasOperationContext || !input.hasOutputRefs || !input.hasSourceRefs) {
    return "non_replayable";
  }

  if (input.errors.length > 0 || input.mismatchCodes.length > 0) {
    return "mismatch";
  }

  if (input.artifactStatus === "non_replayable") {
    return "non_replayable";
  }

  if (input.warnings.length > 0 || input.artifactStatus === "stale") {
    return "ready_with_warnings";
  }

  return "ready";
}

function explicitPoliciesFor(operationContext: OperationContext | null): RunInput["explicitPolicies"] {
  if (operationContext !== null) {
    return {
      coordinatePolicy: operationContext.coordinatePolicy,
      metricPolicy: operationContext.metricPolicy,
      tolerancePolicy: operationContext.tolerancePolicy,
      roundingPolicy: operationContext.roundingPolicy,
      numericPolicy: operationContext.numericPolicy,
      orderingPolicy: operationContext.orderingPolicy,
    };
  }

  return {
    coordinatePolicy: runtimePolicy(NORMA_CANONICAL_COORDINATE_SYSTEM, false, [{ kind: "coordinate-policy", ref: NORMA_CANONICAL_COORDINATE_SYSTEM.id }]),
    metricPolicy: runtimePolicy(null, false, []),
    tolerancePolicy: runtimePolicy(DEFAULT_TOLERANCE_POLICY, false, [{ kind: "tolerance-policy", ref: DEFAULT_TOLERANCE_POLICY.id }]),
    roundingPolicy: runtimePolicy(DEFAULT_ROUNDING_POLICY, false, [{ kind: "rounding-policy", ref: DEFAULT_ROUNDING_POLICY.id }]),
    numericPolicy: runtimePolicy(DEFAULT_NUMERIC_POLICY, false, [{ kind: "numeric-policy", ref: DEFAULT_NUMERIC_POLICY.id }]),
    orderingPolicy: runtimePolicy(DEFAULT_ORDERING_POLICY, false, [{ kind: "ordering-policy", ref: DEFAULT_ORDERING_POLICY.id }]),
  };
}

function normalizeOutputRefs(value: readonly SourceReference[] | OutputRefs): OutputRefs {
  if (isOutputRefs(value)) {
    return { kind: "output-refs", refs: sortOutputRefsDeterministically(value.refs) };
  }

  return { kind: "output-refs", refs: sortOutputRefsDeterministically(value) };
}

function inputSourceRefs(input: CreatePackLockInput | RatioPack | null | undefined, pack: RatioPack): readonly SourceReference[] {
  const explicitRefs = isRecord(input) && "sourceRefs" in input && Array.isArray(input.sourceRefs)
    ? input.sourceRefs
    : [];
  return uniqueSourceReferences([
    ...explicitRefs,
    ...pack.provenance.sourceRefs,
    { kind: "ratio-pack", ref: ratioPackRef(pack) },
  ]);
}

function artifactReadinessWarnings(artifact: Artifact | null): readonly CoreWarning[] {
  if (artifact?.status !== "stale") {
    return [];
  }

  return [
    runtimeWarning({
      code: "ArtifactStale",
      message: "Artifact is stale for replay-readiness.",
      targetRef: artifact.id,
      sourceRef: { kind: "artifact", ref: artifact.id },
    }),
  ];
}

function createRuntimeResult<TOutput = unknown>(input: RuntimeResultInput<TOutput>): CoreResult<TOutput> {
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };
  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
  };
}

function readinessFailure(code: DiagnosticCode, targetRef: string, message: string): CoreResult<ReplayReadinessStatus> {
  const error = runtimeError({ code, message, targetRef });
  return createRuntimeResult({
    status: "failed",
    errors: [error],
    provenance: createRuntimeProvenance(VALIDATE_READINESS_OPERATION),
    output: "non_replayable",
  });
}

function missingRun(targetRef: string, message: string): CoreResult {
  return createRuntimeResult({
    status: "failed",
    errors: [runtimeError({ code: "MissingRun", message, targetRef })],
  });
}

function missingRunInput(targetRef: string, message: string): CoreResult {
  return createRuntimeResult({
    status: "failed",
    errors: [runtimeError({ code: "MissingRunInput", message, targetRef })],
  });
}

function missingRunOutput(targetRef: string, message: string): CoreResult {
  return createRuntimeResult({
    status: "failed",
    errors: [runtimeError({ code: "MissingRunOutput", message, targetRef })],
  });
}

function missingOutputRefs(targetRef: string, message: string): CoreResult {
  return createRuntimeResult({
    status: "failed",
    errors: [runtimeError({ code: "MissingOutputRefs", message, targetRef })],
  });
}

function missingSource(targetRef: string, message: string): CoreResult {
  return createRuntimeResult({
    status: "failed",
    errors: [runtimeError({ code: "MissingSource", message, targetRef })],
  });
}

function missingPackLockResult(): CoreResult {
  return createRuntimeResult({
    status: "failed",
    errors: [runtimeError({
      code: "MissingPackLock",
      message: "PackLock is required.",
      targetRef: "packLock",
      sourceRef: { kind: "pack-lock", ref: "missing" },
    })],
  });
}

function missingOperationContextResult(): CoreResult {
  return createRuntimeResult({
    status: "failed",
    errors: [runtimeError({
      code: "MissingOperationContext",
      message: "OperationContext is required.",
      targetRef: "operationContext",
      sourceRef: { kind: "operation-context", ref: "missing" },
    })],
  });
}

function runtimeError(input: RuntimeDiagnosticInput): CoreError {
  const diagnostic = { sourceRef: RUNTIME_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };
  return {
    code: diagnostic.code,
    severity: diagnostic.severity === "fatal" ? "fatal" : "error",
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: true,
    provenance: diagnostic.provenance,
  };
}

function runtimeWarning(input: RuntimeDiagnosticInput): CoreWarning {
  const diagnostic = { sourceRef: RUNTIME_SOURCE_REFERENCE, targetRef: null, provenance: null, ...input };
  const severity = warningSeverity(diagnostic.severity);
  return {
    code: diagnostic.code,
    severity,
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: diagnostic.blocking ?? severity === "critical",
    provenance: diagnostic.provenance,
  };
}

function createRuntimeProvenance(operationName: OperationName, inputRefs: readonly SourceReference[] = []): Provenance {
  return {
    operationName,
    operationVersion: PR11_RUNTIME_OPERATION_VERSION,
    inputRefs: uniqueSourceReferences(inputRefs),
    source: RUNTIME_SOURCE_REFERENCE,
  };
}

function runtimePolicy<TValue>(
  value: TValue,
  explicit: boolean,
  sourceRefs: readonly SourceReference[],
): RuntimePolicy<TValue> {
  return {
    value,
    explicit,
    sourceRefs: uniqueSourceReferences(sourceRefs),
  };
}

function unwrapPolicyValue<TValue>(value: TValue | RuntimePolicy<TValue> | null | undefined): TValue | null {
  if (isRecord(value) && "value" in value && "explicit" in value && Array.isArray(value.sourceRefs)) {
    return value.value as TValue;
  }

  return value === undefined || value === null ? null : value as TValue;
}

function policySourceRefs(value: unknown, kind: string): readonly SourceReference[] {
  if (isRecord(value) && Array.isArray(value.sourceRefs)) {
    return value.sourceRefs.filter(isSourceReference);
  }

  if (isRecord(value) && typeof value.id === "string") {
    return [{ kind, ref: value.id }];
  }

  return [];
}

function uniqueSourceReferences(refs: readonly SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  const uniqueRefs: SourceReference[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.ref}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRefs.push({ kind: ref.kind, ref: ref.ref });
    }
  }

  return uniqueRefs;
}

function sortFeatureFlags(flags: Readonly<Record<string, boolean>>): Readonly<Record<string, boolean>> {
  return Object.freeze(Object.fromEntries(
    Object.entries(flags).sort(([first], [second]) => first.localeCompare(second)),
  ));
}

function featureFlagIdentity(flags: Readonly<Record<string, boolean>>): string {
  return Object.entries(sortFeatureFlags(flags))
    .map(([key, value]) => `${key}:${value}`)
    .join(",");
}

function sameFeatureFlags(first: Readonly<Record<string, boolean>>, second: Readonly<Record<string, boolean>>): boolean {
  return featureFlagIdentity(first) === featureFlagIdentity(second);
}

function refsIdentity(refs: readonly SourceReference[]): string {
  return sortOutputRefsDeterministically(refs).map((ref) => `${ref.kind}:${ref.ref}`).join(",");
}

function sameSourceRefs(first: readonly SourceReference[], second: readonly SourceReference[]): boolean {
  return refsIdentity(first) === refsIdentity(second);
}

function runtimeId(parts: readonly string[]): string {
  return parts.map((part) => part.replaceAll(/[^a-zA-Z0-9:._@-]+/g, "_")).join(":");
}

function outputRefKindRank(kind: string): number {
  return OUTPUT_REF_KIND_RANK.get(kind) ?? 100;
}

function ratioPackRef(pack: RatioPack): string {
  return `${pack.id}@${pack.version}`;
}

function packLockRefId(value: PackLock | PackLockRef): string {
  return isPackLock(value) ? value.ref.id : value.id;
}

function refId(value: OperationContext | OperationContextRef): string {
  return isOperationContext(value) ? value.ref.id : value.id;
}

function isPackLock(value: unknown): value is PackLock {
  return isRecord(value)
    && value.kind === "pack-lock"
    && isRef(value.ref)
    && nonEmptyString(value.packVersion)
    && nonEmptyString(value.contentIdentity);
}

function isOperationContext(value: unknown): value is OperationContext {
  return isRecord(value)
    && value.kind === "operation-context"
    && isRef(value.ref)
    && nonEmptyString(value.operationName)
    && nonEmptyString(value.operationVersion)
    && isRecord(value.coordinatePolicy)
    && isRecord(value.tolerancePolicy);
}

function isRun(value: unknown): value is Run {
  return isRecord(value)
    && value.kind === "run"
    && nonEmptyString(value.id)
    && isRef(value.runRef)
    && isRef(value.packLockRef)
    && isRef(value.operationContextRef)
    && isOutputRefs(value.outputRefs)
    && isRecord(value.input)
    && Array.isArray(value.input.sourceRefs);
}

function isOutputRefs(value: unknown): value is OutputRefs {
  return isRecord(value)
    && value.kind === "output-refs"
    && Array.isArray(value.refs)
    && value.refs.every(isSourceReference);
}

function isRef(value: unknown): value is RunRef & PackLockRef & OperationContextRef {
  return isRecord(value) && nonEmptyString(value.id);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value) && typeof value.kind === "string" && typeof value.ref === "string";
}

function isCoordinateSystem(value: unknown): value is CoordinateSystem {
  return isRecord(value)
    && value.kind === "coordinate-system"
    && nonEmptyString(value.id)
    && nonEmptyString(value.origin)
    && nonEmptyString(value.xAxis)
    && nonEmptyString(value.yAxis)
    && typeof value.dimensions === "number"
    && nonEmptyString(value.coordinateScale);
}

function isMetricPolicy(value: unknown): value is MetricPolicy {
  return isRecord(value)
    && value.kind === "metric-policy"
    && nonEmptyString(value.id)
    && nonEmptyString(value.quantity)
    && nonEmptyString(value.unit);
}

function isTolerancePolicy(value: unknown): value is TolerancePolicy {
  return isRecord(value)
    && value.kind === "tolerance-policy"
    && nonEmptyString(value.id)
    && typeof value.coordinateTolerance === "number";
}

function isRoundingPolicy(value: unknown): value is RoundingPolicy {
  return isRecord(value)
    && value.kind === "rounding-policy"
    && nonEmptyString(value.id);
}

function isNumericPolicy(value: unknown): value is NumericPolicy {
  return isRecord(value)
    && value.kind === "numeric-policy"
    && nonEmptyString(value.id);
}

function isOrderingPolicy(value: unknown): value is OrderingPolicy {
  return isRecord(value)
    && value.kind === "ordering-policy"
    && nonEmptyString(value.id);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function warningSeverity(severity: DiagnosticSeverity | undefined): CoreWarning["severity"] {
  if (severity === "critical" || severity === "info" || severity === "warning") {
    return severity;
  }

  return "warning";
}

function resultAs<TOutput>(result: CoreResult): CoreResult<TOutput> {
  return result as unknown as CoreResult<TOutput>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
