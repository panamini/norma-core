import assert from "node:assert/strict";
import test from "node:test";

import * as packageRoot from "../dist/src/index.js";
import {
  ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_DESCRIPTION,
  ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_OPERATION_ID,
  ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION,
  normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1,
} from "../dist/src/accepted-geometry-to-structured-analyze-normalization.js";

test("PR85 keeps shared-unit-surface normalization package-private and off the package root", async () => {
  const normalizationModule = await import("../dist/src/accepted-geometry-to-structured-analyze-normalization.js");
  const packagePrivateNames = [
    "ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_DESCRIPTION",
    "ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_OPERATION_ID",
    "ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION",
    "normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1",
  ];

  for (const name of packagePrivateNames) {
    assert.equal(name in normalizationModule, true, `${name} should exist on the package-private normalization module`);
    assert.equal(name in packageRoot, false, `${name} must not be exported from the package root`);
  }
});

test("PR85 normalizes mapped AcceptedGeometry compositions onto an explicit synthetic unit surface", () => {
  const request = validNormalizationRequest();
  const snapshot = structuredClone(request);
  const first = normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1(request);
  const second = normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1(structuredClone(request));

  assert.deepEqual(request, snapshot);
  assert.equal(first.ok, true);
  assert.equal(first.status, "normalized");
  assert.equal(first.operationId, ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_OPERATION_ID);
  assert.equal(first.normalizationVersion, ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_VERSION);
  assert.deepEqual(first.diagnostics, []);
  assert.match(first.resultContentIdentity, /^sha256:[0-9a-f]{64}$/);
  assert.equal(first.resultContentIdentity, second.resultContentIdentity);

  assert.deepEqual(first.sharedSurface, {
    ...request.mappedCompositionA.surface,
    id: "surface:pr85:synthetic-unit",
    tolerancePolicy: request.tolerancePolicy,
  });
  assert.equal(first.compositionA.id, "composition:pr85:mapped:A");
  assert.equal(first.compositionB.id, "composition:pr85:mapped:B");
  assert.deepEqual(first.compositionA.surface, first.sharedSurface);
  assert.deepEqual(first.compositionB.surface, first.sharedSurface);
  assert.deepEqual(first.compositionA.tolerancePolicy, request.tolerancePolicy);
  assert.deepEqual(first.compositionB.tolerancePolicy, request.tolerancePolicy);
  assert.deepEqual(first.acceptedSourceIds, [
    "composition:pr85:mapped:A",
    "composition:pr85:mapped:B",
    "element:pr85:A:left",
    "element:pr85:B:right",
    "surface:pr85:synthetic-unit",
  ]);
  assert.deepEqual(first.transformationStep, {
    kind: "structured-composition-transformation-step",
    id: "transformation:pr85:shared-unit-surface",
    description: ACCEPTED_GEOMETRY_STRUCTURED_ANALYZE_NORMALIZATION_DESCRIPTION,
    inputRefs: [
      { kind: "composition-2d", ref: "composition:mapped:A" },
      { kind: "composition-2d", ref: "composition:mapped:B" },
    ],
    outputRefs: [
      { kind: "surface", ref: "surface:pr85:synthetic-unit" },
      { kind: "composition-2d", ref: "composition:pr85:mapped:A" },
      { kind: "composition-2d", ref: "composition:pr85:mapped:B" },
    ],
  });
});

test("PR85 rejects invalid normalization requests without throwing", () => {
  const cases = [
    {
      label: "non-object request",
      input: null,
      code: "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
      path: "",
    },
    {
      label: "missing explicit shared surface id",
      input: {
        ...validNormalizationRequest(),
        sharedSurfaceId: "",
      },
      code: "InvalidAcceptedGeometryStructuredAnalyzeNormalizationRequest",
      path: "sharedSurfaceId",
    },
    {
      label: "non-composition mapped geometry",
      input: {
        ...validNormalizationRequest(),
        mappedCompositionA: unitSurface("surface:not-a-composition"),
      },
      code: "InvalidAcceptedGeometryStructuredAnalyzeMappedGeometry",
      path: "mappedCompositionA",
    },
    {
      label: "invalid normalized tolerance policy",
      input: {
        ...validNormalizationRequest(),
        tolerancePolicy: {
          kind: "tolerance-policy",
          id: "tolerance:invalid",
          coordinateTolerance: -1,
        },
      },
      code: "InvalidAcceptedGeometryStructuredAnalyzeNormalizedGeometry",
      path: "compositionA.tolerancePolicy",
    },
  ];

  for (const testCase of cases) {
    assert.doesNotThrow(() => normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1(testCase.input), testCase.label);
    const result = normalizeAcceptedGeometryMappedPairToSharedUnitSurfaceV1(testCase.input);

    assert.equal(result.ok, false, testCase.label);
    assert.equal(result.status, "invalid", testCase.label);
    assert.equal(result.sharedSurface, null, testCase.label);
    assert.equal(result.compositionA, null, testCase.label);
    assert.equal(result.compositionB, null, testCase.label);
    assert.equal(result.transformationStep, null, testCase.label);
    assert.equal(result.acceptedSourceIds.length, 0, testCase.label);
    assert.equal(
      result.diagnostics.some((diagnostic) => diagnostic.code === testCase.code && diagnostic.path === testCase.path),
      true,
      testCase.label,
    );
  }
});

function validNormalizationRequest() {
  return {
    requestId: "request:pr85:synthetic-shared-unit-surface",
    mappedCompositionA: mappedComposition("A", "element:pr85:A:left", { x: 0, y: 0, width: 0.5, height: 1 }),
    mappedCompositionB: mappedComposition("B", "element:pr85:B:right", { x: 0.5, y: 0, width: 0.5, height: 1 }),
    normalizedCompositionAId: "composition:pr85:mapped:A",
    normalizedCompositionBId: "composition:pr85:mapped:B",
    sharedSurfaceId: "surface:pr85:synthetic-unit",
    tolerancePolicy: {
      kind: "tolerance-policy",
      id: "tolerance:pr85",
      coordinateTolerance: 0,
    },
    transformationStepId: "transformation:pr85:shared-unit-surface",
  };
}

function mappedComposition(label, elementId, geometry) {
  return {
    kind: "composition-2d",
    id: `composition:mapped:${label}`,
    coordinateSystem: packageRoot.NORMA_CANONICAL_COORDINATE_SYSTEM,
    surface: unitSurface(`surface:mapped:${label}:unit`),
    elements: [
      {
        kind: "element",
        id: elementId,
        geometry: {
          kind: "rect",
          ...geometry,
        },
      },
    ],
  };
}

function unitSurface(id) {
  return {
    kind: "surface-space",
    id,
    coordinateSystem: packageRoot.NORMA_CANONICAL_COORDINATE_SYSTEM,
    bounds: {
      kind: "rect",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
  };
}
