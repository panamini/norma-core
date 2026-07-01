import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as packageRoot from "../dist/src/index.js";
import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
} from "../dist/src/geometry-observation.js";
import {
  ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
  ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
  ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
  computeAcceptedGeometryToCoreMappingResultContentIdentity,
  computeMappedGeometryContentIdentity,
  mapAcceptedGeometryToCoreV1,
} from "../dist/src/accepted-geometry-to-core-mapping.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "fixtures", "geometry-observation");
const validAcceptedGeometryFixture = readJsonFixture("valid-accepted-geometry-v1.json");

const digestB = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("PR81 keeps the mapper package-private and off the package root", async () => {
  const mapperModule = await import("../dist/src/accepted-geometry-to-core-mapping.js");
  const packagePrivateNames = [
    "mapAcceptedGeometryToCoreV1",
    "computeMappedGeometryContentIdentity",
    "computeAcceptedGeometryToCoreMappingResultContentIdentity",
    "ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID",
    "ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM",
  ];

  for (const name of packagePrivateNames) {
    assert.equal(name in mapperModule, true, `${name} should exist on the package-private mapper module`);
    assert.equal(name in packageRoot, false, `${name} must not be exported from the package root`);
  }
});

test("PR81 maps accepted rectangles to Core Composition2D with the approved coordinate transform", () => {
  const acceptedGeometry = acceptedRectangleGeometry([
    rectanglePrimitive({
      id: "rectangle:frame",
      x: 0.1,
      y: 0.2,
      width: 0.7,
      height: 0.6,
    }),
  ]);
  const result = mapAcceptedGeometryToCoreV1(validRequest({ acceptedGeometry }));

  assert.equal(result.ok, true);
  assert.equal(result.status, "mapped");
  assert.equal(result.contractId, ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID);
  assert.equal(result.contractVersion, ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION);
  assert.equal(result.mapperOperationId, ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID);
  assert.equal(result.mapperOperationVersion, ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION);
  assert.equal(result.mappingProfileId, ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID);
  assert.equal(result.targetCoreProfileId, ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID);
  assert.equal(result.targetCoreGeometryKind, ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND);
  assert.deepEqual(result.coordinateTransform.targetCoordinateSystem, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM);
  assert.deepEqual(result.diagnostics, []);
  assert.ok(result.mappedGeometry);
  assert.equal(result.mappedGeometry.kind, "composition-2d");
  assert.equal(result.mappedGeometry.id, `composition:accepted-geometry:${acceptedGeometry.acceptedGeometryId}:rectangles`);
  assert.deepEqual(result.mappedGeometry.coordinateSystem, ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM);
  assert.deepEqual(result.mappedGeometry.surface, {
    kind: "surface-space",
    id: `surface:accepted-geometry:${acceptedGeometry.acceptedGeometryId}:unit`,
    coordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    bounds: {
      kind: "rect",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    },
  });
  assert.deepEqual(result.mappedGeometry.elements, [
    {
      kind: "element",
      id: `element:accepted-geometry:${acceptedGeometry.acceptedGeometryId}:primitive:rectangle:frame`,
      geometry: {
        kind: "rect",
        x: 0.1,
        y: 0.20000000000000007,
        width: 0.7,
        height: 0.6,
      },
    },
  ]);
  assert.deepEqual(result.primitiveMappings, [
    {
      acceptedGeometryId: acceptedGeometry.acceptedGeometryId,
      acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
      sourceObservationId: acceptedGeometry.sourceObservationId,
      sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
      acceptedPrimitiveId: "rectangle:frame",
      acceptedPrimitiveKind: "rectangle",
      coreObjectKind: "element",
      coreObjectId: `element:accepted-geometry:${acceptedGeometry.acceptedGeometryId}:primitive:rectangle:frame`,
      coreObjectRef: "mappedGeometry.elements.0",
      mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    },
  ]);
  assert.equal(result.mappedGeometryContentIdentity, computeMappedGeometryContentIdentity(result.mappedGeometry));
  assert.equal(result.resultContentIdentity, computeAcceptedGeometryToCoreMappingResultContentIdentity(result));
  assert.match(result.mappedGeometryContentIdentity, /^sha256:[0-9a-f]{64}$/);
  assert.match(result.resultContentIdentity, /^sha256:[0-9a-f]{64}$/);
});

test("PR81 preserves multiple rectangle primitive order", () => {
  const acceptedGeometry = acceptedRectangleGeometry([
    rectanglePrimitive({ id: "rectangle:first", x: 0, y: 0, width: 0.25, height: 0.25 }),
    rectanglePrimitive({ id: "rectangle:second", x: 0.5, y: 0.25, width: 0.25, height: 0.5 }),
  ]);
  const result = mapAcceptedGeometryToCoreV1(validRequest({ acceptedGeometry }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.mappedGeometry.elements.map((element) => element.id), [
    `element:accepted-geometry:${acceptedGeometry.acceptedGeometryId}:primitive:rectangle:first`,
    `element:accepted-geometry:${acceptedGeometry.acceptedGeometryId}:primitive:rectangle:second`,
  ]);
  assert.deepEqual(result.mappedGeometry.elements.map((element) => element.geometry), [
    { kind: "rect", x: 0, y: 0.75, width: 0.25, height: 0.25 },
    { kind: "rect", x: 0.5, y: 0.25, width: 0.25, height: 0.5 },
  ]);
  assert.deepEqual(result.primitiveMappings.map((mapping) => mapping.acceptedPrimitiveId), [
    "rectangle:first",
    "rectangle:second",
  ]);
});

test("PR81 enforces validateAcceptedGeometryV1 internally", () => {
  const acceptedGeometry = acceptedRectangleGeometry();
  acceptedGeometry.acceptance.acceptedContentIdentity = acceptedGeometry.contentIdentity;
  acceptedGeometry.contentIdentity = computeAcceptedGeometryContentIdentity(acceptedGeometry);
  const result = mapAcceptedGeometryToCoreV1(validRequest({
    acceptedGeometry,
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, "invalid");
  assert.equal(result.mappedGeometry, null);
  assert.deepEqual(result.primitiveMappings, []);
  assertDiagnostic(result, "InvalidAcceptedGeometryMappingRequest", "acceptedGeometry.acceptance.acceptedContentIdentity");
});

test("PR81 rejects unsupported primitive kinds without partial mapped geometry", () => {
  const acceptedGeometry = clone(validAcceptedGeometryFixture);
  const result = mapAcceptedGeometryToCoreV1(validRequest({ acceptedGeometry }));

  assert.equal(result.ok, false);
  assert.equal(result.status, "unsupported");
  assert.equal(result.mappedGeometry, null);
  assert.equal(result.mappedGeometryContentIdentity, null);
  assert.deepEqual(result.primitiveMappings, []);
  assertDiagnostic(result, "UnsupportedAcceptedGeometryPrimitiveKind", "acceptedGeometry.primitives.0.kind", "point:center");
  assertDiagnostic(result, "UnsupportedAcceptedGeometryPrimitiveKind", "acceptedGeometry.primitives.1.kind", "segment:diagonal");
  assertDiagnostic(result, "UnsupportedAcceptedGeometryPrimitiveKind", "acceptedGeometry.primitives.2.kind", "axis:vertical-center");
});

test("PR81 rejects content identity mismatches", () => {
  const acceptedGeometry = acceptedRectangleGeometry();
  const result = mapAcceptedGeometryToCoreV1(validRequest({
    acceptedGeometry,
    acceptedGeometryContentIdentity: digestB,
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, "invalid");
  assert.equal(result.mappedGeometry, null);
  assertDiagnostic(result, "AcceptedGeometryMappingContentIdentityMismatch", "acceptedGeometryContentIdentity");
});

test("PR81 rejects wrong mapping profile target profile and target kind", () => {
  for (const override of [
    { mappingProfileId: "norma.accepted-geometry-to-core-mapping.unknown@1" },
    { mappingProfileVersion: 2 },
    { targetCoreProfileId: "core.geometry-v1.segment-space@1" },
    { targetCoreGeometryKind: "surface-space" },
  ]) {
    const result = mapAcceptedGeometryToCoreV1(validRequest(override));

    assert.equal(result.ok, false);
    assert.equal(result.status, "unsupported");
    assert.equal(result.mappedGeometry, null);
    assertDiagnostic(result, "UnsupportedAcceptedGeometryMappingRequest");
  }
});

test("PR81 rejects missing or wrong synthetic-only mapping context", () => {
  for (const override of [
    { mappingContext: undefined },
    { mappingContext: { boundary: "real-data", primitiveLossPolicy: "reject", coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM } },
    { mappingContext: { boundary: "synthetic-only", primitiveLossPolicy: "drop", coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM } },
    { mappingContext: { boundary: "synthetic-only", primitiveLossPolicy: "reject", coordinateTransform: "identity@1" } },
  ]) {
    const result = mapAcceptedGeometryToCoreV1(validRequest(override));

    assert.equal(result.ok, false);
    assert.equal(result.status, "invalid");
    assert.equal(result.mappedGeometry, null);
    assertDiagnostic(result, "InvalidAcceptedGeometryMappingRequest");
  }
});

test("PR81 rejects invalid coordinates as coordinate transform failures", () => {
  const acceptedGeometry = acceptedRectangleGeometry([
    rectanglePrimitive({
      id: "rectangle:outside",
      x: 0.9,
      y: 0.9,
      width: 0.2,
      height: 0.2,
    }),
  ]);
  const result = mapAcceptedGeometryToCoreV1(validRequest({ acceptedGeometry }));

  assert.equal(result.ok, false);
  assert.equal(result.status, "invalid");
  assert.equal(result.mappedGeometry, null);
  assertDiagnostic(
    result,
    "AcceptedGeometryCoordinateTransformFailed",
    "acceptedGeometry.primitives.0",
    "rectangle:outside",
  );
});

test("PR81 canonicalizes negative zero transform output to zero", () => {
  const acceptedGeometry = acceptedRectangleGeometry([
    rectanglePrimitive({
      id: "rectangle:negative-zero-x",
      x: -0,
      y: 0.25,
      width: 0.25,
      height: 0.25,
    }),
  ]);
  const result = mapAcceptedGeometryToCoreV1(validRequest({ acceptedGeometry }));

  assert.equal(result.ok, true);
  assert.equal(result.mappedGeometry.elements[0].geometry.x, 0);
  assert.equal(Object.is(result.mappedGeometry.elements[0].geometry.x, -0), false);
});

test("PR81 returns deterministic diagnostics for ordinary invalid input without throwing", () => {
  class InvalidRequest {
    constructor() {
      Object.assign(this, validRequest());
    }
  }
  const throwingProxy = new Proxy({}, {
    ownKeys() {
      throw new Error("proxy key trap must not escape");
    },
  });

  for (const input of [
    null,
    undefined,
    [],
    () => undefined,
    Symbol("invalid"),
    1n,
    new Date("2026-06-20T00:00:00Z"),
    new Map(),
    new Set(),
    new InvalidRequest(),
    throwingProxy,
  ]) {
    assert.doesNotThrow(() => mapAcceptedGeometryToCoreV1(input));
    const first = mapAcceptedGeometryToCoreV1(input);
    const second = mapAcceptedGeometryToCoreV1(input);
    assert.equal(first.ok, false);
    assert.equal(first.status, "invalid");
    assert.deepEqual(first, second);
    assert.equal(first.diagnostics.length > 0, true);
    assert.equal(first.diagnostics.every((diagnostic) => diagnostic.severity === "error"), true);
    assert.equal(first.diagnostics.every((diagnostic) => !/stack|proxy key trap|\/Users|\/tmp|credential|api[_-]?key|bearer/i.test(diagnostic.message)), true);
  }
});

test("PR81 rejects unsupported mapping contract versions", () => {
  const result = mapAcceptedGeometryToCoreV1(validRequest({
    contractVersion: 2,
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, "unsupported");
  assertDiagnostic(result, "UnsupportedAcceptedGeometryMappingRequest", "contractVersion");
});

function validRequest(overrides = {}) {
  const acceptedGeometry = overrides.acceptedGeometry ?? acceptedRectangleGeometry();
  return {
    contractId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_CONTRACT_VERSION,
    requestId: "request:pr81-synthetic",
    mapperOperationId: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_ID,
    mapperOperationVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPER_OPERATION_VERSION,
    mappingProfileId: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_ID,
    mappingProfileVersion: ACCEPTED_GEOMETRY_TO_CORE_MAPPING_PROFILE_VERSION,
    targetCoreProfileId: ACCEPTED_GEOMETRY_TO_CORE_TARGET_PROFILE_ID,
    targetCoreGeometryKind: ACCEPTED_GEOMETRY_TO_CORE_TARGET_GEOMETRY_KIND,
    targetCoordinateSystem: ACCEPTED_GEOMETRY_TO_CORE_TARGET_COORDINATE_SYSTEM,
    acceptedGeometry,
    acceptedGeometryContentIdentity: acceptedGeometry.contentIdentity,
    sourceObservationId: acceptedGeometry.sourceObservationId,
    sourceObservationContentIdentity: acceptedGeometry.sourceObservationContentIdentity,
    mappingContext: {
      boundary: "synthetic-only",
      primitiveLossPolicy: "reject",
      coordinateTransform: ACCEPTED_GEOMETRY_TO_CORE_COORDINATE_TRANSFORM,
    },
    ...overrides,
  };
}

function acceptedRectangleGeometry(primitives = [
  rectanglePrimitive({
    id: "rectangle:frame",
    x: 0.1,
    y: 0.2,
    width: 0.7,
    height: 0.6,
  }),
]) {
  const accepted = clone(validAcceptedGeometryFixture);
  accepted.acceptedGeometryId = "accepted:synthetic-pr81";
  accepted.primitives = primitives;
  accepted.correctionHistory = [];
  accepted.acceptance = {
    ...accepted.acceptance,
    actorType: "deterministic-test",
    sourceObservationId: accepted.sourceObservationId,
    sourceObservationContentIdentity: accepted.sourceObservationContentIdentity,
    acceptedRevision: accepted.acceptedRevision,
    acceptedPrimitiveIds: primitives.map((primitive) => primitive.id),
  };
  recomputeAcceptedGeometryIdentities(accepted);
  return accepted;
}

function rectanglePrimitive(overrides = {}) {
  return {
    id: "rectangle:frame",
    kind: "rectangle",
    x: 0.1,
    y: 0.2,
    width: 0.7,
    height: 0.6,
    confidence: 0.85,
    ...overrides,
  };
}

function recomputeAcceptedGeometryIdentities(accepted) {
  accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
  accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
}

function readJsonFixture(fileName) {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDiagnostic(result, code, path, primitiveId) {
  assert.equal(
    result.diagnostics.some((diagnostic) => (
      diagnostic.code === code &&
      (path === undefined || diagnostic.path === path) &&
      (primitiveId === undefined || diagnostic.primitiveId === primitiveId)
    )),
    true,
    `expected diagnostic ${code}${path === undefined ? "" : ` at ${path}`}`,
  );
}
