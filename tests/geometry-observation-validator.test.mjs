import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "fixtures", "geometry-observation");

const digestA = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const digestB = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const digestC = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const validObservationFixture = readJsonFixture("valid-observation-v1.json");
const validAcceptedGeometryFixture = readJsonFixture("valid-accepted-geometry-v1.json");

test("PR79 keeps GeometryObservation validator package-private", () => {
  const packagePrivateNames = [
    "GEOMETRY_OBSERVATION_CONTRACT_ID",
    "ACCEPTED_GEOMETRY_CONTRACT_ID",
    "PERCEPTION_PROVIDER_CONTRACT_ID",
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

test("PR79 accepts only the approved @1 V1 contract IDs", () => {
  assert.equal(GEOMETRY_OBSERVATION_CONTRACT_ID, "norma.geometry-observation@1");
  assert.equal(ACCEPTED_GEOMETRY_CONTRACT_ID, "norma.accepted-geometry@1");
  assert.equal(GEOMETRY_OBSERVATION_CONTRACT_VERSION, 1);
  assert.equal(ACCEPTED_GEOMETRY_CONTRACT_VERSION, 1);

  assert.equal(validateGeometryObservationV1(validObservation()).ok, true);
  assert.equal(validateAcceptedGeometryV1(validAcceptedGeometry()).ok, true);

  assertDiagnosticCodes(validateGeometryObservationV1(observationWith({ contractId: "norma.geometry-observation" })), [
    "UnsupportedGeometryObservationContract",
  ]);
  assertDiagnosticCodes(validateGeometryObservationV1(observationWith({ contractId: "norma.geometry-observation@2" })), [
    "UnsupportedGeometryObservationContract",
  ]);
  assertDiagnosticCodes(validateGeometryObservationV1(observationWith({ contractId: "norma.unknown-observation@1" })), [
    "UnsupportedGeometryObservationContract",
  ]);
  assertDiagnosticCodes(validateGeometryObservationV1(observationWith({ contractVersion: 2 })), [
    "UnsupportedGeometryObservationContract",
  ]);
  assertDiagnosticCodes(validateAcceptedGeometryV1(acceptedGeometryWith({ contractId: "norma.accepted-geometry" })), [
    "UnsupportedAcceptedGeometryContract",
  ]);
  assertDiagnosticCodes(validateAcceptedGeometryV1(acceptedGeometryWith({ contractId: "norma.accepted-geometry@2" })), [
    "UnsupportedAcceptedGeometryContract",
  ]);
});

test("PR79 validates the synthetic JSON fixtures", () => {
  assertFixtureContainsNoForbiddenContent("valid-observation-v1.json");
  assertFixtureContainsNoForbiddenContent("valid-accepted-geometry-v1.json");

  const observation = validObservation();
  const accepted = validAcceptedGeometry();

  assert.equal(validateGeometryObservationV1(observation).ok, true);
  assert.equal(validateAcceptedGeometryV1(accepted).ok, true);
  assert.equal(computeGeometryObservationContentIdentity(observation), observation.contentIdentity);
  assert.equal(computeAcceptedGeometryRevisionContentIdentity(accepted), accepted.acceptance.acceptedContentIdentity);
  assert.equal(computeAcceptedGeometryContentIdentity(accepted), accepted.contentIdentity);
  assert.notEqual(accepted.acceptance.acceptedContentIdentity, accepted.contentIdentity);
});

test("PR79 rejects unknown fields at all contract-owned object levels", () => {
  const cases = [
    ["GeometryObservation", () => observationWith({ extra: true }), validateGeometryObservationV1, "extra"],
    [
      "SourceAssetRef",
      () => observationWithMutation((observation) => {
        observation.sourceAsset.rawImageBytes = "forbidden";
      }),
      validateGeometryObservationV1,
      "sourceAsset.rawImageBytes",
    ],
    [
      "ProviderIdentity",
      () => observationWithMutation((observation) => {
        observation.provider.providerPayload = {};
      }),
      validateGeometryObservationV1,
      "provider.providerPayload",
    ],
    [
      "CoordinateFrame",
      () => observationWithMutation((observation) => {
        observation.coordinateFrame.unit = "px";
      }),
      validateGeometryObservationV1,
      "coordinateFrame.unit",
    ],
    [
      "CoordinateFrame.bounds",
      () => observationWithMutation((observation) => {
        observation.coordinateFrame.bounds.z = [0, 1];
      }),
      validateGeometryObservationV1,
      "coordinateFrame.bounds.z",
    ],
    [
      "ObservationPrimitive",
      () => observationWithMutation((observation) => {
        observation.primitives[0].left = 0.1;
      }),
      validateGeometryObservationV1,
      "primitives.0.left",
    ],
    [
      "ObservationPrimitive endpoint",
      () => observationWithMutation((observation) => {
        observation.primitives[1].start.x1 = 0;
      }),
      validateGeometryObservationV1,
      "primitives.1.start.x1",
    ],
    [
      "EvidenceRef",
      () => observationWithMutation((observation) => {
        observation.evidence[0].rawTrace = "forbidden";
      }),
      validateGeometryObservationV1,
      "evidence.0.rawTrace",
    ],
    [
      "ObservationWarning",
      () => observationWithMutation((observation) => {
        observation.warnings = [confidenceUnavailableWarning("primitives.0.confidence", "point:center", { extra: true })];
        observation.primitives[0].confidence = null;
      }),
      validateGeometryObservationV1,
      "warnings.0.extra",
    ],
    [
      "ProvenanceRef",
      () => observationWithMutation((observation) => {
        observation.provenance.localPath = "/tmp/private.png";
      }),
      validateGeometryObservationV1,
      "provenance.localPath",
    ],
    [
      "AcceptedGeometry",
      () => acceptedGeometryWith({ measurementScore: 1 }),
      validateAcceptedGeometryV1,
      "measurementScore",
    ],
    [
      "CorrectionEntry",
      () => acceptedGeometryWithMutation((accepted) => {
        accepted.correctionHistory[0].patch = [];
      }),
      validateAcceptedGeometryV1,
      "correctionHistory.0.patch",
    ],
    [
      "AcceptanceRecord",
      () => acceptedGeometryWithMutation((accepted) => {
        accepted.acceptance.automatic = true;
      }),
      validateAcceptedGeometryV1,
      "acceptance.automatic",
    ],
  ];

  for (const [name, input, validate, path] of cases) {
    const result = validate(input());
    assert.equal(result.ok, false, `${name} should reject unknown fields`);
    assert.equal(hasDiagnosticPath(result, path), true, `${name} should report ${path}`);
  }
});

test("PR79 keeps content identity deterministic and bounded to approved projections", () => {
  const observation = validObservation();
  const accepted = validAcceptedGeometry();
  const reorderedObservation = reorderObjectKeys(observation);
  const reorderedAccepted = reorderObjectKeys(accepted);

  assert.equal(computeGeometryObservationContentIdentity(reorderedObservation), observation.contentIdentity);
  assert.equal(computeAcceptedGeometryContentIdentity(reorderedAccepted), accepted.contentIdentity);

  const observationWithChangedContentIdentity = clone(observation);
  observationWithChangedContentIdentity.contentIdentity = digestB;
  assert.equal(computeGeometryObservationContentIdentity(observationWithChangedContentIdentity), observation.contentIdentity);

  const observationWithChangedTimestamp = clone(observation);
  observationWithChangedTimestamp.provenance.createdAt = "2026-06-20T00:00:00Z";
  observationWithChangedTimestamp.provider.provenance.createdAt = "2026-06-20T00:00:00Z";
  observationWithChangedTimestamp.evidence[0].provenance.createdAt = "2026-06-20T00:00:00Z";
  assert.equal(computeGeometryObservationContentIdentity(observationWithChangedTimestamp), observation.contentIdentity);

  const acceptedWithChangedTimestamp = clone(accepted);
  acceptedWithChangedTimestamp.acceptance.acceptedAt = "2026-06-20T01:00:00+02:00";
  acceptedWithChangedTimestamp.acceptance.provenance.createdAt = "2026-06-20T00:00:00Z";
  acceptedWithChangedTimestamp.correctionHistory[0].provenance.createdAt = "2026-06-20T00:00:00Z";
  assert.equal(computeAcceptedGeometryContentIdentity(acceptedWithChangedTimestamp), accepted.contentIdentity);

  const primitiveOrderChanged = clone(observation);
  primitiveOrderChanged.primitives = [primitiveOrderChanged.primitives[1], primitiveOrderChanged.primitives[0], ...primitiveOrderChanged.primitives.slice(2)];
  assert.notEqual(computeGeometryObservationContentIdentity(primitiveOrderChanged), observation.contentIdentity);

  const evidenceOrderBase = observationWithMutation((candidate) => {
    candidate.evidence.push({ ...candidate.evidence[0], evidenceId: "evidence:synthetic-pr79-secondary", label: "secondary" });
  });
  const evidenceOrderChanged = clone(evidenceOrderBase);
  evidenceOrderChanged.evidence = [evidenceOrderChanged.evidence[1], evidenceOrderChanged.evidence[0]];
  assert.notEqual(computeGeometryObservationContentIdentity(evidenceOrderChanged), evidenceOrderBase.contentIdentity);

  const correctionOrderBase = acceptedGeometryWithMutation((candidate) => {
    candidate.correctionHistory.push({
      ...candidate.correctionHistory[0],
      correctionId: "correction:synthetic-pr79-secondary",
      sequence: 1,
      beforeContentIdentity: digestB,
      afterContentIdentity: digestC,
    });
  });
  const correctionOrderChanged = clone(correctionOrderBase);
  correctionOrderChanged.correctionHistory = [correctionOrderChanged.correctionHistory[1], correctionOrderChanged.correctionHistory[0]];
  assert.notEqual(computeAcceptedGeometryRevisionContentIdentity(correctionOrderChanged), correctionOrderBase.acceptance.acceptedContentIdentity);
});

test("PR79 enforces strict RFC3339 timestamps without Date.parse fallback", () => {
  for (const createdAt of [
    "2026-06-19T21:33:30Z",
    "2026-06-19T21:33:30+02:00",
    "2024-02-29T00:00:00Z",
    "2026-06-19T21:33:30.123Z",
  ]) {
    assert.equal(validateGeometryObservationV1(observationWithProvenanceTimestamp(createdAt)).ok, true, createdAt);
  }

  for (const createdAt of [
    "2026-06-19",
    "2026-06-19T21:33:30",
    "2026-02-30T00:00:00Z",
    "2026-06-19T21:33:30z",
    "2026-06-19T23:59:60Z",
    "2026-06-19T24:00:00Z",
    "2026-06-19T21:33:30+24:00",
  ]) {
    assertDiagnosticCodes(validateGeometryObservationV1(observationWithProvenanceTimestamp(createdAt)), [
      "MissingObservationProvenance",
    ]);
  }

  assertDiagnosticCodes(validateAcceptedGeometryV1(acceptedGeometryWithAcceptedAt("2026-06-19")), [
    "ExplicitAcceptanceRequired",
  ]);
});

test("PR79 rejects unsafe or non-plain invalid inputs without throwing", () => {
  class ObservationPayload {
    constructor() {
      Object.assign(this, validObservation());
    }
  }

  const throwingProxy = new Proxy({}, {
    ownKeys() {
      throw new Error("proxy key trap must not escape");
    },
  });
  const cyclic = validObservation();
  cyclic.self = cyclic;

  for (const input of [
    null,
    undefined,
    [],
    () => undefined,
    Symbol("invalid"),
    1n,
    new Date("2026-06-19T21:33:30Z"),
    new Map(),
    new Set(),
    new ObservationPayload(),
    throwingProxy,
    cyclic,
  ]) {
    assert.doesNotThrow(() => validateGeometryObservationV1(input));
    const result = validateGeometryObservationV1(input);
    assert.equal(result.ok, false);
    assert.equal("value" in result, false);
    assert.equal(result.diagnostics.every((diagnostic) => !/stack|proxy key trap|\/Users|\/tmp/.test(diagnostic.message)), true);
  }
});

test("PR79 enforces providerVersion null warning linkage", () => {
  assert.equal(validateGeometryObservationV1(validObservation()).ok, true);

  const withoutWarning = observationWithMutation((observation) => {
    observation.provider.providerVersion = null;
  });
  assertDiagnosticCodes(validateGeometryObservationV1(withoutWarning), ["MissingProviderIdentity"]);
  assert.equal(hasDiagnosticPath(validateGeometryObservationV1(withoutWarning), "provider.providerVersion"), true);

  const withWarning = observationWithMutation((observation) => {
    observation.provider.providerVersion = null;
    observation.provider.warnings = [providerVersionUnavailableWarning()];
  });
  assert.equal(validateGeometryObservationV1(withWarning).ok, true);

  const wrongPath = observationWithMutation((observation) => {
    observation.provider.providerVersion = null;
    observation.provider.warnings = [providerVersionUnavailableWarning({ targetPath: "provider.version" })];
  });
  assertDiagnosticCodes(validateGeometryObservationV1(wrongPath), ["MissingProviderIdentity"]);

  const wrongSeverity = observationWithMutation((observation) => {
    observation.provider.providerVersion = null;
    observation.provider.warnings = [providerVersionUnavailableWarning({ severity: "error" })];
  });
  assertDiagnosticCodes(validateGeometryObservationV1(wrongSeverity), ["MissingProviderIdentity"]);
});

test("PR79 does not mutate input objects during validation", () => {
  const observation = validObservation();
  const accepted = validAcceptedGeometry();
  const observationBefore = JSON.stringify(observation);
  const acceptedBefore = JSON.stringify(accepted);

  assert.equal(validateGeometryObservationV1(observation).ok, true);
  assert.equal(validateAcceptedGeometryV1(accepted).ok, true);

  assert.equal(JSON.stringify(observation), observationBefore);
  assert.equal(JSON.stringify(accepted), acceptedBefore);
});

test("PR79 keeps diagnostics deterministic with lexical unknown-key ordering", () => {
  const invalidObservation = observationWithMutation((observation) => {
    observation.zExtra = true;
    observation.aExtra = true;
    observation.sourceAsset.zExtra = true;
    observation.sourceAsset.aExtra = true;
  });

  const first = validateGeometryObservationV1(invalidObservation);
  const second = validateGeometryObservationV1(invalidObservation);

  assert.equal(first.ok, false);
  assert.deepEqual(first.diagnostics, second.diagnostics);
  assert.deepEqual(unexpectedPropertyPaths(first).slice(0, 4), [
    "aExtra",
    "zExtra",
    "sourceAsset.aExtra",
    "sourceAsset.zExtra",
  ]);
});

test("PR79 collects deterministic GeometryObservation diagnostics after safe traversal", () => {
  const invalidObservation = observationWithMutation((observation) => {
    observation.contractVersion = 2;
    observation.unexpectedTopLevelField = true;
    observation.sourceAsset.assetId = "";
    observation.sourceAsset.rawImageBytes = "forbidden";
    observation.provider = null;
    observation.coordinateFrame.sourcePixelWidth = 0;
    observation.coordinateFrame.bounds = { x: [0, 2], y: [0, 1] };
    observation.primitives = [
      { ...observation.primitives[0], id: "dup", confidence: null },
      { ...observation.primitives[1], id: "dup", start: { x: 0.4, y: 0.4 }, end: { x: 0.4, y: 0.4 } },
      { id: "curve-1", kind: "bezier", confidence: 0.9 },
      { ...observation.primitives[3], id: "rect-outside", x: 0.9, width: 0.2 },
    ];
    observation.evidence = [{ ...observation.evidence[0], confidence: null }];
    observation.warnings = [];
    observation.provenance.createdAt = "2026-02-30T00:00:00Z";
    observation.contentIdentity = digestB;
  }, { recomputeIdentity: false });

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

test("PR79 rejects invalid AcceptedGeometry acceptance and correction consistency", () => {
  const invalidAccepted = acceptedGeometryWithMutation((accepted) => {
    accepted.acceptedRevision = 2;
    accepted.correctionHistory = [
      {
        ...accepted.correctionHistory[0],
        operation: "add",
        sequence: 0,
        beforeContentIdentity: digestA,
      },
      {
        ...accepted.correctionHistory[0],
        operation: "update",
        sequence: 0,
        beforeContentIdentity: digestA,
        afterContentIdentity: digestA,
      },
      {
        ...accepted.correctionHistory[0],
        operation: "remove",
        sequence: 2,
        afterContentIdentity: digestB,
      },
    ];
    accepted.acceptance.actorType = "provider";
    accepted.acceptance.acceptedAt = "2026-06-19";
    accepted.acceptance.acceptedRevision = 1;
    accepted.acceptance.acceptedContentIdentity = accepted.contentIdentity;
    accepted.acceptance.acceptedPrimitiveIds = [...accepted.acceptance.acceptedPrimitiveIds].reverse();
    accepted.contentIdentity = digestC;
  }, { recomputeIdentity: false });

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

test("PR79 reports AcceptedGeometry segment endpoint diagnostics on the accepted geometry surface", () => {
  const invalidAccepted = acceptedGeometryWithMutation((accepted) => {
    accepted.primitives[1].start = null;
  }, { recomputeIdentity: false });

  const result = validateAcceptedGeometryV1(invalidAccepted);

  assert.equal(result.ok, false);
  assert.deepEqual(diagnosticCodesAtPath(result, "primitives.1.start"), ["InvalidAcceptedGeometryShape"]);
});

test("PR79 reports CorrectionEntry provenance diagnostics as correction history diagnostics", () => {
  const invalidAccepted = acceptedGeometryWithMutation((accepted) => {
    accepted.correctionHistory[0].provenance = null;
  }, { recomputeIdentity: false });

  const result = validateAcceptedGeometryV1(invalidAccepted);

  assert.equal(result.ok, false);
  assert.deepEqual(diagnosticCodesAtPath(result, "correctionHistory.0.provenance"), ["InvalidCorrectionHistory"]);
});

function readJsonFixture(fileName) {
  return JSON.parse(readFileSync(path.join(fixturesDir, fileName), "utf8"));
}

function validObservation() {
  return clone(validObservationFixture);
}

function validAcceptedGeometry() {
  return clone(validAcceptedGeometryFixture);
}

function observationWith(overrides) {
  return observationWithMutation((observation) => {
    Object.assign(observation, overrides);
  });
}

function observationWithMutation(mutator, options = {}) {
  const observation = validObservation();
  mutator(observation);
  if (options.recomputeIdentity !== false) {
    observation.contentIdentity = computeGeometryObservationContentIdentity(observation);
  }
  return observation;
}

function acceptedGeometryWith(overrides) {
  return acceptedGeometryWithMutation((accepted) => {
    Object.assign(accepted, overrides);
  });
}

function acceptedGeometryWithMutation(mutator, options = {}) {
  const accepted = validAcceptedGeometry();
  mutator(accepted);
  if (options.recomputeIdentity !== false) {
    accepted.acceptance.acceptedContentIdentity = computeAcceptedGeometryRevisionContentIdentity(accepted);
    accepted.contentIdentity = computeAcceptedGeometryContentIdentity(accepted);
  }
  return accepted;
}

function observationWithProvenanceTimestamp(createdAt) {
  return observationWithMutation((observation) => {
    observation.provenance.createdAt = createdAt;
  });
}

function acceptedGeometryWithAcceptedAt(acceptedAt) {
  return acceptedGeometryWithMutation((accepted) => {
    accepted.acceptance.acceptedAt = acceptedAt;
  });
}

function confidenceUnavailableWarning(targetPath, targetPrimitiveId, overrides = {}) {
  return {
    code: "ConfidenceUnavailable",
    severity: "warning",
    message: "Confidence is unavailable for this synthetic target.",
    targetPath,
    targetPrimitiveId,
    provenance: provenance("provenance:warning"),
    ...overrides,
  };
}

function providerVersionUnavailableWarning(overrides = {}) {
  return {
    code: "ProviderVersionUnavailable",
    severity: "warning",
    message: "Provider version is unavailable for this synthetic provider identity.",
    targetPath: "provider.providerVersion",
    targetPrimitiveId: null,
    provenance: provenance("provenance:provider-version-warning"),
    ...overrides,
  };
}

function provenance(provenanceId) {
  return {
    provenanceId,
    actorType: "deterministic-test",
    actorId: "pr79-test",
    operationId: "geometry-observation.synthetic",
    operationVersion: "1.0.0",
    inputContentIdentity: null,
    createdAt: "2026-06-19T21:33:30Z",
    notes: null,
  };
}

function reorderObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.map(reorderObjectKeys);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .reverse()
        .map((key) => [key, reorderObjectKeys(value[key])]),
    );
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertFixtureContainsNoForbiddenContent(fileName) {
  const fixture = readFileSync(path.join(fixturesDir, fileName), "utf8");
  assert.doesNotMatch(fixture, /https?:\/\//i);
  assert.doesNotMatch(fixture, /file:\/\//i);
  assert.doesNotMatch(fixture, /\/(?:Users|Volumes|private|tmp)\//i);
  assert.doesNotMatch(fixture, /base64|data:image|credential|api[_-]?key|bearer|cookie|signedUrl|signed-url|pii/i);
}

function assertDiagnosticCodes(result, expectedCodes) {
  assert.equal(result.ok, false);
  const actualCodes = new Set(result.diagnostics.map((diagnostic) => diagnostic.code));

  for (const code of expectedCodes) {
    assert.equal(actualCodes.has(code), true, `expected diagnostic code ${code}`);
  }
}

function hasDiagnosticPath(result, path) {
  return result.diagnostics.some((diagnostic) => diagnostic.path === path);
}

function diagnosticCodesAtPath(result, path) {
  return result.diagnostics
    .filter((diagnostic) => diagnostic.path === path)
    .map((diagnostic) => diagnostic.code);
}

function unexpectedPropertyPaths(result) {
  return result.diagnostics
    .filter((diagnostic) => diagnostic.message.startsWith("Unexpected property"))
    .map((diagnostic) => diagnostic.path);
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
