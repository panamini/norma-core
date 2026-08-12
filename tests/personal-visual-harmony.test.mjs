import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  confirmPersonalVisualHarmonyCandidateSetV1,
  confirmPersonalVisualHarmonyMeasurementPairV1,
  createPersonalVisualHarmonyOverlaySvgV1,
  layoutPersonalVisualHarmonyCandidateLabelsV1,
  preparePersonalVisualHarmonyCandidateSetV1,
  preparePersonalVisualHarmonyCandidateSetV3,
  preparePersonalVisualHarmonyManualCandidateSetV1,
  preparePersonalVisualHarmonyMultiPerceptionObservationV1,
} from "../dist/src/personal-visual-harmony.js";
import {
  analyzeDeclaredLengthPairV1,
  analyzeHarmonicRelationshipsV1,
} from "../dist/src/harmonic-relationship-analysis.js";
import {
  BASIC_PROPORTIONS_PACK,
  GEOMETRY_HARMONIES_PACK,
} from "../dist/src/ratio-pack.js";
import { serializeCanonicalJson } from "../dist/src/serialization.js";

const GOLDEN_MAJOR = 0.6180339887498949;
const GOLDEN_MINOR = 1 - GOLDEN_MAJOR;

function contentIdentityFor(value) {
  return `sha256:${createHash("sha256").update(serializeCanonicalJson(value)).digest("hex")}`;
}

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

function quadrilateralCandidates({ includeEllipse = false } = {}) {
  return [
    ...goldenCandidates(),
    {
      id: "right-trapezoid",
      label: "Cadre trapézoïdal droit",
      role: "structural-region",
      reason: "Quatre arêtes visibles confirment un quadrilatère construit",
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
      primitive: {
        kind: "quadrilateral",
        vertices: [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.2 },
          { x: 0.7, y: 0.8 },
          { x: 0.3, y: 0.8 },
        ],
      },
    },
    ...(includeEllipse ? [{
      id: "quad-ellipse",
      label: "Ellipse au contact du cadre",
      role: "structural-region",
      reason: "Contour elliptique visible contre le côté droit du cadre",
      x: 0.25,
      y: 0.3,
      width: 0.5,
      height: 0.4,
      primitive: {
        kind: "ellipse",
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.25,
        radiusY: 0.2,
      },
    }] : []),
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

function rotatedEllipseCandidate(primitive = {
  kind: "ellipse",
  center: { x: 0.5, y: 0.5 },
  radiusX: 0.2,
  radiusY: 0.1,
  rotationDegrees: 30,
}) {
  return {
    id: "rotated-ellipse",
    label: "Ellipse orientée",
    role: "structural-region",
    reason: "Contour elliptique orienté explicitement confirmé",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    primitive,
  };
}

function lineGuide(id, start, end, kind = "segment") {
  return {
    id,
    label: id,
    role: "structural-region",
    reason: "Ligne image explicitement confirmée",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    primitive: { kind, start, end },
  };
}

function prepare(candidates = goldenCandidates(), triangleConstructionRequests) {
  return preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-private-demo-123",
    sourceImageMediaType: "image/png",
    candidates,
    ...(triangleConstructionRequests === undefined ? {} : { triangleConstructionRequests }),
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

test("two-object candidate manifests bind ordered provenance and fail closed on tampering", () => {
  const base = preparePersonalVisualHarmonyCandidateSetV1({
    sourceFileId: "file-two-object",
    sourceImageMediaType: "image/png",
    candidates: goldenCandidates(),
  });
  const sourceContent = `sha256:${"9".repeat(64)}`;
  const observationA = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
    ordinal: 1,
    role: "primary-subject",
    normalizedPrompt: { kind: "text", text: "person" },
    parentCandidateSetIdentity: base.candidateSetIdentity,
    sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
    sourceImageContentIdentity: sourceContent,
    providerReceiptIdentity: `sha256:${"1".repeat(64)}`,
    maskIdentity: `sha256:${"2".repeat(64)}`,
    perceptionIdentity: `sha256:${"3".repeat(64)}`,
    candidateId: "sam3-object-1-test",
    originalRectangle: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
  });
  const candidateA = {
    id: observationA.candidateId,
    label: "Objet A",
    role: observationA.role,
    reason: "Observation SAM bornée",
    ...observationA.originalRectangle,
    primitive: { kind: "rectangle" },
    sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
  };
  assert.throws(
    () => preparePersonalVisualHarmonyCandidateSetV3({
      sourceFileId: "file-two-object",
      sourceImageContentIdentity: sourceContent,
      sourceImageMediaType: "image/png",
      expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
      visualInterpretationSource: "chatgpt",
      observations: [observationA],
      candidates: [...base.candidates, candidateA],
    }),
    /visualInterpretationSource is invalid/u,
  );
  const first = preparePersonalVisualHarmonyCandidateSetV3({
    sourceFileId: "file-two-object",
    sourceImageContentIdentity: sourceContent,
    sourceImageMediaType: "image/png",
    expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
    visualInterpretationSource: "hybrid",
    observations: [observationA],
    candidates: [...base.candidates, candidateA],
  });
  const forgedObservationA = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
    ...observationA,
    parentCandidateSetIdentity: `sha256:${"8".repeat(64)}`,
    observationIdentity: undefined,
  });
  assert.throws(
    () => preparePersonalVisualHarmonyCandidateSetV3({
      sourceFileId: "file-two-object",
      sourceImageContentIdentity: sourceContent,
      sourceImageMediaType: "image/png",
      expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
      visualInterpretationSource: "hybrid",
      observations: [forgedObservationA],
      candidates: [...base.candidates, candidateA],
    }),
    /Object A parent candidate set identity is invalid/u,
  );
  const observationB = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
    ordinal: 2,
    role: "secondary-subject",
    normalizedPrompt: { kind: "text", text: "bicycle" },
    parentCandidateSetIdentity: first.candidateSetIdentity,
    sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
    sourceImageContentIdentity: sourceContent,
    providerReceiptIdentity: `sha256:${"4".repeat(64)}`,
    maskIdentity: `sha256:${"5".repeat(64)}`,
    perceptionIdentity: `sha256:${"6".repeat(64)}`,
    candidateId: "sam3-object-2-test",
    originalRectangle: { x: 0.6, y: 0.2, width: 0.25, height: 0.4 },
  });
  const candidateB = {
    id: observationB.candidateId,
    label: "Objet B",
    role: observationB.role,
    reason: "Observation SAM bornée",
    ...observationB.originalRectangle,
    primitive: { kind: "rectangle" },
    sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
  };
  for (const [field, duplicateValue] of [
    ["providerReceiptIdentity", observationA.providerReceiptIdentity],
    ["maskIdentity", observationA.maskIdentity],
  ]) {
    const duplicateObservationB = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
      ...observationB,
      [field]: duplicateValue,
      observationIdentity: undefined,
    });
    assert.throws(
      () => preparePersonalVisualHarmonyCandidateSetV3({
        sourceFileId: "file-two-object",
        sourceImageContentIdentity: sourceContent,
        sourceImageMediaType: "image/png",
        expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
        visualInterpretationSource: "hybrid",
        observations: [observationA, duplicateObservationB],
        candidates: [...base.candidates, candidateA, candidateB],
      }),
      new RegExp(`duplicate ${field}`, "u"),
    );
  }
  const second = preparePersonalVisualHarmonyCandidateSetV3({
    sourceFileId: "file-two-object",
    sourceImageContentIdentity: sourceContent,
    sourceImageMediaType: "image/png",
    expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
    visualInterpretationSource: "hybrid",
    observations: [observationA, observationB],
    candidates: [...base.candidates, candidateA, candidateB],
  });
  const editedBaseCandidates = base.candidates.map((candidate) => (
    candidate.id === "major"
      ? { ...candidate, x: candidate.x + 0.01, width: candidate.width - 0.01 }
      : candidate
  ));
  assert.throws(
    () => preparePersonalVisualHarmonyCandidateSetV3({
      sourceFileId: "file-two-object",
      sourceImageContentIdentity: sourceContent,
      sourceImageMediaType: "image/png",
      expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
      visualInterpretationSource: "hybrid",
      observations: [observationA, observationB],
      candidates: [...editedBaseCandidates, candidateA, candidateB],
    }),
    /Object A parent candidate set identity is invalid/u,
  );
  const reviewedSecond = preparePersonalVisualHarmonyCandidateSetV3({
    sourceFileId: "file-two-object",
    sourceImageContentIdentity: sourceContent,
    sourceImageMediaType: "image/png",
    expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
    visualInterpretationSource: "hybrid",
    observations: [observationA, observationB],
    lineageBaseCandidates: base.candidates,
    candidates: [...editedBaseCandidates, candidateA, candidateB],
  });
  assert.notEqual(reviewedSecond.candidateSetIdentity, second.candidateSetIdentity);
  assert.equal(
    reviewedSecond.perceptionManifest.manifestIdentity,
    second.perceptionManifest.manifestIdentity,
  );
  for (const [prepared, selectedCandidateIds] of [
    [first, [candidateA.id]],
    [second, [candidateA.id, candidateB.id]],
  ]) {
    assert.throws(
      () => confirmPersonalVisualHarmonyCandidateSetV1({
        preparedCandidateSet: prepared,
        expectedCandidateSetIdentity: prepared.candidateSetIdentity,
        selectedCandidateIds,
        sourcePixelWidth: 1000,
        sourcePixelHeight: 800,
        acceptedAt: "2026-07-31T12:00:00.000Z",
      }),
      /Two-object candidate sets require session-bound spatial confirmation/u,
    );
  }
  const forgedObservationB = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
    ...observationB,
    parentCandidateSetIdentity: `sha256:${"7".repeat(64)}`,
    observationIdentity: undefined,
  });
  assert.throws(
    () => preparePersonalVisualHarmonyCandidateSetV3({
      sourceFileId: "file-two-object",
      sourceImageContentIdentity: sourceContent,
      sourceImageMediaType: "image/png",
      expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
      visualInterpretationSource: "hybrid",
      observations: [observationA, forgedObservationB],
      candidates: [...base.candidates, candidateA, candidateB],
    }),
    /Object B parent candidate set identity is invalid/u,
  );
  assert.equal(second.workflowMode, "two-object-spatial");
  assert.deepEqual(second.perceptionManifest.observations.map(({ ordinal }) => ordinal), [1, 2]);
  assert.equal(second.coreRun, false);
  assert.equal(
    preparePersonalVisualHarmonyCandidateSetV3({
      sourceFileId: "file-two-object",
      sourceImageContentIdentity: sourceContent,
      sourceImageMediaType: "image/png",
      expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
      visualInterpretationSource: "hybrid",
      observations: [observationA, observationB],
      candidates: [...base.candidates, candidateA, candidateB],
    }).candidateSetIdentity,
    second.candidateSetIdentity,
  );
  const forgePreparedObservation = (prepared, observationIndex, overrides) => {
    const observations = prepared.perceptionManifest.observations.map((observation, index) => (
      index === observationIndex
        ? preparePersonalVisualHarmonyMultiPerceptionObservationV1({
            ...observation,
            ...overrides,
            observationIdentity: undefined,
          })
        : observation
    ));
    const manifestWithoutIdentity = {
      ...prepared.perceptionManifest,
      observations,
    };
    delete manifestWithoutIdentity.manifestIdentity;
    const preparedWithoutIdentity = {
      ...prepared,
      perceptionManifest: {
        ...manifestWithoutIdentity,
        manifestIdentity: contentIdentityFor(manifestWithoutIdentity),
      },
    };
    delete preparedWithoutIdentity.candidateSetIdentity;
    return {
      ...preparedWithoutIdentity,
      candidateSetIdentity: contentIdentityFor(preparedWithoutIdentity),
    };
  };
  for (const [prepared, observationIndex, selectedCandidateIds, expectedMessage] of [
    [first, 0, [candidateA.id], /Object A parent candidate set identity is invalid/u],
    [second, 1, [candidateA.id, candidateB.id], /Object B parent candidate set identity is invalid/u],
  ]) {
    const forgedPrepared = forgePreparedObservation(
      prepared,
      observationIndex,
      { parentCandidateSetIdentity: `sha256:${"8".repeat(64)}` },
    );
    assert.throws(
      () => confirmPersonalVisualHarmonyCandidateSetV1({
        preparedCandidateSet: forgedPrepared,
        expectedCandidateSetIdentity: forgedPrepared.candidateSetIdentity,
        selectedCandidateIds,
        sourcePixelWidth: 1000,
        sourcePixelHeight: 800,
        acceptedAt: "2026-07-31T12:00:00.000Z",
      }),
      expectedMessage,
    );
  }
  for (const [overrides, expectedMessage] of [
    [{ providerReceiptIdentity: observationA.providerReceiptIdentity }, /duplicate providerReceiptIdentity/u],
    [{ maskIdentity: observationA.maskIdentity }, /duplicate maskIdentity/u],
    [{ perceptionIdentity: observationA.perceptionIdentity }, /duplicate perceptionIdentity/u],
    [{ candidateId: observationA.candidateId }, /duplicate candidateId/u],
    [{ originalRectangle: observationA.originalRectangle }, /duplicate the original rectangle/u],
  ]) {
    const forgedPrepared = forgePreparedObservation(second, 1, overrides);
    assert.throws(
      () => confirmPersonalVisualHarmonyCandidateSetV1({
        preparedCandidateSet: forgedPrepared,
        expectedCandidateSetIdentity: forgedPrepared.candidateSetIdentity,
        selectedCandidateIds: [candidateA.id, candidateB.id],
        sourcePixelWidth: 1000,
        sourcePixelHeight: 800,
        acceptedAt: "2026-07-31T12:00:00.000Z",
      }),
      expectedMessage,
    );
  }
  assert.throws(
    () => confirmPersonalVisualHarmonyCandidateSetV1({
      preparedCandidateSet: {
        ...second,
        perceptionManifest: {
          ...second.perceptionManifest,
          observations: [
            second.perceptionManifest.observations[0],
            { ...second.perceptionManifest.observations[1], role: "primary-subject" },
          ],
        },
      },
      expectedCandidateSetIdentity: second.candidateSetIdentity,
      selectedCandidateIds: [candidateA.id, candidateB.id],
      sourcePixelWidth: 1000,
      sourcePixelHeight: 800,
      acceptedAt: "2026-07-31T12:00:00.000Z",
    }),
    /role does not match|manifest|stale|misordered/u,
  );
});

test("an interim V3 candidate set reserves exactly one slot for object B", () => {
  const baseCandidates = (count) => Array.from({ length: count }, (_, index) => ({
    id: `base-${String(index + 1)}`,
    label: `Base ${String(index + 1)}`,
    role: "structural-region",
    reason: "Cadre de base explicite",
    x: 0.05,
    y: 0.05,
    width: 0.2,
    height: 0.2,
  }));
  const prepareInterim = (count) => {
    const base = preparePersonalVisualHarmonyCandidateSetV1({
      sourceFileId: `file-two-object-capacity-${String(count)}`,
      sourceImageMediaType: "image/png",
      candidates: baseCandidates(count),
    });
    const sourceImageContentIdentity = `sha256:${"c".repeat(64)}`;
    const observation = preparePersonalVisualHarmonyMultiPerceptionObservationV1({
      ordinal: 1,
      role: "primary-subject",
      normalizedPrompt: { kind: "text", text: "person" },
      parentCandidateSetIdentity: base.candidateSetIdentity,
      sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
      sourceImageContentIdentity,
      providerReceiptIdentity: `sha256:${"d".repeat(64)}`,
      maskIdentity: `sha256:${"e".repeat(64)}`,
      perceptionIdentity: `sha256:${"f".repeat(64)}`,
      candidateId: "object-a-capacity",
      originalRectangle: { x: 0.6, y: 0.2, width: 0.2, height: 0.3 },
    });
    return preparePersonalVisualHarmonyCandidateSetV3({
      sourceFileId: `file-two-object-capacity-${String(count)}`,
      sourceImageContentIdentity,
      sourceImageMediaType: "image/png",
      expectedSourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
      visualInterpretationSource: "hybrid",
      observations: [observation],
      candidates: [
        ...base.candidates,
        {
          id: observation.candidateId,
          label: "Objet A",
          role: observation.role,
          reason: "Observation SAM bornée",
          ...observation.originalRectangle,
          primitive: { kind: "rectangle" },
          sourceImageReferenceIdentity: base.sourceImageReferenceIdentity,
        },
      ],
    });
  };

  assert.equal(prepareInterim(10).candidates.length, 11);
  assert.throws(
    () => prepareInterim(11),
    /Interim two-object candidate sets must reserve one candidate slot for object B/u,
  );
});

test("candidate validation stays closed while explicit primitive envelopes are canonicalized", () => {
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
  const segment = mixedPrimitiveCandidates().find(({ id }) => id === "diagonal");
  const mismatchedSegment = {
    ...segment,
    x: 0.01,
    y: 0.02,
    width: 0.03,
    height: 0.04,
  };
  const segmentInputSnapshot = structuredClone(mismatchedSegment);
  const canonicalSegment = prepare([mismatchedSegment]);
  const repeatedSegment = prepare([mismatchedSegment]);
  const reversedSegment = prepare([{
    ...mismatchedSegment,
    primitive: {
      ...mismatchedSegment.primitive,
      start: mismatchedSegment.primitive.end,
      end: mismatchedSegment.primitive.start,
    },
  }]);
  assert.deepEqual(
    canonicalSegment.candidates[0],
    {
      ...segment,
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
    },
  );
  assert.equal(canonicalSegment.candidateSetIdentity, repeatedSegment.candidateSetIdentity);
  assert.deepEqual(mismatchedSegment, segmentInputSnapshot);
  assert.deepEqual(
    {
      x: reversedSegment.candidates[0].x,
      y: reversedSegment.candidates[0].y,
      width: reversedSegment.candidates[0].width,
      height: reversedSegment.candidates[0].height,
    },
    { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
  );

  const axis = mixedPrimitiveCandidates().find(({ id }) => id === "central-axis");
  const mismatchedAxis = {
    ...axis,
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.4,
  };
  const canonicalAxis = prepare([mismatchedAxis]).candidates[0];
  const reversedAxis = prepare([{
    ...mismatchedAxis,
    primitive: {
      ...mismatchedAxis.primitive,
      start: mismatchedAxis.primitive.end,
      end: mismatchedAxis.primitive.start,
    },
  }]).candidates[0];
  assert.deepEqual(
    {
      x: canonicalAxis.x,
      y: canonicalAxis.y,
      width: canonicalAxis.width,
      height: canonicalAxis.height,
    },
    { x: 0.5, y: 0.1, width: 0, height: 0.8 },
  );
  assert.deepEqual(
    {
      x: reversedAxis.x,
      y: reversedAxis.y,
      width: reversedAxis.width,
      height: reversedAxis.height,
    },
    { x: 0.5, y: 0.1, width: 0, height: 0.8 },
  );
  assert.throws(
    () => prepare([{
      ...segment,
      primitive: { ...segment.primitive, unexpected: true },
    }]),
    /line primitive must use exact fields/u,
  );
  assert.throws(
    () => prepare([{
      ...segment,
      primitive: {
        ...segment.primitive,
        start: { x: Number.NaN, y: 0.8 },
      },
    }]),
    /normalized point inside the image/u,
  );
  assert.throws(
    () => prepare([{
      ...axis,
      primitive: {
        ...axis.primitive,
        end: { x: 0.5, y: 1.1 },
      },
    }]),
    /normalized point inside the image/u,
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

  const quadrilateral = quadrilateralCandidates().find(({ id }) => id === "right-trapezoid");
  const canonicalQuadrilateral = prepare([{
    ...quadrilateral,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    primitive: {
      kind: "quadrilateral",
      vertices: [
        { x: 0.7, y: 0.8 },
        { x: 0.8, y: 0.2 },
        { x: 0.2, y: 0.2 },
        { x: 0.3, y: 0.8 },
      ],
    },
  }]).candidates[0];
  assert.deepEqual(
    {
      x: canonicalQuadrilateral.x,
      y: canonicalQuadrilateral.y,
      width: canonicalQuadrilateral.width,
      height: canonicalQuadrilateral.height,
      vertices: canonicalQuadrilateral.primitive.vertices,
    },
    {
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
      vertices: quadrilateral.primitive.vertices,
    },
  );
  assert.throws(
    () => prepare([{
      ...quadrilateral,
      primitive: {
        kind: "quadrilateral",
        vertices: [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.8 },
          { x: 0.8, y: 0.2 },
          { x: 0.2, y: 0.8 },
        ],
      },
    }]),
    /simple convex perimeter/u,
  );
  assert.throws(
    () => prepare([{
      ...quadrilateral,
      primitive: {
        kind: "quadrilateral",
        vertices: [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.2 },
          { x: 0.8, y: 0.2 },
          { x: 0.3, y: 0.8 },
        ],
      },
    }]),
    /four distinct vertices/u,
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

test("confirmed quadrilateral guides retain four vertices and produce deterministic side, angle, diagonal, parallelism, and area measures", () => {
  const prepared = prepare(quadrilateralCandidates());
  const svg = createPersonalVisualHarmonyOverlaySvgV1({ preparedCandidateSet: prepared });
  const quadrilateralGroup = svg.match(/<g data-candidate-id="right-trapezoid"[\s\S]*?<\/g>/u)?.[0];

  assert.ok(quadrilateralGroup);
  assert.match(quadrilateralGroup, /data-primitive-kind="quadrilateral"/u);
  assert.match(quadrilateralGroup, /<polygon data-candidate-shape/u);
  assert.equal([...quadrilateralGroup.matchAll(/data-vertex-handle=/gu)].length, 4);
  assert.doesNotMatch(quadrilateralGroup, /data-resize-handle/u);

  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["right-trapezoid"],
    sourcePixelHeight: 1000,
  });
  const analysis = confirmation.imagePlaneGuideAnalysis;
  const measurement = analysis.quadrilateralMeasurements[0];

  assert.equal(analysis.relationships.length, 0);
  assert.equal(analysis.quadrilateralMeasurements.length, 1);
  assert.ok(measurement);
  assert.equal(measurement.kind, "quadrilateral-measurement");
  assert.equal(measurement.candidateId, "right-trapezoid");
  assert.equal(measurement.classification, "trapezoid");
  assert.deepEqual(measurement.vertices, quadrilateralCandidates()[2].primitive.vertices);
  assert.deepEqual(measurement.sideLengthsPixels, [
    600,
    608.276253029822,
    400,
    608.276253029822,
  ]);
  assert.deepEqual(measurement.interiorAnglesDegrees, [
    80.537677791974,
    80.537677791974,
    99.462322208026,
    99.462322208026,
  ]);
  assert.deepEqual(measurement.diagonalLengthsPixels, [
    781.024967590665,
    781.024967590665,
  ]);
  assert.deepEqual(measurement.diagonalIntersection, { x: 0.5, y: 0.56 });
  assert.deepEqual(measurement.oppositeSideParallelism, [
    {
      sideIndices: [0, 2],
      angleDeltaDegrees: 0,
      parallelWithinTolerance: true,
    },
    {
      sideIndices: [1, 3],
      angleDeltaDegrees: 18.924644416052,
      parallelWithinTolerance: false,
    },
  ]);
  assert.equal(measurement.parallelAngleToleranceDegrees, 2);
  assert.equal(measurement.rightAngleToleranceDegrees, 2);
  assert.equal(measurement.areaPixelsSquared, 300000);
  assert.equal(measurement.areaImageShare, 0.3);
  assert.deepEqual(measurement.centroid, { x: 0.5, y: 0.48 });
  assert.match(measurement.measurementId, /^measurement:quadrilateral:[0-9a-f]{64}$/u);
  assert.match(measurement.explanation, /trapèze apparent mesuré dans le plan image/u);
  assert.match(confirmation.overlaySvg, /data-primitive-kind="quadrilateral"/u);
  assert.doesNotMatch(confirmation.overlaySvg, /data-vertex-handle/u);
  assert.throws(
    () => confirm(prepared, { selectedCandidateIds: ["major", "right-trapezoid"] }),
    /Visual guides cannot enter Norma Core/u,
  );
});

test("each confirmed quadrilateral side can participate in ellipse contact evidence without becoming a Core rectangle", () => {
  const prepared = prepare(quadrilateralCandidates({ includeEllipse: true }));
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["right-trapezoid", "quad-ellipse"],
    sourcePixelHeight: 1000,
  });
  const relations = confirmation.imagePlaneGuideAnalysis.relationships;

  assert.equal(relations.length, 2);
  assert.deepEqual(relations.map(({ quadrilateralSideIndex }) => quadrilateralSideIndex), [3, 1]);
  assert.ok(relations.every(({ linePrimitiveKind }) => linePrimitiveKind === "quadrilateral-side"));
  assert.ok(relations.every(({ lineCandidateId }) => lineCandidateId === "right-trapezoid"));
  assert.ok(relations.every(({ supportingLineContactWithinObservedSegment }) => (
    supportingLineContactWithinObservedSegment === true
  )));
  assert.ok(relations.every(({ contactCharacter }) => contactCharacter === "shallow_intersection"));
  assert.equal(new Set(relations.map(({ relationshipId }) => relationshipId)).size, 2);
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
  assert.equal(Object.hasOwn(analysis, "quadrilateralMeasurements"), false);

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

test("rotated ellipse representations canonicalize deterministically without mutating legacy inputs", () => {
  const representations = [
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.24, radiusY: 0.12, rotationDegrees: 30 },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.24, radiusY: 0.12, rotationDegrees: 210 },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.12, radiusY: 0.24, rotationDegrees: 120 },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.24, radiusY: 0.12, rotationDegrees: -150 },
  ];
  const inputs = representations.map((primitive) => [
    ...goldenCandidates(),
    rotatedEllipseCandidate(primitive),
  ]);
  const snapshots = structuredClone(inputs);
  const prepared = inputs.map((candidates) => prepare(candidates));

  assert.equal(new Set(prepared.map(({ candidateSetIdentity }) => candidateSetIdentity)).size, 1);
  assert.deepEqual(inputs, snapshots);
  assert.deepEqual(prepared[0].candidates[2].primitive, {
    kind: "ellipse",
    center: { x: 0.5, y: 0.5 },
    radiusX: 0.24,
    radiusY: 0.12,
    rotationDegrees: 30,
  });
  assert.deepEqual(
    { x: prepared[0].candidates[2].x, y: prepared[0].candidates[2].y,
      width: prepared[0].candidates[2].width, height: prepared[0].candidates[2].height },
    { x: 0.283666923472, y: 0.341254921336, width: 0.432666153056, height: 0.317490157328 },
  );

  const nearCircleInputs = [
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.2000000001, rotationDegrees: 73 },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.2000000001, radiusY: 0.2, rotationDegrees: -17 },
  ].map((primitive) => prepare([...goldenCandidates(), rotatedEllipseCandidate(primitive)]));
  assert.equal(nearCircleInputs[0].candidateSetIdentity, nearCircleInputs[1].candidateSetIdentity);
  assert.deepEqual(nearCircleInputs[0].candidates[2].primitive, {
    kind: "ellipse",
    center: { x: 0.5, y: 0.5 },
    radiusX: 0.2000000001,
    radiusY: 0.2,
  });

  const roundedWrap = [179.9999999999996, 0].map((rotationDegrees) => prepare([
    ...goldenCandidates(),
    rotatedEllipseCandidate({
      kind: "ellipse",
      center: { x: 0.5, y: 0.5 },
      radiusX: 0.24,
      radiusY: 0.12,
      rotationDegrees,
    }),
  ]));
  assert.equal(roundedWrap[0].candidateSetIdentity, roundedWrap[1].candidateSetIdentity);
  assert.equal(Object.hasOwn(roundedWrap[0].candidates[2].primitive, "rotationDegrees"), false);

  const legacyInput = mixedPrimitiveCandidates();
  const legacySnapshot = structuredClone(legacyInput);
  const legacyPrepared = prepare(legacyInput);
  assert.deepEqual(legacyInput, legacySnapshot);
  assert.deepEqual(legacyPrepared.candidates[4].primitive, legacyInput[4].primitive);
  assert.equal(legacyPrepared.candidateSetIdentity,
    "sha256:9631a04a5e62d1b7b29e20e1d14b8cdc32f0eb0e7b5f11131037c2cf8233716a");
});

test("ellipse validation allows visible clipped contours and fails closed for unstable or oversized geometry", () => {
  const invalid = [
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0, radiusY: 0.1, rotationDegrees: 30 },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 1e-10, radiusY: 0.1, rotationDegrees: 30 },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.1, rotationDegrees: Number.NaN },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.1, rotationDegrees: Number.POSITIVE_INFINITY },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 1.01, radiusY: 0.1, rotationDegrees: 45 },
    { kind: "ellipse", center: { x: 0.5, y: 0.5 }, radiusX: 1, radiusY: 1, rotationDegrees: 45 },
  ];
  for (const primitive of invalid) {
    assert.throws(
      () => prepare([...goldenCandidates(), rotatedEllipseCandidate(primitive)]),
      /ellipse/u,
    );
  }

  const halfWidth = Math.hypot(0.2 * Math.cos(Math.PI / 6), 0.1 * Math.sin(Math.PI / 6));
  const tolerated = prepare([
    ...goldenCandidates(),
    rotatedEllipseCandidate({
      kind: "ellipse",
      center: { x: halfWidth - 5e-13, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
      rotationDegrees: 30,
    }),
  ]);
  assert.equal(tolerated.candidates[2].x, 0);
  const clipped = prepare([
    ...goldenCandidates(),
    rotatedEllipseCandidate({
      kind: "ellipse",
      center: { x: halfWidth - 1e-8, y: 0.5 },
      radiusX: 0.2,
      radiusY: 0.1,
      rotationDegrees: 30,
    }),
  ]);
  assert.equal(clipped.candidates[2].x, 0);
  assert.equal(
    clipped.candidates[2].primitive.center.x,
    Number((halfWidth - 1e-8).toFixed(12)),
  );
});

test("off-frame ellipse contacts are omitted instead of escaping normalized relation output", () => {
  const ellipse = {
    kind: "ellipse",
    center: { x: 0.1, y: 0.5 },
    radiusX: 0.5,
    radiusY: 0.1,
    rotationDegrees: 45,
  };
  const parameter = 1.6580634875263138;
  const rotation = Math.PI / 4;
  const contact = {
    x: ellipse.center.x
      + (ellipse.radiusX * Math.cos(parameter) * Math.cos(rotation))
      - (ellipse.radiusY * Math.sin(parameter) * Math.sin(rotation)),
    y: ellipse.center.y
      + (ellipse.radiusX * Math.cos(parameter) * Math.sin(rotation))
      + (ellipse.radiusY * Math.sin(parameter) * Math.cos(rotation)),
  };
  const tangent = {
    x: (-ellipse.radiusX * Math.sin(parameter) * Math.cos(rotation))
      - (ellipse.radiusY * Math.cos(parameter) * Math.sin(rotation)),
    y: (-ellipse.radiusX * Math.sin(parameter) * Math.sin(rotation))
      + (ellipse.radiusY * Math.cos(parameter) * Math.cos(rotation)),
  };
  const pointAtY = (y) => {
    const scale = (y - contact.y) / tangent.y;
    return { x: contact.x + (scale * tangent.x), y };
  };
  const start = {
    x: 0,
    y: contact.y - (contact.x * tangent.y / tangent.x),
  };
  const end = pointAtY(1);
  assert.ok(contact.x < 0);
  assert.ok(start.y >= 0 && start.y <= 1);
  assert.ok(end.x >= 0 && end.x <= 1);

  const prepared = prepare([
    ...goldenCandidates(),
    rotatedEllipseCandidate(ellipse),
    lineGuide("off-frame-tangent", start, end),
  ]);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["rotated-ellipse", "off-frame-tangent"],
    sourcePixelWidth: 1000,
    sourcePixelHeight: 1000,
  });
  assert.deepEqual(confirmation.imagePlaneGuideAnalysis.relationships, []);
});

test("rotated ellipses classify line contacts deterministically in the confirmed image plane", () => {
  const angle = 30 * Math.PI / 180;
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const tangentContact = { x: 0.5 + (0.1 * normal.x), y: 0.5 + (0.1 * normal.y) };
  const tangentStart = { x: tangentContact.x - (0.3 * direction.x), y: tangentContact.y - (0.3 * direction.y) };
  const tangentEnd = { x: tangentContact.x + (0.3 * direction.x), y: tangentContact.y + (0.3 * direction.y) };
  const shift = (point, distance) => ({
    x: point.x + (distance * normal.x),
    y: point.y + (distance * normal.y),
  });
  const candidates = [
    ...goldenCandidates(),
    rotatedEllipseCandidate(),
    lineGuide("tangent", tangentStart, tangentEnd, "axis"),
    lineGuide("near-tangent", shift(tangentStart, 0.005), shift(tangentEnd, 0.005)),
    lineGuide("miss", shift(tangentStart, 0.05), shift(tangentEnd, 0.05)),
    lineGuide("horizontal-secant", { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }),
    lineGuide("vertical-secant", { x: 0.5, y: 0.2 }, { x: 0.5, y: 0.8 }),
    lineGuide("oblique-secant", { x: 0.5 - (0.3 * direction.x), y: 0.5 - (0.3 * direction.y) },
      { x: 0.5 + (0.3 * direction.x), y: 0.5 + (0.3 * direction.y) }),
    lineGuide("support-only-secant", { x: 0.05, y: 0.5 }, { x: 0.15, y: 0.5 }),
  ];
  const snapshot = structuredClone(candidates);
  const prepared = prepare(candidates);
  const guideIds = candidates.slice(2).map(({ id }) => id);
  const first = confirm(prepared, {
    confirmedVisualGuideCandidateIds: guideIds,
    sourcePixelHeight: 1000,
  });
  const second = confirm(prepared, {
    confirmedVisualGuideCandidateIds: guideIds,
    sourcePixelHeight: 1000,
  });
  const relationships = first.imagePlaneGuideAnalysis.relationships;
  const byLine = new Map(relationships.map((relationship) => [relationship.lineCandidateId, relationship]));

  assert.deepEqual(candidates, snapshot);
  assert.deepEqual(first.imagePlaneGuideAnalysis, second.imagePlaneGuideAnalysis);
  assert.equal(first.imagePlaneGuideAnalysis.limits.rotatedEllipseSupport,
    "explicit_normalized_image_plane_rotation");
  assert.equal(Object.hasOwn(first.imagePlaneGuideAnalysis.limits, "axisAlignedEllipseOnly"), false);
  assert.equal(byLine.has("miss"), false);
  assert.equal(byLine.get("tangent").contactCharacter, "tangent");
  assert.equal(byLine.get("tangent").intersectionPoints.length, 1);
  assert.equal(byLine.get("near-tangent").contactCharacter, "near_tangent");
  assert.ok(Math.abs(byLine.get("near-tangent").gapPixels - 5) <= 1e-9);
  for (const id of ["horizontal-secant", "vertical-secant", "oblique-secant", "support-only-secant"]) {
    assert.equal(byLine.get(id).classification, "intersection");
    assert.equal(byLine.get(id).intersectionPoints.length, 2);
    assert.deepEqual(
      byLine.get(id).intersectionPoints,
      [...byLine.get(id).intersectionPoints].sort((firstPoint, secondPoint) => (
        (firstPoint.x - secondPoint.x) || (firstPoint.y - secondPoint.y)
      )),
    );
  }
  assert.equal(byLine.get("support-only-secant").supportingLineContactWithinObservedSegment, false);
  assert.deepEqual(first.result.selectedCandidateIds, ["major", "minor"]);
  assert.equal(first.imagePlaneGuideAnalysis.confirmedVisualGuideCandidateIds.includes("rotated-ellipse"), true);
  assert.match(first.overlaySvg, /data-ellipse-orientation-degrees="30"/u);
  assert.match(first.overlaySvg, /transform="rotate\(30 500 500\)"/u);
});

test("rotated pixel shadow state stays outside the deterministic confirmation contract", () => {
  const prepared = prepare([
    ...goldenCandidates(),
    rotatedEllipseCandidate(),
    lineGuide("rotated-support", { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }),
  ]);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["rotated-ellipse", "rotated-support"],
    sourcePixelHeight: 1000,
  });

  assert.deepEqual(confirmation.result.selectedCandidateIds, ["major", "minor"]);
  assert.equal(confirmation.result.coreRun, true);
  assert.equal(confirmation.imagePlaneGuideAnalysis.imageBytesObservedByNorma, false);
  assert.equal(confirmation.imagePlaneGuideAnalysis.confirmedVisualGuideCandidateIds.includes(
    "rotated-ellipse",
  ), true);
  assert.doesNotMatch(
    JSON.stringify(confirmation),
    /pixelRefinement|proposalAdopted|rotatedEllipseSearch/u,
  );
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

test("support lines, format diagonals, and junction angles are opt-in constructions outside Core authority", () => {
  const prepared = prepare([
    ...ellipseLineRelationCandidates(),
    {
      id: "unconfirmed-oblique",
      label: "Oblique non confirmée",
      role: "structural-region",
      reason: "Candidat laissé hors de la sélection utilisateur",
      x: 0.1,
      y: 0.2,
      width: 0.8,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.1, y: 0.8 },
        end: { x: 0.9, y: 0.2 },
      },
    },
  ]);
  const confirmedVisualGuideCandidateIds = [
    "ellipse",
    "vertical-near-tangent",
    "oblique-tangent",
    "vertical-secant",
  ];
  const baseline = confirm(prepared, {
    confirmedVisualGuideCandidateIds,
    sourcePixelHeight: 1000,
  });
  const enabled = confirm(prepared, {
    confirmedVisualGuideCandidateIds,
    constructionLayers: ["junction-angles", "format-diagonals", "support-line-extensions"],
    sourcePixelHeight: 1000,
  });

  assert.equal(Object.hasOwn(baseline.imagePlaneGuideAnalysis, "constructionAnalysis"), false);
  assert.equal(enabled.result.contentIdentity, baseline.result.contentIdentity);
  assert.equal(enabled.acceptedGeometryContentIdentity, baseline.acceptedGeometryContentIdentity);
  assert.equal(enabled.mappingResultContentIdentity, baseline.mappingResultContentIdentity);
  assert.deepEqual(
    enabled.imagePlaneGuideAnalysis.relationships,
    baseline.imagePlaneGuideAnalysis.relationships,
  );
  assert.deepEqual(enabled.imagePlaneGuideAnalysis.quadrilateralMeasurements, undefined);

  const constructions = enabled.imagePlaneGuideAnalysis.constructionAnalysis;
  assert.ok(constructions);
  assert.deepEqual(constructions.enabledLayers, [
    "support-line-extensions",
    "format-diagonals",
    "junction-angles",
  ]);
  assert.equal(constructions.observedLines.length, 3);
  assert.equal(constructions.supportLineExtensions.length, 3);
  assert.equal(constructions.formatDiagonals.length, 2);
  assert.equal(constructions.relations.length, 6);
  assert.ok(constructions.junctionAngles.length > 0);
  assert.ok(constructions.junctionAngles.every(({ provenance, sourceTruth, coreAuthority }) => (
    provenance === "derived-measurement" && sourceTruth === false && coreAuthority === false
  )));
  assert.ok(constructions.observedLines.every(({ provenance, confirmation, coreAuthority }) => (
    provenance === "observed" && confirmation === "user-confirmed" && coreAuthority === false
  )));
  assert.ok(constructions.supportLineExtensions.every(({ provenance, clipping, coreAuthority }) => (
    provenance === "derived-construction"
      && clipping === "confirmed_frame_only"
      && coreAuthority === false
  )));
  assert.ok(constructions.formatDiagonals.every(({ provenance, sourceTruth }) => (
    provenance === "derived-construction" && sourceTruth === false
  )));
  assert.equal(constructions.coreRun, false);
  assert.match(enabled.overlaySvg, /data-construction-layer="support-line-extensions"/u);
  assert.match(enabled.overlaySvg, /data-construction-layer="format-diagonals"/u);
  assert.match(enabled.overlaySvg, /data-construction-layer="junction-angles"/u);
  assert.match(enabled.overlaySvg, /data-provenance="derived-measurement"/u);
  assert.match(enabled.overlaySvg, /data-provenance="derived-construction"/u);
  assert.match(enabled.overlaySvg, /data-candidate-shape data-provenance="observed"/u);
  const unconfirmedMarkup = enabled.overlaySvg.match(
    /<g data-candidate-id="unconfirmed-oblique"[\s\S]*?<\/g>/u,
  )?.[0];
  assert.ok(unconfirmedMarkup);
  assert.match(
    unconfirmedMarkup,
    /data-supporting-line[^>]+style="display:none"/u,
  );
});

test("an explicit prepared triangle stays off by default and cannot alter Core or prior plan-image reports", () => {
  const triangleGuides = [
    {
      id: "triangle-a",
      label: "Sommet A",
      role: "structural-region",
      reason: "Endpoint confirmé A",
      x: 0.2,
      y: 0.2,
      width: 0.1,
      height: 0.05,
      primitive: { kind: "segment", start: { x: 0.2, y: 0.2 }, end: { x: 0.3, y: 0.25 } },
    },
    {
      id: "triangle-b",
      label: "Sommet B",
      role: "structural-region",
      reason: "Endpoint confirmé B",
      x: 0.7,
      y: 0.2,
      width: 0.1,
      height: 0.05,
      primitive: { kind: "segment", start: { x: 0.8, y: 0.2 }, end: { x: 0.7, y: 0.25 } },
    },
    {
      id: "triangle-c",
      label: "Sommet C",
      role: "structural-region",
      reason: "Endpoint confirmé C",
      x: 0.2,
      y: 0.7,
      width: 0.1,
      height: 0.1,
      primitive: { kind: "axis", start: { x: 0.2, y: 0.8 }, end: { x: 0.3, y: 0.7 } },
    },
  ];
  const request = {
    requestId: "explicit-right-triangle",
    vertices: [
      { point: { x: 0.2, y: 0.2 }, parent: { kind: "observed-line-endpoint", candidateId: "triangle-a", endpoint: "start" } },
      { point: { x: 0.8, y: 0.2 }, parent: { kind: "observed-line-endpoint", candidateId: "triangle-b", endpoint: "start" } },
      { point: { x: 0.2, y: 0.8 }, parent: { kind: "observed-line-endpoint", candidateId: "triangle-c", endpoint: "start" } },
    ],
  };
  const prepared = prepare([...goldenCandidates(), ...triangleGuides], [request]);
  const confirmedVisualGuideCandidateIds = triangleGuides.map(({ id }) => id);
  assert.throws(
    () => confirm(prepared, {
      confirmedVisualGuideCandidateIds: confirmedVisualGuideCandidateIds.slice(1),
      constructionLayers: ["support-line-extensions", "triangles"],
      sourcePixelHeight: 1000,
    }),
    /parents must remain explicitly confirmed visual guides/u,
  );
  const baseline = confirm(prepared, { confirmedVisualGuideCandidateIds, sourcePixelHeight: 1000 });
  const enabled = confirm(prepared, {
    confirmedVisualGuideCandidateIds,
    constructionLayers: ["triangle-altitudes", "triangle-angle-bisectors", "triangle-centroids", "triangle-medians", "triangles", "support-line-extensions"],
    sourcePixelHeight: 1000,
  });

  assert.equal(Object.hasOwn(baseline.imagePlaneGuideAnalysis, "constructionAnalysis"), false);
  assert.equal(enabled.result.contentIdentity, baseline.result.contentIdentity);
  assert.equal(enabled.acceptedGeometryContentIdentity, baseline.acceptedGeometryContentIdentity);
  assert.equal(enabled.mappingResultContentIdentity, baseline.mappingResultContentIdentity);
  assert.deepEqual(enabled.imagePlaneGuideAnalysis.relationships, baseline.imagePlaneGuideAnalysis.relationships);
  assert.deepEqual(enabled.imagePlaneGuideAnalysis.quadrilateralMeasurements, baseline.imagePlaneGuideAnalysis.quadrilateralMeasurements);
  const constructions = enabled.imagePlaneGuideAnalysis.constructionAnalysis;
  assert.deepEqual(constructions.enabledLayers, [
    "support-line-extensions",
    "triangles",
    "triangle-medians",
    "triangle-angle-bisectors",
    "triangle-altitudes",
    "triangle-centroids",
  ]);
  assert.equal(constructions.triangles.length, 1);
  assert.equal(constructions.triangles[0].requestId, request.requestId);
  assert.equal(constructions.triangles[0].sourceTruth, false);
  assert.equal(constructions.triangles[0].coreAuthority, false);
  assert.equal(constructions.triangleMedians.length, 3);
  assert.deepEqual(
    constructions.triangleMedians.map(({ vertexIndex }) => vertexIndex),
    [0, 1, 2],
  );
  assert.ok(constructions.triangleMedians.every(({ sourceTruth, coreAuthority }) => (
    sourceTruth === false && coreAuthority === false
  )));
  assert.equal(constructions.triangleAngleBisectors.length, 3);
  assert.deepEqual(
    constructions.triangleAngleBisectors.map(({ vertexIndex }) => vertexIndex),
    [0, 1, 2],
  );
  assert.ok(constructions.triangleAngleBisectors.every(({ sourceTruth, coreAuthority }) => (
    sourceTruth === false && coreAuthority === false
  )));
  assert.equal(constructions.triangleAltitudes.length, 3);
  assert.deepEqual(
    constructions.triangleAltitudes.map(({ vertexIndex }) => vertexIndex),
    [0, 1, 2],
  );
  assert.ok(constructions.triangleAltitudes.every(({ sourceTruth, coreAuthority }) => (
    sourceTruth === false && coreAuthority === false
  )));
  assert.equal(constructions.triangleCentroids.length, 1);
  assert.equal(constructions.triangleCentroids[0].triangleId, constructions.triangles[0].triangleId);
  assert.equal(constructions.triangleCentroids[0].sourceTruth, false);
  assert.equal(constructions.triangleCentroids[0].coreAuthority, false);
  assert.match(enabled.overlaySvg, /data-construction-layer="triangles"/u);
  assert.match(enabled.overlaySvg, /data-triangle-construction-id=/u);
  assert.match(enabled.overlaySvg, /data-parent-provenance="user-confirmed-observed-endpoint"/u);
  assert.match(enabled.overlaySvg, /fill="#fb7185"/u);
  assert.match(enabled.overlaySvg, />T1\.O\d</u);
  assert.match(enabled.overlaySvg, /data-parent-kind="observed-line-endpoint"/u);
  assert.match(enabled.overlaySvg, /data-construction-layer="triangle-medians"/u);
  assert.match(enabled.overlaySvg, /data-triangle-median-id=/u);
  assert.match(enabled.overlaySvg, /data-construction-layer="triangle-angle-bisectors"/u);
  assert.match(enabled.overlaySvg, /data-triangle-angle-bisector-id=/u);
  assert.match(enabled.overlaySvg, /data-construction-layer="triangle-altitudes"/u);
  assert.match(enabled.overlaySvg, /data-triangle-altitude-id=/u);
  assert.match(enabled.overlaySvg, /data-construction-layer="triangle-centroids"/u);
  assert.match(enabled.overlaySvg, /data-triangle-centroid-id=/u);
  const centroidMarkup = enabled.overlaySvg.match(
    /<g data-triangle-centroid-id="[^"]+"[\s\S]*?<\/g>/u,
  )?.[0];
  assert.match(centroidMarkup, /data-candidate-evidence-only="true"/u);
  assert.match(centroidMarkup, /data-source-truth="false"/u);
  assert.match(centroidMarkup, /data-core-authority="false"/u);
  assert.equal(enabled.imagePlaneGuideAnalysis.constructionAnalysis.coreRun, false);
});

test("the trapezoid, strong-oblique, and ellipse-line regression keeps prior measurements unchanged", () => {
  const candidates = [
    ...quadrilateralCandidates({ includeEllipse: true }),
    {
      id: "trapezoid-oblique",
      label: "Oblique du trapèze",
      role: "structural-region",
      reason: "Segment oblique visible confirmé séparément du quadrilatère",
      x: 0.2,
      y: 0.2,
      width: 0.1,
      height: 0.6,
      primitive: {
        kind: "segment",
        start: { x: 0.2, y: 0.2 },
        end: { x: 0.3, y: 0.8 },
      },
    },
  ];
  const prepared = prepare(candidates);
  const confirmedVisualGuideCandidateIds = [
    "right-trapezoid",
    "quad-ellipse",
    "trapezoid-oblique",
  ];
  const baseline = confirm(prepared, {
    confirmedVisualGuideCandidateIds,
    sourcePixelHeight: 1000,
  });
  const enabled = confirm(prepared, {
    confirmedVisualGuideCandidateIds,
    constructionLayers: ["support-line-extensions", "format-diagonals", "junction-angles"],
    sourcePixelHeight: 1000,
  });

  assert.deepEqual(
    enabled.imagePlaneGuideAnalysis.quadrilateralMeasurements,
    baseline.imagePlaneGuideAnalysis.quadrilateralMeasurements,
  );
  assert.deepEqual(
    enabled.imagePlaneGuideAnalysis.relationships,
    baseline.imagePlaneGuideAnalysis.relationships,
  );
  const constructions = enabled.imagePlaneGuideAnalysis.constructionAnalysis;
  assert.equal(constructions.observedLines.length, 1);
  assert.equal(constructions.observedLines[0].candidateId, "trapezoid-oblique");
  assert.equal(constructions.supportLineExtensions[0].angleDegrees, 80.537677791974);
  assert.equal(constructions.formatDiagonals.length, 2);
  assert.ok(constructions.junctionAngles.some(({ firstParticipant, secondParticipant }) => (
    firstParticipant.sourceObservedLineId !== null
      || secondParticipant.sourceObservedLineId !== null
  )));
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

test("ellipse-line relationship ids change when confirmed geometry changes", () => {
  const originalCandidates = ellipseLineRelationCandidates();
  const adjustedCandidates = originalCandidates.map((candidate) => (
    candidate.id === "vertical-near-tangent"
      ? {
        ...candidate,
        x: 0.706,
        primitive: {
          ...candidate.primitive,
          start: { x: 0.706, y: 0.2 },
          end: { x: 0.706, y: 0.8 },
        },
      }
      : candidate
  ));
  const relationshipId = (candidateValues) => {
    const prepared = prepare(candidateValues);
    return confirm(prepared, {
      confirmedVisualGuideCandidateIds: ["ellipse", "vertical-near-tangent"],
      sourcePixelHeight: 1000,
    }).imagePlaneGuideAnalysis.relationships[0]?.relationshipId;
  };

  const originalRelationshipId = relationshipId(originalCandidates);
  assert.equal(originalRelationshipId, relationshipId(structuredClone(originalCandidates)));
  assert.notEqual(originalRelationshipId, relationshipId(adjustedCandidates));
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

  const squareInput = {
    composition: composition([
      { kind: "element", id: "half-square", geometry: { kind: "rect", x: 0, y: 0, width: 1 / 2, height: 1 / 2 } },
    ]),
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
  };
  const square = analyzeHarmonicRelationshipsV1(squareInput);
  const repeatedSquare = analyzeHarmonicRelationshipsV1(structuredClone(squareInput));
  const halfShareRelationships = square.relationships
    .filter((entry) => entry.ratio.ratioId === "1/2")
    .filter((entry) => entry.metric.endsWith("-share"));
  assert.equal(halfShareRelationships.length, 2);
  assert.deepEqual(
    halfShareRelationships.map((entry) => entry.metric).sort(),
    ["height-share", "width-share"],
  );
  assert.deepEqual(repeatedSquare.relationships, square.relationships);

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

test("declared length-pair analysis reuses declared packs without enumerating unrequested relationships", () => {
  const input = {
    measurements: [
      { measurementId: "measurement:short", length: 381.9660112501051 },
      { measurementId: "measurement:long", length: 618.0339887498949 },
    ],
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: 0.025,
  };
  const first = analyzeDeclaredLengthPairV1(input);
  const repeated = analyzeDeclaredLengthPairV1({
    ...structuredClone(input),
    measurements: [...structuredClone(input.measurements)].reverse(),
  });

  assert.equal(first.contractId, "norma.declared-length-pair-analysis@1");
  assert.equal(first.observedDominantShare, Number(GOLDEN_MAJOR.toFixed(12)));
  assert.equal(first.match?.ratio.ratioId, "phi-major");
  assert.equal(first.match?.quality, "exact");
  assert.equal(first.relationshipCount, 1);
  assert.equal(first.pairOnly, true);
  assert.equal(first.noUnrequestedComparisons, true);
  assert.deepEqual(repeated, first);
  assert.deepEqual(input.measurements, [
    { measurementId: "measurement:short", length: 381.9660112501051 },
    { measurementId: "measurement:long", length: 618.0339887498949 },
  ]);

  const tie = analyzeDeclaredLengthPairV1({
    measurements: [
      { measurementId: "measurement:z", length: 400 },
      { measurementId: "measurement:a", length: 400 },
    ],
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: 0.025,
  });
  assert.equal(tie.dominantMeasurementId, "measurement:a");
  assert.equal(tie.match?.ratio.ratioId, "1/2");

  const outsideTolerance = analyzeDeclaredLengthPairV1({
    measurements: [
      { measurementId: "measurement:45", length: 450 },
      { measurementId: "measurement:55", length: 550 },
    ],
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: 0.025,
  });
  assert.equal(outsideTolerance.match, null);
  assert.equal(outsideTolerance.relationshipCount, 0);
  const extremeShare = analyzeDeclaredLengthPairV1({
    measurements: [
      { measurementId: "measurement:tiny", length: 1e-9 },
      { measurementId: "measurement:large", length: 100_000 },
    ],
    ratioPacks: [GEOMETRY_HARMONIES_PACK, BASIC_PROPORTIONS_PACK],
    matchTolerance: 0.025,
  });
  assert.equal(extremeShare.observedDominantShare, 0.999999999999);
  assert.ok(extremeShare.observedDominantShare < 1);

  assert.throws(
    () => analyzeDeclaredLengthPairV1({ ...input, measurements: [input.measurements[0], input.measurements[0]] }),
    /distinct measurement identities/u,
  );
  assert.throws(
    () => analyzeDeclaredLengthPairV1({
      ...input,
      measurements: [{ measurementId: "measurement:zero", length: 0 }, input.measurements[1]],
    }),
    /positive finite lengths/u,
  );
  assert.throws(
    () => analyzeDeclaredLengthPairV1({
      ...input,
      measurements: [{ measurementId: "measurement:nonfinite", length: Number.NaN }, input.measurements[1]],
    }),
    /positive finite lengths/u,
  );
});

test("an explicit confirmed image-plane length pair produces one separate non-authoritative report", () => {
  const candidates = [
    ...goldenCandidates(),
    {
      id: "short-segment",
      label: "Segment court",
      role: "structural-region",
      reason: "Segment visible confirmé",
      x: 0.2,
      y: 0.5,
      width: 0.4,
      height: 0,
      primitive: {
        kind: "segment",
        start: { x: 0.2, y: 0.5 },
        end: { x: 0.6, y: 0.5 },
      },
    },
    quadrilateralCandidates()[2],
  ];
  const prepared = prepare(candidates);
  const measurementRatioRequest = {
    requestId: "declared-ratio:one",
    measurements: [
      { kind: "segment", candidateId: "short-segment" },
      { kind: "quadrilateral-side", candidateId: "right-trapezoid", sideIndex: 0 },
    ],
    ratioPackRefs: [
      "norma.geometry-harmonies@0.1.0",
      "norma.basic-proportions@0.1.0",
    ],
    matchTolerance: 0.025,
  };
  const requestSnapshot = structuredClone(measurementRatioRequest);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["short-segment", "right-trapezoid"],
    measurementRatioRequest,
    sourcePixelHeight: 1000,
  });
  const report = confirmation.declaredMeasurementRatioReport;

  assert.ok(report);
  assert.equal(report.requestId, "declared-ratio:one");
  assert.equal(report.measurements.length, 2);
  assert.deepEqual(report.measurements.map(({ lengthPixels }) => lengthPixels).sort((a, b) => a - b), [400, 600]);
  assert.equal(report.observedDominantShare, 0.6);
  assert.equal(report.match?.ratio.ratioId, "phi-major");
  assert.equal(report.candidateEvidenceOnly, true);
  assert.equal(report.sourceTruth, false);
  assert.equal(report.coreAuthority, false);
  assert.equal(report.originalGeometryUnchanged, true);
  assert.equal(report.noUnrequestedComparisons, true);
  assert.equal(confirmation.imagePlaneGuideAnalysis.limits.noHarmonicRatioClaim, true);
  const reversed = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["short-segment", "right-trapezoid"],
    measurementRatioRequest: {
      ...measurementRatioRequest,
      measurements: [...measurementRatioRequest.measurements].reverse(),
    },
    sourcePixelHeight: 1000,
  }).declaredMeasurementRatioReport;
  assert.deepEqual(reversed, report);
  assert.deepEqual(measurementRatioRequest, requestSnapshot);
  const diagonalReport = confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["short-segment", "right-trapezoid"],
    measurementRatioRequest: {
      ...measurementRatioRequest,
      requestId: "declared-ratio:diagonal",
      measurements: [
        measurementRatioRequest.measurements[0],
        { kind: "quadrilateral-diagonal", candidateId: "right-trapezoid", diagonalIndex: 0 },
      ],
    },
    sourcePixelHeight: 1000,
  }).declaredMeasurementRatioReport;
  assert.ok(diagonalReport);
  assert.equal(
    diagonalReport.measurements.some(({ reference }) => reference.kind === "quadrilateral-diagonal"),
    true,
  );
  assert.equal(Object.hasOwn(confirm(prepared, {
    confirmedVisualGuideCandidateIds: ["short-segment", "right-trapezoid"],
    sourcePixelHeight: 1000,
  }), "declaredMeasurementRatioReport"), false);

  assert.throws(
    () => confirm(prepared, {
      confirmedVisualGuideCandidateIds: ["short-segment", "right-trapezoid"],
      measurementRatioRequest: {
        ...measurementRatioRequest,
        requestId: 42,
      },
      sourcePixelHeight: 1000,
    }),
    /requestId must be a safe bounded id/u,
  );
  assert.throws(
    () => confirm(prepared, {
      confirmedVisualGuideCandidateIds: ["right-trapezoid"],
      measurementRatioRequest,
      sourcePixelHeight: 1000,
    }),
    /confirmed visual guide/u,
  );
  assert.throws(
    () => confirm(prepared, {
      confirmedVisualGuideCandidateIds: ["short-segment", "right-trapezoid"],
      measurementRatioRequest: {
        ...measurementRatioRequest,
        measurements: [
          measurementRatioRequest.measurements[0],
          { kind: "quadrilateral-diagonal", candidateId: "missing", diagonalIndex: 0 },
        ],
      },
      sourcePixelHeight: 1000,
    }),
    /missing or stale/u,
  );
  assert.throws(
    () => confirm(prepared, {
      confirmedVisualGuideCandidateIds: ["short-segment", "right-trapezoid"],
      measurementRatioRequest: {
        ...measurementRatioRequest,
        measurements: [
          measurementRatioRequest.measurements[0],
          { kind: "segment", candidateId: "right-trapezoid" },
        ],
      },
      sourcePixelHeight: 1000,
    }),
    /does not match candidate geometry/u,
  );
});

test("a confirmed direct segment pair produces one deterministic measurement-only receipt", () => {
  const segments = [
    lineGuide("segment-a", { x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }),
    lineGuide("segment-b", { x: 0.3, y: 0.1 }, { x: 0.3, y: 0.9 }),
  ];
  const prepared = prepare([...goldenCandidates(), ...segments]);
  const input = {
    preparedCandidateSet: prepared,
    expectedCandidateSetIdentity: prepared.candidateSetIdentity,
    confirmedVisualGuideCandidateIds: ["segment-a", "segment-b"],
    measurementRatioRequest: {
      requestId: "declared-ratio:direct-segment-pair",
      measurements: [
        { kind: "segment", candidateId: "segment-a" },
        { kind: "segment", candidateId: "segment-b" },
      ],
      ratioPackRefs: [
        "norma.geometry-harmonies@0.1.0",
        "norma.basic-proportions@0.1.0",
      ],
      matchTolerance: 0.025,
    },
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 500,
  };

  const first = confirmPersonalVisualHarmonyMeasurementPairV1(input);
  const second = confirmPersonalVisualHarmonyMeasurementPairV1(structuredClone(input));

  assert.deepEqual(second, first);
  assert.equal(first.contractId, "norma.personal-visual-harmony-measurement-pair-confirmation@1");
  assert.equal(first.status, "completed");
  assert.deepEqual(first.confirmedVisualGuideCandidateIds, ["segment-a", "segment-b"]);
  assert.deepEqual(first.report.measurements.map(({ lengthPixels }) => lengthPixels), [800, 400]);
  assert.equal(first.report.observedDominantShare, 0.666666666667);
  assert.equal(first.report.match?.ratio.ratioId, "2/3");
  assert.equal(first.explicitConfirmation, true);
  assert.equal(first.confirmationMode, "client_asserted_widget_interaction");
  assert.equal(first.providerCalls, 0);
  assert.equal(first.coreAuthority, false);
  assert.equal(first.coreRun, false);
  assert.equal(first.coreExecutionCount, 0);
  assert.match(first.confirmationIdentity, /^sha256:[0-9a-f]{64}$/u);

  const manualPrepared = preparePersonalVisualHarmonyManualCandidateSetV1({
    sourceImageContentIdentity: `sha256:${"a".repeat(64)}`,
    sourceImageMediaType: "image/png",
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 500,
    perceptionReceiptIdentity: `sha256:${"b".repeat(64)}`,
    candidates: segments,
  });
  const manualConfirmation = confirmPersonalVisualHarmonyMeasurementPairV1({
    ...input,
    preparedCandidateSet: manualPrepared,
    expectedCandidateSetIdentity: manualPrepared.candidateSetIdentity,
  });
  assert.equal(
    manualConfirmation.confirmationMode,
    "client_asserted_private_web_lab_interaction",
  );

  assert.throws(() => confirmPersonalVisualHarmonyMeasurementPairV1({
    ...input,
    preparedCandidateSet: manualPrepared,
    expectedCandidateSetIdentity: manualPrepared.candidateSetIdentity,
    sourcePixelWidth: input.sourcePixelWidth + 1,
  }), /Manual candidate set source dimensions do not match the prepared review/u);

  assert.throws(() => confirmPersonalVisualHarmonyMeasurementPairV1({
    ...input,
    confirmedVisualGuideCandidateIds: ["segment-a"],
  }), /exactly two confirmed segment candidates/u);
  assert.throws(() => confirmPersonalVisualHarmonyMeasurementPairV1({
    ...input,
    measurementRatioRequest: {
      ...input.measurementRatioRequest,
      measurements: [
        { kind: "segment", candidateId: "segment-a" },
        { kind: "axis", candidateId: "segment-b" },
      ],
    },
  }), /direct segment references/u);
});

test("two confirmed axes produce an explicit non-authoritative length report without geometry conversion", () => {
  const axes = [
    {
      id: "horizontal-axis",
      label: "Axe horizontal principal",
      role: "structural-region",
      reason: "Axe visible confirmé",
      x: 0.1,
      y: 0.4,
      width: 0.8,
      height: 0,
      primitive: {
        kind: "axis",
        start: { x: 0.1, y: 0.4 },
        end: { x: 0.9, y: 0.4 },
      },
    },
    {
      id: "vertical-axis",
      label: "Axe vertical principal",
      role: "structural-region",
      reason: "Axe visible confirmé",
      x: 0.3,
      y: 0.1,
      width: 0,
      height: 0.8,
      primitive: {
        kind: "axis",
        start: { x: 0.3, y: 0.1 },
        end: { x: 0.3, y: 0.9 },
      },
    },
  ];
  const prepared = prepare([...goldenCandidates(), ...axes]);
  const confirmation = confirm(prepared, {
    confirmedVisualGuideCandidateIds: axes.map(({ id }) => id),
    measurementRatioRequest: {
      requestId: "declared-ratio:axes",
      measurements: axes.map(({ id }) => ({ kind: "axis", candidateId: id })),
      ratioPackRefs: [
        "norma.geometry-harmonies@0.1.0",
        "norma.basic-proportions@0.1.0",
      ],
      matchTolerance: 0.025,
    },
    sourcePixelWidth: 1_000,
    sourcePixelHeight: 500,
  });
  const report = confirmation.declaredMeasurementRatioReport;

  assert.ok(report);
  assert.deepEqual(
    report.measurements.map(({ reference }) => reference),
    [
      { kind: "axis", candidateId: "horizontal-axis" },
      { kind: "axis", candidateId: "vertical-axis" },
    ],
  );
  assert.deepEqual(
    report.measurements.map(({ lengthPixels }) => lengthPixels),
    [800, 400],
  );
  assert.equal(report.observedDominantShare, 0.666666666667);
  assert.equal(report.match?.ratio.ratioId, "2/3");
  assert.equal(report.coreAuthority, false);
  assert.equal(report.originalGeometryUnchanged, true);
  assert.deepEqual(
    prepared.candidates.filter(({ id }) => axes.some((axis) => axis.id === id)).map(({ primitive }) => primitive.kind),
    ["axis", "axis"],
  );
});

test("overlay is transparent, image-aligned, and escapes model-provided labels", () => {
  const prepared = prepare([
    {
      ...goldenCandidates()[0],
      id: "safe",
      label: '<script data-test="unsafe">alert(\'1\') & more</script>',
    },
  ]);
  const svg = createPersonalVisualHarmonyOverlaySvgV1({ preparedCandidateSet: prepared });

  assert.match(svg, /^<svg/u);
  assert.match(svg, /viewBox="0 0 1000 1000"/u);
  assert.match(svg, /<g data-candidate-id="safe" data-primitive-kind="rectangle" tabindex="0" role="group" aria-label="Ajuster &lt;script data-test=&quot;unsafe&quot;&gt;alert\(&#39;1&#39;\) &amp; more&lt;\/script&gt;"\s*>/u);
  assert.match(svg, /data-candidate-box/u);
  assert.match(svg, /data-resize-handle/u);
  assert.match(svg, /&lt;script data-test=&quot;unsafe&quot;&gt;alert\(&#39;1&#39;\) &amp; more&lt;\/script&gt;/u);
  assert.doesNotMatch(svg, /<script>/u);
  assert.doesNotMatch(svg, /file-private-demo-123/u);
  assert.doesNotMatch(svg, /<image\b/u);
});

test("overlay separates dense candidate labels deterministically", () => {
  const denseRectangles = Array.from({ length: 7 }, (_, index) => ({
    id: `dense-${index + 1}`,
    label: `Guide structurel dense ${index + 1}`,
    role: "structural-region",
    reason: "Régression de lisibilité pour des guides proches.",
    x: 0.54 + ((index % 2) * 0.04),
    y: 0.18 + (Math.floor(index / 2) * 0.04),
    width: 0.2,
    height: 0.2,
  }));
  const observedLine = (id, label, start, end) => ({ ...lineGuide(id, start, end), label });
  const mixedGuides = [
    {
      id: "large-frame",
      label: "Grand cadre rouge gauche",
      role: "structural-region",
      reason: "Cadre visible.",
      x: 0,
      y: 0,
      width: 0.544,
      height: 0.543,
    },
    {
      id: "small-frame",
      label: "Module rectangulaire supérieur",
      role: "structural-region",
      reason: "Cadre visible.",
      x: 0.544,
      y: 0,
      width: 0.126,
      height: 0.127,
    },
    observedLine("vertical", "Grande séparation verticale", { x: 0.544, y: 0 }, { x: 0.544, y: 0.543 }),
    observedLine("lower", "Grande ligne horizontale basse", { x: 0, y: 0.543 }, { x: 1, y: 0.543 }),
    observedLine("right", "Séparation horizontale droite", { x: 0.544, y: 0.207 }, { x: 1, y: 0.207 }),
    observedLine("inner-v", "Séparation verticale interne", { x: 0.67, y: 0 }, { x: 0.67, y: 0.207 }),
    observedLine("inner-h", "Séparation horizontale interne", { x: 0.544, y: 0.127 }, { x: 0.67, y: 0.127 }),
  ];

  for (const candidates of [denseRectangles, mixedGuides]) {
    const layoutInput = {
      labels: candidates.map((candidate, index) => ({
        candidateId: candidate.id,
        preferredX: (candidate.x * 1000) + 8,
        preferredY: (candidate.y * 1000) + 8,
        width: 120 + (index * 20),
      })),
    };
    assert.deepEqual(
      layoutPersonalVisualHarmonyCandidateLabelsV1(layoutInput),
      layoutPersonalVisualHarmonyCandidateLabelsV1(layoutInput),
    );
    const prepared = prepare(candidates);
    const first = createPersonalVisualHarmonyOverlaySvgV1({ preparedCandidateSet: prepared });
    const second = createPersonalVisualHarmonyOverlaySvgV1({ preparedCandidateSet: prepared });
    const badges = [...first.matchAll(
      /<rect data-candidate-badge[^>]* x="([^"]+)" y="([^"]+)" width="([^"]+)" height="38"/gu,
    )].map((match) => ({
      x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: 38,
    }));
    const handles = [
      ...[...first.matchAll(
        /<rect data-resize-handle x="([^"]+)" y="([^"]+)" width="32" height="32"/gu,
      )].map((match) => ({
        x: Number(match[1]), y: Number(match[2]), width: 32, height: 32,
      })),
      ...[...first.matchAll(
        /<circle data-point-handle="[^"]+" tabindex="0" cx="([^"]+)" cy="([^"]+)" r="15"/gu,
      )].map((match) => ({
        x: Number(match[1]) - 15, y: Number(match[2]) - 15, width: 30, height: 30,
      })),
    ];

    assert.equal(first, second);
    assert.equal(badges.length, candidates.length);
    if (candidates === mixedGuides) assert.ok(Math.max(...badges.map((badge) => badge.width)) > 360);
    for (const [index, badge] of badges.entries()) {
      assert.ok(badge.x >= 8 && badge.x + badge.width <= 992);
      assert.ok(badge.y >= 8 && badge.y + badge.height <= 922);
      for (const previous of [...badges.slice(0, index), ...handles]) {
        const overlaps = badge.x < previous.x + previous.width + 8
          && badge.x + badge.width + 8 > previous.x
          && badge.y < previous.y + previous.height + 8
          && badge.y + badge.height + 8 > previous.y;
        assert.equal(overlaps, false);
      }
    }
  }
});
