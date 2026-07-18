import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID,
  PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_PROPOSAL_CONTRACT_ID,
  createPersonalVisualHarmonyPixelCropPlanV1,
  refinePersonalVisualHarmonyCandidatePixelCropV1,
  refinePersonalVisualHarmonyPrimitivePixelsV1,
} from "../dist/src/personal-visual-harmony-pixel-refinement.js";
import {
  canonicalizePersonalVisualHarmonyRotatedEllipseV1,
  confirmPersonalVisualHarmonyCandidateSetV1,
  preparePersonalVisualHarmonyCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";
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
      "rotated-ellipse-full-perimeter",
      "rotated-ellipse-nearby-line",
      "rotated-ellipse-partially-occluded",
      "rotated-ellipse-near-circle",
      "rotated-ellipse-weak-negative",
      "rotated-ellipse-competing-orientations",
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

test("rotated ellipse search is bounded, arc-aware, and preserves weak near-circle orientation", () => {
  const full = refinementResult("rotated-ellipse-full-perimeter");
  assert.deepEqual(full.proposedGeometry, {
    kind: "ellipse",
    center: { x: 40, y: 30 },
    radiusX: 20,
    radiusY: 10,
    rotationDegrees: 32,
  });
  assert.equal(full.rotatedEllipseSearch.maximumEvaluations, 214);
  assert.ok(full.rotatedEllipseSearch.evaluatedCandidates <= 214);
  assert.equal(full.rotatedEllipseSearch.centerWindowPixels, 3);
  assert.equal(full.rotatedEllipseSearch.semiAxisWindowPixels, 3);
  assert.equal(full.rotatedEllipseSearch.orientationWindowDegrees, 4);
  assert.equal(full.rotatedEllipseSearch.orientationStepDegrees, 1);
  assert.equal(full.rotatedEllipseSearch.orientationPolicy, "refined");
  assert.deepEqual(full.rotatedEllipseSearch.parameterDeltas, {
    centerX: 1,
    centerY: -1,
    radiusX: 1,
    radiusY: 1,
    rotationDegrees: 2,
  });
  assert.ok(denseEllipseMaximumDisplacement(full.originalGeometry, full.proposedGeometry) <= 4 + 1e-9);

  const partial = refinementResult("rotated-ellipse-partially-occluded");
  assert.equal(partial.status, "refined");
  assert.ok(partial.rotatedEllipseSearch.visibleArcShare >= 0.3);
  assert.ok(partial.rotatedEllipseSearch.visibleArcShare < 1);

  const nearCircle = refinementResult("rotated-ellipse-near-circle");
  assert.equal(nearCircle.status, "refined");
  assert.equal(nearCircle.rotatedEllipseSearch.orientationPolicy, "preserved_near_circle");
  assert.equal(nearCircle.rotatedEllipseSearch.parameterDeltas.rotationDegrees, 0);
  assert.equal(nearCircle.proposedGeometry.rotationDegrees, 40);
});

test("rotated ellipse refinement abstains on weak and competing orientation evidence", () => {
  const weak = refinementResult("rotated-ellipse-weak-negative");
  assert.equal(weak.status, "abstained");
  assert.equal(weak.reason, "weak_edge_support");
  assert.equal(weak.proposedGeometry, null);
  assert.equal(weak.rotatedEllipseSearch.visibleArcShare, 0);

  const competing = refinementResult("rotated-ellipse-competing-orientations");
  assert.equal(competing.status, "abstained");
  assert.equal(competing.reason, "ambiguous_edge_support");
  assert.equal(competing.proposedGeometry, null);
  assert.equal(competing.rotatedEllipseSearch.orientationPolicy, "ambiguous_abstention");
  assert.ok(competing.rotatedEllipseSearch.orientationAmbiguityMargin < 0.0005);
  assert.equal(competing.displacementPixels.maximum, 0);
  assert.equal(competing.sourceTruth, false);
  assert.equal(competing.coreRun, false);
});

test("rotated ellipse refinement keeps separated center candidates in ambiguity evidence", () => {
  const primitive = {
    kind: "ellipse",
    center: { x: 40, y: 30 },
    radiusX: 8,
    radiusY: 4,
    rotationDegrees: 30,
  };
  const raster = renderAdditiveEllipseRaster({
    width: 80,
    height: 60,
    background: 0.07,
    increment: 0.43,
    ellipses: [
      { ...primitive, center: { x: 37, y: 30 } },
      { ...primitive, center: { x: 43, y: 30 } },
    ],
  });
  const input = { raster, primitive, maxDisplacementPixels: 4 };
  const snapshot = structuredClone(input);
  const first = refinePersonalVisualHarmonyPrimitivePixelsV1(input);
  const second = refinePersonalVisualHarmonyPrimitivePixelsV1(input);

  assert.deepEqual(input, snapshot);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.status, "abstained");
  assert.equal(first.reason, "ambiguous_edge_support");
  assert.equal(first.proposedGeometry, null);
  assert.equal(first.evidence.ambiguityMargin, 0);
  assert.ok(first.evidence.proposedEdgeSupport > first.evidence.originalEdgeSupport);
  assert.ok(first.rotatedEllipseSearch.evaluatedCandidates <= 214);
  assert.equal(first.sourceTruth, false);
  assert.equal(first.coreRun, false);
});

test("rotated ellipse canonicalization is equivalent under angle wrapping and axis swaps", () => {
  const expected = {
    kind: "ellipse",
    center: { x: 40, y: 30 },
    radiusX: 20,
    radiusY: 10,
    rotationDegrees: 32,
  };
  assert.deepEqual(canonicalizePersonalVisualHarmonyRotatedEllipseV1(expected), expected);
  assert.deepEqual(canonicalizePersonalVisualHarmonyRotatedEllipseV1({
    ...expected,
    rotationDegrees: 212,
  }), expected);
  assert.deepEqual(canonicalizePersonalVisualHarmonyRotatedEllipseV1({
    ...expected,
    radiusX: 10,
    radiusY: 20,
    rotationDegrees: -58,
  }), expected);
  assert.deepEqual(canonicalizePersonalVisualHarmonyRotatedEllipseV1({
    ...expected,
    radiusX: 12,
    radiusY: 12,
    rotationDegrees: 77,
  }), {
    kind: "ellipse",
    center: { x: 40, y: 30 },
    radiusX: 12,
    radiusY: 12,
  });
});

test("legacy axis-aligned ellipse refinement keeps its established identities and bytes", () => {
  const result = refinementResult("ellipse-with-nearby-line");
  assert.equal(
    result.rasterContentIdentity,
    "sha256:f64d65619d7b4cf897cfca842703fe3ed1194ddd3ec15d9f70d55b63215e3fb3",
  );
  assert.equal(
    result.contentIdentity,
    "sha256:62fe4b2d3f8d245e08c914b67c908aee9479bf35dbb2ff980e3b5e108a668828",
  );
  assert.equal(result.rotatedEllipseSearch, undefined);
});

test("shadow refiner is not exported from the public package root", () => {
  assert.equal("refinePersonalVisualHarmonyPrimitivePixelsV1" in packageRoot, false);
  assert.equal("PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_CONTRACT_ID" in packageRoot, false);
  assert.equal("refinePersonalVisualHarmonyCandidatePixelCropV1" in packageRoot, false);
  assert.equal("createPersonalVisualHarmonyPixelCropPlanV1" in packageRoot, false);
  assert.equal("canonicalizePersonalVisualHarmonyRotatedEllipseV1" in packageRoot, false);
});

test("bounded crop integration deterministically keeps original and proposed geometry separate", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "trapezoid-strong-oblique");
  assert.ok(fixture);
  const raster = renderRaster(fixture);
  const primitive = normalizePrimitive(fixture.primitive, fixture.raster.width, fixture.raster.height);
  const plan = createPersonalVisualHarmonyPixelCropPlanV1({
    primitive,
    sourcePixelWidth: fixture.raster.width,
    sourcePixelHeight: fixture.raster.height,
  });
  assert.equal(plan.status, "ready");
  assert.ok(plan.rasterWidth <= 384);
  assert.ok(plan.rasterHeight <= 384);
  assert.ok(plan.rasterWidth * plan.rasterHeight <= 147_456);
  const input = {
    candidateSetIdentity: `sha256:${"a".repeat(64)}`,
    candidateId: "trapezoid",
    primitive,
    sourcePixelWidth: fixture.raster.width,
    sourcePixelHeight: fixture.raster.height,
    luminanceBytes: cropLuminanceBytes(raster, plan),
  };
  const snapshot = structuredClone(input);
  const first = refinePersonalVisualHarmonyCandidatePixelCropV1(input);
  const second = refinePersonalVisualHarmonyCandidatePixelCropV1(input);

  assert.deepEqual(input, snapshot);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.contentIdentity, second.contentIdentity);
  assert.equal(first.contractId, PERSONAL_VISUAL_HARMONY_PIXEL_REFINEMENT_PROPOSAL_CONTRACT_ID);
  assert.equal(first.status, "refined");
  assert.deepEqual(first.originalGeometry, primitive);
  assert.notEqual(first.proposedGeometry, null);
  assert.notDeepEqual(first.proposedGeometry, first.originalGeometry);
  assert.equal(first.candidateEvidenceOnly, true);
  assert.equal(first.sourceTruth, false);
  assert.equal(first.automaticAcceptance, false);
  assert.equal(first.explicitProposalAdoptionRequired, true);
  assert.equal(first.proposalAdopted, false);
  assert.equal(first.explicitUserConfirmationRequired, true);
  assert.equal(first.coreRun, false);
  assert.ok(first.displacementPixels.maximum <= 6);
  assert.match(first.pixelRasterContentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(first.kernelContentIdentity, /^sha256:[0-9a-f]{64}$/u);
});

test("rotated ellipse crop integration preserves affine geometry and returns bounded shadow evidence", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "rotated-ellipse-full-perimeter");
  assert.ok(fixture);
  const sourceRaster = renderRaster(fixture);
  const originalGeometry = ellipseAfterAxisScaleForTest(
    fixture.primitive,
    1 / fixture.raster.width,
    1 / fixture.raster.height,
    {
      x: fixture.primitive.center.x / fixture.raster.width,
      y: fixture.primitive.center.y / fixture.raster.height,
    },
  );
  const expectedGeometry = ellipseAfterAxisScaleForTest(
    fixture.expectedGeometry,
    1 / fixture.raster.width,
    1 / fixture.raster.height,
    {
      x: fixture.expectedGeometry.center.x / fixture.raster.width,
      y: fixture.expectedGeometry.center.y / fixture.raster.height,
    },
  );
  const base = {
    candidateSetIdentity: `sha256:${"f".repeat(64)}`,
    candidateId: "rotated-ellipse",
    primitive: originalGeometry,
    sourcePixelWidth: fixture.raster.width,
    sourcePixelHeight: fixture.raster.height,
  };
  const plan = createPersonalVisualHarmonyPixelCropPlanV1(base);
  assert.equal(plan.status, "ready");
  const input = {
    ...base,
    luminanceBytes: cropLuminanceBytes(sourceRaster, plan),
  };
  const snapshot = structuredClone(input);
  const first = refinePersonalVisualHarmonyCandidatePixelCropV1(input);
  const second = refinePersonalVisualHarmonyCandidatePixelCropV1(input);

  assert.deepEqual(input, snapshot);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.status, "refined");
  assert.deepEqual(first.originalGeometry, originalGeometry);
  assert.notDeepEqual(first.proposedGeometry, originalGeometry);
  assert.ok(first.rotatedEllipseSearch.evaluatedCandidates <= 214);
  assert.equal(first.rotatedEllipseSearch.maximumEvaluations, 214);
  assert.ok(first.displacementPixels.maximum <= 6);
  assert.equal(first.candidateEvidenceOnly, true);
  assert.equal(first.sourceTruth, false);
  assert.equal(first.automaticAcceptance, false);
  assert.equal(first.explicitProposalAdoptionRequired, true);
  assert.equal(first.proposalAdopted, false);
  assert.equal(first.explicitUserConfirmationRequired, true);
  assert.equal(first.coreRun, false);
  assert.ok(geometryError(first.proposedGeometry, expectedGeometry)
    < geometryError(originalGeometry, expectedGeometry));
  const proposedSourcePixels = ellipseAfterAxisScaleForTest(
    first.proposedGeometry,
    fixture.raster.width,
    fixture.raster.height,
    {
      x: first.proposedGeometry.center.x * fixture.raster.width,
      y: first.proposedGeometry.center.y * fixture.raster.height,
    },
  );
  assert.ok(geometryError(proposedSourcePixels, fixture.expectedGeometry)
    < geometryError(fixture.primitive, fixture.expectedGeometry));
  assert.match(first.contentIdentity, /^sha256:[0-9a-f]{64}$/u);
});

test("adopting the supported rotated proposal does not regress its tangent relation", () => {
  const fixture = corpus.cases.find((entry) => entry.id === "rotated-ellipse-full-perimeter");
  assert.ok(fixture);
  const originalGeometry = ellipseAfterAxisScaleForTest(
    fixture.primitive,
    1 / fixture.raster.width,
    1 / fixture.raster.height,
    {
      x: fixture.primitive.center.x / fixture.raster.width,
      y: fixture.primitive.center.y / fixture.raster.height,
    },
  );
  const plan = createPersonalVisualHarmonyPixelCropPlanV1({
    primitive: originalGeometry,
    sourcePixelWidth: fixture.raster.width,
    sourcePixelHeight: fixture.raster.height,
  });
  const proposal = refinePersonalVisualHarmonyCandidatePixelCropV1({
    candidateSetIdentity: `sha256:${"9".repeat(64)}`,
    candidateId: "rotated-ellipse",
    primitive: originalGeometry,
    sourcePixelWidth: fixture.raster.width,
    sourcePixelHeight: fixture.raster.height,
    luminanceBytes: cropLuminanceBytes(renderRaster(fixture), plan),
  });
  assert.equal(proposal.status, "refined");
  const originalRelation = rotatedEllipseTangentRelation(originalGeometry, fixture.expectedGeometry);
  const proposedRelation = rotatedEllipseTangentRelation(
    proposal.proposedGeometry,
    fixture.expectedGeometry,
  );

  assert.ok(originalRelation);
  assert.ok(proposedRelation);
  assert.ok(["tangent", "near_tangent"].includes(proposedRelation.contactCharacter));
  assert.ok(proposedRelation.gapPixels <= originalRelation.gapPixels + 1e-9);
  assert.ok(proposedRelation.tangentAngleDeltaDegrees
    <= originalRelation.tangentAngleDeltaDegrees + 1e-9);
  assert.equal(proposal.proposalAdopted, false);
  assert.equal(proposal.coreRun, false);
});

test("rotated proposal identities change with the full canonical orientation", () => {
  const base = {
    candidateSetIdentity: `sha256:${"8".repeat(64)}`,
    candidateId: "rotated-identity",
    sourcePixelWidth: 100,
    sourcePixelHeight: 100,
  };
  const first = refinePersonalVisualHarmonyCandidatePixelCropV1({
    ...base,
    primitive: {
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
      rotationDegrees: 30,
    },
  });
  const second = refinePersonalVisualHarmonyCandidatePixelCropV1({
    ...base,
    primitive: {
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
      rotationDegrees: 31,
    },
  });

  assert.equal(first.reason, "pixel_read_unavailable");
  assert.equal(second.reason, "pixel_read_unavailable");
  assert.notEqual(first.contentIdentity, second.contentIdentity);
  assert.notDeepEqual(first.originalGeometry, second.originalGeometry);
});

test("bounded crop planning uses the confirmed image-width coordinate scale", () => {
  const plan = createPersonalVisualHarmonyPixelCropPlanV1({
    primitive: {
      kind: "segment",
      start: { x: 0.5, y: 0.25 },
      end: { x: 0.5, y: 0.75 },
    },
    sourcePixelWidth: 100,
    sourcePixelHeight: 80,
  });

  assert.equal(plan.status, "ready");
  assert.equal(plan.originX, 42);
  assert.equal(plan.originY, 12);
  assert.equal(plan.sourceWidth, 17);
  assert.equal(plan.sourceHeight, 57);
});

test("crop integration projects image-border guides onto the last readable raster pixel", () => {
  const primitives = [
    {
      kind: "segment",
      start: { x: 1, y: 0.2 },
      end: { x: 1, y: 0.8 },
    },
    {
      kind: "axis",
      start: { x: 0.2, y: 1 },
      end: { x: 0.8, y: 1 },
    },
    {
      kind: "quadrilateral",
      vertices: [
        { x: 0.7, y: 0.7 },
        { x: 1, y: 0.7 },
        { x: 1, y: 1 },
        { x: 0.7, y: 1 },
      ],
    },
    {
      kind: "ellipse",
      center: { x: 0.9, y: 0.8 },
      radiusX: 0.1,
      radiusY: 0.2,
    },
  ];

  for (const [index, primitive] of primitives.entries()) {
    const base = {
      candidateSetIdentity: `sha256:${"d".repeat(64)}`,
      candidateId: `border-${index}`,
      primitive,
      sourcePixelWidth: 100,
      sourcePixelHeight: 80,
    };
    const plan = createPersonalVisualHarmonyPixelCropPlanV1(base);
    assert.equal(plan.status, "ready");
    const result = refinePersonalVisualHarmonyCandidatePixelCropV1({
      ...base,
      luminanceBytes: new Array(plan.rasterWidth * plan.rasterHeight).fill(128),
    });
    assert.equal(result.status, "abstained");
    assert.notEqual(result.reason, "invalid_refined_geometry");
    assert.equal(result.coreRun, false);
    assert.deepEqual(result.originalGeometry, primitive);
  }
});

test("off-frame ellipse crop planning preserves full geometry and can refine visible edge evidence", () => {
  const base = {
    candidateSetIdentity: `sha256:${"8".repeat(64)}`,
    candidateId: "off-frame-ellipse",
    primitive: {
      kind: "ellipse",
      center: { x: 0.08, y: 0.5 },
      radiusX: 0.3,
      radiusY: 0.2,
    },
    sourcePixelWidth: 100,
    sourcePixelHeight: 100,
  };
  const plan = createPersonalVisualHarmonyPixelCropPlanV1(base);
  assert.equal(plan.status, "ready");
  assert.equal(plan.originX, 0);
  assert.ok(plan.sourceWidth < base.sourcePixelWidth);

  const unavailable = refinePersonalVisualHarmonyCandidatePixelCropV1(base);
  assert.equal(unavailable.status, "abstained");
  assert.equal(unavailable.reason, "pixel_read_unavailable");
  assert.deepEqual(unavailable.originalGeometry, base.primitive);
  assert.equal(unavailable.coreRun, false);

  const sourceRaster = renderRaster({
    raster: { width: 100, height: 100, background: 0.85 },
    shapes: [{
      kind: "filled-ellipse",
      center: { x: 5, y: 50 },
      radiusX: 27,
      radiusY: 17,
      luminance: 0.15,
    }],
  });
  const observed = refinePersonalVisualHarmonyCandidatePixelCropV1({
    ...base,
    luminanceBytes: cropLuminanceBytes(sourceRaster, plan),
  });
  assert.equal(observed.status, "refined");
  assert.equal(observed.reason, "improved_edge_support");
  assert.deepEqual(observed.originalGeometry, base.primitive);
  assert.ok(observed.proposedGeometry);
  assert.ok(observed.proposedGeometry.center.x - observed.proposedGeometry.radiusX < 0);
  assert.ok(observed.displacementPixels.maximum <= observed.displacementPixels.bound);
  assert.equal(observed.coreRun, false);
});

test("off-frame rotated ellipse crop refinement preserves orientation and visible full geometry", () => {
  const base = {
    candidateSetIdentity: `sha256:${"9".repeat(64)}`,
    candidateId: "off-frame-rotated-ellipse",
    primitive: {
      kind: "ellipse",
      center: { x: 0.08, y: 0.5 },
      radiusX: 0.3,
      radiusY: 0.18,
      rotationDegrees: 25,
    },
    sourcePixelWidth: 100,
    sourcePixelHeight: 100,
  };
  const plan = createPersonalVisualHarmonyPixelCropPlanV1(base);
  assert.equal(plan.status, "ready");
  assert.equal(plan.originX, 0);
  const sourceRaster = renderRaster({
    raster: { width: 100, height: 100, background: 0.85 },
    shapes: [{
      kind: "filled-ellipse",
      center: { x: 5, y: 50 },
      radiusX: 27,
      radiusY: 15,
      rotationDegrees: 22,
      luminance: 0.15,
    }],
  });

  const observed = refinePersonalVisualHarmonyCandidatePixelCropV1({
    ...base,
    luminanceBytes: cropLuminanceBytes(sourceRaster, plan),
  });
  assert.equal(observed.status, "refined");
  assert.equal(observed.reason, "improved_edge_support");
  assert.deepEqual(observed.originalGeometry, base.primitive);
  assert.ok(observed.proposedGeometry);
  assert.equal(typeof observed.proposedGeometry.rotationDegrees, "number");
  assert.ok(observed.proposedGeometry.center.x - observed.proposedGeometry.radiusX < 0);
  assert.ok(observed.displacementPixels.maximum <= observed.displacementPixels.bound);
  assert.equal(observed.coreRun, false);
});

test("crop integration abstains when mapping yields a kernel-invalid primitive", () => {
  const base = {
    candidateSetIdentity: `sha256:${"e".repeat(64)}`,
    candidateId: "subpixel-segment",
    primitive: {
      kind: "segment",
      start: { x: 0.5, y: 0.5 },
      end: { x: 0.501, y: 0.5 },
    },
    sourcePixelWidth: 100,
    sourcePixelHeight: 100,
  };
  const plan = createPersonalVisualHarmonyPixelCropPlanV1(base);
  assert.equal(plan.status, "ready");

  const result = refinePersonalVisualHarmonyCandidatePixelCropV1({
    ...base,
    luminanceBytes: new Array(plan.rasterWidth * plan.rasterHeight).fill(128),
  });

  assert.equal(result.status, "abstained");
  assert.equal(result.reason, "invalid_refined_geometry");
  assert.equal(result.proposedGeometry, null);
  assert.equal(result.evidence, null);
  assert.equal(result.coreRun, false);
  assert.match(result.contentIdentity, /^sha256:[0-9a-f]{64}$/u);
});

test("rotated crop integration abstains when anisotropic scaling erases orientation", () => {
  const base = {
    candidateSetIdentity: `sha256:${"7".repeat(64)}`,
    candidateId: "orientation-degenerate",
    primitive: {
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
      rotationDegrees: 90,
    },
    sourcePixelWidth: 100,
    sourcePixelHeight: 50,
  };
  const plan = createPersonalVisualHarmonyPixelCropPlanV1(base);
  assert.equal(plan.status, "ready");
  const result = refinePersonalVisualHarmonyCandidatePixelCropV1({
    ...base,
    luminanceBytes: new Array(plan.rasterWidth * plan.rasterHeight).fill(128),
  });

  assert.equal(result.status, "abstained");
  assert.equal(result.reason, "invalid_refined_geometry");
  assert.equal(result.proposedGeometry, null);
  assert.equal(result.kernelContentIdentity, null);
  assert.equal(result.rotatedEllipseSearch, undefined);
  assert.deepEqual(result.originalGeometry, base.primitive);
  assert.equal(result.coreRun, false);
});

test("crop integration fails closed for unavailable, weak, oversized, and authority-bearing evidence", () => {
  const weakFixture = corpus.cases.find((entry) => entry.id === "weak-ambiguous-negative");
  assert.ok(weakFixture);
  const primitive = normalizePrimitive(
    weakFixture.primitive,
    weakFixture.raster.width,
    weakFixture.raster.height,
  );
  const base = {
    candidateSetIdentity: `sha256:${"b".repeat(64)}`,
    candidateId: "weak",
    primitive,
    sourcePixelWidth: weakFixture.raster.width,
    sourcePixelHeight: weakFixture.raster.height,
  };
  const unavailable = refinePersonalVisualHarmonyCandidatePixelCropV1(base);
  assert.equal(unavailable.status, "abstained");
  assert.equal(unavailable.reason, "pixel_read_unavailable");
  assert.equal(unavailable.proposedGeometry, null);
  assert.equal(unavailable.pixelRasterContentIdentity, null);
  assert.equal(unavailable.coreRun, false);

  const weakPlan = createPersonalVisualHarmonyPixelCropPlanV1(base);
  assert.equal(weakPlan.status, "ready");
  const weak = refinePersonalVisualHarmonyCandidatePixelCropV1({
    ...base,
    luminanceBytes: cropLuminanceBytes(renderRaster(weakFixture), weakPlan),
  });
  assert.equal(weak.status, "abstained");
  assert.equal(weak.proposedGeometry, null);

  const oversizedBase = {
    candidateSetIdentity: `sha256:${"c".repeat(64)}`,
    candidateId: "full-diagonal",
    primitive: { kind: "segment", start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    sourcePixelWidth: 4_096,
    sourcePixelHeight: 4_096,
  };
  const oversized = refinePersonalVisualHarmonyCandidatePixelCropV1(oversizedBase);
  assert.equal(oversized.status, "abstained");
  assert.equal(oversized.reason, "bounded_crop_exceeded");
  assert.throws(
    () => refinePersonalVisualHarmonyCandidatePixelCropV1({ ...oversizedBase, luminanceBytes: [] }),
    /must not receive luminance bytes/u,
  );
  assert.throws(
    () => refinePersonalVisualHarmonyCandidatePixelCropV1({
      ...base,
      primitive: { ...primitive, sourceTruth: true },
    }),
    /must use exact fields/u,
  );
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
  for (const primitive of [
    { ...ellipseFixture.primitive, rotationDegrees: 210 },
    { ...ellipseFixture.primitive, radiusX: 11, radiusY: 16, rotationDegrees: 30 },
    { ...ellipseFixture.primitive, rotationDegrees: Number.NaN },
  ]) {
    assert.throws(
      () => refinePersonalVisualHarmonyPrimitivePixelsV1({ raster, primitive }),
      /requires canonical finite geometry/u,
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
  assert.throws(
    () => refinePersonalVisualHarmonyPrimitivePixelsV1({ ...input, maxDisplacementPixels: undefined }),
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

test("ellipse proposals respect the displacement bound across the full perimeter", () => {
  const primitive = {
    kind: "ellipse",
    center: { x: 30, y: 30 },
    radiusX: 12,
    radiusY: 12,
  };
  const target = {
    kind: "ellipse",
    center: { x: 28, y: 30 },
    radiusX: 11,
    radiusY: 10,
  };
  const raster = renderRaster({
    raster: { width: 64, height: 64, background: 0.07 },
    shapes: [{ ...target, kind: "filled-ellipse", luminance: 0.93 }],
  });
  const result = refinePersonalVisualHarmonyPrimitivePixelsV1({
    raster,
    primitive,
    maxDisplacementPixels: 3,
  });

  if (result.proposedGeometry !== null) {
    assert.ok(denseEllipseMaximumDisplacement(primitive, result.proposedGeometry) <= 3 + 1e-9);
  }
});

function refinementInput(fixture) {
  return {
    raster: renderRaster(fixture),
    primitive: structuredClone(fixture.primitive),
    maxDisplacementPixels: fixture.maxDisplacementPixels,
  };
}

function refinementResult(id) {
  const fixture = corpus.cases.find((entry) => entry.id === id);
  assert.ok(fixture, id);
  return refinePersonalVisualHarmonyPrimitivePixelsV1(refinementInput(fixture));
}

function normalizePrimitive(primitive, width, height) {
  const xExtent = width;
  const yExtent = height;
  const point = (value) => ({ x: value.x / xExtent, y: value.y / yExtent });
  if (primitive.kind === "segment" || primitive.kind === "axis") {
    return { kind: primitive.kind, start: point(primitive.start), end: point(primitive.end) };
  }
  if (primitive.kind === "quadrilateral") {
    return { kind: "quadrilateral", vertices: primitive.vertices.map(point) };
  }
  return {
    kind: "ellipse",
    center: point(primitive.center),
    radiusX: primitive.radiusX / xExtent,
    radiusY: primitive.radiusY / yExtent,
    ...(primitive.rotationDegrees === undefined
      ? {}
      : { rotationDegrees: primitive.rotationDegrees }),
  };
}

function ellipseAfterAxisScaleForTest(ellipse, xScale, yScale, center) {
  const rotationRadians = (ellipse.rotationDegrees ?? 0) * Math.PI / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  const radiusXSquared = ellipse.radiusX ** 2;
  const radiusYSquared = ellipse.radiusY ** 2;
  const xx = xScale ** 2 * (radiusXSquared * cos ** 2 + radiusYSquared * sin ** 2);
  const yy = yScale ** 2 * (radiusXSquared * sin ** 2 + radiusYSquared * cos ** 2);
  const xy = xScale * yScale * (radiusXSquared - radiusYSquared) * cos * sin;
  const separation = Math.hypot(xx - yy, 2 * xy);
  return canonicalizePersonalVisualHarmonyRotatedEllipseV1({
    kind: "ellipse",
    center,
    radiusX: Math.sqrt((xx + yy + separation) / 2),
    radiusY: Math.sqrt((xx + yy - separation) / 2),
    rotationDegrees: Math.atan2(2 * xy, xx - yy) * 90 / Math.PI,
  });
}

function rotatedEllipseTangentRelation(ellipseGeometry, expectedSourceGeometry) {
  const sourcePixelWidth = 80;
  const sourcePixelHeight = 60;
  const expectedRotation = (expectedSourceGeometry.rotationDegrees ?? 0) * Math.PI / 180;
  const direction = { x: Math.cos(expectedRotation), y: Math.sin(expectedRotation) };
  const normal = { x: -Math.sin(expectedRotation), y: Math.cos(expectedRotation) };
  const tangentCenter = {
    x: expectedSourceGeometry.center.x + normal.x * expectedSourceGeometry.radiusY,
    y: expectedSourceGeometry.center.y + normal.y * expectedSourceGeometry.radiusY,
  };
  const sourcePoint = (offset) => ({
    x: (tangentCenter.x + direction.x * offset) / sourcePixelWidth,
    y: (tangentCenter.y + direction.y * offset) / sourcePixelHeight,
  });
  const start = sourcePoint(-24);
  const end = sourcePoint(24);
  const rotation = (ellipseGeometry.rotationDegrees ?? 0) * Math.PI / 180;
  const halfWidth = Math.hypot(
    ellipseGeometry.radiusX * Math.cos(rotation),
    ellipseGeometry.radiusY * Math.sin(rotation),
  );
  const halfHeight = Math.hypot(
    ellipseGeometry.radiusX * Math.sin(rotation),
    ellipseGeometry.radiusY * Math.cos(rotation),
  );
  const prepared = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-rotated-pixel-relation",
    sourceImageMediaType: "image/png",
    candidates: [
      {
        id: "major",
        label: "Moitié gauche",
        role: "structural-region",
        reason: "Rectangle structurel confirmé",
        x: 0,
        y: 0,
        width: 0.5,
        height: 1,
      },
      {
        id: "minor",
        label: "Moitié droite",
        role: "structural-region",
        reason: "Rectangle structurel confirmé",
        x: 0.5,
        y: 0,
        width: 0.5,
        height: 1,
      },
      {
        id: "ellipse",
        label: "Ellipse orientée",
        role: "structural-region",
        reason: "Ellipse confirmée dans le plan image",
        x: ellipseGeometry.center.x - halfWidth,
        y: ellipseGeometry.center.y - halfHeight,
        width: halfWidth * 2,
        height: halfHeight * 2,
        primitive: ellipseGeometry,
      },
      {
        id: "tangent",
        label: "Ligne tangente annotée",
        role: "structural-region",
        reason: "Segment confirmé séparément de sa droite support",
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(start.x - end.x),
        height: Math.abs(start.y - end.y),
        primitive: { kind: "segment", start, end },
      },
    ],
  });
  const confirmation = confirmPersonalVisualHarmonyCandidateSetV1({
    preparedCandidateSet: prepared,
    expectedCandidateSetIdentity: prepared.candidateSetIdentity,
    selectedCandidateIds: ["major", "minor"],
    confirmedVisualGuideCandidateIds: ["ellipse", "tangent"],
    sourcePixelWidth,
    sourcePixelHeight,
    acceptedAt: "2026-07-15T12:00:00.000Z",
  });
  return confirmation.imagePlaneGuideAnalysis.relationships[0];
}

function cropLuminanceBytes(raster, plan) {
  assert.equal(plan.status, "ready");
  const bytes = [];
  for (let y = 0; y < plan.rasterHeight; y += 1) {
    const sourceY = Math.min(
      raster.height - 1,
      Math.floor(plan.originY + (y + 0.5) * plan.scaleY),
    );
    for (let x = 0; x < plan.rasterWidth; x += 1) {
      const sourceX = Math.min(
        raster.width - 1,
        Math.floor(plan.originX + (x + 0.5) * plan.scaleX),
      );
      bytes.push(Math.round((raster.luminance[sourceY * raster.width + sourceX] ?? 0) * 255));
    }
  }
  return bytes;
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
      const rotationRadians = (shape.rotationDegrees ?? 0) * Math.PI / 180;
      const cos = Math.cos(rotationRadians);
      const sin = Math.sin(rotationRadians);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const dx = x + 0.5 - shape.center.x;
          const dy = y + 0.5 - shape.center.y;
          const normalizedX = (cos * dx + sin * dy) / shape.radiusX;
          const normalizedY = (-sin * dx + cos * dy) / shape.radiusY;
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

function renderAdditiveEllipseRaster({ width, height, background, increment, ellipses }) {
  const luminance = Array.from({ length: width * height }, () => background);
  for (const ellipse of ellipses) {
    const rotationRadians = ellipse.rotationDegrees * Math.PI / 180;
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = x + 0.5 - ellipse.center.x;
        const dy = y + 0.5 - ellipse.center.y;
        const localX = (cos * dx + sin * dy) / ellipse.radiusX;
        const localY = (-sin * dx + cos * dy) / ellipse.radiusY;
        if (localX * localX + localY * localY <= 1) {
          luminance[y * width + x] = Math.min(1, luminance[y * width + x] + increment);
        }
      }
    }
  }
  return { width, height, luminance };
}

function denseEllipseMaximumDisplacement(original, proposed) {
  let maximum = 0;
  for (let index = 0; index < 4096; index += 1) {
    const angle = 2 * Math.PI * index / 4096;
    const originalPoint = ellipsePoint(original, angle);
    const proposedPoint = ellipsePoint(proposed, angle);
    maximum = Math.max(maximum, Math.hypot(
      proposedPoint.x - originalPoint.x,
      proposedPoint.y - originalPoint.y,
    ));
  }
  return maximum;
}

function ellipsePoint(ellipse, angle) {
  const rotationRadians = (ellipse.rotationDegrees ?? 0) * Math.PI / 180;
  const localX = ellipse.radiusX * Math.cos(angle);
  const localY = ellipse.radiusY * Math.sin(angle);
  return {
    x: ellipse.center.x + localX * Math.cos(rotationRadians) - localY * Math.sin(rotationRadians),
    y: ellipse.center.y + localX * Math.sin(rotationRadians) + localY * Math.cos(rotationRadians),
  };
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
    let total = 0;
    const samples = 720;
    for (let index = 0; index < samples; index += 1) {
      const actualPoint = ellipsePoint(actual, 2 * Math.PI * index / samples);
      const expectedPoint = ellipsePoint(expected, 2 * Math.PI * index / samples);
      total += Math.hypot(actualPoint.x - expectedPoint.x, actualPoint.y - expectedPoint.y);
    }
    return total / samples;
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
