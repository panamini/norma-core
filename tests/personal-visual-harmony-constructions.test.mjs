import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePersonalVisualHarmonyConstructionsV1,
  constructPersonalVisualHarmonyTriangleMediansV1,
  constructPersonalVisualHarmonyTrianglePerpendicularBisectorsV1,
  constructPersonalVisualHarmonyTrianglesV1,
  PERSONAL_VISUAL_HARMONY_TRIANGLE_AREA_TOLERANCE_NORMALIZED,
} from "../dist/src/personal-visual-harmony-constructions.js";
import * as packageRoot from "../dist/src/index.js";

const FRAME = {
  frameId: "frame:image-boundary",
  kind: "confirmed-image-boundary",
  vertices: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
};

function observedLine(candidateId, start, end, primitiveKind = "segment") {
  return {
    candidateId,
    label: candidateId,
    primitiveKind,
    start,
    end,
  };
}

function analyze(overrides = {}) {
  return analyzePersonalVisualHarmonyConstructionsV1({
    enabledLayers: ["support-line-extensions", "format-diagonals"],
    sourcePixelWidth: 1000,
    sourcePixelHeight: 1000,
    frame: FRAME,
    observedLines: [
      observedLine("horizontal", { x: 0.2, y: 0.25 }, { x: 0.7, y: 0.25 }),
      observedLine("vertical", { x: 0.75, y: 0.2 }, { x: 0.75, y: 0.8 }, "axis"),
      observedLine("oblique", { x: 0.2, y: 0.8 }, { x: 0.8, y: 0.2 }),
    ],
    ...overrides,
  });
}

function triangleObservedLine(candidateId, point) {
  const end = {
    x: point.x <= 0.9 ? point.x + 0.05 : point.x - 0.05,
    y: point.y <= 0.9 ? point.y + 0.03 : point.y - 0.03,
  };
  return observedLine(candidateId, point, end);
}

function observedTriangleRequest(requestId, entries) {
  return {
    requestId,
    vertices: entries.map(({ candidateId, point, endpoint = "start" }) => ({
      point,
      parent: { kind: "observed-line-endpoint", candidateId, endpoint },
    })),
  };
}

function analyzeObservedTriangle(points, overrides = {}) {
  const entries = points.map((point, index) => ({ candidateId: `triangle-line-${String(index)}`, point }));
  return analyze({
    enabledLayers: ["support-line-extensions", "triangles"],
    observedLines: entries.map(({ candidateId, point }) => triangleObservedLine(candidateId, point)),
    triangleRequests: [observedTriangleRequest("triangle-request", entries)],
    ...overrides,
  });
}

function permutations(values) {
  return [
    [values[0], values[1], values[2]],
    [values[0], values[2], values[1]],
    [values[1], values[0], values[2]],
    [values[1], values[2], values[0]],
    [values[2], values[0], values[1]],
    [values[2], values[1], values[0]],
  ];
}

test("horizontal, vertical, and strong oblique observations stay distinct from frame-clipped support lines", () => {
  const result = analyze();

  assert.equal(result.contractId, "norma.personal-visual-harmony-construction-analysis@1");
  assert.deepEqual(result.enabledLayers, ["support-line-extensions", "format-diagonals"]);
  assert.equal(result.observedLines.length, 3);
  assert.equal(result.supportLineExtensions.length, 3);

  const horizontalObserved = result.observedLines.find(({ candidateId }) => candidateId === "horizontal");
  const horizontal = result.supportLineExtensions.find(({ observedLineId }) => (
    observedLineId === horizontalObserved.observedLineId
  ));
  assert.deepEqual(horizontalObserved.start, { x: 0.2, y: 0.25 });
  assert.deepEqual(horizontalObserved.end, { x: 0.7, y: 0.25 });
  assert.equal(horizontalObserved.provenance, "observed");
  assert.equal(horizontalObserved.confirmation, "user-confirmed");
  assert.deepEqual(horizontal.clippedStart, { x: 0, y: 0.25 });
  assert.deepEqual(horizontal.clippedEnd, { x: 1, y: 0.25 });
  assert.deepEqual(horizontal.frameEdgeContacts.map(({ frameEdgeIndices }) => frameEdgeIndices), [[3], [1]]);
  assert.equal(horizontal.angleDegrees, 0);

  const verticalObserved = result.observedLines.find(({ candidateId }) => candidateId === "vertical");
  const vertical = result.supportLineExtensions.find(({ observedLineId }) => (
    observedLineId === verticalObserved.observedLineId
  ));
  assert.deepEqual(vertical.clippedStart, { x: 0.75, y: 0 });
  assert.deepEqual(vertical.clippedEnd, { x: 0.75, y: 1 });
  assert.equal(vertical.angleDegrees, 90);

  const obliqueObserved = result.observedLines.find(({ candidateId }) => candidateId === "oblique");
  const oblique = result.supportLineExtensions.find(({ observedLineId }) => (
    observedLineId === obliqueObserved.observedLineId
  ));
  assert.deepEqual(oblique.clippedStart, { x: 0, y: 1 });
  assert.deepEqual(oblique.clippedEnd, { x: 1, y: 0 });
  assert.deepEqual(oblique.frameEdgeContacts.map(({ frameEdgeIndices }) => frameEdgeIndices), [[2, 3], [0, 1]]);
  assert.equal(oblique.angleDegrees, 135);
  assert.equal(oblique.provenance, "derived-construction");
  assert.equal(oblique.clipping, "confirmed_frame_only");
  assert.equal(oblique.sourceTruth, false);
  assert.equal(oblique.coreAuthority, false);
});

test("both format diagonals are deterministic frame constructions with bounded intersection positions", () => {
  const result = analyze({
    observedLines: [observedLine("horizontal", { x: 0.2, y: 0.25 }, { x: 0.7, y: 0.25 })],
  });

  assert.deepEqual(result.formatDiagonals.map(({ diagonal }) => diagonal), [
    "vertex-0-to-2",
    "vertex-1-to-3",
  ]);
  assert.deepEqual(result.formatDiagonals.map(({ angleDegrees }) => angleDegrees), [45, 135]);
  assert.ok(result.formatDiagonals.every(({ provenance, derivation, sourceTruth, coreAuthority }) => (
    provenance === "derived-construction"
      && derivation === "opposite_vertices_of_user_confirmed_frame"
      && sourceTruth === false
      && coreAuthority === false
  )));
  assert.deepEqual(result.relations.map(({ status }) => status), [
    "intersection_within_frame",
    "intersection_within_frame",
  ]);
  assert.deepEqual(result.relations.map(({ intersection }) => intersection), [
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.25 },
  ]);
  assert.deepEqual(result.relations.map(({ normalizedSupportLinePosition }) => normalizedSupportLinePosition), [
    0.25,
    0.75,
  ]);
});

test("parallel and out-of-frame diagonal relations fail closed without invented intersections", () => {
  const parallel = analyze({
    observedLines: [observedLine("parallel", { x: 0, y: 0.2 }, { x: 0.8, y: 1 })],
  });
  assert.equal(parallel.relations[0].status, "parallel");
  assert.equal(parallel.relations[0].intersection, null);
  assert.equal(parallel.relations[0].normalizedSupportLinePosition, null);

  const coincident = analyze({
    observedLines: [observedLine("coincident", { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 })],
  });
  assert.equal(coincident.relations[0].status, "coincident");
  assert.equal(coincident.relations[0].intersection, null);
  assert.equal(coincident.relations[0].normalizedSupportLinePosition, null);

  const corner = analyze({
    observedLines: [observedLine("corner", { x: 0, y: 0.08 }, { x: 0.16, y: 0 })],
  });
  assert.equal(corner.relations[0].status, "intersection_within_frame");
  assert.equal(corner.relations[1].status, "no_intersection_within_frame");
  assert.equal(corner.relations[1].intersection, null);
});

test("near-boundary intersections use the declared tolerance without escaping the confirmed frame", () => {
  const result = analyze({
    observedLines: [observedLine(
      "near-top",
      { x: 0.2, y: 0.0000000001 },
      { x: 0.8, y: 0.0000000001 },
    )],
  });

  assert.equal(result.boundaryToleranceNormalized, 1e-9);
  assert.ok(result.relations.every(({ status }) => status === "intersection_within_frame"));
  assert.ok(result.relations.every(({ intersection }) => (
    intersection.x >= 0 && intersection.x <= 1 && intersection.y >= 0 && intersection.y <= 1
  )));
});

test("construction identities are stable, inputs are immutable, and no package-root export is added", () => {
  const input = {
    enabledLayers: ["format-diagonals", "junction-angles", "support-line-extensions"],
    sourcePixelWidth: 1600,
    sourcePixelHeight: 900,
    frame: structuredClone(FRAME),
    observedLines: [observedLine("strong-oblique", { x: 0.1, y: 0.8 }, { x: 0.9, y: 0.2 })],
  };
  const before = structuredClone(input);
  const first = analyzePersonalVisualHarmonyConstructionsV1(input);
  const second = analyzePersonalVisualHarmonyConstructionsV1({
    ...input,
    enabledLayers: ["support-line-extensions", "format-diagonals", "junction-angles"],
  });

  assert.deepEqual(input, before);
  assert.equal(first.contentIdentity, second.contentIdentity);
  assert.match(first.contentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(first.frame.provenance, "user-confirmed");
  assert.equal(first.candidateEvidenceOnly, true);
  assert.equal(first.sourceTruth, false);
  assert.equal(first.automaticAcceptance, false);
  assert.equal(first.explicitUserConfirmationRequired, true);
  assert.equal(first.coreRun, false);
  assert.ok(first.junctionAngles.length > 0);
  assert.deepEqual(first.limits, {
    imagePlaneOnly: true,
    noWorldSpaceMetricClaim: true,
    noHarmonicRatioClaim: true,
    noIntentInference: true,
    noVanishingPointInference: true,
  });
  assert.equal("analyzePersonalVisualHarmonyConstructionsV1" in packageRoot, false);
});

test("disabled construction layers produce no derived objects", () => {
  const result = analyze({ enabledLayers: [] });

  assert.deepEqual(result.enabledLayers, []);
  assert.deepEqual(result.observedLines, []);
  assert.deepEqual(result.supportLineExtensions, []);
  assert.deepEqual(result.formatDiagonals, []);
  assert.deepEqual(result.relations, []);
  assert.equal(Object.hasOwn(result, "junctionAngles"), false);
  assert.equal(result.coreRun, false);
});

test("junction output is absent until explicitly enabled and leaves prior constructions unchanged", () => {
  const baseline = analyze();
  const enabled = analyze({
    enabledLayers: ["support-line-extensions", "format-diagonals", "junction-angles"],
  });

  assert.equal(Object.hasOwn(baseline, "junctionAngles"), false);
  assert.ok(enabled.junctionAngles.length > 0);
  assert.deepEqual(enabled.observedLines, baseline.observedLines);
  assert.deepEqual(enabled.supportLineExtensions, baseline.supportLineExtensions);
  assert.deepEqual(enabled.formatDiagonals, baseline.formatDiagonals);
  assert.deepEqual(enabled.relations, baseline.relations);
});

test("junction angles require support lines and preserve observed versus derived provenance", () => {
  assert.throws(
    () => analyze({ enabledLayers: ["junction-angles"] }),
    /Junction angles require the support-line extension layer/u,
  );

  const result = analyze({
    enabledLayers: ["support-line-extensions", "junction-angles"],
    observedLines: [
      observedLine("horizontal", { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }),
      observedLine("vertical", { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }, "axis"),
    ],
  });
  const crossing = result.junctionAngles.find(({ junctionKind }) => (
    junctionKind === "support-line-support-line"
  ));

  assert.ok(crossing);
  assert.deepEqual(crossing.intersection, { x: 0.5, y: 0.5 });
  assert.equal(crossing.smallerAngleDegrees, 90);
  assert.equal(crossing.supplementaryAngleDegrees, 90);
  assert.equal(crossing.angleConvention, "projected_image_plane_smaller_and_supplementary");
  assert.equal(crossing.firstParticipant.provenance, "derived-construction");
  assert.equal(crossing.secondParticipant.provenance, "derived-construction");
  assert.equal(crossing.firstParticipant.intersectionWithinObservedExtent, true);
  assert.equal(crossing.secondParticipant.intersectionWithinObservedExtent, true);
  assert.match(crossing.firstParticipant.sourceObservedLineId, /^observed-line:/u);
  assert.equal(crossing.provenance, "derived-measurement");
  assert.equal(crossing.sourceTruth, false);
  assert.equal(crossing.coreAuthority, false);
});

test("junction angles use pixel-scaled directions without ratio snapping", () => {
  const result = analyze({
    enabledLayers: ["support-line-extensions", "junction-angles"],
    sourcePixelWidth: 2_000,
    sourcePixelHeight: 1_000,
    observedLines: [
      observedLine("horizontal", { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }),
      observedLine("oblique", { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }),
    ],
  });
  const crossing = result.junctionAngles.find(({ junctionKind }) => (
    junctionKind === "support-line-support-line"
  ));

  assert.ok(crossing);
  assert.equal(crossing.smallerAngleDegrees, 26.565051177078);
  assert.equal(crossing.supplementaryAngleDegrees, 153.434948822922);
  assert.notEqual(crossing.smallerAngleDegrees, 30);
  assert.notEqual(crossing.smallerAngleDegrees, 45);
});

test("format diagonals and frame contacts produce distinct bounded junction evidence", () => {
  const result = analyze({
    enabledLayers: ["support-line-extensions", "format-diagonals", "junction-angles"],
    observedLines: [
      observedLine("horizontal", { x: 0.2, y: 0.25 }, { x: 0.7, y: 0.25 }),
    ],
  });
  const diagonalCrossing = result.junctionAngles.find(({ junctionKind }) => (
    junctionKind === "format-diagonal-format-diagonal"
  ));
  const frameContact = result.junctionAngles.find(({ junctionKind }) => (
    junctionKind === "support-line-frame-edge"
  ));

  assert.ok(diagonalCrossing);
  assert.deepEqual(diagonalCrossing.intersection, { x: 0.5, y: 0.5 });
  assert.equal(diagonalCrossing.smallerAngleDegrees, 90);
  assert.ok(frameContact);
  const frameParticipant = [frameContact.firstParticipant, frameContact.secondParticipant]
    .find(({ kind }) => kind === "frame-edge");
  const supportParticipant = [frameContact.firstParticipant, frameContact.secondParticipant]
    .find(({ kind }) => kind === "support-line-extension");
  assert.equal(frameParticipant.provenance, "user-confirmed-frame");
  assert.equal(frameParticipant.sourceObservedLineId, null);
  assert.equal(frameParticipant.intersectionWithinObservedExtent, null);
  assert.equal(supportParticipant.intersectionWithinObservedExtent, false);
  assert.ok(result.junctionAngles.every(({ intersection }) => (
    intersection.x >= 0 && intersection.x <= 1 && intersection.y >= 0 && intersection.y <= 1
  )));
});

test("parallel and coincident support lines do not invent discrete junction angles", () => {
  const result = analyze({
    enabledLayers: ["support-line-extensions", "junction-angles"],
    observedLines: [
      observedLine("horizontal-a", { x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }),
      observedLine("horizontal-b", { x: 0.1, y: 0.7 }, { x: 0.9, y: 0.7 }),
      observedLine("coincident", { x: 0.3, y: 0.2 }, { x: 0.6, y: 0.2 }),
    ],
  });

  assert.equal(
    result.junctionAngles.filter(({ junctionKind }) => (
      junctionKind === "support-line-support-line"
    )).length,
    0,
  );
  assert.ok(result.junctionAngles.every(({ smallerAngleDegrees }) => smallerAngleDegrees > 0));
});

test("junction enumeration stays bounded at the maximum observed-line input", () => {
  const observedLines = Array.from({ length: 48 }, (_, index) => {
    const angle = (index / 48) * Math.PI;
    const deltaX = Math.cos(angle) * 0.4;
    const deltaY = Math.sin(angle) * 0.4;
    return observedLine(
      `radial-${String(index)}`,
      { x: 0.5 - deltaX, y: 0.5 - deltaY },
      { x: 0.5 + deltaX, y: 0.5 + deltaY },
    );
  });
  const result = analyze({
    enabledLayers: ["support-line-extensions", "junction-angles"],
    observedLines,
  });

  assert.equal(result.supportLineExtensions.length, 48);
  assert.equal(
    result.junctionAngles.filter(({ junctionKind }) => (
      junctionKind === "support-line-support-line"
    )).length,
    (48 * 47) / 2,
  );
  assert.ok(result.junctionAngles.length <= 2_048);
});

test("explicit observed endpoints produce acute, right, and obtuse derived triangle metrics", () => {
  const cases = [
    {
      name: "acute",
      points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.719615242271 }],
      assertAngles: (angles) => assert.ok(angles.every((angle) => angle < 90)),
    },
    {
      name: "right",
      points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 }],
      assertAngles: (angles) => assert.deepEqual([...angles].sort((a, b) => a - b), [45, 45, 90]),
    },
    {
      name: "obtuse",
      points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.3, y: 0.2 }],
      assertAngles: (angles) => assert.ok(angles.some((angle) => angle > 90)),
    },
  ];

  for (const entry of cases) {
    const result = analyzeObservedTriangle(entry.points);
    const triangle = result.triangles[0];
    assert.ok(triangle, entry.name);
    assert.equal(triangle.kind, "triangle-construction");
    assert.equal(triangle.winding, "clockwise_image_plane");
    assert.equal(triangle.signedNormalizedArea, triangle.absoluteNormalizedArea);
    assert.ok(triangle.absoluteNormalizedArea > triangle.areaToleranceNormalized);
    assert.equal(triangle.areaToleranceNormalized, PERSONAL_VISUAL_HARMONY_TRIANGLE_AREA_TOLERANCE_NORMALIZED);
    assert.ok(triangle.sideLengthsPixels.every((length) => length > 0));
    assert.ok(Math.abs(triangle.interiorAnglesDegrees.reduce((sum, angle) => sum + angle, 0) - 180) < 1e-9);
    entry.assertAngles(triangle.interiorAnglesDegrees);
    assert.ok(triangle.vertices.every(({ parent }) => (
      parent.kind === "observed-line-endpoint"
      && parent.provenance === "user-confirmed-observed-endpoint"
    )));
    assert.equal(triangle.provenance, "derived-construction");
    assert.equal(triangle.candidateEvidenceOnly, true);
    assert.equal(triangle.sourceTruth, false);
    assert.equal(triangle.coreAuthority, false);
  }
});

test("all vertex permutations yield byte-identical canonical triangle output and identity", () => {
  const points = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.25, y: 0.75 }];
  const entries = points.map((point, index) => ({ candidateId: `permutation-line-${String(index)}`, point }));
  const observedLines = entries.map(({ candidateId, point }) => triangleObservedLine(candidateId, point));
  const outputs = permutations(entries).map((vertices) => analyze({
    enabledLayers: ["support-line-extensions", "triangles"],
    observedLines,
    triangleRequests: [observedTriangleRequest("permutation-request", vertices)],
  }).triangles[0]);

  assert.ok(outputs.every((triangle) => JSON.stringify(triangle) === JSON.stringify(outputs[0])));
  assert.ok(outputs.every(({ triangleId }) => triangleId === outputs[0].triangleId));
});

test("triangle inputs and prior construction outputs remain immutable and disabled output stays absent", () => {
  const points = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 }];
  const entries = points.map((point, index) => ({ candidateId: `immutable-line-${String(index)}`, point }));
  const input = {
    enabledLayers: ["support-line-extensions", "triangles"],
    sourcePixelWidth: 1_200,
    sourcePixelHeight: 800,
    frame: structuredClone(FRAME),
    observedLines: entries.map(({ candidateId, point }) => triangleObservedLine(candidateId, point)),
    triangleRequests: [observedTriangleRequest("immutable-request", entries)],
  };
  const before = structuredClone(input);
  const enabled = analyzePersonalVisualHarmonyConstructionsV1(input);
  const disabled = analyzePersonalVisualHarmonyConstructionsV1({
    ...input,
    enabledLayers: ["support-line-extensions"],
  });

  assert.deepEqual(input, before);
  assert.equal(enabled.triangles.length, 1);
  assert.equal(Object.hasOwn(disabled, "triangles"), false);
  assert.equal(disabled.coreRun, false);
});

test("duplicate, collinear, near-collinear, non-finite, out-of-bound, and stale triangle vertices fail closed", () => {
  const basePoints = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 }];
  const baseEntries = basePoints.map((point, index) => ({ candidateId: `negative-line-${String(index)}`, point }));
  const observedLines = baseEntries.map(({ candidateId, point }) => triangleObservedLine(candidateId, point));
  const run = (vertices, lineOverrides = observedLines) => analyze({
    enabledLayers: ["support-line-extensions", "triangles"],
    observedLines: lineOverrides,
    triangleRequests: [{ requestId: "negative-request", vertices }],
  });
  const validVertices = observedTriangleRequest("negative-request", baseEntries).vertices;

  const duplicatePointEntries = [
    { candidateId: "negative-line-0", point: { x: 0.2, y: 0.2 } },
    { candidateId: "negative-line-1", point: { x: 0.2, y: 0.2 } },
    { candidateId: "negative-line-2", point: { x: 0.2, y: 0.8 } },
  ];
  assert.throws(
    () => run(
      observedTriangleRequest("duplicate-point", duplicatePointEntries).vertices,
      duplicatePointEntries.map(({ candidateId, point }) => triangleObservedLine(candidateId, point)),
    ),
    /must be distinct/u,
  );
  assert.throws(
    () => run([validVertices[0], validVertices[0], validVertices[2]]),
    /distinct stable parent references/u,
  );
  assert.throws(
    () => run([
      {
        point: { x: 0, y: 0 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "frame-edge", frameEdgeIndex: 0 },
            { kind: "frame-edge", frameEdgeIndex: 3 },
          ],
        },
      },
      validVertices[1],
      validVertices[2],
    ]),
    /does not support a junction made only from frame edges/u,
  );
  assert.throws(
    () => run(observedTriangleRequest("collinear", [
      { candidateId: "negative-line-0", point: { x: 0.2, y: 0.2 } },
      { candidateId: "negative-line-1", point: { x: 0.5, y: 0.5 } },
      { candidateId: "negative-line-2", point: { x: 0.8, y: 0.8 } },
    ]).vertices, [
      triangleObservedLine("negative-line-0", { x: 0.2, y: 0.2 }),
      triangleObservedLine("negative-line-1", { x: 0.5, y: 0.5 }),
      triangleObservedLine("negative-line-2", { x: 0.8, y: 0.8 }),
    ]),
    /collinear or near-collinear/u,
  );
  assert.throws(
    () => run(observedTriangleRequest("near-collinear", [
      { candidateId: "negative-line-0", point: { x: 0.2, y: 0.2 } },
      { candidateId: "negative-line-1", point: { x: 0.5, y: 0.5 } },
      { candidateId: "negative-line-2", point: { x: 0.8, y: 0.800000001 } },
    ]).vertices, [
      triangleObservedLine("negative-line-0", { x: 0.2, y: 0.2 }),
      triangleObservedLine("negative-line-1", { x: 0.5, y: 0.5 }),
      triangleObservedLine("negative-line-2", { x: 0.8, y: 0.800000001 }),
    ]),
    /collinear or near-collinear/u,
  );
  assert.throws(
    () => run([{ ...validVertices[0], point: { x: Number.NaN, y: 0.2 } }, validVertices[1], validVertices[2]]),
    /finite and inside/u,
  );
  assert.throws(
    () => run([{ ...validVertices[0], point: { x: -0.01, y: 0.2 } }, validVertices[1], validVertices[2]]),
    /finite and inside/u,
  );
  assert.throws(
    () => run([{ ...validVertices[0], point: { x: 0.21, y: 0.2 } }, validVertices[1], validVertices[2]]),
    /does not match its stable parent/u,
  );
  assert.throws(
    () => run(validVertices, observedLines.slice(1)),
    /missing or stale/u,
  );
  assert.throws(
    () => analyzeObservedTriangle(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.000001 }],
      { sourcePixelWidth: 100_000, sourcePixelHeight: 1 },
    ),
    /degenerate in pixel space/u,
  );
});

test("explicit junction parents build a triangle from support-line and format-diagonal constructions", () => {
  const observedLines = [
    observedLine("horizontal", { x: 0.2, y: 0.25 }, { x: 0.7, y: 0.25 }),
  ];
  const prepass = analyze({
    enabledLayers: ["support-line-extensions", "format-diagonals", "junction-angles"],
    observedLines,
  });
  const request = {
    requestId: "junction-triangle",
    vertices: [
      {
        point: { x: 0.5, y: 0.5 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "format-diagonal", diagonal: "vertex-0-to-2" },
            { kind: "format-diagonal", diagonal: "vertex-1-to-3" },
          ],
        },
      },
      {
        point: { x: 0.25, y: 0.25 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "support-line-extension", candidateId: "horizontal" },
            { kind: "format-diagonal", diagonal: "vertex-0-to-2" },
          ],
        },
      },
      {
        point: { x: 0.75, y: 0.25 },
        parent: {
          kind: "junction-intersection",
          participants: [
            { kind: "support-line-extension", candidateId: "horizontal" },
            { kind: "format-diagonal", diagonal: "vertex-1-to-3" },
          ],
        },
      },
    ],
  };
  const result = analyze({
    enabledLayers: ["support-line-extensions", "format-diagonals", "junction-angles", "triangles"],
    observedLines,
    triangleRequests: [request],
  });
  const triangle = result.triangles[0];

  assert.equal(triangle.vertices.length, 3);
  assert.ok(triangle.vertices.every(({ parent }) => (
    parent.kind === "junction-intersection"
    && parent.provenance === "derived-junction-intersection"
    && parent.participantConstructionIds.length === 2
  )));
  assert.deepEqual(
    triangle.vertices.map(({ point }) => point).sort((a, b) => a.x - b.x),
    [{ x: 0.25, y: 0.25 }, { x: 0.5, y: 0.5 }, { x: 0.75, y: 0.25 }],
  );

  assert.throws(
    () => constructPersonalVisualHarmonyTrianglesV1({
      requests: [request],
      sourcePixelWidth: 1000,
      sourcePixelHeight: 1000,
      frame: FRAME,
      observedLines: prepass.observedLines,
      supportLineExtensions: prepass.supportLineExtensions,
      formatDiagonals: prepass.formatDiagonals,
      junctionAngles: [...prepass.junctionAngles, ...prepass.junctionAngles],
    }),
    /unique stable ids|ambiguous/u,
  );
});

test("opt-in triangle medians derive exactly three stable vertex-to-opposite-midpoint segments", () => {
  const cases = [
    [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.72 }],
    [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 }],
    [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.3, y: 0.2 }],
  ];

  for (const points of cases) {
    const result = analyzeObservedTriangle(points, {
      enabledLayers: ["support-line-extensions", "triangles", "triangle-medians"],
      sourcePixelWidth: 1200,
      sourcePixelHeight: 800,
    });
    assert.deepEqual(result.enabledLayers, [
      "support-line-extensions",
      "triangles",
      "triangle-medians",
    ]);
    assert.equal(result.triangleMedians.length, 3);
    const triangle = result.triangles[0];
    const concurrencyPoints = [];
    for (const [index, median] of result.triangleMedians.entries()) {
      const oppositeIndices = [[1, 2], [0, 2], [0, 1]][index];
      const first = triangle.vertices[oppositeIndices[0]];
      const second = triangle.vertices[oppositeIndices[1]];
      assert.equal(median.kind, "triangle-median");
      assert.equal(median.triangleId, triangle.triangleId);
      assert.equal(median.vertexIndex, index);
      assert.deepEqual(median.vertex, triangle.vertices[index].point);
      assert.deepEqual(median.vertexParent, triangle.vertices[index].parent);
      assert.deepEqual(median.oppositeSideVertexIndices, oppositeIndices);
      assert.deepEqual(median.oppositeSideVertices, [first.point, second.point]);
      assert.deepEqual(median.oppositeSideParents, [first.parent, second.parent]);
      assert.deepEqual(median.midpoint, {
        x: Number(((first.point.x + second.point.x) / 2).toFixed(12)),
        y: Number(((first.point.y + second.point.y) / 2).toFixed(12)),
      });
      const expectedLength = Number(Math.hypot(
        (median.midpoint.x - median.vertex.x) * 1200,
        (median.midpoint.y - median.vertex.y) * 800,
      ).toFixed(12));
      assert.equal(median.lengthPixels, expectedLength);
      concurrencyPoints.push({
        x: Number((median.vertex.x + ((median.midpoint.x - median.vertex.x) * (2 / 3))).toFixed(9)),
        y: Number((median.vertex.y + ((median.midpoint.y - median.vertex.y) * (2 / 3))).toFixed(9)),
      });
      assert.match(median.medianId, /^construction:triangle-median:[0-9a-f]{64}$/u);
      assert.equal(median.provenance, "derived-construction");
      assert.equal(median.candidateEvidenceOnly, true);
      assert.equal(median.sourceTruth, false);
      assert.equal(median.coreAuthority, false);
      assert.equal("centroid" in median, false);
    }
    assert.deepEqual(concurrencyPoints, [concurrencyPoints[0], concurrencyPoints[0], concurrencyPoints[0]]);
  }
});

test("triangle median output is byte-stable across all equivalent vertex permutations", () => {
  const points = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.25, y: 0.75 }];
  const entries = points.map((point, index) => ({ candidateId: `median-line-${String(index)}`, point }));
  const observedLines = entries.map(({ candidateId, point }) => triangleObservedLine(candidateId, point));
  const outputs = permutations(entries).map((vertices) => analyze({
    enabledLayers: ["support-line-extensions", "triangles", "triangle-medians"],
    observedLines,
    triangleRequests: [observedTriangleRequest("median-permutation-request", vertices)],
  }).triangleMedians);

  assert.ok(outputs.every((medians) => JSON.stringify(medians) === JSON.stringify(outputs[0])));
  assert.deepEqual(outputs[0].map(({ vertexIndex }) => vertexIndex), [0, 1, 2]);
});

test("triangle median derivation preserves inputs and fails closed for stale or invalid parents", () => {
  const result = analyzeObservedTriangle([
    { x: 0.2, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.2, y: 0.8 },
  ]);
  const triangle = result.triangles[0];
  const input = {
    triangles: [structuredClone(triangle)],
    sourcePixelWidth: 1000,
    sourcePixelHeight: 1000,
  };
  const before = structuredClone(input);
  const medians = constructPersonalVisualHarmonyTriangleMediansV1(input);
  assert.deepEqual(input, before);
  assert.equal(medians.length, 3);

  const tamperedIdentity = structuredClone(triangle);
  tamperedIdentity.triangleId = `${tamperedIdentity.triangleId.slice(0, -1)}${
    tamperedIdentity.triangleId.endsWith("0") ? "1" : "0"
  }`;
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [tamperedIdentity] }),
    /identity is missing, stale/u,
  );
  const stalePoint = structuredClone(triangle);
  stalePoint.vertices[0].point.x += 0.01;
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [stalePoint] }),
    /geometry or deterministic measurements are stale/u,
  );
  const missingParent = structuredClone(triangle);
  delete missingParent.vertices[0].parent.parentId;
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [missingParent] }),
    /missing or stale/u,
  );
  const duplicateParent = structuredClone(triangle);
  duplicateParent.vertices[1].parent = structuredClone(duplicateParent.vertices[0].parent);
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [duplicateParent] }),
    /distinct stable parent/u,
  );
  const nonFinite = structuredClone(triangle);
  nonFinite.vertices[0].point.x = Number.NaN;
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [nonFinite] }),
    /finite and inside/u,
  );
  const outOfBounds = structuredClone(triangle);
  outOfBounds.vertices[0].point.x = -0.01;
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [outOfBounds] }),
    /finite and inside/u,
  );
  const degenerate = structuredClone(triangle);
  degenerate.vertices[2].point = structuredClone(degenerate.vertices[1].point);
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [degenerate] }),
    /vertices must be distinct/u,
  );
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [triangle, triangle] }),
    /exactly one current canonical triangle parent/u,
  );
  assert.throws(
    () => constructPersonalVisualHarmonyTriangleMediansV1({ ...input, triangles: [] }),
    /exactly one current canonical triangle parent/u,
  );
});

test("triangle medians remain absent by default and require the triangle layer", () => {
  const disabled = analyzeObservedTriangle([
    { x: 0.2, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.2, y: 0.8 },
  ]);
  assert.equal(Object.hasOwn(disabled, "triangleMedians"), false);
  assert.throws(
    () => analyzeObservedTriangle([
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.2, y: 0.8 },
    ], { enabledLayers: ["support-line-extensions", "triangle-medians"] }),
    /require the triangle construction layer/u,
  );
  assert.equal("constructPersonalVisualHarmonyTriangleMediansV1" in packageRoot, false);
});

test("triangle perpendicular bisectors are exactly three canonical, clipped, non-authoritative guides", () => {
  const result = analyzeObservedTriangle([
    { x: 0.2, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.2, y: 0.8 },
  ], { enabledLayers: ["support-line-extensions", "triangles", "triangle-perpendicular-bisectors"] });
  assert.equal(result.trianglePerpendicularBisectors.length, 3);
  assert.deepEqual(result.trianglePerpendicularBisectors.map(({ sideIndex }) => sideIndex), [0, 1, 2]);
  for (const bisector of result.trianglePerpendicularBisectors) {
    assert.equal(bisector.sourceTruth, false);
    assert.equal(bisector.coreAuthority, false);
    assert.equal(bisector.provenance, "derived-construction");
    assert.ok(bisector.clippedStart.x >= 0 && bisector.clippedStart.x <= 1);
    assert.ok(bisector.clippedEnd.y >= 0 && bisector.clippedEnd.y <= 1);
    const side = bisector.sideVertices;
    const dx = (side[1].x - side[0].x) * 1000;
    const dy = (side[1].y - side[0].y) * 1000;
    const bx = (bisector.supportLineEnd.x - bisector.supportLineStart.x) * 1000;
    const by = (bisector.supportLineEnd.y - bisector.supportLineStart.y) * 1000;
    assert.ok(Math.abs((dx * bx) + (dy * by)) < 1e-9);
  }
  const disabled = analyzeObservedTriangle([
    { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.2, y: 0.8 },
  ]);
  assert.equal(Object.hasOwn(disabled, "trianglePerpendicularBisectors"), false);
  assert.throws(() => constructPersonalVisualHarmonyTrianglePerpendicularBisectorsV1({
    triangles: [], frame: FRAME, sourcePixelWidth: 1000, sourcePixelHeight: 1000,
  }), /exactly one current canonical triangle parent/u);
  const edge = analyzeObservedTriangle([
    { x: 0, y: 0.2 }, { x: 0, y: 0.8 }, { x: 0.72, y: 0.5 },
  ], { enabledLayers: ["support-line-extensions", "triangles", "triangle-perpendicular-bisectors"] });
  for (const bisector of edge.trianglePerpendicularBisectors) {
    for (const point of [bisector.supportLineStart, bisector.supportLineEnd]) {
      assert.ok(point.x >= 0 && point.x <= 1);
      assert.ok(point.y >= 0 && point.y <= 1);
    }
  }
});
