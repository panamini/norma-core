import {
  MVP_DEMO_OPERATION_NAME,
  MVP_DEMO_OPERATION_VERSION,
  runMvpDemo,
  type MvpDemoInput,
} from "./mvp-demo.js";
import {
  verifyRun,
  type RunVerification,
  type VerifyRunInput,
} from "./run-verification.js";
import type {
  ArtifactFreshnessVerification,
  VerifyArtifactFreshnessInput,
} from "./artifact-freshness.js";
import {
  canonicalizeErrors,
  canonicalizeOutputRefs,
  canonicalizeRefs,
  canonicalizeWarnings,
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
  STABLE_SERIALIZATION_VERSION,
} from "./serialization.js";
import type {
  CoreError,
  CoreWarning,
  Diagnostic,
  DiagnosticCode,
  OperationContextRef,
  OutputRefs,
  PackLockRef,
  Provenance,
  Run,
  RunRef,
  SourceReference,
} from "./index.js";

export interface ReplayRunInput {
  run: unknown;
  mvpDemoInput?: unknown;
  sourceObjects?: readonly unknown[];
  packLock?: unknown;
  operationContext?: unknown;
  expectedOutputRefs?: readonly SourceReference[] | OutputRefs;
  artifactFreshnessInputs?: readonly VerifyArtifactFreshnessInput[];
  requireFreshArtifacts?: boolean;
}

export type ReplayRunStatus =
  | "replayed"
  | "replayed_with_warnings"
  | "mismatch"
  | "non_replayable"
  | "unsupported"
  | "error";

export interface ReplayMismatch {
  code: string;
  message: string;
  targetRef: string | null;
  recorded: unknown;
  replayed: unknown;
}

export interface ReplayRunResult {
  kind: "run-replay";
  status: ReplayRunStatus;
  replayAttempted: boolean;
  replayRequired: true;
  operationName: string | null;
  operationVersion: string | null;
  recordedRunRef: RunRef | null;
  replayedRunRef: RunRef | null;
  packLockRef: PackLockRef | null;
  operationContextRef: OperationContextRef | null;
  recordedOutputRefs: readonly SourceReference[];
  replayedOutputRefs: readonly SourceReference[];
  sourceRefsUsed: readonly SourceReference[];
  mismatches: readonly ReplayMismatch[];
  verification: RunVerification;
  artifactFreshness?: readonly ArtifactFreshnessVerification[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: Provenance | null;
  serializationSummary?: {
    serializationVersion: string;
    canonicalOrdering: true;
  };
}

type ReplayMismatchCode =
  | "RecordedRunMismatch"
  | "OutputRefsMismatch"
  | "RunRefMismatch"
  | "PackLockRefMismatch"
  | "OperationContextRefMismatch"
  | "OperationMismatch"
  | "DiagnosticsMismatch"
  | "ArtifactFreshnessMismatch";

type VerifyRunBlockingStatus = Exclude<RunVerification["status"], "verified" | "verified_with_warnings">;
type OptionalVerificationKey =
  | "sourceObjects"
  | "expectedOutputRefs"
  | "artifactFreshnessInputs"
  | "requireFreshArtifacts";

interface ReplayResultDraft {
  status: ReplayRunStatus;
  replayAttempted: boolean;
  verification: RunVerification;
  replayedRun?: Run | null;
  replayedOutputRefs?: readonly SourceReference[];
  sourceRefsUsed?: readonly SourceReference[];
  mismatches?: readonly ReplayMismatch[];
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance?: Provenance | null;
}

const REPLAY_RUN_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/run-replay-v1",
});

const MVP_DEMO_INPUT_RECORD_FIELDS = [
  "surface",
  "ratioPack",
  "packLock",
  "packLockRef",
  "compositionA",
  "compositionB",
  "evaluationProfile",
  "tolerancePolicy",
  "evaluationTolerances",
  "comparisonTolerances",
  "operationContext",
  "operationContextRef",
  "runOptions",
  "artifactOptions",
] as const;

const MVP_DEMO_INPUT_STRING_FIELDS = [
  "packRef",
  "ruleSetRef",
  "evaluationProfileRef",
] as const;

const MVP_DEMO_INPUT_ARRAY_FIELDS = [
  "requestedOutputs",
  "requestedArtifacts",
] as const;

const VERIFICATION_REPLAY_STATUS: Readonly<Record<VerifyRunBlockingStatus, ReplayRunStatus>> = Object.freeze({
  invalid: "error",
  unsupported: "unsupported",
  non_replayable: "non_replayable",
  mismatch: "mismatch",
});

export function replayRun(input: ReplayRunInput | null | undefined): ReplayRunResult {
  const inputRecord = isRecord(input) ? input : null;
  const mvpDemoInput = inputRecord === null ? null : resolveMvpDemoInput(inputRecord);
  const verification = verifyRun(createReplayVerificationInput(inputRecord, mvpDemoInput));
  const earlyResult = earlyReplayResult(inputRecord, mvpDemoInput, verification);

  return earlyResult ?? replayVerifiedMvpRun(inputRecord, mvpDemoInput as MvpDemoInput, verification);
}

function earlyReplayResult(
  input: ReplayRunInput | null,
  mvpDemoInput: MvpDemoInput | null,
  verification: RunVerification,
): ReplayRunResult | null {
  return malformedMvpDemoInputResult(input, verification)
    ?? blockedReplayResult(input, verification)
    ?? missingMvpDemoInputResult(mvpDemoInput, verification);
}

function malformedMvpDemoInputResult(
  input: ReplayRunInput | null,
  verification: RunVerification,
): ReplayRunResult | null {
  const targetRef = malformedMvpDemoInputTargetRef(input);
  return targetRef === null || verification.status === "unsupported" || verification.status === "mismatch"
    ? null
    : createReplayRunResult({
      status: "error",
      replayAttempted: false,
      verification,
      warnings: verification.warnings,
      errors: [
        ...verification.errors,
        replayError("InvalidInputShape", "MVP demo source truth is malformed.", targetRef),
      ],
      provenance: verification.provenance,
    });
}

function blockedReplayResult(input: ReplayRunInput | null, verification: RunVerification): ReplayRunResult | null {
  const blockedStatus = replayStatusForVerification(verification);
  return blockedStatus === null
    ? null
    : createReplayRunResult({
      status: blockedStatus,
      replayAttempted: false,
      verification,
      mismatches: blockedStatus === "mismatch" ? mismatchesFromVerification(verification) : [],
      warnings: verification.warnings,
      errors: blockedReplayErrors(input, verification),
      provenance: verification.provenance,
    });
}

function blockedReplayErrors(input: ReplayRunInput | null, verification: RunVerification): readonly CoreError[] {
  return input === null
    ? [
      ...verification.errors,
      replayError("InvalidInputShape", "Run replay requires an input object.", "input"),
    ]
    : verification.errors;
}

function missingMvpDemoInputResult(
  mvpDemoInput: MvpDemoInput | null,
  verification: RunVerification,
): ReplayRunResult | null {
  if (mvpDemoInput !== null) {
    return null;
  }

  const error = replayError(
    "MissingSource",
    "MVP replay requires a complete structured MVP demo input.",
    "mvpDemoInput",
  );

  return createReplayRunResult({
    status: "non_replayable",
    replayAttempted: false,
    verification,
    errors: [...verification.errors, error],
    warnings: verification.warnings,
    provenance: verification.provenance,
  });
}

function createReplayVerificationInput(
  input: ReplayRunInput | null,
  mvpDemoInput: MvpDemoInput | null,
): VerifyRunInput {
  const verificationInput: VerifyRunInput = {
    run: input?.run,
    mode: "replay_eligible",
    packLock: input?.packLock,
    operationContext: input?.operationContext,
    expectedOperationName: MVP_DEMO_OPERATION_NAME,
    expectedOperationVersion: MVP_DEMO_OPERATION_VERSION,
  };
  applyOptionalVerificationInputs(verificationInput, [
    ["sourceObjects", verificationSourceObjects(input, mvpDemoInput)],
    ["expectedOutputRefs", input?.expectedOutputRefs],
    ["artifactFreshnessInputs", input?.artifactFreshnessInputs],
    ["requireFreshArtifacts", input?.requireFreshArtifacts],
  ]);
  return verificationInput;
}

function applyOptionalVerificationInputs(
  verificationInput: VerifyRunInput,
  entries: readonly (readonly [OptionalVerificationKey, unknown])[],
): void {
  for (const [key, value] of entries) {
    if (value !== undefined) {
      (verificationInput as Record<OptionalVerificationKey, unknown>)[key] = value;
    }
  }
}

function replayVerifiedMvpRun(
  input: ReplayRunInput | null,
  mvpDemoInput: MvpDemoInput,
  verification: RunVerification,
): ReplayRunResult {
  try {
    const replayResult = runMvpDemo(mvpDemoInput);
    return replayResult.status !== "ok" || replayResult.output === null
      ? failedReplayResult(verification, replayResult)
      : comparedReplayResult(input?.run as Run, replayResult.output.runEnvelope, verification);
  } catch (error) {
    return unexpectedReplayFailure(verification, error);
  }
}

function failedReplayResult(
  verification: RunVerification,
  replayResult: ReturnType<typeof runMvpDemo>,
): ReplayRunResult {
  return createReplayRunResult({
    status: "error",
    replayAttempted: true,
    verification,
    replayedOutputRefs: replayResult.outputRefs,
    warnings: [...verification.warnings, ...replayResult.warnings],
    errors: [...verification.errors, ...replayResult.errors],
    provenance: replayResult.provenance,
  });
}

function comparedReplayResult(
  recordedRun: Run,
  replayedRun: Run,
  verification: RunVerification,
): ReplayRunResult {
  const mismatches = compareRecordedAndReplayedRun(recordedRun, replayedRun);
  const warnings = uniqueWarnings([
    ...verification.warnings,
    ...recordedRun.warnings,
    ...replayedRun.warnings,
  ]);
  const errors = uniqueErrors([
    ...verification.errors,
    ...recordedRun.errors,
    ...replayedRun.errors,
  ]);

  return createReplayRunResult({
    status: replayStatusForComparison(mismatches, warnings),
    replayAttempted: true,
    verification,
    replayedRun,
    replayedOutputRefs: replayedRun.outputRefs.refs,
    sourceRefsUsed: recordedRun.input === null ? [] : recordedRun.input.sourceRefs,
    mismatches,
    warnings,
    errors,
    provenance: replayedRun.provenance,
  });
}

function unexpectedReplayFailure(verification: RunVerification, error: unknown): ReplayRunResult {
  return createReplayRunResult({
    status: "error",
    replayAttempted: true,
    verification,
    warnings: verification.warnings,
    errors: [
      ...verification.errors,
      replayError(
        "InternalInvariantViolation",
        error instanceof Error ? error.message : "Unexpected MVP replay failure.",
        "runMvpDemo",
      ),
    ],
    provenance: verification.provenance,
  });
}

function replayStatusForComparison(
  mismatches: readonly ReplayMismatch[],
  warnings: readonly CoreWarning[],
): ReplayRunStatus {
  if (mismatches.length > 0) {
    return "mismatch";
  }
  return warnings.length > 0 ? "replayed_with_warnings" : "replayed";
}

function replayStatusForVerification(verification: RunVerification): ReplayRunStatus | null {
  return verification.status === "verified" || verification.status === "verified_with_warnings"
    ? null
    : VERIFICATION_REPLAY_STATUS[verification.status];
}

function createReplayRunResult(input: ReplayResultDraft): ReplayRunResult {
  const result: ReplayRunResult = {
    kind: "run-replay",
    status: input.status,
    replayAttempted: input.replayAttempted,
    replayRequired: true,
    operationName: input.verification.operationName,
    operationVersion: input.verification.operationVersion,
    recordedRunRef: input.verification.runRef,
    replayedRunRef: replayedRunRef(input.replayedRun),
    packLockRef: input.verification.packLockRef,
    operationContextRef: input.verification.operationContextRef,
    recordedOutputRefs: canonicalizeOutputRefs(input.verification.outputRefs).refs,
    replayedOutputRefs: replayedOutputRefs(input),
    sourceRefsUsed: sourceRefsUsed(input),
    mismatches: canonicalizeMismatches(input.mismatches ?? []),
    verification: input.verification,
    warnings: uniqueWarnings(input.warnings ?? []),
    errors: uniqueErrors(input.errors ?? []),
    provenance: replayProvenance(input),
    serializationSummary: {
      serializationVersion: STABLE_SERIALIZATION_VERSION,
      canonicalOrdering: true,
    },
  };

  return input.verification.artifactFreshness === undefined
    ? result
    : { ...result, artifactFreshness: input.verification.artifactFreshness };
}

function replayedRunRef(run: Run | null | undefined): RunRef | null {
  return run === null || run === undefined ? null : run.runRef;
}

function replayedOutputRefs(input: ReplayResultDraft): readonly SourceReference[] {
  return canonicalizeOutputRefs(input.replayedOutputRefs ?? []).refs;
}

function sourceRefsUsed(input: ReplayResultDraft): readonly SourceReference[] {
  return canonicalizeRefs(input.sourceRefsUsed ?? input.verification.sourceRefs);
}

function replayProvenance(input: ReplayResultDraft): Provenance | null {
  return input.provenance ?? input.verification.provenance;
}

function compareRecordedAndReplayedRun(recordedRun: Run, replayedRun: Run): readonly ReplayMismatch[] {
  const mismatches: ReplayMismatch[] = [];

  appendMismatch(mismatches, "OperationMismatch", "Recorded operation name differs from replayed operation name.", "operationName", recordedRun.operationName, replayedRun.operationName);
  appendMismatch(mismatches, "OperationMismatch", "Recorded operation version differs from replayed operation version.", "operationVersion", recordedRun.operationVersion, replayedRun.operationVersion);
  appendMismatch(mismatches, "RunRefMismatch", "Recorded run ref differs from replayed run ref.", "runRef", recordedRun.runRef, replayedRun.runRef);
  appendMismatch(mismatches, "PackLockRefMismatch", "Recorded PackLock ref differs from replayed PackLock ref.", "packLockRef", recordedRun.packLockRef, replayedRun.packLockRef);
  appendMismatch(mismatches, "OperationContextRefMismatch", "Recorded OperationContext ref differs from replayed OperationContext ref.", "operationContextRef", recordedRun.operationContextRef, replayedRun.operationContextRef);
  appendMismatch(mismatches, "OutputRefsMismatch", "Recorded output refs differ from replayed output refs.", "outputRefs", canonicalizeOutputRefs(recordedRun.outputRefs), canonicalizeOutputRefs(replayedRun.outputRefs));
  appendMismatch(mismatches, "RecordedRunMismatch", "Recorded deterministic run identity differs from replayed run identity.", "run", deterministicRunIdentity(recordedRun), deterministicRunIdentity(replayedRun));
  appendMismatch(mismatches, "DiagnosticsMismatch", "Recorded blocking or critical diagnostics differ from replayed diagnostics.", "diagnostics", deterministicDiagnostics(recordedRun), deterministicDiagnostics(replayedRun));

  return mismatches;
}

function appendMismatch(
  mismatches: ReplayMismatch[],
  code: ReplayMismatchCode,
  message: string,
  targetRef: string,
  recorded: unknown,
  replayed: unknown,
): void {
  if (sameCanonicalValue(recorded, replayed)) {
    return;
  }

  mismatches.push({
    code,
    message,
    targetRef,
    recorded,
    replayed,
  });
}

function deterministicRunIdentity(run: Run): unknown {
  return {
    kind: run.kind,
    id: run.id,
    runRef: run.runRef,
    coreVersion: run.coreVersion,
    operationName: run.operationName,
    operationVersion: run.operationVersion,
    input: canonicalRunInput(run.input),
    inputRefs: canonicalizeRefs(run.inputRefs),
    packLockRef: run.packLockRef,
    operationContextRef: run.operationContextRef,
    outputRefs: canonicalizeOutputRefs(run.outputRefs),
    provenance: run.provenance,
  };
}

function canonicalRunInput(input: Run["input"]): Run["input"] | null {
  if (input === null) {
    return null;
  }

  return {
    ...input,
    inputRefs: canonicalizeRefs(input.inputRefs),
    sourceRefs: canonicalizeRefs(input.sourceRefs),
    requestedOutputRefs: canonicalizeOutputRefs(input.requestedOutputRefs),
  };
}

function deterministicDiagnostics(run: Run): unknown {
  return {
    errors: canonicalizeErrors(run.errors),
    criticalWarnings: canonicalizeWarnings(run.warnings.filter((warning) => warning.severity === "critical")),
  };
}

function mismatchesFromVerification(verification: RunVerification): readonly ReplayMismatch[] {
  return verification.mismatchCodes.map((code) => ({
    code: "RecordedRunMismatch",
    message: `Run verification reported mismatch: ${code}.`,
    targetRef: null,
    recorded: code,
    replayed: null,
  }));
}

function verificationSourceObjects(input: ReplayRunInput | null, mvpDemoInput: MvpDemoInput | null): readonly unknown[] | undefined {
  if (input === null) {
    return undefined;
  }

  const sourceObjects = input.sourceObjects ?? [];
  return mvpDemoInput === null
    ? sourceObjects
    : [...sourceObjects, ...sourceObjectsForMvpDemoInput(mvpDemoInput)];
}

function sourceObjectsForMvpDemoInput(input: MvpDemoInput): readonly unknown[] {
  const mvpInputRef = input.sourceRefs.find((sourceRef) => sourceRef.kind === "mvp-demo-input") ?? {
    kind: "mvp-demo-input",
    ref: "mvp-demo:structured-input",
  };
  const sourceObjects: unknown[] = [
    { sourceRef: mvpInputRef, sourceObject: { ...input, id: mvpInputRef.ref } },
    { sourceRef: { kind: "surface", ref: input.surface.id }, sourceObject: input.surface },
    { sourceRef: { kind: "ratio-pack", ref: input.packRef }, sourceObject: input.ratioPack },
    {
      sourceRef: { kind: "rule-set", ref: input.ruleSetRef },
      sourceObject: input.ratioPack.ruleSets.find((ruleSet) => ruleSet.id === input.ruleSetRef),
    },
    { sourceRef: { kind: "evaluation-profile", ref: input.evaluationProfile.id }, sourceObject: input.evaluationProfile },
    { sourceRef: { kind: "tolerance-policy", ref: input.tolerancePolicy.id }, sourceObject: input.tolerancePolicy },
    { sourceRef: { kind: "evaluation-tolerances", ref: input.evaluationTolerances.id }, sourceObject: input.evaluationTolerances },
    { sourceRef: { kind: "coordinate-system", ref: input.surface.coordinateSystem.id }, sourceObject: input.surface.coordinateSystem },
  ];

  if (input.surface.metricPolicy !== undefined && input.surface.metricPolicy !== null) {
    sourceObjects.push({ sourceRef: { kind: "metric-policy", ref: input.surface.metricPolicy.id }, sourceObject: input.surface.metricPolicy });
  }

  return sourceObjects;
}

function resolveMvpDemoInput(input: ReplayRunInput): MvpDemoInput | null {
  if (isMvpDemoInput(input.mvpDemoInput)) {
    return input.mvpDemoInput;
  }

  for (const sourceObject of input.sourceObjects ?? []) {
    const payload = sourceObjectPayload(sourceObject);
    if (isMvpDemoInput(payload)) {
      return payload;
    }
  }

  return null;
}

function sourceObjectPayload(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }
  if ("sourceObject" in value) {
    return value.sourceObject;
  }
  if ("result" in value) {
    return value.result;
  }
  if ("value" in value) {
    return value.value;
  }
  return value;
}

function isMvpDemoInput(value: unknown): value is MvpDemoInput {
  return isRecord(value)
    && value.kind === "mvp-demo-input"
    && MVP_DEMO_INPUT_RECORD_FIELDS.every((field) => isRecord(value[field]))
    && MVP_DEMO_INPUT_STRING_FIELDS.every((field) => typeof value[field] === "string")
    && MVP_DEMO_INPUT_ARRAY_FIELDS.every((field) => Array.isArray(value[field]))
    && isSourceReferenceArray(value.sourceRefs);
}

function malformedMvpDemoInputTargetRef(input: ReplayRunInput | null): string | null {
  if (input === null) {
    return null;
  }
  if (isMalformedMvpDemoInput(input.mvpDemoInput)) {
    return "mvpDemoInput";
  }

  for (const sourceObject of input.sourceObjects ?? []) {
    if (isMalformedMvpDemoInput(sourceObjectPayload(sourceObject))) {
      return "sourceObjects";
    }
  }

  return null;
}

function isMalformedMvpDemoInput(value: unknown): boolean {
  return isRecord(value) && value.kind === "mvp-demo-input" && !isMvpDemoInput(value);
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value)
    && value.every((sourceRef) => (
      isRecord(sourceRef)
      && typeof sourceRef.kind === "string"
      && typeof sourceRef.ref === "string"
    ));
}

function replayError(code: DiagnosticCode, message: string, targetRef: string): CoreError {
  return {
    code,
    severity: "error",
    message,
    targetRef,
    source: REPLAY_RUN_SOURCE_REFERENCE,
    blocking: true,
    provenance: null,
  };
}

function uniqueWarnings(warnings: readonly CoreWarning[]): readonly CoreWarning[] {
  return canonicalizeWarnings(uniqueDiagnostics(warnings));
}

function uniqueErrors(errors: readonly CoreError[]): readonly CoreError[] {
  return canonicalizeErrors(uniqueDiagnostics(errors));
}

function uniqueDiagnostics<TDiagnostic extends Diagnostic>(diagnostics: readonly TDiagnostic[]): readonly TDiagnostic[] {
  const seen = new Set<string>();
  const unique: TDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const key = serializeCanonicalJson(diagnostic, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(diagnostic);
  }
  return unique;
}

function canonicalizeMismatches(mismatches: readonly ReplayMismatch[]): readonly ReplayMismatch[] {
  return [...mismatches].sort((first, second) => {
    const codeDelta = first.code.localeCompare(second.code);
    if (codeDelta !== 0) {
      return codeDelta;
    }
    return (first.targetRef ?? "").localeCompare(second.targetRef ?? "");
  });
}

function sameCanonicalValue(first: unknown, second: unknown): boolean {
  return serializeCanonicalJson(first, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(second, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
