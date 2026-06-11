export type CoreVersion = string;
export type OperationName = string;
export type OperationVersion = string;

export type OperationStatus = "ok" | "failed" | "not_implemented";

export const CORE_VERSION: CoreVersion = "0.1.0-pr1";

export const CORE_DIAGNOSTIC_CODES = [
  "MissingOperation",
  "UnsupportedOperation",
  "NotImplemented",
  "InvalidInputShape",
  "CriticalWarningNotSuppressible",
  "MissingProvenance",
  "OperationNotImplemented",
  "MissingOperationName",
  "MissingOperationVersion",
  "InternalInvariantViolation",
  "ForbiddenCoreDependency",
] as const;

export type DiagnosticCode = (typeof CORE_DIAGNOSTIC_CODES)[number];

export type DiagnosticSeverity = "info" | "warning" | "critical" | "error" | "fatal";

export interface SourceReference {
  kind: string;
  ref: string;
}

export interface Provenance {
  operationName: OperationName;
  operationVersion: OperationVersion;
  inputRefs: readonly SourceReference[];
  source: SourceReference;
}

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  targetRef: string | null;
  source: SourceReference;
  blocking: boolean;
  provenance: Provenance | null;
}

export type CoreError = Diagnostic & {
  severity: "error" | "fatal";
  blocking: true;
};

export type CoreWarning = Diagnostic & {
  severity: "info" | "warning" | "critical";
};

export interface RunRef {
  id: string;
}

export interface PackLockRef {
  id: string;
}

export interface OperationContextRef {
  id: string;
}

export interface Run {
  ref: RunRef;
  coreVersion: CoreVersion;
  operationName: OperationName;
  operationVersion: OperationVersion;
  status: OperationStatus;
}

export interface PackLock {
  ref: PackLockRef;
  coreVersion: CoreVersion;
  packRef: string | null;
}

export interface OperationContext {
  ref: OperationContextRef;
  coreVersion: CoreVersion;
  contextRef: string | null;
}

export interface CoreResult<TOutput = unknown> {
  status: OperationStatus;
  warnings: readonly CoreWarning[];
  errors: readonly CoreError[];
  provenance: Provenance | null;
  outputRefs: readonly SourceReference[];
  runRef: RunRef | null;
  packLockRef: PackLockRef | null;
  operationContextRef: OperationContextRef | null;
  output: TOutput | null;
}

export interface OperationDefinition {
  name: OperationName;
  version: OperationVersion;
  status: "stub";
}

export type OperationRegistry = Readonly<Record<OperationName, OperationDefinition>>;

export interface CoreOperationRequest {
  operation?: {
    name?: OperationName;
    version?: OperationVersion;
  };
  input?: unknown;
  dependencyRefs?: readonly string[];
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
  runRef?: RunRef | null;
  packLockRef?: PackLockRef | null;
  operationContextRef?: OperationContextRef | null;
  output?: TOutput | null;
}

const CORE_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/pr1-skeleton",
});

const PR1_STUB_OPERATION: OperationDefinition = Object.freeze({
  name: "core.skeleton.stub",
  version: "0.1.0",
  status: "stub",
});

export const EMPTY_OPERATION_REGISTRY: OperationRegistry = Object.freeze({});

export const CORE_SKELETON_OPERATION_REGISTRY: OperationRegistry = Object.freeze({
  [PR1_STUB_OPERATION.name]: PR1_STUB_OPERATION,
});

export const FORBIDDEN_CORE_DEPENDENCY_TERMS = [
  "ui",
  "camera",
  "image",
  "vision",
  "opencv",
  "tracking",
  "plugin",
  "cad",
  "cloud",
  "marketplace",
  "mcp",
  "sdk",
  "cli",
] as const;

export function createCoreError(input: DiagnosticInput): CoreError {
  return {
    code: input.code,
    severity: input.severity === "fatal" ? "fatal" : "error",
    message: input.message,
    targetRef: input.targetRef ?? null,
    source: input.sourceRef ?? CORE_SOURCE_REFERENCE,
    blocking: true,
    provenance: input.provenance ?? null,
  };
}

export function createCoreWarning(input: DiagnosticInput): CoreWarning {
  const severity = warningSeverity(input.severity);

  return {
    code: input.code,
    severity,
    message: input.message,
    targetRef: input.targetRef ?? null,
    source: input.sourceRef ?? CORE_SOURCE_REFERENCE,
    blocking: input.blocking ?? severity === "critical",
    provenance: input.provenance ?? null,
  };
}

export function unsupportedOperation(operationName: OperationName): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "UnsupportedOperation",
        message: `Operation is not registered: ${operationName}.`,
        sourceRef: { kind: "operation", ref: operationName },
      }),
    ],
  });
}

export function notImplementedOperation(operation: OperationDefinition): CoreResult {
  const provenance = createProvenance(operation.name, operation.version);

  return createCoreResult({
    status: "not_implemented",
    errors: [
      createCoreError({
        code: "NotImplemented",
        message: `Operation is registered as a PR1 stub and has no business implementation: ${operation.name}.`,
        sourceRef: { kind: "operation", ref: operation.name },
        provenance,
      }),
    ],
    provenance,
  });
}

export function executeCoreOperation(
  request: CoreOperationRequest = {},
  registry: OperationRegistry = CORE_SKELETON_OPERATION_REGISTRY,
): CoreResult {
  if (!isRecord(request)) {
    return invalidInputShape("request", "Core operation request must be an object.");
  }

  const dependencyBoundaryResult = dependencyBoundaryForRequest(request);
  if (dependencyBoundaryResult !== null) {
    return dependencyBoundaryResult;
  }

  if (request.operation === undefined || request.operation === null) {
    return createCoreResult({
      status: "failed",
      errors: [
        createCoreError({
          code: "MissingOperation",
          message: "Core operation is required.",
        }),
      ],
    });
  }

  if (!isRecord(request.operation)) {
    return invalidInputShape("operation", "Operation descriptor must be an object.");
  }

  const operationName = request.operation.name;
  if (typeof operationName !== "string" || operationName.length === 0) {
    return createCoreResult({
      status: "failed",
      errors: [
        createCoreError({
          code: "MissingOperationName",
          message: "Operation name is required.",
          sourceRef: { kind: "operation", ref: "missing-name" },
        }),
      ],
    });
  }

  const operationVersion = request.operation.version;
  if (typeof operationVersion !== "string" || operationVersion.length === 0) {
    return createCoreResult({
      status: "failed",
      errors: [
        createCoreError({
          code: "MissingOperationVersion",
          message: "Operation version is required.",
          sourceRef: { kind: "operation", ref: operationName },
        }),
      ],
    });
  }

  if ("input" in request && !isValidCoreInput(request.input)) {
    return invalidInputShape("input", "Core PR1 input must be a structured object when provided.");
  }

  const operation = registry[operationName];
  if (operation === undefined) {
    return unsupportedOperation(operationName);
  }

  if (operation.status === "stub") {
    return notImplementedOperation(operation);
  }

  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "InternalInvariantViolation",
        message: `Operation registry entry has an unsupported status: ${operationName}.`,
        sourceRef: { kind: "operation", ref: operationName },
      }),
    ],
  });
}

export function suppressCoreWarnings(
  warnings: readonly CoreWarning[],
  suppressedCodes: readonly DiagnosticCode[],
): CoreResult {
  const suppressedCodeSet = new Set(suppressedCodes);
  const suppressedCriticalWarning = warnings.find(
    (warning) => suppressedCodeSet.has(warning.code) && (warning.severity === "critical" || warning.blocking),
  );

  if (suppressedCriticalWarning !== undefined) {
    return createCoreResult({
      status: "failed",
      warnings,
      errors: [
        createCoreError({
          code: "CriticalWarningNotSuppressible",
          message: `Critical warning cannot be suppressed: ${suppressedCriticalWarning.code}.`,
          sourceRef: suppressedCriticalWarning.source,
          provenance: suppressedCriticalWarning.provenance,
        }),
      ],
    });
  }

  return createCoreResult({
    status: "ok",
    warnings: warnings.filter((warning) => !suppressedCodeSet.has(warning.code)),
  });
}

export function validateOutputProvenance(
  outputRefs: readonly SourceReference[],
  provenance: Provenance | null,
): CoreResult {
  if (outputRefs.length > 0 && provenance === null) {
    return createCoreResult({
      status: "failed",
      outputRefs,
      warnings: [
        createCoreWarning({
          code: "MissingProvenance",
          severity: "critical",
          message: "Derived output cannot be accepted without provenance.",
          sourceRef: { kind: "provenance", ref: "missing" },
        }),
      ],
    });
  }

  return createCoreResult({
    status: "ok",
    outputRefs,
    provenance,
  });
}

export function validateCoreDependencyBoundary(dependencyRefs: readonly string[]): CoreResult {
  const forbiddenDependency = dependencyRefs.find((dependencyRef) => {
    const normalizedDependencyRef = dependencyRef.toLowerCase();
    return FORBIDDEN_CORE_DEPENDENCY_TERMS.some((term) => normalizedDependencyRef.includes(term));
  });

  if (forbiddenDependency !== undefined) {
    return createCoreResult({
      status: "failed",
      errors: [
        createCoreError({
          code: "ForbiddenCoreDependency",
          message: `Dependency is outside the PR1 core skeleton boundary: ${forbiddenDependency}.`,
          sourceRef: { kind: "guardrail", ref: forbiddenDependency },
        }),
      ],
    });
  }

  return createCoreResult({ status: "ok" });
}

export function validateCoreSkeleton(): CoreResult {
  const missingDiagnosticCodes = CORE_DIAGNOSTIC_CODES.filter(
    (code) => !CORE_DIAGNOSTIC_CODES.includes(code),
  );

  if (missingDiagnosticCodes.length > 0) {
    return createCoreResult({
      status: "failed",
      errors: [
        createCoreError({
          code: "InternalInvariantViolation",
          message: `Core skeleton diagnostics are incomplete: ${missingDiagnosticCodes.join(", ")}.`,
        }),
      ],
    });
  }

  return createCoreResult({
    status: "ok",
    provenance: createProvenance("core.skeleton.validate", "0.1.0"),
  });
}

function createCoreResult<TOutput = unknown>(input: CoreResultInput<TOutput>): CoreResult<TOutput> {
  return {
    status: input.status,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
    provenance: input.provenance ?? null,
    outputRefs: input.outputRefs ?? [],
    runRef: input.runRef ?? null,
    packLockRef: input.packLockRef ?? null,
    operationContextRef: input.operationContextRef ?? null,
    output: input.output ?? null,
  };
}

function createProvenance(
  operationName: OperationName,
  operationVersion: OperationVersion,
  inputRefs: readonly SourceReference[] = [],
): Provenance {
  return {
    operationName,
    operationVersion,
    inputRefs,
    source: CORE_SOURCE_REFERENCE,
  };
}

function invalidInputShape(targetRef: string, message: string): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "InvalidInputShape",
        message,
        targetRef,
        sourceRef: { kind: "input", ref: targetRef },
      }),
    ],
  });
}

function warningSeverity(severity: DiagnosticSeverity | undefined): CoreWarning["severity"] {
  if (severity === "critical" || severity === "info" || severity === "warning") {
    return severity;
  }

  return "warning";
}

function dependencyBoundaryForRequest(request: CoreOperationRequest): CoreResult | null {
  if (request.dependencyRefs === undefined) {
    return null;
  }

  if (!Array.isArray(request.dependencyRefs) || !request.dependencyRefs.every((dependencyRef) => typeof dependencyRef === "string")) {
    return invalidInputShape("dependencyRefs", "Dependency references must be strings.");
  }

  const result = validateCoreDependencyBoundary(request.dependencyRefs);
  return result.status === "ok" ? null : result;
}

function isValidCoreInput(input: unknown): boolean {
  return input === undefined || isRecord(input);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
