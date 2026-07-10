import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  computeAcceptedGeometryContentIdentity,
  computeAcceptedGeometryRevisionContentIdentity,
} from "../dist/src/geometry-observation.js";

import {
  createControlledLocalLiveVisualCandidateCaptureV1,
  createControlledLocalLiveVisualCandidateResumeV1,
  createControlledLiveProviderCandidateRequestBodyV1,
  finalizeLocalVisualHumanCandidateSelectionIdentityV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-demo.js";
import {
  computeLocalVisualCandidateObservationContentIdentityV1,
  computeLocalVisualHumanCandidateSelectionContentIdentityV1,
  computeLocalVisualProviderExecutionReceiptContentIdentityV1,
  createAcceptedGeometryFromLocalVisualHumanSelectionV1,
  decodeValidatedLocalVisualImageDimensionsV1,
  sha256ContentIdentityV1,
  validateLocalVisualCandidateObservationEnvelopeV1,
  validateLocalVisualHumanCandidateSelectionV1,
  validateLocalVisualProviderExecutionReceiptV1,
  validateExactLocalVisualCandidateAcceptanceV1,
} from "../dist/src/local-report/controlled-local-live-visual-candidate-observation-contracts.js";

const ACCEPTED_AT = "2026-07-10T12:34:56.000Z";

test("PR129 candidate request uses official Responses text.format strict schema without persistence", () => {
  const request = createControlledLiveProviderCandidateRequestBodyV1({
    model: "configured-model-value",
    imageDataUrl: "data:image/png;base64,AA==",
  });

  assert.equal(request.store, false);
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.name, "controlled_rectangle_candidates");
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.schema.additionalProperties, false);
  assert.deepEqual(request.text.format.schema.required, ["schemaVersion", "rectangles"]);
  assert.equal(request.text.format.schema.properties.rectangles.items.additionalProperties, false);
});

test("PR129 hashes exact response bytes before parsing and stops capture at selection_required", () => {
  const imageBytes = pngBytes(1000, 800);
  const rawResponseBytes = providerResponseBytes([
    { x: 0.1, y: 0.15, width: 0.2, height: 0.25, providerConfidence: 0.91 },
    { x: 0.55, y: 0.5, width: 0.3, height: 0.35, providerConfidence: null },
  ]);
  const capture = createCapture({ imageBytes, rawProviderResponseBytes: rawResponseBytes });

  assert.equal(capture.status, "selection_required");
  assert.equal(capture.acceptedGeometryProduced, false);
  assert.equal(capture.coreInputProduced, false);
  assert.equal(capture.structuredAnalyzeRun, false);
  assert.equal(capture.resultJsonProduced, false);
  assert.deepEqual(capture.persistedArtifactNames, [
    "provider-execution-receipt.json",
    "candidate-observation.json",
  ]);
  assert.equal(
    capture.providerExecutionReceipt.providerResponseContentIdentity,
    sha256ContentIdentityV1(rawResponseBytes),
  );
  assert.equal(
    capture.providerExecutionReceipt.executionReceiptContentIdentity,
    computeLocalVisualProviderExecutionReceiptContentIdentityV1(
      capture.providerExecutionReceipt,
    ),
  );
  assert.equal(
    capture.providerObservationContract.observationId,
    `controlled-provider-observation:v2:${capture.providerExecutionReceipt.executionReceiptContentIdentity.slice("sha256:".length)}`,
  );
  assert.equal(
    capture.candidateArtifactProof.providerExecutionReceiptContentIdentity,
    capture.providerExecutionReceipt.executionReceiptContentIdentity,
  );
  assert.equal(capture.candidateObservationEnvelope.coordinateFrame.sourcePixelWidth, 1000);
  assert.equal(capture.candidateObservationEnvelope.coordinateFrame.sourcePixelHeight, 800);
  assert.equal(capture.candidateObservationEnvelope.rectangleCandidates[0].candidateId, "candidate:0");
  assert.deepEqual(capture.candidateObservationEnvelope.rectangleCandidates[0].diagnosticMetadata, {
    providerConfidence: 0.91,
  });
  assert.equal("diagnosticMetadata" in capture.candidateObservationEnvelope.rectangleCandidates[1], false);
  assert.equal(
    capture.candidateObservationEnvelope.observationContentIdentity,
    computeLocalVisualCandidateObservationContentIdentityV1(
      capture.candidateObservationEnvelope,
    ),
  );
});

test("PR129 same image and different exact response bytes produce distinct execution chains", () => {
  const imageBytes = pngBytes(32, 24);
  const first = createCapture({
    imageBytes,
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2, providerConfidence: null },
    ]),
  });
  const second = createCapture({
    imageBytes,
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2, providerConfidence: 0.5 },
    ]),
  });

  assert.equal(first.providerExecutionReceipt.sourceImageContentIdentity, second.providerExecutionReceipt.sourceImageContentIdentity);
  assert.notEqual(first.providerExecutionReceipt.providerResponseContentIdentity, second.providerExecutionReceipt.providerResponseContentIdentity);
  assert.notEqual(first.providerExecutionReceipt.executionReceiptContentIdentity, second.providerExecutionReceipt.executionReceiptContentIdentity);
  assert.notEqual(first.providerObservationContract.observationId, second.providerObservationContract.observationId);
  assert.notEqual(first.candidateObservationEnvelope.observationContentIdentity, second.candidateObservationEnvelope.observationContentIdentity);
});

test("PR129 provider wrapper and structured rectangle schema terminate inside the adapter", () => {
  const rawProviderResponse = JSON.parse(new TextDecoder().decode(providerResponseBytes([
    { x: 0.2, y: 0.3, width: 0.4, height: 0.2, providerConfidence: 0.7 },
  ], { responseId: "FAKE_PROVIDER_REQUEST_ID", model: "FAKE_EXACT_MODEL" })));
  rawProviderResponse.output.unshift({
    id: "FAKE_REASONING_ITEM_ID",
    type: "reasoning",
    summary: [],
  });
  const capture = createCapture({
    rawProviderResponseBytes: new TextEncoder().encode(JSON.stringify(rawProviderResponse)),
  });
  const persisted = JSON.stringify({
    receipt: capture.providerExecutionReceipt,
    candidate: capture.candidateObservationEnvelope,
  });

  assert.doesNotMatch(persisted, /FAKE_PROVIDER_REQUEST_ID|FAKE_REASONING_ITEM_ID|FAKE_EXACT_MODEL|output_text|message|annotations/u);
  assert.equal("providerConfidence" in capture.candidateObservationEnvelope.rectangleCandidates[0], false);
  assert.equal("confidenceAuthority" in capture.candidateObservationEnvelope.authority, false);
  assert.equal(capture.candidateObservationEnvelope.authority.providerEvidenceOnly, true);
});

test("PR129 rejects malformed provider status/schema and invalid rectangle bounds", () => {
  const valid = JSON.parse(new TextDecoder().decode(providerResponseBytes([
    { x: 0.2, y: 0.3, width: 0.4, height: 0.2, providerConfidence: null },
  ])));
  assert.throws(
    () => createCapture({ rawProviderResponseBytes: new TextEncoder().encode(JSON.stringify({ ...valid, status: "incomplete" })) }),
    /MalformedProviderStatus/u,
  );
  const output = JSON.parse(valid.output[0].content[0].text);
  output.extra = true;
  valid.output[0].content[0].text = JSON.stringify(output);
  assert.throws(
    () => createCapture({ rawProviderResponseBytes: new TextEncoder().encode(JSON.stringify(valid)) }),
    /MalformedProviderSchema/u,
  );
  assert.throws(
    () => createCapture({
      rawProviderResponseBytes: providerResponseBytes([
        { x: 0.9, y: 0.1, width: 0.2, height: 0.2, providerConfidence: null },
      ]),
    }),
    /rectangle exceeds bounds/u,
  );
  assert.throws(
    () => createCapture({
      rawProviderResponseBytes: providerResponseBytes([
        { x: Number.NaN, y: 0.1, width: 0.2, height: 0.2, providerConfidence: null },
      ]),
    }),
    /MalformedProviderSchema/u,
  );
});

test("PR129 decodes PNG JPEG and WebP dimensions from bytes rather than filenames/provider output", () => {
  assert.deepEqual(decodeValidatedLocalVisualImageDimensionsV1(pngBytes(321, 123), "image/png"), {
    sourcePixelWidth: 321,
    sourcePixelHeight: 123,
  });
  assert.deepEqual(decodeValidatedLocalVisualImageDimensionsV1(jpegBytes(640, 480), "image/jpeg"), {
    sourcePixelWidth: 640,
    sourcePixelHeight: 480,
  });
  assert.deepEqual(decodeValidatedLocalVisualImageDimensionsV1(webpVp8xBytes(77, 55), "image/webp"), {
    sourcePixelWidth: 77,
    sourcePixelHeight: 55,
  });
  assert.deepEqual(decodeValidatedLocalVisualImageDimensionsV1(webpVp8Bytes(91, 67), "image/webp"), {
    sourcePixelWidth: 91,
    sourcePixelHeight: 67,
  });
  assert.deepEqual(decodeValidatedLocalVisualImageDimensionsV1(webpVp8lBytes(43, 29), "image/webp"), {
    sourcePixelWidth: 43,
    sourcePixelHeight: 29,
  });
  assert.throws(
    () => decodeValidatedLocalVisualImageDimensionsV1(pngBytes(1, 1), "image/jpeg"),
    /JPEG SOI/u,
  );

  for (const { bytes, minimumChunkSize } of [
    { bytes: webpVp8xBytes(77, 55), minimumChunkSize: 10 },
    { bytes: webpVp8Bytes(91, 67), minimumChunkSize: 10 },
    { bytes: webpVp8lBytes(43, 29), minimumChunkSize: 5 },
  ]) {
    for (const declaredChunkSize of [0, minimumChunkSize - 1]) {
      const malformed = bytes.slice();
      setUint32Le(malformed, 16, declaredChunkSize);
      assert.throws(
        () => decodeValidatedLocalVisualImageDimensionsV1(malformed, "image/webp"),
        /WebP/u,
      );
    }
    assert.throws(
      () => decodeValidatedLocalVisualImageDimensionsV1(bytes.slice(0, -1), "image/webp"),
      /complete WebP RIFF/u,
    );
  }
});

test("PR129 separate exact human selection produces one- and multi-rectangle canonical results", () => {
  const capture = createCapture({
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.1, y: 0.15, width: 0.2, height: 0.25, providerConfidence: 0.95 },
      { x: 0.55, y: 0.5, width: 0.3, height: 0.35, providerConfidence: 0.01 },
    ]),
  });
  const one = createResume(capture, [0]);
  const multiple = createResume(capture, [0, 1]);

  for (const resume of [one, multiple]) {
    assert.equal(resume.status, "completed");
    assert.equal(resume.acceptedGeometry.correctionHistory.length, 0);
    assert.equal(resume.acceptedGeometry.primitives.every(({ confidence }) => confidence === null), true);
    assert.equal(resume.execution.handoff.acceptanceProofCompletedBeforeMapping, true);
    assert.equal(resume.execution.handoff.mappingBoundary, "explicit-external-evidence-acceptance@1");
    assert.equal(resume.execution.handoff.externalEvidenceCoreInputAuthority, "acceptedStructuredGeometry");
    assert.equal(resume.execution.handoff.acceptedStructuredGeometryIsOnlyExternalEvidenceDerivedCoreInput, true);
    assert.equal("acceptedStructuredGeometryOnlyCoreInput" in resume.execution.handoff, false);
    assert.equal(resume.execution.handoff.deterministicLocalComparisonDerived, true);
    assert.equal(resume.execution.handoff.deterministicLocalComparisonAuthoritative, false);
    assert.equal(resume.execution.handoff.deterministicLocalComparisonProviderInfluenced, false);
    assert.equal(resume.execution.handoff.normalizedMetricToleranceOmitted, true);
    assert.equal(resume.artifacts["result.json"].endsWith("\n"), true);
    assert.equal(
      `sha256:${createHash("sha256").update(resume.artifacts["result.json"]).digest("hex")}`,
      resume.execution.handoff.canonicalResultJsonContentIdentity,
    );
    for (const artifact of [
      "local-result-evidence.json",
      "canonical-result-proof.json",
      "derived-artifacts.json",
    ]) {
      const value = JSON.parse(resume.artifacts[artifact]);
      for (const [field, expected] of Object.entries(resume.trace)) {
        assert.equal(value[field], expected, `${artifact}:${field}`);
      }
    }
    for (const artifact of ["summary.json", "summary.md"]) {
      for (const expected of Object.values(resume.trace)) {
        assert.match(resume.artifacts[artifact], new RegExp(escapeRegExp(expected), "u"), artifact);
      }
    }
    const encodedTrace = encodeUtf8Hex(JSON.stringify(resume.trace));
    assert.match(
      resume.artifacts["visual.svg"],
      new RegExp(`<metadata id="norma-candidate-trace" data-encoding="utf8-hex">${encodedTrace}</metadata>`, "u"),
    );
    assert.match(
      resume.artifacts["report.html"],
      new RegExp(`<template id="norma-candidate-trace" data-encoding="utf8-hex">${encodedTrace}</template>`, "u"),
    );
    assert.doesNotMatch(resume.artifacts["report.html"], /<script[^>]*norma-candidate-trace/iu);
  }
  assert.equal(one.acceptedGeometry.primitives.length, 1);
  assert.equal(one.execution.handoff.evaluationProfileOverlapPenaltyIncluded, false);
  assert.equal(multiple.acceptedGeometry.primitives.length, 2);
  assert.equal(multiple.execution.handoff.evaluationProfileOverlapPenaltyIncluded, true);
});

test("PR129 provider confidence cannot influence accepted coordinates or computational result", () => {
  const rectangles = [
    { x: 0.2, y: 0.25, width: 0.3, height: 0.35, providerConfidence: 0.01 },
  ];
  const low = createResume(createCapture({ rawProviderResponseBytes: providerResponseBytes(rectangles) }), [0]);
  const high = createResume(createCapture({
    rawProviderResponseBytes: providerResponseBytes([
      { ...rectangles[0], providerConfidence: 0.99 },
    ]),
  }), [0]);

  assert.deepEqual(
    low.acceptedGeometry.primitives.map(rectangleProjection),
    high.acceptedGeometry.primitives.map(rectangleProjection),
  );
  assert.equal(
    low.execution.handoff.structuredAnalyzeComputationalContentIdentity,
    high.execution.handoff.structuredAnalyzeComputationalContentIdentity,
  );
  assert.equal(
    low.execution.handoff.acceptedGeometryAlignmentComponentValue,
    high.execution.handoff.acceptedGeometryAlignmentComponentValue,
  );
  assert.equal(low.execution.handoff.evaluationProfileProviderInfluenced, false);
  assert.equal(high.execution.handoff.evaluationProfileProviderInfluenced, false);
});

test("PR129 resume validates the exact human selection before cloning", () => {
  const capture = createCapture();
  const resume = (humanCandidateSelection) => createControlledLocalLiveVisualCandidateResumeV1({
    providerExecutionReceipt: capture.providerExecutionReceipt,
    candidateObservationEnvelope: capture.candidateObservationEnvelope,
    humanCandidateSelection,
    acceptedAt: ACCEPTED_AT,
  });

  const accessorSelection = createSelection(capture, [0]);
  let accessorReads = 0;
  Object.defineProperty(accessorSelection, "selectionId", {
    configurable: true,
    enumerable: true,
    get() {
      accessorReads += 1;
      return "human-selection:local:1";
    },
  });
  assert.throws(() => resume(accessorSelection), /InvalidHumanSelection/u);
  assert.equal(accessorReads, 0);

  const hiddenSelection = createSelection(capture, [0]);
  Object.defineProperty(hiddenSelection, "hiddenSecret", {
    enumerable: false,
    value: "must-not-be-dropped",
  });
  assert.throws(() => resume(hiddenSelection), /InvalidHumanSelection/u);

  const symbolSelection = createSelection(capture, [0]);
  symbolSelection[Symbol("hidden")] = "must-not-be-dropped";
  assert.throws(() => resume(symbolSelection), /InvalidHumanSelection/u);

  const sparseSelection = createSelection(capture, [0]);
  sparseSelection.selections = new Array(1);
  assert.throws(() => resume(sparseSelection), /InvalidHumanSelection/u);

  let proxyTraps = 0;
  const proxiedSelection = new Proxy(createSelection(capture, [0]), {
    getPrototypeOf(target) {
      proxyTraps += 1;
      return Reflect.getPrototypeOf(target);
    },
  });
  assert.throws(() => resume(proxiedSelection), /InvalidHumanSelection/u);
  assert.equal(proxyTraps, 0);
});

test("PR129 rejects cross-execution and human selection identity/order mismatches", () => {
  const first = createCapture({
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2, providerConfidence: null },
      { x: 0.5, y: 0.5, width: 0.2, height: 0.2, providerConfidence: null },
    ]),
  });
  const second = createCapture({
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.11, y: 0.1, width: 0.2, height: 0.2, providerConfidence: null },
    ]),
  });
  const selection = createSelection(first, [0]);
  assert.throws(
    () => createControlledLocalLiveVisualCandidateResumeV1({
      providerExecutionReceipt: second.providerExecutionReceipt,
      candidateObservationEnvelope: first.candidateObservationEnvelope,
      humanCandidateSelection: selection,
      acceptedAt: ACCEPTED_AT,
    }),
    /CandidateEvidenceMismatch/u,
  );

  const reversed = createSelection(first, [1, 0]);
  assert.throws(
    () => validateLocalVisualHumanCandidateSelectionV1(first.candidateObservationEnvelope, reversed),
    /preserve candidate order/u,
  );
  const wrongActor = finalizeLocalVisualHumanCandidateSelectionIdentityV1({
    ...selection,
    acceptanceActor: { actorClass: "system", actorId: "local-human:1" },
  });
  assert.throws(
    () => validateLocalVisualHumanCandidateSelectionV1(first.candidateObservationEnvelope, wrongActor),
    /actorClass/u,
  );

  const acceptedFromCandidateA = createAcceptedGeometryFromLocalVisualHumanSelectionV1({
    candidateObservationEnvelope: first.candidateObservationEnvelope,
    humanCandidateSelection: selection,
    acceptedAt: ACCEPTED_AT,
  });
  const candidateB = first.candidateObservationEnvelope.rectangleCandidates[1];
  const geometryBProjection = {
    ...structuredClone(acceptedFromCandidateA),
    contentIdentity: "",
    primitives: [{
      ...structuredClone(acceptedFromCandidateA.primitives[0]),
      x: candidateB.x,
      y: candidateB.y,
      width: candidateB.width,
      height: candidateB.height,
    }],
    acceptance: {
      ...structuredClone(acceptedFromCandidateA.acceptance),
      acceptedContentIdentity: "",
    },
  };
  const withRevisionIdentity = {
    ...geometryBProjection,
    acceptance: {
      ...geometryBProjection.acceptance,
      acceptedContentIdentity:
        computeAcceptedGeometryRevisionContentIdentity(geometryBProjection),
    },
  };
  const geometryFromDifferentCandidate = {
    ...withRevisionIdentity,
    contentIdentity: computeAcceptedGeometryContentIdentity(withRevisionIdentity),
  };
  assert.throws(
    () => validateExactLocalVisualCandidateAcceptanceV1(
      first.candidateObservationEnvelope,
      selection,
      geometryFromDifferentCandidate,
    ),
    /\.x: requires/u,
  );
});

test("PR129 validators reject unsafe extras and preserve content-addressed stage separation", () => {
  const capture = createCapture({
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.1, y: 0.15, width: 0.2, height: 0.25, providerConfidence: null },
      { x: 0.5, y: 0.5, width: 0.2, height: 0.2, providerConfidence: null },
    ]),
  });
  assert.throws(
    () => validateLocalVisualProviderExecutionReceiptV1({
      ...capture.providerExecutionReceipt,
      rawProviderResponse: "forbidden",
    }),
    /exact closed fields/u,
  );
  assert.throws(
    () => validateLocalVisualCandidateObservationEnvelopeV1({
      ...capture.candidateObservationEnvelope,
      resultJson: {},
    }),
    /exact closed fields/u,
  );
  const duplicateCandidate = structuredClone(capture.candidateObservationEnvelope);
  duplicateCandidate.rectangleCandidates[1].candidateId =
    duplicateCandidate.rectangleCandidates[0].candidateId;
  assert.throws(
    () => validateLocalVisualCandidateObservationEnvelopeV1(duplicateCandidate),
    /unique/u,
  );
  const nonPositionalOrder = structuredClone(capture.candidateObservationEnvelope);
  nonPositionalOrder.rectangleCandidates[1].order = 3;
  assert.throws(
    () => validateLocalVisualCandidateObservationEnvelopeV1(nonPositionalOrder),
    /requires 1/u,
  );
  const sparseCandidates = structuredClone(capture.candidateObservationEnvelope);
  sparseCandidates.rectangleCandidates = new Array(1);
  assert.throws(
    () => validateLocalVisualCandidateObservationEnvelopeV1(sparseCandidates),
    /must not be sparse/u,
  );
  const sparseSelection = createSelection(capture, [0]);
  sparseSelection.selections = new Array(1);
  assert.throws(
    () => validateLocalVisualHumanCandidateSelectionV1(
      capture.candidateObservationEnvelope,
      sparseSelection,
    ),
    /must not be sparse/u,
  );

  const first = createResume(capture, [0]);
  const changed = createResume(createCapture({
    rawProviderResponseBytes: providerResponseBytes([
      { x: 0.2, y: 0.2, width: 0.2, height: 0.2, providerConfidence: null },
    ]),
  }), [0]);
  assert.notEqual(first.execution.handoff.acceptedGeometryRevisionContentIdentity, changed.execution.handoff.acceptedGeometryRevisionContentIdentity);
  assert.notEqual(first.execution.handoff.mappingRequestId, changed.execution.handoff.mappingRequestId);
  assert.notEqual(first.execution.handoff.normalizationRequestId, changed.execution.handoff.normalizationRequestId);
  assert.notEqual(first.execution.handoff.structuredAnalyzeAnalysisId, changed.execution.handoff.structuredAnalyzeAnalysisId);
  assert.match(first.execution.handoff.structuredAnalyzeAnalysisId, /^analysis:pr128:[0-9a-f]{64}$/u);
});

function createCapture({
  imageBytes = pngBytes(1000, 800),
  rawProviderResponseBytes = providerResponseBytes([
    { x: 0.1, y: 0.15, width: 0.2, height: 0.25, providerConfidence: null },
  ]),
} = {}) {
  return createControlledLocalLiveVisualCandidateCaptureV1({
    sourceImageBytes: imageBytes,
    sourceImageMediaType: "image/png",
    rawProviderResponseBytes,
    responseStatusCode: 200,
    timeoutMs: 30_000,
  });
}

function createResume(capture, selectedIndexes) {
  return createControlledLocalLiveVisualCandidateResumeV1({
    providerExecutionReceipt: capture.providerExecutionReceipt,
    candidateObservationEnvelope: capture.candidateObservationEnvelope,
    humanCandidateSelection: createSelection(capture, selectedIndexes),
    acceptedAt: ACCEPTED_AT,
  });
}

function createSelection(capture, selectedIndexes) {
  const candidate = capture.candidateObservationEnvelope;
  return finalizeLocalVisualHumanCandidateSelectionIdentityV1({
    contractId: "norma.local-visual-human-candidate-selection@1",
    contractVersion: 1,
    selectionId: "human-selection:local:1",
    candidateObservationId: candidate.observationId,
    candidateObservationContentIdentity: candidate.observationContentIdentity,
    providerExecutionReceiptContentIdentity:
      candidate.provenance.providerExecutionReceiptContentIdentity,
    acceptanceActor: { actorClass: "human", actorId: "local-human:1" },
    geometryAction: "accept_exact",
    selections: selectedIndexes.map((candidateIndex, order) => ({
      order,
      candidateId: candidate.rectangleCandidates[candidateIndex].candidateId,
      acceptedPrimitiveId: `accepted:rectangle:${String(order)}`,
    })),
    authority: {
      explicitHumanSelection: true,
      providerAuthority: false,
      confidenceAuthority: false,
      automaticAcceptance: false,
      coordinateCorrectionAllowed: false,
      coordinateRepairAllowed: false,
    },
  });
}

function providerResponseBytes(rectangles, { responseId = "response:test", model = "configured-model" } = {}) {
  const structuredOutput = {
    schemaVersion: "controlled-rectangle-candidates@1",
    rectangles,
  };
  return new TextEncoder().encode(JSON.stringify({
    id: responseId,
    object: "response",
    status: "completed",
    error: null,
    model,
    output: [
      {
        id: "message:test",
        type: "message",
        status: "completed",
        role: "assistant",
        content: [
          {
            type: "output_text",
            annotations: [],
            text: JSON.stringify(structuredOutput),
          },
        ],
      },
    ],
  }));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function encodeUtf8Hex(value) {
  return Array.from(
    new TextEncoder().encode(value),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function pngBytes(width, height) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  setUint32Be(bytes, 8, 13);
  bytes.set([73, 72, 68, 82], 12);
  setUint32Be(bytes, 16, width);
  setUint32Be(bytes, 20, height);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function jpegBytes(width, height) {
  const bytes = new Uint8Array(23);
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0);
  bytes[7] = (height >>> 8) & 0xff;
  bytes[8] = height & 0xff;
  bytes[9] = (width >>> 8) & 0xff;
  bytes[10] = width & 0xff;
  bytes[11] = 3;
  bytes.set([1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0, 0xff, 0xd9], 12);
  return bytes;
}

function webpVp8xBytes(width, height) {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70], 0);
  setUint32Le(bytes, 4, 22);
  bytes.set([87, 69, 66, 80, 86, 80, 56, 88], 8);
  setUint32Le(bytes, 16, 10);
  setUint24Le(bytes, 24, width - 1);
  setUint24Le(bytes, 27, height - 1);
  return bytes;
}

function webpVp8Bytes(width, height) {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70], 0);
  setUint32Le(bytes, 4, 22);
  bytes.set([87, 69, 66, 80, 86, 80, 56, 32], 8);
  setUint32Le(bytes, 16, 10);
  bytes.set([0x9d, 0x01, 0x2a], 23);
  setUint16Le(bytes, 26, width);
  setUint16Le(bytes, 28, height);
  return bytes;
}

function webpVp8lBytes(width, height) {
  const bytes = new Uint8Array(26);
  bytes.set([82, 73, 70, 70], 0);
  setUint32Le(bytes, 4, 18);
  bytes.set([87, 69, 66, 80, 86, 80, 56, 76], 8);
  setUint32Le(bytes, 16, 5);
  bytes[20] = 0x2f;
  setUint32Le(bytes, 21, (width - 1) | ((height - 1) << 14));
  return bytes;
}

function setUint32Be(bytes, offset, value) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}
function setUint32Le(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}
function setUint16Le(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}
function setUint24Le(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}

function rectangleProjection({ x, y, width, height }) {
  return { x, y, width, height };
}
