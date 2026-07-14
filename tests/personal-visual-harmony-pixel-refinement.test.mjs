import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID,
  refinePersonalVisualHarmonyPrimitivePixelsV1,
} from "../dist/src/personal-visual-harmony-pixel-refinement.js";
import * as packageRoot from "../dist/src/index.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(await readFile(
  join(testDirectory, "fixtures/personal-visual-harmony-pixel-refinement/corpus-v1.json"),
  "utf8",
));

test("synthetic corpus contains the required bounded regression scenarios", () => {
  assert.equal(corpus.contractId, "norma.personal-visual-harmony-pixel-refinement-regression-corpus@1");
  assert.deepEqual(
    corpus.cases.map((fixture) => fixture.id),
    [
      "frame-edge-alignment",
      "trapezoid-strong-oblique",
      "ellipse-with-nearby-line",
      "weak-ambiguous-negative",
      "two-equally-supported-edges",
    ],
  );
  assert.equal(corpus.cases.every((fixture) => fixture.raster.width * fixture.raster.height <= 4_800), true);
});

test("positive annotations deterministically improve pixel error without gaining authority", () => {
  for (const fixture of corpus.cases.filter((entry) => entry.expectedStatus === "refined")) {
    const input = refinementInput(fixture);
    const snapshot = structuredClone(input);
    const first = refinePersonalVisualHarmonyPrimitivePixelsV1(input);
    const second = refinePersonalVisualHarmonyPrimitivePixelsV1(input);

    assert.deepEqual(input, snapshot, `${fixture.id}: input must remain immutable`);
    assert.equal(JSON.stringify(first), JSON.stringify(second), `${fixture.id}: result bytes must be deterministic`);
    assert.equal(first.contentIdentity, second.contentIdentity, `${fixture.id}: identity must be deterministic`);
    assert.equal(first.contractId, PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID);
    assert.equal(first.status, "refined", fixture.id);
    assert.equal(first.candidateEvidenceOnly, true);
    assert.equal(first.sourceTruth, false);
    assert.equal(first.automaticAcceptance, false);
    assert.equal(first.explicitUserConfirmationRequired, true);
    assert.equal(first.coreRun, false);
    assert.match(first.rasterContentIdentity, /^sha256:[0-9a-f]{64}$/u);
    assert.deepEqual(first.originalGeometry, fixture.primitive);
    assert.notEqual(first.proposedGeometry, null);
    assert.ok(
      geometryError(first.proposedGeometry, fixture.expectedGeometry)
        < geometryError(first.originalGeometry, fixture.expectedGeometry),
      `${fixture.id}: proposed geometry must reduce annotated pixel error`,
    );
    assert.ok(first.evidence.proposedEdgeSupport > first.evidence.originalEdgeSupport, fixture.id);
    assert.ok(first.displacementPixels.maximum <= fixture.maxDisplacementPixels, fixture.id);
    assert.equal(first.displacementPixels.bound, fixture.maxDisplacementPixels);
    assert.match(first.contentIdentity, /^sha256:[0-9a-f]{64}$/u);
  }
});

test("shadow refiner is not exported from the public package root", () => {
  assert.equal("refinePersonalVisualHarmonyPrimitivePixelsV1" in packageRoot, false);
  assert.equal("PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID" in packageRoot, false);
});

test("segment and axis refinement follow the trapezoid's annotated oblique edge", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "trapezoid-strong-oblique");
  assert.ok(fixture);
  const raster = renderRaster(fixture);
  const initial = {
    start: fixture.primitive.vertices[1],
    end: fixture.primitive.vertices[2],
  };
  const expected = {
    start: fixture.expectedGeometry.vertices[1],
    end: fixture.expectedGeometry.vertices[2],
  };

  for (const kind of ["segment", "axis"]) {
    const primitive = { kind, ...structuredClone(initial) };
    const result = refinePersonalVisualHarmonyPrimitivePixelsV1({
      raster,
      primitive,
      maxDisplacementPixels: 4,
    });
    assert.equal(result.status, "refined", kind);
    assert.ok(lineError(result.proposedGeometry, expected) < lineError(primitive, expected), kind);
    assert.equal(result.sourceTruth, false);
    assert.equal(result.coreRun, false);
  }
});

test("fractional line coordinates retain directly measured original edge support", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "frame-edge-alignment");
  assert.ok(fixture);
  const primitive = {
    kind: "segment",
    start: { x: 8.1, y: 10.1 },
    end: { x: 8.1, y: 44.1 },
  };
  const result = refinePersonalVisualHarmonyPrimitivePixelsV1({
    raster: renderRaster(fixture),
    primitive,
    maxDisplacementPixels: 4,
  });

  assert.notEqual(result.reason, "invalid_refined_geometry");
  assert.ok(result.evidence.originalEdgeSupport > 0);
  assert.deepEqual(result.originalGeometry, primitive);
});

test("malformed quadrilaterals and primitive authority extras fail closed", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "frame-edge-alignment");
  const ellipseFixture = corpus.cases.find((entry) => entry.id === "ellipse-with-nearby-line");
  assert.ok(fixture);
  assert.ok(ellipseFixture);
  const raster = renderRaster(fixture);
  for (const vertices of [
    fixture.primitive.vertices.slice(0, 3),
    [...fixture.primitive.vertices, { x: 20, y: 20 }],
  ]) {
    assert.throws(
      () => refinePersonalVisualHarmonyPrimitivePixelsV1({
        raster,
        primitive: { kind: "quadrilateral", vertices },
      }),
      /exactly four vertices/u,
    );
  }

  for (const primitive of [
    { kind: "segment", start: { x: 8, y: 10 }, end: { x: 8, y: 44 }, sourceTruth: true },
    { kind: "axis", start: { x: 8, y: 10 }, end: { x: 8, y: 44 }, sourceTruth: true },
    { ...fixture.primitive, sourceTruth: true },
    { ...ellipseFixture.primitive, sourceTruth: true },
  ]) {
    assert.throws(
      () => refinePersonalVisualHarmonyPrimitivePixelsV1({ raster, primitive }),
      /must use exact fields/u,
    );
  }
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({
      raster,
      primitive: {
        kind: "segment",
        start: { x: 8, y: 10, automaticAcceptance: true },
        end: { x: 8, y: 44 },
      },
    }),
    /must use exact fields/u,
  );
});

test("unsupported primitive kinds and non-convex quadrilaterals fail closed", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "frame-edge-alignment");
  const ellipseFixture = corpus.cases.find((entry) => entry.id === "ellipse-with-nearby-line");
  assert.ok(fixture);
  assert.ok(ellipseFixture);
  const raster = renderRaster(fixture);

  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({
      raster,
      primitive: { ...ellipseFixture.primitive, kind: "circle" },
    }),
    /supported primitive kind/u,
  );
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({
      raster,
      primitive: {
        kind: "quadrilateral",
        vertices: [
          { x: 10, y: 10 },
          { x: 50, y: 10 },
          { x: 25, y: 25 },
          { x: 10, y: 45 },
        ],
      },
    }),
    /strictly convex perimeter/u,
  );
});

test("input and raster envelopes reject ignored fields and malformed runtime values", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "frame-edge-alignment");
  assert.ok(fixture);
  const input = refinementInput(fixture);

  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({ ...input, sourceTruth: true }),
    /input must use exact fields/u,
  );
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({
      ...input,
      raster: { ...input.raster, providerMetadata: "ignored" },
    }),
    /rasters must use exact fields/u,
  );
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({
      ...input,
      raster: { ...input.raster, luminance: { length: input.raster.luminance.length } },
    }),
    /luminance must be an array/u,
  );
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({ ...input, primitive: null }),
    /supported primitive object/u,
  );
});

test("weak contour evidence abstains and never emits proposed geometry", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "weak-ambiguous-negative");
  assert.ok(fixture);
  const input = refinementInput(fixture);
  const snapshot = structuredClone(input);
  const result = refinePersonalVisualHarmonyPrimitivePixelsV1(input);

  assert.deepEqual(input, snapshot);
  assert.equal(result.status, "abstained");
  assert.equal(result.reason, "weak_edge_support");
  assert.equal(result.proposedGeometry, null);
  assert.equal(result.sourceTruth, false);
  assert.equal(result.automaticAcceptance, false);
  assert.equal(result.coreRun, false);
  assert.equal(result.displacementPixels.maximum, 0);

  const changedRaster = structuredClone(input.raster);
  changedRaster.luminance[0] = 0.51;
  const changedResult = refinePersonalVisualHarmonyPrimitivePixelsV1({ ...input, raster: changedRaster });
  assert.notEqual(changedResult.rasterContentIdentity, result.rasterContentIdentity);
  assert.notEqual(changedResult.contentIdentity, result.contentIdentity);
});

test("materially separated equally supported contours abstain as ambiguous", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "two-equally-supported-edges");
  assert.ok(fixture);
  const result = refinePersonalVisualHarmonyPrimitivePixelsV1(refinementInput(fixture));

  assert.equal(result.status, "abstained");
  assert.equal(result.reason, fixture.expectedReason);
  assert.equal(result.proposedGeometry, null);
  assert.equal(result.evidence.ambiguityMargin, 0);
  assert.ok(result.evidence.proposedEdgeSupport > result.evidence.originalEdgeSupport);
  assert.equal(result.sourceTruth, false);
  assert.equal(result.coreRun, false);
});

test("invalid raster data and unbounded searches fail closed", () => {
  const fixture = corpus.cases[0];
  assert.ok(fixture);
  const input = refinementInput(fixture);
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({ ...input, maxDisplacementPixels: 7 }),
    /integer from 1 to 6/u,
  );
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({ ...input, maxDisplacementPixels: null }),
    /integer from 1 to 6/u,
  );
  const withoutBound = structuredClone(input);
  delete withoutBound.maxDisplacementPixels;
  const defaulted = refinePersonalVisualHarmonyPrimitivePixelsV1(withoutBound);
  assert.equal(defaulted.displacementPixels.bound, 4);
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({
      ...input,
      raster: { ...input.raster, luminance: input.raster.luminance.slice(1) },
    }),
    /length must equal/u,
  );
});

function refinementInput(fixture) {
  return {
    raster: renderRaster(fixture),
    primitive: structuredClone(fixture.primitive),
    maxDisplacementPixels: fixture.maxDisplacementPixels,
  };
}

function renderRaster(fixture) {
  const { width, height, background } = fixture.raster;
  const luminance = Array.from({ length: width * height }, () => background);
  for (const shape of fixture.shapes) {
    if (shape.kind === "filled-quadrilateral") {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (pointInPolygon({ x: x + 0.5, y: y + 0.5 }, shape.vertices)) {
            luminance[y * width + x] = shape.luminance;
          }
        }
      }
    } else if (shape.kind === "filled-ellipse") {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const normalizedX = (x + 0.5 - shape.center.x) / shape.radiusX;
          const normalizedY = (y + 0.5 - shape.center.y) / shape.radiusY;
          if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
            luminance[y * width + x] = shape.luminance;
          }
        }
      }
    } else if (shape.kind === "segment") {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (distanceToSegment({ x: x + 0.5, y: y + 0.5 }, shape.start, shape.end) <= shape.width / 2) {
            luminance[y * width + x] = shape.luminance;
          }
        }
      }
    } else {
      throw new Error(`Unsupported fixture shape: ${shape.kind}`);
    }
  }
  return { width, height, luminance };
}

function pointInPolygon(point, vertices) {
  let inside = false;
  for (let current = 0, previous = vertices.length - 1; current < vertices.length; previous = current, current += 1) {
    const first = vertices[current];
    const second = vertices[previous];
    const crosses = (first.y > point.y) !== (second.y > point.y)
      && point.x < (second.x - first.x) * (point.y - first.y) / (second.y - first.y) + first.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const progress = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + progress * dx), point.y - (start.y + progress * dy));
}

function geometryError(actual, expected) {
  assert.equal(actual.kind, expected.kind);
  if (actual.kind === "quadrilateral") {
    return actual.vertices.reduce(
      (total, point, index) => total + Math.hypot(
        point.x - expected.vertices[index].x,
        point.y - expected.vertices[index].y,
      ),
      0,
    ) / 4;
  }
  if (actual.kind === "ellipse") {
    return (
      Math.hypot(actual.center.x - expected.center.x, actual.center.y - expected.center.y)
      + Math.abs(actual.radiusX - expected.radiusX)
      + Math.abs(actual.radiusY - expected.radiusY)
    ) / 3;
  }
  return lineError(actual, expected);
}

function lineError(actual, expected) {
  assert.ok(actual);
  return (
    Math.hypot(actual.start.x - expected.start.x, actual.start.y - expected.start.y)
    + Math.hypot(actual.end.x - expected.end.x, actual.end.y - expected.end.y)
  ) / 2;
}
