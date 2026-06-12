import {
  verifyArtifactFreshness,
  type ArtifactFreshnessVerification,
  type VerifyArtifactFreshnessInput,
} from "./artifact-freshness.js";
import { compareRunContext, validateRunReadiness } from "./runtime.js";
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
  OperationContext,
  OperationContextRef,
  OutputRefs,
  PackLock,
  PackLockRef,
  Provenance,
  ReplayReadinessStatus,
  Run,
  RunRef,
  SourceReference,
} from "./index.js";

export type VerifyRunMode = "audit_only" | "replay_eligible";
export type VerifyRunStatus =
  | "verified"
  | "verified_with_warnings"
  | "mismatch"
  | "non_replayable"
  | "unsupported"
  | "invalid";

type VerifyRunResolvedMode = VerifyRunMode | "replay_required" | "unsupported";
type ReplayEligibility = "eligible" | "not_eligible" | "not_requested" | "unsupported" | "unknown";

export interface VerifyRunInput {
  run: unknown;
  mode?: VerifyRunMode;
  packLock?: unknown;
  operationContext?: unknown;
  sourceObjects?: readonly unknown[];
  expectedOutputRefs?: readonly SourceReference[] | OutputRefs;
  expectedOperationName?: string;
  expectedOperationVersion?: string;
  artifactFreshnessInputs?: readonly VerifyArtifactFreshnessInput[];
  requireFreshArtifacts?: boolean;
}

export interface RunVerification {
  kind: "run-verification";
  status: VerifyRunStatus;
  mode: VerifyRunResolvedMode;
  runRef: RunRef | null;
  operationName: string | null;
  operationVersion: string | null;
  packLockRef: PackLockRef | null;
  operationContextRef: OperationContextRef | null;
  sourceRefs: readonly SourceReference[];
  missingSourceRefs: readonly SourceReference[];
  outputRefs: readonly SourceReference[];
  mismatchCodes: readonly DiagnosticCode[];
  artifactFreshness?: readonly ArtifactFreshnessVerification[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: Provenance | null;
  replaySummary: {
    replayAttempted: false;
    replayRequired: false;
    replayEligible: ReplayEligibility;
    replayStatus: null;
    replayDiagnostics: readonly Diagnostic[];
    replayMismatches: readonly unknown[];
    replayOutputRefs: readonly SourceReference[];
    recordedOutputRefs: readonly SourceReference[];
    sourceRefsUsed: readonly SourceReference[];
  };
  serializationSummary?: {
    serializationVersion: string;
    canonicalOrdering: true;
  };
}

interface ResolvedMode {
  mode: VerifyRunResolvedMode;
  invalid: boolean;
  unsupported: boolean;
}

interface VerificationFacts {
  mode: VerifyRunResolvedMode;
  run: Run | null;
  packLock: PackLock | null;
  operationContext: OperationContext | null;
  sourceRefs: readonly SourceReference[];
  missingSourceRefs: readonly SourceReference[];
  outputRefs: readonly SourceReference[];
  artifactFreshness?: readonly ArtifactFreshnessVerification[];
  warnings: CoreWarning[];
  errors: CoreError[];
  invalidDiagnostics: CoreError[];
  unsupportedDiagnostics: Diagnostic[];
  mismatchDiagnostics: Diagnostic[];
  nonReplayableDiagnostics: Diagnostic[];
  runtimeReadiness: ReplayReadinessStatus | null;
}

const VERIFY_RUN_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/run-verification-v1",
});

const SUPPORTED_VERIFY_RUN_OPERATIONS = new Set<string>([
  "core.mvp-demo.run",
]);

const KNOWN_SOURCE_OBJECT_KINDS = new Set<string>([
  "comparison",
  "construction",
  "coordinate-system",
  "decision",
  "evaluation",
  "evaluation-profile",
  "evaluation-tolerances",
  "explanation",
  "measurement",
  "metric-policy",
  "rule-set",
  "tolerance-policy",
]);

export function verifyRun(input: VerifyRunInput | null | undefined): RunVerification {
  const inputRecord = isRecord(input) ? input : null;
  const mode = resolveMode(inputRecord?.mode);
  const facts = createVerificationFacts(mode.mode);

  if (inputRecord === null) {
    addError(facts, "invalid", "InvalidInputShape", "Run verification requires an input object.", "input");
    return createRunVerification(facts);
  }

  if (mode.invalid) {
    addError(facts, "invalid", "InvalidInputShape", "VerifyRun mode must be audit_only or replay_eligible.", "mode");
  } else if (mode.unsupported) {
    addError(facts, "unsupported", "UnsupportedOperation", "Requested verifyRun mode is not implemented.", "mode");
  }

  const runInspection = inspectRun(inputRecord.run);
  facts.run = runInspection.run;
  for (const error of runInspection.errors) {
    addExistingError(facts, "invalid", error);
  }

  if (facts.run !== null) {
    facts.sourceRefs = facts.run.input === null ? [] : canonicalizeRefs(facts.run.input.sourceRefs);
    facts.outputRefs = canonicalizeOutputRefs(facts.run.outputRefs).refs;
    facts.warnings.push(...facts.run.warnings);
    facts.errors.push(...facts.run.errors);
    facts.mismatchDiagnostics.push(...facts.run.errors);
    validateRunCompleteness(facts);
    validateOperationSupport(facts);
    validateRunInternalRefs(facts);
  }

  const packLockInspection = inspectOptionalPackLock(inputRecord);
  if (packLockInspection.invalid !== null) {
    addExistingError(facts, "invalid", packLockInspection.invalid);
  }
  facts.packLock = packLockInspection.packLock;

  const operationContextInspection = inspectOptionalOperationContext(inputRecord);
  if (operationContextInspection.invalid !== null) {
    addExistingError(facts, "invalid", operationContextInspection.invalid);
  }
  facts.operationContext = operationContextInspection.operationContext;

  validatePackLockConsistency(facts, packLockInspection.supplied);
  validateOperationContextConsistency(facts, operationContextInspection.supplied);
  validateExpectedOperation(facts, inputRecord);
  validateExpectedOutputRefs(facts, inputRecord);
  validateSourceObjects(facts, inputRecord);
  validateArtifactFreshness(facts, inputRecord);
  useRuntimeReadinessHelpers(facts, packLockInspection.supplied, operationContextInspection.supplied);

  return createRunVerification(facts);
}

function createVerificationFacts(mode: VerifyRunResolvedMode): VerificationFacts {
  return {
    mode,
    run: null,
    packLock: null,
    operationContext: null,
    sourceRefs: [],
    missingSourceRefs: [],
    outputRefs: [],
    warnings: [],
    errors: [],
    invalidDiagnostics: [],
    unsupportedDiagnostics: [],
    mismatchDiagnostics: [],
    nonReplayableDiagnostics: [],
    runtimeReadiness: null,
  };
}

function resolveMode(mode: unknown): ResolvedMode {
  if (mode === undefined) {
    return { mode: "audit_only", invalid: false, unsupported: false };
  }

  if (mode === "audit_only" || mode === "replay_eligible") {
    return { mode, invalid: false, unsupported: false };
  }

  if (mode === "replay_required") {
    return { mode: "replay_required", invalid: false, unsupported: true };
  }

  if (typeof mode === "string") {
    return { mode: "unsupported", invalid: false, unsupported: true };
  }

  return { mode: "unsupported", invalid: true, unsupported: false };
}

function inspectRun(value: unknown): { run: Run | null; errors: readonly CoreError[] } {
  if (!isRecord(value)) {
    return {
      run: null,
      errors: [verificationError("MissingRun", "Run must be a recorded run object.", "run")],
    };
  }

  const errors: CoreError[] = [];
  if (value.kind !== "run" || !nonEmptyString(value.id) || !isRef(value.runRef)) {
    errors.push(verificationError("MissingRun", "Run envelope is malformed.", "run"));
  }
  if (!nonEmptyString(value.operationName)) {
    errors.push(verificationError("MissingRunInput", "Run operation name is required.", "operationName"));
  }
  if (!nonEmptyString(value.operationVersion)) {
    errors.push(verificationError("MissingRunInput", "Run operation version is required.", "operationVersion"));
  }
  if (!isRef(value.packLockRef)) {
    errors.push(verificationError("MissingPackLock", "Run PackLock ref is malformed.", "packLockRef"));
  }
  if (!isRef(value.operationContextRef)) {
    errors.push(verificationError("MissingOperationContext", "Run OperationContext ref is malformed.", "operationContextRef"));
  }
  if (!isOutputRefs(value.outputRefs)) {
    errors.push(verificationError("InvalidInputShape", "Run outputRefs are malformed.", "outputRefs"));
  }
  if (!Array.isArray(value.inputRefs) || !value.inputRefs.every(isSourceReference)) {
    errors.push(verificationError("InvalidInputShape", "Run inputRefs are malformed.", "inputRefs"));
  }
  if (value.input !== null && !isRunInput(value.input)) {
    errors.push(verificationError("InvalidInputShape", "Run input is malformed.", "input"));
  }
  if (!Array.isArray(value.warnings) || !value.warnings.every(isCoreWarning)) {
    errors.push(verificationError("InvalidInputShape", "Run warnings are malformed.", "warnings"));
  }
  if (!Array.isArray(value.errors) || !value.errors.every(isCoreError)) {
    errors.push(verificationError("InvalidInputShape", "Run errors are malformed.", "errors"));
  }
  if ("provenance" in value && value.provenance !== null && value.provenance !== undefined && !isProvenance(value.provenance)) {
    errors.push(verificationError("InvalidInputShape", "Run provenance is malformed.", "provenance"));
  }

  return errors.length === 0
    ? { run: value as unknown as Run, errors: [] }
    : { run: null, errors };
}

function validateRunCompleteness(facts: VerificationFacts): void {
  const run = facts.run;
  if (run === null) {
    return;
  }

  if (run.input === null) {
    addMissingDependency(facts, "MissingRunInput", "Run input is missing.", "run.input");
  } else if (run.input.sourceRefs.length === 0) {
    addMissingDependency(facts, "MissingSource", "Run input has no visible source refs.", "run.input.sourceRefs");
  }

  if (facts.outputRefs.length === 0) {
    addMissingDependency(facts, "MissingOutputRefs", "Run output refs are missing.", "run.outputRefs");
  }

  if (!isProvenance(run.provenance)) {
    addMissingDependency(facts, "MissingProvenance", "Run provenance is missing.", "run.provenance");
  }
}

function validateOperationSupport(facts: VerificationFacts): void {
  const operationName = facts.run?.operationName ?? null;
  if (operationName === null || SUPPORTED_VERIFY_RUN_OPERATIONS.has(operationName)) {
    return;
  }

  addError(facts, "unsupported", "UnsupportedOperation", "verifyRun supports the MVP demo run in PR21.", "operationName");
}

function validateRunInternalRefs(facts: VerificationFacts): void {
  const run = facts.run;
  if (run === null || run.input === null) {
    return;
  }

  if (run.input.packLockRef.id !== run.packLockRef.id) {
    addError(facts, "mismatch", "PackContentIdentityMismatch", "Run input PackLock ref does not match the run envelope PackLock ref.", "run.input.packLockRef");
  }
  if (run.input.operationContextRef.id !== run.operationContextRef.id) {
    addWarning(facts, "mismatch", "OperationVersionMismatch", "Run input OperationContext ref does not match the run envelope OperationContext ref.", "run.input.operationContextRef");
  }
  if (!sameSourceRefs(run.inputRefs, run.input.inputRefs)) {
    addError(facts, "mismatch", "MissingSource", "Run inputRefs do not match RunInput inputRefs.", "run.inputRefs");
  }
  if (!sameOutputRefs(run.outputRefs, run.input.requestedOutputRefs)) {
    addError(facts, "mismatch", "MissingOutputRefs", "Run requested output refs do not match the run envelope output refs.", "run.input.requestedOutputRefs");
  }
}

function inspectOptionalPackLock(input: Readonly<Record<string, unknown>>): {
  supplied: boolean;
  packLock: PackLock | null;
  invalid: CoreError | null;
} {
  if (!("packLock" in input) || input.packLock === undefined || input.packLock === null) {
    return { supplied: false, packLock: null, invalid: null };
  }

  return isPackLock(input.packLock)
    ? { supplied: true, packLock: input.packLock, invalid: null }
    : {
      supplied: true,
      packLock: null,
      invalid: verificationError("InvalidPackLock", "Supplied PackLock is malformed.", "packLock"),
    };
}

function inspectOptionalOperationContext(input: Readonly<Record<string, unknown>>): {
  supplied: boolean;
  operationContext: OperationContext | null;
  invalid: CoreError | null;
} {
  if (!("operationContext" in input) || input.operationContext === undefined || input.operationContext === null) {
    return { supplied: false, operationContext: null, invalid: null };
  }

  return isOperationContext(input.operationContext)
    ? { supplied: true, operationContext: input.operationContext, invalid: null }
    : {
      supplied: true,
      operationContext: null,
      invalid: verificationError("InvalidOperationContext", "Supplied OperationContext is malformed.", "operationContext"),
    };
}

function validatePackLockConsistency(facts: VerificationFacts, supplied: boolean): void {
  const run = facts.run;
  if (run === null) {
    return;
  }

  if (facts.packLock === null) {
    if (supplied) {
      return;
    }
    addMissingDependency(facts, "MissingPackLock", "PackLock object was not supplied for run verification.", "packLock");
    return;
  }

  if (facts.packLock.ref.id !== run.packLockRef.id) {
    addError(facts, "mismatch", "PackContentIdentityMismatch", "Supplied PackLock ref does not match the recorded run PackLock ref.", "packLockRef");
  }
  if (!run.packLockRef.id.includes(facts.packLock.contentIdentity)) {
    addError(facts, "mismatch", "PackContentIdentityMismatch", "Supplied PackLock content identity does not match the recorded run PackLock ref identity.", "packLock.contentIdentity");
  }
}

function validateOperationContextConsistency(facts: VerificationFacts, supplied: boolean): void {
  const run = facts.run;
  const context = facts.operationContext;
  if (run === null) {
    return;
  }

  if (context === null) {
    if (supplied) {
      return;
    }
    addMissingDependency(facts, "MissingOperationContext", "OperationContext object was not supplied for run verification.", "operationContext");
    return;
  }

  if (context.ref.id !== run.operationContextRef.id) {
    addWarning(facts, "mismatch", "OperationVersionMismatch", "Supplied OperationContext ref does not match the recorded run OperationContext ref.", "operationContextRef");
  }
  if (context.operationName !== run.operationName) {
    addWarning(facts, "mismatch", "OperationVersionMismatch", "Supplied OperationContext operation name does not match the recorded run.", "operationName");
  }
  if (context.operationVersion !== run.operationVersion) {
    addWarning(facts, "mismatch", "OperationVersionMismatch", "Supplied OperationContext operation version does not match the recorded run.", "operationVersion");
  }
  validateOperationContextPolicyConsistency(facts, context, run);
}

function validateOperationContextPolicyConsistency(
  facts: VerificationFacts,
  context: OperationContext,
  run: Run,
): void {
  if (run.input === null) {
    return;
  }

  if (context.geometryModelVersion !== "geometry-v1") {
    addWarning(facts, "mismatch", "GeometryModelVersionMismatch", "Supplied OperationContext geometry model version is outside the recorded MVP run boundary.", "geometryModelVersion");
  }
  compareRuntimePolicy(facts, context.coordinatePolicy, run.input.explicitPolicies.coordinatePolicy, "CoordinatePolicyMismatch", "coordinatePolicy");
  compareRuntimePolicy(facts, context.metricPolicy, run.input.explicitPolicies.metricPolicy, "MetricPolicyMismatch", "metricPolicy");
  compareRuntimePolicy(facts, context.tolerancePolicy, run.input.explicitPolicies.tolerancePolicy, "TolerancePolicyMismatch", "tolerancePolicy");
  compareRuntimePolicy(facts, context.roundingPolicy, run.input.explicitPolicies.roundingPolicy, "OperationVersionMismatch", "roundingPolicy");
  compareRuntimePolicy(facts, context.numericPolicy, run.input.explicitPolicies.numericPolicy, "OperationVersionMismatch", "numericPolicy");
  compareRuntimePolicy(facts, context.orderingPolicy, run.input.explicitPolicies.orderingPolicy, "OperationVersionMismatch", "orderingPolicy");

  if (!sameCanonicalValue(context.featureFlags, run.input.featureFlags)) {
    addWarning(facts, "mismatch", "FeatureFlagsMismatch", "Supplied OperationContext feature flags do not match recorded run input feature flags.", "featureFlags");
  }
}

function compareRuntimePolicy(
  facts: VerificationFacts,
  contextPolicy: unknown,
  runPolicy: unknown,
  code: DiagnosticCode,
  targetRef: string,
): void {
  if (!sameCanonicalValue(runtimePolicyValue(contextPolicy), runtimePolicyValue(runPolicy))) {
    addWarning(facts, "mismatch", code, `Supplied OperationContext ${targetRef} does not match recorded run input ${targetRef}.`, targetRef);
  }
}

function validateExpectedOperation(facts: VerificationFacts, input: Readonly<Record<string, unknown>>): void {
  const run = facts.run;
  if (run === null) {
    return;
  }

  if ("expectedOperationName" in input && input.expectedOperationName !== undefined) {
    if (!nonEmptyString(input.expectedOperationName)) {
      addError(facts, "invalid", "InvalidInputShape", "Expected operation name must be a non-empty string.", "expectedOperationName");
    } else if (input.expectedOperationName !== run.operationName) {
      addWarning(facts, "mismatch", "OperationVersionMismatch", "Expected operation name does not match the recorded run.", "expectedOperationName");
    }
  }

  if ("expectedOperationVersion" in input && input.expectedOperationVersion !== undefined) {
    if (!nonEmptyString(input.expectedOperationVersion)) {
      addError(facts, "invalid", "InvalidInputShape", "Expected operation version must be a non-empty string.", "expectedOperationVersion");
    } else if (input.expectedOperationVersion !== run.operationVersion) {
      addWarning(facts, "mismatch", "OperationVersionMismatch", "Expected operation version does not match the recorded run.", "expectedOperationVersion");
    }
  }
}

function validateExpectedOutputRefs(facts: VerificationFacts, input: Readonly<Record<string, unknown>>): void {
  if (facts.run === null || !("expectedOutputRefs" in input) || input.expectedOutputRefs === undefined) {
    return;
  }

  if (!isOutputRefsInput(input.expectedOutputRefs)) {
    addError(facts, "invalid", "InvalidInputShape", "Expected output refs are malformed.", "expectedOutputRefs");
    return;
  }

  if (!sameOutputRefs(facts.run.outputRefs, input.expectedOutputRefs)) {
    addError(facts, "mismatch", "MissingOutputRefs", "Expected output refs do not match the recorded run output refs.", "expectedOutputRefs");
  }
}

function validateSourceObjects(facts: VerificationFacts, input: Readonly<Record<string, unknown>>): void {
  if ("sourceObjects" in input && input.sourceObjects !== undefined && !Array.isArray(input.sourceObjects)) {
    addError(facts, "invalid", "InvalidInputShape", "sourceObjects must be an array.", "sourceObjects");
    return;
  }

  const sourceObjects = Array.isArray(input.sourceObjects) ? input.sourceObjects : [];
  const availableRefs = new Set<string>();
  for (const sourceObject of sourceObjects) {
    if (isArtifactLike(sourceObject)) {
      addError(
        facts,
        "invalid",
        "ArtifactWouldBecomeSourceOfTruth",
        "Artifacts cannot be used as run source truth.",
        artifactRefTarget(sourceObject),
        { kind: "artifact", ref: artifactRefTarget(sourceObject) },
      );
      continue;
    }

    for (const sourceRef of refsForSourceObject(sourceObject)) {
      availableRefs.add(refKey(sourceRef));
    }
  }

  if (facts.mode !== "replay_eligible" || facts.run === null) {
    return;
  }

  facts.missingSourceRefs = facts.sourceRefs.filter((sourceRef) => !availableRefs.has(refKey(sourceRef)));
  if (facts.missingSourceRefs.length > 0) {
    addError(facts, "non_replayable", "MissingSource", "Replay eligibility requires visible structured source objects for each run source ref.", "sourceObjects");
  }
}

function validateArtifactFreshness(facts: VerificationFacts, input: Readonly<Record<string, unknown>>): void {
  if (!("artifactFreshnessInputs" in input) || input.artifactFreshnessInputs === undefined) {
    return;
  }

  if (!Array.isArray(input.artifactFreshnessInputs)) {
    addError(facts, "invalid", "InvalidInputShape", "artifactFreshnessInputs must be an array.", "artifactFreshnessInputs");
    return;
  }

  const requireFreshArtifacts = input.requireFreshArtifacts === true;
  const freshnessResults = input.artifactFreshnessInputs.map((freshnessInput) => verifyArtifactFreshness(freshnessInput));
  facts.artifactFreshness = freshnessResults;

  for (const freshness of freshnessResults) {
    facts.warnings.push(...freshness.warnings);

    if (freshness.status === "invalid") {
      for (const error of freshness.errors) {
        addExistingError(facts, "invalid", error);
      }
      continue;
    }

    if (requireFreshArtifacts && freshness.status === "stale") {
      for (const warning of freshness.warnings) {
        facts.mismatchDiagnostics.push(warning);
      }
      if (!freshness.warnings.some((warning) => warning.code === "ArtifactStale")) {
        addWarning(facts, "mismatch", "ArtifactStale", "Required artifact freshness is stale.", freshness.artifactRef?.ref ?? "artifact");
      }
      continue;
    }

    if (requireFreshArtifacts && freshness.status === "non_replayable") {
      for (const error of freshness.errors) {
        facts.nonReplayableDiagnostics.push(error);
      }
      if (freshness.errors.length === 0) {
        addError(facts, "non_replayable", "ArtifactNonReplayable", "Required artifact is non-replayable.", freshness.artifactRef?.ref ?? "artifact");
      }
      continue;
    }

    if (freshness.status === "lossy" || freshness.status === "stale" || freshness.status === "non_replayable") {
      if (freshness.status === "non_replayable") {
        addWarning(facts, "warning", "ArtifactNonReplayable", "Artifact freshness is non-replayable but not required for this verification.", freshness.artifactRef?.ref ?? "artifact");
      } else if (freshness.warnings.length === 0 && freshness.errors.length === 0) {
        addWarning(facts, "warning", "ArtifactStale", "Artifact freshness is not current.", freshness.artifactRef?.ref ?? "artifact");
      }
    }
  }
}

function useRuntimeReadinessHelpers(
  facts: VerificationFacts,
  packLockSupplied: boolean,
  operationContextSupplied: boolean,
): void {
  const run = facts.run;
  if (run === null) {
    return;
  }

  const comparison = (packLockSupplied || operationContextSupplied)
    ? compareRunContext({
      expectedPackLock: run.packLockRef,
      actualPackLock: facts.packLock ?? run.packLockRef,
      expectedOperationContext: run.operationContextRef,
      actualOperationContext: facts.operationContext ?? run.operationContextRef,
    }).output
    : null;

  if (comparison?.status === "mismatch") {
    for (const warning of comparison.warnings) {
      addExistingWarning(facts, "mismatch", warning);
    }
    for (const error of comparison.errors) {
      addExistingError(facts, "mismatch", error);
    }
  }

  const readiness = validateRunReadiness({
    run,
    packLock: facts.packLock,
    operationContext: facts.operationContext,
    comparison,
  });
  facts.runtimeReadiness = readiness.output;
}

function createRunVerification(facts: VerificationFacts): RunVerification {
  const status = statusForVerification(facts);
  const warnings = canonicalizeWarnings(uniqueDiagnostics(facts.warnings));
  const errors = canonicalizeErrors(uniqueDiagnostics(facts.errors));
  const outputRefs = canonicalizeOutputRefs(facts.outputRefs).refs;
  const sourceRefs = canonicalizeRefs(facts.sourceRefs);
  const missingSourceRefs = canonicalizeRefs(facts.missingSourceRefs);
  const mismatchCodes = canonicalizeDiagnosticCodes(facts.mismatchDiagnostics);
  const verification: RunVerification = {
    kind: "run-verification",
    status,
    mode: facts.mode,
    runRef: facts.run?.runRef ?? null,
    operationName: facts.run?.operationName ?? null,
    operationVersion: facts.run?.operationVersion ?? null,
    packLockRef: facts.run?.packLockRef ?? facts.packLock?.ref ?? null,
    operationContextRef: facts.run?.operationContextRef ?? facts.operationContext?.ref ?? null,
    sourceRefs,
    missingSourceRefs,
    outputRefs,
    mismatchCodes,
    warnings,
    errors,
    provenance: facts.run?.provenance ?? null,
    replaySummary: {
      replayAttempted: false,
      replayRequired: false,
      replayEligible: replayEligibilityFor(status, facts),
      replayStatus: null,
      replayDiagnostics: [],
      replayMismatches: [],
      replayOutputRefs: [],
      recordedOutputRefs: outputRefs,
      sourceRefsUsed: sourceRefs,
    },
    serializationSummary: {
      serializationVersion: STABLE_SERIALIZATION_VERSION,
      canonicalOrdering: true,
    },
  };

  return facts.artifactFreshness === undefined
    ? verification
    : { ...verification, artifactFreshness: facts.artifactFreshness };
}

function statusForVerification(facts: VerificationFacts): VerifyRunStatus {
  // Priority is intentional: malformed input, unsupported scope, explicit conflicts,
  // missing replay dependencies, warnings, then clean inspection success.
  if (facts.invalidDiagnostics.length > 0) {
    return "invalid";
  }
  if (facts.unsupportedDiagnostics.length > 0) {
    return "unsupported";
  }
  if (facts.mismatchDiagnostics.length > 0) {
    return "mismatch";
  }
  if (facts.mode === "replay_eligible" && facts.nonReplayableDiagnostics.length > 0) {
    return "non_replayable";
  }
  if (facts.warnings.length > 0) {
    return "verified_with_warnings";
  }
  return "verified";
}

function replayEligibilityFor(status: VerifyRunStatus, facts: VerificationFacts): ReplayEligibility {
  if (status === "invalid") {
    return "unknown";
  }
  if (status === "unsupported" || facts.mode === "replay_required" || facts.mode === "unsupported") {
    return "unsupported";
  }
  if (facts.mode !== "replay_eligible") {
    return "not_requested";
  }
  if (status === "verified" || status === "verified_with_warnings") {
    return facts.runtimeReadiness === "mismatch" || facts.runtimeReadiness === "non_replayable"
      ? "not_eligible"
      : "eligible";
  }
  return "not_eligible";
}

function addMissingDependency(
  facts: VerificationFacts,
  code: DiagnosticCode,
  message: string,
  targetRef: string,
): void {
  if (facts.mode === "replay_eligible") {
    addError(facts, "non_replayable", code, message, targetRef);
    return;
  }

  addWarning(facts, "warning", code, message, targetRef);
}

function addError(
  facts: VerificationFacts,
  category: "invalid" | "unsupported" | "mismatch" | "non_replayable",
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  source: SourceReference = VERIFY_RUN_SOURCE_REFERENCE,
  provenance: Provenance | null = null,
): void {
  addExistingError(facts, category, verificationError(code, message, targetRef, source, provenance));
}

function addWarning(
  facts: VerificationFacts,
  category: "mismatch" | "warning",
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  source: SourceReference = VERIFY_RUN_SOURCE_REFERENCE,
  provenance: Provenance | null = null,
): void {
  addExistingWarning(facts, category, verificationWarning(code, message, targetRef, source, provenance));
}

function addExistingError(
  facts: VerificationFacts,
  category: "invalid" | "unsupported" | "mismatch" | "non_replayable",
  error: CoreError,
): void {
  facts.errors.push(error);
  if (category === "invalid") {
    facts.invalidDiagnostics.push(error);
  } else if (category === "unsupported") {
    facts.unsupportedDiagnostics.push(error);
  } else if (category === "mismatch") {
    facts.mismatchDiagnostics.push(error);
  } else {
    facts.nonReplayableDiagnostics.push(error);
  }
}

function addExistingWarning(
  facts: VerificationFacts,
  category: "mismatch" | "warning",
  warning: CoreWarning,
): void {
  facts.warnings.push(warning);
  if (category === "mismatch") {
    facts.mismatchDiagnostics.push(warning);
  }
}

function verificationError(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  source: SourceReference = VERIFY_RUN_SOURCE_REFERENCE,
  provenance: Provenance | null = null,
): CoreError {
  return {
    code,
    severity: "error",
    message,
    targetRef,
    source,
    blocking: true,
    provenance,
  };
}

function verificationWarning(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  source: SourceReference = VERIFY_RUN_SOURCE_REFERENCE,
  provenance: Provenance | null = null,
): CoreWarning {
  return {
    code,
    severity: "warning",
    message,
    targetRef,
    source,
    blocking: false,
    provenance,
  };
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

function canonicalizeDiagnosticCodes(diagnostics: readonly Diagnostic[]): readonly DiagnosticCode[] {
  const codes = [...canonicalizeErrors(uniqueDiagnostics(diagnostics.filter(isCoreError))), ...canonicalizeWarnings(uniqueDiagnostics(diagnostics.filter(isCoreWarning)))]
    .map((diagnostic) => diagnostic.code);
  return [...new Set(codes)].sort((first, second) => first.localeCompare(second));
}

function sameOutputRefs(first: readonly SourceReference[] | OutputRefs, second: readonly SourceReference[] | OutputRefs): boolean {
  return serializeCanonicalJson(canonicalizeOutputRefs(first), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(canonicalizeOutputRefs(second), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function sameSourceRefs(first: readonly SourceReference[], second: readonly SourceReference[]): boolean {
  return serializeCanonicalJson(canonicalizeRefs(first), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(canonicalizeRefs(second), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function sameCanonicalValue(first: unknown, second: unknown): boolean {
  return serializeCanonicalJson(first, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(second, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function refsForSourceObject(value: unknown): readonly SourceReference[] {
  if (!isRecord(value)) {
    return [];
  }

  if (isSourceReference(value.sourceRef)) {
    const sourceRef = value.sourceRef;
    const payload = sourceObjectPayload(value);
    return refsForStructuredSourceObject(payload).some((candidateRef) => refKey(candidateRef) === refKey(sourceRef))
      ? [sourceRef]
      : [];
  }

  return refsForStructuredSourceObject(value);
}

function sourceObjectPayload(value: Readonly<Record<string, unknown>>): unknown {
  if ("sourceObject" in value) {
    return value.sourceObject;
  }
  if ("result" in value) {
    return value.result;
  }
  if ("value" in value) {
    return value.value;
  }
  return null;
}

function refsForStructuredSourceObject(value: unknown): readonly SourceReference[] {
  if (!isRecord(value)) {
    return [];
  }

  if (isCoreResultObject(value)) {
    return value.outputRefs;
  }
  if (value.kind === "pack-lock" && nonEmptyString(value.id)) {
    return [{ kind: "pack-lock", ref: value.id }];
  }
  if (value.kind === "operation-context" && nonEmptyString(value.id)) {
    return [{ kind: "operation-context", ref: value.id }];
  }
  if (value.kind === "mvp-demo-input" && nonEmptyString(value.id)) {
    return [{ kind: "mvp-demo-input", ref: value.id }];
  }
  if (value.kind === "surface-space" && nonEmptyString(value.id)) {
    return [{ kind: "surface", ref: value.id }];
  }
  if (value.kind === "ratio-pack" && nonEmptyString(value.id) && nonEmptyString(value.version)) {
    return [{ kind: "ratio-pack", ref: `${value.id}@${value.version}` }];
  }
  if (isKnownSourceObjectKind(value.kind) && nonEmptyString(value.id)) {
    return [{ kind: value.kind, ref: value.id }];
  }

  return [];
}

function runtimePolicyValue(value: unknown): unknown {
  return isRecord(value) && "value" in value ? value.value : null;
}

function isKnownSourceObjectKind(value: unknown): value is string {
  return typeof value === "string" && KNOWN_SOURCE_OBJECT_KINDS.has(value);
}

function isCoreResultObject(value: Readonly<Record<string, unknown>>): value is Readonly<Record<string, unknown>> & {
  outputRefs: readonly SourceReference[];
} {
  return typeof value.status === "string"
    && Array.isArray(value.warnings)
    && Array.isArray(value.errors)
    && Array.isArray(value.outputRefs)
    && value.outputRefs.every(isSourceReference)
    && "output" in value
    && "provenance" in value;
}

function isArtifactLike(value: unknown): boolean {
  return isRecord(value) && (
    value.kind === "artifact"
    || ("artifactType" in value && "derived" in value && "sourceRefs" in value && "outputRefs" in value)
  );
}

function artifactRefTarget(value: unknown): string {
  return isRecord(value) && nonEmptyString(value.id) ? value.id : "artifact";
}

function isPackLock(value: unknown): value is PackLock {
  return isRecord(value)
    && value.kind === "pack-lock"
    && nonEmptyString(value.id)
    && isRef(value.ref)
    && value.id === value.ref.id
    && nonEmptyString(value.coreVersion)
    && nonEmptyString(value.packId)
    && nonEmptyString(value.packVersion)
    && nonEmptyString(value.packSchemaVersion)
    && nonEmptyString(value.contentIdentity)
    && Array.isArray(value.sourceRefs)
    && value.sourceRefs.every(isSourceReference)
    && isProvenance(value.provenance)
    && value.status === "effective_pr11";
}

function isOperationContext(value: unknown): value is OperationContext {
  return isRecord(value)
    && value.kind === "operation-context"
    && nonEmptyString(value.id)
    && isRef(value.ref)
    && value.id === value.ref.id
    && nonEmptyString(value.coreVersion)
    && nonEmptyString(value.operationName)
    && nonEmptyString(value.operationVersion)
    && nonEmptyString(value.geometryModelVersion)
    && isRuntimePolicy(value.coordinatePolicy)
    && isRuntimePolicy(value.metricPolicy)
    && isRuntimePolicy(value.tolerancePolicy)
    && isRuntimePolicy(value.roundingPolicy)
    && isRuntimePolicy(value.numericPolicy)
    && isRuntimePolicy(value.orderingPolicy)
    && isBooleanRecord(value.featureFlags)
    && Array.isArray(value.sourceRefs)
    && value.sourceRefs.every(isSourceReference)
    && isProvenance(value.provenance);
}

function isRuntimePolicy(value: unknown): boolean {
  return isRecord(value)
    && "value" in value
    && typeof value.explicit === "boolean"
    && Array.isArray(value.sourceRefs)
    && value.sourceRefs.every(isSourceReference);
}

function isRunInput(value: unknown): value is Run["input"] {
  return isRecord(value)
    && value.kind === "run-input"
    && nonEmptyString(value.id)
    && Array.isArray(value.inputRefs)
    && value.inputRefs.every(isSourceReference)
    && Array.isArray(value.sourceRefs)
    && value.sourceRefs.every(isSourceReference)
    && isRef(value.packLockRef)
    && isRef(value.operationContextRef)
    && isOutputRefs(value.requestedOutputRefs)
    && isRecord(value.explicitPolicies)
    && isBooleanRecord(value.featureFlags);
}

function isOutputRefsInput(value: unknown): value is readonly SourceReference[] | OutputRefs {
  return isSourceReferenceArray(value) || isOutputRefs(value);
}

function isOutputRefs(value: unknown): value is OutputRefs {
  return isRecord(value)
    && value.kind === "output-refs"
    && Array.isArray(value.refs)
    && value.refs.every(isSourceReference);
}

function isCoreWarning(value: unknown): value is CoreWarning {
  return isDiagnostic(value)
    && (value.severity === "info" || value.severity === "warning" || value.severity === "critical");
}

function isCoreError(value: unknown): value is CoreError {
  return isDiagnostic(value)
    && (value.severity === "error" || value.severity === "fatal")
    && value.blocking === true;
}

function isDiagnostic(value: unknown): value is Diagnostic {
  return isRecord(value)
    && typeof value.code === "string"
    && typeof value.severity === "string"
    && typeof value.message === "string"
    && (typeof value.targetRef === "string" || value.targetRef === null)
    && isSourceReference(value.source)
    && typeof value.blocking === "boolean"
    && (value.provenance === null || isProvenance(value.provenance));
}

function isProvenance(value: unknown): value is Provenance {
  return isRecord(value)
    && typeof value.operationName === "string"
    && typeof value.operationVersion === "string"
    && isSourceReferenceArray(value.inputRefs)
    && isSourceReference(value.source);
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value)
    && nonEmptyString(value.kind)
    && nonEmptyString(value.ref);
}

function isRef(value: unknown): value is RunRef & PackLockRef & OperationContextRef {
  return isRecord(value) && nonEmptyString(value.id);
}

function isBooleanRecord(value: unknown): value is Readonly<Record<string, boolean>> {
  return isRecord(value) && Object.values(value).every((flag) => typeof flag === "boolean");
}

function refKey(ref: SourceReference): string {
  return `${ref.kind}:${ref.ref}`;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
