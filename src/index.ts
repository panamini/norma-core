export type CoreVersion = string;
export type OperationName = string;
export type OperationVersion = string;
export type OperationKey = `${OperationName}@${OperationVersion}`;

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

export const REQUIRED_PR1_DIAGNOSTIC_CODES = [
  "MissingOperation",
  "UnsupportedOperation",
  "NotImplemented",
  "InvalidInputShape",
  "CriticalWarningNotSuppressible",
  "MissingProvenance",
] as const satisfies readonly DiagnosticCode[];

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

export type OperationRegistry = Readonly<Record<OperationKey, OperationDefinition>>;

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

type FailedOperationValidation = {
  ok: false;
  result: CoreResult;
};

type OperationRequestValidation =
  | {
      ok: true;
      request: CoreOperationRequest;
      operationName: OperationName;
      operationVersion: OperationVersion;
    }
  | FailedOperationValidation;

type OperationDescriptorValidation =
  | {
      ok: true;
      operationName: OperationName;
      operationVersion: OperationVersion;
    }
  | FailedOperationValidation;

const CORE_SOURCE_REFERENCE: SourceReference = Object.freeze({
  kind: "core",
  ref: "norma-core/pr1-skeleton",
});

const DEFAULT_DIAGNOSTIC_FIELDS = Object.freeze({
  targetRef: null,
  sourceRef: CORE_SOURCE_REFERENCE,
  provenance: null,
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

const PR1_STUB_OPERATION: OperationDefinition = Object.freeze({
  name: "core.skeleton.stub",
  version: "0.1.0",
  status: "stub",
});

export const EMPTY_OPERATION_REGISTRY: OperationRegistry = Object.freeze({});

export const CORE_SKELETON_OPERATION_REGISTRY: OperationRegistry = Object.freeze({
  [operationKey(PR1_STUB_OPERATION.name, PR1_STUB_OPERATION.version)]: PR1_STUB_OPERATION,
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
  const diagnostic = { ...DEFAULT_DIAGNOSTIC_FIELDS, ...input };

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

export function createCoreWarning(input: DiagnosticInput): CoreWarning {
  const diagnostic = { ...DEFAULT_DIAGNOSTIC_FIELDS, ...input };
  const severity = warningSeverity(diagnostic.severity);

  return {
    code: diagnostic.code,
    severity,
    message: diagnostic.message,
    targetRef: diagnostic.targetRef,
    source: diagnostic.sourceRef,
    blocking: warningBlocking(diagnostic.blocking, severity),
    provenance: diagnostic.provenance,
  };
}

export function operationKey(name: OperationName, version: OperationVersion): OperationKey {
  return `${name}@${version}`;
}

export function unsupportedOperation(operationRef: OperationName | OperationKey): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "UnsupportedOperation",
        message: `Operation is not registered: ${operationRef}.`,
        sourceRef: { kind: "operation", ref: operationRef },
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
        code: "OperationNotImplemented",
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
  const requestValidation = validateOperationRequest(request);
  if (!requestValidation.ok) {
    return requestValidation.result;
  }

  const dependencyBoundaryResult = dependencyBoundaryForRequest(requestValidation.request);
  if (dependencyBoundaryResult !== null) {
    return dependencyBoundaryResult;
  }

  const inputShapeResult = inputShapeForRequest(requestValidation.request);
  if (inputShapeResult !== null) {
    return inputShapeResult;
  }

  return executeRegisteredOperation(requestValidation.operationName, requestValidation.operationVersion, registry);
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
    const dependencySegments = dependencyRefSegments(dependencyRef);
    return FORBIDDEN_CORE_DEPENDENCY_TERMS.some((term) => dependencySegments.includes(term));
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

export function missingRequiredDiagnosticCodes(diagnosticCodes: readonly DiagnosticCode[]): readonly DiagnosticCode[] {
  return REQUIRED_PR1_DIAGNOSTIC_CODES.filter(
    (code) => !diagnosticCodes.includes(code),
  );
}

export function validateCoreSkeleton(): CoreResult {
  const missingDiagnosticCodes = missingRequiredDiagnosticCodes(CORE_DIAGNOSTIC_CODES);

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
  const result = { ...DEFAULT_RESULT_FIELDS, ...input };

  return {
    ...result,
    warnings: [...result.warnings],
    errors: [...result.errors],
    outputRefs: [...result.outputRefs],
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

function errorSeverity(severity: DiagnosticSeverity | undefined): CoreError["severity"] {
  return severity === "fatal" ? "fatal" : "error";
}

function warningBlocking(blocking: boolean | undefined, severity: CoreWarning["severity"]): boolean {
  if (blocking !== undefined) {
    return blocking;
  }

  return severity === "critical";
}

function dependencyBoundaryForRequest(request: CoreOperationRequest): CoreResult | null {
  if (request.dependencyRefs === undefined) {
    return null;
  }

  if (!isStringArray(request.dependencyRefs)) {
    return invalidInputShape("dependencyRefs", "Dependency references must be strings.");
  }

  const result = validateCoreDependencyBoundary(request.dependencyRefs);
  return result.status === "ok" ? null : result;
}

function validateOperationRequest(request: CoreOperationRequest): OperationRequestValidation {
  if (!isRecord(request)) {
    return failedRequestValidation(invalidInputShape("request", "Core operation request must be an object."));
  }

  const operationValidation = validateOperationDescriptor(request.operation);
  if (!operationValidation.ok) {
    return operationValidation;
  }

  return {
    ok: true,
    request,
    operationName: operationValidation.operationName,
    operationVersion: operationValidation.operationVersion,
  };
}

function validateOperationDescriptor(operation: unknown): OperationDescriptorValidation {
  if (operation == null) {
    return failedRequestValidation(missingOperation());
  }

  if (!isRecord(operation)) {
    return failedRequestValidation(invalidInputShape("operation", "Operation descriptor must be an object."));
  }

  return validateOperationIdentity(operation);
}

function validateOperationIdentity(operation: Record<string, unknown>): OperationDescriptorValidation {
  const operationName = nonEmptyString(operation.name);
  if (operationName === null) {
    return failedRequestValidation(missingOperationName());
  }

  const operationVersion = nonEmptyString(operation.version);
  if (operationVersion === null) {
    return failedRequestValidation(missingOperationVersion(operationName));
  }

  return { ok: true, operationName, operationVersion };
}

function executeRegisteredOperation(
  operationName: OperationName,
  operationVersion: OperationVersion,
  registry: OperationRegistry,
): CoreResult {
  const key = operationKey(operationName, operationVersion);
  const operation = registry[key];
  if (operation === undefined) {
    return unsupportedOperation(key);
  }

  if (operation.status === "stub") {
    return notImplementedOperation(operation);
  }

  return operationInvariantViolation(operationName);
}

function inputShapeForRequest(request: CoreOperationRequest): CoreResult | null {
  if (!("input" in request)) {
    return null;
  }

  return isValidCoreInput(request.input)
    ? null
    : invalidInputShape("input", "Core PR1 input must be a structured object when provided.");
}

function missingOperation(): CoreResult {
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

function missingOperationName(): CoreResult {
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

function missingOperationVersion(operationName: OperationName): CoreResult {
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

function operationInvariantViolation(operationName: OperationName): CoreResult {
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

function failedRequestValidation(result: CoreResult): FailedOperationValidation {
  return { ok: false, result };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidCoreInput(input: unknown): boolean {
  return input === undefined || isRecord(input);
}

function dependencyRefSegments(dependencyRef: string): readonly string[] {
  return dependencyRef.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
