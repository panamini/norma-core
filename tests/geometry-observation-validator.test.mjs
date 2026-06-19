import assert from "node:assert/strict";
import test from "node:test";

import * as packageRoot from "../dist/src/index.js";
import * as geometryObservationModule from "../dist/src/geometry-observation.js";
import {
  ACCEPTED_GEOMETRY_CONTRACT_ID,
  ACCEPTED_GEOMETRY_CONTRACT_VERSION,
  GEOMETRY_OBSERVATION_CONTRACT_ID,
  GEOMETRY_OBSERVATION_CONTRACT_VERSION,
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
  computeGeometryObservationContentIdentity,
  validateAcceptedGeometryV1,
  validateGeometryObservationV1,
} from "../dist/src/geometry-observation.js";

const digestA = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const digestB = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const digestC = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const validCreatedAt = "2026-06-19T21:33:30Z";
const validAcceptedAt = "2026-06-19T23:33:30+02:00";

test("PR79 keeps GeometryObservation validator package-private", () => {
  const packagePrivateNames = [
    "GEOMETRY_OBSERVATION_CONTRACT_ID",
    "ACCEPTED_GEOMETRY_CONTRACT_ID",
    "computeGeometryObservationContentIdentity",
    "computeAcceptedGeometryContentIdentity",
    "computeAcceptedGeometryRevisionContentIdentity",
    "validateGeometryObservationV1",
    "validateAcceptedGeometryV1",
  ];

  for (const name of packagePrivateNames) {
    assert.equal(name in geometryObservationModule, true, `${name} should exist on the package-private module`);
    assert.equal(name in packageRoot, false, `${name} must not be exported from the package root`);
  }
});

test("PR79 computes deterministic GeometryObservation content identity without timestamp metadata", () => {
  const observation = geometryObservation();
  const withDifferentCreatedAt = geometryObservation({
    provenance: provenance({ createdAt: "2026-06-19T21:33:31Z" }),
  });
  const withDifferentPrimitive = geometryObservation({
    primitives: [
      pointPrimitive({ x: 0.2 }),
      segmentPrimitive(),
      axisPrimitive(),
      rectanglePrimitive(),
    ],
  });

  assert.match(observation.contentIdentity, /^sha256:[0-9a-f]{64}$/);
  assert.equal(
    computeGeometryObservationContentIdentity(observation),
    observation.contentIdentity,
  );
  assert.equal(observation.contentIdentity, withDifferentCreatedAt.contentIdentity);
  assert.notEqual(observation.contentIdentity, withDifferentPrimitive.contentIdentity);
});

test("PR79 validates a complete synthetic GeometryObservation V1 candidate", () => {
  const observation = geometryObservation();
  const result = validateGeometryObservationV1(observation);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.value, observation);
});

test("PR79 collects deterministic GeometryObservation diagnostics after safe traversal", () => {
  const observation = geometryObservation();
  const invalidObservation = {
    ...observation,
    contractVersion: 2,
    unexpectedTopLevelField: true,
    sourceAsset: {
      ...observation.sourceAsset,
      assetId: "",
      rawImageBytes: "forbidden",
    },
    provider: null,
    coordinateFrame: {
      ...observation.coordinateFrame,
      sourcePixelWidth: 0,
      bounds: { x: [0, 2], y: [0, 1] },
    },
    primitives: [
      { ...pointPrimitive(), id: "dup", confidence: null },
      { ...segmentPrimitive(), id: "dup", start: { x: 0.4, y: 0.4 }, end: { x: 0.4, y: 0.4 } },
      { id: "curve-1", kind: "bezier", confidence: 0.9 },
      { ...rectanglePrimitive(), id: "rect-outside", x: 0.9, width: 0.2 },
    ],
    evidence: [
      { ...evidenceRef(), confidence: null },
    ],
    warnings: [],
    provenance: provenance({ createdAt: "2026-02-30T00:00:00Z" }),
    contentIdentity: digestB,
  };

  const result = validateGeometryObservationV1(invalidObservation);

  assert.equal(result.ok, false);
  assertDiagnosticCodes(result, [
    "UnsupportedGeometryObservationContract",
    "InvalidGeometryObservationShape",
    "MissingSourceAssetIdentity",
    "MissingProviderIdentity",
    "InvalidObservationCoordinateFrame",
    "DuplicateObservationPrimitiveId",
    "UnsupportedObservationPrimitiveKind",
    "ObservationCoordinateOutsideBounds",
    "DegenerateObservationPrimitive",
    "InvalidObservationConfidence",
    "MissingObservationProvenance",
  ]);
  assert.deepEqual(result.diagnostics, sortedDiagnostics(result.diagnostics));
  assert.equal("value" in result, false);
});

test("PR79 rejects permissive Date.parse-only timestamp acceptance", () => {
  for (const createdAt of [
    "2026-06-19",
    "2026-06-19T21:33Z",
    "2026-02-30T00:00:00Z",
  ]) {
    const result = validateGeometryObservationV1(geometryObservation({
      provenance: provenance({ createdAt }),
    }));

    assert.equal(result.ok, false);
    assertDiagnosticCodes(result, ["MissingObservationProvenance"]);
  }
});

test("PR79 validates AcceptedGeometry V1 with explicit accepted revision identity", () => {
  const accepted = acceptedGeometry();
  const result = validateAcceptedGeometryV1(accepted);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.value, accepted);
  assert.equal(
    accepted.acceptance.acceptedContentIdentity,
    computeAcceptedGeometryRevisionContentIdentity(accepted),
  );
  assert.equal(accepted.contentIdentity, computeAcceptedGeometryContentIdentity(accepted));
  assert.notEqual(accepted.acceptance.acceptedContentIdentity, accepted.contentIdentity);
});

test("PR79 rejects invalid AcceptedGeometry acceptance and correction consistency", () => {
  const accepted = acceptedGeometry();
  const invalidAccepted = {
    ...accepted,
    acceptedRevision: 2,
    correctionHistory: [
      {
        ...correctionEntry({ operation: "add", sequence: 0 }),
        beforeContentIdentity: digestA,
      },
      {
        ...correctionEntry({ operation: "update", sequence: 0, beforeContentIdentity: digestA, afterContentIdentity: digestA }),
      },
      {
        ...correctionEntry({ operation: "remove", sequence: 2 }),
        afterContentIdentity: digestB,
      },
    ],
    acceptance: {
      ...accepted.acceptance,
      actorType: "provider",
      acceptedAt: "2026-06-19",
      acceptedRevision: 1,
      acceptedContentIdentity: accepted.contentIdentity,
      acceptedPrimitiveIds: [...accepted.acceptance.acceptedPrimitiveIds].reverse(),
    },
    contentIdentity: digestC,
  };

  const result = validateAcceptedGeometryV1(invalidAccepted);

  assert.equal(result.ok, false);
  assertDiagnosticCodes(result, [
    "InvalidCorrectionHistory",
    "ExplicitAcceptanceRequired",
    "AcceptedGeometryRevisionMismatch",
    "InvalidAcceptedGeometryShape",
  ]);
  assert.deepEqual(result.diagnostics, sortedDiagnostics(result.diagnostics));
});

function geometryObservation(overrides = {}) {
  const observation = {
    contractId: GEOMETRY_OBSERVATION_CONTRACT_ID,
    contractVersion: GEOMETRY_OBSERVATION_CONTRACT_VERSION,
    observationId: "observation:synthetic-pr79",
    status: "candidate",
    sourceAsset: sourceAssetRef(),
    provider: providerIdentity(),
    coordinateFrame: coordinateFrame(),
    primitives: [
      pointPrimitive(),
      segmentPrimitive(),
      axisPrimitive(),
      rectanglePrimitive(),
    ],
    evidence: [
      evidenceRef(),
    ],
    warnings: [],
    provenance: provenance(),
    contentIdentity: digestA,
    ...overrides,
  };

  return {
    ...observation,
    contentIdentity: computeGeometryObservationContentIdentity(observation),
  };
}

function acceptedGeometry(overrides = {}) {
  const observation = geometryObservation();
  const accepted = {
    contractId: ACCEPTED_GEOMETRY_CONTRACT_ID,
    contractVersion: ACCEPTED_GEOMETRY_CONTRACT_VERSION,
    acceptedGeometryId: "accepted:synthetic-pr79",
    sourceObservationId: observation.observationId,
    sourceObservationContentIdentity: observation.contentIdentity,
    acceptedRevision: 1,
    coordinateFrame: observation.coordinateFrame,
    primitives: observation.primitives,
    correctionHistory: [
      correctionEntry(),
    ],
    acceptance: {
      acceptanceId: "acceptance:synthetic-pr79",
      accepted: true,
      actorType: "deterministic-test",
      actorId: "pr79-test",
      acceptedAt: validAcceptedAt,
      sourceObservationId: observation.observationId,
      sourceObservationContentIdentity: observation.contentIdentity,
      acceptedRevision: 1,
      acceptedContentIdentity: digestA,
      acceptedPrimitiveIds: observation.primitives.map((primitive) => primitive.id),
      provenance: provenance({ provenanceId: "provenance:acceptance" }),
    },
    provenance: provenance({ provenanceId: "provenance:accepted-geometry" }),
    contentIdentity: digestA,
    ...overrides,
  };
  const acceptedWithRevisionIdentity = {
    ...accepted,
    acceptance: {
      ...accepted.acceptance,
      acceptedContentIdentity: computeAcceptedGeometryRevisionContentIdentity(accepted),
    },
  };

  return {
    ...acceptedWithRevisionIdentity,
    contentIdentity: computeAcceptedGeometryContentIdentity(acceptedWithRevisionIdentity),
  };
}

function sourceAssetRef(overrides = {}) {
  return {
    assetId: "asset:synthetic-pr79",
    mediaType: "image/png",
    contentDigest: digestA,
    contentIdentity: digestA,
    pixelWidth: 100,
    pixelHeight: 200,
    synthetic: true,
    localOnly: true,
    provenance: provenance({ provenanceId: "provenance:source-asset" }),
    ...overrides,
  };
}

function providerIdentity(overrides = {}) {
  return {
    providerFamily: "synthetic",
    providerImplementationId: "norma-core-pr79-test-provider",
    providerVersion: "0.1.0-test",
    operationId: "geometry-observation.synthetic",
    operationVersion: "1.0.0",
    configurationIdentity: digestB,
    providerRunId: "provider-run:synthetic-pr79",
    provenance: provenance({ provenanceId: "provenance:provider" }),
    warnings: [],
    ...overrides,
  };
}

function coordinateFrame(overrides = {}) {
  return {
    dimensions: 2,
    coordinateScale: "normalized",
    origin: "top-left",
    xDirection: "right",
    yDirection: "down",
    bounds: { x: [0, 1], y: [0, 1] },
    sourcePixelWidth: 100,
    sourcePixelHeight: 200,
    ...overrides,
  };
}

function pointPrimitive(overrides = {}) {
  return {
    id: "point:center",
    kind: "point",
    x: 0.5,
    y: 0.5,
    confidence: 1,
    ...overrides,
  };
}

function segmentPrimitive(overrides = {}) {
  return {
    id: "segment:diagonal",
    kind: "segment",
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    confidence: 0.95,
    ...overrides,
  };
}

function axisPrimitive(overrides = {}) {
  return {
    id: "axis:vertical-center",
    kind: "axis",
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    confidence: 0.9,
    ...overrides,
  };
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

function evidenceRef(overrides = {}) {
  return {
    evidenceId: "evidence:synthetic-pr79",
    kind: "provider-local-reference",
    targetPrimitiveId: "point:center",
    confidence: 1,
    label: null,
    regionRef: null,
    warningCode: null,
    provenance: provenance({ provenanceId: "provenance:evidence" }),
    ...overrides,
  };
}

function correctionEntry(overrides = {}) {
  return {
    correctionId: "correction:synthetic-pr79",
    sequence: 0,
    actorType: "deterministic-test",
    operation: "update",
    targetPrimitiveId: "point:center",
    reason: "synthetic accepted revision",
    beforeContentIdentity: digestA,
    afterContentIdentity: digestB,
    provenance: provenance({ provenanceId: "provenance:correction" }),
    ...overrides,
  };
}

function provenance(overrides = {}) {
  return {
    provenanceId: "provenance:synthetic-pr79",
    actorType: "deterministic-test",
    actorId: "pr79-test",
    operationId: "geometry-observation.synthetic",
    operationVersion: "1.0.0",
    inputContentIdentity: null,
    createdAt: validCreatedAt,
    notes: null,
    ...overrides,
  };
}

function assertDiagnosticCodes(result, expectedCodes) {
  const actualCodes = new Set(result.diagnostics.map((diagnostic) => diagnostic.code));

  for (const code of expectedCodes) {
    assert.equal(actualCodes.has(code), true, `expected diagnostic code ${code}`);
  }
}

function sortedDiagnostics(diagnostics) {
  const pathOrder = new Map();
  diagnostics.forEach((diagnostic, index) => {
    if (!pathOrder.has(diagnostic.path)) {
      pathOrder.set(diagnostic.path, index);
    }
  });

  return [...diagnostics].sort((first, second) => (
    pathOrder.get(first.path) - pathOrder.get(second.path) ||
    first.code.localeCompare(second.code) ||
    first.message.localeCompare(second.message)
  ));
}
