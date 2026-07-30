import assert from "node:assert/strict";
import test from "node:test";

import { analyzeDeclaredLengthPairV1 } from "../dist/src/harmonic-relationship-analysis.js";
import {
  DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE,
  DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS,
  confirmDeclaredSpatialMeasurementPlanV1,
  createDeclaredSpatialCandidateSetIdentityV1,
  createDeclaredSpatialMeasurementPlanV1,
} from "../dist/src/personal-visual-harmony-spatial-measurements.js";

const sourceIdentity = `sha256:${"a".repeat(64)}`;
const width = 1200;
const height = 800;

function candidates() {
  return [
    {
      id: "rectangle-a",
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4,
    },
    {
      id: "rectangle-b",
      x: 0.6,
      y: 0.1,
      width: 0.2,
      height: 0.3,
    },
    {
      id: "not-selected",
      x: 0.2,
      y: 0.2,
      width: 0.1,
      height: 0.1,
    },
  ];
}

const selectedRectangleCandidateIds = ["rectangle-a", "rectangle-b"];
const frame = { kind: "image-frame" };
const rectangle = (candidateId) => ({ kind: "rectangle", candidateId });
const anchor = (owner, kind) => ({ owner, anchor: kind });

function plan(expressions, overrides = {}) {
  return createDeclaredSpatialMeasurementPlanV1({
    sourceIdentity,
    sourcePixelWidth: width,
    sourcePixelHeight: height,
    candidates: candidates(),
    selectedRectangleCandidateIds,
    expressions,
    ...overrides,
  });
}

function confirm(measurementPlan, overrides = {}) {
  return confirmDeclaredSpatialMeasurementPlanV1({
    plan: measurementPlan,
    sourceIdentity,
    sourcePixelWidth: width,
    sourcePixelHeight: height,
    candidates: candidates(),
    selectedRectangleCandidateIds,
    ...overrides,
  });
}

test("declared spatial measurement plan is provider-neutral, canonical, and non-square", () => {
  const expressions = [
    { kind: "extent", owner: frame, extent: "width" },
    { kind: "extent", owner: frame, extent: "height" },
  ];
  const first = plan(expressions);
  const reversed = plan([...expressions].reverse());

  assert.equal(first.planIdentity, reversed.planIdentity);
  assert.deepEqual(first, reversed);
  assert.equal(first.sourcePixelWidth, 1200);
  assert.equal(first.sourcePixelHeight, 800);
  assert.equal(first.coordinatePolicy, "image_plane_pixels_v1");
  assert.deepEqual(first.selectedRectangleCandidateIds, selectedRectangleCandidateIds);
  assert.deepEqual(first.ratioPackRefs, DECLARED_SPATIAL_MEASUREMENT_RATIO_PACK_REFS);
  assert.equal(first.matchTolerance, DECLARED_SPATIAL_MEASUREMENT_MATCH_TOLERANCE);
  assert.equal(
    first.spatialCandidateSetIdentity,
    createDeclaredSpatialCandidateSetIdentityV1({
      candidates: candidates(),
      selectedRectangleCandidateIds: [...selectedRectangleCandidateIds].reverse(),
    }),
  );

  let analyzerCalls = 0;
  const confirmation = confirm(first, {
    analyzePair(input) {
      analyzerCalls += 1;
      return analyzeDeclaredLengthPairV1(input);
    },
  });
  assert.equal(analyzerCalls, 1);
  assert.deepEqual(
    confirmation.resolvedMeasurements.map(({ lengthPixels }) => lengthPixels).sort((a, b) => a - b),
    [800, 1200],
  );
  assert.equal(confirmation.analysis.observedDominantShare, 0.6);
  assert.equal(confirmation.canonicalRatio.dominantShare, 0.6);
  assert.equal(confirmation.canonicalRatio.longToShortRatio, 1.5);
  assert.equal(confirmation.canonicalRatio.longToShortRatioIsSecondary, true);
  assert.equal(confirmation.analysis.relationshipCount, 1);
  assert.equal(confirmation.pairOnly, true);
  assert.equal(confirmation.noUnrequestedComparisons, true);
  assert.equal(confirmation.coreExecutionCount, 1);
  assert.equal(confirmation.providerCalls, 0);
  assert.match(confirmation.acceptedSpatialGeometryIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(confirmation.confirmationIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.deepEqual(confirm(first), confirmation);
});

test("closed grammar resolves rectangle extents, anchor distances, gaps, and frame-edge distances", () => {
  const cases = [
    [
      { kind: "extent", owner: rectangle("rectangle-a"), extent: "width" },
      { kind: "extent", owner: rectangle("rectangle-a"), extent: "height" },
      [320, 360],
    ],
    [
      { kind: "extent", owner: rectangle("rectangle-b"), extent: "diagonal" },
      {
        kind: "anchor-distance",
        metric: "euclidean",
        from: anchor(rectangle("rectangle-a"), "center"),
        to: anchor(rectangle("rectangle-b"), "center"),
      },
      [Math.hypot(240, 240), Math.hypot(540, 120)],
    ],
    [
      {
        kind: "anchor-distance",
        metric: "horizontal",
        from: anchor(rectangle("rectangle-a"), "top-left"),
        to: anchor(rectangle("rectangle-b"), "bottom-right"),
      },
      {
        kind: "anchor-distance",
        metric: "vertical",
        from: anchor(rectangle("rectangle-a"), "top-midpoint"),
        to: anchor(rectangle("rectangle-b"), "bottom-midpoint"),
      },
      [160, 840],
    ],
    [
      {
        kind: "anchor-to-frame-edge",
        anchor: anchor(rectangle("rectangle-a"), "center"),
        edge: "left",
      },
      {
        kind: "anchor-to-frame-edge",
        anchor: anchor(rectangle("rectangle-b"), "center"),
        edge: "bottom",
      },
      [300, 600],
    ],
  ];

  for (const [first, second, expected] of cases) {
    const confirmation = confirm(plan([first, second]));
    assert.deepEqual(
      confirmation.resolvedMeasurements.map(({ lengthPixels }) => lengthPixels).sort((a, b) => a - b),
      [...expected].map((value) => Number(value.toFixed(12))).sort((a, b) => a - b),
    );
    for (const measurement of confirmation.resolvedMeasurements) {
      for (const resolvedAnchor of measurement.resolvedAnchors) {
        assert.match(resolvedAnchor.anchorIdentity, /^sha256:[0-9a-f]{64}$/u);
        assert.equal(resolvedAnchor.derivedOnly, true);
        assert.equal(resolvedAnchor.acceptedPrimitive, false);
        assert.equal(resolvedAnchor.sourceTruth, false);
      }
    }
  }
});

test("plan and confirmation fail closed before the analyzer on every binding class", () => {
  assert.throws(
    () => createDeclaredSpatialMeasurementPlanV1({
      sourceIdentity,
      sourcePixelWidth: width,
      sourcePixelHeight: height,
      candidates: candidates(),
      selectedRectangleCandidateIds: ["rectangle-a"],
      expressions: [
        { kind: "extent", owner: frame, extent: "width" },
        { kind: "extent", owner: rectangle("rectangle-a"), extent: "height" },
      ],
    }),
    /exactly two unique selected rectangles/u,
  );
  const validPlan = plan([
    { kind: "extent", owner: frame, extent: "width" },
    { kind: "extent", owner: rectangle("rectangle-a"), extent: "height" },
  ]);
  let analyzerCalls = 0;
  const analyzePair = (input) => {
    analyzerCalls += 1;
    return analyzeDeclaredLengthPairV1(input);
  };
  const invalidConfirmations = [
    { sourceIdentity: `sha256:${"b".repeat(64)}` },
    { sourcePixelWidth: 1199 },
    { sourcePixelHeight: 801 },
    { selectedRectangleCandidateIds: ["rectangle-a"] },
    { candidates: [{ ...candidates()[0], width: 0.31 }, ...candidates().slice(1)] },
    {
      candidates: [
        ...candidates().slice(0, 2),
        { ...candidates()[2], x: 0.21 },
      ],
    },
    { plan: { ...validPlan, coordinatePolicy: "normalized_v1" } },
    { plan: { ...validPlan, planIdentity: `sha256:${"0".repeat(64)}` } },
    { plan: { ...validPlan, unexpected: true } },
  ];
  for (const overrides of invalidConfirmations) {
    assert.throws(() => confirm(validPlan, { analyzePair, ...overrides }));
  }
  assert.equal(analyzerCalls, 0);

  assert.throws(
    () => plan([
      { kind: "extent", owner: frame, extent: "width" },
      { kind: "extent", owner: frame, extent: "width" },
    ]),
    /distinct/u,
  );
  assert.throws(
    () => plan([
      { kind: "extent", owner: rectangle("not-selected"), extent: "width" },
      { kind: "extent", owner: frame, extent: "width" },
    ]),
    /not selected/u,
  );
  assert.throws(
    () => confirm(plan([
        {
          kind: "anchor-distance",
          metric: "horizontal",
          from: anchor(rectangle("rectangle-a"), "center"),
          to: anchor(rectangle("rectangle-a"), "center"),
        },
        { kind: "extent", owner: frame, extent: "width" },
      ])),
    /zero or invalid length/u,
  );
  assert.throws(
    () => plan(
      [
        { kind: "extent", owner: frame, extent: "width" },
        { kind: "extent", owner: frame, extent: "height" },
      ],
      { matchTolerance: 0.1 },
    ),
    /tolerance/u,
  );
  assert.throws(
    () => createDeclaredSpatialMeasurementPlanV1({
      sourceIdentity,
      sourcePixelWidth: width,
      sourcePixelHeight: height,
      candidates: [...candidates(), {
        id: "line",
        x: 0,
        y: 0,
        width: 1,
        height: 0,
        primitive: { kind: "segment" },
      }],
      selectedRectangleCandidateIds: ["rectangle-a", "line"],
      expressions: [
        { kind: "extent", owner: frame, extent: "width" },
        { kind: "extent", owner: frame, extent: "height" },
      ],
    }),
    /not a rectangle/u,
  );
});
