import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzePersonalVisualHarmonyConstructionsV1,
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
