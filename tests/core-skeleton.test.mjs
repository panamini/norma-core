import assert from "node:assert/strict";
import test from "node:test";

import * as core from "../dist/src/index.js";
import {
  CORE_DIAGNOSTIC_CODES,
  CORE_VERSION,
  CORE_SKELETON_OPERATION_REGISTRY,
  createCoreError,
  createCoreWarning,
  executeCoreOperation,
  suppressCoreWarnings,
  validateCoreDependencyBoundary,
  validateCoreSkeleton,
  validateOutputProvenance,
} from "../dist/src/index.js";

const diagnosticFields = [
  "code",
  "severity",
  "message",
  "targetRef",
  "source",
  "blocking",
  "provenance",
];

function diagnosticCodes(result) {
  return [...result.errors, ...result.warnings].map((diagnostic) => diagnostic.code);
}

const explicitOperationContext = { ref: { id: "context:test" } };

const resultProvenance = {
  operationName: "core.test",
  operationVersion: "0.1.0",
  inputRefs: [],
  source: { kind: "test", ref: "result" },
};

function assertStructuredResult(result) {
  assert.equal(typeof result, "object");
  assert.ok(result.status);
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.outputRefs));
  assert.ok("output" in result);
  assert.ok("provenance" in result);
  assert.ok("runRef" in result);
  assert.ok("packLockRef" in result);
  assert.ok("operationContextRef" in result);

  for (const diagnostic of [...result.errors, ...result.warnings]) {
    for (const field of diagnosticFields) {
      assert.ok(field in diagnostic, `diagnostic missing ${field}`);
    }
  }
}

function assertFailedWithDiagnostic(result, diagnosticCode) {
  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes(diagnosticCode));
}

function assertInvalidOperationResultShape(resultShape) {
  assertFailedWithDiagnostic(core.validateCoreOperationResult(resultShape), "InvalidInputShape");
}

test("core version reflects PR7 measurements", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr7");
});

test("validateCoreSkeleton returns a structured result", () => {
  const result = validateCoreSkeleton();

  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
});

test("structured result arrays are not shared across calls", () => {
  const firstResult = validateCoreSkeleton();
  const secondResult = validateCoreSkeleton();

  assert.notEqual(firstResult.errors, secondResult.errors);
  assert.notEqual(firstResult.warnings, secondResult.warnings);
  assert.notEqual(firstResult.outputRefs, secondResult.outputRefs);

  firstResult.errors.push(
    createCoreError({
      code: "InternalInvariantViolation",
      message: "Synthetic mutation must not leak to later results.",
    }),
  );

  const laterResult = validateCoreSkeleton();

  assert.equal(laterResult.status, "ok");
  assert.equal(laterResult.errors.length, 0);
});

test("required and additional PR1 diagnostics are exported", () => {
  assert.deepEqual(
    new Set(CORE_DIAGNOSTIC_CODES),
    new Set([
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
      "MissingRatioPack",
      "MissingRatioPackVersion",
      "MissingRatioPackIdentity",
      "MissingRatioPackContentIdentity",
      "InvalidRatioPackV1",
      "UnsupportedRatioPackV1",
      "DuplicateRatioDefinition",
      "InvalidRatioValue",
      "InvalidRatioSequence",
      "MissingRatioReference",
      "UnsupportedRatioPackClaim",
      "MissingRuleSet",
      "MissingRuleDeclaration",
      "MissingRuleType",
      "UnsupportedRuleType",
      "InvalidRuleDeclaration",
      "InvalidRuleSet",
      "AgentCreatedRuleRejected",
      "ExecutableRuleInPackRejected",
      "MissingConstructionInput",
      "MissingResolvedRuleSet",
      "InvalidConstructionInput",
      "UnsupportedConstructionGeometry",
      "UnsupportedConstructionRule",
      "MissingConstructionProvenance",
      "ConstructionTraceMissing",
      "DerivedObjectMissingSource",
      "MissingMeasurementInput",
      "InvalidMeasurementInput",
      "MissingSourceGeometry",
      "MissingMeasurementMetricPolicy",
      "MissingMeasurementTolerancePolicy",
      "MissingMeasurementProvenance",
      "MeasurementGapWarning",
      "MeasurementOverlapWarning",
      "MeasurementOutOfTolerance",
      "MeasurementOutputRejected",
    ]),
  );
});

test("required PR1 diagnostics are exported separately for skeleton validation", () => {
  assert.deepEqual(
    new Set(core.REQUIRED_PR1_DIAGNOSTIC_CODES),
    new Set([
      "MissingOperation",
      "UnsupportedOperation",
      "NotImplemented",
      "InvalidInputShape",
      "CriticalWarningNotSuppressible",
      "MissingProvenance",
    ]),
  );
});

test("required diagnostic comparison detects a missing required diagnostic", () => {
  const diagnosticCodesWithoutMissingOperation = CORE_DIAGNOSTIC_CODES.filter(
    (code) => code !== "MissingOperation",
  );

  assert.deepEqual(core.missingRequiredDiagnosticCodes(diagnosticCodesWithoutMissingOperation), [
    "MissingOperation",
  ]);
});

test("missing operation returns MissingOperation", () => {
  const result = executeCoreOperation({});

  assertFailedWithDiagnostic(result, "MissingOperation");
});

test("unknown operation returns UnsupportedOperation", () => {
  const result = executeCoreOperation({
    operation: { name: "core.unknown", version: "0.1.0" },
    operationContext: explicitOperationContext,
    input: {},
  });

  assertFailedWithDiagnostic(result, "UnsupportedOperation");
});

test("known stub operation returns not implemented without fake output", () => {
  const result = executeCoreOperation({
    operation: { name: "core.skeleton.stub", version: "0.1.0" },
    operationContext: explicitOperationContext,
    input: {},
  });

  assertStructuredResult(result);
  assert.equal(result.status, "not_implemented");
  assert.equal(result.output, null);
  assert.deepEqual(result.outputRefs, []);
  assert.ok(diagnosticCodes(result).includes("OperationNotImplemented"));
  assert.ok(result.errors.some((error) => !error.message.includes("PR1 stub")));
  assert.ok(result.errors.some((error) => error.message.includes("stub operation")));
});

test("known stub operation with unsupported version returns UnsupportedOperation", () => {
  const result = executeCoreOperation({
    operation: { name: "core.skeleton.stub", version: "9.9.9" },
    operationContext: explicitOperationContext,
    input: {},
  });

  assertFailedWithDiagnostic(result, "UnsupportedOperation");
});

test("malformed input returns InvalidInputShape", () => {
  const result = executeCoreOperation({
    operation: { name: "core.skeleton.stub", version: "0.1.0" },
    input: "free-form prompt input",
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("InvalidInputShape"));
});

test("PR2 operation contract exports canonical validation levels", () => {
  assert.deepEqual(core.CORE_VALIDATION_LEVELS, ["call", "result", "replay"]);
});

test("PR2 canonical variables include runtime refs", () => {
  assert.ok(core.CORE_CANONICAL_VARIABLES.includes("packLockRef"));
  assert.ok(core.CORE_CANONICAL_VARIABLES.includes("operationContextRef"));
});

test("PR2 operation registry exposes only conceptual V1 stub operations", () => {
  assert.deepEqual(Object.keys(core.CORE_OPERATION_REGISTRY), [
    "core.validateGeometry@0.1.0",
    "core.resolveRules@0.1.0",
    "core.generateConstruction@0.1.0",
    "core.measureConstruction@0.1.0",
    "core.evaluateComposition@0.1.0",
    "core.compareEvaluations@0.1.0",
  ]);

  for (const operation of Object.values(core.CORE_OPERATION_REGISTRY)) {
    assert.equal(operation.status, "stub");
  }
});

test("operation without operationVersion returns MissingOperationVersion", () => {
  const result = executeCoreOperation({
    operation: { name: "core.skeleton.stub" },
    input: {},
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingOperationVersion"));
});

test("operation call contract rejects implicit pack usage", () => {
  const result = core.validateOperationCallContract({
    operation: { name: "core.resolveRules", version: "0.1.0" },
    operationContext: explicitOperationContext,
    input: {},
    packLock: null,
    ruleSetRef: "surface-basic-third-grid",
    requestedOutputs: ["rule-resolution"],
    requestedArtifacts: [],
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("ImplicitPackNotAllowed"));
});

test("operation call contract rejects missing operationContext", () => {
  const result = core.validateOperationCallContract({
    operation: { name: "core.validateGeometry", version: "0.1.0" },
    input: {},
    requestedOutputs: ["validated-geometry"],
    requestedArtifacts: [],
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingOperationContext"));
});

test("operation call contract rejects hidden tolerance", () => {
  const result = core.validateOperationCallContract({
    operation: { name: "core.measureConstruction", version: "0.1.0" },
    input: {},
    operationContext: { ref: { id: "context:measurement" } },
    requestedOutputs: ["measurements"],
    requestedArtifacts: [],
    hiddenDefaults: ["tolerance"],
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("HiddenToleranceNotAllowed"));
});

test("operation call contract rejects free-form prompt input", () => {
  const result = core.validateOperationCallContract({
    operation: { name: "core.validateGeometry", version: "0.1.0" },
    operationContext: explicitOperationContext,
    input: { prompt: "draw a pleasing golden rectangle" },
    requestedOutputs: ["validated-geometry"],
    requestedArtifacts: [],
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("FreeFormPromptNotAllowed"));
});

test("operation call contract rejects output-changing defaults that are not explicit", () => {
  const result = core.validateOperationCallContract({
    operation: { name: "core.evaluateComposition", version: "0.1.0" },
    input: {},
    operationContext: { ref: { id: "context:evaluation" } },
    evaluationProfileRef: "profile:basic",
    requestedOutputs: ["evaluation"],
    requestedArtifacts: [],
    outputChangingDefaults: [{ name: "roundingPolicy", explicit: false, versioned: false }],
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("HiddenOutputChangingDefault"));
});

test("operation result contract rejects missing warnings or errors arrays", () => {
  const result = core.validateCoreOperationResult({
    status: "ok",
    output: {},
    outputRefs: [],
    provenance: null,
    runRef: null,
    packLockRef: null,
    operationContextRef: null,
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingResultDiagnostics"));
});

test("operation result contract rejects malformed warnings or errors entries", () => {
  for (const resultShape of [
    {
      status: "ok",
      output: null,
      outputRefs: [],
      warnings: [42, "bad"],
      errors: [],
      provenance: null,
      runRef: null,
      packLockRef: null,
      operationContextRef: null,
    },
    {
      status: "failed",
      output: null,
      outputRefs: [],
      warnings: [],
      errors: [42, "bad"],
      provenance: null,
      runRef: null,
      packLockRef: null,
      operationContextRef: null,
    },
  ]) {
    assertInvalidOperationResultShape(resultShape);
  }
});

test("operation result contract rejects missing or invalid status", () => {
  for (const resultShape of [
    {
      output: null,
      outputRefs: [],
      warnings: [],
      errors: [],
      provenance: null,
      runRef: null,
      packLockRef: null,
      operationContextRef: null,
    },
    {
      status: "maybe",
      output: null,
      outputRefs: [],
      warnings: [],
      errors: [],
      provenance: null,
      runRef: null,
      packLockRef: null,
      operationContextRef: null,
    },
  ]) {
    assertInvalidOperationResultShape(resultShape);
  }
});

test("operation result contract rejects derived output without provenance", () => {
  const result = core.validateCoreOperationResult({
    status: "ok",
    output: { derived: true },
    outputRefs: [{ kind: "core-output", ref: "derived:1" }],
    warnings: [],
    errors: [],
    provenance: null,
    runRef: null,
    packLockRef: null,
    operationContextRef: null,
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingProvenance"));
});

test("operation result contract rejects malformed outputRefs entries", () => {
  assertInvalidOperationResultShape({
    status: "ok",
    output: { derived: true },
    outputRefs: [42, "bad"],
    warnings: [],
    errors: [],
    provenance: resultProvenance,
    runRef: null,
    packLockRef: null,
    operationContextRef: null,
  });
});

test("operation result contract rejects missing output field", () => {
  const result = core.validateCoreOperationResult({
    status: "ok",
    outputRefs: [],
    warnings: [],
    errors: [],
    provenance: null,
    runRef: null,
    packLockRef: null,
    operationContextRef: null,
  });

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingResultOutput"));
});

test("critical warnings cannot be suppressed", () => {
  const criticalWarning = createCoreWarning({
    code: "MissingProvenance",
    severity: "critical",
    message: "Critical provenance warning.",
    sourceRef: { kind: "provenance", ref: "test" },
  });

  const result = suppressCoreWarnings([criticalWarning], ["MissingProvenance"]);

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("CriticalWarningNotSuppressible"));
});

test("derived output without provenance returns MissingProvenance", () => {
  const result = validateOutputProvenance([{ kind: "core-output", ref: "derived:1" }], null);

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingProvenance"));
  assert.ok(result.errors.some((error) => error.code === "MissingProvenance"));
});

test("forbidden core dependency returns ForbiddenCoreDependency", () => {
  const result = validateCoreDependencyBoundary(["react-ui-client"]);

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("ForbiddenCoreDependency"));
});

test("dependency boundary does not reject allowed substrings inside words", () => {
  const result = validateCoreDependencyBoundary([
    "@norma/build-tools",
    "@norma/client-core",
    "@norma/cascade-core",
  ]);

  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.errors, []);
});

test("dependency boundary rejects forbidden dependency segments", () => {
  for (const dependencyRef of ["ui", "camera-adapter", "opencv", "core-plugin-adapter"]) {
    const result = validateCoreDependencyBoundary([dependencyRef]);

    assertStructuredResult(result);
    assert.equal(result.status, "failed", dependencyRef);
    assert.ok(diagnosticCodes(result).includes("ForbiddenCoreDependency"), dependencyRef);
  }
});

test("the skeleton registry exposes only the known stub operation", () => {
  assert.deepEqual(Object.keys(CORE_SKELETON_OPERATION_REGISTRY), ["core.skeleton.stub@0.1.0"]);
});

const metricCoordinateSystem2d = {
  kind: "coordinate-system",
  id: "norma-canonical-2d-metric",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "metric",
};

const normalizedCoordinateSystem2d = {
  kind: "coordinate-system",
  id: "norma-canonical-2d-normalized",
  origin: "bottom-left",
  xAxis: "right",
  yAxis: "up",
  dimensions: 2,
  coordinateScale: "normalized",
};

const metricPolicy = {
  kind: "metric-policy",
  id: "unit-length-policy",
  quantity: "length",
  unit: "unit",
};

const tolerancePolicy = {
  kind: "tolerance-policy",
  id: "exact-geometry",
  coordinateTolerance: 0,
  metricTolerance: 0,
};

function assertGeometryOk(result) {
  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.equal(result.errors.length, 0);
  assert.ok(result.output);
}

function assertGeometryFailed(result, diagnosticCode) {
  assertFailedWithDiagnostic(result, diagnosticCode);
  assert.equal(result.output, null);
}

test("PR3 exports canonical geometry model vocabulary", () => {
  assert.deepEqual(core.GEOMETRY_V1_SUPPORTED_KINDS, [
    "segment-space",
    "surface-space",
    "composition-2d",
  ]);
  assert.equal(core.NORMA_CANONICAL_COORDINATE_SYSTEM.origin, "bottom-left");
  assert.equal(core.NORMA_CANONICAL_COORDINATE_SYSTEM.xAxis, "right");
  assert.equal(core.NORMA_CANONICAL_COORDINATE_SYSTEM.yAxis, "up");
});

test("PR3 validates a metric rectangular surface space", () => {
  const result = core.validateGeometryV1({
    kind: "surface-space",
    id: "surface:1200x800",
    coordinateSystem: metricCoordinateSystem2d,
    metricPolicy,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
  });

  assertGeometryOk(result);
  assert.equal(result.output.bounds.width, 1200);
  assert.equal(result.output.bounds.height, 800);
  assert.equal(result.output.coordinateSystem.coordinateScale, "metric");
});

test("PR3 geometry validation provenance uses the stable core source", () => {
  const result = core.validateGeometryV1({
    kind: "surface-space",
    id: "surface:stable-source",
    coordinateSystem: metricCoordinateSystem2d,
    metricPolicy,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
  });

  assertGeometryOk(result);
  assert.equal(result.provenance.source.ref, "norma-core/core");
});

test("PR3 validates normalized rectangles without treating them as metric measurements", () => {
  const result = core.validateGeometryV1({
    kind: "composition-2d",
    id: "composition:normalized",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    surface: {
      kind: "surface-space",
      id: "surface:normalized",
      coordinateSystem: normalizedCoordinateSystem2d,
      tolerancePolicy,
      bounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
    },
    elements: [
      {
        kind: "element",
        id: "element:rect",
        geometry: { kind: "rect", x: 0.25, y: 0.1, width: 0.5, height: 0.4 },
      },
    ],
  });

  assertGeometryOk(result);
  assert.equal(result.output.coordinateSystem.coordinateScale, "normalized");
  assert.equal(result.output.metricPolicy ?? null, null);
});

test("PR3 validates a bounded segment space and rejects zero-length segments", () => {
  const validSegment = core.validateGeometryV1({
    kind: "segment-space",
    id: "segment:unit",
    coordinateSystem: {
      ...normalizedCoordinateSystem2d,
      id: "norma-canonical-1d-normalized",
      dimensions: 1,
    },
    tolerancePolicy,
    extent: {
      kind: "segment",
      start: { kind: "point", x: 0 },
      end: { kind: "point", x: 1 },
    },
  });

  assertGeometryOk(validSegment);

  const zeroSegment = core.validateGeometryV1({
    kind: "segment-space",
    id: "segment:zero",
    coordinateSystem: {
      ...normalizedCoordinateSystem2d,
      id: "norma-canonical-1d-normalized",
      dimensions: 1,
    },
    tolerancePolicy,
    extent: {
      kind: "segment",
      start: { kind: "point", x: 0.5 },
      end: { kind: "point", x: 0.5 },
    },
  });

  assertGeometryFailed(zeroSegment, "InvalidGeometryV1");
});

test("PR3 rejects invalid surface bounds", () => {
  for (const bounds of [
    { kind: "rect", x: 0, y: 0, width: 0, height: 800 },
    { kind: "rect", x: 0, y: 0, width: 1200, height: -1 },
    { kind: "rect", x: 0.75, y: 0, width: 0.5, height: 1 },
  ]) {
    const result = core.validateGeometryV1({
      kind: "surface-space",
      id: "surface:invalid-bounds",
      coordinateSystem: bounds.width <= 1 ? normalizedCoordinateSystem2d : metricCoordinateSystem2d,
      metricPolicy: bounds.width <= 1 ? undefined : metricPolicy,
      tolerancePolicy,
      bounds,
    });

    assertGeometryFailed(result, "InvalidGeometryV1");
  }
});

test("PR3 rejects unsupported fields on internal primitives", () => {
  for (const geometry of [
    {
      kind: "segment-space",
      id: "segment:point-z",
      coordinateSystem: {
        ...normalizedCoordinateSystem2d,
        id: "norma-canonical-1d-normalized",
        dimensions: 1,
      },
      tolerancePolicy,
      extent: {
        kind: "segment",
        start: { kind: "point", x: 0, z: 0 },
        end: { kind: "point", x: 1 },
      },
    },
    {
      kind: "segment-space",
      id: "segment:rotation",
      coordinateSystem: {
        ...normalizedCoordinateSystem2d,
        id: "norma-canonical-1d-normalized",
        dimensions: 1,
      },
      tolerancePolicy,
      extent: {
        kind: "segment",
        start: { kind: "point", x: 0 },
        end: { kind: "point", x: 1 },
        rotation: 15,
      },
    },
    {
      kind: "segment-space",
      id: "line:angle",
      coordinateSystem: {
        ...normalizedCoordinateSystem2d,
        id: "norma-canonical-1d-normalized",
        dimensions: 1,
      },
      tolerancePolicy,
      extent: {
        kind: "segment",
        start: { kind: "point", x: 0 },
        end: { kind: "point", x: 1 },
      },
      line: {
        kind: "line",
        bounded: true,
        segment: {
          kind: "segment",
          start: { kind: "point", x: 0 },
          end: { kind: "point", x: 1 },
        },
        angle: 0,
      },
    },
    {
      kind: "composition-2d",
      id: "composition:anchor-style",
      coordinateSystem: metricCoordinateSystem2d,
      metricPolicy,
      tolerancePolicy,
      surface: {
        kind: "surface-space",
        id: "surface:metric",
        coordinateSystem: metricCoordinateSystem2d,
        metricPolicy,
        tolerancePolicy,
        bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
      },
      elements: [{ kind: "element", id: "element:rect", geometry: { kind: "rect", x: 0, y: 0, width: 600, height: 800 } }],
      anchors: [{ kind: "anchor", id: "anchor:styled", point: { kind: "point", x: 600, y: 400 }, style: "pin" }],
    },
  ]) {
    const result = core.validateGeometryV1(geometry);

    assertGeometryFailed(result, "UnsupportedGeometryV1");
  }
});

test("PR3 composition requires rectangular element geometry", () => {
  const validComposition = core.validateGeometryV1({
    kind: "composition-2d",
    id: "composition:rectangles",
    coordinateSystem: metricCoordinateSystem2d,
    metricPolicy,
    tolerancePolicy,
    surface: {
      kind: "surface-space",
      id: "surface:metric",
      coordinateSystem: metricCoordinateSystem2d,
      metricPolicy,
      tolerancePolicy,
      bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
    },
    elements: [
      {
        kind: "element",
        id: "element:left",
        geometry: { kind: "rect", x: 0, y: 0, width: 600, height: 800 },
      },
      {
        kind: "element",
        id: "element:right",
        geometry: { kind: "rect", x: 600, y: 0, width: 600, height: 800 },
      },
    ],
    anchors: [{ kind: "anchor", id: "anchor:center", point: { kind: "point", x: 600, y: 400 } }],
  });

  assertGeometryOk(validComposition);
  assert.equal(validComposition.output.elements.length, 2);

  const invalidElement = core.validateGeometryV1({
    kind: "composition-2d",
    id: "composition:missing-element-geometry",
    coordinateSystem: metricCoordinateSystem2d,
    metricPolicy,
    tolerancePolicy,
    surface: {
      kind: "surface-space",
      id: "surface:metric",
      coordinateSystem: metricCoordinateSystem2d,
      metricPolicy,
      tolerancePolicy,
      bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
    },
    elements: [{ kind: "element", id: "element:missing" }],
  });

  assertGeometryFailed(invalidElement, "InvalidGeometryV1");
});

test("PR3 rejects geometry without an explicit coordinate system", () => {
  const result = core.validateGeometryV1({
    kind: "surface-space",
    id: "surface:missing-coordinate-system",
    metricPolicy,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
  });

  assertGeometryFailed(result, "MissingCoordinateSystem");
});

test("PR3 rejects metric coordinate geometry without metric policy", () => {
  const result = core.validateGeometryV1({
    kind: "surface-space",
    id: "surface:missing-metric-policy",
    coordinateSystem: metricCoordinateSystem2d,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
  });

  assertGeometryFailed(result, "MissingMetricPolicy");
});

test("PR3 rejects unbounded line values", () => {
  const result = core.validateGeometryV1({
    kind: "segment-space",
    id: "line:unbounded",
    coordinateSystem: {
      ...normalizedCoordinateSystem2d,
      id: "norma-canonical-1d-normalized",
      dimensions: 1,
    },
    tolerancePolicy,
    extent: {
      kind: "segment",
      start: { kind: "point", x: 0 },
      end: { kind: "point", x: 1 },
    },
    line: {
      kind: "line",
      bounded: false,
      segment: {
        kind: "segment",
        start: { kind: "point", x: 0 },
        end: { kind: "point", x: 1 },
      },
    },
  });

  assertGeometryFailed(result, "InvalidGeometryV1");
});

test("PR3 rejects geometry outside V1", () => {
  for (const geometry of [
    {
      kind: "surface-space",
      id: "surface:rotated",
      coordinateSystem: metricCoordinateSystem2d,
      metricPolicy,
      tolerancePolicy,
      bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800, rotation: 15 },
    },
    {
      kind: "polygon",
      coordinateSystem: normalizedCoordinateSystem2d,
      points: [
        { kind: "point", x: 0, y: 0 },
        { kind: "point", x: 1, y: 0 },
        { kind: "point", x: 0.5, y: 1 },
      ],
    },
    {
      kind: "image",
      coordinateSystem: normalizedCoordinateSystem2d,
      src: "camera-frame.png",
    },
    {
      kind: "native-layer",
      coordinateSystem: normalizedCoordinateSystem2d,
      layer: "background",
    },
    {
      kind: "cad-object",
      coordinateSystem: normalizedCoordinateSystem2d,
      cadObject: { id: "cad:1" },
    },
    {
      kind: "plugin-object",
      coordinateSystem: normalizedCoordinateSystem2d,
      pluginObject: { id: "plugin:1" },
    },
  ]) {
    const result = core.validateGeometryV1(geometry);

    assertGeometryFailed(result, "UnsupportedGeometryV1");
  }
});

test("PR3 rejects unsupported element presentation fields", () => {
  for (const field of ["style", "layer", "font"]) {
    const result = core.validateGeometryV1({
      kind: "composition-2d",
      id: `composition:element-${field}`,
      coordinateSystem: metricCoordinateSystem2d,
      metricPolicy,
      tolerancePolicy,
      surface: {
        kind: "surface-space",
        id: "surface:metric",
        coordinateSystem: metricCoordinateSystem2d,
        metricPolicy,
        tolerancePolicy,
        bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
      },
      elements: [
        {
          kind: "element",
          id: `element:${field}`,
          geometry: { kind: "rect", x: 0, y: 0, width: 600, height: 800 },
          [field]: "presentation",
        },
      ],
    });

    assertGeometryFailed(result, "UnsupportedGeometryV1");
  }
});
