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
  assert.match(first.candidateSetIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(first), /file-private-demo-123/u);
});

test("candidate validation is closed and rejects out-of-bounds, duplicate, or injected shapes", () => {
  assert.throws(
    () => prepare([{ ...goldenCandidates()[0], width: 1.1 }]),
    /positive normalized rectangle/u,
  );
  assert.throws(
    () => prepare([goldenCandidates()[0], goldenCandidates()[0]]),
    /unique safe id/u,
  );
  assert.throws(
    () => prepare([{ ...goldenCandidates()[0], unexpected: true }]),
    /exact fields/u,
  );
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
    /<g data-candidate-id="major"><rect[^>]+stroke-dasharray="none"/u,
  );
  assert.match(
    confirmation.overlaySvg,
    /<g data-candidate-id="minor"><rect[^>]+stroke-dasharray="14 10"/u,
  );
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
  assert.match(svg, /<g data-candidate-id="safe">/u);
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.doesNotMatch(svg, /<script>/u);
  assert.doesNotMatch(svg, /file-private-demo-123/u);
  assert.doesNotMatch(svg, /<image\b/u);
});
