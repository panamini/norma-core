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

function validOperationResult(overrides = {}) {
  return {
    status: "ok",
    output: null,
    outputRefs: [],
    warnings: [],
    errors: [],
    provenance: null,
    runRef: null,
    packLockRef: null,
    operationContextRef: null,
    ...overrides,
  };
}

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

test("core version reflects PR3 geometry model", () => {
  assert.equal(CORE_VERSION, "0.1.0-pr3");
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

test("operation call contract rejects malformed operationContext values", () => {
  for (const operationContext of ["bad", [], 42, false, { ref: { id: 42 } }]) {
    const result = core.validateOperationCallContract({
      operation: { name: "core.validateGeometry", version: "0.1.0" },
      operationContext,
      input: {},
      requestedOutputs: ["validated-geometry"],
      requestedArtifacts: [],
    });

    assertStructuredResult(result);
    assert.equal(result.status, "failed");
    assert.ok(diagnosticCodes(result).includes("InvalidInputShape"), String(operationContext));
  }
});

test("operation call contract rejects malformed packLock for pack-scoped references", () => {
  for (const packLock of ["bad", [], 42, false, { id: 42 }, { ref: { id: 42 } }]) {
    const result = core.validateOperationCallContract({
      operation: { name: "core.resolveRules", version: "0.1.0" },
      operationContext: explicitOperationContext,
      packLock,
      ruleSetRef: "surface-basic-third-grid",
      evaluationProfileRef: "profile:basic",
      input: {},
      requestedOutputs: ["rule-resolution"],
      requestedArtifacts: [],
    });

    assertStructuredResult(result);
    assert.equal(result.status, "failed");
    assert.ok(diagnosticCodes(result).includes("InvalidInputShape"), JSON.stringify(packLock));
    assert.ok(result.errors.some((error) => error.blocking), JSON.stringify(packLock));
  }
});

test("operation call contract accepts valid minimal structured refs", () => {
  const result = core.validateOperationCallContract({
    operation: { name: "core.resolveRules", version: "0.1.0" },
    operationContext: { ref: { id: "context:rules" } },
    packLock: { ref: { id: "pack-lock:rules" } },
    ruleSetRef: "surface-basic-third-grid",
    input: {},
    requestedOutputs: ["rule-resolution"],
    requestedArtifacts: [],
  });

  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.errors, []);
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
  const result = core.validateCoreOperationResult(
    validOperationResult({
      output: {},
      warnings: undefined,
      errors: undefined,
    }),
  );

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
  assertInvalidOperationResultShape(validOperationResult({
    output: { derived: true },
    outputRefs: [42, "bad"],
    provenance: resultProvenance,
  }));
});

test("operation result contract rejects missing output field", () => {
  const { output, ...resultShape } = validOperationResult();
  const result = core.validateCoreOperationResult(resultShape);

  assertStructuredResult(result);
  assert.equal(result.status, "failed");
  assert.ok(diagnosticCodes(result).includes("MissingResultOutput"));
});

test("operation result contract rejects missing visible envelope fields", () => {
  for (const field of ["provenance", "runRef", "packLockRef", "operationContextRef"]) {
    const resultShape = validOperationResult();
    delete resultShape[field];

    const result = core.validateCoreOperationResult(resultShape);

    assertStructuredResult(result);
    assert.equal(result.status, "failed", field);
    assert.ok(diagnosticCodes(result).includes("InvalidInputShape"), field);
  }
});

test("operation result contract rejects malformed provenance and runtime refs", () => {
  for (const overrides of [
    { provenance: "bad" },
    { provenance: { operationName: "core.test" } },
    { runRef: "bad" },
    { runRef: { id: 42 } },
    { packLockRef: "bad" },
    { packLockRef: { id: 42 } },
    { operationContextRef: "bad" },
    { operationContextRef: { id: 42 } },
  ]) {
    assertInvalidOperationResultShape(validOperationResult(overrides));
  }
});

test("operation result contract accepts valid minimal PR2 result envelope", () => {
  const result = core.validateCoreOperationResult(validOperationResult());

  assertStructuredResult(result);
  assert.equal(result.status, "ok");
  assert.deepEqual(result.errors, []);
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

const normalizedCoordinateSystem1d = {
  ...normalizedCoordinateSystem2d,
  id: "norma-canonical-1d-normalized",
  dimensions: 1,
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
  assert.equal(core.NORMA_CANONICAL_COORDINATE_SYSTEM.dimensions, 2);
  assert.equal(core.NORMA_CANONICAL_COORDINATE_SYSTEM.coordinateScale, "normalized");
});

test("PR3 validates a metric rectangular surface space", () => {
  const geometry = {
    kind: "surface-space",
    id: "surface:1200x800",
    coordinateSystem: metricCoordinateSystem2d,
    metricPolicy,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
  };

  const result = core.validateGeometryV1(geometry);

  assertGeometryOk(result);
  assert.equal(result.output, geometry);
  assert.equal(result.output.bounds.width, 1200);
  assert.equal(result.output.coordinateSystem.coordinateScale, "metric");
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
    coordinateSystem: normalizedCoordinateSystem1d,
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
    coordinateSystem: normalizedCoordinateSystem1d,
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
    { kind: "rect", x: 0, y: 0, width: Number.NaN, height: 1 },
    { kind: "rect", x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 1 },
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

test("PR3 composition requires rectangular element geometry and preserves order", () => {
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
  assert.deepEqual(validComposition.output.elements.map((element) => element.id), ["element:left", "element:right"]);

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

test("PR3 rejects unsupported coordinate systems", () => {
  for (const coordinateSystem of [
    { ...normalizedCoordinateSystem2d, origin: "top-left" },
    { ...normalizedCoordinateSystem2d, xAxis: "left" },
    { ...normalizedCoordinateSystem2d, yAxis: "down" },
    { ...normalizedCoordinateSystem2d, dimensions: 3 },
    { ...normalizedCoordinateSystem2d, coordinateScale: "pixels" },
  ]) {
    const result = core.validateGeometryV1({
      kind: "surface-space",
      id: "surface:bad-coordinate-system",
      coordinateSystem,
      tolerancePolicy,
      bounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
    });

    assertGeometryFailed(result, "InvalidGeometryV1");
  }
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

test("PR3 validates metric and tolerance policy shapes only", () => {
  const validTolerance = core.validateGeometryV1({
    kind: "surface-space",
    id: "surface:tolerance",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy: { kind: "tolerance-policy", id: "coordinate-only", coordinateTolerance: 0 },
    bounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
  });

  assertGeometryOk(validTolerance);
  assert.equal(validTolerance.output.tolerancePolicy.metricTolerance, undefined);

  for (const overrides of [
    { metricPolicy: { kind: "metric-policy", id: "", quantity: "length", unit: "unit" } },
    { metricPolicy: { kind: "metric-policy", id: "metric", quantity: "area", unit: "unit" } },
    { tolerancePolicy: { kind: "tolerance-policy", id: "bad", coordinateTolerance: -1 } },
    { tolerancePolicy: { kind: "tolerance-policy", id: "bad", coordinateTolerance: Number.NaN } },
  ]) {
    const result = core.validateGeometryV1({
      kind: "surface-space",
      id: "surface:bad-policy",
      coordinateSystem: metricCoordinateSystem2d,
      metricPolicy,
      tolerancePolicy,
      bounds: { kind: "rect", x: 0, y: 0, width: 1200, height: 800 },
      ...overrides,
    });

    assertGeometryFailed(result, "InvalidGeometryV1");
  }
});

test("PR3 rejects unbounded line values", () => {
  const result = core.validateGeometryV1({
    kind: "segment-space",
    id: "line:unbounded",
    coordinateSystem: normalizedCoordinateSystem1d,
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

test("PR3 rejects unsupported V1 geometry and presentation fields", () => {
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
    { kind: "curve", coordinateSystem: normalizedCoordinateSystem2d },
    { kind: "3d", coordinateSystem: normalizedCoordinateSystem2d },
    { kind: "image", coordinateSystem: normalizedCoordinateSystem2d, src: "camera-frame.png" },
    { kind: "cad-object", coordinateSystem: normalizedCoordinateSystem2d, cadObject: { id: "cad:1" } },
    { kind: "plugin-object", coordinateSystem: normalizedCoordinateSystem2d, pluginObject: { id: "plugin:1" } },
  ]) {
    assertGeometryFailed(core.validateGeometryV1(geometry), "UnsupportedGeometryV1");
  }
});

test("PR3 rejects unsupported fields on internal primitives", () => {
  for (const geometry of [
    {
      kind: "segment-space",
      id: "segment:point-z",
      coordinateSystem: normalizedCoordinateSystem1d,
      tolerancePolicy,
      extent: {
        kind: "segment",
        start: { kind: "point", x: 0, z: 0 },
        end: { kind: "point", x: 1 },
      },
    },
    {
      kind: "composition-2d",
      id: "composition:element-style",
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
          id: "element:styled",
          geometry: { kind: "rect", x: 0, y: 0, width: 600, height: 800 },
          style: "presentation",
        },
      ],
    },
  ]) {
    assertGeometryFailed(core.validateGeometryV1(geometry), "UnsupportedGeometryV1");
  }
});

test("PR3 geometry validation does not mutate or repair input", () => {
  const geometry = {
    kind: "surface-space",
    id: "surface:mutation-check",
    coordinateSystem: normalizedCoordinateSystem2d,
    tolerancePolicy,
    bounds: { kind: "rect", x: 0, y: 0, width: 1.25, height: 1 },
  };
  const before = JSON.stringify(geometry);

  const first = core.validateGeometryV1(geometry);
  const second = core.validateGeometryV1(geometry);

  assertGeometryFailed(first, "InvalidGeometryV1");
  assertGeometryFailed(second, "InvalidGeometryV1");
  assert.equal(JSON.stringify(geometry), before);
  assert.equal(first.errors[0].code, second.errors[0].code);
  assert.equal(geometry.bounds.width, 1.25);
});
