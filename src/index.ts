export type CoreVersion = string;
export type OperationName = string;
export type OperationVersion = string;
export type OperationKey = `${OperationName}@${OperationVersion}`;

export const CORE_OPERATION_STATUSES = ["ok", "failed", "not_implemented"] as const;
export type OperationStatus = (typeof CORE_OPERATION_STATUSES)[number];

export const CORE_VALIDATION_LEVELS = ["call", "result", "replay"] as const;
export type CoreValidationLevel = (typeof CORE_VALIDATION_LEVELS)[number];

export const CORE_VERSION: CoreVersion = "0.1.0-pr3";

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
  "ImplicitPackNotAllowed",
  "HiddenToleranceNotAllowed",
  "FreeFormPromptNotAllowed",
  "HiddenOutputChangingDefault",
  "MissingResultOutput",
  "MissingResultDiagnostics",
  "MissingOperationContext",
  "MissingCoordinateSystem",
  "UnsupportedGeometryV1",
  "InvalidGeometryV1",
  "MissingMetricPolicy",
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

export interface OperationDescriptor {
  name?: OperationName;
  version?: OperationVersion;
}

export interface OperationDefinition {
  name: OperationName;
  version: OperationVersion;
  status: "stub";
}

export type OperationRegistry = Readonly<Record<OperationKey, OperationDefinition>>;

export const CORE_CANONICAL_VARIABLES = [
  "operation",
  "operationVersion",
  "input",
  "operationContext",
  "packLock",
  "ruleRefs",
  "ruleSetRef",
  "evaluationProfileRef",
  "tolerances",
  "coordinateSystem",
  "metricPolicy",
  "requestedOutputs",
  "requestedArtifacts",
  "featureFlags",
  "sourceReferences",
  "status",
  "warnings",
  "errors",
  "provenance",
  "runRef",
  "packLockRef",
  "operationContextRef",
  "output",
  "outputRefs",
] as const;

export type CoreCanonicalVariable = (typeof CORE_CANONICAL_VARIABLES)[number];

export interface OutputChangingDefault {
  name: string;
  explicit?: boolean;
  versioned?: boolean;
}

export interface OperationCallContract {
  operation?: OperationDescriptor;
  operationVersion?: OperationVersion;
  input?: unknown;
  operationContext?: OperationContext | OperationContextRef | null;
  packLock?: PackLock | PackLockRef | null;
  ruleRefs?: readonly string[] | readonly SourceReference[];
  ruleSetRef?: string;
  evaluationProfileRef?: string;
  tolerances?: unknown;
  coordinateSystem?: unknown;
  metricPolicy?: unknown;
  requestedOutputs?: readonly string[];
  requestedArtifacts?: readonly string[];
  featureFlags?: Readonly<Record<string, boolean>>;
  sourceReferences?: readonly SourceReference[];
  hiddenDefaults?: readonly string[];
  outputChangingDefaults?: readonly OutputChangingDefault[];
  dependencyRefs?: readonly string[];
}

export interface CoreOperationRequest extends OperationCallContract {}

export interface OperationResultContract<TOutput = unknown> extends CoreResult<TOutput> {
  run?: Run | null;
  packLock?: PackLock | null;
  operationContext?: OperationContext | null;
  artifactRefs?: readonly SourceReference[];
  explanationRefs?: readonly SourceReference[];
}

export const GEOMETRY_V1_SUPPORTED_KINDS = [
  "segment-space",
  "surface-space",
  "composition-2d",
] as const;

export type GeometryV1Kind = (typeof GEOMETRY_V1_SUPPORTED_KINDS)[number];
export type CoordinateScale = "normalized" | "metric";
export type CoordinateDimensions = 1 | 2;

export interface CoordinateSystem {
  kind: "coordinate-system";
  id: string;
  origin: "bottom-left";
  xAxis: "right";
  yAxis: "up";
  dimensions: CoordinateDimensions;
  coordinateScale: CoordinateScale;
}

export interface MetricPolicy {
  kind: "metric-policy";
  id: string;
  quantity: "length";
  unit: string;
}

export interface TolerancePolicy {
  kind: "tolerance-policy";
  id: string;
  coordinateTolerance: number;
  metricTolerance?: number;
}

export interface Point {
  kind: "point";
  x: number;
  y?: number;
}

export interface Segment {
  kind: "segment";
  start: Point;
  end: Point;
}

export interface Line {
  kind: "line";
  segment: Segment;
  bounded: true;
}

export interface Rect {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Anchor {
  kind: "anchor";
  id: string;
  point: Point;
  targetElementId?: string;
}

export interface Element {
  kind: "element";
  id: string;
  geometry: Rect;
  anchors?: readonly Anchor[];
}

interface GeometryPolicyFields {
  coordinateSystem: CoordinateSystem;
  metricPolicy?: MetricPolicy | null;
  tolerancePolicy?: TolerancePolicy | null;
}

export interface SegmentSpace extends GeometryPolicyFields {
  kind: "segment-space";
  id: string;
  extent: Segment;
  line?: Line;
}

export interface SurfaceSpace extends GeometryPolicyFields {
  kind: "surface-space";
  id: string;
  bounds: Rect;
}

export interface Composition2D extends GeometryPolicyFields {
  kind: "composition-2d";
  id: string;
  surface: SurfaceSpace;
  elements: readonly Element[];
  anchors?: readonly Anchor[];
}

export type GeometryV1 = SegmentSpace | SurfaceSpace | Composition2D;

export const NORMA_CANONICAL_COORDINATE_SYSTEM: CoordinateSystem = Object.freeze({
  kind: "coordinate-system",
  id: "norma-canonical-2d-normalized",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "normalized",
});

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

const CORE_V1_CONCEPTUAL_OPERATIONS = [
  Object.freeze({ name: "core.validateGeometry", version: "0.1.0", status: "stub" }),
  Object.freeze({ name: "core.resolveRules", version: "0.1.0", status: "stub" }),
  Object.freeze({ name: "core.generateConstruction", version: "0.1.0", status: "stub" }),
  Object.freeze({ name: "core.measureConstruction", version: "0.1.0", status: "stub" }),
  Object.freeze({ name: "core.evaluateComposition", version: "0.1.0", status: "stub" }),
  Object.freeze({ name: "core.compareEvaluations", version: "0.1.0", status: "stub" }),
] as const satisfies readonly OperationDefinition[];

export const EMPTY_OPERATION_REGISTRY: OperationRegistry = Object.freeze({});

export const CORE_SKELETON_OPERATION_REGISTRY: OperationRegistry = Object.freeze({
  [operationKey(PR1_STUB_OPERATION.name, PR1_STUB_OPERATION.version)]: PR1_STUB_OPERATION,
});

export const CORE_OPERATION_REGISTRY: OperationRegistry = operationRegistryFromDefinitions(CORE_V1_CONCEPTUAL_OPERATIONS);

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

const GEOMETRY_V1_UNSUPPORTED_KINDS = [
  "3d",
  "cad-object",
  "curve",
  "image",
  "native-layer",
  "plugin-object",
  "polygon",
] as const;

const GEOMETRY_V1_UNSUPPORTED_FIELDS = [
  "angle",
  "cadObject",
  "color",
  "curve",
  "depth",
  "font",
  "image",
  "imageRef",
  "layer",
  "nativeLayer",
  "path",
  "pluginObject",
  "rotation",
  "src",
  "style",
  "transform",
  "z",
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

function operationRegistryFromDefinitions(operations: readonly OperationDefinition[]): OperationRegistry {
  return Object.freeze(
    Object.fromEntries(
      operations.map((operation) => [operationKey(operation.name, operation.version), operation]),
    ),
  ) as OperationRegistry;
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
        message: `Operation is registered as a stub operation and has no business implementation: ${operation.name}.`,
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

  const preflightFailure = firstFailure([
    dependencyBoundaryForRequest(requestValidation.request),
    inputShapeForRequest(requestValidation.request),
    failedResultOnly(validateOperationCallContract(requestValidation.request)),
  ]);

  return preflightFailure ?? executeRegisteredOperation(requestValidation.operationName, requestValidation.operationVersion, registry);
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
      errors: [
        createCoreError({
          code: "MissingProvenance",
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

export function validateOperationCallContract(request: unknown = {}): CoreResult {
  const requestValidation = validateOperationRequest(request as CoreOperationRequest);
  if (!requestValidation.ok) {
    return requestValidation.result;
  }

  const operationRequest = requestValidation.request;
  const failure = firstFailure([
    dependencyBoundaryForRequest(operationRequest),
    inputShapeForRequest(operationRequest),
    validateCanonicalCallShapes(operationRequest),
    validateCallContractGuardrails(operationRequest),
  ]);

  return failure ?? createCoreResult({
    status: "ok",
    provenance: createProvenance("core.operation-call-contract.validate", "0.1.0"),
  });
}

export function validateCoreOperationResult(result: unknown): CoreResult {
  if (!isRecord(result)) {
    return invalidInputShape("result", "Operation result must be an object.");
  }

  const shapeFailure = validateOperationResultShape(result);
  if (shapeFailure !== null) {
    return shapeFailure;
  }

  const outputRefs = result.outputRefs as readonly SourceReference[];
  const provenance = operationResultProvenance(result);
  const provenanceFailure = validateOperationResultProvenance(outputRefs, provenance);
  if (provenanceFailure !== null) {
    return provenanceFailure;
  }

  return createCoreResult({
    status: "ok",
    warnings: result.warnings as readonly CoreWarning[],
    outputRefs,
    provenance,
    output: result.output,
  });
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

type GeometryValueValidation<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      result: CoreResult;
    };

export function validateGeometryV1(geometry: unknown): CoreResult<GeometryV1> {
  const validation = validateGeometryV1Value(geometry);
  if (!validation.ok) {
    return validation.result as CoreResult<GeometryV1>;
  }

  return createCoreResult({
    status: "ok",
    provenance: createProvenance("core.geometry-v1.validate", "0.1.0"),
    output: validation.value,
  });
}

function validateGeometryV1Value(geometry: unknown): GeometryValueValidation<GeometryV1> {
  if (!isRecord(geometry)) {
    return failedGeometryValue(invalidGeometryV1("geometry", "Geometry V1 input must be a structured object."));
  }

  const geometryKind = geometry.kind;
  if (typeof geometryKind !== "string") {
    return failedGeometryValue(invalidGeometryV1("kind", "Geometry V1 input requires a string kind."));
  }

  if (isUnsupportedGeometryV1Kind(geometryKind) || !isGeometryV1Kind(geometryKind)) {
    return failedGeometryValue(unsupportedGeometryV1("kind", `Geometry kind is outside V1: ${geometryKind}.`));
  }

  const unsupportedField = firstUnsupportedGeometryField(geometry);
  if (unsupportedField !== null) {
    return failedGeometryValue(
      unsupportedGeometryV1(unsupportedField, `Geometry field is outside V1: ${unsupportedField}.`),
    );
  }

  if (geometryKind === "segment-space") {
    return validateSegmentSpace(geometry);
  }

  if (geometryKind === "surface-space") {
    return validateSurfaceSpace(geometry);
  }

  return validateComposition2D(geometry);
}

function validateSegmentSpace(value: Record<string, unknown>): GeometryValueValidation<SegmentSpace> {
  const policiesValidation = validateGeometryPolicies(value, 1);
  if (!policiesValidation.ok) {
    return policiesValidation;
  }

  const extentValidation = validateSegment(value.extent, policiesValidation.value.coordinateSystem, "extent");
  if (!extentValidation.ok) {
    return extentValidation;
  }

  if (value.line !== undefined) {
    const lineValidation = validateLine(value.line, policiesValidation.value.coordinateSystem, "line");
    if (!lineValidation.ok) {
      return lineValidation;
    }
  }

  if (!hasNonEmptyString(value, "id")) {
    return failedGeometryValue(invalidGeometryV1("id", "SegmentSpace requires a non-empty id."));
  }

  return validGeometryValue(value as unknown as SegmentSpace);
}

function validateSurfaceSpace(value: Record<string, unknown>): GeometryValueValidation<SurfaceSpace> {
  const policiesValidation = validateGeometryPolicies(value, 2);
  if (!policiesValidation.ok) {
    return policiesValidation;
  }

  const boundsValidation = validateRect(value.bounds, policiesValidation.value.coordinateSystem, "bounds");
  if (!boundsValidation.ok) {
    return boundsValidation;
  }

  if (!hasNonEmptyString(value, "id")) {
    return failedGeometryValue(invalidGeometryV1("id", "SurfaceSpace requires a non-empty id."));
  }

  return validGeometryValue(value as unknown as SurfaceSpace);
}

function validateComposition2D(value: Record<string, unknown>): GeometryValueValidation<Composition2D> {
  const policiesValidation = validateGeometryPolicies(value, 2);
  if (!policiesValidation.ok) {
    return policiesValidation;
  }

  if (!hasNonEmptyString(value, "id")) {
    return failedGeometryValue(invalidGeometryV1("id", "Composition2D requires a non-empty id."));
  }

  const surfaceValidation = validateSurfaceInput(value.surface);
  if (!surfaceValidation.ok) {
    return surfaceValidation;
  }

  if (!sameCoordinateSystem(policiesValidation.value.coordinateSystem, surfaceValidation.value.coordinateSystem)) {
    return failedGeometryValue(
      invalidGeometryV1("surface.coordinateSystem", "Composition2D and SurfaceSpace must use the same coordinate system."),
    );
  }

  const elementsValidation = validateElements(value.elements, policiesValidation.value.coordinateSystem);
  if (!elementsValidation.ok) {
    return elementsValidation;
  }

  const anchorsValidation = validateOptionalAnchors(value.anchors, policiesValidation.value.coordinateSystem, "anchors");
  if (!anchorsValidation.ok) {
    return anchorsValidation;
  }

  return validGeometryValue(value as unknown as Composition2D);
}

function validateSurfaceInput(value: unknown): GeometryValueValidation<SurfaceSpace> {
  if (!isRecord(value)) {
    return failedGeometryValue(invalidGeometryV1("surface", "Composition2D requires a rectangular SurfaceSpace."));
  }

  if (value.kind !== "surface-space") {
    return failedGeometryValue(invalidGeometryV1("surface.kind", "Composition2D surface must be a SurfaceSpace."));
  }

  const unsupportedField = firstUnsupportedGeometryField(value);
  if (unsupportedField !== null) {
    return failedGeometryValue(
      unsupportedGeometryV1(`surface.${unsupportedField}`, `SurfaceSpace field is outside V1: ${unsupportedField}.`),
    );
  }

  return validateSurfaceSpace(value);
}

function validateGeometryPolicies(
  value: Record<string, unknown>,
  expectedDimensions: CoordinateDimensions,
): GeometryValueValidation<GeometryPolicyFields> {
  const coordinateSystemValidation = validateCoordinateSystem(value.coordinateSystem, expectedDimensions);
  if (!coordinateSystemValidation.ok) {
    return coordinateSystemValidation;
  }

  const metricPolicyValidation = validateMetricPolicy(value.metricPolicy, coordinateSystemValidation.value.coordinateScale);
  if (!metricPolicyValidation.ok) {
    return metricPolicyValidation;
  }

  const tolerancePolicyValidation = validateTolerancePolicy(value.tolerancePolicy);
  if (!tolerancePolicyValidation.ok) {
    return tolerancePolicyValidation;
  }

  const policyFields: GeometryPolicyFields = {
    coordinateSystem: coordinateSystemValidation.value,
  };

  if (metricPolicyValidation.value !== null) {
    policyFields.metricPolicy = metricPolicyValidation.value;
  }

  if (tolerancePolicyValidation.value !== null) {
    policyFields.tolerancePolicy = tolerancePolicyValidation.value;
  }

  return validGeometryValue(policyFields);
}

function validateCoordinateSystem(
  value: unknown,
  expectedDimensions: CoordinateDimensions,
): GeometryValueValidation<CoordinateSystem> {
  if (value === undefined || value === null) {
    return failedGeometryValue(missingCoordinateSystem());
  }

  if (!isRecord(value)) {
    return failedGeometryValue(invalidGeometryV1("coordinateSystem", "CoordinateSystem must be a structured object."));
  }

  if (
    value.kind !== "coordinate-system" ||
    !hasNonEmptyString(value, "id") ||
    value.origin !== "bottom-left" ||
    value.xAxis !== "right" ||
    value.yAxis !== "up" ||
    !isCoordinateDimensions(value.dimensions) ||
    !isCoordinateScale(value.coordinateScale)
  ) {
    return failedGeometryValue(
      invalidGeometryV1(
        "coordinateSystem",
        "CoordinateSystem must declare the Norma canonical bottom-left, x-right, y-up frame.",
      ),
    );
  }

  if (value.dimensions !== expectedDimensions) {
    return failedGeometryValue(
      invalidGeometryV1("coordinateSystem.dimensions", `CoordinateSystem must be ${expectedDimensions}D for this geometry.`),
    );
  }

  return validGeometryValue(value as unknown as CoordinateSystem);
}

function validateMetricPolicy(value: unknown, coordinateScale: CoordinateScale): GeometryValueValidation<MetricPolicy | null> {
  if (value === undefined || value === null) {
    return coordinateScale === "metric"
      ? failedGeometryValue(missingMetricPolicy())
      : validGeometryValue(null);
  }

  if (
    !isRecord(value) ||
    value.kind !== "metric-policy" ||
    !hasNonEmptyString(value, "id") ||
    value.quantity !== "length" ||
    !hasNonEmptyString(value, "unit")
  ) {
    return failedGeometryValue(invalidGeometryV1("metricPolicy", "MetricPolicy must explicitly describe length units."));
  }

  return validGeometryValue(value as unknown as MetricPolicy);
}

function validateTolerancePolicy(value: unknown): GeometryValueValidation<TolerancePolicy | null> {
  if (value === undefined || value === null) {
    return validGeometryValue(null);
  }

  if (
    !isRecord(value) ||
    value.kind !== "tolerance-policy" ||
    !hasNonEmptyString(value, "id") ||
    !isNonNegativeFiniteNumber(value.coordinateTolerance) ||
    !hasOptionalNonNegativeFiniteNumber(value, "metricTolerance")
  ) {
    return failedGeometryValue(
      invalidGeometryV1("tolerancePolicy", "TolerancePolicy must expose explicit non-negative tolerances."),
    );
  }

  return validGeometryValue(value as unknown as TolerancePolicy);
}

function validateRect(
  value: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): GeometryValueValidation<Rect> {
  if (!isRecord(value)) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Rect must be a structured object."));
  }

  const unsupportedField = firstUnsupportedGeometryField(value);
  if (unsupportedField !== null) {
    return failedGeometryValue(
      unsupportedGeometryV1(`${targetRef}.${unsupportedField}`, `Rect field is outside V1: ${unsupportedField}.`),
    );
  }

  if (
    value.kind !== "rect" ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isPositiveFiniteNumber(value.width) ||
    !isPositiveFiniteNumber(value.height)
  ) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Rect must be axis-aligned with positive width and height."));
  }

  const rect = value as unknown as Rect;
  if (coordinateSystem.coordinateScale === "normalized" && !isNormalizedRect(rect)) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Normalized Rect coordinates must stay within [0,1]."));
  }

  return validGeometryValue(rect);
}

function validateSegment(
  value: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): GeometryValueValidation<Segment> {
  if (!isRecord(value) || value.kind !== "segment") {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Segment must be a structured object."));
  }

  const startValidation = validatePoint(value.start, coordinateSystem, `${targetRef}.start`);
  if (!startValidation.ok) {
    return startValidation;
  }

  const endValidation = validatePoint(value.end, coordinateSystem, `${targetRef}.end`);
  if (!endValidation.ok) {
    return endValidation;
  }

  if (samePoint(startValidation.value, endValidation.value)) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "SegmentSpace extent must be bounded by distinct points."));
  }

  return validGeometryValue(value as unknown as Segment);
}

function validateLine(
  value: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): GeometryValueValidation<Line> {
  if (!isRecord(value) || value.kind !== "line" || value.bounded !== true) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Line V1 must be explicitly bounded."));
  }

  const segmentValidation = validateSegment(value.segment, coordinateSystem, `${targetRef}.segment`);
  if (!segmentValidation.ok) {
    return segmentValidation;
  }

  return validGeometryValue(value as unknown as Line);
}

function validatePoint(
  value: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): GeometryValueValidation<Point> {
  if (!isRecord(value) || value.kind !== "point" || !isFiniteNumber(value.x)) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Point must expose finite coordinates."));
  }

  if (coordinateSystem.dimensions === 1 && value.y !== undefined) {
    return failedGeometryValue(invalidGeometryV1(`${targetRef}.y`, "Point in SegmentSpace V1 cannot declare y."));
  }

  if (coordinateSystem.dimensions === 2 && !isFiniteNumber(value.y)) {
    return failedGeometryValue(invalidGeometryV1(`${targetRef}.y`, "2D Point must expose a finite y coordinate."));
  }

  const point = value as unknown as Point;
  if (coordinateSystem.coordinateScale === "normalized" && !isNormalizedPoint(point, coordinateSystem.dimensions)) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Normalized Point coordinates must stay within [0,1]."));
  }

  return validGeometryValue(point);
}

function validateElements(
  value: unknown,
  coordinateSystem: CoordinateSystem,
): GeometryValueValidation<readonly Element[]> {
  if (!Array.isArray(value)) {
    return failedGeometryValue(invalidGeometryV1("elements", "Composition2D requires an elements array."));
  }

  for (const [index, element] of value.entries()) {
    const elementValidation = validateElement(element, coordinateSystem, `elements.${index}`);
    if (!elementValidation.ok) {
      return elementValidation;
    }
  }

  return validGeometryValue(value as readonly Element[]);
}

function validateElement(
  value: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): GeometryValueValidation<Element> {
  if (!isRecord(value) || value.kind !== "element" || !hasNonEmptyString(value, "id")) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Element must expose kind and id."));
  }

  const unsupportedField = firstUnsupportedGeometryField(value);
  if (unsupportedField !== null) {
    return failedGeometryValue(
      unsupportedGeometryV1(`${targetRef}.${unsupportedField}`, `Element field is outside V1: ${unsupportedField}.`),
    );
  }

  const rectValidation = validateRect(value.geometry, coordinateSystem, `${targetRef}.geometry`);
  if (!rectValidation.ok) {
    return rectValidation;
  }

  const anchorsValidation = validateOptionalAnchors(value.anchors, coordinateSystem, `${targetRef}.anchors`);
  if (!anchorsValidation.ok) {
    return anchorsValidation;
  }

  return validGeometryValue(value as unknown as Element);
}

function validateOptionalAnchors(
  value: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): GeometryValueValidation<readonly Anchor[] | null> {
  if (value === undefined || value === null) {
    return validGeometryValue(null);
  }

  if (!Array.isArray(value)) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Anchors must be an array when provided."));
  }

  for (const [index, anchor] of value.entries()) {
    const anchorValidation = validateAnchor(anchor, coordinateSystem, `${targetRef}.${index}`);
    if (!anchorValidation.ok) {
      return anchorValidation;
    }
  }

  return validGeometryValue(value as readonly Anchor[]);
}

function validateAnchor(
  value: unknown,
  coordinateSystem: CoordinateSystem,
  targetRef: string,
): GeometryValueValidation<Anchor> {
  if (!isRecord(value) || value.kind !== "anchor" || !hasNonEmptyString(value, "id")) {
    return failedGeometryValue(invalidGeometryV1(targetRef, "Anchor must expose kind and id."));
  }

  if (!hasOptionalStringField(value, "targetElementId")) {
    return failedGeometryValue(invalidGeometryV1(`${targetRef}.targetElementId`, "Anchor targetElementId must be a string."));
  }

  const pointValidation = validatePoint(value.point, coordinateSystem, `${targetRef}.point`);
  if (!pointValidation.ok) {
    return pointValidation;
  }

  return validGeometryValue(value as unknown as Anchor);
}

function missingCoordinateSystem(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "MissingCoordinateSystem",
        message: "Geometry V1 cannot be accepted without an explicit CoordinateSystem.",
        sourceRef: { kind: "coordinate-system", ref: "missing" },
      }),
    ],
  });
}

function unsupportedGeometryV1(targetRef: string, message: string): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "UnsupportedGeometryV1",
        message,
        targetRef,
        sourceRef: { kind: "geometry-v1", ref: targetRef },
      }),
    ],
  });
}

function invalidGeometryV1(targetRef: string, message: string): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "InvalidGeometryV1",
        message,
        targetRef,
        sourceRef: { kind: "geometry-v1", ref: targetRef },
      }),
    ],
  });
}

function missingMetricPolicy(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "MissingMetricPolicy",
        message: "Metric coordinate geometry requires an explicit MetricPolicy.",
        sourceRef: { kind: "metric-policy", ref: "missing" },
      }),
    ],
  });
}

function validGeometryValue<TValue>(value: TValue): GeometryValueValidation<TValue> {
  return { ok: true, value };
}

function failedGeometryValue<TValue>(result: CoreResult): GeometryValueValidation<TValue> {
  return { ok: false, result };
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

  const operationVersionOverride = typeof request.operationVersion === "string" ? request.operationVersion : undefined;
  const operationValidation = validateOperationDescriptor(request.operation, operationVersionOverride);
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

function validateOperationDescriptor(operation: unknown, operationVersionOverride?: OperationVersion): OperationDescriptorValidation {
  if (operation == null) {
    return failedRequestValidation(missingOperation());
  }

  if (!isRecord(operation)) {
    return failedRequestValidation(invalidInputShape("operation", "Operation descriptor must be an object."));
  }

  return validateOperationIdentity(operation, operationVersionOverride);
}

function validateOperationIdentity(
  operation: Record<string, unknown>,
  operationVersionOverride?: OperationVersion,
): OperationDescriptorValidation {
  const operationName = nonEmptyString(operation.name);
  if (operationName === null) {
    return failedRequestValidation(missingOperationName());
  }

  const operationVersion = nonEmptyString(operationVersionOverride ?? operation.version);
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

function validateCanonicalCallShapes(request: CoreOperationRequest): CoreResult | null {
  return firstFailure([
    validateOptionalStringArray(request.requestedOutputs, "requestedOutputs", "Requested outputs must be strings."),
    validateOptionalStringArray(request.requestedArtifacts, "requestedArtifacts", "Requested artifacts must be strings."),
    validateOptionalStringArray(request.hiddenDefaults, "hiddenDefaults", "Hidden defaults must be named with strings."),
    validateRuleRefsShape(request.ruleRefs),
    validateSourceReferencesShape(request.sourceReferences),
    validateFeatureFlagsShape(request.featureFlags),
    validateOutputChangingDefaultsShape(request.outputChangingDefaults),
  ]);
}

function validateCallContractGuardrails(request: CoreOperationRequest): CoreResult | null {
  return firstFailure([
    validateOperationContextGuardrail(request),
    validateFreeFormPromptGuardrail(request),
    validateHiddenToleranceGuardrail(request),
    validateHiddenDefaultGuardrail(request),
    validateImplicitPackGuardrail(request),
  ]);
}

function validateOperationResultShape(result: Record<string, unknown>): CoreResult | null {
  return firstFailure([
    validateResultStatusShape(result),
    validateResultOutputShape(result),
    validateResultDiagnosticsShape(result),
    validateResultOutputRefsShape(result),
  ]);
}

function validateOperationContextGuardrail(request: CoreOperationRequest): CoreResult | null {
  return hasEffectiveOperationContext(request) ? null : missingOperationContext();
}

function validateFreeFormPromptGuardrail(request: CoreOperationRequest): CoreResult | null {
  return hasFreeFormPromptInput(request.input) ? freeFormPromptNotAllowed() : null;
}

function validateHiddenToleranceGuardrail(request: CoreOperationRequest): CoreResult | null {
  return hasHiddenTolerance(request) ? hiddenToleranceNotAllowed() : null;
}

function validateHiddenDefaultGuardrail(request: CoreOperationRequest): CoreResult | null {
  return hasHiddenOutputChangingDefault(request) ? hiddenOutputChangingDefault() : null;
}

function validateImplicitPackGuardrail(request: CoreOperationRequest): CoreResult | null {
  return usesPackScopedReferences(request) && !hasEffectivePackLock(request) ? implicitPackNotAllowed() : null;
}

function validateResultStatusShape(result: Record<string, unknown>): CoreResult | null {
  return isOperationStatus(result.status)
    ? null
    : invalidInputShape("status", "Operation result status must be one of CORE_OPERATION_STATUSES.");
}

function validateResultOutputShape(result: Record<string, unknown>): CoreResult | null {
  return "output" in result ? null : missingResultOutput();
}

function validateResultDiagnosticsShape(result: Record<string, unknown>): CoreResult | null {
  if (!hasResultDiagnosticsArrays(result)) {
    return missingResultDiagnostics();
  }

  return hasStructuredResultDiagnostics(result)
    ? null
    : invalidInputShape("diagnostics", "Operation result warnings and errors must contain structured diagnostics.");
}

function hasResultDiagnosticsArrays(result: Record<string, unknown>): boolean {
  return ["warnings", "errors"].every((key) => Array.isArray(result[key]));
}

function hasStructuredResultDiagnostics(result: Record<string, unknown>): boolean {
  return isCoreWarningArray(result.warnings) && isCoreErrorArray(result.errors);
}

function validateResultOutputRefsShape(result: Record<string, unknown>): CoreResult | null {
  return isSourceReferenceArray(result.outputRefs)
    ? null
    : invalidInputShape("outputRefs", "Operation result outputRefs must be source references.");
}

function operationResultProvenance(result: Record<string, unknown>): Provenance | null {
  return result.provenance === null || isRecord(result.provenance) ? (result.provenance as Provenance | null) : null;
}

function validateOperationResultProvenance(
  outputRefs: readonly SourceReference[],
  provenance: Provenance | null,
): CoreResult | null {
  if (outputRefs.length === 0 || provenance !== null) {
    return null;
  }

  return createCoreResult({
    status: "failed",
    outputRefs,
    errors: [
      createCoreError({
        code: "MissingProvenance",
        message: "Derived operation result output cannot be accepted without provenance.",
        sourceRef: { kind: "provenance", ref: "missing" },
      }),
    ],
  });
}

function validateOptionalStringArray(value: unknown, targetRef: string, message: string): CoreResult | null {
  return value === undefined || isStringArray(value) ? null : invalidInputShape(targetRef, message);
}

function validateRuleRefsShape(value: unknown): CoreResult | null {
  return value === undefined || isStringArray(value) || isSourceReferenceArray(value)
    ? null
    : invalidInputShape("ruleRefs", "Rule references must be strings or source references.");
}

function validateSourceReferencesShape(value: unknown): CoreResult | null {
  return value === undefined || isSourceReferenceArray(value)
    ? null
    : invalidInputShape("sourceReferences", "Source references must expose kind and ref strings.");
}

function validateFeatureFlagsShape(value: unknown): CoreResult | null {
  return value === undefined || isBooleanRecord(value)
    ? null
    : invalidInputShape("featureFlags", "Feature flags must be explicit booleans.");
}

function validateOutputChangingDefaultsShape(value: unknown): CoreResult | null {
  return value === undefined || isOutputChangingDefaultArray(value)
    ? null
    : invalidInputShape(
        "outputChangingDefaults",
        "Output-changing defaults must expose a string name and boolean explicit/versioned flags.",
      );
}

function hasFreeFormPromptInput(input: unknown): boolean {
  if (!isRecord(input)) {
    return false;
  }

  return hasNonEmptyString(input, "prompt") || hasNonEmptyString(input, "freeFormPrompt");
}

function hasHiddenTolerance(request: CoreOperationRequest): boolean {
  return request.hiddenDefaults?.some((defaultName) => isToleranceName(defaultName)) ?? false;
}

function hasHiddenOutputChangingDefault(request: CoreOperationRequest): boolean {
  return request.outputChangingDefaults?.some(
    (defaultValue) => defaultValue.explicit !== true || defaultValue.versioned !== true,
  ) ?? false;
}

function usesPackScopedReferences(request: CoreOperationRequest): boolean {
  return request.ruleRefs !== undefined || request.ruleSetRef !== undefined || request.evaluationProfileRef !== undefined;
}

function hasEffectivePackLock(request: CoreOperationRequest): boolean {
  return request.packLock !== undefined && request.packLock !== null;
}

function hasEffectiveOperationContext(request: CoreOperationRequest): boolean {
  return request.operationContext !== undefined && request.operationContext !== null;
}

function freeFormPromptNotAllowed(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "FreeFormPromptNotAllowed",
        message: "Free-form prompt text cannot be used as Norma Core source input.",
        sourceRef: { kind: "input", ref: "prompt" },
      }),
    ],
  });
}

function implicitPackNotAllowed(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "ImplicitPackNotAllowed",
        message: "Pack-scoped operation data requires an explicit effective packLock.",
        sourceRef: { kind: "packLock", ref: "implicit" },
      }),
    ],
  });
}

function hiddenToleranceNotAllowed(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "HiddenToleranceNotAllowed",
        message: "Tolerance defaults that can affect output must be explicit and visible.",
        sourceRef: { kind: "tolerance", ref: "hidden" },
      }),
    ],
  });
}

function hiddenOutputChangingDefault(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "HiddenOutputChangingDefault",
        message: "Output-changing defaults must be explicit and versioned or rejected.",
        sourceRef: { kind: "operation-context", ref: "default" },
      }),
    ],
  });
}

function missingResultOutput(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "MissingResultOutput",
        message: "Operation result contract requires an explicit output field, even when null.",
        sourceRef: { kind: "result", ref: "output" },
      }),
    ],
  });
}

function missingResultDiagnostics(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "MissingResultDiagnostics",
        message: "Operation result contract requires visible warnings and errors arrays.",
        sourceRef: { kind: "result", ref: "diagnostics" },
      }),
    ],
  });
}

function missingOperationContext(): CoreResult {
  return createCoreResult({
    status: "failed",
    errors: [
      createCoreError({
        code: "MissingOperationContext",
        message: "Significant operation calls require an explicit operationContext.",
        sourceRef: { kind: "operation-context", ref: "missing" },
      }),
    ],
  });
}

function firstFailure(results: readonly (CoreResult | null)[]): CoreResult | null {
  return results.find((result) => result !== null) ?? null;
}

function failedResultOnly(result: CoreResult): CoreResult | null {
  return result.status === "ok" ? null : result;
}

function failedRequestValidation(result: CoreResult): FailedOperationValidation {
  return { ok: false, result };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isOperationStatus(value: unknown): value is OperationStatus {
  return typeof value === "string" && CORE_OPERATION_STATUSES.includes(value as OperationStatus);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSourceReferenceArray(value: unknown): value is readonly SourceReference[] {
  return Array.isArray(value) && value.every(isSourceReference);
}

function isSourceReference(value: unknown): value is SourceReference {
  return isRecord(value) && typeof value.kind === "string" && typeof value.ref === "string";
}

function isCoreWarningArray(value: unknown): value is readonly CoreWarning[] {
  return Array.isArray(value) && value.every(isCoreWarning);
}

function isCoreWarning(value: unknown): value is CoreWarning {
  return isDiagnostic(value) && isWarningSeverity(value.severity);
}

function isCoreErrorArray(value: unknown): value is readonly CoreError[] {
  return Array.isArray(value) && value.every(isCoreError);
}

function isCoreError(value: unknown): value is CoreError {
  return isDiagnostic(value) && isErrorSeverity(value.severity) && value.blocking === true;
}

const DIAGNOSTIC_SHAPE_CHECKS = [
  hasDiagnosticCode,
  hasDiagnosticSeverity,
  hasDiagnosticMessage,
  hasDiagnosticTargetRef,
  hasDiagnosticSource,
  hasDiagnosticBlocking,
  hasDiagnosticProvenance,
] as const;

function isDiagnostic(value: unknown): value is Diagnostic {
  return isRecord(value) && DIAGNOSTIC_SHAPE_CHECKS.every((check) => check(value));
}

function hasDiagnosticCode(value: Record<string, unknown>): boolean {
  return isDiagnosticCode(value.code);
}

function hasDiagnosticSeverity(value: Record<string, unknown>): boolean {
  return isDiagnosticSeverity(value.severity);
}

function hasDiagnosticMessage(value: Record<string, unknown>): boolean {
  return typeof value.message === "string";
}

function hasDiagnosticTargetRef(value: Record<string, unknown>): boolean {
  return value.targetRef === null || typeof value.targetRef === "string";
}

function hasDiagnosticSource(value: Record<string, unknown>): boolean {
  return isSourceReference(value.source);
}

function hasDiagnosticBlocking(value: Record<string, unknown>): boolean {
  return typeof value.blocking === "boolean";
}

function hasDiagnosticProvenance(value: Record<string, unknown>): boolean {
  return value.provenance === null || isRecord(value.provenance);
}

function isDiagnosticCode(value: unknown): value is DiagnosticCode {
  return typeof value === "string" && CORE_DIAGNOSTIC_CODES.includes(value as DiagnosticCode);
}

function isDiagnosticSeverity(value: unknown): value is DiagnosticSeverity {
  return isWarningSeverity(value) || isErrorSeverity(value);
}

function isWarningSeverity(value: unknown): value is CoreWarning["severity"] {
  return value === "info" || value === "warning" || value === "critical";
}

function isErrorSeverity(value: unknown): value is CoreError["severity"] {
  return value === "error" || value === "fatal";
}

function isBooleanRecord(value: unknown): value is Readonly<Record<string, boolean>> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "boolean");
}

function isOutputChangingDefaultArray(value: unknown): value is readonly OutputChangingDefault[] {
  return Array.isArray(value) && value.every(isOutputChangingDefault);
}

function isOutputChangingDefault(value: unknown): value is OutputChangingDefault {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }

  return hasOptionalBooleanField(value, "explicit") && hasOptionalBooleanField(value, "versioned");
}

function hasOptionalBooleanField(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || typeof value[key] === "boolean";
}

function hasOptionalStringField(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || typeof value[key] === "string";
}

function hasOptionalNonNegativeFiniteNumber(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || isNonNegativeFiniteNumber(value[key]);
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string" && value[key].length > 0;
}

function isToleranceName(value: string): boolean {
  return value.toLowerCase().includes("tolerance");
}

function isGeometryV1Kind(value: string): value is GeometryV1Kind {
  return GEOMETRY_V1_SUPPORTED_KINDS.includes(value as GeometryV1Kind);
}

function isUnsupportedGeometryV1Kind(value: string): boolean {
  return GEOMETRY_V1_UNSUPPORTED_KINDS.includes(value as (typeof GEOMETRY_V1_UNSUPPORTED_KINDS)[number]);
}

function firstUnsupportedGeometryField(value: Record<string, unknown>): string | null {
  return GEOMETRY_V1_UNSUPPORTED_FIELDS.find((field) => field in value) ?? null;
}

function isCoordinateDimensions(value: unknown): value is CoordinateDimensions {
  return value === 1 || value === 2;
}

function isCoordinateScale(value: unknown): value is CoordinateScale {
  return value === "normalized" || value === "metric";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function isNormalizedValue(value: number): boolean {
  return value >= 0 && value <= 1;
}

function isNormalizedPoint(point: Point, dimensions: CoordinateDimensions): boolean {
  return isNormalizedValue(point.x) && (dimensions === 1 || (point.y !== undefined && isNormalizedValue(point.y)));
}

function isNormalizedRect(rect: Rect): boolean {
  return (
    isNormalizedValue(rect.x) &&
    isNormalizedValue(rect.y) &&
    isNormalizedValue(rect.width) &&
    isNormalizedValue(rect.height) &&
    rect.x + rect.width <= 1 &&
    rect.y + rect.height <= 1
  );
}

function samePoint(firstPoint: Point, secondPoint: Point): boolean {
  return firstPoint.x === secondPoint.x && (firstPoint.y ?? null) === (secondPoint.y ?? null);
}

function sameCoordinateSystem(firstSystem: CoordinateSystem, secondSystem: CoordinateSystem): boolean {
  return (
    firstSystem.id === secondSystem.id &&
    firstSystem.origin === secondSystem.origin &&
    firstSystem.xAxis === secondSystem.xAxis &&
    firstSystem.yAxis === secondSystem.yAxis &&
    firstSystem.dimensions === secondSystem.dimensions &&
    firstSystem.coordinateScale === secondSystem.coordinateScale
  );
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
