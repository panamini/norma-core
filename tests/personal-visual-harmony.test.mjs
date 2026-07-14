import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmPersonalVisualHarmonyCandidateSetV1,
  createPersonalVisualHarmonyOverlaySvgV1,
  preparePersonalVisualHarmonyCandidateSetV1,
} from "../dist/src/personal-visual-harmony.js";
import { analyzeHarmonicRelationshipsV1 } from "../dist/src/harmonic-relationship-analysis.js";
import {
  BASIC_PROPORTIONS_PACK,
  GEOMETRY_HARMONIES_PACK,
} from "../dist/src/ratio-pack.js";

const GOLDEN_MAJOR = 0.6180339887498949;
const GOLDEN_MINOR = 1 - GOLDEN_MAJOR;

function goldenCandidates() {
  return [
    {
      id: "major",
      label: "Zone principale",
      role: "structural-region",
      reason: "Découpage principal visible",
      x: 0,
      y: 0,
      width: GOLDEN_MAJOR,
      height: 1,
    },
    {
      id: "minor",
      label: "Zone secondaire",
      role: "structural-region",
      reason: "Découpage secondaire adjacent",
      x: GOLDEN_MAJOR,
      y: 0,
      width: GOLDEN_MINOR,
      height: 1,
    },
  ];
}

function mixedPrimitiveCandidates() {
  return [
    ...goldenCandidates(),
    {
      id: "diagonal",
      label: "Diagonale structurelle",
      role: "structural-region",
      reason: "Long segment visible entre deux angles de construction",
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.2, y: 0.8 },
        end: { x: 0.8, y: 0.2 },
      },
    },
    {
      id: "central-axis",
      label: "Axe vertical central",
      role: "structural-region",
      reason: "Axe vertical matérialisé par les alignements visibles",
      x: 0.5,
      y: 0.1,
      width: 0,
      height: 0.8,
      primitive: {
        kind: "axis",
        start: { x: 0.5, y: 0.1 },
        end: { x: 0.5, y: 0.9 },
      },
    },
    {
      id: "main-ellipse",
      label: "Contour elliptique",
      role: "structural-region",
      reason: "Contour elliptique visible dans la construction",
      x: 0.25,
      y: 0.15,
      width: 0.5,
      height: 0.7,
      primitive: {
        kind: "ellipse",
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.25,
        radiusY: 0.35,
      },
    },
  ];
}

function ellipseLineRelationCandidates() {
  const obliqueLineSum = 1 + Math.sqrt(0.05);
  return [
    ...goldenCandidates(),
    {
      id: "ellipse",
      label: "Ellipse de construction",
      role: "structural-region",
      reason: "Contour elliptique confirmé",
      x: 0.3,
      y: 0.4,
      width: 0.4,
      height: 0.2,
      primitive: {
        kind: "ellipse",
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.2,
        radiusY: 0.1,
      },
    },
    {
      id: "vertical-near-tangent",
      label: "Montant vertical",
      role: "structural-region",
      reason: "Bord vertical confirmé près du contour droit",
      x: 0.705,
      y: 0.2,
      width: 0,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.705, y: 0.2 },
        end: { x: 0.705, y: 0.8 },
      },
    },
    {
      id: "oblique-tangent",
      label: "Oblique tangente",
      role: "structural-region",
      reason: "Oblique confirmée au contact du contour",
      x: 0.3,
      y: obliqueLineSum - 0.9,
      width: 0.6,
      height: 0.6,
      primitive: {
        kind: "axis",
        start: { x: 0.3, y: obliqueLineSum - 0.3 },
        end: { x: 0.9, y: obliqueLineSum - 0.9 },
      },
    },
    {
      id: "vertical-secant",
      label: "Verticale sécante",
      role: "structural-region",
      reason: "Verticale confirmée traversant le contour",
      x: 0.6,
      y: 0.2,
      width: 0,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.6, y: 0.2 },
        end: { x: 0.6, y: 0.8 },
      },
    },
  ];
}

function prepare(candidates = goldenCandidates()) {
  return preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-private-demo-123",
    sourceImageMediaType: "image/png",
    candidates,
  });
}

function confirm(prepared, overrides = {}) {
  return confirmPersonalVisualHarmonyCandidateSetV1({
    preparedCandidateSet: prepared,
    expectedCandidateSetIdentity: prepared.candidateSetIdentity,
    selectedCandidateIds: ["major", "minor"],
    sourcePixelWidth: 1000,
    sourcePixelHeight: 618,
    acceptedAt: "2026-07-13T15:00:00.000Z",
    ...overrides,
  });
}

test("personal visual harmony preparation is candidate-only, deterministic, and redacts the ChatGPT file id", () => {
  const first = prepare();
  const second = prepare();

  assert.equal(first.status, "confirmation_required");
  assert.equal(first.candidateEvidenceOnly, true);
  assert.equal(first.explicitSelectionConfirmationRequired, true);
  assert.equal(first.coreRun, false);
  assert.equal(first.imageBytesObservedByNorma, false);
  assert.equal(first.sourceImageIdentityBasis, "chatgpt_file_reference_not_image_bytes");
  assert.equal(first.candidateSetIdentity, second.candidateSetIdentity);
  assert.deepEqual(
    Object.keys(first.candidates[0]).sort(),
    Object.keys(goldenCandidates()[0]).sort(),
  );
  assert.equal(Object.hasOwn(first.candidates[0], "primitive"), false);
  assert.match(first.candidateSetIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(first), /file-private-demo-123/u);
});

test("candidate validation stays closed while redundant ellipse bounds are canonicalized", () => {
  assert.throws(
    () => prepare([{ ...goldenCandidates()[0], width: 1.1 }]),
    /normalized primitive bounds/u,
  );
  assert.throws(
    () => prepare([goldenCandidates()[0], goldenCandidates()[0]]),
    /unique safe id/u,
  );
  assert.throws(
    () => prepare([{ ...goldenCandidates()[0], unexpected: true }]),
    /exact fields/u,
  );
  assert.throws(
    () => prepare([{ ...goldenCandidates()[0], primitive: { kind: "polygon" } }]),
    /unsupported primitive/u,
  );
  assert.throws(
    () => prepare([{
      ...mixedPrimitiveCandidates().find(({ id }) => id === "diagonal"),
      width: 0.5,
    }]),
    /line bounds must match its endpoints/u,
  );
  assert.throws(
    () => prepare([{
      ...mixedPrimitiveCandidates().find(({ id }) => id === "central-axis"),
      primitive: {
        kind: "axis",
        start: { x: 0.5, y: 0.1 },
        end: { x: 0.5, y: 0.1 },
      },
    }]),
    /requires distinct endpoints/u,
  );
  const canonicalEllipse = prepare([{
    ...mixedPrimitiveCandidates().find(({ id }) => id === "main-ellipse"),
    width: 0.4,
  }]).candidates[0];
  assert.deepEqual(
    {
      x: canonicalEllipse.x,
      y: canonicalEllipse.y,
      width: canonicalEllipse.width,
      height: canonicalEllipse.height,
    },
    { x: 0.25, y: 0.15, width: 0.5, height: 0.7 },
  );
});

test("structural primitive guides render by kind but never enter rectangle-only Core", () => {
  const prepared = prepare(mixedPrimitiveCandidates());
  const svg = createPersonalVisualHarmonyOverlaySvgV1({ preparedCandidateSet: prepared });

  assert.match(svg, /data-candidate-id="diagonal" data-primitive-kind="segment"[^>]*>[\s\S]*?<line data-candidate-shape/u);
  assert.match(svg, /data-candidate-id="central-axis" data-primitive-kind="axis"[^>]*>[\s\S]*?<line data-candidate-shape/u);
  assert.match(svg, /data-candidate-id="main-ellipse" data-primitive-kind="ellipse"[^>]*>[\s\S]*?<ellipse data-candidate-shape/u);
  const diagonalGroup = svg.match(/<g data-candidate-id="diagonal"[\s\S]*?<\/g>/u)?.[0];
  assert.ok(diagonalGroup);
  assert.doesNotMatch(diagonalGroup, /data-resize-handle/u);
  assert.equal([...svg.matchAll(/data-resize-handle/gu)].length, 2);

  const confirmation = confirm(prepared);
  assert.deepEqual(confirmation.result.selectedCandidateIds, ["major", "minor"]);
  assert.ok(confirmation.result.explanations.every(({ subjectCandidateId }) => (
    subjectCandidateId === "major" || subjectCandidateId === "minor"
  )));
  assert.match(confirmation.overlaySvg, /data-primitive-kind="segment"/u);
  assert.match(confirmation.overlaySvg, /data-primitive-kind="ellipse"/u);
  assert.throws(
    () => confirm(prepared, { selectedCandidateIds: ["major", "diagonal"] }),
    /Visual guides cannot enter Norma Core/u,
  );
});

test("confirmed ellipse and line guides produce deterministic image-plane tangency and intersection evidence", () => {
  const prepared = prepare(ellipseLineRelationCandidates());
  const confirmedVisualGuideCandidateIds = [
    "ellipse",
    "vertical-near-tangent",
    "oblique-tangent",
    "vertical-secant",
  ];
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds,
    sourcePixelHeight: 1000,
  });
  const analysis = confirmation.imagePlaneGuideAnalysis;

  assert.equal(analysis.contractId, "norma.personal-visual-harmony-image-plane-relations@1");
  assert.equal(analysis.candidateSetIdentity, prepared.candidateSetIdentity);
  assert.equal(analysis.sourceImageReferenceIdentity, prepared.sourceImageReferenceIdentity);
  assert.equal(analysis.imageBytesObservedByNorma, false);
  assert.equal(analysis.sourceImageDimensionsObservedBy, "chatgpt_widget");
  assert.equal(analysis.sourcePixelWidth, 1000);
  assert.equal(analysis.sourcePixelHeight, 1000);
  assert.equal(analysis.coordinateSpace, "image_plane_pixels_v1");
  assert.equal(analysis.limits.axisAlignedEllipseOnly, true);
  assert.equal(analysis.shallowIntersectionAngleToleranceDegrees, 12);
  assert.deepEqual(analysis.confirmedVisualGuideCandidateIds, confirmedVisualGuideCandidateIds);
  assert.match(analysis.contentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(analysis.relationships.length, 3);

  const vertical = analysis.relationships.find(({ lineCandidateId }) => (
    lineCandidateId === "vertical-near-tangent"
  ));
  assert.ok(vertical);
  assert.equal(vertical.classification, "near_tangent");
  assert.equal(vertical.contactCharacter, "near_tangent");
  assert.equal(vertical.contactLocation, "right");
  assert.equal(vertical.gapPixels, 5);
  assert.equal(vertical.gapPercentOfImageWidth, 0.5);
  assert.equal(vertical.centerToLineDistancePixels, 205);
  assert.equal(vertical.ellipseSupportRadiusPixels, 200);
  assert.equal(vertical.tangentAngleDeltaDegrees, 0);
  assert.equal(vertical.supportingLineContactWithinObservedSegment, true);
  assert.deepEqual(vertical.intersectionPoints, []);

  const oblique = analysis.relationships.find(({ lineCandidateId }) => (
    lineCandidateId === "oblique-tangent"
  ));
  assert.ok(oblique);
  assert.equal(oblique.classification, "near_tangent");
  assert.equal(oblique.contactCharacter, "tangent");
  assert.equal(oblique.contactLocation, "oblique");
  assert.ok(oblique.gapPixels < 0.000001);
  assert.ok(oblique.tangentAngleDeltaDegrees < 0.000001);
  assert.equal(oblique.supportingLineContactWithinObservedSegment, true);
  assert.equal(oblique.intersectionPoints.length, 1);

  const secant = analysis.relationships.find(({ lineCandidateId }) => (
    lineCandidateId === "vertical-secant"
  ));
  assert.ok(secant);
  assert.equal(secant.classification, "intersection");
  assert.equal(secant.contactCharacter, "crossing_intersection");
  assert.equal(secant.gapPixels, 0);
  assert.equal(secant.intersectionPoints.length, 2);
  assert.equal(secant.supportingLineContactWithinObservedSegment, true);
  assert.match(confirmation.overlaySvg, /data-image-plane-relation-id=/u);
});

test("a two-point ellipse crossing with a small tangent delta is reported as a shallow intersection", () => {
  const candidates = [
    ...ellipseLineRelationCandidates(),
    {
      id: "vertical-shallow-intersection",
      label: "Bord droit rasant",
      role: "structural-region",
      reason: "Bord visible coupant très légèrement le contour droit",
      x: 0.699,
      y: 0.2,
      width: 0,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.699, y: 0.2 },
        end: { x: 0.699, y: 0.8 },
      },
    },
  ];
  const prepared = prepare(candidates);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["ellipse", "vertical-shallow-intersection"],
    sourcePixelHeight: 1000,
  });
  const relationship = confirmation.imagePlaneGuideAnalysis.relationships[0];

  assert.ok(relationship);
  assert.equal(relationship.classification, "intersection");
  assert.equal(relationship.contactCharacter, "shallow_intersection");
  assert.equal(relationship.intersectionPoints.length, 2);
  assert.ok(relationship.tangentAngleDeltaDegrees < 12);
  assert.equal(relationship.supportingLineContactWithinObservedSegment, true);
  assert.match(relationship.explanation, /intersection rasante apparente/u);
});

test("guide confirmation is separate from Core identity and rejects rectangle or unknown guide ids", () => {
  const prepared = prepare(ellipseLineRelationCandidates());
  const withoutGuides = confirm(prepared, { sourcePixelHeight: 1000 });
  const withGuides = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["ellipse", "vertical-near-tangent"],
    sourcePixelHeight: 1000,
  });

  assert.equal(withoutGuides.result.contentIdentity, withGuides.result.contentIdentity);
  assert.equal(
    withoutGuides.acceptedGeometryContentIdentity,
    withGuides.acceptedGeometryContentIdentity,
  );
  assert.notEqual(
    withoutGuides.imagePlaneGuideAnalysis.contentIdentity,
    withGuides.imagePlaneGuideAnalysis.contentIdentity,
  );
  assert.deepEqual(withoutGuides.imagePlaneGuideAnalysis.relationships, []);
  assert.equal(withGuides.imagePlaneGuideAnalysis.relationships.length, 1);
  assert.throws(
    () => confirm(prepared, { confirmedVisualGuideCandidateIds: ["major"] }),
    /separate confirmation fields/u,
  );
  assert.throws(
    () => confirm(prepared, { confirmedVisualGuideCandidateIds: ["unknown-guide"] }),
    /does not exist/u,
  );
  assert.throws(
    () => confirm(prepared, {
      confirmedVisualGuideCandidateIds: ["ellipse", "ellipse"],
    }),
    /must be unique/u,
  );
});

test("ellipse-line evidence distinguishes the observed segment from its deterministic extension", () => {
  const candidateValues = ellipseLineRelationCandidates().map((candidate) => {
    if (candidate.id !== "vertical-near-tangent") return candidate;
    return {
      ...candidate,
      y: 0.1,
      height: 0.1,
      primitive: {
        kind: "segment",
        start: { x: 0.705, y: 0.1 },
        end: { x: 0.705, y: 0.2 },
      },
    };
  });
  const prepared = prepare(candidateValues);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["ellipse", "vertical-near-tangent"],
    sourcePixelHeight: 1000,
  });
  const relationship = confirmation.imagePlaneGuideAnalysis.relationships[0];

  assert.ok(relationship);
  assert.equal(relationship.classification, "near_tangent");
  assert.equal(relationship.supportingLineContactWithinObservedSegment, false);
  assert.match(relationship.explanation, /prolongement de sa droite support/u);
});

test("ellipse intersection classification is invariant to a very short observed line fragment", () => {
  const candidateValues = ellipseLineRelationCandidates().map((candidate) => {
    if (candidate.id !== "vertical-secant") return candidate;
    return {
      ...candidate,
      y: 0.499999,
      height: 0.000002,
      primitive: {
        kind: "segment",
        start: { x: 0.6, y: 0.499999 },
        end: { x: 0.6, y: 0.500001 },
      },
    };
  });
  const prepared = prepare(candidateValues);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["ellipse", "vertical-secant"],
    sourcePixelHeight: 1000,
  });
  const relationship = confirmation.imagePlaneGuideAnalysis.relationships[0];

  assert.ok(relationship);
  assert.equal(relationship.classification, "intersection");
  assert.equal(relationship.intersectionPoints.length, 2);
  assert.equal(relationship.supportingLineContactWithinObservedSegment, false);
});

test("ellipse-line relationship ids remain unique when candidate ids contain ambiguous separators", () => {
  const ellipse = (id) => ({
    id,
    label: `Ellipse ${id}`,
    role: "structural-region",
    reason: "Contour elliptique confirmé pour le test d’identité",
    x: 0.3,
    y: 0.4,
    width: 0.4,
    height: 0.2,
    primitive: {
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
    },
  });
  const line = (id) => ({
    id,
    label: `Ligne ${id}`,
    role: "structural-region",
    reason: "Ligne confirmée pour le test d’identité",
    x: 0.705,
    y: 0.2,
    width: 0,
    height: 0.6,
    primitive: {
      kind: "segment",
      start: { x: 0.705, y: 0.2 },
      end: { x: 0.705, y: 0.8 },
    },
  });
  const prepared = prepare([
    ...goldenCandidates(),
    ellipse("a:b"),
    ellipse("a"),
    line("c"),
    line("b:c"),
  ]);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["a:b", "a", "c", "b:c"],
    sourcePixelHeight: 1000,
  });
  const relationshipIds = confirmation.imagePlaneGuideAnalysis.relationships
    .map(({ relationshipId }) => relationshipId);

  assert.equal(relationshipIds.length, 4);
  assert.equal(new Set(relationshipIds).size, 4);
  assert.ok(relationshipIds.every((relationshipId) => (
    /^relation:ellipse-supporting-line:[0-9a-f]{64}$/u.test(relationshipId)
  )));
});

test("explicit confirmation creates AcceptedGeometry, maps it, and detects golden relationships", () => {
  const prepared = prepare();
  const confirmation = confirm(prepared);
  const { result } = confirmation;

  assert.equal(result.status, "completed");
  assert.equal(result.explicitSelectionConfirmation, true);
  assert.equal(result.confirmationMode, "client_asserted_widget_interaction");
  assert.equal(result.serverVerifiedHumanPresence, false);
  assert.equal(result.acceptedStructuredGeometryCreated, true);
  assert.equal(result.coreInputAuthority, "confirmed_structured_geometry");
  assert.equal(result.coreRun, true);
  assert.deepEqual(result.selectedCandidateIds, ["major", "minor"]);
  assert.match(result.mappedGeometryContentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(result.contentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(result.harmonicAnalysis.deterministic, true);
  assert.equal(result.harmonicAnalysis.canonical, true);
  assert.deepEqual(result.harmonicAnalysis.ratioPackRefs, [
    "norma.geometry-harmonies@0.1.0",
    "norma.basic-proportions@0.1.0",
  ]);
  assert.ok(result.explanations.some((entry) => (
    entry.subjectCandidateId === "major"
      && entry.ratioLabel === "φ major"
      && entry.quality === "exact"
  )));
  assert.ok(result.explanations.some((entry) => (
    entry.subjectCandidateId === "minor"
      && entry.ratioLabel === "φ minor"
      && entry.quality === "exact"
  )));
  assert.equal(result.limits.noBeautyClaims, true);
  assert.equal(result.limits.noIntentInference, true);
  assert.match(confirmation.acceptedGeometryContentIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(confirmation.mappingResultContentIdentity, /^sha256:[0-9a-f]{64}$/u);
});

test("canonical Core result ignores click time and caller selection order", () => {
  const prepared = prepare();
  const first = confirm(prepared);
  const second = confirm(prepared, {
    selectedCandidateIds: ["minor", "major"],
    acceptedAt: "2026-07-13T15:10:00.000Z",
  });

  assert.equal(first.result.contentIdentity, second.result.contentIdentity);
  assert.equal(first.result.harmonicAnalysis.contentIdentity, second.result.harmonicAnalysis.contentIdentity);
  assert.deepEqual(second.result.selectedCandidateIds, ["major", "minor"]);
  assert.equal(first.acceptedGeometryContentIdentity, second.acceptedGeometryContentIdentity);
});

test("result overlay marks only the client-selected candidates as selected", () => {
  const prepared = prepare();
  const confirmation = confirm(prepared, { selectedCandidateIds: ["major"] });

  assert.match(
    confirmation.overlaySvg,
    /<g data-candidate-id="major" data-primitive-kind="rectangle"[^>]*>[\s\S]*?<rect data-candidate-box[^>]+stroke-dasharray="none"/u,
  );
  assert.match(
    confirmation.overlaySvg,
    /<g data-candidate-id="minor" data-primitive-kind="rectangle"[^>]*>[\s\S]*?<rect data-candidate-box[^>]+stroke-dasharray="14 10"/u,
  );
  assert.doesNotMatch(confirmation.overlaySvg, /data-resize-handle/u);
});

test("confirmation fails closed on stale identity, unknown candidates, empty selection, or fake dimensions", () => {
  const prepared = prepare();
  assert.throws(
    () => confirm(prepared, { expectedCandidateSetIdentity: `sha256:${"0".repeat(64)}` }),
    /does not match/u,
  );
  assert.throws(
    () => confirm(prepared, { selectedCandidateIds: ["unknown"] }),
    /does not exist/u,
  );
  assert.throws(
    () => confirm(prepared, { selectedCandidateIds: [] }),
    /at least one/u,
  );
  assert.throws(
    () => confirm(prepared, { sourcePixelWidth: 0 }),
    /positive image dimension/u,
  );
});

test("harmonic analysis supports halves and thirds and returns an honest empty result", () => {
  const coordinateSystem = {
    kind: "coordinate-system",
    id: "test-normalized",
    origin: "bottom-left",
    xAxis: "right",
    yAxis: "up",
    dimensions: 2,
    coordinateScale: "normalized",
  };
  const composition = (elements) => ({
    kind: "composition-2d",
    id: "composition:test",
    coordinateSystem,
    surface: {
      kind: "surface-space",
      id: "surface:test",
      coordinateSystem,
      bounds: { kind: "rect", x: 0, y: 0, width: 1, height: 1 },
    },
    elements,
  });
  const declared = analyzeHarmonicRelationshipsV1({
    composition: composition([
      { kind: "element", id: "third", geometry: { kind: "rect", x: 0, y: 0, width: 1 / 3, height: 1 / 2 } },
    ]),
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
  });
  assert.ok(declared.relationships.some((entry) => entry.ratio.ratioId === "1/3"));
  assert.ok(declared.relationships.some((entry) => entry.ratio.ratioId === "1/2"));

  const empty = analyzeHarmonicRelationshipsV1({
    composition: composition([
      { kind: "element", id: "small", geometry: { kind: "rect", x: 0.07, y: 0.09, width: 0.11, height: 0.13 } },
    ]),
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
  });
  assert.equal(empty.status, "completed");
  assert.equal(empty.relationshipCount, 0);
  assert.deepEqual(empty.relationships, []);
});

test("overlay is transparent, image-aligned, and escapes model-provided labels", () => {
  const prepared = prepare([
    {
      ...goldenCandidates()[0],
      id: "safe",
      label: "<script>alert(1)</script>",
    },
  ]);
  const svg = createPersonalVisualHarmonyOverlaySvgV1({ preparedCandidateSet: prepared });

  assert.match(svg, /^<svg/u);
  assert.match(svg, /viewBox="0 0 1000 1000"/u);
  assert.match(svg, /<g data-candidate-id="safe" data-primitive-kind="rectangle" tabindex="0" role="group" aria-label="Ajuster &lt;script&gt;alert\(1\)&lt;\/script&gt;"\s*>/u);
  assert.match(svg, /data-candidate-box/u);
  assert.match(svg, /data-resize-handle/u);
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.doesNotMatch(svg, /<script>/u);
  assert.doesNotMatch(svg, /file-private-demo-123/u);
  assert.doesNotMatch(svg, /<image\b/u);
});
