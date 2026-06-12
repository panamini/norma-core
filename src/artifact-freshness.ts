import type {
  CoreError,
  CoreWarning,
  DiagnosticCode,
  OperationContextRef,
  OutputRefs,
  Provenance,
  RunRef,
  SourceReference,
} from "./index.js";
import { ARTIFACT_TYPES, type Artifact, validateArtifact } from "./artifacts.js";
import {
  canonicalizeErrors,
  canonicalizeOutputRefs,
  canonicalizeRefs,
  canonicalizeWarnings,
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
  STABLE_SERIALIZATION_VERSION,
} from "./serialization.js";

export type ArtifactFreshnessStatus = "current" | "lossy" | "stale" | "non_replayable" | "invalid";

export interface VerifyArtifactFreshnessInput {
  artifact: unknown;
  sourceObjects?: readonly unknown[];
  expectedSourceRefs?: readonly SourceReference[];
  expectedOutputRefs?: readonly SourceReference[] | OutputRefs;
  expectedRunRef?: RunRef | null;
  expectedOptions?: unknown;
  expectedOperationContextRef?: OperationContextRef | null;
}

export interface ArtifactFreshnessVerification {
  kind: "artifact-freshness-verification";
  status: ArtifactFreshnessStatus;
  artifactRef: SourceReference | null;
  sourceRefs: readonly SourceReference[];
  missingSourceRefs: readonly SourceReference[];
  staleSourceRefs: readonly SourceReference[];
  outputRefs: readonly SourceReference[];
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: Provenance | null;
  serializationSummary?: {
    serializationVersion: string;
    canonicalOrdering: true;
  };
}

interface ArtifactFreshnessDraft {
  status: ArtifactFreshnessStatus;
  artifactRef: SourceReference | null;
  sourceRefs: readonly SourceReference[];
  missingSourceRefs?: readonly SourceReference[];
  staleSourceRefs?: readonly SourceReference[];
  outputRefs: readonly SourceReference[];
  warnings?: readonly CoreWarning[];
  errors?: readonly CoreError[];
  provenance: Provenance | null;
}

interface VisibleArtifactDiagnostics {
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
}

interface SourceCoverage {
  missingSourceRefs: readonly SourceReference[];
  errors: readonly CoreError[];
}

const ARTIFACT_FRESHNESS_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/artifact-freshness-v1",
});

const NON_REPLAYABLE_VALIDATION_CODES = new Set<DiagnosticCode>([
  "MissingArtifactSourceRefs",
  "MissingArtifactProvenance",
  "MissingArtifactOptions",
]);

export function verifyArtifactFreshness(input: VerifyArtifactFreshnessInput | null | undefined): ArtifactFreshnessVerification {
  if (!isRecord(input)) {
    return createArtifactFreshnessVerification({
      status: "invalid",
      artifactRef: null,
      sourceRefs: [],
      outputRefs: [],
      errors: [invalidArtifactInput("input", "Artifact freshness verification requires an input object.")],
      provenance: null,
    });
  }

  const artifactInput = input.artifact;
  const visibleDiagnostics = visibleArtifactDiagnostics(artifactInput);
  const shapeErrors = artifactShapeErrors(artifactInput);
  const validation = validateArtifact(artifactInput);

  if (validation.output === null || validation.status !== "ok" || shapeErrors.length > 0) {
    const validationErrors = validationErrorsFor(validation.errors, shapeErrors);
    const errors = uniqueDiagnostics([
      ...visibleDiagnostics.errors,
      ...validationErrors,
      ...shapeErrors,
    ]);
    return createArtifactFreshnessVerification({
      status: validationFailureStatus(errors),
      artifactRef: artifactRefFromUnknown(artifactInput),
      sourceRefs: sourceRefsFromUnknown(artifactInput),
      outputRefs: outputRefsFromUnknown(artifactInput),
      warnings: uniqueDiagnostics([
        ...visibleDiagnostics.warnings,
        ...validation.warnings,
      ]),
      errors,
      provenance: provenanceFromUnknown(artifactInput),
    });
  }

  const artifact = validation.output;
  const sourceObjectInputErrors = sourceObjectsInputErrors(input);
  const sourceCoverage = verifySourceCoverage(artifact.sourceRefs, sourceObjectsFromInput(input));
  const staleWarnings: CoreWarning[] = [];
  const staleSourceRefs: SourceReference[] = [];
  const comparisonErrors = appendExpectedMismatches(input, artifact, staleWarnings, staleSourceRefs);
  const nonReplayableErrors = nonReplayableErrorsFor(artifact, sourceCoverage.missingSourceRefs);
  const errors = uniqueDiagnostics([
    ...artifact.errors,
    ...sourceObjectInputErrors,
    ...sourceCoverage.errors,
    ...comparisonErrors,
    ...nonReplayableErrors,
  ]);
  const warnings = uniqueDiagnostics([
    ...artifact.warnings,
    ...staleWarnings,
    ...statusWarningsFor(artifact),
  ]);

  return createArtifactFreshnessVerification({
    status: statusForVerification(artifact, {
      hasInvalidDiagnostics: comparisonErrors.length > 0
        || sourceObjectInputErrors.length > 0
        || sourceCoverage.errors.some((error) => error.code !== "MissingSource"),
      hasNonReplayableDiagnostics: nonReplayableErrors.length > 0 || sourceCoverage.missingSourceRefs.length > 0,
      hasStaleDiagnostics: staleWarnings.length > 0 || artifact.status === "stale",
    }),
    artifactRef: { kind: "artifact", ref: artifact.id },
    sourceRefs: artifact.sourceRefs,
    missingSourceRefs: sourceCoverage.missingSourceRefs,
    staleSourceRefs,
    outputRefs: artifact.outputRefs,
    warnings,
    errors,
    provenance: artifact.provenance,
  });
}

function appendExpectedMismatches(
  input: VerifyArtifactFreshnessInput,
  artifact: Artifact,
  staleWarnings: CoreWarning[],
  staleSourceRefs: SourceReference[],
): readonly CoreError[] {
  const errors: CoreError[] = [];

  if (input.expectedSourceRefs !== undefined) {
    if (!isSourceReferenceArray(input.expectedSourceRefs)) {
      errors.push(invalidArtifactInput("expectedSourceRefs", "Expected source refs must be source references."));
    } else if (!sameRefs(artifact.sourceRefs, input.expectedSourceRefs)) {
      staleWarnings.push(artifactStaleWarning(artifact, "Artifact source refs differ from expected source refs."));
      staleSourceRefs.push(...refSymmetricDifference(artifact.sourceRefs, input.expectedSourceRefs));
    }
  }

  if (input.expectedOutputRefs !== undefined) {
    if (!isOutputRefsInput(input.expectedOutputRefs)) {
      errors.push(invalidArtifactInput("expectedOutputRefs", "Expected output refs must be output refs."));
    } else if (!sameOutputRefs(artifact.outputRefs, input.expectedOutputRefs)) {
      staleWarnings.push(artifactStaleWarning(artifact, "Artifact output refs differ from expected output refs."));
    }
  }

  if ("expectedRunRef" in input) {
    const expectedRunRef = input.expectedRunRef;
    if (expectedRunRef !== null && !isRef(expectedRunRef)) {
      errors.push(invalidArtifactInput("expectedRunRef", "Expected run ref must be a RunRef or null."));
    } else if (runRefId(artifact.runRef) !== runRefId(expectedRunRef ?? null)) {
      staleWarnings.push(artifactStaleWarning(artifact, "Artifact run ref differs from expected run ref."));
    }
  }

  if ("expectedOperationContextRef" in input) {
    const expectedContextRef = input.expectedOperationContextRef;
    if (expectedContextRef !== null && !isRef(expectedContextRef)) {
      errors.push(invalidArtifactInput(
        "expectedOperationContextRef",
        "Expected operation context ref must be an OperationContextRef or null.",
      ));
    } else if (!operationContextMatches(artifact, expectedContextRef ?? null)) {
      staleWarnings.push(artifactStaleWarning(artifact, "Artifact operation context differs from expected context ref."));
    }
  }

  if ("expectedOptions" in input) {
    const optionsComparison = compareCanonicalValue(artifact.options, input.expectedOptions);
    if (!optionsComparison.ok) {
      errors.push(invalidArtifactInput("expectedOptions", optionsComparison.message));
    } else if (!optionsComparison.same) {
      staleWarnings.push(artifactStaleWarning(artifact, "Artifact options differ from expected options."));
    }
  }

  return errors;
}

function verifySourceCoverage(
  sourceRefs: readonly SourceReference[],
  sourceObjects: readonly unknown[],
): SourceCoverage {
  const errors: CoreError[] = [];
  const sourceObjectRefKeys = new Set<string>();
  for (const sourceObject of sourceObjects) {
    if (isArtifactLike(sourceObject)) {
      errors.push(freshnessError(
        "ArtifactWouldBecomeSourceOfTruth",
        "Artifact cannot be used as a Norma Core source object.",
        artifactRefTarget(sourceObject),
        { kind: "artifact", ref: artifactRefTarget(sourceObject) },
      ));
      continue;
    }

    for (const sourceRef of refsForSourceObject(sourceObject)) {
      sourceObjectRefKeys.add(refKey(sourceRef));
    }
  }

  const missingSourceRefs = sourceRefs.filter((sourceRef) => !sourceObjectRefKeys.has(refKey(sourceRef)));
  if (missingSourceRefs.length > 0) {
    errors.push(freshnessError(
      "MissingSource",
      "Required structured source objects are missing for artifact freshness verification.",
      "sourceObjects",
      { kind: "source-refs", ref: "sourceObjects" },
    ));
  }

  return { missingSourceRefs, errors };
}

function sourceObjectsInputErrors(input: Readonly<Record<string, unknown>>): readonly CoreError[] {
  if (!("sourceObjects" in input) || input.sourceObjects === undefined) {
    return [];
  }

  return Array.isArray(input.sourceObjects)
    ? []
    : [invalidArtifactInput("sourceObjects", "Source objects must be an array of structured source objects.")];
}

function sourceObjectsFromInput(input: Readonly<Record<string, unknown>>): readonly unknown[] {
  return Array.isArray(input.sourceObjects) ? input.sourceObjects : [];
}

function nonReplayableErrorsFor(artifact: Artifact, missingSourceRefs: readonly SourceReference[]): readonly CoreError[] {
  const errors: CoreError[] = [];
  if (artifact.runRef === null) {
    errors.push(freshnessError(
      "MissingArtifactRunRef",
      "Artifact has no runRef, so freshness cannot be proven.",
      "runRef",
      { kind: "artifact", ref: artifact.id },
      artifact.provenance,
    ));
  }

  if (artifact.status === "non_replayable" && artifact.runRef !== null && missingSourceRefs.length === 0) {
    errors.push(freshnessError(
      "ArtifactNonReplayable",
      "Artifact is marked non_replayable and cannot be verified as fresh.",
      artifact.id,
      { kind: "artifact", ref: artifact.id },
      artifact.provenance,
    ));
  }

  return errors;
}

function statusWarningsFor(artifact: Artifact): readonly CoreWarning[] {
  return artifact.status === "stale"
    ? [artifactStaleWarning(artifact, "Artifact is already marked stale.")]
    : [];
}

function statusForVerification(
  artifact: Artifact,
  facts: {
    hasInvalidDiagnostics: boolean;
    hasNonReplayableDiagnostics: boolean;
    hasStaleDiagnostics: boolean;
  },
): ArtifactFreshnessStatus {
  if (facts.hasInvalidDiagnostics || artifact.errors.length > 0) {
    return "invalid";
  }

  if (facts.hasNonReplayableDiagnostics || artifact.status === "non_replayable") {
    return "non_replayable";
  }

  if (facts.hasStaleDiagnostics || artifact.status === "stale") {
    return "stale";
  }

  if (artifact.status === "lossy" || artifact.options.lossy === true) {
    return "lossy";
  }

  return "current";
}

function validationFailureStatus(errors: readonly CoreError[]): ArtifactFreshnessStatus {
  return errors.length > 0 && errors.every((error) => NON_REPLAYABLE_VALIDATION_CODES.has(error.code))
    ? "non_replayable"
    : "invalid";
}

function validationErrorsFor(
  validationErrors: readonly CoreError[],
  shapeErrors: readonly CoreError[],
): readonly CoreError[] {
  const hasOnlyMissingReplayData = shapeErrors.length > 0
    && shapeErrors.every((error) => NON_REPLAYABLE_VALIDATION_CODES.has(error.code));
  return hasOnlyMissingReplayData
    ? validationErrors.filter((error) => error.code !== "UnsupportedArtifactSource")
    : validationErrors;
}

function createArtifactFreshnessVerification(input: ArtifactFreshnessDraft): ArtifactFreshnessVerification {
  return {
    kind: "artifact-freshness-verification",
    status: input.status,
    artifactRef: input.artifactRef,
    sourceRefs: canonicalizeRefs(input.sourceRefs),
    missingSourceRefs: canonicalizeRefs(input.missingSourceRefs ?? []),
    staleSourceRefs: canonicalizeRefs(input.staleSourceRefs ?? []),
    outputRefs: canonicalizeOutputRefs(input.outputRefs).refs,
    warnings: canonicalizeWarnings(uniqueDiagnostics(input.warnings ?? [])),
    errors: canonicalizeErrors(uniqueDiagnostics(input.errors ?? [])),
    provenance: input.provenance,
    serializationSummary: {
      serializationVersion: STABLE_SERIALIZATION_VERSION,
      canonicalOrdering: true,
    },
  };
}

function visibleArtifactDiagnostics(value: unknown): VisibleArtifactDiagnostics {
  if (!isRecord(value)) {
    return { warnings: [], errors: [] };
  }

  return {
    warnings: Array.isArray(value.warnings) ? value.warnings.filter(isCoreWarning) : [],
    errors: Array.isArray(value.errors) ? value.errors.filter(isCoreError) : [],
  };
}

function artifactShapeErrors(value: unknown): readonly CoreError[] {
  if (!isRecord(value)) {
    return [invalidArtifactInput("artifact", "Artifact freshness verification requires an artifact object.")];
  }

  if (value.kind !== "artifact") {
    return [invalidArtifactInput("artifact", "Artifact freshness verification requires artifact.kind to be artifact.")];
  }

  const errors: CoreError[] = [];
  if (!("sourceRefs" in value) || value.sourceRefs === undefined || value.sourceRefs === null) {
    errors.push(freshnessError(
      "MissingArtifactSourceRefs",
      "Artifact requires visible source refs.",
      "artifact.sourceRefs",
      { kind: "source-refs", ref: "artifact.sourceRefs" },
    ));
  }
  if (!("provenance" in value) || value.provenance === undefined || value.provenance === null) {
    errors.push(freshnessError(
      "MissingArtifactProvenance",
      "Artifact source requires visible provenance.",
      "artifact.provenance",
      { kind: "provenance", ref: "artifact.provenance" },
    ));
  }
  if (!("options" in value) || value.options === undefined || value.options === null) {
    errors.push(freshnessError(
      "MissingArtifactOptions",
      "Artifact freshness verification requires explicit artifact options.",
      "artifact.options",
      { kind: "artifact-options", ref: "artifact.options" },
    ));
  }

  appendArrayShapeError(errors, value, "sourceRefs", isSourceReference);
  appendArrayShapeError(errors, value, "outputRefs", isSourceReference);
  appendArrayShapeError(errors, value, "warnings", isCoreWarning);
  appendArrayShapeError(errors, value, "errors", isCoreError);

  if ("provenance" in value && value.provenance !== null && value.provenance !== undefined && !isProvenance(value.provenance)) {
    errors.push(invalidArtifactInput("artifact.provenance", "Artifact provenance is malformed."));
  }

  if ("runRef" in value && value.runRef !== null && value.runRef !== undefined && !isRef(value.runRef)) {
    errors.push(invalidArtifactInput("artifact.runRef", "Artifact runRef is malformed."));
  }

  if ("options" in value && value.options !== null && value.options !== undefined && !isArtifactOptions(value.options)) {
    errors.push(invalidArtifactInput("artifact.options", "Artifact options are malformed."));
  }

  return errors;
}

function appendArrayShapeError<TValue>(
  errors: CoreError[],
  record: Readonly<Record<string, unknown>>,
  key: string,
  itemGuard: (value: unknown) => value is TValue,
): void {
  if (!(key in record) || record[key] === undefined) {
    return;
  }

  const value = record[key];
  if (!Array.isArray(value) || !value.every(itemGuard)) {
    errors.push(invalidArtifactInput(`artifact.${key}`, `Artifact ${key} are malformed.`));
  }
}

function refsForSourceObject(value: unknown): readonly SourceReference[] {
  if (!isRecord(value)) {
    return [];
  }

  const wrappedSourceRefs = refsForWrappedSourceObject(value);
  if (wrappedSourceRefs.length > 0) {
    return wrappedSourceRefs;
  }

  return refsForStructuredSourceObject(value);
}

function refsForWrappedSourceObject(value: Readonly<Record<string, unknown>>): readonly SourceReference[] {
  if (!isSourceReference(value.sourceRef)) {
    return [];
  }

  const payload = value.result ?? value.sourceObject ?? value.value;
  return refsForStructuredSourceObject(payload).length > 0 ? [value.sourceRef] : [];
}

function refsForStructuredSourceObject(value: unknown): readonly SourceReference[] {
  if (!isRecord(value)) {
    return [];
  }

  if (isCoreResultObject(value)) {
    return value.outputRefs;
  }

  if (isConstructionObject(value)) {
    return canonicalizeRefs([
      { kind: "construction", ref: value.id },
      ...value.provenance.sourceRefs,
    ]);
  }

  if (isOperationContextObject(value)) {
    return [{ kind: "operation-context", ref: value.id }];
  }

  return [];
}

function sourceRefsFromUnknown(value: unknown): readonly SourceReference[] {
  return isRecord(value) && Array.isArray(value.sourceRefs) && value.sourceRefs.every(isSourceReference)
    ? value.sourceRefs
    : [];
}

function outputRefsFromUnknown(value: unknown): readonly SourceReference[] {
  return isRecord(value) && Array.isArray(value.outputRefs) && value.outputRefs.every(isSourceReference)
    ? value.outputRefs
    : [];
}

function provenanceFromUnknown(value: unknown): Provenance | null {
  return isRecord(value) && isProvenance(value.provenance) ? value.provenance : null;
}

function artifactRefFromUnknown(value: unknown): SourceReference | null {
  return isRecord(value) && typeof value.id === "string" ? { kind: "artifact", ref: value.id } : null;
}

function operationContextMatches(artifact: Artifact, expectedContextRef: OperationContextRef | null): boolean {
  const artifactRecord = artifact as unknown as Record<string, unknown>;
  if (expectedContextRef === null) {
    return !artifact.sourceRefs.some((sourceRef) => sourceRef.kind === "operation-context")
      && refIdFromUnknown(artifactRecord.operationContextRef) === null
      && refIdFromUnknown(artifactRecord.resultOperationContextRef) === null;
  }

  const expectedRef = expectedContextRef.id;
  return artifact.sourceRefs.some((sourceRef) => sourceRef.kind === "operation-context" && sourceRef.ref === expectedRef)
    || refIdFromUnknown(artifactRecord.operationContextRef) === expectedRef
    || refIdFromUnknown(artifactRecord.resultOperationContextRef) === expectedRef;
}

function refIdFromUnknown(value: unknown): string | null {
  return isRef(value) ? value.id : null;
}

function sameRefs(first: readonly SourceReference[], second: readonly SourceReference[]): boolean {
  return serializeCanonicalJson(canonicalizeRefs(first), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(canonicalizeRefs(second), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function sameOutputRefs(first: readonly SourceReference[], second: readonly SourceReference[] | OutputRefs): boolean {
  return serializeCanonicalJson(canonicalizeOutputRefs(first), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(canonicalizeOutputRefs(second), DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function compareCanonicalValue(first: unknown, second: unknown): { ok: true; same: boolean } | { ok: false; message: string } {
  try {
    return {
      ok: true,
      same: serializeCanonicalJson(first, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
        === serializeCanonicalJson(second, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error
        ? error.message
        : "Expected options cannot be serialized deterministically.",
    };
  }
}

function refSymmetricDifference(
  firstRefs: readonly SourceReference[],
  secondRefs: readonly SourceReference[],
): readonly SourceReference[] {
  const firstKeys = new Set(firstRefs.map(refKey));
  const secondKeys = new Set(secondRefs.map(refKey));
  return [
    ...firstRefs.filter((ref) => !secondKeys.has(refKey(ref))),
    ...secondRefs.filter((ref) => !firstKeys.has(refKey(ref))),
  ];
}

function artifactStaleWarning(artifact: Artifact, message: string): CoreWarning {
  return freshnessWarning(
    "ArtifactStale",
    message,
    artifact.id,
    { kind: "artifact", ref: artifact.id },
    artifact.provenance,
  );
}

function invalidArtifactInput(targetRef: string, message: string): CoreError {
  return freshnessError("InvalidArtifactInput", message, targetRef, { kind: "artifact", ref: targetRef });
}

function freshnessError(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  sourceRef: SourceReference = ARTIFACT_FRESHNESS_SOURCE_REFERENCE,
  provenance: Provenance | null = null,
): CoreError {
  return {
    code,
    severity: "error",
    message,
    targetRef,
    source: sourceRef,
    blocking: true,
    provenance,
  };
}

function freshnessWarning(
  code: DiagnosticCode,
  message: string,
  targetRef: string,
  sourceRef: SourceReference,
  provenance: Provenance | null,
): CoreWarning {
  return {
    code,
    severity: "warning",
    message,
    targetRef,
    source: sourceRef,
    blocking: false,
    provenance,
  };
}

function uniqueDiagnostics<TDiagnostic extends CoreWarning | CoreError>(
  diagnostics: readonly TDiagnostic[],
): readonly TDiagnostic[] {
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

function isArtifactLike(value: unknown): boolean {
  return isRecord(value) && (
    value.kind === "artifact"
    || ("artifactType" in value && "derived" in value && "sourceRefs" in value && "outputRefs" in value)
  );
}

function artifactRefTarget(value: unknown): string {
  return isRecord(value) && typeof value.id === "string" ? value.id : "artifact";
}

function isOutputRefsInput(value: unknown): value is readonly SourceReference[] | OutputRefs {
  return isSourceReferenceArray(value)
    || (isRecord(value) && value.kind === "output-refs" && isSourceReferenceArray(value.refs));
}

function isArtifactOptions(value: unknown): boolean {
  return isRecord(value)
    && value.kind === "artifact-generation-options"
    && typeof value.id === "string"
    && ARTIFACT_TYPES.includes(value.artifactType as Artifact["artifactType"])
    && (value.expectedSourceRefs === undefined || isSourceReferenceArray(value.expectedSourceRefs))
    && (value.lossy === undefined || typeof value.lossy === "boolean")
    && (value.presentationHints === undefined || isRecord(value.presentationHints));
}

function isCoreResultObject(value: Readonly<Record<string, unknown>>): value is Readonly<Record<string, unknown>> & {
  outputRefs: readonly SourceReference[];
} {
  return typeof value.status === "string"
    && Array.isArray(value.warnings)
    && Array.isArray(value.errors)
    && isSourceReferenceArray(value.outputRefs)
    && "output" in value
    && "provenance" in value;
}

function isConstructionObject(value: Readonly<Record<string, unknown>>): value is Readonly<Record<string, unknown>> & {
  id: string;
  provenance: { sourceRefs: readonly SourceReference[] };
} {
  return value.kind === "construction"
    && typeof value.id === "string"
    && isRecord(value.provenance)
    && isSourceReferenceArray(value.provenance.sourceRefs);
}

function isOperationContextObject(value: Readonly<Record<string, unknown>>): value is Readonly<Record<string, unknown>> & {
  id: string;
} {
  return value.kind === "operation-context" && typeof value.id === "string";
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

function isDiagnostic(value: unknown): value is CoreWarning | CoreError {
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
    && typeof value.kind === "string"
    && typeof value.ref === "string";
}

function isRef(value: unknown): value is RunRef & OperationContextRef {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0;
}

function runRefId(value: RunRef | null): string | null {
  return value?.id ?? null;
}

function refKey(ref: SourceReference): string {
  return `${ref.kind}:${ref.ref}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
