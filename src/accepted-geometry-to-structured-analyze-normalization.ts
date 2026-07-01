import { createHash } from "node:crypto";
import type {
  Composition2D,
  CoreError,
  MetricPolicy,
  SourceReference,
  SurfaceSpace,
  TolerancePolicy,
} from "./index.js";
import {
  validateGeometryV1,
} from "./index.js";
import type {
  StructuredCompositionTransformationStepV1,
} from "./structured-composition-analysis.js";
import {
  DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY,
  serializeCanonicalJson,
} from "./serialization.js";

export const ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_OPERATION_ID =
  "core.accepted-geometry-to-structured-analyze.normalize-synthetic-shared-unit-surface" as const;
export const ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION =
  "norma.accepted-geometry.structured-analyze.synthetic-shared-unit-surface@1" as const;
export const ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_DESCRIPTION =
  "Place both mapped compositions on one explicit synthetic unit surface for pair analysis." as const;

export type AcceptedGeometryStructuredAnalyzeNormalizationStatus = "normalized" | "invalid";
export type AcceptedGeometryStructuredAnalyzeNormalizationDiagnosticCode =
  | "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest"
  | "InvalidAcceptedGeometryStructuredAnalyzeMappedGeometry"
  | "InvalidAcceptedGeometryStructuredAnalyzeNormalizedGeometry";

export interface AcceptedGeometryStructuredAnalyzeNormalizationRequestV1 {
  readonly requestId: string;
  readonly mappedCompositionA: Composition2D;
  readonly mappedCompositionB: Composition2D;
  readonly normalizedCompositionAId: string;
  readonly normalizedCompositionBId: string;
  readonly sharedSurfaceId: string;
  readonly tolerancePolicy: TolerancePolicy;
  readonly transformationStepId: string;
}

export interface AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic {
  readonly code: AcceptedGeometryStructuredAnalyzeNormalizationDiagnosticCode;
  readonly severity: "error";
  readonly path: string;
  readonly message: string;
}

export interface AcceptedGeometryStructuredAnalyzeNormalizationResultV1 {
  readonly operationId: typeof ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_OPERATION_ID;
  readonly normalizationVersion: typeof ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION;
  readonly requestId: string;
  readonly ok: boolean;
  readonly status: AcceptedGeometryStructuredAnalyzeNormalizationStatus;
  readonly sharedSurface: SurfaceSpace | null;
  readonly compositionA: Composition2D | null;
  readonly compositionB: Composition2D | null;
  readonly acceptedSourceIds: readonly string[];
  readonly transformationStep: StructuredCompositionTransformationStepV1 | null;
  readonly resultContentIdentity: string;
  readonly diagnostics: readonly AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[];
}

const REQUEST_KEYS = [
  "requestId",
  "mappedCompositionA",
  "mappedCompositionB",
  "normalizedCompositionAId",
  "normalizedCompositionBId",
  "sharedSurfaceId",
  "tolerancePolicy",
  "transformationStepId",
] as const;

type NormalizationRequestKey = typeof REQUEST_KEYS[number];
type NormalizationRequestFieldValues = Record<NormalizationRequestKey, unknown>;

export function normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1(
  input: unknown,
): AcceptedGeometryStructuredAnalyzeNormalizationResultV1 {
  const requestId = requestIdFor(input);

  try {
    return normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceChecked(input, requestId);
  } catch (error) {
    if (isDeterministicSerializationError(error)) {
      return createNormalizationResult({
        requestId,
        status: "invalid",
        diagnostics: [
          diagnostic(
            "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
            "",
            "AcceptedGeometry Structured Analyze normalization request must be deterministically serializable.",
          ),
        ],
      });
    }

    return createNormalizationResult({
      requestId,
      status: "invalid",
      diagnostics: [
        diagnostic(
          "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
          "",
          "AcceptedGeometry Structured Analyze normalization request could not be safely inspected.",
        ),
      ],
    });
  }
}

function normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceChecked(
  input: unknown,
  requestId: string,
): AcceptedGeometryStructuredAnalyzeNormalizationResultV1 {
  const diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[] = [];

  if (!isRecord(input)) {
    return createNormalizationResult({
      requestId,
      status: "invalid",
      diagnostics: [
        diagnostic(
          "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
          "",
          "AcceptedGeometry Structured Analyze normalization request must be a closed object.",
        ),
      ],
    });
  }

  validateExactRequestKeys(input, diagnostics);
  const requestFields = requestFieldsFor(input, diagnostics);
  validateNonEmptyString(requestFields.requestId, "requestId", diagnostics);
  validateNonEmptyString(requestFields.normalizedCompositionAId, "normalizedCompositionAId", diagnostics);
  validateNonEmptyString(requestFields.normalizedCompositionBId, "normalizedCompositionBId", diagnostics);
  validateNonEmptyString(requestFields.sharedSurfaceId, "sharedSurfaceId", diagnostics);
  validateNonEmptyString(requestFields.transformationStepId, "transformationStepId", diagnostics);
  validateTolerancePolicy(requestFields.tolerancePolicy, "tolerancePolicy", diagnostics);

  const mappedCompositionA = compositionFor(requestFields.mappedCompositionA, "mappedCompositionA", diagnostics);
  const mappedCompositionB = compositionFor(requestFields.mappedCompositionB, "mappedCompositionB", diagnostics);

  if (diagnostics.length !== 0 || mappedCompositionA === null || mappedCompositionB === null) {
    return createNormalizationResult({
      requestId,
      status: "invalid",
      diagnostics,
    });
  }

  const request = requestFields as unknown as AcceptedGeometryStructuredAnalyzeNormalizationRequestV1;
  validateCrossCompositionPolicyCompatibility(mappedCompositionA, mappedCompositionB, diagnostics);
  validateCrossCompositionInputSourceIds(mappedCompositionA, mappedCompositionB, diagnostics);
  validateOutputSourceIds(request, mappedCompositionA, mappedCompositionB, diagnostics);

  if (diagnostics.length !== 0) {
    return createNormalizationResult({
      requestId,
      status: "invalid",
      diagnostics,
    });
  }

  const effectiveMetricPolicy = effectiveMetricPolicyFor(mappedCompositionA);
  const sharedSurface: SurfaceSpace = {
    kind: "surface-space",
    id: request.sharedSurfaceId,
    coordinateSystem: mappedCompositionA.surface.coordinateSystem,
    ...(effectiveMetricPolicy === null
      ? {}
      : { metricPolicy: effectiveMetricPolicy }),
    bounds: {
      kind: "rect",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
    tolerancePolicy: request.tolerancePolicy,
  };
  const compositionA: Composition2D = {
    ...mappedCompositionA,
    id: request.normalizedCompositionAId,
    ...(effectiveMetricPolicy === null
      ? {}
      : { metricPolicy: effectiveMetricPolicy }),
    surface: sharedSurface,
    tolerancePolicy: request.tolerancePolicy,
  };
  const compositionB: Composition2D = {
    ...mappedCompositionB,
    id: request.normalizedCompositionBId,
    ...(effectiveMetricPolicy === null
      ? {}
      : { metricPolicy: effectiveMetricPolicy }),
    surface: sharedSurface,
    tolerancePolicy: request.tolerancePolicy,
  };

  validateNormalizedComposition(compositionA, "compositionA", diagnostics);
  validateNormalizedComposition(compositionB, "compositionB", diagnostics);

  if (diagnostics.length !== 0) {
    return createNormalizationResult({
      requestId,
      status: "invalid",
      diagnostics,
    });
  }

  const transformationStep: StructuredCompositionTransformationStepV1 = {
    kind: "structured-composition-transformation-step",
    id: request.transformationStepId,
    description: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_DESCRIPTION,
    inputRefs: [
      compositionRef(mappedCompositionA.id),
      compositionRef(mappedCompositionB.id),
    ],
    outputRefs: [
      { kind: "surface", ref: sharedSurface.id },
      compositionRef(compositionA.id),
      compositionRef(compositionB.id),
    ],
  };

  return createNormalizationResult({
    requestId,
    status: "normalized",
    sharedSurface,
    compositionA,
    compositionB,
    acceptedSourceIds: sourceIdsFor(compositionA, compositionB),
    transformationStep,
    diagnostics: [],
  });
}

function compositionFor(
  value: unknown,
  path: string,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): Composition2D | null {
  let validation: ReturnType<typeof validateGeometryV1>;
  try {
    validation = validateGeometryV1(value);
  } catch {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeMappedGeometry",
      path,
      "Mapped accepted geometry could not be safely inspected.",
    ));
    return null;
  }

  if (validation.status !== "ok" || validation.output === null || validation.output === undefined) {
    diagnostics.push(...diagnosticsForCoreErrors(
      validation.errors,
      path,
      "InvalidAcceptedGeometryStructuredAnalyzeMappedGeometry",
    ));
    return null;
  }

  if (validation.output.kind !== "composition-2d") {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeMappedGeometry",
      path,
      "Mapped accepted geometry must be a Core Composition2D.",
    ));
    return null;
  }

  return validation.output;
}

function validateNormalizedComposition(
  value: Composition2D,
  path: string,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  let validation: ReturnType<typeof validateGeometryV1>;
  try {
    validation = validateGeometryV1(value);
  } catch {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeNormalizedGeometry",
      path,
      "Normalized geometry could not be safely inspected.",
    ));
    return;
  }

  if (validation.status !== "ok") {
    diagnostics.push(...diagnosticsForCoreErrors(
      validation.errors,
      path,
      "InvalidAcceptedGeometryStructuredAnalyzeNormalizedGeometry",
    ));
  }
}

function diagnosticsForCoreErrors(
  errors: readonly CoreError[],
  path: string,
  code: AcceptedGeometryStructuredAnalyzeNormalizationDiagnosticCode,
): readonly AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[] {
  if (errors.length === 0) {
    return [
      diagnostic(
        code,
        path,
        "Composition geometry failed Core geometry validation.",
      ),
    ];
  }

  return errors.map((error) => diagnostic(
    code,
    targetPath(path, error.targetRef),
    error.message,
  ));
}

function validateExactRequestKeys(
  request: Record<string, unknown>,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  const allowed = new Set<string>(REQUEST_KEYS);
  for (const key of Object.keys(request).sort(compareStrings)) {
    if (!allowed.has(key)) {
      diagnostics.push(diagnostic(
        "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
        key,
        `AcceptedGeometry Structured Analyze normalization request contains unsupported field: ${key}.`,
      ));
    }
  }

  for (const key of REQUEST_KEYS) {
    if (!Object.hasOwn(request, key)) {
      diagnostics.push(diagnostic(
        "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
        key,
        `AcceptedGeometry Structured Analyze normalization request requires field: ${key}.`,
      ));
    }
  }
}

function requestFieldsFor(
  request: Record<string, unknown>,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): NormalizationRequestFieldValues {
  const fields: Partial<Record<NormalizationRequestKey, unknown>> = {};

  for (const key of REQUEST_KEYS) {
    if (!Object.hasOwn(request, key)) {
      continue;
    }

    try {
      fields[key] = request[key];
    } catch {
      diagnostics.push(diagnostic(
        "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
        key,
        `${key} could not be safely inspected.`,
      ));
    }
  }

  return fields as NormalizationRequestFieldValues;
}

function validateTolerancePolicy(
  value: unknown,
  path: string,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  try {
    if (isTolerancePolicy(value)) {
      return;
    }
  } catch {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
      path,
      `${path} could not be safely inspected.`,
    ));
    return;
  }

  diagnostics.push(diagnostic(
    "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
    path,
    `${path} must be a valid explicit TolerancePolicy.`,
  ));
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  if (typeof value !== "string" || value.length === 0) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
      path,
      `${path} must be a non-empty string.`,
    ));
  }
}

function validateCrossCompositionInputSourceIds(
  mappedCompositionA: Composition2D,
  mappedCompositionB: Composition2D,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  const sourceIdsA = new Set(sourceIdsFor(mappedCompositionA));

  for (const sourceId of sourceIdsFor(mappedCompositionB)) {
    if (sourceIdsA.has(sourceId)) {
      diagnostics.push(diagnostic(
        "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
        "mappedCompositionB",
        `mappedCompositionB must not reuse source id from mappedCompositionA: ${sourceId}.`,
      ));
    }
  }
}

function validateCrossCompositionPolicyCompatibility(
  mappedCompositionA: Composition2D,
  mappedCompositionB: Composition2D,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  if (!sameDeterministicValue(mappedCompositionA.coordinateSystem, mappedCompositionB.coordinateSystem)) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
      "mappedCompositionB.coordinateSystem",
      "mappedCompositionB coordinate system must match mappedCompositionA.",
    ));
  }

  validateCompositionSurfaceMetricPolicyCompatibility(mappedCompositionA, "mappedCompositionA", diagnostics);
  validateCompositionSurfaceMetricPolicyCompatibility(mappedCompositionB, "mappedCompositionB", diagnostics);

  if (!sameDeterministicValue(effectiveMetricPolicyFor(mappedCompositionA), effectiveMetricPolicyFor(mappedCompositionB))) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
      "mappedCompositionB.metricPolicy",
      "mappedCompositionB effective metricPolicy must match mappedCompositionA.",
    ));
  }
}

function validateCompositionSurfaceMetricPolicyCompatibility(
  composition: Composition2D,
  path: string,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  if (
    composition.metricPolicy !== undefined
    && composition.metricPolicy !== null
    && composition.surface.metricPolicy !== undefined
    && composition.surface.metricPolicy !== null
    && !sameDeterministicValue(composition.metricPolicy, composition.surface.metricPolicy)
  ) {
    diagnostics.push(diagnostic(
      "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
      `${path}.surface.metricPolicy`,
      `${path} surface metricPolicy must match its composition metricPolicy.`,
    ));
  }
}

function effectiveMetricPolicyFor(composition: Composition2D): MetricPolicy | null {
  return composition.surface.metricPolicy ?? composition.metricPolicy ?? null;
}

function validateOutputSourceIds(
  request: AcceptedGeometryStructuredAnalyzeNormalizationRequestV1,
  mappedCompositionA: Composition2D,
  mappedCompositionB: Composition2D,
  diagnostics: AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[],
): void {
  const inputSourceIds = new Set(sourceIdsFor(mappedCompositionA, mappedCompositionB));
  const outputSourceIds = [
    ["normalizedCompositionAId", request.normalizedCompositionAId],
    ["normalizedCompositionBId", request.normalizedCompositionBId],
    ["sharedSurfaceId", request.sharedSurfaceId],
  ] as const;
  const seenOutputIds = new Map<string, string>();

  for (const [path, outputSourceId] of outputSourceIds) {
    const firstPath = seenOutputIds.get(outputSourceId);
    if (firstPath !== undefined) {
      diagnostics.push(diagnostic(
        "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
        path,
        `${path} must not duplicate ${firstPath}.`,
      ));
    } else {
      seenOutputIds.set(outputSourceId, path);
    }

    if (inputSourceIds.has(outputSourceId)) {
      diagnostics.push(diagnostic(
        "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
        path,
        `${path} must not reuse an input source id.`,
      ));
    }
  }
}

function createNormalizationResult(input: {
  readonly requestId: string;
  readonly status: AcceptedGeometryStructuredAnalyzeNormalizationStatus;
  readonly sharedSurface?: SurfaceSpace | null;
  readonly compositionA?: Composition2D | null;
  readonly compositionB?: Composition2D | null;
  readonly acceptedSourceIds?: readonly string[];
  readonly transformationStep?: StructuredCompositionTransformationStepV1 | null;
  readonly diagnostics: readonly AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic[];
}): AcceptedGeometryStructuredAnalyzeNormalizationResultV1 {
  const resultWithoutIdentity = {
    operationId: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_OPERATION_ID,
    normalizationVersion: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
    requestId: input.requestId,
    ok: input.status === "normalized",
    status: input.status,
    sharedSurface: input.sharedSurface ?? null,
    compositionA: input.compositionA ?? null,
    compositionB: input.compositionB ?? null,
    acceptedSourceIds: input.acceptedSourceIds ?? [],
    transformationStep: input.transformationStep ?? null,
    diagnostics: input.diagnostics,
  };

  return {
    ...resultWithoutIdentity,
    resultContentIdentity: contentIdentityFor(resultWithoutIdentity),
  };
}

function sourceIdsFor(...compositions: readonly Composition2D[]): readonly string[] {
  return [...new Set(compositions.flatMap((composition) => [
    composition.id,
    composition.surface.id,
    ...composition.elements.map((element) => element.id),
    ...(composition.anchors ?? []).map((anchor) => anchor.id),
    ...composition.elements.flatMap((element) => (element.anchors ?? []).map((anchor) => anchor.id)),
  ]))].sort(compareStrings);
}

function compareStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function compositionRef(ref: string): SourceReference {
  return { kind: "composition-2d", ref };
}

function targetPath(path: string, targetRef: string | null): string {
  if (targetRef === null || targetRef.length === 0) {
    return path;
  }

  return `${path}.${targetRef}`;
}

function requestIdFor(value: unknown): string {
  try {
    if (isRecord(value) && typeof value.requestId === "string" && value.requestId.length > 0) {
      return value.requestId;
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

function diagnostic(
  code: AcceptedGeometryStructuredAnalyzeNormalizationDiagnosticCode,
  path: string,
  message: string,
): AcceptedGeometryStructuredAnalyzeNormalizationDiagnostic {
  return {
    code,
    severity: "error",
    path,
    message,
  };
}

function contentIdentityFor(value: unknown): string {
  const hash = createHash("sha256");
  hash.update(serializeCanonicalJson(value, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY));
  return `sha256:${hash.digest("hex")}`;
}

function sameDeterministicValue(first: unknown, second: unknown): boolean {
  return serializeCanonicalJson(first, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY)
    === serializeCanonicalJson(second, DETERMINISTIC_IDENTITY_SERIALIZATION_POLICY);
}

function isDeterministicSerializationError(error: unknown): boolean {
  return error instanceof TypeError && error.message.startsWith("Stable serialization");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function isTolerancePolicy(value: unknown): value is TolerancePolicy {
  return isRecord(value)
    && value.kind === "tolerance-policy"
    && typeof value.id === "string"
    && value.id.length > 0
    && nonNegativeFiniteNumber(value.coordinateTolerance)
    && (value.metricTolerance === undefined || nonNegativeFiniteNumber(value.metricTolerance));
}

function nonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
